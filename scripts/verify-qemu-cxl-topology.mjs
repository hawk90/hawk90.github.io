#!/usr/bin/env node
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {spawn,spawnSync} from 'node:child_process';
import {createInterface} from 'node:readline';
import {join} from 'node:path';
const src=process.env.QEMU_ARTICLE_SOURCE||'/private/tmp/qemu-article-validation-2026-10-24';
const build=process.env.QEMU_ARTICLE_BUILD||'/private/tmp/qemu-article-build-py314-2026-10-24';
const qemu=join(build,'qemu-system-x86_64');assert.ok(existsSync(qemu),'Build pinned QEMU first');
const head=spawnSync('git',['-C',src,'rev-parse','HEAD'],{encoding:'utf8'});assert.equal(head.status,0);assert.equal(head.stdout.trim(),'b2995afed254e4804611df52210067a4d5dbdf0b');
const base=['-L',join(src,'pc-bios'),'-accel','tcg,thread=single','-machine','q35,cxl=on','-m','128M,maxmem=1G,slots=8','-smp','1','-nodefaults','-display','none','-monitor','none','-serial','none','-S'];
const devices=['-object','memory-backend-ram,id=vmem0,size=256M','-device','pxb-cxl,bus_nr=12,bus=pcie.0,id=cxl.1','-device','cxl-rp,port=0,bus=cxl.1,id=root_port13,chassis=0,slot=2','-device','cxl-type3,bus=root_port13,volatile-memdev=vmem0,id=cxl-vmem0','-M','cxl-fmw.0.targets.0=cxl.1,cxl-fmw.0.size=256M'];
const article=readFileSync('src/content/blog/embedded/hardware/cxl/chapter12-qemu-emulation.md','utf8');
const block=article.match(/^```bash title="qemu-cxl-paused.sh"\n([\s\S]*?)^```/m);assert.ok(block);
const syntax=spawnSync('bash',['-n'],{input:block[1],encoding:'utf8'});assert.equal(syntax.status,0,syntax.stderr);
const split=spawnSync('python3',['-c','import shlex,sys,json; print(json.dumps(shlex.split(sys.stdin.read().replace(chr(92)+chr(10)," "))))'],{input:block[1],encoding:'utf8'});assert.equal(split.status,0,split.stderr);
const articleArgs=JSON.parse(split.stdout);assert.equal(articleArgs.shift(),'qemu-system-x86_64');
assert.deepEqual(articleArgs.map(x=>x.replace('$QEMU_SOURCE',src)),[...base,...devices,'-qmp','stdio'],'tested argv exactly matches article after source path resolution');
async function topology(){
 const child=spawn(qemu,[...base,...devices,'-qmp','stdio'],{stdio:['pipe','pipe','pipe']});let stderr='',greetingResolve,greetingReject;
 const greeting=new Promise((resolve,reject)=>{greetingResolve=resolve;greetingReject=reject;});const pending=new Map();
 const lines=createInterface({input:child.stdout});const timer=setTimeout(()=>{child.kill();greetingReject(new Error('QMP timeout '+stderr));for(const p of pending.values())p.reject(new Error('QMP timeout '+stderr));},20000);
 child.stderr.on('data',x=>stderr+=x);child.on('error',greetingReject);
 lines.on('line',line=>{let m;try{m=JSON.parse(line);}catch{return;}if(m.QMP)greetingResolve(m);if(pending.has(m.id)){const p=pending.get(m.id);pending.delete(m.id);if(m.error)p.reject(new Error(JSON.stringify(m.error)));else p.resolve(m.return);}});
 const exited=new Promise(resolve=>child.on('exit',(code,signal)=>{greetingReject(new Error('QEMU exited '+code+' '+signal+' '+stderr));for(const p of pending.values())p.reject(new Error('QEMU exited '+stderr));resolve(code);}));
 let serial=0;const request=(execute,args)=>new Promise((resolve,reject)=>{const id=++serial;pending.set(id,{resolve,reject});child.stdin.write(JSON.stringify({execute,...(args?{arguments:args}:{}),id})+'\n');});
 try{
  const hello=await greeting;assert.equal(hello.QMP.version.qemu.major,9);await request('qmp_capabilities');
  const status=await request('query-status');assert.equal(status.running,false,'guest CPU remains stopped');
  const pci=await request('query-pci');
  function collect(x,out=[]){if(x&&typeof x==='object'){if('qdev_id' in x)out.push(x);for(const v of Object.values(x))collect(v,out);}return out;}
  const visible=collect(pci).some(x=>x.qdev_id==='cxl-vmem0');assert.equal(await request('qom-get',{path:'/machine/peripheral/cxl-vmem0',property:'realized'}),true);
  assert.equal(await request('qom-get',{path:'/machine/peripheral/cxl-vmem0',property:'volatile-memdev'}),'/objects/vmem0');
  const properties=await request('qom-list',{path:'/machine/peripheral/cxl-vmem0'});const names=properties.map(x=>x.name);assert.ok(names.includes('num-dc-regions'));assert.ok(!names.includes('hdm-db'));assert.ok(!names.includes('x-256b-flit'));
  await request('quit');assert.equal(await exited,0);return {status:status.status,type3:{id:'cxl-vmem0',realized:true,visibleInQueryPciBeforeFirmware:visible},properties:{dynamicCapacityRegions:true,hdmDb:false,x256bFlit:false},stderr};
 }finally{clearTimeout(timer);lines.close();if(child.exitCode===null)child.kill();}
}
const result=await topology();
function rejectCase(name,args,pattern){const p=spawnSync(qemu,args,{encoding:'utf8',timeout:10000});if(p.error)throw p.error;assert.notEqual(p.status,0,name);assert.match(p.stderr,pattern,name);return {name,status:p.status,error:p.stderr.trim()};}
const wrongWindow=devices.map(x=>x.includes('cxl-fmw.0.size=256M')?x.replace('size=256M','size=257M'):x);
const cases=[rejectCase('CXL host bridge with cxl off',[...base.map(x=>x==='q35,cxl=on'?'q35,cxl=off':x),...devices],/CXL host bridges present, but cxl=off/),rejectCase('FMW not multiple of 256MiB',[...base,...wrongWindow],/multiple of 256MiB/),rejectCase('duplicate expander bus number',[...base,...devices,'-device','pxb-cxl,bus_nr=12,bus=pcie.0,id=duplicate'],/Bus 12 is already in use/)];
console.log(JSON.stringify({status:'PASS',source:'QEMU v9.2.4 b2995afed254e4804611df52210067a4d5dbdf0b',runtime:result,negativeCases:cases,limits:'Headless emulated machine/device realization with CPU stopped and no guest image/kernel, no host network or physical device passthrough. QMP topology/config object verification only. No guest PCI enumeration, CEDT dump, Linux CXL probe/region/NUMA, DC capacity exchange, poison/error injection, PHY/coherency or performance validation.'},null,2));
