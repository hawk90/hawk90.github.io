#!/usr/bin/env node
// Structural signals for the series layer. Read-only.
//
// audit-series-integrity.py already covers ordering: duplicate seriesOrder,
// gaps, draft mixing. This covers what surrounds a series instead — whether it
// has an identity of its own, a way in, and a way out.
//
//   - Identity: every series in content carries a lens entry in src/consts/series.ts,
//     and no folder holds two series. A series whose identity is only its folder
//     cannot be renamed or split without moving files.
//   - Entry: a published series starts at its own beginning. When the opening
//     chapters are drafts and later ones are not, a reader lands mid-argument.
//   - Continuity: no draft sits between two published chapters.
//   - Exit: the last published chapter links somewhere else under /blog/.
//
// Findings are reported, never fixed: each one needs an editorial decision about
// what to publish or where to point.

import { readdir, readFile } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
// Namespace import, not default: js-yaml 5 drops the default export, and this
// form resolves under both 4 and 5.
import * as yaml from 'js-yaml';

const contentRoot = 'src/content/blog';
const registryPath = 'src/consts/series.ts';
const enforce = process.argv.includes('--enforce');

async function walk(dir, out = []) {
  for (const entry of (await readdir(dir, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
    const file = join(dir, entry.name);
    if (entry.isDirectory()) await walk(file, out);
    else if (entry.isFile() && file.endsWith('.md')) out.push(file);
  }
  return out;
}

const chapters = new Map(); // series -> [{ file, order, draft, body }]
for (const file of await walk(contentRoot)) {
  const raw = await readFile(file, 'utf8');
  const match = raw.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!match) continue;
  let data;
  try { data = yaml.load(match[1]) ?? {}; } catch { continue; }
  if (!data.series) continue;
  const name = String(data.series);
  if (!chapters.has(name)) chapters.set(name, []);
  chapters.get(name).push({
    file: relative('.', file),
    order: Number(data.seriesOrder) || 0,
    draft: data.draft === true,
    body: raw.slice(match[0].length),
  });
}

const registry = await readFile(registryPath, 'utf8');
const registered = new Set([...registry.matchAll(/id:\s*"((?:[^"\\]|\\.)*)"/g)].map(([, id]) => id.replace(/\\"/g, '"')));

const findings = [];
const push = (type, series, detail) => findings.push({ type, series, detail });

for (const name of chapters.keys()) {
  if (!registered.has(name)) push('no-lens', name, `${chapters.get(name).length} chapters with no entry in ${registryPath}`);
}
for (const name of registered) {
  if (!chapters.has(name)) push('lens-without-content', name, `registered in ${registryPath} but no chapter carries it`);
}

const byFolder = new Map();
for (const [name, list] of chapters) {
  for (const folder of new Set(list.map(({ file }) => dirname(file)))) {
    if (!byFolder.has(folder)) byFolder.set(folder, new Set());
    byFolder.get(folder).add(name);
  }
}
for (const [folder, names] of byFolder) {
  if (names.size > 1) push('folder-holds-many-series', [...names].sort().join(' + '), `${folder} holds ${names.size} series`);
}

let publishedSeries = 0;
for (const [name, list] of chapters) {
  const published = list.filter(({ draft }) => !draft);
  if (!published.length) continue;
  publishedSeries++;

  const lowestOverall = Math.min(...list.map(({ order }) => order));
  const lowestPublished = Math.min(...published.map(({ order }) => order));
  if (lowestPublished > lowestOverall) {
    const drafted = list.filter(({ draft, order }) => draft && order < lowestPublished).length;
    push('no-entry-point', name, `starts at seriesOrder ${lowestPublished}; ${drafted} earlier chapter(s) are drafts`);
  }

  const highestPublished = Math.max(...published.map(({ order }) => order));
  const inner = list.filter(({ draft, order }) => draft && order > lowestPublished && order < highestPublished);
  if (inner.length) push('gap-inside-series', name, `${inner.length} draft chapter(s) between published ${lowestPublished} and ${highestPublished}`);

  const last = published.reduce((a, b) => (b.order > a.order || (b.order === a.order && b.file > a.file) ? b : a));
  if (!/\]\(\/blog\//.test(last.body)) push('no-exit', name, `last published chapter ${last.file} links nowhere under /blog/`);
}

const counts = findings.reduce((acc, { type }) => ({ ...acc, [type]: (acc[type] ?? 0) + 1 }), {});
console.log(`Series structure: ${chapters.size} series (${publishedSeries} with published chapters), ${registered.size} registered lens(es); ${findings.length} finding(s).`);
for (const [type, count] of Object.entries(counts)) console.log(`  ${type}: ${count}`);
for (const { type, series, detail } of findings.slice(0, 40)) console.log(`  ✗ [${type}] ${series} — ${detail}`);
if (findings.length > 40) console.log(`  … +${findings.length - 40} more`);
if (enforce && findings.length) process.exitCode = 1;
