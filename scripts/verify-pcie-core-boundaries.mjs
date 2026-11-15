#!/usr/bin/env node
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
const src=process.env.LINUX_ARTICLE_SOURCE||'/private/tmp/linux-article-validation-2026-10-23';
function run(exe,args){const p=spawnSync(exe,args,{encoding:'utf8',timeout:120000});assert.equal(p.status,0,p.stderr||p.stdout);return p.stdout;}
assert.equal(run('git',['-C',src,'rev-parse','HEAD']).trim(),'adc218676eef25575469234709c2d87185ca223a');
const read=p=>readFileSync(join(src,p),'utf8');
function func(text,name){const start=text.search(new RegExp('^int '+name+'\\(', 'm'));assert.ok(start>=0,name);const begin=text.indexOf('{',start);let depth=1,i=begin+1;for(;depth;i++){if(text[i]==='{')depth++;if(text[i]==='}')depth--;assert.ok(i<text.length);}return text.slice(start,i);}
const irq=func(read('drivers/pci/msi/api.c'),'pci_alloc_irq_vectors_affinity');
const iov=read('drivers/pci/iov.c');
const header=read('include/linux/pci.h');
const flags=['PCI_IRQ_INTX','PCI_IRQ_MSI','PCI_IRQ_MSIX','PCI_IRQ_AFFINITY'].map(n=>{const x=header.match(new RegExp('^#define '+n+'\\s+([^\\n]+)','m'));assert.ok(x,n);return '#define '+n+' '+x[1];}).join('\n');
const constants=read('include/uapi/linux/pci_regs.h');
const ids={ERR:1,VC9:9,VNDR:11,ACS:13,ATS:15,SRIOV:16,REBAR:21,TPH:23,LTR:24,PASID:27,DPC:29,L1SS:30,DVSEC:35,DOE:46};
const article=readFileSync('src/content/blog/embedded/hardware/pcie/chapter03-config-space.md','utf8');
for(const [n,value] of Object.entries(ids)){const m=constants.match(new RegExp('^#define PCI_EXT_CAP_ID_'+n+'\\s+(0x[0-9a-fA-F]+)','m'));assert.ok(m,n);assert.equal(Number(m[1]),value);assert.ok(article.includes('0x'+value.toString(16).toUpperCase().padStart(4,'0')),'article ID '+n);}
const host=`#include <assert.h>
#include <errno.h>
#include <stdio.h>
${flags}
struct irq_affinity { int unused; };
struct pci_sriov { int offset,stride; };
struct pci_bus { int number; };
struct pci_dev { int irq,is_physfn,devfn; struct pci_bus *bus; struct pci_sriov *sriov; };
static int xr,mr,xc,mc,ic,ac;
#define WARN_ON(x) (!!(x))
static int __pci_enable_msix_range(struct pci_dev*d,void*t,unsigned lo,unsigned hi,struct irq_affinity*a,unsigned f){(void)d;(void)t;(void)lo;(void)hi;(void)a;(void)f;xc++;return xr;}
static int __pci_enable_msi_range(struct pci_dev*d,unsigned lo,unsigned hi,struct irq_affinity*a){(void)d;(void)lo;(void)hi;(void)a;mc++;return mr;}
static void irq_create_affinity_masks(int n,struct irq_affinity*a){assert(n==1&&a);ac++;}
static void pci_intx(struct pci_dev*d,int on){assert(d&&on==1);ic++;}
${irq}
${func(iov,'pci_iov_virtfn_bus')}
${func(iov,'pci_iov_virtfn_devfn')}
int main(void){
 struct pci_bus bus={0};struct pci_sriov sriov={0};struct pci_dev dev={.bus=&bus,.sriov=&sriov};
 int values[]={-ENOSPC,1,3};unsigned checks=0;
 for(unsigned f=0;f<16;f++)for(unsigned lo=1;lo<=3;lo++)for(int hasirq=0;hasirq<2;hasirq++)for(unsigned x=0;x<3;x++)for(unsigned m=0;m<3;m++){
  xr=values[x];mr=values[m];xc=mc=ic=ac=0;dev.irq=hasirq?9:0;
  int expected=-ENOSPC,ex=0,em=0,ei=0;
  if(f&PCI_IRQ_MSIX){ex=1;expected=xr;}
  if(expected<=0&&(f&PCI_IRQ_MSI)){em=1;expected=mr;}
  if(expected<=0&&(f&PCI_IRQ_INTX)&&lo==1&&dev.irq){ei=1;expected=1;}
  struct irq_affinity affinity={0};
  int actual=pci_alloc_irq_vectors_affinity(&dev,lo,4,f,(f&PCI_IRQ_AFFINITY)?&affinity:NULL);
  assert(actual==expected&&xc==ex&&mc==em&&ic==ei);
  assert(ac==(ei&&!!(f&PCI_IRQ_AFFINITY)));checks++;
 }
 // Caller supplies valid kernel-owned structures; this is not a null/ABI test.
 dev.is_physfn=1;sriov.offset=3;sriov.stride=7;
 for(int b=0;b<256;b++)for(int d=0;d<256;d++)for(int v=0;v<16;v++){
  bus.number=b;dev.devfn=d;unsigned rid=(unsigned)(b*256+d+3+7*v);
  assert((unsigned)pci_iov_virtfn_bus(&dev,v)==rid/256);
  assert((unsigned)pci_iov_virtfn_devfn(&dev,v)==rid%256);
 }
 dev.is_physfn=0;assert(pci_iov_virtfn_bus(&dev,0)==-EINVAL);assert(pci_iov_virtfn_devfn(&dev,0)==-EINVAL);
 printf("PASS: %u IRQ flag/fallback cases; 1048576 VF RID cases and non-PF rejection\\n",checks);
 return 0;
}
`;
const dir=mkdtempSync(join(tmpdir(),'pcie-core-'));const c=join(dir,'host.c'),bin=join(dir,'host');writeFileSync(c,host);
run('clang',['-std=c11','-Wall','-Wextra','-Werror','-fsanitize=address,undefined','-fno-omit-frame-pointer',c,'-o',bin]);
console.log(run(bin,[]).trim());
console.log('PASS: published capability IDs match pinned Linux v6.12. Actual upstream functions extracted unchanged with host-only structures and simulated MSI allocators. No kernel build/ABI, live PCI config, real IRQ, DMA, reset or power management executed.');
