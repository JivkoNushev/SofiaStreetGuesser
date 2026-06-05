/**
 * Explicitly re-downloads all Sofia street data from Overpass and saves it to
 * public/data/streets/. Run this whenever you want fresh data:
 *
 *   npm run download-streets
 *
 * No TTL, no skipping — always fetches everything from scratch.
 * Data is licensed under ODbL — © OpenStreetMap contributors.
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { fetchMainFull, fetchDistrictFull } from '../lib/streetFetch';
import { DISTRICTS } from '../lib/modes';
import type { StreetInfo } from '../lib/streetData';

const OUT_DIR = join(process.cwd(), 'public', 'data', 'streets');

function save(filename: string, streets: StreetInfo) {
  writeFileSync(join(OUT_DIR, filename), JSON.stringify({ streets }));
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });

  console.log('Downloading main Sofia street data…');
  const main = await fetchMainFull();
  save('main.json', main);
  console.log(`  ✓ main.json  (${Object.keys(main).length} streets)`);

  for (const district of DISTRICTS) {
    process.stdout.write(`Downloading district: ${district}… `);
    try {
      const data = await fetchDistrictFull(district);
      save(`district-${encodeURIComponent(district)}.json`, data);
      console.log(`✓  ${Object.keys(data).length} streets`);
    } catch (err) {
      console.error(`✗  FAILED — ${err instanceof Error ? err.message : err}`);
    }
    await new Promise(r => setTimeout(r, 1500));
  }

  console.log('\nDone.');
}

main().catch(err => { console.error(err); process.exit(1); });
