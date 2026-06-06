# Sofia Street Guesser

**Play at [streetguesser.noblore.com](https://streetguesser.noblore.com)**

A geography game where you identify streets on an interactive map of Sofia, Bulgaria. Streets are fetched live from OpenStreetMap and rendered as clickable polylines — no static data, always up to date.

## How it works

Each round presents a street name. Find and click it on the map before running out of attempts. Streets are colour-coded as you progress, and a leaderboard tracks the best scores.

**Game modes**

| Mode | Description |
|---|---|
| Easy | Common major streets, more attempts |
| Normal | Broader street set, standard attempts |
| Hard | Full street catalogue, fewer attempts |
| District | Pick one of 24 Sofia districts and play within it |
| Neighbourhood | Search and pick a specific neighbourhood |

## Stack

- **Next.js 15** — App Router, Turbopack
- **React 19** — custom CSS only, no component library
- **Leaflet** — direct instantiation, no react-leaflet wrapper
- **Supabase** — auth (Google OAuth) + Postgres scores/leaderboard
- **Vercel** — deployment target
- **Overpass API** — live street data from OpenStreetMap

## Getting started

**Prerequisites:** Node.js 20+, a Supabase project (optional — the game runs without auth)

1. Clone and install dependencies:

```bash
git clone https://github.com/JivkoNushev/SofiaStreetGuesser.git
cd SofiaStreetGuesser
npm install
```

2. Create a `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

If these variables are absent, auth is skipped and the game goes straight to mode selection.

3. Apply the database schema:

```bash
psql -h your-supabase-host -d postgres -f supabase/schema.sql
```

4. Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project structure

```
app/
  layout.tsx              — root layout, Inter font (Latin + Cyrillic)
  globals.css             — all shared styles, dark purple theme
  page.tsx                — renders <GameCanvas />
  leaderboard/[mode]/     — top-50 scores per mode
  api/streets/            — proxies Overpass API, caches result per mode
  api/scores/             — POST scores, reads leaderboard view
  api/neighbourhoods/     — lists Sofia neighbourhood names

components/
  GameCanvas.tsx          — game orchestrator, useReducer state machine
  GameMapInner.tsx        — Leaflet map, polylines, click/hover handlers
  AuthScreen.tsx          — Google OAuth + guest entry
  DistrictPicker.tsx      — 24-district selection grid
  NeighbourhoodPicker.tsx — searchable neighbourhood grid
  EndScreen.tsx           — results modal, save-score flow

lib/
  constants.ts            — map config, street styles, Overpass URL
  modes.ts                — mode definitions, district list
  streetData.ts           — parses Overpass JSON → structured street data
  utils.ts                — shuffle, time formatter, string normaliser
  supabase/               — SSR client helpers
```

## Leaderboard

Scores are stored in Supabase and ranked by correct answers (desc), then by duration (asc). The leaderboard is publicly readable at `/leaderboard`.

## License

[PolyForm Noncommercial 1.0.0](LICENSE) — free to use, modify, and share for non-commercial purposes.  
Street and map data © OpenStreetMap contributors, available under [ODbL](https://opendatacommons.org/licenses/odbl/).
