#!/usr/bin/env node
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
const post='src/content/blog/tools/debugging/postmortem/';
const fabric=readFileSync(post+'chapter06-cxl-fabric-postmortem.md','utf8');
const js=fabric.match(/^```js title="event-window-order.mjs"\n([\s\S]*?)^```/m);assert.ok(js);
const {eventOrder}=await import('data:text/javascript;base64,'+Buffer.from(js[1]).toString('base64'));
const interval=(lo,hi)=>({lo,hi});
for(const [a,b,expected] of [
 [interval(0n,1n),interval(2n,3n),'before'],
 [interval(2n,3n),interval(0n,1n),'after'],
 [interval(0n,2n),interval(2n,4n),'undetermined'],
 [interval(-3n,7n),interval(4n,14n),'undetermined'],
 [interval(5n,5n),interval(5n,5n),'undetermined'],
 [interval(9007199254740993000n,9007199254740993001n),interval(9007199254740993002n,9007199254740993003n),'before']
])assert.equal(eventOrder(a,b),expected);
for(const bad of [null,undefined,{},interval(2n,1n),interval(0,1),interval(0n,1)])assert.throws(()=>eventOrder(bad,interval(0n,1n)),TypeError);
console.log('PASS: unchanged interval comparator, six before/after/uncertain/overlap/touch/large-BigInt cases and six invalid inputs; nominal center order does not resolve overlapping uncertainty.');
const work=mkdtempSync(join(tmpdir(),'final-article-review-'));
function run(exe,args){const p=spawnSync(exe,args,{encoding:'utf8',timeout:60000});if(p.error)throw p.error;assert.equal(p.status,0,p.stderr);return p.stdout;}
const device=readFileSync(post+'chapter05-cxl-device-postmortem.md','utf8');
for(const [i,match] of [...device.matchAll(/^```python[^\n]*\n([\s\S]*?)^```/gm)].entries()){
 const file=join(work,'drgn-'+i+'.py');writeFileSync(file,match[1]);run('python3',['-c','import sys;compile(open(sys.argv[1]).read(),sys.argv[1],"exec")',file]);
}
console.log('PASS: extracted device drgn examples Python syntax only. Imports, drgn dispatch, kernel memory and vmcore are NOT executed.');
const chapter=readFileSync('src/content/blog/embedded/performance-engineering/part6-03-case-lock-contention.md','utf8');
const blocks=[...chapter.matchAll(/^```c\n([\s\S]*?)^```/gm)].map(m=>m[1]);
const worker=blocks.find(b=>b.includes('_Atomic uint64_t packets')),aggregate=blocks.find(b=>b.includes('struct stats aggregate(void)'));assert.ok(worker&&aggregate);
const c=`#include <assert.h>
#include <stdint.h>
#include <stdatomic.h>
#include <pthread.h>
#include <unistd.h>
#include <stdio.h>
typedef struct {uint64_t len;int err;} packet_t;
struct stats {uint64_t packets,bytes,errors;};
static void publish(struct stats*s){(void)s;}
${worker}
${aggregate}
static void *run_worker(void *arg){unsigned id=(unsigned)(uintptr_t)arg;for(unsigned i=0;i<25000;i++){packet_t p={64+i%128,i%7==0};on_packet(id,&p);}return NULL;}
int main(void){
 struct stats s=aggregate();assert(s.packets==0&&s.bytes==0&&s.errors==0);
 assert(sizeof(struct local_stats)%64==0);
 pthread_t t[4];for(unsigned i=0;i<4;i++)assert(!pthread_create(&t[i],NULL,run_worker,(void*)(uintptr_t)i));for(int i=0;i<4;i++)assert(!pthread_join(t[i],NULL));
 uint64_t bytes=0,errors=0;for(unsigned i=0;i<25000;i++){bytes+=64+i%128;errors+=i%7==0;}
 s=aggregate();assert(s.packets==100000&&s.bytes==4*bytes&&s.errors==4*errors);
 packet_t p={UINT64_MAX,1};on_packet(MAX_WORKERS,&p);struct stats after=aggregate();assert(after.packets==s.packets&&after.bytes==s.bytes&&after.errors==s.errors);
 puts("PASS: unchanged article per-worker counter/aggregate, zero state, four workers100000 variable packets, independent byte/error sum and invalid-worker unchanged; ASan/UBSan. Not simultaneous consistent snapshot or performance.");
}
`;
writeFileSync(join(work,'workers.c'),c);run('clang',['-std=c11','-O1','-Wall','-Wextra','-Werror','-pthread','-fsanitize=address,undefined','-fno-omit-frame-pointer',join(work,'workers.c'),'-o',join(work,'workers')]);console.log(run(join(work,'workers'),[]).trim());
const linux=process.env.LINUX_ARTICLE_SOURCE||'/private/tmp/linux-article-validation-2026-10-23';
assert.equal(run('git',['-C',linux,'rev-parse','HEAD']).trim(),'adc218676eef25575469234709c2d87185ca223a');
const header=readFileSync(linux+'/drivers/cxl/cxl.h','utf8');
for(const symbol of ['CXL_CONFIG_IDLE','CXL_CONFIG_INTERLEAVE_ACTIVE','CXL_CONFIG_ACTIVE','CXL_CONFIG_RESET_PENDING','CXL_CONFIG_COMMIT','nr_targets','interleave_ways'])assert.ok(header.includes(symbol));
assert.match(header,/#define CXL_REGION_F_NEEDS_RESET 1/);
const ras=readFileSync(linux+'/drivers/cxl/core/pci.c','utf8');for(const text of ['frozen state error detected, disable CXL.mem','failure state error detected, request disconnect','memdev disabled, abort error handling'])assert.ok(ras.includes(text));
const trace=readFileSync(linux+'/drivers/cxl/core/trace.h','utf8');assert.match(trace,/TRACE_EVENT\(cxl_poison,/);assert.doesNotMatch(trace,/TRACE_EVENT\(cxl_mem_(read|write),/);
console.log('PASS: pinned Linux6.12 selected CXL enum/field/flag/log/trace-source inventory; source presence only, not kernel build or ABI execution.');
console.log('No actual Linux perf/PMU/DAMON/agent, GPU/vLLM/CXL deployment, drgn/vmcore, FM/switch/transaction trace, clock synchronization, hardware failure/recovery or performance measurement.');
