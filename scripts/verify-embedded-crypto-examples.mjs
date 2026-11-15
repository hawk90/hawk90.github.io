#!/usr/bin/env node
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync} from 'node:fs';
import {createHash,createHmac,createCipheriv} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
const src=process.env.MBEDTLS_ARTICLE_SOURCE||'/private/tmp/mbedtls-article-validation-2026-10-24';
const build=process.env.MBEDTLS_ARTICLE_BUILD||'/private/tmp/mbedtls-article-build-2026-10-24';
function run(exe,args){const r=spawnSync(exe,args,{encoding:'utf8',timeout:120000});if(r.error)throw r.error;assert.equal(r.status,0,r.stderr||r.stdout);return r.stdout;}
assert.equal(run('git',['-C',src,'rev-parse','HEAD']).trim(),'c765c831e5c2a0971410692f92f7a81d6ec65ec2');
const article=readFileSync('src/content/blog/embedded/embedded-security/chapter03-mcu-crypto.md','utf8');
function block(name){const b=article.match(new RegExp('^```c title="'+name+'"\\n([\\s\\S]*?)^```','m'));assert.ok(b,name);return b[1];}
const bytes=b=>'{'+[...b].join(',')+'}';
const lengths=[0,1,15,16,17,63,64,65,255,256,257,1023,1024,1025];
const data=Buffer.alloc(1025);for(let i=0;i<data.length;i++)data[i]=(i*17+3)&255;
const expected=lengths.map(n=>bytes(createHash('sha256').update(data.subarray(0,n)).digest())).join(',');
const key=Buffer.alloc(16),iv=Buffer.alloc(12),plain=Buffer.alloc(16);const cipher=createCipheriv('aes-128-gcm',key,iv);const ct=Buffer.concat([cipher.update(plain),cipher.final()]);const tag=cipher.getAuthTag();
assert.equal(ct.toString('hex'),'0388dace60b6a392f328c2b971b2fe78');assert.equal(tag.toString('hex'),'ab6e47d42cec13bdf53a67b21257bddf');
const hk=Buffer.alloc(20,11),msg=Buffer.from('Hi There');const hm=createHmac('sha256',hk).update(msg).digest();assert.equal(hm.toString('hex'),'b0344c61d8db38535ca8afceaf0bf12b881dc200c9833da726e9376c2e32cff7');
const code=`#include <assert.h>
#include <stdio.h>
#include <string.h>
#include "mbedtls/aes.h"
#include "mbedtls/md.h"
#include "mbedtls/constant_time.h"
${block('article-gcm-encrypt.c')}
${block('article-sha256-chunks.c')}
int main(void){
 assert(mbedtls_aes_self_test(0)==0);assert(mbedtls_gcm_self_test(0)==0);assert(mbedtls_sha256_self_test(0)==0);
 unsigned char key[16]={0},iv[12]={0},pt[16]={0},ct[16],tag[16],out[16];
 const unsigned char expected_ct[16]=${bytes(ct)},expected_tag[16]=${bytes(tag)};
 assert(encrypt_packet(key,iv,NULL,0,pt,16,ct,tag)==0);
 assert(!memcmp(ct,expected_ct,16)&&!memcmp(tag,expected_tag,16));
 mbedtls_gcm_context ctx;mbedtls_gcm_init(&ctx);assert(mbedtls_gcm_setkey(&ctx,MBEDTLS_CIPHER_ID_AES,key,128)==0);
 assert(mbedtls_gcm_auth_decrypt(&ctx,16,iv,12,NULL,0,tag,16,ct,out)==0&&!memcmp(out,pt,16));
 for(int mode=0;mode<5;mode++){
  unsigned char k[16]={0},v[12]={0},c[16],t[16],aad=1;memcpy(c,ct,16);memcpy(t,tag,16);
  if(mode==0)t[0]^=1;if(mode==1)c[0]^=1;if(mode==2)v[0]^=1;if(mode==3)k[0]^=1;
  assert(mbedtls_gcm_setkey(&ctx,MBEDTLS_CIPHER_ID_AES,k,128)==0);memset(out,0xa5,16);
  assert(mbedtls_gcm_auth_decrypt(&ctx,16,v,12,mode==4?&aad:NULL,mode==4?1:0,t,16,c,out)==MBEDTLS_ERR_GCM_AUTH_FAILED);
  unsigned char zero[16]={0};assert(!memcmp(out,zero,16));
 }
 assert(mbedtls_gcm_auth_decrypt(&ctx,16,iv,12,NULL,0,tag,3,ct,out)==MBEDTLS_ERR_GCM_BAD_INPUT);
 mbedtls_gcm_free(&ctx);
 unsigned char data[1025]=${bytes(data)},digest[32];
 const size_t lengths[]=${bytes(lengths)},chunks[]={1,7,16,63,64,65,257,4096};
 const unsigned char hashes[14][32]={${expected}};
 for(size_t i=0;i<14;i++)for(size_t j=0;j<8;j++){assert(hash_chunks(data,lengths[i],chunks[j],digest)==0);assert(!memcmp(digest,hashes[i],32));}
 assert(hash_chunks(data,16,0,digest)==MBEDTLS_ERR_SHA256_BAD_INPUT_DATA);
 unsigned char hk[20];memset(hk,11,sizeof hk);const unsigned char hm[32]=${bytes(hm)};
 assert(mbedtls_md_hmac(mbedtls_md_info_from_type(MBEDTLS_MD_SHA256),hk,sizeof hk,(const unsigned char*)"Hi There",8,digest)==0);assert(!memcmp(digest,hm,32));
 assert(mbedtls_ct_memcmp(digest,hm,32)==0);for(size_t i=0;i<32;i++){digest[i]^=1;assert(mbedtls_ct_memcmp(digest,hm,32)!=0);digest[i]^=1;}
 puts("PASS: actual Mbed TLS3.6.4 AES/GCM/SHA256 self-tests; extracted article AES-GCM known-answer and roundtrip, five auth mutations rejected with zeroed output, invalid3Btag rejected;112 chunkedSHA cases independently compared, chunk0 rejection;RFC4231 HMAC and32 comparison differences.");
}
`;
const work=mkdtempSync(join(tmpdir(),'embedded-crypto-')),c=join(work,'host.c'),binary=join(work,'host');writeFileSync(c,code);
run('clang',['-std=c11','-Wall','-Wextra','-Werror','-fsanitize=address,undefined','-fno-omit-frame-pointer','-I'+join(src,'include'),c,join(build,'library/libmbedcrypto.a'),'-o',binary]);console.log(run(binary,[]).trim());
console.log('Only host functional checks; source and library sanitizer build. No MCU accelerator, hardware entropy, constant-time proof, power/EM/fault analysis, secure-boot image parser or production key/nonce lifecycle validation.');
