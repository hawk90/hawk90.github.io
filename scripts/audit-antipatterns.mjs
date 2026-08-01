#!/usr/bin/env node

import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const archive = 'archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273';
const files = [];
async function walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) await walk(path);
    else if (/\.(ts|astro|mjs|yml)$/.test(entry.name)) files.push(path);
  }
}
await walk('src');
await walk('.github');
const source = new Map(await Promise.all(files.map(async (file) => [file, await readFile(file, 'utf8')])));
const match = (pattern) => [...source.entries()].flatMap(([file, text]) => [...text.matchAll(pattern)].map((m) => ({ file, line: text.slice(0, m.index).split('\n').length, excerpt: m[0].slice(0, 140) })));
const rules = [
  { id: 'AP-SEC-52', phase: 'PHASE-04', priority: 'P0', summary: 'PAT stored in browser localStorage', evidence: () => match(/localStorage\.setItem\([^\n]*accessToken|accessToken[^\n]*localStorage\.setItem/g) },
  { id: 'AP-SEC-51', phase: 'PHASE-04', priority: 'P0', summary: 'OAuth secret/server route boundary requires deployment review', evidence: () => match(/import\.meta\.env\.GITHUB_CLIENT_SECRET/g) },
  { id: 'AP-SEC-29', phase: 'PHASE-04', priority: 'P0', summary: 'Raw HTML insertion requires sanitizer review', evidence: () => match(/\.innerHTML\s*=/g) },
  { id: 'AP-T-98', phase: 'PHASE-04', priority: 'P1', summary: 'Admin artifact exclusion needs an explicit build assertion', evidence: () => [] },
];
const findings = rules.map((rule) => ({ ...rule, evidence: rule.evidence(), status: rule.evidence().length ? 'open' : 'manual-review' }));
const planPath = join(archive, 'remediation-plan/antipattern-triage.json');
const plan = JSON.parse(await readFile(planPath, 'utf8'));
const updates = findings.filter(({ evidence }) => evidence.length).map(({ id, priority, phase, evidence }) => ({ id, priority, dependsOnPhase: phase, evidence }));
for (const update of updates) {
  const item = plan.items.find(({ id }) => id === update.id);
  if (item) Object.assign(item, { priority: update.priority, dependsOnPhase: update.dependsOnPhase, auditEvidence: update.evidence, auditedAt: new Date().toISOString() });
}
await writeFile(planPath, `${JSON.stringify(plan, null, 2)}\n`);
await writeFile(join(archive, 'remediation-plan/audit-results.json'), `${JSON.stringify({ generatedAt: new Date().toISOString(), scope: files, findings }, null, 2)}\n`);
await writeFile(join(archive, 'remediation-plan/audit-results.md'), ['# Anti-pattern audit results', '', '> Generated from deterministic repository rules. `open` needs remediation; `manual-review` means the rule needs an artifact or deployment check.', '', ...findings.flatMap((finding) => [`## ${finding.id} — ${finding.status}`, '', `- Priority: ${finding.priority}`, `- Recommended phase: ${finding.phase}`, `- ${finding.summary}`, ...finding.evidence.map(({ file, line, excerpt }) => `- Evidence: \`${file}:${line}\` — \`${excerpt}\``), ''])].join('\n'));
console.log(`Audited ${files.length} files; ${updates.length} findings updated in the remediation plan.`);
