#!/usr/bin/env node
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
const article=readFileSync('src/content/blog/embedded/embedded-security/chapter10-sdlc.md','utf8');
const block=article.match(/^```c title="copy-bytes.c"\n([\s\S]*?)^```/m);assert.ok(block);
const code=block[1]+`
#include <assert.h>
#include <stdio.h>
int main(void) {
 unsigned char source[32],output[48];
 for(size_t i=0;i<32;i++)source[i]=(unsigned char)i;
 for(size_t capacity=0;capacity<=32;capacity++)
  for(size_t length=0;length<=32;length++) {
   memset(output,0xa5,sizeof output);
   int result=copy_bytes(output+4,capacity,source,length);
   assert(result==(length<=capacity?0:-1));
   for(size_t i=0;i<sizeof output;i++) {
    unsigned char expected=(result==0&&i>=4&&i<4+length)?source[i-4]:0xa5;
    assert(output[i]==expected);
   }
  }
 assert(copy_bytes(NULL,0,NULL,0)==0);
 assert(copy_bytes(NULL,32,source,1)==-1);
 memset(output,0xa5,sizeof output);
 assert(copy_bytes(output,32,NULL,1)==-1);
 for(size_t i=0;i<sizeof output;i++)assert(output[i]==0xa5);
 puts("PASS: unchanged article copy_bytes, 1089 length/capacity cases with full guard-byte oracle; null/zero contracts, failed calls leave output unchanged; ASan/UBSan.");
}
`;
const work=mkdtempSync(join(tmpdir(),'security-copy-'));writeFileSync(join(work,'check.c'),code);
function run(exe,args){const p=spawnSync(exe,args,{encoding:'utf8',timeout:30000});if(p.error)throw p.error;assert.equal(p.status,0,p.stderr);return p.stdout;}
run('clang',['-std=c11','-Wall','-Wextra','-Werror','-fsanitize=address,undefined','-fno-omit-frame-pointer',join(work,'check.c'),'-o',join(work,'check')]);
console.log(run(join(work,'check'),[]).trim());
console.log('Host copy contract only. Caller must provide accessible non-overlapping objects and true sizes; not an arbitrary pointer validator, string API, constant-time function or target hardening/SBOM/signature/provenance/compliance test.');
