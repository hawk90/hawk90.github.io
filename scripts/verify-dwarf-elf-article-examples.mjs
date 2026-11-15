import assert from 'node:assert/strict';import{spawnSync}from'node:child_process';import{mkdirSync,mkdtempSync,readFileSync,writeFileSync}from'node:fs';import{tmpdir}from'node:os';import{dirname,join}from'node:path';
const names={'01':'elf-overview','02':'dwarf-overview','03':'debug-line','04':'debug-loc','05':'cfi-eh-frame','06':'split-dwarf-tools'};
const chapter=process.argv[2];assert.ok(names[chapter]);const work=mkdtempSync(join(tmpdir(),'dwarf-elf-ch'+chapter+'-'));
const article=readFileSync(`src/content/blog/tools/debugging/dwarf-elf/chapter${chapter}-${names[chapter]}.md`,'utf8');
const blocks=[...article.matchAll(/^```[\w+]+ title="([^"]+)"\n([\s\S]*?)^```/gm)];assert.ok(blocks.length);assert.equal(new Set(blocks.map(b=>b[1])).size,blocks.length);
for(const[,p,t]of blocks){mkdirSync(dirname(join(work,p)),{recursive:true});writeFileSync(join(work,p),t);}
function run(cmd,args,{fail}={}){const r=spawnSync(cmd,args,{cwd:work,encoding:'utf8',timeout:30000});const out=(r.stdout??'')+(r.stderr??'');console.log(`$ ${cmd} ${args.join(' ')}\n${out.trim()}\nstatus=${r.status} signal=${r.signal}`);if(r.error)throw r.error;if(fail){assert.notEqual(r.status,0);assert.match(out,fail);}else assert.equal(r.status,0,out);return out;}
const clang=process.env.DWARF_CC??'clang';const compile=(src,out,flags=[])=>run(clang,['--target=x86_64-unknown-linux-gnu','-g','-O0',...flags,'-c',src,'-o',out]);
console.log('Workspace: '+work);run(clang,['--version']);run('llvm-dwarfdump',['--version']);
if(chapter==='01'){
 compile('sections.c','sections.o');const headers=run('llvm-readelf',['-h','-S','-s','-r','sections.o']);for(const p of [/ELF64/,/REL \(Relocatable file\)/,/\.bss\s+NOBITS/,/UND external/,/compute/,/initialized/])assert.match(headers,p);
 assert.match(run('llvm-readelf',['-l','sections.o']),/There are no program headers/);
 writeFileSync(join(work,'invalid.o'),'invalid');run('llvm-readelf',['-h','invalid.o'],{fail:/not recognized|Invalid|invalid|too small/});
}
if(chapter==='02'){
 compile('types.c','types.o',['-gdwarf-5']);
 const info=run('llvm-dwarfdump',['--debug-info','--show-form','types.o']);assert.match(info,/format = DWARF32/);assert.match(info,/DW_TAG_structure_type/);assert.match(info,/DW_AT_data_member_location/);
 run('llvm-dwarfdump',['--verify','types.o']);
 compile('types.c','types64.o',['-gdwarf-5','-gdwarf64']);assert.match(run('llvm-dwarfdump',['--debug-info','types64.o']),/format = DWARF64/);
 run(clang,['-std=c11','-Wall','-Wextra','-Werror','uleb.c','-o','uleb']);assert.match(run(join(work,'uleb'),[]),/checks passed/);
}
if(chapter==='03'){
 for(const version of [4,5]){
  compile('lines.c','lines'+version+'.o',['-gdwarf-'+version]);run('llvm-dwarfdump',['--verify','lines'+version+'.o']);
  assert.match(run('python3',['decode-line.py','lines'+version+'.o','0']),/lines.c:1/);
  run('python3',['decode-line.py','lines'+version+'.o','0xffff'],{fail:/not found/});
 }
 run('llvm-dwarfdump',['--debug-line','lines5.o']);
 run('python3',['-c',"import runpy; m=runpy.run_path('decode-line.py'); f=m['file_index']; assert f(4,1)==0 and f(5,0)==0 and f(5,1)==1; print('index boundaries passed')"]);
}
if(chapter==='04'){
 for(const version of [4,5])for(const level of [0,2]){
  const obj='locals'+version+level+'.o';compile('locals.c',obj,['-gdwarf-'+version,'-O'+level]);run('llvm-dwarfdump',['--verify',obj]);
  const output=run('python3',['locations.py',obj]);assert.match(output,/global LocationExpr/);assert.match(output,/tracked (LocationExpr|list)/);
 }
 run('llvm-dwarfdump',['--debug-info','--debug-loclists','locals52.o']);
 assert.match(run('python3',['expr-bytes.py']),/typed size=4 type_offset=64/);
}
if(chapter==='05'){
 run(clang,['--target=x86_64-unknown-linux-gnu','-c','rules.S','-o','rules.o']);
 const frame=run('llvm-dwarfdump',['--eh-frame','rules.o']);assert.match(frame,/DW_CFA_undefined/);assert.match(frame,/DW_CFA_same_value/);
 assert.match(run('python3',['cfi.py','rules.o']),/undefined and same_value remain distinct/);
}
if(chapter==='06'){
 compile('tools.c','full.o',['-gdwarf-5','-O2']);compile('tools.c','split.o',['-gdwarf-5','-O2','-gsplit-dwarf']);
 assert.match(run('llvm-dwarfdump',['--debug-info','split.o']),/DW_UT_skeleton/);
 run('llvm-dwp',['split.dwo','-o','package.dwp']);assert.match(run('llvm-readelf',['-S','package.dwp']),/\.debug_cu_index/);
 run('llvm-objcopy',['--compress-debug-sections=zlib','full.o','compressed.o']);run('llvm-dwarfdump',['--verify','full.o']);run('llvm-dwarfdump',['--verify','compressed.o']);
 const normal=run('python3',['elf-summary.py','full.o']);assert.match(normal,/leaf/);assert.match(normal,/observed_origins=.*leaf/);
 assert.equal(run('python3',['elf-summary.py','compressed.o']),normal);
 run('python3',['-c',"from elftools.elf.elffile import ELFFile; f=open('compressed.o','rb'); e=ELFFile(f); assert e.get_section_by_name('.debug_info')['sh_flags'] & 0x800; assert e.get_section_by_name('.zdebug_info') is None; print('ELF compression flag verified')"]);
}
console.log(`PASS DWARF ELF chapter ${chapter}`);
