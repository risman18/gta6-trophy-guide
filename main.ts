// Leonida Trophy Guide — the hand-in program for gta6-trophy-guide-01 (Node 22, stdlib only).
// The guide is this directory's app/ folder: plain static files served at app/index.html
// (one ES module, one stylesheet, one JSON data file), fully offline — it loads nothing
// over the network, and its trophy list and guides are app/data/trophies.json.
// This program copies app/ and screenshots/ from beside this file to /output and writes
// /output/dossier.json with the vendored make.fun library, which is the summary the judge
// reads (screenshots, first-load files and bytes, and the source). Leave
// vendor/makefun-frontend.ts exactly as the kit shipped it: the scorer requires
// dossier.json to be byte for byte what its own copy of the library writes.
//
// Serve the guide locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The gate wants 3 or 4 screenshots, each a whole PNG or JPEG of at most 256 KiB.
// Check that here, before the dossier is built, so a bad hand-in fails loudly
// on our own machine instead of silently in the grader.
const shotsDir = join(here, 'screenshots');
const shots = existsSync(shotsDir)
  ? readdirSync(shotsDir).filter((f) => !f.startsWith('.') && statSync(join(shotsDir, f)).isFile())
  : [];
if (shots.length < 3 || shots.length > 4) {
  throw new Error(`expected 3 or 4 screenshots in screenshots/, found ${shots.length}`);
}

// The gate wants all 55 official trophies named in app/data/trophies.json, each with
// a non-blank guide. Check that here too, so a bad hand-in fails loudly on our own
// machine instead of silently in the grader.
const trophies = JSON.parse(readFileSync(join(here, 'app', 'data', 'trophies.json'), 'utf8')).trophies;
if (!Array.isArray(trophies) || trophies.length !== 55) {
  throw new Error(`expected 55 trophies in app/data/trophies.json, found ${Array.isArray(trophies) ? trophies.length : 'none'}`);
}
for (const t of trophies) {
  if (typeof t.name !== 'string' || !t.name || typeof t.guide !== 'string' || !t.guide.trim()) {
    throw new Error(`trophy entry ${JSON.stringify(t.name)} has no usable name or guide`);
  }
}
for (const shot of shots) {
  const size = statSync(join(shotsDir, shot)).size;
  if (size > 262144) throw new Error(`screenshot ${shot} is ${size} bytes, over the 256 KiB cap`);
  if (!/\.(png|jpe?g)$/i.test(shot)) throw new Error(`screenshot ${shot} is not a PNG or JPEG`);
}

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
cpSync(shotsDir, join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the bytes; the others refuse an entry the
// scorer would refuse (more than 4 screenshots or one over 256 KiB; more than 993 files and directories in app/ or
// 48 MiB of app files: app/ counts beside /output's own 1000-entry cap, its screenshots/ and dossier.json).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, { text_max_bytes: 163840, screenshots: { max: 4, max_bytes: 262144 }, app_max_files: 993, app_max_bytes: 50331648 }),
);

console.log(`handed in ${shots.length} screenshots (${shots.join(', ')}) and app/ to ${out}`);
