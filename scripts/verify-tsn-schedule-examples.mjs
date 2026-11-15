#!/usr/bin/env node
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
const kernel=process.env.LINUX_ARTICLE_SOURCE||'/private/tmp/linux-article-validation-2026-10-23';
const iproute=process.env.IPROUTE_ARTICLE_SOURCE||'/private/tmp/iproute2-article-validation-2026-10-24';
const work=mkdtempSync(join(tmpdir(),'tsn-schedule-'));
function run(cmd,args){const r=spawnSync(cmd,args,{encoding:'utf8',timeout:60000});if(r.error)throw r.error;assert.equal(r.status,0,r.stderr||r.stdout);return r.stdout;}
assert.equal(run('git',['-C',kernel,'rev-parse','HEAD']).trim(),'adc218676eef25575469234709c2d87185ca223a');
assert.equal(run('git',['-C',iproute,'rev-parse','HEAD']).trim(),'742fb8a25c8740a1b93251ed33da08a60b8353aa');
const article=readFileSync('src/content/blog/embedded/protocols/industrial-ethernet/chapter09-tsn-scheduling.md','utf8');
function block(lang,name){const m=[...article.matchAll(new RegExp('^```'+lang+' title="([^"]+)"\\n([\\s\\S]*?)^```','gm'))].find(m=>m[1]===name);assert.ok(m,name);return m[2];}
const input=JSON.parse(block('json','tsn-teaching-schedule.json'));
const js=join(work,'check.mjs');writeFileSync(js,block('js','tsn-teaching-check.mjs'));const {checkSchedule}=await import(pathToFileURL(js));
assert.deepEqual(checkSchedule(input),{totalMatches:true,criticalFits:true,boundaryGuardFits:true,criticalWireNs:'8832',requiredGuardNs:'12336'});
const copy=()=>structuredClone(input);
let bad=copy();bad.linkBps=100000000;assert.equal(checkSchedule(bad).criticalFits,false);assert.equal(checkSchedule(bad).boundaryGuardFits,false);
bad=copy();bad.criticalCount=6;assert.equal(checkSchedule(bad).criticalFits,false);
bad=copy();bad.entries[2].ns=1200;bad.entries[1].ns=986800;assert.equal(checkSchedule(bad).boundaryGuardFits,false);
bad=copy();bad.cycleNs++;assert.equal(checkSchedule(bad).totalMatches,false);
bad=copy();bad.entries.reverse();assert.throws(()=>checkSchedule(bad));
bad=copy();delete bad.entries[1];assert.throws(()=>checkSchedule(bad));
for(const field of ['linkBps','criticalMacBytes','criticalCount','maxOtherMacBytes','cycleNs'])for(const x of [0,-1,1.5,NaN,Infinity,'1',null,Number.MAX_SAFE_INTEGER+1]){bad=copy();bad[field]=x;assert.throws(()=>checkSchedule(bad));}
for(const x of [null,{},[],{...input,entries:null},{...input,entries:[]}])assert.throws(()=>checkSchedule(x));
const shell=block('bash','taprio-full-offload-example.sh');writeFileSync(join(work,'example.sh'),shell);run('bash',['-n',join(work,'example.sh')]);
assert.match(shell,/flags 0x2/);assert.doesNotMatch(shell,/clockid|txtime-delay/);
const commands=[...shell.matchAll(/sched-entry S ([0-9a-f]+) (\d+)/g)].map(m=>({mask:parseInt(m[1],16),ns:Number(m[2])}));assert.deepEqual(commands,input.entries);
const source=readFileSync(join(kernel,'net/sched/sch_taprio.c'),'utf8');
assert.ok(source.includes("The 'clockid' cannot be specified for full offload"));assert.ok(source.includes('txtime-delay can only be set when txtime-assist mode is enabled'));assert.ok(source.includes('TXTIME_ASSIST and FULL_OFFLOAD are mutually exclusive'));
// Compile the unchanged kernel start-time function with explicit host clock/type shims.
const first=source.indexOf('static int taprio_get_start_time('),brace=source.indexOf('{',first);let depth=1,end=brace+1;
for(;depth;end++){if(source[end]==='{')depth++;if(source[end]==='}')depth--;}
assert.ok(first>=0);
const c=`#include <stdint.h>\n#include <assert.h>\n#include <errno.h>\ntypedef int64_t ktime_t;typedef int64_t s64;struct taprio_sched{int64_t now;};struct Qdisc{struct taprio_sched q;};struct sched_gate_list{int64_t base_time,cycle_time;};\n#define qdisc_priv(s) (&(s)->q)\n#define sched_base_time(s) ((s)->base_time)\n#define taprio_get_time(q) ((q)->now)\n#define ktime_after(a,b) ((a)>(b))\n#define WARN_ON(x) (x)\n#define div64_s64(a,b) ((a)/(b))\n#define ktime_sub_ns(a,b) ((a)-(b))\n#define ktime_add_ns(a,b) ((a)+(b))\n${source.slice(first,end)}\nint main(void){struct Qdisc q={0};struct sched_gate_list s={200,1000000};int64_t start=0;for(int64_t now=0;now<5000000;now+=100){q.q.now=now;assert(taprio_get_start_time(&q,&s,&start)==0);assert(start>now);assert((start-200)%1000000==0);assert(start-now<=1000000);}q.q.now=0;s.base_time=10000000;assert(taprio_get_start_time(&q,&s,&start)==0&&start==10000000);q.q.now=200;s.base_time=200;s.cycle_time=0;assert(taprio_get_start_time(&q,&s,&start)==-EFAULT);}\n`;
writeFileSync(join(work,'start.c'),c);run('clang',['-std=c11','-Wall','-Wextra','-Werror','-fsanitize=address,undefined',join(work,'start.c'),'-o',join(work,'start')]);run(join(work,'start'),[]);
console.log(JSON.stringify({status:'PASS',sources:['Linux v6.12 adc218676eef25575469234709c2d87185ca223a','iproute2 v6.12.0 742fb8a25c8740a1b93251ed33da08a60b8353aa'],checks:['article JSON/JS extracted: 8832ns critical,12336ns guard;100Mbit/s,overload,misplaced/short guard,total mismatch,invalid/sparse inputs','article shell syntax only; GCL agrees with JSON, full-offload mode omits forbidden clockid and txtime-delay','actual kernel start-time function with explicit host clock/type shims: past/future/equal base,50000 time samples,zero cycle error;ASan/UBSan','actual kernel rejection messages/source and iproute2 manual reviewed'],limits:'No qdisc configuration, physical NIC, driver offload, PTP/PHC adjustments, wire capture, multi-hop schedule or timing guarantee. Kernel function harness is not an actual kernel run; shell is never executed.'},null,2));
