#!/usr/bin/env node
import {readFileSync,writeFileSync,mkdtempSync,readdirSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
const chapter=(process.argv[2]||'').padStart(2,'0');
assert(/^0[1-4]$/.test(chapter),'usage: node scripts/verify-embedded-cpp-part5-examples.mjs 01..04');
const root='src/content/blog/embedded/embedded-cpp/';
const path=root+readdirSync(root).find(x=>x.startsWith('part5-'+chapter+'-'));
const source=readFileSync(path,'utf8');const dir=mkdtempSync(join(tmpdir(),'cpp-part5-'+chapter+'-'));
function run(args,{fail=false,match}={}){
 console.log('$',args.join(' '));const p=spawnSync(args[0],args.slice(1),{cwd:dir,encoding:'utf8',timeout:30000});
 const out=(p.stdout||'')+(p.stderr||'');if(out)console.log(out);
 assert(!p.error,p.error?.message);assert.equal(p.signal,null,'command terminated');
 if(fail){assert(p.status!==0,'expected failure');if(match)assert(match.test(out),'missing diagnostic');}else assert.equal(p.status,0,'command failed');return out;
}
const names=[];for(const m of source.matchAll(/```cpp title="([^"]+)"\n([\s\S]*?)\n```/g)){
 assert(!m[1].includes('/'));writeFileSync(join(dir,m[1]),m[2]+'\n');names.push(m[1]);
}
assert.equal(names.length,1,'expected one complete example');
const cpp=process.env.CXX||'clang++';const flags=['-std='+(chapter==='02'?'c++20':'c++17'),'-Wall','-Wextra','-pedantic-errors'];if(chapter==='04')flags.push('-fno-rtti');
console.log('article:',path,'temporary:',dir);run([cpp,'--version']);
run([cpp,...flags,...names,'-o','example']);run([join(dir,'example')]);
const negative={'01':['BAD_READ',/no member named 'read'/],'02':['BAD_PIN',/pin must be below 16/],'04':['BAD_STATIC',/without an object/]}[chapter];
if(negative)run([cpp,...flags,'-D'+negative[0],...names,'-o','negative'],{fail:true,match:negative[1]});
if(chapter==='03'){
 // Removing cleanup reproduces the original address-NACK early-return cleanup loss.
 const text=readFileSync(join(dir,names[0]),'utf8');
 writeFileSync(join(dir,'missing-stop.cpp'),text.replace('~Guard(){ if(b.owned) b.stop(); }','~Guard(){}').replace('Bus ok; assert(transaction(ok) && ok.stops==1);','').replace('assert(!transaction(nack) && nack.stops==1);','if (!transaction(nack) && nack.stops==0) return 0; return 1;'));
 run([cpp,...flags,'missing-stop.cpp','-o','missing-stop']);run([join(dir,'missing-stop')]);
}
console.log('PASS: chapter '+chapter+' host normal/negative contracts; no board I/O, IRQ, DMA, timing, or performance measured');
