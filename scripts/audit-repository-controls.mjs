#!/usr/bin/env node
// Ensures recorded local AP-R controls retain their evidence and are not used to infer external recovery.

import { mkdir, readFile, writeFile } from 'node:fs/promises';

const archive = 'archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273';
const registry = JSON.parse(await readFile(`${archive}/remediation-plan/category-registries/repository.json`, 'utf8'));
const runbook = await readFile(`${archive}/remediation-plan/repository-recovery-runbook.md`, 'utf8');
const expected = new Set(['AP-R-04', 'AP-R-05', 'AP-R-11', 'AP-R-15', 'AP-R-16', 'AP-R-22', 'AP-R-23', 'AP-R-24', 'AP-R-25', 'AP-R-26', 'AP-R-27', 'AP-R-28', 'AP-R-29', 'AP-R-30', 'AP-R-32', 'AP-R-36', 'AP-R-37', 'AP-R-38', 'AP-R-39', 'AP-R-40', 'AP-R-51', 'AP-R-52', 'AP-R-53', 'AP-R-57', 'AP-R-61', 'AP-R-71', 'AP-R-72', 'AP-R-73', 'AP-R-74', 'AP-R-75', 'AP-R-80', 'AP-R-81', 'AP-R-84', 'AP-R-85', 'AP-R-86', 'AP-R-89', 'AP-R-90', 'AP-R-91', 'AP-R-92', 'AP-R-93', 'AP-R-94', 'AP-R-97', 'AP-R-100']);
const findings = [];
for (const id of expected) {
  const item = registry.items.find((candidate) => candidate.id === id);
  if (!item || item.disposition !== 'remediated' || !item.evidence?.[0]?.files?.length) findings.push(`${id}: missing concrete local evidence`);
}
for (const id of ['AP-R-01', 'AP-R-02', 'AP-R-17', 'AP-R-20', 'AP-R-98']) {
  const item = registry.items.find((candidate) => candidate.id === id);
  if (item?.disposition === 'remediated') findings.push(`${id}: external recovery must not be inferred from repository files`);
}
if (!/Required external evidence/.test(runbook) || !/Do not mark the AP-R category complete/.test(runbook)) findings.push('runbook: missing external-evidence or closure boundary');
await mkdir('reports/repository', { recursive: true });
await writeFile('reports/repository/controls.md', ['# Repository control audit', '', `- Local controls expected: ${expected.size}`, `- Findings: ${findings.length}`, ...findings.map((finding) => `- ${finding}`), ''].join('\n'));
console.log(`Repository controls: ${expected.size - findings.length}/${expected.size} verified; ${findings.length} finding(s).`);
if (findings.length) process.exitCode = 1;
