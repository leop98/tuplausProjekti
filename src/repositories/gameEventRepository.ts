import type { Pool, RowDataPacket } from 'mysql2/promise';
import type { GameEvent, Choice, RoundResult } from '../types/types';

// CHANGE: playRound no longer takes payout or skipBalanceUpdate — game state is fully managed here
async function playRound(
  pool: Pool,
  eventId: string,
  timestamp: Date,
  playerId: string,
  bet: number,
  choice: Choice,
  card: number,
  won: boolean,
): Promise<RoundResult> {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [rows] = await connection.execute<RowDataPacket[]>(
      'SELECT balance, in_game FROM players WHERE id = ? FOR UPDATE',
      [playerId],
    );
    if (rows.length === 0) {
      await connection.rollback();
      throw new Error('Player not found');
    }

    // ADDITION: block new bets while a win is still pending
    if (rows[0].in_game) {
      await connection.rollback();
      throw new Error('Round already in progress — cashout or double first');
    }

    const currentBalance: number = rows[0].balance;
    if (currentBalance < bet) {
      await connection.rollback();
      throw new Error('Insufficient balance');
    }

    // CHANGE: payout is no longer passed in — we derive it and store it on the player row
    const payout = won ? bet * 2 : 0;
    const newBalance = currentBalance - bet;  // bet deducted immediately; win held separately
    const pendingWin = payout;
    const inGame = won;

    await connection.execute(
      'UPDATE players SET balance = ?, pending_win = ?, in_game = ? WHERE id = ?',
      [newBalance, pendingWin, inGame, playerId],
    );

    await connection.execute(
      'INSERT INTO game_events (id, created_at, player_id, bet, choice, card, payout) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [eventId, timestamp.toISOString().slice(0, 23).replace('T', ' '), playerId, bet, choice, card, payout],
    );

    await connection.commit();
    return { balance: newBalance, pendingWin, inGame };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

// ADDITION: doubleDown reads pending_win from DB — client cannot supply its own amount
async function doubleDown(
  pool: Pool,
  eventId: string,
  timestamp: Date,
  playerId: string,
  choice: Choice,
  card: number,
  won: boolean,
): Promise<RoundResult> {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [rows] = await connection.execute<RowDataPacket[]>(
      'SELECT balance, pending_win, in_game FROM players WHERE id = ? FOR UPDATE',
      [playerId],
    );
    if (rows.length === 0) {
      await connection.rollback();
      throw new Error('Player not found');
    }

    // ADDITION: can only double when in_game is TRUE (i.e. there is a pending win)
    if (!rows[0].in_game) {
      await connection.rollback();
      throw new Error('No active round — play first');
    }

    const currentBalance: number = rows[0].balance;
    const currentPending: number = rows[0].pending_win;

    const newPendingWin = won ? currentPending * 2 : 0;
    const inGame = won;

    // On a loss the pending win is simply zeroed; balance was already deducted during play
    await connection.execute(
      'UPDATE players SET pending_win = ?, in_game = ? WHERE id = ?',
      [newPendingWin, inGame, playerId],
    );

    // Record the double attempt as its own game event (bet = what was at stake, payout = result)
    await connection.execute(
      'INSERT INTO game_events (id, created_at, player_id, bet, choice, card, payout) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [eventId, timestamp.toISOString().slice(0, 23).replace('T', ' '), playerId, currentPending, choice, card, newPendingWin],
    );

    await connection.commit();
    return { balance: currentBalance, pendingWin: newPendingWin, inGame };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

// CHANGE: cashout reads pending_win from DB — no amount parameter
async function cashout(pool: Pool, playerId: string): Promise<number> {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [rows] = await connection.execute<RowDataPacket[]>(
      'SELECT balance, pending_win, in_game FROM players WHERE id = ? FOR UPDATE',
      [playerId],
    );
    if (rows.length === 0) {
      await connection.rollback();
      throw new Error('Player not found');
    }

    // ADDITION: reject cashout when there is nothing to collect
    if (!rows[0].in_game) {
      await connection.rollback();
      throw new Error('No active round — nothing to cash out');
    }

    const newBalance = rows[0].balance + rows[0].pending_win;

    await connection.execute(
      'UPDATE players SET balance = ?, pending_win = 0, in_game = FALSE WHERE id = ?',
      [newBalance, playerId],
    );

    await connection.commit();
    return newBalance;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function getPlayerHistory(pool: Pool, playerId: string): Promise<GameEvent[]> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT * FROM game_events WHERE player_id = ? ORDER BY created_at ASC',
    [playerId],
  );
  return rows.map(row => ({
    id: row.id,
    timestamp: row.created_at,
    playerId: row.player_id,
    bet: row.bet,
    choice: row.choice as Choice,
    card: row.card,
    payout: row.payout,
  }));
}

export {  playRound, doubleDown, cashout, getPlayerHistory };