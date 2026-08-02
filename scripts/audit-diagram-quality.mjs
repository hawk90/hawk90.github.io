#!/usr/bin/env node
// Heuristic visual-quality inventory for SVGs. Hard structural failures belong
// to audit-diagram-assets; this report surfaces candidates for human review.
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { relative } from 'node:path';
import { load } from 'cheerio';

const root = 'public/images/blog';
const referenceArg = process.argv.find((arg) => arg.startsWith('--reference='))?.slice(12);
const files = [];
async function walk(dir) {
  for (const entry of (await readdir(dir, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
    const file = `${dir}/${entry.name}`;
    if (entry.isDirectory()) await walk(file);
    else if (entry.isFile() && entry.name.endsWith('.svg')) files.push(file);
  }
}
await walk(root);

function metrics(source) {
  const $ = load(source, { xmlMode: true });
  const svg = $('svg').first();
  const viewBox = (svg.attr('viewBox') || '').trim().split(/\s+/).map(Number);
  const width = viewBox[2] || 0, height = viewBox[3] || 0;
  const scales = [...source.matchAll(/<use\b[^>]*(?:xlink:)?href="#glyph-[^" ]+"[^>]*transform="matrix\(([-\d.]+),\s*([-\d.]+),\s*([-\d.]+),\s*([-\d.]+),/g)]
    .map(([, a, b, c, d]) => Math.max(Math.hypot(+a, +b), Math.hypot(+c, +d)));
  const colors = new Set((source.match(/(?<!&)#(?:[0-9a-f]{3}|[0-9a-f]{6})\b/gi) || []).map((x) => x.toLowerCase()));
  return {
    width, height, aspect: width && height ? +(width / height).toFixed(3) : 0,
    rects: $('rect').length, paths: $('path').length, glyphs: (source.match(/<use\b[^>]*(?:xlink:)?href="#glyph-/g) || []).length,
    colors: colors.size + new Set(source.match(/rgb\([^)]*\)/gi) || []).size, gradients: $('linearGradient, radialGradient').length,
    filters: $('filter').length, clipPaths: $('clipPath').length,
    opacity: [...source.matchAll(/(?<![-\w])opacity\s*=\s*"([^" ]+)"/g)].filter(([, value]) => value !== '1').length,
    minGlyphScale: scales.length ? +Math.min(...scales).toFixed(3) : null,
    medianGlyphScale: scales.length ? +scales.sort((a, b) => a - b)[Math.floor(scales.length / 2)].toFixed(3) : null,
  };
}

const rows = [];
for (const file of files) rows.push({ file: relative('.', file), ...metrics(await readFile(file, 'utf8')) });
const candidates = rows.map((row) => {
  const reasons = [];
  if (row.minGlyphScale != null && row.minGlyphScale < 0.6) reasons.push('tiny-text-candidate');
  if (row.gradients || row.filters || row.clipPaths || row.opacity) reasons.push('effect-or-opacity');
  if (row.colors > 18) reasons.push('palette-complexity');
  return { ...row, reasons };
}).filter((row) => row.reasons.length);

let reference = null;
if (referenceArg) {
  const source = await readFile(referenceArg, 'utf8');
  reference = { file: referenceArg, ...metrics(source) };
  for (const row of rows) {
    row.referenceDelta = Object.fromEntries(['aspect', 'rects', 'paths', 'glyphs', 'colors', 'gradients', 'filters', 'opacity'].map((key) => [key, +(row[key] - reference[key]).toFixed(3)]));
  }
}

await mkdir('reports/diagrams', { recursive: true });
await writeFile('reports/diagrams/quality.md', [
  '# Diagram visual-quality inventory', '',
  `- SVGs scanned: ${rows.length}`,
  `- Heuristic candidates: ${candidates.length}`,
  `- Reference: ${referenceArg || 'none (pass --reference=<svg> for feature deltas)'}`,
  '', '## Candidate reasons', '',
  ...candidates.slice(0, 200).map((row) => `- ${row.file} — ${row.reasons.join(', ')}; glyph scale ${row.minGlyphScale ?? 'n/a'}; colors ${row.colors}`),
  ...(candidates.length > 200 ? [`- … +${candidates.length - 200} more`] : []),
  '', '> These are review candidates, not automatic correctness verdicts. Meaning, legibility at the rendered size, and pedagogical value still require human review.',
].join('\n'));
await writeFile('reports/diagrams/quality.json', JSON.stringify({ reference, rows, candidates }, null, 2) + '\n');
console.log(`Diagram quality: ${rows.length} scanned; ${candidates.length} heuristic candidate(s).`);
