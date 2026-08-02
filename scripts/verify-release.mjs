#!/usr/bin/env node
// One canonical publish-readiness contract for local release checks and CI.

import { spawnSync } from 'node:child_process';

const checks = [
  ['tooling contracts', ['npm', 'run', 'gate:tooling']],
  ['CI supply-chain policy', ['npm', 'run', 'gate:ci-security']],
  ['repository object health', ['npm', 'run', 'gate:repository']],
  ['high-severity production dependency audit', ['npm', 'run', 'gate:dependencies']],
  ['search aliases', ['npm', 'run', 'test:search']],
  ['topic registry', ['npm', 'run', 'test:topics']],
  ['content classification', ['npm', 'run', 'gate:classification']],
  ['editorial relations', ['npm', 'run', 'test:relations']],
  ['shared product experience', ['npm', 'run', 'audit:product-experience']],
  ['internal links', ['npm', 'run', 'audit:links', '--', '--by-type']],
  ['diagram asset contract', ['npm', 'run', 'audit:diagrams']],
  ['Astro type and template diagnostics', ['npm', 'run', 'check']],
  ['production build', ['npm', 'run', 'build']],
  ['static admin boundary', ['npm', 'run', 'gate:security-admin', '--', '--artifact', 'dist']],
  ['production secret scan', ['npm', 'run', 'gate:secrets']],
];

for (const [name, [command, ...args]] of checks) {
  console.log(`\n=== Release gate: ${name} ===`);
  const result = spawnSync(command, args, { stdio: 'inherit', env: { ...process.env, ASTRO_TELEMETRY_DISABLED: '1' } });
  if (result.status !== 0) {
    console.error(`\nRelease gate failed: ${name}`);
    process.exit(result.status ?? 1);
  }
}

console.log('\nRelease gate passed: publish-ready artifact verified.');
