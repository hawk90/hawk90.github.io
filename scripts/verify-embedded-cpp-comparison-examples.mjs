import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync,readFileSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const work=mkdtempSync(join(tmpdir(),'embedded-comparison-'));
const text=readFileSync('src/content/blog/embedded/embedded-cpp/part1-01-cpp-vs-c.md','utf8');
for(const [,name,code] of text.matchAll(/^```(?:c|cpp) title="(comparison\.(?:c|cpp))"\n([\s\S]*?)^```/gm))writeFileSync(join(work,name),code);
function run(cmd,args,fail=false){const r=spawnSync(cmd,args,{cwd:work,encoding:'utf8',timeout:30000});const out=(r.stdout??'')+(r.stderr??'');console.log(`$ ${cmd} ${args.join(' ')}\n${out}status=${r.status}`);if(r.error)throw r.error;if(fail){assert.notEqual(r.status,0);assert.match(out,/GPIO pin must be below 16/);}else assert.equal(r.status,0);return out;}
console.log('Workspace: '+work);run('clang',['--version']);
const common=['--target=arm-none-eabi','-mcpu=cortex-m4','-mthumb','-O2','-ffreestanding'];
run('clang',[...common,'-std=c11','-c','comparison.c','-o','c.o']);
run('clang++',[...common,'-std=c++17','-c','comparison.cpp','-o','cpp.o']);
run('clang++',[...common,'-std=c++17','-DINVALID_PIN','-c','comparison.cpp','-o','bad.o'],true);
run('llvm-objdump',['-d','c.o','cpp.o']);
for(const prefix of ['c','cpp'])run('llvm-objcopy',['--dump-section',`.text=${prefix}.text`,`${prefix}.o`]);
assert.deepEqual(readFileSync(join(work,'c.text')),readFileSync(join(work,'cpp.text')));
console.log('PASS: C/C++ .text identical for three Cortex-M4 functions; invalid pin rejected. Hardware execution and complete firmware size NOT RUN.');
