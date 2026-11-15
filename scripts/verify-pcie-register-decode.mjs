#!/usr/bin/env node
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
const src=process.env.PCIUTILS_ARTICLE_SOURCE||'/private/tmp/pciutils-article-validation-2026-10-24';
const work=mkdtempSync(join(tmpdir(),'pcie-registers-'));
function run(exe,args){const p=spawnSync(exe,args,{encoding:'utf8',timeout:30000});if(p.error)throw p.error;assert.equal(p.status,0,p.stderr);return p.stdout;}
assert.equal(run('git',['-C',src,'rev-parse','HEAD']).trim(),'7c5bf915f87d8e4c62be66275c8e73a5f03fa5ee');
function fixture(control){const b=Buffer.alloc(4096);b.writeUInt16LE(0x1234,0);b.writeUInt16LE(0x5678,2);b.writeUInt16LE(16,6);b[11]=2;b[0x34]=0x40;b[0x40]=0x10;b.writeUInt16LE(2,0x42);b.writeUInt32LE(5,0x44);b.writeUInt16LE(control,0x48);b.writeUInt32LE(5|(16<<4),0x4c);b.writeUInt16LE(5|(16<<4),0x52);b.writeUInt32LE(1|(1<<16),0x100);const lines=['0000:01:00.0 Ethernet controller [0200]: Synthetic fixture [1234:5678]'];for(let i=0;i<b.length;i+=16)lines.push(i.toString(16).padStart(3,'0')+': '+[...b.subarray(i,i+16)].map(v=>v.toString(16).padStart(2,'0')).join(' '));return lines.join('\n')+'\n\n';}
let first='';let count=0;
for(let mps=0;mps<=5;mps++)for(let mrrs=0;mrrs<=5;mrrs++){
 const ctl=0x0810|(mps<<5)|(mrrs<<12);const dump=join(work,'fixture.dump');writeFileSync(dump,fixture(ctl));
 const output=run(join(src,'lspci'),['-F',dump,'-n','-vv']);
 assert.match(output,new RegExp('MaxPayload '+(128*2**mps)+' bytes, MaxReadReq '+(128*2**mrrs)+' bytes'));
 assert.match(output,/LnkSta:\s+Speed 32GT\/s, Width x16/);assert.doesNotMatch(output,/Recovery Time|\bRT[=:]/);
 if(ctl===0x2810)first=output;count++;
}
assert.ok(first);writeFileSync(join(work,'decoded-2810.txt'),first);
console.log(JSON.stringify({status:'PASS',source:'pciutils v3.13.0 7c5bf915f87d8e4c62be66275c8e73a5f03fa5ee',checks:`${count} generated DevCtl fixtures decoded by actual compiled lspci -F; all MPS/MRRS valid encodings0..5; fixed Link Status output`,example:first,limits:'Synthetic 4096-byte config data, not a valid complete hardware profile. Dump backend only; no physical reads/writes, setpci, MMIO, real link training, AER or performance measurement.'},null,2));
