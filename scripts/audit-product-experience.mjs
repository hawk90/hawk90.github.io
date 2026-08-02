#!/usr/bin/env node
// Guards shared UX recovery paths and the explicit analytics/observability boundary.

import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

const files = {
  layout: await readFile('src/layouts/BaseLayout.astro', 'utf8'),
  notFound: await readFile('src/pages/404.astro', 'utf8'),
  config: await readFile('src/consts/config.ts', 'utf8'),
};
const findings = [];
const requireMarker = (name, source, marker, detail) => {
  if (!source.includes(marker)) findings.push({ name, detail });
};

async function* walk(directory) {
  for (const entry of (await readdir(directory, { withFileTypes: true })).sort((left, right) => left.name.localeCompare(right.name))) {
    const file = join(directory, entry.name);
    if (entry.isDirectory()) yield* walk(file);
    else if (entry.isFile() && entry.name.endsWith('.astro')) yield file;
  }
}

requireMarker('skip-navigation', files.layout, 'href="#main-content"', 'The shared layout must expose a skip link to the main content.');
requireMarker('main-landmark', files.layout, '<main id="main-content"', 'The shared layout must expose the skip-link target as its main landmark.');
requireMarker('global-search', files.layout, '<SearchModal />', 'The shared layout must provide the global search recovery path.');
requireMarker('not-found-noindex', files.notFound, 'noIndex={true}', 'The not-found page must stay out of search indexes.');
requireMarker('not-found-recovery', files.notFound, 'data-search-trigger', 'The not-found page must offer search as a recovery path.');

const analyticsDisabled = /ANALYTICS_CONFIG\s*=\s*defineAnalytics\(\{\s*enabled:\s*false,?\s*}\)/s.test(files.config);
const analyticsProvider = files.config.match(/ANALYTICS_CONFIG\s*=\s*defineAnalytics\(\{\s*enabled:\s*true,\s*provider:\s*'([^']+)'/s)?.[1] ?? null;
if (!analyticsDisabled && !analyticsProvider) {
  findings.push({ name: 'analytics-boundary', detail: 'Analytics must be explicitly disabled or declare a supported provider.' });
}
if (analyticsProvider && !files.layout.includes(`ANALYTICS_CONFIG.provider === '${analyticsProvider}'`)) {
  findings.push({ name: 'analytics-provider', detail: `Configured provider "${analyticsProvider}" has no corresponding layout integration.` });
}

const pageContracts = [];
for await (const file of walk('src/pages')) {
  const source = await readFile(file, 'utf8');
  const route = relative('src/pages', file);
  const isRedirect = /http-equiv="refresh"/.test(source);
  const usesLayout = /import\s+BaseLayout\s+from\s+['"][^'"]+BaseLayout\.astro['"]/.test(source)
    && /<BaseLayout\b/.test(source);
  const hasTitle = /<BaseLayout\b[\s\S]*?\btitle=/.test(source);
  const safeRedirect = isRedirect
    && /<meta\s+name="robots"\s+content="noindex"/.test(source)
    && /<link\s+rel="canonical"/.test(source)
    && /<a\s+href=/.test(source);
  pageContracts.push({ route, kind: isRedirect ? 'redirect' : 'document', usesLayout, hasTitle, safeRedirect });
  if (!isRedirect && !usesLayout) findings.push({ name: 'page-layout', route, detail: 'Document page routes must use the shared BaseLayout.' });
  if (!isRedirect && !hasTitle) findings.push({ name: 'page-title', route, detail: 'Document page routes must provide a page title to BaseLayout.' });
  if (isRedirect && !safeRedirect) findings.push({ name: 'redirect-safety', route, detail: 'Redirect routes must be noindex, canonicalized, and include a manual fallback link.' });
}

const report = {
  analytics: analyticsDisabled ? { enabled: false, provider: null } : { enabled: true, provider: analyticsProvider },
  pages: {
    total: pageContracts.length,
    documents: pageContracts.filter(({ kind }) => kind === 'document').length,
    redirects: pageContracts.filter(({ kind }) => kind === 'redirect').length,
    layoutCoverage: pageContracts.filter(({ kind, usesLayout }) => kind === 'document' && usesLayout).length,
    titleCoverage: pageContracts.filter(({ kind, hasTitle }) => kind === 'document' && hasTitle).length,
  },
  checks: [
    'skip-navigation',
    'main-landmark',
    'global-search',
    'not-found-noindex',
    'not-found-recovery',
    'analytics-boundary',
    'analytics-provider',
    'page-layout',
    'page-title',
    'redirect-safety',
  ].map((name) => ({ name, passed: !findings.some((finding) => finding.name === name) })),
  findings,
};

await mkdir('reports/product-experience', { recursive: true });
await Promise.all([
  writeFile('reports/product-experience/latest.json', `${JSON.stringify(report, null, 2)}\n`),
  writeFile('reports/product-experience/latest.md', [
    '# Product experience audit',
    '',
    `- Analytics: ${report.analytics.enabled ? `enabled (${report.analytics.provider})` : 'disabled by explicit configuration'}`,
    `- Document route layout coverage: ${report.pages.layoutCoverage}/${report.pages.documents}`,
    `- Document route title coverage: ${report.pages.titleCoverage}/${report.pages.documents}`,
    `- Redirect routes with separate safety contract: ${report.pages.redirects}`,
    `- Shared experience checks: ${report.checks.filter(({ passed }) => passed).length}/${report.checks.length} passed`,
    `- Blocking findings: ${findings.length}`,
    '',
    ...findings.map(({ name, detail }) => `- ${name}: ${detail}`),
  ].join('\n')),
]);

console.log(`Product experience audit: ${report.checks.length - findings.length}/${report.checks.length} checks passed; analytics ${report.analytics.enabled ? 'enabled' : 'explicitly disabled'}.`);
console.log('Report: reports/product-experience/latest.md');
if (findings.length) process.exitCode = 1;
