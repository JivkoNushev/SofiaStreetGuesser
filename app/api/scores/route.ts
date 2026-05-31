import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const VALID_MODES = new Set(['easy', 'normal', 'hard', 'district', 'neighbourhood']);
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

  const { error: insertErr } = await supabase.from('scores').insert({
    user_id:    user.id,
    mode,
    submode:    submode ?? null,
    correct,
    wrong:      wrong ?? 0,
    skipped:    skipped ?? 0,
    total,
    duration_ms,
  });

  if (insertErr) {
    console.error('Score insert error:', insertErr);
    return NextResponse.json({ error: 'Failed to save score' }, { status: 500 });
  }

  const { data: rankData } = await supabase
    .from('leaderboard')
    .select('rank')
    .eq('user_id', user.id)
    .eq('mode', mode)
    .eq('submode', submode ?? null)
    .single();

  return NextResponse.json(
    { rank: rankData?.rank ?? null },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
