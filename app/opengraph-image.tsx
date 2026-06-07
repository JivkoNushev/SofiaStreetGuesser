import { ImageResponse } from 'next/og';
import { readFileSync } from 'fs';
import { join } from 'path';

export const alt = 'StreetGuesser — игра за улиците на София / Sofia street geography game';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const runtime = 'nodejs';

export default function OgImage() {
  const fontData = readFileSync(join(process.cwd(), 'public/fonts/inter-700.ttf'));

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0d0d17',
          position: 'relative',
          overflow: 'hidden',
          fontFamily: 'Inter',
        }}
      >
        {/* Background glow */}
        <div
          style={{
            position: 'absolute',
            top: '-120px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '800px',
            height: '600px',
            borderRadius: '50%',
            background: 'radial-gradient(ellipse, rgba(124,58,237,0.35) 0%, transparent 70%)',
          }}
        />

        {/* Map pin icon */}
        <div style={{ fontSize: '64px', marginBottom: '8px', display: 'flex' }}>📍</div>

        {/* Title */}
        <div
          style={{
            fontSize: '88px',
            fontWeight: 700,
            color: '#c4b5fd',
            letterSpacing: '-2px',
            lineHeight: 1,
            marginBottom: '16px',
            display: 'flex',
            fontFamily: 'Inter',
          }}
        >
          StreetGuesser
        </div>

        {/* Location pill */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(124,58,237,0.2)',
            border: '1px solid rgba(167,139,250,0.4)',
            borderRadius: '100px',
            padding: '8px 24px',
            color: '#a78bfa',
            fontSize: '26px',
            fontWeight: 700,
            marginBottom: '20px',
            fontFamily: 'Inter',
          }}
        >
          София · Sofia, Bulgaria
        </div>

        {/* Bulgarian tagline */}
        <div
          style={{
            fontSize: '26px',
            fontWeight: 700,
            color: '#e2e8f0',
            marginBottom: '6px',
            display: 'flex',
            fontFamily: 'Inter',
          }}
        >
          Познаваш ли улиците на София?
        </div>

        {/* English tagline */}
        <div
          style={{
            fontSize: '18px',
            color: '#6b7280',
            marginBottom: '32px',
            display: 'flex',
            fontFamily: 'Inter',
          }}
        >
          Do you know the streets of Sofia?
        </div>

        {/* Mode pills */}
        <div style={{ display: 'flex', gap: '10px' }}>
          {[
            { label: 'Easy',          color: '#4ade80', bg: 'rgba(74,222,128,0.12)',   border: 'rgba(74,222,128,0.3)' },
            { label: 'Normal',        color: '#fbbf24', bg: 'rgba(251,191,36,0.12)',  border: 'rgba(251,191,36,0.3)' },
            { label: 'Hard',          color: '#f87171', bg: 'rgba(248,113,113,0.12)', border: 'rgba(248,113,113,0.3)' },
            { label: 'District',      color: '#22d3ee', bg: 'rgba(34,211,238,0.12)',  border: 'rgba(34,211,238,0.3)' },
            { label: 'Neighbourhood', color: '#a78bfa', bg: 'rgba(167,139,250,0.12)', border: 'rgba(167,139,250,0.3)' },
          ].map(({ label, color, bg, border }) => (
            <div
              key={label}
              style={{
                display: 'flex',
                background: bg,
                border: `1px solid ${border}`,
                borderRadius: '100px',
                padding: '6px 18px',
                color,
                fontSize: '16px',
                fontWeight: 700,
                fontFamily: 'Inter',
              }}
            >
              {label}
            </div>
          ))}
        </div>

        {/* CTA button */}
        <div
          style={{
            marginTop: '28px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            background: '#7c3aed',
            borderRadius: '100px',
            padding: '12px 36px',
            color: '#ffffff',
            fontSize: '20px',
            fontWeight: 700,
            fontFamily: 'Inter',
            letterSpacing: '0.02em',
          }}
        >
          Играй сега · Play Now →
        </div>

        {/* Free badge */}
        <div
          style={{
            position: 'absolute',
            bottom: '28px',
            right: '40px',
            fontSize: '14px',
            color: '#4b5563',
            display: 'flex',
            fontFamily: 'Inter',
          }}
        >
          Free to play · Безплатна игра
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: 'Inter', data: fontData, weight: 700, style: 'normal' },
      ],
    },
  );
}
