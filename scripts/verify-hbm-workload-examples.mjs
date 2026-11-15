#!/usr/bin/env node
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {pathToFileURL} from 'node:url';
import {spawnSync} from 'node:child_process';
const work=mkdtempSync(join(tmpdir(),'hbm-workload-'));
const base='src/content/blog/embedded/hardware/hbm/';
function extract(ch,title){const s=readFileSync(base+ch,'utf8');const m=[...s.matchAll(/^```\w+ title="([^"]+)"\n([\s\S]*?)^```/gm)].find(m=>m[1]===title);assert.ok(m,title);const p=join(work,title);writeFileSync(p,m[2]);return p;}
const {roofline}=await import(pathToFileURL(extract('chapter05-bandwidth-bottleneck.md','hbm-roofline.mjs')));
const triad=roofline({bytes:24000000,seconds:0.001,flops:2000000,peakGBs:3350,peakGFLOPs:990000});
assert.equal(triad.logicalGBs,24);assert.ok(Math.abs(triad.intensity-1/12)<1e-15);assert.ok(Math.abs(triad.knee-295.5223880597015)<1e-12);assert.ok(Math.abs(triad.ceilingGFLOPs-3350/12)<1e-12);
const gemm=roofline({bytes:3*1024**2*2,seconds:1,flops:2*1024**3,peakGBs:3350,peakGFLOPs:990000});assert.equal(gemm.ceilingGFLOPs,990000);
for(const key of ['bytes','seconds','flops','peakGBs','peakGFLOPs'])for(const value of [0,-1,NaN,Infinity])assert.throws(()=>roofline({bytes:1,seconds:1,flops:1,peakGBs:1,peakGFLOPs:1,[key]:value}),RangeError);
assert.throws(()=>roofline({bytes:Number.MIN_VALUE,seconds:1,flops:Number.MAX_VALUE,peakGBs:1,peakGFLOPs:1}),RangeError);
const {clockMask}=await import(pathToFileURL(extract('chapter06-thermal-power.md','hbm-clock-mask.mjs')));
assert.deepEqual(clockMask('0x0'),{swPowerCap:false,swThermal:false,hwThermal:false,otherBits:0n});
assert.deepEqual(clockMask('0x64'),{swPowerCap:true,swThermal:true,hwThermal:true,otherBits:0n});
assert.equal(clockMask('0x8000000000000020').otherBits,1n<<63n);
assert.equal(clockMask('0xffffffffffffffff').otherBits,0xffffffffffffffffn^100n);
for(const input of ['N/A','',32,'32','0x','-0x20','0x10000000000000000',' 0x20','0xzz'])assert.throws(()=>clockMask(input),RangeError);
const {kvBytes}=await import(pathToFileURL(extract('chapter08-npu-gpu-usage.md','hbm-kv-budget.mjs')));
const cfg={layers:80,kvHeads:8,headDim:128,elementBytes:2,batch:128,sequence:2048};
assert.equal(kvBytes({...cfg,batch:1,sequence:1}),327680n);
assert.equal(kvBytes(cfg),85899345920n);assert.equal(kvBytes({...cfg,sequence:4096}),171798691840n);assert.equal(kvBytes({...cfg,kvHeads:64}),687194767360n);
for(const key of Object.keys(cfg))for(const value of [0,-1,1.5,NaN,Infinity,Number.MAX_SAFE_INTEGER+1])assert.throws(()=>kvBytes({...cfg,[key]:value}),RangeError);
assert.equal(kvBytes({...cfg,batch:Number.MAX_SAFE_INTEGER}),327680n*BigInt(Number.MAX_SAFE_INTEGER)*2048n);
const mapping=extract('chapter07-memory-controller.md','hbm-toy-mapping.c');
writeFileSync(join(work,'test.c'),`#include <assert.h>\n#include "${mapping}"\nint main(void){unsigned counts[16]={0};for(uint64_t i=0;i<16;i++){struct mapping m=toy_mapping(i*(UINT64_C(1)<<21));assert(m.channel==0);counts[m.bank]++;}for(unsigned i=0;i<16;i++)assert(counts[i]==1);struct mapping a=toy_mapping(0),b=toy_mapping((UINT64_C(1)<<13)|(UINT64_C(1)<<21));assert(a.channel==b.channel&&a.bank==b.bank);for(uint64_t i=0;i<100000;i++){struct mapping m=toy_mapping(i*UINT64_C(0x9e3779b97f4a7c15));assert(m.channel<16&&m.bank<16);}struct mapping z=toy_mapping(UINT64_MAX);assert(z.channel<16&&z.bank<16);}\n`);
for(const [cmd,args]of [['clang',['-std=c11','-Wall','-Wextra','-Werror','-fsanitize=address,undefined',join(work,'test.c'),'-o',join(work,'test')]],[join(work,'test'),[]]]){const r=spawnSync(cmd,args,{encoding:'utf8',timeout:60000});if(r.error)throw r.error;assert.equal(r.status,0,r.stderr);}
console.log(JSON.stringify({status:'PASS',checks:['extracted roofline arithmetic + boundaries + numeric overflow','extracted uint64 hex mask normal/multiple/unknown bits and invalid/N/A cases','extracted KV formula exact BigInt counts incl 86/172/687GB and invalid inputs','extracted C toy address map compiled/ASan/UBSan: 2MiB stride banks, channel concentration, explicit XOR collision, 100000 sample addresses'],limits:'CPU arithmetic and synthetic address/mask input only; no CUDA compile or GPU/FPGA memory, true DRAM timing/scheduling/thermal/BER or LLM serving execution.'},null,2));
