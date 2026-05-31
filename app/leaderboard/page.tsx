import type { Metadata } from 'next';
import Link from 'next/link';
import { MODES } from '@/lib/modes';

export const metadata: Metadata = {
  title: 'Leaderboard — Sofia Street Guesser',
  description: 'Global leaderboards for Sofia Street Guesser. See who knows Sofia streets the best.',
};

const LEADERBOARD_MODES = [
  { key: 'easy',   icon: '🌱', desc: 'Major boulevards (up to 25 streets)' },
  { key: 'normal', icon: '🏙️', desc: 'Major roads (up to 50 streets)' },
  { key: 'hard',   icon: '🔥', desc: 'All named streets (up to 150 streets)' },
];

export default function LeaderboardIndex() {
  return (
    <div className="lbPage">
      <div className="lbInner">
        <Link href="/" className="lbBack">← Play the game</Link>
        <h1 className="lbTitle">Leaderboard</h1>
        <p className="lbSubtitle">
          Each map has its own leaderboard. Rankings are based on most correct answers, with time as a tiebreaker.
        </p>

        <h2 style={{ color: 'var(--text)', fontSize: '1rem', fontWeight: 600, marginBottom: '.75rem', marginTop: '1.5rem' }}>
          Standard Modes
        </h2>
        <div className="modeGrid">
          {LEADERBOARD_MODES.map(({ key, icon, desc }) => (
            <Link key={key} href={`/leaderboard/${key}`} className="modeGridCard">
              <h3>{icon} {MODES[key].label}</h3>
              <p>{desc}</p>
            </Link>
          ))}
        </div>

        <h2 style={{ color: 'var(--text)', fontSize: '1rem', fontWeight: 600, marginBottom: '.75rem', marginTop: '2rem' }}>
          District &amp; Neighbourhood modes
        </h2>
        <p className="lbSubtitle">
          District and neighbourhood leaderboards are available after playing that map.
          Each area has its own ranking — find the map in-game and your score will appear here.
        </p>
      </div>
    </div>
  );
}
