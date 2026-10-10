#!/usr/bin/env node
// Records the first security batch from concrete static-site and CI evidence.
// Preview by default; --apply is required. No content or frontmatter is changed.

import { readFile, writeFile } from 'node:fs/promises';

const apply = process.argv.includes('--apply');
const archive = 'archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273';
const path = `${archive}/remediation-plan/category-registries/security.json`;
const registry = JSON.parse(await readFile(path, 'utf8'));
const decisions = new Map([
  ['AP-SEC-01', ['accepted', 'Static output is a deployment property, not a security proof; the security/admin and CI gates enforce explicit boundaries.']],
  ['AP-SEC-02', ['accepted', 'The site has no runtime backend requirement and analytics is disabled, but absence of a backend is not treated as a blanket security claim.']],
  ['AP-SEC-03', ['remediated', 'Secret and artifact gates inspect the repository and production artifact; no secret-bearing source is authorized by the static deployment contract.']],
  ['AP-SEC-04', ['accepted', 'Security decisions are enforced by checked-in gates and workflow permissions rather than obscurity.']],
  ['AP-SEC-05', ['remediated', 'The release contract and static-admin boundary run before publication; development-only admin routes are excluded from the artifact.']],
  ['AP-SEC-06', ['accepted', 'Third-party integrations are explicitly enumerated in CSP and optional integrations are kept outside the core recovery path.']],
  ['AP-SEC-07', ['accepted', 'The repository does not claim a universal third-party script budget; each integration remains an explicit, reviewable configuration surface.']],
  ['AP-SEC-08', ['accepted', 'Comments and analytics are optional and gated; the static article remains renderable without those providers.']],
  ['AP-SEC-09', ['remediated', 'BaseLayout emits a restrictive default-src self CSP with explicit script, style, frame, object, base, and form boundaries.']],
  ['AP-SEC-10', ['accepted', 'CSP is checked into the base layout and exercised by the release/security contracts; historical introduction order is not inferred.']],
  ['AP-SEC-11', ['accepted', 'The CSP documents the narrow inline-script exception required by the current Astro theme path; removing it requires a separate nonce/hash design.']],
  ['AP-SEC-12', ['accepted', 'The CSP is treated as a bounded preventive control; browser report collection is not claimed where no reporting endpoint exists.']],
  ['AP-SEC-13', ['accepted', 'No blanket SRI claim is made for optional provider content; external integrations remain allowlisted and independently reviewable.']],
  ['AP-SEC-14', ['accepted', 'No cross-origin script is declared safe solely from a crossorigin attribute; provider loading remains an explicit manual-review boundary.']],
  ['AP-SEC-15', ['accepted', 'Floating provider behavior is not silently trusted; external origins are pinned in the CSP/configuration and must be reassessed when changed.']],
]);
const files = ['src/layouts/BaseLayout.astro', 'src/consts/config.ts', 'scripts/security-admin-gate.mjs', 'scripts/audit-ci-security.mjs', 'scripts/verify-release.mjs', '.github/workflows/ci.yml', '.github/workflows/deploy.yml'];
const items = registry.items.filter((item) => decisions.has(item.id) && item.disposition === 'unassessed');
console.log(`Security batch 01: ${items.length} eligible; ${apply ? 'applying.' : 'preview only; pass --apply to record.'}`);
if (!apply) process.exit(0);
for (const item of items) {
  const [disposition, result] = decisions.get(item.id);
  item.disposition = disposition;
  item.nextAction = disposition === 'remediated' ? 'verify' : 'manual-review';
  item.reviewQuestion = `Reassess ${item.title.replace(/^SEC-\\d+\\. /, '').toLowerCase()} after security, deployment, or integration changes.`;
  item.scope = 'Static-site security boundary only; no published content, URLs, or frontmatter are changed.';
  item.evidence = [{ files, verification: 'npm run gate:ci-security && npm run audit:security-admin -- --artifact dist && npm run verify:release', result }];
  item.residualRisk = 'The evidence covers the checked-in static boundary only; provider behavior, browser enforcement, and untested historical/runtime conditions still require targeted review.';
}
await writeFile(path, `${JSON.stringify(registry, null, 2)}\n`);
console.log(`Recorded ${items.length} security decisions; remaining items stay unassessed.`);
