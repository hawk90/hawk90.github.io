#!/usr/bin/env node
// Verifies the controls required before a remediation automation may mutate state.

import { mkdir, readFile, writeFile } from 'node:fs/promises';

const path = 'archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/remediation-plan/change-automation-policy.json';
const policy = JSON.parse(await readFile(path, 'utf8'));
const controls = ['smallest-safe-change', 'baseline-and-acceptance-criteria', 'negative-acceptance-criteria', 'migration-separated-from-redesign', 'representative-pilot-including-hard-cases', 'policy-before-tooling', 'preview-before-apply', 'explicit-apply', 'idempotency', 'partial-failure-reporting', 'affected-file-diff-report', 'review-sampling', 'rollback-boundary'];
const findings = controls.filter((control) => !policy.requiredControls?.includes(control)).map((control) => `missing control: ${control}`);
if (!/Frontmatter changes are script-only/.test(policy.contentPolicy ?? '')) findings.push('missing frontmatter script-only policy');
await mkdir('reports/methodology', { recursive: true });
await writeFile('reports/methodology/change-automation-policy.md', ['# Change and automation policy audit', '', `- Required controls: ${(policy.requiredControls ?? []).length}/${controls.length}`, `- Findings: ${findings.length}`, ...findings.map((finding) => `- ${finding}`), ''].join('\n'));
console.log(`Change/automation policy: ${controls.length - findings.length}/${controls.length} controls present.`);
console.log('Report: reports/methodology/change-automation-policy.md');
if (findings.length) process.exitCode = 1;
