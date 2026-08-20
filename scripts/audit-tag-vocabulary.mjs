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
//
// Splits are read against data/tag-aliases.yaml, which is where the merge
// decisions live. A split whose keys appear there as canonical-and-alias is a
// regression — something reintroduced a spelling that was already resolved — and
// is reported separately from one nobody has ruled on yet. Pairs listed under
// `distinct:` are two concepts that merely look alike (`typeid` the C++ operator
// vs. a hand-rolled `type-id`), and are held out so they stop reading as debt.
//
// Orthography is not the only way one concept splits. Two keys that share no
// spelling at all can still be the same tag: /tags/make and /tags/makefile held
// byte-identical post lists. Identical post sets are reported too.

import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
// Namespace import, not default: js-yaml 5 drops the default export, and this
// form resolves under both 4 and 5.
import * as yaml from 'js-yaml';

const contentRoot = 'src/content/blog';
const reportDir = 'reports/taxonomy';
const dictionaryPath = 'data/tag-aliases.yaml';
const PAGE_MIN = 2; // must match getTagsForPageGeneration's default in src/lib/posts.ts

const dictionary = yaml.load(await readFile(dictionaryPath, 'utf8')) ?? {};
const canonicalOf = new Map(); // alias (lowercased) -> canonical
for (const [canonical, aliases] of Object.entries(dictionary.canonical ?? {})) {
  for (const alias of aliases ?? []) canonicalOf.set(String(alias).toLowerCase(), canonical);
}
// Pairs declared to be different concepts, as a set of "a|b" with keys sorted.
const declaredDistinct = new Set(
  (dictionary.distinct ?? []).map((pair) => pair.map((key) => String(key).toLowerCase()).sort().join('|')),
);

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
    if (!published.has(key)) published.set(key, { count: 0, spellings: new Set(), files: new Set() });
    const record = published.get(key);
    record.count++;
    record.spellings.add(tag);
    record.files.add(file);
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
// A split is only debt if nobody has ruled on it. `verdict` says which it is.
function verdictFor(keys) {
  const names = keys.map(({ key }) => key);
  if (names.length === 2 && declaredDistinct.has([...names].sort().join('|'))) return 'distinct';
  // An alias reappearing after the corpus was folded means something reverted or
  // a new post used the resolved spelling. That is a regression, not a backlog.
  if (names.some((key) => canonicalOf.has(key))) return 'regression';
  return 'unreviewed';
}

const allSplits = [...byConcept.entries()]
  .filter(([, keys]) => keys.length > 1)
  .map(([concept, keys]) => {
    const sorted = keys.sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
    return {
      concept,
      keys: sorted,
      total: sorted.reduce((sum, { count }) => sum + count, 0),
      verdict: verdictFor(sorted),
    };
  })
  .sort((a, b) => b.total - a.total || a.concept.localeCompare(b.concept));

const splits = allSplits.filter((split) => split.verdict !== 'distinct');
const distinctPairs = allSplits.filter((split) => split.verdict === 'distinct');
const regressions = splits.filter((split) => split.verdict === 'regression');

// Two keys sharing no conceptKey can still be one tag. /tags/make and
// /tags/makefile held byte-identical post lists, and conceptKey cannot see it
// because one is a compound of the other rather than a respelling.
//
// An identical post set alone is far too weak a signal: /tags/asan and
// /tags/ubsan also cover exactly the same two posts, and are plainly two
// things. At two or three posts, co-occurrence is ordinary. What separated
// make/makefile was that one key *begins* the other, i.e. they are two
// spellings around the same root. Requiring both cuts 25 candidates to the one
// that was real.
const identicalSets = [];
const renderedKeys = [...published.entries()].filter(([, { count }]) => count >= PAGE_MIN);
for (let i = 0; i < renderedKeys.length; i++) {
  for (let j = i + 1; j < renderedKeys.length; j++) {
    const [leftKey, left] = renderedKeys[i];
    const [rightKey, right] = renderedKeys[j];
    if (left.files.size !== right.files.size) continue;
    if (!leftKey.startsWith(rightKey) && !rightKey.startsWith(leftKey)) continue;
    if (declaredDistinct.has([leftKey, rightKey].sort().join('|'))) continue;
    if ([...left.files].every((file) => right.files.has(file))) {
      identicalSets.push({ keys: [leftKey, rightKey].sort(), count: left.files.size });
    }
  }
}
identicalSets.sort((a, b) => b.count - a.count || a.keys[0].localeCompare(b.keys[0]));

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
  splitRegressions: regressions.length,
  declaredDistinctPairs: distinctPairs.length,
  identicalPostSets: identicalSets.length,
  labelInconsistencies: labelInconsistencies.length,
  tagsWithWhitespace: awkward.length,
  splits,
  regressions,
  distinctPairs,
  identicalSets,
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
  `- **Concepts split across different URLs: ${splits.length}**${regressions.length ? ` (${regressions.length} regression)` : ''}`,
  `- Tag pages holding an identical post set: ${identicalSets.length}`,
  `- Declared distinct in ${dictionaryPath} (not debt): ${distinctPairs.length}`,
  `- Label inconsistencies inside one URL: ${labelInconsistencies.length}`,
  `- Tags containing whitespace: ${awkward.length}`,
  '',
  '## Concepts split across different URLs', '',
  'One concept, two tag pages, readers landing on whichever the article chose.',
  `Resolve by adding the winning spelling to \`${dictionaryPath}\` and running`,
  '`node scripts/merge-tag-aliases.mjs --apply`.', '',
  ...(splits.length ? splits.map(({ keys, total, verdict }) =>
    `- ${verdict === 'regression' ? '**REGRESSION** ' : ''}` +
    `${keys.map(({ key, count }) => `\`/tags/${key}\` (${count})`).join(' · ')} — ${total} uses`)
    : ['_None._']),
  '',
  ...(regressions.length ? [
    'A regression means a spelling already folded by the dictionary came back —',
    'check whether a new post used it, or an edit reverted one.', ''] : []),
  '## Tag pages holding an identical post set', '',
  'Two URLs over the same list of posts, where one key begins the other — the',
  'shape `make` / `makefile` had. Identical sets alone are not enough: `asan`',
  'and `ubsan` cover the same two posts and are two different things.', '',
  ...(identicalSets.length
    ? identicalSets.map(({ keys, count }) => `- \`/tags/${keys[0]}\` · \`/tags/${keys[1]}\` — both ${count} posts`)
    : ['_None._']),
  '',
  ...(distinctPairs.length ? [
    '## Look alike, are not', '',
    `Held out by the \`distinct:\` list in \`${dictionaryPath}\`. Do not merge these.`, '',
    ...distinctPairs.map(({ keys, total }) =>
      `- ${keys.map(({ key, count }) => `\`/tags/${key}\` (${count})`).join(' · ')} — ${total} uses`),
    ''] : []),
  '## Label inconsistencies inside one URL', '',
  'These already resolve to a single page holding every post; only the displayed',
  'label depends on which spelling the build happened to see first.', '',
  ...labelInconsistencies.map(({ key, count, spellings }) =>
    `- \`/tags/${key}\` (${count}) — ${spellings.map((s) => `\`${s}\``).join(', ')}`),
  '',
  ...(awkward.length ? ['## Tags containing whitespace', '', ...awkward.map((key) => `- \`${key}\``), ''] : []),
].join('\n'));

console.log(`Tag vocabulary: ${published.size} URL key(s) over ${publishedPosts} published post(s); ${rendered.length} tag page(s) generated; ${splits.length} concept split(s) across URLs, ${identicalSets.length} identical post set(s), ${labelInconsistencies.length} label inconsistency(ies).`);
for (const { keys, total } of regressions) {
  console.log(`  REGRESSION: ${keys.map(({ key }) => `/tags/${key}`).join(' · ')} — ${total} uses; ${dictionaryPath} already resolved this.`);
}
for (const { keys, count } of identicalSets) {
  console.log(`  identical post set: /tags/${keys[0]} · /tags/${keys[1]} — both ${count} posts.`);
}
console.log(`Report: ${reportDir}/tags.md`);
