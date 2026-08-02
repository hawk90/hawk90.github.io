#!/usr/bin/env node

import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const enforce = process.argv.includes('--enforce');
const artifactFlag = process.argv.indexOf('--artifact');
const artifactDir = artifactFlag === -1 ? null : process.argv[artifactFlag + 1];
if (artifactFlag !== -1 && !artifactDir) throw new Error('--artifact requires a directory');
const files = [];

async function walk(directory) {
  for (const entry of (await readdir(directory, { withFileTypes: true })).sort((left, right) => left.name.localeCompare(right.name))) {
    const file = join(directory, entry.name);
    if (entry.isDirectory()) await walk(file);
    else if (/\.(ts|astro|mjs|yml)$/.test(entry.name)) files.push(file);
  }
}

await Promise.all([walk('src'), walk('.github')]);
const sources = new Map(await Promise.all(files.map(async (file) => [file, await readFile(file, 'utf8')])));
const adminConfig = sources.get('src/consts/config.ts') ?? '';
const astroConfig = await readFile('astro.config.mjs', 'utf8');
const staticOutput = /output:\s*['"]static['"]/.test(astroConfig);
const patOnly = !/authMode\s*:/.test(adminConfig);

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

async function artifactEvidence(directory) {
  const found = [];
  async function visit(current) {
    for (const entry of (await readdir(current, { withFileTypes: true })).sort((left, right) => left.name.localeCompare(right.name))) {
      const file = join(current, entry.name);
      if (entry.isDirectory()) await visit(file);
      else if (file.replaceAll('\\', '/').includes('/api/auth/')) found.push({
        file,
        line: 1,
        excerpt: 'Static deployment artifact contains an OAuth endpoint.',
      });
    }
  }
  await visit(directory);
  return found;
}

const artifactAuthFiles = artifactDir ? await artifactEvidence(artifactDir) : [];

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
    title: 'OAuth server secret in a static site',
    remediation: 'Do not keep OAuth callback code or GitHub client secrets in this static deployment.',
    evidence: evidenceFor(/import\.meta\.env\.GITHUB_CLIENT_SECRET/g),
  },
  {
    id: 'SEC-ADMIN-04',
    priority: 'P1',
    title: 'Static deployment OAuth compatibility',
    remediation: 'Static output must stay PAT-only; move OAuth to a separately deployed server application.',
    evidence: staticOutput && !patOnly
      ? [{ file: 'src/consts/config.ts', line: 1, excerpt: 'Static deployment must not expose an OAuth authMode override.' }]
      : [],
  },
  {
    id: 'SEC-ADMIN-05',
    priority: 'P1',
    title: 'OAuth route source in a static site',
    remediation: 'Remove API OAuth routes from static deployments; they can only emit broken, pre-rendered redirects.',
    evidence: staticOutput
      ? files.filter((file) => file.startsWith('src/pages/api/auth/')).map((file) => ({ file, line: 1, excerpt: 'OAuth route source is present in a static site.' }))
      : [],
  },
  {
    id: 'SEC-ADMIN-06',
    priority: 'P1',
    title: 'OAuth endpoint in production artifact',
    remediation: 'Production artifact must not contain /api/auth routes when this project builds as a static site.',
    evidence: staticOutput ? artifactAuthFiles : [],
  },
];

const findings = rules.map((rule) => ({
  ...rule,
  status: rule.evidence.length === 0 ? 'passed' : rule.manual ? 'manual-review' : 'open',
}));
const openP0 = findings.filter((finding) => finding.priority === 'P0' && finding.status === 'open');
const artifactBoundaryOpen = artifactDir
  ? findings.filter((finding) => finding.id === 'SEC-ADMIN-06' && finding.status === 'open')
  : [];
const reportDir = 'reports/security-admin';
await mkdir(reportDir, { recursive: true });
await writeFile(join(reportDir, 'latest.json'), `${JSON.stringify({ scope: files, findings }, null, 2)}\n`);
await writeFile(join(reportDir, 'latest.md'), [
  '# Security & admin remediation gate',
  '',
  `Generated deterministically from the current source tree${artifactDir ? ` and \`${artifactDir}\`` : ''}.`,
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

console.log(`Security/admin audit: ${openP0.length} open P0, ${artifactBoundaryOpen.length} artifact boundary failure(s), ${findings.filter((finding) => finding.status === 'manual-review').length} manual review.`);
console.log(`Report: ${join(reportDir, 'latest.md')}`);
if (enforce && (openP0.length > 0 || artifactBoundaryOpen.length > 0)) process.exitCode = 1;
