import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync, readFileSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

const kernel = process.env.FREERTOS_KERNEL_DIR ?? '/private/tmp/FreeRTOS-Kernel-11.2.0';
const llvm = process.env.RTOS_LLVM_BIN ?? '/opt/homebrew/opt/llvm/bin';
const cc = join(llvm, 'clang');
assert.match(readFileSync(join(kernel, 'include/task.h'), 'utf8'), /tskKERNEL_VERSION_NUMBER\s+"V11\.2\.0"/);
const work = mkdtempSync(join(tmpdir(), 'rtos-lock-sem-'));
for (const name of ['part3-01-critical-section.md', 'part3-02-semaphore-impl.md', 'part3-03-mutex-impl.md']) {
  const source = readFileSync('src/content/blog/embedded/rtos/practical-internals/' + name, 'utf8');
  for (const [, file, body] of source.matchAll(/^```[\w+]+ title="([^"]+)"\n([\s\S]*?)^```/gm)) {
    writeFileSync(join(work, file), body);
  }
}
function run(cmd, args, timeout = 30000) {
  const r = spawnSync(cmd, args, {cwd: work, encoding: 'utf8', timeout});
  console.log(`$ ${cmd} ${args.join(' ')}\n${r.stdout ?? ''}${r.stderr ?? ''}status=${r.status} signal=${r.signal}`);
  if (r.error) throw r.error;
  assert.equal(r.status, 0);
  return r.stdout ?? '';
}
console.log('Workspace: ' + work);
run(cc, ['--version']);
writeFileSync(join(work, 'policy.c'), `
#include <assert.h>
#include <stdint.h>
#include <stdio.h>
static uint32_t mask;
static uint32_t __get_PRIMASK(void){return mask;}
static void __disable_irq(void){mask=1;}
static void __set_PRIMASK(uint32_t saved){mask=saved;}
#include "irq-state.c"
int main(void){uint32_t a=irq_save(), b=irq_save(); assert(a==0&&b==1&&mask==1);
irq_restore(b);assert(mask==1);irq_restore(a);assert(mask==0);
mask=1;a=irq_save();irq_restore(a);assert(mask==1);
puts("PASS extracted PRIMASK save/restore policy with accessor fake: nested and initially masked paths; no real IRQ execution");}
`);
run(cc, ['-std=c11', '-Wall', '-Wextra', '-Werror', '-fsanitize=address,undefined', 'policy.c', '-o', 'policy']);
run(join(work, 'policy'), [], 60000);
writeFileSync(join(work, 'flag-check.c'), `
#include <assert.h>
#include <pthread.h>
#include <stdio.h>
#include "flag-lock.c"
static unsigned count;
static void *worker(void *unused){(void)unused;for(unsigned i=0;i<10000;i++){
while(!try_guard()){} ++count;release_guard();}return NULL;}
int main(void){assert(try_guard());assert(!try_guard());release_guard();
pthread_t t[4];for(unsigned i=0;i<4;i++)assert(pthread_create(&t[i],NULL,worker,NULL)==0);
for(unsigned i=0;i<4;i++)assert(pthread_join(t[i],NULL)==0);assert(count==40000);
puts("PASS extracted atomic_flag try-lock: failed second acquire and 40000 protected host-thread updates; no RTOS spinlock integration");}
`);
run(cc, ['-std=c11', '-Wall', '-Wextra', '-Werror', '-fsanitize=address,undefined', 'flag-check.c', '-pthread', '-o', 'flag-check']);
run(join(work, 'flag-check'), [], 10000);
writeFileSync(join(work, 'FreeRTOSConfig.h'), `
#ifndef FREERTOS_CONFIG_H
#define FREERTOS_CONFIG_H
#define configUSE_PREEMPTION 1
#define configUSE_TIME_SLICING 1
#define configUSE_IDLE_HOOK 0
#define configUSE_TICK_HOOK 0
#define configCPU_CLOCK_HZ 168000000UL
#define configTICK_RATE_HZ 1000
#define configMAX_PRIORITIES 8
#define configMINIMAL_STACK_SIZE 1024
#define configTOTAL_HEAP_SIZE 131072
#define configMAX_TASK_NAME_LEN 16
#define configSUPPORT_STATIC_ALLOCATION 1
#define configKERNEL_PROVIDED_STATIC_MEMORY 1
#define configSUPPORT_DYNAMIC_ALLOCATION 1
#define configUSE_TIMERS 0
#define configUSE_MUTEXES 1
#define configUSE_RECURSIVE_MUTEXES 1
#define configUSE_COUNTING_SEMAPHORES 1
#define INCLUDE_vTaskDelay 1
#define INCLUDE_vTaskDelete 1
#define INCLUDE_vTaskSuspend 1
#define INCLUDE_uxTaskPriorityGet 1
#define INCLUDE_xTaskGetCurrentTaskHandle 1
#define INCLUDE_vTaskEndScheduler 1
#ifdef SCOPED_ARM
#define configTICK_TYPE_WIDTH_IN_BITS TICK_TYPE_WIDTH_32_BITS
#define configMAX_SYSCALL_INTERRUPT_PRIORITY 0x50
#define configASSERT(x) do{if(!(x))__builtin_trap();}while(0)
#else
#include <stdio.h>
#include <stdlib.h>
#define configTICK_TYPE_WIDTH_IN_BITS TICK_TYPE_WIDTH_64_BITS
#define configASSERT(x) do{if(!(x)){fprintf(stderr,"kernel assertion: %s\\n",#x);abort();}}while(0)
#endif
#endif
`);
const arm = ['--target=arm-none-eabi', '-mcpu=cortex-m4', '-mthumb', '-mfpu=fpv4-sp-d16', '-mfloat-abi=softfp', '-ffreestanding', '-DSCOPED_ARM', '-I' + work, '-I' + join(kernel, 'include'), '-I' + join(kernel, 'portable/GCC/ARM_CM4F')];
for (const file of ['critical-update.c', 'isr-critical.c', 'semaphore-irq.c', 'static-mutex.c']) {
  run(cc, [...arm, '-std=c11', '-Wall', '-Wextra', '-Werror', '-c', file, '-o', file + '.o']);
}
writeFileSync(join(work, 'controller.c'), `
#include <assert.h>
#include <stdio.h>
#include <stdint.h>
#include <string.h>
#include "FreeRTOS.h"
#include "task.h"
#include "semphr.h"
#include "critical-update.c"
#include "semaphore-contract.c"
#include "mutex-contract.c"
#include "static-mutex.c"
static SemaphoreHandle_t done, gate, ready, progress, high_done, first, second, recursive;
static TaskHandle_t holder;
static unsigned mode, observed, after_first, after_second;
static int negative, passed;
static void create(TaskFunction_t fn,const char *name,UBaseType_t pri,void *arg){
 assert(xTaskCreate(fn,name,2048,arg,pri,NULL)==pdPASS);}
static void wait_done(void){assert(xSemaphoreTake(done,1000)==pdTRUE);}
static void counter_worker(void *arg){(void)arg;for(unsigned i=0;i<2000;i++){
 critical_update();if(i%100==0)vTaskDelay(1);}
 assert(xSemaphoreGive(done)==pdTRUE);vTaskDelete(NULL);}
static void other_recursive(void *arg){(void)arg;
 if(mode==0){assert(xSemaphoreTakeRecursive(recursive,0)==pdFALSE);assert(xSemaphoreGiveRecursive(recursive)==pdFALSE);}
 else{assert(xSemaphoreTakeRecursive(recursive,0)==pdTRUE);assert(xSemaphoreGiveRecursive(recursive)==pdTRUE);}
 assert(xSemaphoreGive(done)==pdTRUE);vTaskDelete(NULL);}
static void owner(void *arg){(void)arg;assert(xSemaphoreTake(first,0)==pdTRUE);
 if(!negative)assert(xSemaphoreTake(second,0)==pdTRUE);
 assert(xSemaphoreGive(ready)==pdTRUE);assert(xSemaphoreTake(gate,portMAX_DELAY)==pdTRUE);
 assert(xSemaphoreGive(first)==pdTRUE);after_first=uxTaskPriorityGet(NULL);
 assert(xSemaphoreGive(progress)==pdTRUE);assert(xSemaphoreTake(gate,portMAX_DELAY)==pdTRUE);
 assert(xSemaphoreGive(second)==pdTRUE);after_second=uxTaskPriorityGet(NULL);
 assert(xSemaphoreGive(done)==pdTRUE);vTaskDelete(NULL);}
static void high_waiter(void *arg){(void)arg;assert(xSemaphoreTake(first,1000)==pdTRUE);
 assert(xSemaphoreGive(first)==pdTRUE);assert(xSemaphoreGive(high_done)==pdTRUE);vTaskDelete(NULL);}
static void token_waiter(void *arg){unsigned id=(unsigned)(uintptr_t)arg;
 assert(xSemaphoreTake(ready,portMAX_DELAY)==pdTRUE);observed=observed*10+id;
 assert(xSemaphoreGive(done)==pdTRUE);vTaskDelete(NULL);}
static void controller(void *arg){(void)arg;
 done=xSemaphoreCreateCounting(2,0);assert(done);gate=xSemaphoreCreateBinary();assert(gate);
 ready=xSemaphoreCreateBinary();assert(ready);progress=xSemaphoreCreateBinary();assert(progress);
 high_done=xSemaphoreCreateBinary();assert(high_done);first=xSemaphoreCreateMutex();assert(first);
 second=xSemaphoreCreateMutex();assert(second);
 if(negative){create(owner,"bad-owner",3,NULL);assert(xSemaphoreTake(ready,1000)==pdTRUE);
   (void)xSemaphoreGive(first);assert(!"non-owner regular give must trigger kernel assertion");}
 check_semaphore_contract();check_mutex_contract();
 SemaphoreHandle_t stat=make_static_mutex();assert(stat);assert(xSemaphoreTake(stat,0)==pdTRUE);
 assert(xSemaphoreGive(stat)==pdTRUE);vSemaphoreDelete(stat);
 create(counter_worker,"counter-a",3,NULL);create(counter_worker,"counter-b",4,NULL);
 wait_done();wait_done();struct CriticalTotals t=critical_snapshot();assert(t.calls==4000&&t.items==4000);
 puts("PASS actual POSIX kernel: extracted nested critical updates, snapshot consistency and static mutex");
 create(token_waiter,"wait-high",4,(void *)(uintptr_t)1);
 create(token_waiter,"wait-low",3,(void *)(uintptr_t)2);
 assert(xSemaphoreGive(ready)==pdTRUE);wait_done();assert(observed==1);
 assert(xSemaphoreGive(ready)==pdTRUE);wait_done();assert(observed==12);
 puts("PASS actual POSIX kernel: blocked higher-priority semaphore waiter acquires first under specified priorities");
 recursive=xSemaphoreCreateRecursiveMutex();assert(recursive);
 assert(xSemaphoreTakeRecursive(recursive,0)==pdTRUE);assert(xSemaphoreTakeRecursive(recursive,0)==pdTRUE);
 mode=0;create(other_recursive,"other-r1",3,NULL);wait_done();
 assert(xSemaphoreGiveRecursive(recursive)==pdTRUE);
 create(other_recursive,"other-r2",3,NULL);wait_done();
 assert(xSemaphoreGiveRecursive(recursive)==pdTRUE);
 mode=1;create(other_recursive,"other-r3",3,NULL);wait_done();vSemaphoreDelete(recursive);
 puts("PASS actual POSIX kernel: recursive non-owner take/give rejection, first give retains lock and final give releases");
 assert(xTaskCreate(owner,"holder",2048,NULL,1,&holder)==pdPASS);
 assert(xSemaphoreTake(ready,1000)==pdTRUE);create(high_waiter,"high",4,NULL);
 assert(uxTaskPriorityGet(holder)==4);assert(xSemaphoreGive(gate)==pdTRUE);
 assert(xSemaphoreTake(progress,1000)==pdTRUE);assert(xSemaphoreTake(high_done,1000)==pdTRUE);
 assert(after_first==4&&uxTaskPriorityGet(holder)==4);assert(xSemaphoreGive(gate)==pdTRUE);wait_done();
 assert(after_second==1);
 puts("PASS actual POSIX kernel: PI holder 1->4; release contended mutex while holding second retains 4; final release restores 1");
 vTaskDelay(2);passed=1;vTaskEndScheduler();}
int main(int argc,char **argv){negative=argc==2&&strcmp(argv[1],"bad-give")==0;
 create(controller,"control",2,NULL);vTaskStartScheduler();assert(passed);
 puts("PASS extracted semaphore binary/counting saturation/three-tick timeout and ordinary/recursive mutex contracts");}
`);
const posix = join(kernel, 'portable/ThirdParty/GCC/Posix');
// Clang 23 diagnoses two set-only globals in the unchanged upstream kernel/port.
// Keep those diagnostics visible while retaining all other warnings as errors.
run(cc, ['-std=c11', '-D_DARWIN_C_SOURCE', '-Wall', '-Wextra', '-Werror', '-Wno-error=unused-but-set-global', '-I' + work, '-I' + join(kernel, 'include'), '-I' + posix, 'controller.c', ...['tasks.c', 'queue.c', 'list.c', 'portable/MemMang/heap_3.c'].map(p => join(kernel, p)), join(posix, 'port.c'), join(posix, 'utils/wait_for_event.c'), '-pthread', '-o', 'contract']);
run(join(work, 'contract'), [], 15000);
const bad = spawnSync(join(work, 'contract'), ['bad-give'], {cwd: work, encoding: 'utf8', timeout: 10000});
if (bad.error) throw bad.error;
assert.equal(bad.signal, 'SIGABRT', 'ordinary non-owner misuse reaches kernel assertion');
assert.match(bad.stderr, /kernel assertion:.*pxTCB == pxCurrentTCB/);
console.log('PASS expected negative subprocess: ordinary non-owner give aborts at actual kernel holder/current-task assertion');
console.log('NOT RUN: Cortex-M mask/IRQ execution, SMP RTOS spinlock, exhaustive interleavings, timer/latency or PI chain/timeout measurements. ARM results are object compilation only.');
