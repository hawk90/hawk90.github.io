#!/usr/bin/env node
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
const base='src/content/blog/embedded/performance-engineering/';
function block(file,info){const text=readFileSync(base+file,'utf8');const match=text.match(new RegExp('^```'+info+'\\n([\\s\\S]*?)^```','m'));assert.ok(match,info);return match[1];}
const energy=block('part3-09-power-vs-performance.md','js title="energy-window.mjs"');
const {energyJ}=await import('data:text/javascript;base64,'+Buffer.from(energy).toString('base64'));
assert.equal(energyJ(1,.1,.1,.1),.1);assert.ok(Math.abs(energyJ(5,.02,.1,.1)-.108)<1e-12);assert.ok(Math.abs(energyJ(3,.02,.1,.1)-.068)<1e-12);assert.ok(energyJ(3,.02,.1,.1,.04)>.1);assert.equal(energyJ(0,0,0,0),0);
for(const bad of [[-1,.1,0,1],[1,2,0,1],[NaN,0,0,1],[1,0,Infinity,1],[1,0,0,1,-1]])assert.throws(()=>energyJ(...bad),RangeError);
const layout=block('part4-02-false-sharing.md','c title="sharing-layout.c"');
const cas=block('part4-07-lock-free.md','c title="bounded-cas-counter.c"');
const code=layout+'\n'+cas+`
#include <assert.h>
#include <stdint.h>
#include <limits.h>
#include <stdio.h>
#include <pthread.h>
static atomic_uint limited;
struct worker_arg {atomic_uint *value;int bounded;};
static void *worker(void *p){struct worker_arg*a=p;if(a->bounded){while(increment_below(a->value,400000)){} }else for(unsigned i=0;i<100000;i++)atomic_fetch_add_explicit(a->value,1,memory_order_relaxed);return NULL;}
static void pair(atomic_uint*a,atomic_uint*b){pthread_t t[2];struct worker_arg w[2]={{a,0},{b,0}};atomic_init(a,0);atomic_init(b,0);for(int i=0;i<2;i++)assert(!pthread_create(&t[i],NULL,worker,&w[i]));for(int i=0;i<2;i++)assert(!pthread_join(t[i],NULL));assert(atomic_load(a)==100000&&atomic_load(b)==100000);}
int main(void){
 assert(alignof(counter_slot)>=64&&sizeof(counter_slot)%64==0);
 assert((uintptr_t)&slots[0]%64==0&&(uintptr_t)&slots[1]%64==0);
 assert((uintptr_t)&slots[0]/64!=(uintptr_t)&slots[1]/64);
 assert((uintptr_t)&dense.a/64==(uintptr_t)&dense.b/64);
 pair(&dense.a,&dense.b);pair(&slots[0].value,&slots[1].value);
 atomic_init(&limited,0);pthread_t t[4];struct worker_arg w={&limited,1};for(int i=0;i<4;i++)assert(!pthread_create(&t[i],NULL,worker,&w));for(int i=0;i<4;i++)assert(!pthread_join(t[i],NULL));assert(atomic_load(&limited)==400000);assert(!increment_below(&limited,400000));assert(atomic_load(&limited)==400000);
 atomic_store(&limited,UINT_MAX-1);assert(increment_below(&limited,UINT_MAX));assert(atomic_load(&limited)==UINT_MAX);assert(!increment_below(&limited,UINT_MAX));
 atomic_store(&limited,0);assert(!increment_below(&limited,0)&&atomic_load(&limited)==0);
 printf("PASS: actual C11 dense/64B-slot layout and two-thread100000updates per field; bounded CAS four-thread400000limit, refusal/zero/UINT_MAX boundaries; atomic_is_lock_free=%d; ASan/UBSan.\\n",atomic_is_lock_free(&limited));
}
`;
const work=mkdtempSync(join(tmpdir(),'perf-core-review-'));writeFileSync(join(work,'check.c'),code);
function run(exe,args){const p=spawnSync(exe,args,{encoding:'utf8',timeout:60000});if(p.error)throw p.error;assert.equal(p.status,0,p.stderr);return p.stdout;}
run('clang',['-std=c11','-O1','-Wall','-Wextra','-Werror','-pthread','-fsanitize=address,undefined','-fno-omit-frame-pointer',join(work,'check.c'),'-o',join(work,'check')]);
console.log('PASS: unchanged article energy model normal100/108/68mJ, transition-cost reversal, zero and five invalid cases; not measured energy.');console.log(run(join(work,'check'),[]).trim());
console.log('Host functional/layout cases only; no target energy/PMU/perf/ftrace, cache-line discovery, affinity benchmark/speedup, all-schedules progress proof, ABA/reclamation or RTOS/ISR validation.');
