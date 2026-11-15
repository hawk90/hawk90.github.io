import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
const chapter = process.argv[2];
assert.match(chapter ?? '', /^(0[1-9]|10)$/);
const directory = 'src/content/blog/embedded/embedded-cpp';
const file = readdirSync(directory).find(name => name.startsWith(`part3-${chapter}-`));
const text = readFileSync(join(directory, file), 'utf8');
const work = mkdtempSync(join(tmpdir(), `embedded-cpp-part3-${chapter}-`));
const blocks = [...text.matchAll(/^```cpp title="([^"]+)"\n([\s\S]*?)^```/gm)];
assert.ok(blocks.length > 0);
for (const [, name, code] of blocks) {
  const target = join(work, name);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, code);
}
function run(command, args, failure) {
  const result = spawnSync(command, args, { cwd: work, encoding: 'utf8', timeout: 30000 });
  const output = (result.stdout ?? '') + (result.stderr ?? '');
  console.log(`$ ${command} ${args.join(' ')}\n${output.trim()}\nstatus=${result.status} signal=${result.signal}`);
  if (result.error) throw result.error;
  if (failure) { assert.notEqual(result.status, 0); assert.match(output, failure); }
  else assert.equal(result.status, 0, output);
  return output;
}
const cxx = process.env.EMBEDDED_CXX ?? 'clang++';
const standard = ['05', '06', '07'].includes(chapter) ? 'c++23' : chapter === '02' ? 'c++11' : 'c++17';
const sources = { '01': 'fixed-storage.cpp', '02': 'allocator.cpp', '03': 'pool-check.cpp', '04': 'pmr-check.cpp', '05': 'no-exception.cpp', '06': 'recovery.cpp', '07': 'expected-check.cpp', '08': 'no-rtti.cpp', '09': 'smart-pointers.cpp', '10': 'ownership.cpp' };
const options = ['-std=' + standard, '-Wall', '-Wextra', '-Werror', '-pedantic-errors'];
if (['05', '06', '07'].includes(chapter)) options.push('-fno-exceptions');
if (chapter === '08') options.push('-fno-rtti');
console.log(`ARTICLE ${file}\nWorkspace ${work}`);
run(cxx, ['--version']);
function compile(source, output, extra = [], failure) { return run(cxx, [...options, ...extra, source, '-o', output], failure); }
compile(sources[chapter], 'example', ['-fsanitize=address,undefined', '-fno-sanitize-recover=all']);
run(join(work, 'example'), []);
if (chapter === '04') {
  compile(sources[chapter], 'identity-only', ['-fno-rtti', '-DIDENTITY_ONLY', '-fsanitize=address,undefined', '-fno-sanitize-recover=all']);
  run(join(work, 'identity-only'), []);
}
if (['05', '07'].includes(chapter)) compile(sources[chapter], 'ignored', ['-DIGNORE_RESULT'], /ignoring return value.*nodiscard/s);
if (chapter === '08') compile(sources[chapter], 'requires-rtti', ['-DREQUIRE_RTTI'], /dynamic_cast requires -frtti|use of typeid requires -frtti/);
if (chapter === '09') compile(sources[chapter], 'copy-owner', ['-DCOPY_OWNER'], /deleted constructor|implicitly-deleted copy constructor/s);
if (chapter === '10') compile(sources[chapter], 'assign-observer', ['-DASSIGN_OBSERVER'], /copy assignment operator is implicitly deleted|cannot be assigned/s);
if (chapter === '03') {
  writeFileSync(join(work, 'zero.cpp'), '#include "object-pool.hpp"\nObjectPool<int, 0> zero;\nint main() {}\n');
  compile('zero.cpp', 'zero', [], /pool capacity must be positive/);
  writeFileSync(join(work, 'throwing.cpp'), '#include "object-pool.hpp"\nstruct Item { Item() {} };\nint main() { ObjectPool<Item, 1> p; p.construct(); }\n');
  compile('throwing.cpp', 'throwing', [], /this pool requires a nothrow constructor/);
}
console.log(`PASS Embedded C++ Part 3-${chapter}. Assertions enabled; ASan + UBSan; no board/RTOS/tl/ETL runtime claim.`);
