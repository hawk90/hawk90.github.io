#!/usr/bin/env node
import {readFileSync,writeFileSync,mkdtempSync,readdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
const chapter=(process.argv[2]||'').padStart(2,'0');
assert(/^(0[1-9]|10)$/.test(chapter),'usage: node scripts/verify-embedded-cpp-part2-examples.mjs 01..10');
const root='src/content/blog/embedded/embedded-cpp/';
const path=root+readdirSync(root).find(x=>x.startsWith('part2-'+chapter+'-'));
const source=readFileSync(path,'utf8');
const dir=mkdtempSync(join(tmpdir(),'cpp-part2-'+chapter+'-'));
const cpp=process.env.CXX||'clang++';
function run(args, {fail=false,match}={}) {
 console.log('$',args.join(' '));
 const p=spawnSync(args[0],args.slice(1),{cwd:dir,encoding:'utf8',timeout:30000});
 const out=(p.stdout||'')+(p.stderr||''); if(out)console.log(out);
 assert(!p.error,p.error?.message); assert(p.signal===null,'terminated '+p.signal);
 if(fail){assert(p.status!==0,'expected failure');if(match)assert(match.test(out),'missing expected diagnostic');}
 else assert.equal(p.status,0,'command failed');
 return out;
}
const names=[];
for(const m of source.matchAll(/```cpp title="([^"]+)"\n([\s\S]*?)\n```/g)) {
 assert(!m[1].includes('/')); writeFileSync(join(dir,m[1]),m[2]+'\n');names.push(m[1]);
}
assert(names.length,'article must have executable titled blocks');
console.log('article:',path,'temporary:',dir); run([cpp,'--version']);
const standard=chapter==='05'?'c++23':['04','08','10'].includes(chapter)?'c++20':'c++17';
const flags=['-std='+standard,'-Wall','-Wextra','-pedantic-errors'];
if(chapter==='05')flags.push('-fno-exceptions');
const inputs=chapter==='07'?['container.cpp','extern-main.cpp']:names.filter(n=>n.endsWith('.cpp'));
run([cpp,...flags,...inputs,'-o','example']);run([join(dir,'example')]);
const negative={'04':['TASKS=33',/stack budget exceeded/],'05':['BAD_PIN',/constant expression|consteval/],'06':['BAD_CAPACITY',/power of two/],'08':['BAD_BASE',/private/],'09':['BAD_BOOL',/integer except bool/],'10':['BAD_CALL',/constraints not satisfied/]}[chapter];
if(negative)run([cpp,...flags,'-D'+negative[0],...inputs,'-o','negative'],{fail:true,match:negative[1]});
if(chapter==='01'){
 const text=readFileSync(join(dir,names[0]),'utf8');
 writeFileSync(join(dir,'copy.cpp'),text.replace('Handle b(std::move(a))','Handle b(a)'));
 run([cpp,...flags,'copy.cpp','-o','copy'],{fail:true,match:/deleted/});
}
if(chapter==='02'){
 const text=readFileSync(join(dir,names[0]),'utf8').replace('GUARD_JOIN(guard_,__LINE__)','guard_##__LINE__');
 writeFileSync(join(dir,'old.cpp'),text);
 run([cpp,...flags,'old.cpp','-o','old'],{fail:true,match:/redefinition/});
}
if(chapter==='03'){
 const text=readFileSync(join(dir,names[0]),'utf8').replace('    while (x > pi) x -= 2 * pi;','').replace('    while (x < -pi) x += 2 * pi;','');
 // Larger angle demonstrates why the original seven-term approximation needed range reduction.
 writeFileSync(join(dir,'range.cpp'),text.replace('n < 10','n < 7').replace('assert(std::abs(sine(x)-std::sin(x)) < 1e-8);','if (std::abs(sine(x)-std::sin(x)) > 0.1) return 0;').replace(/\n}\n$/,'\n    return 1;\n}\n'));
 run([cpp,...flags,'range.cpp','-o','range']);run([join(dir,'range')]);
}
if(chapter==='05')run([cpp,...flags,'-DBAD_INIT',...inputs,'-o','bad-init'],{fail:true,match:/constant initializer/});
if(chapter==='07')run([cpp,...flags,'extern-main.cpp','-o','missing'],{fail:true,match:/Undefined symbols|undefined reference/});
if(chapter==='08')run([cpp,...flags,'-DBAD_DELETE',...inputs,'-o','delete'],{fail:true,match:/private/});
if(chapter==='10'){
 const text=readFileSync(join(dir,names[0]),'utf8').replace('template<class D> struct LoggerBase','template<LoggerImpl D> struct LoggerBase').replace('void log() requires LoggerImpl<D>','void log()');
 writeFileSync(join(dir,'early.cpp'),text);
 run([cpp,...flags,'early.cpp','-o','early'],{fail:true,match:/constraints not satisfied/});
}
console.log('PASS: chapter '+chapter+' normal and relevant negative boundary checks; hardware/performance not tested');
