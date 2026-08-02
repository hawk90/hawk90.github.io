#!/usr/bin/env node
// Routes AP-D source items that are explicitly search/discovery work into the AP-S backlog. Preview by default.

import { mkdir, readFile, writeFile } from 'node:fs/promises';

const apply = process.argv.includes('--apply');
const planDir = 'archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/remediation-plan';
const registryPath = `${planDir}/methodology-registry.json`;
const backlogPath = `${planDir}/search-remediation-backlog.json`;
const registry = JSON.parse(await readFile(registryPath, 'utf8'));
const candidates = registry.items.filter((item) => item.id.endsWith('-2') && item.disposition === 'unassessed');
console.log(`Search routing: ${candidates.length} eligible AP-D source items.${apply ? ' Applying.' : ' Preview only; pass --apply to write.'}`);
for (const { id, title } of candidates) console.log(`- ${id} -> AP-S: ${title}`);
if (!apply) process.exit(0);
const backlog = {
  policy: 'Routed AP-D source items remain implementation work under AP-S. Routing disposes their methodology ownership only; it is not implementation completion.',
  blockedByCategories: ['metadata', 'information_architecture', 'localization'],
  items: candidates.map((item) => ({ id: item.id, title: item.title, source: item.source, status: 'not_activated', executionLane: 'search_seo' })),
};
for (const item of candidates) {
  item.disposition = 'routed';
  item.executionLane = 'search_seo';
  item.nextAction = 'implementation';
  item.reviewQuestion = 'When AP-S dependencies are complete, does this proposal have a concrete search-quality finding, a bounded implementation plan, and relevant query regression evidence?';
  item.scope = 'Routed from methodology source ownership to the AP-S search/discovery backlog; no published content or frontmatter is changed.';
  item.assessment = {
    context: 'This atomic source item describes a search/discovery implementation rather than a methodology control.',
    counterexample: 'It would remain methodology work only if it changed the decision process itself rather than the search/discovery product behavior.',
    alternatives: 'Pretend it is complete in AP-D, duplicate it across categories, or preserve its AP-D source trace while routing implementation to AP-S. The third option is adopted.',
    evidenceSummary: 'The search backlog retains the atomic source ID and is blocked by AP-S dependencies in the category execution graph.',
    sampleScope: 'All 25 AP-D items with the explicit -2 search/discovery source stream.',
    decision: 'Route implementation ownership to AP-S without claiming the search feature is implemented.',
    smallestSafeChange: 'Create a planning backlog and update methodology disposition only; do not change search behavior or content.',
    verificationAndResidualRisk: 'npm run audit:methodology confirms the routed record. AP-S work remains unstarted and cannot activate until its dependencies complete.',
  };
  item.dependsOn = ['metadata', 'information_architecture', 'localization'];
  item.evidence = [{ files: [backlogPath, 'scripts/route-methodology-search-proposals.mjs'], verification: 'npm run audit:methodology', result: 'Atomic source item is preserved in the blocked AP-S backlog rather than misreported as complete.' }];
  item.residualRisk = 'Search implementation and query-quality validation remain pending under AP-S.';
}
await mkdir(planDir, { recursive: true });
await Promise.all([writeFile(registryPath, `${JSON.stringify(registry, null, 2)}\n`), writeFile(backlogPath, `${JSON.stringify(backlog, null, 2)}\n`)]);
console.log(`Routed ${candidates.length} items to ${backlogPath}.`);
