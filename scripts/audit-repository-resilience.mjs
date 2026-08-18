#!/usr/bin/env node
import { mkdir, readFile, writeFile, access } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';

const policy = JSON.parse(await readFile('archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/remediation-plan/repository-resilience-policy.json', 'utf8'));
const health = await readFile('reports/repository-health/latest.md', 'utf8').catch(() => '');
const ci = await readFile('.github/workflows/ci.yml', 'utf8');
const deploy = await readFile('.github/workflows/deploy.yml', 'utf8');
const runbook = await readFile('docs/runbooks/repository-recovery.md', 'utf8');

/**
 * A second place the objects live.
 *
 * This used to pass whenever `git remote` printed anything, so a repository
 * with exactly one remote — its own origin — was reported as having recovery
 * remotes configured. That is a resilience audit telling you that your only
 * copy is a backup, which is worse than saying nothing. Recovery means the
 * objects survive losing the primary, so it takes two distinct hosts.
 */
const remoteUrls = new Set(
  spawnSync('git', ['remote', '-v'], { encoding: 'utf8' }).stdout
    .split('\n')
    .map((line) => line.split(/\s+/)[1])
    .filter(Boolean),
);
const hasRecoveryRemote = remoteUrls.size >= 2;

const checks = {
  'git-object-integrity': /Git object connectivity: pass/.test(health),
  'recovery-remote': hasRecoveryRemote,
  'pinned-ci-actions': /uses: actions\/checkout@[a-f0-9]{40}/.test(ci) && /uses: actions\/deploy-pages@[a-f0-9]{40}/.test(deploy),
  'reproducible-install': /npm ci/.test(ci) && /npm ci/.test(deploy),
  'build-once-artifact': /upload-pages-artifact/.test(deploy),
  'static-artifact-security': /verify:release/.test(deploy),
  'source-archive-preservation': /Source of truth: the Git repository/.test(runbook) && /Published artifact/.test(runbook),
  'preservation-first-content': /Preservation boundary/.test(runbook) && /frontmatter/.test(runbook),
};

/**
 * External controls this repository's shape makes inapplicable.
 *
 * A control that can never pass is noise in a pending list, and noise in a
 * pending list is how the ones that matter stop being read. DNS recovery
 * assumes a domain to recover; on a `github.io` subdomain there is none, and
 * the day a CNAME appears the control becomes live again on its own.
 */
const hasCustomDomain = await access('public/CNAME').then(() => true, () => false);
const notApplicable = new Map();
if (!hasCustomDomain) {
  notApplicable.set('domain-dns-recovery', 'no public/CNAME — the site is served from a github.io subdomain, so there is no DNS to recover. Becomes pending again if a custom domain is added.');
}

const failed = policy.localControls.filter((key) => !checks[key]);
const pending = policy.externalEvidenceRequired.filter((key) => !notApplicable.has(key));

await mkdir('reports/repository-resilience', { recursive: true });
await writeFile('reports/repository-resilience/latest.md', [
  '# Repository resilience audit',
  '',
  ...policy.localControls.map((key) => `- ${checks[key] ? 'PASS' : 'FAIL'} — ${key}`),
  ...(hasRecoveryRemote ? [] : ['', `  Remotes configured: ${remoteUrls.size}. Recovery needs the objects on a second host, not a second name for the same one.`]),
  '',
  '## External evidence required',
  '',
  ...pending.map((key) => `- PENDING — ${key}`),
  ...(notApplicable.size ? ['', '## Not applicable', '', ...[...notApplicable].map(([key, why]) => `- N/A — ${key}: ${why}`)] : []),
  '',
].join('\n'));

console.log(`Repository resilience: ${policy.localControls.length - failed.length}/${policy.localControls.length} local controls pass; ${pending.length} external pending${notApplicable.size ? `, ${notApplicable.size} not applicable` : ''}.`);
for (const key of failed) console.log(`  FAIL — ${key}`);
if (failed.length) process.exitCode = 1;
