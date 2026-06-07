import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [{ data: profile }, { data: scores }] = await Promise.all([
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
  ]);

  return NextResponse.json({ profile, scores });
}
