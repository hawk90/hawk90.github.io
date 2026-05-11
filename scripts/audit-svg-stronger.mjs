#!/usr/bin/env node
// Stronger SVG overlap audit. Two checks:
//   1) Text run on text run, same baseline (existing).
//   2) Text run inside a path's bounding box where the path is a stroked
//      shape — flags labels that land on top of rectangle edges, arrows,
//      or curves. Only counts the path if its bbox is small enough to
//      indicate a shape rather than a full-figure container.

import fs from 'node:fs/promises';
import path from 'node:path';

const GLYPH_W = 5;

function parseUses(svg) {
  return [...svg.matchAll(/<use [^>]*xlink:href="#(glyph-[\d-]+)"[^>]*x="([-\d.]+)"[^>]*y="([-\d.]+)"/g)]
    .map((m) => ({ id: m[1], x: +m[2], y: +m[3] }));
}

function makeRuns(uses) {
  uses = [...uses].sort((a, b) => a.y - b.y || a.x - b.x);
  const runs = [];
  for (const g of uses) {
    const r = runs[runs.length - 1];
    if (r && Math.abs(r.y - g.y) < 1.5 && g.x - r.xEnd < 12) {
      r.xEnd = g.x + GLYPH_W;
      r.glyphs += 1;
    } else {
      runs.push({ y: g.y, x: g.x, xEnd: g.x + GLYPH_W, glyphs: 1, id: g.id });
    }
  }
  return runs;
}

function parsePathBBoxes(svg) {
  const out = [];
  for (const m of svg.matchAll(/<path [^>]*d="([^"]+)"[^>]*>/g)) {
    const d = m[1];
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    let cx = 0, cy = 0, anyPoints = false;
    const tokens = d.match(/[MLHVCSZmlhvcsz]|-?\d+\.?\d*/g) || [];
    let i = 0;
    while (i < tokens.length) {
      const t = tokens[i];
      if (/^[MLCSmlcs]$/.test(t)) {
        const isRel = t === t.toLowerCase();
        const cmd = t.toUpperCase();
        const arity = cmd === 'C' ? 6 : cmd === 'S' ? 4 : 2;
        i++;
        while (i + arity <= tokens.length && !/^[A-Za-z]$/.test(tokens[i])) {
          const xs = [];
          for (let k = 0; k < arity; k++) xs.push(+tokens[i + k]);
          for (let k = 0; k < arity; k += 2) {
            const px = isRel ? cx + xs[k] : xs[k];
            const py = isRel ? cy + xs[k + 1] : xs[k + 1];
            minX = Math.min(minX, px); maxX = Math.max(maxX, px);
            minY = Math.min(minY, py); maxY = Math.max(maxY, py);
            cx = px; cy = py;
            anyPoints = true;
          }
          i += arity;
        }
      } else if (/^[HhVv]$/.test(t)) {
        const isRel = t === t.toLowerCase();
        const dim = t.toUpperCase() === 'H' ? 'x' : 'y';
        i++;
        while (i < tokens.length && !/^[A-Za-z]$/.test(tokens[i])) {
          const v = +tokens[i];
          if (dim === 'x') {
            cx = isRel ? cx + v : v;
            minX = Math.min(minX, cx); maxX = Math.max(maxX, cx);
          } else {
            cy = isRel ? cy + v : v;
            minY = Math.min(minY, cy); maxY = Math.max(maxY, cy);
          }
          anyPoints = true;
          i++;
        }
      } else if (/^[Zz]$/.test(t)) {
        i++;
      } else {
        i++; // unknown
      }
    }
    if (anyPoints) out.push({ minX, maxX, minY, maxY });
  }
  return out;
}

function pointOnStroke(x, y, b, tol = 2) {
  if (x < b.minX - tol || x > b.maxX + tol || y < b.minY - tol || y > b.maxY + tol) return false;
  // near top/bottom edge?
  const onTop    = Math.abs(y - b.minY) < tol && x >= b.minX - tol && x <= b.maxX + tol;
  const onBot    = Math.abs(y - b.maxY) < tol && x >= b.minX - tol && x <= b.maxX + tol;
  const onLeft   = Math.abs(x - b.minX) < tol && y >= b.minY - tol && y <= b.maxY + tol;
  const onRight  = Math.abs(x - b.maxX) < tol && y >= b.minY - tol && y <= b.maxY + tol;
  return onTop || onBot || onLeft || onRight;
}

function audit(svg) {
  const runs = makeRuns(parseUses(svg));
  const paths = parsePathBBoxes(svg);
  // Only consider "shape" paths: small enough not to be page-wide background, big enough to be a deliberate shape
  const shapes = paths.filter(b => {
    const w = b.maxX - b.minX, h = b.maxY - b.minY;
    return w > 8 && h > 8 && w < 300 && h < 300;
  });
  const hits = [];
  for (const r of runs) {
    const cx = (r.x + r.xEnd) / 2;
    const cy = r.y;
    for (const b of shapes) {
      // Check if run's center is on a shape edge AND the run has multiple glyphs (real label, not subscript)
      if (r.glyphs >= 2 && pointOnStroke(cx, cy, b, 3)) {
        // also ensure the run extends across the edge
        if (r.xEnd > b.minX && r.x < b.maxX) {
          hits.push({ run: r, box: b });
          break;
        }
      }
    }
  }
  return hits;
}

async function main() {
  const dir = process.argv[2];
  if (!dir) {
    console.error('usage: node audit-svg-stronger.mjs <dir>');
    process.exit(1);
  }
  const files = (await fs.readdir(dir)).filter(f => f.endsWith('.svg')).sort();
  let any = false;
  for (const f of files) {
    const svg = await fs.readFile(path.join(dir, f), 'utf-8');
    const hits = audit(svg);
    if (hits.length === 0) continue;
    any = true;
    console.log(`\n${f}: ${hits.length} text-on-shape candidate(s)`);
    for (const h of hits.slice(0, 4)) {
      console.log(`  run ${h.run.id}×${h.run.glyphs} @ [${h.run.x.toFixed(0)}..${h.run.xEnd.toFixed(0)}, y=${h.run.y.toFixed(0)}] crosses box [${h.box.minX.toFixed(0)}..${h.box.maxX.toFixed(0)}, ${h.box.minY.toFixed(0)}..${h.box.maxY.toFixed(0)}]`);
    }
    if (hits.length > 4) console.log(`  …${hits.length - 4} more`);
  }
  if (!any) console.log('No text-on-shape overlaps found.');
}

main().catch(e => { console.error(e); process.exit(1); });
