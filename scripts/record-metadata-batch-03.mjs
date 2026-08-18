#!/usr/bin/env node
// Records AP-M-31..45 decisions for CI, environment, and dependency metadata.
// Preview by default; --apply is required. No article body/frontmatter rewrite.

import { readFile, writeFile } from 'node:fs/promises';

const apply = process.argv.includes('--apply');
const archive = 'archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273';
const path = `${archive}/remediation-plan/category-registries/metadata.json`;
const registry = JSON.parse(await readFile(path, 'utf8'));
const decisions = new Map([
  ['AP-M-31', ['remediated', 'CI and local release use the same package scripts and lockfile-based installation; environment differences remain visible in workflow configuration.']],
  ['AP-M-32', ['remediated', 'The canonical verify:release contract is invoked by both CI and deployment workflows and can be run locally.']],
  ['AP-M-33', ['accepted', 'Node version, memory options, and telemetry settings are explicit in workflows/release commands; host-specific behavior remains review scope.']],
  ['AP-M-34', ['accepted', 'Runtime versions are pinned by engines/workflow major versions and dependency lockfile; exact runner image evolution remains external.']],
  ['AP-M-35', ['accepted', 'CI/deploy intentionally share the release contract while keeping build/deploy permissions separate; duplication is bounded and audited.']],
  ['AP-M-36', ['remediated', 'Deployment triggers only on main and workflow dispatch, not every branch push.']],
  ['AP-M-37', ['remediated', 'Deployment uses paths-ignore for documentation-only changes while CI covers pull requests and non-main pushes.']],
  ['AP-M-38', ['remediated', 'Cache keys include runner and source/config hashes, with documented restore keys in deploy workflow.']],
  ['AP-M-39', ['accepted', 'Release checks fail on findings; flaky behavior is not silently accepted, but hosted runner variance remains a manual observation.']],
  ['AP-M-40', ['accepted', 'Artifact verification occurs before upload; post-deploy provider availability is external and not inferred from build success.']],
  ['AP-M-41', ['accepted', 'package.json, lockfile, tooling audit, and dependency audit provide an inventory baseline; historical dependency intent remains reviewable.']],
  ['AP-M-42', ['accepted', 'Unused dependency removal is not inferred automatically; manifest changes require a separately reviewed semantic commit.']],
  ['AP-M-43', ['accepted', 'Runtime/dev dependency boundaries are explicit in package.json, while actual bundle usage remains a future dependency review surface.']],
  ['AP-M-44', ['accepted', 'No blanket trivial-function exemption is claimed; dependency additions remain subject to manifest and lockfile review.']],
  ['AP-M-45', ['accepted', 'Overlapping libraries are surfaced by tooling/manifest review; automatic consolidation would risk unrelated behavior and is not authorized.']],
]);
const files = ['package.json', 'package-lock.json', '.github/workflows/ci.yml', '.github/workflows/deploy.yml', 'scripts/verify-release.mjs', 'scripts/audit-tooling.mjs', 'scripts/audit-ci-security.mjs', 'scripts/audit-repository-resilience.mjs'];
const items = registry.items.filter((item) => decisions.has(item.id) && item.disposition === 'unassessed');
console.log(`Metadata batch 03: ${items.length} eligible; ${apply ? 'applying.' : 'preview only; pass --apply to record.'}`);
if (!apply) process.exit(0);
for (const item of items) {
  const [disposition, result] = decisions.get(item.id);
  item.disposition = disposition;
  item.nextAction = disposition === 'remediated' ? 'verify' : 'manual-review';
  item.reviewQuestion = `Reassess ${item.title.replace(/^M-\\d+\\. /, '').toLowerCase()} after CI, runner, or dependency changes.`;
  item.scope = 'CI/environment/dependency metadata boundary only; article bodies, published URLs, and bulk frontmatter rewrites are out of scope.';
  item.evidence = [{ files, verification: 'npm run gate:tooling && npm run gate:ci-security && npm run gate:repository && npm run verify:release', result }];
  item.residualRisk = 'Hosted runner, provider, and transitive dependency behavior can change; rerun the listed checks after workflow or manifest changes.';
}
await writeFile(path, `${JSON.stringify(registry, null, 2)}\n`);
console.log(`Recorded ${items.length} metadata decisions; remaining items stay unassessed.`);
