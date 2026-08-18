#!/usr/bin/env node

// Audit diagram accessibility where it is actually exposed: the reference site.
//
// Every diagram on this site is embedded as <img src="...svg" alt="...">, both
// from markdown `![alt](/images/blog/...)` and from Diagram.astro, whose `alt`
// is a required prop. A browser loading an SVG through <img> does not expose the
// file's internal DOM to assistive technology, so a <title>/<desc> inside the
// SVG is never announced; the alt attribute is the accessible name.
//
// An earlier version of this script checked for internal <title>/<desc> and
// offered to inject them. That reported 1038 of 1038 files and would have
// written filename-derived English strings into a Korean site for no
// accessibility gain, while making every artifact newer than its TeX source so
// build-diagrams.sh (mtime-based) would silently stop regenerating it.
//
// This audit is read-only and reports three real defect classes:
//   - references whose alt text is missing or too short to name the diagram
//   - references pointing at an SVG that does not exist (broken image)
//   - SVGs on disk that no published or draft content references
//
// Exits non-zero on alt gaps and broken references. Unreferenced artifacts are
// reported for review, not failed, because imported assets are legitimate.

import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

const assetRoot = 'public/images/blog';
const contentRoot = 'src/content/blog';
const MIN_ALT_LENGTH = 3;

async function walk(dir, predicate, out = []) {
  for (const entry of (await readdir(dir, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
    const file = join(dir, entry.name);
    if (entry.isDirectory()) await walk(file, predicate, out);
    else if (entry.isFile() && predicate(entry.name)) out.push(file);
  }
  return out;
}

const svgFiles = await walk(assetRoot, (name) => name.endsWith('.svg'));
const contentFiles = await walk(contentRoot, (name) => name.endsWith('.md') || name.endsWith('.mdx'));
const svgSet = new Set(svgFiles.map((file) => relative('.', file)));

const markdownImage = /!\[([^\]]*)\]\((\/images\/blog\/[^)\s]+\.svg)\)/g;
const diagramComponent = /<Diagram\b[^>]*?\/?>/gs;
const srcAttribute = /\bsrc=["']([^"']+)["']/;
const altAttribute = /\balt=["']([^"']*)["']/;

const references = [];
for (const file of contentFiles) {
  const source = await readFile(file, 'utf8');
  const rel = relative('.', file);
  for (const [, alt, url] of source.matchAll(markdownImage)) {
    references.push({ file: rel, alt, asset: `public${url}` });
  }
  for (const [tag] of source.matchAll(diagramComponent)) {
    const src = tag.match(srcAttribute)?.[1];
    if (!src) continue;
    references.push({ file: rel, alt: tag.match(altAttribute)?.[1] ?? '', asset: `${assetRoot}/${src.replace(/\.svg$/, '')}.svg` });
  }
}

const weakAlt = references.filter(({ alt }) => alt.trim().length < MIN_ALT_LENGTH);
const broken = references.filter(({ asset }) => !svgSet.has(asset));
const referenced = new Set(references.map(({ asset }) => asset));
const unreferenced = [...svgSet].filter((asset) => !referenced.has(asset)).sort();
const defects = weakAlt.length + broken.length;

await mkdir('reports/diagrams', { recursive: true });
await writeFile('reports/diagrams/references.md', [
  '# Diagram reference audit', '',
  `- SVG assets on disk: ${svgFiles.length}`,
  `- References from content: ${references.length}`,
  `- References with missing or too-short alt: ${weakAlt.length}`,
  `- References to a missing SVG: ${broken.length}`,
  `- SVGs never referenced: ${unreferenced.length}`,
  '',
  'Diagrams are embedded through <img>, so the alt attribute is the accessible',
  'name. Internal <title>/<desc> elements are not announced and are not checked.',
  '',
  '## Missing or too-short alt', '',
  ...weakAlt.map(({ file, asset, alt }) => `- ${file} → ${asset} (alt: ${JSON.stringify(alt)})`),
  '',
  '## Broken references', '',
  ...broken.map(({ file, asset, alt }) => `- ${file} → ${asset} (alt: ${JSON.stringify(alt)})`),
  '',
  '## Unreferenced SVGs', '',
  ...unreferenced.slice(0, 100).map((asset) => `- ${asset}`),
  ...(unreferenced.length > 100 ? [`- … +${unreferenced.length - 100} more`] : []),
  '',
].join('\n'));

console.log(`Diagram references: ${references.length} reference(s) over ${svgFiles.length} SVG; ${weakAlt.length} alt gap(s), ${broken.length} broken, ${unreferenced.length} unreferenced.`);
console.log('Report: reports/diagrams/references.md');
for (const { file, asset } of broken.slice(0, 20)) console.log(`- broken: ${file} → ${asset}`);
for (const { file, asset, alt } of weakAlt.slice(0, 20)) console.log(`- alt gap: ${file} → ${asset} (${JSON.stringify(alt)})`);
if (defects) process.exitCode = 1;
