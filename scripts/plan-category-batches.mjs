#!/usr/bin/env node
// Produces deterministic, source-traceable review batches for any AP category.

import { mkdir, readFile, writeFile } from 'node:fs/promises';

const at = process.argv.indexOf('--category');
const category = at === -1 ? null : process.argv[at + 1];
if (!category || category.startsWith('--')) throw new Error('Usage: node scripts/plan-category-batches.mjs --category <category>');
const sizeAt = process.argv.indexOf('--batch-size');
const batchSize = sizeAt === -1 ? 15 : Number(process.argv[sizeAt + 1]);
if (!Number.isInteger(batchSize) || batchSize < 1) throw new Error('--batch-size must be a positive integer');
const archive = 'archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273';
const [registry, graph] = await Promise.all([
  readFile(`${archive}/remediation-plan/category-registries/${category}.json`, 'utf8').then(JSON.parse),
  readFile(`${archive}/remediation-plan/category-execution-graph.json`, 'utf8').then(JSON.parse),
]);
const state = graph.categories.find((entry) => entry.id === category);
if (!state) throw new Error(`Unknown graph category: ${category}`);
const exceptions = graph.activationExceptions ?? [];
const groups = new Map();
const numericId = (id) => Number(id.match(/-(\d+)(?:-\d+)?$/)?.[1] ?? Number.MAX_SAFE_INTEGER);
for (const item of registry.items.filter((item) => item.disposition === 'unassessed')) {
  const source = item.source.file.replace(/#.+$/, '');
  const group = groups.get(source) ?? []; group.push(item); groups.set(source, group);
}
const batches = [];
for (const [source, items] of [...groups.entries()].sort(([left], [right]) => left.localeCompare(right, undefined, { numeric: true }))) {
  const ordered = items.sort((left, right) => numericId(left.id) - numericId(right.id) || left.id.localeCompare(right.id));
  for (let offset = 0; offset < ordered.length; offset += batchSize) {
    batches.push({ id: `${category}-${String(batches.length + 1).padStart(2, '0')}`, source, items: ordered.slice(offset, offset + batchSize) });
  }
}
const blockedBy = state.dependsOn.filter((dependency) => graph.categories.find((entry) => entry.id === dependency)?.status !== 'completed'
  && !exceptions.some((exception) => exception.dependency === dependency && exception.allowedDependent === category && exception.closureImpact === 'none'));
const report = [
  `# ${category} review batches`, '',
  `- Category state: ${state.status}`,
  `- Dependencies not complete: ${blockedBy.length ? blockedBy.join(', ') : 'none'}`,
  `- Unassessed items: ${registry.items.filter((item) => item.disposition === 'unassessed').length}`,
  `- Maximum batch size: ${batchSize}`,
  `- Batches: ${batches.length}`, '',
  ...batches.flatMap((batch) => [`## ${batch.id} — ${batch.source}`, '', ...batch.items.map((item) => `- ${item.id} (${item.priority}, ${item.effort}) — ${item.title}`), '']),
];
await mkdir(`reports/${category}`, { recursive: true });
await writeFile(`reports/${category}/batches.md`, `${report.join('\n').trim()}\n`);
await writeFile(`reports/${category}/batches.json`, `${JSON.stringify({ category, state: state.status, blockedBy, batchSize, batches }, null, 2)}\n`);
console.log(`Category batches: ${category}; ${batches.length} batches; ${registry.items.filter((item) => item.disposition === 'unassessed').length} unassessed item(s).`);
