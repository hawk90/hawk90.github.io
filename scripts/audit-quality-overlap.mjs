#!/usr/bin/env node
// Reports shared quality evidence without merging distinct anti-pattern IDs.
// Shared controls are intentional; this audit makes the maintenance surface visible.

import { readFile, writeFile } from 'node:fs/promises';

const archive = 'archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273';
const registryPath = `${archive}/remediation-plan/category-registries/quality.json`;
const reportPath = 'reports/quality/overlap.md';
const registry = JSON.parse(await readFile(registryPath, 'utf8'));
const decided = registry.items.filter((item) => item.disposition !== 'unassessed');

const groups = new Map();
for (const item of decided) {
  const evidence = item.evidence?.[0];
  if (!evidence) continue;
  const key = JSON.stringify({ files: [...(evidence.files ?? [])].sort(), verification: evidence.verification ?? '' });
  const group = groups.get(key) ?? { files: [...(evidence.files ?? [])].sort(), verification: evidence.verification ?? '', items: [] };
  group.items.push({ id: item.id, title: item.title, disposition: item.disposition });
  groups.set(key, group);
}

const shared = [...groups.values()]
  .filter((group) => group.items.length > 1)
  .sort((left, right) => right.items.length - left.items.length || left.verification.localeCompare(right.verification));
const duplicateIds = registry.items.map((item) => item.id).filter((id, index, all) => all.indexOf(id) !== index);
const lines = [
  '# Quality evidence overlap audit',
  '',
  `- Decided AP items: ${decided.length}`,
  `- Shared evidence profiles: ${shared.length}`,
  `- Duplicate AP IDs: ${new Set(duplicateIds).size}`,
  '',
  'Shared evidence is not itself an anti-pattern duplicate. Keep atomic AP IDs for traceability; update the shared control once and rerun this report.',
  '',
  '## Shared profiles',
  '',
];
for (const [index, group] of shared.entries()) {
  lines.push(`### Profile ${String(index + 1).padStart(2, '0')} — ${group.items.length} AP items`, '');
  lines.push(`- Verification: \`${group.verification}\``);
  lines.push(`- Files: ${group.files.map((file) => `\`${file}\``).join(', ')}`);
  lines.push(`- AP items: ${group.items.map(({ id, title, disposition }) => `${id} (${disposition}) ${title}`).join('; ')}`, '');
}
if (!shared.length) lines.push('- None', '');
lines.push('## Review rule', '', '- Merge only when the anti-pattern claims are semantically identical and source traceability can be preserved.', '- Otherwise retain separate AP IDs and consolidate implementation in the shared control or verifier.', '');
await writeFile(reportPath, `${lines.join('\n')}\n`);
console.log(`Quality overlap audit: ${shared.length} shared evidence profile(s); ${new Set(duplicateIds).size} duplicate AP ID(s).`);
if (duplicateIds.length) process.exitCode = 1;
