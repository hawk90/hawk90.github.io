#!/usr/bin/env node
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const src=process.env.LINUX_ARTICLE_SOURCE||'/private/tmp/linux-article-validation-2026-10-23';
const work=mkdtempSync(join(tmpdir(),'cxl-driver-'));
function run(cmd,args){const r=spawnSync(cmd,args,{encoding:'utf8',timeout:60000});if(r.error)throw r.error;assert.equal(r.status,0,r.stderr||r.stdout);return r.stdout;}
assert.equal(run('git',['-C',src,'rev-parse','HEAD']).trim(),'adc218676eef25575469234709c2d87185ca223a');
const mbox=readFileSync(join(src,'drivers/cxl/core/mbox.c'),'utf8');
const hdm=readFileSync(join(src,'drivers/cxl/core/hdm.c'),'utf8');
const header=readFileSync(join(src,'drivers/cxl/cxlmem.h'),'utf8');
const article=readFileSync('src/content/blog/embedded/hardware/cxl/chapter11-linux-driver.md','utf8');
function functionText(text,signature){const first=text.indexOf(signature);assert.ok(first>=0);const brace=text.indexOf('{',first);let depth=1,end=brace+1;for(;depth;end++){if(text[end]==='{')depth++;if(text[end]==='}')depth--;}return text.slice(first,end);}
const actual=functionText(mbox,'int cxl_internal_send_cmd(');
const block=article.match(/^```c title="cxl-internal-send-kernel.c"\n([\s\S]*?)^```/m);assert.ok(block);
const norm=s=>s.replace(/\/\*[\s\S]*?\*\//g,'').replace(/\s/g,'');assert.equal(norm(block[1]),norm(actual),'article function token-equivalent to pinned actual source');
const cmdStart=header.indexOf('struct cxl_mbox_cmd {'),cmdEnd=header.indexOf('\n};',cmdStart)+3;
const tableStart=header.indexOf('#define CMD_CMD_RC_TABLE'),tableEnd=header.indexOf('\n/*',tableStart);assert.ok(tableEnd>tableStart);
const table=header.slice(tableStart,tableEnd);
const c=`#include <stdint.h>\n#include <stddef.h>\n#include <errno.h>\n#include <assert.h>\ntypedef uint16_t u16;\n${header.slice(cmdStart,cmdEnd)}\n${table}\nstruct cxl_mailbox {size_t payload_size;int(*mbox_send)(struct cxl_mailbox*,struct cxl_mbox_cmd*);};\n#define WARN_ONCE(condition,...) (condition)\n${actual}\nstatic int calls,transport_rc;static size_t reply_size;static u16 reply_code;\nstatic int fake_send(struct cxl_mailbox*m,struct cxl_mbox_cmd*c){(void)m;calls++;c->size_out=reply_size;c->return_code=reply_code;return transport_rc;}\nstatic int check(size_t in,size_t out,size_t minimum){struct cxl_mbox_cmd c={.size_in=in,.size_out=out,.min_out=minimum};struct cxl_mailbox m={.payload_size=256,.mbox_send=fake_send};return cxl_internal_send_cmd(&m,&c);}\nint main(void){assert(check(257,0,0)==-E2BIG&&calls==0);assert(check(0,257,0)==-E2BIG&&calls==0);reply_size=16;reply_code=CXL_MBOX_CMD_RC_SUCCESS;assert(check(0,16,0)==0);reply_size=15;assert(check(0,16,0)==-EIO);assert(check(0,16,15)==0);assert(check(0,16,16)==-EIO);transport_rc=-ETIMEDOUT;assert(check(0,16,0)==-ETIMEDOUT);transport_rc=-EIO;assert(check(0,16,0)==-ENXIO);transport_rc=0;reply_size=0;assert(check(0,0,0)==0);reply_code=CXL_MBOX_CMD_RC_BACKGROUND;assert(check(0,0,0)==0);for(u16 code=2;code<sizeof(cxl_mbox_cmd_rctable)/sizeof(cxl_mbox_cmd_rctable[0]);code++){reply_code=code;struct cxl_mbox_cmd desc={.return_code=code};assert(cxl_mbox_cmd_rc2str(&desc)!=NULL);assert(check(0,0,0)==cxl_mbox_cmd_rctable[code].err);}return 0;}\n`;
writeFileSync(join(work,'mbox.c'),c);run('clang',['-std=c11','-Wall','-Wextra','-Werror','-fsanitize=address,undefined',join(work,'mbox.c'),'-o',join(work,'mbox')]);run(join(work,'mbox'),[]);
console.log(JSON.stringify({status:'PASS',source:'Linux v6.12 adc218676eef25575469234709c2d87185ca223a',checks:['article kernel function token-equivalent after removing comments/whitespace','unchanged actual cxl_internal_send_cmd plus actual command struct/return-code table/helpers compiled with explicit minimal host mailbox/WARN shims and synthetic transport, ASan/UBSan','payload oversize prevents send;transport timeout/-EIOremapping;success/background/defined error codes;fixed/minimal short output'],limits:'No kernel build/run, actual kernel struct ABI, mutex, MMIO, hardware transport, decoder commit/reset, DAX/RAM mutation or RAS injection. Mock transport receives valid initialized pointers and defined device return codes; unknown-code trust boundary is not tested.'},null,2));
