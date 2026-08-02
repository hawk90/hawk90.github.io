#!/usr/bin/env node
// Runs the global knowledge-model contract and refreshes its review artifacts.

import { spawnSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';

const checks = [
  ['search terminology dictionary', ['npm', 'run', 'test:search']],
  ['canonical topic registry', ['npm', 'run', 'test:topics']],
  ['explicit classification contract', ['npm', 'run', 'gate:classification']],
  ['curated content relations', ['npm', 'run', 'test:relations']],
  ['content lifecycle inventory', ['npm', 'run', 'audit:lifecycle']],
  ['content governance queue', ['npm', 'run', 'build:governance-queue']],
];

const results = [];
for (const [name, [command, ...args]] of checks) {
  console.log(`\n=== Knowledge model: ${name} ===`);
  const startedAt = Date.now();
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    env: { ...process.env, ASTRO_TELEMETRY_DISABLED: '1' },
  });
  results.push({ name, command: [command, ...args].join(' '), passed: result.status === 0, durationMs: Date.now() - startedAt });
}

const report = { generatedAt: new Date().toISOString(), results };
await mkdir('reports/knowledge-model', { recursive: true });
await Promise.all([
  writeFile('reports/knowledge-model/latest.json', `${JSON.stringify(report, null, 2)}\n`),
  writeFile('reports/knowledge-model/latest.md', [
    '# Knowledge model audit',
    '',
    '> Global contract for terminology, taxonomy, metadata, relations, and the editorial review queue.',
    '',
    ...results.map(({ name, command, passed, durationMs }) => `- ${passed ? 'PASS' : 'FAIL'} — ${name} (${durationMs}ms): \`${command}\``),
    '',
  ].join('\n')),
]);

const failed = results.filter(({ passed }) => !passed);
console.log(`\nKnowledge model audit: ${results.length - failed.length}/${results.length} checks passed.`);
console.log('Report: reports/knowledge-model/latest.md');
if (failed.length) process.exitCode = 1;
