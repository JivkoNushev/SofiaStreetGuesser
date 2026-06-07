import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/isConfigured';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ popular: [] });
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('map_plays')
      .select('mode, submode, plays')
      .order('plays', { ascending: false })
      .limit(5);

    if (error || !data) {
      return NextResponse.json({ popular: [] });
    }

    const BASIC = new Set(['easy', 'normal', 'hard']);
    const popular = data.map(row => ({
      mode:       row.mode,
      submode:    BASIC.has(row.mode) ? null : (row.submode || null),
      play_count: Number(row.plays),
    }));

    return NextResponse.json(
      { popular },
      { headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=60' } },
    );
  } catch {
    return NextResponse.json({ popular: [] });
  }
}
