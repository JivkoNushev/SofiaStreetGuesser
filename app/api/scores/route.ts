import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { VALID_MODES } from '@/lib/modes';
const MAX_TOTAL   = 200;
const MAX_DURATION_MS = 4 * 60 * 60 * 1000; // 4 hours

function isInt(v: unknown, min: number, max: number): v is number {
  return typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max;
}

export async function POST(req: NextRequest) {
  // Use anon client — RLS enforces user_id = auth.uid() at the DB layer
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'Invalid request body' }, { status: 400 }); }

  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { mode, submode, correct, wrong, skipped, total, duration_ms } =
    body as Record<string, unknown>;

  if (!VALID_MODES.has(mode as string)) {
    return NextResponse.json({ error: 'Invalid mode' }, { status: 400 });
  }
  if (!isInt(total, 1, MAX_TOTAL)) {
    return NextResponse.json({ error: 'Invalid score data' }, { status: 400 });
  }
  if (!isInt(correct, 0, total as number)) {
    return NextResponse.json({ error: 'Invalid score data' }, { status: 400 });
  }
  if (!isInt(wrong,   0, total as number)) {
    return NextResponse.json({ error: 'Invalid score data' }, { status: 400 });
  }
  if (!isInt(skipped, 0, total as number)) {
    return NextResponse.json({ error: 'Invalid score data' }, { status: 400 });
  }
  if (!isInt(duration_ms, 1, MAX_DURATION_MS)) {
    return NextResponse.json({ error: 'Invalid duration' }, { status: 400 });
  }
  if (submode !== null && submode !== undefined) {
    if (typeof submode !== 'string' || submode.length > 100 || /[\x00-\x1f]/.test(submode)) {
      return NextResponse.json({ error: 'Invalid submode' }, { status: 400 });
    }
  }

  const { data: scoreSaved, error: saveErr } = await supabase.rpc('save_score', {
    p_user_id:     user.id,
    p_mode:        mode,
    p_submode:     submode ?? null,
    p_correct:     correct as number,
    p_wrong:       (wrong ?? 0) as number,
    p_skipped:     (skipped ?? 0) as number,
    p_total:       total as number,
    p_duration_ms: duration_ms as number,
  });

  if (saveErr) {
    console.error('save_score error:', saveErr);
    return NextResponse.json({ error: 'Failed to save score' }, { status: 500 });
  }

  const rankQuery = supabase
    .from('leaderboard')
    .select('rank')
    .eq('user_id', user.id)
    .eq('mode', mode);
  if (submode != null) rankQuery.eq('submode', submode as string);
  else rankQuery.is('submode', null);
  const { data: rankData } = await rankQuery.maybeSingle();

  return NextResponse.json(
    { rank: rankData?.rank ?? null, saved: scoreSaved as boolean },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
