#!/usr/bin/env node
// Applies explicit, evidence-backed AP-D control mappings. Preview by default.

import { readFile, writeFile } from 'node:fs/promises';

const apply = process.argv.includes('--apply');
const registryPath = 'archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/remediation-plan/methodology-registry.json';
const registry = JSON.parse(await readFile(registryPath, 'utf8'));
const controls = [
  {
    id: 'evidence-calibration', range: [13, 20],
    question: 'What baseline, time range, sample distribution, reproduction, and user/operational context support this finding—and what signal would disprove it?',
    scope: 'Repository-wide audit calibration process; no published content or frontmatter is changed.',
    files: ['.claude/rules/06-remediation-evidence.md', 'scripts/audit-content-readiness.mjs', 'scripts/audit-remediation-evidence-policy.mjs'],
    result: 'Decision records require context, counterexamples, evidence, sample scope, and verification; candidate reports remain non-decisive.',
    risk: 'Signals and thresholds require reassessment when the corpus, traffic, or operating conditions change.',
  },
  {
    id: 'catalog-semantics', range: [21, 24],
    question: 'Is this an atomic, source-traceable condition with a clear decision meaning, rather than a duplicate, catch-all, or unreviewable micro-label?',
    scope: 'Repository-wide anti-pattern catalog integrity process; no published content or frontmatter is changed.',
    files: ['archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/llm-antipatterns/manifest.json', 'archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/remediation-plan/methodology-registry.json', 'scripts/audit-methodology-registry.mjs'],
    result: 'The registry preserves atomic IDs, original sources, next actions, and duplicate-ID validation before batching.',
    risk: 'Semantic overlap still needs evidence-backed review; atomic source records are not a license to create new labels.',
  },
  {
    id: 'contextual-classification', range: [25, 29],
    question: 'Does this decision use neutral language, explicit context, cross-references, reader purpose, and separately recorded priority rather than a technology, hierarchy, or severity label?',
    scope: 'Repository-wide classification and prioritization process; no published content or frontmatter is changed.',
    files: ['.claude/rules/06-remediation-evidence.md', 'archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/remediation-plan/category-execution-graph.json', 'scripts/audit-remediation-graph.mjs'],
    result: 'The workflow requires contextual decisions and separates category identity, dependency, priority, and closure evidence.',
    risk: 'Reader-facing taxonomy proposals remain review candidates until evidence establishes a stable domain.',
  },
  {
    id: 'catalog-versioning', range: [30, 30],
    question: 'Can this catalog decision be traced to an immutable source, a current registry record, and a reproducible audit rather than an undocumented snapshot?',
    scope: 'Repository-wide anti-pattern catalog versioning process; no published content or frontmatter is changed.',
    files: ['archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md', 'archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/llm-antipatterns/manifest.json', 'scripts/audit-methodology-registry.mjs'],
    result: 'The lossless archive, canonical manifest, and generated registry preserve source-to-decision traceability.',
    risk: 'New source material requires an explicit regeneration and review; historical source files remain preserved.',
  },
  {
    id: 'multi-factor-priority', range: [31, 38],
    question: 'Which qualitative evidence covers user impact, frequency, blast radius, confidence, reversibility, dependency order, maintenance cost, and effort—and is defer or do-nothing preferable?',
    scope: 'Repository-wide remediation priority process; no published content or frontmatter is changed.',
    files: ['archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/remediation-plan/priority-decision-policy.json', 'scripts/audit-priority-decision-policy.mjs', 'scripts/audit-remediation-graph.mjs'],
    result: 'Priority policy requires eight qualitative factors, forbids severity/easy-win/composite-score shortcuts, and allows defer or do-nothing decisions.',
    risk: 'Factors guide review but do not calculate an automatic answer; changing evidence requires reassessment.',
  },
  {
    id: 'reviewable-priority-lifecycle', range: [39, 50],
    question: 'Does this routing decision respect dependency order, use a baseline and distribution rather than false precision, permit defer/do-nothing, and record acceptance rationale, residual risk, and reassessment trigger?',
    scope: 'Repository-wide priority and acceptance lifecycle; no published content or frontmatter is changed.',
    files: ['archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/remediation-plan/priority-decision-policy.json', 'archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/remediation-plan/category-execution-graph.json', 'scripts/audit-priority-decision-policy.mjs'],
    result: 'Priority remains a dependency-aware, multi-factor, reviewable decision with baseline, reassessment, do-nothing, and explicit acceptance requirements.',
    risk: 'Qualitative factors cannot remove judgement; a material change in evidence requires reassessment.',
  },
  {
    id: 'safe-change-automation', range: [51, 70],
    question: 'Does this change have a baseline, positive and negative acceptance criteria, smallest safe scope, representative pilot, preview/explicit-apply behavior, idempotency, partial-failure reporting, review sampling, and rollback boundary?',
    scope: 'Repository-wide change and automation safety process; no published content or frontmatter is changed by this control.',
    files: ['archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/remediation-plan/change-automation-policy.json', 'scripts/audit-change-automation-policy.mjs', 'claude/WORKFLOW.md'],
    result: 'The change policy requires bounded scope, evidence, preview-first automation, explicit apply, idempotency, reporting, sampling, rollback, and script-only frontmatter changes.',
    risk: 'A compliant automation can still make a bad editorial decision; preservation and evidence requirements remain in force.',
  },
  {
    id: 'completion-governance', range: [71, 94],
    question: 'Has this work passed happy and negative paths, before/after and long-tail sampling, experience review, cleanup/documentation, reassessment, and a stateful evidence-backed backlog/closure process?',
    scope: 'Repository-wide validation, completion, and backlog governance process; no published content or frontmatter is changed.',
    files: ['archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/remediation-plan/governance-lifecycle-policy.json', 'claude/WORKFLOW.md', 'scripts/audit-governance-lifecycle-policy.mjs'],
    result: 'Completion and backlog policy requires validation beyond merge status, evidence-backed states, reassessment, and proportional governance.',
    risk: 'Policy compliance does not prove the selected validation sample is sufficient; reviewers must record limits.',
  },
  {
    id: 'evidence-led-culture', range: [95, 100],
    question: 'Does this decision favor evidence, reversible progress, preservation with explicit rationale, and an action/reflection loop over fear, shame, sunk cost, perfectionism, or endless analysis?',
    scope: 'Repository-wide remediation decision culture; no published content or frontmatter is changed.',
    files: ['archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/remediation-plan/governance-lifecycle-policy.json', '.claude/rules/06-remediation-evidence.md', 'scripts/audit-governance-lifecycle-policy.mjs'],
    result: 'The policy makes reversible, evidence-backed decisions and reassessment mandatory while keeping preservation-first boundaries explicit.',
    risk: 'Culture controls guide decisions but require ongoing review to remain effective.',
  },
];
const numberOf = (id) => Number(id.match(/^AP-D-(\d+)$/)?.[1] ?? 0);
const candidates = [];
for (const item of registry.items) {
  const number = numberOf(item.id);
  const control = controls.find(({ range: [first, last] }) => number >= first && number <= last);
  if (!control || item.disposition !== 'unassessed') continue;
  candidates.push({ item, control });
}
console.log(`Methodology control mapping: ${candidates.length} eligible AP-D items.${apply ? ' Applying.' : ' Preview only; pass --apply to record.'}`);
for (const { item, control } of candidates) console.log(`- ${item.id} -> ${control.id}`);
if (!apply) process.exit(0);
for (const { item, control } of candidates) {
  item.disposition = 'remediated';
  item.nextAction = 'manual-review';
  item.reviewQuestion = control.question;
  item.scope = control.scope;
  item.assessment = {
    context: `${item.title}: ${control.scope}`,
    counterexample: 'A context-specific, source-backed decision that records its limits is not the anti-pattern described by this item.',
    alternatives: 'Use an undocumented heuristic, use a single automatic score, or apply the mapped evidence control with explicit counterexamples and residual risk. The evidence control is adopted.',
    evidenceSummary: control.result,
    sampleScope: 'The control is applied to every atomic AP-D item in this mapped range, while preserving each item ID and source.',
    decision: `Remediate through the ${control.id} control; its evidence requirement is enforced before later task activation.`,
    smallestSafeChange: 'Record the control mapping and audit it without changing published content, URLs, or frontmatter.',
    verificationAndResidualRisk: `npm run audit:methodology verifies the record. ${control.risk}`,
  };
  item.evidence = [{ files: control.files, verification: 'npm run audit:methodology', result: control.result }];
  item.residualRisk = control.risk;
}
await writeFile(registryPath, `${JSON.stringify(registry, null, 2)}\n`);
console.log(`Recorded ${candidates.length} AP-D control dispositions.`);
