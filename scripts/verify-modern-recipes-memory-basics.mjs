// Run from repo root. These checks execute extracted article examples, not MCU timing.
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {join, resolve} from 'node:path';
import {tmpdir} from 'node:os';

for (const key of ['TLSF_SOURCE_DIR', 'FREERTOS_KERNEL_DIR', 'CMSIS_CORE_INCLUDE', 'ARM_LIBC_INCLUDE']) {
  assert.ok(process.env[key], `${key} must name the actual upstream source directory`);
}
const tlsf = resolve(process.env.TLSF_SOURCE_DIR);
const kernel = resolve(process.env.FREERTOS_KERNEL_DIR);
const cmsis = resolve(process.env.CMSIS_CORE_INCLUDE);
const armLibc = resolve(process.env.ARM_LIBC_INCLUDE);
const cc = process.env.RECIPES_CC ?? '/opt/homebrew/opt/llvm/bin/clang';
const cxx = process.env.RECIPES_CXX ?? '/opt/homebrew/opt/llvm/bin/clang++';
const armcc = process.env.ARM_CC ?? 'arm-none-eabi-gcc';
const work = mkdtempSync(join(tmpdir(), 'recipes-memory-basics-'));
const root = 'src/content/blog/embedded/modern-recipes';
const files = ['part8-01-dynamic-memory.md', 'part8-02-memory-alignment.md', 'part8-03-cache-alignment.md'];
for (const file of files) {
  for (const [, name, body] of readFileSync(join(root, file), 'utf8').matchAll(/^```[\w+]+ title="([^"]+)"\n([\s\S]*?)^```/gm)) {
    writeFileSync(join(work, name), body);
  }
}
function put(name, body) { writeFileSync(join(work, name), body); }
function run(command, args, reject) {
  const result = spawnSync(command, args, {cwd: work, encoding: 'utf8', timeout: 60000});
  if (result.error) throw result.error;
  const output = (result.stdout ?? '') + (result.stderr ?? '');
  if (reject) {
    assert.notEqual(result.status, 0, output);
    assert.match(output, reject);
  } else assert.equal(result.status, 0, output);
  return output;
}
function host(name, body, cpp = false, extra = []) {
  const source = `test-${name}.${cpp ? 'cpp' : 'c'}`;
  put(source, body);
  run(cpp ? cxx : cc, [cpp ? '-std=c++17' : '-std=c11', '-O1', '-Wall', '-Wextra', '-Werror',
    '-pedantic-errors', '-fsanitize=address,undefined', '-fno-sanitize-recover=all', ...extra, source, '-o', name]);
  const output = run(join(work, name), []);
  if (output) put(name + '.output.txt', output);
  console.log('PASS ' + name);
}
console.log('Workspace: ' + work);
console.log(run(cc, ['--version']).split('\n')[0]);
console.log(run(armcc, ['--version']).split('\n')[0]);
assert.match(readFileSync(join(kernel, 'include/task.h'), 'utf8'), /tskKERNEL_VERSION_NUMBER\s+"V11\.2\.0"/);
assert.equal(run('git', ['-C', tlsf, 'rev-parse', 'HEAD']).trim(), 'deff9ab509341f264addbd3c8ada533678591905');

// Critical-section stubs check balanced entry/exit for one caller only.
mkdirSync(join(work, 'pool-stubs'));
put('pool-stubs/FreeRTOS.h', '#pragma once\n');
put('pool-stubs/task.h', '#pragma once\nextern int critical_depth;\n#define taskENTER_CRITICAL() do { assert(critical_depth == 0); ++critical_depth; } while (0)\n#define taskEXIT_CRITICAL() do { assert(critical_depth == 1); --critical_depth; } while (0)\n');
host('pool', `#include <assert.h>
#include <string.h>
int critical_depth;
#include "byte-pool.c"
int main(void) {
  void *p[POOL_N];
  for (size_t i=0;i<POOL_N;++i) {
    p[i]=pool_alloc(); assert(p[i] && (uintptr_t)p[i]%alignof(max_align_t)==0);
    for (size_t j=0;j<i;++j) assert(p[i]!=p[j]);
    memset(p[i],(int)i,BLOCK_SZ);
  }
  assert(!pool_alloc()); unsigned char foreign;
  assert(!pool_free(NULL) && !pool_free(&foreign) && !pool_free((unsigned char*)p[0]+1));
  for (size_t i=0;i<POOL_N;++i) for(size_t j=0;j<BLOCK_SZ;++j) assert(((unsigned char*)p[i])[j]==i);
  assert(pool_free(p[0]) && !pool_free(p[0])); assert(pool_alloc()==p[0]);
  for(size_t i=0;i<POOL_N;++i) assert(pool_free(p[i]));
  assert(critical_depth==0);
}`, false, ['-I'+join(work, 'pool-stubs')]);

host('arena', `#include <assert.h>
#include <string.h>
#include "byte-arena.c"
#include "arena-storage.c"
int main(void) {
  assert(init_request_arena()); arena_t a={0};
  alignas(max_align_t) unsigned char storage[128];
  assert(!arena_init(NULL,storage,sizeof(storage)) && !arena_init(&a,NULL,128));
  assert(!arena_init(&a,storage+1,127)); assert(arena_init(&a,storage,sizeof(storage)));
  assert(!arena_alloc(&a,0) && !arena_alloc(&a,SIZE_MAX) && a.off==0);
  size_t expected=0, align=alignof(max_align_t);
  for(size_t n=1;n<=16;++n) {
    size_t rounded=(n+align-1)&~(align-1), before=a.off;
    void *p=arena_alloc(&a,n);
    if(rounded<=sizeof(storage)-expected) {
      assert(p==storage+expected && (uintptr_t)p%align==0); memset(p,0x5a,n); expected+=rounded;
    } else assert(!p && a.off==before);
    assert(a.off==expected);
  }
  arena_reset(&a); assert(a.off==0 && arena_alloc(&a,128)==storage);
  assert(!arena_alloc(&a,1) && a.off==128); arena_reset(&a); assert(arena_alloc(&a,1)==storage);
  a.off=129; assert(!arena_alloc(&a,1) && a.off==129);
  assert(arena_init(&a,storage,0) && !arena_alloc(&a,1)); arena_reset(NULL);
}`);

host('tracked', `#include <assert.h>
#include <stdbool.h>
#include <stdlib.h>
static bool force_failure;
static void *test_malloc(size_t n) { return force_failure ? NULL : malloc(n); }
#define malloc test_malloc
#include "tracked-allocation.c"
#undef malloc
int main(void) {
  assert(!tracked_malloc(0) && !tracked_malloc(SIZE_MAX)); assert(g_heap.fail==2);
  void *a=tracked_malloc(7), *b=tracked_malloc(19); assert(a && b);
  assert((uintptr_t)a%_Alignof(max_align_t)==0 && g_heap.used==26 && g_heap.peak==26);
  tracked_free(a); assert(g_heap.used==19 && g_heap.peak==26);
  force_failure=true; assert(!tracked_malloc(8) && g_heap.used==19 && g_heap.fail==3);
  tracked_free(b); tracked_free(NULL); assert(g_heap.used==0 && g_heap.peak==26);
}`);

// Keep article code strict; preserve upstream diagnostics in a separate compilation log.
put('tlsf-upstream.log', run(cc, ['-std=c11','-O1','-Wall','-Wextra',
  '-fsanitize=address,undefined','-fno-sanitize-recover=all','-I'+tlsf,
  '-c',join(tlsf,'tlsf.c'),'-o','tlsf-upstream.o']));
host('tlsf', `#include <assert.h>
#include <string.h>
#include "tlsf-storage.c"
int main(void) {
  assert(!my_malloc(1)); my_free(NULL); assert(init_allocator() && !my_malloc(0));
  void *p[128];
  for(size_t i=0;i<128;++i) { p[i]=my_malloc(i+1); assert(p[i]); assert((uintptr_t)p[i]%tlsf_align_size()==0); memset(p[i],(int)i,i+1); }
  assert(!my_malloc(128*1024));
  for(size_t i=0;i<128;++i) { for(size_t j=0;j<=i;++j) assert(((unsigned char*)p[i])[j]==i); my_free(p[i]); }
  assert(tlsf_check(allocator)==0 && tlsf_check_pool(tlsf_get_pool(allocator))==0);
  void *large=my_malloc(48*1024); assert(large); my_free(large);
  assert(tlsf_check(allocator)==0);
}`, false, ['-I'+tlsf, 'tlsf-upstream.o']);

host('decode', `#include <assert.h>
#include <string.h>
#include "sensor-decode.c"
int main(void) {
  unsigned char backing[27]={0}; unsigned char *wire=backing+1;
  const uint16_t values[8]={0,1,32767,32768,65535,123,456,60000};
  const int16_t signed_values[8]={0,1,32767,-32768,-1,123,456,-5536};
  wire[0]=0xa5; wire[1]=16; wire[3]=0x78;wire[4]=0x56;wire[5]=0x34;wire[6]=0xf2;
  for(size_t i=0;i<8;++i){wire[7+2*i]=(unsigned char)values[i];wire[8+2*i]=(unsigned char)(values[i]>>8);}
  wire[23]=0xcd;wire[24]=0xab; sensor_fields out={.timestamp=99};
  unsigned char before[sizeof(out)];memcpy(before,&out,sizeof(out));
  assert(!decode_sensor_fields(NULL,25,&out) && !decode_sensor_fields(wire,25,NULL));
  for(size_t n=0;n<25;++n) assert(!decode_sensor_fields(wire,n,&out) && memcmp(before,&out,sizeof(out))==0);
  wire[0]=0; assert(!decode_sensor_fields(wire,25,&out) && out.timestamp==99); wire[0]=0xa5;
  wire[1]=15;assert(!decode_sensor_fields(wire,25,&out) && memcmp(before,&out,sizeof(out))==0);wire[1]=16;
  assert(decode_sensor_fields(wire,25,&out) && out.timestamp==0xf2345678u && out.crc==0xabcd);
  for(size_t i=0;i<8;++i) assert(out.samples[i]==signed_values[i]);
}`);

host('alignment', `#include <assert.h>
#include <string.h>
#include "padding-layout.c"
#include "frame-layout.c"
#include "packed-access.c"
#include "explicit-alignment.c"
static unsigned calls;
void consume_aligned(void *p,size_t n) { assert((uintptr_t)p%64==0 && n==64); ++calls; }
int main(void) {
  struct packed_sample p; int v=0x12345678;
  memcpy((unsigned char*)&p+offsetof(struct packed_sample,value),&v,sizeof(v));
  assert(packed_direct(&p)==v && packed_copy(&p)==v && aligned_pointer_read(&v)==v);
  assert((uintptr_t)dma_storage()%8==0 && (uintptr_t)hot_storage()%64==0);
  assert((uintptr_t)&hot_slots[1]-(uintptr_t)&hot_slots[0]==64);
  with_local_buffer();assert(calls==1);
}`);
put('bad-packed.c', '#include "packed-access.c"\nint *bad(struct packed_sample *p) { return &p->value; }\n');
run(cc, ['-std=c11','-Werror=address-of-packed-member','-fsyntax-only','bad-packed.c'], /address of packed member/);
console.log('PASS packed member pointer misuse rejected');

host('layout-and-soa', `#include <cassert>
#include <cstdint>
#include "cache-slot.hpp"
#include "spsc-layout.hpp"
#include "particle-layout.hpp"
#include "hot-cold.hpp"
using Ring=SpscLayout<int,8>;
static_assert(offsetof(Ring,tail)-offsetof(Ring,head)>=kSpacing);
static_assert(offsetof(Ring,buf)%kSpacing==0);
int main() {
  CounterSlot slots[2];auto *heap=new CounterSlot[2];
  assert(reinterpret_cast<std::uintptr_t>(slots)%kSpacing==0 && reinterpret_cast<std::uintptr_t>(heap)%kSpacing==0);
  assert(reinterpret_cast<char*>(&slots[1])-reinterpret_cast<char*>(&slots[0])==kSpacing);delete[] heap;
  Particle aos[kParticles]{};ParticleSoa soa;
  for(std::size_t i=0;i<kParticles;++i) {
    const float n=static_cast<float>(i);aos[i]={n,-n,n+1,n-8,2,3,4};
    soa.x[i]=n;soa.y[i]=-n;soa.z[i]=n+1;soa.vx[i]=n-8;soa.vy[i]=2;soa.vz[i]=3;soa.mass[i]=4;
  }
  advance_aos(aos,0.25f);advance_soa(soa,0.25f);
  assert(aos[0].x==-2.0f && aos[8].x==8.0f && aos[127].x==156.75f);
  for(std::size_t i=0;i<kParticles;++i) {
    const float n=static_cast<float>(i);
    assert(aos[i].x==soa.x[i] && aos[i].y==soa.y[i] && aos[i].z==soa.z[i] && aos[i].vx==soa.vx[i]);
    assert(aos[i].vy==soa.vy[i] && aos[i].vz==soa.vz[i] && aos[i].mass==soa.mass[i]);
    assert(aos[i].y==-n && aos[i].z==n+1 && aos[i].vx==n-8 && aos[i].vy==2 && aos[i].vz==3 && aos[i].mass==4);
  }
}` , true);
put('bad-slot.cpp', '#include "cache-slot.hpp"\nstruct Large { char bytes[65]; }; CacheSlot<64,Large> bad;\n');
run(cxx, ['-std=c++17','-fsyntax-only','bad-slot.cpp'], /payload exceeds chosen spacing/);
console.log('PASS oversize cache-slot payload rejected');

host('counter-shards', `#include <assert.h>
#include <pthread.h>
#include "counter-shards.c"
static void *writer(void *arg) { size_t cpu=*(size_t*)arg; for(unsigned i=0;i<10000;++i) assert(counter_add(cpu,1)); return NULL; }
int main(void) {
  assert(!counter_add(COUNTER_SHARDS,1) && counter_sum()==0);
  pthread_t threads[COUNTER_SHARDS];size_t ids[COUNTER_SHARDS];
  for(size_t i=0;i<COUNTER_SHARDS;++i){ids[i]=i;assert(pthread_create(&threads[i],NULL,writer,&ids[i])==0);}
  for(size_t i=0;i<COUNTER_SHARDS;++i) assert(pthread_join(threads[i],NULL)==0);
  assert(counter_sum()==40000);
}`, false, ['-pthread']);

// Real target ABI and assembly, with actual bare-metal C library headers.
const arm = ['-std=c11','-Wall','-Wextra','-Werror','-pedantic-errors','-O2','-mthumb','-ffreestanding','-fno-unwind-tables','-fno-asynchronous-unwind-tables','-isystem',armLibc];
put('abi-probe.c', '#include "padding-layout.c"\n#include "frame-layout.c"\n_Static_assert(sizeof(void*)==4 && _Alignof(uint64_t)==8 && _Alignof(double)==8,"AAPCS32");\n');
for (const cpu of ['cortex-m0','cortex-m4']) {
  run(armcc, [...arm,'-mcpu='+cpu,'-c','abi-probe.c','-o','abi-'+cpu+'.o']);
  run(armcc, [...arm,'-mcpu='+cpu,'-S','packed-access.c','-o','packed-'+cpu+'.s']);
}
const m0 = readFileSync(join(work,'packed-cortex-m0.s'),'utf8');
assert.match(m0.match(/packed_direct:[\s\S]*?\.size\s+packed_direct/)[0], /ldrb/);
run(armcc, [...arm,'-mcpu=cortex-m4','-mno-unaligned-access','-S','packed-access.c','-o','packed-m4-strict.s']);
console.log('PASS AAPCS32 M0/M4 layout and packed assembly (not execution or cycle measurements)');

put('FreeRTOSConfig.h', `#pragma once
#define configUSE_PREEMPTION 1
#define configUSE_IDLE_HOOK 0
#define configUSE_TICK_HOOK 0
#define configCPU_CLOCK_HZ 168000000UL
#define configTICK_RATE_HZ 1000
#define configMAX_PRIORITIES 8
#define configMINIMAL_STACK_SIZE 128
#define configTOTAL_HEAP_SIZE 65536
#define configMAX_TASK_NAME_LEN 16
#define configSUPPORT_STATIC_ALLOCATION 1
#define configKERNEL_PROVIDED_STATIC_MEMORY 1
#define configSUPPORT_DYNAMIC_ALLOCATION 0
#define configUSE_TIMERS 0
#define configTICK_TYPE_WIDTH_IN_BITS TICK_TYPE_WIDTH_32_BITS
#define configMAX_SYSCALL_INTERRUPT_PRIORITY 0x50
#define configASSERT(x) do { if (!(x)) __builtin_trap(); } while(0)
`);
run(armcc, [...arm,'-mcpu=cortex-m4','-I'+work,'-I'+join(kernel,'include'),'-I'+join(kernel,'portable/GCC/ARM_CM4F'),'-c','static-queue.c','-o','static-queue.o']);
console.log('PASS static queue Cortex-M4 object with real FreeRTOS V11.2.0 headers/port (not scheduler execution)');

// Actual heap_4 algorithm with no-op scheduler/critical-section fixtures, one caller.
mkdirSync(join(work,'heap-host'));
put('heap-host/FreeRTOSConfig.h', readFileSync(join(work,'FreeRTOSConfig.h'),'utf8')
  .replace('configSUPPORT_DYNAMIC_ALLOCATION 0','configSUPPORT_DYNAMIC_ALLOCATION 1')
  .replace('TICK_TYPE_WIDTH_32_BITS','TICK_TYPE_WIDTH_64_BITS'));
host('heap4-fragmentation', `#include <assert.h>
#include "FreeRTOS.h"
#include "task.h"
void vTaskSuspendAll(void) {}
BaseType_t xTaskResumeAll(void) { return pdFALSE; }
void vPortEnterCritical(void) {}
void vPortExitCritical(void) {}
int main(void) {
  void *first=pvPortMalloc(1);assert(first);vPortFree(first);
  HeapStats_t before, fragmented, after;vPortGetHeapStats(&before);
  void *p[256];size_t n=0;
  while(n<256 && (p[n]=pvPortMalloc(512))!=NULL) ++n;
  assert(n>4 && n<256);
  for(size_t i=0;i<n;i+=2) vPortFree(p[i]);
  vPortGetHeapStats(&fragmented);
  assert(fragmented.xAvailableHeapSpaceInBytes>1024 && fragmented.xSizeOfLargestFreeBlockInBytes<1024);
  assert(pvPortMalloc(1024)==NULL);
  for(size_t i=1;i<n;i+=2) vPortFree(p[i]);
  vPortGetHeapStats(&after);
  assert(after.xAvailableHeapSpaceInBytes==before.xAvailableHeapSpaceInBytes);
  assert(after.xSizeOfLargestFreeBlockInBytes==before.xSizeOfLargestFreeBlockInBytes);
}`,false,['-I'+join(work,'heap-host'),'-I'+join(kernel,'include'),
  '-I'+join(kernel,'portable/ThirdParty/GCC/Posix'),join(kernel,'portable/MemMang/heap_4.c')]);

put('cmsis-cache.c', `#define __CM7_REV 0x0100U
#define __MPU_PRESENT 0U
#define __FPU_PRESENT 0U
#define __NVIC_PRIO_BITS 4U
#define __Vendor_SysTickConfig 0U
#define __ICACHE_PRESENT 1U
#define __DCACHE_PRESENT 1U
typedef enum { NonMaskableInt_IRQn=-14, MemoryManagement_IRQn=-12, BusFault_IRQn=-11,
UsageFault_IRQn=-10, SVCall_IRQn=-5, DebugMonitor_IRQn=-4, PendSV_IRQn=-2, SysTick_IRQn=-1, Test_IRQn=0 } IRQn_Type;
#include "core_cm7.h"
#include "dma-cache-storage.c"
_Static_assert(M7_LINE==__SCB_DCACHE_LINE_SIZE && sizeof(dma_rx)==96,"CMSIS M7 line ownership");
`);
run(armcc, [...arm,'-mcpu=cortex-m7','-I'+cmsis,'-c','cmsis-cache.c','-o','cmsis-cache.o']);
run(armcc, [...arm,'-mcpu=cortex-m4','-c','explicit-alignment.c','-o','explicit-alignment.o']);
put('link-fixture.c', '#include <stddef.h>\n#include <stdint.h>\nvolatile uintptr_t observed;\nvoid consume_aligned(void *p,size_t n){observed=(uintptr_t)p+n;}\nvoid Reset_Handler(void){for(;;)__asm__ volatile("wfi");}\n');
run(armcc, [...arm,'-mcpu=cortex-m7','-c','link-fixture.c','-o','link-fixture.o']);
put('alignment.ld', `ENTRY(Reset_Handler)
MEMORY { FLASH (rx) : ORIGIN = 0x08000000, LENGTH = 1M
RAM (rw) : ORIGIN = 0x20000000, LENGTH = 128K }
SECTIONS { .text : { *(.text*) *(.rodata*) } > FLASH
.data : { *(.data*) } > RAM AT> FLASH
.bss (NOLOAD) : { *(.bss*) *(COMMON) } > RAM }
`);
put('alignment.link.log',run('arm-none-eabi-ld',['-T','alignment.ld','-Map=alignment.map','explicit-alignment.o','cmsis-cache.o','link-fixture.o','-o','alignment.elf']));
const symbols=run('arm-none-eabi-nm',['alignment.elf']);put('alignment.symbols.txt',symbols);
for(const [name, alignment] of [['hot_slots',64],['dma_buf',8],['dma_rx',32]]) {
  const match=symbols.match(new RegExp('^([0-9a-f]+)\\s+\\w\\s+'+name+'$','m'));
  assert.ok(match,name);assert.equal(Number.parseInt(match[1],16)%alignment,0,name);
}
console.log('PASS real CMSIS M7 cache API object and final ARM ELF global alignment (no MMIO execution)');
console.log('NOT RUN: physical board, DMA/IRQ/cache execution, port exclusion, timing/WCET, exhaustive schedules or performance comparisons.');
