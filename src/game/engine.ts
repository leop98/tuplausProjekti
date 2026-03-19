// Pelilogiikka: kortin arpominen, kierroksen tuloksen laskeminen ja voiton suuruus
import type { Choice } from '../types/types';

// Kortit 1–6 ovat pieniä, 8-13 suuria, 7 ei kuulu kumpaankaan: aina häviö
const SMALL_CARDS = new Set([1, 2, 3, 4, 5, 6]);
const LARGE_CARDS = new Set([8, 9, 10, 11, 12, 13]);

// kortin arpominen
export function drawCard(): number {
  return Math.floor(Math.random() * 13) + 1;
}

// Palauttaa true jos pelaajan arvaus osui, kortti 7 palauttaa aina false
export function roundResult(card: number, choice: Choice): boolean {
  if (SMALL_CARDS.has(card)) {return choice === 'small';}
  if (LARGE_CARDS.has(card)) {return choice === 'large';}
  return false;
}

export function calculatePayout(bet: number, won: boolean): number {
  return won ? bet * 2 : 0;
}