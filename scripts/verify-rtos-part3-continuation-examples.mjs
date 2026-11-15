import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync,readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {pathToFileURL} from 'node:url';
const kernel=process.env.FREERTOS_KERNEL_DIR??'/private/tmp/FreeRTOS-Kernel-11.2.0';
const llvm=process.env.RTOS_LLVM_BIN??'/opt/homebrew/opt/llvm/bin',cc=join(llvm,'clang');
assert.match(readFileSync(join(kernel,'include/task.h'),'utf8'),/tskKERNEL_VERSION_NUMBER\s+"V11\.2\.0"/);
const work=mkdtempSync(join(tmpdir(),'rtos-p3-continuation-'));
for(const name of ['04-priority-inversion','05-priority-inheritance','06-priority-ceiling','07-queue-impl','08-event-group','09-isr-safe-api','10-deadlock','11-stream-message-buffer']){
 const source=readFileSync('src/content/blog/embedded/rtos/practical-internals/part3-'+name+'.md','utf8');
 for(const[,file,body]of source.matchAll(/^```[\w+]+ title="([^"]+)"\n([\s\S]*?)^```/gm))writeFileSync(join(work,file),body);
}
function run(cmd,args,timeout=30000){const r=spawnSync(cmd,args,{cwd:work,encoding:'utf8',timeout});console.log(`$ ${cmd} ${args.join(' ')}\n${r.stdout??''}${r.stderr??''}status=${r.status} signal=${r.signal}`);if(r.error)throw r.error;assert.equal(r.status,0);return r.stdout??'';}
console.log('Workspace: '+work);run(cc,['--version']);
const {canPassSystemCeiling:admit}=await import(pathToFileURL(join(work,'pcp-admission.mjs')));
assert.equal(admit(0,'a',[]),true);const held=[{owner:'b',ceiling:5},{owner:'a',ceiling:7}];
assert.equal(admit(5,'a',held),false);assert.equal(admit(6,'a',held),true);assert.equal(admit(7,'b',held),false);assert.equal(admit(8,'b',held),true);
for(const n of [-1,1.2,NaN,Infinity])assert.throws(()=>admit(n,'a',[]),RangeError);
assert.throws(()=>admit(2,'a',[{owner:'b',ceiling:-1}]),RangeError);
console.log('PASS source PCP admission model: strict ceiling, exclude own resources, invalid numeric inputs. Not a complete protocol/scheduler proof.');
writeFileSync(join(work,'frame-test.c'),`#include <assert.h>
#include <stdio.h>
#include "command-header.c"
int main(void){uint16_t id=0;size_t n=0;uint8_t good[]={0x12,0x34,0,2,7,8};
assert(command_header(good,6,&id,&n)&&id==0x1234&&n==2);
assert(!command_header(good,3,&id,&n));assert(!command_header(good,5,&id,&n));
assert(!command_header(NULL,6,&id,&n));assert(!command_header(good,6,NULL,&n));assert(!command_header(good,6,&id,NULL));
uint8_t empty[]={0,1,0,0};assert(command_header(empty,4,&id,&n)&&id==1&&n==0);
uint8_t large[]={0,1,255,255};assert(!command_header(large,4,&id,&n));
puts("PASS source frame parser: endian fields, empty payload, short/length-mismatch/null/oversize rejection");}
`);
run(cc,['-std=c11','-Wall','-Wextra','-Werror','-fsanitize=address,undefined','frame-test.c','-o','frame-test']);run(join(work,'frame-test'),[],60000);
writeFileSync(join(work,'FreeRTOSConfig.h'),`#ifndef FREERTOS_CONFIG_H
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
#define configUSE_COUNTING_SEMAPHORES 1
#define configUSE_TASK_NOTIFICATIONS 1
#define INCLUDE_vTaskDelay 1
#define INCLUDE_vTaskDelete 1
#define INCLUDE_vTaskSuspend 1
#define INCLUDE_vTaskEndScheduler 1
#ifdef SCOPED_ARM
#ifndef TEST_TICK_WIDTH
#define TEST_TICK_WIDTH TICK_TYPE_WIDTH_32_BITS
#endif
#define configTICK_TYPE_WIDTH_IN_BITS TEST_TICK_WIDTH
#define configMAX_SYSCALL_INTERRUPT_PRIORITY 0x50
#define configASSERT(x) do{if(!(x))__builtin_trap();}while(0)
#else
#include <stdlib.h>
#define configTICK_TYPE_WIDTH_IN_BITS TICK_TYPE_WIDTH_64_BITS
#define configASSERT(x) do{if(!(x))abort();}while(0)
#endif
#endif
`);
const arm=['--target=arm-none-eabi','-mcpu=cortex-m4','-mthumb','-mfpu=fpv4-sp-d16','-mfloat-abi=softfp','-ffreestanding','-DSCOPED_ARM','-I'+work,'-I'+join(kernel,'include'),'-I'+join(kernel,'portable/GCC/ARM_CM4F')];
run(cc,[...arm,'-std=c11','-Werror','-c','deferred-queue-irq.c','-o','deferred-queue-irq.o']);
for(const [width,bits]of [[16,8],[32,24],[64,56]]){
 writeFileSync(join(work,'event-width.c'),`#include "FreeRTOS.h"\n#include "event_groups.h"\n_Static_assert(sizeof(EventBits_t)*8==${width},"event width");\n_Static_assert((EventBits_t)~eventEVENT_BITS_CONTROL_BYTES==(((EventBits_t)1<<${bits})-1),"user bits");\n`);
 run(cc,[...arm,'-DTEST_TICK_WIDTH=TICK_TYPE_WIDTH_'+width+'_BITS','-std=c11','-Werror','-fsyntax-only','event-width.c']);
}
writeFileSync(join(work,'controller.c'),`#include <assert.h>
#include <stdio.h>
#include "FreeRTOS.h"
#include "task.h"
#include "semphr.h"
#include "queue-contract.c"
#include "event-contract.c"
#include "buffer-contract.c"
#include "take-pair.c"
static int passed;static EventGroupHandle_t events;static SemaphoreHandle_t done;
static void waiter(void *arg){(void)arg;EventBits_t bits=xEventGroupWaitBits(events,1,pdTRUE,pdTRUE,1000);assert(bits&1);assert(xSemaphoreGive(done)==pdTRUE);vTaskDelete(NULL);}
static void controller(void *arg){(void)arg;check_queue_contract();check_event_contract();check_buffer_contract();
SemaphoreHandle_t a=xSemaphoreCreateMutex(),b=xSemaphoreCreateMutex();assert(a&&b);
assert(!take_pair(NULL,b,0));assert(!take_pair(a,a,0));assert(xSemaphoreTake(b,0)==pdTRUE);
assert(!take_pair(a,b,0));assert(xSemaphoreTake(a,0)==pdTRUE);assert(xSemaphoreGive(a)==pdTRUE);assert(xSemaphoreGive(b)==pdTRUE);
assert(take_pair(a,b,0));assert(xSemaphoreGive(b)==pdTRUE);assert(xSemaphoreGive(a)==pdTRUE);vSemaphoreDelete(a);vSemaphoreDelete(b);
events=xEventGroupCreate();done=xSemaphoreCreateCounting(2,0);assert(events&&done);
assert(xTaskCreate(waiter,"w1",2048,NULL,4,NULL)==pdPASS);assert(xTaskCreate(waiter,"w2",2048,NULL,3,NULL)==pdPASS);
(void)xEventGroupSetBits(events,1);assert(xSemaphoreTake(done,1000)==pdTRUE);assert(xSemaphoreTake(done,1000)==pdTRUE);assert(xEventGroupGetBits(events)==0);
vEventGroupDelete(events);vSemaphoreDelete(done);vTaskDelay(2);passed=1;vTaskEndScheduler();}
int main(void){assert(xTaskCreate(controller,"control",4096,NULL,2,NULL)==pdPASS);vTaskStartScheduler();assert(passed);puts("PASS actual V11.2.0 POSIX kernel: queue FIFO/copy/front/wrap/full/empty overwrite count, event OR/AND/clear/timeout and two-waiter broadcast, stream wrap and message retention/oversize, pair rollback/success");}
`);
const posix=join(kernel,'portable/ThirdParty/GCC/Posix');
run(cc,['-std=c11','-D_DARWIN_C_SOURCE','-Wall','-Wextra','-Werror','-Wno-error=unused-but-set-global','-I'+work,'-I'+join(kernel,'include'),'-I'+posix,'controller.c',...['tasks.c','queue.c','list.c','event_groups.c','stream_buffer.c','portable/MemMang/heap_3.c'].map(p=>join(kernel,p)),join(posix,'port.c'),join(posix,'utils/wait_for_event.c'),'-pthread','-o','ipc-test']);run(join(work,'ipc-test'),[],15000);
console.log('NOT RUN: MCU IRQ/DMA, target memory ordering/WCET/throughput, timer-daemon ISR queue saturation, exhaustive PCP proof or PI chain/timeout runtime.');
