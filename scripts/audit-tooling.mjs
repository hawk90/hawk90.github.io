#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

const enforce = process.argv.includes('--enforce');
const packageJson = JSON.parse(await readFile('package.json', 'utf8'));
const files = [];

async function walk(directory) {
  for (const entry of (await readdir(directory, { withFileTypes: true })).sort((left, right) => left.name.localeCompare(right.name))) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) await walk(path);
    else if (/\.(mjs|py|sh)$/.test(entry.name)) files.push(path);
  }
}

function run(command, args) {
  const result = spawnSync(command, args, { encoding: 'utf8' });
  return result.status === 0
    ? null
    : (result.stderr || result.stdout || `${command} exited with ${result.status}`).trim();
}

await walk('scripts');
const findings = [];
const migrationScript = /(?:^|\/)(?:rename-|restructure-|bulk-draft|normalize-post-dates|convert-|strip-dead-links|resolve-internal-links|sync-book-notes)/;
for (const file of files) {
  const command = file.endsWith('.mjs') ? ['node', ['--check', file]]
    : file.endsWith('.py') ? ['python3', ['-c', 'import ast, pathlib, sys; ast.parse(pathlib.Path(sys.argv[1]).read_text(encoding="utf-8"))', file]]
    : ['bash', ['-n', file]];
  const error = run(...command);
  if (error) findings.push({ type: 'syntax', file, detail: error.split('\n')[0] });

  const source = await readFile(file, 'utf8');
  const writesContent = /(?:writeFile(?:Sync)?\(|write_text\(|\.write_text\()/u.test(source);
  if (writesContent && migrationScript.test(file) && !source.includes('--apply')) {
    findings.push({ type: 'unsafe-write-contract', file, detail: 'Content migration scripts must require an explicit --apply flag.' });
  }
  if (file.endsWith('archive-chatgpt-share.mjs') && !source.includes('--overwrite')) {
    findings.push({ type: 'unsafe-overwrite-contract', file, detail: 'Archive replacement must require an explicit --overwrite flag.' });
  }
}

for (const [name, command] of Object.entries(packageJson.scripts ?? {})) {
  const matches = [...command.matchAll(/scripts\/[^\s'"`]+/g)];
  for (const match of matches) {
    const file = match[0];
    try {
      await readFile(file);
    } catch {
      findings.push({ type: 'missing-entrypoint', script: name, file, detail: 'Referenced by package.json but not found.' });
    }
  }
}

const report = {
  filesScanned: files.length,
  packageScripts: Object.keys(packageJson.scripts ?? {}).length,
  findings,
};
const normalizeCommand = (command) => command
  .replace(/\s+--(?:apply|by-type|enforce|force|json\s+[^\s]+|prune|quiet|top\s+\d+)/g, '')
  .replace(/\s+/g, ' ')
  .trim();
const commandGroups = new Map();
for (const [name, command] of Object.entries(packageJson.scripts ?? {})) {
  const key = normalizeCommand(command);
  const names = commandGroups.get(key) ?? [];
  names.push(name);
  commandGroups.set(key, names);
}
const variants = [...commandGroups.entries()]
  .filter(([, names]) => names.length > 1)
  .map(([command, names]) => ({ command, names: names.sort() }))
  .sort((left, right) => right.names.length - left.names.length || left.command.localeCompare(right.command));
const isExpectedVariant = ({ names }) => {
  const has = (...expected) => expected.every((name) => names.includes(name));
  return has('audit:classification', 'gate:classification')
    || has('audit:tooling', 'gate:tooling')
    || has('audit:secrets', 'gate:secrets')
    || has('audit:security-admin', 'gate:security-admin')
    || has('audit:diagram-accessibility', 'fix:diagram-accessibility')
    || has('audit:upstream', 'audit:upstream:json')
    || has('diagrams', 'diagrams:force')
    || has('prebuild', 'og', 'og:force', 'og:prune');
};
await mkdir('reports/tooling', { recursive: true });
await writeFile('reports/tooling/overlap.md', [
  '# Tooling command overlap',
  '',
  `- Package scripts: ${Object.keys(packageJson.scripts ?? {}).length}`,
  `- Shared command profiles: ${variants.length}`,
  `- Unclassified profiles: ${variants.filter((variant) => !isExpectedVariant(variant)).length}`,
  '',
  'Shared command profiles are not automatically duplicates. Audit/gate and preview/apply variants are intentional; unclassified profiles require review before adding another alias.',
  '',
  ...variants.flatMap((variant) => [
    `## ${isExpectedVariant(variant) ? 'Expected variant' : 'Review required'} — ${variant.names.join(', ')}`,
    '',
    `- Normalized command: \`${variant.command}\``,
    '',
  ]),
].join('\n'));
const reportDir = 'reports/tooling';
await mkdir(reportDir, { recursive: true });
await writeFile(join(reportDir, 'latest.json'), `${JSON.stringify(report, null, 2)}\n`);
await writeFile(join(reportDir, 'latest.md'), [
  '# Tooling audit report',
  '',
  '- Script files scanned: ' + files.length,
  '- npm scripts declared: ' + report.packageScripts,
  '- Blocking findings: ' + findings.length,
  '',
  ...findings.map((finding) => `- ${finding.type}: \`${relative('.', finding.file)}\` — ${finding.detail}`),
].join('\n'));

console.log(`Tooling audit: ${findings.length} finding(s) across ${files.length} script files.`);
console.log(`Report: ${join(reportDir, 'latest.md')}`);
if (enforce && findings.length > 0) process.exitCode = 1;
