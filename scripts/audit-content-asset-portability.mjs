#!/usr/bin/env node
// Detects published-content image hotlinks without changing content or URLs.

import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = 'src/content/blog';
const entries = (await readdir(root, { recursive: true })).filter((entry) => entry.endsWith('.md'));
const hotlinks = [];
const remoteAsset = /!\[[^\]]*\]\(https?:\/\/|<img\b[^>]*\bsrc\s*=\s*["']https?:\/\//i;
for (const relative of entries) {
  const text = await readFile(join(root, relative), 'utf8');
  if (remoteAsset.test(text)) hotlinks.push(relative);
}
await mkdir('reports/content-portability', { recursive: true });
await writeFile('reports/content-portability/assets.md', ['# Content asset portability audit', '', `- Markdown documents scanned: ${entries.length}`, `- Remote image hotlinks: ${hotlinks.length}`, ...hotlinks.map((file) => `- ${file}`), '', 'External reference links are not image hotlinks and are intentionally outside this check.'].join('\n'));
console.log(`Content asset portability: ${entries.length} documents scanned; ${hotlinks.length} remote image hotlink(s).`);
if (hotlinks.length) process.exitCode = 1;
