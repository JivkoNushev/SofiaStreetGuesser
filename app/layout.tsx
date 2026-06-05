import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin', 'cyrillic'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'Sofia Street Guesser — Test your knowledge of Sofia streets',
  description:
    'An interactive geography game where you identify streets in Sofia, Bulgaria on a map. Play Easy, Normal, Hard, District, or Neighbourhood modes. Free to play, no registration required.',
  openGraph: {
    title: 'Sofia Street Guesser',
    description: 'How well do you know the streets of Sofia? Find out!',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="bg">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </head>
      <body className={inter.variable}>{children}</body>
    </html>
  );
}
