#!/usr/bin/env node
// Records a completed external recovery exercise without storing credentials. Preview by default.

import { readFile, writeFile } from 'node:fs/promises';

const option = (name) => {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : process.argv[index + 1];
};
const apply = process.argv.includes('--apply');
const control = option('--control');
const reference = option('--evidence-reference');
if (!control || !reference || reference.startsWith('--')) throw new Error('Usage: node scripts/record-repository-external-evidence.mjs --control <name> --evidence-reference <non-secret record> [--apply]');
if (/\r|\n|(?:gh[pousr]_|github_pat_|AIza|-----BEGIN)/i.test(reference)) throw new Error('Evidence reference must not contain a secret or multiline value.');
const archive = 'archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273';
const registryPath = `${archive}/remediation-plan/category-registries/repository.json`;
const registry = JSON.parse(await readFile(registryPath, 'utf8'));
const controls = {
  'independent-backup-and-restore-test': {
    ids: ['AP-R-01', 'AP-R-02', 'AP-R-03', 'AP-R-04', 'AP-R-05', 'AP-R-07', 'AP-R-08', 'AP-R-09', 'AP-R-10', 'AP-R-12', 'AP-R-13', 'AP-R-14', 'AP-R-16'],
    result: 'An independent backup and restore exercise is recorded; it must remain reproducible from the referenced non-secret record.',
  },
  'domain-dns-recovery': {
    ids: ['AP-R-17', 'AP-R-18', 'AP-R-19', 'AP-R-20', 'AP-R-95', 'AP-R-96'],
    result: 'A domain/DNS recovery exercise is recorded, including canonical URL preservation and emergency-host noindex verification.',
  },
  'account-recovery': {
    ids: ['AP-R-06', 'AP-R-98', 'AP-R-99'],
    result: 'A non-secret account recovery exercise is recorded for the required external systems.',
  },
  'emergency-static-host': {
    ids: ['AP-R-20'],
    result: 'An emergency static-host deployment exercise is recorded using a known-good artifact and noindex boundary.',
  },
};
const mapping = controls[control];
if (!mapping) throw new Error(`Unknown control: ${control}. Expected one of ${Object.keys(controls).join(', ')}`);
const targets = mapping.ids.map((id) => registry.items.find((item) => item.id === id)).filter((item) => item?.disposition === 'unassessed');
console.log(`External evidence: ${control}; ${targets.length} eligible item(s).${apply ? ' Applying.' : ' Preview only; pass --apply to record.'}`);
console.log(`- Evidence reference: ${reference}`);
console.log(`- Items: ${targets.map((item) => item.id).join(', ') || 'none (already recorded)'}`);
if (!apply) process.exit(0);
for (const item of targets) {
  item.disposition = 'remediated'; item.nextAction = 'manual-review';
  item.reviewQuestion = `Does the recorded ${control} exercise remain current and cover this item without exposing a secret?`;
  item.scope = 'External recovery exercise attested by a non-secret evidence reference; repository files alone were not used to infer this result.';
  item.evidence = [{ files: [`${archive}/remediation-plan/repository-recovery-runbook.md`], verification: 'npm run audit:repository-external-evidence', result: `${mapping.result} Evidence reference: ${reference}` }];
  item.residualRisk = 'External providers, owners, and recovery procedures can change; repeat the exercise on the recorded reassessment schedule.';
}
await writeFile(registryPath, `${JSON.stringify(registry, null, 2)}\n`);
console.log(`Recorded ${targets.length} AP-R external-evidence disposition(s).`);
