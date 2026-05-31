'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { isSupabaseConfigured } from '@/lib/supabase/isConfigured';
import { fmt } from '@/lib/utils';

interface Props {
  mode:       string;
  submode:    string | null;
  correct:    number;
  wrong:      number;
  skipped:    number;
  total:      number;
  durationMs: number;
  onPlayAgain: () => void;
  onQuit:      () => void;
}

export default function EndScreen({ mode, submode, correct, wrong, skipped, total, durationMs, onPlayAgain, onQuit }: Props) {
  const [saving, setSaving]  = useState(false);
  const [rank,   setRank]    = useState<number | null>(null);
  const [saved,  setSaved]   = useState(false);
  const [user,   setUser]    = useState<{ id: string } | null | undefined>(undefined);
  const accuracy = Math.round((correct / total) * 100);
  const supabaseReady = isSupabaseConfigured();

  useEffect(() => {
    if (!supabaseReady) { setUser(null); return; }
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null));
  }, [supabaseReady]);

  async function handleSignIn() {
    if (!supabaseReady) return;
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options:  { redirectTo: `${window.location.origin}/auth/callback?next=/` },
    });
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch('/api/scores', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ mode, submode, correct, wrong, skipped, total, duration_ms: durationMs }),
      });
      if (res.ok) {
        const data = await res.json();
        setRank(data.rank);
        setSaved(true);
      }
    } finally {
      setSaving(false);
    }
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

          {saved && rank !== null && (
            <div className="rankBadge">You ranked #{rank} on the {submode ?? mode} leaderboard!</div>
          )}

          {/* auth UI only shown once we know auth state */}
          {!saved && supabaseReady && user === null && (
            <div>
              <p className="signInPrompt">Sign in to save your score to the leaderboard</p>
              <button className="btnGoogle" onClick={handleSignIn}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Sign in with Google
              </button>
            </div>
          )}

          {!saved && supabaseReady && user !== null && user !== undefined && (
            <button className="btnSaveScore" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save to Leaderboard'}
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
