#!/usr/bin/env node
// Heuristic detector for likely text/text overlap in pdftocairo-generated SVGs.
//
// Strategy: collect every <use href="#glyph-..."> with its x/y. Group glyphs
// that sit on the same baseline (within ε pixels) and whose x positions are
// adjacent — those form a text run. Compute an approximate bounding box per
// run. Report any pair of runs in the same SVG whose bboxes overlap.
//
// Caveats: glyphs in different scales/transforms aren't handled, so figures
// using nested scopes (matrices, scaled regions) may report false positives.

import fs from 'node:fs/promises';
import path from 'node:path';

const Y_TOL = 1.5;           // glyphs within 1.5pt y are same line
const X_GAP = 12;            // gap > 12pt breaks a run
const GLYPH_W = 5;           // approx glyph width
const GLYPH_H = 4;           // bbox half-height — runs whose y differs by >4pt are different lines

async function main() {
  const dir = process.argv[2];
  if (!dir) {
    console.error('usage: node audit-svg-overlap.mjs <dir>');
    process.exit(1);
  }
  const files = (await fs.readdir(dir)).filter((f) => f.endsWith('.svg')).sort();
  let any = false;
  for (const f of files) {
    const overlaps = audit(await fs.readFile(path.join(dir, f), 'utf-8'));
    if (overlaps.length === 0) continue;
    any = true;
    console.log(`\n${f}`);
    for (const o of overlaps.slice(0, 5)) {
      console.log(`  overlap @ y≈${o.y.toFixed(1)}: ` +
        `[${o.aX.toFixed(0)}..${o.aXEnd.toFixed(0)}] × [${o.bX.toFixed(0)}..${o.bXEnd.toFixed(0)}] ` +
        `(${o.a} ↔ ${o.b})`);
    }
    if (overlaps.length > 5) console.log(`  …${overlaps.length - 5} more overlaps`);
  }
  if (!any) console.log('No overlaps detected by heuristic.');
}

function audit(svg) {
  const uses = [...svg.matchAll(/<use [^>]*xlink:href="#(glyph-[\d-]+)"[^>]*x="([-\d.]+)"[^>]*y="([-\d.]+)"/g)]
    .map((m) => ({ id: m[1], x: +m[2], y: +m[3] }));
  uses.sort((a, b) => a.y - b.y || a.x - b.x);

  const runs = [];
  for (const g of uses) {
    const r = runs[runs.length - 1];
    if (r && Math.abs(r.y - g.y) < Y_TOL && g.x - r.xEnd < X_GAP) {
      r.xEnd = g.x + GLYPH_W;
      r.glyphs += 1;
    } else {
      runs.push({ y: g.y, x: g.x, xEnd: g.x + GLYPH_W, glyphs: 1, id: g.id });
    }
  }

  const overlaps = [];
  for (let i = 0; i < runs.length; i++) {
    for (let j = i + 1; j < runs.length; j++) {
      const a = runs[i];
      const b = runs[j];
      if (Math.abs(a.y - b.y) > GLYPH_H) continue;
      if (a.xEnd <= b.x || b.xEnd <= a.x) continue;
      // ignore tiny overlaps (subscripts/superscripts often touch by design)
      const overlap = Math.min(a.xEnd, b.xEnd) - Math.max(a.x, b.x);
      if (overlap < 2) continue;
      overlaps.push({
        y: (a.y + b.y) / 2,
        aX: a.x, aXEnd: a.xEnd, a: `${a.id}×${a.glyphs}`,
        bX: b.x, bXEnd: b.xEnd, b: `${b.id}×${b.glyphs}`,
      });
    }
  }
  return overlaps;
}

main().catch((e) => { console.error(e); process.exit(1); });
