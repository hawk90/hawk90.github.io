#!/usr/bin/env node
// Release gate: every executable inline <script> in dist/ must be allowed by
// its own page's CSP through a SHA-256 hash.
//
// src/lib/csp-inline-script-hashes.mjs adds those hashes at astro:build:done.
// If that integration is dropped from astro.config, or a page loses its CSP
// meta, the site still builds and still works — inline scripts simply run
// under 'unsafe-inline' again, and nothing visible changes. This reads the
// built HTML independently (its own parse, not the integration's code) and
// fails when:
//   - a page has executable inline scripts but no CSP meta, or
//   - an inline script's hash is missing from that page's script-src.
//
// HTML is read with parse5 (via cheerio) so tag case, `</script >` and
// entities are treated the way a browser treats them.
import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { load } from 'cheerio';

const DIST = 'dist';
const EXECUTABLE_TYPES = new Set(['', 'module', 'text/javascript', 'application/javascript']);

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

let pages = 0;
let scripts = 0;
/** @type {string[]} */
const failures = [];

for await (const file of htmlFiles(DIST)) {
  const html = await readFile(file, 'utf8');
  if (!/<script/i.test(html)) continue;
  const $ = load(html);

  const inline = $('script')
    .toArray()
    .filter((el) => el.attribs.src === undefined)
    .filter((el) => EXECUTABLE_TYPES.has((el.attribs.type ?? '').trim().toLowerCase()))
    .map((el) => el.children.map((child) => ('data' in child ? child.data : '')).join(''));
  if (inline.length === 0) continue;
  pages++;

  const page = relative(DIST, file);
  const csp = $('meta')
    .toArray()
    .find((el) => (el.attribs['http-equiv'] ?? '').toLowerCase() === 'content-security-policy')
    ?.attribs.content;
  if (!csp) {
    failures.push(`${page}: ${inline.length} inline script(s) and no CSP meta`);
    continue;
  }
  const scriptSrc = new Set(
    (csp.split(';').map((d) => d.trim()).find((d) => /^script-src\s/i.test(d)) ?? '').split(/\s+/),
  );
  for (const body of inline) {
    scripts++;
    const hash = `'sha256-${createHash('sha256').update(body, 'utf8').digest('base64')}'`;
    if (!scriptSrc.has(hash)) {
      failures.push(`${page}: inline script not in script-src (${body.trim().slice(0, 60)}…)`);
    }
  }
}

console.log(`CSP inline scripts: ${scripts} script(s) across ${pages} page(s), ${failures.length} failure(s).`);
if (failures.length) {
  for (const f of failures.slice(0, 20)) console.log(`  ✗ ${f}`);
  if (failures.length > 20) console.log(`  … and ${failures.length - 20} more`);
  process.exit(1);
}
