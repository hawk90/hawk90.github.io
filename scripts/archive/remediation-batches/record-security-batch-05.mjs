#!/usr/bin/env node
// Records admin, privacy, storage, and comments decisions for AP-SEC-60..74.
// Preview by default; --apply is required. Content policy remains preservation-first.

import { readFile, writeFile } from 'node:fs/promises';

const apply = process.argv.includes('--apply');
const archive = 'archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273';
const path = `${archive}/remediation-plan/category-registries/security.json`;
const registry = JSON.parse(await readFile(path, 'utf8'));
const decisions = new Map([
  ['AP-SEC-60', ['accepted', 'The browser admin targets only the configured repository path; branch protection and account-level commit scope remain external controls.']],
  ['AP-SEC-61', ['accepted', 'Workflow files are outside the content editor path; GitHub branch/repository permissions remain the authoritative external control.']],
  ['AP-SEC-62', ['accepted', 'Commit messages are generated from editor inputs and remain a reviewable GitHub API boundary; no shell execution is performed.']],
  ['AP-SEC-63', ['remediated', 'Edit flow fetches the current file SHA before update and refuses stale writes through the GitHub contents API contract.']],
  ['AP-SEC-64', ['accepted', 'Analytics is disabled in checked-in config, while the privacy page remains an explicit content-policy review surface.']],
  ['AP-SEC-65', ['accepted', 'The privacy page is a maintained project document, not a generated legal guarantee; provider-specific claims require manual review.']],
  ['AP-SEC-66', ['accepted', 'Privacy text carries a last-updated marker; configuration changes require a targeted policy review rather than silent template assumptions.']],
  ['AP-SEC-67', ['accepted', 'No consent banner is claimed for disabled first-party analytics; any future tracking provider requires a separate consent design.']],
  ['AP-SEC-68', ['accepted', 'Consent scope is not generalized across services; optional comments and provider integrations are documented separately.']],
  ['AP-SEC-69', ['accepted', 'Local storage is limited to UI/admin draft or notification state; disclosure and retention remain a manual privacy review boundary.']],
  ['AP-SEC-70', ['remediated', 'Search does not persist query history; local storage is used for bounded UI settings and comment notification state only.']],
  ['AP-SEC-71', ['accepted', 'Analytics is disabled, so the site does not intentionally send full URL telemetry; hosted GitHub Pages logs remain external.']],
  ['AP-SEC-72', ['accepted', 'Client error handling does not publish page content to a repository-controlled logging service; provider diagnostics remain external.']],
  ['AP-SEC-73', ['remediated', 'Privacy copy identifies Giscus as GitHub Discussions-backed third-party comments, and the component does not treat it as first-party storage.']],
  ['AP-SEC-74', ['remediated', 'Giscus loading is deferred behind IntersectionObserver and configuration checks instead of loading before user intent/viewport relevance.']],
]);
const files = ['src/pages/admin/edit.astro', 'src/lib/admin/github-api.ts', 'src/pages/privacy.astro', 'src/consts/config.ts', 'src/components/blog/Giscus.astro', 'src/lib/admin/notifications.ts', 'src/components/common/SearchModal.astro', 'scripts/audit-product-experience.mjs'];
const items = registry.items.filter((item) => decisions.has(item.id) && item.disposition === 'unassessed');
console.log(`Security batch 05: ${items.length} eligible; ${apply ? 'applying.' : 'preview only; pass --apply to record.'}`);
if (!apply) process.exit(0);
for (const item of items) {
  const [disposition, result] = decisions.get(item.id);
  item.disposition = disposition;
  item.nextAction = disposition === 'remediated' ? 'verify' : 'manual-review';
  item.reviewQuestion = `Reassess ${item.title.replace(/^SEC-\\d+\\. /, '').toLowerCase()} after admin, privacy, storage, or integration changes.`;
  item.scope = 'Static admin, privacy, storage, and optional-comment boundary only; no published content, URLs, or frontmatter are changed.';
  item.evidence = [{ files, verification: 'npm run audit:product-experience && npm run gate:security-admin -- --artifact dist && npm run verify:release', result }];
  item.residualRisk = 'Account permissions, legal accuracy, hosted provider processing, and future analytics/configuration changes require targeted manual review.';
}
await writeFile(path, `${JSON.stringify(registry, null, 2)}\n`);
console.log(`Recorded ${items.length} security decisions; remaining items stay unassessed.`);
