// City registry — the single source of truth for which cities exist and their
// static configuration. Phase 1 of the multi-city migration (see CLAUDE.md →
// "Migration Plan" and "Architecture Review & Simplifications").
//
// This file is PURE DATA: it references a language profile by id (see lib/languages.ts)
// via a type-only import, so importing the registry never pulls ingest-only code into
// the client bundle.
//
// Field lifecycle:
//   - id, displayName, displayNameLocal, country, language → runtime (UI / SEO)
//   - bbox, osmAreaName                                    → offline ingest only
//        (scripts/refresh-streets.ts via lib/streetFetch.ts)
//
// Deliberately ABSENT (see the Architecture Review for why):
//   - center / zoom / bounds → the map fits to the loaded street geometry instead.
//
// districts is present as an INGEST-ONLY field (like bbox/osmAreaName): the ingest
// script needs to know which administrative areas to download. At runtime the API
// no longer validates against this list — it trusts the street_data table instead.
//
// Phase 1 adds this with ZERO consumers; existing behaviour is unchanged. Phase 2
// points constants / modes / streetData / streetFetch / refresh-streets at it.

import type { LanguageId } from './languages';

export interface CityConfig {
  /** Stable slug — the DB `city` value and the ?city= URL param. */
  id: string;
  /** English display name, e.g. 'Sofia'. */
  displayName: string;
  /** Local-script name for SEO / OpenGraph, e.g. 'София'. Optional. */
  displayNameLocal?: string;
  /** ISO 3166-1 alpha-2 country code for JSON-LD / OG, e.g. 'BG'. */
  country: string;
  /** Language profile id (see lib/languages.ts) for naming + sorting rules. */
  language: LanguageId;
  /** Overpass bounding box [south, west, north, east]. Ingest-only. */
  bbox: [number, number, number, number];
  /** OSM administrative area name for the main-area query. Ingest-only. */
  osmAreaName: string;
  /** Administrative district names to fetch during ingest. Ingest-only. */
  districts?: string[];
}

// Sofia — values mirrored from the current hardcoded constants:
//   bbox        ← lib/streetFetch.ts  WIDE_BBOX '42.45,23.05,42.92,23.70'
//   osmAreaName ← lib/streetFetch.ts  area["name"="София"]
//   language    ← Bulgarian profile (was inlined in lib/streetData.ts / lib/modes.ts)
const sofia: CityConfig = {
  id: 'sofia',
  displayName: 'Sofia',
  displayNameLocal: 'София',
  country: 'BG',
  language: 'bg',
  bbox: [42.45, 23.05, 42.92, 23.70],
  osmAreaName: 'София',
  districts: [
    'Банкя', 'Витоша', 'Връбница', 'Възраждане', 'Изгрев',
    'Илинден', 'Искър', 'Красна поляна', 'Красно село', 'Кремиковци',
    'Лозенец', 'Люлин', 'Младост', 'Надежда', 'Нови Искър',
    'Оборище', 'Овча купел', 'Панчарево', 'Подуяне', 'Сердика',
    'Слатина', 'Средец', 'Студентски', 'Триадица',
  ],
};

export const CITIES: Record<string, CityConfig> = { sofia };
export const DEFAULT_CITY = 'sofia';

export function getCity(id?: string): CityConfig {
  return CITIES[id ?? ''] ?? CITIES[DEFAULT_CITY];
}
