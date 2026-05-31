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

export function buildStreetInfo(elements: OverpassElement[]): StreetInfo {
  const enToBg: Record<string, string> = {};
  for (const el of elements) {
    if (el.type !== 'way' || !el.tags?.name || !el.tags['name:bg']) continue;
    if (el.tags.name !== el.tags['name:bg']) enToBg[el.tags.name] = el.tags['name:bg'];
  }

  const info: StreetInfo = {};
  for (const el of elements) {
    if (el.type !== 'way' || !el.tags?.name || !el.geometry?.length) continue;
    const name = el.tags['name:bg'] || enToBg[el.tags.name] || el.tags.name;
    const hw   = el.tags.highway;
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
