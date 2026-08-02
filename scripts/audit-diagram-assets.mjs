#!/usr/bin/env node
// Validate the TikZ -> SVG asset contract without rewriting diagram content.
// Structural defects fail; accessibility metadata is reported separately so a
// future metadata migration can be reviewed instead of silently changing 1k files.

import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { load } from 'cheerio';

const root = 'public/images/blog';
const enforceAccessibility = process.argv.includes('--enforce-accessibility');
const texFiles = [];
const svgFiles = [];
const tempFiles = [];

async function walk(dir) {
  for (const entry of (await readdir(dir, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
    const file = join(dir, entry.name);
    if (entry.isDirectory()) await walk(file);
    else if (entry.isFile()) {
      if (entry.name.endsWith('.tex')) texFiles.push(file);
      else if (entry.name.endsWith('.svg')) svgFiles.push(file);
      else if (/\.(aux|log|pdf|synctex\.gz)$/.test(entry.name)) tempFiles.push(file);
    }
  }
}
await walk(root);

const svgSet = new Set(svgFiles.map((file) => file.replace(/\.svg$/, '')));
const texSet = new Set(texFiles.map((file) => file.replace(/\.tex$/, '')));
const missingGenerated = texFiles
  .filter((file) => !file.split('/').pop().startsWith('_') && !svgSet.has(file.replace(/\.tex$/, '')))
  .map((file) => relative('.', file));
const findings = [];
const orphanSvg = svgFiles
  .filter((file) => !texSet.has(file.replace(/\.svg$/, '')))
  .map((file) => relative('.', file));
const accessibility = [];
for (const file of svgFiles) {
  const rel = relative('.', file);
  const source = await readFile(file, 'utf8');
  const $ = load(source, { xmlMode: true });
  const svg = $('svg').first();
  if (!svg.length) findings.push(`${rel}: missing root <svg>`);
  if (!svg.attr('viewBox')) findings.push(`${rel}: missing viewBox`);
  if (!source.includes('xmlns="http://www.w3.org/2000/svg"')) findings.push(`${rel}: missing SVG namespace`);
  if (!$('title').length && !$('desc').length) accessibility.push(`${rel}: missing <title>/<desc>`);
}
for (const file of missingGenerated) findings.push(`${file}: missing generated SVG`);

await mkdir('reports/diagrams', { recursive: true });
await writeFile('reports/diagrams/assets.md', [
  '# Diagram asset audit', '',
  `- TeX sources: ${texFiles.length}`,
  `- SVG assets: ${svgFiles.length}`,
  `- Structural findings: ${findings.length}`,
  `- Accessibility findings: ${accessibility.length}`,
  `- Temporary build files: ${tempFiles.length}`,
  `- SVGs without a sibling TeX source (manual/imported assets): ${orphanSvg.length}`,
  '',
  '## Structural findings', '',
  ...findings.slice(0, 200).map((item) => `- ${item}`),
  ...(findings.length > 200 ? [`- … +${findings.length - 200} more`] : []),
  '',
  '## Accessibility findings', '',
  ...accessibility.slice(0, 30).map((item) => `- ${item}`),
  ...(accessibility.length > 30 ? [`- … +${accessibility.length - 30} more`] : []),
  '',
  '## Orphan SVG candidates', '',
  ...orphanSvg.slice(0, 100).map((item) => `- ${item}`),
  ...(orphanSvg.length > 100 ? [`- … +${orphanSvg.length - 100} more`] : []),
  '',
  '> Accessibility metadata is reported without rewriting SVGs. Use an explicit reviewed migration before adding titles/descriptions in bulk.',
].join('\n'));
console.log(`Diagram assets: ${svgFiles.length} SVG, ${findings.length} structural finding(s), ${accessibility.length} accessibility finding(s), ${tempFiles.length} temp file(s).`);
if (findings.length || (enforceAccessibility && accessibility.length)) process.exitCode = 1;
