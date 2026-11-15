#!/usr/bin/env node
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {pathToFileURL} from 'node:url';
const source=process.env.ESP_IDF_ARTICLE_SOURCE||'/private/tmp/esp-idf-article-validation-2026-10-23';
const kernel=process.env.FREERTOS_KERNEL_DIR||'/private/tmp/FreeRTOS-Kernel-11.2.0';
const work=mkdtempSync(join(tmpdir(),'c3-system-'));
const base='src/content/blog/embedded/riscv/esp32-c3-mastering/';
const report={timestamp:new Date().toISOString(),checks:[],limits:['Pinned IDF source/template contracts and actual extracted read-only eFuse arithmetic with fake reads only. Actual API headers with explicit fake HMAC/sleep calls; no physical key, crypto peripheral, fuse read/write, provisioning, image boot or sleep executed.','Queue example runs actual vanilla FreeRTOS11.2 POSIX scheduler with include-layout shims; this is not ESP-IDF/C3 runtime, byte-stack-unit, ISR or watchdog testing. No full ESP-IDF target configure/compile/flash, external component resolution, timing, power or battery measurement.']};
function run(cmd,args,opts={}){const r=spawnSync(cmd,args,{encoding:'utf8',timeout:60000,...opts});if(r.error)throw r.error;assert.equal(r.status,0,r.stderr||r.stdout);return r.stdout;}
function fence(ch,title){const text=readFileSync(base+ch,'utf8');const m=[...text.matchAll(/^```[\w+]+ title="([^"]+)"\n([\s\S]*?)^```\s*$/gm)].find(m=>m[1]===title);assert.ok(m,title);writeFileSync(join(work,title),m[2]);return m[2];}
try{
 assert.equal(run('git',['-C',source,'rev-parse','HEAD']).trim(),'f5c3654a1c2d2a01f7f67def7a0dc48e691f63c0');
 fence('chapter09-esp-idf-build.md','c3-project-CMakeLists.txt');
 writeFileSync(join(work,'create.py'),String.raw`import ast,os,re,sys,pathlib
from shutil import copyfile,copytree
root=pathlib.Path(sys.argv[1]); work=pathlib.Path(sys.argv[2]);os.environ['IDF_PATH']=str(root)
p=root/'tools/idf_py_actions/create_ext.py';tree=ast.parse(p.read_text())
selected=[n for n in tree.body if isinstance(n,ast.FunctionDef) and n.name in ['replace_in_file','create_project']]
exec(compile(ast.Module(body=selected,type_ignores=[]),str(p),'exec'))
create_project(str(work/'generated'),'my_app')
files={str(p.relative_to(work/'generated')) for p in (work/'generated').rglob('*') if p.is_file()}
assert files=={'CMakeLists.txt','main/CMakeLists.txt','main/my_app.c'},files
assert 'my_app.c' in (work/'generated/main/CMakeLists.txt').read_text()
def significant(s):return '\n'.join(line.strip() for line in s.splitlines() if line.strip() and not line.lstrip().startswith('#'))
assert significant((work/'generated/CMakeLists.txt').read_text())==significant((work/'c3-project-CMakeLists.txt').read_text())
print('actual upstream project creator and template comparison PASS')
`);
 run('python3',[join(work,'create.py'),source,work]);
 const tools=JSON.parse(readFileSync(join(source,'tools/tools.json')));assert.equal(tools.tools.find(t=>t.name==='riscv32-esp-elf').versions.find(v=>v.status==='recommended').name,'esp-14.2.0_20241119');
 report.checks.push({name:'actual pinned create_project/template and compiler manifest',status:'PASS',scope:'template creation; no full target configure/build'});
 fence('chapter11-security.md','c3-security-counters.c');fence('chapter11-security.md','c3-hmac.c');fence('chapter12-power-management.md','c3-sleep.c');
 const efuse=readFileSync(join(source,'components/efuse/src/esp_efuse_fields.c'),'utf8');const readVersion=efuse.match(/^uint32_t esp_efuse_read_secure_version\(void\)\n\{[\s\S]*?^\}/m);assert.ok(readVersion);
 writeFileSync(join(work,'sdkconfig.h'),'#define CONFIG_IDF_TARGET_ESP32C3 1\n');
 writeFileSync(join(work,'test.c'),String.raw`#include <assert.h>
#include <string.h>
#include <limits.h>
#include "c3-security-counters.c"
#include "c3-hmac.c"
#include "c3-sleep.c"
static unsigned fixture_width;static uint16_t fixture_bits;
#define MIN(a,b) ((a)<(b)?(a):(b))
#define APP_SEC_VER_SIZE_EFUSE_FIELD fixture_width
#define ESP_EFUSE_SECURE_VERSION ((const void*)1)
static size_t esp_efuse_get_field_size(const void*p){assert(p);return 16;}
static void esp_efuse_read_field_blob(const void*p,void*out,size_t n){assert(p&&n<=16);*(uint32_t*)out=fixture_bits;}
`+readVersion[0]+String.raw`
static int hmac_calls,timer_calls,gpio_calls;static esp_err_t hmac_error,timer_error,gpio_error;
esp_err_t esp_hmac_calculate(hmac_key_id_t key,const void*message,size_t n,uint8_t*out){assert(key==HMAC_KEY0&&message&&n==3&&out);hmac_calls++;if(!hmac_error)memset(out,0x5a,32);return hmac_error;}
esp_err_t esp_sleep_enable_timer_wakeup(uint64_t us){assert(us==60000000);timer_calls++;return timer_error;}
esp_err_t esp_deep_sleep_enable_gpio_wakeup(uint64_t mask,esp_deepsleep_gpio_wake_up_mode_t mode){assert(mask==(UINT64_C(1)<<4)&&mode==ESP_GPIO_WAKEUP_GPIO_LOW);gpio_calls++;return gpio_error;}
int main(void){c3_security_counters_t out;for(unsigned raw=0;raw<8;raw++){assert(c3_decode_security_counters(raw,0,16,&out));assert(out.flash_encryption_enabled==((__builtin_popcount(raw)&1)!=0));}for(fixture_width=1;fixture_width<=16;fixture_width++)for(unsigned bits=0;bits<=65535;bits++){fixture_bits=(uint16_t)bits;assert(c3_decode_security_counters(1,fixture_bits,fixture_width,&out));assert(out.secure_version==esp_efuse_read_secure_version());}assert(!c3_decode_security_counters(8,0,16,&out));assert(!c3_decode_security_counters(0,0,0,&out));assert(!c3_decode_security_counters(0,0,17,&out));assert(!c3_decode_security_counters(0,0,16,0));
uint8_t digest[32];assert(c3_hmac(HMAC_KEY0,"abc",3,digest)==ESP_OK&&digest[0]==0x5a);hmac_error=ESP_FAIL;assert(c3_hmac(HMAC_KEY0,"abc",3,digest)==ESP_FAIL);int before=hmac_calls;assert(c3_hmac((hmac_key_id_t)-1,"abc",3,digest)==ESP_ERR_INVALID_ARG);assert(c3_hmac(HMAC_KEY_MAX,"abc",3,digest)==ESP_ERR_INVALID_ARG);assert(c3_hmac(HMAC_KEY0,0,3,digest)==ESP_ERR_INVALID_ARG);assert(c3_hmac(HMAC_KEY0,"abc",4097,digest)==ESP_ERR_INVALID_ARG);assert(c3_hmac(HMAC_KEY0,"abc",3,0)==ESP_ERR_INVALID_ARG&&hmac_calls==before);
assert(c3_prepare_deep_wake(4,60000000)==ESP_OK&&gpio_calls==1);timer_error=ESP_FAIL;assert(c3_prepare_deep_wake(4,60000000)==ESP_FAIL&&gpio_calls==1);timer_error=0;gpio_error=ESP_ERR_INVALID_ARG;assert(c3_prepare_deep_wake(4,60000000)==gpio_error&&gpio_calls==2);before=timer_calls;assert(c3_prepare_deep_wake(9,60000000)==ESP_ERR_INVALID_ARG);assert(c3_prepare_deep_wake(64,60000000)==ESP_ERR_INVALID_ARG);assert(c3_prepare_deep_wake(4,0)==ESP_ERR_INVALID_ARG);assert(c3_prepare_deep_wake(4,86400000001ULL)==ESP_ERR_INVALID_ARG&&timer_calls==before);}
`);
 const inc=[work,...['esp_common/include','esp_hw_support/include','hal/include','hal/esp32c3/include','soc/esp32c3/include'].map(p=>join(source,'components',p))].flatMap(p=>['-I',p]);
 run('clang',['-std=c11','-Wall','-Wextra','-Werror','-fsanitize=address,undefined',...inc,join(work,'test.c'),'-o',join(work,'test')]);run(join(work,'test'),[]);
 const table=readFileSync(join(source,'components/efuse/esp32c3/esp_efuse_table.csv'),'utf8');assert.match(table,/^SECURE_VERSION,\s+EFUSE_BLK0,\s+142,\s+16,/m);
 const port=readFileSync(join(source,'components/freertos/FreeRTOS-Kernel/portable/riscv/include/freertos/portmacro.h'),'utf8');assert.match(port,/#define portSTACK_TYPE\s+uint8_t/);assert.match(port,/typedef portSTACK_TYPE\s+StackType_t/);
 report.checks.push({name:'actual read_secure_version source with fake field reads vs decoder, actual HMAC/sleep headers with fake backends',status:'PASS',cases:'all8crypt states; all65536version bitsets x widths1..16; invalidwidth/count/null; HMACbounds/error; GPIOmask/timer partialfailure/request bounds ASan/UBSan. Source C3SECURE_VERSION16 and StackType_t uint8 confirmed.'});
 fence('chapter12-power-management.md','c3-power-budget.mjs');const {powerBudget}=await import(pathToFileURL(join(work,'c3-power-budget.mjs')));
 const input={capacityMah:2000,periodSeconds:1800,activeSeconds:3,activeMilliamp:80,sleepMilliamp:0.005};const a=powerBudget(input),b=powerBudget({...input,periodSeconds:300});assert.ok(Math.abs(a.chargeMas-248.985)<1e-10);assert.ok(Math.abs(a.days-602.44593047774)<1e-9);assert.ok(Math.abs(b.days-103.52609892954)<1e-9);
 for(const delta of [{capacityMah:0},{periodSeconds:0},{activeSeconds:-1},{activeSeconds:1801},{activeMilliamp:-1},{sleepMilliamp:NaN},{capacityMah:Infinity},{activeMilliamp:Number.MAX_VALUE},{activeMilliamp:0,sleepMilliamp:0}])assert.throws(()=>powerBudget({...input,...delta}),RangeError);
 assert.equal(powerBudget({...input,activeSeconds:1800}).averageMilliamp,80);assert.equal(powerBudget({...input,activeSeconds:0}).averageMilliamp,0.005);
 report.checks.push({name:'power budget dimensional arithmetic and input failures',status:'PASS',days30min:a.days,days5min:b.days,scope:'hypothetical input arithmetic, not measured battery life'});
 // Run the unchanged article queue example on actual pinned vanilla kernel POSIX port.
 assert.equal(run('git',['-C',kernel,'rev-parse','HEAD']).trim(),'0adc196d4bd52a2d91102b525b0aafc1e14a2386');
 fence('chapter10-freertos.md','c3-queue-demo.c');mkdirSync(join(work,'config/freertos'),{recursive:true});
 const fixture=readFileSync('scripts/verify-rtos-part3-continuation-examples.mjs','utf8').match(/writeFileSync\(join\(work,'FreeRTOSConfig.h'\),`([\s\S]*?)`\);/);assert.ok(fixture);writeFileSync(join(work,'config/FreeRTOSConfig.h'),fixture[1]);
 for(const h of ['FreeRTOS.h','task.h','queue.h'])writeFileSync(join(work,'config/freertos',h),`#include <${h}>\n`);
 const tour=readFileSync('src/content/blog/embedded/rtos/practical-internals/part5-01-freertos-source.md','utf8').match(/^```cmake title="freertos-tour-CMakeLists.txt"\n([\s\S]*?)^```/m);assert.ok(tour);writeFileSync(join(work,'CMakeLists.txt'),tour[1]);
 writeFileSync(join(work,'main.c'),`#include <assert.h>\n#include "c3-queue-demo.c"\nstatic void stop(void *p){(void)p;vTaskDelay(pdMS_TO_TICKS(350));vTaskEndScheduler();}\nint main(void){app_main();assert(sample_queue);assert(xTaskCreate(stop,"stop",2048,NULL,7,NULL)==pdPASS);vTaskStartScheduler();puts("C3_QUEUE_POSIX_SCOPE_PASS");}\n`);
 run('cmake',['-S',work,'-B',join(work,'build'),'-DFREERTOS_SOURCE_DIR='+kernel]);run('cmake',['--build',join(work,'build'),'--parallel','2']);const output=run(join(work,'build/tour'),[]);for(const n of [0,1,2])assert.match(output,new RegExp('sample='+n));assert.match(output,/C3_QUEUE_POSIX_SCOPE_PASS/);
 report.checks.push({name:'extracted queue producer/consumer on actual vanilla FreeRTOS11.2 POSIX kernel',status:'PASS',output:output.trim(),scope:'functional queue/task example only; include-layout shims, vanilla stack units and host port differ from ESP-IDF/C3; no failure injection or target scheduler test'});
 report.result='PASS';
}catch(error){report.result='FAIL';report.error=error.stack;process.exitCode=1;}
writeFileSync('reports/adsense-audit/fixes/esp32-c3-system-2026-10-23.log',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
