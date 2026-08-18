#!/usr/bin/env node
// Repairs malformed and accidental tag spellings. Preview by default; --apply
// is required. Frontmatter tags only: no body, no other field, no file moves.
//
// Two rules, both narrow on purpose.
//
//   1. Whitespace in a tag is a defect. A tag is a URL segment, so `Secure Boot`
//      publishes /tags/secure%20boot. It is merged only onto a spelling that
//      already exists in the site's settled shape; inventing "Secure-Boot"
//      would just add a third variant, and the mechanical result is sometimes
//      worse than the original ("Async I/O" would become "Async-I/O").
//   2. A spelling used in at most FEW files whose concept-mate is used far more
//      is a typo, not a choice. Merge it into the dominant spelling.
//
// Widely-used variants are left alone even when a concept is split across two
// URLs. `C++` (290 files) versus `cpp` and `RISC-V` versus `riscv` are decisions
// about what a tag should be called, and a majority count answers them badly: it
// would rewrite a trademarked name into a form nothing else uses. Those, and the
// whitespace tags with no conventional target, stay in the audit for a human.
//
// Case-only differences are out of scope: src/lib/posts.ts lowercases the route
// and matches case-insensitively, so they are already one page.

import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import yaml from 'js-yaml';

const contentRoot = 'src/content/blog';
const apply = process.argv.includes('--apply');
const FEW = 3;          // a spelling this rare is accidental
const DOMINANCE = 3;    // its mate must be at least this many times as common

async function walk(dir, out = []) {
  for (const entry of (await readdir(dir, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
    const file = join(dir, entry.name);
    if (entry.isDirectory()) await walk(file, out);
    else if (entry.isFile() && file.endsWith('.md')) out.push(file);
  }
  return out;
}

const conceptKey = (value) => value.toLowerCase().replace(/\+\+/g, 'pp').replace(/#/g, 'sharp').replace(/[\s_\-.]+/g, '');
// The site's settled tag shape: lowercase, no whitespace, no slash. Merging onto
// anything else just trades one odd spelling for another ("Code Smells" would
// become "CodeSmells" purely because that variant happened to exist once).
const CONVENTIONAL = /^[a-z0-9][a-z0-9+._-]*$/;

const files = await walk(contentRoot);
const docs = [];
const fileCount = new Map(); // spelling -> number of files using it

for (const file of files) {
  const raw = await readFile(file, 'utf8');
  const match = raw.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!match) continue;
  let data = {};
  try { data = yaml.load(match[1]) ?? {}; } catch { continue; }
  const tags = Array.isArray(data.tags) ? data.tags.map(String) : [];
  if (!tags.length) continue;
  docs.push({ file, raw, frontmatter: match[1], tags });
  for (const tag of new Set(tags)) fileCount.set(tag, (fileCount.get(tag) ?? 0) + 1);
}

const merges = new Map();   // losing spelling -> winning spelling
const reasons = new Map();
const left = [];
const malformed = [];

// Rule 1 — whitespace is malformed, but only merge onto a spelling that already
// exists. Inventing a hyphenated name creates a tag nothing else uses, and the
// mechanical result is often worse than the original ("Async I/O" would become
// "Async-I/O", still unusable in a URL). Those are reported, not rewritten.
for (const [tag] of fileCount) {
  if (!/\s/.test(tag)) continue;
  const concept = conceptKey(tag);
  const existing = [...fileCount.entries()]
    .filter(([other]) => other !== tag && conceptKey(other) === concept && CONVENTIONAL.test(other))
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
  if (!existing) { malformed.push(tag); continue; }
  merges.set(tag, existing[0]);
  reasons.set(tag, `whitespace, merged into existing "${existing[0]}" (${existing[1]} files)`);
}

// Rule 2 — a rare spelling beside a much more common mate is a typo.
const byConcept = new Map();
for (const [tag, count] of fileCount) {
  const concept = conceptKey(tag);
  if (!byConcept.has(concept)) byConcept.set(concept, []);
  byConcept.get(concept).push({ tag, count });
}
for (const [, variants] of byConcept) {
  const spellings = variants.filter(({ tag }) => !merges.has(tag));
  if (spellings.length < 2) continue;
  const ranked = spellings.sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
  const [winner, ...rest] = ranked;
  // Case-only differences already share a URL; leave them to the runtime.
  if (ranked.every(({ tag }) => tag.toLowerCase() === winner.tag.toLowerCase())) continue;
  let touched = false;
  for (const loser of rest) {
    if (loser.tag.toLowerCase() === winner.tag.toLowerCase()) continue;
    if (loser.count <= FEW && winner.count >= loser.count * DOMINANCE) {
      merges.set(loser.tag, winner.tag);
      reasons.set(loser.tag, `used in ${loser.count} file(s) beside ${winner.count}`);
      touched = true;
    }
  }
  if (!touched && rest.some(({ tag }) => tag.toLowerCase() !== winner.tag.toLowerCase())) left.push(ranked);
}

const edits = [];
for (const doc of docs) {
  const changed = [...new Set(doc.tags.filter((tag) => merges.has(tag)))];
  if (!changed.length) continue;
  const seen = new Set();
  const next = [];
  for (const tag of doc.tags) {
    const value = merges.get(tag) ?? tag;
    if (seen.has(value)) continue; // a merge can collapse two tags into one
    seen.add(value);
    next.push(value);
  }
  edits.push({ ...doc, changed, next });
}

console.log(`Tag repair: ${merges.size} spelling(s) across ${edits.length} file(s); ${apply ? 'applying.' : 'preview only; pass --apply to write.'}\n`);
for (const [from, to] of [...merges].sort((a, b) => a[1].localeCompare(b[1]) || a[0].localeCompare(b[0]))) {
  console.log(`  "${from}" → "${to}"   (${reasons.get(from)})`);
}
if (malformed.length) {
  console.log(`\n  Malformed but left alone — no existing spelling to merge onto (${malformed.length}):`);
  for (const tag of malformed.sort()) console.log(`    "${tag}" (${fileCount.get(tag)} files)`);
}
if (left.length) {
  console.log(`\n  Left for review — naming decisions, not defects (${left.length}):`);
  for (const ranked of left) console.log(`    ${ranked.map(({ tag, count }) => `"${tag}" (${count})`).join(' · ')}`);
}
if (!apply) {
  console.log(`\n  Files that would change (${edits.length}):`);
  for (const { file, changed } of edits.slice(0, 25)) console.log(`    ${relative('.', file)} — ${changed.join(', ')}`);
  if (edits.length > 25) console.log(`    … +${edits.length - 25} more`);
  process.exit(0);
}

let written = 0;
for (const { file, raw, frontmatter, next } of edits) {
  const line = `tags: [${next.map((tag) => (/[:#,[\]{}"']/.test(tag) ? JSON.stringify(tag) : tag)).join(', ')}]`;
  const updated = frontmatter.replace(/^tags:.*(?:\n[ \t]+-.*)*$/m, line);
  if (updated === frontmatter) { console.error(`  ! could not rewrite tags in ${relative('.', file)}`); continue; }
  await writeFile(file, raw.replace(frontmatter, updated));
  written++;
}
console.log(`\nRewrote tags in ${written} file(s). Re-run npm run audit:tags to verify.`);
