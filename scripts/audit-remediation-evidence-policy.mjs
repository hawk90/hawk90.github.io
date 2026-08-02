#!/usr/bin/env node
// Keeps the AP-D evidence contract explicit and machine-checkable.

import { mkdir, readFile, writeFile } from 'node:fs/promises';

const source = await readFile('.claude/rules/06-remediation-evidence.md', 'utf8');
const required = [
  ['context', '발생 맥락과 범위'],
  ['counterexample', '문제 신호와 반증 조건'],
  ['alternatives', '원인 가설과 대안'],
  ['evidence', '**증거**'],
  ['sample', '표본 범위'],
  ['decision', '**결정**'],
  ['smallest-safe-change', '가장 작은 안전한 변경'],
  ['verification', '검증과 잔여 위험'],
  ['preservation', '공개 콘텐츠와 URL은 기본 보존'],
  ['atomic-ids', 'D-01, D-21~24, D-30'],
  ['contextual-classification', 'D-02~10, D-25~29'],
  ['reproducible-evidence', 'D-11~20'],
  ['multi-factor-priority', 'D-31~34'],
];
const findings = required.filter(([, marker]) => !source.includes(marker)).map(([name, marker]) => ({ name, marker }));
await mkdir('reports/methodology', { recursive: true });
await writeFile('reports/methodology/evidence-policy.md', [
  '# AP-D evidence-policy audit', '',
  `- Required safeguards: ${required.length}`,
  `- Missing safeguards: ${findings.length}`,
  ...findings.map(({ name, marker }) => `- ${name}: missing \`${marker}\``),
  '',
].join('\n'));
console.log(`Methodology evidence policy: ${required.length - findings.length}/${required.length} safeguards present.`);
console.log('Report: reports/methodology/evidence-policy.md');
if (findings.length) process.exitCode = 1;
