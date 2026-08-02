#!/usr/bin/env node
// Consolidates non-blocking content-quality signals into a deterministic review queue.

import { spawnSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

const reportDir = 'reports/content-readiness';
await mkdir(reportDir, { recursive: true });

function run(name, command, args, allowedStatuses = [0]) {
  const result = spawnSync(command, args, { encoding: 'utf8', env: { ...process.env, PYTHONUTF8: '1' } });
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
  if (!allowedStatuses.includes(result.status)) {
    throw new Error(`${name} failed with exit ${result.status ?? 'unknown'}\n${output}`);
  }
  return output;
}

const stalenessOutput = run('prose staleness audit', 'python3', ['scripts/audit-prose-staleness.py', '--json', `${reportDir}/staleness.json`], [0, 1]);
const imageOutput = run('image coverage audit', 'python3', ['scripts/audit-image-coverage.py', '--json', `${reportDir}/images.json`, '--top', '0']);
const seriesOutput = run('series integrity audit', 'python3', ['scripts/audit-series-integrity.py', '--json', `${reportDir}/series.json`, '--quiet']);
const factOutput = run('fact-density audit', 'bash', ['scripts/audit-fact-density.sh', '--threshold', '30']);
await Promise.all([
  writeFile(`${reportDir}/staleness.txt`, stalenessOutput),
  writeFile(`${reportDir}/images.txt`, imageOutput),
  writeFile(`${reportDir}/series.txt`, seriesOutput),
  writeFile(`${reportDir}/fact-density.txt`, factOutput),
]);

const [staleness, images, series] = await Promise.all([
  readFile(`${reportDir}/staleness.json`, 'utf8').then(JSON.parse),
  readFile(`${reportDir}/images.json`, 'utf8').then(JSON.parse),
  readFile(`${reportDir}/series.json`, 'utf8').then(JSON.parse),
]);
const factCandidates = [...factOutput.matchAll(/^\s*(\d+)\s+(src\/content\/blog\/[^\s]+\.md)$/gm)]
  .map(([, density, path]) => ({ path, density: Number(density) }));
const queue = [
  ...staleness.findings.map(({ file, line, kind, note, text }) => ({ priority: 'P1', kind: `staleness:${kind}`, path: file, line, reason: note, excerpt: text })),
  ...factCandidates.map(({ path, density }) => ({ priority: 'P2', kind: 'fact-density', path, score: density, reason: `${density} concrete-claim signals; verify against primary sources before marking current.` })),
  ...images.candidates.map(({ path, distinct_keyword_count, keyword_count, top_keywords }) => ({ priority: 'P3', kind: 'visual-aid', path, score: distinct_keyword_count, reason: `${distinct_keyword_count} abstract concepts / ${keyword_count} hits with no image`, keywords: top_keywords })),
];
const report = {
  generatedAt: new Date().toISOString(),
  summary: {
    stalenessCandidates: staleness.findings.length,
    factDensityCandidates: factCandidates.length,
    imageCandidates: images.candidates.length,
    seriesWithIntegrityIssues: series.length,
  },
  queue,
};
await Promise.all([
  writeFile(`${reportDir}/latest.json`, `${JSON.stringify(report, null, 2)}\n`),
  writeFile(`${reportDir}/latest.md`, [
    '# Content readiness queue',
    '',
    '> Review queue only. Signals indicate where to inspect; they do not establish a factual correction, a required illustration, or a lifecycle status. Published content and URLs are preservation-first: this queue never authorizes deletion, consolidation, drafting, archiving, renaming, moving, or bulk rewriting.',
    '',
    `- P1 staleness candidates: ${report.summary.stalenessCandidates}`,
    `- P2 fact-dense candidates: ${report.summary.factDensityCandidates}`,
    `- P3 visual-aid candidates: ${report.summary.imageCandidates}`,
    `- Series integrity issues: ${report.summary.seriesWithIntegrityIssues}`,
    '',
    '## Priority queue',
    '',
    ...queue.map(({ priority, kind, path, line, score, reason }) => `- **${priority}** \`${kind}\` — \`${path}\`${line ? `:${line}` : ''}${score ? ` [${score}]` : ''}: ${reason}`),
    '',
  ].join('\n')),
]);

console.log(`Content readiness: ${queue.length} candidates (P1 ${staleness.findings.length}, P2 ${factCandidates.length}, P3 ${images.candidates.length}); ${series.length} series integrity issue(s).`);
console.log(`Report: ${reportDir}/latest.md`);
