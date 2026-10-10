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
  // A draft is not built, so its links point out of a page nobody can open.
  const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---/.exec(source)?.[1] ?? '';
  if (/^draft:\s*true\s*$/m.test(frontmatter)) continue;
  // Same-page links (](#frag)) resolve against this post's own page.
  const self = `/blog/${/^slug:\s*"?([^"\n]+?)"?\s*$/m.exec(frontmatter)?.[1] ?? relative.replace(/\.md$/, '')}`;
  const links = source.matchAll(/\]\((\/[^\s)#]*)?#([^\s)]+)\)/g);
  for (const match of links) {
    checked += 1;
    const target = decodeURIComponent(match[1] ?? self); const anchor = decodeURIComponent(match[2]); const html = await htmlFor(target);
    if (!html) findings.push(`${relative}: missing generated page ${target}#${anchor}`);
    else if (!new RegExp(`[\\s<]id=["']${anchor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']`).test(html)) findings.push(`${relative}: missing generated anchor ${target}#${anchor}`);
  }
}
await mkdir('reports/quality', { recursive: true });
await writeFile('reports/quality/anchors.md', ['# Generated anchor-link audit', '', `- Source documents scanned: ${files.length}`, `- Internal fragment links checked: ${checked}`, `- Findings: ${findings.length}`, ...findings.map((finding) => `- ${finding}`), ''].join('\n'));
console.log(`Anchor links: ${checked} checked; ${findings.length} finding(s).`);
for (const finding of findings) console.log(`  ✗ ${finding}`);
if (findings.length) process.exitCode = 1;
