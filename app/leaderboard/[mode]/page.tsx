import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { MODES } from '@/lib/modes';
import { CITIES, DEFAULT_CITY } from '@/lib/cities';
import { fmt } from '@/lib/utils';

interface Props {
  params: Promise<{ mode: string }>;
  searchParams: Promise<{ submode?: string; city?: string }>;
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { mode }    = await params;
  const { submode } = await searchParams;
  const label = submode ?? MODES[mode]?.label ?? mode;
  const isLocalized = mode === 'district' || mode === 'neighbourhood';
  return {
    title: `${label} Leaderboard — StreetGuesser`,
    description: isLocalized
      ? `Топ играчи · ${label} | Top players on the ${label} map in StreetGuesser · Sofia.`
      : `Top players on the ${label} map in StreetGuesser · Sofia.`,
  };
}

export default async function LeaderboardPage({ params, searchParams }: Props) {
  const { mode }           = await params;
  const { submode, city: rawCity } = await searchParams;
  const city = (rawCity && rawCity in CITIES) ? rawCity : DEFAULT_CITY;

  if (!MODES[mode] && mode !== 'district' && mode !== 'neighbourhood') notFound();

  const supabase = await createClient();
  const query = supabase
    .from('leaderboard')
    .select('rank, username, correct, skipped, total, duration_ms, played_at')
    .eq('city', city)
    .eq('mode', mode)
    .order('rank', { ascending: true })
    .limit(50);

  if (submode) query.eq('submode', submode);
  else query.is('submode', null);

  const playsQuery = supabase
    .from('map_plays')
    .select('plays')
    .eq('city', city)
    .eq('mode', mode)
    .eq('submode', submode ?? '');

  const [{ data: rows }, { data: playsData }] = await Promise.all([query, playsQuery.maybeSingle()]);
  const totalPlays = (playsData as { plays: number } | null)?.plays ?? 0;
  const label = submode ?? MODES[mode]?.label ?? mode;

  return (
    <div className="lbPage">
      <div className="lbInner">
        <Link href="/leaderboard" className="lbBack">← All leaderboards</Link>
        <h1 className="lbTitle">{label}</h1>
        <p className="lbSubtitle">
          Ranked by Score (correct − skips), then fastest time.
          {totalPlays > 0 && ` Played ${totalPlays} time${totalPlays !== 1 ? 's' : ''}.`}
        </p>

        {(!rows || rows.length === 0) ? (
          <p className="lbEmpty">No scores yet — be the first to play this map and submit your score!</p>
        ) : (
          <div className="lbTableWrap">
            <table className="lbTable">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Player</th>
                  <th>Score</th>
                  <th>Correct</th>
                  <th>Accuracy</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => {
                  const rankClass = i === 0 ? 'lbRank gold' : i === 1 ? 'lbRank silver' : i === 2 ? 'lbRank bronze' : 'lbRank';
                  const accuracy  = row.total > 0 ? Math.round((row.correct / row.total) * 100) : 0;
                  const score = row.correct - (row.skipped ?? 0);
                  return (
                    <tr key={i}>
                      <td><span className={rankClass}>{row.rank}</span></td>
                      <td><span className="lbUsername">{row.username}</span></td>
                      <td className="accentCol">{score}</td>
                      <td>{row.correct} / {row.total}</td>
                      <td>{accuracy}%</td>
                      <td className="mono">{fmt(row.duration_ms)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ marginTop: '2rem', textAlign: 'center' }}>
          <Link href="/" style={{ color: 'var(--accL)', fontSize: '.88rem' }}>
            Play this map →
          </Link>
        </div>
      </div>
    </div>
  );
}
