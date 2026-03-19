// Yksikkötestit pelilogiikalle drawCard, roundResult ja calculatePayout
import { describe, it, expect } from 'vitest';
import { drawCard, roundResult, calculatePayout } from '../src/game/engine';

describe('drawCard', () => {
  it('always returns a number between 1 and 13', () => {
    for (let i = 0; i < 1000; i++) {
      const card = drawCard();
      expect(card).toBeGreaterThanOrEqual(1);
      expect(card).toBeLessThanOrEqual(13);
    }
  });

  it('always returns an integer', () => {
    for (let i = 0; i < 100; i++) {
      const card = drawCard();
      expect(Number.isInteger(card)).toBe(true);
    }
  });
});

describe('roundResult', () => {
  const smallCards = [1, 2, 3, 4, 5, 6];
  const largeCards = [8, 9, 10, 11, 12, 13];

  it('small cards win with choice small', () => {
    for (const card of smallCards) {
      expect(roundResult(card, 'small')).toBe(true);
    }
  });

  it('small cards lose with choice large', () => {
    for (const card of smallCards) {
      expect(roundResult(card, 'large')).toBe(false);
    }
  });

  it('large cards win with choice large', () => {
    for (const card of largeCards) {
      expect(roundResult(card, 'large')).toBe(true);
    }
  });

  it('large cards lose with choice small', () => {
    for (const card of largeCards) {
      expect(roundResult(card, 'small')).toBe(false);
    }
  });

  it('card 7 always loses regardless of choice', () => {
    expect(roundResult(7, 'small')).toBe(false);
    expect(roundResult(7, 'large')).toBe(false);
  });
});

describe('calculatePayout', () => {
  it('returns bet * 2 on a win', () => {
    expect(calculatePayout(100, true)).toBe(200);
    expect(calculatePayout(50, true)).toBe(100);
    expect(calculatePayout(1, true)).toBe(2);
  });

  it('returns 0 on a loss', () => {
    expect(calculatePayout(100, false)).toBe(0);
    expect(calculatePayout(50, false)).toBe(0);
  });
});