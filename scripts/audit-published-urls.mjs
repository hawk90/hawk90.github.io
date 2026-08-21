#!/usr/bin/env node
// Fails the release when a URL that was published stops resolving.
//
// `slug:` being required means a post cannot lose its URL by having the field
// deleted. Nothing yet checks that the value stays the same. Edit a published
// post's slug, move a file whose slug was never frozen, flip `draft: true`, or
// break the route that builds it, and the old URL simply stops existing — no
// error, no redirect, and no signal until someone follows a link from outside
// the site, which is exactly where the links this protects come from.
//
// So the published set is written down. data/published-urls.json is the record
// of what this site has told the world exists; the build has to keep agreeing
// with it. Adding URLs is free — publishing is meant to happen. Removing one is
// the operation that needs a decision, so it cannot happen by accident:
// retiring a URL means listing it under `retired` with where it now goes, and a
// page has to exist there to send the reader on.
//
// Checked in both directions, because they fail differently: a URL in the
// manifest but not in the build is a URL that disappeared, and a published post
// whose URL is not in the build is a route that stopped generating it.
//
// Usage:
//   node scripts/audit-published-urls.mjs            # check (release gate)
//   node scripts/audit-published-urls.mjs --record   # fold newly published URLs in

import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

const argv = process.argv.slice(2);
const record = argv.includes('--record');
const MANIFEST = 'data/published-urls.json';
const CONTENT = 'src/content/blog';
const DIST = 'dist';

/** @param {string} dir @param {RegExp} match @returns {Promise<string[]>} */
async function filesUnder(dir, match) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const file = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await filesUnder(file, match));
    else if (match.test(entry.name)) out.push(file);
  }
  return out;
}

// What the content says is published, by the same rule the site uses: the URL
// is `slug:`, and `draft: true` means no page.
const published = new Set();
for (const file of await filesUnder(CONTENT, /\.md$/)) {
  const frontmatter = (await readFile(file, 'utf8')).match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1];
  if (!frontmatter || /^draft:\s*true\s*$/m.test(frontmatter)) continue;
  const slug = frontmatter.match(/^slug:\s*(.+)$/m)?.[1]?.trim().replace(/^["']|["']$/g, '')
    ?? relative(CONTENT, file).replace(/\.md$/, '').replace(/\\/g, '/');
  published.add(`/blog/${slug}`);
}

// What the build actually produced.
const built = new Set(
  (await filesUnder(DIST, /^index\.html$/))
    .map((file) => `/${relative(DIST, file).replace(/index\.html$/, '').replace(/\\/g, '/').replace(/\/$/, '')}`),
);

let manifest;
try {
  manifest = JSON.parse(await readFile(MANIFEST, 'utf8'));
} catch {
  manifest = { note: 'URLs this site has published. See scripts/audit-published-urls.mjs.', urls: [], retired: [] };
}
const recorded = new Set(manifest.urls);
const retired = new Map((manifest.retired ?? []).map((entry) => [entry.url, entry]));

const findings = [];

// 1. A recorded URL that the build no longer produces. Retiring it is allowed,
//    but only deliberately and only if something still answers at that address.
for (const url of recorded) {
  if (built.has(url)) continue;
  const entry = retired.get(url);
  if (!entry) { findings.push({ kind: 'vanished', url }); continue; }
  if (!built.has(url)) findings.push({ kind: 'retired-without-page', url, to: entry.redirectsTo });
}

// 2. A published post the build did not generate — the route, not the content.
for (const url of published) {
  if (!built.has(url)) findings.push({ kind: 'not-built', url });
}

// 3. Newly published, not yet recorded. Not a failure; this is what --record is for.
const fresh = [...published].filter((url) => !recorded.has(url) && !retired.has(url)).sort();

console.log(
  `Published URLs: ${recorded.size} recorded, ${published.size} published in content, ` +
  `${built.size} built page(s), ${retired.size} retired.`,
);

if (findings.length) {
  const byKind = { vanished: [], 'retired-without-page': [], 'not-built': [] };
  for (const finding of findings) byKind[finding.kind].push(finding);
  const explain = {
    vanished: 'recorded as published, but the build produces no page at this URL. A slug edit, a moved file, a flip to draft, or a deleted post. Restore it, or retire it explicitly in the manifest with a redirect.',
    'retired-without-page': 'listed as retired, but nothing is served at the old URL, so it is a 404 rather than a redirect.',
    'not-built': 'the content says this post is published, but the route generated no page for it.',
  };
  for (const [kind, list] of Object.entries(byKind)) {
    if (!list.length) continue;
    console.error(`\n  ${kind} — ${list.length}`);
    console.error(`    ${explain[kind]}`);
    for (const finding of list.slice(0, 15)) console.error(`      ${finding.url}${finding.to ? ` -> ${finding.to}` : ''}`);
    if (list.length > 15) console.error(`      +${list.length - 15} more`);
  }
  console.error(`\n${findings.length} published URL(s) no longer resolve.`);
  process.exit(1);
}

if (!record) {
  if (fresh.length) {
    console.log(`\n  ${fresh.length} newly published URL(s) not yet recorded — run with --record:`);
    for (const url of fresh.slice(0, 10)) console.log(`      ${url}`);
    if (fresh.length > 10) console.log(`      +${fresh.length - 10} more`);
  }
  console.log(`\nNo published URL has disappeared.`);
  process.exit(0);
}

manifest.urls = [...new Set([...recorded, ...published])].sort();
manifest.retired ??= [];
await writeFile(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`\nRecorded ${fresh.length} new URL(s); manifest holds ${manifest.urls.length}.`);

// Post-change verification, and idempotency: a second --record finds nothing new.
const written = JSON.parse(await readFile(MANIFEST, 'utf8'));
const stillMissing = [...published].filter((url) => !written.urls.includes(url));
if (stillMissing.length) {
  console.error(`  ! ${stillMissing.length} published URL(s) did not land in the manifest`);
  process.exitCode = 1;
} else {
  console.log(`Verified: all ${published.size} published URL(s) recorded, ${written.urls.length} total.`);
}
