#!/usr/bin/env node

/** Report Unicode text inside Markdown math delimiters without rewriting content. */
import { readdir, readFile, mkdir, writeFile } from 'node:fs/promises';
import { join, relative, dirname } from 'node:path';

const root = 'src/content/blog';
const output = 'reports/quality/math-unicode.md';
const files = [];
async function walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) await walk(path);
    else if (entry.name.endsWith('.md')) files.push(path);
  }
}
await walk(root);

const findings = [];
const math = /\$\$([\s\S]*?)\$\$|\\\[([\s\S]*?)\\\]|\\\(([\s\S]*?)\\\)/g;
const unicode = /[\u0080-\uFFFF]/;
for (const file of files) {
  const source = await readFile(file, 'utf8');
  const withoutFences = source.replace(/^```[\s\S]*?^```\s*$/gm, '');
  for (const match of withoutFences.matchAll(math)) {
    const body = match.slice(1).find(Boolean) || '';
    // Avoid prices, table delimiters, and prose wrapped in incidental `$`.
    if (!unicode.test(body)) continue;
    const line = withoutFences.slice(0, match.index).split('\n').length;
    findings.push({ file: relative('.', file), line, sample: body.replace(/\s+/g, ' ').slice(0, 160) });
  }
}

const lines = [
  '# Math Unicode audit', '',
  `- Markdown files scanned: ${files.length}`,
  `- Math blocks containing non-ASCII Unicode: ${findings.length}`,
  '',
  '> This report is diagnostic only. Do not remove Korean labels, arrows, or symbols from equations without semantic review.', '',
  '| File | Line | Sample |', '| --- | ---: | --- |',
  ...findings.map(({ file, line, sample }) => `| ${file.replaceAll('|', '\\|')} | ${line} | ${sample.replaceAll('|', '\\|')} |`), '',
];
await mkdir(dirname(output), { recursive: true });
await writeFile(output, `${lines.join('\n')}\n`, 'utf8');
console.log(`Math Unicode audit: ${findings.length} finding(s) across ${files.length} Markdown files.`);
