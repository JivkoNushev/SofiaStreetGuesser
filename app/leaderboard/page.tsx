import type { Metadata } from 'next';
import Link from 'next/link';
import { MODES } from '@/lib/modes';

export const metadata: Metadata = {
  title: 'Leaderboard — StreetGuesser',
  description: 'Global leaderboards for StreetGuesser · Sofia. See who knows Sofia streets the best.',
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

        <h2 className="lbSectionHeading">Standard Modes</h2>
        <div className="modeGrid">
          {LEADERBOARD_MODES.map(({ key, icon, desc }) => (
            <Link key={key} href={`/leaderboard/${key}`} className="modeGridCard">
              <span className="modeGridIcon">{icon}</span>
              <h3>{MODES[key].label}</h3>
              <p>{desc}</p>
            </Link>
          ))}
        </div>

        <h2 className="lbSectionHeading" style={{ marginTop: '2rem' }}>District &amp; Neighbourhood Modes</h2>
        <div className="lbInfoBox">
          <span className="lbInfoIcon">🗺️</span>
          <div className="lbInfoText">
            <h4>Play to unlock</h4>
            <p>
              District and neighbourhood leaderboards are generated when you play those maps in-game.
              Each area has its own ranking — finish a game and your score will appear here.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
