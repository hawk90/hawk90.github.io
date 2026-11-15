#!/usr/bin/env node
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
const src=process.env.OPTEE_ARTICLE_SOURCE||'/private/tmp/optee-os-article-validation-2026-10-24';
function run(exe,args){const p=spawnSync(exe,args,{encoding:'utf8',timeout:30000});if(p.error)throw p.error;assert.equal(p.status,0,p.stderr);return p.stdout;}
assert.equal(run('git',['-C',src,'rev-parse','HEAD']).trim(),'0919de0f7c79ad35ad3c8ace5f823ad1344b4716');
const a=readFileSync('src/content/blog/embedded/embedded-security/chapter05-tee.md','utf8');const block=a.match(/^```c title="ta-read-config.c"\n([\s\S]*?)^```/m);assert.ok(block);
const code=`#include <assert.h>
#include <string.h>
#include <stdio.h>
// Host namespace adaptation only; upstream public headers are unchanged.
#undef __deprecated
#undef __weak
#undef __pure
${block[1]}
static int mode,opened,closed,reads;
TEE_Result TEE_OpenPersistentObject(uint32_t sid,const void*id,size_t len,uint32_t flags,TEE_ObjectHandle*object){
 assert(sid==TEE_STORAGE_PRIVATE&&len==14&&!memcmp(id,"policy-version",14)&&flags==TEE_DATA_FLAG_ACCESS_READ);
 if(mode==1)return TEE_ERROR_ITEM_NOT_FOUND;
 opened++;*object=(TEE_ObjectHandle)(uintptr_t)1;return TEE_SUCCESS;
}
TEE_Result TEE_GetObjectInfo1(TEE_ObjectHandle object,TEE_ObjectInfo*info){assert(object==(TEE_ObjectHandle)(uintptr_t)1);if(mode==2)return TEE_ERROR_CORRUPT_OBJECT;memset(info,0,sizeof *info);info->dataSize=4;return TEE_SUCCESS;}
TEE_Result TEE_ReadObjectData(TEE_ObjectHandle object,void*buffer,size_t size,size_t*count){assert(object==(TEE_ObjectHandle)(uintptr_t)1&&size>=4);reads++;if(mode==3)return TEE_ERROR_STORAGE_NOT_AVAILABLE;memcpy(buffer,"test",4);*count=4;return TEE_SUCCESS;}
void TEE_CloseObject(TEE_ObjectHandle object){assert(object==(TEE_ObjectHandle)(uintptr_t)1);closed++;}
int main(void){
 unsigned char out[8];size_t actual=99;assert(read_config(out,sizeof out,NULL)==TEE_ERROR_BAD_PARAMETERS);assert(read_config(NULL,4,&actual)==TEE_ERROR_BAD_PARAMETERS);assert(opened==0&&closed==0);
 for(mode=0;mode<4;mode++){opened=closed=reads=0;actual=99;memset(out,0xa5,8);TEE_Result rc=read_config(out,8,&actual);
  if(mode==0){assert(rc==TEE_SUCCESS&&actual==4&&!memcmp(out,"test",4));}
  if(mode==1){assert(rc==TEE_ERROR_ITEM_NOT_FOUND&&actual==0&&closed==0&&opened==0&&reads==0);}
  if(mode==2){assert(rc==TEE_ERROR_CORRUPT_OBJECT&&actual==0&&reads==0);}
  if(mode==3){assert(rc==TEE_ERROR_STORAGE_NOT_AVAILABLE&&actual==0&&reads==1);}
  assert(opened==closed);
 }
 mode=0;opened=closed=reads=0;assert(read_config(out,3,&actual)==TEE_ERROR_SHORT_BUFFER&&actual==4);assert(opened==1&&closed==1&&reads==0);
 assert(read_config(NULL,0,&actual)==TEE_ERROR_SHORT_BUFFER&&actual==4);assert(opened==2&&closed==2&&reads==0);
 puts("PASS: actual OP-TEE4.5.0 headers and extracted article helper; valid read, open/info/read failures, null contract, short/zero capacity and close ownership ASan/UBSan.");
}
`;
const work=mkdtempSync(join(tmpdir(),'optee-storage-')),c=join(work,'host.c'),bin=join(work,'host');writeFileSync(c,code);
run('clang',['-std=c11','-Wall','-Wextra','-Werror','-fsanitize=address,undefined','-fno-omit-frame-pointer','-I'+join(src,'lib/libutee/include'),'-I'+join(src,'lib/libutils/ext/include'),c,'-o',bin]);console.log(run(bin,[]).trim());
console.log('Host mocks for four GP object APIs; not actual TA executable/devkit ABI, TEE OS build/boot, secure storage/RPMB/HUK, identity/authorization, shared-memory isolation, rollback or CCA/SGX validation.');
