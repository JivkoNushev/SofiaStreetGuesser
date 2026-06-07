import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import './globals.css';

const inter = Inter({ subsets: ['latin', 'cyrillic'], variable: '--font-inter' });

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL
  ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : 'https://sofiastreetguesser.vercel.app');

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'StreetGuesser · Sofia — Познаваш ли улиците на града?',
    template: '%s — StreetGuesser',
  },
  description:
    'Познаваш ли улиците на София? Интерактивна географска игра — Лесен, Нормален, Труден, по Райони и Квартали. Безплатна, без регистрация. | Do you know the streets of Sofia, Bulgaria? Free interactive geography game, no registration required.',
  keywords: [
    'sofia streets', 'sofia geography game', 'sofia map quiz', 'bulgaria street game',
    'StreetGuesser', 'sofia street quiz', 'sofia bulgaria map', 'geography quiz',
    'улици на София', 'игра улици', 'позна улицата', 'карта на София',
    'игра за улиците на София', 'квартали на София', 'райони на София',
    'географска игра', 'познаваш ли улиците', 'StreetGuesser Sofia',
  ],
  authors: [{ name: 'Jivko Nushev', url: 'https://github.com/JivkoNushev' }],
  creator: 'Jivko Nushev',
  openGraph: {
    type: 'website',
    locale: 'bg_BG',
    alternateLocale: ['en_US'],
    url: '/',
    siteName: 'StreetGuesser',
    title: 'StreetGuesser · Sofia — Познаваш ли улиците на града?',
    description: 'Познаваш ли улиците на София? | Do you know the streets of Sofia? Free geography game — no registration required.',
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'StreetGuesser — игра за улиците на София / Sofia street geography game',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'StreetGuesser · Sofia — Познаваш ли улиците на града?',
    description: 'Познаваш ли улиците на София? | Do you know the streets of Sofia? Free geography game.',
    images: ['/opengraph-image'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'vMlpcdXPovtnQCAv5YOXKZ1iwMW3-hdUZZRyb7H4VJQ',
  },
  alternates: {
    canonical: '/',
    languages: {
      'en': SITE_URL,
      'bg': SITE_URL,
      'x-default': SITE_URL,
    },
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="bg">
      <body className={inter.variable}>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
