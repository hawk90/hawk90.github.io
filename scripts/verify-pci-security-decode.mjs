#!/usr/bin/env node
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
const source=process.env.PCIUTILS_ARTICLE_SOURCE||'/private/tmp/pciutils-article-validation-2026-10-24';
function run(exe,args){const p=spawnSync(exe,args,{encoding:'utf8',timeout:30000});if(p.error)throw p.error;assert.equal(p.status,0,p.stderr);return p.stdout;}
assert.equal(run('git',['-C',source,'rev-parse','HEAD']).trim(),'7c5bf915f87d8e4c62be66275c8e73a5f03fa5ee');
const work=mkdtempSync(join(tmpdir(),'pci-security-'));
function fixture(links,selective,state,enabled,pcrc){
 const b=Buffer.alloc(4096);b.writeUInt16LE(0x1234,0);b.writeUInt16LE(0x5678,2);b.writeUInt16LE(16,6);b[11]=2;b[0x34]=0x40;b[0x40]=0x10;b.writeUInt16LE(2,0x42);
 const doe=0x10c+8*links+20*selective;assert.ok(doe+24<=4096);
 b.writeUInt32LE(0x30|(1<<16)|(doe<<20),0x100);
 b.writeUInt32LE(0x60|(links?1|((links-1)<<13):0)|(selective?2|((selective-1)<<16):0),0x104);
 let off=0x10c;
 for(let i=0;i<links;i++,off+=8){b.writeUInt32LE((i<<24)|enabled|(pcrc<<8),off);b.writeUInt32LE(state,off+4);}
 for(let i=0;i<selective;i++,off+=20){b.writeUInt32LE((i<<24)|enabled|(pcrc<<8),off+4);b.writeUInt32LE(state,off+8);}
 b.writeUInt32LE(0x2e|(1<<16),doe);
 const lines=['0000:01:00.0 Ethernet controller [0200]: Synthetic fixture [1234:5678]'];
 for(let i=0;i<b.length;i+=16)lines.push(i.toString(16).padStart(3,'0')+': '+[...b.subarray(i,i+16)].map(v=>v.toString(16).padStart(2,'0')).join(' '));
 return lines.join('\n')+'\n\n';
}
let count=0,example='';
for(const [links,selective] of [[0,0],[1,0],[0,1],[1,1],[8,16]])for(const state of [0,1,2]){
 writeFileSync(join(work,'fixture.dump'),fixture(links,selective,state,1,0));
 const out=run(join(source,'lspci'),['-F',join(work,'fixture.dump'),'-n','-vv']);
 assert.match(out,new RegExp('IDECap: Lnk='+links+' Sel='+selective));
 assert.equal([...out.matchAll(/LinkIDE#\d+ Sta:/g)].length,links);
 assert.equal([...out.matchAll(/SelectiveIDE#\d+ Sta:/g)].length,selective);
 const label=['insecure','reserved','secure'][state];
 if(links)assert.match(out,new RegExp('LinkIDE#0 Sta: Status='+label));
 if(selective)assert.match(out,new RegExp('SelectiveIDE#0 Sta: '+label));
 assert.match(out,/Data Object Exchange/);assert.match(out,/DOECap:/);assert.match(out,/DOECtl:/);assert.match(out,/DOESta:/);assert.doesNotMatch(out,/CMA-SPDM|0001:01|0001:02/);
 if(links===1&&selective===1&&state===2)example=out;
 count++;
}
// Record the actual upstream decoder limitation rather than patching or hiding it.
for(const [enabled,pcrc] of [[1,0],[0,1]]){
 writeFileSync(join(work,'fixture.dump'),fixture(1,1,0,enabled,pcrc));
 const out=run(join(source,'lspci'),['-F',join(work,'fixture.dump'),'-n','-vv']);
 assert.match(out,new RegExp('LinkIDE#0 Ctl: En'+(enabled?'\\+':'-')+'[^\\n]*PCRC'+(enabled?'\\+':'-')));
 assert.match(out,new RegExp('SelectiveIDE#0 Ctl: En'+(enabled?'\\+':'-')+'[^\\n]*PCRC'+(pcrc?'\\+':'-')));
}
console.log('PASS: actual pciutils3.13.0 lspci -F, '+count+' complete synthetic IDE+DOE config fixtures: absent/Link/Selective/both/max8Link+16Selective, insecure/reserved/secure states; DOE decode does not discover SPDM protocols.');
console.log('PASS: two opposite Link En/PCRC raw bit fixtures confirm upstream3.13.0 Link PCRC display uses Enable bit; Selective PCRC uses its own bit. No decoder patch applied.');
console.log(example.split('\n').filter(l=>/Integrity|IDECap|IDECtl|LinkIDE|SelectiveIDE|Data Object|DOECap|DOECtl|DOESta/.test(l)).join('\n'));
console.log('Synthetic dump backend only. No real device/config writes, key programming, DOE exchange, SPDM authentication, actual secure link, CXL cachemem IDE, integrity failure, performance or target lifecycle test.');
