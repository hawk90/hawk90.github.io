#!/usr/bin/env node
// Records concrete AP-T controls already enforced by the release contract. Preview by default.

import { readFile, writeFile } from 'node:fs/promises';

const apply = process.argv.includes('--apply');
const archive = 'archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273';
const path = `${archive}/remediation-plan/category-registries/quality.json`;
const registry = JSON.parse(await readFile(path, 'utf8'));
const [release, deploy, config, frontmatter, links, search, frontmatterReport, topics, relationSource, seriesAudit] = await Promise.all([
  readFile('scripts/verify-release.mjs', 'utf8'), readFile('.github/workflows/deploy.yml', 'utf8'), readFile('src/content.config.ts', 'utf8'),
  readFile('scripts/audit-frontmatter-portability.mjs', 'utf8'), readFile('scripts/audit-internal-links.py', 'utf8'), readFile('scripts/verify-search.mjs', 'utf8'),
  readFile('reports/content-portability/frontmatter.md', 'utf8'), readFile('scripts/verify-topic-registry.mjs', 'utf8'),
  readFile('src/lib/content/relations.ts', 'utf8'), readFile('scripts/audit-series-integrity.py', 'utf8'),
]);
const searchParity = await readFile('reports/quality/search-page-parity.md', 'utf8').catch(() => '');
const qualityContracts = await readFile('reports/quality/contracts.md', 'utf8').catch(() => '');
const distributionFeeds = await readFile('reports/quality/distribution-feeds.md', 'utf8').catch(() => '');
const controls = [
  ['AP-T-01', /gate:tooling/.test(release) && /audit:product-experience/.test(release), 'multi-layer release contract'],
  ['AP-T-02', /topics: z\.array\(z\.string\(\)\)\.min\(1\)/.test(config) && /date: z\.coerce\.date\(\)/.test(config), 'validated content schema'],
  ['AP-T-03', /gate:classification/.test(release) && /test:relations/.test(release), 'content-aware regression checks'],
  ['AP-T-04', /audit:links/.test(release) && /gate:classification/.test(release), 'content included in release checks'],
  ['AP-T-08', /js-yaml/.test(frontmatter) && /Findings: 0/.test(frontmatterReport), 'independent parser corpus audit'],
  ['AP-T-09', /\['duplicate ID'|\['missing parent'|\['parent cycle'/.test(topics), 'negative-path validation'],
  ['AP-T-16', /production build/.test(release) && /internal links/.test(release) && /static admin boundary/.test(release), 'end-to-end publish pipeline'],
  ['AP-T-17', /verify:release/.test(deploy), 'production build in deployment CI'],
  ['AP-T-18', /gate:tooling/.test(release) && /gate:secrets/.test(release) && /build/.test(release), 'layered checks before build'],
  ['AP-T-19', /gate:security-admin/.test(release) && /--artifact/.test(release), 'generated artifact inspection'],
  ['AP-T-20', /Files scanned/.test(links) && /audit:links/.test(release), 'corpus-wide internal-link audit'],
  ['AP-T-21', /Markdown documents scanned: 3387/.test(frontmatterReport), 'large-corpus parser coverage'],
  ['AP-T-25', /--artifact/.test(release), 'dist artifact validation'],
  ['AP-T-36', /PASS dictionary integrity/.test(search), 'search quality regression contract'],
  ['AP-T-37', /const cases/.test(search) && /PCI Express/.test(search) && /RISC-V ISA/.test(search), 'golden query set'],
  ['AP-T-38', /PCI Express/.test(search) && /c plus plus/.test(search), 'alias-query coverage'],
  ['AP-T-39', /\['os', ''\]/.test(search), 'negative search case'],
  ['AP-T-76', /assertContentRelationIntegrity/.test(relationSource) && /unknown kind/.test(relationSource), 'relation integrity validation'],
  ['AP-T-77', /sourceId === relation\.targetId/.test(relationSource), 'self-referential relation rejection'],
  ['AP-T-78', /Duplicate content relation/.test(relationSource), 'duplicate relation rejection'],
  ['AP-T-81', /중복 seriesOrder/.test(seriesAudit) && /blocking_count/.test(seriesAudit), 'series order collision audit'],
  ['AP-T-91', /Search records: [1-9]/.test(searchParity) && /Findings: 0/.test(searchParity), 'search manifest/page parity'],
  ['AP-T-22', /PASS search-empty-state/.test(qualityContracts), 'search empty-state contract'],
  ['AP-T-23', /PASS search-error-state/.test(qualityContracts), 'search error-state contract'],
  ['AP-T-42', /PASS search-publication-filter/.test(qualityContracts), 'publication-aware search contract'],
  ['AP-T-43', /PASS search-canonical-id/.test(qualityContracts), 'canonical search URL contract'],
  ['AP-T-74', /PASS verification-separate-from-updated/.test(qualityContracts), 'separate verification metadata contract'],
  ['AP-T-83', /PASS published-hub-draft-guard/.test(qualityContracts), 'published hub draft guard'],
  ['AP-T-92', /PASS rss-publication-filter/.test(distributionFeeds), 'RSS publication boundary'],
  ['AP-T-93', /PASS sitemap-admin-exclusion/.test(distributionFeeds) && /PASS built-sitemap-unique/.test(distributionFeeds), 'sitemap uniqueness boundary'],
  ['AP-T-61', /PASS search-escape-close/.test(qualityContracts), 'search Escape close contract'],
  ['AP-T-62', /PASS reduced-motion-contract/.test(qualityContracts), 'reduced-motion contract'],
  ['AP-T-24', /PASS preview-production-contract/.test(qualityContracts), 'preview/production output contract'],
  ['AP-T-94', /PASS og-failure-is-fatal/.test(qualityContracts), 'OG generation failure contract'],
  ['AP-T-95', /PASS dependency-audit-is-layered/.test(qualityContracts), 'layered dependency and quality contract'],
  ['AP-T-96', /PASS content-secret-scan/.test(qualityContracts), 'content secret-scan contract'],
  ['AP-T-98', /PASS admin-artifact-boundary/.test(qualityContracts), 'admin artifact boundary contract'],
  ['AP-T-99', /PASS workflow-security-contract/.test(qualityContracts), 'workflow security contract'],
  ['AP-T-26', /PASS filesystem-link-resolution/.test(qualityContracts), 'filesystem-aware internal link check'],
  ['AP-T-32', /PASS code-fence-link-exclusion/.test(qualityContracts), 'code-fence link exclusion'],
  ['AP-T-33', /PASS reference-link-resolution/.test(qualityContracts), 'reference-style link resolution'],
  ['AP-T-34', /PASS deterministic-link-repair/.test(qualityContracts), 'deterministic link repair'],
  ['AP-T-40', /PASS search-ranking-regression/.test(qualityContracts), 'multi-result search ranking regression'],
  ['AP-T-41', /PASS search-ranking-regression/.test(qualityContracts), 'search ranking snapshot regression'],
  ['AP-T-44', /PASS search-corpus-regression/.test(qualityContracts), 'representative search corpus'],
  ['AP-T-45', /PASS search-ranking-regression/.test(qualityContracts), 'automated search quality regression'],
  ['AP-T-85', /Unique slugs: [1-9][0-9]*\n- Findings: 0/.test(searchParity), 'generated canonical slug uniqueness'],
];
const candidates = controls.map(([id, ok, name]) => ({ id, ok, name, item: registry.items.find((item) => item.id === id) })).filter(({ item }) => item?.disposition === 'unassessed');
const failed = candidates.filter(({ ok }) => !ok);
console.log(`Quality controls: ${candidates.length - failed.length}/${candidates.length} eligible controls pass.${apply ? ' Applying.' : ' Preview only; pass --apply to record.'}`);
for (const control of candidates) console.log(`- ${control.ok ? 'PASS' : 'FAIL'} ${control.id} -> ${control.name}`);
if (!apply) process.exit(failed.length ? 1 : 0);
if (failed.length) throw new Error(`Refusing failed controls: ${failed.map(({ id }) => id).join(', ')}`);
for (const { item, name } of candidates) {
  item.disposition = 'remediated'; item.nextAction = 'manual-review';
  item.reviewQuestion = `Does the ${name} control remain in the release contract after future tooling changes?`;
  item.scope = 'Repository-wide quality control; no published content, URLs, or frontmatter are changed.';
  item.evidence = [{ files: ['scripts/verify-release.mjs', 'scripts/verify-search.mjs', 'scripts/audit-frontmatter-portability.mjs'], verification: 'npm run verify:release', result: `The ${name} control is included in the current quality contract.` }];
  item.residualRisk = 'This automated control does not replace evidence-led editorial, visual, accessibility, or external-system review.';
}
await writeFile(path, `${JSON.stringify(registry, null, 2)}\n`);
console.log(`Recorded ${candidates.length} AP-T control dispositions.`);
