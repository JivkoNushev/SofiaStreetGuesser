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

interface AccountStats {
  gamesPlayed: number;
  totalCorrect: number;
  totalQuestions: number;
  totalDurationMs: number;
  mapsExplored: number;
  bestAccuracy: number;
  avgAccuracy: number;
}

function fmtTotal(ms: number): string {
  const m = Math.floor(ms / 60000);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem === 0 ? `${h}h` : `${h}h ${rem}m`;
}

export default function AccountPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [scores, setScores] = useState<ScoreRow[]>([]);
  const [stats, setStats] = useState<AccountStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [notAuthed, setNotAuthed] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'settings'>('overview');

  useEffect(() => {
    fetch('/api/account/data')
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(({ profile, scores, stats }) => {
        setProfile(profile);
        setScores(scores ?? []);
        setStats(stats ?? null);
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
          <div className="acctHeaderInfo">
            {profile?.avatar_url && (
              <img src={profile.avatar_url} alt="" className="acctAvatar" referrerPolicy="no-referrer" />
            )}
            <div>
              <h1 className="lbTitle" style={{ marginBottom: '.15rem' }}>{profile?.username ?? 'Player'}</h1>
              {joinedDate && <p className="lbSubtitle" style={{ marginBottom: 0 }}>Member since {joinedDate}</p>}
            </div>
          </div>
          <button className="acctBtnSecondary" onClick={handleSignOut}>Sign out</button>
        </div>

        <div className="acctTabs">
          <button
            className={`acctTab${activeTab === 'overview' ? ' acctTab--active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button
            className={`acctTab${activeTab === 'settings' ? ' acctTab--active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            Settings
          </button>
        </div>

        {activeTab === 'overview' && (
          <>
            {stats && stats.gamesPlayed > 0 && (
              <div className="acctStatsGrid">
                <div className="acctStatCard">
                  <div className="acctStatCard__value">{stats.gamesPlayed}</div>
                  <div className="acctStatCard__label">Games Played</div>
                </div>
                <div className="acctStatCard">
                  <div className="acctStatCard__value">{stats.totalCorrect}</div>
                  <div className="acctStatCard__label">Total Correct</div>
                </div>
                <div className="acctStatCard">
                  <div className="acctStatCard__value">{stats.mapsExplored}</div>
                  <div className="acctStatCard__label">Maps Explored</div>
                </div>
                <div className="acctStatCard">
                  <div className="acctStatCard__value">{stats.bestAccuracy}%</div>
                  <div className="acctStatCard__label">Best Accuracy</div>
                </div>
                <div className="acctStatCard">
                  <div className="acctStatCard__value">{stats.avgAccuracy}%</div>
                  <div className="acctStatCard__label">Avg Accuracy</div>
                </div>
                <div className="acctStatCard">
                  <div className="acctStatCard__value">{fmtTotal(stats.totalDurationMs)}</div>
                  <div className="acctStatCard__label">Time Played</div>
                </div>
              </div>
            )}

            <h2 className="acctSectionTitle">Leaderboard Positions</h2>

            {scores.length === 0 ? (
              <p className="lbEmpty">No scores yet — play a game and submit your score to appear here!</p>
            ) : (
              <div className="acctTableWrap">
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
              </div>
            )}
          </>
        )}

        {activeTab === 'settings' && (
          <div>
            <h2 className="acctSectionTitle">Danger Zone</h2>
            <p className="acctSettingsSub">Permanently delete your account and all associated scores. This cannot be undone.</p>
            <DeleteButton />
          </div>
        )}
      </div>
    </div>
  );
}
