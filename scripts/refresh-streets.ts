/**
 * Fetch all Sofia street data from Overpass and upsert into the Supabase
 * street_data table. Run this whenever you want to refresh the data:
 *
 *   npm run refresh-streets                                   — full refresh (main + all districts)
 *   npm run refresh-streets -- --districts="Сердика"          — retry specific districts
 *   npm run refresh-streets -- --all-neighbourhoods            — download all neighbourhoods
 *   npm run refresh-streets -- --neighbourhoods="Лозенец,Бояна" — specific neighbourhoods only
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.
 * Data is licensed under ODbL — © OpenStreetMap contributors.
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import ws from 'ws';
import { fetchMainFull, fetchDistrictFull, fetchNeighbourhoodFull } from '../lib/streetFetch';
import { DISTRICTS } from '../lib/modes';
import { OVERPASS } from '../lib/constants';
import type { StreetInfo } from '../lib/streetData';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const db = createClient(supabaseUrl, serviceRoleKey, {
  realtime: { transport: ws as unknown as typeof WebSocket },
});

const delay = (ms: number) => new Promise<void>(r => setTimeout(r, ms));
const DELAY_MS = 3000;

async function upsert(mode: string, submode: string, data: StreetInfo) {
  const { error } = await db.from('street_data').upsert({
    mode,
    submode,
    data,
    street_count: Object.keys(data).length,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

function parseArg(flag: string): string[] {
  const arg = process.argv.find(a => a.startsWith(`${flag}=`));
  if (!arg) return [];
  return arg.slice(flag.length + 1).split(',').map(s => s.trim()).filter(Boolean);
}

async function fetchAllNeighbourhoodNames(): Promise<string[]> {
  const query =
    `[out:json][timeout:30];\n` +
    `(\n` +
    `  node["place"~"^(neighbourhood|suburb|quarter)$"](42.45,23.05,42.92,23.70);\n` +
    `  relation["place"~"^(neighbourhood|suburb|quarter)$"](42.45,23.05,42.92,23.70);\n` +
    `);\n` +
    `out tags;`;
  const res = await fetch(OVERPASS, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'StreetGuesser/2.0' },
    body: 'data=' + encodeURIComponent(query),
  });
  if (!res.ok) throw new Error(`Overpass HTTP ${res.status}`);
  const json = await res.json();
  const seen = new Set<string>();
  return (json.elements as { tags?: { name?: string } }[])
    .map(el => el.tags?.name)
    .filter((n): n is string => !!n && !seen.has(n) && !!seen.add(n))
    .sort((a, b) => a.localeCompare(b, 'bg'));
}

async function main() {
  const onlyDistricts = parseArg('--districts');
  const onlyNeighbourhoods = parseArg('--neighbourhoods');
  const allNeighbourhoods = process.argv.includes('--all-neighbourhoods');
  const neighbourhoodsOnly = allNeighbourhoods || onlyNeighbourhoods.length > 0;
  const partial = onlyDistricts.length > 0 || neighbourhoodsOnly;

  // 1. Main city (skipped when retrying specific districts/neighbourhoods)
  if (!partial) {
    process.stdout.write('Fetching main Sofia data… ');
    const main = await fetchMainFull();
    await upsert('main', '', main);
    console.log(`✓  ${Object.keys(main).length} streets`);
    await delay(DELAY_MS);
  }

  // 2. Districts (skipped when only fetching neighbourhoods)
  const districtsToFetch = neighbourhoodsOnly ? [] : onlyDistricts.length > 0 ? onlyDistricts : DISTRICTS;
  for (const district of districtsToFetch) {
    process.stdout.write(`Fetching district: ${district}… `);
    try {
      const data = await fetchDistrictFull(district);
      await upsert('district', district, data);
      console.log(`✓  ${Object.keys(data).length} streets`);
    } catch (err) {
      console.error(`✗  FAILED — ${err instanceof Error ? err.message : err}`);
    }
    await delay(DELAY_MS);
  }

  // 3. Neighbourhoods
  let neighbourhoodNames = onlyNeighbourhoods;
  if (allNeighbourhoods) {
    process.stdout.write('Fetching neighbourhood list from Overpass… ');
    neighbourhoodNames = await fetchAllNeighbourhoodNames();
    console.log(`${neighbourhoodNames.length} found`);
    await delay(DELAY_MS);
  }

  for (const name of neighbourhoodNames) {
    process.stdout.write(`Fetching neighbourhood: ${name}… `);
    try {
      const data = await fetchNeighbourhoodFull(name);
      if (Object.keys(data).length === 0) {
        console.log('(empty, skipped)');
        continue;
      }
      await upsert('neighbourhood', name, data);
      console.log(`✓  ${Object.keys(data).length} streets`);
    } catch (err) {
      console.error(`✗  FAILED — ${err instanceof Error ? err.message : err}`);
    }
    await delay(DELAY_MS);
  }

  console.log('\nDone.');
}

main().catch(err => { console.error(err); process.exit(1); });
