// Integraatiotestit pelitapahtumien tietokantaoperaatioille playRound, doubleDown, cashout ja getPlayerHistory
// Jokainen testi käyttää puhdasta tietokantaa: beforeEach luo taulut, afterEach pudottaa ne
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createPool } from '../src/repositories/pool';
import { createPlayer } from '../src/repositories/playerRepository';
import { playRound, doubleDown, cashout, getPlayerHistory } from '../src/repositories/gameEventRepository';
import { initDb, dropTables } from '../src/db/schema';
import type { Pool } from 'mysql2/promise';

const pool: Pool = createPool({
  host: process.env.DB_HOST ?? 'localhost',
  port: parseInt(process.env.DB_PORT ?? '3306', 10),
  user: process.env.DB_USER ?? 'tupla',
  password: process.env.DB_PASSWORD ?? 'tupla_pass',
  database: process.env.TEST_DB_NAME ?? 'tupla_test',
});

const PLAYER_ID = 'test-player';
const EVENT_ID = 'test-event';

beforeEach(async () => {
  await initDb(pool);
  await createPlayer(pool, PLAYER_ID, 'Teppo', 1000);
});

afterEach(async () => {
  await dropTables(pool);
});

describe('playRound', () => {
  it('deducts bet and sets pending_win and in_game on a win', async () => {
    const result = await playRound(pool, EVENT_ID, new Date(), PLAYER_ID, 100, 'small', 3, true);
    expect(result.balance).toBe(900);
    expect(result.pendingWin).toBe(200);
    expect(result.inGame).toBe(true);
  });

  it('deducts bet and leaves pending_win at 0 on a loss', async () => {
    const result = await playRound(pool, EVENT_ID, new Date(), PLAYER_ID, 100, 'small', 9, false);
    expect(result.balance).toBe(900);
    expect(result.pendingWin).toBe(0);
    expect(result.inGame).toBe(false);
  });

  it('throws when player is not found', async () => {
    await expect(playRound(pool, EVENT_ID, new Date(), 'nonexistent', 100, 'small', 3, true))
      .rejects.toThrow('Player not found');
  });

  it('throws on insufficient balance', async () => {
    await expect(playRound(pool, EVENT_ID, new Date(), PLAYER_ID, 99999, 'small', 3, true))
      .rejects.toThrow('Insufficient balance');
  });

  it('throws when a round is already in progress', async () => {
    await playRound(pool, EVENT_ID, new Date(), PLAYER_ID, 100, 'small', 3, true);
    await expect(playRound(pool, 'another-event', new Date(), PLAYER_ID, 100, 'small', 3, true))
      .rejects.toThrow('Round already in progress - cashout or double first');
  });
});

describe('doubleDown', () => {
  beforeEach(async () => {
    // testi olettaa, että pelaaja on juuri voittanut kierroksen, joten asetetaan tilanne valmiiksi
    await playRound(pool, EVENT_ID, new Date(), PLAYER_ID, 100, 'small', 3, true);
  });

  it('doubles the pending win on a win', async () => {
    const result = await doubleDown(pool, 'double-event', new Date(), PLAYER_ID, 'large', 9, true);
    expect(result.pendingWin).toBe(400);
    expect(result.inGame).toBe(true);
    expect(result.balance).toBe(900);
  });

  it('zeroes pending win and clears in_game on a loss', async () => {
    const result = await doubleDown(pool, 'double-event', new Date(), PLAYER_ID, 'large', 3, false);
    expect(result.pendingWin).toBe(0);
    expect(result.inGame).toBe(false);
    expect(result.balance).toBe(900);
  });

  it('throws when no active round exists', async () => {
    await cashout(pool, PLAYER_ID);
    await expect(doubleDown(pool, 'double-event', new Date(), PLAYER_ID, 'large', 9, true))
      .rejects.toThrow('No active round - play first');
  });

  it('throws when player is not found', async () => {
    await expect(doubleDown(pool, 'double-event', new Date(), 'nonexistent', 'large', 9, true))
      .rejects.toThrow('Player not found');
  });
});

describe('cashout', () => {
  it('credits pending win to balance and resets game state', async () => {
    await playRound(pool, EVENT_ID, new Date(), PLAYER_ID, 100, 'small', 3, true);
    const newBalance = await cashout(pool, PLAYER_ID);
    expect(newBalance).toBe(1100); // 1000 - 100 (bet) + 200 (win)
  });

  it('throws when no active round exists', async () => {
    await expect(cashout(pool, PLAYER_ID))
      .rejects.toThrow('No active round - nothing to cash out');
  });

  it('throws when player is not found', async () => {
    await expect(cashout(pool, 'nonexistent'))
      .rejects.toThrow('Player not found');
  });
});

describe('getPlayerHistory', () => {
  it('returns events in chronological order', async () => {
    await playRound(pool, 'event-1', new Date(), PLAYER_ID, 100, 'small', 9, false);
    await playRound(pool, 'event-2', new Date(), PLAYER_ID, 100, 'small', 3, true);
    const events = await getPlayerHistory(pool, PLAYER_ID);
    expect(events).toHaveLength(2);
    expect(events[0].id).toBe('event-1');
    expect(events[1].id).toBe('event-2');
  });

  it('returns empty array when player has no history', async () => {
    const events = await getPlayerHistory(pool, PLAYER_ID);
    expect(events).toHaveLength(0);
  });

  it('returns correct event fields', async () => {
    await playRound(pool, EVENT_ID, new Date(), PLAYER_ID, 100, 'small', 3, true);
    const events = await getPlayerHistory(pool, PLAYER_ID);
    expect(events[0].id).toBe(EVENT_ID);
    expect(events[0].playerId).toBe(PLAYER_ID);
    expect(events[0].bet).toBe(100);
    expect(events[0].choice).toBe('small');
    expect(events[0].card).toBe(3);
    expect(events[0].payout).toBe(200);
  });
});