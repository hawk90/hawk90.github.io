#!/usr/bin/env node
// Verifies that remediation priority remains a reviewable multi-factor decision.

import { mkdir, readFile, writeFile } from 'node:fs/promises';

const path = 'archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/remediation-plan/priority-decision-policy.json';
const policy = JSON.parse(await readFile(path, 'utf8'));
const expectedFactors = ['userImpact', 'frequency', 'blastRadius', 'confidence', 'reversibility', 'dependencyOrder', 'maintenanceCost', 'effort'];
const expectedShortcuts = ['severity-only prioritization', 'easy-win-only prioritization', 'automatic composite-score decisions', 'priority without a baseline or reassessment'];
const expectedAcceptance = ['rationale', 'residualRisk', 'reassessmentTrigger'];
const findings = [
  ...expectedFactors.filter((factor) => !policy.requiredFactors?.includes(factor)).map((factor) => `missing factor: ${factor}`),
  ...expectedShortcuts.filter((shortcut) => !policy.forbiddenShortcuts?.includes(shortcut)).map((shortcut) => `missing safeguard: ${shortcut}`),
  ...(policy.allowedOutcomes?.includes('do-nothing') ? [] : ['missing allowed outcome: do-nothing']),
  ...expectedAcceptance.filter((requirement) => !policy.acceptanceRequirements?.includes(requirement)).map((requirement) => `missing acceptance requirement: ${requirement}`),
];
await mkdir('reports/methodology', { recursive: true });
await writeFile('reports/methodology/priority-policy.md', ['# Priority decision-policy audit', '', `- Required factors: ${policy.requiredFactors?.length ?? 0}/${expectedFactors.length}`, `- Forbidden shortcuts: ${policy.forbiddenShortcuts?.length ?? 0}/${expectedShortcuts.length}`, `- Acceptance requirements: ${policy.acceptanceRequirements?.length ?? 0}/${expectedAcceptance.length}`, `- Findings: ${findings.length}`, ...findings.map((finding) => `- ${finding}`), ''].join('\n'));
console.log(`Priority policy: ${expectedFactors.length + expectedShortcuts.length + expectedAcceptance.length - findings.length}/${expectedFactors.length + expectedShortcuts.length + expectedAcceptance.length} safeguards present.`);
console.log('Report: reports/methodology/priority-policy.md');
if (findings.length) process.exitCode = 1;
