#!/usr/bin/env node
// Records workflow and dependency-boundary decisions for AP-SEC-31..45.
// Preview by default; --apply is required. No content/frontmatter changes.

import { readFile, writeFile } from 'node:fs/promises';

const apply = process.argv.includes('--apply');
const archive = 'archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273';
const path = `${archive}/remediation-plan/category-registries/security.json`;
const registry = JSON.parse(await readFile(path, 'utf8'));
const decisions = new Map([
  ['AP-SEC-31', ['remediated', 'The build job declares contents: read and the deploy write permissions are isolated to the deployment job.']],
  ['AP-SEC-32', ['accepted', 'Workflow secrets are not used by the static build contract; secret availability is reviewed as a workflow-specific concern.']],
  ['AP-SEC-33', ['remediated', 'The release secret scan runs against source and dist and fails credential-shaped output rather than printing secrets.']],
  ['AP-SEC-34', ['remediated', 'The production artifact is scanned by gate:secrets before upload/deploy.']],
  ['AP-SEC-35', ['remediated', 'CI is pull-request safe and does not expose deployment credentials; deployment is isolated to main.']],
  ['AP-SEC-36', ['remediated', 'No pull_request_target workflow is present; CI uses ordinary pull_request and read-only permissions.']],
  ['AP-SEC-37', ['accepted', 'Branch/ref values are not treated as shell code by the checked-in workflows; future dynamic workflow interpolation remains review-required.']],
  ['AP-SEC-38', ['accepted', 'Markdown is consumed by Astro build tooling under the release contract; arbitrary shell execution from content is not inferred.']],
  ['AP-SEC-39', ['remediated', 'Build and deploy permissions are job-scoped; the build job has read-only repository access.']],
  ['AP-SEC-40', ['remediated', 'Deployment is triggered only from main and runs the canonical release verification before artifact upload.']],
  ['AP-SEC-41', ['remediated', 'CI and deployment use npm ci against the lockfile instead of an unconstrained install.']],
  ['AP-SEC-42', ['accepted', 'Dependency necessity is reviewed through the checked-in package manifest and tooling audit; no blanket “small convenience” exemption is claimed.']],
  ['AP-SEC-43', ['accepted', 'npm audit and lockfile-based installation provide a bounded transitive-dependency signal, not proof of zero supply-chain risk.']],
  ['AP-SEC-44', ['accepted', 'No automatic major-update merge workflow is present; dependency updates remain reviewable repository changes.']],
  ['AP-SEC-45', ['accepted', 'Vulnerability counts are treated as signals; release gates combine dependency, secret, artifact, and build checks.']],
]);
const files = ['.github/workflows/ci.yml', '.github/workflows/deploy.yml', 'package.json', 'package-lock.json', 'scripts/audit-ci-security.mjs', 'scripts/scan-secrets.mjs', 'scripts/verify-release.mjs', 'scripts/audit-tooling.mjs'];
const items = registry.items.filter((item) => decisions.has(item.id) && item.disposition === 'unassessed');
console.log(`Security batch 03: ${items.length} eligible; ${apply ? 'applying.' : 'preview only; pass --apply to record.'}`);
if (!apply) process.exit(0);
for (const item of items) {
  const [disposition, result] = decisions.get(item.id);
  item.disposition = disposition;
  item.nextAction = disposition === 'remediated' ? 'verify' : 'manual-review';
  item.reviewQuestion = `Reassess ${item.title.replace(/^SEC-\\d+\\. /, '').toLowerCase()} after workflow or dependency changes.`;
  item.scope = 'Checked-in workflow and dependency boundary only; no published content, URLs, or frontmatter are changed.';
  item.evidence = [{ files, verification: 'npm run gate:ci-security && npm run gate:secrets && npm run gate:dependencies && npm run verify:release', result }];
  item.residualRisk = 'Evidence covers repository-controlled jobs and manifests; hosted runner behavior, transitive package intent, and external provider state still require targeted review.';
}
await writeFile(path, `${JSON.stringify(registry, null, 2)}\n`);
console.log(`Recorded ${items.length} security decisions; remaining items stay unassessed.`);
