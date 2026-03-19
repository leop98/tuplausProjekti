/*Pelaajista tallennettavat tiedot:
- Palaajan yksilöivä tunniste
- Nimi
- Pelitilin saldo

Pelitapahtumasta tallennettavat tiedot:
- Aikaleima
- Pelaajan yksilöivä tunniste
- Panos
- Pelaajan valinta (pieni vai suuri)
- Arvottu kortti
- Mahdollisen voiton suuruus
*/

CREATE TABLE players (
    id VARCHAR(255) NOT NULL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    balance INT NOT NULL,
    pending_win  INT        NOT NULL DEFAULT 0,
    in_game      BOOLEAN    NOT NULL DEFAULT FALSE
);

CREATE TABLE game_events (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    player_id VARCHAR(255) NOT NULL,
    bet INT NOT NULL,
    choice ENUM('small', 'large') NOT NULL,
    card TINYINT UNSIGNED NOT NULL,
    payout INT NOT NULL,
    FOREIGN KEY (player_id) REFERENCES players(id)
);