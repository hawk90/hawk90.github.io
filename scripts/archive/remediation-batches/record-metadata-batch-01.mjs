#!/usr/bin/env node
// Records AP-M-01..15 decisions for schema, taxonomy, and migration boundaries.
// Preview by default; --apply is required. Article bodies and URLs are never edited.

import { readFile, writeFile } from 'node:fs/promises';

const apply = process.argv.includes('--apply');
const archive = 'archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273';
const path = `${archive}/remediation-plan/category-registries/metadata.json`;
const registry = JSON.parse(await readFile(path, 'utf8'));
const decisions = new Map([
  ['AP-M-01', ['remediated', 'The Astro content schema and knowledge-model audit provide one checked-in schema contract with regression checks.']],
  ['AP-M-02', ['accepted', 'Optional metadata is retained where content types differ; the schema does not claim every field applies to every document.']],
  ['AP-M-03', ['accepted', 'Required fields are limited to title, date, and explicit topics; the required set is enforced by schema and classification tests.']],
  ['AP-M-04', ['accepted', 'A shared collection schema models common fields with bounded optional type-specific fields; introducing separate collections remains a future design decision.']],
  ['AP-M-05', ['remediated', 'Content type and review status use explicit enums and topic values resolve through the canonical registry.']],
  ['AP-M-06', ['remediated', 'The topic registry validates duplicate IDs, missing parents, cycles, and unknown explicit topic values.']],
  ['AP-M-07', ['accepted', 'Series identity remains source frontmatter while the series lens registry provides presentation metadata; duplication is audited rather than silently merged.']],
  ['AP-M-08', ['remediated', 'Normalized categories and public URLs are derived at runtime from stable IDs and explicit metadata rather than manually duplicated fields.']],
  ['AP-M-09', ['accepted', 'Generated search/feed/artifact data is treated as derived output with source manifests; no generated field is promoted to editorial source automatically.']],
  ['AP-M-10', ['remediated', 'Schema defaults for author, tags, type, draft, featured, and review status are explicit and covered by the content contract.']],
  ['AP-M-11', ['accepted', 'Legacy categories remain a compatibility field while explicit topics are canonical; removal requires a separately reviewed migration.']],
  ['AP-M-12', ['remediated', 'Topic migration defaults to dry-run and preserves source bodies; no big-bang write is authorized implicitly.']],
  ['AP-M-13', ['remediated', 'The migration script emits conflict/unclassified reports before any --apply write.']],
  ['AP-M-14', ['remediated', 'Migration compares existing explicit topics and only writes missing metadata under explicit --apply, making reruns no-ops for already classified documents.']],
  ['AP-M-15', ['accepted', 'Migration and export policies are additive, but external backup/recovery evidence remains separately deferred and is not inferred from a metadata script.']],
]);
const files = ['src/content.config.ts', 'src/lib/content/normalize.ts', 'src/lib/content/topics.ts', 'src/consts/series.ts', 'scripts/audit-knowledge-model.mjs', 'scripts/verify-topic-registry.mjs', 'scripts/verify-content-classification.mjs', 'scripts/migrate-explicit-topics.mjs', 'scripts/export-portable-content.mjs', `${archive}/remediation-plan/repository-recovery-runbook.md`];
const items = registry.items.filter((item) => decisions.has(item.id) && item.disposition === 'unassessed');
console.log(`Metadata batch 01: ${items.length} eligible; ${apply ? 'applying.' : 'preview only; pass --apply to record.'}`);
if (!apply) process.exit(0);
for (const item of items) {
  const [disposition, result] = decisions.get(item.id);
  item.disposition = disposition;
  item.nextAction = disposition === 'remediated' ? 'verify' : 'manual-review';
  item.reviewQuestion = `Reassess ${item.title.replace(/^M-\\d+\\. /, '').toLowerCase()} after schema, taxonomy, or migration changes.`;
  item.scope = 'Metadata/schema/tooling boundary only; article bodies, published URLs, and bulk frontmatter rewrites are out of scope.';
  item.evidence = [{ files, verification: 'npm run audit:knowledge-model && npm run test:topics && npm run test:classification && npm run audit:content-portability', result }];
  item.residualRisk = 'Metadata semantics and external recovery can change; any frontmatter migration requires preview, explicit approval, additive backup, and post-change verification.';
}
await writeFile(path, `${JSON.stringify(registry, null, 2)}\n`);
console.log(`Recorded ${items.length} metadata decisions; remaining items stay unassessed.`);
