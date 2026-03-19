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

// POST /player/id/cashout vastaus
export interface CashoutResult {
  balance: number;
}

// GET /player/id/history vastaus
export interface History {
  player_id: string;
  events: GameEvent[];
}


// virhevastaus
export interface ErrorResponse {
  error: string;
}

export interface RoundResult {
  balance: number;
  pendingWin: number;
  inGame: boolean;
}