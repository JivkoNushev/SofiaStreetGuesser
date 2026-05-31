import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

const VALID_MODES = new Set(['easy', 'normal', 'hard', 'district', 'neighbourhood']);

export async function POST(req: NextRequest) {
  const supabase = await createServiceClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });

  const body = await req.json();
  const { mode, submode, correct, wrong, skipped, total, duration_ms } = body;

  if (!VALID_MODES.has(mode)) return NextResponse.json({ error: 'Invalid mode' }, { status: 400 });
  if (typeof correct !== 'number' || typeof total !== 'number' || correct > total || total <= 0) {
    return NextResponse.json({ error: 'Invalid score data' }, { status: 400 });
  }
  if (typeof duration_ms !== 'number' || duration_ms <= 0) {
    return NextResponse.json({ error: 'Invalid duration' }, { status: 400 });
  }

  const { error: insertErr } = await supabase.from('scores').insert({
    user_id:     user.id,
    mode,
    submode:     submode ?? null,
    correct,
    wrong:       wrong ?? 0,
    skipped:     skipped ?? 0,
    total,
    duration_ms,
  });

  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });

  const { data: rankData } = await supabase
    .from('leaderboard')
    .select('rank')
    .eq('user_id', user.id)
    .eq('mode', mode)
    .eq('submode', submode ?? null)
    .single();

  return NextResponse.json({ rank: rankData?.rank ?? null });
}
