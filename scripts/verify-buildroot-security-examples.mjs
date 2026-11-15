#!/usr/bin/env node
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync,readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {pathToFileURL} from 'node:url';
const source=process.env.BUILDROOT_SECURITY_SOURCE||'/private/tmp/buildroot-article-validation-2026-10-23';
const commit='87e979e4572449ecb7d2058b02d642b38cc3b0f8';
const article=readFileSync('src/content/blog/embedded/buildroot/chapter18-security-cve.md','utf8');
const temp=mkdtempSync(join(tmpdir(),'buildroot-security-'));
const report={timestamp:new Date().toISOString(),source,commit,checks:[],limitations:['Pinned 2024.02 source contracts and extracted actual JSON serializer with synthetic Package inputs only. No complete Buildroot/rootfs/toolchain build, NVD network feed, real CVE applicability, legal compliance determination, SBOM conversion, two-build reproducibility, hardening benchmark or board authentication tested.']};
const log='reports/adsense-audit/fixes/buildroot-security-2026-10-23.log';
function run(cmd,args,options={}){const r=spawnSync(cmd,args,{encoding:'utf8',timeout:30000,...options});if(r.error)throw r.error;assert.equal(r.status,0,r.stderr||r.stdout);return r.stdout;}
try {
 assert.equal(run('git',['-C',source,'rev-parse','HEAD']).trim(),commit);
 const match=article.match(/^```js title="cve-diff.mjs"\n([\s\S]*?)^```\s*$/m);assert.ok(match);const script=join(temp,'cve-diff.mjs');writeFileSync(script,match[1]);
 // Extract the real upstream Package constructor and serializer via AST; do not import network dependencies.
 const fixture=join(temp,'pkg-stats.json');
 writeFileSync(join(temp,'serialize.py'),String.raw`import ast,pathlib,types,collections,json,datetime,sys,os
src=pathlib.Path(sys.argv[1])/'support/scripts/pkg-stats'
tree=ast.parse(src.read_text())
selected=[n for n in tree.body if isinstance(n,ast.ClassDef) and n.name=='Package' or isinstance(n,ast.FunctionDef) and n.name=='dump_json']
env={'os':os,'json':json,'RM_API_STATUS_ERROR':1}
exec(compile(ast.Module(body=selected,type_ignores=[]),str(src),'exec'),env)
p=env['Package'](types.SimpleNamespace(name='BUILDROOT',path='/synthetic'), 'fixture', 'package/fixture/fixture.mk')
p.current_version='test-only';p.cves=['CVE-2099-0001'];p.unsure_cves=['CVE-2099-0002'];p.ignored_cves=['CVE-2099-0003']
env['dump_json']([p],[],collections.defaultdict(int),datetime.date(2026,10,23),sys.argv[3],sys.argv[2])
result=json.loads(pathlib.Path(sys.argv[2]).read_text())
assert set(result)=={'packages','stats','defconfigs','package_status_checks','commit','date'}
assert result['packages']['fixture']['cves']==['CVE-2099-0001']
assert 'name' not in result['packages']['fixture'] and 'tree_path' not in result['packages']['fixture']
print('actual upstream Package/dump_json synthetic fixture PASS')
`);
 run('python3',[join(temp,'serialize.py'),source,fixture,commit]);
 const {findings,addedFindings}=await import(pathToFileURL(script));
 const current=JSON.parse(readFileSync(fixture));
 assert.equal(findings(current).size,2);assert.deepEqual(addedFindings(current,current),[]);
 const before=structuredClone(current);before.packages.fixture.cves=[];before.packages.fixture.unsure_cves=[];
 assert.deepEqual(addedFindings(before,current).map(x=>[x.id,x.kind]),[['CVE-2099-0001','cves'],['CVE-2099-0002','unsure_cves']]);
 const moved=structuredClone(before);moved.packages.fixture.unsure_cves=['CVE-2099-0001'];assert.equal(addedFindings(moved,current).length,2);
 const repeated=structuredClone(current);repeated.packages.fixture.cves.push('CVE-2099-0001');assert.equal(findings(repeated).size,2);
 for(const value of [null,{}, {packages:[]},{packages:{}},{packages:{p:null}},{packages:{p:{cves:[],unsure_cves:'bad'}}},{packages:{p:{cves:[{id:'CVE-2099-0001'}],unsure_cves:[]}}},{packages:{p:{cves:['bad'],unsure_cves:[]}}}])assert.throws(()=>findings(value));
 writeFileSync(join(temp,'previous.json'),JSON.stringify(before));writeFileSync(join(temp,'bad.json'),'{');
 for(const [args,status] of [[[fixture,fixture],0],[[join(temp,'previous.json'),fixture],1],[[join(temp,'bad.json'),fixture],2],[[],2]]){
  const r=spawnSync(process.execPath,[script,...args],{encoding:'utf8'});assert.equal(r.status,status,r.stderr||r.stdout);
 }
 // CLI path containing spaces exercises URL/path handling in the actual article fence.
 const spaced=join(temp,'CVE diff.mjs');writeFileSync(spaced,match[1]);run(process.execPath,[spaced,fixture,fixture]);
 report.checks.push({name:'actual pinned upstream serializer + article parser/CLI',status:'PASS',cases:'real field layout, strings not CVE objects, certain+uncertain, ignore excluded, duplicates, moved confidence, invalid/empty schema, malformed JSON, statuses0/1/2, spaces in script path'});
 const utils=readFileSync(join(source,'package/pkg-utils.mk'),'utf8');const makefile=readFileSync(join(source,'Makefile'),'utf8');
 const helper=utils.match(/^define legal-manifest[^\n]*\n([\s\S]*?)^endef/m);assert.ok(helper);
 const header=makefile.split('\n').find(line=>line.includes('$(call legal-manifest,TARGET,PACKAGE,'));assert.ok(header);
 const csv=join(temp,'manifest.csv');writeFileSync(join(temp,'manifest.mk'),`LEGAL_MANIFEST_CSV_TARGET := ${csv}\ndefine legal-manifest\n${helper[1]}endef\nall:\n${header}\n`);
 run('make',['-f',join(temp,'manifest.mk')]);
 const cols=JSON.parse(run('python3',['-c','import csv,json,sys; print(json.dumps(next(csv.reader(open(sys.argv[1])))))',csv]));
 assert.deepEqual(cols,['PACKAGE','VERSION','LICENSE','LICENSE FILES','SOURCE ARCHIVE','SOURCE SITE','DEPENDENCIES WITH LICENSES']);
 report.checks.push({name:'actual legal-manifest make helper/header',status:'PASS',columns:cols});
 for(const absent of ['BR2_REPRODUCIBLE_PATH','BR2_LEGAL_INFO_EXTRA','DOES_NOT_USE_PIC']){
  const r=spawnSync('git',['-C',source,'grep','-n',absent],{encoding:'utf8'});assert.equal(r.status,1,absent+': '+r.stdout);
 }
 const config=readFileSync(join(source,'Config.in'),'utf8');for(const symbol of ['BR2_RELRO_FULL','BR2_SSP_STRONG','BR2_PIC_PIE','BR2_FORTIFY_SOURCE_2'])assert.match(config,new RegExp('^config '+symbol+'$','m'));
 const sys=readFileSync(join(source,'system/Config.in'),'utf8');assert.match(sys,/config BR2_TARGET_ENABLE_ROOT_LOGIN/);assert.match(sys,/signs in the hashed password must be doubled/);
 report.checks.push({name:'pinned option existence/absence and password escaping contracts',status:'PASS',scope:'source contract, not configured image or authentication test'});
 report.result='PASS';
} catch(error){report.result='FAIL';report.error=error.stack;process.exitCode=1;}
writeFileSync(log,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
