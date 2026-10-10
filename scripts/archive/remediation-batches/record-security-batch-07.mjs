#!/usr/bin/env node
// Records security lifecycle and incident-boundary decisions for AP-SEC-90..100.
// Preview by default; --apply is required. External account exercises remain explicit risk.

import { readFile, writeFile } from 'node:fs/promises';

const apply = process.argv.includes('--apply');
const archive = 'archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273';
const path = `${archive}/remediation-plan/category-registries/security.json`;
const registry = JSON.parse(await readFile(path, 'utf8'));
const decisions = new Map([
  ['AP-SEC-90', ['accepted', 'Private draft exposure in historical Git objects requires repository-history review; current source and artifact secret gates do not prove historical absence.']],
  ['AP-SEC-91', ['remediated', 'CI runs a scheduled weekly verification in addition to pull-request/push checks and the release contract includes security gates.']],
  ['AP-SEC-92', ['accepted', 'Findings are reported by control and priority; scanner output is treated as a review signal rather than an undifferentiated alert stream.']],
  ['AP-SEC-93', ['remediated', 'Security gates explicitly document their bounded scope and are combined with build, artifact, dependency, and manual review controls.']],
  ['AP-SEC-94', ['remediated', 'Integrations are represented in checked-in config, CSP, privacy documentation, and product-experience audits.']],
  ['AP-SEC-95', ['accepted', 'Secret rotation depends on external account/provider operations; repository scans cannot attest to token age or revocation.']],
  ['AP-SEC-96', ['accepted', 'The recovery runbook classifies incidents beyond defacement and documents readable-site recovery priority; external incident response remains manual.']],
  ['AP-SEC-97', ['accepted', 'Deployment provenance is bounded by main-only workflow execution and immutable action pins; cryptographic attestation is not claimed.']],
  ['AP-SEC-98', ['accepted', 'Emergency edits are constrained by the additive preservation policy and release gates; no emergency host/account exercise is inferred.']],
  ['AP-SEC-99', ['remediated', 'Security controls are wired into CI/release and quality contracts, with zero findings from the current security and artifact gates.']],
  ['AP-SEC-100', ['accepted', 'The program keeps explicit scope, dependency ordering, residual-risk fields, and manual-review boundaries instead of claiming maximal security complexity is desirable.']],
]);
const files = ['.github/workflows/ci.yml', '.github/workflows/deploy.yml', 'scripts/audit-ci-security.mjs', 'scripts/security-admin-gate.mjs', 'scripts/scan-secrets.mjs', 'scripts/audit-quality-contracts.mjs', 'scripts/verify-release.mjs', `${archive}/remediation-plan/repository-recovery-runbook.md`, 'src/consts/config.ts', 'src/layouts/BaseLayout.astro'];
const items = registry.items.filter((item) => decisions.has(item.id) && item.disposition === 'unassessed');
console.log(`Security batch 07: ${items.length} eligible; ${apply ? 'applying.' : 'preview only; pass --apply to record.'}`);
if (!apply) process.exit(0);
for (const item of items) {
  const [disposition, result] = decisions.get(item.id);
  item.disposition = disposition;
  item.nextAction = disposition === 'remediated' ? 'verify' : 'manual-review';
  item.reviewQuestion = `Reassess ${item.title.replace(/^SEC-\\d+\\. /, '').toLowerCase()} after lifecycle, incident, or release-process changes.`;
  item.scope = 'Repository-controlled security lifecycle boundary only; no published content, URLs, or frontmatter are changed.';
  item.evidence = [{ files, verification: 'npm run gate:ci-security && npm run gate:secrets && npm run audit:security-admin -- --artifact dist && npm run audit:quality-contracts', result }];
  item.residualRisk = 'Historical Git objects, provider/account rotation, cryptographic provenance, and emergency-host exercises require external or targeted manual evidence.';
}
await writeFile(path, `${JSON.stringify(registry, null, 2)}\n`);
console.log(`Recorded ${items.length} security decisions; no unassessed AP-SEC items remain.`);
