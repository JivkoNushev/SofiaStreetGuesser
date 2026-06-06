import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Terms of Service — StreetGuesser',
};

export default function Terms() {
  return (
    <div className="lbPage" style={{ userSelect: 'text' }}>
      <div className="lbInner" style={{ maxWidth: 700 }}>
        <Link href="/" className="lbBack">← Back to game</Link>
        <h1 className="lbTitle" style={{ fontSize: '1.6rem' }}>Terms of Service</h1>
        <p className="lbSubtitle">Last updated: June 2026</p>

        <div style={{ color: 'var(--text)', lineHeight: 1.75, fontSize: '.88rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <section>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '.5rem' }}>1. About the service</h2>
            <p>StreetGuesser is a free geography game platform where players identify streets on a city map. The current city is Sofia, Bulgaria. It is provided for personal, educational, and non-commercial use only. No account is required to play — registration is optional and only needed to save scores to the public leaderboard.</p>
          </section>

          <section>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '.5rem' }}>2. User accounts</h2>
            <p>Accounts are created via Google OAuth managed by Supabase. By creating an account you agree to keep your credentials secure. We reserve the right to remove accounts or scores that violate these terms.</p>
          </section>

          <section>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '.5rem' }}>3. Leaderboard and user content</h2>
            <p>When you save a score, your username, score, and game mode are stored in a public leaderboard. Do not use usernames that are offensive, impersonating, or otherwise harmful. We may remove entries at our discretion.</p>
          </section>

          <section>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '.5rem' }}>4. Source code license</h2>
            <p>The source code of StreetGuesser is published under the <strong>PolyForm Noncommercial License 1.0.0</strong>. This means:</p>
            <ul style={{ paddingLeft: '1.4rem', marginTop: '.4rem', display: 'flex', flexDirection: 'column', gap: '.3rem' }}>
              <li>Anyone may read, fork, study, and contribute to the code.</li>
              <li><strong>Commercial use is prohibited.</strong> You may not deploy, distribute, or use this codebase (or any derivative) for commercial purposes — including charging users, running ads, or selling access — without explicit written permission from the author.</li>
              <li>The full license text is available in the <code>LICENSE</code> file in the repository.</li>
            </ul>
            <p style={{ marginTop: '.6rem' }}>To request a commercial license or discuss a partnership, contact <a href="mailto:streetguesser.noblore@gmail.com" style={{ color: 'var(--accL)' }}>streetguesser.noblore@gmail.com</a>.</p>
          </section>

          <section>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '.5rem' }}>5. Map data attribution</h2>
            <p>Street geometry and names are sourced from the <a href="https://overpass-api.de/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accL)' }}>Overpass API</a>, which provides access to OpenStreetMap data. All OSM data is © OpenStreetMap contributors and licensed under the <a href="https://opendatacommons.org/licenses/odbl/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accL)' }}>Open Database License (ODbL)</a>. Overpass API requests are cached to comply with their <a href="https://dev.overpass-api.de/overpass-doc/en/preface/commons.html" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accL)' }}>acceptable use policy</a>.</p>
          </section>

          <section>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '.5rem' }}>6. Third-party services</h2>
            <p><strong>Supabase</strong> — database and authentication, subject to the <a href="https://supabase.com/terms" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accL)' }}>Supabase Terms of Service</a>.</p>
            <p><strong>Vercel</strong> — hosting platform, subject to the <a href="https://vercel.com/legal/terms" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accL)' }}>Vercel Terms of Service</a>.</p>
            <p><strong>Google OAuth</strong> — sign-in provider, subject to <a href="https://policies.google.com/terms" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accL)' }}>Google Terms of Service</a>.</p>
            <p><strong>OpenStreetMap / Overpass API</strong> — map data under ODbL. Use of the Overpass API is subject to the <a href="https://wiki.openstreetmap.org/wiki/Overpass_API" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accL)' }}>OpenStreetMap Foundation terms</a>.</p>
          </section>

          <section>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '.5rem' }}>7. Disclaimer</h2>
            <p>The service is provided <strong>&quot;as is&quot;</strong>, without warranty of any kind. We make no guarantees about uptime, accuracy of street data, or leaderboard persistence. We are not liable for any damages arising from use of this service.</p>
          </section>

          <section>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '.5rem' }}>8. Changes</h2>
            <p>We may update these terms at any time. Continued use of the service after changes are posted constitutes acceptance of the updated terms.</p>
          </section>

          <section>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '.5rem' }}>9. Contact</h2>
            <p>For questions, abuse reports, commercial licensing, or account deletion requests, open an issue on <a href="https://github.com/JivkoNushev/SofiaStreetGuesser" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accL)' }}>GitHub</a> or email <a href="mailto:streetguesser.noblore@gmail.com" style={{ color: 'var(--accL)' }}>streetguesser.noblore@gmail.com</a>.</p>
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
