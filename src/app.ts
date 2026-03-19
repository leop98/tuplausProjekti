import type { Application, Request, Response, NextFunction } from 'express';
import express from 'express';
import type { Pool } from 'mysql2/promise';
import { createRouter } from './routes/gameRoutes';
import type { ErrorResponse } from './types/types';
import path from 'path/win32';

export function createApp(pool: Pool): Application {
  const app = express();

  app.use(express.json());

  app.use(express.static(path.join(__dirname, '..', 'public')));

  // Kaikki reitit
  app.use('/', createRouter(pool));

  // 404 – tuntematon reitti
  app.use((_req: Request, res: Response) => {
    const body: ErrorResponse = { error: 'Not found' };
    res.status(404).json(body);
  });

  // Globaali virheenkäsittelijä
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error('Unhandled error:', err);
    const body: ErrorResponse = { error: 'Internal server error' };
    res.status(500).json(body);
  });

  return app;
}