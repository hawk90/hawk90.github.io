#!/usr/bin/env node
// Reports, but does not infer, the four external recovery controls required for AP-R closure.

import { mkdir, readFile, writeFile } from 'node:fs/promises';

const archive = 'archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273';
const registry = JSON.parse(await readFile(`${archive}/remediation-plan/category-registries/repository.json`, 'utf8'));
const controls = {
  'independent-backup-and-restore-test': ['AP-R-01', 'AP-R-02', 'AP-R-03', 'AP-R-04', 'AP-R-05', 'AP-R-07', 'AP-R-08', 'AP-R-09', 'AP-R-10', 'AP-R-12', 'AP-R-13', 'AP-R-14', 'AP-R-16'],
  'domain-dns-recovery': ['AP-R-17', 'AP-R-18', 'AP-R-19', 'AP-R-20', 'AP-R-95', 'AP-R-96'],
  'account-recovery': ['AP-R-06', 'AP-R-98', 'AP-R-99'],
  'emergency-static-host': ['AP-R-20'],
};
const pending = []; const deferred = [];
for (const [control, ids] of Object.entries(controls)) {
  const unresolved = ids.filter((id) => registry.items.find((item) => item.id === id)?.disposition === 'unassessed');
  if (unresolved.length) pending.push({ control, unresolved });
  const accepted = ids.filter((id) => registry.items.find((item) => item.id === id)?.disposition === 'accepted');
  if (accepted.length) deferred.push({ control, accepted });
}
await mkdir('reports/repository', { recursive: true });
await writeFile('reports/repository/external-evidence.md', ['# Repository external recovery evidence', '', `- Controls pending: ${pending.length}`, `- Controls deferred by accepted risk: ${deferred.length}`, ...pending.map(({ control, unresolved }) => `- PENDING — ${control}: ${unresolved.join(', ')}`), ...deferred.map(({ control, accepted }) => `- DEFERRED (not completed) — ${control}: ${accepted.join(', ')}`), '', 'Repository files do not prove external backup, DNS, account, or emergency-host state. Deferred is not completed.'].join('\n'));
console.log(`Repository external evidence: ${pending.length} pending; ${deferred.length} deferred (not completed).`);
