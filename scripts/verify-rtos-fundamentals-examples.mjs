import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync,readFileSync,writeFileSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const cc=process.env.RTOS_CC??'/opt/homebrew/opt/llvm/bin/clang';
const kernel=process.env.FREERTOS_KERNEL_DIR??'/private/tmp/FreeRTOS-Kernel-11.2.0';
assert.ok(existsSync(join(kernel,'include/task.h')),'Set FREERTOS_KERNEL_DIR to official V11.2.0 source; never substitute mock headers');
assert.match(readFileSync(join(kernel,'include/task.h'),'utf8'),/tskKERNEL_VERSION_NUMBER\s+"V11\.2\.0"/);
const work=mkdtempSync(join(tmpdir(),'rtos-fundamentals-'));
for(const name of ['part1-01-why-rtos.md','part1-02-task-thread.md','part1-03-scheduling-algorithms.md']){
 const source=readFileSync('src/content/blog/embedded/rtos/practical-internals/'+name,'utf8');
 for(const [,file,body]of source.matchAll(/^```[\w+]+ title="([^"]+)"\n([\s\S]*?)^```/gm))writeFileSync(join(work,file),body);
}
writeFileSync(join(work,'FreeRTOSConfig.h'),`#ifndef FREERTOS_CONFIG_H
#define FREERTOS_CONFIG_H
#define configUSE_PREEMPTION 1
#define configUSE_IDLE_HOOK 0
#define configUSE_TICK_HOOK 0
#define configCPU_CLOCK_HZ 16000000UL
#ifndef PROBE_TICK_RATE
#define PROBE_TICK_RATE 1000
#endif
#define configTICK_RATE_HZ PROBE_TICK_RATE
#define configMAX_SYSCALL_INTERRUPT_PRIORITY 0x50
#define configKERNEL_INTERRUPT_PRIORITY 0xf0
#define configMAX_PRIORITIES 8
#define configMINIMAL_STACK_SIZE 128
#define configTOTAL_HEAP_SIZE 4096
#define configMAX_TASK_NAME_LEN 16
#define configTICK_TYPE_WIDTH_IN_BITS TICK_TYPE_WIDTH_32_BITS
#define configSUPPORT_STATIC_ALLOCATION 1
#define configSUPPORT_DYNAMIC_ALLOCATION 1
#define configUSE_TIMERS 0
#define configASSERT(x) do { if(!(x)) __builtin_trap(); } while(0)
#define INCLUDE_xTaskDelayUntil 1
#define INCLUDE_vTaskDelay 1
#define INCLUDE_vTaskDelete 1
#endif
`);
function run(cmd,args,fail){const r=spawnSync(cmd,args,{cwd:work,encoding:'utf8',timeout:30000});const out=(r.stdout??'')+(r.stderr??'');console.log(`$ ${cmd} ${args.join(' ')}\n${out}status=${r.status}`);if(r.error)throw r.error;if(fail){assert.notEqual(r.status,0);assert.match(out,fail);}else assert.equal(r.status,0);return out;}
console.log('Workspace: '+work);run(cc,['--version']);run(process.execPath,['period-budget.mjs']);run(process.execPath,['rm-response.mjs']);
const flags=['--target=arm-none-eabi','-mcpu=cortex-m4','-mthumb','-std=c11','-ffreestanding','-Wall','-Wextra','-Werror','-I'+work,'-I'+join(kernel,'include'),'-I'+join(kernel,'portable/GCC/ARM_CM4F')];
run(cc,[...flags,'-c','pid-task.c','-o','pid-task.o']);
run(cc,[...flags,'-DREQUIRE_ONE_MS','-c','task-api-check.c','-o','api1khz.o']);
run(cc,[...flags,'-DPROBE_TICK_RATE=100','-c','task-api-check.c','-o','api100hz.o']);
run(cc,[...flags,'-DPROBE_TICK_RATE=100','-DREQUIRE_ONE_MS','-c','task-api-check.c','-o','bad.o'],/1ms rounds to zero ticks/);
run('/opt/homebrew/opt/llvm/bin/llvm-nm',['-u','pid-task.o','api1khz.o']);
console.log('PASS: integer scheduling budgets/RTA, ARM API object compile against official V11.2.0, 100Hz 1ms rejection. Kernel scheduler/board execution NOT RUN.');
