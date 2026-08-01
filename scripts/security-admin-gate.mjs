#!/usr/bin/env node

import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const enforce = process.argv.includes('--enforce');
const files = [];

async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = join(directory, entry.name);
    if (entry.isDirectory()) await walk(file);
    else if (/\.(ts|astro|mjs|yml)$/.test(entry.name)) files.push(file);
  }
}

await Promise.all([walk('src'), walk('.github')]);
const sources = new Map(await Promise.all(files.map(async (file) => [file, await readFile(file, 'utf8')])));
const adminConfig = sources.get('src/consts/config.ts') ?? '';

function evidenceFor(pattern, predicate = () => true) {
  return [...sources.entries()].flatMap(([file, source]) =>
    [...source.matchAll(pattern)].flatMap((match) => {
      if (!predicate(file, match[0])) return [];
      return [{
        file,
        line: source.slice(0, match.index).split('\n').length,
        excerpt: match[0].replace(/\s+/g, ' ').slice(0, 160),
      }];
    }),
  );
}

const rules = [
  {
    id: 'SEC-ADMIN-01',
    priority: 'P0',
    title: 'Browser persistence of an access token',
    remediation: 'Move credentials to a server-owned session or disable browser-side admin writes in static deployments.',
    evidence: evidenceFor(/localStorage\.(?:setItem|getItem|removeItem)\([^\n]*(?:accessToken|token)/gi),
  },
  {
    id: 'SEC-ADMIN-02',
    priority: 'P0',
    title: 'Raw HTML insertion sinks',
    remediation: 'Replace string HTML rendering with DOM APIs, or sanitize a narrowly documented trusted input before insertion.',
    evidence: evidenceFor(/\.innerHTML\s*=/g),
  },
  {
    id: 'SEC-ADMIN-03',
    priority: 'P0',
    title: 'OAuth server secret boundary',
    remediation: 'Keep GitHub client secrets in server-only routes and require a hybrid/server deployment before enabling OAuth.',
    evidence: evidenceFor(/import\.meta\.env\.GITHUB_CLIENT_SECRET/g),
    manual: true,
  },
  {
    id: 'SEC-ADMIN-04',
    priority: 'P1',
    title: 'Static deployment OAuth compatibility',
    remediation: 'Assert that OAuth is disabled when Astro output is static, or deploy a server adapter before enabling it.',
    evidence: /authMode\s*:\s*['\"]pat['\"]/.test(adminConfig)
      ? []
      : evidenceFor(/authMode\s*:\s*['\"](?:oauth|both)['\"]/g),
    manual: true,
  },
];

const findings = rules.map((rule) => ({
  ...rule,
  status: rule.evidence.length === 0 ? 'passed' : rule.manual ? 'manual-review' : 'open',
}));
const openP0 = findings.filter((finding) => finding.priority === 'P0' && finding.status === 'open');
const reportDir = 'reports/security-admin';
await mkdir(reportDir, { recursive: true });
await writeFile(join(reportDir, 'latest.json'), `${JSON.stringify({ scope: files, findings }, null, 2)}\n`);
await writeFile(join(reportDir, 'latest.md'), [
  '# Security & admin remediation gate',
  '',
  'Generated deterministically from the current source tree.',
  '',
  '> `open` P0 findings fail `npm run gate:security-admin`. `manual-review` requires an explicit deployment/design decision before enabling the affected capability.',
  '',
  ...findings.flatMap((finding) => [
    `## ${finding.id} — ${finding.status}`,
    '',
    `- Priority: ${finding.priority}`,
    `- ${finding.title}`,
    `- Required remediation: ${finding.remediation}`,
    ...finding.evidence.map((item) => `- Evidence: \`${item.file}:${item.line}\` — \`${item.excerpt}\``),
    '',
  ]),
].join('\n'));

console.log(`Security/admin audit: ${openP0.length} open P0, ${findings.filter((finding) => finding.status === 'manual-review').length} manual review.`);
console.log(`Report: ${join(reportDir, 'latest.md')}`);
if (enforce && openP0.length > 0) process.exitCode = 1;
