#!/usr/bin/env node
// Revises AP-I-15 in the information architecture registry.
// Preview by default; --apply is required. Touches the registry JSON only:
// no article body, no frontmatter, no published URL.
//
// This is a *revision*, not a first disposition, so it is separated from
// record-ia-batch-01.mjs, which deliberately only writes items still sitting at
// `unassessed`. Overwriting a recorded decision is the operation most likely to
// quietly erase evidence, so it refuses to run unless the item is in exactly the
// state this script was written against.
//
// Why the earlier decision was wrong: AP-I-15 was accepted on the grounds that
// a category page duplicating a series page is "additive noise, the series page
// being the richer of the pair". That reasoning measured the two destinations
// and never measured the two *rows in the sidebar that led to them* — which
// were near-identical, one line apart, and gave the reader no way to tell a
// subcategory from a series. It also counted 4 pairs when there were 5.
//
// Usage:
//   node scripts/record-ia-batch-02.mjs           # preview
//   node scripts/record-ia-batch-02.mjs --apply

import { readFile, writeFile } from 'node:fs/promises';

const apply = process.argv.includes('--apply');
const archive = 'archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273';
const path = `${archive}/remediation-plan/category-registries/information_architecture.json`;

const SCOPE = 'Information architecture surfaces only: the category registry and the navigation built from it, tag vocabulary and tag pages, series hubs and in-series navigation, the homepage tiers, and the /blog URL space. Article bodies and published post URLs are out of scope.';
const VERIFIED_ON = '2026-08-20';

/**
 * @type {Record<string, {
 *   expect: string, disposition: string, nextAction: string, result: string,
 *   supersedes: string, files: string[], verification: string,
 *   residualRisk: string, reviewQuestion: string,
 * }>}
 */
const REVISIONS = {
  'AP-I-15': {
    expect: 'accepted',
    disposition: 'remediated',
    nextAction: 'verify',
    supersedes: 'Accepted on 2026-08-20 as additive noise, on the grounds that the series page was the richer half of each duplicate pair. That compared the two destinations and never compared the two sidebar rows leading to them, which is where the reader actually meets the duplication.',
    result:
      'Five pairs, not four: /blog/embedded/protocols, /blog/embedded/rtos, /blog/embedded/riscv and /blog/tools/emulation each rendered the exact post set of one series page, and /blog/programming rendered the exact post set of /blog/programming/code-review (168 posts) because only one child category is published. In the sidebar both halves of a pair appeared as sibling rows in the same indented list with the same styling, differing only by a chevron — so the row that left the /blog/ tree for /series/ was indistinguishable from a subcategory. Fixed by two render-time rules rather than by editing the taxonomy: a branch whose whole content is one series drops the redundant series row, and a branch that only forwards to a single child folds into one row. Rows 39 -> 34, category rows 11 -> 10, series rows 28 -> 24. Both URLs in every pair still exist and stay linked, because each post carries the full category trail in its breadcrumb and each series page holds 90-140 inbound links from its own chapters. Collapsing left four category rows with a chevron opening onto nothing — the dead affordance AP-I-01 removed from empty categories — so a node with no children and no series now renders without a disclosure control: chevrons 11 -> 6, each opening onto something.',
    files: [
      'src/components/blog/BlogSidebar.astro',
      'src/components/blog/CategoryTreeNode.astro',
    ],
    verification: 'npm run build && npm run audit:sitemap && npm run audit:rendered-links && npm run verify:release',
    residualRisk:
      'The rules are derived from published content, so they un-apply on their own: publishing a second series under embedded/rtos restores its series rows, and publishing a sibling of programming/code-review splits that row back in two. What they do not address is the level that carries no grouping at all — 341 of the 464 posts under embedded (73%) hang off series directly at the top level, beside four subcategories that cover the other 123. Whether those seven series deserve subcategories is a taxonomy decision for the author, not a defect to fix in a template.',
    reviewQuestion: 'Does any category page still render the exact post set of a series page or of its own parent, and does every chevron in the sidebar open onto something?',
  },
};

const registry = JSON.parse(await readFile(path, 'utf8'));
const byId = new Map(registry.items.map((item) => [item.id, item]));

const missing = Object.keys(REVISIONS).filter((id) => !byId.has(id));
if (missing.length) {
  console.error(`Not in the registry: ${missing.join(', ')}.`);
  process.exit(1);
}

if (!registry.dispositionScale.includes('remediated')) {
  console.error(`Registry disposition scale does not include "remediated": ${registry.dispositionScale.join(', ')}.`);
  process.exit(1);
}

// Refuse to overwrite a decision that is not the one this script was written
// against — that would mean someone else has since revised it, and the evidence
// below no longer describes what is there.
const drifted = Object.entries(REVISIONS).filter(([id, r]) => byId.get(id).disposition !== r.expect);
const eligible = Object.keys(REVISIONS).filter((id) => byId.get(id).disposition === REVISIONS[id].expect);

console.log(
  `IA batch 02: ${Object.keys(REVISIONS).length} revision(s); ` +
  `${eligible.length} eligible, ${drifted.length} drifted; ` +
  `${apply ? 'applying.' : 'preview only; pass --apply to record.'}`,
);
for (const [id, revision] of Object.entries(REVISIONS)) {
  const item = byId.get(id);
  const note = item.disposition === revision.expect ? '' : `  (expected ${revision.expect}; refusing)`;
  console.log(`  ${id} ${item.disposition} → ${revision.disposition}${note}`);
}
if (drifted.length) {
  console.error('Refusing to overwrite a decision that changed since this script was written.');
  process.exit(1);
}

if (!apply) process.exit(0);

for (const id of eligible) {
  const revision = REVISIONS[id];
  const item = byId.get(id);
  item.disposition = revision.disposition;
  item.nextAction = revision.nextAction;
  item.reviewQuestion = revision.reviewQuestion;
  item.scope = SCOPE;
  // Keep the superseded evidence rather than replacing it. A registry that
  // silently rewrites its own history cannot be used to check a judgement.
  item.evidence = [
    ...(item.evidence ?? []).map((entry) => ({ ...entry, supersededOn: VERIFIED_ON })),
    {
      files: revision.files,
      verification: revision.verification,
      result: revision.result,
      supersedes: revision.supersedes,
      verifiedOn: VERIFIED_ON,
    },
  ];
  item.residualRisk = revision.residualRisk;
}

await writeFile(path, `${JSON.stringify(registry, null, 2)}\n`);
console.log(`Recorded ${eligible.length} revision(s).`);

// Post-change verification: re-read from disk and confirm what landed.
const written = JSON.parse(await readFile(path, 'utf8'));
const problems = [];
for (const [id, revision] of Object.entries(REVISIONS)) {
  const item = written.items.find((entry) => entry.id === id);
  if (item.disposition !== revision.disposition) problems.push(`${id}: disposition is ${item.disposition}`);
  if ((item.evidence ?? []).length < 2) problems.push(`${id}: superseded evidence was dropped`);
  if (!item.evidence?.some((entry) => entry.supersedes)) problems.push(`${id}: revision records no supersedes note`);
}
// Idempotency: a second run finds the item drifted from `expect` and refuses,
// so re-running cannot append the same evidence entry twice.
const rerunWouldRefuse = Object.entries(REVISIONS)
  .every(([id, revision]) => written.items.find((entry) => entry.id === id).disposition !== revision.expect);
if (!rerunWouldRefuse) problems.push('a second run would not refuse — the revision is not idempotent');

const stillUnassessed = written.items.filter((item) => item.disposition === 'unassessed').length;
if (problems.length) {
  for (const problem of problems) console.error(`  ! ${problem}`);
  process.exitCode = 1;
} else {
  console.log(`Verified: ${eligible.length} revised with prior evidence retained, ${stillUnassessed} still unassessed.`);
}
