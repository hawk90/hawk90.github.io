#!/usr/bin/env node

import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

const enforce = process.argv.includes('--enforce');
const roots = ['src/content', 'public', 'dist'];
const textExtensions = new Set([
  '.md', '.mdx', '.html', '.json', '.xml', '.txt', '.svg', '.yml', '.yaml', '.js', '.mjs', '.ts', '.css',
]);
const files = [];

async function walk(directory) {
  try {
    for (const entry of (await readdir(directory, { withFileTypes: true })).sort((left, right) => left.name.localeCompare(right.name))) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) await walk(path);
      else if (textExtensions.has(path.slice(path.lastIndexOf('.')))) files.push(path);
    }
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
}

await Promise.all(roots.map(walk));

const rules = [
  { id: 'github-pat', pattern: /\bgh[pousr]_[A-Za-z0-9]{36,}\b/g, description: 'GitHub personal access token' },
  { id: 'github-fine-grained-pat', pattern: /\bgithub_pat_[A-Za-z0-9_]{60,}\b/g, description: 'GitHub fine-grained personal access token' },
  { id: 'openai-api-key', pattern: /\bsk-[A-Za-z0-9_-]{32,}\b/g, description: 'OpenAI API key' },
  { id: 'aws-access-key', pattern: /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g, description: 'AWS access key ID' },
  { id: 'private-key', pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g, description: 'Private key material' },
];

const findings = [];
for (const file of files) {
  const content = await readFile(file, 'utf8');
  for (const rule of rules) {
    for (const match of content.matchAll(rule.pattern)) {
      findings.push({
        rule: rule.id,
        description: rule.description,
        file: relative('.', file),
        line: content.slice(0, match.index).split('\n').length,
        fingerprint: `${match[0].slice(0, 6)}…${match[0].slice(-4)}`,
      });
    }
  }
}

const reportDir = 'reports/secrets';
await mkdir(reportDir, { recursive: true });
const report = { scope: roots, filesScanned: files.length, findings };
await writeFile(join(reportDir, 'latest.json'), `${JSON.stringify(report, null, 2)}\n`);
await writeFile(join(reportDir, 'latest.md'), [
  '# Secret scan report',
  '',
  'Scans content, public assets, and the final `dist` artifact for credential-shaped values.',
  '',
  `- Files scanned: ${files.length}`,
  `- Findings: ${findings.length}`,
  '',
  ...findings.map((finding) => `- ${finding.description}: \`${finding.file}:${finding.line}\` (${finding.fingerprint})`),
].join('\n'));

console.log(`Secret scan: ${findings.length} finding(s) across ${files.length} files.`);
console.log(`Report: ${join(reportDir, 'latest.md')}`);
if (enforce && findings.length > 0) process.exitCode = 1;
