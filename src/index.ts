import 'dotenv/config';
import { initDb } from './db/schema';
import { createPool } from './repositories/pool';
import { createApp } from './app';

const port = parseInt(process.env.PORT ?? '3000', 10);

const pool = createPool({
  host:     process.env.DB_HOST     ?? 'localhost',
  port:     parseInt(process.env.DB_PORT ?? '3306', 10),
  user:     process.env.DB_USER     ?? 'tupla',
  password: process.env.DB_PASSWORD ?? '',
  database: process.env.DB_NAME     ?? 'tupla_db',
});

async function main(): Promise<void> {
  await initDb(pool);
  const app = createApp(pool);
  app.listen(port, () => {
    console.error(`Tupla-pelimoottori käynnissä portissa ${port}`);
  });
}

main().catch((err) => {
  console.error('Käynnistys epäonnistui:', err);
  process.exit(1);
});