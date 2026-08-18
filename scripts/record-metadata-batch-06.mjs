#!/usr/bin/env node
// Records AP-M-76..90 decisions for content retirement and change discipline.
// Preview by default; --apply is required. No article body/frontmatter rewrite.

import { readFile, writeFile } from 'node:fs/promises';

const apply = process.argv.includes('--apply');
const archive = 'archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273';
const path = `${archive}/remediation-plan/category-registries/metadata.json`;
const registry = JSON.parse(await readFile(path, 'utf8'));

const contentFiles = [
  'CLAUDE.md',
  'CHANGELOG.md',
  'claude/WORKFLOW.md',
  '.claude/rules/06-remediation-evidence.md',
  'scripts/audit-content-lifecycle.mjs',
  'src/consts/config.ts',
  'src/lib/content/normalize.ts',
];
const changeFiles = [
  'claude/WORKFLOW.md',
  '.claude/rules/06-remediation-evidence.md',
  'lefthook.yml',
  'package.json',
  'scripts/audit-tooling.mjs',
  'scripts/audit-publish-gate.sh',
  '.github/workflows/ci.yml',
  '.github/workflows/deploy.yml',
  `${archive}/remediation-plan/repository-recovery-runbook.md`,
];
const contentScope = 'Content retirement and editorial policy metadata only; article bodies, published URLs, and bulk frontmatter rewrites are out of scope.';
const changeScope = 'Change-management and release metadata only; article bodies, published URLs, and bulk frontmatter rewrites are out of scope.';
const contentRisk = 'Preservation-first policy grows the unpublished inventory over time, so navigation, search, and review cost need rechecking as it grows.';
const changeRisk = 'Commit and release discipline is enforced by convention plus hooks that can be bypassed with --no-verify; recheck after workflow, hook, or release-contract changes.';

// [disposition, reviewQuestion, files, verification, result]
const decided = new Map([
  ['AP-M-76', ['accepted',
    'Has any content actually been retired under the approval-plus-evidence path, or has preservation become the only outcome the process can produce?',
    contentFiles,
    'npm run audit:lifecycle',
    'Preservation is a stated policy rather than an unexamined reflex: claude/WORKFLOW.md makes published content preservation-first and requires explicit approval plus per-document evidence before deleting, drafting, merging, or archiving. The cost is visible, with 2661 of 3387 posts held as drafts, and is accepted while the approval path stays open.']],
  ['AP-M-77', ['remediated',
    'Does an edited document still get revalidated before it lands after hook or gate changes?',
    changeFiles,
    'npm run audit:gate && npm run verify:release',
    'Edits cannot land unvalidated: lefthook runs the publish gate and frontmatter checks on staged markdown at commit and on changed files at push, audit:gate sweeps the whole corpus, and verify:release rebuilds and re-gates in CI before deployment.']],
  ['AP-M-78', ['remediated',
    'Does the preview-by-default contract still hold mechanically for every script that can write to content?',
    changeFiles,
    'npm run gate:tooling && npm run audit:methodology-policy',
    'Bulk rewriting is blocked by rule and by machine: claude/WORKFLOW.md and .claude/rules/06 forbid bulk rewrite or mass drafting to clear an anti-pattern queue, frontmatter changes are script-only with preview-by-default and explicit --apply, and audit-tooling.mjs enforces that contract across 138 script files rather than trusting the convention.']],
  ['AP-M-79', ['accepted',
    'Has the standard section flow started producing interchangeable articles, or does per-article judgement still vary the structure?',
    contentFiles,
    'npm run audit:series',
    'The template is a default, not a lock: CLAUDE.md defines a standard flow and required frontmatter, but explicitly delegates paragraph flow, section splitting, and table use to per-article judgement, and two tones coexist with a documented selection table. No gate enforces section order.']],
  ['AP-M-80', ['accepted',
    'Retirement is defined as a policy but has never been exercised; when the first article is retired, does it archive with its URL intact or disappear as a draft flip?',
    contentFiles,
    'npm run audit:lifecycle',
    'A retirement decision rule exists without a worked procedure: claude/WORKFLOW.md requires explicit approval and per-document evidence, and audit-content-lifecycle.mjs already counts a reviewStatus of archived. That status is used by 0 of 3387 posts, so the de facto path is a draft flip, which removes the URL rather than archiving it. Accepted while no retirement is pending.']],
  ['AP-M-81', ['remediated',
    'Do content sweeps still land separately from platform changes as the repository grows?',
    changeFiles,
    'npm run gate:repository',
    'Content and platform changes are separated in practice: over the last 300 commits exactly one touches both src/content and the platform directories, and that commit is a documented content sweep. Commit subjects carry scoped prefixes such as chore(content), fix(blog), and docs.']],
  ['AP-M-82', ['accepted',
    'Do the large sweeps still stay single-purpose, or has a mixed-intent commit appeared since ac24bb76 combined a rename with a date normalization?',
    changeFiles,
    'npm run gate:repository',
    'Commits are small by default and large only mechanically: the last 200 commits have a median of 3 files changed and a 90th percentile of 24, and the outliers are single-purpose script-driven sweeps such as recording topic metadata or unpublishing a series. One 685-file commit combined a chapter rename with a date normalization, which is the accepted exception.']],
  ['AP-M-83', ['accepted',
    'Is a semantic content edit still readable in a diff without a formatter having rewritten the surrounding lines?',
    changeFiles,
    'npm run gate:repository',
    'Mechanical rewrites are isolated into their own commits rather than mixed into semantic edits: the ASCII-to-TikZ conversion, code-block cleanup, and broken-link repair each landed as separate batches, and no formatter runs automatically over markdown, so reformatting noise is not injected into unrelated changes. No written rule enforces the separation.']],
  ['AP-M-84', ['remediated',
    'Do the runbook recovery priorities still match the deployment workflow, and has any of its external controls been exercised yet?',
    changeFiles,
    'npm run verify:release',
    'A rollback plan exists and states its own limits: the repository recovery runbook defines the recovery priority as source first, then a readable static site with canonical URLs unchanged, then redirects and discovery, then optional integrations, and names required evidence and pass conditions per control. It declares that it is a checklist rather than proof recovery was tested, and the deployed site is a rebuildable artifact from committed source.']],
  ['AP-M-85', ['remediated',
    'Does preview still serve the same artifact the deployment publishes after build or workflow changes?',
    changeFiles,
    'npm run verify:release',
    'Preview is representative because it serves the production artifact: npm run preview serves the output of astro build, the same build that verify:release runs and that CI and deploy execute, and prebuild generates OG images on both paths. Preview still runs against a local build rather than the deployed host.']],
  ['AP-M-86', ['accepted',
    'Do the disabled configuration toggles still have a live purpose, or has a commented block outlived the integration it described?',
    contentFiles,
    'npm run check',
    'Toggles are enumerated and typed rather than scattered: src/consts/config.ts holds the full set behind define* helpers, and the disabled ones carry inline instructions for enabling instead of dead code branches. Commented configuration blocks accumulate without an expiry, which is the accepted residue.']],
  ['AP-M-87', ['accepted',
    'Does the tech-to-article type alias still have callers, and can it be retired once no content uses the legacy value?',
    contentFiles,
    'npm run check && npm run gate:classification',
    'Only one compatibility shim exists and it is a single line: normalize.ts maps the legacy content type tech to article. It is bounded and typed, and is accepted rather than removed because removing it would require revalidating the affected documents.']],
  ['AP-M-88', ['accepted',
    'When the next release ships, do its notes still describe user-visible effects rather than internal refactors?',
    contentFiles,
    'npm run audit:remediation-graph',
    'Release notes are written in user-visible terms: CHANGELOG follows Keep a Changelog and its Added and Fixed entries name reader-facing behavior such as reading mode, math scrolling, and fixed layout defects. The Unreleased section has not shipped since 1.0.0 and is tracked separately as AP-M-60.']],
  ['AP-M-89', ['remediated',
    'Is a findings baseline still recorded before implementation once phases run less formally?',
    changeFiles,
    'npm run audit:remediation-graph',
    'A baseline is required before changes: claude/WORKFLOW.md orders the loop as read the packet, inspect the current implementation and record concrete findings, then implement only the named task IDs. Each phase packet carries CONTEXT, FINDINGS, CHANGES, and VERIFICATION, and the remediation graph tracks a per-category baseline state.']],
  ['AP-M-90', ['remediated',
    'Does the program still refuse to read an enabling baseline as category completion?',
    changeFiles,
    'npm run audit:remediation-graph && npm run audit:methodology-policy',
    'Completion is defined by evidence, not by a merge: the remediation graph report states that baseline_established means enabling work exists and is never category completion, WORKFLOW.md requires running the listed verification commands and forbids claiming success for a failed command, and audit-category-registry.mjs rejects any recorded decision whose evidence files or npm commands do not exist.']],
]);

const eligible = registry.items.filter((item) => decided.has(item.id) && item.disposition === 'unassessed');
console.log(`Metadata batch 06: ${eligible.length} eligible of ${decided.size}; ${apply ? 'applying.' : 'preview only; pass --apply to record.'}`);
if (!apply) process.exit(0);

for (const item of eligible) {
  const [disposition, reviewQuestion, files, verification, result] = decided.get(item.id);
  const isChange = files === changeFiles;
  item.disposition = disposition;
  item.nextAction = disposition === 'remediated' ? 'verify' : 'manual-review';
  item.reviewQuestion = reviewQuestion;
  item.scope = isChange ? changeScope : contentScope;
  item.evidence = [{ files, verification, result }];
  item.residualRisk = isChange ? changeRisk : contentRisk;
}

await writeFile(path, `${JSON.stringify(registry, null, 2)}\n`);
console.log(`Recorded ${eligible.length} metadata decisions; remaining items stay unassessed.`);
