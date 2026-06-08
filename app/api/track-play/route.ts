import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/isConfigured';
import { VALID_MODES } from '@/lib/modes';
import { CITIES, DEFAULT_CITY } from '@/lib/cities';

export async function POST(req: NextRequest) {
  if (!isSupabaseConfigured()) return NextResponse.json({}, { status: 200 });

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }); }

  const { city: rawCity, mode, submode } = (body ?? {}) as Record<string, unknown>;
  const city = (typeof rawCity === 'string' && rawCity in CITIES) ? rawCity : DEFAULT_CITY;
  if (!VALID_MODES.has(mode as string)) {
    return NextResponse.json({ error: 'Invalid mode' }, { status: 400 });
  }
  if (submode !== null && submode !== undefined) {
    if (typeof submode !== 'string' || submode.length > 100 || /[\x00-\x1f]/.test(submode)) {
      return NextResponse.json({ error: 'Invalid submode' }, { status: 400 });
    }
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc('increment_map_plays', {
    p_city:    city,
    p_mode:    mode,
    p_submode: submode ?? null,
  });
  if (error) console.error('increment_map_plays failed:', error);

  return NextResponse.json({}, { status: 200 });
}
