#!/usr/bin/env node
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync,readFileSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const source=process.env.ESP_IDF_ARTICLE_SOURCE||'/private/tmp/esp-idf-article-validation-2026-10-23';
const pin='f5c3654a1c2d2a01f7f67def7a0dc48e691f63c0';
const base='src/content/blog/embedded/riscv/esp32-c3-mastering/';
const docs=['chapter01-overview.md','chapter02-riscv-core.md','chapter03-memory-flash.md'].map(n=>readFileSync(base+n,'utf8'));
const tmp=mkdtempSync(join(tmpdir(),'c3-core-memory-'));
const llvm='/opt/homebrew/opt/llvm/bin/';
const report={timestamp:new Date().toISOString(),pin,checks:[],limits:['No full ESP-IDF project, target toolchain install, flash/board execution, CSR access, permission fault, interrupt latency, NVS flash or OTA/power-cut executed. Native helper tests use actual pinned API headers with explicit fake NVS/heap backends. Cross-compilation proves encoding, not hardware behavior.']};
function execute(cmd,args,options={}){const r=spawnSync(cmd,args,{encoding:'utf8',timeout:30000,...options});if(r.error)throw r.error;assert.equal(r.status,0,r.stderr||r.stdout);return r.stdout;}
function extract(i,title){const all=[...docs[i].matchAll(/^```\w+ title="([^"]+)"\n([\s\S]*?)^```\s*$/gm)];const m=all.find(m=>m[1]===title);assert.ok(m,title);writeFileSync(join(tmp,title),m[2]);return m[2];}
try {
 assert.equal(execute('git',['-C',source,'rev-parse','HEAD']).trim(),pin);
 extract(1,'c3-encoding.S');execute(llvm+'clang',['--target=riscv32-none-elf','-march=rv32imc','-c',join(tmp,'c3-encoding.S'),'-o',join(tmp,'encoding.o')]);execute(llvm+'llvm-objcopy',['--only-section=.text','-O','binary',join(tmp,'encoding.o'),join(tmp,'encoding.bin')]);
 assert.equal(readFileSync(join(tmp,'encoding.bin')).toString('hex'),'130515002320a10005052ac0');
 extract(1,'c3-csr.c');execute(llvm+'clang',['--target=riscv32-none-elf','-march=rv32imc_zicsr','-ffreestanding','-Wall','-Wextra','-Werror','-c',join(tmp,'c3-csr.c'),'-o',join(tmp,'csr.o')]);
 const assembly=execute(llvm+'llvm-objdump',['-d',join(tmp,'csr.o')]);assert.match(assembly,/mcycle/);assert.match(assembly,/csrrci/);assert.match(assembly,/csrsi/);assert.match(assembly,/csrci/);
 report.checks.push({name:'RV32 instruction bytes and CSR save/restore compile',status:'PASS',bytes:'13051500 2320a100 0505 2ac0'});
 extract(1,'c3-napot.c');writeFileSync(join(tmp,'napot-test.c'),String.raw`#include <assert.h>
#include "c3-napot.c"
int main(void){uint32_t out=0;assert(c3_napot_encode(0x40000000,0x10000,&out)&&out==0x10001fff);assert(c3_napot_encode(0xfffffff8,8,&out)&&out==0x3ffffffe);assert(c3_napot_encode(0x80000000,1u<<30,&out));for(uint32_t n=8;n<=(1u<<30);n<<=1){assert(c3_napot_encode(0,n,&out));assert(out==((n-1u)>>3));if(n==(1u<<30))break;}assert(!c3_napot_encode(0,0,&out));assert(!c3_napot_encode(0,4,&out));assert(!c3_napot_encode(0,24,&out));assert(!c3_napot_encode(1,8,&out));assert(!c3_napot_encode(0,1u<<31,&out));assert(!c3_napot_encode(0,8,0));}
`);
 execute('clang',['-Wall','-Wextra','-Werror','-fsanitize=address,undefined',join(tmp,'napot-test.c'),'-o',join(tmp,'napot')]);execute(join(tmp,'napot'),[]);
 report.checks.push({name:'NAPOT arithmetic ASan/UBSan',status:'PASS',scope:'pure encoder; no CSR written'});
 extract(2,'c3-partitions.csv');const generator=join(source,'components/partition_table/gen_esp32part.py');
 execute('python3',[generator,'--flash-size','4MB',join(tmp,'c3-partitions.csv'),join(tmp,'partitions.bin')]);
 execute('python3',[generator,join(tmp,'partitions.bin'),join(tmp,'roundtrip.csv')]);
 const csv=readFileSync(join(tmp,'c3-partitions.csv'),'utf8');
 for(const [name,body] of [['overflow',csv.replace('0xf0000','0x100000')],['overlap',csv.replace('0x210000','0x110000')],['misaligned',csv.replace('0x210000','0x211000')]]){
  const path=join(tmp,name+'.csv');writeFileSync(path,body);const r=spawnSync('python3',[generator,'--flash-size','4MB',path,join(tmp,name+'.bin')],{encoding:'utf8'});assert.notEqual(r.status,0,name+' incorrectly accepted');
 }
 report.checks.push({name:'actual pinned partition generator positive/binary roundtrip/overflow/overlap/alignment negatives',status:'PASS'});
 extract(2,'c3-nvs.c');extract(2,'c3-heap.c');writeFileSync(join(tmp,'sdkconfig.h'),'#define CONFIG_IDF_TARGET_ESP32C3 1\n');
 writeFileSync(join(tmp,'api-test.c'),String.raw`#include <assert.h>
#include <string.h>
#include "c3-nvs.c"
#include "c3-heap.c"
static int opens,closes,sets,commits,get_calls,allocs,frees;static esp_err_t open_error,set_error,commit_error,get_error;static int oom;static unsigned char storage[1024];
esp_err_t nvs_open(const char*n,nvs_open_mode_t m,nvs_handle_t*h){(void)m;assert(!strcmp(n,"storage"));opens++;if(!open_error)*h=7;return open_error;}
esp_err_t nvs_set_str(nvs_handle_t h,const char*k,const char*v){assert(h==7&&!strcmp(k,"ssid")&&v);sets++;return set_error;}
esp_err_t nvs_commit(nvs_handle_t h){assert(h==7);commits++;return commit_error;}
void nvs_close(nvs_handle_t h){assert(h==7);closes++;}
esp_err_t nvs_get_str(nvs_handle_t h,const char*k,char*v,size_t*n){assert(h==7&&!strcmp(k,"ssid"));get_calls++;if(get_error)return get_error;if(*n<4){*n=4;return ESP_ERR_NVS_INVALID_LENGTH;}memcpy(v,"lab",4);*n=4;return ESP_OK;}
void *heap_caps_malloc(size_t n,uint32_t caps){assert(n==1024&&caps==(MALLOC_CAP_DMA|MALLOC_CAP_8BIT));allocs++;return oom?0:storage;}
void heap_caps_free(void *p){assert(p==storage);frees++;}
int main(void){char out[8];size_t n=sizeof out;assert(save_ssid(0)==ESP_ERR_INVALID_ARG&&opens==0);assert(save_ssid("lab")==ESP_OK&&closes==1&&commits==1);set_error=ESP_FAIL;assert(save_ssid("x")==ESP_FAIL&&commits==1&&closes==2);set_error=0;commit_error=ESP_ERR_NVS_NOT_ENOUGH_SPACE;assert(save_ssid("x")==commit_error&&closes==3);open_error=ESP_ERR_NVS_NOT_INITIALIZED;assert(save_ssid("x")==open_error&&closes==3);open_error=0;assert(load_ssid(0,&n)==ESP_ERR_INVALID_ARG);assert(load_ssid(out,&n)==ESP_OK&&!strcmp(out,"lab")&&closes==4);n=1;assert(load_ssid(out,&n)==ESP_ERR_NVS_INVALID_LENGTH&&n==4&&closes==5);get_error=ESP_ERR_NVS_NOT_FOUND;n=8;assert(load_ssid(out,&n)==get_error&&closes==6);assert(use_dma_buffer()==0&&allocs==1&&frees==1);oom=1;assert(use_dma_buffer()==-1&&allocs==2&&frees==1);}
`);
 const inc=[tmp,join(source,'components/nvs_flash/include'),join(source,'components/esp_common/include'),join(source,'components/heap/include')].flatMap(d=>['-I',d]);
 execute('clang',['-std=c11','-Wall','-Wextra','-Werror','-fsanitize=address,undefined',...inc,join(tmp,'api-test.c'),'-o',join(tmp,'api-test')]);execute(join(tmp,'api-test'),[]);
 report.checks.push({name:'actual NVS/heap headers + explicit fake backend helper failure/lifetime tests',status:'PASS',cases:'open/set/commit/get failures, small getter buffer, close-on-error, allocation failure/success'});
 report.result='PASS';
} catch(error){report.result='FAIL';report.error=error.stack;process.exitCode=1;}
writeFileSync('reports/adsense-audit/fixes/esp32-c3-core-memory-2026-10-23.log',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
