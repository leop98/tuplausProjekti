// HTTP-reitit: pyyntöjen validointi, pelilogiikan kutsuminen ja vastausten muodostaminen
import type { Request, Response } from 'express';
import { Router } from 'express';
import { drawCard, roundResult } from '../game/engine';
import type { Choice, CreatePlayerRequest, PlayRequest, DoubleRequest, ErrorResponse } from '../types/types';
import type { Pool } from 'mysql2/promise';
import { playRound, doubleDown, cashout, getPlayerHistory } from '../repositories/gameEventRepository';
import { createPlayer, getPlayer } from '../repositories/playerRepository';
import { v4 as uuidv4 } from 'uuid';

// Apufunktio virhevastausten lähettämiseen
function err(res: Response, status: number, message: string): void {
  const body: ErrorResponse = { error: message };
  res.status(status).json(body);
}

// Syötteiden validointiapufunktiot
function isPositiveInt(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}
function isNonNegativeInt(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

export function createRouter(pool: Pool): Router {
  const router = Router();

  router.post('/players', async (req: Request, res: Response) => {
    const body = req.body as CreatePlayerRequest;
    const name = body.name;
    const balance = body.balance;
    const id = body.id;

    if (!name) {
      return err(res, 400, 'name is required');
    }
    if (!isNonNegativeInt(balance)) {
      return err(res, 400, 'balance must be a non-negative integer');
    }
    if (!id) { return err(res, 400, 'id is required'); }

    try {
      const player = await createPlayer(pool, id, name, balance);
      return res.status(201).json(player);
    } catch (e: unknown) {
      if (e instanceof Error) {return err(res, 500, e.message);}
      throw e;
    }
  });

  router.get('/players/:id', async (req: Request, res: Response) => {
    const player = await getPlayer(pool, req.params.id);
    if (!player) {return err(res, 404, 'not found');}
    return res.json(player);
  });

  router.post('/players/:id/play', async (req: Request, res: Response) => {
    const body = req.body as PlayRequest;
    const bet = body.bet;
    const choice = body.choice;

    if (!isPositiveInt(bet)) {
      return err(res, 400, 'bet must be a positive integer');
    }
    if (choice !== 'small' && choice !== 'large') {
      return err(res, 400, 'choice must be either "small" or "large"');
    }

    const card = drawCard();
    const won = roundResult(card, choice);
    const eventId = uuidv4();

    try {
      const result = await playRound(pool, eventId, new Date(), req.params.id, bet, choice as Choice, card, won);
      return res.json({
        event_id: eventId,
        card,
        won,
        pendingWin: result.pendingWin,
        balance: result.balance,
        inGame: result.inGame,
      });
    } catch (e: unknown) {
      if (e instanceof Error) {
        if (e.message === 'Player not found') {return err(res, 404, e.message);}
        if (e.message === 'Insufficient balance') {return err(res, 402, e.message);}
        if (e.message === 'Round already in progress - cashout or double first') {return err(res, 409, e.message);}
      }
      throw e;
    }
  });

  router.post('/players/:id/double', async (req: Request, res: Response) => {
    const body = req.body as DoubleRequest;
    const choice = body.choice;

    if (choice !== 'small' && choice !== 'large') {
      return err(res, 400, 'choice must be either "small" or "large"');
    }

    const card = drawCard();
    const won = roundResult(card, choice);
    const eventId = uuidv4();

    try {
      const result = await doubleDown(pool, eventId, new Date(), req.params.id, choice as Choice, card, won);
      return res.json({
        event_id: eventId,
        card,
        won,
        pendingWin: result.pendingWin,
        balance: result.balance,
        inGame: result.inGame,
      });
    } catch (e: unknown) {
      if (e instanceof Error) {
        if (e.message === 'Player not found') {return err(res, 404, e.message);}
        if (e.message === 'No active round - play first') {return err(res, 409, e.message);}
      }
      throw e;
    }
  });

  router.post('/players/:id/cashout', async (req: Request, res: Response) => {
    try {
      const newBalance = await cashout(pool, req.params.id);
      return res.json({ balance: newBalance });
    } catch (e: unknown) {
      if (e instanceof Error) {
        if (e.message === 'Player not found') {return err(res, 404, e.message);}
        if (e.message === 'No active round - nothing to cash out') {return err(res, 409, e.message);}
      }
      throw e;
    }
  });

  router.get('/players/:id/history', async (req: Request, res: Response) => {
    const player = await getPlayer(pool, req.params.id);
    if (!player) {return err(res, 404, 'player not found');}

    const events = await getPlayerHistory(pool, req.params.id);
    return res.json({ player_id: req.params.id, events });
  });

  return router;
}

export default createRouter;