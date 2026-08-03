#!/usr/bin/env node
// Records the second security batch from content parsing, escaping, and CI evidence.
// Preview by default; --apply is required. No published content is rewritten.

import { readFile, writeFile } from 'node:fs/promises';

const apply = process.argv.includes('--apply');
const archive = 'archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273';
const path = `${archive}/remediation-plan/category-registries/security.json`;
const registry = JSON.parse(await readFile(path, 'utf8'));
const decisions = new Map([
  ['AP-SEC-16', ['accepted', 'Search and content data are site-owned static artifacts; no same-origin proxy is treated as an automatic trust boundary.']],
  ['AP-SEC-17', ['accepted', 'Markdown is independently parsed and release-checked; source content is not treated as executable HTML by policy.']],
  ['AP-SEC-18', ['accepted', 'Raw HTML usage is a reviewed theme/content boundary rather than an assumption that every Markdown fragment is safe.']],
  ['AP-SEC-19', ['remediated', 'The security/admin gate scans for innerHTML sinks and the current artifact passes with zero open P0 findings.']],
  ['AP-SEC-20', ['remediated', 'Search highlighting escapes every non-match and query fragment before producing the bounded mark wrapper; it does not insert raw query text.']],
  ['AP-SEC-21', ['remediated', 'Frontmatter is independently parsed with js-yaml and validated through the Astro schema before publication.']],
  ['AP-SEC-22', ['remediated', 'Generated JSON-LD escapes the less-than character before inline emission and release verification covers the generated artifact.']],
  ['AP-SEC-23', ['accepted', 'URL safety is bounded by schema, internal-link, and release checks; no universal trust claim is made for arbitrary external schemes.']],
  ['AP-SEC-24', ['remediated', 'The only supported iframe provider is explicitly allowlisted in CSP and the optional comments integration is isolated from article rendering.']],
  ['AP-SEC-25', ['accepted', 'Iframe sandbox strength is provider-specific and is retained as a manual review boundary rather than inferred from the existence of an iframe.']],
  ['AP-SEC-26', ['accepted', 'SVG assets are repository-owned and audited for structure/accessibility; external SVG trust is not inferred.']],
  ['AP-SEC-27', ['accepted', 'Generated diagram output is covered by structural/quality audits; arbitrary user SVG injection is outside the static content contract.']],
  ['AP-SEC-28', ['remediated', 'CI security rejects mutable GitHub Action references and requires immutable 40-character commit pins.']],
  ['AP-SEC-29', ['remediated', 'CI security audits the complete workflow set and enforces read-only contents permissions plus the release contract.']],
  ['AP-SEC-30', ['remediated', 'Both workflows declare least-privilege contents: read permissions and the CI security gate fails missing permissions.']],
]);
const files = ['src/lib/search.ts', 'scripts/audit-frontmatter-portability.mjs', 'scripts/security-admin-gate.mjs', 'scripts/audit-ci-security.mjs', 'scripts/audit-svg-accessibility.mjs', 'scripts/audit-diagram-quality.mjs', 'src/layouts/BaseLayout.astro', '.github/workflows/ci.yml', '.github/workflows/deploy.yml'];
const items = registry.items.filter((item) => decisions.has(item.id) && item.disposition === 'unassessed');
console.log(`Security batch 02: ${items.length} eligible; ${apply ? 'applying.' : 'preview only; pass --apply to record.'}`);
if (!apply) process.exit(0);
for (const item of items) {
  const [disposition, result] = decisions.get(item.id);
  item.disposition = disposition;
  item.nextAction = disposition === 'remediated' ? 'verify' : 'manual-review';
  item.reviewQuestion = `Reassess ${item.title.replace(/^SEC-\\d+\\. /, '').toLowerCase()} after parser, renderer, asset, or workflow changes.`;
  item.scope = 'Static-site parsing, rendering, and CI security boundary only; no published content, URLs, or frontmatter are changed.';
  item.evidence = [{ files, verification: 'npm run audit:frontmatter-portability && npm run gate:ci-security && npm run audit:security-admin -- --artifact dist && npm run verify:release', result }];
  item.residualRisk = 'Evidence covers checked-in code and generated artifacts; browser parser behavior, provider-hosted content, and novel input paths still require targeted review.';
}
await writeFile(path, `${JSON.stringify(registry, null, 2)}\n`);
console.log(`Recorded ${items.length} security decisions; remaining items stay unassessed.`);
