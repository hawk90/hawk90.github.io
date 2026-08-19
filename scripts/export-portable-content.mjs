#!/usr/bin/env node
// Exports the full Markdown corpus as an open JSONL package. Preview by default.

import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
// Namespace import, not default: js-yaml 5 drops the default export, and this
// form resolves under both 4 and 5.
import * as yaml from 'js-yaml';

const apply = process.argv.includes('--apply');
const at = process.argv.indexOf('--output');
const output = at === -1 ? 'reports/content-export' : process.argv[at + 1];
if (!output || output.startsWith('--')) throw new Error('Usage: node scripts/export-portable-content.mjs [--output <directory>] [--apply]');
const root = 'src/content/blog';
const files = (await readdir(root, { recursive: true })).filter((entry) => entry.endsWith('.md')).sort();
const records = [];
for (const path of files) {
  const source = await readFile(join(root, path), 'utf8');
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) throw new Error(`${path}: missing YAML frontmatter`);
  const frontmatter = yaml.load(match[1], { json: false });
  records.push({
    schemaVersion: 1,
    id: path.replace(/\.md$/, ''),
    sourcePath: path,
    // `slug:` wins over the path. Astro's loader substitutes it for the entry
    // id, so a frozen slug is the URL and the folder is only where the file
    // happens to sit.
    url: `/blog/${(typeof frontmatter?.slug === 'string' && frontmatter.slug.trim()) || path.replace(/\.md$/, '')}`,
    frontmatter,
    body: match[2],
    sha256: createHash('sha256').update(source).digest('hex'),
  });
}
const manifest = {
  schemaVersion: 1,
  format: 'UTF-8 JSON Lines',
  sourceRoot: root,
  exportedDocumentCount: records.length,
  totalSourceBytes: records.reduce((total, record) => total + Buffer.byteLength(record.body, 'utf8'), 0),
  recordFields: ['id', 'sourcePath', 'url', 'frontmatter', 'body', 'sha256'],
  preservation: 'The export is additive. It does not delete, rewrite, move, or alter source content or frontmatter.',
  records: records.map(({ id, sourcePath, url, sha256 }) => ({ id, sourcePath, url, sha256 })),
};
console.log(`Portable content export: ${records.length} documents.${apply ? ` Writing ${output}.` : ' Preview only; pass --apply to write.'}`);
if (!apply) process.exit(0);
await mkdir(output, { recursive: true });
await writeFile(join(output, 'content.jsonl'), `${records.map((record) => JSON.stringify(record)).join('\n')}\n`);
await writeFile(join(output, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
await writeFile(join(output, 'README.md'), ['# Portable content export', '', `- Documents: ${records.length}`, '- Format: UTF-8 JSON Lines (`content.jsonl`)', '- Integrity: each record and manifest entry contains SHA-256 for its original Markdown source.', '- Relationships: frontmatter retains topics, tags, series, and other source metadata.', '- URL contract: `url` is derived from the stable content ID.', '- Source policy: additive export only; it does not modify source content or frontmatter.', ''].join('\n'));
console.log(`Portable content export written: ${output}`);
