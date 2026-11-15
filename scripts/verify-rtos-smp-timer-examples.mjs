import assert from 'node:assert/strict';import{spawnSync}from'node:child_process';import{mkdtempSync,readFileSync,writeFileSync}from'node:fs';import{join}from'node:path';import{tmpdir}from'node:os';
const kernel=process.env.FREERTOS_KERNEL_DIR??'/private/tmp/FreeRTOS-Kernel-11.2.0';const llvm=process.env.RTOS_LLVM_BIN??'/opt/homebrew/opt/llvm/bin',cc=join(llvm,'clang');const work=mkdtempSync(join(tmpdir(),'rtos-smp-timer-'));
assert.match(readFileSync(join(kernel,'include/task.h'),'utf8'),/tskKERNEL_VERSION_NUMBER\s+"V11\.2\.0"/);
for(const name of ['07-smp-rtos','08-spinlock-smp','09-software-timer']){const s=readFileSync('src/content/blog/embedded/rtos/practical-internals/part4-'+name+'.md','utf8');for(const[,f,b]of s.matchAll(/^```[\w+]+ title="([^"]+)"\n([\s\S]*?)^```/gm))writeFileSync(join(work,f),b);}
function run(cmd,args,timeout=30000){const r=spawnSync(cmd,args,{cwd:work,encoding:'utf8',timeout});console.log(`$ ${cmd} ${args.join(' ')}\n${r.stdout??''}${r.stderr??''}status=${r.status} signal=${r.signal}`);if(r.error)throw r.error;assert.equal(r.status,0);return r.stdout??'';}
console.log('Workspace '+work);run(cc,['--version']);
run(cc,['--target=arm-none-eabi','-march=armv7-a','-c','armv7-lock.s','-o','armv7-lock.o']);
run(cc,['--target=aarch64-none-elf','-march=armv8.1-a+lse','-c','aarch64-lse.s','-o','aarch64-lse.o']);
const unsupported=spawnSync(cc,['--target=aarch64-none-elf','-march=armv8-a','-c','aarch64-lse.s','-o','unsupported.o'],{cwd:work,encoding:'utf8'});assert.notEqual(unsupported.status,0);assert.match(unsupported.stderr,/lse/);console.log('PASS LSE assembly accepted for feature target and rejected for baseline armv8-a; compile only.');
writeFileSync(join(work,'locks-test.c'),`#include <assert.h>
#include <limits.h>
#include <pthread.h>
#include <stdio.h>
#include "atomic-locks.c"
static ttas_t a;static ticket_t b;static mcs_t c;static unsigned counter;static int mode;
static void *worker(void *arg){(void)arg;mcs_node_t node;mcs_node_init(&node);for(unsigned i=0;i<10000;i++){if(mode==0)ttas_lock(&a);else if(mode==1)ticket_lock(&b);else mcs_lock(&c,&node);++counter;if(mode==0)ttas_unlock(&a);else if(mode==1)ticket_unlock(&b);else mcs_unlock(&c,&node);}return NULL;}
int main(void){ttas_init(&a);ticket_init(&b);mcs_init(&c);assert(atomic_is_lock_free(&a.held));assert(atomic_is_lock_free(&b.next));assert(atomic_is_lock_free(&c.tail));
for(mode=0;mode<3;mode++){counter=0;pthread_t t[4];for(int i=0;i<4;i++)assert(pthread_create(&t[i],NULL,worker,NULL)==0);for(int i=0;i<4;i++)assert(pthread_join(t[i],NULL)==0);assert(counter==40000);}
atomic_store(&b.next,UINT_MAX);atomic_store(&b.serving,UINT_MAX);ticket_lock(&b);ticket_unlock(&b);ticket_lock(&b);ticket_unlock(&b);assert(atomic_load(&b.next)==1&&atomic_load(&b.serving)==1);
puts("PASS extracted C11 TTAS/ticket/MCS: four native threads x10000 protected increments per lock, node reuse, ticket wrap at UINT_MAX. Host atomics lock-free. No exhaustive weak-memory/fairness proof.");}
`);
run(cc,['-std=c11','-O2','-Wall','-Wextra','-Werror','-fsanitize=address,undefined','locks-test.c','-pthread','-o','locks-test']);run(join(work,'locks-test'),[],60000);
const config=readFileSync('scripts/verify-rtos-part3-continuation-examples.mjs','utf8').match(/writeFileSync\(join\(work,'FreeRTOSConfig.h'\),`([\s\S]*?)`\);/)[1].replace('#define configUSE_TIMERS 0','#define configUSE_TIMERS 1\n#define configTIMER_TASK_PRIORITY 3\n#define configTIMER_TASK_STACK_DEPTH 2048\n#define configTIMER_QUEUE_LENGTH 2\n#define INCLUDE_xTimerPendFunctionCall 1');
writeFileSync(join(work,'FreeRTOSConfig.h'),config);
const posix=join(kernel,'portable/ThirdParty/GCC/Posix');const includes=['-I'+work,'-I'+join(kernel,'include'),'-I'+posix];
// A header-only fixture supplies the required SMP port macro names, not an SMP implementation.
writeFileSync(join(work,'smp-header-fixture.h'),`#define configNUMBER_OF_CORES 2\n#define configUSE_PASSIVE_IDLE_HOOK 0\n#define configUSE_CORE_AFFINITY 1\n#define portGET_CORE_ID() 0\n#define portYIELD_CORE(x) ((void)(x))\n#define portGET_TASK_LOCK(x) ((void)(x))\n#define portRELEASE_TASK_LOCK(x) ((void)(x))\n#define portGET_ISR_LOCK(x) ((void)(x))\n#define portRELEASE_ISR_LOCK(x) ((void)(x))\n#define portENTER_CRITICAL_FROM_ISR() 0\n#define portEXIT_CRITICAL_FROM_ISR(x) ((void)(x))\n`);
run(cc,['-std=c11','-Werror',...includes,'-include','smp-header-fixture.h','-fsyntax-only','smp-affinity.c']);console.log('PASS actual V11.2.0 affinity API signature only with explicit no-op SMP macro fixture; NOT an executable SMP port.');
run(cc,['--target=arm-none-eabi','-mcpu=cortex-m4','-mthumb','-ffreestanding','-DSCOPED_ARM','-I'+work,'-I'+join(kernel,'include'),'-I'+join(kernel,'portable/GCC/ARM_CM4F'),'-std=c11','-Werror','-c','timer-irq.c','-o','timer-irq.o']);
writeFileSync(join(work,'timer-test.c'),`#include <assert.h>
#include <stdio.h>
#include "timer-once.c"
static TimerHandle_t once;static TaskHandle_t control_handle;static unsigned acknowledgments;static int passed;
static void ack(void *p,uint32_t n){(void)p;(void)n;++acknowledgments;}
static void barrier(void *p,uint32_t n){(void)p;(void)n;xTaskNotifyGive(control_handle);}
static void control(void *p){(void)p;assert(acknowledgments==1);assert(ulTaskNotifyTake(pdTRUE,1000)==1);assert(xTimerIsTimerActive(once)==pdFALSE);vTaskDelay(5);assert(ulTaskNotifyTake(pdTRUE,0)==0);
assert(xTimerDelete(once,0)==pdPASS);assert(xTimerPendFunctionCall(barrier,NULL,0,1000)==pdPASS);assert(ulTaskNotifyTake(pdTRUE,1000)==1);
TimerHandle_t periodic=xTimerCreate("periodic",3,pdTRUE,NULL,once_callback);assert(periodic);assert(xTimerStart(periodic,0)==pdPASS);
for(unsigned i=0;i<3;i++)assert(ulTaskNotifyTake(pdTRUE,1000)>=1);
assert(xTimerStop(periodic,1000)==pdPASS);assert(xTimerPendFunctionCall(barrier,NULL,0,1000)==pdPASS);assert(ulTaskNotifyTake(pdTRUE,1000)>=1);(void)ulTaskNotifyTake(pdTRUE,0);vTaskDelay(6);assert(ulTaskNotifyTake(pdTRUE,0)==0);
assert(xTimerDelete(periodic,1000)==pdPASS);assert(xTimerPendFunctionCall(barrier,NULL,0,1000)==pdPASS);assert(ulTaskNotifyTake(pdTRUE,1000)==1);passed=1;vTaskEndScheduler();}
int main(void){assert(create_once(NULL,&once)==pdFAIL);assert(xTaskCreate(control,"control",4096,NULL,2,&control_handle)==pdPASS);assert(create_once(control_handle,&once)==pdPASS);assert(xTimerIsTimerActive(once)==pdFALSE);
assert(xTimerPendFunctionCall(ack,NULL,0,0)==pdPASS);assert(xTimerPendFunctionCall(ack,NULL,0,0)==pdFAIL);assert(create_once(control_handle,&once)==pdFAIL);
vTaskStartScheduler();assert(passed);puts("PASS actual V11.2.0 POSIX timer daemon: extracted one-shot, pre-scheduler asynchronous state and full command queue rejection, auto-reload notifications, stop/delete plus daemon barriers. No MCU timing or real ISR execution.");}
`);
run(cc,['-std=c11','-D_DARWIN_C_SOURCE',...includes,'timer-test.c',...['tasks.c','queue.c','list.c','timers.c','portable/MemMang/heap_3.c'].map(f=>join(kernel,f)),join(posix,'port.c'),join(posix,'utils/wait_for_event.c'),'-pthread','-o','timer-test']);run(join(work,'timer-test'),[],15000);
console.log('NOT RUN: real SMP scheduler/IPI/IRQ, Zephyr/ESP-IDF boards, WFE/SEV power or hardware fairness/WCET. Assembly and SMP fixture are compile-only.');
