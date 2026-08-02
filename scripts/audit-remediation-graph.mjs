#!/usr/bin/env node
// Validates category-level dependencies and prevents baseline work from being misreported as closure.

import { access, mkdir, readFile, writeFile } from 'node:fs/promises';

const planRoot = 'archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/remediation-plan';
const [graph, triage] = await Promise.all([
  readFile(`${planRoot}/category-execution-graph.json`, 'utf8').then(JSON.parse),
  readFile(`${planRoot}/antipattern-triage.json`, 'utf8').then(JSON.parse),
]);
const categories = new Map(graph.categories.map((category) => [category.id, category]));
const findings = [];
const states = new Set(graph.statusScale);
const exceptions = graph.activationExceptions ?? [];
for (const exception of exceptions) {
  if (!exception.id || !categories.has(exception.dependency) || !categories.has(exception.allowedDependent) || exception.closureImpact !== 'none') findings.push({ type: 'invalid-activation-exception', category: exception.allowedDependent ?? 'unknown', detail: exception.id ?? 'missing id' });
}
const dependencySatisfiedForActivation = (category, dependency) => categories.get(dependency)?.status === 'completed'
  || exceptions.some((exception) => exception.dependency === dependency && exception.allowedDependent === category.id && exception.closureImpact === 'none');
let methodologyRegistry = null;
try {
  await access(`${planRoot}/methodology-registry.json`);
  methodologyRegistry = JSON.parse(await readFile(`${planRoot}/methodology-registry.json`, 'utf8'));
} catch { /* The registry is created by build:methodology-registry. */ }
for (const category of graph.categories) {
  if (!states.has(category.status)) findings.push({ type: 'invalid-status', category: category.id, detail: category.status });
  const actualApCount = triage.items.filter(({ category: id }) => id === category.id).length;
  if (actualApCount !== category.expectedApCount) findings.push({ type: 'ap-count', category: category.id, detail: `expected ${category.expectedApCount}, found ${actualApCount}` });
  for (const dependency of category.dependsOn) {
    const target = categories.get(dependency);
    if (!target) findings.push({ type: 'missing-dependency', category: category.id, detail: dependency });
    else if (category.status === 'completed' && target.status !== 'completed') findings.push({ type: 'blocked-completion', category: category.id, detail: `${dependency} is ${target.status}` });
  }
  if (category.status === 'completed' && !category.closure?.length) findings.push({ type: 'missing-closure', category: category.id, detail: 'completed categories require explicit closure criteria' });
}
if (categories.get('methodology')?.status === 'completed') {
  if (!methodologyRegistry) findings.push({ type: 'missing-methodology-registry', category: 'methodology' });
  else if (methodologyRegistry.items.some(({ disposition }) => disposition === 'unassessed')) findings.push({ type: 'unassessed-methodology-ap', category: 'methodology', detail: 'AP-D completion requires every atomic item to be dispositioned.' });
}
const ready = graph.categories.filter((category) => category.status !== 'completed' && category.dependsOn.every((dependency) => dependencySatisfiedForActivation(category, dependency)));
const report = { generatedAt: new Date().toISOString(), categories: graph.categories, ready: ready.map(({ id, label }) => ({ id, label })), findings };
await mkdir('reports/remediation-graph', { recursive: true });
await Promise.all([
  writeFile('reports/remediation-graph/latest.json', `${JSON.stringify(report, null, 2)}\n`),
  writeFile('reports/remediation-graph/latest.md', [
    '# Remediation execution graph', '',
    '> `baseline_established` means enabling work exists; it is never category completion.', '',
    '| Category | Status | Depends on |', '| --- | --- | --- |',
    ...graph.categories.map(({ label, status, dependsOn }) => `| ${label} | ${status} | ${dependsOn.length ? dependsOn.join(', ') : '—'} |`), '',
    `- Ready to activate: ${ready.length ? ready.map(({ label }) => label).join(', ') : 'none'}`,
    `- Activation exceptions: ${exceptions.length}`,
    `- Graph findings: ${findings.length}`,
    ...findings.map(({ type, category, detail }) => `- ${type}: ${category} — ${detail}`), '',
  ].join('\n')),
]);
console.log(`Remediation graph: ${graph.categories.length} categories; ${ready.length} ready; ${findings.length} finding(s).`);
console.log('Report: reports/remediation-graph/latest.md');
if (findings.length) process.exitCode = 1;
