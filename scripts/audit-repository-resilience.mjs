#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
const policy = JSON.parse(await readFile('archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/remediation-plan/repository-resilience-policy.json', 'utf8'));
const health = await readFile('reports/repository-health/latest.md', 'utf8').catch(() => '');
const ci = await readFile('.github/workflows/ci.yml', 'utf8');
const deploy = await readFile('.github/workflows/deploy.yml', 'utf8');
const runbook = await readFile('archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/remediation-plan/repository-recovery-runbook.md', 'utf8');
const checks = {
  'git-object-integrity': /Git object connectivity: pass/.test(health), 'recovery-remote': /Recovery remotes configured: yes/.test(health),
  'pinned-ci-actions': /uses: actions\/checkout@[a-f0-9]{40}/.test(ci) && /uses: actions\/deploy-pages@[a-f0-9]{40}/.test(deploy),
  'reproducible-install': /npm ci/.test(ci) && /npm ci/.test(deploy), 'build-once-artifact': /upload-pages-artifact/.test(deploy),
  'static-artifact-security': /verify:release/.test(deploy),
  'source-archive-preservation': /Source of truth: the Git repository/.test(runbook) && /Published artifact/.test(runbook),
  'preservation-first-content': /Preservation boundary/.test(runbook) && /frontmatter/.test(runbook),
};
const failed = policy.localControls.filter((key) => !checks[key]);
await mkdir('reports/repository-resilience', { recursive: true });
await writeFile('reports/repository-resilience/latest.md', ['# Repository resilience audit', '', ...policy.localControls.map((key) => `- ${checks[key] ? 'PASS' : 'FAIL'} — ${key}`), '', '## External evidence required', '', ...policy.externalEvidenceRequired.map((key) => `- PENDING — ${key}`), ''].join('\n'));
console.log(`Repository resilience: ${policy.localControls.length - failed.length}/${policy.localControls.length} local controls pass; ${policy.externalEvidenceRequired.length} external pending.`);
if (failed.length) process.exitCode = 1;
