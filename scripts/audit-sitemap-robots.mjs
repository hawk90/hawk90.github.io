#!/usr/bin/env node
// Fails when the sitemap and a page's own robots directive disagree.
//
// Submitting a noindex page for indexing is a contradiction: the sitemap asks a
// crawler to index it and the page tells the same crawler not to. The site has
// three kinds of noindex page — /random, the retired /topics/ hubs, and the
// series URL-prefix shims under /blog/ — and the sitemap integration cannot see
// any of them, because @astrojs/sitemap filters on the URL string before the
// HTML exists. The exclusion list in astro.config.mjs is therefore hand-kept,
// and hand-kept lists drift.
//
// The reverse direction matters too and is easier to get wrong: a page that is
// indexable, reachable, and simply absent from the sitemap. That is not checked
// here — the sitemap is generated from the built routes, so it cannot happen —
// but an *orphan* can: /recently-updated was built, sitemapped and linked from
// nowhere. `audit-rendered-links.mjs` sees links that go nowhere; this one sees
// pages nothing points at.
//
// Reads dist/, so it runs after the build.
//
// Usage: node scripts/audit-sitemap-robots.mjs [--json]

import { readdir, readFile, mkdir, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

const DIST = 'dist';
const asJson = process.argv.includes('--json');

async function walk(dir, out = []) {
  for (const entry of (await readdir(dir, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) await walk(path, out);
    else if (entry.name.endsWith('.html')) out.push(path);
  }
  return out;
}

/** The site-absolute path a built file answers to. */
function routeOf(file) {
  const rel = relative(DIST, file).split('\\').join('/');
  if (rel === 'index.html') return '/';
  if (rel.endsWith('/index.html')) return `/${rel.slice(0, -'index.html'.length)}`;
  return `/${rel}`;
}

const sitemapFiles = (await readdir(DIST)).filter((name) => /^sitemap-\d+\.xml$/.test(name));
const sitemapPaths = new Set();
for (const name of sitemapFiles) {
  const xml = await readFile(join(DIST, name), 'utf8');
  for (const match of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) {
    sitemapPaths.add(new URL(match[1]).pathname);
  }
}

const files = await walk(DIST);
const noindexInSitemap = [];
const indexablePages = new Set();
const linkTargets = new Set();

for (const file of files) {
  const html = await readFile(file, 'utf8');
  const route = routeOf(file);
  const robots = html.match(/<meta[^>]+name="robots"[^>]+content="([^"]*)"/i)?.[1] ?? '';
  const noindex = /noindex/i.test(robots);

  if (noindex && sitemapPaths.has(route)) noindexInSitemap.push(route);
  if (!noindex && sitemapPaths.has(route)) indexablePages.add(route);

  for (const match of html.matchAll(/\shref="([^"]+)"/g)) {
    const href = match[1];
    if (!href.startsWith('/') || href.startsWith('//')) continue;
    const path = href.split('#')[0].split('?')[0];
    if (!path) continue;
    linkTargets.add(path.endsWith('/') ? path : `${path}/`);
    linkTargets.add(path);
  }
}

// A page that is in the sitemap, indexable, and that nothing on the site links
// to. The homepage is reachable by definition; paginated tails are reached
// through their own pagination controls, which do appear as links.
const orphans = [...indexablePages]
  .filter((route) => route !== '/' && !linkTargets.has(route) && !linkTargets.has(route.replace(/\/$/, '')))
  .sort();

const findings = noindexInSitemap.length + orphans.length;

await mkdir('reports/sitemap', { recursive: true });
await writeFile('reports/sitemap/latest.md', [
  '# Sitemap vs. robots', '',
  `- Built pages: ${files.length}`,
  `- Sitemap entries: ${sitemapPaths.size}`,
  `- **noindex pages submitted for indexing: ${noindexInSitemap.length}**`,
  `- **Indexable, sitemapped, linked from nowhere: ${orphans.length}**`,
  '',
  ...(noindexInSitemap.length
    ? ['## noindex, but in the sitemap', '',
       'The page tells crawlers not to index it and the sitemap asks them to.',
       'Add the URL to the `filter` in `astro.config.mjs`.', '',
       ...noindexInSitemap.map((route) => `- \`${route}\``), '']
    : []),
  ...(orphans.length
    ? ['## Submitted for indexing, reachable from nowhere', '',
       'Built and crawlable, but no page on the site links to it — a reader can',
       'only arrive from search. Either link it or drop it from the sitemap.', '',
       ...orphans.map((route) => `- \`${route}\``), '']
    : []),
].join('\n'));

if (asJson) {
  console.log(JSON.stringify({ pages: files.length, sitemapEntries: sitemapPaths.size, noindexInSitemap, orphans }, null, 2));
} else {
  console.log(`Sitemap/robots: ${sitemapPaths.size} entries over ${files.length} built page(s); ${noindexInSitemap.length} noindex-but-submitted, ${orphans.length} orphan(s).`);
  for (const route of noindexInSitemap.slice(0, 10)) console.log(`  noindex in sitemap: ${route}`);
  if (noindexInSitemap.length > 10) console.log(`  … ${noindexInSitemap.length - 10} more (reports/sitemap/latest.md)`);
  for (const route of orphans.slice(0, 10)) console.log(`  orphan: ${route}`);
  if (orphans.length > 10) console.log(`  … ${orphans.length - 10} more (reports/sitemap/latest.md)`);
}

if (findings) process.exitCode = 1;
