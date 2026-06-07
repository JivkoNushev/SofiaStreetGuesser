'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { fmt } from '@/lib/utils';
import DeleteButton from './DeleteButton';

const MODE_LABELS: Record<string, string> = {
  easy: 'Easy',
  normal: 'Normal',
  hard: 'Hard',
  district: 'District',
  neighbourhood: 'Neighbourhood',
};

interface Profile {
  username: string | null;
  avatar_url: string | null;
  created_at: string | null;
}

interface ScoreRow {
  rank: number;
  mode: string;
  submode: string | null;
  correct: number;
  skipped: number | null;
  total: number;
  duration_ms: number;
  score: number | null;
}

export default function AccountPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [scores, setScores] = useState<ScoreRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [notAuthed, setNotAuthed] = useState(false);

  useEffect(() => {
    fetch('/api/account/data')
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(({ profile, scores }) => {
        setProfile(profile);
        setScores(scores ?? []);
      })
      .catch(status => {
        if (status === 401) setNotAuthed(true);
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
  }

  if (loading) {
    return (
      <div className="lbPage">
        <div className="lbInner" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
          <div className="spinner" />
        </div>
      </div>
    );
  }

  if (notAuthed) {
    return (
      <div className="lbPage">
        <div className="lbInner" style={{ textAlign: 'center', paddingTop: '4rem' }}>
          <p className="lbSubtitle">You need to be signed in to view your account.</p>
          <Link href="/" className="lbBack" style={{ marginTop: '1rem', display: 'inline-block' }}>← Back to game</Link>
        </div>
      </div>
    );
  }

  const joinedDate = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })
    : null;

  return (
    <div className="lbPage">
      <div className="lbInner">
        <Link href="/" className="lbBack">← Back to game</Link>

        <div className="acctHeader">
          {profile?.avatar_url && (
            <img src={profile.avatar_url} alt="" className="acctAvatar" referrerPolicy="no-referrer" />
          )}
          <div>
            <h1 className="lbTitle" style={{ marginBottom: '.15rem' }}>{profile?.username ?? 'Player'}</h1>
            {joinedDate && <p className="lbSubtitle" style={{ marginBottom: 0 }}>Member since {joinedDate}</p>}
          </div>
        </div>

        <h2 className="acctSectionTitle">Your Leaderboard Positions</h2>

        {scores.length === 0 ? (
          <p className="lbEmpty">No scores yet — play a game and submit your score to appear here!</p>
        ) : (
          <table className="lbTable">
            <thead>
              <tr>
                <th>#</th>
                <th>Map</th>
                <th>Score</th>
                <th>Correct</th>
                <th>Accuracy</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {scores.map((row, i) => {
                const rankClass = row.rank === 1 ? 'lbRank gold' : row.rank === 2 ? 'lbRank silver' : row.rank === 3 ? 'lbRank bronze' : 'lbRank';
                const accuracy = row.total > 0 ? Math.round((row.correct / row.total) * 100) : 0;
                const label = row.submode || MODE_LABELS[row.mode] || row.mode;
                const leaderboardHref = row.submode
                  ? `/leaderboard/${row.mode}?submode=${encodeURIComponent(row.submode)}`
                  : `/leaderboard/${row.mode}`;
                return (
                  <tr key={i}>
                    <td><span className={rankClass}>{row.rank}</span></td>
                    <td>
                      <Link href={leaderboardHref} className="acctMapLink">
                        {label}
                        {row.submode && <span className="acctModeTag">{MODE_LABELS[row.mode]}</span>}
                      </Link>
                    </td>
                    <td className="accentCol">{row.score ?? (row.correct - (row.skipped ?? 0))}</td>
                    <td>{row.correct} / {row.total}</td>
                    <td>{accuracy}%</td>
                    <td className="mono">{fmt(row.duration_ms)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        <div className="acctDangerZone">
          <h2 className="acctSectionTitle">Account</h2>
          <div className="acctDeleteActions">
            <button className="acctBtnSecondary" onClick={handleSignOut}>
              Sign out
            </button>
            <DeleteButton />
          </div>
        </div>
      </div>
    </div>
  );
}
