// Integraatiotestit pelaajan tietokantaoperaatioille createPlayer ja getPlayer
// Jokainen testi käyttää puhdasta tietokantaa: beforeEach luo taulut, afterEach pudottaa ne
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createPool } from '../src/repositories/pool';
import { createPlayer, getPlayer } from '../src/repositories/playerRepository';
import { initDb, dropTables } from '../src/db/schema';
import type { Pool } from 'mysql2/promise';

const pool: Pool = createPool({
  host: process.env.DB_HOST ?? 'localhost',
  port: parseInt(process.env.DB_PORT ?? '3306', 10),
  user: process.env.DB_USER ?? 'tupla',
  password: process.env.DB_PASSWORD ?? 'tupla_pass',
  database: process.env.TEST_DB_NAME ?? 'tupla_test',
});

beforeEach(async () => {
  await initDb(pool);
});

afterEach(async () => {
  await dropTables(pool);
});

describe('createPlayer', () => {
  it('creates a player with correct initial state', async () => {
    const player = await createPlayer(pool, 'test-id', 'Teppo', 1000);
    expect(player.id).toBe('test-id');
    expect(player.name).toBe('Teppo');
    expect(player.balance).toBe(1000);
    expect(player.pendingWin).toBe(0);
    expect(player.inGame).toBe(false);
  });

  it('throws on duplicate id', async () => {
    await createPlayer(pool, 'test-id', 'Teppo', 1000);
    await expect(createPlayer(pool, 'test-id', 'Teppo', 1000))
      .rejects.toThrow('Player with this ID already exists');
  });
});

describe('getPlayer', () => {
  it('returns the player if they exist', async () => {
    await createPlayer(pool, 'test-id', 'Teppo', 1000);
    const player = await getPlayer(pool, 'test-id');
    expect(player).not.toBeNull();
    expect(player!.id).toBe('test-id');
    expect(player!.name).toBe('Teppo');
    expect(player!.balance).toBe(1000);
    expect(player!.pendingWin).toBe(0);
    expect(player!.inGame).toBe(false);
  });

  it('returns null if player does not exist', async () => {
    const player = await getPlayer(pool, 'nonexistent-id');
    expect(player).toBeNull();
  });
});