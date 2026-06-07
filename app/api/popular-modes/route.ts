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
      .from('scores')
      .select('mode, submode')
      .limit(2000);

    if (error || !data) {
      return NextResponse.json({ popular: [] });
    }

    const BASIC = new Set(['easy', 'normal', 'hard']);
    const counts = new Map<string, { mode: string; submode: string | null; play_count: number }>();
    for (const row of data) {
      // Basic modes (easy/normal/hard) have no submode — merge any stray entries
      const key = BASIC.has(row.mode) ? row.mode : `${row.mode}::${row.submode ?? ''}`;
      const existing = counts.get(key);
      if (existing) {
        existing.play_count++;
      } else {
        counts.set(key, { mode: row.mode, submode: BASIC.has(row.mode) ? null : (row.submode ?? null), play_count: 1 });
      }
    }

    const popular = Array.from(counts.values())
      .sort((a, b) => b.play_count - a.play_count)
      .slice(0, 5);

    return NextResponse.json(
      { popular },
      { headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=60' } },
    );
  } catch {
    return NextResponse.json({ popular: [] });
  }
}
