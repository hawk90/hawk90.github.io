#!/usr/bin/env node
// Records bounded, preservation-first decisions for the non-external AP-R lane.
// Preview by default; --apply is required. External recovery controls stay unassessed.

import { readFile, writeFile } from 'node:fs/promises';

const apply = process.argv.includes('--apply');
const archive = 'archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273';
const path = `${archive}/remediation-plan/category-registries/repository.json`;
const registry = JSON.parse(await readFile(path, 'utf8'));
const lanes = {
  content_and_media_preservation: ['AP-R-21','AP-R-31','AP-R-33','AP-R-34','AP-R-35','AP-R-41','AP-R-42','AP-R-43','AP-R-44','AP-R-45','AP-R-46','AP-R-47','AP-R-48','AP-R-49','AP-R-50','AP-R-58','AP-R-59','AP-R-60','AP-R-62','AP-R-63','AP-R-64','AP-R-65','AP-R-66','AP-R-67','AP-R-68','AP-R-69','AP-R-70','AP-R-82','AP-R-87','AP-R-88'],
  platform_and_redirect_design: ['AP-R-54','AP-R-55','AP-R-56','AP-R-76','AP-R-77','AP-R-78','AP-R-79','AP-R-83'],
};
const laneFor = new Map(Object.entries(lanes).flatMap(([lane, ids]) => ids.map((id) => [id, lane])));
const items = registry.items.filter((item) => laneFor.has(item.id) && item.disposition === 'unassessed');
const files = [
  `${archive}/remediation-plan/repository-recovery-runbook.md`,
  'reports/content-export/README.md',
  'reports/content-export/manifest.json',
  'scripts/audit-content-portability.mjs',
  'scripts/audit-content-asset-portability.mjs',
  'scripts/audit-repository-health.mjs',
  'src/content/blog',
];
console.log(`Repository open controls: ${items.length} eligible; ${apply ? 'applying.' : 'preview only; pass --apply to record.'}`);
if (!items.length) process.exit(0);
if (!apply) process.exit(0);
for (const item of items) {
  const lane = laneFor.get(item.id);
  item.disposition = 'accepted';
  item.nextAction = 'manual-review';
  item.reviewQuestion = `Reassess ${item.title.replace(/^R-\\d+\\. /, '').toLowerCase()} when repository, asset, URL, or rendering workflows change.`;
  item.scope = 'Repository preservation and portability policy only; no published content, URLs, frontmatter, external backup, DNS, account, or host state is changed by this decision.';
  item.evidence = [{
    files,
    verification: 'npm run audit:repository-controls && npm run gate:repository && npm run audit:content-portability',
    result: lane === 'content_and_media_preservation'
      ? 'The source corpus remains additive and readable, portable export and recovery boundaries are documented, and no automatic rewrite or deletion is authorized.'
      : 'Stable source identifiers, bounded rendering assumptions, and recovery/redirect policy are documented; no provider-specific migration is inferred.',
  }];
  item.residualRisk = 'This is an explicit acceptance of a design or evidence gap, not proof that every historical asset, redirect, external provider, or alternate renderer has been exercised; perform targeted manual review after relevant changes.';
}
await writeFile(path, `${JSON.stringify(registry, null, 2)}\n`);
console.log(`Recorded ${items.length} bounded AP-R decisions; external recovery controls remain unassessed.`);
