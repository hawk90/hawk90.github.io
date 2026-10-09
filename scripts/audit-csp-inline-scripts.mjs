#!/usr/bin/env node
// Release gate: inline <script>s in dist/ must be allowed by CSP hashes, on the
// page itself and across ClientRouter navigations.
//
// src/lib/csp-inline-script-hashes.mjs adds the hashes at astro:build:done. If
// that integration is dropped, or its output is wrong, the site still builds —
// so this reads the built HTML independently (parse5 via cheerio, a different
// parser from the integration's htmlparser2) and fails when:
//   - a page has executable inline scripts but no CSP meta in <head>, more than
//     one CSP meta, or a script-src-elem directive (not handled by the tooling);
//   - an inline script's hash is missing from its page's script-src;
//   - the shared list grows past MAX_SHARED_HASHES (an inline script that
//     embeds per-page data would add a hash per page to every page's <head>);
//   - ClientRouter pages disagree on script-src. A meta CSP stays in force
//     after the router swaps the <head>, so the first page's policy also
//     governs every page navigated to; per-page hash lists then block the next
//     page's inline scripts. Identical script-src everywhere avoids that.
import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { load } from 'cheerio';
import { EXECUTABLE_SCRIPT_TYPES } from '../src/lib/csp-inline-script-hashes.mjs';

const DIST = 'dist';
// Today there are 9. A jump far past this means some inline script varies per
// page and the shared list is turning into per-page bloat.
const MAX_SHARED_HASHES = 50;

/**
 * @param {string} dir
 * @returns {AsyncGenerator<string>}
 */
async function* htmlFiles(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* htmlFiles(path);
    else if (entry.name.endsWith('.html')) yield path;
  }
}

/** @param {string} body */
const hashOf = (body) => `'sha256-${createHash('sha256').update(body, 'utf8').digest('base64')}'`;

let pages = 0;
let scripts = 0;
/** @type {string[]} */
const failures = [];
/** @type {Map<string, string[]>} script-src (normalised) → ClientRouter pages using it */
const routerPolicies = new Map();

for await (const file of htmlFiles(DIST)) {
  const html = await readFile(file, 'utf8');
  if (!/<script|content-security-policy/i.test(html)) continue;
  const $ = load(html);
  const router = $('meta[name="astro-view-transitions-enabled"]').length > 0;

  const inline = $('script')
    .toArray()
    .filter((el) => el.attribs.src === undefined)
    .filter((el) => EXECUTABLE_SCRIPT_TYPES.has((el.attribs.type ?? '').split(';')[0].trim().toLowerCase()))
    .map((el) => el.children.map((child) => ('data' in child ? child.data : '')).join(''));
  // Router pages are checked even without inline scripts: they must still
  // carry the shared list, or their <meta> differs from the rest.
  if (inline.length === 0 && !router) continue;
  pages++;

  const page = relative(DIST, file);
  const metas = $('meta')
    .toArray()
    .filter((el) => (el.attribs['http-equiv'] ?? '').toLowerCase() === 'content-security-policy');
  if (metas.length !== 1 || $(metas[0]).closest('head').length === 0) {
    failures.push(`${page}: expected exactly one CSP meta in <head>, found ${metas.length}`);
    continue;
  }
  const directives = (metas[0].attribs.content ?? '').split(';').map((d) => d.trim());
  if (directives.some((d) => /^script-src-elem\s/i.test(d))) {
    failures.push(`${page}: script-src-elem is set; the hash tooling only maintains script-src`);
  }
  const scriptSrc = directives.find((d) => /^script-src\s/i.test(d)) ?? '';
  const sources = new Set(scriptSrc.split(/\s+/));

  for (const body of inline) {
    scripts++;
    if (!sources.has(hashOf(body))) {
      failures.push(`${page}: inline script not in script-src (${body.trim().slice(0, 60)}…)`);
    }
  }

  if (router) {
    const key = [...sources].sort().join(' ');
    routerPolicies.set(key, [...(routerPolicies.get(key) ?? []), page]);
  }
}

const sharedHashes = Math.max(
  0,
  ...[...routerPolicies.keys()].map((key) => key.split(' ').filter((s) => s.startsWith("'sha256-")).length),
);
if (sharedHashes > MAX_SHARED_HASHES) {
  failures.push(`ClientRouter script-src carries ${sharedHashes} hashes (limit ${MAX_SHARED_HASHES})`);
}

if (routerPolicies.size > 1) {
  const groups = [...routerPolicies.values()]
    .map((list) => `${list.length} page(s), e.g. ${list[0]}`)
    .join('; ');
  failures.push(`ClientRouter pages use ${routerPolicies.size} different script-src lists (${groups})`);
}

console.log(
  `CSP inline scripts: ${scripts} script(s) across ${pages} page(s); ` +
    `${routerPolicies.size} script-src list(s) on ClientRouter pages; ${failures.length} failure(s).`,
);
if (failures.length) {
  for (const f of failures.slice(0, 20)) console.log(`  ✗ ${f}`);
  if (failures.length > 20) console.log(`  … and ${failures.length - 20} more`);
  process.exit(1);
}
