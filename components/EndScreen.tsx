'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { fmt } from '@/lib/utils';
import type { AuthUser } from './GameCanvas';

interface Props {
  mode:       string;
  submode:    string | null;
  correct:    number;
  wrong:      number;
  skipped:    number;
  total:      number;
  durationMs: number;
  user:       AuthUser | null | undefined;
  // undefined = Supabase not configured; null = guest; AuthUser = signed in
  onPlayAgain: () => void;
  onQuit:      () => void;
}

export default function EndScreen({ mode, submode, correct, wrong, skipped, total, durationMs, user, onPlayAgain, onQuit }: Props) {
  const [saving,        setSaving]        = useState(() => user != null && user !== undefined);
  const [rank,          setRank]          = useState<number | null>(null);
  const [saved,         setSaved]         = useState(false);
  const [scoreImproved, setScoreImproved] = useState(false);
  const [saveErr,       setSaveErr]       = useState(false);
  const didSave  = useRef(false);
  const didTrack = useRef(false);
  const accuracy = Math.round((correct / total) * 100);

  // Track play for all users (guests included)
  useEffect(() => {
    if (didTrack.current) return;
    didTrack.current = true;
    fetch('/api/track-play', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ mode, submode }),
    }).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-save when logged in
  useEffect(() => {
    if (!user || didSave.current) return;
    didSave.current = true;
    setSaving(true);
    fetch('/api/scores', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ mode, submode, correct, wrong, skipped, total, duration_ms: durationMs }),
    })
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(data => { setRank(data.rank); setSaved(true); setScoreImproved(data.saved ?? true); })
      .catch(() => setSaveErr(true))
      .finally(() => setSaving(false));
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleLoginToSave() {
    localStorage.setItem('ssg_pending_score', JSON.stringify({
      mode, submode, correct, wrong, skipped, total, duration_ms: durationMs,
    }));
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options:  { redirectTo: `${window.location.origin}/auth/callback?next=/` },
    });
  }

  return (
    <div className="endScreen">
      <div className="endCard">
        <span className="trophy">🏆</span>
        <h1>Game Over!</h1>
        <p className="endSub">
          {submode ?? mode.charAt(0).toUpperCase() + mode.slice(1)} mode completed
        </p>

        <div className="endStats">
          <div className="endStat">
            <div className="endVal correctCol">{correct}</div>
            <div className="endLbl">Correct</div>
          </div>
          <div className="endStat">
            <div className="endVal wrongCol">{wrong}</div>
            <div className="endLbl">Wrong</div>
          </div>
          <div className="endStat">
            <div className="endVal skipCol">{skipped}</div>
            <div className="endLbl">Skipped</div>
          </div>
          <div className="endStat">
            <div className="endVal accentCol">{accuracy}%</div>
            <div className="endLbl">Accuracy</div>
          </div>
        </div>

        <p style={{ color: 'var(--muted)', fontSize: '.85rem', marginBottom: '1.2rem' }}>
          Time: <span className="mono">{fmt(durationMs)}</span>
        </p>

        <div className="endActions">
          <button className="btnAgain" onClick={onPlayAgain}>Play Again</button>

          {/* Logged in: auto-save feedback */}
          {user != null && user !== undefined && (
            saving
              ? <p className="savingMsg">Saving your score…</p>
              : saved
                ? <div className="rankBadge">
                    {rank !== null
                      ? scoreImproved
                        ? `You ranked #${rank} on the ${submode ?? mode} leaderboard!`
                        : `Your best score is #${rank} on the ${submode ?? mode} leaderboard.`
                      : 'Score saved to the leaderboard!'}
                  </div>
                : saveErr
                  ? <p className="savingMsg" style={{ color: 'var(--wrong)' }}>Could not save score — try again later</p>
                  : null
          )}

          {/* Guest: login to save */}
          {user === null && (
            <button className="btnLoginSave" onClick={handleLoginToSave}>
              Log in to join the leaderboard
            </button>
          )}

          <button className="btnQuit" style={{ marginTop: 0 }} onClick={onQuit}>
            Change Mode
          </button>
        </div>
      </div>
    </div>
  );
}
