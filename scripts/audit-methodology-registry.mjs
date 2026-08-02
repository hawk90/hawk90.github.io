#!/usr/bin/env node
// Ensures AP-D traceability before any methodology work is called complete.

import { mkdir, readFile, writeFile } from 'node:fs/promises';

const archive = 'archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273';
const planDir = `${archive}/remediation-plan`;
const [registry, triage] = await Promise.all([
  readFile(`${planDir}/methodology-registry.json`, 'utf8').then(JSON.parse),
  readFile(`${planDir}/antipattern-triage.json`, 'utf8').then(JSON.parse),
]);
const expectedIds = new Set(triage.items.filter(({ category }) => category === 'methodology').map(({ id }) => id));
const seen = new Set();
const findings = [];
for (const item of registry.items ?? []) {
  if (seen.has(item.id)) findings.push({ type: 'duplicate-id', id: item.id });
  seen.add(item.id);
  if (!expectedIds.has(item.id)) findings.push({ type: 'unknown-id', id: item.id });
  if (!registry.dispositionScale.includes(item.disposition)) findings.push({ type: 'invalid-disposition', id: item.id, detail: item.disposition });
  if (!item.source?.file || !item.source?.messageIds?.length) findings.push({ type: 'missing-source', id: item.id });
  if (!['manual-review', 'automated-check', 'implementation', 'discard-review'].includes(item.nextAction)) findings.push({ type: 'invalid-next-action', id: item.id, detail: item.nextAction });
  if (!item.reviewQuestion?.trim()) findings.push({ type: 'missing-review-question', id: item.id });
  if (item.disposition !== 'unassessed' && (!item.evidence?.length || !item.scope)) findings.push({ type: 'missing-decision-evidence', id: item.id });
  if (item.disposition !== 'unassessed') {
    const fields = ['context', 'counterexample', 'alternatives', 'evidenceSummary', 'sampleScope', 'decision', 'smallestSafeChange', 'verificationAndResidualRisk'];
    for (const field of fields) if (!item.assessment?.[field]?.trim()) findings.push({ type: 'missing-assessment-field', id: item.id, detail: field });
  }
  if (item.disposition === 'routed' && !item.executionLane) findings.push({ type: 'missing-execution-lane', id: item.id });
}
for (const id of expectedIds) if (!seen.has(id)) findings.push({ type: 'missing-id', id });
const counts = Object.fromEntries(registry.dispositionScale.map((status) => [status, registry.items.filter((item) => item.disposition === status).length]));
await mkdir('reports/methodology', { recursive: true });
await Promise.all([
  writeFile('reports/methodology/latest.json', `${JSON.stringify({ total: registry.items.length, counts, findings }, null, 2)}\n`),
  writeFile('reports/methodology/latest.md', [
    '# AP-D methodology registry', '',
    '> Each AP-D item requires a concrete disposition and evidence before AP-D can be complete.', '',
    `- Atomic AP-D items: ${registry.items.length}`,
    `- Action-linked items: ${registry.items.filter(({ nextAction, reviewQuestion }) => nextAction && reviewQuestion).length}`,
    ...Object.entries(counts).map(([status, count]) => `- ${status}: ${count}`),
    `- Registry findings: ${findings.length}`,
    '',
    ...findings.map(({ type, id, detail }) => `- ${type}: ${id}${detail ? ` — ${detail}` : ''}`),
  ].join('\n')),
]);
console.log(`Methodology registry: ${registry.items.length} items; ${counts.unassessed} unassessed; ${findings.length} finding(s).`);
console.log('Report: reports/methodology/latest.md');
if (findings.length) process.exitCode = 1;
