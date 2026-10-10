#!/usr/bin/env node
// Records AP-M-16..30 decisions for migration/tooling safety boundaries.
// Preview by default; --apply is required. No article body or URL changes.

import { readFile, writeFile } from 'node:fs/promises';

const apply = process.argv.includes('--apply');
const archive = 'archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273';
const path = `${archive}/remediation-plan/category-registries/metadata.json`;
const registry = JSON.parse(await readFile(path, 'utf8'));
const decisions = new Map([
  ['AP-M-16', ['remediated', 'Topic migration parses YAML frontmatter and compares semantic arrays; it does not use regex to rewrite document meaning.']],
  ['AP-M-17', ['remediated', 'Public URLs derive from stable content IDs and are independent of taxonomy paths; path changes do not silently rewrite URLs.']],
  ['AP-M-18', ['remediated', 'Migration emits conflicts/unclassified results and post-change classification audits before a release can pass.']],
  ['AP-M-19', ['accepted', 'The repository keeps focused tools with explicit scopes; overlap and shared evidence are audited rather than forcing unrelated concerns into one command.']],
  ['AP-M-20', ['accepted', 'Content tools use the Astro schema or js-yaml portability parser according to scope; no universal parser equivalence is claimed.']],
  ['AP-M-21', ['remediated', 'Scripts expose usage comments, package commands, README entries, and evidence reports rather than relying on undocumented tribal knowledge.']],
  ['AP-M-22', ['remediated', 'Mutating scripts default to preview/dry-run and require explicit --apply; affected-file reports make side effects visible.']],
  ['AP-M-23', ['remediated', 'Auto-fix paths require explicit apply and refuse conflicts/unclassified records instead of guessing.']],
  ['AP-M-24', ['accepted', 'Representative regression commands exist, while exhaustive fixtures for every content tool remain a targeted follow-up rather than an implied guarantee.']],
  ['AP-M-25', ['accepted', 'Scans are scoped per command and report their corpus; a full repository scan is not treated as universally necessary for every rule.']],
  ['AP-M-26', ['remediated', 'Machine-readable JSON and human-readable Markdown reports are emitted for migration and audit commands.']],
  ['AP-M-27', ['remediated', 'The remediation triage and category registries carry priority/effort scales and disposition fields.']],
  ['AP-M-28', ['accepted', 'Rules retain source IDs, scope, review questions, evidence, and rationale; a new rule still requires semantic review.']],
  ['AP-M-29', ['accepted', 'The registry preserves atomic IDs for traceability while overlap audits identify shared evidence without silently merging distinct claims.']],
  ['AP-M-30', ['accepted', 'Lint/audit output is a review signal; editorial decisions remain explicit metadata/governance decisions and are not auto-published.']],
]);
const files = ['scripts/migrate-explicit-topics.mjs', 'scripts/audit-content-classification.mjs', 'scripts/audit-category-registry.mjs', 'scripts/audit-remediation-program.mjs', 'scripts/README.md', 'package.json', 'archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/remediation-plan/priority-decision-policy.json'];
const items = registry.items.filter((item) => decisions.has(item.id) && item.disposition === 'unassessed');
console.log(`Metadata batch 02: ${items.length} eligible; ${apply ? 'applying.' : 'preview only; pass --apply to record.'}`);
if (!apply) process.exit(0);
for (const item of items) {
  const [disposition, result] = decisions.get(item.id);
  item.disposition = disposition;
  item.nextAction = disposition === 'remediated' ? 'verify' : 'manual-review';
  item.reviewQuestion = `Reassess ${item.title.replace(/^M-\\d+\\. /, '').toLowerCase()} after tooling or migration changes.`;
  item.scope = 'Metadata/tooling safety boundary only; article bodies, published URLs, and bulk frontmatter rewrites are out of scope.';
  item.evidence = [{ files, verification: 'npm run audit:category-registry -- --category metadata --evidence && npm run audit:knowledge-model && npm run gate:tooling', result }];
  item.residualRisk = 'Tool semantics and coverage can drift; any mutating command requires preview, explicit apply, affected-file review, and post-change verification.';
}
await writeFile(path, `${JSON.stringify(registry, null, 2)}\n`);
console.log(`Recorded ${items.length} metadata decisions; remaining items stay unassessed.`);
