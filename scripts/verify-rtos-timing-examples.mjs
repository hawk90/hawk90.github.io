import assert from 'node:assert/strict';import {spawnSync} from 'node:child_process';import {mkdtempSync,readFileSync,writeFileSync} from 'node:fs';import {join} from 'node:path';import {tmpdir} from 'node:os';import {pathToFileURL} from 'node:url';
const kernel=process.env.FREERTOS_KERNEL_DIR??'/private/tmp/FreeRTOS-Kernel-11.2.0',llvm=process.env.RTOS_LLVM_BIN??'/opt/homebrew/opt/llvm/bin',cc=join(llvm,'clang');
assert.match(readFileSync(join(kernel,'include/task.h'),'utf8'),/tskKERNEL_VERSION_NUMBER\s+"V11\.2\.0"/);
const work=mkdtempSync(join(tmpdir(),'rtos-timing-'));
for(const name of ['part2-08-tick-timer.md','part2-09-tickless.md','part2-10-scheduler-latency.md','part2-11-tracing-observability.md']){const src=readFileSync('src/content/blog/embedded/rtos/practical-internals/'+name,'utf8');for(const [,file,body]of src.matchAll(/^```[\w+]+ title="([^"]+)"\n([\s\S]*?)^```/gm))writeFileSync(join(work,file),body);}
function run(cmd,args,timeout=30000){const r=spawnSync(cmd,args,{cwd:work,encoding:'utf8',timeout});console.log(`$ ${cmd} ${args.join(' ')}\n${r.stdout??''}${r.stderr??''}status=${r.status} signal=${r.signal}`);if(r.error)throw r.error;assert.equal(r.status,0);return r.stdout??'';}
console.log('Workspace: '+work);run(cc,['--version']);
writeFileSync(join(work,'math-check.c'),`#include <assert.h>
#include <stdio.h>
#include "systick-period.c"
#include "cycle-delta.c"
#include "latency-histogram.c"
int main(void){uint32_t reload=999;uint64_t ns;
assert(systick_reload(168000000,1000,&reload)&&reload==167999);
assert(systick_reload(16777216,1,&reload)&&reload==0xffffff);
assert(systick_reload(1,1,&reload)&&reload==0);
assert(!systick_reload(16777217,1,&reload));
assert(!systick_reload(1000,0,&reload));assert(!systick_reload(999,1000,&reload));
assert(!systick_reload(1001,1000,&reload));assert(!systick_reload(1000,1000,0));
assert(cycle_delta_ns(0xfffffff0u,0x10u,1000000,&ns)&&ns==32000);
assert(cycle_delta_ns(0,168,168000000,&ns)&&ns==1000);
assert(!cycle_delta_ns(0,168,0,&ns));assert(!cycle_delta_ns(0,168,168000000,0));
struct LatencyHistogram h={0};
assert(record_latency(&h,0,1000000));assert(record_latency(&h,98,1000000));
assert(record_latency(&h,99,1000000));assert(record_latency(&h,10000,1000000));
assert(record_latency(&h,UINT32_MAX,1000000));
assert(h.samples==5&&h.buckets[0]==1&&h.buckets[98]==1&&h.buckets[99]==3&&h.max_cycles==UINT32_MAX);
assert(!record_latency(&h,100,0));assert(h.samples==5);
h.samples=UINT64_MAX;assert(!record_latency(&h,100,1000000));
puts("PASS source C math: SysTick min/max/overflow/noninteger/zero, counter wrap, histogram tail and saturation boundaries");}
`);
run(cc,['-std=c11','-Wall','-Wextra','-Werror','-fsanitize=address,undefined','-fno-sanitize-recover=all','math-check.c','-o','math-check']);run(join(work,'math-check'),[]);
const {idleEnergy}=await import(pathToFileURL(join(work,'idle-energy.mjs')));
const energy=idleEnergy(10000,1,3,1000);assert.ok(Math.abs(energy.averageUa-30.997)<1e-12);assert.ok(Math.abs(energy.annualMah-271.53372)<1e-8);for(const args of [[1,1,2,1],[1,1,0,0],[NaN,1,1,2],[-1,1,1,2]])assert.throws(()=>idleEnergy(...args),RangeError);assert.equal(Math.floor(0xffffff/168000),99);console.log('PASS source JS energy: 30.997 uA, 271.53372 mAh/year under declared assumptions; invalid inputs rejected; SysTick suppression limit 99 ticks for 168MHz/1kHz.');
run('/bin/sh',['-n','scheduler-events.sh']);
// CMSIS-shaped MMIO fake checks only conditional C logic. No claim of real ITM readiness/write semantics.
writeFileSync(join(work,'itm-policy-check.c'),`#include <assert.h>
#include <stdio.h>
#include <stdint.h>
typedef union {volatile uint32_t u32;volatile uint8_t u8;} Stimulus;
static struct {Stimulus PORT[32]; volatile uint32_t TCR,TER;} fake;
#define ITM (&fake)
#define ITM_TCR_ITMENA_Msk 1u
#include "itm-try-putc.c"
int main(void){assert(!itm_try_putc(65));fake.TCR=1;assert(!itm_try_putc(65));fake.TER=1;assert(!itm_try_putc(65));fake.PORT[0].u32=1;assert(itm_try_putc(65)&&fake.PORT[0].u8==65);fake.TER=2;assert(!itm_try_putc(66));puts("PASS source ITM conditional policy with MMIO fake only: disabled/channel-off/busy return; ready writes byte without polling");}
`);
run(cc,['-std=c11','-Wall','-Wextra','-Werror','-fsanitize=address,undefined','itm-policy-check.c','-o','itm-policy']);run(join(work,'itm-policy'),[]);
const config=`#ifndef FREERTOS_CONFIG_H
#define FREERTOS_CONFIG_H
#define configUSE_PREEMPTION 1
#define configUSE_IDLE_HOOK 0
#define configUSE_TICK_HOOK 0
#define configCPU_CLOCK_HZ 168000000UL
#define configTICK_RATE_HZ 1000
#define configMAX_PRIORITIES 8
#define configMINIMAL_STACK_SIZE 1024
#define configTOTAL_HEAP_SIZE 131072
#define configMAX_TASK_NAME_LEN 16
#define configSUPPORT_DYNAMIC_ALLOCATION 1
#define configSUPPORT_STATIC_ALLOCATION 0
#define configUSE_TIMERS 0
#define configUSE_MUTEXES 1
#define configUSE_TRACE_FACILITY 1
#define configGENERATE_RUN_TIME_STATS 1
#define configRUN_TIME_COUNTER_TYPE uint32_t
#ifdef TIMING_ARM
extern uint32_t timing_counter(void);
#define portCONFIGURE_TIMER_FOR_RUN_TIME_STATS() ((void)0)
#define portGET_RUN_TIME_COUNTER_VALUE() timing_counter()
#endif
#define configASSERT(x) do {if(!(x)) __builtin_trap();} while(0)
#define INCLUDE_xTaskDelayUntil 1
#define INCLUDE_vTaskDelay 1
#define INCLUDE_vTaskSuspend 1
#define INCLUDE_vTaskEndScheduler 1
#ifdef TIMING_ARM
#define configTICK_TYPE_WIDTH_IN_BITS TICK_TYPE_WIDTH_32_BITS
#define configMAX_SYSCALL_INTERRUPT_PRIORITY 0x50
#define configUSE_TICKLESS_IDLE 1
#else
#define configTICK_TYPE_WIDTH_IN_BITS TICK_TYPE_WIDTH_64_BITS
#define configUSE_TICKLESS_IDLE 0
#endif
#endif
`;
writeFileSync(join(work,'FreeRTOSConfig.h'),config);
const arm=['--target=arm-none-eabi','-mcpu=cortex-m4','-mthumb','-mfpu=fpv4-sp-d16','-mfloat-abi=softfp','-ffreestanding','-DTIMING_ARM','-I'+work,'-I'+join(kernel,'include'),'-I'+join(kernel,'portable/GCC/ARM_CM4F')];
for(const file of ['periodic-task.c','latency-markers.c','runtime-snapshot.c'])run(cc,[...arm,'-std=c11','-Werror','-c',file,'-o',file+'.o']);
run(cc,[...arm,'-O2','-c',join(kernel,'portable/GCC/ARM_CM4F/port.c'),'-o','tickless-port.o']);const nm=run(join(llvm,'llvm-nm'),['tickless-port.o']);assert.match(nm,/vPortSuppressTicksAndSleep/);
writeFileSync(join(work,'stats-controller.c'),`#include <assert.h>
#include <stdio.h>
#include <time.h>
#include "FreeRTOS.h"
#include "task.h"
#include "runtime-snapshot.c"
static unsigned reported;static int passed;
uint32_t timing_counter(void){struct timespec t;clock_gettime(CLOCK_MONOTONIC,&t);return (uint32_t)((uint64_t)t.tv_sec*1000000+t.tv_nsec/1000);}
void report_task_stat(const TaskStatus_t *s,configRUN_TIME_COUNTER_TYPE total){assert(s->pcTaskName&&total);++reported;}
static void sleeper(void *arg){(void)arg;for(;;)vTaskDelay(1000);}
static void controller(void *arg){(void)arg;vTaskDelay(3);
/* POSIX port uses times().tms_utime; allow at least one CPU accounting tick.
 * Waiting in vTaskDelay alone does not advance process user CPU time. */
while(ulPortGetRunTime()==0){for(volatile unsigned i=0;i<10000;i++){} }
assert(report_runtime_snapshot());assert(reported>=2);for(int i=0;i<9;i++)assert(xTaskCreate(sleeper,"extra",1024,0,1,0)==pdPASS);assert(!report_runtime_snapshot());vTaskDelay(2);passed=1;vTaskEndScheduler();}
int main(void){assert(xTaskCreate(controller,"stats",2048,0,3,0)==pdPASS);vTaskStartScheduler();assert(passed);puts("PASS actual FreeRTOS POSIX: source raw-stats snapshot reports tasks; more than 8 tasks rejects undersized buffer");}
`);
const posix=join(kernel,'portable/ThirdParty/GCC/Posix');run(cc,['-std=c11','-D_DARWIN_C_SOURCE','-I'+work,'-I'+join(kernel,'include'),'-I'+posix,'stats-controller.c',...['tasks.c','list.c','queue.c','portable/MemMang/heap_3.c'].map(p=>join(kernel,p)),join(posix,'port.c'),join(posix,'utils/wait_for_event.c'),'-pthread','-o','stats-controller']);run(join(work,'stats-controller'),[],10000);
console.log('PASS scoped math/policy/source/API checks plus actual POSIX kernel stats. WFI/low-power/timer MMIO/ITM/DWT/GPIO/trace tools/hardware latency and energy NOT RUN.');
