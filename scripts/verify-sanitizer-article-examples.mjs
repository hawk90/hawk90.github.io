import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdirSync,mkdtempSync,readFileSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
const names={'01':'intro','02':'asan-ubsan','03':'lsan-leaks','04':'tsan','05':'cmake-ci'};
const chapter=process.argv[2];assert.ok(names[chapter],'Pass chapter 01~05');
const root=fileURLToPath(new URL('../',import.meta.url));
const article=readFileSync(join(root,`src/content/blog/tools/debugging/sanitizers/chapter${chapter}-${names[chapter]}.md`),'utf8');
const work=mkdtempSync(join(tmpdir(),`sanitizers-ch${chapter}-`));
const compiler=process.env.SAN_CXX??'clang++';
const env={...process.env};
for(const k of ['ASAN_OPTIONS','UBSAN_OPTIONS','TSAN_OPTIONS','LSAN_OPTIONS','MSAN_OPTIONS','CFLAGS','CXXFLAGS','LDFLAGS'])delete env[k];
const blocks=[...article.matchAll(/^```[\w+]+ title="([^"]+)"\n([\s\S]*?)^```/gm)];
assert.ok(blocks.length);assert.equal(new Set(blocks.map(b=>b[1])).size,blocks.length);
function write(path,text){mkdirSync(dirname(join(work,path)),{recursive:true});writeFileSync(join(work,path),text);}
for(const [,path,text] of blocks)write(path,text);
function run(command,args,{options={},fail,signal=false}={}){
 const r=spawnSync(command,args,{cwd:work,encoding:'utf8',timeout:30000,env:{...env,...options}});
 const output=(r.stdout??'')+(r.stderr??'');console.log(`$ ${command} ${args.join(' ')}\n${output.trim()}\nstatus=${r.status} signal=${r.signal}`);
 if(r.error)throw r.error;
 if(fail){assert.ok(r.status!==0);assert.match(output,fail);}else if(signal)assert.ok(r.signal);else assert.equal(r.status,0,output);
 return output;
}
const execute=(name,options)=>run(join(work,name),[],options);
const build=(source,name,flags=[])=>run(compiler,['-std=c++17','-g','-O1','-fno-omit-frame-pointer',...flags,source,'-o',name]);
console.log(`Workspace: ${work}`);run(compiler,['--version']);
if(chapter==='01'){
 build('publication.cpp','publication',['-fsanitize=thread']);
 const output=execute('publication',{options:{TSAN_OPTIONS:'halt_on_error=1'}});
 assert.match(output,/data=42/);assert.doesNotMatch(output,/WARNING: ThreadSanitizer/);
}
if(chapter==='02'){
 build('bounds.cpp','bounds',['-fsanitize=address']);
 assert.match(execute('bounds',{options:{ASAN_OPTIONS:'detect_leaks=0'}}),/value=42/);
 run(join(work,'bounds'),['bad'],{options:{ASAN_OPTIONS:'detect_leaks=0'},fail:/AddressSanitizer: heap-buffer-overflow/});
 run(compiler,['-std=c++17','-g','-O1','-fsanitize=address','-c','bounds.cpp','-o','bounds.o']);
 run(compiler,['bounds.o','-o','missing-runtime'],{fail:/(__asan|___asan)/});
 build('overflow.cpp','overflow',['-fsanitize=undefined']);
 const recovering=execute('overflow');assert.match(recovering,/signed integer overflow/);assert.match(recovering,/continued/);
 const halted=execute('overflow',{options:{UBSAN_OPTIONS:'halt_on_error=1'},fail:/signed integer overflow/});assert.doesNotMatch(halted,/continued/);
 build('overflow.cpp','trap',['-fsanitize=undefined','-fsanitize-trap=undefined']);execute('trap',{signal:true});
}
if(chapter==='03'){
 build('leak-check.cpp','leak-check',['-fsanitize=leak']);
 const options={LSAN_OPTIONS:'leak_check_at_exit=0'};
 const leak=execute('leak-check',{options});assert.match(leak,/reachable=0 after=1/);assert.match(leak,/Direct leak/);assert.match(leak,/Indirect leak of 80/);
 const clean=run(join(work,'leak-check'),['free'],{options});assert.match(clean,/reachable=0 after=0/);assert.doesNotMatch(clean,/detected memory leaks/);
}
if(chapter==='04'){
 build('publication-race.cpp','race',['-fsanitize=thread']);
 execute('race',{options:{TSAN_OPTIONS:'halt_on_error=1'},fail:/ThreadSanitizer: data race/});
 build('publication-race.cpp','safe',['-fsanitize=thread','-DSAFE']);
 const safe=execute('safe',{options:{TSAN_OPTIONS:'halt_on_error=1'}});assert.match(safe,/data=42/);assert.doesNotMatch(safe,/WARNING: ThreadSanitizer/);
}
if(chapter==='05'){
 const presets=JSON.parse(readFileSync(join(work,'CMakePresets.json'),'utf8'));assert.equal(presets.version,6);assert.equal(presets.cmakeMinimumRequired.minor,25);
 for(const preset of ['release','asan','tsan']){
  run('cmake',['--preset',preset,'-DCMAKE_CXX_COMPILER='+compiler]);
  run('cmake',['--build','--preset',preset]);
  if(preset==='release')run('ctest',['--test-dir','build/release','--output-on-failure','--no-tests=error']);
  else run('ctest',['--preset',preset,'--no-tests=error']);
  assert.match(execute('build/'+preset+'/test_runner'),/answer=42/);
 }
 run('cmake',['-S','.','-B','invalid','-DENABLE_ASAN=ON','-DENABLE_TSAN=ON'],{fail:/cannot coexist/});
 if(process.platform==='darwin')run('cmake',['-S','.','-B','msan','-DENABLE_MSAN=ON','-DCMAKE_CXX_COMPILER='+compiler],{fail:/requires Linux|requires upstream Clang/});
 const main=readFileSync(join(work,'CMakeLists.txt'),'utf8').replace('enable_sanitizers(test_runner)','');write('CMakeLists.txt',main);
 run('cmake',['-S','.','-B','static-consumer','-G','Ninja','-DENABLE_ASAN=ON','-DCMAKE_CXX_COMPILER='+compiler]);run('cmake',['--build','static-consumer']);run('ctest',['--test-dir','static-consumer','--output-on-failure','--no-tests=error']);
}
console.log(`PASS Sanitizers chapter ${chapter}`);
