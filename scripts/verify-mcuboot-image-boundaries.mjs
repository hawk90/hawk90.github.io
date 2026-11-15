#!/usr/bin/env node
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync,chmodSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
const src=process.env.MCUBOOT_ARTICLE_SOURCE||'/private/tmp/mcuboot-article-validation-2026-10-24';
const py=process.env.MCUBOOT_IMGTOOL_PYTHON||'/private/tmp/mcuboot-imgtool-venv-2026-10-24/bin/python';
const work=mkdtempSync(join(tmpdir(),'mcuboot-image-'));
function run(exe,args,ok=true,input){const p=spawnSync(exe,args,{encoding:'utf8',cwd:work,timeout:30000,input});if(p.error)throw p.error;if(ok)assert.equal(p.status,0,p.stderr||p.stdout);return p;}
assert.equal(run('git',['-C',src,'rev-parse','HEAD']).stdout.trim(),'9c99326b9756dbcc35b524636d99ed5f3e6cb29b');
const tool=join(src,'scripts/imgtool.py');const img=args=>run(py,[tool,...args]);
img(['keygen','-t','ecdsa-p256','-k','test.pem']);chmodSync(join(work,'test.pem'),0o600);img(['keygen','-t','ecdsa-p256','-k','other.pem']);chmodSync(join(work,'other.pem'),0o600);
const payload=Buffer.alloc(1024);for(let i=0;i<1024;i++)payload[i]=i&255;writeFileSync(join(work,'payload.bin'),payload);
const sign=['sign','--key','test.pem','--align','4','--version','1.2.3','--header-size','0x200','--pad-header','--slot-size','0x2000','--security-counter','5','payload.bin','signed.bin'];
const article=readFileSync('src/content/blog/embedded/embedded-security/chapter06-ota-update.md','utf8');const block=article.match(/^```bash title="mcuboot-fixture-sign.sh"\n([\s\S]*?)^```/m);assert.ok(block);assert.equal(run('bash',['-n'],true,block[1]).status,0); // exact argv checked independently below
const split=run(py,['-c','import shlex,sys,json;print(json.dumps(shlex.split(sys.argv[1].replace(chr(92)+chr(10)," "))))',block[1]]);const argv=JSON.parse(split.stdout);assert.deepEqual(argv.slice(2),sign);assert.equal(argv[0],'$IMGTOOL_PYTHON');assert.equal(argv[1],'$MCUBOOT_SOURCE/scripts/imgtool.py');
img(sign);const normal=img(['verify','--key','test.pem','signed.bin']).stdout;assert.match(normal,/Image was correctly validated/);
const b=readFileSync(join(work,'signed.bin'));assert.equal(b.readUInt32LE(0),0x96f3b83d);assert.equal(b.readUInt16LE(8),512);assert.equal(b.readUInt32LE(12),1024);const prot=512+1024;assert.equal(b.readUInt16LE(prot),0x6908);const plen=b.readUInt16LE(prot+2);assert.equal(plen,12);assert.equal(b[prot+4],0x50);assert.equal(b.readUInt16LE(prot+6),4);assert.equal(b.readUInt32LE(prot+8),5);const tlv=prot+plen;assert.equal(b.readUInt16LE(tlv),0x6907);
let sig=-1;for(let off=tlv+4,end=tlv+b.readUInt16LE(tlv+2);off<end;){assert.ok(off+4<=b.length);const n=b.readUInt16LE(off+2);assert.ok(off+4+n<=end&&off+4+n<=b.length);if(b[off]===0x22)sig=off+4;off+=4+n;}assert.ok(sig>=0);
const cases=[];for(const [name,offset] of [['payload',512+17],['protected-counter',prot+8],['signature',sig+10],['magic',0]]){const bad=Buffer.from(b);bad[offset]^=1;const file=name+'.bin';writeFileSync(join(work,file),bad);const p=run(py,[tool,'verify','--key','test.pem',file],false);assert.notEqual(p.status,0,name);cases.push({name,exit:p.status,output:(p.stdout+p.stderr).trim()});}
const wrong=run(py,[tool,'verify','--key','other.pem','signed.bin'],false);assert.notEqual(wrong.status,0);cases.push({name:'wrong-key',exit:wrong.status,output:(wrong.stdout+wrong.stderr).trim()});
const lower=[...sign];lower[lower.indexOf('5')]='4';lower[lower.length-1]='counter4.bin';img(lower);assert.match(img(['verify','--key','test.pem','counter4.bin']).stdout,/Image was correctly validated/);
console.log(JSON.stringify({status:'PASS',source:'MCUboot v2.1.0 9c99326b9756dbcc35b524636d99ed5f3e6cb29b',normal:normal.trim(),format:{header:512,payload:1024,protectedMagic:'0x6908',protectedLength:plen,counterType:'0x50',counter:5,normalMagic:'0x6907'},negativeCases:cases,lowerCounter:'counter4 with valid signature accepted by actual imgtool; host verifier does not compare device counter5',limits:'Disposable local keys and synthetic non-executable payload only. No target firmware compilation/boot, swap/revert/confirm, trusted device counter, flash/fuse/provisioning/power-cut or arbitrary malformed-image parser certification.'},null,2));
