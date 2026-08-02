#!/usr/bin/env node
// Static regression checks for quality controls that do not require a browser.
import { mkdir, readFile, writeFile } from 'node:fs/promises';

const files = Object.fromEntries(await Promise.all([
  ['searchModal', 'src/components/common/SearchModal.astro'],
  ['searchPage', 'src/pages/search.json.ts'],
  ['schema', 'src/content.config.ts'],
  ['lifecycle', 'scripts/audit-content-lifecycle.mjs'],
  ['hubs', 'src/lib/content/hubs.ts'],
  ['curation', 'src/lib/content/curation.ts'],
  ['globalCss', 'src/styles/global.css'],
  ['package', 'package.json'],
  ['astroConfig', 'astro.config.mjs'],
  ['og', 'scripts/build-og.mjs'],
  ['release', 'scripts/verify-release.mjs'],
  ['secrets', 'scripts/scan-secrets.mjs'],
  ['ciSecurity', 'scripts/audit-ci-security.mjs'],
  ['adminGate', 'scripts/security-admin-gate.mjs'],
  ['internalLinks', 'scripts/audit-internal-links.py'],
  ['linkResolver', 'scripts/resolve-internal-links.py'],
  ['search', 'scripts/verify-search.mjs'],
].map(async ([key, path]) => [key, await readFile(path, 'utf8')])));

const checks = [
  ['search-empty-state', /data-search-empty/.test(files.searchModal) && /noResultsMessage/.test(files.searchModal) && /showMessage\(i18n\.emptyMessage\)/.test(files.searchModal)],
  ['search-error-state', /MAX_RETRIES/.test(files.searchModal) && /showMessage\(i18n\.errorMessage\)/.test(files.searchModal) && /catch \(e\)/.test(files.searchModal)],
  ['search-publication-filter', /\.filter\(\(document\) => getPublicationDecision\(document\)\.search\)/.test(files.searchPage)],
  ['search-canonical-id', /slug: document\.id/.test(files.searchPage) && /encodeURI\(item\.slug\)/.test(files.searchModal)],
  ['verification-separate-from-updated', /updated: z\.coerce\.date\(\)\.optional\(\)/.test(files.schema) && /lastVerified: z\.coerce\.date\(\)\.optional\(\)/.test(files.schema) && /data\.lastVerified/.test(files.lifecycle)],
  ['published-hub-draft-guard', /if \(!hub\.isPublished\) continue/.test(files.hubs) && /getPublicationDecision\(document\)\.render/.test(files.hubs) && /assertTopicHubIntegrity\(manifest\)/.test(files.curation)],
  ['search-escape-close', /case 'Escape'/.test(files.searchModal) && /closeModal\(\)/.test(files.searchModal)],
  ['reduced-motion-contract', /prefers-reduced-motion: reduce/.test(files.searchModal) && /prefers-reduced-motion: reduce/.test(files.globalCss)],
  ['preview-production-contract', /"preview":\s*"astro preview"/.test(files.package) && /output:\s*'static'/.test(files.astroConfig)],
  ['og-failure-is-fatal', /main\(\)\.catch\(\(err\) =>/.test(files.og) && /process\.exit\(1\)/.test(files.og)],
  ['dependency-audit-is-layered', /gate:dependencies/.test(files.release) && /test:search/.test(files.release) && /gate:classification/.test(files.release)],
  ['content-secret-scan', /const roots = \['src\/content', 'public', 'dist'\]/.test(files.secrets) && /gate:secrets/.test(files.release)],
  ['admin-artifact-boundary', /gate:security-admin/.test(files.release) && /--artifact/.test(files.release) && /Static deployment/.test(files.adminGate)],
  ['workflow-security-contract', /immutable GitHub Actions pins/.test(files.ciSecurity) && /permissions/.test(files.ciSecurity) && /verify:release/.test(files.ciSecurity)],
  ['filesystem-link-resolution', /def check_page\(/.test(files.internalLinks) && /is_file\(\)/.test(files.internalLinks) && !/requests\./.test(files.internalLinks)],
  ['code-fence-link-exclusion', /in_fence/.test(files.internalLinks) && /if in_fence/.test(files.internalLinks)],
  ['reference-link-resolution', /REFERENCE_DEF/.test(files.internalLinks) && /TEXT_REFERENCE/.test(files.internalLinks) && /definitions\.get/.test(files.internalLinks)],
  ['deterministic-link-repair', /AMBIG/.test(files.linkResolver) && /unresolved \+= 1/.test(files.linkResolver) && /allow_strip/.test(files.linkResolver) && !/nearest title/i.test(files.linkResolver)],
  ['search-ranking-regression', /PASS ranking precedence/.test(files.search) && /PASS combined query and series filter/.test(files.search)],
  ['search-corpus-regression', /pcie-series-2/.test(files.search) && /pcie-description/.test(files.search) && /pcie-tag/.test(files.search)],
];
const findings = checks.filter(([, ok]) => !ok).map(([name]) => name);
await mkdir('reports/quality', { recursive: true });
await writeFile('reports/quality/contracts.md', ['# Static quality contract audit', '', `- Checks: ${checks.length}`, `- Findings: ${findings.length}`, ...checks.map(([name, ok]) => `- ${ok ? 'PASS' : 'FAIL'} ${name}`), '', '> Static checks complement runtime, browser, editorial, and accessibility testing; they do not replace them.'].join('\n'));
console.log(`Quality contracts: ${checks.length - findings.length}/${checks.length} pass; ${findings.length} finding(s).`);
if (findings.length) process.exitCode = 1;
