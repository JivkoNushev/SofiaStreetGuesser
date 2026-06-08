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
            <p>When you sign in with Google, Supabase stores your email address on our behalf for authentication purposes — we do not store it in our own database or use it beyond account creation. We store your display name and, if provided by Google, your profile picture URL. When you save a score, we store your game results (correct answers, time, game mode). We do not log street selections, map clicks, or any other in-game interactions. Guest players leave no data whatsoever.</p>
          </section>

          <section>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '.5rem' }}>Third-party services</h2>
            <p><strong>Supabase</strong> — database and authentication provider. Your account data and scores are stored on Supabase-managed PostgreSQL servers. Supabase acts as a data processor on our behalf. See the <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accL)' }}>Supabase Privacy Policy</a>.</p>
            <p><strong>Vercel</strong> — hosting. Web requests may be logged by Vercel for operational purposes. See the <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accL)' }}>Vercel Privacy Policy</a>.</p>
            <p><strong>OpenStreetMap / Overpass API</strong> — street geometry data originates from <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accL)' }}>OpenStreetMap</a> (© OpenStreetMap contributors, <a href="https://opendatacommons.org/licenses/odbl/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accL)' }}>ODbL</a>). No personally identifiable information is sent to OpenStreetMap.</p>
            <p><strong>Google OAuth</strong> — if you sign in with Google, Supabase receives your Google profile name and email address on our behalf to create your account. We use your display name; your email is held by Supabase for authentication only. We do not receive your password. See <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accL)' }}>Google&apos;s Privacy Policy</a>.</p>
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
            <p>You can delete your account and all associated scores at any time from your <Link href="/account" style={{ color: 'var(--accL)' }}>Account page</Link>. Deletion is immediate and permanent — your profile, all scores, and all leaderboard entries are removed instantly. If you are unable to access your account, email <a href="mailto:streetguesser.noblore@gmail.com" style={{ color: 'var(--accL)' }}>streetguesser.noblore@gmail.com</a> and we will process your request within 30 days.</p>
          </section>

          <section>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '.5rem' }}>Your rights</h2>
            <p>You can download a copy of all data we hold about you at any time from the Settings tab of your <Link href="/account" style={{ color: 'var(--accL)' }}>Account page</Link>. You can also delete your account and all associated data there. For any other requests — including questions about what data Supabase holds on our behalf — email <a href="mailto:streetguesser.noblore@gmail.com" style={{ color: 'var(--accL)' }}>streetguesser.noblore@gmail.com</a>.</p>
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
