// Language profiles — the language-specific rules a city's street data needs,
// keyed by a short id that CityConfig.language references (see lib/cities.ts).
//
// Why language-scoped (not city-scoped): every Bulgarian city shares these rules,
// so a city just declares `language: 'bg'` instead of repeating functions. See the
// Architecture Review in CLAUDE.md ("language profiles, not per-city functions").
//
// Field lifecycle:
//   - normalizeName / chooseName  → run ONLY in the offline ingest path
//        (scripts/refresh-streets.ts → lib/streetData.ts); never reach the browser.
//   - boulevardMatcher / collation → used at RUNTIME (Easy-mode filter in GameCanvas,
//        list sorting in the pickers).
//
// These mirror the CURRENT Sofia behaviour exactly (was inlined in lib/streetData.ts
// and lib/modes.ts). Phase 1 adds them with NO consumers; behaviour is unchanged.

export interface LanguageProfile {
  /** Locale tag for String.localeCompare sorting, e.g. 'bg'. */
  collation: string;
  /** Canonicalise an OSM street name. Build-time only (ingest). */
  normalizeName: (name: string) => string;
  /** Pick the display name from a way's OSM tags. Build-time only (ingest). */
  chooseName: (tags: Record<string, string>) => string;
  /** True if the name is a boulevard / major road — drives Easy mode. Runtime. */
  boulevardMatcher: (name: string) => boolean;
}

function hasCyrillic(s: string): boolean {
  return /[Ѐ-ӿ]/.test(s);
}

// "бул. Витоша" → "Булевард Витоша", "ул. Граф Игнатиев" → "Улица Граф Игнатиев"
function expandBg(name: string): string {
  return name
    .replace(/^бул\.\s*/iu,  'Булевард ')
    .replace(/^бул\s+/iu,    'Булевард ')
    .replace(/^ул\.\s*/iu,   'Улица ')
    .replace(/^ул\s+/iu,     'Улица ')
    .replace(/^пл\.\s*/iu,   'Площад ')
    .replace(/^пл\s+/iu,     'Площад ')
    .replace(/^пр\.\s*/iu,   'Проспект ')
    .replace(/^пр\s+/iu,     'Проспект ')
    .replace(/^кв\.\s*/iu,   'Квартал ')
    .replace(/^ж\.к\.\s*/iu, 'Жилищен комплекс ')
    .trim();
}

// "Blvd. Vitosha" / "Bul. Vitosha" → "Boulevard Vitosha"
function expandEn(name: string): string {
  return name
    .replace(/^blvd\.?\s+/i,   'Boulevard ')
    .replace(/^bul\.?\s+/i,    'Boulevard ')
    .replace(/^str\.?\s+/i,    'Street ')
    .replace(/^sq\.?\s+/i,     'Square ')
    .replace(/^ave\.?\s+/i,    'Avenue ')
    .trim();
}

const BG_BOULEVARD_RE = /^(бул[.\s]|булевард|boulevard|bul[.\s])/i;
const EN_BOULEVARD_RE = /^(boulevard|blvd[.\s]|bul[.\s]|avenue|ave[.\s])/i;

// Bulgarian (Cyrillic) — the current Sofia behaviour, mirrored exactly.
const bg: LanguageProfile = {
  collation: 'bg',
  normalizeName(name) {
    name = name.trim();
    return hasCyrillic(name) ? expandBg(name) : expandEn(name);
  },
  chooseName(tags) {
    // Mirrors lib/streetData.ts as-is, including the (currently redundant) Cyrillic
    // branch — kept faithful for Phase 1; can be tidied when streetData.ts is rewired.
    if (tags['name:bg']) return tags['name:bg'];
    if (hasCyrillic(tags.name)) return tags.name;
    return tags.name;
  },
  boulevardMatcher: (name) => BG_BOULEVARD_RE.test(name),
};

// Latin-script default — a safe template for future cities. Not used by Sofia.
const en: LanguageProfile = {
  collation: 'en',
  normalizeName: (name) => expandEn(name.trim()),
  chooseName: (tags) => tags.name,
  boulevardMatcher: (name) => EN_BOULEVARD_RE.test(name),
};

export const LANGUAGES = { bg, en } as const;
export type LanguageId = keyof typeof LANGUAGES;
export const DEFAULT_LANGUAGE: LanguageId = 'en';

export function getLanguage(id: string): LanguageProfile {
  return LANGUAGES[id as LanguageId] ?? LANGUAGES[DEFAULT_LANGUAGE];
}
