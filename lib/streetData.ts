import { HIERARCHY } from './constants';
import type { LanguageProfile } from './languages';

export interface StreetInfo {
  [name: string]: {
    bestHighway: string;
    coords:      [number, number][][];
  };
}

export interface OverpassElement {
  id?:       number;
  type:      string;
  tags?:     Record<string, string>;
  geometry?: { lat: number; lon: number }[];
}

export function buildStreetInfo(elements: OverpassElement[], lang: LanguageProfile): StreetInfo {
  const info: StreetInfo = {};
  for (const el of elements) {
    if (el.type !== 'way' || !el.tags?.name || !el.geometry?.length) continue;

    const name = lang.normalizeName(lang.chooseName(el.tags));

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
