#!/usr/bin/env node
// Checks that every built page is a well-formed HTML document at the top:
// a doctype, then `<html>`, with nothing in between.
//
// Why this exists. In an `.astro` file the template body is markup, not code,
// so a `/* ... */` block placed there is not a comment — it is literal text,
// and it lands in the output. Dropped above `<BaseLayout>` it serialises
// between the doctype and `<html>`, where the HTML parser's "before html"
// insertion mode reacts to a non-whitespace character by opening `<html>`,
// `<head>` and `<body>` early. The comment then shows up as text at the top of
// the page and everything the author wrote inside `<head>` is parsed in the
// body instead.
//
// Nothing else in the release gate could see it. `astro check` type-checks the
// frontmatter and reports zero errors, because the stray text is valid markup.
// The build succeeds for the same reason. `audit:reading` inspects headings,
// tables and alt text inside the body, and `audit:rendered-links` only follows
// hrefs — both walk a DOM the parser has already repaired, so the damage is
// invisible by the time they look. This check reads the bytes instead.
//
// Usage:
//   node scripts/audit-document-prologue.mjs [--dir dist]

import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

const dirArg = process.argv.indexOf('--dir');
const root = dirArg === -1 ? 'dist' : process.argv[dirArg + 1];

/** @param {string} dir @returns {Promise<string[]>} */
async function htmlFiles(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const file = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await htmlFiles(file));
    else if (entry.name.endsWith('.html')) out.push(file);
  }
  return out;
}

const files = await htmlFiles(root);
const findings = [];

for (const file of files) {
  const html = await readFile(file, 'utf8');
  const page = `/${relative(root, file).replace(/index\.html$/, '').replace(/\\/g, '/')}`;

  // Search Console verification files carry a `.html` extension but must
  // contain exactly the token Google issued — adding a doctype invalidates
  // them. Matched on content, not just the name, so an actual page called
  // google*.html would still be checked.
  if (/^google-site-verification:\s*\S+\.html\s*$/.test(html)) continue;

  const doctype = html.match(/^﻿?\s*<!DOCTYPE html>/i);
  if (!doctype) {
    findings.push({ page, problem: 'does not start with <!DOCTYPE html>', sample: html.slice(0, 80) });
    continue;
  }

  // Everything between the doctype and the root element must be whitespace or
  // an HTML comment. Anything else is content the parser will relocate.
  const after = html.slice(doctype[0].length);
  const stray = after.replace(/<!--[\s\S]*?-->/g, '').match(/^([\s\S]*?)<html[\s>]/i);
  if (!stray) {
    findings.push({ page, problem: 'no <html> element follows the doctype', sample: after.slice(0, 80) });
    continue;
  }
  if (stray[1].trim()) {
    findings.push({
      page,
      problem: `${stray[1].trim().length} character(s) of stray content between the doctype and <html>`,
      sample: stray[1].trim().slice(0, 120),
    });
  }
}

if (!findings.length) {
  console.log(`Document prologue: ${files.length} built page(s), 0 with stray content before <html>.`);
  process.exit(0);
}

// Group by sample: one authoring mistake usually reaches every page a route
// builds, and listing 11 identical findings hides how many distinct causes
// there are.
const bySample = new Map();
for (const finding of findings) {
  const key = `${finding.problem}\n${finding.sample}`;
  if (!bySample.has(key)) bySample.set(key, []);
  bySample.get(key).push(finding.page);
}

console.error(`Document prologue: ${findings.length} page(s) across ${bySample.size} distinct cause(s).\n`);
for (const [key, pages] of bySample) {
  const [problem, sample] = key.split('\n');
  console.error(`  ${problem} — ${pages.length} page(s)`);
  console.error(`    ${pages.slice(0, 5).join(', ')}${pages.length > 5 ? `, +${pages.length - 5} more` : ''}`);
  console.error(`    starts: ${JSON.stringify(sample)}\n`);
}
console.error('In .astro files the template body is markup: use `{/* ... */}` there, or move the note into the frontmatter.');
process.exit(1);
