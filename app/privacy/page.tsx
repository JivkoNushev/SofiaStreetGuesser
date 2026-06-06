import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Policy — StreetGuesser',
};

export default function Privacy() {
  return (
    <div className="lbPage" style={{ userSelect: 'text' }}>
      <div className="lbInner" style={{ maxWidth: 700 }}>
        <Link href="/" className="lbBack">← Back to game</Link>
        <h1 className="lbTitle" style={{ fontSize: '1.6rem' }}>Privacy Policy</h1>
        <p className="lbSubtitle">Last updated: June 2026</p>

        <div style={{ color: 'var(--text)', lineHeight: 1.75, fontSize: '.88rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <section>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '.5rem' }}>What we collect</h2>
            <p>When you create an account, we store your email address and display name. When you save a score, we store your game results (correct answers, time, game mode). We do not log street selections, map clicks, or any other in-game interactions.</p>
          </section>

          <section>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '.5rem' }}>Third-party services</h2>
            <p><strong>Supabase</strong> — database and authentication. Your account data and scores are stored on Supabase-managed PostgreSQL servers. See the <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accL)' }}>Supabase Privacy Policy</a>.</p>
            <p><strong>Vercel</strong> — hosting. Web requests may be logged by Vercel for operational purposes. See the <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accL)' }}>Vercel Privacy Policy</a>.</p>
            <p><strong>OpenStreetMap / Overpass API</strong> — street geometry data originates from <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accL)' }}>OpenStreetMap</a> (© OpenStreetMap contributors, <a href="https://opendatacommons.org/licenses/odbl/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accL)' }}>ODbL</a>). No personally identifiable information is sent to OpenStreetMap.</p>
            <p><strong>Google OAuth</strong> — if you sign in with Google, we receive your Google profile name and email address. We do not receive your password. See <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accL)' }}>Google&apos;s Privacy Policy</a>.</p>
            <p><strong>Vercel Analytics &amp; Speed Insights</strong> — we collect aggregated, anonymised visitor metrics (page views, country, browser/device type, Core Web Vitals). No cookies are set and no personal data is collected. See the <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accL)' }}>Vercel Privacy Policy</a>.</p>
          </section>

          <section>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '.5rem' }}>Cookies</h2>
            <p>We use a session cookie to keep you signed in across page loads. No tracking or advertising cookies are set. Vercel Analytics does not use cookies.</p>
          </section>

          <section>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '.5rem' }}>Data sharing</h2>
            <p>We do not sell or share your personal data with third parties. Scores saved to the leaderboard (username, correct count, time, mode) are publicly visible to all players.</p>
          </section>

          <section>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '.5rem' }}>Data deletion</h2>
            <p>To delete your account and all associated scores, email <a href="mailto:streetguesser.noblore@gmail.com" style={{ color: 'var(--accL)' }}>streetguesser.noblore@gmail.com</a> or open an issue on <a href="https://github.com/JivkoNushev/SofiaStreetGuesser" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accL)' }}>GitHub</a>. Deletion requests are processed within 30 days.</p>
          </section>
        </div>

        <div className="legalFooter">
          <Link href="/privacy">Privacy Policy</Link>
          <Link href="/terms">Terms of Service</Link>
          <a href="https://github.com/JivkoNushev/SofiaStreetGuesser" target="_blank" rel="noopener noreferrer">Source on GitHub</a>
          <span>© 2026 Jivko Nushev</span>
        </div>
      </div>
    </div>
  );
}
