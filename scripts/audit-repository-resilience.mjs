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

/**
 * Controls the owner has accepted rather than deferred.
 *
 * Kept separate from "pending" because the two mean different things: pending
 * is work not done yet, accepted is a decision with a reason. Collapsing them
 * makes the list look like a backlog and hides which control the accepted ones
 * are leaning on.
 */
const accepted = new Map();
const backupDecision = await readFile('archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/remediation-plan/repository-backup-risk-acceptance.json', 'utf8').then(JSON.parse, () => null);
if (backupDecision?.decision === 'accepted-risk') {
  for (const control of Object.keys(backupDecision.controls)) accepted.set(control, backupDecision.notCovered);
}

/**
 * `recovery-remote` is the local reading of the same exposure the owner
 * accepted: a second host for the objects. Once that acceptance exists the
 * control cannot pass, so leaving it FAIL would make this audit red forever
 * over a settled decision. It is reported as accepted instead — with the
 * finding it would otherwise have raised kept visible, because an accepted
 * risk that stops being legible stops being a decision.
 */
const acceptedLocally = new Set(
  accepted.has('independent-backup-and-restore-test') && !checks['recovery-remote'] ? ['recovery-remote'] : [],
);
const failed = policy.localControls.filter((key) => !checks[key] && !acceptedLocally.has(key));
const pending = policy.externalEvidenceRequired.filter((key) => !notApplicable.has(key) && !accepted.has(key));

await mkdir('reports/repository-resilience', { recursive: true });
await writeFile('reports/repository-resilience/latest.md', [
  '# Repository resilience audit',
  '',
  ...policy.localControls.map((key) => {
    if (checks[key]) return `- PASS — ${key}`;
    return acceptedLocally.has(key) ? `- ACCEPTED — ${key} (would fail; covered by the backup risk acceptance)` : `- FAIL — ${key}`;
  }),
  ...(hasRecoveryRemote ? [] : ['', `  Remotes configured: ${remoteUrls.size}. Recovery needs the objects on a second host, not a second name for the same one.`]),
  '',
  '## External evidence required',
  '',
  ...pending.map((key) => `- PENDING — ${key}`),
  ...(accepted.size ? ['', '## Accepted', '', ...[...accepted].map(([key, why]) => `- ACCEPTED — ${key}. Not covered: ${why}`)] : []),
  ...(notApplicable.size ? ['', '## Not applicable', '', ...[...notApplicable].map(([key, why]) => `- N/A — ${key}: ${why}`)] : []),
  '',
].join('\n'));

const passing = policy.localControls.filter((key) => checks[key]).length;
console.log(`Repository resilience: ${passing}/${policy.localControls.length} local controls pass${acceptedLocally.size ? `, ${acceptedLocally.size} accepted` : ''}; ${pending.length} external pending${accepted.size ? `, ${accepted.size} accepted` : ''}${notApplicable.size ? `, ${notApplicable.size} not applicable` : ''}.`);
for (const key of failed) console.log(`  FAIL — ${key}`);
if (failed.length) process.exitCode = 1;
