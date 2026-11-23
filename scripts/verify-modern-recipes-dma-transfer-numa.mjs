// Prepare article snippets and real Linux guest checks. Run from repository root.
import assert from 'node:assert/strict';
import {cpSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {join, resolve} from 'node:path';
import {spawnSync} from 'node:child_process';

assert.ok(process.env.RECIPES_REVIEW_WORK, 'Set RECIPES_REVIEW_WORK to the test directory');
const work = resolve(process.env.RECIPES_REVIEW_WORK);
mkdirSync(work, {recursive: true});
const put = (name, text) => writeFileSync(join(work, name), text);
const root = 'src/content/blog/embedded/modern-recipes';
const fence = String.fromCharCode(96).repeat(3);
const blocks = new RegExp('^'+fence+'[\\w+]+ title="([^"]+)"\\n([\\s\\S]*?)^'+fence, 'gm');
for (const file of ['part8-04-dma-allocator.md','part8-05-zero-copy.md','part8-06-numa.md']) {
  for (const [,name,body] of readFileSync(join(root,file),'utf8').matchAll(blocks)) put(name,body);
}
cpSync('scripts/fixtures/recipes-sharing',join(work,'fixtures'),{recursive:true});
mkdirSync(join(work,'shims/linux'),{recursive:true});
for (const name of ['dma-mapping.h','errno.h','scatterlist.h','mm.h','dma-buf.h','err.h']) {
  put('shims/linux/'+name,'#include "dma-fixture.h"\n');
}
// glibc errno.h itself includes linux/errno.h; preserve the real numeric constants.
put('shims/linux/errno.h','#pragma once\n#include_next <linux/errno.h>\n');
mkdirSync(join(work,'kernel'),{recursive:true});
cpSync(join(work,'fixtures/review-module.c'),join(work,'kernel/review.c'));
put('kernel/Makefile','obj-m += review.o\nccflags-y += -I$(src)/..\n');
put('run-guest.sh',[
  '#!/bin/sh','set -eu','mkdir -p /tmp/recipes-sharing','cp -R /review/*.c /review/*.h /review/fixtures /review/shims /review/kernel /tmp/recipes-sharing/',
  'cd /tmp/recipes-sharing','uname -r','gcc --version | head -n 1',
  "CFLAGS='-D_GNU_SOURCE -std=c11 -O1 -g -Wall -Wextra -Werror -fsanitize=address,undefined -fno-sanitize-recover=all'",
  'gcc $CFLAGS -I. -Ishims -Ifixtures fixtures/test-dma-errors.c -o test-dma-errors','./test-dma-errors',
  "echo 'PASS synthetic DMA failure/unwind contracts (not DMA execution)'",
  'gcc $CFLAGS -I. fixtures/test-transfer.c sendfile-transfer.c splice-transfer.c -o test-transfer','./test-transfer',
  "echo 'PASS Linux sendfile/splice payload, progress, EOF and error'",
  'gcc $CFLAGS -I. fixtures/test-transfer-errors.c -o test-transfer-errors','./test-transfer-errors',
  "echo 'PASS injected EINTR/EAGAIN and pipe cleanup'",
  'gcc $CFLAGS -I. fixtures/test-numa.c -lnuma -o test-numa','./test-numa',
  "echo 'PASS actual two-node page placement, affinity and policy failure cleanup'",
  'gcc $CFLAGS -I. fixtures/test-uring.c -luring -o test-uring','./test-uring',
  "echo 'PASS actual io_uring fixed-buffer read and negative/short CQE'",
  'modprobe -r vivid 2>/dev/null || true','modprobe vivid n_devs=1 multiplanar=2 node_types=1',
  'gcc $CFLAGS -I. fixtures/test-vivid.c -o test-vivid','./test-vivid',
  "echo 'PASS vivid virtual V4L2 MMAP capture and plane export/mmap/sync/release'",
  'make -C /usr/src/linux-headers-6.12.107+deb13-arm64 M="$PWD/kernel" modules',
  "echo 'PASS Linux 6.12.107 module build/modpost (not loaded)'",
  '/review/numactl --hardware','/review/numactl --cpunodebind=0 --membind=0 /bin/true',
  '/review/numactl --interleave=all /bin/true','/review/numactl --localalloc /bin/true',
  "echo 'PASS actual numactl policy command execution; no timing comparison'",
  "echo '__RECIPE_GUEST_ALL_PASS__'",''
].join('\n'));

if (process.argv.includes('--arm')) {
  for(const key of ['CMSIS_CORE_INCLUDE','CMSIS_DEVICE_INCLUDE','ARM_LIBC_INCLUDE']) assert.ok(process.env[key],key);
  const cc=process.env.ARM_CC??'arm-none-eabi-gcc';
  function run(cmd,args,negative){
    const r=spawnSync(cmd,args,{cwd:work,encoding:'utf8',timeout:60000});
    if(r.error)throw r.error;const out=(r.stdout??'')+(r.stderr??'');
    if(negative){assert.notEqual(r.status,0,out);assert.match(out,negative);}else assert.equal(r.status,0,out);
    return out;
  }
  const first=readFileSync(join(root,'part8-01-dynamic-memory.md'),'utf8');
  const config=first.match(/^enum \{ POOL_N = \d+, BLOCK_SZ = \d+ \};$/m)[0];
  put('pool-placement.c','#include <stddef.h>\n#include <stdalign.h>\n'+config+'\n'+readFileSync(join(work,'dma-pool-placement.c'),'utf8')+'\nvoid *pool_storage_address(void){return pool_buf;}\n');
  const flags=['-std=c11','-Wall','-Wextra','-Werror','-mcpu=cortex-m7','-mthumb','-ffreestanding','-O2','-isystem',process.env.ARM_LIBC_INCLUDE];
  run(cc,[...flags,'-c','pool-placement.c','-o','pool-placement.o']);
  run(cc,[...flags,'-I'+process.env.CMSIS_CORE_INCLUDE,'-I'+process.env.CMSIS_DEVICE_INCLUDE,'-c','dma-mpu-config.c','-o','dma-mpu-config.o']);
  put('mpu-encoding.c','#include "stm32h743xx.h"\n#include "mpu_armv7.h"\n#define ATTR ARM_MPU_RASR(1,ARM_MPU_AP_FULL,1,0,0,0,0,ARM_MPU_REGION_SIZE_32KB)\n_Static_assert((ATTR & MPU_RASR_TEX_Msk)==(1u<<MPU_RASR_TEX_Pos),"normal memory TEX");\n_Static_assert((ATTR & (MPU_RASR_C_Msk|MPU_RASR_B_Msk))==0,"noncacheable");\n_Static_assert((ATTR & (MPU_RASR_ENABLE_Msk|MPU_RASR_XN_Msk))==(MPU_RASR_ENABLE_Msk|MPU_RASR_XN_Msk),"enabled XN");\n');
  run(cc,[...flags,'-I'+process.env.CMSIS_CORE_INCLUDE,'-I'+process.env.CMSIS_DEVICE_INCLUDE,'-c','mpu-encoding.c','-o','mpu-encoding.o']);
  const fragment=readFileSync(join(work,'dma-region.ld'),'utf8');
  const fixture='MEMORY { FLASH (rx) : ORIGIN = 0x08000000, LENGTH = 1M }\nSECTIONS { .text : { *(.text*) *(.rodata*) } > FLASH }\n'+fragment;
  put('placement.ld',fixture);
  put('placement.link.log',run('arm-none-eabi-ld',['-T','placement.ld','-Map=placement.map','pool-placement.o','-o','placement.elf']));
  const symbols=run('arm-none-eabi-nm',['placement.elf']);put('placement.symbols.txt',symbols);
  const sym=n=>Number.parseInt(symbols.match(new RegExp('^([0-9a-f]+)\\s+\\w\\s+'+n+'$','m'))[1],16);
  assert.equal(sym('pool_buf')%32,0);assert.ok(sym('__dma_start')>=0x30000000&&sym('__dma_end')<=0x30008000);
  const sections=run('arm-none-eabi-readelf',['-SW','placement.elf']);put('placement.sections.txt',sections);assert.match(sections,/\.dma_buffer\s+NOBITS/);
  put('too-small.ld',fixture.replace('LENGTH = 32K','LENGTH = 1K'));
  put('overflow.log',run('arm-none-eabi-ld',['-T','too-small.ld','pool-placement.o','-o','overflow.elf'],/overflow|will not fit/));
  run('dtc',['-I','dts','-O','dtb','-o','dma-cma-example.dtb','dma-cma-example.dts']);
  console.log('PASS actual H743/CMSIS MPU encoding, ARM object/ELF NOLOAD alignment/overflow and dtc syntax; no board execution');
}
console.log('Prepared Linux guest fixtures in '+work+'. Run run-guest.sh inside the isolated guest; preparation is not a runtime PASS.');
