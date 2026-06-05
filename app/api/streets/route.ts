import { NextRequest, NextResponse } from 'next/server';
import { StreetInfo } from '@/lib/streetData';
import { fetchMainFull, fetchDistrictFull, fetchNeighbourhoodFull } from '@/lib/streetFetch';
import { DISTRICTS } from '@/lib/modes';

interface CacheEntry { data: StreetInfo; ts: number }
const cache = new Map<string, CacheEntry>();
const MAX_CACHE = 200;
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

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const mode = searchParams.get('mode') || 'main';
  const name = searchParams.get('name') || '';

  if (!['main', 'district', 'neighbourhood'].includes(mode)) {
    return NextResponse.json({ error: 'Invalid mode' }, { status: 400 });
  }

  if (mode === 'district') {
    if (!name || !DISTRICTS.includes(name)) {
      return NextResponse.json({ error: 'Invalid district' }, { status: 400 });
    }
  }

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
    else                               data = await fetchMainFull();

    if (mode !== 'main' && Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'No streets found' }, { status: 404 });
    }
    cacheSet(key, { data, ts: Date.now() });
    return NextResponse.json({ streets: data, cached: false });
  } catch {
    return NextResponse.json({ error: 'Could not fetch street data' }, { status: 502 });
  }
}
