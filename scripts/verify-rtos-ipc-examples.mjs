import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync,readFileSync,writeFileSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const kernel=process.env.FREERTOS_KERNEL_DIR??'/private/tmp/FreeRTOS-Kernel-11.2.0';
const cc=process.env.RTOS_CC??'/opt/homebrew/opt/llvm/bin/clang';
assert.ok(existsSync(join(kernel,'include/task.h')),'Set FREERTOS_KERNEL_DIR to official V11.2.0 source');
assert.match(readFileSync(join(kernel,'include/task.h'),'utf8'),/tskKERNEL_VERSION_NUMBER\s+"V11\.2\.0"/);
const work=mkdtempSync(join(tmpdir(),'rtos-ipc-'));
for(const name of ['part1-07-semaphore.md','part1-08-mutex.md','part1-09-queues.md']){
 const source=readFileSync('src/content/blog/embedded/rtos/practical-internals/'+name,'utf8');
 for(const [,file,body]of source.matchAll(/^```[\w+]+ title="([^"]+)"\n([\s\S]*?)^```/gm))writeFileSync(join(work,file),body);
}
writeFileSync(join(work,'FreeRTOSConfig.h'),`#ifndef FREERTOS_CONFIG_H
#define FREERTOS_CONFIG_H
#include <stdlib.h>
#define configUSE_PREEMPTION 1
#define configUSE_TIME_SLICING 1
#define configUSE_IDLE_HOOK 0
#define configUSE_TICK_HOOK 0
#define configCPU_CLOCK_HZ 100000000UL
#define configTICK_RATE_HZ 1000
#define configMAX_PRIORITIES 8
#define configMINIMAL_STACK_SIZE 1024
#define configTOTAL_HEAP_SIZE (128*1024)
#define configMAX_TASK_NAME_LEN 16
#define configTICK_TYPE_WIDTH_IN_BITS TICK_TYPE_WIDTH_64_BITS
#define configSUPPORT_STATIC_ALLOCATION 0
#define configSUPPORT_DYNAMIC_ALLOCATION 1
#define configUSE_TIMERS 0
#define configUSE_MUTEXES 1
#define configUSE_RECURSIVE_MUTEXES 1
#define configUSE_COUNTING_SEMAPHORES 1
#define configASSERT(x) do { if(!(x)) abort(); } while(0)
#define INCLUDE_vTaskDelay 1
#define INCLUDE_vTaskDelete 1
#define INCLUDE_vTaskSuspend 1
#define INCLUDE_uxTaskPriorityGet 1
#define INCLUDE_vTaskEndScheduler 1
#endif
`);
writeFileSync(join(work,'controller.c'),`#include <assert.h>
#include <stdio.h>
#include "FreeRTOS.h"
#include "task.h"
void check_semaphore(void);
void check_mutex(void);
void check_queue(void);
static int passed;
static void controller(void *arg) {
    (void)arg;
    check_semaphore();
    check_mutex();
    check_queue();
    vTaskDelay(2); /* observe the POSIX tick thread before scheduler shutdown */
    passed = 1;
    vTaskEndScheduler();
}
int main(void) {
    assert(xTaskCreate(controller,"control",2048,NULL,3,NULL)==pdPASS);
    vTaskStartScheduler();
    assert(passed);
    puts("PASS actual FreeRTOS V11.2.0 POSIX: binary/counting full-empty, recursive/nonrecursive, queue copy/FIFO/wraparound");
    return 0;
}
`);
function run(cmd,args,timeout=30000){const r=spawnSync(cmd,args,{cwd:work,encoding:'utf8',timeout});const out=(r.stdout??'')+(r.stderr??'');console.log(`$ ${cmd} ${args.join(' ')}\n${out}status=${r.status} signal=${r.signal}`);if(r.error)throw r.error;assert.equal(r.status,0);return out;}
console.log('Workspace: '+work);run(cc,['--version']);
const port=join(kernel,'portable/ThirdParty/GCC/Posix');
run(cc,['-std=c11','-D_DARWIN_C_SOURCE','-Wall','-Wextra','-I'+work,'-I'+join(kernel,'include'),'-I'+port,'controller.c','semaphore-check.c','mutex-check.c','queue-check.c',...['tasks.c','queue.c','list.c','portable/MemMang/heap_3.c'].map(p=>join(kernel,p)),join(port,'port.c'),join(port,'utils/wait_for_event.c'),'-pthread','-o','ipc-check']);
assert.match(run(join(work,'ipc-check'),[],10000),/PASS actual FreeRTOS/);
console.log('PASS host kernel API boundaries. Actual UART IRQ, MCU timing/WCET, multi-task PI chain/timeout, DMA and Linux cyclictest NOT RUN.');
