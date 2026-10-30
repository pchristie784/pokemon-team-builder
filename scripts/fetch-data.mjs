// Refreshes the vendored Soulgold data snapshot (ADR 0001).
// Usage: npm run fetch-data
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = 'https://eemeliri.github.io/soulgold/';
const DATA = `${BASE}data/`;
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'data', 'soulgold');
const TOP_LEVEL = [
  'species.json',
  'species-meta.json',
  'moves.json',
  'abilities.json',
  'machines.json',
  'encounters.json',
  'trainers.json',
];
const SPRITES_OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'soulgold');
const CONCURRENCY = 8;

async function fetchOk(url, attempt = 1) {
  const res = await fetch(url);
  if (!res.ok) {
    if (attempt < 3 && res.status >= 500) return fetchOk(url, attempt + 1);
    throw new Error(`GET ${url} -> ${res.status}`);
  }
  return res;
}

async function fetchText(url) {
  return (await fetchOk(url)).text();
}

async function fetchBytes(url) {
  return new Uint8Array(await (await fetchOk(url)).arrayBuffer());
}

async function fetchJson(url) {
  const text = await fetchText(url);
  JSON.parse(text); // fail loudly on malformed data
  return text;
}

async function scrapeVersion() {
  const html = await fetchText(`${BASE}index.html`);
  const match = html.match(/Latest version of the hack:\s*(?:<[^>]*>\s*)*(v[\d.]+)/i);
  if (!match) throw new Error('Could not find "Latest version of the hack: vX.Y.Z" in wiki index.html');
  return match[1];
}

async function pool(items, worker) {
  let next = 0;
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (next < items.length) await worker(items[next++]);
    }),
  );
}

async function main() {
  const version = await scrapeVersion();
  console.log(`Hack version ${version}`);
  await rm(OUT, { recursive: true, force: true });
  await mkdir(join(OUT, 'species-details'), { recursive: true });

  const texts = {};
  await pool(TOP_LEVEL, async (file) => {
    texts[file] = await fetchJson(DATA + file);
    await writeFile(join(OUT, file), texts[file]);
    console.log(`  ${file}`);
  });

  const slugs = [...new Set(JSON.parse(texts['species.json']).map((s) => s.slug))];
  let done = 0;
  await pool(slugs, async (slug) => {
    const text = await fetchJson(`${DATA}species-details/${slug}.json`);
    await writeFile(join(OUT, 'species-details', `${slug}.json`), text);
    if (++done % 100 === 0) console.log(`  species-details ${done}/${slugs.length}`);
  });

  // Sprites go to public/ (served and copied into the build as-is) so the app works offline.
  const sprites = [...new Set(JSON.parse(texts['species.json']).map((s) => s.sprite).filter(Boolean))];
  await rm(SPRITES_OUT, { recursive: true, force: true });
  done = 0;
  await pool(sprites, async (sprite) => {
    const bytes = await fetchBytes(BASE + sprite);
    const file = join(SPRITES_OUT, sprite);
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, bytes);
    if (++done % 100 === 0) console.log(`  sprites ${done}/${sprites.length}`);
  });

  await writeFile(
    join(OUT, 'version.json'),
    JSON.stringify({ hackVersion: version, fetchedAt: new Date().toISOString(), source: DATA }, null, 2) + '\n',
  );
  console.log(`Done: ${slugs.length} species-details files, ${sprites.length} sprites.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
