#!/usr/bin/env node
// Rewrites tag spellings that cannot make a clean URL. Preview by default;
// --apply is required. Frontmatter tags only: no body, no other field.
//
// A tag is a URL segment. src/pages/tags/[tag] routes on tag.toLowerCase(), so
// `Secure Boot` publishes /tags/secure%20boot and `Async I/O` splits the path in
// two. Rather than reject the commit, normalize what the author meant: the
// intent is unambiguous and the repair is mechanical.
//
// Two steps, in order:
//   1. Canonicalize — lowercase, turn separators into hyphens, collapse repeats.
//   2. Snap to the corpus — if an existing spelling already means the same
//      thing, use that one instead of introducing a near-duplicate. This is what
//      turns `Async I/O` into the existing `async-io` rather than `async-i-o`.
//
// Only malformed spellings are touched. A tag that already makes a clean URL is
// left exactly as written, so `C++`, `RISC-V`, and `QEMU` keep their casing.

import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import yaml from 'js-yaml';

const contentRoot = 'src/content/blog';
const apply = process.argv.includes('--apply');
const quiet = process.argv.includes('--quiet');
const targets = process.argv.slice(2).filter((arg) => !arg.startsWith('--') && arg.endsWith('.md'));

// Whitespace percent-encodes; a slash breaks the segment into two.
const MALFORMED = /[\s/]/;
const conceptKey = (value) => value.toLowerCase().replace(/\+\+/g, 'pp').replace(/#/g, 'sharp').replace(/[\s/_\-.]+/g, '');

function canonical(tag) {
  return tag
    .trim()
    .toLowerCase()
    // "I/O" is one word, not two. Without this, Direct I/O becomes direct-i-o
    // while the corpus already spells the same shape block-io.
    .replace(/\bi\/o\b/g, 'io')
    .replace(/[\s/_]+/g, '-')
    // Drop what a URL segment cannot carry cleanly: `&` opens a query parameter
    // and an apostrophe has to be percent-encoded. "Tell Don't Ask" becomes
    // tell-dont-ask, not tell-don't-ask.
    .replace(/[^a-z0-9+._-]/g, '')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '');
}

async function walk(dir, out = []) {
  for (const entry of (await readdir(dir, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
    const file = join(dir, entry.name);
    if (entry.isDirectory()) await walk(file, out);
    else if (entry.isFile() && file.endsWith('.md')) out.push(file);
  }
  return out;
}

async function readDoc(file) {
  let raw;
  try { raw = await readFile(file, 'utf8'); } catch { return null; }
  const match = raw.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!match) return null;
  let data;
  try { data = yaml.load(match[1]) ?? {}; } catch { return null; }
  const tags = Array.isArray(data.tags) ? data.tags.map(String) : [];
  return { file, raw, frontmatter: match[1], tags };
}

// The whole corpus supplies the vocabulary to snap onto, even when only a few
// staged files are being rewritten.
const corpus = new Map(); // conceptKey -> [{ tag, count }]
for (const file of await walk(contentRoot)) {
  const doc = await readDoc(file);
  if (!doc) continue;
  for (const tag of new Set(doc.tags)) {
    if (MALFORMED.test(tag)) continue; // a malformed tag is never a snap target
    const key = conceptKey(tag);
    if (!corpus.has(key)) corpus.set(key, new Map());
    const counts = corpus.get(key);
    counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }
}
// Prefer an existing spelling, but only one already in the site's settled shape.
// Snapping onto a stray variant would trade one odd tag for another: the sole
// concept-mate of `Code Smells` is `CodeSmells`, used once.
const SETTLED = /^[a-z0-9][a-z0-9+._-]*$/;
function snap(candidate) {
  const counts = corpus.get(conceptKey(candidate));
  if (!counts) return candidate;
  const ranked = [...counts.entries()]
    .filter(([tag]) => SETTLED.test(tag))
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  return ranked.length ? ranked[0][0] : candidate;
}

const files = targets.length ? targets : await walk(contentRoot);
const edits = [];
for (const file of files) {
  const doc = await readDoc(file);
  if (!doc || !doc.tags.length) continue;
  const changes = [];
  const seen = new Set();
  const next = [];
  for (const tag of doc.tags) {
    const value = MALFORMED.test(tag) ? snap(canonical(tag)) : tag;
    if (value !== tag) changes.push([tag, value]);
    if (seen.has(value)) continue; // normalization can collapse two tags into one
    seen.add(value);
    next.push(value);
  }
  if (changes.length) edits.push({ ...doc, changes, next });
}

const distinct = new Map();
for (const { changes } of edits) for (const [from, to] of changes) distinct.set(from, to);

if (!quiet || edits.length) {
  console.log(`Tag shape: ${distinct.size} spelling(s) across ${edits.length} file(s); ${apply ? 'normalizing.' : 'preview only; pass --apply to write.'}`);
  for (const [from, to] of [...distinct].sort((a, b) => a[0].localeCompare(b[0]))) console.log(`  ${JSON.stringify(from)} → ${JSON.stringify(to)}`);
}
if (!apply) {
  for (const { file } of edits.slice(0, 20)) console.log(`    ${relative('.', file)}`);
  if (edits.length > 20) console.log(`    … +${edits.length - 20} more`);
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
if (written) console.log(`Normalized tags in ${written} file(s).`);
