import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {existsSync,mkdtempSync,readFileSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const kernel=process.env.FREERTOS_KERNEL_DIR??'/private/tmp/FreeRTOS-Kernel-11.2.0';
const llvm=process.env.RTOS_LLVM_BIN??'/opt/homebrew/opt/llvm/bin';
assert.match(readFileSync(join(kernel,'include/task.h'),'utf8'),/tskKERNEL_VERSION_NUMBER\s+"V11\.2\.0"/);
const work=mkdtempSync(join(tmpdir(),'rtos-context-'));
for(const name of ['part2-04-context-switch.md','part2-05-cortex-m-context.md','part2-06-cortex-a-context.md','part2-07-riscv-context.md']){
 const src=readFileSync('src/content/blog/embedded/rtos/practical-internals/'+name,'utf8');
 for(const [,file,body] of src.matchAll(/^```[\w+]+ title="([^"]+)"\n([\s\S]*?)^```/gm))writeFileSync(join(work,file),body);
}
function run(cmd,args,expected=0){const r=spawnSync(cmd,args,{cwd:work,encoding:'utf8',timeout:30000});const out=(r.stdout??'')+(r.stderr??'');console.log(`$ ${cmd} ${args.join(' ')}\n${out}status=${r.status}`);if(r.error)throw r.error;if(expected===0)assert.equal(r.status,0);else assert.notEqual(r.status,0);return out;}
console.log('Workspace: '+work);const cc=join(llvm,'clang');run(cc,['--version']);
const arm=['--target=arm-none-eabi','-mcpu=cortex-m4','-mthumb','-mfpu=fpv4-sp-d16','-mfloat-abi=softfp'];
run(cc,[...arm,'-c','request-pendsv.S','-o','yield.o']);
run(cc,[...arm,'-std=c11','-ffreestanding','-Werror','-c','priority-encoding.c','-o','priority.o']);
run(cc,['--target=arm-none-eabi','-mcpu=cortex-m0','-mthumb','-c','m0-register-roundtrip.S','-o','m0.o']);
// Interpret only the source fence's small register-transfer instruction subset.
// This is a host semantic model, not ARM execution or a complete ISR model.
const m0=readFileSync(join(work,'m0-register-roundtrip.S'),'utf8');
for(let sample=0;sample<32;sample++){
 const regs=Array.from({length:16},(_,i)=>1000*sample+i*37);regs[0]=0x1000;const original=[...regs],mem=new Map();
 for(const raw of m0.split('\n')){const line=raw.trim();let m;
  if((m=/^(stmia|ldmia) r0!, \{r4-r7\}$/.exec(line))){for(let r=4;r<=7;r++){if(m[1]==='stmia')mem.set(regs[0],regs[r]);else {assert.ok(mem.has(regs[0]));regs[r]=mem.get(regs[0]);}regs[0]+=4;}}
  else if((m=/^mov r(\d+), r(\d+)$/.exec(line)))regs[+m[1]]=regs[+m[2]];
  else if((m=/^subs r0, #(\d+)$/.exec(line)))regs[0]-=+m[1];
  else if(line&&!line.startsWith('.')&&!line.endsWith(':')&&line!=='bx lr')throw Error('Unmodeled M0: '+line);
 }
 for(let r=4;r<=11;r++)assert.equal(regs[r],original[r]);
 for(let r=4;r<=11;r++)assert.equal(mem.get(0x1000+(r-4)*4),original[r]);
}
console.log('PASS M0 source-fence transfer model: all R4-R11 saved distinctly and restored, 32 samples.');
run(cc,['--target=riscv32-unknown-elf','-march=rv32i_zicsr','-mabi=ilp32','-c','rv32-trap.S','-o','rv32.o']);
const rv=readFileSync(join(work,'rv32-trap.S'),'utf8');
function modelRv(source){
 for(let sample=0;sample<64;sample++){
  const regs=Array.from({length:32},(_,i)=>sample*1009+i*71);regs[0]=0;regs[2]=0x8000;const initial=[...regs];
  const csr={mepc:0x1000+sample*4,mstatus:0x1880},expected={...csr},mem=new Map();let base,frame;
  function reg(s){return s==='sp'?2:+s.slice(1);}
  for(const raw of source.split('\n')){const line=raw.trim();let m;
   if((m=/^addi (sp|x\d+), (sp|x\d+), (-?\d+)$/.exec(line))){const d=reg(m[1]);regs[d]=regs[reg(m[2])]+ +m[3];if(d===2&&+m[3]<0){base=regs[2];frame=-m[3];assert.equal(frame%16,0);}}
   else if((m=/^(sw|lw) (sp|x\d+), (\d+)\(sp\)$/.exec(line))){const addr=regs[2]+ +m[3];assert.ok(addr>=base&&addr+4<=base+frame,'frame bounds '+line);if(m[1]==='sw')mem.set(addr,regs[reg(m[2])]);else {assert.ok(mem.has(addr),'initialized slot '+line);regs[reg(m[2])]=mem.get(addr);}}
   else if((m=/^csrr (x\d+), (mepc|mstatus)$/.exec(line)))regs[reg(m[1])]=csr[m[2]];
   else if((m=/^csrw (mepc|mstatus), (x\d+)$/.exec(line)))csr[m[1]]=regs[reg(m[2])];
   else if(line==='call trap_body'){assert.equal(regs[2]%16,0);for(const r of [1,5,6,7,10,11,12,13,14,15,16,17,28,29,30,31])regs[r]=0xdead000+r;csr.mepc=0xbad;}
   else if(line==='mret'){assert.deepEqual(regs,initial);assert.deepEqual(csr,expected);assert.equal(csr.mstatus&8,0);}
   else if(line&&!line.startsWith('.')&&!line.endsWith(':'))throw Error('Unmodeled RV: '+line);
  }
 }
}
modelRv(rv);assert.throws(()=>modelRv(rv.replace('addi sp, sp, -144','addi sp, sp, -128').replace('addi x5, sp, 144','addi x5, sp, 128')),/frame bounds/);
console.log('PASS RV32 source-fence model: 64 distinct register/CSR samples, call clobber, SP restored last; old 128-byte allocation is rejected. Model only: no real trap/mret execution.');
run(cc,['--target=arm-none-eabi','-mcpu=cortex-a9','-mfpu=neon','-mfloat-abi=softfp','-marm','-c',join(kernel,'portable/GCC/ARM_CA9/portASM.S'),'-o','ca9.o']);
const ca9=run(join(llvm,'llvm-objdump'),['-d','ca9.o']);assert.match(ca9,/srsdb/);assert.match(ca9,/rfeia/);assert.match(ca9,/FreeRTOS_SWI_Handler/);
run(cc,['--target=aarch64-none-elf','-c','aarch64-tlbi.S','-o','tlbi.o']);
const bad=run(cc,['--target=arm-none-eabi','-mcpu=cortex-a9','-marm','-c','aarch64-tlbi.S','-o','bad.o'],1);assert.match(bad,/invalid instruction|instruction requires|unrecognized instruction/i);
writeFileSync(join(work,'FreeRTOSConfig.h'),`#define configUSE_PREEMPTION 1
#define configUSE_IDLE_HOOK 0
#define configUSE_TICK_HOOK 0
#define configCPU_CLOCK_HZ 168000000UL
#define configTICK_RATE_HZ 1000
#define configMAX_PRIORITIES 8
#define configMINIMAL_STACK_SIZE 128
#define configTOTAL_HEAP_SIZE 32768
#define configMAX_TASK_NAME_LEN 16
#define configTICK_TYPE_WIDTH_IN_BITS TICK_TYPE_WIDTH_32_BITS
#define configMAX_SYSCALL_INTERRUPT_PRIORITY 0x50
#define configKERNEL_INTERRUPT_PRIORITY 0xf0
#define configSUPPORT_DYNAMIC_ALLOCATION 1
#define configSUPPORT_STATIC_ALLOCATION 0
#define configUSE_TIMERS 0
#define configASSERT(x) do { if(!(x)) __builtin_trap(); } while(0)
`);
run(cc,[...arm,'-O2','-ffreestanding','-I'+work,'-I'+join(kernel,'include'),'-I'+join(kernel,'portable/GCC/ARM_CM4F'),'-c',join(kernel,'portable/GCC/ARM_CM4F/port.c'),'-o','m4f.o']);
const m4=run(join(llvm,'llvm-objdump'),['-d','m4f.o']);assert.match(m4,/stmdb[^\n]*r4[^\n]*r11[^\n]*lr/);assert.match(m4,/ldm[^\n]*r4[^\n]*r11[^\n]*lr/);assert.match(m4,/vstmdb/);assert.match(m4,/vldm/);
assert.equal((8+9)*4,68);assert.equal((18+16)*4,136);assert.equal((8+9+18+16)*4,204);
console.log('PASS actual V11.2.0 CM4F and CA9 port object assembly; AArch64 TLBI accepted and AArch32 rejected. Basic/extended frame arithmetic: 68/204 bytes plus alignment. Firmware link, IRQ/FP runtime, page-table maintenance, board latency and WCET NOT RUN.');
