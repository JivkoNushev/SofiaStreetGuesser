import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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
      .order('mode', { ascending: true })
      .order('submode', { ascending: true }),
    supabase
      .from('scores')
      .select('correct, total, duration_ms, mode, submode')
      .eq('user_id', user.id),
  ]);

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
