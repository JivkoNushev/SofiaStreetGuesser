import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Policy — Sofia Street Guesser',
};

export default function Privacy() {
  return (
    <div className="lbPage" style={{ userSelect: 'text' }}>
      <div className="lbInner" style={{ maxWidth: 700 }}>
        <Link href="/" className="lbBack">← Back to game</Link>
        <h1 className="lbTitle" style={{ fontSize: '1.6rem' }}>Privacy Policy</h1>
        <p className="lbSubtitle">Last updated: May 2026</p>

        <div style={{ color: 'var(--text)', lineHeight: 1.75, fontSize: '.88rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <section>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '.5rem' }}>What we collect</h2>
            <p>When you create an account, we store your email address and username. When you save a score, we store your game results (correct answers, time, mode). We do not store street data or map interactions.</p>
          </section>

          <section>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '.5rem' }}>Third-party services</h2>
            <p><strong>Supabase</strong> — database and authentication. Your data is stored on Supabase-managed PostgreSQL servers.</p>
            <p><strong>OpenStreetMap</strong> — street geometry data originates from <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accL)' }}>OpenStreetMap</a> (© OpenStreetMap contributors, <a href="https://opendatacommons.org/licenses/odbl/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accL)' }}>ODbL</a>) and is stored in our database. No personally identifiable information is sent to OpenStreetMap.</p>
            <p><strong>Google OAuth</strong> — if you sign in with Google, we receive your Google profile name and email. We do not receive your password.</p>
            <p><strong>Google AdSense</strong> — we may display advertisements. Google uses cookies to serve relevant ads. See <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accL)' }}>Google&apos;s Privacy Policy</a>.</p>
          </section>

          <section>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '.5rem' }}>Cookies</h2>
            <p>We use cookies to maintain your login session. Google AdSense may set additional cookies for ad personalisation. You can disable personalised ads in your Google account settings.</p>
          </section>

          <section>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '.5rem' }}>Data deletion</h2>
            <p>To delete your account and all associated scores, contact us at the email in the game repository. We will process deletion requests within 30 days.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
