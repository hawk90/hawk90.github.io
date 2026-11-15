import assert from 'node:assert/strict';import{spawnSync}from'node:child_process';import{mkdtempSync,readFileSync,writeFileSync}from'node:fs';import{join}from'node:path';import{tmpdir}from'node:os';import{pathToFileURL}from'node:url';
const kernel=process.env.FREERTOS_KERNEL_DIR??'/private/tmp/FreeRTOS-Kernel-11.2.0';const tlsf=process.env.TLSF_SOURCE_DIR??'/private/tmp/tlsf-article-validation-2026-10-23';const llvm=process.env.RTOS_LLVM_BIN??'/opt/homebrew/opt/llvm/bin',cc=join(llvm,'clang');
assert.match(readFileSync(join(kernel,'include/task.h'),'utf8'),/tskKERNEL_VERSION_NUMBER\s+"V11\.2\.0"/);
const work=mkdtempSync(join(tmpdir(),'rtos-memory-'));
for(const name of ['01-realtime-memory','02-freertos-heap','03-tlsf','04-static-allocation','05-memory-pool','06-stack-overflow']){
 const src=readFileSync('src/content/blog/embedded/rtos/practical-internals/part4-'+name+'.md','utf8');
 for(const[,file,body]of src.matchAll(/^```[\w+]+ title="([^"]+)"\n([\s\S]*?)^```/gm))writeFileSync(join(work,file),body);
}
function run(cmd,args,timeout=30000){const r=spawnSync(cmd,args,{cwd:work,encoding:'utf8',timeout});console.log(`$ ${cmd} ${args.join(' ')}\n${r.stdout??''}${r.stderr??''}status=${r.status} signal=${r.signal}`);if(r.error)throw r.error;assert.equal(r.status,0);return r.stdout??'';}
console.log('Workspace: '+work);run(cc,['--version']);assert.equal(run('git',['-C',tlsf,'rev-parse','HEAD']).trim(),'deff9ab509341f264addbd3c8ada533678591905');
const{subdivision}=await import(pathToFileURL(join(work,'tlsf-subdivision.mjs')));
assert.deepEqual(subdivision(6,0),{start:64n,end:68n});assert.deepEqual(subdivision(6,15),{start:124n,end:128n});assert.deepEqual(subdivision(6,31,5),{start:126n,end:128n});
for(const args of [[3,0,4],[6,16,4],[-1,0,4],[6,0,6],[NaN,0,4]])assert.throws(()=>subdivision(...args),RangeError);
console.log('PASS extracted subdivision math: 16/32 subdivisions and invalid inputs; this is not actual TLSF mapping.');
writeFileSync(join(work,'pool-test.c'),`#include <assert.h>
#include <stdio.h>
#include <string.h>
#include "checked-pool.c"
int main(void){pool_init();void *p[POOL_COUNT];for(unsigned i=0;i<POOL_COUNT;i++){p[i]=pool_alloc();assert(p[i]);assert((uintptr_t)p[i]%_Alignof(max_align_t)==0);memset(p[i],i,64);for(unsigned j=0;j<i;j++)assert(p[i]!=p[j]);}
assert(pool_alloc()==NULL);assert(!pool_free(NULL));int foreign;assert(!pool_free(&foreign));assert(!pool_free((unsigned char*)p[0]+1));
assert(pool_free(p[0]));assert(!pool_free(p[0]));assert(pool_alloc()==p[0]);for(unsigned i=0;i<POOL_COUNT;i++)assert(pool_free(p[i]));
puts("PASS extracted pool: 32 unique aligned blocks, exhaustion, reuse, null/foreign/interior/double-free rejection; single-caller only");}
`);
run(cc,['-std=c11','-Wall','-Wextra','-Werror','-fsanitize=address,undefined','pool-test.c','-o','pool-test']);run(join(work,'pool-test'),[],60000);
writeFileSync(join(work,'tlsf-test.c'),`#include <assert.h>
#include <stdint.h>
#include <stdio.h>
#include <string.h>
#include "tlsf-usage.c"
int main(void){assert(memory_alloc(1)==NULL);assert(memory_init());assert(memory_init());assert(memory_alloc(0)==NULL);
void *p[128];for(unsigned i=0;i<128;i++){p[i]=memory_alloc(i+1);assert(p[i]);assert((uintptr_t)p[i]%tlsf_align_size()==0);memset(p[i],i,i+1);}
assert(memory_alloc(1024*1024)==NULL);for(unsigned i=0;i<128;i++)memory_free(p[i]);assert(tlsf_check(allocator)==0);assert(tlsf_check_pool(tlsf_get_pool(allocator))==0);
unsigned char *r=memory_alloc(32);assert(r);memset(r,0x4a,32);r=tlsf_realloc(allocator,r,128);assert(r);for(unsigned i=0;i<32;i++)assert(r[i]==0x4a);memory_free(r);
void *large=memory_alloc(48*1024);assert(large);memory_free(large);memory_free(NULL);assert(tlsf_check(allocator)==0);
puts("PASS extracted TLSF usage plus pinned actual allocator: initialization, zero/small/oversize, alignment, varied sizes, coalesce reuse, realloc preservation and integrity checks");}
`);
run(cc,['-std=c11','-Wall','-Wextra','-fsanitize=address,undefined','-I'+tlsf,'tlsf-test.c',join(tlsf,'tlsf.c'),'-o','tlsf-test']);run(join(work,'tlsf-test'),[],60000);
const config=readFileSync('scripts/verify-rtos-part3-continuation-examples.mjs','utf8').match(/writeFileSync\(join\(work,'FreeRTOSConfig.h'\),`([\s\S]*?)`\);/)[1].replace('#define configTOTAL_HEAP_SIZE 131072','#define configTOTAL_HEAP_SIZE (64*1024)');
writeFileSync(join(work,'FreeRTOSConfig.h'),config);
const includes=['-I'+work,'-I'+join(kernel,'include'),'-I'+join(kernel,'portable/ThirdParty/GCC/Posix')];
writeFileSync(join(work,'heap-stubs.c'),`#include "FreeRTOS.h"\n#include "task.h"\nvoid vTaskSuspendAll(void){}\nBaseType_t xTaskResumeAll(void){return pdFALSE;}\nvoid vPortEnterCritical(void){}\nvoid vPortExitCritical(void){}\n`);
writeFileSync(join(work,'heap-test.c'),`#include <assert.h>
#include <stdio.h>
#include <stdint.h>
#include <string.h>
#include "FreeRTOS.h"
#include "portable.h"
#if HEAP_KIND==2 || HEAP_KIND==4
#include "heap-coalesce-check.c"
#endif
_Alignas(64) static unsigned char regions[8192];
int main(int argc,char **argv){(void)argv;
#if HEAP_KIND==5
HeapRegion_t r[]={{regions,2048},{regions+4096,2048},{NULL,0}};vPortDefineHeapRegions(r);assert(pvPortMalloc(3000)==NULL);
#endif
void *p=pvPortMalloc(32);assert(p);assert((uintptr_t)p%portBYTE_ALIGNMENT==0);memset(p,42,32);
#if HEAP_KIND==1
if(argc==2){vPortFree(p);return 2;}vPortFree(NULL);
#else
(void)argc;vPortFree(p);vPortFree(NULL);
#endif
#if HEAP_KIND!=3
assert(pvPortMalloc(SIZE_MAX)==NULL);
#endif
#if HEAP_KIND==2 || HEAP_KIND==4
check_heap_coalescing(HEAP_KIND==4);
#endif
#if HEAP_KIND==5
HeapStats_t stats;vPortGetHeapStats(&stats);assert(stats.xNumberOfFreeBlocks==3); /* V11.2.0 counts the intermediate zero-size region marker. */ assert(stats.xSizeOfLargestFreeBlockInBytes<3000);
#endif
printf("PASS actual heap_%d: allocation/alignment and scoped failure/coalescing/region behavior with no-op scheduler stubs only\\n",HEAP_KIND);}
`);
for(let i=1;i<=5;i++){
 run(cc,['-std=c11','-D_DARWIN_C_SOURCE',...includes,'-DHEAP_KIND='+i,'heap-test.c','heap-stubs.c',join(kernel,'portable/MemMang/heap_'+i+'.c'),'-o','heap'+i]);run(join(work,'heap'+i),[],10000);
 if(i===1){const bad=spawnSync(join(work,'heap1'),['bad-free'],{cwd:work,encoding:'utf8',timeout:10000});if(bad.error)throw bad.error;assert.equal(bad.signal,'SIGABRT');console.log('PASS expected negative: actual heap_1 non-NULL free triggers configured assertion.');}
}
// Exercise the actual downward-stack macro with a minimal TCB-shaped fixture.
writeFileSync(join(work,'stack-macro-test.c'),`#include <assert.h>
#include <stdint.h>
#include <stdio.h>
#define configCHECK_FOR_STACK_OVERFLOW 2
#define portSTACK_GROWTH -1
#define portUSING_MPU_WRAPPERS 0
typedef void *TaskHandle_t;struct Fixture{uint32_t *pxTopOfStack,*pxStack;char *pcTaskName;};static struct Fixture fixture,*pxCurrentTCB=&fixture;static unsigned caught;
void vApplicationStackOverflowHook(TaskHandle_t task,char *name){(void)task;(void)name;++caught;}
#include "stack_macros.h"
int main(void){uint32_t data[32];for(unsigned i=0;i<32;i++)data[i]=0xa5a5a5a5;fixture.pxStack=data;fixture.pxTopOfStack=data+24;fixture.pcTaskName="fixture";
taskCHECK_FOR_STACK_OVERFLOW();assert(caught==0);((unsigned char*)data)[0]^=1;taskCHECK_FOR_STACK_OVERFLOW();assert(caught==1);
data[0]=0xa5a5a5a5;fixture.pxTopOfStack=data;taskCHECK_FOR_STACK_OVERFLOW();assert(caught==2);
fixture.pxTopOfStack=data+24;data[8]=0;taskCHECK_FOR_STACK_OVERFLOW();assert(caught==2);
puts("PASS actual non-MPU downward Method2 macro: intact, one-byte pattern corruption and SP boundary; write beyond checked sentinel with restored SP not detected");}
`);
run(cc,['-std=c11','-Wall','-Wextra','-Werror','-I'+join(kernel,'include'),'stack-macro-test.c','-o','stack-macro-test']);run(join(work,'stack-macro-test'),[]);
const arm=['--target=arm-none-eabi','-mcpu=cortex-m4','-mthumb','-mfpu=fpv4-sp-d16','-mfloat-abi=softfp','-ffreestanding','-DSCOPED_ARM','-I'+work,'-I'+join(kernel,'include'),'-I'+join(kernel,'portable/GCC/ARM_CM4F')];
for(const file of ['static-task-storage.c','static-ipc.c','overflow-hook.c'])run(cc,[...arm,'-std=c11','-Werror','-c',file,'-o',file+'.o']);
run(cc,[...arm,'-O1','-fstack-protector-strong','-c','protected-frame.c','-o','protected-frame.o']);assert.match(run(join(llvm,'llvm-nm'),['protected-frame.o']),/__stack_chk_fail/);
// Static-only kernel build. The POSIX emulation port itself may use host malloc.
writeFileSync(join(work,'FreeRTOSConfig.h'),config.replace('#define configSUPPORT_DYNAMIC_ALLOCATION 1','#define configSUPPORT_DYNAMIC_ALLOCATION 0'));
writeFileSync(join(work,'static-controller.c'),`#include <assert.h>
#include <stdio.h>
#include "FreeRTOS.h"
#include "task.h"
#include "static-ipc.c"
static StaticTask_t control_tcb;static StackType_t control_stack[2048];static int passed;
static void control(void *arg){(void)arg;assert(create_static_ipc());uint32_t in=42,out=0;assert(xQueueSend(static_queue,&in,0)==pdTRUE);assert(xQueueReceive(static_queue,&out,0)==pdTRUE&&out==42);assert(xSemaphoreTake(static_mutex,0)==pdTRUE);assert(xSemaphoreGive(static_mutex)==pdTRUE);assert(xEventGroupSetBits(static_events,1)==1);vTaskDelay(2);passed=1;vTaskEndScheduler();}
int main(void){assert(xTaskCreateStatic(control,"control",2048,NULL,2,control_stack,&control_tcb));vTaskStartScheduler();assert(passed);puts("PASS actual FreeRTOS static-only API kernel: static task, queue copy, mutex and event; no MemMang implementation linked. POSIX native allocations not excluded.");}
`);
const posix=join(kernel,'portable/ThirdParty/GCC/Posix');run(cc,['-std=c11','-D_DARWIN_C_SOURCE',...includes,'static-controller.c',...['tasks.c','queue.c','list.c','event_groups.c'].map(p=>join(kernel,p)),join(posix,'port.c'),join(posix,'utils/wait_for_event.c'),'-pthread','-o','static-controller']);run(join(work,'static-controller'),[],15000);
console.log('NOT RUN: allocator concurrent scheduler/ISR/SMP exclusion, physical stack/MPU/probe faults, target timing/WCET, certification or complete application heap absence.');
