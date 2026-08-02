#!/usr/bin/env node
// Ensures completion and governance remain evidence-led and reversible.

import { mkdir, readFile, writeFile } from 'node:fs/promises';

const path = 'archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/remediation-plan/governance-lifecycle-policy.json';
const policy = JSON.parse(await readFile(path, 'utf8'));
const controls = ['happy-and-negative-path-validation', 'before-after-and-long-tail-samples', 'user-experience-alongside-metrics', 'cleanup-and-documentation-after-success', 'reassessment-trigger', 'stateful-evidence-backed-backlog', 'bounded-issue-scope', 'explicit-owner-or-reviewer', 'experiment-expiration', 'closure-with-history-and-reopen-path', 'governance-proportional-to-remediation'];
const culture = ['evidence-over-shame-and-sunk-cost', 'reversible-progress-over-perfectionism', 'preservation-with-evidence-not-fear', 'action-and-reflection-loop'];
const findings = [...controls.filter((control) => !policy.requiredControls?.includes(control)), ...culture.filter((control) => !policy.cultureControls?.includes(control))].map((control) => `missing control: ${control}`);
await mkdir('reports/methodology', { recursive: true });
await writeFile('reports/methodology/governance-lifecycle-policy.md', ['# Governance and lifecycle policy audit', '', `- Lifecycle controls: ${(policy.requiredControls ?? []).length}/${controls.length}`, `- Culture controls: ${(policy.cultureControls ?? []).length}/${culture.length}`, `- Findings: ${findings.length}`, ...findings.map((finding) => `- ${finding}`), ''].join('\n'));
console.log(`Governance/lifecycle policy: ${controls.length + culture.length - findings.length}/${controls.length + culture.length} controls present.`);
console.log('Report: reports/methodology/governance-lifecycle-policy.md');
if (findings.length) process.exitCode = 1;
