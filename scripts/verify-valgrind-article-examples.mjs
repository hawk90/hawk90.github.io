import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdirSync,mkdtempSync,readFileSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname,join} from 'node:path';
const chapter=process.argv[2],fixturesOnly=process.argv.includes('--fixtures-only');
const names={'01':'intro','02':'memcheck','03':'leak-report','04':'helgrind-drd','05':'suppressions'};
assert.ok(names[chapter],'Pass chapter 01~05');
const article=readFileSync(`src/content/blog/tools/debugging/valgrind/chapter${chapter}-${names[chapter]}.md`,'utf8');
const work=mkdtempSync(join(tmpdir(),`valgrind-ch${chapter}-`));
const blocks=[...article.matchAll(/^```[\w+]+ title="([^"]+)"\n([\s\S]*?)^```/gm)];assert.ok(blocks.length);
assert.equal(new Set(blocks.map(b=>b[1])).size,blocks.length);
for(const [,path,text] of blocks){mkdirSync(dirname(join(work,path)),{recursive:true});writeFileSync(join(work,path),text);}
function run(command,args,{fail,nonzero}={}){
 const r=spawnSync(command,args,{cwd:work,encoding:'utf8',timeout:30000});const output=(r.stdout??'')+(r.stderr??'');
 console.log(`$ ${command} ${args.join(' ')}\n${output.trim()}\nstatus=${r.status} signal=${r.signal}`);
 if(r.error)throw r.error;
 if(nonzero)assert.ok(r.status!==0);else if(fail){assert.ok(r.status!==0);assert.match(output,fail);}else assert.equal(r.status,0,output);
 return output;
}
const cc=process.env.VG_CC??'clang',cxx=process.env.VG_CXX??'clang++';
console.log(`Workspace: ${work}`);run(cc,['--version']);
for(const [,name]of blocks.filter(b=>/\.(c|cpp)$/.test(b[1])))run(name.endsWith('.cpp')?cxx:cc,['-g','-O0',name,'-o',name.replace(/\.(c|cpp)$/,''),'-pthread']);
const execute=(name,args=[])=>run(join(work,name),args);
if(chapter==='01')execute('leak',['free']);
if(chapter==='02')assert.match(execute('bounds'),/value=42/);
if(chapter==='03')execute('graph',['free']);
if(chapter==='04')assert.match(execute('counter'),/counter=4000/);
if(chapter==='05')execute('suppression-case',['clean']);
if(fixturesOnly){console.log(`PASS native fixtures chapter ${chapter}; NOT RUN Valgrind analysis`);process.exit(0);}
if(process.platform!=='linux')throw Error('Use supported Linux for full Valgrind validation; --fixtures-only explicitly limits verification.');
run('valgrind',['--version']);
if(chapter==='01'){
 run('valgrind',['--leak-check=full','--error-exitcode=97','./leak'],{fail:/definitely lost/});
 run('valgrind',['--leak-check=full','--error-exitcode=97','./leak','free']);
}
if(chapter==='02'){
 run('valgrind',['--error-exitcode=97','./bounds']);
 run('valgrind',['--error-exitcode=97','./bounds','bad'],{fail:/Invalid write of size 1/});
}
if(chapter==='03'){
 const flags=['--leak-check=full','--show-leak-kinds=all','--error-exitcode=97'];
 assert.match(run('valgrind',[...flags,'./graph','keep']),/still reachable/);
 run('valgrind',[...flags,'./graph','lost'],{fail:/definitely lost/});
 run('valgrind',[...flags,'./graph','free']);
}
if(chapter==='04'){
 run(cxx,['-g','-O0','-pthread','-DRACY','counter.cpp','-o','racy']);
 for(const tool of ['helgrind','drd']){
  run('valgrind',['--tool='+tool,'--error-exitcode=97','./counter']);
  run('valgrind',['--tool='+tool,'--error-exitcode=97','./racy'],{fail:/Possible data race|Conflicting (load|store)/});
 }
}
if(chapter==='05'){
 const flags=['--leak-check=full','--error-exitcode=97'];
 run('valgrind',[...flags,'./suppression-case'],{fail:/definitely lost/});
 const suppressed=run('valgrind',[...flags,'--suppressions=fixture.supp','./suppression-case'],{fail:/32 bytes in 1 blocks are definitely lost/});
 assert.match(suppressed,/suppressed:\s+16 bytes/);
 run('valgrind',[...flags,'./suppression-case','clean']);
}
console.log(`PASS Valgrind chapter ${chapter}`);
