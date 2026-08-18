#!/usr/bin/env node
/**
 * Repairs mismatched frontmatter quotes in the Agile & Lean series.
 *
 * 153 of its 156 files carry the same defect: `description` opens with a
 * double quote and closes with a single one, and `series` opens with a single
 * quote and closes with a double one.
 *
 *   description: "…실무에 즉시 적용할 수 있는 cookbook.'
 *   series: 'Agile & Lean Software Engineering"
 *
 * The current parser tolerates it; js-yaml 5 does not, which is how it
 * surfaced — dependabot's bump failed the classification gate on
 * `deficient indentation`, and the bump was not the cause. The three
 * unaffected files show the intended shape, so this rewrites the other 153 to
 * match: both values double-quoted, contents untouched.
 *
 * Preview by default; --apply is required. Reports every file it would touch,
 * verifies each result parses, and is idempotent — a second run finds nothing.
 */
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import * as yaml from 'js-yaml';

const apply = process.argv.includes('--apply');
const dir = 'src/content/blog/programming/engineering/agile-lean-engineering';

const DESCRIPTION = /^(description:\s*)"([\s\S]*?)'$/m;
const SERIES = /^(series:\s*)'([^"\n]*)"$/m;

const planned = [];
const skipped = [];

for (const name of (await readdir(dir)).sort()) {
  if (!name.endsWith('.md')) continue;
  const path = join(dir, name);
  const text = await readFile(path, 'utf8');
  const match = text.match(/^(---\n)([\s\S]*?)(\n---)/);
  if (!match) { skipped.push([name, 'no frontmatter']); continue; }

  const [, open, frontmatter, close] = match;
  let fixed = frontmatter;
  const changes = [];
  if (DESCRIPTION.test(fixed)) {
    fixed = fixed.replace(DESCRIPTION, (_m, key, value) => `${key}"${value}"`);
    changes.push('description');
  }
  if (SERIES.test(fixed)) {
    fixed = fixed.replace(SERIES, (_m, key, value) => `${key}"${value}"`);
    changes.push('series');
  }
  if (!changes.length) { skipped.push([name, 'already well-formed']); continue; }

  // A repair that does not parse is not a repair.
  try {
    yaml.load(fixed);
  } catch (error) {
    skipped.push([name, `still unparseable after fix: ${error.reason ?? error.message}`]);
    continue;
  }
  planned.push([path, text.replace(match[0], `${open}${fixed}${close}`), changes]);
}

console.log(`Agile frontmatter quotes: ${planned.length} file(s) to fix, ${skipped.length} skipped.`);
for (const [path, , changes] of planned.slice(0, 5)) console.log(`  ${path} — ${changes.join(', ')}`);
if (planned.length > 5) console.log(`  … ${planned.length - 5} more`);
for (const [name, why] of skipped) console.log(`  skip ${name}: ${why}`);

if (!apply) {
  console.log('Preview only; pass --apply to write.');
  process.exit(0);
}

for (const [path, next] of planned) await writeFile(path, next);
console.log(`Rewrote ${planned.length} file(s).`);
