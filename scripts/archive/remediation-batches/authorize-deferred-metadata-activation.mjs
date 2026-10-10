#!/usr/bin/env node
// Grants AP-M metadata remediation activation while repository/quality closure remains pending.
// This exception is limited to metadata/schema/tooling decisions and does not authorize body edits.

import { readFile, writeFile } from 'node:fs/promises';

const apply = process.argv.includes('--apply');
const planRoot = 'archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/remediation-plan';
const graphPath = `${planRoot}/category-execution-graph.json`;
const decisionPath = `${planRoot}/repository-external-risk-acceptance.json`;
const [graph, decision] = await Promise.all([
  readFile(graphPath, 'utf8').then(JSON.parse),
  readFile(decisionPath, 'utf8').then(JSON.parse),
]);
if (decision.decision !== 'accepted-risk-deferral') throw new Error('Existing user-approved external-risk deferral is required.');
const exception = {
  id: 'quality-deferral-for-metadata-only-remediation',
  dependency: 'quality',
  allowedDependent: 'metadata',
  authority: 'User approved immediate AP-M activation because it changes metadata/schema/tooling boundaries, not article bodies.',
  scope: 'Allows AP-M metadata remediation to activate while AP-R/AP-T closure remains unresolved; article bodies, published URLs, and bulk frontmatter rewrites remain out of scope.',
  closureImpact: 'none',
  closureBoundary: 'AP-R, AP-T, and AP-M cannot be declared complete from this activation exception alone; AP-M still requires every item dispositioned and its own evidence checks.',
  reassessmentTrigger: decision.reassessmentTrigger,
};
const existing = graph.activationExceptions ?? [];
const present = existing.some(({ id }) => id === exception.id);
console.log(`Metadata activation exception: ${present ? 'ready to refresh' : 'ready to record'}.${apply ? ' Applying.' : ' Preview only; pass --apply to record.'}`);
if (!apply) process.exit(0);
graph.activationExceptions = present ? existing.map((candidate) => candidate.id === exception.id ? exception : candidate) : [...existing, exception];
await writeFile(graphPath, `${JSON.stringify(graph, null, 2)}\n`);
console.log(`Recorded activation exception ${exception.id}.`);
