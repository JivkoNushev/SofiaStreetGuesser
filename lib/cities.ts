// City registry — add a new city by creating a CityConfig entry and registering it
// in CITIES. Adding a second language? Add a profile in lib/languages.ts first.
//
// Field lifecycle (what reaches the browser vs. what stays server/ingest-side):
//   Runtime (UI / API):   id, displayName, displayNameLocal, country, language
//   Ingest-only (scripts/refresh-streets.ts): bbox, osmAreaName, districts
//
// The map fits to loaded street geometry — no center/zoom needed here.

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
