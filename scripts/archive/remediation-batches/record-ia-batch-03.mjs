#!/usr/bin/env node
// Records AP-I-21..40 decisions for the information architecture registry.
// Preview by default; --apply is required. Touches the registry JSON only.
//
// The batch covers entry points, breadcrumbs, orphan and dead-end articles,
// related-post selection, internal link quality, and search behaviour. Every
// number below came from measuring the built site over all 726 published post
// pages, not from reading the anti-pattern text.
//
// Two measurement mistakes are worth recording, because both produced
// confident wrong answers first:
//
//   Slicing each page at `<aside>` to separate content from chrome. On a post
//   page `<aside>` is the table of contents and sits inside the article, so
//   every page was cut at roughly 45% and the related-posts block — which is
//   below it — was invisible. That read as "0% of posts have related posts".
//
//   Then removing `<header>` as chrome, which contains the breadcrumb, giving
//   "100% of posts have no breadcrumb". Both numbers were artefacts of where
//   the cut was made, not facts about the site.
//
// Usage:
//   node scripts/record-ia-batch-03.mjs           # preview
//   node scripts/record-ia-batch-03.mjs --apply

import { readFile, writeFile } from 'node:fs/promises';

const apply = process.argv.includes('--apply');
const archive = 'archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273';
const path = `${archive}/remediation-plan/category-registries/information_architecture.json`;

const SCOPE = 'Information architecture surfaces only: the category registry and the navigation built from it, tag vocabulary and tag pages, in-series navigation, the homepage tiers, search behaviour, and the /blog URL space. Article bodies and published post URLs are out of scope.';
const VERIFIED_ON = '2026-08-23';
const CORPUS = 'Measured over all 726 published post pages in dist/, with chrome regions removed rather than truncated.';

/** @type {Record<string, {disposition: string, nextAction: string, result: string, files: string[], verification: string, residualRisk: string|null, reviewQuestion: string}>} */
const DECISIONS = {
  'AP-I-21': {
    disposition: 'accepted',
    nextAction: 'manual-review',
    result: 'The homepage carries three entry surfaces above the fold — 학습경로 (learning paths), Featured Guides, and 최근 글 — plus a /paths index with 4 named routes. There is no "no way in" problem to fix.',
    files: ['src/pages/index.astro', 'src/pages/paths/[path].astro'],
    verification: 'npm run build && npm run audit:paths',
    residualRisk: 'The entry point exists but is largely pointing at unpublished work: the 4 paths reference 45 series of which 8 have published posts, and concurrency-models renders no live series link at all. That is AP-I-09, already routed to the publishing decision, and it is the reason this is accepted rather than remediated — the surface is there, its contents are not.',
    reviewQuestion: 'Does the homepage still offer a first read for someone arriving with no context, and do the paths it offers resolve to published posts?',
  },
  'AP-I-22': {
    disposition: 'accepted',
    nextAction: 'manual-review',
    result: 'Three entry surfaces is the count the anti-pattern warns about, but they are not competing answers to the same question: paths are curated reading orders, Featured Guides are individual entry articles, and 최근 글 is recency. Each is one screen section, not a rival front door.',
    files: ['src/pages/index.astro'],
    verification: 'npm run build && npm run audit:reading',
    residualRisk: 'Re-open if a fourth surface appears, or if two of them start listing the same posts — overlap is what turns tiers into noise, and nothing measures that today.',
    reviewQuestion: 'Do any two homepage tiers recommend substantially the same posts?',
  },
  'AP-I-23': {
    disposition: 'accepted',
    nextAction: 'automated-check',
    result: 'Every one of the 726 published post pages emits a breadcrumb nav landmark. 0 missing.',
    files: ['src/components/common/Breadcrumb.astro', 'src/pages/blog/[...slug].astro'],
    verification: 'npm run build, then count nav[aria-label=breadcrumb] across dist/blog post pages: 726/726',
    residualRisk: 'Emitted by the shared layout, so it cannot go missing on one post without going missing on all of them.',
    reviewQuestion: 'Does every published post still render a breadcrumb landmark?',
  },
  'AP-I-24': {
    disposition: 'accepted',
    nextAction: 'manual-review',
    result: 'The trail reflects the real category hierarchy rather than an invented path: an RTOS chapter shows Blog > Embedded > RTOS, matching the category ancestry the post declares in `topics`. Depths seen are 2 and 3 crumbs, corresponding to top-level and sub-category posts. Since the switch to topics-derived membership the trail is built from declared classification, not from slicing the URL, so it cannot claim a hierarchy the taxonomy does not have.',
    files: ['src/components/common/Breadcrumb.astro', 'src/consts/categories.ts'],
    verification: 'npm run build && npm run audit:rendered-links',
    residualRisk: 'The trail stops at the category and does not include the current post. That is a deliberate omission rather than a false claim, but it means the breadcrumb never marks where you are, only how you got here.',
    reviewQuestion: 'Does the breadcrumb trail still match the category ancestry the post declares, rather than its folder path?',
  },
  'AP-I-25': {
    disposition: 'accepted',
    nextAction: 'automated-check',
    result: 'Every crumb except the current one is a link, on all 726 posts. 0 posts have a breadcrumb with no links.',
    files: ['src/components/common/Breadcrumb.astro'],
    verification: 'npm run build, then count anchors inside each breadcrumb nav: 0 posts with zero',
    residualRisk: null,
    reviewQuestion: 'Are breadcrumb crumbs still links rather than plain text?',
  },
  'AP-I-26': {
    disposition: 'accepted',
    nextAction: 'automated-check',
    result: '0 of 726 posts have zero inbound links from another post, counting both prose links and the related-posts block. Every published article is reachable from at least one other article.',
    files: ['src/lib/posts.ts', 'src/components/blog/RelatedPosts.astro'],
    verification: 'npm run build && npm run audit:connectivity && npm run audit:rendered-links',
    residualRisk: 'Held up largely by the related-posts block, which every post renders. A post is never orphaned as long as something recommends it, so this measures reachability rather than editorial connection.',
    reviewQuestion: 'Does every published post still have an inbound link from another post?',
  },
  'AP-I-27': {
    disposition: 'accepted',
    nextAction: 'automated-check',
    result: '0 of 726 posts are dead ends: every one links out to at least one other post, and every one also carries prose links to other posts, independent of the related-posts block.',
    files: ['src/pages/blog/[...slug].astro'],
    verification: 'npm run build, then count outbound post links per page: 0 posts with zero',
    residualRisk: null,
    reviewQuestion: 'Does every published post still link onward to another post?',
  },
  'AP-I-28': {
    disposition: 'accepted',
    nextAction: 'manual-review',
    result: 'Selection is not tag-only. Curated editorial relations are placed first and fill the slots before anything is scored; the remainder is ranked by same-series (weight 10) + shared tags (3 each) + same type (1), so a chapter of the same book outranks a post that merely shares a tag. Synonym expansion deliberately does not stack, so one concept cannot inflate a result by matching several spellings.',
    files: ['src/lib/posts.ts'],
    verification: 'read getRelatedPosts scoring; npm run test:relations',
    residualRisk: 'Shared tags are still the only signal between posts in different series with no curated relation, and tag quality varies. That is a content property, not a selection bug.',
    reviewQuestion: 'Is same-series still weighted above shared tags, and are curated relations still placed first?',
  },
  'AP-I-29': {
    disposition: 'accepted',
    nextAction: 'automated-check',
    result: 'Nothing random: the scoring is deterministic and ties break on reading order, then date. This was already corrected once for a related defect — ranking ties by date alone sent chapter 1 of a series to chapters 19, 18 and 17, because recency is reverse reading order.',
    files: ['src/lib/posts.ts'],
    verification: 'no Math.random in the related-posts path; two builds produce identical related blocks',
    residualRisk: null,
    reviewQuestion: 'Do two builds of the same content still produce identical related-post blocks?',
  },
  'AP-I-30': {
    disposition: 'accepted',
    nextAction: 'automated-check',
    result: '181 mutual A-to-B and B-to-A pairs exist, but 0 closed recommendation sets — no group of posts recommends only each other. The mutual pairs are adjacent chapters of one series pointing at each other, which is the correct answer for a reading order, not a trap. A trap requires the loop to be closed, and every one of them also leads outward.',
    files: ['src/lib/posts.ts'],
    verification: 'npm run build, then compute closure over the related-posts graph: 0 closed sets across 726 posts',
    residualRisk: null,
    reviewQuestion: 'Does any set of posts recommend only each other?',
  },
  'AP-I-31': {
    disposition: 'accepted',
    nextAction: 'automated-check',
    result: '0 anchors across all 726 posts use "여기", "here", "click here", "링크", "자세히", "더 보기" or "read more" as their entire link text.',
    files: ['src/content/blog'],
    verification: 'npm run build, then match anchor text in post prose against the vague-anchor list: 0 hits',
    residualRisk: null,
    reviewQuestion: 'Has any post started using bare "여기"/"here" as link text?',
  },
  'AP-I-32': {
    disposition: 'accepted',
    nextAction: 'manual-review',
    result: 'Link density is 2.81 internal links per 100 words at the median, 5.88 at p95, 6.73 at the maximum. The distribution has no tail: no post is an outlier, so there is no article where linking has displaced prose.',
    files: ['src/content/blog'],
    verification: 'npm run build, then internal post links per 100 words of prose across 726 posts',
    residualRisk: 'Density is a proxy. A post could sit at the median and still cluster every link into one paragraph, which this does not measure.',
    reviewQuestion: 'Has the p95 link density moved materially above 6 per 100 words?',
  },
  'AP-I-33': {
    disposition: 'remediated',
    nextAction: 'verify',
    result: '8 anchors across 4 posts used a bare URL as their own link text, which tells a reader nothing about the destination and reads as an address rather than a name. Small enough to be a content fix rather than a systems one; recorded here because it is the only measurable instance of the pattern in the corpus.',
    files: ['src/content/blog'],
    verification: 'npm run build, then match anchors whose text is itself a URL',
    residualRisk: 'Nothing gates this. A new post can introduce a bare-URL anchor and no check will notice; the count is low enough that a gate would mostly sit idle, so it is left as a review question.',
    reviewQuestion: 'How many anchors still use a bare URL as their link text?',
  },
  'AP-I-34': {
    disposition: 'remediated',
    nextAction: 'verify',
    result: 'Internal link rot is 0 unresolved targets across 1451 built pages, and it is enforced rather than observed: audit:rendered-links is a release gate. Two adjacent classes were closed in the same period — the 28 URL segments inside post URLs that resolved to nothing, now gated by audit:url-prefixes, and published URLs disappearing through a slug edit or an unpublish, now gated by audit:published-urls against a recorded manifest.',
    files: ['scripts/audit-rendered-links.mjs', 'scripts/audit-url-prefixes.mjs', 'scripts/audit-published-urls.mjs'],
    verification: 'npm run verify:release',
    residualRisk: 'All three read the built output, so they cover what the site links to. An address a reader typed or an external site links to, which the site itself never references, is only covered where it is in the published-URL manifest.',
    reviewQuestion: 'Do the three link-continuity gates still run in verify:release, and do they still report zero?',
  },
  'AP-I-35': {
    disposition: 'accepted',
    nextAction: 'automated-check',
    result: '0 of 726 posts carry external links while having no internal link to another post. No article sends its readers off-site as its only onward path.',
    files: ['src/content/blog'],
    verification: 'npm run build, then per-post external and internal link counts',
    residualRisk: null,
    reviewQuestion: 'Is any published post now linking only outward?',
  },
  'AP-I-36': {
    disposition: 'accepted',
    nextAction: 'manual-review',
    result: 'Search is not exact-match. A query scores against title (exact 100, prefix 50, contains 30), description (15), tags (exact 20, contains 10) and series (5), with word-boundary containment for latin terms and plain substring matching for Korean, where word boundaries do not apply. Partial and mid-string queries return results.',
    files: ['src/lib/search.ts'],
    verification: 'read calculateScore and containsTerm; npm run test:search',
    residualRisk: 'There is no stemming, fuzzy matching, or typo tolerance. A misspelled query returns nothing, and nothing measures how often that happens because there is no query telemetry.',
    reviewQuestion: 'Does a partial-word query still return results?',
  },
  'AP-I-37': {
    disposition: 'accepted',
    nextAction: 'manual-review',
    result: 'Searching an acronym does not fail: an acronym used as a tag is matched exactly by tagExact, so all 22 acronym tags on published posts are findable by typing the acronym. What is not covered is the reverse — typing the spelled-out form to find the acronym — which works only for the 4 of 22 registered in the alias table. The 18 unregistered ones carry 1 to 2 posts each, roughly 25 post-instances out of 726.',
    files: ['src/lib/search-aliases.ts', 'src/lib/search.ts'],
    verification: 'npm run build, then cross-reference all-caps tags on published posts against the alias table: 22 acronym tags, 18 unregistered',
    residualRisk: 'The gap grows with the corpus rather than staying fixed, and it is invisible from inside — nobody sees a search that returned nothing. Re-open when an unregistered acronym tag crosses roughly 10 posts, since by then the expansion is worth registering.',
    reviewQuestion: 'Does any acronym tag with more than 10 published posts still lack an expansion in the alias table?',
  },
  'AP-I-38': {
    disposition: 'routed',
    nextAction: 'manual-review',
    result: 'The split is structural, not incidental: 663 of 726 published titles contain Korean, while 0 of the 1486 distinct tags do. Titles are Korean and tags are English, so a Korean query reaches titles and descriptions and an English query reaches tags, and the alias table bridging them holds 21 Korean aliases against a 1486-term tag vocabulary. Both directions do work where a term is registered — 데드락 finds Deadlock and vice versa, now visibly so after the highlighting fix in AP-I-40.',
    files: ['src/lib/search-aliases.ts'],
    verification: 'npm run build, then Korean-character counts across published titles and tags; expandSearchTerms coverage against the tag vocabulary',
    residualRisk: 'How much this costs a reader cannot be measured here. Analytics is deliberately disabled, so there is no record of what people search for or which queries return nothing — the size of the gap is measurable but its impact is not. Expanding the alias table by guessing which Korean terms readers would type is exactly the single-sample reasoning the evidence rules forbid.',
    reviewQuestion: 'Routed: closing this needs either query telemetry, which is a privacy and analytics decision, or an editorial decision to carry Korean tags alongside English ones. Both are the author\'s call, not a defect to fix in the search code.',
  },
  'AP-I-39': {
    disposition: 'accepted',
    nextAction: 'manual-review',
    result: 'A result row carries the series it belongs to, a two-line description, and up to three tags — not a bare title. The series context is suppressed when the reader is already filtering by that series, so the row does not repeat what the filter already says.',
    files: ['src/components/common/SearchModal.astro'],
    verification: 'read the result row construction in SearchModal',
    residualRisk: 'The description is the frontmatter description, not a snippet around the match, so for a term that appears only in the body the context shown is unrelated to why the result matched.',
    reviewQuestion: 'Does a search result still show series, description and tags rather than a bare title?',
  },
  'AP-I-40': {
    disposition: 'remediated',
    nextAction: 'verify',
    result: 'Matches were highlighted against the raw query alone, so a result found through a synonym arrived with nothing marked: searching 데드락 returned "Deadlock 회피 전략" with no indication of why it was in the list. There were also two implementations of the highlight rule — highlightMatch in src/lib/search.ts, exported with zero callers, and a private copy inside SearchModal that was the one actually running. The dead one looked canonical, which is how the gap survived. Replaced with a single highlightSegments that expands the query the same way scoring does, so what marks a result is decided by the same terms that selected it. Separator handling was fixed in passing: normalizeSearchText flattens "h.264" to "h 264", which as a literal matched neither "H.264" nor "H-264". It returns segments rather than an HTML string, so a title can never be interpreted as markup.',
    files: ['src/lib/search.ts', 'src/components/common/SearchModal.astro'],
    verification: 'esbuild-bundled the module and ran both implementations over the same cases',
    residualRisk: 'Highlighting is now driven by the alias table, so an unregistered synonym still marks nothing — but in that case the result would not have been returned either, so the two stay consistent.',
    reviewQuestion: 'Is there still exactly one definition of what counts as a search match, shared by scoring and highlighting?',
  },
};

const registry = JSON.parse(await readFile(path, 'utf8'));
const byId = new Map(registry.items.map((item) => [item.id, item]));

const missing = Object.keys(DECISIONS).filter((id) => !byId.has(id));
if (missing.length) {
  console.error(`Not in the registry: ${missing.join(', ')}.`);
  process.exit(1);
}
const unknownScale = [...new Set(Object.values(DECISIONS).map((d) => d.disposition))]
  .filter((value) => !registry.dispositionScale.includes(value));
if (unknownScale.length) {
  console.error(`Not in the disposition scale: ${unknownScale.join(', ')}.`);
  process.exit(1);
}

// Only writes items still sitting at `unassessed`. Revising a recorded decision
// is a different operation with different risks; batch 02 is what does that.
const eligible = Object.keys(DECISIONS).filter((id) => byId.get(id).disposition === 'unassessed');
const already = Object.keys(DECISIONS).filter((id) => byId.get(id).disposition !== 'unassessed');

const counts = {};
for (const id of Object.keys(DECISIONS)) {
  counts[DECISIONS[id].disposition] = (counts[DECISIONS[id].disposition] ?? 0) + 1;
}

console.log(
  `IA batch 03: ${Object.keys(DECISIONS).length} decision(s) — ` +
  `${Object.entries(counts).map(([key, n]) => `${n} ${key}`).join(', ')}; ` +
  `${eligible.length} eligible, ${already.length} already recorded; ` +
  `${apply ? 'applying.' : 'preview only; pass --apply to record.'}`,
);
for (const id of Object.keys(DECISIONS)) {
  const item = byId.get(id);
  const state = item.disposition === 'unassessed' ? '' : `  (already ${item.disposition}, left alone)`;
  console.log(`  ${id} ${item.disposition} → ${DECISIONS[id].disposition}${state}`);
}
const remaining = registry.items.filter((item) => !DECISIONS[item.id] && item.disposition === 'unassessed').length;
console.log(`  ${remaining} item(s) stay unassessed — not measured, so not dispositioned.`);

if (!apply) process.exit(0);

for (const id of eligible) {
  const decision = DECISIONS[id];
  const item = byId.get(id);
  item.disposition = decision.disposition;
  item.nextAction = decision.nextAction;
  item.reviewQuestion = decision.reviewQuestion;
  item.scope = SCOPE;
  item.evidence = [{
    files: decision.files,
    verification: decision.verification,
    result: decision.result,
    corpus: CORPUS,
    verifiedOn: VERIFIED_ON,
  }];
  item.residualRisk = decision.residualRisk;
}
await writeFile(path, `${JSON.stringify(registry, null, 2)}\n`);
console.log(`\nRecorded ${eligible.length} information-architecture decision(s).`);

// Post-change verification: re-read from disk and confirm what landed.
const written = JSON.parse(await readFile(path, 'utf8'));
const problems = [];
for (const [id, decision] of Object.entries(DECISIONS)) {
  const item = written.items.find((entry) => entry.id === id);
  if (item.disposition !== decision.disposition) problems.push(`${id}: disposition is ${item.disposition}`);
  if (!item.evidence?.length) problems.push(`${id}: no evidence recorded`);
  if (!item.reviewQuestion) problems.push(`${id}: no review question`);
}
const stillUnassessed = written.items.filter((item) => item.disposition === 'unassessed').length;
if (problems.length) {
  for (const problem of problems) console.error(`  ! ${problem}`);
  process.exitCode = 1;
} else {
  console.log(`Verified: ${Object.keys(DECISIONS).length} recorded with evidence, ${stillUnassessed} still unassessed.`);
}
