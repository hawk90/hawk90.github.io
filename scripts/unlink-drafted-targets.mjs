#!/usr/bin/env node
/**
 * Turns links that point at drafted posts back into plain text.
 *
 * Published posts still link posts that were later drafted. The target file is
 * on disk, so `audit:links` calls the link fine — it resolves by file
 * existence — but no page is built for a draft, so the reader gets a 404. The
 * rendered-link audit sees it because it reads `dist/`, not the source tree.
 *
 * The link text is kept and only the link is removed:
 *
 *   [Effective Modern C++](/blog/…/item01-…) 시리즈를 권한다
 *   → Effective Modern C++ 시리즈를 권한다
 *
 * Deleting the sentence or the bullet would throw away an editorial pointer
 * the author wrote deliberately; the series still exists, it is simply not
 * published. Publishing those posts again is the other way to fix this, and
 * that is the owner's call, not a script's — so this takes the reversible
 * half.
 *
 * Preview by default; --apply is required. Reports every file and every link
 * it would touch, re-checks that each target really is drafted, and is
 * idempotent — once a link is text there is nothing left to match.
 *
 * Usage: node scripts/unlink-drafted-targets.mjs [--apply]
 */
import { readFile, writeFile, readdir, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const apply = process.argv.includes('--apply');
const ROOT = 'src/content/blog';

async function walk(dir, out = []) {
  for (const entry of (await readdir(dir, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) await walk(path, out);
    else if (entry.name.endsWith('.md')) out.push(path);
  }
  return out;
}

const frontmatter = (text) => text.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? '';
const isDraft = (text) => /^draft:\s*true\s*$/m.test(frontmatter(text));
const routeOf = (file, text) => {
  const slug = frontmatter(text).match(/^slug:\s*(.+)$/m);
  if (slug) return slug[1].trim().replace(/^['"]|['"]$/g, '');
  return file.slice(`${ROOT}/`.length, -'.md'.length).replace(/\/index$/, '');
};

const files = await walk(ROOT);
const drafted = new Set();
const texts = new Map();

for (const file of files) {
  const text = await readFile(file, 'utf8');
  texts.set(file, text);
  if (isDraft(text)) drafted.add(routeOf(file, text));
}

const planned = [];
for (const file of files) {
  const text = texts.get(file);
  if (isDraft(text)) continue;   // a draft linking a draft breaks nobody today

  const removed = [];
  const next = text.replace(/\[([^\]\n]+)\]\((\/blog\/[^)\s#]+)\)/g, (whole, label, href) => {
    const target = href.replace(/\/+$/, '').slice('/blog/'.length);
    if (!drafted.has(target)) return whole;
    removed.push({ label, target });
    return label;
  });

  if (removed.length) planned.push({ file, next, removed });
}

const linkCount = planned.reduce((sum, entry) => sum + entry.removed.length, 0);
const byTarget = new Map();
for (const entry of planned) {
  for (const link of entry.removed) byTarget.set(link.target, (byTarget.get(link.target) ?? 0) + 1);
}

await mkdir('reports/drafted-targets', { recursive: true });
await writeFile('reports/drafted-targets/latest.md', [
  '# Links to drafted posts',
  '',
  `- Published files to edit: ${planned.length}`,
  `- Links to unlink: ${linkCount}`,
  `- Distinct drafted targets: ${byTarget.size}`,
  '',
  '## Targets',
  ...[...byTarget].sort((a, b) => b[1] - a[1]).map(([target, count]) => `- \`${target}\` — ${count} link(s)`),
  '',
  '## Files',
  ...planned.flatMap((entry) => [
    '',
    `### \`${entry.file}\``,
    ...entry.removed.map((link) => `- \`[${link.label}]\` → \`/blog/${link.target}\``),
  ]),
  '',
].join('\n'));

console.log(`Links to drafted posts: ${linkCount} across ${planned.length} published file(s), ${byTarget.size} distinct target(s).`);
for (const [target, count] of [...byTarget].sort((a, b) => b[1] - a[1]).slice(0, 5)) {
  console.log(`  ${count} → /blog/${target}`);
}
if (byTarget.size > 5) console.log(`  … ${byTarget.size - 5} more target(s) (reports/drafted-targets/latest.md)`);

if (!apply) {
  console.log('Preview only; pass --apply to write.');
} else {
  for (const entry of planned) await writeFile(entry.file, entry.next);
  console.log(`Unlinked ${linkCount} link(s) in ${planned.length} file(s). Publishing the targets restores them.`);
}
