#!/usr/bin/env node
/**
 * Converts the independent-backup-and-restore deferral into an acceptance.
 *
 * The existing record says the control was deferred "because backup and DNS
 * recovery cannot be performed now" — a timing statement, which is why it
 * carries a reassessment trigger and explicitly does not let AP-R close.
 *
 * The owner's position is different: the objects do not need a third home,
 * because the full history already exists in two places that fail
 * independently — the working clone on the local machine and the GitHub
 * remote. A commit hash is enough to restore from either. That is a judgement
 * about exposure, not a postponement, and it is recorded as one.
 *
 * What it does NOT cover, stated so it is not lost: both copies depend on one
 * person's machine and one account. Losing the account removes the remote and
 * the published site at once, which is why account-recovery stays open — it is
 * now the single control the rest of this reasoning leans on.
 *
 * Preview by default; --apply is required.
 */
import { readFile, writeFile } from 'node:fs/promises';

const apply = process.argv.includes('--apply');
const archive = 'archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273';
const registryPath = `${archive}/remediation-plan/category-registries/repository.json`;
const decisionPath = `${archive}/remediation-plan/repository-backup-risk-acceptance.json`;
const registry = JSON.parse(await readFile(registryPath, 'utf8'));

const CONTROL = 'independent-backup-and-restore-test';
const IDS = ['AP-R-01', 'AP-R-02', 'AP-R-03', 'AP-R-07', 'AP-R-08', 'AP-R-09', 'AP-R-10', 'AP-R-12', 'AP-R-13', 'AP-R-14'];

const decision = {
  schemaVersion: 1,
  decision: 'accepted-risk',
  supersedes: 'accepted-risk-deferral for independent-backup-and-restore-test',
  authority: 'Owner decided a third copy is unnecessary: the full history is already in two independently-failing places, the local working clone and the GitHub remote, and either restores from a known commit.',
  rationale: [
    'Every source file, diagram, script, and config is tracked — 7852 files, including public/images.',
    'dist/ and public/og/ are gitignored but regenerate from source via npm run build and npm run og.',
    'There is no custom domain, so no DNS state exists outside the repository.',
  ],
  notCovered: 'Both copies depend on one machine and one account. Simultaneous loss — an account taken away while the local disk is gone — destroys everything, and no commit hash helps without objects. account-recovery is deliberately left open because this acceptance leans on it.',
  reassessmentTrigger: 'If the local working clone stops being kept, if the repository gains state that is not in git, or before an ownership change.',
  controls: { [CONTROL]: IDS },
};

const targets = IDS.map((id) => registry.items.find((item) => item.id === id)).filter(Boolean);
const eligible = targets.filter((item) => item.disposition === 'accepted');
console.log(`Backup risk acceptance: ${eligible.length} of ${IDS.length} AP-R item(s) currently deferred.`);
for (const item of eligible) console.log(`  ${item.id}`);
if (eligible.length !== targets.length) {
  console.log(`  note: ${targets.length - eligible.length} item(s) are not in the deferred state and are left alone.`);
}
if (!apply) {
  console.log('Preview only; pass --apply to record.');
  process.exit(0);
}

for (const item of eligible) {
  item.nextAction = 'manual-review';
  item.reviewQuestion = 'Is the two-copy assumption still true — is a local working clone still kept, and is anything now held outside git?';
  item.scope = 'Owner-accepted exposure for the independent backup control; no recovery outcome is inferred from repository files.';
  item.evidence = [{
    files: [decisionPath, 'docs/runbooks/repository-recovery.md', 'scripts/audit-repository-resilience.mjs'],
    verification: 'npm run audit:repository-external-evidence && npm run audit:repository-resilience',
    result: `Accepted exposure for ${CONTROL}: history exists in the local clone and the GitHub remote, both restorable from a known commit, and nothing of value lives outside git. This supersedes the earlier deferral, which said only that the exercise could not be performed yet.`,
  }];
  item.residualRisk = 'Two copies, one owner, one account. Losing the account removes the remote and the published site together; if the local clone is gone at the same moment, nothing remains. account-recovery is the control this acceptance depends on and is deliberately still open.';
}

await Promise.all([
  writeFile(registryPath, `${JSON.stringify(registry, null, 2)}\n`),
  writeFile(decisionPath, `${JSON.stringify(decision, null, 2)}\n`),
]);
console.log(`Recorded acceptance for ${eligible.length} AP-R item(s).`);
