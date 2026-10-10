#!/usr/bin/env node
// Records the last seven AP-M items, each of which was blocked on an owner
// decision rather than on missing evidence. The owner answered on 2026-08-18:
// the documentation audience is the operator, the recovery runbook moves onto a
// maintained surface, and per-post review state stays unrecorded because the
// content-derived freshness audits already cover it.
//
// Preview by default; --apply is required. No article body/frontmatter rewrite.

import { readFile, writeFile } from 'node:fs/promises';

const apply = process.argv.includes('--apply');
const archive = 'archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273';
const path = `${archive}/remediation-plan/category-registries/metadata.json`;
const registry = JSON.parse(await readFile(path, 'utf8'));

const docFiles = ['README.md', 'CHANGELOG.md', 'CLAUDE.md', 'scripts/README.md', 'package.json'];
const runbookFiles = [
  'docs/runbooks/repository-recovery.md',
  'README.md',
  'scripts/audit-repository-controls.mjs',
  'scripts/audit-repository-resilience.mjs',
];
const assetFiles = [
  'scripts/audit-svg-accessibility.mjs',
  'reports/diagrams/references.md',
  'src/content.config.ts',
];
const lifecycleFiles = [
  'src/content.config.ts',
  'scripts/audit-content-lifecycle.mjs',
  'scripts/audit-prose-staleness.py',
  'scripts/audit-upstream-freshness.py',
  'CLAUDE.md',
];

const docScope = 'Repository documentation only; no article body, published URL, or frontmatter is changed.';
const runbookScope = 'Operational documentation location and the audits that read it; no content or deployment behaviour changes.';
const assetScope = 'Generated diagram inventory and its audit only; no SVG or .tex file is deleted.';
const lifecycleScope = 'Post-level review metadata policy only; no frontmatter is written.';

const docRisk = 'The README now states versions and a canonical pointer rather than restating the script surface, so drift is reduced but not mechanically prevented; recheck after an Astro major upgrade or a change to the CLAUDE.md workflow table.';
const runbookRisk = 'Promotion changes where the runbook lives, not whether it works. Every step in it remains unexercised, and two audits now depend on the new path.';
const assetRisk = 'The 85 built-but-unwired diagrams stay on disk with their .tex sources. If the drafted series they belong to are never published, the inventory grows without a forcing function beyond this report.';
const lifecycleRisk = 'Freshness is inferred from content and upstream drift, not from a human attestation. A post whose sources are stable but whose judgement has aged will not surface.';

// [disposition, reviewQuestion, files, verification, result, scope, risk]
const decided = new Map([
  ['AP-M-51', ['remediated',
    'Does the README still describe the audience it is actually written for after the next change of purpose?',
    docFiles,
    'npm run audit:content-portability',
    'The owner decided the documentation serves the operator, not a theme buyer. README was rewritten around running and maintaining this repository: install and build, where content lives and the file-path-is-URL rule, what blocks a commit or a publish, the handful of scripts worth remembering, and the deployment boundary. Marketplace framing — the premium-theme pitch, the Vercel and Netlify deploy buttons, and the clone-as-my-blog quick start — is gone. LICENSE is deliberately untouched, since its terms are a legal statement rather than a documentation choice.',
    docScope, docRisk]],
  ['AP-M-53', ['remediated',
    'What keeps the stated stack version in step with package.json when the next major lands?',
    docFiles,
    'npm run check && npm run audit:content-portability',
    'The README claimed Astro 6 while package.json depends on astro ^7.1.6, and listed 6 of roughly 100 scripts without the audit:gate step CLAUDE.md requires before publishing. The rewritten README no longer carries a version-pinned stack list at all, and its gate section names audit:gate and verify:release explicitly. Removing the restated facts removes the thing that drifted; the remaining pointer is to CLAUDE.md section 14, which is maintained.',
    docScope, docRisk]],
  ['AP-M-57', ['remediated',
    'Has any of the three documents started restating the script surface again instead of pointing at it?',
    docFiles,
    'npm run audit:content-portability',
    'CLAUDE.md section 14 is canonical for the stage-to-tool map and scripts/README.md for per-script detail. The README now says so in its opening paragraph and keeps only a six-row table of the commands used day to day, so the drift-prone full listing exists in one place instead of three.',
    docScope, docRisk]],
  ['AP-M-58', ['remediated',
    'Which external control gets exercised first, and what records the result?',
    runbookFiles,
    'npm run audit:repository-controls && npm run audit:repository-resilience',
    'The runbook moved from archives/…/remediation-plan/ to docs/runbooks/repository-recovery.md, and README links it from the deployment section. The two audits that read it were updated to the new path and both pass: repository controls 43/43 verified, resilience 8/8 local controls with 4 external pending. The document still states that recovery has not been tested, and that statement was left intact rather than softened by the move. Which external control to exercise first remains open and is tracked by the four pending external controls, not by this item.',
    runbookScope, runbookRisk]],
  ['AP-M-60', ['remediated',
    'Does the Unreleased section stay empty, or does it start collecting work that will not ship again?',
    docFiles,
    'npm run audit:content-portability',
    'The Unreleased section held 1.0.0-era theme-marketplace work that was never released or withdrawn, which read as a shipping queue. Those entries moved to a dated historical section that says plainly that theme distribution did not happen and the repository runs as a personal blog. Nothing was deleted: the Newsletter component and the define* helpers are still in use and are recorded as such, so the note explains the code rather than orphaning it. Unreleased is now empty.',
    docScope, docRisk]],
  ['AP-M-69', ['remediated',
    'When a drafted series is published, does its diagram inventory get rechecked, or do the built-but-unwired ones stay invisible?',
    assetFiles,
    'npm run audit:diagram-accessibility',
    'The original premise was wrong twice. Internal <title>/<desc> was never the accessible name, because every diagram is embedded through <img> and alt carries it. And the corrected count of 223 unreferenced artifacts measured references from published posts only, so it counted draft-series assets as orphans. Measured against all posts: 298 SVGs are referenced by published posts, 656 by drafts alone and become live when those series publish, and 85 are referenced by nothing. All 85 retain their .tex sources and sit in drafted book series — Domain-Driven Design 27, Refactoring Catalog 24, TDD Patterns 15, DSA 10 — so they are diagrams built ahead of the chapter that would use them, not abandoned output. Nothing is retired. The broken reference this item also named, a published HBM chapter pointing at a missing ch09-cxl-mem-tier.svg, was authored and the audit now reports 0 broken with alt coverage complete at 837 of 837.',
    assetScope, assetRisk]],
  ['AP-M-71', ['accepted',
    'Has a post gone stale in a way the content-derived audits cannot see — sources unchanged, but the judgement in the prose aged?',
    lifecycleFiles,
    'npm run audit:lifecycle && npm run audit:staleness && npm run audit:upstream',
    'The owner decided not to record per-post review state. The schema keeps reviewStatus, lastVerified, and evidenceStatus, and 0 of 3387 posts populate them, but no UI reads them and populating them would be a bulk frontmatter rewrite whose initial values would all be identical — a field that says nothing while looking authoritative. Freshness is instead derived from the content: audit:upstream reports drift against tracked upstream repositories and specs, audit-cited-symbols checks that cited symbols still exist, audit:roadmap watches review dates on registered facts, and audit:staleness reads the prose itself for future tense and dated anchors. The accepted cost is named in the residual risk and this item is the review trigger if it starts to bite.',
    lifecycleScope, lifecycleRisk]],
]);

const eligible = registry.items.filter((item) => decided.has(item.id) && item.disposition === 'unassessed');
console.log(`Metadata batch 07: ${eligible.length} eligible of ${decided.size}; ${apply ? 'applying.' : 'preview only; pass --apply to record.'}`);
for (const item of eligible) console.log(`  ${item.id} -> ${decided.get(item.id)[0]}`);
const skipped = [...decided.keys()].filter((id) => !eligible.some((item) => item.id === id));
if (skipped.length) console.log(`  already dispositioned, left alone: ${skipped.join(', ')}`);
if (!apply) process.exit(0);

for (const item of eligible) {
  const [disposition, reviewQuestion, files, verification, result, scope, residualRisk] = decided.get(item.id);
  item.disposition = disposition;
  item.nextAction = disposition === 'remediated' ? 'verify' : 'manual-review';
  item.reviewQuestion = reviewQuestion;
  item.scope = scope;
  item.evidence = [{ files, verification, result }];
  item.residualRisk = residualRisk;
}

await writeFile(path, `${JSON.stringify(registry, null, 2)}\n`);
console.log(`Recorded ${eligible.length} metadata decisions.`);
const remaining = registry.items.filter((item) => item.disposition === 'unassessed').length;
console.log(`AP-M unassessed: ${remaining}.`);
