#!/usr/bin/env node
// Records transport, domain, artifact, and media metadata decisions for AP-SEC-75..89.
// Preview by default; --apply is required. External DNS/provider state remains manual.

import { readFile, writeFile } from 'node:fs/promises';

const apply = process.argv.includes('--apply');
const archive = 'archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273';
const path = `${archive}/remediation-plan/category-registries/security.json`;
const registry = JSON.parse(await readFile(path, 'utf8'));
const decisions = new Map([
  ['AP-SEC-75', ['accepted', 'No advertising identifier is enabled by the checked-in analytics configuration; third-party policy remains external.']],
  ['AP-SEC-76', ['accepted', 'The configured canonical site and links use HTTPS; transport enforcement at GitHub Pages/domain infrastructure remains external evidence.']],
  ['AP-SEC-77', ['accepted', 'Checked-in first-party URLs and CSP allowlists use HTTPS where external transport is required; browser/provider behavior remains review scope.']],
  ['AP-SEC-78', ['accepted', 'Custom-domain dangling state cannot be proven from repository files; the configured canonical host is GitHub Pages and DNS remains deferred.']],
  ['AP-SEC-79', ['accepted', 'DNS changes require external verification and are not inferred from Astro configuration or repository state.']],
  ['AP-SEC-80', ['remediated', 'Preview/random and admin surfaces use noindex or artifact exclusion boundaries; sitemap generation excludes admin routes.']],
  ['AP-SEC-81', ['remediated', 'Astro/Vite production builds explicitly disable source maps.']],
  ['AP-SEC-82', ['remediated', 'The deployment uploads only the verified dist artifact and release checks inspect the generated output.']],
  ['AP-SEC-83', ['accepted', 'Operational reports remain repository-side evidence and are not intentionally published through content routes; artifact boundary checks remain required.']],
  ['AP-SEC-84', ['accepted', 'Image metadata leakage is not globally proven by static source checks; media review remains targeted and preservation-first.']],
  ['AP-SEC-85', ['accepted', 'EXIF removal is not inferred from file existence; original media preservation and metadata review remain an explicit manual lane.']],
  ['AP-SEC-86', ['accepted', 'Repository URLs in public links are intentional first-party references; secret/token exposure is separately scanned.']],
  ['AP-SEC-87', ['remediated', 'Credential/path scans run across source and generated artifacts and currently report no findings.']],
  ['AP-SEC-88', ['remediated', 'Secret scanning covers content, public, and dist trees and reports no credential-shaped tutorial tokens.']],
  ['AP-SEC-89', ['accepted', 'Secret redaction is not treated as safe based on partial masking; the scanner requires credential-shaped patterns to be absent.']],
]);
const files = ['astro.config.mjs', 'src/layouts/BaseLayout.astro', 'src/pages/random.astro', 'scripts/scan-secrets.mjs', 'scripts/audit-repository-resilience.mjs', 'scripts/verify-release.mjs', '.github/workflows/deploy.yml', 'src/content/blog'];
const items = registry.items.filter((item) => decisions.has(item.id) && item.disposition === 'unassessed');
console.log(`Security batch 06: ${items.length} eligible; ${apply ? 'applying.' : 'preview only; pass --apply to record.'}`);
if (!apply) process.exit(0);
for (const item of items) {
  const [disposition, result] = decisions.get(item.id);
  item.disposition = disposition;
  item.nextAction = disposition === 'remediated' ? 'verify' : 'manual-review';
  item.reviewQuestion = `Reassess ${item.title.replace(/^SEC-\\d+\\. /, '').toLowerCase()} after host, artifact, media, or deployment changes.`;
  item.scope = 'Checked-in transport, artifact, and media boundary only; no published content, URLs, or frontmatter are changed.';
  item.evidence = [{ files, verification: 'npm run gate:secrets && npm run audit:security-admin -- --artifact dist && npm run verify:release', result }];
  item.residualRisk = 'DNS/domain ownership, browser transport enforcement, hosted logs, and image metadata require external or targeted manual verification.';
}
await writeFile(path, `${JSON.stringify(registry, null, 2)}\n`);
console.log(`Recorded ${items.length} security decisions; remaining items stay unassessed.`);
