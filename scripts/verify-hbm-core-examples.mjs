#!/usr/bin/env node
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
const base='src/content/blog/embedded/hardware/hbm/';
const work=mkdtempSync(join(tmpdir(),'hbm-core-'));
async function load(ch,title){
 const s=readFileSync(base+ch,'utf8');
 const match=[...s.matchAll(/^```js title="([^"]+)"\n([\s\S]*?)^```/gm)].find(m=>m[1]===title);
 assert.ok(match,title);const p=join(work,title);writeFileSync(p,match[2]);return import(pathToFileURL(p));
}
const {independentYield}=await load('chapter02-hbm-stack.md','hbm-independent-yield.mjs');
const expected=['77.4','63.0','51.3','41.8'];
for(const [i,n] of [4,8,12,16].entries())assert.equal((100*independentYield(0.95,n)).toFixed(1),expected[i]);
for(let n=1;n<=16;n++){
 assert.equal(independentYield(0,n),0);assert.equal(independentYield(1,n),1);
 // Independent Bernoulli product, computed by repeated multiplication.
 let expected=1;for(let i=0;i<=n;i++)expected*=0.95;
 assert.ok(Math.abs(independentYield(0.95,n)-expected)<1e-14);
}
for(const [p,n] of [[-1,12],[1.1,12],[NaN,12],[Infinity,12],[0.95,0],[0.95,17],[0.95,1.5],[0.95,NaN]])assert.throws(()=>independentYield(p,n),RangeError);
const {symbolRate}=await load('chapter04-gddr.md','gddr-symbol-rate.mjs');
for(const [rate,encoding,baud,ui] of [[21,'PAM4',10.5,95.23809523809524],[48,'PAM3',32,31.25],[32,'PAM3',64/3,46.875],[16,'NRZ',16,62.5]]){
 const a=symbolRate(rate,encoding);assert.ok(Math.abs(a.gbaud-baud)<1e-12);assert.ok(Math.abs(a.uiPicoseconds-ui)<1e-12);
}
for(const [rate,encoding] of [[0,'PAM4'],[-1,'NRZ'],[NaN,'NRZ'],[Infinity,'PAM3'],[21,'toString'],[21,'pam4'],[Number.MIN_VALUE,'PAM4']])assert.throws(()=>symbolRate(rate,encoding),RangeError);
// Independent unit arithmetic checks for numerical comparisons in the prose.
assert.equal(21*384/8,1008);assert.equal(21*32/8,84);assert.equal(48*32/8,192);assert.equal(192/64,3);
assert.equal(8*2048/8,2048);assert.equal(32*16/8,64);
assert.ok(Math.abs(20*Math.log10(1/3)+9.54242509439325)<1e-12);
assert.ok(Math.abs(20*Math.log10(1/2)+6.020599913279624)<1e-12);
const chart=readFileSync('public/images/blog/hardware/hbm/diagrams/ch03-stack-bw.tex','utf8');
assert.match(chart,/\\v\/300/);assert.match(chart,/11\/2048\/HBM4\/2025/);
console.log(JSON.stringify({status:'PASS',checks:['unchanged extracted yield calculator: normal, boundary, invalid inputs','unchanged extracted symbol calculator: NRZ/PAM3/PAM4, unknown encoding, nonfinite/underflow','dimensional bandwidth/capacity/dB arithmetic; diagram linear-axis source'],limits:'Hypothetical arithmetic only. No DRAM device execution, actual yield, BER, link qualification or sustained bandwidth measurement. Source review and publication gates are separate.'},null,2));
