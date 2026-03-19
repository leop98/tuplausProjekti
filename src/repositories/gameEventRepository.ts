// Pelitapahtumien tietokantaoperaatiot: kierroksen pelaaminen, tuplaus, kotiutus ja historia
import type { Pool, RowDataPacket } from 'mysql2/promise';
import type { GameEvent, Choice, RoundResult } from '../types/types';

// Pelaa kierroksen, vähentää panoksen saldosta, tallentaa tuloksen ja asettaa odottavan voiton.
export async function playRound(
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

    // Estää uuden kierroksen aloittamisen jos edellinen on vielä kesken.
    if (rows[0].in_game) {
      await connection.rollback();
      throw new Error('Round already in progress - cashout or double first');
    }

    const currentBalance: number = rows[0].balance;
    if (currentBalance < bet) {
      await connection.rollback();
      throw new Error('Insufficient balance');
    }

    const payout = won ? bet * 2 : 0;
    const newBalance = currentBalance - bet;
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

// Tuplaa odottavan voiton: lukee summan tietokannasta, ei hyväksy sitä pyynnössä.
export async function doubleDown(
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

    // voidaan tuplata vain aktiivisessa kierroksessa, joten in_game on pakko olla TRUE
    if (!rows[0].in_game) {
      await connection.rollback();
      throw new Error('No active round - play first');
    }

    const currentBalance: number = rows[0].balance;
    const currentPending: number = rows[0].pending_win;

    const newPendingWin = won ? currentPending * 2 : 0;
    const inGame = won;

    // häviö nollaa pending_win, balance väheni jo alkuperäisessä playRoundissa
    await connection.execute(
      'UPDATE players SET pending_win = ?, in_game = ? WHERE id = ?',
      [newPendingWin, inGame, playerId],
    );

    // Tuplaus on aina uusi tapahtuma, joka tallennetaan erikseen, bet on se summa, joka oli panoksena tuplattavana, payout on tuplauksen tulos
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

// Kotiuttaa odottavan voiton: lisää sen saldoon ja nollaa pelitilan.
export async function cashout(pool: Pool, playerId: string): Promise<number> {
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

    // Voi kutsua vain jos in_game on TRUE (eli on jotain kotiutettavaa).
    if (!rows[0].in_game) {
      await connection.rollback();
      throw new Error('No active round - nothing to cash out');
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

export async function getPlayerHistory(pool: Pool, playerId: string): Promise<GameEvent[]> {
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