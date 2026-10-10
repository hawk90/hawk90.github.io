#!/usr/bin/env node
// Records AP-M-46..60 decisions for dependency lifecycle and documentation metadata.
// Preview by default; --apply is required. No article body/frontmatter rewrite.
//
// Five items stay unassessed on purpose. README framing is an owner decision
// (CHANGELOG records a deliberate theme-marketplace intent), so items that
// depend on it carry an implementation next action instead of a disposition.

import { readFile, writeFile } from 'node:fs/promises';

const apply = process.argv.includes('--apply');
const archive = 'archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273';
const path = `${archive}/remediation-plan/category-registries/metadata.json`;
const registry = JSON.parse(await readFile(path, 'utf8'));

const dependencyFiles = [
  'package.json',
  'package-lock.json',
  'astro.config.mjs',
  '.nvmrc',
  '.github/workflows/ci.yml',
  '.github/workflows/deploy.yml',
  'scripts/verify-release.mjs',
];
const documentationFiles = [
  'README.md',
  'CHANGELOG.md',
  'CLAUDE.md',
  'scripts/README.md',
  'claude/WORKFLOW.md',
  '.claude/rules/06-remediation-evidence.md',
];
const dependencyScope = 'Dependency lifecycle and build-plugin metadata only; article bodies, published URLs, and bulk frontmatter rewrites are out of scope.';
const documentationScope = 'Repository documentation surfaces only; article bodies, published URLs, and bulk frontmatter rewrites are out of scope.';
const dependencyRisk = 'Transitive dependency, advisory, and upstream release behavior changes outside this repository; rerun the listed checks after manifest or workflow changes.';
const documentationRisk = 'Documentation drifts silently because no gate compares prose against the manifest; recheck when the stack, script surface, or distribution intent changes.';

// [disposition, reviewQuestion, evidence, scope, residualRisk]
const decided = new Map([
  ['AP-M-46', ['remediated',
    'Does every remark/rehype plugin and Shiki grammar in astro.config.mjs still have a used-by-content justification after new fence labels appear?',
    dependencyFiles,
    'npm run gate:tooling && npm run verify:release',
    'The plugin stack is bounded and justified in place: astro.config.mjs pins the Shiki grammar bundle to 23 languages against a ~200-language default with a stated heap reason, and the eight remark/rehype plugins each back a documented authoring feature (math, directives, callouts, slugs, autolinks, lazy images). The manifest carries 21 runtime and 3 dev dependencies.']],
  ['AP-M-47', ['accepted',
    'If an automated upgrade bot is ever added, does a major version bump still require an explicit reviewed commit rather than an auto-merge?',
    dependencyFiles,
    'npm run gate:tooling && npm run verify:release',
    'No Renovate or Dependabot configuration exists, so no upgrade lands by habit; every version change is an explicit manifest or lockfile edit reviewed in its own commit. The cost of manual upgrades is accepted for a single-maintainer repository.']],
  ['AP-M-48', ['remediated',
    'Does the weekly advisory cron still run, and is there a review point for dependencies that are outdated without being vulnerable?',
    dependencyFiles,
    'npm run gate:dependencies && npm run verify:release',
    'Dependencies are not frozen: ci.yml carries a weekly cron that re-checks advisories and the production build while the repository is idle, and the dompurify 3.4.12 to 3.4.13 and nanoid 3.3.16 to 3.3.18 bumps were applied from that signal.']],
  ['AP-M-49', ['remediated',
    'Do CI, deployment, and local installs still resolve identically from the committed lockfile after a Node or npm major change?',
    dependencyFiles,
    'npm run verify:release',
    'The lockfile is reproducible: lockfileVersion 3 is committed, both ci.yml and deploy.yml install with npm ci, and the runtime is pinned by engines node >=22.12.0, .nvmrc, and workflow node-version 22. A local npm ci reproduced the tree and the release gate passed.']],
  ['AP-M-50', ['remediated',
    'Does the dependency gate still block on findings without any path that upgrades packages automatically?',
    dependencyFiles,
    'npm run gate:dependencies && npm run verify:release',
    'The scanner reports and blocks but never upgrades: gate:dependencies runs npm audit --omit=dev --audit-level=high as a separate release gate, installs use --no-audit, and the two advisories found were resolved by a reviewed minimal lockfile patch rather than npm audit fix, which would also have dropped unrelated libc platform metadata.']],
  ['AP-M-52', ['accepted',
    'Do the README feature claims still have a single accountable maintainer, or have external contributors made ownership ambiguous?',
    documentationFiles,
    'npm run audit:remediation-graph',
    'Ownership is unambiguous in a single-maintainer repository, so the failure this item targets, features that no one is accountable for, does not currently apply. The acceptance expires if additional maintainers or external contributions arrive.']],
  ['AP-M-54', ['accepted',
    'When the src/ layer structure changes, is the reasoning still recoverable from documentation rather than from component comments alone?',
    documentationFiles,
    'npm run audit:remediation-graph',
    'Process and tooling architecture is documented outside code: CLAUDE.md section 14 maps each content lifecycle stage to its tool, scripts/README.md documents the script surface, and claude/WORKFLOW.md documents the remediation flow. The src/ component layering itself remains documented only in code and is accepted as reviewable.']],
  ['AP-M-55', ['remediated',
    'Does every non-unassessed remediation entry still carry residual risk and a re-review condition rather than a bare verdict?',
    documentationFiles,
    'npm run audit:remediation-graph',
    'Decision records here are the remediation registries, and .claude/rules/06-remediation-evidence.md requires consequences on every one: residual risk, a smallest-safe-change boundary, and an expiry or re-review condition for accepted decisions. audit-category-registry.mjs rejects entries missing a next action or review question.']],
  ['AP-M-56', ['remediated',
    'Can a recorded decision still be reopened from its own review question when the underlying evidence changes?',
    documentationFiles,
    'npm run audit:remediation-graph',
    'No decision is immutable: every registry entry keeps a reviewQuestion and a nextAction so it can be reopened, accepted decisions require an expiry or re-review condition, and AP-M-31..45 were re-recorded from unassessed under the same schema.']],
  ['AP-M-59', ['remediated',
    'Does the authoring guide still match the gate that enforces it after tone, structure, or visual rules change?',
    documentationFiles,
    'npm run audit:gate',
    'A content authoring guide exists and is enforced: CLAUDE.md inlines .claude/rules/01 through 05 covering tone, structure, frontmatter, code blocks, visuals, linking, and quality, and lefthook runs the publish gate on staged markdown at commit and push.']],
]);

// Items that need an owner decision or an implementation before a disposition.
const deferred = new Map([
  ['AP-M-51', ['implementation',
    'CHANGELOG records README, LICENSE, and CHANGELOG as written for marketplace listings, but the repository now operates as a personal blog with 100 package scripts and a publish gate. Should the README serve the theme audience, the operating audience, or split into two documents?']],
  ['AP-M-53', ['implementation',
    'README states Astro 6 while package.json depends on astro ^7.1.6, and its Scripts table lists 6 of 100 scripts without the audit:gate step that CLAUDE.md requires before publishing. Which setup path is the supported one, and what keeps the stated versions in step with the manifest?']],
  ['AP-M-57', ['implementation',
    'The script surface is described in README.md, scripts/README.md, and CLAUDE.md section 14, and the README copy has already drifted. Which of the three is canonical, and can the other two reference it instead of restating it?']],
  ['AP-M-58', ['implementation',
    'Deployment and rollback steps exist only inside per-phase remediation packets, not as a standing runbook. What is the minimum operational procedure a reader needs when a deploy fails or a published page must be reverted?']],
  ['AP-M-60', ['implementation',
    'The CHANGELOG Unreleased section still lists theme-marketplace work from the 1.0.0 era that was never released or withdrawn. Should those entries ship, move to a historical note, or be deleted?']],
]);

const eligible = registry.items.filter((item) => (decided.has(item.id) || deferred.has(item.id)) && item.disposition === 'unassessed');
console.log(`Metadata batch 04: ${eligible.length} eligible (${[...decided.keys()].length} decided, ${[...deferred.keys()].length} deferred); ${apply ? 'applying.' : 'preview only; pass --apply to record.'}`);
if (!apply) process.exit(0);

for (const item of eligible) {
  if (decided.has(item.id)) {
    const [disposition, reviewQuestion, files, verification, result] = decided.get(item.id);
    const isDependency = files === dependencyFiles;
    item.disposition = disposition;
    item.nextAction = disposition === 'remediated' ? 'verify' : 'manual-review';
    item.reviewQuestion = reviewQuestion;
    item.scope = isDependency ? dependencyScope : documentationScope;
    item.evidence = [{ files, verification, result }];
    item.residualRisk = isDependency ? dependencyRisk : documentationRisk;
  } else {
    const [nextAction, reviewQuestion] = deferred.get(item.id);
    item.nextAction = nextAction;
    item.reviewQuestion = reviewQuestion;
  }
}

await writeFile(path, `${JSON.stringify(registry, null, 2)}\n`);
console.log(`Recorded ${decided.size} metadata decisions and ${deferred.size} implementation actions; remaining items stay unassessed.`);
