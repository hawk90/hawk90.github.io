#!/usr/bin/env node
// Records AP-I-01..20 decisions for the information architecture registry.
// Preview by default; --apply is required. Touches the registry JSON only:
// no article body, no frontmatter, no published URL.
//
// Every disposition here was reached by measuring the built site, not by
// reading the anti-pattern text. Where the finding was real and has since been
// fixed, the evidence names the commit that fixed it and the check that would
// catch a regression. Where the pattern does not apply to this repository, the
// disposition is `accepted` and the entry records what would re-open it — an
// acceptance without a re-open trigger is a guess with a status field.
//
// AP-I-21..160 stay `unassessed` on purpose. They have not been measured, and
// writing a disposition for them would make the registry say something the
// repository has not been checked for.
//
// Usage:
//   node scripts/record-ia-batch-01.mjs           # preview
//   node scripts/record-ia-batch-01.mjs --apply

import { readFile, writeFile } from 'node:fs/promises';

const apply = process.argv.includes('--apply');
const archive = 'archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273';
const path = `${archive}/remediation-plan/category-registries/information_architecture.json`;

const SCOPE = 'Information architecture surfaces only: the category registry and the navigation built from it, tag vocabulary and tag pages, series hubs and in-series navigation, the homepage tiers, and the /blog URL space. Article bodies and published post URLs are out of scope.';
const VERIFIED_ON = '2026-08-20';
const COMMITS = {
  topics: '21d6eafc — category membership read from `topics` instead of the post URL; empty categories no longer built; /recently-updated linked',
  tags: '3232b1be — split tag spellings folded onto one canonical URL via data/tag-aliases.yaml',
  prefixes: '0dda5355 — the 28 URL prefixes inside post URLs resolve; sitemap/robots agreement enforced',
};

/** @type {Record<string, {disposition: string, nextAction: string, result: string, files: string[], verification: string, residualRisk: string|null, reviewQuestion: string}>} */
const DECISIONS = {
  'AP-I-01': {
    disposition: 'remediated',
    nextAction: 'verify',
    result: '54 of 65 registry entries had no published post and were still built as pages, linked from the sidebar of every page and submitted in the sitemap. Page generation and the sidebar tree are now gated on having published content: category pages 65 -> 11, sidebar category links 65 -> 11, empty pages 54 -> 0. The registry keeps all 65 entries, so the drafted plan is intact and a category returns on its own when a post under it publishes.',
    files: ['src/pages/blog/[...category]/index.astro', 'src/components/blog/BlogSidebar.astro', 'src/consts/categories.ts'],
    verification: 'npm run build && npm run audit:sitemap && npm run audit:rendered-links',
    residualRisk: 'The gate is structural — a category with no posts cannot produce a page — so this cannot regress silently. What is still unmeasured is whether 14 top-level categories is the right shape once the drafts publish; that is a taxonomy decision, not a defect.',
    reviewQuestion: 'Reassess category explosion when the drafted content under systems/, ml/, and parallel/ publishes and those branches populate.',
  },
  'AP-I-02': {
    disposition: 'accepted',
    nextAction: 'manual-review',
    result: 'Two category names repeat under different parents (Systems, Compilers) and seven leaf names collide. The page title already qualifies the ambiguous ones with their parent, and in every overlapping pair at most one side holds published content, so no reader can currently face two populated menus with the same name.',
    files: ['src/consts/categories.ts', 'src/pages/blog/[...category]/index.astro'],
    verification: 'npm run build && npm run audit:reading',
    residualRisk: 'Re-open the moment both members of any overlapping pair hold published posts. systems/wireless vs embedded/wireless and systems/riscv vs embedded/riscv are the likeliest, since drafts exist on both sides.',
    reviewQuestion: 'Do any two categories with the same or overlapping name both hold published posts?',
  },
  'AP-I-03': {
    disposition: 'remediated',
    nextAction: 'verify',
    result: 'Category membership, the sidebar tree, and breadcrumbs were all string prefixes of the post id, which is the frozen URL — so the folder, the URL, and the taxonomy were one fact and a post could not be reclassified without moving the file. All three now read the declared `topics`. Measured before switching: path-derived and topics-derived buckets agreed on 726 of 726 published posts, so nothing visible changed; what changed is that they can now disagree.',
    files: ['src/lib/posts.ts', 'src/consts/categories.ts', 'src/components/blog/BlogSidebar.astro', 'src/pages/blog/[...slug].astro'],
    verification: 'npm run build && npm run audit:classification && npm run audit:rendered-links',
    residualRisk: 'Post URLs are still frozen snapshots of the original folder layout, so moving a file keeps its URL but does not yet change its classification automatically — that is now a frontmatter edit, which is the intended separation rather than a leftover coupling.',
    reviewQuestion: 'Does any navigation surface still derive a post\'s classification from its id rather than from `topics`?',
  },
  'AP-I-04': {
    disposition: 'remediated',
    nextAction: 'verify',
    result: '`topics` was required on all 3387 posts and validated against the topic registry, and no page read it — ContentDocument.topicIds had zero consumers, and category membership came from the path prefix instead. It is now the field that decides category membership, sidebar buckets, and breadcrumbs for all 726 published posts.',
    files: ['src/content.config.ts', 'src/lib/content/normalize.ts', 'src/lib/posts.ts', 'src/components/blog/BlogSidebar.astro'],
    verification: 'npm run build && npm run audit:classification',
    residualRisk: 'Every published post still declares only its own folder and that folder\'s parent as topics, so the multi-classification the field allows is available but unused. Nothing is wrong; the capability is simply not yet exercised.',
    reviewQuestion: 'Are there posts that belong under more than one branch, and do their `topics` say so?',
  },
  'AP-I-05': {
    disposition: 'remediated',
    nextAction: 'verify',
    result: 'Fixed with AP-I-01: the 54 pages whose only content was "No posts in this category yet." are no longer built, so they are out of the sitemap and off the sidebar. The count badge that was suppressed at zero — making an empty branch look like an unexpanded one — no longer has a zero case to hide.',
    files: ['src/pages/blog/[...category]/index.astro', 'src/components/blog/BlogSidebar.astro', 'src/components/blog/CategoryTreeNode.astro'],
    verification: 'npm run build && npm run audit:sitemap',
    residualRisk: null,
    reviewQuestion: 'Does any built category page render an empty post list?',
  },
  'AP-I-06': {
    disposition: 'accepted',
    nextAction: 'manual-review',
    result: '997 of 1456 tag URL keys are carried by exactly one published post, but the page threshold means none of them renders: no page, no link, no 404. getRoutableTagKeys derives the link set from the same function the route uses, so the two cannot drift, and the pre-commit normalizer snaps new spellings onto existing corpus tags.',
    files: ['src/lib/posts.ts', 'scripts/normalize-tag-shape.mjs', 'lefthook.yml'],
    verification: 'npm run audit:tags && npm run audit:rendered-links',
    residualRisk: 'Nothing gates tag creation, and 237 of 467 tag pages hold exactly two posts. Re-open if two-post pages exceed 60% of all tag pages, or if tag keys per published post rise above ~2.5 (currently 2.0).',
    reviewQuestion: 'Has the tag page population shifted toward the minimum threshold since the last measurement?',
  },
  'AP-I-07': {
    disposition: 'remediated',
    nextAction: 'verify',
    result: 'Ten concepts each reached readers through two tag pages, worst /tags/cpp (219 posts) against /tags/c++ (9). A canonical dictionary now states the merge decisions and a preview-first script applies them, across drafts as well as published posts — 281 drafts carried `C++`, so a published-only fix would have let the split return. Splits 10 -> 0. The audit reads the same dictionary, so a folded spelling coming back is reported as a regression rather than as untouched backlog.',
    files: ['data/tag-aliases.yaml', 'scripts/merge-tag-aliases.mjs', 'scripts/audit-tag-vocabulary.mjs'],
    verification: 'npm run audit:tags',
    residualRisk: 'audit:tags is report-only and not in verify:release, so a new split cannot fail a build — it is visible in reports/taxonomy/tags.md but not blocking. The dry run also showed the dictionary is where judgement lives: two proposed merges were wrong and were recorded as `distinct:` instead.',
    reviewQuestion: 'Does audit:tags report any concept split, and is any of them a regression against the dictionary?',
  },
  'AP-I-08': {
    disposition: 'accepted',
    nextAction: 'manual-review',
    result: 'Version-shaped tags are 3 of 467 generated pages (0.64%): cpp17, cpp20, cpp23. The one multi-version family is the C++ standard, where the version is the topic rather than an environment detail, and the singletons fall below the page threshold. There is no product version ladder of the kind the pattern describes.',
    files: ['src/content.config.ts', 'src/lib/posts.ts'],
    verification: 'npm run audit:tags',
    residualRisk: 'Re-open if any single product accumulates three or more version-numbered tag pages, or if version-shaped keys exceed 2% of generated tag pages.',
    reviewQuestion: 'Has any product other than the C++ standard accumulated a ladder of version tags?',
  },
  'AP-I-09': {
    disposition: 'routed',
    nextAction: 'manual-review',
    result: 'Four of the five field-sized tags reach a described hub — a series lens or a populated category page. `cpp` does not: 219 published posts across 5 series and 3 top-level categories, whose only cross-series view is an undescribed paginated tag list. The category that would name that field holds no published posts, because the C++ content is filed under embedded/embedded-cpp, programming/code-review and tools/build.',
    files: ['src/consts/series.ts', 'src/consts/learning-paths.ts', 'src/pages/tags/[tag]/[...page].astro'],
    verification: 'npm run audit:paths && npm run audit:tags',
    residualRisk: 'Routed to the pending learning-path decision rather than fixed here. Building a cpp hub is the same work as placing the unplaced series, and doing it twice would recreate the second curation axis that was deliberately retired. Blocked on a publishing-policy decision that is the site owner\'s, not a technical one.',
    reviewQuestion: 'Once the learning-path scope is decided, does a cross-series entry point exist for the C++ corpus?',
  },
  'AP-I-10': {
    disposition: 'accepted',
    nextAction: 'manual-review',
    result: 'There is no tag cloud: no /tags index page, no frequency-scaled sizing, and at most 12 uniform chips in a sidebar block that sits below the category tree. Tag navigation is already the auxiliary role the pattern prescribes.',
    files: ['src/components/blog/BlogSidebar.astro', 'src/components/blog/TagBadge.astro', 'src/consts/config.ts'],
    verification: 'npm run build && npm run audit:reading',
    residualRisk: 'The 12 chips are picked by raw frequency, so they do carry a "most written means most important" signal, at a scale too small to drive navigation. Re-open if a /tags index is added, if TagBadge gains frequency-dependent styling, or if maxTagsInSidebar rises above ~30.',
    reviewQuestion: 'Has tag navigation been promoted to a primary surface?',
  },
  'AP-I-11': {
    disposition: 'remediated',
    nextAction: 'verify',
    result: 'Series identity is a registry entry rather than a folder: 178 series, 178 registered lenses, no folder holding two series, 0 findings, and the check is a release gate so it cannot regress silently. The hub renders the lens, groups chapters, and carries a per-post description.',
    files: ['src/consts/series.ts', 'src/pages/series/[series].astro', 'scripts/audit-series-structure.mjs', 'scripts/verify-release.mjs'],
    verification: 'npm run audit:series-structure',
    residualRisk: 'Two of the elements the pattern prescribes are absent from the hub: prerequisites, and where to go after finishing. The lens is one sentence of positioning, not a stated learning objective, and neither gap is machine-detectable today.',
    reviewQuestion: 'Does a series hub state what a reader needs first and what to read next?',
  },
  'AP-I-12': {
    disposition: 'remediated',
    nextAction: 'verify',
    result: 'Independently recounted rather than taken from the audit: all 28 published series are contiguous 1..N with no duplicate and no gap across 726 posts, and every published post carries both `series` and `seriesOrder`. The post header prints seriesOrder over a computed count, so a break would surface directly to readers as a wrong fraction.',
    files: ['scripts/audit-series-integrity.py', 'scripts/audit-series-structure.mjs', 'src/pages/blog/[...slug].astro'],
    verification: 'npm run audit:series && npm run audit:series-structure',
    residualRisk: 'audit:series is manual-only — it is not in lefthook, not in CI, and not in verify:release, which runs audit:series-structure instead, and that script assumes ordering is covered elsewhere. A duplicate or gap introduced in a commit would reach dist. Adding it to verify:release is a one-line follow-up.',
    reviewQuestion: 'Is the ordering audit part of a gate yet, or still manual?',
  },
  'AP-I-13': {
    disposition: 'remediated',
    nextAction: 'verify',
    result: 'All four elements the pattern asks for are present above the fold and repeated at the foot: position in series, previous, next, and a link to the whole series, plus a breadcrumb restoring the path upward. An article is where search and external links land, and it was the one page type with no way back up.',
    files: ['src/pages/blog/[...slug].astro', 'src/components/blog/SeriesNav.astro', 'src/components/common/Breadcrumb.astro'],
    verification: 'npm run build && npm run audit:reading && npm run audit:rendered-links',
    residualRisk: 'The position indicator prints frontmatter over a computed length, so it inherits AP-I-12\'s ungated ordering. The sticky sidebar is desktop-only, but SeriesNav is unconditional, so mobile keeps the full ordered list.',
    reviewQuestion: 'Does every series post still render position, previous, next, and a series link?',
  },
  'AP-I-14': {
    disposition: 'remediated',
    nextAction: 'verify',
    result: 'Checked on the built site rather than in source, because the source gate only requires any /blog/ link and a link back into the same series would satisfy it: for each of the 28 published series, the highest-order chapter\'s main column was stripped of header, footer and aside, and its own series URLs subtracted. Last chapters with no link outside their own series: 0.',
    files: ['scripts/audit-series-structure.mjs', 'src/pages/blog/[...slug].astro', 'src/components/blog/RelatedPosts.astro'],
    verification: 'npm run audit:series-structure && npm run audit:connectivity',
    residualRisk: 'The rendered result is stronger than the gate only because RelatedPosts reserves a cross-series slot. If RELATED_POSTS_CONFIG were disabled the gate would still pass while real exits disappeared. Only 8 of 28 series sit in a learning path, so the exits are algorithmic rather than curated.',
    reviewQuestion: 'Does the last chapter of every published series still link outside its own series in the rendered page?',
  },
  'AP-I-15': {
    disposition: 'accepted',
    nextAction: 'manual-review',
    result: 'The worst instance was retired with its reasoning recorded in code: the Topic hub was a second cross-series axis beside learning paths and its one published page duplicated a path section. What remains is measurable — 4 category pages are exact set-duplicates of a series page and 11 tag pages match one at 0.9 or above. The series page is strictly the richer of each pair, so the duplicate is additive noise rather than a wrong answer. The same principle now governs new URLs: the 28 series URL prefixes redirect to the series hub instead of rendering a second listing.',
    files: ['src/pages/topics/[topic].astro', 'src/pages/blog/[...category]/index.astro', 'src/pages/series/[series].astro'],
    verification: 'npm run audit:routes && npm run audit:rendered-links',
    residualRisk: 'embedded/rtos, embedded/riscv, embedded/protocols and tools/emulation are single-series folders promoted to categories, which is the same registry-versus-content mismatch as AP-I-03. Re-open if a fifth appears, or if any duplicated tag page gains its own description and ordering.',
    reviewQuestion: 'Has the number of category pages that exactly duplicate a series page grown?',
  },
  'AP-I-16': {
    disposition: 'remediated',
    nextAction: 'verify',
    result: 'Chronological navigation exists exactly once, in the footer of every page, while topic and path navigation own the header and the homepage. There are no year or month index routes, and the homepage leads with learning paths rather than a date-ordered list.',
    files: ['src/pages/archive.astro', 'src/consts/config.ts', 'src/pages/index.astro'],
    verification: 'npm run build && npm run audit:reading',
    residualRisk: 'dist/archive/index.html inlines all 726 posts at roughly 535 KB. That is the unpaginated-index payload concern already recorded for the category indexes, not an information-architecture one. Re-open if /archive enters the header nav or per-year routes appear.',
    reviewQuestion: 'Has chronology been promoted above topic navigation anywhere?',
  },
  'AP-I-17': {
    disposition: 'accepted',
    nextAction: 'manual-review',
    result: 'Pagination is one route among five on desktop: the same page carries a 65-link category tree, 28 series links, 12 tag links, header search, /paths, and a footer /archive holding the complete index. Nobody has to page to page 37 to reach an old post. Each page also carries its own title and description, so the 73 pages are not identical to a crawler.',
    files: ['src/pages/blog/[...page].astro', 'src/components/blog/BlogSidebar.astro', 'src/pages/archive.astro'],
    verification: 'npm run build && npm run audit:reading && npm run audit:rendered-links',
    residualRisk: 'The block carrying all the alternatives is `hidden lg:block`. Measured on a deep list page with the aside removed: 0 series links and 17 blog links, all of them the 10 post cards plus pagination targets. Below the lg breakpoint a /blog list page degrades to the pattern, leaving only header search, /paths, and the footer archive. Re-open as a mobile-navigation task rather than a pagination one.',
    reviewQuestion: 'Does a mobile reader on a /blog list page have any route to an older post other than paging?',
  },
  'AP-I-18': {
    disposition: 'accepted',
    nextAction: 'manual-review',
    result: 'Not applicable: there is no infinite scroll anywhere in the codebase. Every match for infinite/IntersectionObserver/load-more in src/ is prose inside post markdown. Every list page is a pre-rendered static route with its own URL, so back navigation is an ordinary document load and a bookmarked page identifies itself.',
    files: ['src/components/blog/Pagination.astro', 'src/pages/blog/[...page].astro', 'src/pages/tags/[tag]/[...page].astro'],
    verification: 'npm run build && npm run audit:rendered-links',
    residualRisk: 'Re-open if any list surface gains client-side appending without a URL per page — detectable by grepping src/pages, src/components and src/lib for IntersectionObserver or a load-more control.',
    reviewQuestion: 'Has any list surface gained client-side appending?',
  },
  'AP-I-19': {
    disposition: 'remediated',
    nextAction: 'verify',
    result: 'The homepage leads with learning paths and hand-picked guides and gives chronology three cards in third position, which is the inversion the pattern asks for, and a build-time assertion fails if a curated id stops resolving. The one tier that was missing was already built and unreachable: /recently-updated had zero inbound links anywhere in dist while being submitted for indexing. It is now in the footer beside /archive — inbound links 0 -> 1421.',
    files: ['src/pages/index.astro', 'src/lib/content/curation.ts', 'src/consts/config.ts', 'src/pages/recently-updated.astro'],
    verification: 'npm run build && npm run audit:sitemap',
    residualRisk: 'The curated tier is narrow: 3 guide ids and 4 paths covering 8 of 28 published series, so 69% of the corpus is reachable from the homepage only through /blog. HOMEPAGE_GUIDE_IDS has no review date, and the build assertion checks that the picks resolve, not that they are still the right picks.',
    reviewQuestion: 'Are the three homepage guide ids still the right entry points, and when were they last reviewed?',
  },
  'AP-I-20': {
    disposition: 'accepted',
    nextAction: 'manual-review',
    result: 'Not applicable: the site collects no popularity signal at all — analytics is explicitly disabled — so the feedback loop from traffic to placement cannot form. Every homepage slot is either hand-picked by id or ordered by date; the curation module exposes only newest-first, an author-set frontmatter flag, and a literal id list.',
    files: ['src/lib/content/curation.ts', 'src/consts/homepage-guides.ts', 'src/pages/index.astro'],
    verification: 'npm run audit:product-experience',
    residualRisk: 'The opposite failure applies instead: pure editorial selection going stale. Re-open if analytics or a view counter is introduced and any ordering starts reading it, or if the guide ids go unchanged for a year while the published corpus grows past ~1000 posts.',
    reviewQuestion: 'Has any ranking surface started reading a popularity or engagement metric?',
  },
};

const registry = JSON.parse(await readFile(path, 'utf8'));
const scale = new Set(registry.dispositionScale);
for (const [id, decision] of Object.entries(DECISIONS)) {
  if (!scale.has(decision.disposition)) {
    console.error(`${id}: "${decision.disposition}" is not in dispositionScale (${[...scale].join(', ')}).`);
    process.exit(1);
  }
}

const byId = new Map(registry.items.map((item) => [item.id, item]));
const missing = Object.keys(DECISIONS).filter((id) => !byId.has(id));
if (missing.length) {
  console.error(`Not in the registry: ${missing.join(', ')}.`);
  process.exit(1);
}

const eligible = Object.keys(DECISIONS).filter((id) => byId.get(id).disposition === 'unassessed');
const already = Object.keys(DECISIONS).filter((id) => byId.get(id).disposition !== 'unassessed');

const counts = {};
for (const id of Object.keys(DECISIONS)) {
  const key = DECISIONS[id].disposition;
  counts[key] = (counts[key] ?? 0) + 1;
}

console.log(
  `IA batch 01: ${Object.keys(DECISIONS).length} decision(s) — ` +
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
    verifiedOn: VERIFIED_ON,
    commits: Object.values(COMMITS),
  }];
  item.residualRisk = decision.residualRisk;
}
await writeFile(path, `${JSON.stringify(registry, null, 2)}\n`);
console.log(`Recorded ${eligible.length} information-architecture decision(s).`);

// Post-change verification: re-read from disk and confirm what landed.
const written = JSON.parse(await readFile(path, 'utf8'));
const problems = [];
for (const [id, decision] of Object.entries(DECISIONS)) {
  const item = written.items.find((entry) => entry.id === id);
  if (item.disposition !== decision.disposition) problems.push(`${id}: disposition is ${item.disposition}`);
  if (item.disposition !== 'unassessed' && !item.evidence?.length) problems.push(`${id}: no evidence recorded`);
}
const stillUnassessed = written.items.filter((item) => item.disposition === 'unassessed').length;
if (problems.length) {
  for (const problem of problems) console.error(`  ! ${problem}`);
  process.exitCode = 1;
} else {
  console.log(`Verified: ${Object.keys(DECISIONS).length} recorded with evidence, ${stillUnassessed} still unassessed.`);
}
