#!/usr/bin/env node
// Track independently reviewed reports; never infer editorial scores from content metrics.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const dir = 'reports/adsense-audit';
const coverage = JSON.parse(readFileSync(`${dir}/double-check-coverage-2026-10-18.json`, 'utf8'));
const articles = coverage.articles.filter(a => a.series !== 'Modern Embedded Recipes');
const limits = [25, 20, 15, 15, 10, 10, 5];
const head = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const errors = [];
const loops = [];
const results = [];

if (head !== coverage.head) errors.push('HEAD changed: regenerate coverage and recheck source freshness');
if (articles.length !== 406) errors.push(`Expected 406 source records, got ${articles.length}`);

for (let loop = 1; loop <= 41; loop++) {
  const id = String(loop).padStart(2, '0');
  const report = `${dir}/double-check-loop-${id}.md`;
  const expected = articles.filter(a => a.report.endsWith(`published-loop-${id}.md`));
  const record = { loop, report, expected: expected.length, status: 'pending', errors: [] };
  loops.push(record);
  if (!existsSync(report)) continue;
  const text = readFileSync(report, 'utf8');
  const rows = text.split('\n').filter(line => /^\| `[^`]+` \|/.test(line))
    .map(line => line.split('|').slice(1, -1).map(cell => cell.trim()))
    .filter(cells => cells.length >= 11 && cells.slice(1, 9).every(cell => /^\*?\*?\d+\*?\*?$/.test(cell)));
  if (rows.length !== expected.length) record.errors.push(`score rows ${rows.length} != ${expected.length}`);
  const headings = [...text.matchAll(/^###\s+(.+)$/gm)];
  const matched = new Set();
  for (const cells of rows) {
    const label = cells[0].replaceAll('`', '');
    const candidates = expected.filter(a => a.path.endsWith(`/${label}`) || a.path === label);
    if (candidates.length !== 1) {
      record.errors.push(`ambiguous or unexpected file: ${label}`);
      continue;
    }
    const old = candidates[0];
    if (matched.has(old.path)) record.errors.push(`duplicate row: ${label}`);
    matched.add(old.path);
    const scores = cells.slice(1, 8).map(cell => Number(cell.replaceAll('*', '')));
    const total = Number(cells[8].replaceAll('*', ''));
    const factcheck = cells[9].replaceAll('`', '');
    const decision = cells[10].replaceAll('`', '');
    if (scores.some((n, i) => !Number.isInteger(n) || n < 0 || n > limits[i])) record.errors.push(`${label}: score range`);
    if (scores.reduce((sum, n) => sum + n, 0) !== total) record.errors.push(`${label}: score sum`);
    if (!['검증됨', '미검증', '오류 확인'].includes(factcheck)) record.errors.push(`${label}: factcheck enum`);
    if (!['유지', '검증 대기', '보강', '병합 검토', '제외 검토', '우선 조치'].includes(decision)) record.errors.push(`${label}: decision enum`);
    if (factcheck === '오류 확인' && decision !== '우선 조치') record.errors.push(`${label}: error gate`);
    if (decision === '유지' && (factcheck !== '검증됨' || total < 80)) record.errors.push(`${label}: keep gate`);
    if (decision === '검증 대기' && (factcheck !== '미검증' || total < 80)) record.errors.push(`${label}: verification gate`);
    if (!text.includes(old.path)) record.errors.push(`${label}: source_file missing`);
    const basename = old.path.split('/').at(-1);
    const heading = headings.find(h => h[1].includes(basename));
    const nextHeading = heading && headings.find(h => h.index > heading.index);
    const block = heading ? text.slice(heading.index, nextHeading?.index ?? text.length) : '';
    if (!block) record.errors.push(`${label}: article evidence block missing`);
    for (const [index, criterion] of [...'ABCDEFG'].entries()) {
      const evidence = block.match(new RegExp(`^\\|\\s*${criterion}\\s*(\\d+)?\\s*\\|\\s*(.+)$`, 'm'));
      if (!evidence) record.errors.push(`${label}: ${criterion} evidence row absent`);
      else {
        const explicitScore = evidence[1] ?? evidence[2].match(/^(\d+)\s*\|/)?.[1];
        if (explicitScore !== undefined && Number(explicitScore) !== scores[index]) record.errors.push(`${label}: ${criterion} body/table mismatch`);
      }
    }
    for (const field of ['score_status', 'confidence', 'anchor_ref', 'uncertainties', 'blockers']) {
      if (!text.includes(field)) record.errors.push(`${label}: ${field} marker absent from report`);
    }
    results.push({ path: old.path, series: old.series, loop, report,
      publishedReport: report.replace('/double-check-loop-', '/published-loop-'), scores, total, factcheck, decision,
      previous: { scores: old.scores, total: old.total, factcheck: old.factcheck, decision: old.decision },
      delta: total - old.total });
  }
  record.status = record.errors.length ? 'invalid' : 'reviewed';
  if (record.errors.length) errors.push(...record.errors.map(e => `loop ${id}: ${e}`));
}

const validLoops = new Set(loops.filter(l => l.status === 'reviewed').map(l => l.loop));
const reviewed = results.filter(r => validLoops.has(r.loop));
const reviewedPaths = new Set(reviewed.map(r => r.path));
const pending = articles.filter(a => !reviewedPaths.has(a.path)).map(a => ({ path: a.path, series: a.series, report: a.report }));
const sum = (arr, fn) => arr.reduce((total, x) => total + fn(x), 0);
const distribution = (arr, key) => Object.fromEntries([...new Set(arr.map(a => a[key]))].map(value => [value, arr.filter(a => a[key] === value).length]));
const summary = {
  total: articles.length, reviewed: reviewed.length, pending: pending.length,
  loopsReviewed: validLoops.size, loopsPending: loops.length - validLoops.size,
  previousAverageReviewed: reviewed.length ? sum(reviewed, r => r.previous.total) / reviewed.length : null,
  newAverageReviewed: reviewed.length ? sum(reviewed, r => r.total) / reviewed.length : null,
  scoreChanged: reviewed.filter(r => r.delta !== 0).length,
  decisionChanged: reviewed.filter(r => r.decision !== r.previous.decision).length,
  factcheckChanged: reviewed.filter(r => r.factcheck !== r.previous.factcheck).length,
  errorsWithdrawn: reviewed.filter(r => r.previous.factcheck === '오류 확인' && r.factcheck !== '오류 확인').length,
  errorsAdded: reviewed.filter(r => r.previous.factcheck !== '오류 확인' && r.factcheck === '오류 확인').length,
  decisions: distribution(reviewed, 'decision'), factchecks: distribution(reviewed, 'factcheck'),
};
const artifact = { generatedAt: new Date().toISOString(), head, scope: 'Modern Embedded Recipes 이외 공개 406편',
  rubric: '1.2', meaning: '새 보고서의 실제 재검토 기록만 집계. 기계검사 자체는 독립 재검토가 아님.',
  summary, errors, loops, reviewed, pending };
writeFileSync(`${dir}/double-check-progress-2026-10-18.json`, `${JSON.stringify(artifact, null, 2)}\n`);
const avg = n => n === null ? '미산정' : n.toFixed(2);
const lines = [
  '# 공개 406편 독립 재검토 진행표', '',
  `기준 커밋: \`${head}\`. 루브릭 v1.2. Modern Embedded Recipes는 제외한다.`, '',
  `재검토 보고서 기록 **${summary.reviewed}/406편**, **${summary.loopsReviewed}/41루프**. 남은 **${summary.pending}편**.`, '',
  '현재 적용할 점수는 [published 전체 요약](./published-summary.md)과 published-loop-01~41.md가 정본이다. 아래 보고서는 전후 비교를 위한 독립 재검토 기록이다. [현재 점수 CSV](./published-scores.csv) · [이전 평가 보관본](./archive/published-2026-10-12/README.md).', '',
  '보고서가 존재하며 대상·행 수·점수 범위·합계·상태와 경로 표식이 맞는 루프만 집계한다. 이 스크립트는 원문을 읽거나 점수를 생성하지 않으며, 본문 근거의 충분성은 종합 검토자가 별도로 확인한다. 필드 검사는 표식의 존재만 확인한다.', '',
  `완료된 동일 ${summary.reviewed}편 비교: 기존 평균 ${avg(summary.previousAverageReviewed)} → 재검토 평균 ${avg(summary.newAverageReviewed)}. 전체 406편의 새 평균이 아니다.`, '',
  `점수 변경 ${summary.scoreChanged}편; 판정 변경 ${summary.decisionChanged}편; factcheck 변경 ${summary.factcheckChanged}편. 오류 확인 철회 ${summary.errorsWithdrawn}편, 신규 오류 확인 ${summary.errorsAdded}편.`, '',
  '| 루프 | 대상 | 상태 | 보고서 |', '| --- | ---: | --- | --- |',
  ...loops.map(l => `| ${String(l.loop).padStart(2, '0')} | ${l.expected} | ${l.status} | ${l.status === 'pending' ? '대기' : `[보고서](./double-check-loop-${String(l.loop).padStart(2, '0')}.md)`} |`), '',
  '## 집계 검사', '', errors.length ? errors.map(e => `- ${e}`).join('\n') : '현재 작성된 새 보고서의 기계 집계 오류 없음.', '',
  '원문 변경, 공개 상태 변경, 병합·제외는 수행하지 않는다. 미검토 글을 기존 평가에 동의한 것으로 집계하지 않는다. 범위 목록은 [coverage](./double-check-coverage-2026-10-18.md), 공통 검사는 [gates](./double-check-gates-2026-10-18.md)에 기록했다.', '',
];
writeFileSync(`${dir}/double-check-progress-2026-10-18.md`, lines.join('\n'));
console.log(JSON.stringify({ ...summary, errors }, null, 2));
if (errors.length || (process.argv.includes('--require-complete') && pending.length)) process.exitCode = 1;
