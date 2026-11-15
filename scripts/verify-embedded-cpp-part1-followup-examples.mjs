#!/usr/bin/env node
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
const names = { '05': 'abi-compatibility', '06': 'startup-code', '07': 'linker-scripts', '08': 'cpp-standard-choice' };
const chapter = process.argv[2];
assert.ok(names[chapter], 'Usage: node scripts/verify-embedded-cpp-part1-followup-examples.mjs 05|06|07|08');
const path = `src/content/blog/embedded/embedded-cpp/part1-${chapter}-${names[chapter]}.md`;
const source = readFileSync(path, 'utf8');
const work = mkdtempSync(join(tmpdir(), `cpp-part1-followup-${chapter}-`));
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
const cc = process.env.EMBEDDED_CC ?? 'clang';
const armFlags = ['--target=arm-none-eabi', '-mcpu=cortex-m4', '-mthumb', '-std=c++17', '-O0'];
console.log(`Article: ${path}\nWorkspace: ${work}`); run(cxx, ['--version']);
if (chapter === '05') {
  run(cc, ['-std=c11', '-Wall', '-Wextra', '-Werror', '-c', 'abi-caller.c', '-o', 'caller.o']);
  run(cxx, ['-std=c++17', '-Wall', '-Wextra', '-Werror', '-c', 'abi-library.cpp', '-o', 'library.o']);
  run(cxx, ['caller.o', 'library.o', '-o', 'abi-check']); run(join(work, 'abi-check'), []);
  run(cxx, ['-std=c++17', '-DBAD_LINKAGE', '-c', 'abi-library.cpp', '-o', 'bad.o']);
  run(cxx, ['caller.o', 'bad.o', '-o', 'bad-check'], { fail: /undefined symbols|undefined reference/i });
  run(cxx, [...armFlags, '-c', 'abi-library.cpp', '-o', 'arm.o']);
  const symbols = run('llvm-nm', ['arm.o']);
  for (const symbol of ['abi_add', 'abi_probe', '_Z10overloadedi', '_Z10overloadedd']) assert.match(symbols, new RegExp(`\\b${symbol}\\b`));
}
if (chapter === '06') {
  run(cxx, ['-std=c++20', '-Wall', '-Wextra', '-Werror', 'constant-init.cpp', '-o', 'constant-init']);
  run(join(work, 'constant-init'), []);
  run(cxx, ['-std=c++20', '-DBAD_TRIVIAL_ASSERT', '-fsyntax-only', 'constant-init.cpp'], { fail: /static assertion failed/ });
  run(cxx, [...armFlags, '-c', 'dynamic-init.cpp', '-o', 'dynamic-init.o']);
  const sections = run('llvm-readelf', ['-SW', 'dynamic-init.o']);
  assert.match(sections, /\.init_array\s+INIT_ARRAY\s+\S+\s+\S+\s+000004\b/);
  const relocs = run('llvm-readelf', ['-r', 'dynamic-init.o']);
  assert.match(relocs, /\.rel.init_array/); assert.match(relocs, /_GLOBAL__sub_I/);
  const symbols = run('llvm-nm', ['--demangle', 'dynamic-init.o']);
  assert.match(symbols, /\bfirst\b/); assert.match(symbols, /\bsecond\b/);
  console.log('Observed two objects and one 32-bit init-array entry; board reset/newlib link not run.');
}
if (chapter === '07') {
  run(cxx, [...armFlags, '-fno-exceptions', '-fno-rtti', '-c', 'placement.cpp', '-o', 'placement.o']);
  const sections = run('llvm-readelf', ['-SW', 'placement.o']);
  assert.match(sections, /\.dma\s+PROGBITS\s+\S+\s+\S+\s+001000\s+\S+\s+\S+\s+\d+\s+\d+\s+4\b/);
  assert.match(sections, /\.ccmram\s+PROGBITS\s+\S+\s+\S+\s+001000\s+\S+\s+\S+\s+\d+\s+\d+\s+8\b/);
  const symbols = run('llvm-nm', ['--demangle', 'placement.o']); assert.match(symbols, /vtable for Sensor/);
  const relocs = run('llvm-readelf', ['-r', 'placement.o']); assert.match(relocs, /_ZTV6Sensor/);
  console.log('NOT RUN: final GNU ld placement/NOLOAD/overflow test, startup copy/zero and hardware DMA.');
}
if (chapter === '08') {
  const buildRun = (standard, flags, output) => { run(cxx, [`-std=c++${standard}`, '-pedantic-errors', ...flags, 'standard-probe.cpp', '-o', output]); return run(join(work, output), []); };
  assert.match(buildRun('17', [], 'probe17'), /cplusplus=201703/);
  assert.match(buildRun('20', ['-DREQUIRE_SPAN'], 'probe20'), /span=42/);
  assert.match(buildRun('23', ['-DREQUIRE_EXPECTED'], 'probe23'), /expected=42,error=5/);
  run(cxx, ['-std=c++17', '-DREQUIRE_SPAN', 'standard-probe.cpp', '-o', 'missing-span'], { fail: /span support required/ });
  run(cxx, ['-std=c++20', '-DREQUIRE_EXPECTED', 'standard-probe.cpp', '-o', 'missing-expected'], { fail: /expected support required/ });
  console.log('Host language/library probes only; vendor target library and qualification not run.');
}
console.log(`PASS Embedded C++ part1-${chapter} scoped examples`);
