#!/usr/bin/env node
// Exercises a disposable Git-bundle recovery path. It never claims independent backup coverage.

import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const apply = process.argv.includes('--apply');
const keep = process.argv.includes('--keep');
const full = process.argv.includes('--full');
const run = (command, args, cwd = process.cwd()) => {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024, env: { ...process.env, ASTRO_TELEMETRY_DISABLED: '1' } });
  if (result.status !== 0) throw new Error(`${command} ${args.join(' ')} failed: ${(result.stderr || result.stdout || '').trim()}`);
};
const output = (command, args, cwd) => {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(`${command} ${args.join(' ')} failed: ${(result.stderr || result.stdout || '').trim()}`);
  return result.stdout;
};
console.log(`Local recovery exercise.${apply ? ' Running.' : ' Preview only; pass --apply to run the disposable rehearsal.'}`);
if (!apply) process.exit(0);
const work = await mkdtemp(join(tmpdir(), 'hawk-recovery-'));
const bundle = join(work, 'repository.bundle');
const clone = join(work, 'restore');
const reportPath = 'reports/repository/local-recovery-exercise.md';
let outcome = 'failed'; let errorMessage = null;
try {
  run('git', ['bundle', 'create', bundle, '--all']);
  run('git', ['bundle', 'verify', bundle]);
  run('git', ['clone', bundle, clone]);
  run('git', ['fsck', '--no-reflogs', '--connectivity-only'], clone);
  const restoredDocuments = output('git', ['ls-files', 'src/content/blog'], clone).split('\n').filter((file) => file.endsWith('.md'));
  if (restoredDocuments.length !== 3387) throw new Error(`restored source inventory is incomplete: ${restoredDocuments.length} Markdown documents`);
  if (full) {
    run('npm', ['ci', '--prefer-offline', '--ignore-scripts', '--no-audit'], clone);
    run('npm', ['run', 'check'], clone);
  }
  outcome = 'passed';
} catch (error) {
  errorMessage = error.message;
}
await mkdir('reports/repository', { recursive: true });
const scope = full
  ? 'disposable Git bundle → fresh clone → git fsck → source inventory → lockfile dependency install → Astro diagnostics'
  : 'disposable Git bundle → fresh clone → git fsck → source inventory';
await writeFile(reportPath, ['# Local recovery exercise', '', `- Result: ${outcome}`, `- Scope: ${scope}`, '- Independent backup claim: no (the temporary bundle is intentionally local and deleted after the rehearsal)', '- Full dependency and Astro diagnostic rehearsal: run again with --full', `- Temporary workspace retained: ${keep ? work : 'no'}`, ...(errorMessage ? [`- Error: ${errorMessage}`] : [])].join('\n'));
if (!keep) await rm(work, { recursive: true, force: true });
console.log(`Local recovery exercise: ${outcome}.`);
if (outcome !== 'passed') process.exitCode = 1;
