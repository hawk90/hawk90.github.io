#!/usr/bin/env node
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
const names = { '01': 'intrusive-containers', '02': 'etl-library', '03': 'lock-free-basics', '04': 'lock-free-container', '05': 'type-safe-flags', '06': 'state-machine', '07': 'compile-time-fsm', '08': 'singleton-alternatives' };
const chapter = process.argv[2]; assert.ok(names[chapter], 'Pass chapter 01..08');
const path = `src/content/blog/embedded/embedded-cpp/part4-${chapter}-${names[chapter]}.md`;
const source = readFileSync(path, 'utf8');
const work = mkdtempSync(join(tmpdir(), `cpp-part4-${chapter}-`));
const blocks = [...source.matchAll(/^```[\w+]+ title="([^"]+)"\n([\s\S]*?)^```/gm)];
assert.ok(blocks.length); assert.equal(blocks.length, new Set(blocks.map(b => b[1])).size);
for (const [, name, content] of blocks) { mkdirSync(dirname(join(work, name)), { recursive: true }); writeFileSync(join(work, name), content); }
function run(command, args, { fail } = {}) {
  const r = spawnSync(command, args, { cwd: work, encoding: 'utf8', timeout: 30000 });
  const out = (r.stdout ?? '') + (r.stderr ?? '');
  console.log(`$ ${command} ${args.join(' ')}\n${out.trim()}\nstatus=${r.status} signal=${r.signal}`);
  if (r.error) throw r.error;
  if (fail) { assert.notEqual(r.status, 0); assert.match(out, fail); } else assert.equal(r.status, 0, out);
  return out;
}
const cxx = process.env.EMBEDDED_CXX ?? 'clang++';
const flags = ['-std=c++17', '-Wall', '-Wextra', '-Werror', '-pthread', '-fsanitize=address,undefined', '-fno-sanitize-recover=all'];
function build(file, output, extra = []) { run(cxx, [...flags, ...extra, file, '-o', output]); return run(join(work, output), []); }
function fail(file, macro, regex) { run(cxx, ['-std=c++17', '-D' + macro, '-fsyntax-only', file], { fail: regex }); }
function etl() {
  assert.ok(process.env.ETL_INCLUDE, 'Set ETL_INCLUDE to ETL 20.49.0 include directory');
  const include = resolve(process.env.ETL_INCLUDE); assert.ok(existsSync(join(include, 'etl/fsm.h'))); return ['-I', include];
}
console.log(`Article: ${path}\nWorkspace: ${work}`); run(cxx, ['--version']);
if (chapter === '01') { assert.match(build('intrusive-check.cpp', 'intrusive-check'), /membership checks passed/); fail('intrusive-check.cpp', 'BAD_COPY', /deleted constructor/); }
if (chapter === '02') {
  assert.match(build('etl-capacity-check.cpp', 'etl-capacity-check', [...etl(), '-DETL_THROW_EXCEPTIONS', '-DETL_CHECK_PUSH_POP']), /etl=20\.49\.0 full=detected string=truncated delegate=42/);
  assert.match(build('etl-fsm-check.cpp', 'etl-fsm-check', etl()), /etl fsm start\/unknown\/stop passed/);
}
if (chapter === '03') {
  assert.match(build('atomic-check.cpp', 'atomic-check'), /publication=42 cas-mismatch=7 cas-success=9/);
  for (const cpu of ['cortex-m0', 'cortex-m4']) run(cxx, ['--target=arm-none-eabi', '-mcpu=' + cpu, '-mthumb', '-std=c++17', '-O2', '-c', 'arm-atomic.cpp', '-o', cpu + '.o']);
  const m4 = run('llvm-objdump', ['-d', 'cortex-m4.o']); assert.match(m4, /ldrex/); assert.match(m4, /strex/);
  assert.match(run('llvm-nm', ['-u', 'cortex-m0.o']), /__atomic_fetch_add_4/);
}
if (chapter === '04') { assert.match(build('spsc-check.cpp', 'spsc-check'), /count=100000/); fail('spsc-check.cpp', 'BAD_CAPACITY', /static assertion failed/); }
if (chapter === '05') { assert.match(build('flags-check.cpp', 'flags-check'), /flags compound\/any\/all\/field\/tag checks passed/); fail('flags-check.cpp', 'BAD_ENUM_MIX', /invalid operands|no viable overloaded/); fail('flags-check.cpp', 'BAD_TAG_MIX', /no viable overloaded|no viable conversion/); }
if (chapter === '06') { assert.match(build('media-table.cpp', 'media-table'), /table media sequence/); assert.match(build('etl-media.cpp', 'etl-media', etl()), /etl media play\/pause\/resume\/stop/); }
if (chapter === '07') { assert.match(build('variant-visit.cpp', 'variant-visit'), /variant fallback keeps invalid runtime state\/event passed/); fail('variant-visit.cpp', 'BAD_VISIT_FALLBACK', /Unhandled variant alternative/); assert.match(build('compile-fsm.cpp', 'compile-fsm'), /compile-time checks and runtime event sequence passed/); fail('compile-fsm.cpp', 'BAD_TRANSITION', /Invalid state transition/); fail('compile-fsm.cpp', 'BAD_REACHABILITY', /Unreachable state/); }
if (chapter === '08') { assert.match(build('di-check.cpp', 'di-check'), /fake injection\/locator lifetime\/phantom tag checks passed/); fail('di-check.cpp', 'BAD_PHANTOM_TAG', /no matching function|no viable conversion/); }
console.log(`PASS Embedded C++ part4-${chapter} scoped examples. Board/ISR/WCET not executed.`);
