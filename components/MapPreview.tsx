'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { isSupabaseConfigured } from '@/lib/supabase/isConfigured';
import { MODES } from '@/lib/modes';
import { fmt } from '@/lib/utils';

interface Props {
  city:    string;
  mode:    string;
  submode: string | null;
  onStart: () => Promise<void>;
  onBack:  () => void;
}

interface LBRow {
  rank:        number;
  username:    string;
  correct:     number;
  skipped:     number;
  total:       number;
  duration_ms: number;
}

export default function MapPreview({ city, mode, submode, onStart, onBack }: Props) {
  const [rows, setRows]       = useState<LBRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState(false);

  const mapLabel =
    submode
      ? submode
      : (MODES[mode]?.label ?? mode.charAt(0).toUpperCase() + mode.slice(1));

  const lbHref =
    submode
      ? `/leaderboard/${mode}?submode=${encodeURIComponent(submode)}`
      : `/leaderboard/${mode}`;

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setRows([]);
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const query = supabase
      .from('leaderboard')
      .select('rank, username, correct, skipped, total, duration_ms')
      .eq('city', city)
      .eq('mode', mode)
      .order('rank', { ascending: true })
      .limit(10);

    if (submode) query.eq('submode', submode);
    else         query.is('submode', null);

    query.then(({ data }) => {
      setRows((data as LBRow[]) ?? []);
      setLoading(false);
    });
  }, [city, mode, submode]);

  async function handleStart() {
    setStarting(true);
    await onStart();
  }

  return (
    <div className="mpScreen">
      <div className="mpInner">
        <div className="mpHeader">
          <button className="btnBack" onClick={onBack}>← Back</button>
          <h1 className="mpMapName">{mapLabel}</h1>
          <span className={`modePill ${mode}`}>{MODES[mode]?.label ?? mode}</span>
        </div>

        <div className="mpLbSection">
          <div className="mpLbHeader">Top Players</div>

          {loading && (
            <div className="mpLbLoading">
              <div className="spinner" />
            </div>
          )}

          {!loading && rows !== null && rows.length === 0 && (
            <p className="mpLbEmpty">No scores yet — be the first to play this map!</p>
          )}

          {!loading && rows !== null && rows.length > 0 && (
            <>
              <div className="mpLbTableWrap">
                <table className="lbTable">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Player</th>
                      <th>Score</th>
                      <th>Correct / Total</th>
                      <th>Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => {
                      const rankClass = i === 0 ? 'lbRank gold' : i === 1 ? 'lbRank silver' : i === 2 ? 'lbRank bronze' : 'lbRank';
                      const score = row.correct - row.skipped;
                      return (
                        <tr key={i}>
                          <td><span className={rankClass}>{row.rank}</span></td>
                          <td><span className="lbUsername">{row.username}</span></td>
                          <td className="accentCol">{score}</td>
                          <td>{row.correct} / {row.total}</td>
                          <td className="mono">{fmt(row.duration_ms)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <Link href={lbHref} className="mpLbMore">View full leaderboard →</Link>
            </>
          )}
        </div>

        <div className="mpActions">
          <button
            className="btnStart"
            onClick={handleStart}
            disabled={starting}
          >
            {starting ? 'Loading…' : 'Start Game →'}
          </button>
        </div>
      </div>
    </div>
  );
}
