#!/usr/bin/env node
import assert from 'node:assert/strict';
import{readFileSync,writeFileSync,mkdtempSync}from'node:fs';
import{spawnSync}from'node:child_process';
import{tmpdir}from'node:os';import{join}from'node:path';import{pathToFileURL}from'node:url';
const kernel=process.env.LINUX_ARTICLE_SOURCE||'/private/tmp/linux-article-validation-2026-10-23';
const ndctl=process.env.NDCTL_ARTICLE_SOURCE||'/private/tmp/ndctl-article-validation-2026-10-23';
const work=mkdtempSync(join(tmpdir(),'hbm-cxl-'));
function run(cmd,args){const r=spawnSync(cmd,args,{encoding:'utf8',timeout:60000});if(r.error)throw r.error;assert.equal(r.status,0,r.stderr||r.stdout);return r.stdout;}
assert.equal(run('git',['-C',kernel,'rev-parse','HEAD']).trim(),'adc218676eef25575469234709c2d87185ca223a');
assert.equal(run('git',['-C',ndctl,'rev-parse','HEAD']).trim(),'04815e5f8b87e02a4fb5a61aeebaa5cad25a15c3');
function extract(ch,title){const s=readFileSync('src/content/blog/embedded/hardware/hbm/'+ch,'utf8');const m=[...s.matchAll(/^```\w+ title="([^"]+)"\n([\s\S]*?)^```/gm)].find(m=>m[1]===title);assert.ok(m,title);const p=join(work,title);writeFileSync(p,m[2]);return p;}
const {stripeTarget}=await import(pathToFileURL(extract('chapter10-cxl-mem-protocol.md','cxl-simple-stripe.mjs')));
assert.deepEqual([0n,4096n].map(a=>stripeTarget(a,256,2)),[0,0]);assert.deepEqual([0n,4096n].map(a=>stripeTarget(a,4096,2)),[0,1]);assert.deepEqual([0n,256n].map(a=>stripeTarget(a,256,2)),[0,1]);assert.deepEqual([0n,256n].map(a=>stripeTarget(a,4096,2)),[0,0]);
for(const [o,g,w]of [[-1n,256,2],[0,256,2],[0n,128,2],[0n,768,2],[0n,32768,2],[0n,256,3],[0n,256,0]])assert.throws(()=>stripeTarget(o,g,w),RangeError);
assert.equal(stripeTarget((1n<<100n)+256n,256,2),1);
const {demandPeaks}=await import(pathToFileURL(extract('chapter12-cxl-pooling-fabric.md','cxl-pool-demand.mjs')));
assert.deepEqual(demandPeaks([[100,0],[0,100]]),{separatePeakSum:200,concurrentPeak:100});assert.deepEqual(demandPeaks([[100,100]]),{separatePeakSum:200,concurrentPeak:200});assert.deepEqual(demandPeaks([[0],[0]]),{separatePeakSum:0,concurrentPeak:0});
for(const rows of [[],[[]],[[1],[1,2]],[[NaN]],[[Infinity]],[[-1]],[[0.5]],[[undefined]],[[,]],[[Number.MAX_SAFE_INTEGER,1]],[[Number.MAX_SAFE_INTEGER,0],[0,1]],Array(4097).fill([0])])assert.throws(()=>demandPeaks(rows),RangeError);
const access=extract('chapter10-cxl-mem-protocol.md','cxl-access-shapes.c');
const header=readFileSync(join(kernel,'drivers/cxl/cxl.h'),'utf8');
const funcs=['eig_to_granularity','granularity_to_eig'].map(name=>{const m=header.match(new RegExp('static inline int '+name+'\\([^]*?\\n\\}'));assert.ok(m,name);return m[0];}).join('\n');
writeFileSync(join(work,'test.c'),`#include <assert.h>\n#include <errno.h>\n#include <stdint.h>\n#include "${access}"\ntypedef uint16_t u16;\n#define CXL_DECODER_MIN_GRANULARITY 256\n#define CXL_DECODER_MAX_ENCODED_IG 6\n#define SZ_16K 16384\n#define is_power_of_2(n) ((n)>0 && !((n)&((n)-1)))\n#define ilog2(n) (31-__builtin_clz((unsigned)(n)))\n${funcs}\nint main(void){size_t ring[]={1,2,0},out=99;assert(chase_index(ring,3,7,&out)&&out==1);assert(chase_index(ring,3,0,&out)&&out==0);size_t bad[]={4};out=99;assert(!chase_index(bad,1,1,&out)&&out==99);assert(!chase_index(0,0,1,&out));assert(!chase_index(ring,3,1,0));uint64_t sum=88,v[]={UINT64_MAX,1};assert(stream_sum(v,2,&sum)&&sum==0);assert(stream_sum(0,0,&sum)&&sum==0);assert(!stream_sum(0,1,&sum));assert(!stream_sum(v,2,0));for(int g=-1024;g<=32768;g++){u16 e=99;int rc=granularity_to_eig(g,&e);bool valid=g>=256&&g<=16384&&is_power_of_2(g);assert((rc==0)==valid);if(valid){unsigned decoded=0;assert(eig_to_granularity(e,&decoded)==0&&decoded==(unsigned)g);}else assert(e==99);}for(unsigned e=7;e<=65535;e++){unsigned decoded=99;assert(eig_to_granularity((u16)e,&decoded)==-EINVAL&&decoded==99);}}\n`);
run('clang',['-std=c11','-Wall','-Wextra','-Werror','-fsanitize=address,undefined',join(work,'test.c'),'-o',join(work,'test')]);run(join(work,'test'),[]);
const doc=readFileSync(join(ndctl,'Documentation/cxl/cxl-create-region.txt'),'utf8');assert.match(doc,/region type - 'pmem' or 'ram'/);assert.match(doc,/default to 'pmem'/);assert.match(doc,/Must match the selected/);
const region=readFileSync(join(kernel,'drivers/cxl/core/region.c'),'utf8');assert.match(region,/cxld->interleave_ways > 1 && val != cxld->interleave_granularity/);
assert.equal(Math.ceil(50e9*200e-9/64),157);
console.log(JSON.stringify({status:'PASS',pins:{linux:'v6.12 adc218676eef25575469234709c2d87185ca223a',ndctl:'v80 04815e5f8b87e02a4fb5a61aeebaa5cad25a15c3'},checks:['actual extracted upstream granularity encode/decode exhaustive integers -1024..32768 and encoded7..65535, explicit macro shims, ASan/UBSan','extracted bounded access C shapes normal/bad index/null/zero/modular sum','teaching stripe model stride counterexamples and invalid inputs','pool demand matrix async/sync peaks, missing/sparse/nonrectangular/overflow invalid cases','pinned CLI doc/root granularity constraint reviewed; in-flight ceiling157'],limits:'No kernel build/sysfs writes, ndctl binary build or CXL hardware/QEMU/module runtime. Pure arithmetic/synthetic memory inputs only; CXL spec/research/source review is separately scoped. No latency/bandwidth/credit behavior or actual pool capacity savings measured.'},null,2));
