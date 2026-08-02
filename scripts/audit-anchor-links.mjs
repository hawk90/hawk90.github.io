#!/usr/bin/env node
// Checks internal Markdown fragment links against generated dist IDs.

import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const sourceRoot = 'src/content/blog';
const files = (await readdir(sourceRoot, { recursive: true })).filter((entry) => entry.endsWith('.md'));
const cache = new Map(); const findings = []; let checked = 0;
const htmlFor = async (target) => {
  const path = target.replace(/\/$/, '') || '/';
  const file = path === '/' ? 'dist/index.html' : `dist${path}/index.html`;
  if (!cache.has(file)) cache.set(file, await readFile(file, 'utf8').catch(() => null));
  return cache.get(file);
};
for (const relative of files) {
  const source = await readFile(join(sourceRoot, relative), 'utf8');
  const links = source.matchAll(/\]\((\/[^\s)#]+)#([^\s)]+)\)/g);
  for (const match of links) {
    checked += 1;
    const target = decodeURIComponent(match[1]); const anchor = decodeURIComponent(match[2]); const html = await htmlFor(target);
    if (!html) findings.push(`${relative}: missing generated page ${target}#${anchor}`);
    else if (!new RegExp(`\\bid=["']${anchor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']`).test(html)) findings.push(`${relative}: missing generated anchor ${target}#${anchor}`);
  }
}
await mkdir('reports/quality', { recursive: true });
await writeFile('reports/quality/anchors.md', ['# Generated anchor-link audit', '', `- Source documents scanned: ${files.length}`, `- Internal fragment links checked: ${checked}`, `- Findings: ${findings.length}`, ...findings.map((finding) => `- ${finding}`), ''].join('\n'));
console.log(`Anchor links: ${checked} checked; ${findings.length} finding(s).`);
if (findings.length) process.exitCode = 1;
