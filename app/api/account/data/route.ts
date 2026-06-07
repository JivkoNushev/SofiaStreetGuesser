import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [{ data: profile }, { data: scores }, { data: allScoresData }] = await Promise.all([
    supabase
      .from('profiles')
      .select('username, avatar_url, created_at')
      .eq('id', user.id)
      .single(),
    supabase
      .from('leaderboard')
      .select('rank, mode, submode, correct, skipped, total, duration_ms, score')
      .eq('user_id', user.id)
      .order('rank', { ascending: true }),
    supabase
      .from('scores')
      .select('correct, total, duration_ms, mode, submode')
      .eq('user_id', user.id),
  ]);

  // Keep avatar in sync with Google — the trigger only fires on insert.
  // Supabase stores the Google picture in different places depending on
  // when the account was created; check all known locations.
  const googleIdentity = user.identities?.find(i => i.provider === 'google');
  const authAvatar =
    user.user_metadata?.avatar_url ||
    user.user_metadata?.picture ||
    googleIdentity?.identity_data?.avatar_url ||
    googleIdentity?.identity_data?.picture ||
    null;
  if (profile && authAvatar && profile.avatar_url !== authAvatar) {
    await supabase.from('profiles').update({ avatar_url: authAvatar }).eq('id', user.id);
    profile.avatar_url = authAvatar;
  }

  const allScores = allScoresData ?? [];
  const totalCorrect = allScores.reduce((s, r) => s + r.correct, 0);
  const totalQuestions = allScores.reduce((s, r) => s + r.total, 0);
  const stats = {
    gamesPlayed: allScores.length,
    totalCorrect,
    totalQuestions,
    totalDurationMs: allScores.reduce((s, r) => s + r.duration_ms, 0),
    mapsExplored: new Set(allScores.map(r => r.submode ?? r.mode)).size,
    bestAccuracy: allScores.length === 0 ? 0 : Math.max(...allScores.map(r => r.total > 0 ? Math.round(r.correct / r.total * 100) : 0)),
    avgAccuracy: totalQuestions > 0 ? Math.round(totalCorrect / totalQuestions * 100) : 0,
  };

  return NextResponse.json({ profile, scores, stats });
}
