#!/usr/bin/env node

import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const archive = 'archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273';
const files = [];
async function walk(dir) {
  for (const entry of (await readdir(dir, { withFileTypes: true })).sort((left, right) => left.name.localeCompare(right.name))) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) await walk(path);
    else if (/\.(ts|astro|mjs|yml)$/.test(entry.name)) files.push(path);
  }
}
await walk('src');
await walk('.github');
const source = new Map(await Promise.all(files.map(async (file) => [file, await readFile(file, 'utf8')])));
const match = (pattern) => [...source.entries()].flatMap(([file, text]) => [...text.matchAll(pattern)].map((m) => ({ file, line: text.slice(0, m.index).split('\n').length, excerpt: m[0].slice(0, 140) })));
const workflowPermissionEvidence = () => {
  const workflow = source.get('.github/workflows/deploy.yml') ?? '';
  const isLeastPrivilege = /build:\s*\n\s+permissions:\s*\n\s+contents:\s+read/m.test(workflow)
    && /deploy:\s*\n\s+permissions:\s*\n\s+pages:\s+write\s*\n\s+id-token:\s+write/m.test(workflow);
  return isLeastPrivilege ? [] : [{
    file: '.github/workflows/deploy.yml',
    line: 1,
    excerpt: 'Build and deploy jobs must declare distinct least-privilege permissions.',
  }];
};
const releaseContractInWorkflow = () => /run:\s+npm run verify:release/.test(source.get('.github/workflows/deploy.yml') ?? '');
const secretScanEvidence = () => {
  const workflow = source.get('.github/workflows/deploy.yml') ?? '';
  return (releaseContractInWorkflow() || /run:\s+npm run gate:secrets/.test(workflow)) ? [] : [{
    file: '.github/workflows/deploy.yml',
    line: 1,
    excerpt: 'Production build must run the secret-scan gate against dist.',
  }];
};
const staticAdminArtifactEvidence = () => {
  const workflow = source.get('.github/workflows/deploy.yml') ?? '';
  return (releaseContractInWorkflow() || /run:\s+npm run gate:security-admin -- --artifact dist/.test(workflow)) ? [] : [{
    file: '.github/workflows/deploy.yml',
    line: 1,
    excerpt: 'Static production artifacts must be checked for admin OAuth endpoints.',
  }];
};
const internalLinkGateEvidence = () => {
  const workflow = source.get('.github/workflows/deploy.yml') ?? '';
  return (releaseContractInWorkflow() || /run:\s+npm run audit:links -- --by-type/.test(workflow)) ? [] : [{
    file: '.github/workflows/deploy.yml',
    line: 1,
    excerpt: 'Production workflow must verify internal content links.',
  }];
};
const searchAliasEvidence = () => {
  const search = source.get('src/lib/search.ts') ?? '';
  const aliases = source.get('src/lib/search-aliases.ts') ?? '';
  return /expandSearchTerms/.test(search) && /normalizeSearchText/.test(search) && /SEARCH_TERMS/.test(aliases)
    ? []
    : [{
      file: 'src/lib/search.ts',
      line: 1,
      excerpt: 'Search must normalize queries and use the editorial terminology alias registry.',
    }];
};
const topicRegistryEvidence = () => {
  const registry = source.get('src/lib/content/topics.ts') ?? '';
  return /assertTopicRegistryIntegrity/.test(registry) && /parent hierarchy contains a cycle/.test(registry)
    ? []
    : [{
      file: 'src/lib/content/topics.ts',
      line: 1,
      excerpt: 'Topic registry must reject duplicate IDs, missing parents, and parent cycles.',
    }];
};
const classificationPolicyEvidence = () => {
  const schema = source.get('src/content.config.ts') ?? '';
  const normalizer = source.get('src/lib/content/normalize.ts') ?? '';
  return /topics:\s*z\.array/.test(schema) && /classificationSource/.test(normalizer) && /unknown canonical topic ID/.test(normalizer)
    ? []
    : [{
      file: 'src/lib/content/normalize.ts',
      line: 1,
      excerpt: 'Content classification must prefer validated explicit topic IDs over legacy metadata and path inference.',
    }];
};
const rules = [
  { id: 'AP-SEC-52', phase: 'PHASE-04', priority: 'P0', summary: 'PAT stored in browser localStorage', evidence: () => match(/localStorage\.setItem\([^\n]*accessToken|accessToken[^\n]*localStorage\.setItem/g) },
  { id: 'AP-SEC-51', phase: 'PHASE-04', priority: 'P0', summary: 'Static deployment must not retain OAuth secrets or callback routes', evidence: () => match(/import\.meta\.env\.GITHUB_CLIENT_SECRET/g) },
  { id: 'AP-SEC-29', phase: 'PHASE-04', priority: 'P0', summary: 'Raw HTML insertion requires sanitizer review', evidence: () => match(/\.innerHTML\s*=/g) },
  { id: 'AP-T-98', phase: 'PHASE-04', priority: 'P1', summary: 'Admin artifact exclusion needs an explicit build assertion', evidence: staticAdminArtifactEvidence },
  { id: 'AP-T-99', phase: 'PHASE-04', priority: 'P1', summary: 'Workflow permissions must be explicitly least-privilege by job', evidence: workflowPermissionEvidence },
  { id: 'AP-T-96', phase: 'PHASE-04', priority: 'P1', summary: 'Production artifact must be scanned for secrets', evidence: secretScanEvidence },
  { id: 'AP-I-34', phase: 'PHASE-03', priority: 'P1', summary: 'Internal links must be validated before deployment', evidence: internalLinkGateEvidence },
  { id: 'AP-I-37', phase: 'PHASE-02', priority: 'P1', summary: 'Acronym search must use an explicit terminology alias registry', evidence: searchAliasEvidence },
  { id: 'AP-I-38', phase: 'PHASE-02', priority: 'P1', summary: 'Korean-English and punctuation variants must share query normalization', evidence: searchAliasEvidence },
  { id: 'AP-I-02', phase: 'PHASE-01', priority: 'P1', summary: 'Topic hierarchy must have one validated canonical registry', evidence: topicRegistryEvidence },
  { id: 'AP-I-03', phase: 'PHASE-01', priority: 'P1', summary: 'Content topics must not be permanently inferred from storage folders', evidence: classificationPolicyEvidence },
];
const findings = rules.map((rule) => {
  const evidence = rule.evidence();
  return {
    ...rule,
    evidence,
    status: evidence.length ? (rule.manual ? 'manual-review' : 'open') : rule.manual ? 'manual-review' : 'passed',
  };
});
const planPath = join(archive, 'remediation-plan/antipattern-triage.json');
const plan = JSON.parse(await readFile(planPath, 'utf8'));
const updates = findings.filter(({ evidence }) => evidence.length).map(({ id, priority, phase, evidence }) => ({ id, priority, dependsOnPhase: phase, evidence }));
for (const item of plan.items) {
  const finding = findings.find(({ id }) => id === item.id);
  if (finding && finding.evidence.length === 0) delete item.auditEvidence;
}
for (const update of updates) {
  const item = plan.items.find(({ id }) => id === update.id);
  if (item) Object.assign(item, { priority: update.priority, dependsOnPhase: update.dependsOnPhase, auditEvidence: update.evidence });
}
await writeFile(planPath, `${JSON.stringify(plan, null, 2)}\n`);
await writeFile(join(archive, 'remediation-plan/audit-results.json'), `${JSON.stringify({ scope: files, findings }, null, 2)}\n`);
await writeFile(join(archive, 'remediation-plan/audit-results.md'), ['# Anti-pattern audit results', '', '> Generated from deterministic repository rules. `open` needs remediation; `manual-review` means the rule needs an artifact or deployment check.', '', ...findings.flatMap((finding) => [`## ${finding.id} — ${finding.status}`, '', `- Priority: ${finding.priority}`, `- Recommended phase: ${finding.phase}`, `- ${finding.summary}`, ...finding.evidence.map(({ file, line, excerpt }) => `- Evidence: \`${file}:${line}\` — \`${excerpt}\``), ''])].join('\n'));
console.log(`Audited ${files.length} files; ${updates.length} findings updated in the remediation plan.`);
