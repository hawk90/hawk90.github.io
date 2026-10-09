#!/usr/bin/env node
// Release gate: every executable inline <script> in dist/ must be allowed by
// its own page's CSP through a SHA-256 hash.
//
// src/lib/csp-inline-script-hashes.mjs adds those hashes at astro:build:done.
// If that integration is dropped from astro.config, or a page loses its CSP
// meta, the site still builds and still works — inline scripts simply run
// under 'unsafe-inline' again, and nothing visible changes. This reads the
// built HTML independently and fails when:
//   - a page has executable inline scripts but no CSP meta, or
//   - an inline script's hash is missing from that page's script-src.
import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

const DIST = 'dist';
const CSP_META = /<meta http-equiv="Content-Security-Policy" content="([^"]*)"/;
const INLINE_SCRIPT = /<script(\s[^>]*)?>([\s\S]*?)<\/script>/g;
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
  const inline = [...html.matchAll(INLINE_SCRIPT)].filter(([, attrs = '']) => {
    if (/\ssrc=/.test(attrs)) return false;
    const type = (/\stype="([^"]*)"/.exec(attrs)?.[1] ?? '').toLowerCase();
    return EXECUTABLE_TYPES.has(type);
  });
  if (inline.length === 0) continue;
  pages++;

  const page = relative(DIST, file);
  const csp = CSP_META.exec(html)?.[1];
  if (!csp) {
    failures.push(`${page}: ${inline.length} inline script(s) and no CSP meta`);
    continue;
  }
  const scriptSrc = csp.split(';').map((d) => d.trim()).find((d) => d.startsWith('script-src ')) ?? '';
  for (const [, , body] of inline) {
    scripts++;
    const hash = `'sha256-${createHash('sha256').update(body, 'utf8').digest('base64')}'`;
    if (!scriptSrc.includes(hash)) {
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
