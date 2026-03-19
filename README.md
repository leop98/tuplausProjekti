# Tuplaus Backend

Minimal TypeScript Express backend for the Tuplaus casino game.

Quick start

1. Install dependencies:

```bash
npm install
```

2. Start dev server:

```bash
npm run dev
```

3. Run tests:

```bash
npm test
```

API

- `POST /api/game/start` body `{ "balance": number, "bet": number }` → starts a game
- `POST /api/game/play` body `{ "id": string }` → play one round
- `GET /api/game/:id` → get game state
