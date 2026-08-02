#!/usr/bin/env node
// Classifies unresolved AP-R items without changing their disposition or content.

import { mkdir, readFile, writeFile } from 'node:fs/promises';

const archive = 'archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273';
const registry = JSON.parse(await readFile(`${archive}/remediation-plan/category-registries/repository.json`, 'utf8'));
const lanes = {
  external_recovery_evidence: ['AP-R-01', 'AP-R-02', 'AP-R-03', 'AP-R-06', 'AP-R-07', 'AP-R-08', 'AP-R-09', 'AP-R-10', 'AP-R-12', 'AP-R-13', 'AP-R-14', 'AP-R-17', 'AP-R-18', 'AP-R-19', 'AP-R-20', 'AP-R-95', 'AP-R-96', 'AP-R-98', 'AP-R-99'],
  content_and_media_preservation: ['AP-R-31', 'AP-R-33', 'AP-R-34', 'AP-R-35', 'AP-R-41', 'AP-R-42', 'AP-R-43', 'AP-R-44', 'AP-R-45', 'AP-R-46', 'AP-R-47', 'AP-R-48', 'AP-R-49', 'AP-R-50', 'AP-R-58', 'AP-R-59', 'AP-R-60', 'AP-R-62', 'AP-R-63', 'AP-R-64', 'AP-R-65', 'AP-R-66', 'AP-R-67', 'AP-R-68', 'AP-R-69', 'AP-R-70', 'AP-R-82', 'AP-R-87', 'AP-R-88'],
  platform_and_redirect_design: ['AP-R-21', 'AP-R-54', 'AP-R-55', 'AP-R-56', 'AP-R-76', 'AP-R-77', 'AP-R-78', 'AP-R-79', 'AP-R-83'],
};
const unresolved = registry.items.filter((item) => item.disposition === 'unassessed');
const assigned = new Set(Object.values(lanes).flat());
const findings = [
  ...unresolved.filter((item) => !assigned.has(item.id)).map((item) => `unclassified unresolved item: ${item.id}`),
  ...[...assigned].filter((id) => !unresolved.some((item) => item.id === id)).map((id) => `classified item is not unresolved: ${id}`),
];
const report = Object.entries(lanes).flatMap(([lane, ids]) => {
  const items = ids.map((id) => registry.items.find((item) => item.id === id)).filter(Boolean);
  return [`## ${lane}`, '', ...items.map((item) => `- ${item.id} — ${item.title}`), ''];
});
await mkdir('reports/repository', { recursive: true });
await writeFile('reports/repository/open-controls.md', ['# Open repository controls', '', `- Unresolved AP-R items: ${unresolved.length}`, `- Classification findings: ${findings.length}`, ...findings.map((finding) => `- ${finding}`), '', 'Classification is routing only; it does not change a disposition or authorize content changes.', '', ...report].join('\n'));
console.log(`Repository open controls: ${unresolved.length} unresolved; ${findings.length} classification finding(s).`);
if (findings.length) process.exitCode = 1;
