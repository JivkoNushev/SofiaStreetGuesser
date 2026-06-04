# Sofia Street Guesser — Codebase Context

## What this is
A Next.js 15 + React 19 + TypeScript geography game where players identify streets on a Leaflet map of Sofia, Bulgaria. No Tailwind — all styles are hand-written in `app/globals.css` and `app/page.module.css`.

## Stack
- **Framework**: Next.js 15 (App Router, Turbopack)
- **UI**: React 19, custom CSS only (no component library)
- **Map**: Leaflet 1.x via `react-leaflet`-free direct instantiation in `GameMapInner.tsx`
- **Auth + DB**: Supabase (SSR client in `lib/supabase/`)
- **Deploy target**: Vercel

## Architecture — Game phases
The entire game runs through `GameCanvas.tsx` which manages a `useReducer`-based state machine with these phases:

| Phase | Screen |
|---|---|
| `loading` | Loading spinner while fetching street data from Overpass API |
| `auth-select` | AuthScreen — Google OAuth or guest |
| `mode-select` | Mode cards (Easy / Normal / Hard / District / Neighbourhood) |
| `district-picker` | DistrictPicker grid |
| `neighbourhood-picker` | NeighbourhoodPicker with search |
| `playing` | Full-screen game: sidebar + Leaflet map |
| `ended` | EndScreen modal overlay |

## Key files
```
app/
  layout.tsx          — RootLayout, Inter font (latin+cyrillic)
  globals.css         — ALL shared styles (~1276 lines, no breakpoints currently)
  page.tsx            — Renders <GameCanvas /> only
  leaderboard/
    page.tsx          — Mode grid linking to each leaderboard
    [mode]/page.tsx   — Table of top 50 scores (rank, player, correct, accuracy, time)
  api/
    streets/route.ts  — Fetches Overpass data; modes: main|district|neighbourhood
    scores/route.ts   — POST saves a score; reads Supabase leaderboard view
    neighbourhoods/   — Lists Sofia neighbourhood names

components/
  GameCanvas.tsx      — Main game orchestrator; all game logic + reducer
  GameMap.tsx         — Dynamic import wrapper (SSR: false) for GameMapInner
  GameMapInner.tsx    — Leaflet map init, polylines, click/hover handlers
  AuthScreen.tsx      — Google OAuth + "Play as Guest" screen
  DistrictPicker.tsx  — 24-district grid
  NeighbourhoodPicker.tsx — Searchable neighbourhood grid
  EndScreen.tsx       — Results modal with save-score flow

lib/
  constants.ts        — CFG (center, zoom, maxAttempts), street styles, OVERPASS URL
  modes.ts            — MODES config (easy/normal/hard), DISTRICTS list
  streetData.ts       — Parses Overpass JSON → StreetInfo {name: {bestHighway, coords[][]}}
  utils.ts            — shuffle(), fmt(ms), normalise(str)
  supabase/           — client.ts, server.ts, isConfigured.ts
```

## Game layout (playing phase)
```
.gameScreen (display:flex, row)
├── .sidebar (288px fixed width)
│   ├── .sidebarHeader  — title, mode pill, user chip, HUD, quit/restart
│   ├── .targetSection  — "Find this street" + street name + attempt dots + skip
│   ├── .progSection    — progress bar
│   └── .listSection    — scrollable street list
└── .mapWrap (flex:1)
    ├── #ssg-map        — Leaflet canvas
    ├── .hintBar        — "Click the highlighted street to guess"
    └── .toast          — correct/wrong feedback
```

## CSS conventions
- Dark purple theme: `--bg #0d0d17`, `--surf #12121e`, `--accent #7c3aed`, `--accL #a78bfa`
- No CSS modules for shared styles (only `page.module.css` for landing page)
- BEM-ish class naming, no utility classes
- All styles in `globals.css` — no component-scoped CSS

## Supabase schema
See `supabase/schema.sql`. Key tables: `profiles`, `scores`. Key view: `leaderboard` (ranked by correct DESC, duration_ms ASC).

## Street data flow
1. On first load, `GET /api/streets?mode=main` fetches all Sofia named streets from Overpass API
2. Result cached in module-level `mainStreetInfo` variable (survives re-renders, not page reloads)
3. For district/neighbourhood modes, a separate API call fetches a smaller area
4. `streetData.ts` normalises Bulgarian/English prefix abbreviations (бул. → Булевард, etc.)

## Map interaction
- Polylines created per street segment in `GameMapInner.tsx`
- `click` event on polyline → `onClickStreet(name)` callback in GameCanvas
- `mouseover`/`mouseout` → hover highlight (desktop only, not touch)
- Correct/wrong streets get tooltip bound to them showing the name
- `flyToBounds` with padding `[80, 80]` on wrong reveal

## Environment variables needed
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```
If missing, `isSupabaseConfigured()` returns false → skips auth, goes straight to mode-select.
