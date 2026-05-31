import { HIERARCHY } from './constants';

export interface StreetInfo {
  [name: string]: {
    bestHighway: string;
    coords:      [number, number][][];
  };
}

interface OverpassElement {
  type:     string;
  tags?:    Record<string, string>;
  geometry?: { lat: number; lon: number }[];
}

function hasCyrillic(s: string): boolean {
  return /[Ѐ-ӿ]/.test(s);
}

// Expand Bulgarian prefix abbreviations to their full canonical form.
// "бул. Витоша" → "Булевард Витоша"
// "ул. Граф Игнатиев" → "Улица Граф Игнатиев"
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

// Normalise English prefix abbreviations so different spellings merge.
// "Blvd. Vitosha" / "Boulevard Vitosha" / "Bul. Vitosha" → "Boulevard Vitosha"
// Suffix forms ("Vitosha Boulevard") are left as-is; we cannot safely translate
// the proper-name part without a transliteration dictionary.
function expandEn(name: string): string {
  return name
    .replace(/^blvd\.?\s+/i,   'Boulevard ')
    .replace(/^bul\.?\s+/i,    'Boulevard ')
    .replace(/^str\.?\s+/i,    'Street ')
    .replace(/^sq\.?\s+/i,     'Square ')
    .replace(/^ave\.?\s+/i,    'Avenue ')
    .trim();
}

function normalizeName(name: string): string {
  name = name.trim();
  return hasCyrillic(name) ? expandBg(name) : expandEn(name);
}

// Pick the best name from a way's OSM tags.
// Priority: explicit name:bg tag > any Cyrillic name > Latin fallback
function chooseName(tags: Record<string, string>): string {
  if (tags['name:bg']) return tags['name:bg'];
  if (hasCyrillic(tags.name)) return tags.name;
  return tags.name;
}

export function buildStreetInfo(elements: OverpassElement[]): StreetInfo {
  // Pass 1: for ways that carry both a Latin name and an explicit name:bg tag,
  // build a lookup so those Latin-named ways end up under the Bulgarian canonical name.
  const toBg: Record<string, string> = {};
  for (const el of elements) {
    if (el.type !== 'way' || !el.tags?.name || !el.tags['name:bg']) continue;
    if (hasCyrillic(el.tags.name)) continue; // name is already Cyrillic, skip
    const bgNorm = normalizeName(el.tags['name:bg']);
    toBg[el.tags.name]               = bgNorm;
    toBg[normalizeName(el.tags.name)] = bgNorm;
  }

  // Pass 2: accumulate geometry, merging ways that share the same canonical name.
  const info: StreetInfo = {};
  for (const el of elements) {
    if (el.type !== 'way' || !el.tags?.name || !el.geometry?.length) continue;

    const raw  = chooseName(el.tags);
    const norm = normalizeName(raw);
    // If a Bulgarian equivalent is known for this (possibly Latin) name, prefer it
    const name = toBg[norm] ?? toBg[raw] ?? norm;

    const hw = el.tags.highway;
    if (!info[name]) {
      info[name] = { bestHighway: hw, coords: [] };
    } else {
      const cur = HIERARCHY.indexOf(info[name].bestHighway as typeof HIERARCHY[number]);
      const nxt = HIERARCHY.indexOf(hw as typeof HIERARCHY[number]);
      if (nxt !== -1 && (cur === -1 || nxt < cur)) info[name].bestHighway = hw;
    }
    info[name].coords.push(el.geometry.map(p => [p.lat, p.lon]));
  }

  return info;
}
