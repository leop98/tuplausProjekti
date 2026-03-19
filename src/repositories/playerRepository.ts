import type { Player } from '../types/types';
import type { Pool, RowDataPacket } from 'mysql2/promise';

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
  if (rows.length === 0)
    {return null;
  }
  const row = rows[0];
  return {
    id: row.id,
    name: row.name,
    balance: row.balance,
    pendingWin: row.pending_win,  // ADDITION
    inGame: Boolean(row.in_game), // ADDITION: MySQL returns BOOLEAN as 0/1
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