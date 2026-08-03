#!/usr/bin/env node
// Records build-integrity, lockfile, and static OAuth boundary decisions for AP-SEC-46..60.
// Preview by default; --apply is required. No content/frontmatter changes.

import { readFile, writeFile } from 'node:fs/promises';

const apply = process.argv.includes('--apply');
const archive = 'archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273';
const path = `${archive}/remediation-plan/category-registries/security.json`;
const registry = JSON.parse(await readFile(path, 'utf8'));
const decisions = new Map([
  ['AP-SEC-46', ['accepted', 'Build compromise is addressed through immutable workflow pins, locked installation, secret scanning, and artifact verification; these are layered signals, not proof of a trusted runner.']],
  ['AP-SEC-47', ['accepted', 'Install behavior is constrained by npm ci and the committed lockfile; package lifecycle scripts remain a dependency-review boundary.']],
  ['AP-SEC-48', ['remediated', 'CI and deployment both use npm ci and the dependency gate runs in the canonical release contract.']],
  ['AP-SEC-49', ['accepted', 'Lockfile changes are ordinary reviewable repository diffs; no automation silently hides them.']],
  ['AP-SEC-50', ['accepted', 'Dependency audit and manifest review provide signals for abandoned packages; no universal abandonment verdict is inferred.']],
  ['AP-SEC-51', ['remediated', 'The static-admin gate finds no OAuth client secret or callback route in source or dist.']],
  ['AP-SEC-52', ['remediated', 'The static-admin gate scans browser storage for access-token persistence and reports zero findings; the current auth token is module-memory only.']],
  ['AP-SEC-53', ['accepted', 'PAT scope and lifetime are user/account policy outside the static artifact; the UI documents the required scope but cannot attest to token age.']],
  ['AP-SEC-54', ['accepted', 'OAuth is not enabled in this static deployment, so scope inflation is not inferred; any future server auth requires a separate review.']],
  ['AP-SEC-55', ['accepted', 'The static admin boundary does not claim server-side authentication/authorization; capability remains explicitly outside the static trust model.']],
  ['AP-SEC-56', ['accepted', 'Client-side admin capability is treated as a bounded PAT-based integration, not as a general authorization system.']],
  ['AP-SEC-57', ['accepted', 'No OAuth flow is deployed; state/CSRF guarantees are deferred to any future server-owned OAuth implementation.']],
  ['AP-SEC-58', ['accepted', 'No OAuth redirect URI is emitted by the static artifact; provider redirect configuration remains external review scope.']],
  ['AP-SEC-59', ['accepted', 'The static client does not implement OAuth token-in-URL delivery; PAT entry remains a manual operational risk.']],
  ['AP-SEC-60', ['accepted', 'The browser admin can request repository content writes only through the configured GitHub API target; repository branch protection and account permissions remain external controls.']],
]);
const files = ['scripts/security-admin-gate.mjs', 'src/lib/admin/auth.ts', 'src/lib/admin/github-api.ts', 'src/pages/admin/login.astro', 'astro.config.mjs', 'package-lock.json', '.github/workflows/ci.yml', '.github/workflows/deploy.yml', 'scripts/verify-release.mjs'];
const items = registry.items.filter((item) => decisions.has(item.id) && item.disposition === 'unassessed');
console.log(`Security batch 04: ${items.length} eligible; ${apply ? 'applying.' : 'preview only; pass --apply to record.'}`);
if (!apply) process.exit(0);
for (const item of items) {
  const [disposition, result] = decisions.get(item.id);
  item.disposition = disposition;
  item.nextAction = disposition === 'remediated' ? 'verify' : 'manual-review';
  item.reviewQuestion = `Reassess ${item.title.replace(/^SEC-\\d+\\. /, '').toLowerCase()} after authentication, dependency, or release changes.`;
  item.scope = 'Static deployment, browser-admin, and repository-controlled release boundary only; no published content, URLs, or frontmatter are changed.';
  item.evidence = [{ files, verification: 'npm run gate:security-admin -- --artifact dist && npm run gate:dependencies && npm run gate:secrets && npm run verify:release', result }];
  item.residualRisk = 'Account permissions, PAT lifetime/scope, hosted GitHub behavior, and any future OAuth server remain external or manual review boundaries.';
}
await writeFile(path, `${JSON.stringify(registry, null, 2)}\n`);
console.log(`Recorded ${items.length} security decisions; remaining items stay unassessed.`);
