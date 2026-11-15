#!/usr/bin/env node
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const src=process.env.RT_TESTS_ARTICLE_SOURCE||'/private/tmp/rt-tests-article-validation-2026-10-24';
const work=mkdtempSync(join(tmpdir(),'industrial-linux-'));
function run(cmd,args){const r=spawnSync(cmd,args,{encoding:'utf8',timeout:60000});if(r.error)throw r.error;assert.equal(r.status,0,r.stderr||r.stdout);return r.stdout;}
assert.equal(run('git',['-C',src,'rev-parse','HEAD']).trim(),'217cd8518c5f7777d490892aa9c765a6b2782cb5');
const article=readFileSync('src/content/blog/embedded/protocols/industrial-ethernet/chapter11-linux-realtime.md','utf8');
const m=[...article.matchAll(/^```c title="periodic-next-deadline.c"\n([\s\S]*?)^```/gm)][0];assert.ok(m);writeFileSync(join(work,'deadline.c'),m[1]);
writeFileSync(join(work,'test.c'),`#include <assert.h>\n#include <stddef.h>\n#include "deadline.c"\nint main(void){uint64_t next=999,skip=888;assert(next_deadline(1000,1100,250,&next,&skip)&&next==1250&&skip==0);assert(next_deadline(1000,1750,250,&next,&skip)&&next==2000&&skip==3);for(uint64_t p=1;p<=100;p++)for(uint64_t lag=0;lag<=1000;lag++){uint64_t now=5000+lag,expected=5000+p,count=0;while(expected<=now){expected+=p;count++;}assert(next_deadline(5000,now,p,&next,&skip));assert(next==expected&&skip==count);}next=999;skip=888;assert(!next_deadline(100,99,1,&next,&skip)&&next==999&&skip==888);assert(!next_deadline(0,1,0,&next,&skip));assert(!next_deadline(0,1,1,NULL,&skip));assert(!next_deadline(0,1,1,&next,NULL));assert(!next_deadline(0,1,1,&next,&next));assert(!next_deadline(UINT64_MAX,UINT64_MAX,1,&next,&skip));assert(!next_deadline(0,UINT64_MAX,1,&next,&skip));assert(!next_deadline(UINT64_MAX-1,UINT64_MAX,1,&next,&skip));assert(next_deadline(UINT64_MAX-2,UINT64_MAX-2,1,&next,&skip)&&next==UINT64_MAX-1&&skip==0);return 0;}\n`);
run('clang',['-std=c11','-Wall','-Wextra','-Werror','-fsanitize=address,undefined',join(work,'test.c'),'-o',join(work,'test')]);run(join(work,'test'),[]);
const parser=readFileSync(join(src,'src/cyclictest/cyclictest.c'),'utf8');
for(const option of ['affinity','threads','priority','interval','loops','mlockall','quiet','duration'])assert.ok(parser.includes('"'+option+'"'),option);
const getopt=parser.match(/getopt_long\(argc, argv, "([^"]+)"/);assert.ok(getopt);assert.ok(!getopt[1].includes('n'),'old -n option absent');
for(const [i,block] of [...article.matchAll(/^```bash title="cyclictest-[^"]+"\n([\s\S]*?)^```/gm)].entries()){const p=join(work,'cyclic-'+i+'.sh');writeFileSync(p,block[1]);run('bash',['-n',p]);assert.ok(!/(?:^|\s)-n(?:\s|$)/.test(block[1]));}
assert.equal(200000n*250n,50000000n);assert.equal(3600000000n/250n,14400000n);
console.log(JSON.stringify({status:'PASS',source:'rt-tests v2.6 217cd8518c5f7777d490892aa9c765a6b2782cb5',checks:['extracted article C:100100 bounded time/period cases against iterative reference, exact deadline, skipped release count, invalid/alias/null/time-order and UINT64 overflow, ASan/UBSan','actual cyclictest parser option names/short options reviewed; shell syntax only, no execution','200000x250us=50s nominal;1h/250us=14400000 nominal intervals'],limits:'No cyclictest/rt-tests build or runtime, scheduling/affinity/mlock/boot/NIC changes, kernel latency measurement, actual clock sleep, IgH build/exchange or target production readiness claim. Deadline arithmetic is a declared skip policy only.'},null,2));
