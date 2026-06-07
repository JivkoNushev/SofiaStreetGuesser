import GameCanvas from '@/components/GameCanvas';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL
  ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : 'https://sofiastreetguesser.vercel.app');

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'StreetGuesser',
  alternateName: 'StreetGuesser Sofia',
  url: SITE_URL,
  description:
    'Познаваш ли улиците на София? Интерактивна географска игра — Лесен, Нормален, Труден, по Райони и Квартали. | Do you know the streets of Sofia, Bulgaria? Free interactive geography game, no registration required.',
  applicationCategory: 'GameApplication',
  genre: 'Geography',
  operatingSystem: 'Any',
  browserRequirements: 'Requires JavaScript. Requires a modern browser with Canvas support.',
  inLanguage: ['bg', 'en'],
  isAccessibleForFree: true,
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
  },
  author: {
    '@type': 'Person',
    name: 'Jivko Nushev',
    url: 'https://github.com/JivkoNushev',
  },
  about: {
    '@type': 'Place',
    name: 'Sofia',
    addressCountry: 'BG',
  },
};

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <GameCanvas />
    </>
  );
}
