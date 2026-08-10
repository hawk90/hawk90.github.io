#!/usr/bin/env node
// Informational baseline for the tag vocabulary. Read-only: it never edits
// frontmatter and never proposes a merge as an automatic action.
//
// Measured against what actually renders, which is narrower than the raw
// frontmatter. Two facts in src/lib/posts.ts and src/pages/tags/[tag] decide it:
//
//   1. A tag page's URL is tag.toLowerCase(), and filterByTag matches
//      case-insensitively. So `Debugging` and `debugging` are already one page
//      holding both sets of posts. That is a label inconsistency, not a split.
//   2. getTagsForPageGeneration only emits a page for a tag carrying at least
//      PAGE_MIN published posts, so single-post tags never become thin pages.
//
// What remains a real defect is a concept reaching readers through two
// different URLs, such as /tags/cpp and /tags/c++. Those are reported first.

import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import yaml from 'js-yaml';

const contentRoot = 'src/content/blog';
const reportDir = 'reports/taxonomy';
const PAGE_MIN = 2; // must match getTagsForPageGeneration's default in src/lib/posts.ts

async function walk(dir, out = []) {
  for (const entry of (await readdir(dir, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
    const file = join(dir, entry.name);
    if (entry.isDirectory()) await walk(file, out);
    else if (entry.isFile() && file.endsWith('.md')) out.push(file);
  }
  return out;
}

// Folds what still separates two URLs after lowercasing: separators and the
// symbols that spell one concept two ways (c++ / cpp, f# / fsharp).
function conceptKey(urlKey) {
  return urlKey.replace(/\+\+/g, 'pp').replace(/#/g, 'sharp').replace(/[\s_\-.]+/g, '');
}

const files = await walk(contentRoot);
const published = new Map(); // urlKey -> { count, spellings:Set }
const draftOnlyKeys = new Set();
let publishedPosts = 0;

for (const file of files) {
  const raw = await readFile(file, 'utf8');
  const match = raw.match(/^---\s*\n([\s\S]*?)\n---/);
  let data = {};
  try { data = match ? yaml.load(match[1]) ?? {} : {}; } catch { data = {}; }
  const tags = Array.isArray(data.tags) ? data.tags.map(String) : data.tags ? [String(data.tags)] : [];
  const isDraft = data.draft === true;
  if (!isDraft) publishedPosts++;
  for (const tag of tags) {
    const key = tag.toLowerCase();
    if (isDraft) { draftOnlyKeys.add(key); continue; }
    if (!published.has(key)) published.set(key, { count: 0, spellings: new Set() });
    const record = published.get(key);
    record.count++;
    record.spellings.add(tag);
  }
}
for (const key of published.keys()) draftOnlyKeys.delete(key);

const rendered = [...published.entries()].filter(([, { count }]) => count >= PAGE_MIN);
const belowThreshold = published.size - rendered.length;

const labelInconsistencies = [...published.entries()]
  .filter(([, { spellings }]) => spellings.size > 1)
  .map(([key, { count, spellings }]) => ({ key, count, spellings: [...spellings].sort() }))
  .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));

const byConcept = new Map();
for (const [key, { count }] of published) {
  const concept = conceptKey(key);
  if (!byConcept.has(concept)) byConcept.set(concept, []);
  byConcept.get(concept).push({ key, count });
}
const splits = [...byConcept.entries()]
  .filter(([, keys]) => keys.length > 1)
  .map(([concept, keys]) => ({
    concept,
    keys: keys.sort((a, b) => b.count - a.count || a.key.localeCompare(b.key)),
    total: keys.reduce((sum, { count }) => sum + count, 0),
  }))
  .sort((a, b) => b.total - a.total || a.concept.localeCompare(b.concept));

const awkward = [...published.keys()].filter((key) => /[\s]/.test(key)).sort();

await mkdir(reportDir, { recursive: true });
await writeFile(`${reportDir}/tags.json`, `${JSON.stringify({
  publishedPosts,
  totalPosts: files.length,
  pageMin: PAGE_MIN,
  publishedUrlKeys: published.size,
  renderedTagPages: rendered.length,
  keysBelowPageThreshold: belowThreshold,
  keysOnlyInDrafts: draftOnlyKeys.size,
  conceptSplits: splits.length,
  labelInconsistencies: labelInconsistencies.length,
  tagsWithWhitespace: awkward.length,
  splits,
  labels: labelInconsistencies,
  whitespaceTags: awkward,
}, null, 2)}\n`);

await writeFile(`${reportDir}/tags.md`, [
  '# Tag vocabulary baseline', '',
  '> Informational. Measured against published posts and the real routing rule,',
  '> not raw frontmatter. Nothing here is applied automatically.', '',
  `- Published posts: ${publishedPosts} of ${files.length}`,
  `- Tag URL keys in published content: ${published.size}`,
  `- Tag pages actually generated (${PAGE_MIN}+ published posts): ${rendered.length}`,
  `- Keys below the page threshold (no page generated, by design): ${belowThreshold}`,
  `- Keys appearing only in drafts (will render when published): ${draftOnlyKeys.size}`,
  '',
  `- **Concepts split across different URLs: ${splits.length}**`,
  `- Label inconsistencies inside one URL: ${labelInconsistencies.length}`,
  `- Tags containing whitespace: ${awkward.length}`,
  '',
  '## Concepts split across different URLs', '',
  'One concept, two tag pages, readers landing on whichever the article chose.',
  'The first key holds the most posts and is the obvious merge target.', '',
  ...splits.map(({ keys, total }) =>
    `- ${keys.map(({ key, count }) => `\`/tags/${key}\` (${count})`).join(' · ')} — ${total} uses`),
  '',
  '## Label inconsistencies inside one URL', '',
  'These already resolve to a single page holding every post; only the displayed',
  'label depends on which spelling the build happened to see first.', '',
  ...labelInconsistencies.map(({ key, count, spellings }) =>
    `- \`/tags/${key}\` (${count}) — ${spellings.map((s) => `\`${s}\``).join(', ')}`),
  '',
  ...(awkward.length ? ['## Tags containing whitespace', '', ...awkward.map((key) => `- \`${key}\``), ''] : []),
].join('\n'));

console.log(`Tag vocabulary: ${published.size} URL key(s) over ${publishedPosts} published post(s); ${rendered.length} tag page(s) generated; ${splits.length} concept split(s) across URLs, ${labelInconsistencies.length} label inconsistency(ies).`);
console.log(`Report: ${reportDir}/tags.md`);
