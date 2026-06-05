import { NextRequest, NextResponse } from 'next/server';
import { buildStreetInfo, StreetInfo, OverpassElement } from '@/lib/streetData';
import { OVERPASS } from '@/lib/constants';
import { DISTRICTS } from '@/lib/modes';

interface CacheEntry { data: StreetInfo; ts: number }
const cache = new Map<string, CacheEntry>();
const MAX_CACHE = 200; // evict oldest when full
const TTL: Record<string, number> = {
  main:          24 * 60 * 60 * 1000,
  district:       6 * 60 * 60 * 1000,
  neighbourhood:  6 * 60 * 60 * 1000,
};

function cacheSet(key: string, entry: CacheEntry) {
  if (cache.size >= MAX_CACHE) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, entry);
}

const HW_FILTER = '"highway"~"^(trunk|primary|secondary|tertiary|residential|unclassified|living_street)$"';
const WIDE_BBOX = '42.45,23.05,42.92,23.70';

function mainQuery() {
  return `[out:json][timeout:60];\n(way[${HW_FILTER}]["name"](${WIDE_BBOX}););\nout geom;`;
}

function districtNamesQuery(name: string) {
  const safe = name.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return (
    `[out:json][timeout:60];\n` +
    `area["name"="${safe}"][boundary=administrative]->.a;\n` +
    `(way[${HW_FILTER}]["name"](area.a)(${WIDE_BBOX}););\n` +
    `out geom;`
  );
}

function neighbourhoodNamesQuery(name: string) {
  const safe = name.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return (
    `[out:json][timeout:60];\n` +
    `(\n` +
    `  area["name"="${safe}"]["place"~"^(neighbourhood|suburb|quarter)$"];\n` +
    `  area["name"="${safe}"][boundary=administrative];\n` +
    `)->.a;\n` +
    `(way[${HW_FILTER}]["name"](area.a)(${WIDE_BBOX}););\n` +
    `out geom;`
  );
}

function fullGeomQuery(names: string[]) {
  const parts = names.map(n => {
    const safe = n.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    return `way[${HW_FILTER}]["name"="${safe}"](${WIDE_BBOX});`;
  });
  return `[out:json][timeout:120];\n(\n${parts.join('\n')}\n);\nout geom;`;
}

async function fetchElementsFromOverpass(query: string): Promise<OverpassElement[]> {
  const MAX = 3;
  let lastErr: Error | null = null;
  for (let i = 1; i <= MAX; i++) {
    if (i > 1) await new Promise(r => setTimeout(r, 1500 * (i - 1)));
    try {
      const res = await fetch(OVERPASS, {
        method:  'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent':   'SofiaStreetGuesser/2.0 (https://sofia-street-guesser.vercel.app)',
          'Accept':       'application/json',
        },
        body:    'data=' + encodeURIComponent(query),
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

async function fetchFromOverpass(query: string): Promise<StreetInfo> {
  return buildStreetInfo(await fetchElementsFromOverpass(query));
}

function filterConnectedToInside(
  all: OverpassElement[],
  insideIds: Set<number>,
): OverpassElement[] {
  // Group valid (way + geometry + name) elements by street name
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
    // Union-Find
    const parent = Array.from({ length: n }, (_, i) => i);
    function find(x: number): number {
      if (parent[x] !== x) parent[x] = find(parent[x]);
      return parent[x];
    }
    function union(x: number, y: number) { parent[find(x)] = find(y); }

    // Index endpoints → segment indices
    const endpointIndex = new Map<string, number[]>();
    for (let i = 0; i < n; i++) {
      const g = segs[i].geometry!;
      for (const pt of [g[0], g[g.length - 1]]) {
        const key = `${pt.lat},${pt.lon}`;
        if (!endpointIndex.has(key)) endpointIndex.set(key, []);
        endpointIndex.get(key)!.push(i);
      }
    }

    // Union segments that share an endpoint
    for (const indices of endpointIndex.values()) {
      for (let i = 1; i < indices.length; i++) union(indices[0], indices[i]);
    }

    // Find components that contain at least one inside segment
    const keepComponents = new Set<number>();
    for (let i = 0; i < n; i++) {
      if (insideIds.has(segs[i].id!)) keepComponents.add(find(i));
    }

    // Collect all segments from those components
    for (let i = 0; i < n; i++) {
      if (keepComponents.has(find(i))) result.push(segs[i]);
    }
  }

  return result;
}

async function fetchAreaFull(areaQuery: string): Promise<StreetInfo> {
  const inside = await fetchElementsFromOverpass(areaQuery);
  if (inside.length === 0) return {};
  const names = [...new Set(inside.map(el => el.tags?.name).filter(Boolean))] as string[];
  const all = await fetchElementsFromOverpass(fullGeomQuery(names));
  const insideIds = new Set(inside.map(el => el.id).filter((id): id is number => id !== undefined));
  return buildStreetInfo(filterConnectedToInside(all, insideIds));
}

async function fetchDistrictFull(name: string): Promise<StreetInfo> {
  return fetchAreaFull(districtNamesQuery(name));
}

async function fetchNeighbourhoodFull(name: string): Promise<StreetInfo> {
  return fetchAreaFull(neighbourhoodNamesQuery(name));
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const mode = searchParams.get('mode') || 'main';
  const name = searchParams.get('name') || '';

  // Validate mode
  if (!['main', 'district', 'neighbourhood'].includes(mode)) {
    return NextResponse.json({ error: 'Invalid mode' }, { status: 400 });
  }

  // Validate district names against a server-side allowlist
  if (mode === 'district') {
    if (!name || !DISTRICTS.includes(name)) {
      return NextResponse.json({ error: 'Invalid district' }, { status: 400 });
    }
  }

  // Validate neighbourhood names: non-empty, reasonable length, no control chars
  if (mode === 'neighbourhood') {
    if (!name || name.length > 100 || /[\x00-\x1f]/.test(name)) {
      return NextResponse.json({ error: 'Invalid neighbourhood name' }, { status: 400 });
    }
  }

  const key = `${mode}:${name}`;
  const ttl = TTL[mode] ?? TTL.main;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.ts < ttl) {
    return NextResponse.json({ streets: hit.data, cached: true });
  }

  try {
    let data: StreetInfo;
    if (mode === 'district')           data = await fetchDistrictFull(name);
    else if (mode === 'neighbourhood') data = await fetchNeighbourhoodFull(name);
    else                               data = await fetchFromOverpass(mainQuery());

    if (mode !== 'main' && Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'No streets found' }, { status: 404 });
    }
    cacheSet(key, { data, ts: Date.now() });
    return NextResponse.json({ streets: data, cached: false });
  } catch {
    return NextResponse.json({ error: 'Could not fetch street data' }, { status: 502 });
  }
}
