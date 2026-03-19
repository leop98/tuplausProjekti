import type { Choice } from '../types/types';

const SMALL_CARDS = new Set([1, 2, 3, 4, 5, 6]);

const LARGE_CARDS = new Set([8, 9, 10, 11, 12, 13]);

function drawCard(): number {
  return Math.floor(Math.random() * 13) + 1;
}
function roundResult(card: number, choice: Choice): boolean {
  if (SMALL_CARDS.has(card)) {return choice === 'small';}
  if (LARGE_CARDS.has(card)) {return choice === 'large';}
  return false;
}

function calculatePayout(bet: number, won: boolean): number {
  return won ? bet * 2 : 0;
}

export { drawCard, roundResult, calculatePayout };