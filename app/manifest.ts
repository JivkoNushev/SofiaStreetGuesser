import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'StreetGuesser · Sofia',
    short_name: 'StreetGuesser',
    description: 'Interactive geography game — how well do you know the streets of Sofia, Bulgaria?',
    start_url: '/',
    display: 'standalone',
    background_color: '#0d0d17',
    theme_color: '#7c3aed',
    icons: [
      {
        src: '/icon.png',
        sizes: '1024x1024',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  };
}
