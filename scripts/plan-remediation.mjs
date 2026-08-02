#!/usr/bin/env node

import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const args = process.argv.slice(2);
const archiveAt = args.indexOf('--archive');
const archive = archiveAt === -1 ? 'archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273' : args[archiveAt + 1];
if (!archive || archive.startsWith('--')) throw new Error('Usage: node scripts/plan-remediation.mjs [--archive <directory>]');
const output = join(archive, 'remediation-plan');
const [antipatterns, phases] = await Promise.all([
  readFile(join(archive, 'llm-antipatterns/manifest.json'), 'utf8').then(JSON.parse),
  readFile(join(archive, 'llm-phases/manifest.json'), 'utf8').then(JSON.parse),
]);
const defaults = {
  security: ['P0', 'L'], information_architecture: ['P1', 'L'], performance: ['P1', 'L'], quality: ['P1', 'M'],
  repository: ['P1', 'M'], metadata: ['P1', 'M'], search_seo: ['P2', 'M'], observability: ['P2', 'M'],
  content: ['P2', 'M'], localization: ['P2', 'S'], ux: ['P2', 'S'], methodology: ['P3', 'S'],
};
const hardWords = /migration|schema|domain|graph|supply chain|workflow|architecture|보안|마이그레이션|스키마|관계|아키텍처/i;
let existingItems = new Map();
try {
  await access(join(output, 'antipattern-triage.json'));
  const existing = JSON.parse(await readFile(join(output, 'antipattern-triage.json'), 'utf8'));
  existingItems = new Map((existing.items ?? []).map((item) => [item.id, item]));
} catch { /* First generation: use calculated defaults. */ }
const triage = antipatterns.canonicalItems.map((item) => {
  const [priority, baseEffort] = defaults[item.category] || ['P2', 'M'];
  const previous = existingItems.get(item.id);
  const generated = { id: item.id, title: item.title, category: item.category, priority, effort: hardWords.test(item.title) ? 'L' : baseEffort, rationale: 'Initial heuristic; confirm against concrete finding and affected scope.' };
  // Regeneration refreshes source metadata but never discards audit/manual triage.
  for (const key of ['priority', 'effort', 'rationale', 'dependsOn', 'dependsOnPhase', 'auditEvidence']) {
    if (previous?.[key] !== undefined) generated[key] = previous[key];
  }
  return generated;
});
const phaseGroups = Object.groupBy(phases.phases, (task) => Number(task.phase.match(/^Phase (\d+)/)[1]));
const phasePlan = [{
  phase: 0,
  title: 'Phase 0 — CI and project governance baseline',
  dependsOn: [],
  tasks: [
    { id: 'PH-00-01', title: 'CI baseline classification', dependsOn: [], dependencyStatus: 'confirmed' },
    { id: 'PH-00-02', title: 'Reproducible dependency installation', dependsOn: [], dependencyStatus: 'confirmed' },
    { id: 'PH-00-03', title: 'Layered CI quality gates', dependsOn: ['PH-00-01', 'PH-00-02'], dependencyStatus: 'confirmed' },
    { id: 'PH-00-04', title: 'Static artifact security assertion', dependsOn: ['PH-00-03'], dependencyStatus: 'confirmed' },
  ],
}, ...Object.entries(phaseGroups).map(([number, tasks]) => ({
  phase: Number(number),
  title: tasks[0].phase,
  dependsOn: [`PHASE-${String(Number(number) - 1).padStart(2, '0')}`],
  tasks: tasks.map(({ id, title }) => ({ id, title, dependsOn: [], dependencyStatus: 'refine during phase audit' })),
}))];
await mkdir(output, { recursive: true });
await writeFile(join(output, 'antipattern-triage.json'), `${JSON.stringify({ scale: { priority: 'P0 critical → P3 deferred', effort: 'S small, M medium, L large' }, items: triage }, null, 2)}\n`);
await writeFile(join(output, 'phase-dependencies.json'), `${JSON.stringify({ policy: 'Phase dependencies are hard gates; task dependencies remain explicit only when confirmed during audit.', phases: phasePlan }, null, 2)}\n`);
const counts = Object.groupBy(triage, ({ priority }) => priority);
await writeFile(join(output, 'README.md'), [
  '# Remediation plan', '',
  '> These values are initial routing heuristics, not completion claims. Confirm priority, effort, and task-level dependencies from real findings before implementation.', '',
  '## Anti-pattern queue', '',
  '| Priority | Items | Meaning |', '| --- | ---: | --- |',
  ...['P0', 'P1', 'P2', 'P3'].map((priority) => `| ${priority} | ${(counts[priority] || []).length} | ${priority === 'P0' ? 'risk/security first' : priority === 'P1' ? 'structural reliability' : priority === 'P2' ? 'planned improvement' : 'defer unless needed'} |`), '',
  '- Detailed queue: [antipattern-triage.json](antipattern-triage.json)',
  '- Phase dependency graph: [phase-dependencies.json](phase-dependencies.json)', '',
  '## Phase dependency graph', '',
  '```text', ...phasePlan.map(({ phase, dependsOn }) => `PHASE-${String(phase).padStart(2, '0')} ${dependsOn.length ? `← ${dependsOn.join(', ')}` : '(start)'}`), '```', '',
].join('\n'));
console.log(`Planned ${triage.length} anti-patterns and ${phasePlan.length} phase gates in ${output}`);
