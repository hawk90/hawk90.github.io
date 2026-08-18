#!/usr/bin/env node
// Verifies that every Markdown document has independently parseable YAML frontmatter.

import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
// Namespace import, not default: js-yaml 5 drops the default export, and this
// form resolves under both 4 and 5.
import * as yaml from 'js-yaml';

const root = 'src/content/blog';
const files = (await readdir(root, { recursive: true })).filter((entry) => entry.endsWith('.md')).sort();
const findings = [];
for (const relative of files) {
  const text = await readFile(join(root, relative), 'utf8');
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) { findings.push(`${relative}: missing YAML frontmatter`); continue; }
  try {
    const data = yaml.load(match[1], { json: false });
    if (!data || typeof data !== 'object' || Array.isArray(data)) findings.push(`${relative}: frontmatter must be a YAML mapping`);
  } catch (error) {
    findings.push(`${relative}: ${error.message.split('\n')[0]}`);
  }
}
await mkdir('reports/content-portability', { recursive: true });
await writeFile('reports/content-portability/frontmatter.md', ['# Frontmatter portability audit', '', `- Markdown documents scanned: ${files.length}`, `- Findings: ${findings.length}`, ...findings.map((finding) => `- ${finding}`), '', 'This independently parses the source YAML; it does not modify frontmatter.'].join('\n'));
console.log(`Frontmatter portability: ${files.length} documents scanned; ${findings.length} finding(s).`);
if (findings.length) process.exitCode = 1;
