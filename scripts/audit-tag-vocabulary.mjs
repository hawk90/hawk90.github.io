#!/usr/bin/env node
// Informational baseline for the tag vocabulary. Read-only: it never edits
// frontmatter and never proposes a merge as an automatic action.
//
// Every distinct tag generates a page under /tags/[tag], so a tag is a URL, not
// just a label. Two spellings of one concept are two pages splitting the same
// posts, and a tag used once is a page that lists a single article. Both are
// reported here so a normalization can be reviewed before anything is rewritten.

import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import yaml from 'js-yaml';

const contentRoot = 'src/content/blog';
const reportDir = 'reports/taxonomy';
const CORE_THRESHOLD = 10;

async function walk(dir, out = []) {
  for (const entry of (await readdir(dir, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
    const file = join(dir, entry.name);
    if (entry.isDirectory()) await walk(file, out);
    else if (entry.isFile() && file.endsWith('.md')) out.push(file);
  }
  return out;
}

// Folds the differences that make two spellings the same concept: letter case,
// separators, and the symbols that cannot appear in a URL segment anyway.
function normalize(tag) {
  return tag
    .toLowerCase()
    .replace(/\+\+/g, 'pp')
    .replace(/#/g, 'sharp')
    .replace(/[\s_\-.]+/g, '');
}

const files = await walk(contentRoot);
const uses = new Map();
const postsWithoutTags = [];
let totalUses = 0;

for (const file of files) {
  const raw = await readFile(file, 'utf8');
  const match = raw.match(/^---\s*\n([\s\S]*?)\n---/);
  let data = {};
  try { data = match ? yaml.load(match[1]) ?? {} : {}; } catch { data = {}; }
  const tags = Array.isArray(data.tags) ? data.tags.map(String) : data.tags ? [String(data.tags)] : [];
  if (!tags.length) postsWithoutTags.push(relative('.', file));
  for (const tag of tags) {
    uses.set(tag, (uses.get(tag) ?? 0) + 1);
    totalUses++;
  }
}

const byNormalized = new Map();
for (const [tag, count] of uses) {
  const key = normalize(tag);
  if (!byNormalized.has(key)) byNormalized.set(key, []);
  byNormalized.get(key).push({ tag, count });
}

const collisions = [...byNormalized.entries()]
  .filter(([, variants]) => variants.length > 1)
  .map(([key, variants]) => ({
    key,
    variants: variants.sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag)),
    total: variants.reduce((sum, { count }) => sum + count, 0),
  }))
  .sort((a, b) => b.total - a.total || a.key.localeCompare(b.key));

const singletons = [...uses.entries()].filter(([, count]) => count === 1).map(([tag]) => tag).sort();
const core = [...uses.entries()].filter(([, count]) => count >= CORE_THRESHOLD).sort((a, b) => b[1] - a[1]);
const splitTags = collisions.reduce((sum, { variants }) => sum + variants.length, 0);

await mkdir(reportDir, { recursive: true });
await writeFile(`${reportDir}/tags.json`, `${JSON.stringify({
  posts: files.length,
  distinctTags: uses.size,
  totalUses,
  postsWithoutTags: postsWithoutTags.length,
  singletons: singletons.length,
  coreThreshold: CORE_THRESHOLD,
  coreTags: core.length,
  collisionGroups: collisions.length,
  tagsInCollisionGroups: splitTags,
  collisions: collisions.map(({ key, variants, total }) => ({ key, total, variants })),
  singletonTags: singletons,
}, null, 2)}\n`);

await writeFile(`${reportDir}/tags.md`, [
  '# Tag vocabulary baseline', '',
  '> Informational. Every distinct tag is a page under /tags/[tag], so merging or',
  '> removing a tag removes a URL. Nothing here is applied automatically.', '',
  `- Posts: ${files.length}`,
  `- Distinct tags: ${uses.size}`,
  `- Total tag uses: ${totalUses} (${(totalUses / Math.max(files.length, 1)).toFixed(2)} per post)`,
  `- Posts with no tags: ${postsWithoutTags.length}`,
  `- Tags used once (single-post tag pages): ${singletons.length}`,
  `- Tags used ${CORE_THRESHOLD}+ times (navigable core): ${core.length}`,
  `- Spelling-variant groups: ${collisions.length} covering ${splitTags} tags`,
  '',
  '## Spelling-variant groups', '',
  'Each group is one concept split across several tag pages. The variant listed',
  'first carries the most posts and is the obvious merge target, but each group',
  'still needs review: some pairs are genuinely different concepts.', '',
  ...collisions.slice(0, 120).map(({ variants, total }) =>
    `- ${variants.map(({ tag, count }) => `\`${tag}\` (${count})`).join(' · ')} — ${total} uses`),
  ...(collisions.length > 120 ? ['', `… +${collisions.length - 120} more groups (see tags.json)`] : []),
  '',
  '## Navigable core', '',
  ...core.slice(0, 60).map(([tag, count]) => `- \`${tag}\` — ${count}`),
  '',
].join('\n'));

console.log(`Tag vocabulary: ${uses.size} distinct tag(s) over ${files.length} post(s); ${singletons.length} used once, ${collisions.length} spelling-variant group(s) covering ${splitTags} tags.`);
console.log(`Report: ${reportDir}/tags.md`);
