#!/usr/bin/env node
// Records AP-M-61..75 decisions for artifact pipeline and content lifecycle metadata.
// Preview by default; --apply is required. No article body/frontmatter rewrite.
//
// Two items stay unassessed on purpose. Review tooling existing is not the same
// as the review having happened, so items whose queues are measurably unworked
// carry an implementation next action instead of a disposition.

import { readFile, writeFile } from 'node:fs/promises';

const apply = process.argv.includes('--apply');
const archive = 'archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273';
const path = `${archive}/remediation-plan/category-registries/metadata.json`;
const registry = JSON.parse(await readFile(path, 'utf8'));

const assetFiles = [
  '.gitignore',
  'scripts/build-diagrams.sh',
  'scripts/build-og.mjs',
  'scripts/audit-diagram-assets.mjs',
  'scripts/audit-svg-accessibility.mjs',
  'scripts/audit-diagram-quality.mjs',
  'reports/diagrams/assets.md',
  '.github/workflows/deploy.yml',
];
const lifecycleFiles = [
  'CLAUDE.md',
  'scripts/audit-content-lifecycle.mjs',
  'scripts/audit-content-readiness.mjs',
  'scripts/audit-upstream-freshness.py',
  'scripts/audit-prose-staleness.py',
  'scripts/check-duplicate-topic.py',
  'reports/content-lifecycle/latest.json',
  'reports/content-readiness/latest.md',
];
const assetScope = 'Generated asset pipeline and artifact boundary only; article bodies, published URLs, and bulk frontmatter rewrites are out of scope.';
const lifecycleScope = 'Content lifecycle and review metadata only; article bodies, published URLs, and bulk frontmatter rewrites are out of scope.';
const assetRisk = 'The incremental build compares modification times rather than content hashes, so an artifact edited after its source is never regenerated; rerun the listed audits after toolchain or design-token changes.';
const lifecycleRisk = 'Freshness is derived from content scans rather than recorded per-post review state, so a queue that stops being worked degrades silently; rerun the listed audits after upstream or content changes.';

// [disposition, reviewQuestion, files, verification, result]
const decided = new Map([
  ['AP-M-61', ['remediated',
    'Does the source-to-artifact direction still hold for every committed asset, including the 35 SVGs that have no sibling TeX source?',
    assetFiles,
    'npm run audit:diagrams && npm run verify:release',
    'The boundary is explicit: dist/ is ignored with zero tracked files, TikZ .tex sources are authoritative and .svg artifacts are regenerated from them by build-diagrams.sh, and reports/diagrams/assets.md separates the 35 imported assets that have no sibling source from the generated ones.']],
  ['AP-M-62', ['accepted',
    'Has any committed SVG diverged from its TeX source, given that the incremental build skips any artifact newer than its source?',
    assetFiles,
    'npm run audit:diagrams && npm run audit:diagram-quality',
    'Manual edits are possible but bounded: the TeX source is authoritative, audit:diagrams reports 0 structural findings and 0 temporary build files, and diagrams:force rebuilds everything. The mtime rule in build-diagrams.sh means a hand-edited artifact is preserved silently rather than flagged, which is accepted while diagrams remain reviewed visually.']],
  ['AP-M-63', ['remediated',
    'Do artifact names still survive a post title change without breaking references?',
    assetFiles,
    'npm run audit:diagrams',
    'Artifacts are named by stable structural slugs, not display titles: diagram files use chapter and figure identifiers such as part9-01-int128-bit-layout and ch05-hierarchy-depth, and OG images are keyed by post id in the build manifest. Renaming a post title does not rename an artifact.']],
  ['AP-M-64', ['remediated',
    'Does the asset manifest still enumerate every generated artifact after new asset types are added?',
    assetFiles,
    'npm run audit:diagrams',
    'Both pipelines carry a manifest: reports/diagrams/assets.md enumerates 1038 SVG assets against 1007 TeX sources with orphan and temp-file counts, and build-og.mjs keeps .cache/og-manifest.json keyed by a frontmatter hash plus a themes version.']],
  ['AP-M-65', ['remediated',
    'Are orphaned artifacts still surfaced when a post is deleted or renamed?',
    assetFiles,
    'npm run audit:diagrams',
    'Stale artifacts are detected rather than accumulated: build-og.mjs --prune deletes PNGs whose source post no longer exists, and audit:diagrams reports SVGs with no sibling TeX source (35) and temporary build files (0) on every run.']],
  ['AP-M-66', ['remediated',
    'Does pruning still require an explicit flag, and are imported assets still reported rather than deleted?',
    assetFiles,
    'npm run audit:diagrams',
    'Pruning cannot run by accident: --prune is opt-in and separate from the default og build, and the 35 sibling-less SVGs are reported as manual or imported assets rather than deleted, so the audit never removes what it cannot regenerate.']],
  ['AP-M-67', ['accepted',
    'Would a xelatex or pdftocairo upgrade be noticed, given that cached SVGs are invalidated by modification time rather than by toolchain version?',
    assetFiles,
    'npm run audit:diagrams && npm run audit:diagram-quality',
    'Version recording is partial and the gap is stated: build-og.mjs folds a themes version into its manifest hash, while build-diagrams.sh records no xelatex or pdftocairo version and invalidates only on source and design-token modification times. diagrams:force is the manual escape hatch, and the accepted blast radius is limited because SVGs are committed and reviewed.']],
  ['AP-M-68', ['remediated',
    'Does regenerating an unchanged source still produce byte-identical output after a renderer change?',
    assetFiles,
    'npm run audit:diagrams && npm run verify:release',
    'Generation is reproducible for equal inputs: build-og.mjs re-renders only when the frontmatter hash or themes version changes, so identical input yields a cache hit, and sampled SVG output carries no creation date or timestamp metadata that would differ between runs.']],
  ['AP-M-70', ['remediated',
    'Does publishing still succeed without a TeX toolchain present on the runner?',
    assetFiles,
    'npm run verify:release',
    'The asset pipeline does not own publishing: deploy.yml installs and runs verify:release only, the TikZ build never runs in CI because SVGs are committed pre-built, and OG generation is incremental and cached so publication is not gated on a full asset rebuild.']],
  ['AP-M-72', ['remediated',
    'Do review signals still come from content comparison rather than from elapsed time alone?',
    lifecycleFiles,
    'npm run audit:content-readiness && npm run audit:upstream',
    'Review is not date-driven: freshness comes from upstream commit drift, cited-symbol existence, prose future tense, fact density, image coverage, and series integrity. audit:roadmap is the only date-based check and is scoped to review dates of SKUs registered in known-facts.yaml.']],
  ['AP-M-73', ['accepted',
    'Do the 3387 inventoried posts still have a single accountable maintainer, or have external contributors made ownership ambiguous?',
    lifecycleFiles,
    'npm run audit:lifecycle',
    'Ownership is unambiguous in a single-maintainer repository, so the failure this item targets, content that no one is accountable for, does not currently apply. The acceptance expires if additional maintainers or external contributions arrive.']],
  ['AP-M-74', ['accepted',
    'Is the existing-debt queue still consulted before new chapters are written, given that no gate enforces the order?',
    lifecycleFiles,
    'npm run audit:content-readiness && npm run check:duplicate -- --help',
    'Existing debt is ranked before it is chosen: audit:content-readiness emits a priority queue of staleness, fact-density, draft-only series, and visual-aid candidates, and CLAUDE.md section 14 routes each lifecycle stage to its tool. No gate blocks new content on outstanding debt, so ordering stays an editorial judgement and is accepted as such.']],
  ['AP-M-75', ['accepted',
    'When two published articles are found to overlap, which procedure decides whether they merge, cross-link, or stay separate?',
    lifecycleFiles,
    'npm run check:duplicate -- --help',
    'Duplication is prevented at creation time rather than resolved after the fact: check-duplicate-topic.py scores title, tag, description, and body overlap with a documented threshold and a non-zero exit, and CLAUDE.md section 14 places it at the structural-integrity stage. No written procedure covers merging two already-published overlapping articles, which is accepted while cross-linking remains the default remedy.']],
]);

// Items where the control exists but the queue it produces is measurably unworked.
const deferred = new Map([
  ['AP-M-69', ['implementation',
    'audit:diagram-accessibility reports that 1038 of 1038 SVGs are missing a <title> or <desc>, and fix:diagram-accessibility --apply has never been run; audit:diagram-quality lists 71 heuristic candidates. Should the accessibility metadata be backfilled from the TeX captions in one reviewed pass, and what keeps new diagrams from re-entering the same blind spot?']],
  ['AP-M-71', ['implementation',
    'audit:lifecycle inventories 3387 posts of which 0 carry lastVerified, 0 carry evidenceStatus, and 3387 fall in needsReview, so no post records that it was ever revisited even though the content-derived freshness audits run. Which posts warrant a recorded review state, and can it be populated without a bulk frontmatter rewrite?']],
]);

const eligible = registry.items.filter((item) => (decided.has(item.id) || deferred.has(item.id)) && item.disposition === 'unassessed');
console.log(`Metadata batch 05: ${eligible.length} eligible (${decided.size} decided, ${deferred.size} deferred); ${apply ? 'applying.' : 'preview only; pass --apply to record.'}`);
if (!apply) process.exit(0);

for (const item of eligible) {
  if (decided.has(item.id)) {
    const [disposition, reviewQuestion, files, verification, result] = decided.get(item.id);
    const isAsset = files === assetFiles;
    item.disposition = disposition;
    item.nextAction = disposition === 'remediated' ? 'verify' : 'manual-review';
    item.reviewQuestion = reviewQuestion;
    item.scope = isAsset ? assetScope : lifecycleScope;
    item.evidence = [{ files, verification, result }];
    item.residualRisk = isAsset ? assetRisk : lifecycleRisk;
  } else {
    const [nextAction, reviewQuestion] = deferred.get(item.id);
    item.nextAction = nextAction;
    item.reviewQuestion = reviewQuestion;
  }
}

await writeFile(path, `${JSON.stringify(registry, null, 2)}\n`);
console.log(`Recorded ${decided.size} metadata decisions and ${deferred.size} implementation actions; remaining items stay unassessed.`);
