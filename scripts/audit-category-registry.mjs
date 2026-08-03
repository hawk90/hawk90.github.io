#!/usr/bin/env node
// Validates atomic source coverage for a generated category registry.

import { access, mkdir, readFile, writeFile } from 'node:fs/promises';

const categoryAt = process.argv.indexOf('--category');
const category = categoryAt === -1 ? null : process.argv[categoryAt + 1];
if (!category || category.startsWith('--')) throw new Error('Usage: node scripts/audit-category-registry.mjs --category <triage category>');
const evidenceMode = process.argv.includes('--evidence');
const archive = 'archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273';
const [registry, triage, packageJson] = await Promise.all([
  readFile(`${archive}/remediation-plan/category-registries/${category}.json`, 'utf8').then(JSON.parse),
  readFile(`${archive}/remediation-plan/antipattern-triage.json`, 'utf8').then(JSON.parse),
  readFile('package.json', 'utf8').then(JSON.parse),
]);
const expected = new Set(triage.items.filter((item) => item.category === category).map((item) => item.id));
const seen = new Set(); const findings = [];
for (const item of registry.items) {
  if (seen.has(item.id)) findings.push(`duplicate: ${item.id}`); seen.add(item.id);
  if (!expected.has(item.id)) findings.push(`unknown: ${item.id}`);
  if (!registry.dispositionScale.includes(item.disposition)) findings.push(`invalid disposition: ${item.id}`);
  if (!item.source?.file || !item.source?.messageIds?.length) findings.push(`missing source: ${item.id}`);
  if (!item.nextAction || !item.reviewQuestion) findings.push(`missing action: ${item.id}`);
  if (evidenceMode && item.disposition !== 'unassessed') {
    for (const evidence of item.evidence ?? []) {
      for (const file of evidence.files ?? []) {
        try { await access(file); } catch { findings.push(`missing evidence file: ${item.id}: ${file}`); }
      }
      for (const command of (evidence.verification ?? '').matchAll(/npm run ([a-zA-Z0-9:_-]+)/g)) {
        if (!packageJson.scripts?.[command[1]]) findings.push(`missing evidence command: ${item.id}: npm run ${command[1]}`);
      }
    }
  }
}
for (const id of expected) if (!seen.has(id)) findings.push(`missing: ${id}`);
const counts = Object.fromEntries(registry.dispositionScale.map((status) => [status, registry.items.filter((item) => item.disposition === status).length]));
await mkdir(`reports/${category}`, { recursive: true });
await writeFile(`reports/${category}/registry.md`, [`# ${category} registry`, '', `- Atomic items: ${registry.items.length}`, ...Object.entries(counts).map(([status, count]) => `- ${status}: ${count}`), `- Findings: ${findings.length}`, ...findings.map((finding) => `- ${finding}`), ''].join('\n'));
console.log(`Category registry: ${category}; ${registry.items.length} items; ${findings.length} finding(s)${evidenceMode ? ' (evidence mode)' : ''}.`);
if (findings.length) process.exitCode = 1;
