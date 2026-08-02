#!/usr/bin/env node
// Produces bounded AP-D review batches while preserving every atomic source ID.

import { mkdir, readFile, writeFile } from 'node:fs/promises';

const registryPath = 'archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/remediation-plan/methodology-registry.json';
const registry = JSON.parse(await readFile(registryPath, 'utf8'));
const numberOf = (id) => Number(id.match(/^AP-D-(\d+)/)?.[1] ?? 0);
const methodologyBatches = [
  ['MD-01', 'Definition and diagnosis discipline', 1, 34],
  ['MD-02', 'Prioritization and decision discipline', 35, 50],
  ['MD-03', 'Small safe change and automation discipline', 51, 70],
  ['MD-04', 'Validation, lifecycle, and governance discipline', 71, 94],
  ['MD-05', 'Completion traps and reassessment discipline', 95, 100],
].map(([id, title, first, last]) => ({
  id,
  title,
  items: registry.items.filter((item) => !item.id.endsWith('-2') && numberOf(item.id) >= first && numberOf(item.id) <= last),
}));
const routed = registry.items.filter((item) => item.id.endsWith('-2'));
const batches = [...methodologyBatches, {
  id: 'MD-R-01',
  title: 'Cross-category search and discovery proposals',
  items: routed,
  executionLane: 'search_seo',
  note: 'These AP-D source items define search/discovery work. They must be dispositioned in AP-D, but their implementation is planned under AP-S after its dependencies open.',
}].map((batch) => ({
  ...batch,
  activeItems: batch.items.filter(({ disposition }) => disposition === 'unassessed').map(({ id, title, priority, source }) => ({ id, title, priority, source })),
  completionRule: 'For every item: record a concrete repository finding, choose remediated/accepted/superseded, and attach files plus verification evidence. Do not infer completion from a similarly named script.',
}));
const report = { generatedAt: new Date().toISOString(), batches: batches.map(({ items, ...batch }) => ({ ...batch, itemCount: items.length })) };
await mkdir('reports/methodology', { recursive: true });
await Promise.all([
  writeFile('reports/methodology/batches.json', `${JSON.stringify(report, null, 2)}\n`),
  writeFile('reports/methodology/batches.md', [
    '# AP-D execution batches', '',
    '> Batches are review boundaries, not approval. All items retain their AP IDs and must receive evidence-backed dispositions.', '',
    ...report.batches.flatMap(({ id, title, itemCount, activeItems, executionLane, note, completionRule }) => [
      `## ${id} — ${title}`, '',
      `- Atomic items: ${itemCount}`,
      `- Unassessed: ${activeItems.length}`,
      `- Execution lane: ${executionLane ?? 'methodology'}`,
      ...(note ? [`- Note: ${note}`] : []),
      `- Exit rule: ${completionRule}`,
      ...activeItems.map(({ id: itemId, title: itemTitle, source }) => `  - \`${itemId}\` — ${itemTitle} (${source.file})`), '',
    ]),
  ].join('\n')),
]);
console.log(`Methodology batches: ${batches.length}; ${registry.items.length} AP-D items; ${registry.items.filter(({ disposition }) => disposition === 'unassessed').length} unassessed.`);
console.log('Report: reports/methodology/batches.md');
