import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync,readFileSync,writeFileSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const kernel=process.env.FREERTOS_KERNEL_DIR??'/private/tmp/FreeRTOS-Kernel-11.2.0';
const llvm=process.env.RTOS_LLVM_BIN??'/opt/homebrew/opt/llvm/bin';
assert.ok(existsSync(join(kernel,'include/task.h')));assert.match(readFileSync(join(kernel,'include/task.h'),'utf8'),/tskKERNEL_VERSION_NUMBER\s+"V11\.2\.0"/);
const work=mkdtempSync(join(tmpdir(),'rtos-preemption-sync-'));
for(const name of ['part1-04-preemption.md','part1-05-interrupts-rtos.md','part1-06-sync-basics.md']){
 const source=readFileSync('src/content/blog/embedded/rtos/practical-internals/'+name,'utf8');
 for(const [,file,body]of source.matchAll(/^```[\w+]+ title="([^"]+)"\n([\s\S]*?)^```/gm))writeFileSync(join(work,file),body);
}
writeFileSync(join(work,'FreeRTOSConfig.h'),`#ifndef FREERTOS_CONFIG_H
#define FREERTOS_CONFIG_H
#define configUSE_PREEMPTION 1
#define configUSE_IDLE_HOOK 0
#define configUSE_TICK_HOOK 0
#define configCPU_CLOCK_HZ 16000000UL
#define configTICK_RATE_HZ 1000
#define configMAX_PRIORITIES 8
#define configMINIMAL_STACK_SIZE 128
#define configTOTAL_HEAP_SIZE 4096
#define configMAX_TASK_NAME_LEN 16
#define configTICK_TYPE_WIDTH_IN_BITS TICK_TYPE_WIDTH_32_BITS
#define configSUPPORT_STATIC_ALLOCATION 1
#define configSUPPORT_DYNAMIC_ALLOCATION 1
#define configUSE_TIMERS 0
#define configMAX_SYSCALL_INTERRUPT_PRIORITY 0x50
#define configKERNEL_INTERRUPT_PRIORITY 0xf0
#define configASSERT(x) do { if(!(x)) __builtin_trap(); } while(0)
#define INCLUDE_vTaskSuspend 1
#endif
`);
function run(cmd,args){const r=spawnSync(cmd,args,{cwd:work,encoding:'utf8',timeout:20000});const out=(r.stdout??'')+(r.stderr??'');console.log(`$ ${cmd} ${args.join(' ')}\n${out}status=${r.status}`);if(r.error)throw r.error;assert.equal(r.status,0);return out;}
console.log('Workspace: '+work);run(join(llvm,'clang'),['--version']);
run(join(llvm,'clang'),['-std=c11','-Wall','-Wextra','-Werror','-pthread','-fsanitize=undefined','-fno-sanitize-recover=all','publication.c','-o','publication']);assert.match(run(join(work,'publication'),[]),/PASS one-shot/);
const flags=['--target=arm-none-eabi','-mcpu=cortex-m4','-mthumb','-O2','-std=c11','-ffreestanding','-Wall','-Wextra','-Werror','-I'+work,'-I'+join(kernel,'include'),'-I'+join(kernel,'portable/GCC/ARM_CM4F')];
run(join(llvm,'clang'),[...flags,'-S','critical-port.c','-o','critical-port.s']);
const asm=readFileSync(join(work,'critical-port.s'),'utf8');console.log(asm);assert.match(asm,/mrs\s+\w+,\s*basepri/i);assert.match(asm,/msr\s+basepri/i);assert.doesNotMatch(asm,/vTaskSuspendAll/);
run(join(llvm,'clang'),[...flags,'-c','uart-handoff.c','-o','uart-handoff.o']);const undefineds=run(join(llvm,'llvm-nm'),['-u','uart-handoff.o']);assert.match(undefineds,/xQueueGenericSendFromISR/);assert.match(undefineds,/xQueueReceive/);assert.match(undefineds,/record_rx_drop_from_isr/);
console.log('PASS: one-shot C11 release/acquire publication; official ARM header BASEPRI code generation and UART queue API compile. Hardware IRQ/PendSV/DMA/timing NOT RUN.');
