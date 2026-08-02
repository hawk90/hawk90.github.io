#!/usr/bin/env node
// Regression checks for generated RSS and sitemap distribution boundaries.
import { readFile, writeFile, mkdir } from 'node:fs/promises';

const [rssSource, publication, astro] = await Promise.all([
  readFile('src/pages/rss.xml.ts', 'utf8'),
  readFile('src/lib/content/publication.ts', 'utf8'),
  readFile('astro.config.mjs', 'utf8'),
]);
const checks = [
  ['rss-publication-filter', /\.filter\(\(document\) => getPublicationDecision\(document\)\.rss\)/.test(rssSource) && /const render = document\.status === 'published'/.test(publication)],
  ['sitemap-admin-exclusion', /sitemap\(\{/.test(astro) && /!page\.includes\('\/admin'\)/.test(astro)],
];
let sitemapDuplicateFindings = [];
try {
  const xml = await readFile('dist/sitemap-0.xml', 'utf8');
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(([, url]) => url);
  sitemapDuplicateFindings = urls.filter((url, i) => urls.indexOf(url) !== i);
  checks.push(['built-sitemap-unique', sitemapDuplicateFindings.length === 0 && urls.length > 0]);
} catch {
  checks.push(['built-sitemap-unique', false]);
}
const findings = checks.filter(([, ok]) => !ok).map(([name]) => name);
await mkdir('reports/quality', { recursive: true });
await writeFile('reports/quality/distribution-feeds.md', ['# Distribution feed audit', '', `- Checks: ${checks.length}`, `- Findings: ${findings.length}`, ...checks.map(([name, ok]) => `- ${ok ? 'PASS' : 'FAIL'} ${name}`), ...(sitemapDuplicateFindings.length ? ['', `- Duplicate sitemap URLs: ${sitemapDuplicateFindings.join(', ')}`] : [])].join('\n'));
console.log(`Distribution feeds: ${checks.length - findings.length}/${checks.length} pass; ${findings.length} finding(s).`);
if (findings.length) process.exitCode = 1;
