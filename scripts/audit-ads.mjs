#!/usr/bin/env node
// Release gate: how AdSense appears in the built site (dist/).
//
// Fails when:
//   - an adsbygoogle.js script is not async, sits outside <head>, appears more
//     than once on a page, or uses a publisher ID other than public/ads.txt's;
//   - the layout reserves an ad slot (<ins class="adsbygoogle">) — Auto ads
//     place units themselves, and a static slot is what makes an ad failure
//     visible as broken layout (AP-R-29);
//   - an /admin page loads ad code (a GitHub token is typed there) or any page
//     with ad code lacks the ads CSP, or a page without ad code carries it;
//   - ad code ships while the ClientRouter is on: a swap discards the body's
//     ads without a rescan, and a meta CSP persists across swaps (ads policy
//     and ad code would follow the reader into /admin);
//   - the google-adsense-account meta disagrees with ads.txt.
import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { load } from 'cheerio';

const DIST = 'dist';

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

const adsTxt = await readFile(join(DIST, 'ads.txt'), 'utf8');
const publisher = /google\.com,\s*(pub-\d{16}),\s*DIRECT/i.exec(adsTxt)?.[1];
/** @type {string[]} */
const failures = [];
if (!publisher) failures.push('ads.txt: no "google.com, pub-…, DIRECT" line');
const client = publisher ? `ca-${publisher}` : null;

let pages = 0;
let adPages = 0;
let routerPages = 0;

for await (const file of htmlFiles(DIST)) {
  const html = await readFile(file, 'utf8');
  const page = relative(DIST, file);
  const $ = load(html);
  pages++;

  const adScripts = $('script[src*="adsbygoogle.js"]').toArray();
  const csp = $('meta[http-equiv="Content-Security-Policy" i]').first();
  const adsPolicy = csp.is('[data-csp-ads]');
  if ($('meta[name="astro-view-transitions-enabled"]').length) routerPages++;

  if (adScripts.length) {
    adPages++;
    if (adScripts.length > 1) failures.push(`${page}: ${adScripts.length} adsbygoogle.js scripts`);
    for (const el of adScripts) {
      if (el.attribs.async === undefined) failures.push(`${page}: adsbygoogle.js is not async`);
      if ($(el).closest('head').length === 0) failures.push(`${page}: adsbygoogle.js outside <head>`);
      const src = new URL(el.attribs.src, 'https://example.invalid');
      if (client && src.searchParams.get('client') !== client) {
        failures.push(`${page}: adsbygoogle.js client=${src.searchParams.get('client')} but ads.txt says ${client}`);
      }
    }
    if (page.startsWith('admin/')) failures.push(`${page}: ad code on an admin page`);
    if (!adsPolicy) failures.push(`${page}: ad code without the ads CSP (data-csp-ads)`);
  } else if (adsPolicy) {
    failures.push(`${page}: ads CSP on a page without ad code`);
  }

  if ($('ins.adsbygoogle').length) failures.push(`${page}: static ad slot <ins class="adsbygoogle">`);

  const account = $('meta[name="google-adsense-account"]').attr('content');
  if (account !== undefined && client && account !== client) {
    failures.push(`${page}: google-adsense-account=${account} but ads.txt says ${client}`);
  }
}

if (adPages && routerPages) {
  failures.push(`ad code ships on ${adPages} page(s) while ${routerPages} page(s) enable the ClientRouter`);
}

console.log(
  `Ads: ${adPages} of ${pages} page(s) load AdSense (publisher ${publisher ?? 'none'}); ` +
    `${routerPages} ClientRouter page(s); ${failures.length} failure(s).`,
);
if (failures.length) {
  for (const f of failures.slice(0, 20)) console.log(`  ✗ ${f}`);
  if (failures.length > 20) console.log(`  … and ${failures.length - 20} more`);
  process.exit(1);
}
