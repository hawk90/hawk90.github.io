#!/usr/bin/env node
// Enforces immutable GitHub Actions pins and the minimum CI release contract.

import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const workflowDir = '.github/workflows';
const findings = [];
for (const entry of await readdir(workflowDir)) {
  if (!entry.endsWith('.yml') && !entry.endsWith('.yaml')) continue;
  const file = join(workflowDir, entry);
  const source = await readFile(file, 'utf8');
  for (const match of source.matchAll(/^\s*uses:\s*([^\s#]+)@([^\s#]+)/gm)) {
    if (!/^[a-f0-9]{40}$/i.test(match[2])) findings.push(`${file}: mutable Action reference ${match[1]}@${match[2]}`);
  }
  if (!/permissions:\s*\n\s+contents:\s+read/m.test(source)) findings.push(`${file}: missing read-only contents permission`);
}
const ci = await readFile(join(workflowDir, 'ci.yml'), 'utf8');
const deploy = await readFile(join(workflowDir, 'deploy.yml'), 'utf8');
if (!/npm run verify:release/.test(ci) || !/npm run verify:release/.test(deploy)) findings.push('CI and deployment must use the canonical release contract');

await mkdir('reports/ci-security', { recursive: true });
await writeFile('reports/ci-security/latest.md', ['# CI security audit', '', `- Findings: ${findings.length}`, ...findings.map((finding) => `- ${finding}`)].join('\n'));
console.log(`CI security audit: ${findings.length} finding(s).`);
if (findings.length) process.exitCode = 1;
