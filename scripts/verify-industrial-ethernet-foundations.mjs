#!/usr/bin/env node
import assert from 'node:assert/strict';
import{readFileSync,writeFileSync,mkdtempSync}from'node:fs';import{spawnSync}from'node:child_process';import{join}from'node:path';import{tmpdir}from'node:os';import{pathToFileURL}from'node:url';
const upstream=process.env.SOEM_ARTICLE_SOURCE||'/private/tmp/soem-article-validation-2026-10-23',work=mkdtempSync(join(tmpdir(),'industrial-foundations-'));
function run(cmd,args){const r=spawnSync(cmd,args,{encoding:'utf8',timeout:60000});if(r.error)throw r.error;assert.equal(r.status,0,r.stderr||r.stdout);return r.stdout;}
assert.equal(run('git',['-C',upstream,'rev-parse','HEAD']).trim(),'abbf0d42e38d6cfbaa4c1e9e8e07ace651c386fd');
const base='src/content/blog/embedded/protocols/industrial-ethernet/';
function fence(ch,title){const s=readFileSync(base+ch,'utf8');const m=[...s.matchAll(/^```\w+ title="([^"]+)"\n([\s\S]*?)^```/gm)].find(m=>m[1]===title);assert.ok(m,title);const p=join(work,title);writeFileSync(p,m[2]);return p;}
const{ptpExchange}=await import(pathToFileURL(fence('chapter02-realtime-requirements.md','ptp-four-timestamps.mjs')));
// Clock offset 50ns, path100ns, processing1000ns; asymmetric path adds half the difference.
assert.deepEqual(ptpExchange(1000n,1150n,2150n,2200n),{offsetTimesTwoNs:100n,pathDelayTimesTwoNs:200n});
assert.deepEqual(ptpExchange(1000n,2150n,3150n,3200n),{offsetTimesTwoNs:1100n,pathDelayTimesTwoNs:1200n});
assert.deepEqual(ptpExchange(1000n,2150n,3150n,2200n),{offsetTimesTwoNs:2100n,pathDelayTimesTwoNs:200n}); // clocks incompatible but algebraic input; no accuracy promise
const epoch=10n**20n;assert.deepEqual(ptpExchange(epoch,epoch+150n,epoch+1150n,epoch+1200n),{offsetTimesTwoNs:100n,pathDelayTimesTwoNs:200n});
for(const a of [[0,1n,2n,3n],[-1n,1n,2n,3n],[10n,10n,9n,20n],[20n,10n,10n,19n],[0n,0n,100n,1n]])assert.throws(()=>ptpExchange(...a),RangeError);
assert.equal(64*32*8/0.00025,65536000);assert.equal(256*100*8/0.001,204800000);
const{parseEtherCAT}=await import(pathToFileURL(fence('chapter04-ethercat-frame.md','ethercat-frame-parser.mjs')));
const src=readFileSync(join(upstream,'soem/ethercatbase.c'),'utf8');
function fn(name){let pos=src.indexOf(name+'(');if(pos<0)pos=src.indexOf(name+' (');assert.ok(pos>=0,name);let start=src.lastIndexOf('\n',pos)+1,open=src.indexOf('{',pos),depth=1,end=open+1;while(depth&&end<src.length){if(src[end]==='{')depth++;if(src[end]==='}')depth--;end++;}return src.slice(start,end);}
const functions=['ecx_writedatagramdata','ecx_setupdatagram','ecx_adddatagram'].map(fn).join('\n');
writeFileSync(join(work,'writer.c'),`#include <stdio.h>\n#include <string.h>\n#include <assert.h>\n#include "ethercattype.h"\ntypedef struct{int txbuflength[EC_MAXBUF];} ecx_portt;\n${functions}\nint main(int argc,char**argv){assert(argc==2);assert(ETH_HEADERSIZE==14&&EC_HEADERSIZE==12&&EC_WKCSIZE==2&&EC_MAXLRWDATA==1486);assert(EC_CMD_FPWR==5&&EC_CMD_BWR==8&&EC_CMD_LRD==10&&EC_CMD_LWR==11&&EC_CMD_LRW==12);ecx_portt p={0};unsigned char frame[EC_BUFSIZE]={0};memset(frame,0xff,6);frame[6]=2;frame[11]=1;frame[12]=0x88;frame[13]=0xa4;unsigned char data[1486]={0};ecx_setupdatagram(&p,frame,EC_CMD_LRW,1,0x10,0,16,data);assert(p.txbuflength[1]==44);FILE*f=fopen(argv[1],"wb");assert(f);assert(fwrite(frame,1,44,f)==44);assert(fclose(f)==0);ecx_adddatagram(&p,frame,EC_CMD_FPRD,1,FALSE,1,0x130,2,data);char path[1024];snprintf(path,sizeof(path),"%s.chain",argv[1]);f=fopen(path,"wb");assert(f);assert(fwrite(frame,1,p.txbuflength[1],f)==(size_t)p.txbuflength[1]);assert(fclose(f)==0);return 0;}\n`);
const binary=join(work,'writer'),packet=join(work,'frame.bin');run('clang',['-std=c11','-Wall','-Wextra','-Werror','-fsanitize=address,undefined','-I'+join(upstream,'soem'),'-I'+join(upstream,'osal'),'-I'+join(upstream,'osal/macosx'),join(work,'writer.c'),'-o',binary]);run(binary,[packet]);
const one=readFileSync(packet),parsed=parseEtherCAT(one);assert.equal(one.length,44);assert.equal(parsed.length,1);assert.equal(parsed[0].address,16);assert.equal(parsed[0].length,16);assert.equal(parsed[0].wkc,0);assert.equal(parsed[0].command,12);
const article=readFileSync(base+'chapter04-ethercat-frame.md','utf8');const hex=article.match(/```text\n((?:[0-9a-f]{2}(?: |\n))+?)```/);assert.ok(hex);assert.deepEqual(Buffer.from(hex[1].replace(/\s/g,''),'hex'),one);
const chain=parseEtherCAT(readFileSync(packet+'.chain'));assert.equal(chain.length,2);assert.equal(chain[0].more,true);assert.equal(chain[1].command,4);assert.equal(chain[1].address,0x01300001);
for(let n=0;n<one.length;n++)assert.throws(()=>parseEtherCAT(one.subarray(0,n)),RangeError);
for(const[off,value]of [[12,0],[15,0x20],[15,0x18],[23,0x80],[23,0x08],[22,0xff]]){const bad=Buffer.from(one);bad[off]=value;assert.throws(()=>parseEtherCAT(bad),RangeError);}
const padding=Buffer.concat([one,Buffer.alloc(16)]);assert.equal(parseEtherCAT(padding).length,1);const snapshot=parseEtherCAT(padding);padding[26]=99;assert.equal(snapshot[0].data[0],0);
const dc=readFileSync(join(upstream,'soem/ethercatdc.c'),'utf8');assert.match(dc,/ecx_BWR\(context->port, 0, ECT_REG_DCTIME0/);assert.match(dc,/ecx_FPWR\(context->port, slaveh, ECT_REG_DCSYSDELAY/);
console.log(JSON.stringify({status:'PASS',checks:['PTP four-timestamp algebra/epoch/invalids and payloadbitrate arithmetic','actual unchanged extracted SOEMv1.4.0 packet writers and actualheaders underASan/UBSan, synthetic portlength array; no NICcode','articlehex equalsactualwriter44bytes; parsermatchesone/two datagrams; alltruncations/type/reserved/M/lengthinvalids/padding/copylifetime','SOEMenum/frameoverhead/DCsourcecontracts'],limits:'No physical NIC/slave/clock adjustments, frame transmission, actual WKC response, industrial control, real jitter/deadline/sync accuracy or functional safety validation.'},null,2));
