#!/usr/bin/env node
// Generates a deterministic, non-destructive inventory for source recovery checks.

import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = 'src/content/blog';
const files = (await readdir(root, { recursive: true })).filter((entry) => entry.endsWith('.md')).sort();
const entries = [];
for (const relative of files) {
  const content = await readFile(join(root, relative));
  entries.push({ path: relative, bytes: content.byteLength, sha256: createHash('sha256').update(content).digest('hex') });
}
const totalBytes = entries.reduce((total, entry) => total + entry.bytes, 0);
const inventory = { schemaVersion: 1, root, documentCount: entries.length, totalBytes, entries };
await mkdir('reports/repository', { recursive: true });
await writeFile('reports/repository/source-inventory.json', `${JSON.stringify(inventory, null, 2)}\n`);
await writeFile('reports/repository/source-inventory.md', ['# Source recovery inventory', '', `- Markdown documents: ${entries.length}`, `- Total source bytes: ${totalBytes}`, '- Per-document SHA-256 values: `source-inventory.json`', '', 'This is an inventory for a backup/restore exercise, not proof that an independent backup exists.'].join('\n'));
console.log(`Source inventory: ${entries.length} Markdown documents; ${totalBytes} bytes.`);
