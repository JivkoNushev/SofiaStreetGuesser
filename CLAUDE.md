# StreetGuesser — Codebase Context (Sofia edition)

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
  globals.css         — ALL shared styles, no utility classes
  page.tsx            — Renders <GameCanvas /> only
  leaderboard/
    page.tsx          — Mode grid linking to each leaderboard
    [mode]/page.tsx   — Table of top 50 scores; accepts ?city= param
  api/
    streets/route.ts  — Serves street data from Supabase; modes: main|district|neighbourhood; ?city=
    scores/route.ts   — POST saves a score; reads Supabase leaderboard view; city-aware
    neighbourhoods/   — Lists neighbourhood names for a city; ?city=
    popular-modes/    — Top-5 played maps for a city; ?city=
    track-play/       — Increments map_plays; city-aware

components/
  GameCanvas.tsx      — Main game orchestrator; reducer with city in state; all game logic
  GameMap.tsx         — Dynamic import wrapper (SSR: false) for GameMapInner
  GameMapInner.tsx    — Leaflet map init, polylines, fitBounds to data, click/hover handlers
  CitySwitcher.tsx    — City pill (1 city) / dropdown (≥2 cities); reads CITIES registry
  AuthScreen.tsx      — Google OAuth + "Play as Guest" screen
  DistrictPicker.tsx  — District grid; receives districts[] prop from GameCanvas
  NeighbourhoodPicker.tsx — Searchable neighbourhood grid; city-aware fetch
  EndScreen.tsx       — Results modal with save-score flow; city-aware

lib/
  cities.ts           — CityConfig interface + CITIES registry + getCity(); add cities here
  languages.ts        — LanguageProfile interface + LANGUAGES registry (bg, en) + getLanguage()
  constants.ts        — MAX_ATTEMPTS, HIERARCHY, ST (street styles), OVERPASS, TILE_URL
  modes.ts            — MODES config (easy/normal/hard) + VALID_MODES; no city/language deps
  streetData.ts       — buildStreetInfo(elements, lang) → StreetInfo; language-injected
  streetFetch.ts      — Overpass query builders and fetchers; takes CityConfig; ingest-only
  utils.ts            — shuffle(), fmt(ms), normalise(str)
  supabase/           — client.ts, server.ts, isConfigured.ts

scripts/
  refresh-streets.ts  — Ingest pipeline: Overpass → Supabase street_data; reads city registry

supabase/
  schema.sql          — Canonical schema (fresh DB). city column on street_data/scores/map_plays
  migrations/
    0001_add_city.sql — Migration for existing DBs: adds city column, rebuilds PKs/view/RPCs
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

---

# Architecture Audit

> Read-only audit of the current single-city (Sofia) architecture, verified from source — **not** a refactor plan. Goal: map every place the city is baked in, every separation-of-concerns issue, and the exact files that own each responsibility, as groundwork for a future multi-city design. File:line references were current at audit time.

## 0. Two corrections to the existing docs (verified from code)
The audit surfaced two places where the code contradicts how it's described elsewhere in this file:

1. **Runtime no longer hits Overpass.** The "Street data flow" section above (and the `loading` row / `api/streets` line in the tables) says `/api/streets?mode=main` "fetches all Sofia named streets from Overpass API". In the current code, `app/api/streets/route.ts` reads pre-baked rows from the Supabase **`street_data`** table; Overpass is contacted **only offline** by `scripts/refresh-streets.ts` (via `lib/streetFetch.ts`). The runtime never calls Overpass. (CSP `connect-src` in `next.config.ts` only allows `'self'` + `*.supabase.co`, confirming this.)
2. **`lib/constants.ts` `MAIN_QUERY` is dead code.** It is exported but imported nowhere (the real main query is built in `lib/streetFetch.ts:mainQuery`/`mainInsideQuery`). Its embedded bbox `(42.63,23.25,42.74,23.43)` is a stale Sofia value with no effect.

## 1. How the city system actually works
There is **no "city" concept in the code at all** — Sofia is the implicit, hardcoded universe. The system runs on two planes:

**A. Offline ingestion pipeline** (`npm run refresh-streets`)
```
scripts/refresh-streets.ts
  → lib/streetFetch.ts   (Overpass queries: WIDE_BBOX + area["name"="София"])
  → lib/streetData.ts    (parse + Bulgarian/English name normalisation → StreetInfo)
  → Supabase street_data (upsert, keyed by (mode, submode))
```
Produces three kinds of rows: `mode='main'` (submode `''`, whole-city street set), `mode='district'` (submode = district name), `mode='neighbourhood'` (submode = neighbourhood name).

**B. Runtime serve / play**
```
GameCanvas (client)
  → GET /api/streets?mode=main              → street_data row 'main'  → module cache `mainStreetInfo`
  → GET /api/streets?mode=district&...      → street_data row         → `districtCache`
  → GET /api/streets?mode=neighbourhood&... → street_data row         → `neighbourhoodCache`
```

**⚠️ "mode" is overloaded** — two different vocabularies share the word:
- **Data-partition mode** stored in `street_data`: `main | district | neighbourhood`.
- **Game/score mode** in `scores`/`map_plays`/UI: `easy | normal | hard | district | neighbourhood`.
- `easy/normal/hard` are **not** stored as data — they are **client-side filters over the single `main` blob**, computed in `GameCanvas.startMode` using `MODES[mode].highways` + `MODES[mode].nameFilter` (`GameCanvas.tsx:299-308`). The street-count badges on the mode screen recompute the same filter inline (`GameCanvas.tsx:447-456`).

## 2. Files by responsibility (requested inventory)

| Responsibility | Files | Notes |
|---|---|---|
| **Map rendering** | `components/GameMapInner.tsx` (Leaflet init, polylines, hover/click, `flyToBounds`); `components/GameMap.tsx` (dynamic `ssr:false` wrapper); config in `lib/constants.ts` (`CFG`, `ST`, `TILE_URL`, `TILE_ATTRIBUTION`); styles in `app/globals.css` | `MapPreview.tsx` is **not** a map — it's a pre-game leaderboard panel; the name is misleading. |
| **City selection** | **None exists.** City is hardcoded. Closest analogues are area pickers: `components/DistrictPicker.tsx`, `components/NeighbourhoodPicker.tsx`, and the inline mode-select screen in `GameCanvas.tsx:447-585`. | The "Sofia" `cityPill` (`GameCanvas.tsx:491-494`) is decorative text, not a selector. |
| **Boundary definitions** | `lib/streetFetch.ts` (`WIDE_BBOX`, `area["name"="София"]`, district/neighbourhood area queries); `lib/modes.ts` (`DISTRICTS` 24 names); `scripts/refresh-streets.ts:58-59` (neighbourhood-discovery bbox); `lib/constants.ts` (`CFG.center/zoom`, dead `MAIN_QUERY` bbox) | Effective persisted boundaries are the geometry baked into Supabase `street_data` rows. |
| **Data loading** | Runtime: `app/api/streets/route.ts`, `app/api/neighbourhoods/route.ts`, `app/api/popular-modes/route.ts`; client fetch+cache in `GameCanvas.tsx` (`mainStreetInfo`, `districtCache`, `neighbourhoodCache`, `start*Mode`). Offline: `scripts/refresh-streets.ts` + `lib/streetFetch.ts`. Parse: `lib/streetData.ts`. | Three module-level caches survive re-render but not reload. |
| **Routing** | App Router pages: `app/page.tsx`, `app/leaderboard/page.tsx`, `app/leaderboard/[mode]/page.tsx` (`?submode=`), `app/account/page.tsx`, `app/privacy`, `app/terms`, `app/auth/callback/route.ts`; `middleware.ts` (session refresh + matcher). | **In-app navigation is not URL-based** — screens are the reducer `phase` field in `GameCanvas`. No city/area is ever in the URL. |
| **User interactions** | `components/GameMapInner.tsx` (map click/hover); `GameCanvas.tsx` (`handleClickStreet`, `handleSkip`, dispatch, `start*Mode`); `DistrictPicker.tsx`/`NeighbourhoodPicker.tsx` (pick); `EndScreen.tsx` (save/login/replay); `AuthScreen.tsx` (OAuth/guest); `ScrollRow.tsx`; `app/account/DeleteButton.tsx` | Game logic + UI for all phases live together in `GameCanvas`. |

## 3. Hardcoded city-specific logic (multi-city blockers)

### 3a. Geographic / boundary constants
| Location | Value | Impact |
|---|---|---|
| `lib/constants.ts:2-3` | `CFG.center = [42.6977, 23.3219]`, `zoom = 13` | Map **always** opens on Sofia centre regardless of loaded data (see §4.3). |
| `lib/constants.ts:24-26` | `MAIN_QUERY` bbox `42.63,23.25,42.74,23.43` | Dead code; stale. |
| `lib/streetFetch.ts:5` | `WIDE_BBOX = '42.45,23.05,42.92,23.70'` | Sofia-region clamp on every Overpass query. |
| `lib/streetFetch.ts:14` | `area["name"="София"][boundary=administrative]` | Hardcoded city name for the main-area query. |
| `lib/streetFetch.ts:35-36` | neighbourhood `place`/`boundary` area lookup | Logic is city-agnostic but bbox-clamped to Sofia. |
| `scripts/refresh-streets.ts:58-59` | neighbourhood-discovery bbox `42.45,23.05,42.92,23.70` | Duplicate of `WIDE_BBOX`, separately hardcoded. |
| `lib/modes.ts:31-37` | `DISTRICTS` — 24 Sofia district names (Cyrillic) | Sofia geography living in a "modes" file (see §5.1). |

### 3b. Language / locale assumptions
| Location | Assumption |
|---|---|
| `lib/streetData.ts:17-64` | `hasCyrillic`, `expandBg` (бул./ул./пл./пр./кв./ж.к.), `expandEn`, `chooseName` (prioritises `name:bg` tag). Bulgaria-specific name canonicalisation. |
| `lib/modes.ts:3` | `BOULEVARD_RE = /^(бул[.\s]|булевард|boulevard|bul[.\s])/i` — drives the Easy-mode `nameFilter`. |
| `components/DistrictPicker.tsx:15`, `scripts/refresh-streets.ts:73` | `localeCompare(a, b, 'bg')` sort. |
| `app/layout.tsx:39,86`, `app/page.tsx:20` | `locale: 'bg_BG'`, `<html lang="bg">`, `inLanguage: ['bg','en']`. |

### 3c. Hardcoded "Sofia / София" copy (≈11 files)
`app/layout.tsx` (title/description/keywords/OG/Twitter), `app/page.tsx` (JSON-LD `about.name:'Sofia'`, `addressCountry:'BG'`), `app/manifest.ts`, `app/opengraph-image.tsx`, `app/leaderboard/page.tsx`, `app/leaderboard/[mode]/page.tsx`, `app/terms/page.tsx`, `components/AuthScreen.tsx:33`, `components/GameCanvas.tsx:422` + `:493` (`cityPill`). There is **no single city-name constant** — the string is scattered.

### 3d. Hardcoded user-input validation coupling
- `app/api/streets/route.ts:37-41` rejects any district not in the Sofia `DISTRICTS` array — the API is coupled to one city's district list.
- Neighbourhood names are validated only by length/control-chars (`route.ts:43-47`) and resolved against the DB list.
- **`VALID_MODES` is duplicated in 4 places** that must stay in sync: `app/api/scores/route.ts:4`, `app/api/track-play/route.ts:5`, `components/GameCanvas.tsx:19`, and the `scores.mode` CHECK constraint in `supabase/schema.sql:15`.

## 4. Architectural assumptions that block adding a city

**4.1 — No city dimension in the data model.** Every key is `(mode, submode)` with no city:
- `street_data` PK `(mode, submode)` — a second city's `main` row (submode `''`) **collides** with Sofia's; districts/neighbourhoods sharing a name across cities overwrite each other.
- `scores` unique index `(user_id, mode, coalesce(submode,''))` and `map_plays` PK `(mode, submode)` — same collision.
- `leaderboard` view partitions rank by `(mode, submode)` only — two cities with a like-named area would **merge their leaderboards**.

**4.2 — No city in the URL / routing.** `/leaderboard/[mode]?submode=` cannot distinguish cities; the game screen state is in-memory only. Per-city deep links, sitemaps, and SEO are impossible without a routing change (`app/sitemap.ts` enumerates Sofia `DISTRICTS` directly).

**4.3 — Map never fits to its data.** `GameMapInner.tsx:33` initialises at `CFG.center`/`CFG.zoom` (Sofia) and only ever `flyToBounds` on a wrong-answer reveal. Loading another city's streets would render them off-screen until the first reveal.

**4.4 — City is not configurable at all.** No `NEXT_PUBLIC_CITY` / city table / city config object exists. Env vars are Supabase-only (`NEXT_PUBLIC_SUPABASE_URL`, `_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`).

## 5. Separation-of-concerns violations
1. **`lib/modes.ts` mixes two concerns** — game difficulty config (`MODES`) and geographic data (`DISTRICTS`, a Sofia fact). They change for unrelated reasons.
2. **`GameCanvas.tsx` is a 751-line god component** — reducer + state machine + data fetching + three module-level caches + auth/session + pending-score replay + inline rendering of all 6 phases. Adding a city would touch this one file repeatedly.
3. **Mode cards are hardcoded JSX**, not derived from `MODES` — the three Basic-mode cards are written out by hand (`GameCanvas.tsx:541-558`), duplicating the config in `lib/modes.ts` (labels/descriptions/counts can drift).
4. **City name is presentation data scattered as literals** across ~11 files (§3c) instead of one source of truth.
5. **Mode list duplicated 4× (§3d)** with no shared constant between API, client, and DB.
6. **Naming overloads**: `mode` means two different things (§1); `MapPreview` renders no map.

## 6. Already city-agnostic / reusable (the good parts)
- **Tile layer** (`lib/constants.ts:28` CARTO Voyager) — works for any city; only `center`/`zoom` are Sofia-specific.
- **Game state machine / reducer** — pure game logic, no city knowledge.
- **Auth, RLS, scoring RPCs** (`supabase/schema.sql`) — sound; just lack a city key.
- **`StreetInfo` shape and the offline-pipeline structure** — reusable; only the queries/bbox/locale bits are Sofia-bound.
- **Street-style constants** (`ST`), CSS theme, security headers/CSP — fully generic.

---

# Proposed Multi-City Architecture

> Design only — **nothing here is implemented**. Builds on the Architecture Audit above. Code blocks are *shape sketches* to communicate intent, not final code. Verified against current code: there is no pre-existing `city` concept, no migration tooling (one hand-applied `supabase/schema.sql`), and all data keys are `(mode, submode)`.

## Guiding principle
**A city is data + configuration, never code paths.** Today "Sofia" is smeared across geographic constants, language rules, copy, and the data model (audit §3). The target state collapses all of that into (a) **one config object per city** in a code registry, and (b) **one `city` column** on the data tables. No component should ever branch on "which city" — it reads the active city's config and renders.

This directly answers the requirements: existing maps keep working (column defaults to `'sofia'`), a new city is one file + one ingestion run, config is centralized, boundaries become data not logic, the `city` column + DB-derived area lists scale to dozens, and the UI switches city via a dropdown in client state (no route explosion).

## 1. High-level design

```
                       lib/cities/  (CODE registry — source of truth for CONFIG)
                       ├── types.ts        CityConfig interface
                       ├── index.ts        CITIES map + DEFAULT_CITY + getCity()
                       ├── sofia.ts        ← today's hardcoded values move here
                       └── plovdiv.ts      ← a new city = a new file
                                │
            ┌───────────────────┼───────────────────────────┐
            ▼                   ▼                           ▼
   Offline ingestion     Runtime serve                Client UI
   scripts/refresh-      app/api/* read/write          GameCanvas reads active
   streets --city=X      with ?city / p_city           city from context;
   uses cfg.bbox,        default 'sofia'               CitySwitcher sets it;
   cfg.osmAreaName  ──▶  Supabase tables, all keyed ──▶ map fits cfg.bounds;
   cfg.normalizeName     (city, mode, submode)          caches keyed by city
```

Three layers, each city-parameterized:
- **Config layer** (`lib/cities/`) — static facts + the few *functions* a city needs (name normalization, boulevard matcher). Code, because some config literally is code (audit §3b) and can't live in a DB row.
- **Data layer** (Supabase) — gains a `city` column; otherwise unchanged. Street geometry, scores, plays, leaderboard all become per-city.
- **Presentation layer** — a single `CityProvider` (React context) exposes the active `CityConfig`; the decorative `cityPill` (`GameCanvas.tsx:491`) becomes a real `<CitySwitcher>`. Active city is held in client state, persisted to `localStorage`, and mirrored to a `?city=` search param for shareable links.

**Why a code registry for config, not a `cities` DB table:** (1) part of the config is functions/regex (`normalizeName`, `boulevardMatcher`) — not storable as data; (2) the game must run with Supabase absent (`isSupabaseConfigured()` → guest-only) so config can't require a DB round-trip; (3) city config changes rarely and benefits from types + code review + versioning. A DB-backed `cities` table is documented as a *later* option (deploy-free city addition) but rejected for v1 for these reasons.

**Why a switcher, not `/[city]/...` routes:** the in-game UI is already a reducer `phase` machine with no internal routing (audit §2), and there is one production city today on `/`. A dropdown + `?city=` param matches the existing pattern with the least churn and still yields shareable/SEO-able URLs. Per-city *SEO landing pages* (the only real argument for path routes) can be layered on later as `/[city]` without reworking the switcher, because the switcher already round-trips through the `?city=` param. No strong technical reason justifies path routes now.

## 2. Data model

Add a `city text not null default 'sofia'` column to every table that is currently keyed by `(mode, submode)`, and fold it into each key. The `default 'sofia'` is what keeps **existing maps working**: every current row backfills to Sofia automatically.

| Object | Today | Proposed |
|---|---|---|
| `street_data` | PK `(mode, submode)` | PK **`(city, mode, submode)`** |
| `scores` | unique `(user_id, mode, coalesce(submode,''))` | unique **`(user_id, city, mode, coalesce(submode,''))`** |
| `map_plays` | PK `(mode, submode)` | PK **`(city, mode, submode)`** |
| `leaderboard` view | `partition by mode, submode` | `partition by **city, mode, submode**` (+ `city` in select) |
| `save_score()` RPC | `(p_user_id, p_mode, p_submode, …)` | add **`p_city text`**; include in insert + on-conflict |
| `increment_map_plays()` RPC | `(p_mode, p_submode)` | add **`p_city text`** |

Migration sketch (illustrative — applied once, see §7 for risks):
```sql
alter table public.street_data add column city text not null default 'sofia';
alter table public.street_data drop constraint street_data_pkey,
  add constraint street_data_pkey primary key (city, mode, submode);

alter table public.scores add column city text not null default 'sofia';
drop index scores_user_map_unique;
create unique index scores_user_map_unique
  on public.scores (user_id, city, mode, coalesce(submode, ''));

alter table public.map_plays add column city text not null default 'sofia';
-- + recreate map_plays PK, the leaderboard view, and both RPCs with `city` threaded through
```

No new tables. The `city` value is the city `id` slug from the registry (`'sofia'`, `'plovdiv'`) — the single join key between code config and DB data. The huge per-city `main` blob is still loaded lazily (one city at a time, cached client-side), so dozens of cities cost nothing until visited.

**Rejected alternative:** encoding city into `submode` (e.g. `'sofia:Лозенец'`). Hacky, breaks the clean `submode = area name` semantics, complicates the leaderboard partition and URLs, and makes "all data for city X" queries awkward. A first-class indexed column is the obvious scale choice.

## 3. How city configuration is stored

A typed registry under `lib/cities/`. Adding `plovdiv.ts` + one line in `index.ts` is the entire code footprint of a new city.

```ts
// lib/cities/types.ts  — design sketch
export interface CityConfig {
  id:           string;          // 'sofia' — the DB `city` value AND the ?city= param
  displayName:  string;          // 'Sofia'
  displayNameLocal?: string;     // 'София'
  country:      string;          // 'BG' — JSON-LD addressCountry, OG locale

  // map render (§4)
  center:       [number, number];
  zoom:         number;
  bounds?:      [[number, number], [number, number]];  // preferred fitBounds target

  // offline ingestion only — read by scripts/streetFetch (§4)
  bbox:         [number, number, number, number];      // S,W,N,E for Overpass
  osmAreaName:  string;          // area["name"=…] for the main-area query

  // language / normalisation (was hardcoded in streetData.ts / modes.ts, audit §3b)
  collation:        string;                                   // localeCompare locale, e.g. 'bg'
  normalizeName?:   (name: string) => string;                 // default: identity
  chooseName?:      (tags: Record<string,string>) => string;  // default: tags.name
  boulevardMatcher?: (name: string) => boolean;               // Easy-mode filter; default /blvd|boulevard/i

  // areas — optional curated/ordered list; default = derive from street_data
  districts?:   string[];
}
```
```ts
// lib/cities/index.ts — design sketch
export const CITIES = { sofia, plovdiv } satisfies Record<string, CityConfig>;
export const DEFAULT_CITY = 'sofia';
export const getCity = (id?: string): CityConfig => CITIES[id ?? ''] ?? CITIES[DEFAULT_CITY];
```

What moves where (centralization):
- `CFG.center` / `CFG.zoom` (`constants.ts`) → per-city `center`/`zoom`/`bounds`. `CFG.maxAttempts`, `ST`, `TILE_URL`, `HIERARCHY`, `OVERPASS` stay global (game/infra facts, not city facts).
- `WIDE_BBOX` + `area["name"="София"]` (`streetFetch.ts`) → `bbox` / `osmAreaName`.
- `DISTRICTS` (`modes.ts`) → optional `districts`, default DB-derived (fixes the audit §5.1 concern-mixing). `MODES` stays global; its Easy `nameFilter` delegates to `activeCity.boulevardMatcher` instead of the hardcoded `BOULEVARD_RE`.
- `expandBg`/`expandEn`/`chooseName`/`hasCyrillic` (`streetData.ts`) → Sofia's `normalizeName`/`chooseName`; `streetData.ts` keeps only generic parsing and calls the city's normalizer. A new Latin-script city uses the identity default and "just works."
- Scattered "Sofia/София" copy (audit §3c) → derived from `getCity(active).displayName{,Local}`. Top-level static site metadata (`layout.tsx`, `manifest.ts`, `opengraph-image.tsx`) becomes city-neutral "StreetGuesser" branding (or default-city), with per-city SEO handled on city-scoped/param-aware pages.
- `VALID_MODES` duplicated 4× (audit §3d) → one exported constant shared by the API routes, client, and referenced by the DB CHECK.

## 4. How map boundaries are stored

"Boundary" means three different things; each lives at the right tier so **no per-city application logic is ever needed**:

1. **Ingestion boundary** — the Overpass `bbox` + `osmAreaName` used offline to *fetch* a city's streets. Pure config (`CityConfig.bbox` / `osmAreaName`), read only by `scripts/refresh-streets.ts` + `lib/streetFetch.ts`.
2. **Render viewport** — where the map opens. Config `bounds` (preferred) or `center`/`zoom`. The map calls `map.fitBounds(activeCity.bounds)` (or fits to the loaded street geometry) on init — **fixing audit §4.3**, where the map always opened on Sofia. This is the single change that makes the map city-correct with zero branching.
3. **Playable geometry** — the actual street polylines, already the `data` JSONB in `street_data`. This *is* the de-facto boundary of playable content; it gains only the `city` column.

So boundaries are entirely **data + declarative config**: a cheap static descriptor in code, concrete geometry in the DB. Optional future extension: store a city outline GeoJSON (in config or a `street_data` row with `mode='outline'`) if we ever want to draw the city border or do point-in-polygon — not needed now.

## 5. How a new city is added

End-to-end, for e.g. Plovdiv — no changes to game logic, map component, API routes, or DB schema (after the one-time migration):

1. **Create `lib/cities/plovdiv.ts`** exporting a `CityConfig`: `id:'plovdiv'`, display names, `center`/`zoom`/`bounds`, Overpass `bbox` + `osmAreaName:'Пловдив'`, `collation:'bg'`, and (since it's also Bulgarian) reuse Sofia's `normalizeName`/`chooseName`/`boulevardMatcher`. A Latin-script city would omit those and take the defaults.
2. **Register it** — add `plovdiv` to `CITIES` in `lib/cities/index.ts`.
3. **Ingest data** — `npm run refresh-streets -- --city=plovdiv`. The script reads the config, queries Overpass within `bbox`/`osmAreaName`, normalizes names, and upserts `street_data` rows with `city='plovdiv'` (main + districts + optional neighbourhoods).
4. **(Optional) SEO** — `app/sitemap.ts` iterates `CITIES` × areas instead of the Sofia `DISTRICTS` array; per-city leaderboard pages accept `?city=`.
5. **Deploy.** The `<CitySwitcher>` lists `Object.values(CITIES)` automatically; selecting Plovdiv sets client state + `?city=plovdiv`, the map fits Plovdiv's bounds, and `/api/streets?city=plovdiv&mode=main` serves its data.

The "minimal code changes" requirement is met: **one new file + one registry line + one CLI run.**

## 6. Pros and cons

**Pros**
- A city = one config file + data rows. Genuinely minimal footprint; scales to dozens (indexed `city` column, lazy per-city loading, DB-derived area lists — no N hardcoded arrays).
- Config centralized in `lib/cities/`; language logic lives *with its city* instead of polluting shared `streetData.ts`/`modes.ts`.
- Existing Sofia data and behavior untouched — `default 'sofia'` backfill + `?city`/`p_city` defaulting to sofia keep old clients and cached URLs working.
- Boundaries become data; the map fits config bounds with **no per-city branches** anywhere.
- Switcher matches the existing in-app-state UX and preserves SEO via `?city=` + sitemap enumeration; path-routing can be added later without rework.
- Forces cleanup of real debt found in the audit (mode-list duplication, concern-mixing in `modes.ts`, the never-fits map).

**Cons / trade-offs**
- Adding a city needs a **deploy** (config is code). Mitigation: acceptable because config includes functions; a DB `cities` table is the documented escape hatch if deploy-free addition is ever required.
- A **one-time DB migration** touches 3 tables + 1 view + 2 RPCs. Backward-safe via defaults, but must be applied carefully, and there's no migration tooling today (it'd be a new hand-applied SQL file alongside `schema.sql`).
- Client module-level caches must become **city-keyed** (a real refactor of `GameCanvas`, not just config).
- Top-level static metadata becomes city-neutral or default-city; truly per-city SEO still needs param-aware pages later.
- `GameCanvas` (already a 751-line god component, audit §5.2) absorbs city-context wiring unless partially decomposed at the same time.

## 7. Migration risks

- **City-unkeyed client cache (highest likelihood).** `mainStreetInfo` is a single global (`GameCanvas.tsx:180`) and `districtCache`/`neighbourhoodCache` are keyed by area name only. If not re-keyed by city, switching cities shows the **wrong city's streets**. Must become `Map<cityId, …>` (or reset-on-switch).
- **View/RPC drift.** `leaderboard` view, `save_score`, and `increment_map_plays` must add `city` *consistently*. A partial change silently **merges or drops scores**. The `scores` unique index must be dropped and recreated with `city`, or inserts for a second city collide on the old `(user_id, mode, '')` constraint.
- **Backfill correctness.** Postgres `ADD COLUMN … NOT NULL DEFAULT 'sofia'` backfills existing rows, but verify no row is left with a wrong/empty city, and that the PK rebuild succeeds on real data.
- **API `city` defaulting.** Every endpoint (`/api/streets`, `/api/scores`, `/api/track-play`, `/api/neighbourhoods`, leaderboard pages) must default a missing `city` to `'sofia'`, or old cached clients / bookmarked URLs break. Also replace the `DISTRICTS.includes(name)` guard (`streets/route.ts:38`) with a city-scoped DB existence check so it stops rejecting other cities' districts.
- **OAuth pending-score replay.** `localStorage['ssg_pending_score']` and `isValidPendingScore` (`GameCanvas.tsx:21`) have no `city` field; the save flow survives an OAuth redirect. Add `city` (optional, defaulted to sofia) so pre-migration pending blobs still validate and post to the right leaderboard.
- **Tile / CSP coupling.** The tile layer is global (fine), but a city wanting a different tile provider needs a `next.config.ts` CSP `img-src` update — a non-obvious cross-cutting edit.
- **Two meanings of "mode" (audit §1).** When threading `city`, don't conflate data-partition mode (`main/district/neighbourhood`) with game/score mode (`easy/normal/hard/...`); the `city` column applies to both planes but the mode vocabularies must stay distinct.

---

# Migration Plan

> Step-by-step roadmap to reach the Proposed Multi-City Architecture. **Not yet implemented.** Verified against current code (tree clean apart from these docs); file:line anchors current at writing.

## Sequencing strategy (why this order minimizes risk)
This follows **expand → migrate → contract** (a.k.a. parallel change). The governing trick: **introduce every city seam behaviour-neutrally with `'sofia'` as the hardcoded default, and add the second city dead last.** Until Phase 7 there is only one city and every new parameter defaults to `'sofia'`, so each phase is a **no-op in behaviour** and ships independently. The two genuinely risky changes — the DB column and the client cache re-keying — are isolated into their own phases, exercised while only Sofia exists, and gated behind explicit validation.

| # | Phase | Behaviour change? | Risk | Independently shippable |
|---|---|---|---|---|
| 0 | Baseline & safety net | none | — | n/a |
| 1 | Add city registry (Sofia only, no consumers) | none | very low | ✅ |
| 2 | Point existing code at registry (still single-city) | none | low | ✅ (per sub-step) |
| 3 | De-duplicate `VALID_MODES` | none | very low | ✅ |
| 4 | DB: add `city` column (default `'sofia'`) | none (app ignores it) | **high** | ✅ |
| 5 | Thread `city` through API + client (Sofia only) | none | **medium-high** | ✅ |
| 6 | Add `CitySwitcher` UI (one-item) | none | low | ✅ |
| 7 | Onboard 2nd city (Plovdiv) | **yes — first multi-city** | medium | ✅ |
| 8 | Multi-city SEO/metadata | additive | low | ✅ |

**Global validation baseline (run after every phase):** `npm run check` (`tsc --noEmit && next lint`) → `npm run build` → `npm run dev` smoke of all 6 game phases (loading → auth → mode-select → district/neighbourhood pick → map-preview → playing → ended), plus a logged-in score save and a guest→OAuth pending-score save. Capture this as the regression checklist in Phase 0. **Global rollback posture:** one phase = one PR/commit; everything except Phase 4 is forward-safe because of `'sofia'` defaults, so rollback is `git revert` of that PR. Phase 4 is the only schema-destructive step and carries a paired down-migration.

---

## Phase 0 — Baseline & safety net
- **Goal:** Make every later phase testable and reversible; record current behaviour as the regression oracle.
- **Files affected:** none (process only). Optionally add `docs/regression-checklist.md`.
- **Refactors required:** none. Create a working branch. Snapshot/branch the Supabase database (or `pg_dump` of `street_data`, `scores`, `map_plays`). Write down current counts: `select mode, submode, street_count from street_data`; top leaderboard rows for easy/normal/hard.
- **Risks:** none.
- **Validation steps:** confirm `npm run check` and `npm run build` are green on an untouched tree; run the smoke checklist once and save the results.
- **Rollback:** n/a.

## Phase 1 — Add the city registry (Sofia only, zero consumers)
- **Goal:** Introduce `lib/cities/` as pure additive code with Sofia's values mirrored exactly. Nothing imports it yet.
- **Files affected:** NEW `lib/cities/types.ts`, `lib/cities/sofia.ts`, `lib/cities/index.ts`.
- **Refactors required:** Define `CityConfig` (proposal §3). Populate `sofia.ts` with **byte-identical** current values: `center [42.6977,23.3219]`, `zoom 13`, `bbox` = today's `WIDE_BBOX` `42.45,23.05,42.92,23.70`, `osmAreaName 'София'`, `collation 'bg'`, `normalizeName` = the current `expandBg`/`expandEn` logic, `chooseName` = current `name:bg`-first, `boulevardMatcher` = current `BOULEVARD_RE`, `districts` = current `DISTRICTS`. `index.ts` exports `CITIES={sofia}`, `DEFAULT_CITY='sofia'`, `getCity()`.
- **Risks:** very low (dead code until Phase 2). Only risk is transcription drift — values not matching the originals.
- **Validation steps:** `npm run check` + `build` green. Add a throwaway assert/test (or a one-off `tsx` script) proving `sofia.normalizeName('бул. Витоша') === 'Булевард Витоша'` and that `sofia.districts` deep-equals `DISTRICTS`. Delete the throwaway after.
- **Rollback:** delete `lib/cities/` — nothing depends on it.

## Phase 2 — Point existing code at the registry (still single-city)
- **Goal:** Replace hardcoded geographic/language constants with reads from `getCity(DEFAULT_CITY)`, preserving behaviour because only Sofia exists. The originals become thin re-exports or are removed once unreferenced.
- **Files affected (one sub-step each):**
  - **2a — map render:** `lib/constants.ts` (remove `center`/`zoom` from `CFG`; keep `maxAttempts`, `ST`, `OVERPASS`, `HIERARCHY`, `TILE_URL/_ATTRIBUTION`; delete dead `MAIN_QUERY` L24-26), `components/GameMapInner.tsx` (init from active city's `center`/`zoom`; add `fitBounds(city.bounds)` on init — fixes audit §4.3), `components/GameCanvas.tsx` (`CFG.maxAttempts` stays).
  - **2b — modes/areas:** `lib/modes.ts` (`MODES.easy.nameFilter` delegates to `getCity().boulevardMatcher`; `DISTRICTS` re-exported from `sofia.districts` or removed), `components/DistrictPicker.tsx` + `app/sitemap.ts` + `app/api/streets/route.ts` (read district list from active city / DB).
  - **2c — parsing:** `lib/streetData.ts` (accept injected `normalizeName`/`chooseName`; move the bg/en functions into `sofia.ts` or a shared `lib/cities/normalizers.ts`).
  - **2d — ingestion:** `lib/streetFetch.ts` (query builders take `CityConfig` → `bbox`/`osmAreaName` instead of module constants `WIDE_BBOX`/`"София"`), `scripts/refresh-streets.ts` (read `getCity('sofia')`; replace the second hardcoded neighbourhood-discovery bbox L58-59).
- **Refactors required:** mechanical parameter-injection; no algorithm changes. Each sub-step is its own commit/PR.
- **Risks:** low. Subtle behaviour drift if a normalizer/bbox/regex is changed rather than relocated. `streetData.ts` is used by both runtime types and the offline script — keep its export surface stable.
- **Validation steps:** per sub-step run `check`+`build`; **2a** map opens on the same view; **2b** Easy/Normal/Hard show the same street counts as the Phase 0 baseline (the count loop at `GameCanvas.tsx:447-456`); **2c/2d** run `npm run refresh-streets` against a **scratch** `street_data` row and diff the JSON against current production data — must be identical.
- **Rollback:** revert the single sub-step's PR; sub-steps are ordered but each is independently green.

## Phase 3 — De-duplicate `VALID_MODES`
- **Goal:** One source of truth for the game-mode list (audit §3d).
- **Files affected:** `lib/modes.ts` (export `GAME_MODES`), `app/api/scores/route.ts:4`, `app/api/track-play/route.ts:5`, `components/GameCanvas.tsx:19`. (DB `scores.mode` CHECK at `schema.sql:15` documented as the 4th copy; left as-is or aligned in Phase 4.)
- **Refactors required:** replace three inline `new Set([...])` with the shared constant.
- **Risks:** very low; ensure the set membership is unchanged.
- **Validation steps:** `check`+`build`; submit one score and one track-play for each mode and confirm 200s.
- **Rollback:** `git revert`.

## Phase 4 — DB: add `city` column, default `'sofia'` (expand, backward-compatible)
- **Goal:** Make the schema multi-city while the **app still ignores `city`** — the schema accepts but does not require it.
- **Files affected:** NEW `supabase/migrations/0001_add_city.sql` (forward) + `0001_add_city_down.sql` (rollback); update `supabase/schema.sql` to the new canonical shape (docs).
- **Refactors required (all defaulting `city='sofia'`):**
  - `street_data`: add `city`; rebuild PK → `(city, mode, submode)`.
  - `scores`: add `city`; drop+recreate `scores_user_map_unique` → `(user_id, city, mode, coalesce(submode,''))`; prepend `city` to `scores_map_idx`.
  - `map_plays`: add `city`; rebuild PK → `(city, mode, submode)`.
  - `leaderboard` view: add `city` to select; `partition by city, mode, submode`.
  - `save_score(...)`: add trailing `p_city text default 'sofia'`; include in insert + `on conflict`. The default lets the current app keep calling it **without** `p_city` (PostgREST omits defaulted args) — this is what decouples Phase 4 from Phase 5.
  - `increment_map_plays(...)`: add `p_city text default 'sofia'`.
- **Risks:** **high — the only schema-destructive phase.** PK/index rebuilds on live data; a malformed view/RPC silently merges or drops scores; dropping `scores_user_map_unique` mid-write could allow a transient dup.
- **Validation steps:** apply to the **Phase 0 DB branch/copy first**, never prod-first. Verify: row counts unchanged; every row has `city='sofia'`; `select * from leaderboard where mode='easy'` matches the Phase 0 snapshot; call `save_score` **without** `p_city` (simulating the un-migrated app) and confirm it still upserts to Sofia; `/api/streets?mode=main` against the branch DB returns identical data. Only then apply to prod.
- **Rollback:** run `0001_add_city_down.sql` (drop columns, restore original keys/index/view/RPC signatures). Because the app doesn't yet send `city`, dropping the columns is safe. Keep the DB snapshot until Phase 7 succeeds.

## Phase 5 — Thread `city` through API + client (still only Sofia exists)
- **Goal:** App becomes city-aware end-to-end, defaulting to `'sofia'`, while only Sofia data exists — so reads stay correct and behaviour is unchanged. **This phase contains the cache-keying risk (audit §7).**
- **Files affected:**
  - **5a — API:** `app/api/streets/route.ts` (accept `?city`, default `'sofia'`, validate against `CITIES`, `.eq('city', …)`; replace the `DISTRICTS.includes` guard L38 with a city-scoped existence check), `app/api/scores/route.ts` + `app/api/track-play/route.ts` (read `city` from body → `p_city`), `app/api/neighbourhoods/route.ts` (`.eq('city', …)`).
  - **5b — client plumbing:** `components/GameCanvas.tsx` — add active-city state (default `'sofia'`, persisted to `localStorage`, read from `?city=`); **re-key the caches**: `mainStreetInfo` → `Map<cityId, StreetInfo>` (L180), and include `city` in `districtCache`/`neighbourhoodCache` keys (L181-182); add `city` to all `/api/streets` fetch URLs (L218/320/342) and to the scores POST.
  - **5c — pending-score (both ends):** `components/EndScreen.tsx:60` (include `city` in the `ssg_pending_score` blob) and `components/GameCanvas.tsx:21,247-252` (`isValidPendingScore` accepts optional `city`, defaulting to `'sofia'` so pre-migration blobs still validate; forward `city` to the replay POST).
  - **5d — reads:** `components/MapPreview.tsx`, `app/leaderboard/page.tsx`, `app/leaderboard/[mode]/page.tsx` (filter by `city`, default `'sofia'`).
- **Refactors required:** parameter threading + the cache-map change. No game-logic change.
- **Risks:** **medium-high.** The cache re-key is the most likely bug (audit §7) — miss it and a future switch shows the wrong city; with one city it's latent, so test the *plumbing* explicitly. An API endpoint that forgets to default `city` would 4xx old cached clients/bookmarks.
- **Validation steps:** `check`+`build`; full play-through still saves to the Sofia leaderboard; guest→OAuth pending-score still replays (with and without a `city` field in the stored blob); inspect network calls to confirm `city=sofia` is sent and accepted; unit-test the cache map with two synthetic city keys to prove isolation even though only Sofia is wired.
- **Rollback:** revert the client/API PRs; the Phase 4 columns sit harmlessly unused.

## Phase 6 — Add the `CitySwitcher` UI (one city for now)
- **Goal:** Replace the decorative `cityPill` with a real switcher bound to the Phase 5 active-city state + `?city=` param.
- **Files affected:** NEW `components/CitySwitcher.tsx`; `components/GameCanvas.tsx:491-494` (swap `cityPill` for `<CitySwitcher>`); `app/globals.css` (dropdown styles).
- **Refactors required:** small presentational component listing `Object.values(CITIES)`; on select → set state + update `?city=`. With one city, render as a static pill or hide the menu until `CITIES` has ≥2.
- **Risks:** low; isolated UI. Ensure switching to the already-active city is a true no-op (no cache wipe needed, but a switch to a *different* city must clear/replace per-city caches — wired in Phase 5).
- **Validation steps:** `check`+`build`; switcher renders; selecting Sofia is a no-op; `?city=sofia` round-trips on reload.
- **Rollback:** revert the component swap; `cityPill` returns.

## Phase 7 — Onboard the second city (the flip)
- **Goal:** First real multi-city state. Everything is now city-aware and Sofia-safe, so adding data cannot affect Sofia.
- **Files affected:** NEW `lib/cities/plovdiv.ts`; `lib/cities/index.ts` (register `plovdiv`). Data-only: run `npm run refresh-streets -- --city=plovdiv`.
- **Refactors required:** none in app code — this is the payoff. Author the config; ingest data.
- **Risks:** medium but contained. Bad Overpass `bbox`/`osmAreaName` → empty/incorrect Plovdiv data (does **not** touch Sofia rows). Surfaces any city-keying gap missed in Phase 5.
- **Validation steps:** switch to Plovdiv → its streets load, map fits Plovdiv bounds, Easy/Normal/Hard populate, its leaderboard is separate; switch back to Sofia → identical to baseline; confirm `street_data`/`scores`/`map_plays` now hold both `city` values with no cross-contamination.
- **Rollback:** `delete from street_data/scores/map_plays where city='plovdiv'` + remove `plovdiv.ts` from the registry. Sofia is untouched by construction.

## Phase 8 — Multi-city SEO & site metadata (optional, additive)
- **Goal:** Make discovery/metadata city-aware now that multiple cities exist.
- **Files affected:** `app/sitemap.ts` (iterate `CITIES` × areas instead of Sofia `DISTRICTS`), `app/leaderboard/page.tsx` + `[mode]/page.tsx` (`?city=` aware titles), and the site-level copy in `app/layout.tsx`, `app/manifest.ts`, `app/opengraph-image.tsx`, `app/page.tsx`, `components/AuthScreen.tsx`, `app/terms/page.tsx` (neutralize to "StreetGuesser" or default-city; the 10 files carrying hardcoded `Sofia/София`).
- **Refactors required:** template strings from `getCity(active|default).displayName`; sitemap loop over cities.
- **Risks:** low; SEO/markup only. Watch for OG-image rendering and canonical/`hreflang` correctness.
- **Validation steps:** `check`+`build`; fetch `/sitemap.xml` and confirm per-city URLs; render `/opengraph-image`; Lighthouse/SEO spot-check.
- **Rollback:** `git revert`; purely cosmetic/SEO.

---

# Architecture Review & Simplifications

> Senior-staff design review of the two sections above, **challenging my own proposal**. Verified against current code. Net conclusion: the *spine* of the proposal is right (a `city` column + a small code-level config + a switcher), but it was **over-justified, over-fielded, and over-phased**, and — most importantly — the migration plan **missed half the caches that actually need city-keying**. The corrected design is meaningfully smaller.

## TL;DR verdict
| Proposed | Verdict | Simpler replacement |
|---|---|---|
| `city` column on data tables | ✅ keep | — |
| Code/file config over a DB `cities` table | ✅ keep, **but my reasoning was wrong** | It's not "functions can't live in a DB" (the functions are build-time only) — it's plain YAGNI: a static file beats a DB table for ~dozens. |
| `CityConfig` with ~12 fields incl. `center/zoom/bounds` + per-city functions | ⚠️ overengineered | ~3 runtime fields; **fit map to data**; **language profiles**, not per-city functions |
| `CityProvider` React context | ❌ cut | `city` in the existing `GameCanvas` reducer + `localStorage` + `?city=`; server pages read the param |
| Optional curated `districts` list per city | ⚠️ | Always derive from `street_data`; delete the `DISTRICTS` array |
| 8-phase migration with RPC-default-param zero-downtime trick | ⚠️ over-phased | ~4 phases; one maintenance window (this app has no zero-downtime SLA) |
| "Re-key the **client** caches" (3 named) | ❌ **incomplete** | **6** caches need it — 3 client **+ 3 server** |

## 1. Unnecessary abstractions
- **`CityProvider`/Context — cut it.** The active city is needed in a handful of places, almost all inside `GameCanvas`'s subtree, which *already* owns game state via `useReducer`. Add `city` to that reducer (next to `mode`/`submode`), persist to `localStorage`, mirror to `?city=`. The leaderboard pages are **separate server routes** that read `searchParams.city` directly — they never needed a client context. A Provider is ceremony for state that already has a home.
- **Per-city normalization functions — wrong granularity.** `normalizeName`/`chooseName`/`boulevardMatcher`/`collation` are **language**-specific, not city-specific. Sofia and Plovdiv are both `bg` and would copy-paste identical functions (a maintenance trap I introduced). Replace with a tiny `LANGUAGES` map keyed by `'bg'`/`'en'`/…; each city just declares `language: 'bg'`. New language → add one profile (or fall back to a no-op default). Fewer moving parts, no duplication.
- **The "config must be code because of functions" justification was itself a bad abstraction.** Those functions run **only in the offline ingest path** (`scripts/refresh-streets.ts → streetData.buildStreetInfo`); they are already erased from the client bundle (only the *types* are shared). So the **runtime** city config is pure data (`{ id, displayName, country }`), and the ingest config (`bbox`, `osmAreaName`, language profile) lives next to the script. Two tiers by lifecycle — don't ship ingest concerns to the browser.

## 2. Overengineering
- **Drop `center`/`zoom`/`bounds` from per-city config — fit the map to the data.** `GameMapInner` only mounts in the `playing` phase, by which point `streetInfo` is already populated (verified: `BEGIN_GAME` sets it before `phase==='playing'`). So `map.fitBounds(L.featureGroup(polylines).getBounds())` on mount gives a correct view for **any** city automatically, fixes audit §4.3 for free, and **deletes three config fields that could be authored wrong**. A single global fallback centre covers the empty-data edge.
- **Always derive districts from `street_data`; delete `DISTRICTS` entirely.** The ingest already writes one row per district. `DistrictPicker`/`sitemap`/`api` read distinct districts for the active city. Removes the hardcoded array (audit §5.1) *and* the `DISTRICTS.includes` guard (`streets/route.ts:38`). **Tradeoff (be honest):** `DistrictPicker` currently renders instantly from the static array (`:4,:15`); deriving means it gains a fetch + loading state — exactly like `NeighbourhoodPicker` already has. Acceptable and more consistent.
- **The migration is over-phased.** 8 phases with the `p_city DEFAULT 'sofia'` trick exist to let the *old app run against the new schema simultaneously* — i.e. zero-downtime. This app has real scores but **no 24/7 SLA**; a short maintenance window is fine. Dropping that constraint lets the DB + API + client land together and removes the RPC-default gymnastics. → **~4 phases** (below). Keep the split only if zero-downtime is genuinely wanted.

## 3. Performance
- **Pre-existing, now repeated per city: the `main` blob is downloaded whole and filtered client-side.** Easy/Normal/Hard all pull the entire city street set (all geometry) then filter in `startMode`. Multi-city doesn't worsen the aggregate (blobs load lazily, one city at a time) but it *multiplies the worst case* if users browse cities. **Not a multi-city blocker — flag separately**: if Sofia's `main` JSON is multi-MB, consider gzip/precomputed per-difficulty subsets later. Out of scope for "add cities easily."
- **`leaderboard` view with `partition by city, mode, submode`:** fine at hobby scale; the rebuilt index covers it. Only revisit at very large row counts.
- **Client cache `Map<cityId, StreetInfo>` is unbounded** — a session switching through many cities accumulates blobs. Trivial to bound (LRU of 2–3) or just accept; note it.

## 4. Developer experience — the real cost is data, not code
- **"Minimal code changes" is true; "minimal effort" is not.** Adding a city = author `bbox` + exact OSM `osmAreaName` (e.g. Cyrillic `"Пловдив"`) + run `refresh-streets`, which hits the **rate-limited public Overpass API**, takes minutes, and **fails per-district** (the script already logs `✗ FAILED` and supports `--districts=` retry). The architecture can't fix Overpass; set expectations that ingestion is the bottleneck. Mitigation: keep the existing retry flags; document a "verify counts after ingest" step.
- **Authoring bbox/area is error-prone.** A wrong bbox silently yields empty/partial data. Cheap mitigation: the ingest script should **hard-fail if the main fetch returns 0 streets** rather than upserting an empty blob.

## 5. Future maintenance risks
- **🔴 Biggest finding — the cache surface is 6, not 3.** My plan said "re-key the client caches." Verified, the in-memory single-city caches are:
  1. `components/GameCanvas.tsx:180` `mainStreetInfo` (client)
  2. `components/GameCanvas.tsx:181` `districtCache` (client)
  3. `components/GameCanvas.tsx:182` `neighbourhoodCache` (client)
  4. `app/api/streets/route.ts:49` server `cache` keyed `` `${mode}:${name}` `` — **no city → district "Center" in two cities collide**
  5. `app/api/neighbourhoods/route.ts:9-10` single global `cached`/`cachedAt` — **serves city A's neighbourhoods for city B**
  6. `app/api/popular-modes/route.ts:15-18` `map_plays` top-5 **with no city filter → mixes cities**
  Every one silently assumes a single city. Missing any (the plan missed 4–6) ships a wrong-data bug. **Action:** Phase B's checklist must enumerate all six; the server cache key becomes `` `${city}:${mode}:${name}` ``, neighbourhoods caches per city, popular-modes either filters by city or is explicitly defined as global.
- **`leaderboard` view + 2 RPCs must stay in lockstep on `city`** — already flagged; reiterate as the second-highest risk.
- **`CityConfig` field creep** — every "just one more per-city knob" grows the interface. Counter-pressure: default everything; new field must justify why it can't be a language-profile or derived value.

## 6. Scalability assumptions
- **"Dozens of cities" is aspirational, not a present requirement (one prod city today).** Build for ~5–20: a static config file + a column. **Explicitly do not build** a `cities` admin table, a CMS, or dynamic city onboarding UI — that's the overengineering this review exists to prevent. The column scales to thousands; the file is fine to dozens; revisit only if a real operator needs deploy-free city creation.
- **Considered and rejected: subdomain-per-city** (`plovdiv.streetguesser.…`, single-city deploys). Simplest possible *data* model (no column at all) and total isolation — but it violates the **explicit switcher requirement**, fragments the shared leaderboard/social layer, and multiplies deployments. Mentioned for completeness; the switcher + shared DB justify the single-app + column approach.

## 7. Simplified design (delta from the proposal)
```
lib/cities.ts                 // ONE file: CITIES record + DEFAULT_CITY + getCity()
  city = { id, displayName, country, language, bbox, osmAreaName }   // ~6 fields, 2 build-only
lib/languages.ts              // { bg: { collation, normalizeName, chooseName, boulevardMatcher }, en: {…} }
                              //   referenced by city.language; defaults = no-op/identity
```
- Runtime config the React app sees ≈ `{ id, displayName, country }`. Map view = fit-to-data. Districts/neighbourhoods = derived from `street_data`. City lives in the `GameCanvas` reducer + `?city=`. No Context, no `DISTRICTS`, no `center/zoom/bounds`.

## 8. Simplified migration (8 → 4 phases)
- **Phase A — Refactor to config, single-city, zero behaviour change.** Merge old Phases 1–3: add `lib/cities.ts` + `lib/languages.ts` (Sofia/`bg` mirrored exactly), point `constants/modes/streetData/streetFetch/refresh-streets` at them, switch the map to fit-to-data, dedup `VALID_MODES`. Validate: counts + refreshed JSON identical to baseline. Ship. *(No DB.)*
- **Phase B — Go multi-city-ready in one window.** Merge old Phases 4–6: DB `city` column (backfill `'sofia'`, rebuild keys/view/RPCs), thread `city` through **all six caches** + API + client + pending-score (both ends: `EndScreen.tsx:60`, `GameCanvas.tsx:21/247`), add the `CitySwitcher`. Test the schema on a DB branch first. Still only Sofia exists, so behaviour is unchanged. Ship.
- **Phase C — Onboard Plovdiv.** Config + `refresh-streets --city=plovdiv`. First multi-city state; Sofia untouched by construction. Ship.
- **Phase D — (optional) per-city SEO.** Only if/when a second city actually warrants shareable rich previews; otherwise keep Sofia as flagship metadata and skip. YAGNI.

(If zero-downtime ever matters, re-split B into the original 4/5/6 with the `DEFAULT 'sofia'` RPC trick — the only reason that ceremony existed.)

## 9. What NOT to change (resist over-correction)
The `city` column (not submode-encoding), file-based config (not a DB table), the switcher + `?city=` param (not path routes), fit-to-data, and the `default 'sofia'` backfill are all correct and should survive review unchanged. The simplifications above remove abstraction and phases **without** touching this load-bearing spine.

---

# Implementation Status

> **Phase A (= original Phases 1+2+3) — DONE.** City registry, language profiles, all consumers migrated, dead code removed, VALID_MODES de-duplicated.
> **Phase B (= original Phases 4+5+6) — DONE.** DB migration, all 6 caches city-keyed, city threaded through all APIs + client, CitySwitcher added.
> **Phase C** — next: add a second city (e.g. Plovdiv). See "How a new city is added" in §5 above.

## Phase A — City registry + refactor (DONE)

> Merged original Phases 1, 2, 3. Behaviour-neutral, single-city, zero DB changes.

### What was completed
- **NEW `lib/languages.ts`** — `LanguageProfile` interface + `LANGUAGES` registry (`bg`, `en`) + `getLanguage(id)`.
- **NEW `lib/cities.ts`** — `CityConfig` interface + `CITIES` registry (just `sofia`) + `DEFAULT_CITY` + `getCity(id?)`. Includes `districts` (24 Sofia districts) as an ingest-only field.
- **`lib/constants.ts`** — removed `center`/`zoom` from `CFG`; removed dead `MAIN_QUERY`; renamed `CFG.maxAttempts` to `MAX_ATTEMPTS`.
- **`lib/modes.ts`** — removed `BOULEVARD_RE`, `DISTRICTS`, and `nameFilter`; added `VALID_MODES` export.
- **`lib/streetData.ts`** — `buildStreetInfo(elements, lang)` takes injected `LanguageProfile`; removed all inline language helpers.
- **`lib/streetFetch.ts`** — query builders take `CityConfig`; removed `WIDE_BBOX` / hardcoded `"София"`.
- **`scripts/refresh-streets.ts`** — uses `getCity('sofia')` + `getLanguage(city.language)`; no hardcoded strings.
- **`components/GameMapInner.tsx`** — removed `CFG` import; map inits without center/zoom; `fitBounds` to loaded street geometry after polylines are drawn.
- **`app/sitemap.ts`** — uses `getCity('sofia').districts` instead of `DISTRICTS`.

## Phase B — DB + city threading (DONE)

> DB migration + all 6 caches city-keyed + city through all APIs + client + CitySwitcher.

### What was completed
- **`supabase/migrations/0001_add_city.sql`** — adds `city text not null default 'sofia'` to `street_data`, `scores`, `map_plays`; rebuilds PKs and indexes; recreates `leaderboard` view partitioned by `(city, mode, submode)`; updates `save_score` and `increment_map_plays` RPCs with `p_city text default 'sofia'`.
- **`supabase/schema.sql`** — updated to reflect canonical post-migration schema.
- **`app/api/streets/route.ts`** — accepts `?city`, validates, defaults to `DEFAULT_CITY`; cache key is `${city}:${mode}:${name}`.
- **`app/api/scores/route.ts`** — reads `city` from body, passes `p_city` to RPC; rank query filters by city.
- **`app/api/track-play/route.ts`** — reads `city` from body, passes `p_city` to RPC.
- **`app/api/neighbourhoods/route.ts`** — per-city `Map<string, CacheEntry>` cache; DB query filters by city.
- **`app/api/popular-modes/route.ts`** — accepts `?city`; DB query filters by city.
- **`app/leaderboard/[mode]/page.tsx`** — accepts `?city`; leaderboard + map_plays queries filter by city.
- **`components/CitySwitcher.tsx`** (NEW) — static pill when `CITIES` has 1 entry; `<select>` dropdown when ≥2.
- **`components/GameCanvas.tsx`** — `city` in reducer state; `SET_CITY` action; all 3 client caches city-keyed (`Map<cityId,…>` / `${cityId}:${name}` keys); city synced to `localStorage` + `?city=` URL param; boulevard filter uses `getLanguage(activeCity.language).boulevardMatcher`; pending-score replay guarded by `pendingScoreCheckedRef`.
- **`components/DistrictPicker.tsx`** — accepts `districts: string[]` prop.
- **`components/NeighbourhoodPicker.tsx`** — accepts `city: string` prop; re-fetches on city change.
- **`components/EndScreen.tsx`** — `city` prop; included in scores POST body + localStorage pending blob.
- **`components/MapPreview.tsx`** — `city` prop; leaderboard query filters by city.

### To deploy Phase B
1. Apply `supabase/migrations/0001_add_city.sql` in the Supabase SQL editor.
2. Verify: `select city, mode, count(*) from street_data group by 1,2 order by 1,2;` — all rows show `city='sofia'`.
3. Push to git → Vercel auto-deploys.

### How a new city is added (Phase C)
1. Add an entry to `CITIES` in `lib/cities.ts` with `id`, `displayName`, `displayNameLocal`, `country`, `language`, `bbox`, `osmAreaName`, and `districts`.
2. Run `npm run refresh-streets -- --city=<id>` to ingest street data.
3. Deploy. `CitySwitcher` lists it automatically.

# Phase 1 — Implementation Log (archived)

> This section is preserved as historical context. See "Implementation Status" above for the current state.

> Status: **DONE — awaiting review.** Do not start Phase 2 until this is reviewed.

## Scope decision (please confirm)
The original Migration Plan "Phase 1" and the later "Architecture Review & Simplifications" describe the registry differently. Implemented = **Phase 1's *scope*** (add the city registry, Sofia only, **zero consumers**, behaviour-preserving) using the **Review's *simplified shape*** (flat files, language profiles, minimal fields, no `center/zoom/bounds`, no `DISTRICTS` array), because the Review is the latest documented architecture. If you'd rather have the original directory layout (`lib/cities/{types,sofia,index}.ts`) or the original field set, say so and I'll adjust.

## What was completed
- **NEW `lib/languages.ts`** — `LanguageProfile` interface + `LANGUAGES` registry (`bg`, `en`) + `getLanguage(id)`. The `bg` profile mirrors today's Sofia naming/sorting logic **exactly** (`hasCyrillic`/`expandBg`/`expandEn`/`chooseName` from `lib/streetData.ts`, and `BOULEVARD_RE` from `lib/modes.ts`). `en` is a conservative Latin-script default/template, used by no one yet.
- **NEW `lib/cities.ts`** — `CityConfig` interface + `CITIES` registry (just `sofia`) + `DEFAULT_CITY` + `getCity(id?)`. Sofia's `bbox`/`osmAreaName` mirror `lib/streetFetch.ts` (`WIDE_BBOX`, `area["name"="София"]`); `language:'bg'`.
- **No existing files modified** (besides this doc). The registries have **zero consumers**, so the running app is byte-for-byte unchanged.

## Validation performed (all green)
- `npx tsc --noEmit` — whole project typechecks.
- `npx eslint lib/cities.ts lib/languages.ts` — clean.
- Throwaway fidelity script (created, run, **deleted**): 14/14 PASS, confirming `bg.normalizeName('бул. Витоша')==='Булевард Витоша'`, `ж.к.`→`Жилищен комплекс`, en `Blvd.`→`Boulevard`, boulevard match/no-match, `chooseName` name:bg priority, and `getCity()`/unknown-id both → `sofia`.
- `git status`: only `lib/cities.ts`, `lib/languages.ts` (new) + `CLAUDE.md`.

## Decisions made
- **Language profiles over per-city functions** (Review §1) — Sofia declares `language:'bg'`; `lib/cities.ts` references it by a **type-only** import so the pure-data registry never bundles ingest functions.
- **Omitted `center`/`zoom`/`bounds`** — map will fit to street geometry in a later phase (Review §2). Values remain live in `lib/constants.ts`, untouched.
- **Omitted any `districts` array** — to be derived from `street_data` later (Review §2). `lib/modes.ts DISTRICTS` remains the live source for now.
- **`bbox` stored as a tuple** `[42.45, 23.05, 42.92, 23.70]`; note JS renders the last value `23.7`. When joined for Overpass this yields `…,23.7` vs the original `…,23.70` — **numerically identical**, no behavioural effect (and irrelevant until Phase 2 wires it).
- **`bg.chooseName` kept faithful**, including the currently-redundant Cyrillic branch from `streetData.ts`, to avoid any behavioural drift in Phase 1.

## Remaining work (NOT started — Phase 2 / Review Phase A)
Point existing code at the registries, still single-city, behaviour-neutral:
1. `lib/constants.ts` — drop `center`/`zoom` from `CFG`; delete dead `MAIN_QUERY`. `GameMapInner.tsx` — fit to street geometry instead of `CFG.center/zoom`.
2. `lib/modes.ts` — `MODES.easy.nameFilter` → `getLanguage(city.language).boulevardMatcher`; remove `BOULEVARD_RE`/`DISTRICTS` once consumers are migrated.
3. `lib/streetData.ts` — take `normalizeName`/`chooseName` from the city's language profile instead of inline functions.
4. `lib/streetFetch.ts` + `scripts/refresh-streets.ts` — build queries from `getCity(id).bbox`/`osmAreaName`; replace the second hardcoded discovery bbox.
5. De-duplicate `VALID_MODES` (Review Phase A).
Each is independently shippable and must reproduce baseline street counts / refreshed JSON. **No DB changes in this phase** — that's Phase B.
