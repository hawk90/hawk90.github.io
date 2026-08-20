#!/usr/bin/env node
// Folds alias tag spellings onto their canonical form, per data/tag-aliases.yaml.
// Preview by default; --apply is required to write. Frontmatter `tags:` only:
// no body, no other field.
//
// This is the half `normalize-tag-shape.mjs` deliberately does not do. That
// script repairs spellings that cannot make a clean URL and leaves well-formed
// ones exactly as written, which is why `C++`, `RISC-V` and `Makefile` all pass
// it untouched while still splitting their concept across two tag pages. Which
// of two well-formed spellings should win is an editorial call, so it is stated
// once in the dictionary and applied here rather than inferred.
//
// Runs over drafts too. 281 drafts carry `C++`; fixing only what renders today
// would let the split come back the moment they publish.
//
// Usage:
//   node scripts/merge-tag-aliases.mjs [--apply] [files…]
//   --apply    write the changes (otherwise preview only)
//   --quiet    print nothing when there is nothing to do
//   files…     limit to these .md files; defaults to the whole corpus

import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
// Namespace import, not default: js-yaml 5 drops the default export, and this
// form resolves under both 4 and 5.
import * as yaml from 'js-yaml';

const contentRoot = 'src/content/blog';
const dictionaryPath = 'data/tag-aliases.yaml';
const apply = process.argv.includes('--apply');
const quiet = process.argv.includes('--quiet');
const targets = process.argv.slice(2).filter((arg) => !arg.startsWith('--') && arg.endsWith('.md'));

// alias (lowercased) -> canonical spelling
const dictionary = yaml.load(await readFile(dictionaryPath, 'utf8')) ?? {};
const canonicalOf = new Map();
for (const [canonical, aliases] of Object.entries(dictionary.canonical ?? {})) {
  for (const alias of aliases ?? []) {
    const key = String(alias).toLowerCase();
    const existing = canonicalOf.get(key);
    if (existing && existing !== canonical) {
      // Two canonicals claiming one alias would make the result depend on file
      // order. Refuse rather than pick.
      console.error(`${dictionaryPath}: "${alias}" is claimed by both "${existing}" and "${canonical}".`);
      process.exit(1);
    }
    canonicalOf.set(key, canonical);
  }
  // A canonical that is also someone's alias would chain, and chains depend on
  // evaluation order. Keep the dictionary flat.
  if (canonicalOf.has(canonical.toLowerCase()) && canonicalOf.get(canonical.toLowerCase()) !== canonical) {
    console.error(`${dictionaryPath}: "${canonical}" is a canonical and an alias at once.`);
    process.exit(1);
  }
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
  if (!Array.isArray(data.tags)) return null;
  return { file, raw, frontmatter: match[1], tags: data.tags.map(String), draft: data.draft === true };
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
    const value = canonicalOf.get(tag.toLowerCase()) ?? tag;
    const key = value.toLowerCase();
    // Folding can collide with a tag the post already carries — the GNU Make
    // posts carry `make` and `Makefile` both — so drop the duplicate rather
    // than emit the same tag twice.
    if (seen.has(key)) {
      changes.push([tag, null]);
      continue;
    }
    if (value !== tag) changes.push([tag, value]);
    seen.add(key);
    next.push(value);
  }
  if (changes.length) edits.push({ ...doc, changes, next });
}

const distinct = new Map(); // "from → to" -> { files, published }
for (const { changes, draft } of edits) {
  for (const [from, to] of changes) {
    const label = to === null ? `${JSON.stringify(from)} → (dropped, already present)` : `${JSON.stringify(from)} → ${JSON.stringify(to)}`;
    const record = distinct.get(label) ?? { files: 0, published: 0 };
    record.files++;
    if (!draft) record.published++;
    distinct.set(label, record);
  }
}

if (!quiet || edits.length) {
  const publishedFiles = edits.filter((edit) => !edit.draft).length;
  console.log(
    `Tag aliases: ${distinct.size} fold(s) across ${edits.length} file(s) ` +
    `(${publishedFiles} published, ${edits.length - publishedFiles} draft); ` +
    `${apply ? 'applying.' : 'preview only; pass --apply to write.'}`,
  );
  for (const [label, record] of [...distinct].sort((a, b) => b[1].files - a[1].files || a[0].localeCompare(b[0]))) {
    console.log(`  ${label}  —  ${record.files} file(s), ${record.published} published`);
  }
}

if (!apply) {
  for (const { file, changes } of edits.slice(0, 15)) {
    console.log(`    ${relative('.', file)}: ${changes.map(([from, to]) => (to === null ? `-${from}` : `${from}→${to}`)).join(', ')}`);
  }
  if (edits.length > 15) console.log(`    … +${edits.length - 15} more`);
  process.exit(0);
}

let written = 0;
const failed = [];
for (const { file, raw, frontmatter, next } of edits) {
  const line = `tags: [${next.map((tag) => (/[:#,[\]{}"']/.test(tag) ? JSON.stringify(tag) : tag)).join(', ')}]`;
  const updated = frontmatter.replace(/^tags:.*(?:\n[ \t]+-.*)*$/m, line);
  if (updated === frontmatter) { failed.push(file); continue; }
  await writeFile(file, raw.replace(frontmatter, updated));
  written++;
}
for (const file of failed) console.error(`  ! could not rewrite tags in ${relative('.', file)}`);
console.log(`Folded tags in ${written} file(s).`);

// Post-change verification: the same pass must now find nothing. A fold that is
// not idempotent means the dictionary chains or the rewrite missed a file, and
// either way the next run would keep churning the corpus.
let residual = 0;
for (const file of files) {
  const doc = await readDoc(file);
  if (!doc) continue;
  if (doc.tags.some((tag) => canonicalOf.has(tag.toLowerCase()))) residual++;
}
if (residual) {
  console.error(`! ${residual} file(s) still carry an alias after applying — not idempotent.`);
  process.exitCode = 1;
} else {
  console.log('Verified: no alias spelling remains in the corpus.');
}
if (failed.length) process.exitCode = 1;
