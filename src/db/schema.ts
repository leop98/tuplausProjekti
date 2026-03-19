import type { Pool } from 'mysql2/promise';

// Tietokannan alustus
// Luo taulut jos niitä ei vielä ole, Kutsutaan app.ts:ssä ennen serverin käynnistämistä
export async function initDb(pool: Pool): Promise<void> {
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS players (
      id         VARCHAR(255) NOT NULL PRIMARY KEY,
      name       VARCHAR(255) NOT NULL,
      balance    INT          NOT NULL,
      pending_win  INT        NOT NULL DEFAULT 0,
      in_game      BOOLEAN    NOT NULL DEFAULT FALSE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS game_events (
      id           VARCHAR(36)  NOT NULL PRIMARY KEY,   -- UUID
      created_at   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      player_id    VARCHAR(255) NOT NULL,
      bet          INT          NOT NULL,
      choice       ENUM('small','large') NOT NULL,
      card         TINYINT UNSIGNED NOT NULL,               -- 1–13
      payout       INT          NOT NULL,               -- 0 = häviö
      CONSTRAINT fk_player
        FOREIGN KEY (player_id) REFERENCES players(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
}

//Pudottaa testikannan taulut testien jälkeen
export async function dropTables(pool: Pool): Promise<void> {
  await pool.execute('DROP TABLE IF EXISTS game_events');
  await pool.execute('DROP TABLE IF EXISTS players');
}