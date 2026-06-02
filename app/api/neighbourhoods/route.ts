import { NextResponse } from 'next/server';
import { OVERPASS } from '@/lib/constants';

let cached: string[] | null = null;
let cachedAt = 0;
const TTL = 24 * 60 * 60 * 1000;

const QUERY =
  `[out:json][timeout:30];\n` +
  `(\n` +
  `  node["place"~"^(neighbourhood|suburb|quarter)$"](42.45,23.05,42.92,23.70);\n` +
  `  relation["place"~"^(neighbourhood|suburb|quarter)$"](42.45,23.05,42.92,23.70);\n` +
  `);\n` +
  `out tags;`;

export async function GET() {
  if (cached && Date.now() - cachedAt < TTL) {
    return NextResponse.json({ neighbourhoods: cached });
  }

  const MAX = 3;
  for (let i = 1; i <= MAX; i++) {
    if (i > 1) await new Promise(r => setTimeout(r, 1500 * (i - 1)));
    try {
      const res = await fetch(OVERPASS, {
        method:  'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent':   'SofiaStreetGuesser/2.0 (https://sofia-street-guesser.vercel.app)',
          'Accept':       'application/json',
        },
        body:    'data=' + encodeURIComponent(QUERY),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const seen = new Set<string>();
      const list = (json.elements as { tags?: { name?: string } }[])
        .map(el => el.tags?.name)
        .filter((n): n is string => !!n && !seen.has(n) && !!seen.add(n))
        .sort((a, b) => a.localeCompare(b, 'bg'));
      cached   = list;
      cachedAt = Date.now();
      return NextResponse.json({ neighbourhoods: list });
    } catch {
      if (i === MAX) return NextResponse.json({ neighbourhoods: [] });
    }
  }
  return NextResponse.json({ neighbourhoods: [] });
}
