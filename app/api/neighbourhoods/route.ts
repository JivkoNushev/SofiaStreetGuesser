import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { CITIES, DEFAULT_CITY } from '@/lib/cities';

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

interface CacheEntry { list: string[]; ts: number }
const cache = new Map<string, CacheEntry>(); // keyed by city
const TTL = 24 * 60 * 60 * 1000;

export async function GET(req: NextRequest) {
  const city = req.nextUrl.searchParams.get('city') || DEFAULT_CITY;

  if (!(city in CITIES)) {
    return NextResponse.json({ neighbourhoods: [] });
  }

  const hit = cache.get(city);
  if (hit && Date.now() - hit.ts < TTL) {
    return NextResponse.json({ neighbourhoods: hit.list });
  }

  const { data, error } = await db
    .from('street_data')
    .select('submode')
    .eq('city', city)
    .eq('mode', 'neighbourhood')
    .order('submode');

  if (error || !data) {
    return NextResponse.json({ neighbourhoods: [] });
  }

  const list = data.map(r => r.submode as string);
  cache.set(city, { list, ts: Date.now() });
  return NextResponse.json({ neighbourhoods: list });
}
