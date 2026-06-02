import { NextRequest, NextResponse } from 'next/server';
import { buildStreetInfo, StreetInfo } from '@/lib/streetData';
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

function mainQuery() {
  return `[out:json][timeout:60];\n(way[${HW_FILTER}]["name"](42.63,23.25,42.74,23.43););\nout geom;`;
}

function districtQuery(name: string) {
  // name is validated against the DISTRICTS allowlist before reaching here
  const safe = name.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return (
    `[out:json][timeout:60];\n` +
    `area["name"="${safe}"][boundary=administrative]->.a;\n` +
    `(way[${HW_FILTER}]["name"](area.a)(42.45,23.05,42.92,23.70););\n` +
    `out geom;`
  );
}

function neighbourhoodQuery(name: string) {
  const safe = name.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return (
    `[out:json][timeout:60];\n` +
    `(\n` +
    `  area["name"="${safe}"]["place"~"^(neighbourhood|suburb|quarter)$"];\n` +
    `  area["name"="${safe}"][boundary=administrative];\n` +
    `)->.a;\n` +
    `(way[${HW_FILTER}]["name"](area.a)(42.45,23.05,42.92,23.70););\n` +
    `out geom;`
  );
}

async function fetchFromOverpass(query: string): Promise<StreetInfo> {
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
      return buildStreetInfo(json.elements);
    } catch (err) {
      lastErr = err as Error;
    }
  }
  throw lastErr;
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

  let query: string;
  if (mode === 'district')      query = districtQuery(name);
  else if (mode === 'neighbourhood') query = neighbourhoodQuery(name);
  else                          query = mainQuery();

  try {
    const data = await fetchFromOverpass(query);
    if (mode !== 'main' && Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'No streets found' }, { status: 404 });
    }
    cacheSet(key, { data, ts: Date.now() });
    return NextResponse.json({ streets: data, cached: false });
  } catch {
    return NextResponse.json({ error: 'Could not fetch street data' }, { status: 502 });
  }
}
