/**
 * Build-time script (runs before `next build`).
 *
 * Uses .next/cache/street-data/ as a persistent cache — Vercel preserves
 * .next/cache/ between deployments, so data is only re-downloaded when the
 * cache is missing or older than CACHE_TTL_DAYS.
 *
 * To force a fresh download on Vercel: "Clear Build Cache and Redeploy"
 * from the Vercel dashboard, or delete .next/cache/street-data/ locally.
 */

import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { fetchMainFull, fetchDistrictFull } from '../lib/streetFetch';
import { DISTRICTS } from '../lib/modes';
import type { StreetInfo } from '../lib/streetData';

const CACHE_DIR = join(process.cwd(), '.next', 'cache', 'street-data');
const OUT_DIR   = join(process.cwd(), 'public', 'data', 'streets');
const META_FILE = join(CACHE_DIR, '.meta.json');

const CACHE_TTL_DAYS = 30;
const CACHE_TTL_MS   = CACHE_TTL_DAYS * 24 * 60 * 60 * 1000;

const ALL_FILES = [
  'main.json',
  ...DISTRICTS.map(d => `district-${encodeURIComponent(d)}.json`),
];

function isCacheValid(): boolean {
  if (!existsSync(META_FILE)) return false;
  try {
    const { ts } = JSON.parse(readFileSync(META_FILE, 'utf8'));
    return Date.now() - ts < CACHE_TTL_MS;
  } catch {
    return false;
  }
}

function saveToCache(filename: string, streets: StreetInfo) {
  const content = JSON.stringify({ streets });
  writeFileSync(join(CACHE_DIR, filename), content);
  writeFileSync(join(OUT_DIR,   filename), content);
}

async function download() {
  console.log('Downloading main Sofia street data…');
  const main = await fetchMainFull();
  saveToCache('main.json', main);
  console.log(`  ✓ main.json  (${Object.keys(main).length} streets)`);

  for (const district of DISTRICTS) {
    process.stdout.write(`Downloading district: ${district}… `);
    try {
      const data = await fetchDistrictFull(district);
      saveToCache(`district-${encodeURIComponent(district)}.json`, data);
      console.log(`✓  ${Object.keys(data).length} streets`);
    } catch (err) {
      console.error(`✗  FAILED — ${err instanceof Error ? err.message : err}`);
    }
    await new Promise(r => setTimeout(r, 1500));
  }

  writeFileSync(META_FILE, JSON.stringify({ ts: Date.now(), ttlDays: CACHE_TTL_DAYS }));
}

async function main() {
  mkdirSync(CACHE_DIR, { recursive: true });
  mkdirSync(OUT_DIR,   { recursive: true });

  const cacheComplete = ALL_FILES.every(f => existsSync(join(CACHE_DIR, f)));

  if (isCacheValid() && cacheComplete) {
    console.log(`Street data cache is fresh (< ${CACHE_TTL_DAYS} days old) — copying to public/data/streets/`);
    for (const f of ALL_FILES) copyFileSync(join(CACHE_DIR, f), join(OUT_DIR, f));
    console.log('Done.');
    return;
  }

  console.log('Cache missing or older than 30 days — downloading from Overpass…');
  await download();
  console.log('Done.');
}

main().catch(err => { console.error(err); process.exit(1); });
