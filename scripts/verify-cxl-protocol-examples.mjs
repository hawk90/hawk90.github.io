#!/usr/bin/env node
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync,existsSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
const src=process.env.PCIUTILS_ARTICLE_SOURCE||'/private/tmp/pciutils-article-validation-2026-10-24';
const work=mkdtempSync(join(tmpdir(),'cxl-protocol-'));
function run(cmd,args){const r=spawnSync(cmd,args,{encoding:'utf8',timeout:60000});if(r.error)throw r.error;assert.equal(r.status,0,r.stderr||r.stdout);return r.stdout;}
assert.equal(run('git',['-C',src,'rev-parse','HEAD']).trim(),'7c5bf915f87d8e4c62be66275c8e73a5f03fa5ee');
const lspci=join(src,'lspci');assert.ok(existsSync(lspci),'Build actual pinned pciutils lspci first (no install needed)');
const header=readFileSync(join(src,'lib/header.h'),'utf8');
function constant(name){const m=header.match(new RegExp('^#define\\s+'+name+'\\s+(0x[0-9a-fA-F]+|[0-9]+)\\b','m'));assert.ok(m,name);return Number(m[1]);}
function fixture({vendor=0x1e98,cap=6,control=0}={}){
  const b=Buffer.alloc(4096);b.writeUInt16LE(0x1234,0);b.writeUInt16LE(0x5678,2);b.writeUInt16LE(0x10,6);b[9]=0x10;b[10]=2;b[11]=5;b[0x34]=0x40;b[0x40]=0x10;b.writeUInt16LE(2,0x42);
  b.writeUInt32LE((0x180<<20)|(1<<16)|constant('PCI_EXT_CAP_ID_DVSEC'),0x100);
  b.writeUInt32LE((0x38<<20)|(1<<16)|vendor,0x104);b.writeUInt16LE(0,0x108);
  b.writeUInt16LE(cap,0x100+constant('PCI_CXL_DEV_CAP'));b.writeUInt16LE(control,0x100+constant('PCI_CXL_DEV_CTRL'));
  b.writeUInt32LE((1<<16)|constant('PCI_EXT_CAP_ID_DOE'),0x180);
  const text=['0000:01:00.0 CXL [0502]: Synthetic fixture [1234:5678]'];
  for(let i=0;i<b.length;i+=16)text.push(i.toString(16).padStart(3,'0')+': '+[...b.subarray(i,i+16)].map(x=>x.toString(16).padStart(2,'0')).join(' '));
  return text.join('\n')+'\n\n';
}
const path=join(work,'cxl-io-synthetic.dump');writeFileSync(path,fixture());
const output=run(lspci,['-F',path,'-n','-vv']);
assert.match(output,/Vendor=1e98 ID=0000 Rev=1 Len=56: CXL/);assert.match(output,/CXLCap:\s+Cache- IO\+ Mem\+/);assert.match(output,/CXLCtl:\s+Cache- IO- Mem-/);assert.match(output,/Data Object Exchange/);assert.match(output,/DOESta: Busy- IntSta- Error- ObjectReady-/);
writeFileSync(join(work,'decoded.txt'),output);
for(const [index,options,expected] of [[1,{cap:3},/CXLCap:\s+Cache\+ IO\+ Mem-/],[2,{control:6},/CXLCtl:\s+Cache- IO\+ Mem\+/],[3,{vendor:0x1234},/Vendor=1234 ID=0000/]]){const p=join(work,'variant'+index+'.dump');writeFileSync(p,fixture(options));const out=run(lspci,['-F',p,'-n','-vv']);assert.match(out,expected);if(index===3)assert.doesNotMatch(out,/PCIe DVSEC for CXL Devices/);}
const article=readFileSync('src/content/blog/embedded/hardware/cxl/chapter08-cxl-mem.md','utf8');const m=article.match(/^```js title="cxl-two-way-address.mjs"\n([\s\S]*?)^```/m);assert.ok(m);const module=join(work,'map.mjs');writeFileSync(module,m[1]);const {translateTwoWay}=await import(pathToFileURL(module));
const base=0x80000000n,size=0x80000000n,g=256n;
assert.deepEqual(translateTwoWay(base+0x100n,base,size,g),{target:1,dpa:0n});assert.deepEqual(translateTwoWay(base+0x200n,base,size,g),{target:0,dpa:0x100n});
assert.deepEqual(translateTwoWay(base+size-1n,base,size,g),{target:1,dpa:0x3fffffffn});
for(let i=0n;i<65536n;i++){const r=translateTwoWay(base+i,base,size,g);assert.ok(r.target===0||r.target===1);const inverse=(r.dpa/g*2n+BigInt(r.target))*g+r.dpa%g;assert.equal(inverse,i);}
const high=(1n<<63n)+17n;assert.deepEqual(translateTwoWay(high+512n,high,1024n,256n),{target:0,dpa:256n});
for(const args of [[base-1n,base,size,g],[base+size,base,size,g],[base,base,0n,g],[base,base,size,128n],[base,base,size,768n],[base,base,size,32768n],[base,base,513n,g],[0n,(1n<<64n)-1n,512n,g],[1,0n,512n,g],[-1n,0n,512n,g]])assert.throws(()=>translateTwoWay(...args));
console.log(JSON.stringify({status:'PASS',source:'pciutils v3.13.0 7c5bf915f87d8e4c62be66275c8e73a5f03fa5ee',fixtureDirectory:work,checks:['actual compiled lspci -F dump backend only; generated4096B synthetic PCI config, actual header offsets/IDs','capability vs enable, CXL Vendor/DVSEC ID, DOE idle state and three changed-field fixtures; not hardware profiles','article two-way mapping:65536 inverse roundtrips,table values,end boundary,addresses above2^53,invalid range/granularity/type/size'],limits:'No live PCI reads or writes, DOE request, physical CXL device, cache/snoop trace, region creation, DAX/NUMA mutation, actual HDM decoder or Linux driver runtime. lspci build succeeded with upstream macOS deprecation/format warnings; no install. Synthetic configs test decoder output only.'},null,2));
