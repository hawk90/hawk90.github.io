#!/usr/bin/env node
// Creates a durable, atomic AP-D disposition registry without inventing remediation evidence.

import { access, mkdir, readFile, writeFile } from 'node:fs/promises';

const archive = 'archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273';
const planDir = `${archive}/remediation-plan`;
const target = `${planDir}/methodology-registry.json`;
const [manifest, triage] = await Promise.all([
  readFile(`${archive}/llm-antipatterns/manifest.json`, 'utf8').then(JSON.parse),
  readFile(`${planDir}/antipattern-triage.json`, 'utf8').then(JSON.parse),
]);
let previous = new Map();
try {
  await access(target);
  const registry = JSON.parse(await readFile(target, 'utf8'));
  previous = new Map((registry.items ?? []).map((item) => [item.id, item]));
} catch { /* Create the initial registry. */ }

const sourceById = new Map(manifest.canonicalItems.filter(({ category }) => category === 'methodology').map((item) => [item.id, item]));
const items = triage.items.filter(({ category }) => category === 'methodology').map((item) => {
  const source = sourceById.get(item.id);
  const prior = previous.get(item.id);
  return {
    id: item.id,
    title: item.title,
    priority: item.priority,
    effort: item.effort,
    source: { file: source?.file ?? null, messageIds: source?.sourceMessageIds ?? [] },
    disposition: prior?.disposition ?? 'unassessed',
    nextAction: prior?.nextAction ?? 'manual-review',
    reviewQuestion: prior?.reviewQuestion ?? `In this repository, under which concrete context does “${item.title}” create a cost, and what evidence would justify remediation, acceptance, or supersession?`,
    assessment: prior?.assessment ?? null,
    scope: prior?.scope ?? null,
    dependsOn: prior?.dependsOn ?? [],
    evidence: prior?.evidence ?? [],
    residualRisk: prior?.residualRisk ?? null,
  };
});
const registry = {
  policy: 'An AP remains unassessed until a concrete repository finding leads to remediation, an explicit context-based acceptance, or a supersession decision. Evidence must identify files and verification; titles alone are never evidence.',
  dispositionScale: ['unassessed', 'remediated', 'accepted', 'superseded', 'routed'],
  items,
};
await mkdir(planDir, { recursive: true });
await writeFile(target, `${JSON.stringify(registry, null, 2)}\n`);
console.log(`Methodology registry: ${items.length} atomic AP-D entries at ${target}`);
