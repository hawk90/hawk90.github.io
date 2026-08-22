#!/usr/bin/env node
// Every segment inside a post URL has to resolve.
//
// `/blog/tools/debugging/postmortem/chapter01-core-generation` is a post.
// Trim it back — which readers do, and crawlers do while walking up from a deep
// link — and you ask for `/blog/tools/debugging/postmortem`, a folder name that
// was never a page. There were 28 of these, and between them they sat inside
// the URL of every published post.
//
// This check exists because the fix was removed once and nothing noticed. No
// page links these addresses, so `audit:rendered-links` cannot see them: it
// follows hrefs, and there are none. They are not in the sitemap either. The
// only thing that knows they should resolve is the shape of the URLs
// themselves, which is what this reads.
//
// Usage:
//   node scripts/audit-url-prefixes.mjs [--dir dist]

import { readdir } from 'node:fs/promises';
import { join, relative } from 'node:path';

const dirArg = process.argv.indexOf('--dir');
const root = dirArg === -1 ? 'dist' : process.argv[dirArg + 1];

/** @param {string} dir @returns {Promise<string[]>} */
async function pages(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const file = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await pages(file));
    else if (entry.name === 'index.html') out.push(`/${relative(root, dir).replace(/\\/g, '/')}`);
  }
  return out;
}

const built = new Set(await pages(join(root, 'blog')));

// Every prefix strictly between /blog and the page itself.
const prefixes = new Map();
for (const url of built) {
  const segments = url.split('/').filter(Boolean);
  for (let i = 2; i < segments.length; i++) {
    const prefix = `/${segments.slice(0, i).join('/')}`;
    if (!prefixes.has(prefix)) prefixes.set(prefix, []);
    prefixes.get(prefix).push(url);
  }
}

const dead = [...prefixes.entries()].filter(([prefix]) => !built.has(prefix)).sort();

if (!dead.length) {
  console.log(`URL prefixes: ${prefixes.size} intermediate segment(s) across ${built.size} page(s), 0 dead.`);
  process.exit(0);
}

const covered = new Set(dead.flatMap(([, urls]) => urls));
console.error(`URL prefixes: ${dead.length} segment(s) inside post URLs resolve to nothing.`);
console.error(`They sit inside ${covered.size} of the ${built.size} built page(s).\n`);
for (const [prefix, urls] of dead.slice(0, 30)) {
  console.error(`  ${prefix}  — inside ${urls.length} URL(s), e.g. ${urls[0]}`);
}
if (dead.length > 30) console.error(`  +${dead.length - 30} more`);
console.error('\nThe category route builds a redirect at each of these; see getDeadUrlPrefixes in src/lib/posts.ts.');
process.exit(1);
