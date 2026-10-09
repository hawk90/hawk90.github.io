#!/usr/bin/env node
// Gate: a claim already proven wrong must not appear in a published post.
//
// data/known-falsehoods.yaml lists strings a fact-check round confirmed false
// against a primary source. The same error tends to live in more than one
// series — CXL Ch 4 dropped "Coherency Domain ID" while Bootloader Ch 35 kept
// it — so each fix is recorded once and enforced everywhere.
//
// Code blocks are scanned too: invented lspci lines and Kconfig symbols live
// there. A match inside double quotes is skipped; that is how a "흔한 오해"
// heading quotes the wrong claim in order to refute it.
//
// Usage:
//   node scripts/audit-known-falsehoods.mjs                  # published posts
//   node scripts/audit-known-falsehoods.mjs <file|dir>...    # given paths
//   node scripts/audit-known-falsehoods.mjs --include-drafts
// Exit: 0 = clean, 1 = known falsehood found, 2 = bad input.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import * as yaml from 'js-yaml';

const REGISTRY = 'data/known-falsehoods.yaml';
const args = process.argv.slice(2);
const includeDrafts = args.includes('--include-drafts');
const targets = args.filter((arg) => !arg.startsWith('--'));
if (!targets.length) targets.push('src/content/blog');

const entries = /** @type {any[]} */ (yaml.load(readFileSync(REGISTRY, 'utf8')) ?? []);
/** @type {{ id: string, re: RegExp, correction: string }[]} */
const rules = [];
for (const entry of entries) {
  for (const key of ['id', 'pattern', 'correction', 'source', 'fixed_in']) {
    if (typeof entry?.[key] !== 'string' || !entry[key].trim()) {
      console.error(`✗ ${REGISTRY}: entry ${entry?.id ?? '?'} is missing "${key}"`);
      process.exit(2);
    }
  }
  rules.push({ id: entry.id, re: new RegExp(entry.pattern, 'g'), correction: entry.correction });
}

/** @param {string} path @returns {string[]} */
function markdownFiles(path) {
  if (!existsSync(path)) {
    console.error(`✗ 경로 없음: ${path} (검사 0건을 통과로 보고하지 않도록 중단)`);
    process.exit(2);
  }
  if (statSync(path).isFile()) return path.endsWith('.md') ? [path] : [];
  return readdirSync(path, { recursive: true, encoding: 'utf8' })
    .filter((name) => name.endsWith('.md'))
    .map((name) => join(path, name));
}

/** True when `index` sits between a pair of straight or curly double quotes. */
function insideQuotes(line, index) {
  const before = line.slice(0, index);
  const straight = (before.match(/"/g) ?? []).length;
  const opened = (before.match(/“/g) ?? []).length - (before.match(/”/g) ?? []).length;
  return straight % 2 === 1 || opened > 0;
}

const files = [...new Set(targets.flatMap(markdownFiles))].sort();
/** @type {string[]} */
const hits = [];
let scanned = 0;
for (const file of files) {
  const text = readFileSync(file, 'utf8');
  const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
  if (!includeDrafts && frontmatter && /^draft:\s*true\s*$/m.test(frontmatter[1])) continue;
  scanned++;
  const bodyStart = frontmatter ? frontmatter[0].split('\n').length : 0;
  const lines = text.split('\n');
  for (let i = bodyStart; i < lines.length; i++) {
    for (const rule of rules) {
      for (const match of lines[i].matchAll(rule.re)) {
        if (insideQuotes(lines[i], match.index)) continue;
        hits.push(`${relative('.', file)}:${i + 1}  [${rule.id}] "${match[0]}" — ${rule.correction}`);
      }
    }
  }
}

console.log(`Known falsehoods: ${rules.length} rule(s) over ${scanned} post(s); ${hits.length} hit(s).`);
if (hits.length) {
  for (const hit of hits) console.log(`  ✗ ${hit}`);
  console.log(`  출처·처음 고친 커밋은 ${REGISTRY} 참조.`);
  process.exit(1);
}
