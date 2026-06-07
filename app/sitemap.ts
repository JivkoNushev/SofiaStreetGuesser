import type { MetadataRoute } from 'next';
import { createClient } from '@supabase/supabase-js';
import { DISTRICTS } from '@/lib/modes';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL
  ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : 'https://sofiastreetguesser.vercel.app');

async function getNeighbourhoods(): Promise<string[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return [];
  try {
    const { data } = await createClient(url, key)
      .from('street_data')
      .select('submode')
      .eq('mode', 'neighbourhood')
      .order('submode');
    return data?.map(r => r.submode as string) ?? [];
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const neighbourhoods = await getNeighbourhoods();

  const districtLeaderboards: MetadataRoute.Sitemap = DISTRICTS.map(d => ({
    url: `${SITE_URL}/leaderboard/district?submode=${encodeURIComponent(d)}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.5,
  }));

  const neighbourhoodLeaderboards: MetadataRoute.Sitemap = neighbourhoods.map(n => ({
    url: `${SITE_URL}/leaderboard/neighbourhood?submode=${encodeURIComponent(n)}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.5,
  }));

  return [
    { url: SITE_URL,                          lastModified: now, changeFrequency: 'weekly', priority: 1.0 },
    { url: `${SITE_URL}/leaderboard`,         lastModified: now, changeFrequency: 'daily',  priority: 0.8 },
    { url: `${SITE_URL}/leaderboard/easy`,    lastModified: now, changeFrequency: 'daily',  priority: 0.7 },
    { url: `${SITE_URL}/leaderboard/normal`,  lastModified: now, changeFrequency: 'daily',  priority: 0.7 },
    { url: `${SITE_URL}/leaderboard/hard`,    lastModified: now, changeFrequency: 'daily',  priority: 0.7 },
    ...districtLeaderboards,
    ...neighbourhoodLeaderboards,
    { url: `${SITE_URL}/privacy`,             lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE_URL}/terms`,               lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
  ];
}
