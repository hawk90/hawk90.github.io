#!/usr/bin/env node
// Combines deterministic inventories into a bounded queue for editorial review.

import { mkdir, readFile, writeFile } from 'node:fs/promises';

const lifecycle = JSON.parse(await readFile('reports/content-lifecycle/latest.json', 'utf8'));
const classification = JSON.parse(await readFile('reports/content-classification/latest.json', 'utf8'));
const relationsSource = await readFile('src/lib/content/relations.ts', 'utf8');
const relationCount = (relationsSource.match(/^ {4}sourceId:/gm) ?? []).length;
const queue = {
  generatedAt: new Date().toISOString(),
  lifecycle: lifecycle.reviewQueue.slice(0, 25),
  taxonomy: classification.taxonomyGaps.slice(0, 50),
  relations: { explicitCount: relationCount, action: 'Propose relationships only after reading both documents; never infer prerequisites from filenames or dates.' },
};

await mkdir('reports/content-governance', { recursive: true });
await writeFile('reports/content-governance/latest.json', `${JSON.stringify(queue, null, 2)}\n`);
await writeFile('reports/content-governance/latest.md', [
  '# Content governance queue', '',
  '> Candidate queue only. A reviewer must verify facts and reader intent before any metadata change.', '',
  '## Lifecycle review (top 25)', '',
  ...queue.lifecycle.map(({ id, title, score }) => `- [${score}] \`${id}\` — ${title}`), '',
  '## Taxonomy candidates (top 50)', '',
  ...queue.taxonomy.map(({ path, documents, recommendation, dominantSeries, dominantSeriesShare, rationale }) => {
    const evidence = dominantSeries ? `; dominant series: ${dominantSeries} (${(dominantSeriesShare * 100).toFixed(1)}%)` : '';
    return `- \`${path}\` — ${documents} documents; **${recommendation}**${evidence}. ${rationale}`;
  }), '',
  '## Relationships', '',
  `- Explicit curated relations: ${relationCount}`,
  `- ${queue.relations.action}`,
].join('\n'));
console.log(`Governance queue: ${queue.lifecycle.length} lifecycle, ${queue.taxonomy.length} taxonomy candidates, ${relationCount} explicit relations.`);
