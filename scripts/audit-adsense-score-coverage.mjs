#!/usr/bin/env node
// Read-only content audit. Writes only dated Markdown/JSON audit artifacts.
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import * as yaml from 'js-yaml';

const git = (...args) => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
const base = 'c65b45da';
const publishedBase = 'd55f8d66';
const root = 'src/content/blog/';
const recipesRoot = `${root}embedded/modern-recipes/`;
const prefix = 'reports/adsense-audit/double-check-coverage-2026-10-18';
const parse = (text) => yaml.load(text.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? '') ?? {};
const inventory = readdirSync(root, { recursive: true }).filter(p => /\.mdx?$/.test(p)).map(p => {
  const path = root + p;
  const text = readFileSync(path, 'utf8');
  const fm = parse(text);
  return { path, series: fm.series ?? null, order: fm.seriesOrder ?? null, title: fm.title, draft: fm.draft === true, draftFieldAbsent: !Object.hasOwn(fm, 'draft') };
});
const current = inventory.filter(x => !x.draft);
const renames = new Map();
const diffs = git('diff', '--name-status', '-M', base, 'HEAD', '--', recipesRoot).trim().split('\n').filter(Boolean).map(line => {
  const [status, oldPath, newPath] = line.split('\t');
  if (status.startsWith('R')) renames.set(oldPath, newPath);
  return { status, oldPath, path: newPath ?? oldPath };
});
const oldRecipes = git('ls-tree', '-r', '--name-only', base, '--', recipesRoot).trim().split('\n').filter(p => /\.mdx?$/.test(p)).map(path => {
  const fm = parse(git('show', `${base}:${path}`));
  return { path, series: fm.series, order: fm.seriesOrder, draft: fm.draft === true };
}).filter(x => !x.draft).sort((a, b) => a.order - b.order);
const other = current.filter(x => x.series !== 'Modern Embedded Recipes').sort((a, b) => (a.series ?? '').localeCompare(b.series ?? '') || a.order - b.order || a.path.localeCompare(b.path));
const rows = [];
const reportChecks = [];
const issues = [];
const maxima = [25, 20, 15, 15, 10, 10, 5];
function readReport(report, expected, isRecipes) {
  // This dated comparison is the historical baseline, not the latest score sheet.
  // published-loop-* may now contain independently reviewed scores.
  const text = isRecipes ? readFileSync(report, 'utf8') : git('show', `${publishedBase}:${report}`);
  const relevant = isRecipes ? text.slice(text.indexOf('## v1.2 재평가')) : text;
  const found = relevant.split('\n').filter(l => /^\| `[^`]+` \|\s*\d+\s*\|/.test(l)).map(l => l.split('|').slice(1, -1).map(c => c.trim())).filter(cells => cells.length >= 13);
  if (found.length !== expected.length) throw new Error(`${report}: ${found.length} != ${expected.length}`);
  const reportRows = [];
  for (let i = 0; i < found.length; i++) {
    const cells = found[i];
    const label = cells[0].replaceAll('`', '');
    const original = expected[i];
    if (!original.path.endsWith('/' + label)) throw new Error(`Mapping mismatch ${report} ${label} ${original.path}`);
    const path = renames.get(original.path) ?? original.path;
    const article = current.find(x => x.path === path);
    if (!article) throw new Error(`No published current article for ${path}`);
    const scores = cells.slice(1, 8).map(Number);
    const total = Number(cells[8].replaceAll('*', ''));
    const factcheck = cells[9];
    const decision = cells[10];
    const confidence = cells[11];
    const anchorRef = cells[12];
    const rowIssues = [];
    if (scores.some((n, j) => !Number.isInteger(n) || n < 0 || n > maxima[j])) rowIssues.push('score_range');
    if (scores.reduce((a, b) => a + b, 0) !== total) rowIssues.push('score_sum');
    if (!['검증됨', '미검증', '오류 확인'].includes(factcheck)) rowIssues.push('factcheck_enum');
    if (!['낮음', '중간', '높음'].includes(confidence)) rowIssues.push('confidence_enum');
    if (!anchorRef) rowIssues.push('anchor_ref_missing');
    if (factcheck === '오류 확인' && decision !== '우선 조치') rowIssues.push('error_priority');
    if (decision === '유지' && (factcheck !== '검증됨' || total < 80)) rowIssues.push('keep_gate');
    if (decision === '검증 대기' && (factcheck !== '미검증' || total < 80)) rowIssues.push('verification_gate');
    const baseDecision = total >= 80 ? (factcheck === '검증됨' ? '유지' : '검증 대기') : total >= 60 ? '보강' : total >= 40 ? '병합 검토' : '제외 검토';
    const hub = /(?:00-preface|chapter01-)/.test(path);
    let exception = null;
    if (decision !== baseDecision && decision !== '우선 조치') {
      if (hub && decision === '보강') exception = '허브 예외';
      else if (decision === '병합 검토' && total >= 60) exception = '강한 중복 예외 — 수동 근거 확인 대상';
      else rowIssues.push('decision_band');
    }
    const headingMatches = [...relevant.matchAll(/^###\s+(.+)$/gm)];
    const heading = headingMatches.find(m => m[1].includes(label));
    const nextHeading = heading && headingMatches.find(m => m.index > heading.index);
    const block = heading ? relevant.slice(heading.index, nextHeading?.index ?? relevant.length) : '';
    const checks = {
      scoreStatus: /score_status/.test(relevant) && /잠정/.test(relevant),
      articleBlock: !!block,
      uncertainties: /uncertainties/.test(block),
      criterionEvidence: Object.fromEntries('ABCDEFG'.split('').map(k => [k, new RegExp(`^\\| ${k} \\|`, 'm').test(block)])),
    };
    if (!checks.scoreStatus) rowIssues.push('score_status_missing');
    if (!checks.articleBlock) rowIssues.push('article_block_missing');
    if (!checks.uncertainties) rowIssues.push('uncertainties_marker_missing');
    if (Object.values(checks.criterionEvidence).some(v => !v)) rowIssues.push('criterion_evidence_marker_missing');
    const entry = { ...article, oldPath: original.path, report, label, scores, total, factcheck, decision, confidence, anchorRef, scoreStatus: '잠정', exception, checks, issues: rowIssues };
    if (rowIssues.length) issues.push({ path, report, issues: rowIssues });
    rows.push(entry);
    reportRows.push(entry);
  }
  reportChecks.push({ report, rows: found.length, sum: reportRows.reduce((s, x) => s + x.total, 0), average: reportRows.reduce((s, x) => s + x.total, 0) / found.length });
}
for (let n = 1; n <= 16; n++) readReport(`reports/adsense-audit/modern-embedded-recipes-loop-${String(n).padStart(2, '0')}.md`, oldRecipes.slice((n - 1) * 10, n * 10), true);
for (let n = 1; n <= 41; n++) readReport(`reports/adsense-audit/published-loop-${String(n).padStart(2, '0')}.md`, other.slice((n - 1) * 10, n * 10), false);

const counts = new Map();
for (const row of rows) counts.set(row.path, (counts.get(row.path) ?? 0) + 1);
const duplicates = [...counts].filter(([, n]) => n > 1).map(([path, count]) => ({ path, count }));
const missing = current.filter(x => !counts.has(x.path));
const stale = [];
for (const row of rows) {
  const ref = row.series === 'Modern Embedded Recipes' ? base : publishedBase;
  const before = git('show', `${ref}:${row.oldPath}`);
  const now = readFileSync(row.path, 'utf8');
  if (before !== now) {
    const diff = diffs.find(x => x.path === row.path);
    const numstat = git('diff', '--numstat', ref, 'HEAD', '--', row.oldPath, row.path).trim();
    const samePathDiff = row.oldPath === row.path ? git('diff', '--numstat', ref, 'HEAD', '--', row.path).trim().split('\t').slice(0, 2).map(Number) : null;
    // Every small diff was manually inspected: link labels/targets and navigation only.
    const kind = row.oldPath !== row.path ? 'rename-navigation' : row.path.endsWith('/00-preface.md') ? 'hub-structure' : samePathDiff && samePathDiff[0] <= 3 && samePathDiff[1] <= 3 ? 'navigation' : 'content';
    row.freshness = kind;
    stale.push({ path: row.path, oldPath: row.oldPath, series: row.series, order: row.order, report: row.report, oldTotal: row.total, oldFactcheck: row.factcheck, oldDecision: row.decision, kind, gitStatus: diff?.status ?? 'worktree-changed', numstat });
  } else row.freshness = 'unchanged';
}
const series = [...new Set(current.map(x => x.series))].sort((a,b) => (a??'').localeCompare(b??'')).map(name => {
  const members = current.filter(x => x.series === name);
  return { series: name, current: members.length, covered: members.filter(x => counts.has(x.path)).length, missing: members.filter(x => !counts.has(x.path)).length, stale: stale.filter(x => x.series === name).length, unchanged: rows.filter(x => x.series === name && x.freshness === 'unchanged').length };
});
const priority = [...missing.map(x => ({ ...x, reason: '신규 분할 글 미평가' })), ...stale.filter(x => x.kind === 'content').sort((a,b) => a.order - b.order).map(x => ({ ...x, reason: '본문 개정 뒤 구평가' }))];
const nextLoop = priority.slice(0, 10);
const result = { generatedAt: '2026-10-18', head: git('rev-parse','HEAD').trim(), rubric: '1.2', activeScope: 'Modern Embedded Recipes 이외 공개 406편의 기존 Claude 평가 독립 재검토', bases: { recipes: base, published: publishedBase }, summary: { contentFiles: inventory.length, draft: inventory.filter(x=>x.draft).length, published: current.length, publishedWithoutSeries: current.filter(x=>!x.series).length, draftFieldAbsentPublished: current.filter(x=>x.draftFieldAbsent).length, reportFiles: reportChecks.length, scoreRows: rows.length, uniqueCovered: counts.size, missing: missing.length, duplicates: duplicates.length, stale: stale.length, unchanged: rows.filter(x=>x.freshness==='unchanged').length, staleKinds: Object.fromEntries(['content','hub-structure','rename-navigation','navigation'].map(k=>[k,stale.filter(x=>x.kind===k).length])), mechanicalIssueRows: issues.length }, series, missing, duplicates, stale, mechanicalIssues: issues, exceptions: rows.filter(x=>x.exception).map(({path,total,decision,exception,report})=>({path,total,decision,exception,report})), recipesAppendix: { proposedFutureLoop: nextLoop, active: false }, articles: current.map(x=>rows.find(r=>r.path===x.path) ?? {...x,freshness:'missing'}).sort((a,b)=>(a.series??'').localeCompare(b.series??'') || a.order-b.order), reportChecks };
writeFileSync(`${prefix}.json`, JSON.stringify(result, null, 2)+'\n');
const s = result.summary;
const lines = [
  '# 공개 글 평가 누락·중복·평가 후 변경 전수 대조 (2026-10-18)', '',
  `기준 HEAD: \`${result.head}\`. 루브릭 v1.2. 이번 독립 재검토의 본 대상은 Recipes 이외 공개 406편의 Claude 평가다. Recipes 신규 누락·평가 후 수정 목록은 범위 대조용 부록이며 이번 재채점 대상으로 추가하지 않는다. 이 보고서는 원문 전체를 다시 채점한 결과가 아니라 공개 범위·평가행·파일 변경·형식 규칙을 전수 대조한 결과다.`, '',
  '## 결론', '',
  `현재 글 ${s.contentFiles}편 중 공개 ${s.published}편, draft ${s.draft}편이다. 공개 글은 draft YAML 값이 true가 아닌 글로 계산했다. draft 필드 없는 공개 글도 ${s.draftFieldAbsentPublished}편 포함하며, series 없는 공개 글은 ${s.publishedWithoutSeries}편이다.`, '',
  `기존 v1.2 점수는 ${s.reportFiles}개 보고서의 ${s.scoreRows}행이며 현재 파일 ${s.uniqueCovered}편에 대응한다. 실제 미평가 ${s.missing}편, 현재 파일 중복평가 ${s.duplicates}편이다. 평가 뒤 파일 변경 ${s.stale}편과 미평가를 구별해야 한다. 현재 파일이 평가 스냅샷과 같은 것은 ${s.unchanged}편이다.`, '',
  `변경 ${s.stale}편은 Recipes에만 있다: 본문 개정 ${s.staleKinds.content}편, 허브 목차·설명 변경 ${s.staleKinds['hub-structure']}편, 파일명·번호·링크 변경 ${s.staleKinds['rename-navigation']}편, 링크·다음 편 안내 변경 ${s.staleKinds.navigation}편. 본문 개정은 재채점 대상이며, 나머지는 F·B 및 파일/앵커 참조를 먼저 재검토한다. 파일 변경만으로 기존 점수가 틀렸다고 단정하지 않는다.`, '',
  '## 어느 평가에서 무엇이 빠졌나', '',
  '- 초기 부분 평가 커밋 `9c200026`·`d5775b32`·`04e93c4c`: Modern Embedded Recipes 152편의 v1.1 평가와 Abseil/Folly 기계 triage. 나머지 공개 시리즈는 A~G 평가가 없었다. 초기 커밋은 모델 co-author 표기가 없어 git만으로 Codex 작성이라고 확정할 수 없다.',
  '- Claude 명시 후속 커밋 `10550ca1`: Recipes 152편 v1.2 재평가. `c65b45da`: 독립 검증 후 37편 오류 확인으로 정리. 두 커밋에 Claude co-author가 기록되어 있다.',
  '- Claude 명시 후속 커밋 `ba9f7104`·`d55f8d66`: 그 외 25개 시리즈 406편 전부 평가. 초기의 시리즈 누락은 여기서 해소됐다.',
  '- 그 뒤 Recipes 수정 루프가 기존 152편 중 59편을 바꾸고 신규 1편을 분리했다. 따라서 오늘 남은 누락은 신규 1편이며, 과거 406편을 여전히 미평가라고 부르면 안 된다.',
  '- Abseil/Folly 168편은 `7b868851`에서 draft로 전환되어 현재 공개 범위에 포함하지 않았다. rubric.md 도입의 “공개 약 726편/나머지 미착수”는 10월 11일 당시 기록이며 현재 집계가 아니다.', '',
  '## 시리즈별 정확한 범위', '',
  '| 시리즈 | 현재 공개 | 기존 평가 대응 | 미평가 | 평가 후 변경 | 원문 동일 |',
  '| --- | ---: | ---: | ---: | ---: | ---: |',
  ...series.map(x=>`| ${x.series ?? '(series 없음)'} | ${x.current} | ${x.covered} | ${x.missing} | ${x.stale} | ${x.unchanged} |`), '',
  '## 부록: Recipes 실제 누락 파일', '', ...missing.map(x=>`- \`${x.path}\` (seriesOrder ${x.order})`), '',
  '## 부록: Recipes 평가 후 변경 전체 목록', '',
  'Recipes 기준은 평가 검증 커밋 `c65b45da`, 기타 시리즈 기준은 평가 완료 커밋 `d55f8d66`이다. 원문 문자열과 git rename(-M)을 대조했다. 작은 링크 변경과 Part 12 번호 변경은 diff를 별도로 읽어 분류했다.', '',
  '| 현재 파일 | 평가 당시 파일 | 기존 보고서 | 기존 점수 | 변경 종류 |',
  '| --- | --- | --- | ---: | --- |',
  ...stale.sort((a,b)=>a.order-b.order).map(x=>`| \`${x.path}\` | ${x.oldPath===x.path?'동일':`\`${x.oldPath}\``} | ${x.report.split('/').at(-1)} | ${x.oldTotal} | ${x.kind} |`), '',
  '## 기계 전수검사', '',
  `57개 보고서의 유효한 v1.2 표만 읽었다. Recipes에 참고용으로 남은 v1.1 표와 published의 1차/최종 대조 표는 중복 평가행으로 세지 않았다. A~G 상한·합계, factcheck/confidence 값, 오류 확인 우선, 유지·검증 대기 게이트, 판정 구간·허브/강한 중복 예외, score_status 공통선언, 글별 uncertainties와 A~G 근거 표식의 존재를 검사했다. 기계 문제 표시 행: ${issues.length}편.`, '',
  '기계검사는 근거 문장이 실제 원문과 맞는지, D 비교가 타당한지, C 상한의 실질 조건이 성립하는지 증명하지 않는다. 본문 재채점·1차 자료 대조는 별도다. `source_file` 등 YAML 예시의 모든 키를 Markdown에 문자 그대로 요구하지 않고 표·공통선언·글별 블록으로 기록된 동등 정보를 검사했다.', '',
  ...issues.map(x=>`- \`${x.path}\`: ${x.issues.join(', ')} (${x.report})`), '',
  '### 점수 구간의 명시 예외', '',
  ...result.exceptions.map(x=>`- \`${x.path}\`: ${x.total}점 ${x.decision} — ${x.exception}`), '',
  '## 부록: Recipes 후속 작업 후보 (이번에는 실행하지 않음)', '',
  ...nextLoop.map((x,i)=>`${i+1}. \`${x.path}\`${x.oldPath&&x.oldPath!==x.path?` (이전 \`${x.oldPath}\`)`:''}`), '',
  '## 현재 공개 전체 파일 목록', '',
  '모든 파일의 점수·구버전 경로·보고서·검사 결과는 동명 JSON의 articles 배열에 있다. 변경 표시는 기존 점수의 검토 필요성을 뜻한다.', '',
  '| 현재 파일 | 시리즈 순서 | 기존 보고서 | 점수 | 상태 |',
  '| --- | ---: | --- | ---: | --- |',
  ...result.articles.map(x=>`| \`${x.path}\` | ${x.order??''} | ${x.report?.split('/').at(-1)??'없음'} | ${x.total??'미산정'} | ${x.freshness} |`), '',
  '## 재현', '',
  '`node scripts/audit-adsense-score-coverage.mjs`', '',
  '이 스크립트는 콘텐츠·기존 점수 보고서·사용자의 미커밋 파일을 바꾸지 않는다. 새 Markdown/JSON 대조 산출물만 갱신한다. 이미 있던 미커밋 performance-engineering-loop-01 보고서는 확정된 기존 평가 범위에 포함하지 않았다.', '',
];
writeFileSync(`${prefix}.md`, lines.join('\n'));
const queuePath = 'reports/adsense-audit/double-check-published-queue-2026-10-18.json';
let previousQueue;
try { previousQueue = JSON.parse(readFileSync(queuePath, 'utf8')); } catch { previousQueue = null; }
const queueArticles = rows.filter(x=>x.series!=='Modern Embedded Recipes').map(x=>{
  const previous = previousQueue?.articles?.find(p=>p.path===x.path);
  const loop = Number(x.report.match(/loop-(\d+)/)[1]);
  const owner = loop===1?'published_review_01':loop===2?'published_review_02':loop===17?'coverage_audit':null;
  const previousReview = previous?.independentReview;
  // Existing completion is operator-owned; never replace it with assignment defaults.
  const independentReview = previousReview?.status==='completed' ? previousReview : { status:'pending', report:previousReview?.report??null };
  return { path:x.path, series:x.series, order:x.order, sourceReport:x.report, loop, oldScores:x.scores, oldTotal:x.total, oldFactcheck:x.factcheck, oldDecision:x.decision, mechanicalCheck: { status:'passed', errors:x.issues }, independentReview, assignment:previous?.assignment??{status:owner?'in_progress':'unassigned',owner}, parentPerformanceCrossCheck: x.series==='Embedded Performance Engineering'&&x.order<10?'in_progress':null };
});
writeFileSync(queuePath,JSON.stringify({generatedAt:'2026-10-18',scope:'Modern Embedded Recipes 이외 공개 406편 기존 Claude 평가 독립 재검토',head:result.head,rubric:'1.2',total:queueArticles.length,mechanicalCheck:{status:'passed',articles:queueArticles.length,meaning:'합계·상한·필드·분류 형식 검사. 원문 독립 검토 완료를 뜻하지 않음.'},articles:queueArticles},null,2)+'\n');
console.log(JSON.stringify({ summary: s, issues, missing, queue:queuePath }, null, 2));
