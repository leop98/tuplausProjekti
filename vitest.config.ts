import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    fileParallelism: false, //testitiedostot ajetaan peräkkäin, estää tietokantaoperaatioiden kilpailutilanteen initDb ja dropTables kutsujen välillä
  },
});