#!/usr/bin/env node
/**
 * Fails when a link on a built page points at a page that was not built.
 *
 * Two audits already look at links and both miss this. `audit:links` reads
 * markdown bodies, so it never sees an href a template produced — and it
 * resolves a link by checking the source file exists, which a drafted post
 * still does. `audit:reading` looks at rendered HTML but asks whether a link
 * has an accessible name, not whether it goes anywhere.
 *
 * Between them sits the thing a reader actually experiences: clicking and
 * getting a 404. Two live examples this was written for —
 *
 *   - every post links all of its tags, but tag pages are only generated for
 *     tags carried by two or more posts, so the singleton tags 404;
 *   - published posts still link posts that were later drafted, and the file
 *     is still on disk, so the markdown-level audit calls them fine.
 *
 * Neither is visible from the source tree. Both are obvious from `dist/`.
 *
 * Resolution mirrors how a static host serves the directory: `/a/b` is served
 * by `dist/a/b/index.html`, or `dist/a/b.html`, or a file at that exact path.
 * Query strings and fragments are stripped; fragments are `audit:anchors`'s
 * job. External and non-http schemes are ignored.
 *
 * Usage: node scripts/audit-rendered-links.mjs [--json] [--limit N]
 */
import { readFile, readdir, mkdir, writeFile, access } from 'node:fs/promises';
import { join } from 'node:path';

const asJson = process.argv.includes('--json');
const limitArg = process.argv.indexOf('--limit');
const limit = limitArg === -1 ? 25 : Number(process.argv[limitArg + 1]);
const DIST = 'dist';

async function walk(dir, out = []) {
  let entries;
  try { entries = await readdir(dir, { withFileTypes: true }); } catch { return out; }
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) await walk(path, out);
    else if (entry.name.endsWith('.html')) out.push(path);
  }
  return out;
}

const exists = (path) => access(path).then(() => true, () => false);

/** Everything a static host would try for one path, in the order it tries. */
async function resolves(pathname) {
  const clean = pathname.replace(/\/+$/, '');
  if (clean === '') return exists(join(DIST, 'index.html'));
  const decoded = (() => { try { return decodeURIComponent(clean); } catch { return clean; } })();
  for (const candidate of new Set([clean, decoded])) {
    const base = join(DIST, candidate);
    if (await exists(join(base, 'index.html'))) return true;
    if (await exists(`${base}.html`)) return true;
    if (await exists(base)) return true;
  }
  return false;
}

const pages = await walk(DIST);
const targets = new Map();   // pathname -> Set of pages linking to it

for (const page of pages) {
  const html = await readFile(page, 'utf8');
  for (const match of html.matchAll(/\shref="([^"]+)"/g)) {
    const raw = match[1];
    // Same-page anchors, external hosts, and non-navigational schemes are
    // somebody else's problem; only site-absolute paths are ours.
    if (!raw.startsWith('/') || raw.startsWith('//')) continue;
    const pathname = raw.split('#')[0].split('?')[0];
    if (!pathname) continue;
    if (!targets.has(pathname)) targets.set(pathname, new Set());
    targets.get(pathname).add(page.slice(`${DIST}/`.length));
  }
}

const broken = [];
for (const [pathname, sources] of [...targets].sort()) {
  if (await resolves(pathname)) continue;
  broken.push({ pathname, count: sources.size, sample: [...sources].slice(0, 3) });
}
broken.sort((a, b) => b.count - a.count || a.pathname.localeCompare(b.pathname));

const totalPages = broken.reduce((sum, entry) => sum + entry.count, 0);

await mkdir('reports/rendered-links', { recursive: true });
await writeFile('reports/rendered-links/latest.md', [
  '# Rendered link audit',
  '',
  `- Pages scanned: ${pages.length}`,
  `- Distinct internal targets: ${targets.size}`,
  `- Targets that do not resolve: ${broken.length}`,
  '',
  ...(broken.length ? ['## Broken targets', '', '| target | linked from |', '|---|---|',
    ...broken.map((entry) => `| \`${entry.pathname}\` | ${entry.count} |`)] : ['No broken internal links.']),
  '',
].join('\n'));

if (asJson) {
  console.log(JSON.stringify({ pages: pages.length, targets: targets.size, broken }, null, 2));
} else {
  console.log(`Rendered links: ${broken.length} unresolved target(s) across ${pages.length} built page(s).`);
  for (const entry of broken.slice(0, limit)) {
    console.log(`  ${entry.pathname} — linked from ${entry.count} page(s), e.g. ${entry.sample[0]}`);
  }
  if (broken.length > limit) console.log(`  … ${broken.length - limit} more (reports/rendered-links/latest.md)`);
  if (broken.length) console.log(`  ${totalPages} link instance(s) total.`);
}

if (broken.length) process.exitCode = 1;
