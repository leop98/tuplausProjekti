# Tuplaus-pelimoottori

Tuplaus on pokeripeleistä tuttu korttipeli, jossa pelaaja yrittää arvata onko edessä oleva kortti pieni vai suuri. Kortit 1–6 ovat pieniä, kortit 8–13 suuria. Jos kortti on 7, pelaaja häviää aina.

Tämä repositorio toteuttaa pelimoottorin: palvelimen, joka tarjoaa HTTP-rajapinnan peli-clienteille ja pyörittää pelilogiikan. Peli-clienttia ei ole toteutettu.

## Teknologiat

- **TypeScript** + **Node.js**
- **Express**: HTTP-palvelin
- **MySQL**: tietokanta
- **mysql2**: tietokantakirjasto
- **Docker** + **Docker Compose**: kontittaminen
- **Vitest**: testaus
- **ESLint**: koodin laatu

## Käynnistys Dockerilla

Vaatii [Docker Desktopin](https://www.docker.com/products/docker-desktop/).

```bash
docker compose up --build
```

Palvelin käynnistyy osoitteeseen `http://localhost:3000`. Docker luo automaattisesti MySQL-tietokannan ja tarvittavat taulut.

### Testien ajaminen Dockerilla

```bash
docker compose run --rm test
```

## Käynnistys ilman Dockeria

Vaatii:
- Node.js
- MySQL

Asenna riippuvuudet:

```bash
npm install
```

Käynnistä kehityspalvelin:

```bash
npm run dev
```

### Testien ajaminen ilman Dockeria

```bash
npm test
```

## Esimerkkikomennot (powershell ja bash)

**Luo pelaaja**
```powershell
$r = Invoke-RestMethod -Method Post -Uri "http://localhost:3000/players" `
  -ContentType "application/json" `
  -Body '{"id": "teppo123", "name": "Teppo", "balance": 1000}'
$ID = $r.id
$r | ConvertTo-Json
```

```bash
curl -s -X POST http://localhost:3000/players \
  -H "Content-Type: application/json" \
  -d '{"id": "teppo123", "name": "Teppo", "balance": 1000}'
```

**Hae pelaajan tiedot**
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/players/$ID" | ConvertTo-Json
```

```bash
curl -s http://localhost:3000/players/teppo123
```

**Pelaa kierros**
```powershell
Invoke-RestMethod -Method Post -Uri "http://localhost:3000/players/$ID/play" `
  -ContentType "application/json" `
  -Body '{"bet": 100, "choice": "small"}' | ConvertTo-Json
```

```bash
curl -s -X POST http://localhost:3000/players/teppo123/play \
  -H "Content-Type: application/json" \
  -d '{"bet": 100, "choice": "small"}'
```

**Tuplaa (jos edellinen kierros oli voitto)**
```powershell
Invoke-RestMethod -Method Post -Uri "http://localhost:3000/players/$ID/double" `
  -ContentType "application/json" `
  -Body '{"choice": "large"}' | ConvertTo-Json
```

```bash
curl -s -X POST http://localhost:3000/players/teppo123/double \
  -H "Content-Type: application/json" \
  -d '{"choice": "large"}'
```

**Kotiuta voitot (jos edellinen kierros oli voitto)**
```powershell
Invoke-RestMethod -Method Post -Uri "http://localhost:3000/players/$ID/cashout" | ConvertTo-Json
```

```bash
curl -s -X POST http://localhost:3000/players/teppo123/cashout
```

**Hae pelihistoria**
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/players/$ID/history" | ConvertTo-Json -Depth 5
```

```bash
curl -s http://localhost:3000/players/teppo123/history
```

---

## HTTP-rajapinta

Kaikki pyynnöt ja vastaukset ovat JSON-muodossa. Rahasummat ovat kokonaislukuja (senttiä, esim 100 = 1 euro).

---

### Pelaajan luominen

**`POST /players`**

Pyyntö:
```json
{
  "id": "teppo123",
  "name": "Teppo",
  "balance": 1000
}
```

Vastaus `201`:
```json
{
  "id": "teppo123",
  "name": "Teppo",
  "balance": 1000,
  "pendingWin": 0,
  "inGame": false
}
```

---

### Pelaajan tietojen haku

**`GET /players/:id`**

Vastaus `200`:
```json
{
  "id": "teppo123",
  "name": "Teppo",
  "balance": 1000,
  "pendingWin": 0,
  "inGame": false
}
```

---

### Pelikierroksen pelaaminen

**`POST /players/:id/play`**

Pelaaja lähettää panoksen ja arvauksensa. Pelimoottori arpoo kortin, vähentää panoksen saldosta ja asettaa mahdollisen voiton odottamaan kotiutusta tai tuplausta. Uutta kierrosta ei voi aloittaa ennen kuin edellinen on ratkaistu.

Pyyntö:
```json
{
  "bet": 100,
  "choice": "small"
}
```

Vastaus `200`:
```json
{
  "event_id": "uuid",
  "card": 3,
  "won": true,
  "pendingWin": 200,
  "balance": 900,
  "inGame": true
}
```

Virheet:
- `400`: panos tai valinta virheellinen
- `402`: saldo ei riitä
- `404`: pelaajaa ei löydy
- `409`: kierros jo käynnissä

---

### Tuplaus

**`POST /players/:id/double`**

Pelaaja voi tuplata voittonsa arvaamalla seuraavan kortin. Voidaan tehdä vain voittamisen jälkeen. Häviön sattuessa odottava voitto nollataan.

Pyyntö:
```json
{
  "choice": "large"
}
```

Vastaus `200`:
```json
{
  "event_id": "uuid",
  "card": 9,
  "won": true,
  "pendingWin": 400,
  "balance": 900,
  "inGame": true
}
```

Virheet:
- `400`: valinta virheellinen
- `404`: pelaajaa ei löydy
- `409`: ei aktiivista kierrosta

---

### Voittojen kotiutus

**`POST /players/:id/cashout`**

Lisää odottavan voiton pelaajan saldoon. Voidaan tehdä vain voittamisen jälkeen.

Vastaus `200`:
```json
{
  "balance": 1100
}
```

Virheet:
- `404`: pelaajaa ei löydy
- `409`: ei aktiivista kierrosta

---

### Pelihistoria

**`GET /players/:id/history`**

Vastaus `200`:
```json
{
  "player_id": "teppo123",
  "events": [
    {
      "id": "uuid",
      "timestamp": "2026-03-19T01:04:36.406Z",
      "playerId": "teppo123",
      "bet": 100,
      "choice": "small",
      "card": 3,
      "payout": 200
    }
  ]
}
```

---

## Tietokanta

### `players`
| Sarake | Tyyppi | Kuvaus |
|---|---|---|
| `id` | VARCHAR(255) | Pelaajan yksilöivä tunniste |
| `name` | VARCHAR(255) | Pelaajan nimi |
| `balance` | INT | Pelitilin saldo |
| `pending_win` | INT | Odottava voitto, kotiuttamatta |
| `in_game` | BOOLEAN | Onko kierros kesken |

### `game_events`
| Sarake | Tyyppi | Kuvaus |
|---|---|---|
| `id` | VARCHAR(36) | Tapahtuman yksilöivä tunniste (UUID) |
| `created_at` | DATETIME(3) | Aikaleima |
| `player_id` | VARCHAR(255) | Pelaajan tunniste |
| `bet` | INT | Panos |
| `choice` | ENUM | Pelaajan valinta (`small`/`large`) |
| `card` | INT | Arvottu kortti (1–13) |
| `payout` | INT | Voiton suuruus (0 = häviö) |

## Tekniset ratkaisut

**Palvelinpuolen pelitila**: `pending_win` ja `in_game` on lisätty `players`-tauluun pelitilan hallintaa varten. Tämä toteutus tehtiin estämään clientia lähettämästä minkä tahansa summan kotiutettavaksi. Palvelinpuolinen tila estää tämän: voittosumma luetaan aina tietokannasta, ei pyynnöstä. `in_game`-lippu estää lisäksi uuden kierroksen aloittamisen ennen kuin edellinen on ratkaistu.

**Tietokantatransaktiot**: kaikki saldomuutokset tehdään transaktiossa `FOR UPDATE` -lukolla, joka estää kilpailutilanteen saman pelaajan samanaikaisissa pyynnöissä.
