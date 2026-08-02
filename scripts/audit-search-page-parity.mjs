#!/usr/bin/env node
// Checks that every generated search result points to a generated stable page.

import { mkdir, readFile, writeFile } from 'node:fs/promises';

const index = JSON.parse(await readFile('dist/search.json', 'utf8'));
const findings = []; const seen = new Set();
for (const item of index) {
  if (!item.slug || seen.has(item.slug)) findings.push(`duplicate or missing slug: ${item.slug ?? '(missing)'}`);
  seen.add(item.slug);
  const page = `dist/blog/${item.slug}/index.html`;
  try { await readFile(page); } catch { findings.push(`search result has no generated page: ${item.slug}`); }
}
await mkdir('reports/quality', { recursive: true });
await writeFile('reports/quality/search-page-parity.md', ['# Search/page parity audit', '', `- Search records: ${index.length}`, `- Unique slugs: ${seen.size}`, `- Findings: ${findings.length}`, ...findings.map((finding) => `- ${finding}`), ''].join('\n'));
console.log(`Search/page parity: ${index.length} records; ${findings.length} finding(s).`);
if (findings.length) process.exitCode = 1;
