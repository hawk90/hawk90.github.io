#!/usr/bin/env node
// Validates that the portable export is complete, open, and source-integrity preserving.

import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const directory = 'reports/content-export';
const findings = [];
const manifest = await readFile(join(directory, 'manifest.json'), 'utf8').then(JSON.parse).catch((error) => { findings.push(`manifest: ${error.code ?? error.message}`); return null; });
const lines = await readFile(join(directory, 'content.jsonl'), 'utf8').then((text) => text.trim().split('\n').filter(Boolean)).catch((error) => { findings.push(`content.jsonl: ${error.code ?? error.message}`); return []; });
if (manifest) {
  if (manifest.format !== 'UTF-8 JSON Lines') findings.push('manifest: expected open JSONL format');
  if (manifest.exportedDocumentCount !== 3387) findings.push(`manifest: expected 3387 documents, got ${manifest.exportedDocumentCount}`);
  if (lines.length !== manifest.exportedDocumentCount) findings.push(`content.jsonl: expected ${manifest.exportedDocumentCount} records, got ${lines.length}`);
}
for (const line of lines) {
  try {
    const record = JSON.parse(line);
    if (!record.id || !record.sourcePath || !record.url || !record.frontmatter || typeof record.body !== 'string' || !/^[a-f0-9]{64}$/.test(record.sha256 ?? '')) findings.push(`record: incomplete fields for ${record?.sourcePath ?? 'unknown'}`);
    else {
      const source = await readFile(join('src/content/blog', record.sourcePath), 'utf8');
      if (createHash('sha256').update(source).digest('hex') !== record.sha256) findings.push(`record: source hash mismatch for ${record.sourcePath}`);
    }
  } catch (error) { findings.push(`record: invalid JSON (${error.message})`); }
}
await mkdir('reports/content-export', { recursive: true });
await writeFile(join(directory, 'audit.md'), ['# Portable content export audit', '', `- Records checked: ${lines.length}`, `- Findings: ${findings.length}`, ...findings.map((finding) => `- ${finding}`), ''].join('\n'));
console.log(`Portable export audit: ${lines.length} record(s); ${findings.length} finding(s).`);
if (findings.length) process.exitCode = 1;
