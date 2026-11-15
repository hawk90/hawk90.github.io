import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {existsSync,readFileSync,readdirSync,writeFileSync} from 'node:fs';
const root='reports/adsense-audit/';
const scores=JSON.parse(readFileSync(root+'published-scores.json','utf8'));
assert.equal(scores.articles.length,406);
const sha=path=>createHash('sha256').update(readFileSync(path)).digest('hex');
const records=new Map(), malformed=[];
for(const name of readdirSync(root+'fixes').filter(n=>n.endsWith('.json')).sort()){
 let data;try{data=JSON.parse(readFileSync(root+'fixes/'+name,'utf8'));}catch(e){malformed.push({path:root+'fixes/'+name,error:e.message});continue;}
 const entries=data.articles??data.chapters??data.records;
 if(!Array.isArray(entries))continue;
 for(const entry of entries){
  const article={...entry,path:entry.path??entry.source_file,afterSha256:entry.afterSha256??entry.after_sha256};
  if(!article.path||!article.afterSha256)continue;
  const report=root+'fixes/'+name.replace(/\.json$/,'.md');
  if(!existsSync(report))continue;
  const list=records.get(article.path)??[];list.push({...article,readyForIntegration:data.readyForIntegration,manifest:root+'fixes/'+name,repairReport:report});records.set(article.path,list);
 }
}
const assignments=[['continue_driver_cosim',/\/performance-engineering\//],['continue_embedded_debugging',/\/debugging\/kernel\/|\/bsp\//],['continue_gdb_lldb',/\/bootloader\//],['root',/\/practical-internals\/part2-/]];
const articles=scores.articles.map(article=>{
 const currentSha256=sha(article.path), candidates=records.get(article.path)??[];
 const matching=candidates.filter(c=>c.afterSha256===currentSha256&&c.status!=='unassessed'&&c.readyForIntegration!==false).at(-1), latest=matching??candidates.at(-1);
 const assignment=assignments.find(([,re])=>re.test(article.path));
 const owner=assignment?.[0];
 const externalPending=article.path.includes('/valgrind/')||article.path.endsWith('/python/chapter04-py-spy.md');
 const status=matching?(externalPending?'recorded_external_validation_pending':'recorded'):latest?.readyForIntegration===false?'validation_pending':latest?.status==='unassessed'?'review_unassessed':latest?'source_changed_after_record':owner?(assignment[2]??'in_progress'):'not_started';
 return {path:article.path,series:article.series,status,...(owner?{assignedTo:owner}:{}),evaluationReport:article.report,currentSha256,...(latest?{repairReport:latest.repairReport,manifest:latest.manifest,recordedSha256:latest.afterSha256,validation:latest.validation??'See scoped repair report'}:{}),nextAction:matching?(externalPending?'automated-check':'manual-review'):'manual-review',reviewQuestion:matching?(externalPending?'지원 환경에서 원문의 도구를 실행해 기대한 보고와 정상/실패 종료를 실제로 확인했는가?':'수정 기록의 실행 범위를 넘어선 남은 환경·기능 검증은 무엇인가?'):`${article.path.split('/').at(-1)} 전문과 ${article.report.split('/').at(-1)}의 확인 오류·불확실 항목을 대조하고 실제 정상/실패 예제를 검증했는가?`};
});
const counts={};for(const a of articles)counts[a.status]=(counts[a.status]??0)+1;
const result={updatedAt:new Date().toISOString(),scope:scores.scope,rescored:false,meaning:'recorded means matching article SHA plus companion repair record; never an all-claims verified or re-scored status',counts,malformed,articles};
console.log(JSON.stringify({counts,malformed,apply:process.argv.includes('--apply')},null,2));
if(process.argv.includes('--apply')){
 writeFileSync(root+'fix-queue.json',JSON.stringify(result,null,2)+'\n');
 const lines=['# 공개 글 수정 큐','',`총 ${articles.length}편. 점수·판정·factcheck는 갱신하지 않는다. recorded는 수정 기록과 현재 원문 SHA 일치이며 모든 기능 검증 완료를 뜻하지 않는다.`,'','| 상태 | 편수 |','| --- | ---: |',...Object.entries(counts).map(([k,v])=>`| ${k} | ${v} |`),'','| 원문 | 상태 | 평가·수정 기록 | 다음 확인 |','| --- | --- | --- | --- |',...articles.map(a=>`| [${a.path.split('/').at(-1)}](../../${a.path}) | ${a.status}${a.assignedTo?' ('+a.assignedTo+')':''} | [평가](${a.evaluationReport.slice(root.length)})${a.repairReport?' · [수정]('+a.repairReport.slice(root.length)+')':''} | ${a.reviewQuestion} |`),''];
 // Source paths are relative to the repository root, two levels above this report.
 writeFileSync(root+'fix-queue.md',lines.join('\n'));
 const recorded=articles.filter(a=>a.status.startsWith('recorded'));
 const series=new Map();
 for(const a of articles){const group=series.get(a.series)??{total:0,recorded:0,reports:new Set()};group.total++;if(a.status.startsWith('recorded')){group.recorded++;group.reports.add(a.repairReport);}series.set(a.series,group);}
 const summary=['# 공개 글 수정 진행','',`갱신: ${result.updatedAt}. 대상은 Modern Embedded Recipes를 제외한 공개 글 **406편**이다.`, '',`현재 원문 SHA와 수정 기록이 일치하는 글은 **${recorded.length}편**, 아직 이 조건을 충족하지 않은 글은 **${articles.length-recorded.length}편**이다. 실제 외부 분석 도구 실행 대기 ${counts.recorded_external_validation_pending??0}편은 기록 수에 포함하고, unassessed ${counts.review_unassessed??0}편은 제외한다.`, '', '점수·A–G·판정·factcheck 원장은 보존한다. 전체 수정 후에만 재채점한다. 기록 일치는 모든 기술 주장·하드웨어 동작의 검증 완료를 뜻하지 않는다. 각 보고서의 실행 범위와 NOT RUN 항목이 우선한다.', '', '## 시리즈별 현재 기록', '', '| 시리즈 | SHA 일치 기록 / 대상 | 수정 근거 |','| --- | ---: | --- |',...[...series].filter(([,g])=>g.recorded).map(([name,g])=>`| ${name} | ${g.recorded} / ${g.total} | ${[...g.reports].map((p,i)=>`[기록 ${i+1}](${p.slice(root.length)})`).join(' · ')} |`), '', '## 이어서 할 작업', '', '챕터마다 원문 전문·기존 평가·1차 자료 대조 → 확인 오류 수정 → 가능한 정상/실패 예제 검증 → 근거 8필드와 SHA 기록 순서로 반복한다. 다음 장을 진행할 때 이미 끝난 배치의 상태를 덮어쓰지 않는다.', '', '현재 배정과 미확인 항목의 다음 질문은 [전체 수정 큐](fix-queue.md)에서 관리한다. 단순 배정·정적 gate 통과만으로 수정 완료에 넣지 않는다. 실제 Valgrind 5편과 py-spy 1편의 도구 검증, 그 밖의 Linux/보드/IRQ/FP/성능 측정 등은 해당 기록의 한계를 따른다.', '', '## 공통 검증과 과거 기록', '', '- [기존 점수 요약](published-summary.md): 수정 전 평가 정본이며 수정 진행률과 별개다.', '- [2026-10-21 공통 검증](fixes/repair-loops-final-2026-10-21.md), [2026-10-22 공통 검증](fixes/repair-loops-final-2026-10-22.md): 당시 완료 배치의 실행 범위.', '- 후속 전체 사이트 build·anchor·reading 결과는 `fixes/repair-continuation-checkpoint-*-2026-10-22*` 로그에 checkpoint별로 보존한다. 이후 수정까지 소급해 통과했다고 해석하지 않는다.', '', '집계는 `node scripts/track-article-repair-queue.mjs --apply`로 현재 파일과 고정된 수정 기록을 대조해 갱신한다. 커밋·push·배포 여부는 이 집계에 포함하지 않는다.', ''];
 writeFileSync(root+'fix-progress.md',summary.join('\n'));
}
