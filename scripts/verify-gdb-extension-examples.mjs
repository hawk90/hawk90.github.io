#!/usr/bin/env node
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync,readFileSync,writeFileSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {pathToFileURL} from 'node:url';
const base='src/content/blog/tools/debugging/gdb-extension/';
const names=['chapter01-python-api-basics.md','chapter02-commands-events.md','chapter03-pretty-printers.md','chapter04-frame-unwinder.md','chapter05-mi-dap-protocol.md','chapter06-frontends.md'];
const articles=names.map(n=>readFileSync(base+n,'utf8'));
const temp=mkdtempSync(join(tmpdir(),'gdb-extension-'));
const report={timestamp:new Date().toISOString(),temporaryDirectory:temp,checks:[],limitations:['Synthetic x86-64 ELF core supplies memory/registers; no actual inferior instruction, breakpoint hit, FinishBreakpoint return, live stop/exit, GUI, extension installation, remote server, probe or board execution is claimed.','Only named runnable fences are extracted. Version-specific framework illustrations and configuration syntax are not full integration tests.']};
const log='reports/adsense-audit/fixes/gdb-extension-2026-10-23.log';
function run(cmd,args,options={}) {const r=spawnSync(cmd,args,{encoding:'utf8',timeout:60000,...options});if(r.error)throw r.error;assert.equal(r.status,0,`${cmd}: ${r.stderr}\n${r.stdout}`);return r.stdout;}
function fence(i,title){const blocks=[...articles[i].matchAll(/^```\w+ title="([^"]+)"[^\n]*\n([\s\S]*?)^```\s*$/gm)];const m=blocks.find(m=>m[1]===title);assert.ok(m,title);writeFileSync(join(temp,title),m[2]);return m[2];}
try {
 const files=['whereami.py','findstr.py','hello-command.py','verbosity-parameter.py','string-length-function.py','session-hooks.py','return-watch.py','debug-queue-printer.py','argument-decorator.py','toy-unwinder.py','view-rgb.py'];
 for(const [i,titles] of [[0,files.slice(0,2)],[1,files.slice(2,7)],[2,[files[7]]],[3,files.slice(8,10)],[5,[files[10]]]]) for(const title of titles)fence(i,title);
 run('python3',['-c',`import pathlib\nfor p in pathlib.Path(${JSON.stringify(temp)}).glob('*.py'): compile(p.read_text(),str(p),'exec')\nprint('named Python fences compile')`]);
 report.checks.push({name:'11 named Python fences compile',status:'PASS'});
 for(let i=0;i<articles.length;i++)for(const m of articles[i].matchAll(/^```json[^\n]*\n([\s\S]*?)^```\s*$/gm))JSON.parse(m[1]);
 report.checks.push({name:'all JSON configuration fences parse',status:'PASS',scope:'JSON syntax, not adapter schema or editor startup'});
 fence(4,'dap-framing.mjs');
 const {encodeDAP,DAPFramer}=await import(pathToFileURL(join(temp,'dap-framing.mjs')));
 const messages=[{seq:1,type:'request',command:'initialize',arguments:{clientID:'한글😀'}},{seq:2,type:'event',event:'initialized'},{seq:3,type:'response',request_seq:1,command:'initialize',success:true}];
 const wire=Buffer.concat(messages.map(encodeDAP));
 for(let split=0;split<=wire.length;split++){const f=new DAPFramer();assert.deepEqual([...f.push(wire.subarray(0,split)),...f.push(wire.subarray(split))],messages);f.finish();}
 const bytewise=new DAPFramer();assert.deepEqual([...wire].flatMap(b=>bytewise.push(Buffer.from([b]))),messages);bytewise.finish();
 for(const body of ['','0','-1','1048577','9007199254740992','1\r\nContent-Length: 1']){const f=new DAPFramer();assert.throws(()=>f.push(Buffer.from(`Content-Length: ${body}\r\n\r\nx`)));assert.throws(()=>f.push(Buffer.alloc(0)));}
 const malformed=[Buffer.from('Content-Length: 1\r\n\r\n{'),Buffer.concat([Buffer.from('Content-Length: 1\r\n\r\n'),Buffer.from([255])]),Buffer.alloc(8193,65)];
 const nonAscii=Buffer.from('Content-Length: 2\r\n\r\n{}');nonAscii[0]|=128;malformed.push(nonAscii);
 for(const bytes of malformed)assert.throws(()=>new DAPFramer().push(bytes));
 for(const message of [{seq:0,type:'request',command:'x'},{seq:2147483648,type:'event',event:'x'},{seq:1,type:'response',request_seq:0,command:'x',success:true},{seq:1,type:'event'}])assert.throws(()=>encodeDAP(message));
 const truncated=new DAPFramer();truncated.push(wire.subarray(0,-1));assert.throws(()=>truncated.finish());
 report.checks.push({name:'DAP framing every split / bytewise / coalescing / UTF-8 / bounds / malformed / poisoned / truncated',status:'PASS',splitPoints:wire.length+1});
 const gdb=process.env.GDB_EXTENSION_GDB||'/private/tmp/gdb-17.2-article-build/gdb/gdb';
 assert.ok(existsSync(gdb),'set GDB_EXTENSION_GDB to a Python-enabled GDB supporting x86-64 Linux cores');
 const dataDirectory=process.env.GDB_EXTENSION_DATA||'/private/tmp/gdb-17.2-article-build/gdb/data-directory';
 const version=run(gdb,['--data-directory='+dataDirectory,'-nx','-batch','-ex','python import sys; print(sys.version)','-ex','show version']);
 report.checks.push({name:'actual Python-enabled GDB starts',status:'PASS',output:version.trim()});
 const source=`struct Point { int x,y; };\nstruct DebugQueue { int used,capacity,head; int data[4]; };\nstruct Image { int width,height; unsigned char *data; };\nPoint point={3,4};\nDebugQueue queue={3,4,3,{2,3,4,1}}, invalid_queue={0,0,0,{0,0,0,0}}, empty_queue={0,4,0,{0,0,0,0}};\nchar text[]="hello";\nunsigned char pixels[]={255,0,0,0,255,0};\nImage image={2,1,pixels};\nextern "C" __attribute__((noinline)) int toy_unwind_site(int n) { return n+1; }\nint main(){return toy_unwind_site(7);}\n`;
 writeFileSync(join(temp,'fixture.cpp'),source);
 run('/opt/homebrew/opt/llvm/bin/clang++',['--target=x86_64-linux-gnu','-g','-O0','-fno-pie','-fno-stack-protector','-c',join(temp,'fixture.cpp'),'-o',join(temp,'fixture.o')]);
 // Tiny ELF parser constructs only fixture .text/.data/.bss memory and NT_PRSTATUS.
 // This deliberately does not execute or pretend to link a Linux application.
 writeFileSync(join(temp,'make-core.py'),String.raw`import struct,pathlib,json
p=pathlib.Path(__file__).parent
b=(p/'fixture.o').read_bytes()
shoff=struct.unpack_from('<Q',b,40)[0]; shentsize,shnum,shstr=struct.unpack_from('<HHH',b,58)
sections=[struct.unpack_from('<IIQQQQIIQQ',b,shoff+i*shentsize) for i in range(shnum)]
strings=sections[shstr]; names=b[strings[4]:strings[4]+strings[5]]
def cstr(s,o): return s[o:s.index(b'\0',o)].decode()
sec={cstr(names,s[0]):(i,s) for i,s in enumerate(sections)}
addresses={'.text':0x400000,'.data':0x600000,'.bss':0x700000}
loads={i:[addresses[n],bytearray(s[5] if s[1]==8 else b[s[4]:s[4]+s[5]])] for n,(i,s) in sec.items() if n in addresses}
symsec=sec['.symtab'][1]; st=sections[symsec[6]]; strs=b[st[4]:st[4]+st[5]]
syms=[]; symbols={}
for off in range(symsec[4],symsec[4]+symsec[5],symsec[9]):
 name,info,other,idx,val,size=struct.unpack_from('<IBBHQQ',b,off)
 sname=cstr(strs,name); address=loads[idx][0]+val if idx in loads else val
 syms.append((sname,idx,val,address)); symbols[sname]=address
for n,(i,s) in sec.items():
 if s[1]!=4 or s[7] not in loads: continue
 target=loads[s[7]][1]
 for off in range(s[4],s[4]+s[5],s[9]):
  loc,info,addend=struct.unpack_from('<QQq',b,off); typ=info&0xffffffff; symbol=syms[info>>32]
  if typ==1: struct.pack_into('<Q',target,loc,symbol[3]+addend)
  elif typ in (2,4): struct.pack_into('<i',target,loc,symbol[3]+addend-loads[s[7]][0]-loc)
  else: raise AssertionError((n,typ))
stack=0x800000; rbp=stack+0x100; rsp=rbp-0x20
mem=bytearray(4096);struct.pack_into('<QQ',mem,0x100,0,symbols['main']+4)
loads[-1]=[stack,mem]
status=bytearray(336);struct.pack_into('<i',status,32,1234)
regs=[0]*27; regs[4]=rbp;regs[16]=symbols['toy_unwind_site'];regs[17]=0x33;regs[18]=0x202;regs[19]=rsp;regs[20]=0x2b
struct.pack_into('<27Q',status,112,*regs)
note=struct.pack('<III',5,len(status),1)+b'CORE\0\0\0\0'+status
phnum=1+len(loads);off=64+56*phnum
segments=[(4,0,off,0,0,len(note),0,4)];payload=bytearray(note);off+=len(note)
for addr,data in loads.values():
 if not data: continue
 segments.append((1,7,off,addr,0,len(data),len(data),1));payload.extend(data);off+=len(data)
assert len(segments)==phnum
ident=b'\x7fELF'+bytes([2,1,1,0])+bytes(8)
header=ident+struct.pack('<HHIQQQIHHHHHH',4,62,1,0,64,0,0,64,56,phnum,0,0,0)
(p/'fixture.core').write_bytes(header+b''.join(struct.pack('<IIQQQQQQ',*s) for s in segments)+payload)
(p/'symbols.json').write_text(json.dumps(symbols))
`);
 run('python3',[join(temp,'make-core.py')]);
 const syms=JSON.parse(readFileSync(join(temp,'symbols.json')));
 let add=`add-symbol-file ${join(temp,'fixture.o')} 0x400000 -s .data 0x600000 -s .bss 0x700000`;
 writeFileSync(join(temp,'checks.py'),String.raw`import gdb,pathlib
p=pathlib.Path(__file__).parent
for name in ['whereami.py','findstr.py','hello-command.py','verbosity-parameter.py','string-length-function.py','session-hooks.py','return-watch.py','debug-queue-printer.py','argument-decorator.py','view-rgb.py']:
 gdb.execute('source '+str(p/name))
assert int(gdb.parse_and_eval('point.x'))==3
assert [int(gdb.parse_and_eval('queue.data')[i]) for i in range(4)]==[2,3,4,1]
try: gdb.parse_and_eval('queue.data')[0:2]
except TypeError: pass
else: raise AssertionError('slice unexpectedly accepted')
assert gdb.lookup_type('Point').code==gdb.TYPE_CODE_STRUCT
assert gdb.selected_thread().is_stopped()
out=gdb.execute('whereami',to_string=True);assert 'toy_unwind_site' in out,out
out=gdb.execute('hello fixture',to_string=True);assert 'fixture' in out,out
assert int(gdb.parse_and_eval('$strlen2(text, sizeof(text))'))==5
for expression in ['$strlen2(text, -1)','$strlen2(text, 4097)']:
 try: gdb.parse_and_eval(expression)
 except gdb.error: pass
 else: raise AssertionError(expression)
q=gdb.default_visualizer(gdb.parse_and_eval('queue'));assert [int(v) for _,v in q.children()]==[1,2,3]
bad=gdb.default_visualizer(gdb.parse_and_eval('invalid_queue'));assert 'invalid' in bad.to_string() and list(bad.children())==[]
empty=gdb.default_visualizer(gdb.parse_and_eval('empty_queue'));assert '0/4' in empty.to_string() and list(empty.children())==[]
register_debug_queue();assert len([p for p in gdb.pretty_printers if p.name=='article-queue'])==1
s=SessionHooks();s.close();s.close()
assert rgb_layout(1,1)==3 and rgb_layout(4096,1)==12288
for w,h in [(0,1),(-1,1),(4097,1),(4096,4096)]:
 try: rgb_layout(w,h)
 except ValueError: pass
 else: raise AssertionError((w,h))
gdb.execute('view_rgb image '+str(p/'image.ppm'))
assert (p/'image.ppm').read_bytes()==b'P6\n2 1\n255\n\xff\0\0\0\xff\0'
try: gdb.execute('view_rgb image '+str(p/'image.ppm'))
except gdb.error: pass
else: raise AssertionError('overwrote existing file')
address=int(gdb.parse_and_eval('&text[0]'))
out=gdb.execute(f'findstr {address} 6 hello',to_string=True);assert f'{address:#x}' in out,out
out=gdb.execute(f'findstr {address} 6 absent',to_string=True);assert 'not found' in out,out
for command in ['findstr -1 4 x','findstr 0 1048577 x','findstr 0 1 ""','whereami unexpected']:
 try: gdb.execute(command,to_string=True)
 except gdb.error: pass
 else: raise AssertionError(command)
gdb.execute('source '+str(p/'toy-unwinder.py'))
gdb.invalidate_cached_frames();f=gdb.newest_frame();assert f.name()=='toy_unwind_site'
older=f.older();assert older is not None and older.name()=='main',gdb.execute('bt',to_string=True)
assert int(older.read_register('rsp'))==0x800110
assert int(older.read_register('rbp'))==0
assert SmartArgsDecorator(f).frame_args()[0].symbol().name=='n'
print('GDB_EXTENSION_CORE_CHECKS_PASS')
`);
 const output=run(gdb,['--data-directory='+dataDirectory,'-nx','-batch','-ex','set auto-load python-scripts off','-ex','set architecture i386:x86-64','-ex',`core-file ${join(temp,'fixture.core')}`,'-ex',add,'-ex','set language c++','-ex',`source ${join(temp,'checks.py')}`]);
 assert.match(output,/GDB_EXTENSION_CORE_CHECKS_PASS/);
 report.checks.push({name:'actual GDB Python commands/Value/Type/Frame/queue printer/RGB export/unwinder on synthetic ELF core',status:'PASS',output:output.trim(),scope:'static memory/register inspection and custom unwinding, no inferior execution'});
 const miInput=[
  '1-gdb-set auto-load python-scripts off',
  '2-interpreter-exec console "set architecture i386:x86-64"',
  `3-interpreter-exec console "core-file ${join(temp,'fixture.core')}"`,
  `4-interpreter-exec console "${add}"`,
  `5-interpreter-exec console "source ${join(temp,'debug-queue-printer.py')}"`,
  '6-enable-pretty-printing',
  '7-var-create q @ queue',
  '8-var-list-children --all-values q',
  '9-gdb-exit',''].join('\n');
 const mi=run(gdb,['--data-directory='+dataDirectory,'-nx','--interpreter=mi3'],{input:miInput});
 assert.doesNotMatch(mi,/\^error/);assert.match(mi,/7\^done,.*dynamic="1"/);assert.match(mi,/displayhint="array"/);
 for(const n of [1,2,3])assert.match(mi,new RegExp('value="'+n+'"'));
 report.checks.push({name:'actual GDB MI3 token responses / dynamic queue varobj / children',status:'PASS',output:mi.trim(),scope:'read-only synthetic core; no asynchronous running or live stop behavior'});
 report.result='PASS';
} catch(error){report.result='FAIL';report.error=String(error);process.exitCode=1;}
writeFileSync(log,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
