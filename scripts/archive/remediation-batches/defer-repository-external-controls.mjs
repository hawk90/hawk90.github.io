#!/usr/bin/env node
// Records a user-approved deferral of external AP-R recovery controls. Preview by default.

import { readFile, writeFile } from 'node:fs/promises';

const apply = process.argv.includes('--apply');
const archive = 'archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273';
const registryPath = `${archive}/remediation-plan/category-registries/repository.json`;
const decisionPath = `${archive}/remediation-plan/repository-external-risk-acceptance.json`;
const registry = JSON.parse(await readFile(registryPath, 'utf8'));
const controls = {
  'independent-backup-and-restore-test': ['AP-R-01', 'AP-R-02', 'AP-R-03', 'AP-R-07', 'AP-R-08', 'AP-R-09', 'AP-R-10', 'AP-R-12', 'AP-R-13', 'AP-R-14'],
  'domain-dns-recovery': ['AP-R-17', 'AP-R-18', 'AP-R-19', 'AP-R-20', 'AP-R-95', 'AP-R-96'],
  'account-recovery': ['AP-R-06', 'AP-R-98', 'AP-R-99'],
};
const targets = Object.entries(controls).flatMap(([control, ids]) => ids.map((id) => ({ control, item: registry.items.find((item) => item.id === id) }))).filter(({ item }) => item?.disposition === 'unassessed');
console.log(`External-risk deferral: ${targets.length} eligible AP-R item(s).${apply ? ' Applying user-approved deferral.' : ' Preview only; pass --apply to record.'}`);
for (const { control, item } of targets) console.log(`- ${item.id} -> ${control}`);
if (!apply) process.exit(0);
const decision = {
  schemaVersion: 1,
  decision: 'accepted-risk-deferral',
  authority: 'User approved deferral because backup and DNS recovery cannot be performed now.',
  scope: 'External backup/restore, DNS/domain, and account recovery controls only.',
  closureImpact: 'This is not evidence of recovery completion and does not complete AP-R.',
  reassessmentTrigger: 'Before a material deployment-platform change, ownership change, or the next planned recovery exercise.',
  controls,
};
for (const { control, item } of targets) {
  item.disposition = 'accepted'; item.nextAction = 'external-review';
  item.reviewQuestion = `Has ${control} been exercised with non-secret evidence, or must this accepted risk be renewed explicitly?`;
  item.scope = 'User-approved temporary deferral of an external recovery control; no recovery outcome is inferred from repository files.';
  item.evidence = [{ files: [decisionPath, 'docs/runbooks/repository-recovery.md'], verification: 'npm run audit:repository-external-evidence', result: `Accepted risk deferral for ${control}; actual exercise remains pending.` }];
  item.residualRisk = 'The external recovery path remains untested and may fail when needed; reassess on the recorded trigger.';
}
await Promise.all([
  writeFile(registryPath, `${JSON.stringify(registry, null, 2)}\n`),
  writeFile(decisionPath, `${JSON.stringify(decision, null, 2)}\n`),
]);
console.log(`Recorded ${targets.length} accepted AP-R external-risk deferrals.`);
