#!/usr/bin/env node
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
const work=mkdtempSync(join(tmpdir(),'firmware-strings-'));
function run(exe,args){const p=spawnSync(exe,args,{cwd:work,encoding:'utf8',timeout:30000});if(p.error)throw p.error;assert.equal(p.status,0,p.stderr);return p.stdout;}
const article=readFileSync('src/content/blog/embedded/embedded-security/chapter09-firmware-analysis.md','utf8');
const c=article.match(/^```c title="fixture.c"\n([\s\S]*?)^```/m),sh=article.match(/^```bash title="fixture-strings.sh"\n([\s\S]*?)^```/m);assert.ok(c&&sh);
writeFileSync(join(work,'fixture.c'),c[1]);writeFileSync(join(work,'fixture.sh'),'set -eu\nset -o pipefail\n'+sh[1]);
const output=run('bash',['fixture.sh']);
assert.match(output,/password=training-only/);assert.match(output,/tokenization is not a credential/);
const elf=readFileSync(join(work,'fixture.o'));assert.equal(elf.subarray(0,4).toString('hex'),'7f454c46');assert.equal(elf[4],1);assert.equal(elf[5],1);assert.equal(elf.readUInt16LE(16),1);assert.equal(elf.readUInt16LE(18),40);
for(const mode of ['-g','-g0']){
 run('clang',['--target=arm-none-eabi','-mcpu=cortex-m33','-mthumb','-O2',mode,'-DNDEBUG','-c','fixture.c','-o','comparison.o']);
 const strings=run('/usr/bin/strings',['-a','-n','8','comparison.o']);assert.match(strings,/password=training-only/);assert.match(strings,/tokenization is not a credential/);
}
writeFileSync(join(work,'clean.c'),'const char status[]="ready";\nconst unsigned char bytes[]={0,1,2,3,4,5};\n');
run('clang',['--target=arm-none-eabi','-mcpu=cortex-m33','-mthumb','-O2','-g0','-DNDEBUG','-c','clean.c','-o','clean.o']);
assert.doesNotMatch(run('/usr/bin/strings',['-a','-n','8','clean.o']),/password|secret|token/i);
console.log(run('clang',['--version']).trim());
console.log('PASS: unchanged article C and shell compiled to ELF32 little-endian ARM relocatable object; actual strings reports planted diagnostic and benign tokenization false positive.');
console.log('PASS: both debug/no-debug NDEBUG builds retain text; independent clean object has no matching candidate. Not a secret detector benchmark.');
console.log('No target firmware acquisition, readout, Ghidra/binwalk/radare2 execution, chroot, emulated firmware, network probing/fuzzing or CVE reproduction.');
