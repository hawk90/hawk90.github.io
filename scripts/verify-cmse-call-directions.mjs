#!/usr/bin/env node
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
const a=readFileSync('src/content/blog/embedded/embedded-security/chapter04-trustzone.md','utf8');const b=a.match(/^```c title="cmse-directions.c"\n([\s\S]*?)^```/m);assert.ok(b);
const work=mkdtempSync(join(tmpdir(),'cmse-directions-'));const input=join(work,'secure.c'),output=join(work,'secure.s');writeFileSync(input,b[1]);
function compile(args){const p=spawnSync('clang',args,{encoding:'utf8',timeout:30000});assert.equal(p.status,0,p.stderr);}
const flags=['--target=arm-none-eabi','-mcpu=cortex-m33','-mthumb','-O2','-ffreestanding','-Wall','-Wextra','-Werror','-fno-optimize-sibling-calls','-S'];
compile([...flags,'-mcmse',input,'-o',output]);const asm=readFileSync(output,'utf8');assert.match(asm,/\bbxns\s+lr/);assert.match(asm,/\bblxns\s+r/);assert.match(asm,/__acle_se_secure_increment/);
const ns=join(work,'ns.c'),nsasm=join(work,'ns.s');writeFileSync(ns,'#include <stdint.h>\nextern uint32_t secure_increment(uint32_t);\nuint32_t ns_client(uint32_t x){return secure_increment(x);}\n');
compile([...flags,ns,'-o',nsasm]);const nasm=readFileSync(nsasm,'utf8');assert.match(nasm,/\bbl\s+secure_increment/);assert.doesNotMatch(nasm,/\bblxns\b/);
console.log('PASS: article C compiled for Cortex-M33 -mcmse: secure entry returns BXNS, secure-to-nonsecure callback uses BLXNS; independent nonsecure caller uses ordinary BL.');
console.log('Compile-only, not linked NSC veneers/import library, SAU/IDAU/GTZC configuration, real firmware execution, context leak, pointer/TOCTOU isolation or fault resistance.');
