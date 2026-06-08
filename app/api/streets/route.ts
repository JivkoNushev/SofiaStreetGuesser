import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { StreetInfo } from '@/lib/streetData';
import { CITIES, DEFAULT_CITY } from '@/lib/cities';

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

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
  const city = searchParams.get('city') || DEFAULT_CITY;

  if (!['main', 'district', 'neighbourhood'].includes(mode)) {
    return NextResponse.json({ error: 'Invalid mode' }, { status: 400 });
  }

  if (!(city in CITIES)) {
    return NextResponse.json({ error: 'Unknown city' }, { status: 400 });
  }

  if (mode === 'district' || mode === 'neighbourhood') {
    if (!name || name.length > 100 || /[\x00-\x1f]/.test(name)) {
      return NextResponse.json({ error: `Invalid ${mode} name` }, { status: 400 });
    }
  }

  const key = `${city}:${mode}:${name}`;
  const ttl = TTL[mode] ?? TTL.main;
  const ttlSeconds = ttl / 1000;
  const cacheHeader = `public, s-maxage=${ttlSeconds}, max-age=${ttlSeconds}, stale-while-revalidate=60`;

  const hit = cache.get(key);
  if (hit && Date.now() - hit.ts < ttl) {
    return NextResponse.json({ streets: hit.data, cached: true }, {
      headers: { 'Cache-Control': cacheHeader },
    });
  }

  try {
    const submode = mode === 'main' ? '' : name;
    const { data: row, error } = await db
      .from('street_data')
      .select('data')
      .eq('city', city)
      .eq('mode', mode)
      .eq('submode', submode)
      .single();

    if (error?.code === 'PGRST116') {
      return NextResponse.json(
        { error: 'Street data not yet available — run npm run refresh-streets' },
        { status: 503 }
      );
    }
    if (error || !row) throw error ?? new Error('No data');

    const data: StreetInfo = row.data as StreetInfo;

    if (mode !== 'main' && Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'No streets found' }, { status: 404 });
    }
    cacheSet(key, { data, ts: Date.now() });
    return NextResponse.json({ streets: data, cached: false }, {
      headers: { 'Cache-Control': cacheHeader },
    });
  } catch {
    return NextResponse.json({ error: 'Could not fetch street data' }, { status: 502 });
  }
}
