#!/usr/bin/env node
// Grants only AP-T activation while AP-R external recovery risk is explicitly accepted.

import { readFile, writeFile } from 'node:fs/promises';

const apply = process.argv.includes('--apply');
const planRoot = 'archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/remediation-plan';
const graphPath = `${planRoot}/category-execution-graph.json`;
const decisionPath = `${planRoot}/repository-external-risk-acceptance.json`;
const [graph, decision] = await Promise.all([readFile(graphPath, 'utf8').then(JSON.parse), readFile(decisionPath, 'utf8').then(JSON.parse)]);
if (decision.decision !== 'accepted-risk-deferral') throw new Error('External-risk deferral decision is required before activation can be authorized.');
const exception = {
  id: 'repository-external-recovery-deferral-for-quality',
  dependency: 'repository',
  allowedDependent: 'quality',
  authority: decision.authority,
  scope: 'Allows AP-T quality remediation to activate while the accepted external AP-R recovery risk remains unresolved.',
  closureImpact: 'none',
  closureBoundary: 'AP-R and AP-T cannot be declared complete from this exception.',
  reassessmentTrigger: decision.reassessmentTrigger,
};
const existing = graph.activationExceptions ?? [];
const present = existing.some(({ id }) => id === exception.id);
console.log(`Repository activation exception: ${present ? 'ready to refresh' : 'ready to record'}.${apply ? ' Applying.' : ' Preview only; pass --apply to record.'}`);
if (!apply) process.exit(0);
graph.activationExceptions = present ? existing.map((candidate) => candidate.id === exception.id ? exception : candidate) : [...existing, exception];
await writeFile(graphPath, `${JSON.stringify(graph, null, 2)}\n`);
console.log(`Recorded activation exception ${exception.id}.`);
