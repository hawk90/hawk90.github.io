import assert from 'node:assert/strict';import{spawnSync}from'node:child_process';import{mkdirSync,mkdtempSync,readFileSync,writeFileSync}from'node:fs';import{dirname,join}from'node:path';import{tmpdir}from'node:os';
const names={'02':'compiler-flags','03':'runtime-requirements'};const chapter=process.argv[2];assert.ok(names[chapter]);const work=mkdtempSync(join(tmpdir(),'embedded-cpp-basics-'+chapter+'-'));
const article=readFileSync(`src/content/blog/embedded/embedded-cpp/part1-${chapter}-${names[chapter]}.md`,'utf8');const blocks=[...article.matchAll(/^```[\w+]+ title="([^"]+)"\n([\s\S]*?)^```/gm)];assert.ok(blocks.length);assert.equal(new Set(blocks.map(b=>b[1])).size,blocks.length);
for(const[,p,t]of blocks){mkdirSync(dirname(join(work,p)),{recursive:true});writeFileSync(join(work,p),t);}
function run(cmd,args,{fail}={}){const r=spawnSync(cmd,args,{cwd:work,encoding:'utf8',timeout:30000});const out=(r.stdout??'')+(r.stderr??'');console.log(`$ ${cmd} ${args.join(' ')}\n${out.trim()}\nstatus=${r.status} signal=${r.signal}`);if(r.error)throw r.error;if(fail){assert.notEqual(r.status,0);assert.match(out,fail);}else assert.equal(r.status,0,out);return out;}
const cxx=process.env.EMBEDDED_CXX??'clang++';const compile=(source,out,flags=[],options)=>run(cxx,['--target=x86_64-unknown-linux-gnu','-std=c++17',...flags,'-c',source,'-o',out],options);
console.log('Workspace: '+work);run(cxx,['--version']);
if(chapter==='02'){
 compile('flags.cpp','up.o',['-fno-rtti']);compile('flags.cpp','down.o',['-fno-rtti','-DDOWNCAST'],{fail:/dynamic_cast.*requires.*rtti/i});compile('flags.cpp','throw.o',['-fno-exceptions','-DTHROW'],{fail:/throw.*exceptions disabled/});
 assert.match(run('llvm-nm',['-u','up.o']),/__cxa_guard_acquire/);compile('flags.cpp','unguarded.o',['-fno-threadsafe-statics']);assert.doesNotMatch(run('llvm-nm',['-u','unguarded.o']),/__cxa_guard/);
 compile('registration.cpp','cxa.o');compile('registration.cpp','plain.o',['-fno-use-cxa-atexit']);assert.match(run('llvm-nm',['-u','cxa.o']),/__cxa_atexit/);const plain=run('llvm-nm',['-u','plain.o']);assert.match(plain,/\batexit/);assert.doesNotMatch(plain,/__cxa_atexit/);
}
if(chapter==='03'){
 run(cxx,['--target=arm-none-eabi','-mcpu=cortex-m0','-mthumb','-std=c++17','-O1','-c','widths.cpp','-o','widths.o']);
 const undefineds=run('llvm-nm',['-u','widths.o']);assert.match(undefineds,/__aeabi_uidiv/);assert.match(undefineds,/__aeabi_uldivmod/);assert.match(undefineds,/__aeabi_fmul/);
 run(cxx,['-std=c++17','-Wall','-Wextra','-Werror','-fsanitize=undefined','-fno-sanitize-recover=all','heap-window.cpp','-o','heap-window']);
 assert.match(run(join(work,'heap-window'),[]),/heap bounds and signed-minimum checks passed/);
}
console.log(`PASS Embedded C++ basics ${chapter}`);
