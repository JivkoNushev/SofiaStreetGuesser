import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

let cached: string[] | null = null;
let cachedAt = 0;
const TTL = 24 * 60 * 60 * 1000;

export async function GET() {
  if (cached && Date.now() - cachedAt < TTL) {
    return NextResponse.json({ neighbourhoods: cached });
  }

  const { data, error } = await db
    .from('street_data')
    .select('submode')
    .eq('mode', 'neighbourhood')
    .order('submode');

  if (error || !data) {
    return NextResponse.json({ neighbourhoods: [] });
  }

  const list = data.map(r => r.submode as string);
  cached   = list;
  cachedAt = Date.now();
  return NextResponse.json({ neighbourhoods: list });
}
