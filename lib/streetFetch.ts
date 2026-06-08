import { buildStreetInfo, StreetInfo, OverpassElement } from './streetData';
import { getLanguage } from './languages';
import type { CityConfig } from './cities';
import { OVERPASS } from './constants';

const HW_FILTER = '"highway"~"^(trunk|primary|secondary|tertiary|residential|unclassified|living_street)$"';

function bboxStr(city: CityConfig): string {
  return city.bbox.join(',');
}

function mainQuery(city: CityConfig) {
  return `[out:json][timeout:60];\n(way[${HW_FILTER}]["name"](${bboxStr(city)}););\nout geom;`;
}

function mainInsideQuery(city: CityConfig) {
  const safe = city.osmAreaName.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return (
    `[out:json][timeout:60];\n` +
    `area["name"="${safe}"][boundary=administrative]->.a;\n` +
    `(way[${HW_FILTER}]["name"](area.a)(${bboxStr(city)}););\n` +
    `out geom;`
  );
}

function districtNamesQuery(name: string, city: CityConfig) {
  const safe = name.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return (
    `[out:json][timeout:60];\n` +
    `area["name"="${safe}"][boundary=administrative]->.a;\n` +
    `(way[${HW_FILTER}]["name"](area.a)(${bboxStr(city)}););\n` +
    `out geom;`
  );
}

function neighbourhoodNamesQuery(name: string, city: CityConfig) {
  const safe = name.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return (
    `[out:json][timeout:60];\n` +
    `(\n` +
    `  area["name"="${safe}"]["place"~"^(neighbourhood|suburb|quarter)$"];\n` +
    `  area["name"="${safe}"][boundary=administrative];\n` +
    `)->.a;\n` +
    `(way[${HW_FILTER}]["name"](area.a)(${bboxStr(city)}););\n` +
    `out geom;`
  );
}

function fullGeomQuery(names: string[], city: CityConfig) {
  const parts = names.map(n => {
    const safe = n.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    return `way[${HW_FILTER}]["name"="${safe}"](${bboxStr(city)});`;
  });
  return `[out:json][timeout:120];\n(\n${parts.join('\n')}\n);\nout geom;`;
}

export async function fetchElementsFromOverpass(query: string): Promise<OverpassElement[]> {
  const MAX = 3;
  let lastErr: Error | null = null;
  for (let i = 1; i <= MAX; i++) {
    if (i > 1) await new Promise(r => setTimeout(r, 1500 * (i - 1)));
    try {
      const res = await fetch(OVERPASS, {
        method:  'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent':   'StreetGuesser/2.0 (https://github.com/JivkoNushev/SofiaStreetGuesser)',
          'Accept':       'application/json',
        },
        body: 'data=' + encodeURIComponent(query),
      });
      if (!res.ok) throw new Error(`Overpass HTTP ${res.status}`);
      const json = await res.json();
      return json.elements ?? [];
    } catch (err) {
      lastErr = err as Error;
    }
  }
  throw lastErr;
}

export function filterConnectedToInside(
  all: OverpassElement[],
  insideIds: Set<number>,
): OverpassElement[] {
  const byName = new Map<string, OverpassElement[]>();
  for (const el of all) {
    const name = el.tags?.name;
    if (el.type !== 'way' || !name || !el.geometry?.length) continue;
    if (!byName.has(name)) byName.set(name, []);
    byName.get(name)!.push(el);
  }

  const result: OverpassElement[] = [];

  for (const segs of byName.values()) {
    const n = segs.length;
    const parent = Array.from({ length: n }, (_, i) => i);
    function find(x: number): number {
      if (parent[x] !== x) parent[x] = find(parent[x]);
      return parent[x];
    }
    function union(x: number, y: number) { parent[find(x)] = find(y); }

    const endpointIndex = new Map<string, number[]>();
    for (let i = 0; i < n; i++) {
      const g = segs[i].geometry!;
      for (const pt of [g[0], g[g.length - 1]]) {
        const key = `${pt.lat},${pt.lon}`;
        if (!endpointIndex.has(key)) endpointIndex.set(key, []);
        endpointIndex.get(key)!.push(i);
      }
    }

    for (const indices of endpointIndex.values()) {
      for (let i = 1; i < indices.length; i++) union(indices[0], indices[i]);
    }

    const keepComponents = new Set<number>();
    for (let i = 0; i < n; i++) {
      if (insideIds.has(segs[i].id!)) keepComponents.add(find(i));
    }

    for (let i = 0; i < n; i++) {
      if (keepComponents.has(find(i))) result.push(segs[i]);
    }
  }

  return result;
}

async function fetchAreaFull(areaQuery: string, city: CityConfig): Promise<StreetInfo> {
  const inside = await fetchElementsFromOverpass(areaQuery);
  if (inside.length === 0) return {};
  const names = [...new Set(inside.map(el => el.tags?.name).filter(Boolean))] as string[];
  const all = await fetchElementsFromOverpass(fullGeomQuery(names, city));
  const insideIds = new Set(inside.map(el => el.id).filter((id): id is number => id !== undefined));
  return buildStreetInfo(filterConnectedToInside(all, insideIds), getLanguage(city.language));
}

export async function fetchMainFull(city: CityConfig): Promise<StreetInfo> {
  const [inside, all] = await Promise.all([
    fetchElementsFromOverpass(mainInsideQuery(city)),
    fetchElementsFromOverpass(mainQuery(city)),
  ]);
  const insideIds = new Set(
    inside.map(el => el.id).filter((id): id is number => id !== undefined)
  );
  return buildStreetInfo(filterConnectedToInside(all, insideIds), getLanguage(city.language));
}

export async function fetchDistrictFull(name: string, city: CityConfig): Promise<StreetInfo> {
  return fetchAreaFull(districtNamesQuery(name, city), city);
}

export async function fetchNeighbourhoodFull(name: string, city: CityConfig): Promise<StreetInfo> {
  return fetchAreaFull(neighbourhoodNamesQuery(name, city), city);
}
