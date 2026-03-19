import type { Pool, RowDataPacket } from 'mysql2/promise';
import mysql from 'mysql2/promise';
import type { Player, GameEvent, Choice } from '../types/types';

export interface DbConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

export function createPool(config: DbConfig): Pool {
  return mysql.createPool({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: config.database,
    waitForConnections: true,
    connectionLimit: 10,
    timezone: 'Z',
  });
}

async function createPlayer(pool: Pool, id: string, name: string, balance: number): Promise<Player> {
  try {
    // CHANGE: INSERT now includes pending_win and in_game (both use column defaults)
    await pool.execute(
      'INSERT INTO players (id, name, balance) VALUES (?, ?, ?)',
      [id, name, balance],
    );
  } catch (error) {
    if (duplicateError(error)) {
      throw new Error('Player with this ID already exists', { cause: error });
    }
    throw error;
  }
  // CHANGE: return includes new fields at their initial values
  return { id, name, balance, pendingWin: 0, inGame: false };
}

// CHANGE: getPlayer maps the two new columns
async function getPlayer(pool: Pool, id: string): Promise<Player | null> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT * FROM players WHERE id = ?',
    [id],
  );
  if (rows.length === 0) {return null;}
  const row = rows[0];
  return {
    id: row.id,
    name: row.name,
    balance: row.balance,
    pendingWin: row.pending_win,  // ADDITION
    inGame: Boolean(row.in_game), // ADDITION: MySQL returns BOOLEAN as 0/1
  };
}

export interface RoundResult {
  balance: number;
  pendingWin: number;
  inGame: boolean;
}

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

function duplicateError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code: string }).code === 'ER_DUP_ENTRY'
  );
}

export { createPlayer, getPlayer, playRound, doubleDown, cashout, getPlayerHistory };