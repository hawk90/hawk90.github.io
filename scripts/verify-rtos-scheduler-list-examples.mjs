import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync,readFileSync,writeFileSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const kernel=process.env.FREERTOS_KERNEL_DIR??'/private/tmp/FreeRTOS-Kernel-11.2.0';
const llvm=process.env.RTOS_LLVM_BIN??'/opt/homebrew/opt/llvm/bin';
assert.ok(existsSync(join(kernel,'include/task.h')));assert.match(readFileSync(join(kernel,'include/task.h'),'utf8'),/tskKERNEL_VERSION_NUMBER\s+"V11\.2\.0"/);
const work=mkdtempSync(join(tmpdir(),'rtos-scheduler-list-'));
for(const name of ['part2-01-ready-list.md','part2-02-blocked-list.md','part2-03-scheduler-algorithm.md']){
 const source=readFileSync('src/content/blog/embedded/rtos/practical-internals/'+name,'utf8');
 for(const [,file,body]of source.matchAll(/^```[\w+]+ title="([^"]+)"\n([\s\S]*?)^```/gm))writeFileSync(join(work,file),body);
}
writeFileSync(join(work,'FreeRTOSConfig.h'),`#ifndef FREERTOS_CONFIG_H
#define FREERTOS_CONFIG_H
#include <stdlib.h>
#define configUSE_PREEMPTION 1
#define configUSE_TIME_SLICING 0
#define configUSE_IDLE_HOOK 0
#define configUSE_TICK_HOOK 0
#define configCPU_CLOCK_HZ 100000000UL
#define configTICK_RATE_HZ 1000
#ifndef configMAX_PRIORITIES
#define configMAX_PRIORITIES 8
#endif
#define configMINIMAL_STACK_SIZE 1024
#define configTOTAL_HEAP_SIZE (128*1024)
#define configMAX_TASK_NAME_LEN 16
#ifdef ARM_SIZE_PROBE
#define configTICK_TYPE_WIDTH_IN_BITS TICK_TYPE_WIDTH_32_BITS
#define configMAX_SYSCALL_INTERRUPT_PRIORITY 0x50
#define configKERNEL_INTERRUPT_PRIORITY 0xf0
#else
#define configTICK_TYPE_WIDTH_IN_BITS TICK_TYPE_WIDTH_64_BITS
#endif
#define configUSE_LIST_DATA_INTEGRITY_CHECK_BYTES 0
#define configSUPPORT_STATIC_ALLOCATION 0
#define configSUPPORT_DYNAMIC_ALLOCATION 1
#define configUSE_TIMERS 0
#define configUSE_MUTEXES 1
#define configUSE_RECURSIVE_MUTEXES 1
#define configUSE_COUNTING_SEMAPHORES 1
#define configASSERT(x) do { if(!(x)) __builtin_trap(); } while(0)
#define INCLUDE_vTaskDelay 1
#define INCLUDE_vTaskDelete 1
#define INCLUDE_vTaskSuspend 1
#define INCLUDE_vTaskEndScheduler 1
#endif
`);
function run(cmd,args,timeout=30000){const r=spawnSync(cmd,args,{cwd:work,encoding:'utf8',timeout});const out=(r.stdout??'')+(r.stderr??'');console.log(`$ ${cmd} ${args.join(' ')}\n${out}status=${r.status} signal=${r.signal}`);if(r.error)throw r.error;assert.equal(r.status,0);return out;}
console.log('Workspace: '+work);run(join(llvm,'clang'),['--version']);
const cc=join(llvm,'clang'), port=join(kernel,'portable/ThirdParty/GCC/Posix');
const common=['-std=c11','-D_DARWIN_C_SOURCE','-Wall','-Wextra','-I'+work,'-I'+join(kernel,'include'),'-I'+port];
run(cc,[...common,'-fsanitize=address,undefined','-fno-sanitize-recover=all','ready-list-check.c','priority-probe.c',join(kernel,'list.c'),'-o','ready-check']);assert.match(run(join(work,'ready-check'),[]),/PASS actual list API/);
run(cc,[...common,'-fsanitize=address,undefined','-fno-sanitize-recover=all','delayed-list-check.c',join(kernel,'list.c'),'-o','delayed-check']);assert.match(run(join(work,'delayed-check'),[]),/simultaneous expiry, wrap, max key/);
const arm=['--target=arm-none-eabi','-mcpu=cortex-m4','-mthumb','-std=c11','-ffreestanding','-O2'];
run(cc,[...arm,'-S','priority-probe.c','-o','priority-probe.s']);const asm=readFileSync(join(work,'priority-probe.s'),'utf8');console.log(asm);assert.match(asm,/\bclz\b/);
// Size-only header probe has no libc dependency. The config's stdlib include is host-only.
const config=readFileSync(join(work,'FreeRTOSConfig.h'),'utf8').replace('#include <stdlib.h>','#ifndef ARM_SIZE_PROBE\n#include <stdlib.h>\n#endif');writeFileSync(join(work,'FreeRTOSConfig.h'),config);
for(const mini of [0,1]){run(cc,[...arm,'-DARM_SIZE_PROBE',`-DconfigUSE_MINI_LIST_ITEM=${mini}`,'-I'+work,'-I'+join(kernel,'include'),'-I'+join(kernel,'portable/GCC/ARM_CM4F'),'-c','list-sizes.c','-o',`sizes${mini}.o`]);const nm=run(join(llvm,'llvm-nm'),['-S',`sizes${mini}.o`]);assert.match(nm,new RegExp(`\\b${mini?'00000014':'0000001c'}\\s+\\w\\s+observed_list_size`));}
run(cc,[...arm,'-DARM_SIZE_PROBE','-I'+work,'-I'+join(kernel,'include'),'-I'+join(kernel,'portable/GCC/ARM_CM4F'),'-S','optimized-config.c','-o','optimized-config.s']);assert.match(readFileSync(join(work,'optimized-config.s'),'utf8'),/\bclz\b/);
const bad=spawnSync(cc,[...arm,'-DARM_SIZE_PROBE','-DconfigMAX_PRIORITIES=33','-I'+work,'-I'+join(kernel,'include'),'-I'+join(kernel,'portable/GCC/ARM_CM4F'),'-c','optimized-config.c','-o','bad-config.o'],{cwd:work,encoding:'utf8',timeout:30000});
console.log('Expected config33 rejection:\n'+bad.stdout+bad.stderr+'status='+bad.status);if(bad.error)throw bad.error;assert.notEqual(bad.status,0);assert.match(bad.stderr,/less than or equal to 32/);
run(cc,[...common,'yield-check.c',...['tasks.c','queue.c','list.c','portable/MemMang/heap_3.c'].map(p=>join(kernel,p)),join(port,'port.c'),join(port,'utils/wait_for_event.c'),'-pthread','-o','yield-check']);assert.match(run(join(work,'yield-check'),[],10000),/explicit yield rotates equal priorities/);
console.log('PASS: actual list backend plus scoped scheduling/time models, ARM header sizes and CLZ, actual POSIX kernel explicit-yield ordering with time slicing off. MCU IRQ/WCET/SMP and full tick-wrap kernel execution NOT RUN.');
