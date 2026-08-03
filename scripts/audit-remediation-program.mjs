#!/usr/bin/env node
// Audits every category registry against the dependency graph without changing content.
// This is a program-level readiness report, not a category-completion claim.

import { mkdir, readFile, writeFile } from 'node:fs/promises';

const archive = 'archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273';
const planRoot = `${archive}/remediation-plan`;
const graph = JSON.parse(await readFile(`${planRoot}/category-execution-graph.json`, 'utf8'));
const externalReport = await readFile('reports/repository/external-evidence.md', 'utf8').catch(() => 'not generated');
const externalRiskAcceptance = await readFile(`${planRoot}/repository-external-risk-acceptance.json`, 'utf8').then(JSON.parse).catch(() => null);
const rows = [];
const findings = [];
for (const category of graph.categories) {
  const path = category.id === 'methodology'
    ? `${planRoot}/methodology-registry.json`
    : `${planRoot}/category-registries/${category.id}.json`;
  let registry;
  try { registry = JSON.parse(await readFile(path, 'utf8')); }
  catch { findings.push(`${category.id}: missing registry`); rows.push({ ...category, registry: null }); continue; }
  const counts = Object.fromEntries(['unassessed', 'remediated', 'accepted', 'superseded', 'routed'].map((disposition) => [disposition, registry.items.filter((item) => item.disposition === disposition).length]));
  const total = registry.items.length;
  if (total !== category.expectedApCount) findings.push(`${category.id}: expected ${category.expectedApCount}, found ${total}`);
  if (counts.unassessed && category.status === 'completed') findings.push(`${category.id}: completed with ${counts.unassessed} unassessed item(s)`);
  rows.push({ id: category.id, label: category.label, status: category.status, expectedApCount: category.expectedApCount, counts, dependencies: category.dependsOn, ready: category.status !== 'completed' && category.dependsOn.every((dependency) => graph.categories.find((candidate) => candidate.id === dependency)?.status === 'completed'), closure: category.closure ?? [] });
}
const externalDeferred = /DEFERRED \(not completed\)/.test(externalReport);
if (externalDeferred) findings.push('repository: external recovery evidence is deferred; AP-R closure is prohibited by the runbook');
const report = { generatedAt: new Date().toISOString(), categories: rows, findings, externalRecoveryDeferred: externalDeferred, externalRiskDeferralRecorded: externalRiskAcceptance?.decision === 'accepted-risk-deferral', externalRiskDeferralClosureImpact: externalRiskAcceptance?.closureImpact ?? null };
await mkdir('reports/remediation-program', { recursive: true });
await writeFile('reports/remediation-program/latest.json', `${JSON.stringify(report, null, 2)}\n`);
await writeFile('reports/remediation-program/latest.md', [
  '# Remediation program audit', '',
  '> This report verifies registry coverage and graph readiness. It does not promote a category to `completed`.', '',
  '| Category | Graph status | Items | Unassessed | Remediated | Accepted | Ready |', '| --- | --- | ---: | ---: | ---: | ---: | --- |',
  ...rows.map((row) => row.registry === null ? `| ${row.label} | ${row.status} | — | — | — | — | no |` : `| ${row.label} | ${row.status} | ${row.counts.unassessed + row.counts.remediated + row.counts.accepted + row.counts.superseded + row.counts.routed} | ${row.counts.unassessed} | ${row.counts.remediated} | ${row.counts.accepted} | ${row.ready ? 'yes' : 'no'} |`), '',
  `- Findings: ${findings.length}`,
  ...findings.map((finding) => `- ${finding}`), '',
  `- User-approved external-risk deferral recorded: ${report.externalRiskDeferralRecorded ? 'yes' : 'no'}`,
  `- Deferral closure impact: ${report.externalRiskDeferralClosureImpact ?? 'not recorded'}`,
  '- External recovery: deferred until non-secret evidence records are supplied.',
].join('\n'));
console.log(`Remediation program: ${rows.length} categories; ${findings.length} finding(s); external recovery ${externalDeferred ? 'deferred' : 'not deferred'}.`);
if (findings.length) process.exitCode = 1;
