import assert from 'node:assert/strict';import{spawnSync}from'node:child_process';import{mkdtempSync,readFileSync,writeFileSync}from'node:fs';import{join}from'node:path';import{tmpdir}from'node:os';
const kernel=process.env.FREERTOS_KERNEL_DIR??'/private/tmp/FreeRTOS-Kernel-11.2.0';const metal=process.env.LIBMETAL_SOURCE_DIR??'/private/tmp/libmetal-article-validation-2026-10-23';const amp=process.env.OPENAMP_SOURCE_DIR??'/private/tmp/openamp-article-validation-2026-10-23';const tfm=process.env.TFM_SOURCE_DIR??'/private/tmp/tfm-article-validation-2026-10-23';const llvm=process.env.RTOS_LLVM_BIN??'/opt/homebrew/opt/llvm/bin',cc=join(llvm,'clang'),cxx=join(llvm,'clang++');const work=mkdtempSync(join(tmpdir(),'rtos-isolation-cpp-'));
for(const name of ['10-syscall','11-trustzone-tfm','12-amp-openamp','13-cpp-in-rtos']){const s=readFileSync('src/content/blog/embedded/rtos/practical-internals/part4-'+name+'.md','utf8');for(const[,f,b]of s.matchAll(/^```[\w+]+ title="([^"]+)"\n([\s\S]*?)^```/gm))writeFileSync(join(work,f),b);}
function run(cmd,args,timeout=30000){const r=spawnSync(cmd,args,{cwd:work,encoding:'utf8',timeout});console.log(`$ ${cmd} ${args.join(' ')}\n${r.stdout??''}${r.stderr??''}status=${r.status} signal=${r.signal}`);if(r.error)throw r.error;assert.equal(r.status,0);return r.stdout??'';}
console.log('Workspace '+work);run(cc,['--version']);for(const [dir,sha]of [[kernel,'0adc196d4bd52a2d91102b525b0aafc1e14a2386'],[amp,'a2cd944c40d40846ede5dae69de6fda9427254da'],[metal,'f8a0e51aee8e6993b6df243422f705bd7fea6079'],[tfm,'0c4c99ba33b3e66deea070e149279278dc7647f4']])assert.equal(run('git',['-C',dir,'rev-parse','HEAD']).trim(),sha);
writeFileSync(join(work,'policy-test.c'),`#include <assert.h>\n#include <stdio.h>\n#include "syscall-policy.c"\nint main(void){assert(syscall_allowed(1,0,1));assert(syscall_allowed(0x80000000u,31,32));assert(!syscall_allowed(0,0,32));assert(!syscall_allowed(~0u,32,64));assert(!syscall_allowed(~0u,1,1));assert(!syscall_allowed(~0u,0,0));assert(!syscall_allowed(~0u,~0u,~0u));puts("PASS extracted syscall bitmap: allow/deny, table limit, bit31/32 and huge index; policy model only");}\n`);
run(cc,['-std=c11','-fsanitize=address,undefined','policy-test.c','-o','policy-test']);run(join(work,'policy-test'),[],60000);
const config=readFileSync('scripts/verify-rtos-part3-continuation-examples.mjs','utf8').match(/writeFileSync\(join\(work,'FreeRTOSConfig.h'\),`([\s\S]*?)`\);/)[1];writeFileSync(join(work,'FreeRTOSConfig.h'),config);
const arm=['--target=arm-none-eabi','-mcpu=cortex-m4','-mthumb','-ffreestanding','-DSCOPED_ARM','-I'+work,'-I'+join(kernel,'include')];
run(cc,[...arm,'-I'+join(kernel,'portable/GCC/ARM_CM4F'),'-std=c11','-O2','-Wall','-Wextra','-Werror','-c','svc-call.c','-o','svc-call.o']);
run(cc,[...arm,'-I'+join(kernel,'portable/GCC/ARM_CM4_MPU'),'-DconfigUSE_MPU_WRAPPERS_V1=0','-DconfigSYSTEM_CALL_STACK_SIZE=256','-DconfigPROTECTED_KERNEL_OBJECT_POOL_SIZE=16','-DconfigENFORCE_SYSTEM_CALLS_FROM_KERNEL_ONLY=1','-std=c11','-Werror','-c','restricted-task.c','-o','restricted-task.o']);
run(cc,['--target=arm-none-eabi','-mcpu=cortex-m33','-mthumb','-mcmse','-ffreestanding','-O1','-std=c11','-Wall','-Wextra','-Werror','-S','cmse-entry.c','-o','cmse-entry.s']);const assembly=readFileSync(join(work,'cmse-entry.s'),'utf8');assert.match(assembly,/tt[at]*\s/);assert.match(assembly,/bxns/);assert.match(assembly,/__acle_se_secure_increment/);console.log('PASS extracted SVC and restricted unprivileged API compile against actual V11.2.0 MPU v2 headers; CMSE entry emits TT and BXNS with entry symbol. No firmware link/fault/transition executed.');
// Configure the actual libmetal Generic headers only; no transport or board runtime is emulated.
const metalBuild=join(work,'metal-headers');run('cmake',['-S',metal,'-B',metalBuild,'-DCMAKE_POLICY_VERSION_MINIMUM=3.5','-DCMAKE_SYSTEM_NAME=Generic','-DCMAKE_SYSTEM_PROCESSOR=generic','-DWITH_DOC=OFF','-DWITH_TESTS=OFF','-DWITH_EXAMPLES=OFF']);
writeFileSync(join(work,'echo-test.c'),`#include <assert.h>
#include <stdio.h>
#include "rpmsg-echo.c"
static int fake_result,called,wait_seen;static uint32_t destination;
int rpmsg_send_offchannel_raw(struct rpmsg_endpoint *ep,uint32_t src,uint32_t dst,const void *p,int n,int wait){assert(ep&&p);(void)src;(void)n;called++;destination=dst;wait_seen=wait;return fake_result;}
int main(void){struct rpmsg_endpoint ep={0};struct echo_state state={0};char data[4]={0};fake_result=4;assert(echo_rx(&ep,data,4,42,&state)==0);assert(state.accepted==1&&called==1&&destination==42&&wait_seen==0);
fake_result=RPMSG_ERR_NO_BUFF;assert(echo_rx(&ep,data,4,42,&state)==0);fake_result=2;assert(echo_rx(&ep,data,4,42,&state)==0);assert(state.dropped==2);
assert(echo_rx(&ep,data,0,42,&state)==0);assert(echo_rx(&ep,data,(size_t)INT_MAX+1u,42,&state)==0);assert(echo_rx(NULL,data,4,42,&state)==0);assert(echo_rx(&ep,NULL,4,42,&state)==0);assert(echo_rx(&ep,data,4,42,NULL)==RPMSG_ERR_PARAM);assert(called==3&&state.dropped==6);
puts("PASS extracted echo adapter + actual RPMsg inline headers: nonwaiting flag, peer src reply, full/partial failures, null/zero/INT_MAX bounds. Lower transport stub only; no vring/mailbox execution.");}
`);
run(cc,['-std=c11','-Wno-deprecated-declarations','-fsanitize=address,undefined','-I'+join(metalBuild,'lib/include'),'-I'+join(amp,'lib/include'),'echo-test.c','-o','echo-test']);run(join(work,'echo-test'),[],60000);
writeFileSync(join(work,'routine-test.cpp'),`#include <cassert>\n#include <cstdio>\n#include "owned-routine.hpp"\nint main(){unsigned p=0;{auto r=two_steps(p);assert(p==0);assert(r.step()&&p==1);assert(!r.step()&&p==2);assert(!r.step());}{auto r=two_steps(p);}{auto r=two_steps(p);assert(r.step());}std::puts("PASS extracted owned coroutine: initial suspend, resume/finish, no resume-after-done, destruction before start/while suspended/after completion; no external scheduler");}\n`);
run(cxx,['-std=c++20','-Wall','-Wextra','-Werror','-fsanitize=address,undefined','routine-test.cpp','-o','routine-test']);run(join(work,'routine-test'),[],60000);
const posix=join(kernel,'portable/ThirdParty/GCC/Posix');const includes=['-I'+work,'-I'+join(kernel,'include'),'-I'+posix];
writeFileSync(join(work,'negative.cpp'),`#include <string>\n#include "rtos-objects.hpp"\nStaticQueue<std::string,2> invalid;\n`);const bad=spawnSync(cxx,['-std=c++20',...includes,'-fsyntax-only','negative.cpp'],{cwd:work,encoding:'utf8'});assert.notEqual(bad.status,0);assert.match(bad.stderr,/queue copies raw bytes/);console.log('PASS expected rejection: nontrivial std::string payload cannot instantiate raw-byte queue.');
writeFileSync(join(work,'objects-test.cpp'),`#include <cassert>
#include <cstdio>
#include <mutex>
#include "rtos-objects.hpp"
#include "mutex-guard.hpp"
#include "task.h"
static int passed;
static void early(SemaphoreHandle_t m){MutexGuard g(m,0);assert(g.locked());return;}
static void checks(){StaticSemaphore_t raw_storage;auto raw=xSemaphoreCreateMutexStatic(&raw_storage);assert(raw);early(raw);assert(xSemaphoreTake(raw,0)==pdTRUE);{MutexGuard failed(raw,0);assert(!failed.locked());}assert(xSemaphoreGive(raw)==pdTRUE);vSemaphoreDelete(raw);
Mutex m;{std::lock_guard<Mutex> guard(m);assert(!m.try_lock());}assert(m.try_lock());m.unlock();StaticQueue<uint32_t,2> q;uint32_t v=0;assert(!q.pop(v));assert(q.push(7));assert(q.push(8));assert(!q.push(9));assert(q.pop(v)&&v==7);assert(q.pop(v)&&v==8);assert(!q.pop(v));}
static void control(void*){checks();vTaskDelay(2);passed=1;vTaskEndScheduler();}
int main(){assert(xTaskCreate(control,"cpp",4096,nullptr,2,nullptr)==pdPASS);vTaskStartScheduler();assert(passed);std::puts("PASS actual V11.2.0 POSIX + extracted C++ wrappers: guard early-return and take failure, lock_guard and try-lock, static queue FIFO/full/empty; scoped destruction after no waiters");}
`);
const objects=[];for(const [i,src]of [...['tasks.c','queue.c','list.c','portable/MemMang/heap_3.c'].map(f=>join(kernel,f)),join(posix,'port.c'),join(posix,'utils/wait_for_event.c')].entries()){const obj='kernel'+i+'.o';run(cc,['-std=c11','-D_DARWIN_C_SOURCE',...includes,'-c',src,'-o',obj]);objects.push(obj);}
run(cxx,['-std=c++20','-Wall','-Wextra','-Werror',...includes,'objects-test.cpp',...objects,'-pthread','-o','objects-test']);run(join(work,'objects-test'),[],15000);
console.log('NOT RUN: physical MPU/TrustZone faults/privilege transitions, full TF-M crypto/attestation/secure boot, RPMsg peer/cache/mailbox transport, real ISR lifetime, MCU timings or certification.');
