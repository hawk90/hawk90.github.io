#!/usr/bin/env node
// Initializes or refreshes an atomic evidence registry for one non-methodology AP category.

import { access, mkdir, readFile, writeFile } from 'node:fs/promises';

const categoryAt = process.argv.indexOf('--category');
const category = categoryAt === -1 ? null : process.argv[categoryAt + 1];
if (!category || category.startsWith('--')) throw new Error('Usage: node scripts/build-category-registry.mjs --category <triage category>');
const archive = 'archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273';
const planDir = `${archive}/remediation-plan/category-registries`;
const target = `${planDir}/${category}.json`;
const [manifest, triage] = await Promise.all([
  readFile(`${archive}/llm-antipatterns/manifest.json`, 'utf8').then(JSON.parse),
  readFile(`${archive}/remediation-plan/antipattern-triage.json`, 'utf8').then(JSON.parse),
]);
let previous = new Map();
try { await access(target); previous = new Map(JSON.parse(await readFile(target, 'utf8')).items.map((item) => [item.id, item])); } catch { /* First registry generation. */ }
const sources = new Map(manifest.canonicalItems.filter((item) => item.category === category).map((item) => [item.id, item]));
const items = triage.items.filter((item) => item.category === category).map((item) => {
  const prior = previous.get(item.id);
  const source = sources.get(item.id);
  return {
    id: item.id, title: item.title, priority: item.priority, effort: item.effort,
    source: { file: source?.file ?? null, messageIds: source?.sourceMessageIds ?? [] },
    disposition: prior?.disposition ?? 'unassessed',
    nextAction: prior?.nextAction ?? 'manual-review',
    reviewQuestion: prior?.reviewQuestion ?? `Which repository finding and verification would justify a disposition for “${item.title}”?`,
    scope: prior?.scope ?? null, dependsOn: prior?.dependsOn ?? [], evidence: prior?.evidence ?? [], residualRisk: prior?.residualRisk ?? null,
  };
});
await mkdir(planDir, { recursive: true });
await writeFile(target, `${JSON.stringify({ category, dispositionScale: ['unassessed', 'remediated', 'accepted', 'superseded', 'routed'], items }, null, 2)}\n`);
console.log(`Category registry: ${category}; ${items.length} atomic items at ${target}`);
