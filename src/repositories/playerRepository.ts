// Pelaajan tietokantaoperaatiot: pelaajan luominen ja hakeminen
import type { Player } from '../types/types';
import type { Pool, RowDataPacket } from 'mysql2/promise';

async function createPlayer(pool: Pool, id: string, name: string, balance: number): Promise<Player> {
  try {
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
  return { id, name, balance, pendingWin: 0, inGame: false };
}

async function getPlayer(pool: Pool, id: string): Promise<Player | null> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT * FROM players WHERE id = ?',
    [id],
  );
  if (rows.length === 0)
    {return null;
  }
  const row = rows[0];
  return {
    id: row.id,
    name: row.name,
    balance: row.balance,
    pendingWin: row.pending_win,
    inGame: Boolean(row.in_game),
  };
}

function duplicateError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code: string }).code === 'ER_DUP_ENTRY'
  );
}

export { createPlayer, getPlayer };