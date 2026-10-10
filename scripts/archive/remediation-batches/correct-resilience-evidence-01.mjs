#!/usr/bin/env node
// Corrects two recorded decisions whose evidence stopped being true when the
// resilience audit was fixed.
//
// `recovery-remote` used to pass whenever `git remote` printed anything, so a
// repository with exactly one remote was reported as having recovery remotes
// configured. AP-R-61 was recorded against that reading. The control now
// requires two distinct remote hosts and fails, so the claim has to change with
// it — the item's own subject (history is retained rather than overwritten) is
// unaffected and stays remediated.
//
// AP-M-58 was recorded minutes before the same fix and quoted the old 8/8.
//
// AP-R-17/18/19/20/95/96 defer domain-dns-recovery. That control is now
// reported not-applicable, because there is no custom domain to recover. Their
// deferral is left exactly as it stands: an accepted risk that turns out to
// have no exposure is still a decision the owner made, and it becomes live
// again the moment a CNAME appears. Rewriting them would erase that trigger.
//
// Preview by default; --apply is required.

import { readFile, writeFile } from 'node:fs/promises';

const apply = process.argv.includes('--apply');
const base = 'archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/remediation-plan/category-registries';

const corrections = [
  {
    registry: 'repository.json',
    id: 'AP-R-61',
    expectDisposition: 'remediated',
    result: 'Repository object connectivity is verified and the current source is retained as Git history rather than a single overwritten snapshot. The earlier wording also claimed a verified recovery remote; that came from a check which passed on any configured remote, so a single origin counted as its own backup. The check now requires two distinct remote hosts and fails at one, and this record no longer claims otherwise.',
    residualRisk: 'History is retained on one host with one local clone, so the objects survive a bad commit but not the loss of the account. External recovery and the recovery-remote control remain open; rerun the listed verification after changing the control.',
  },
  {
    registry: 'metadata.json',
    id: 'AP-M-58',
    expectDisposition: 'remediated',
    result: 'The runbook moved from archives/…/remediation-plan/ to docs/runbooks/repository-recovery.md, and README links it from the deployment section. The two audits that read it were updated to the new path; repository controls verify 43/43. The resilience audit was corrected at the same time and now reports 7/8 local controls, with recovery-remote failing at one configured remote, 3 external controls pending, and domain-dns-recovery not applicable because the site is served from a github.io subdomain. An earlier version of this record quoted the pre-correction 8/8 and 4 pending. The document still states that recovery has not been tested, and that statement was left intact rather than softened by the move.',
    residualRisk: 'Promotion changes where the runbook lives, not whether it works. Every step in it remains unexercised, two audits now depend on the new path, and the runbook itself is only tracked because .gitignore was amended to stop /docs/ from swallowing it.',
  },
];

let applied = 0;
for (const correction of corrections) {
  const path = `${base}/${correction.registry}`;
  const registry = JSON.parse(await readFile(path, 'utf8'));
  const item = registry.items.find((entry) => entry.id === correction.id);
  if (!item) throw new Error(`${correction.id} not found in ${correction.registry}`);
  if (item.disposition !== correction.expectDisposition) {
    throw new Error(`${correction.id} is ${item.disposition}, expected ${correction.expectDisposition}`);
  }
  console.log(`${correction.id} (${correction.registry}) — evidence and residual risk rewritten.`);
  if (!apply) continue;
  item.evidence[0].result = correction.result;
  item.residualRisk = correction.residualRisk;
  await writeFile(path, `${JSON.stringify(registry, null, 2)}\n`);
  applied += 1;
}

console.log(apply ? `Corrected ${applied} record(s).` : 'Preview only; pass --apply to record.');
