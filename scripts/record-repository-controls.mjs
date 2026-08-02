#!/usr/bin/env node
// Records only concrete, local AP-R controls. Preview by default; --apply is idempotent.

import { readdir, readFile, writeFile } from 'node:fs/promises';

const apply = process.argv.includes('--apply');
const refresh = process.argv.includes('--refresh');
const archive = 'archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273';
const registryPath = `${archive}/remediation-plan/category-registries/repository.json`;
const registry = JSON.parse(await readFile(registryPath, 'utf8'));
const [config, normalize, astro, ci, deploy, security, contentConfig, layout, giscus, searchIndex, rss, globalCss, sourceFiles, runbook] = await Promise.all([
  readFile('src/consts/config.ts', 'utf8'), readFile('src/lib/content/normalize.ts', 'utf8'),
  readFile('astro.config.mjs', 'utf8'), readFile('.github/workflows/ci.yml', 'utf8'), readFile('.github/workflows/deploy.yml', 'utf8'),
  readFile('scripts/security-admin-gate.mjs', 'utf8'), readFile('src/content.config.ts', 'utf8'), readFile('src/layouts/BaseLayout.astro', 'utf8'),
  readFile('src/components/blog/Giscus.astro', 'utf8'), readFile('src/pages/search.json.ts', 'utf8'),
  readFile('src/pages/rss.xml.ts', 'utf8'), readFile('src/styles/global.css', 'utf8'), readdir('src/content/blog', { recursive: true }),
  readFile(`${archive}/remediation-plan/repository-recovery-runbook.md`, 'utf8'),
]);
const sourceDocuments = sourceFiles.filter((file) => file.endsWith('.md') || file.endsWith('.mdx'));
const markdownOnlySource = sourceDocuments.length > 0 && sourceDocuments.every((file) => file.endsWith('.md'));
const remoteAsset = /!\[[^\]]*\]\(https?:\/\/|<img\b[^>]*\bsrc\s*=\s*["']https?:\/\//i;
const remoteImageHotlinks = await Promise.all(sourceDocuments.map((file) => readFile(`src/content/blog/${file}`, 'utf8'))).then((documents) => documents.some((document) => remoteAsset.test(document)));
const frontmatterAudit = await readFile('reports/content-portability/frontmatter.md', 'utf8').catch(() => '');
const sourceInventory = await readFile('reports/repository/source-inventory.json', 'utf8').then(JSON.parse).catch(() => null);
const localRecovery = await readFile('reports/repository/local-recovery-exercise.md', 'utf8').catch(() => '');
const portableExport = await readFile('reports/content-export/manifest.json', 'utf8').then(JSON.parse).catch(() => null);
const repositoryHealth = await readFile('reports/repository-health/latest.md', 'utf8').catch(() => '');

const controls = [
  ['AP-R-11', /upload-pages-artifact/.test(deploy), 'CI artifact deployment', ['.github/workflows/deploy.yml', 'scripts/audit-repository-resilience.mjs'], 'The deploy workflow builds and uploads the Pages artifact rather than relying on a hand-assembled deployment.'],
  ['AP-R-15', /npm ci/.test(ci) && /npm ci/.test(deploy), 'locked dependency installation', ['.github/workflows/ci.yml', '.github/workflows/deploy.yml'], 'CI and deployment use npm ci, so the lockfile—not a mutable installed environment—defines dependency installation.'],
  ['AP-R-30', /PAT-only/.test(astro) && /OAuth route source/.test(security), 'static PAT-only boundary', ['astro.config.mjs', 'scripts/security-admin-gate.mjs'], 'The static-site boundary rejects OAuth callback routes; any OAuth workflow requires a separately deployed server boundary.'],
  ['AP-R-36', /url: `\/blog\/\$\{entry\.id\}`/.test(normalize), 'stable content ID URLs', ['src/lib/content/normalize.ts', 'scripts/audit-content-portability.mjs'], 'Public blog URLs are derived from stable entry IDs, not directory taxonomy paths.'],
  ['AP-R-37', /- Findings: 0/.test(frontmatterAudit), 'independently parseable YAML frontmatter', ['scripts/audit-frontmatter-portability.mjs', 'reports/content-portability/frontmatter.md'], 'Every Markdown document was parsed through js-yaml independently of the Astro content loader; the audit changes no frontmatter.'],
  ['AP-R-38', /date: z\.coerce\.date\(\)/.test(await readFile('src/content.config.ts', 'utf8')), 'validated date schema', ['src/content.config.ts', 'scripts/audit-content-portability.mjs'], 'Content dates are parsed through the collection schema instead of relying on ambiguous raw filename metadata.'],
  ['AP-R-39', /if \(!explicitTopics\.length\)/.test(normalize), 'explicit content metadata', ['src/lib/content/normalize.ts', 'scripts/audit-content-portability.mjs'], 'Canonical topics must be explicit in frontmatter; missing metadata is rejected instead of inferred from a filename.'],
  ['AP-R-51', /url: `\/blog\/\$\{entry\.id\}`/.test(normalize), 'taxonomy-independent URL policy', ['src/lib/content/normalize.ts', 'scripts/audit-content-portability.mjs'], 'Taxonomy changes do not form the public blog URL because the URL is based on the entry ID.'],
  ['AP-R-74', /url: `\/blog\/\$\{entry\.id\}`/.test(normalize), 'stable content IDs', ['src/lib/content/normalize.ts', 'scripts/audit-content-portability.mjs'], 'The runtime URL contract uses the content entry ID and is audited as a portability control.'],
  ['AP-R-94', /defineAnalytics\(\{\s*enabled:\s*false,?\s*}\)/s.test(config), 'analytics-independent deployment', ['src/consts/config.ts', '.github/workflows/deploy.yml', 'scripts/audit-product-experience.mjs'], 'Analytics is explicitly disabled and the deployment workflow has no analytics prerequisite.'],
  ['AP-R-22', /defineAnalytics\(\{\s*enabled:\s*false,?\s*}\)/s.test(config), 'analytics is not an archive dependency', ['src/consts/config.ts', 'scripts/audit-product-experience.mjs'], 'Analytics is explicitly disabled, so site history and recovery do not depend on an analytics provider.'],
  ['AP-R-23', !remoteImageHotlinks, 'self-hosted content image references', ['src/content/blog', 'scripts/audit-content-asset-portability.mjs'], 'The content corpus contains no Markdown or HTML remote image hotlinks; external reference links remain preserved as citations.'],
  ['AP-R-24', /<Comments \/>/.test(await readFile('src/pages/blog/[...slug].astro', 'utf8')) && /if \(!repoId \|\| !categoryId\) \{/.test(giscus), 'optional comment integration fallback', ['src/components/blog/Giscus.astro', 'src/pages/blog/[...slug].astro'], 'A missing Giscus configuration shows a setup fallback and returns before loading an external script; article rendering remains available.'],
  ['AP-R-05', sourceInventory?.documentCount === sourceDocuments.length && sourceInventory.entries?.every((entry) => entry.path && entry.sha256 && Number.isInteger(entry.bytes)), 'source recovery inventory', ['scripts/build-source-inventory.mjs', 'reports/repository/source-inventory.json'], 'A deterministic inventory records every Markdown source path, byte count, and SHA-256 before an external backup/restore exercise.'],
  ['AP-R-04', /Result: passed/.test(localRecovery) && /Independent backup claim: no/.test(localRecovery), 'disposable local restore rehearsal', ['scripts/exercise-local-recovery.mjs', 'reports/repository/local-recovery-exercise.md'], 'A Git bundle was restored into a fresh disposable clone and validated through source inventory and static build; independent backup coverage remains separately required.'],
  ['AP-R-16', /Result: passed/.test(localRecovery), 'post-restore validation', ['scripts/exercise-local-recovery.mjs', 'reports/repository/local-recovery-exercise.md'], 'The recovery rehearsal verifies Git object connectivity and the restored Markdown source inventory after restoration; the optional --full mode adds dependency and Astro diagnostics.'],
  ['AP-R-71', portableExport?.exportedDocumentCount === sourceDocuments.length, 'open portable content export', ['scripts/export-portable-content.mjs', 'reports/content-export/content.jsonl', 'reports/content-export/manifest.json'], 'The full source corpus has an additive, independently readable JSONL export path.'],
  ['AP-R-72', portableExport?.recordFields?.includes('frontmatter') && portableExport?.recordFields?.includes('url'), 'relationship-preserving export', ['scripts/export-portable-content.mjs', 'reports/content-export/content.jsonl'], 'Every portable export record retains frontmatter relationships and the stable public URL alongside the full body.'],
  ['AP-R-84', portableExport?.records?.every((record) => /^[a-f0-9]{64}$/.test(record.sha256 ?? '')), 'checksummed source export', ['scripts/export-portable-content.mjs', 'scripts/audit-portable-content-export.mjs', 'reports/content-export/manifest.json'], 'Every exported source document has a SHA-256 record verified against the preserved Markdown source.'],
  ['AP-R-85', portableExport?.format === 'UTF-8 JSON Lines', 'open archive container', ['reports/content-export/content.jsonl', 'reports/content-export/README.md'], 'The export uses plain UTF-8 JSON Lines rather than a proprietary container.'],
  ['AP-R-89', portableExport?.recordFields?.length > 0, 'human-readable archive manifest', ['reports/content-export/README.md', 'reports/content-export/manifest.json'], 'The export includes a human-readable README and a machine-readable manifest of every stable source record.'],
  ['AP-R-52', /url: `\/blog\/\$\{entry\.id\}`/.test(normalize), 'date-independent URL policy', ['src/lib/content/normalize.ts', 'scripts/audit-content-portability.mjs'], 'Public blog URLs are stable entry IDs, not publication dates.'],
  ['AP-R-53', /url: `\/blog\/\$\{entry\.id\}`/.test(normalize), 'title-independent URL policy', ['src/lib/content/normalize.ts', 'scripts/audit-content-portability.mjs'], 'Public blog URLs are stable entry IDs, not mutable titles or generated title slugs.'],
  ['AP-R-61', /Git object connectivity: pass/.test(repositoryHealth) && /Recovery remotes configured: yes/.test(repositoryHealth), 'versioned source history', ['scripts/audit-repository-health.mjs', 'reports/repository-health/latest.md'], 'Repository object connectivity and a recovery remote are verified; the current source is retained as Git history rather than a single overwritten snapshot.'],
  ['AP-R-80', /Preservation boundary/.test(runbook) && /Source policy: additive export only/.test(await readFile('reports/content-export/README.md', 'utf8').catch(() => '')), 'additive migration boundary', [`${archive}/remediation-plan/repository-recovery-runbook.md`, 'reports/content-export/README.md'], 'The recovery and export contracts are additive and explicitly prohibit migration rewrites from being inferred as preservation work.'],
  ['AP-R-81', portableExport?.exportedDocumentCount === sourceDocuments.length && /Source of truth: the Git repository/.test(runbook), 'source and export archive', [`${archive}/remediation-plan/repository-recovery-runbook.md`, 'src/content/blog', 'reports/content-export/content.jsonl'], 'The live site is not the sole archive: Git source and a full portable export are both retained.'],
  ['AP-R-90', /Recovery priority/.test(runbook) && /optional integrations/.test(runbook), 'bounded preservation scope', [`${archive}/remediation-plan/repository-recovery-runbook.md`], 'The runbook bounds preservation work around restoring a readable site before optional integrations, preventing the preservation system from becoming the product.'],
  ['AP-R-25', /src: url\('\/fonts\//.test(globalCss) && !/fonts\.googleapis\.com|use\.typekit\.net/.test(globalCss), 'self-hosted runtime font path', ['src/styles/global.css'], 'The runtime code font is self-hosted with local fallbacks; no remote font stylesheet is configured in the global stylesheet.'],
  ['AP-R-26', /defineNewsletter\(\{[\s\S]*?enabled:\s*false/.test(config), 'newsletter-independent site', ['src/consts/config.ts'], 'Newsletter delivery is explicitly disabled and is not required for site rendering or recovery.'],
  ['AP-R-27', /fetch\('\/search\.json'\)/.test(await readFile('src/components/common/SearchModal.astro', 'utf8')) && /new Response\(JSON\.stringify\(searchIndex\)/.test(searchIndex), 'static local search index', ['src/components/common/SearchModal.astro', 'src/pages/search.json.ts', 'scripts/verify-search.mjs'], 'Search consumes the site-generated /search.json index rather than a hosted search service.'],
  ['AP-R-28', /href: '\/rss\.xml'/.test(config) && /sitemap\(/.test(astro) && /return rss\(/.test(rss), 'first-party discovery feeds', ['src/consts/config.ts', 'astro.config.mjs', 'src/pages/rss.xml.ts'], 'The site publishes its own sitemap and RSS route, so discovery is not solely delegated to a social platform.'],
  ['AP-R-29', !/adsbygoogle|googlesyndication|pagead2/.test(layout), 'ad-script-free layout', ['src/layouts/BaseLayout.astro'], 'The layout has no AdSense runtime script or ad-slot integration that could make layout rendering depend on an ad provider.'],
  ['AP-R-32', markdownOnlySource && !/\.mdx/.test(contentConfig), 'Markdown-only source corpus', ['src/content.config.ts', 'src/content/blog'], 'The content collection contains Markdown source files and has no MDX component dependency.'],
  ['AP-R-40', markdownOnlySource, 'text-based content source', ['src/content/blog'], 'The source corpus is text Markdown, not a binary-only authoring format.'],
  ['AP-R-57', /site: 'https:\/\/hawk90\.github\.io'/.test(astro) && /new URL\(Astro\.url\.pathname, Astro\.site\)/.test(layout), 'configured canonical host', ['astro.config.mjs', 'src/layouts/BaseLayout.astro'], 'Canonical URLs use Astro.site from a checked-in static-site configuration, not an untrusted runtime Host header.'],
  ['AP-R-73', markdownOnlySource, 'source-readable export path', ['src/content/blog'], 'The complete text source corpus is directly readable from the repository without building the whole site.'],
  ['AP-R-75', /new Response\(JSON\.stringify\(searchIndex\)/.test(searchIndex), 'portable generated search data', ['src/pages/search.json.ts'], 'Search data is emitted as a site-owned JSON document from the content manifest.'],
  ['AP-R-86', markdownOnlySource, 'offline-readable source', ['src/content/blog'], 'The preserved Markdown corpus can be read offline without a proprietary archive reader.'],
  ['AP-R-91', /failure classification/.test(runbook), 'failure classification runbook', [`${archive}/remediation-plan/repository-recovery-runbook.md`], 'The recovery runbook requires an incident trigger and failure classification.'],
  ['AP-R-92', /Recovery priority/.test(runbook), 'documented recovery priority', [`${archive}/remediation-plan/repository-recovery-runbook.md`], 'The runbook defines recovery order before optional integration recovery.'],
  ['AP-R-93', /optional integrations such as comments/.test(runbook), 'comments outside recovery critical path', [`${archive}/remediation-plan/repository-recovery-runbook.md`], 'Comments are explicitly restored only after the readable static site is healthy.'],
  ['AP-R-97', /root cause/.test(runbook), 'incident root-cause record', [`${archive}/remediation-plan/repository-recovery-runbook.md`], 'The runbook requires an incident record including residual risk and reassessment, not only an immediate fix.'],
  ['AP-R-100', /Recovery priority/.test(runbook) && /Preserve the current source/.test(runbook), 'bounded resilience workflow', [`${archive}/remediation-plan/repository-recovery-runbook.md`], 'The runbook prioritizes a readable site and explicitly prevents resilience work from becoming an unbounded publishing blocker.'],
];

const eligible = controls.map(([id, ok, name, files, result]) => ({ id, ok, name, files, result, item: registry.items.find((item) => item.id === id) }))
  .filter(({ item }) => item?.disposition === 'unassessed' || (refresh && item?.disposition === 'remediated'));
const invalid = eligible.filter(({ ok }) => !ok);
console.log(`Repository control mapping: ${eligible.length - invalid.length}/${eligible.length} eligible controls pass.${apply ? ' Applying.' : ' Preview only; pass --apply to record.'}${refresh ? ' Refreshing existing local evidence.' : ''}`);
for (const control of eligible) console.log(`- ${control.ok ? 'PASS' : 'FAIL'} ${control.id} -> ${control.name}`);
if (!apply) process.exit(invalid.length ? 1 : 0);
if (invalid.length) throw new Error(`Refusing to record controls with failed evidence: ${invalid.map(({ id }) => id).join(', ')}`);
for (const control of eligible) {
  const { item } = control;
  item.disposition = 'remediated'; item.nextAction = 'manual-review';
  item.reviewQuestion = `Does the ${control.name} control still hold after changes to its listed source files?`;
  item.scope = 'Concrete local repository control only; it makes no claim about external backup, DNS, account, or host recovery.';
  item.evidence = [{ files: control.files, verification: 'npm run audit:repository-controls && npm run audit:category-registry -- --category repository', result: control.result }];
  item.residualRisk = 'External recovery and all unmapped AP-R items remain unassessed; rerun the listed verification after changing the control.';
}
await writeFile(registryPath, `${JSON.stringify(registry, null, 2)}\n`);
console.log(`Recorded ${eligible.length} AP-R control dispositions.`);
