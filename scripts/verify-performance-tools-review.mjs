#!/usr/bin/env node
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
const base='src/content/blog/embedded/performance-engineering/';
const bare=readFileSync(base+'part5-07-baremetal-profiling.md','utf8');
const block=bare.match(/^```c title="down-counter.c"\n([\s\S]*?)^```/m);assert.ok(block);
const code=block[1]+`
#include <assert.h>
#include <stdio.h>
int main(void){
 uint32_t out;unsigned long cases=0;
 for(uint32_t reload=0;reload<128;reload++)for(uint32_t start=0;start<=reload;start++)for(uint32_t end=0;end<=reload;end++){
  assert(elapsed_down(start,end,reload,&out));
  int64_t period=(int64_t)reload+1;
  assert(out==(uint32_t)(((int64_t)start-end+period)%period));cases++;
 }
 assert(elapsed_down(0,0xffffff,0xffffff,&out)&&out==1);
 assert(elapsed_down(0xffffff,0,0xffffff,&out)&&out==0xffffff);
 assert(elapsed_down(42,42,0xffffff,&out)&&out==0);
 out=0xdead;assert(!elapsed_down(0,0,0x1000000,&out)&&out==0xdead);
 assert(!elapsed_down(128,0,127,&out)&&out==0xdead);
 assert(!elapsed_down(0,128,127,&out)&&out==0xdead);
 assert(!elapsed_down(0,0,0,NULL));
 printf("PASS: unchanged article down-counter helper, %lu exhaustive reload0..127 pairs plus max24bit/zero/wrap/invalid/null and unchanged-reject cases; ASan/UBSan.\\n",cases);
}
`;
const work=mkdtempSync(join(tmpdir(),'perf-tools-review-'));writeFileSync(join(work,'check.c'),code);
function run(exe,args){const p=spawnSync(exe,args,{encoding:'utf8',timeout:60000});if(p.error)throw p.error;assert.equal(p.status,0,p.stderr);return p.stdout;}
run('clang',['-std=c11','-O1','-Wall','-Wextra','-Werror','-fsanitize=address,undefined','-fno-omit-frame-pointer',join(work,'check.c'),'-o',join(work,'check')]);console.log(run(join(work,'check'),[]).trim());
const perf=readFileSync(base+'part5-02-perf-advanced.md','utf8').match(/^```python\n([\s\S]*?)^```/m);assert.ok(perf);writeFileSync(join(work,'callback.py'),perf[1]);
console.log(run('python3',['-c',`import contextlib,io,runpy,sys
f=runpy.run_path(sys.argv[1])['sched__sched_switch']
for name,expected in [('app-worker','7.000000009 cpu2 old -> app-worker\\n'),('other','')]:
 out=io.StringIO()
 with contextlib.redirect_stdout(out): f('sched:sched_switch',None,2,7,9,123,'old',[],'old',123,120,0,name,124,120)
 assert out.getvalue()==expected,(out.getvalue(),expected)
print('PASS: extracted perf Python callback syntax and two synthetic direct-call filter/output cases, not generated callback compatibility or perf dispatch.')`,join(work,'callback.py')]).trim());
console.log('No Linux PMU/perf session, counter registers, MCU waveform/DWT/SysTick/ITM, TRACE32/Streamline/gator/RTOS, CUDA/Nsight/Jetson or safety coverage validation. Counter elapsed must be less than one period with unchanged clock/reload.');
