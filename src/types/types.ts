// TypeScript-tyypit ja -interfacet, tietokantamallit, pyyntöjen rakenteet ja virhevastaukset

// pelaajan valinta
export type Choice = 'small' | 'large';

// tietokannassa tallennettu pelaaja
export interface Player {
  id: string;
  name: string;
  balance: number;
  pendingWin: number;
  inGame: boolean;
}

// Tietokannassa tallennettu pelitapahtuma
export interface GameEvent {
  id: string;
  timestamp: string;
  playerId: string;
  bet: number;
  choice: Choice;
  card: number;
  payout: number;
}

// POST /players pyyntö
export interface CreatePlayerRequest {
  id: string;
  name: string;
  balance: number;
}

// POST /player/id/play pyyntö
export interface PlayRequest {
  bet: number;
  choice: Choice;
}

// POST /player/id/double pyyntö
export interface DoubleRequest {
  choice: Choice;
}

// virhevastaus
export interface ErrorResponse {
  error: string;
}

// playRound ja doubleDown -funktioiden palautustyyppi
export interface RoundResult {
  balance: number;
  pendingWin: number;
  inGame: boolean;
}