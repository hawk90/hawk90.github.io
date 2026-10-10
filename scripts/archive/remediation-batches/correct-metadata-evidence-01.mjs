#!/usr/bin/env node
// Corrects two metadata records that rested on inaccurate observations.
// Preview by default; --apply is required.
//
// AP-M-66 was recorded claiming --prune is opt-in and separate from the default
// og build. It is not: the prebuild script runs build-og.mjs --prune, so every
// npm run build prunes. The conclusion still holds, but for a different reason,
// so the evidence is restated rather than the disposition changed.
//
// AP-M-58 carried a review question asserting that rollback steps exist only
// inside per-phase packets. A standing repository recovery runbook exists in the
// archive, so the premise is corrected. The item stays unassessed.

import { readFile, writeFile } from 'node:fs/promises';

const apply = process.argv.includes('--apply');
const archive = 'archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273';
const path = `${archive}/remediation-plan/category-registries/metadata.json`;
const registry = JSON.parse(await readFile(path, 'utf8'));

const corrections = [
  {
    id: 'AP-M-66',
    expectDisposition: 'remediated',
    apply(item) {
      item.nextAction = 'verify';
      item.reviewQuestion = 'Pruning runs on every build through prebuild, so the safety argument rests on the pruned artifacts being disposable. Does public/og/ remain gitignored and fully regenerable, and does anything irreplaceable ever land under it?';
      item.evidence = [{
        files: ['.gitignore', 'package.json', 'scripts/build-og.mjs', 'scripts/audit-diagram-assets.mjs', 'reports/diagrams/assets.md'],
        verification: 'npm run audit:diagrams && npm run verify:release',
        result: 'Pruning is not opt-in: prebuild runs build-og.mjs --prune, so every npm run build prunes. It is nonetheless bounded, because public/og/ is gitignored with 0 tracked files and every PNG under it is regenerable from frontmatter, deletion is keyed to the ids present in the current content set, and the diagram audit reports sibling-less SVGs rather than deleting them.',
      }];
      item.residualRisk = 'A future artifact placed under public/og/ that is not regenerable would be deleted by any build; keep that directory limited to generated OG images.';
    },
  },
  {
    id: 'AP-M-58',
    expectDisposition: 'unassessed',
    apply(item) {
      item.nextAction = 'implementation';
      item.reviewQuestion = 'A standing recovery runbook exists at archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/remediation-plan/repository-recovery-runbook.md, covering recovery priority, required external evidence, and pass conditions, so the earlier claim that rollback lives only in per-phase packets was wrong. It sits inside the archive rather than a maintained operations surface, and it states that recovery has not been tested. Should it be promoted out of the archive, and which of its external controls gets exercised first?';
    },
  },
];

const targets = corrections.map((correction) => {
  const item = registry.items.find(({ id }) => id === correction.id);
  if (!item) throw new Error(`${correction.id} not found`);
  if (item.disposition !== correction.expectDisposition) throw new Error(`${correction.id} is ${item.disposition}, expected ${correction.expectDisposition}`);
  return { correction, item };
});

console.log(`Metadata evidence correction: ${targets.length} item(s); ${apply ? 'applying.' : 'preview only; pass --apply to record.'}`);
for (const { correction, item } of targets) console.log(`  ${correction.id} (${item.disposition}) — ${item.title}`);
if (!apply) process.exit(0);

for (const { correction, item } of targets) correction.apply(item);
await writeFile(path, `${JSON.stringify(registry, null, 2)}\n`);
console.log(`Corrected ${targets.length} metadata record(s); dispositions unchanged.`);
