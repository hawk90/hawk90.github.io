#!/usr/bin/env node
import assert from 'node:assert/strict';
import {readFileSync, writeFileSync, mkdtempSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
const src=process.env.PNET_ARTICLE_SOURCE||'/private/tmp/p-net-article-validation-2026-10-23';
const work=mkdtempSync(join(tmpdir(),'profinet-io-'));
function run(cmd,args){const r=spawnSync(cmd,args,{encoding:'utf8',timeout:60000});if(r.error)throw r.error;assert.equal(r.status,0,r.stderr||r.stdout);return r.stdout;}
assert.equal(run('git',['-C',src,'rev-parse','HEAD']).trim(),'ca4f37c5d66b5378a8cf9349b9084df0612043da');
const article=readFileSync('src/content/blog/embedded/protocols/industrial-ethernet/chapter07-profinet-io.md','utf8');
async function extract(name){const m=[...article.matchAll(/^```js title="([^"]+)"\n([\s\S]*?)^```/gm)].find(m=>m[1]===name);assert.ok(m,name);const p=join(work,name);writeFileSync(p,m[2]);return import(pathToFileURL(p));}
const {updateTimeNs}=await extract('profinet-update-time.mjs');
assert.equal(updateTimeNs(32,1),1000000);assert.equal(updateTimeNs(2,4),250000);assert.equal(updateTimeNs(1,1),31250);
for(const x of [0,-1,1.5,NaN,Infinity,'32',null,Number.MAX_SAFE_INTEGER+1]){assert.throws(()=>updateTimeNs(x,1));assert.throws(()=>updateTimeNs(1,x));}
assert.throws(()=>updateTimeNs(Number.MAX_SAFE_INTEGER,1));
const {decodeApduStatus}=await extract('profinet-apdu-status.mjs');
assert.deepEqual(decodeApduStatus(Uint8Array.of(0x12,0x34,0x35,0)),{cycleCounter:0x1234,rawDataStatus:0x35,primary:true,dataValid:true,providerRun:true,stationNormal:true,transferStatus:0});
for(let status=0;status<256;status++){const r=decodeApduStatus(Uint8Array.of(0xff,0xff,status,0xa5));assert.equal(r.cycleCounter,65535);assert.equal(r.rawDataStatus,status);assert.equal(r.transferStatus,0xa5);assert.equal(r.primary,!!(status%2));assert.equal(r.dataValid,!!(Math.floor(status/4)%2));assert.equal(r.providerRun,!!(Math.floor(status/16)%2));assert.equal(r.stationNormal,!!(Math.floor(status/32)%2));}
for(const x of [null,[],[0,0,0,0],new Uint8Array(3),new Uint8Array(5),new DataView(new ArrayBuffer(4))])assert.throws(()=>decodeApduStatus(x));
const ppm=readFileSync(join(src,'src/common/pf_ppm.c'),'utf8');
function cfun(name){const start=ppm.indexOf('uint16_t '+name+' (');assert.ok(start>=0);const body=ppm.indexOf('{',start);let depth=1,end=body+1;for(;depth;end++){if(ppm[end]==='{')depth++;if(ppm[end]==='}')depth--;}return ppm.slice(start,end);}
writeFileSync(join(work,'counter.c'),`#include <stdint.h>\n#include <assert.h>\n${cfun('pf_ppm_calculate_cyclecounter')}\n${cfun('pf_ppm_calculate_next_cyclecounter')}\nint main(void){for(uint32_t old=0;old<=65535;old++){uint16_t actual=pf_ppm_calculate_next_cyclecounter(old,2,4);uint16_t expected=(uint16_t)(old-(old%8)+8);assert(actual==expected);}for(uint32_t t=0;t<=2048000;t+=125){assert(pf_ppm_calculate_cyclecounter(t,2,4)==(uint16_t)((t/250)*8));}assert(pf_ppm_calculate_next_cyclecounter(65528,2,4)==0);assert(pf_ppm_calculate_next_cyclecounter(0,32,1)==32);return 0;}\n`);
run('clang',['-std=c11','-Wall','-Wextra','-Werror','-fsanitize=address,undefined',join(work,'counter.c'),'-o',join(work,'counter')]);run(join(work,'counter'),[]);
// Source contract checks are textual, separate from the executable checks above.
for(const [file,pattern] of [['src/common/pf_dcp.c',/PF_DCP_ID_REQ_FRAME_ID\s+0x[fF][eE][fF][eE]/],['src/common/pf_alarm.c',/0x[fF][cC]01/],['src/common/pf_alarm.c',/0x[fF][eE]01/]])assert.match(readFileSync(join(src,file),'utf8'),pattern);
console.log(JSON.stringify({status:'PASS',source:'p-net ca4f37c5d66b5378a8cf9349b9084df0612043da',checks:['article JS extracted: exact units, positive integer validation and overflow rejection','all 256 DataStatus values, big-endian counter, raw transfer byte, malformed inputs','unchanged upstream cycle-counter functions extracted: all 65536 previous values for factor 2/ratio 4, time sweep including wrap; ASan/UBSan','textual DCP Identify and alarm FrameID checks'],limits:'Pure host calculations and source checks only. No complete p-net stack build, NIC access, packet transmission/capture, PLC connection, GSDML import, MRP recovery or functional safety validation.'},null,2));
