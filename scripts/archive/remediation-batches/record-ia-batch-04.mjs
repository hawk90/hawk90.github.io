#!/usr/bin/env node
// Records AP-I-41..60 decisions for the information architecture registry.
// Preview by default; --apply is required. Touches the registry JSON only.
//
// The batch covers search ranking and loading, filters, zero-result recovery,
// category hubs, the relation graph, content-status signals, and navigation at
// small screen widths. Every number below came from measuring the built site
// over all 726 published post pages, not from reading the anti-pattern text.
//
// One framing mistake is worth recording. Cross-topic reach was first measured
// as "does a related link leave the top-level category", which put it at 7.8%
// and looked like a serious gap. But a link from the CXL series to the PCIe
// series is a cross-topic link even though both sit under `embedded`, so the
// unit was wrong; the series is the boundary the reader is stuck inside, not
// the top category. Re-measured against the series, 94.4% of pages already
// offered a way out — the code holds a slot for exactly that — and the real
// defect was the remaining 5.6%, which is what got fixed.
//
// Usage:
//   node scripts/record-ia-batch-04.mjs           # preview
//   node scripts/record-ia-batch-04.mjs --apply

import { readFile, writeFile } from 'node:fs/promises';

const apply = process.argv.includes('--apply');
const archive = 'archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273';
const path = `${archive}/remediation-plan/category-registries/information_architecture.json`;

const SCOPE = 'Information architecture surfaces only: the category registry and the navigation built from it, tag vocabulary and tag pages, in-series navigation, the homepage tiers, search behaviour, and the /blog URL space. Article bodies and published post URLs are out of scope.';
const VERIFIED_ON = '2026-08-23';
const CORPUS = 'Measured over all 726 published post pages in dist/, plus the built category, tag, and search surfaces. Redirect shims excluded by their refresh meta.';

/** @type {Record<string, {disposition: string, nextAction: string, result: string, files: string[], verification: string, residualRisk: string|null, reviewQuestion: string, dependsOn?: string[]}>} */
const DECISIONS = {
  'AP-I-41': {
    disposition: 'accepted',
    nextAction: 'manual-review',
    result: 'Ranking is by field, not by frequency. calculateScore weights title 100/50/30 by exactness, tags 20/10, description 15, series 5, and takes Math.max across the expanded query terms rather than summing them — so repeating a keyword adds nothing, and matching through three synonyms does not beat matching once. Article bodies are not indexed at all: the index carries title, a 160-character description, at most 5 tags, series, date, and reading order. A long post cannot outrank a short one by being long, because length is not a value the scorer can see.',
    files: ['src/lib/search.ts', 'src/pages/search.json.ts'],
    verification: 'npm run test:search && npm run build',
    residualRisk: 'Headings are not indexed either, so a query that matches a section title deep in an article finds nothing unless the words also appear in the title, description, or tags. That is a coverage limit rather than a ranking bug, and adding headings would reopen this item because heading text is where frequency effects would enter.',
    reviewQuestion: 'Does any indexed field let a document win on repetition or on length rather than on where the match occurred?',
  },
  'AP-I-42': {
    disposition: 'accepted',
    nextAction: 'automated-check',
    result: 'Code and logs cannot pollute results because they are never indexed. The search document is five text fields built from frontmatter — title, truncated description, tags, series, order — and the markdown body, where every code block and every log excerpt lives, is not among them. The whole index is 273 KB for 726 posts, about 376 bytes each, which is itself the evidence that no body text is in it.',
    files: ['src/pages/search.json.ts'],
    verification: 'npm run build && node -e "const i=require(\'./dist/search.json\'); console.log(Object.keys(i[0]))"',
    residualRisk: 'A separate code search mode, which the source material offers as the alternative, does not exist and would require indexing bodies. Re-open only if body indexing is ever added.',
    reviewQuestion: 'Does the search index contain any field derived from the article body?',
  },
  'AP-I-43': {
    disposition: 'remediated',
    nextAction: 'automated-check',
    result: 'This was real and it was the largest single cost measured in this batch. A 1200 ms idle timer fetched the entire index on every page load whether or not the reader ever searched: 273 KB, 78 KB gzipped, against an average page HTML of 30 KB gzipped — 2.6x the weight of the page the reader actually asked for. The intent-based paths (hovering or focusing the search trigger, opening the modal) already existed; the timer defeated them, and it defeated them worst on phones, where there is no hover to preload from and the bytes cost the most. The timer is gone; the index now loads when someone asks to search. Removing it exposed a second defect underneath: typing before the index arrived ran the query against an empty array and rendered "No results" — a wrong answer that looks exactly like a real one. renderResults now checks whether the index is loaded and shows the loading state, then re-runs against whatever the query has become.',
    files: ['src/components/common/SearchModal.astro'],
    verification: 'npm run build, then confirmed in the shipped bundle: setTimeout absent, the not-loaded guard present as `!p&&(t||g)`, and fetch reachable only from the loader, whose listeners are pointerenter, focus, and the modal open path.',
    residualRisk: 'Verified statically against the emitted bundle, not by driving a browser — there is no DOM harness in this repo, so the state machine was read rather than exercised. The first search on a cold page now waits for a fetch it used to have in hand; the modal shows a spinner for that time and no gate measures it.',
    reviewQuestion: 'Does any code path fetch /search.json without the reader having signalled an intent to search?',
  },
  'AP-I-44': {
    disposition: 'accepted',
    nextAction: 'manual-review',
    result: 'Filters exist and are honoured: searchPosts takes filterTag and filterSeries, applies them before scoring, and supports filter-with-no-query as a browse mode. They are entered by clicking a tag badge or a series label anywhere on the site, which arrives at the modal with the filter already set and shown as a removable chip.',
    files: ['src/lib/search.ts', 'src/components/common/SearchModal.astro'],
    verification: 'npm run test:search && npm run build',
    residualRisk: 'A filter can be removed inside the modal but not chosen inside it, so the two axes are only discoverable by noticing that badges elsewhere are clickable. The type axis the source material proposes — Guide, Debug, Experiment, Reference — has no equivalent in the content schema; introducing one is an editorial decision about what these posts are, not a rendering fix.',
    reviewQuestion: 'Can a reader who opens search directly discover that filtering exists?',
  },
  'AP-I-45': {
    disposition: 'accepted',
    nextAction: 'manual-review',
    result: 'Two axes, tag and series, mutually exclusive and single-valued — inside the 2-3 the source material recommends, and there is no filter UI to get lost in because a filter is set by clicking something the reader was already looking at. The year, difficulty, platform, version, author, and status axes the anti-pattern lists do not exist.',
    files: ['src/lib/search.ts', 'src/components/common/SearchModal.astro'],
    verification: 'npm run test:search',
    residualRisk: 'Any new frontmatter field that becomes filterable — a status or difficulty signal, for instance — puts this item back in play. That is the tension with AP-I-54 and AP-I-55, which ask for exactly such fields.',
    reviewQuestion: 'How many filter axes can be active at once, and does setting them cost more than typing the query would?',
    dependsOn: ['AP-I-54', 'AP-I-55'],
  },
  'AP-I-46': {
    disposition: 'remediated',
    nextAction: 'automated-check',
    result: 'The recovery surface already existed — an empty result offers to drop a filter that is hiding matches, showing how many results that would restore, and links out to /paths and /archive. What did not hold was the honesty of the message: because the index was fetched lazily, typing before it arrived scored the query against an empty array and produced that same "No results" screen. The reader was told nothing matched when nothing had been searched yet. Fixed with the loaded-state guard recorded under AP-I-43.',
    files: ['src/components/common/SearchModal.astro'],
    verification: 'npm run build, then confirmed the guard precedes every scoring path in the emitted bundle.',
    residualRisk: 'Spelling correction and did-you-mean suggestions, two of the five recoveries the source material lists, do not exist. Alias expansion covers part of the same ground — 데드락 finds Deadlock — but only for pairs someone has written down in data/tag-aliases.yaml, and a typo is not an alias.',
    reviewQuestion: 'Can the empty-result screen ever appear when the reason is not that the corpus lacks a match?',
  },
  'AP-I-47': {
    disposition: 'accepted',
    nextAction: 'manual-review',
    result: 'There is nothing to boost. No post is marked as a canonical guide and no hub page competes for the same queries, so the failure mode — a fragment outranking the overview that would have oriented the reader — has no two candidates to occur between. The one structural preference the ranking does express is the closest available equivalent: equal-scoring results are ordered by seriesOrder, so a query matching a whole series returns chapter 1 first rather than the most recently written chapter.',
    files: ['src/lib/search.ts'],
    verification: 'npm run test:search',
    residualRisk: 'If a guide or hub type is ever introduced, this becomes live immediately and the ranking has no field to express the preference with.',
    reviewQuestion: 'Does any post claim to be the entry point for a topic, and does search rank it as one?',
  },
  'AP-I-48': {
    disposition: 'accepted',
    nextAction: 'manual-review',
    result: 'A category page is a list of posts plus a description, and it now also carries the category tree at every width rather than only above 1024px (see AP-I-58). It does not carry the six things the source material asks a hub for: a topic definition, a structure diagram, a learning order, representative documents, subtopics in the body, or recent changes. Two of those are navigation and now exist through the tree; the other four are written editorial content that does not exist to render, and reading order in particular already has a home in the learning paths.',
    files: ['src/pages/blog/[...category]/index.astro', 'src/components/blog/BlogSidebar.astro'],
    verification: 'npm run build && npm run audit:reading',
    residualRisk: 'Accepted on the grounds that the missing parts are content decisions, not rendering gaps — writing a definition and choosing representative documents for each category is the author\'s call. Coupled to AP-I-09: the learning paths are where a reading order would live, and they are waiting on a publishing decision.',
    reviewQuestion: 'What does a category page tell a reader that a tag page does not?',
    dependsOn: ['AP-I-09'],
  },
  'AP-I-49': {
    disposition: 'accepted',
    nextAction: 'manual-review',
    result: 'The inverse risk, and it is structurally unavailable. A category page has no authored body: everything in it is generated from the posts it lists, so there is no place for hub-level explanation to accumulate and start competing with the articles. The only prose is the one-line category description from the registry.',
    files: ['src/pages/blog/[...category]/index.astro', 'src/consts/categories.ts'],
    verification: 'npm run build && npm run audit:reading',
    residualRisk: 'Becomes live the moment AP-I-48 is answered by writing hub content, since that is the mechanism this warns about. Whatever gets written should stay a map.',
    reviewQuestion: 'Does any hub page explain a topic rather than point at the posts that explain it?',
    dependsOn: ['AP-I-48'],
  },
  'AP-I-50': {
    disposition: 'accepted',
    nextAction: 'automated-check',
    result: 'Hubs are derived, not maintained. A category page lists whatever declares that topic, computed at build time, so a new post appears in its hub the moment it publishes and cannot be forgotten there. There is no hand-kept list to fall behind the archive.',
    files: ['src/pages/blog/[...category]/index.astro', 'src/lib/posts.ts'],
    verification: 'npm run build && npm run audit:connectivity',
    residualRisk: 'One surface on the site is hand-curated and does go stale: the learning paths, which name 45 series of which 8 have published posts. That is AP-I-09 and it is routed. The automatic-candidates-plus-manual-approval split the source material recommends is what the relation graph already does (AP-I-52); the paths are the place it does not.',
    reviewQuestion: 'Is there any listing on the site that a new post has to be added to by hand?',
    dependsOn: ['AP-I-09'],
  },
  'AP-I-51': {
    disposition: 'remediated',
    nextAction: 'automated-check',
    result: 'Measured against the boundary that actually traps a reader — the series, not the top-level category — 94.4% of pages already offered a way out, because the related block holds one of its three slots for a post outside the current series. The defect was the other 5.6%: that slot requires a shared tag, and on 41 pages nothing outside the series shared one, so the slot went to a third sibling and the reader was left inside the series with no exit. Those 41 now fall back to the nearest shared topic, ranked by how deep the shared topic is, and say so in their own words — 같은 분야의 다른 시리즈 rather than borrowing the tag wording for a relation that is not tag-based. After the change, 0 of 726 pages offer only siblings.',
    files: ['src/lib/posts.ts', 'src/components/blog/RelatedPosts.astro'],
    verification: 'npm run build, then counted the reason labels in every built related block: 726 pages, 41 using the new topic fallback, 0 pages where every related link stays in the series (was 41).',
    residualRisk: 'A shared topic is a weaker relation than a shared tag and the fallback picks by topic depth then recency, so some of the 41 pairs are merely same-field rather than genuinely adjacent — the HBM chapter reaching PCIe is apt, a recipes chapter reaching the bootloader series less so. The label is honest about which kind of relation it is, and a curated relation overrides it wherever the author writes one.',
    reviewQuestion: 'Can a reader reach another line of work from any published post without using search?',
  },
  'AP-I-52': {
    disposition: 'accepted',
    nextAction: 'manual-review',
    result: 'This is already the design. Curated relations are rendered first and carry an author-written sentence saying why the two posts belong together; the automatic scorer only fills the slots left over, and labels its picks with the mechanism that produced them so a generated relation never poses as an editorial one. Two curated relations exist today, both linking CXL to PCIe, and both display their own reasoning rather than 공통 태그 기반 추천.',
    files: ['src/lib/posts.ts', 'src/components/blog/RelatedPosts.astro', 'src/lib/content'],
    verification: 'npm run test:relations && npm run build',
    residualRisk: 'Two curated relations across 726 posts means the automatic scorer decides essentially every relation on the site. The mechanism for human approval exists and is almost unused, which is a different problem from not having one, and it is the author\'s to spend time on.',
    reviewQuestion: 'Can a generated relation be told apart from an approved one by reading the page?',
  },
  'AP-I-53': {
    disposition: 'remediated',
    nextAction: 'automated-check',
    result: 'Not overload by volume: backlinks run to a median of 4 and a p90 of 7, with 14 pages above 10 and exactly one at 21 — nothing like the dozens the source material describes, so no cap was warranted. The defect was composition. 82% of backlinks came from the post\'s own series, and that series\' full chapter list is already in the sidebar and again under the article, so the block spent most of its length showing a reader the same neighbours a third time while the links from elsewhere sat below them in date order — an order that decides nothing, because chapters of one series share a date by convention. Backlinks from another series now lead. On all 202 pages that have such a backlink, one is now first; nothing was dropped.',
    files: ['src/lib/posts.ts', 'src/components/blog/Backlinks.astro'],
    verification: 'npm run build, then checked every built backlink block: 709 pages carry one, 202 have a cross-series backlink, and on 202 of 202 it is now the first entry.',
    residualRisk: 'The 21-backlink page is still 21 entries long, now merely better ordered. A separate panel for the full list, which the source material suggests, was not built — the measured lengths did not justify hiding anything.',
    reviewQuestion: 'Does the backlink block lead with something the rest of the page does not already show?',
  },
  'AP-I-54': {
    disposition: 'routed',
    nextAction: 'manual-review',
    result: 'No content-status signal reaches a reader. Lists and search results show title, description, tags, series, and date; nothing distinguishes a post that is current from one kept for the record. Part of the underlying data does exist internally — audit:staleness flags future tense and date anchors in prose, audit:upstream tracks drift against upstream repositories, and reports/content-lifecycle keeps a view of it — but none of it is published, and none of it decides what a post\'s status is.',
    files: ['src/content.config.ts', 'src/components/blog/PostCard.astro', 'scripts/audit-prose-staleness.py'],
    verification: 'npm run audit:staleness (report only; produces no reader-facing state)',
    residualRisk: 'Routed rather than accepted because the gap is real and visible to readers: a 2024 post about a moving target reads exactly like one written last week. What blocks it is not implementation but judgement — declaring 726 posts Current, Historical, Needs Review, or Superseded is an editorial act with consequences for how the archive reads, and it is the author\'s to make. The internal signals could seed a first pass.',
    reviewQuestion: 'Should the archive tell readers which posts are still maintained, and who decides that for each post?',
  },
  'AP-I-55': {
    disposition: 'routed',
    nextAction: 'manual-review',
    result: 'No difficulty signal exists in the schema or in any rendered surface. A reader can arrive at a chapter on flit formats or arbitration/mux directly from search with nothing warning that it assumes the preceding fifteen chapters.',
    files: ['src/content.config.ts'],
    verification: 'npm run build (no such field is read anywhere)',
    residualRisk: 'Routed for the same reason as AP-I-54: the fix is a frontmatter field plus a judgement for every post, and the judgement is the author\'s. Series order already carries some of this implicitly — chapter 15 is not an entry point — which is why this is a signal worth having rather than an urgent one.',
    reviewQuestion: 'Is Intro/Intermediate/Advanced worth assigning per post, or does series position already say enough?',
  },
  'AP-I-56': {
    disposition: 'accepted',
    nextAction: 'manual-review',
    result: 'Cannot occur. There is no difficulty value to be mistaken for an objective one, so the failure mode this describes — a fixed label that ignores what the reader already knows — has nothing to attach to.',
    files: ['src/content.config.ts'],
    verification: 'npm run build',
    residualRisk: 'Accepted only for as long as AP-I-55 stays unbuilt. If a difficulty signal is added, this constraint applies from the first post that carries one: it should arrive with its prerequisites, not alone.',
    reviewQuestion: 'If a difficulty signal is introduced, does it state what it assumes the reader already knows?',
    dependsOn: ['AP-I-55'],
  },
  'AP-I-57': {
    disposition: 'routed',
    nextAction: 'manual-review',
    result: 'No audience or role signal exists. Navigation is by topic and by series, and a firmware engineer and a kernel developer see the same tree.',
    files: ['src/consts/categories.ts', 'src/components/blog/BlogSidebar.astro'],
    verification: 'npm run build',
    residualRisk: 'Routed rather than accepted, but with the lowest urgency of the three signal items: the source material itself says not to force it onto every page, and topic categories on a blog this specialised already carry much of the same information — someone reading the RTOS series has self-selected. Which posts, if any, deserve a role label is an editorial judgement.',
    reviewQuestion: 'Is there a post whose topic does not already tell a reader whether it is for them?',
    dependsOn: ['AP-I-55'],
  },
  'AP-I-58': {
    disposition: 'remediated',
    nextAction: 'automated-check',
    result: 'Real, and worse than the anti-pattern describes. The complaint is that desktop structure gets crammed into a mobile menu; here it never arrived. The category tree — the only path from /blog/embedded to /blog/embedded/rtos — sat inside `hidden lg:block`, so it existed at one breakpoint. The header\'s mobile menu carries six site-level links and no category structure, and it is itself `md:hidden`, which left a gap between 768 and 1024 pixels where neither surface showed the tree at all. Below 1024px a category page was a list of posts with no way down into it. The sidebar now renders at every width: first in the document, pushed last in the flex row at lg, so on a narrow screen it stacks above the list instead of below twelve posts and a pager. It costs about five rows because the tree collapses to its top level, plus twelve tag chips.',
    files: ['src/components/blog/BlogSidebar.astro', 'src/pages/blog/[...page].astro', 'src/pages/blog/[...category]/index.astro', 'src/pages/tags/[tag]/[...page].astro'],
    verification: 'npm run build && npm run audit:reading, then confirmed on the built /blog, /blog/embedded, and /tags/cxl pages that the aside carries no `hidden` class, precedes the main column, and renders about five rows collapsed.',
    residualRisk: 'Moving the sidebar ahead of the main column put its two section labels before the page\'s own <h1>, so "Browse" outranked the category name for anyone navigating by heading. They are now paragraphs, and the navigation landmarks they label carry them through aria-labelledby; heading order on the built pages starts at h1 again. The reading gate only detects level skips, not a heading preceding the h1, so it did not catch this and would not catch it again.',
    reviewQuestion: 'Can a reader on a phone get from a category page to one of its subcategories?',
  },
  'AP-I-59': {
    disposition: 'accepted',
    nextAction: 'manual-review',
    result: 'The post-page sidebar carries two blocks of the six the source material lists: the series chapter list and the table of contents. Related posts, backlinks, the author bio, tags, and advertising are all in the article flow, not the sidebar — measured across 300 pages, the aside contains the TOC on 300 and nothing else besides the series list. The longer of the two is bounded: the series list is capped at min(44vh, 32rem) with its own scroll region, and a script scrolls the current chapter into view on load, so a 151-chapter series occupies the same height as a 6-chapter one.',
    files: ['src/pages/blog/[...slug].astro', 'src/components/blog/SeriesSidebar.astro', 'src/components/blog/TableOfContents.astro'],
    verification: 'npm run build, then counted candidate blocks inside <aside> across 300 built post pages.',
    residualRisk: 'Visually bounded, not cheap: a chapter of the 151-post recipes series still emits every sibling link twice, once in the sidebar and once in the bottom series nav. That is page weight rather than sidebar overload and belongs to the performance registry. Separately, the list-page sidebar now appears on mobile too (AP-I-58) — two blocks, about five rows, worth re-checking if it grows.',
    reviewQuestion: 'How many distinct blocks does the sidebar carry, and is the longest of them height-bounded?',
  },
  'AP-I-60': {
    disposition: 'accepted',
    nextAction: 'manual-review',
    result: 'Not a dump. The table of contents filters to depth 2-3, so h4 and below never enter it — across the corpus that excludes only 12 headings anyway, since these articles are two levels deep in practice. Length runs to a median of 17 entries, p90 26, and a single worst case of 48 on a CMake chapter; h3 entries are indented on their own rail so the two levels are distinguishable rather than flattened into one list.',
    files: ['src/components/blog/TableOfContents.astro'],
    verification: 'npm run build, then counted TOC entries against article headings across all 726 published post pages: 13,146 entries against 18,949 headings.',
    residualRisk: 'The TOC does not exist below 1024px at all — the post-page aside is still `hidden lg:block`, and unlike the category tree it was not moved, because a 48-entry list above the article needs a disclosure control that does not exist yet and the component emits an id that would collide if rendered twice. So on a phone the reader has no in-page navigation for a 48-heading article. Related to AP-I-58 and deliberately left for its own change rather than bundled here untested.',
    reviewQuestion: 'Is the table of contents shorter than the article, and does it exist on the screen sizes people read on?',
    dependsOn: ['AP-I-58'],
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
const danglingDeps = Object.entries(DECISIONS)
  .flatMap(([id, d]) => (d.dependsOn ?? []).map((dep) => [id, dep]))
  .filter(([, dep]) => !byId.has(dep));
if (danglingDeps.length) {
  console.error(`dependsOn points at nothing: ${danglingDeps.map(([id, dep]) => `${id} → ${dep}`).join(', ')}.`);
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
  `IA batch 04: ${Object.keys(DECISIONS).length} decision(s) — ` +
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
  item.dependsOn = decision.dependsOn ?? [];
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
  console.error(`\nVerification failed:\n  ${problems.join('\n  ')}`);
  process.exit(1);
}
console.log(`Verified: ${Object.keys(DECISIONS).length} recorded with evidence, ${stillUnassessed} still unassessed.`);
