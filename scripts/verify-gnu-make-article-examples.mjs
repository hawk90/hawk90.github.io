import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, statSync, unlinkSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout } from 'node:timers/promises';

const names = { '01': 'intro', '02': 'rules', '03': 'variables', '04': 'pattern-rules', '05': 'functions', '06': 'conditionals', '07': 'practical' };
const chapter = process.argv[2];
assert.ok(names[chapter], 'Pass a supported chapter number');
const root = fileURLToPath(new URL('../', import.meta.url));
const source = readFileSync(join(root, `src/content/blog/tools/build/gnu-make/chapter${chapter}-${names[chapter]}.md`), 'utf8');
const work = mkdtempSync(join(tmpdir(), `gnu-make-ch${chapter}-`));
const make = process.env.GNU_MAKE ?? 'make';
const env = { ...process.env, LC_ALL: 'C' };
for (const key of ['MAKEFLAGS', 'MFLAGS', 'GNUMAKEFLAGS', 'CC', 'CFLAGS', 'CPPFLAGS', 'LDFLAGS', 'LDLIBS']) delete env[key];
function write(path, value) {
  mkdirSync(dirname(join(work, path)), { recursive: true });
  writeFileSync(join(work, path), value);
}
const blocks = [...source.matchAll(/^```[\w+]+ title="([^"]+)"\n([\s\S]*?)^```/gm)];
assert.ok(blocks.length > 0);
assert.equal(new Set(blocks.map((block) => block[1])).size, blocks.length);
for (const [, name, value] of blocks) write(name, value);
function run(command, args, { fail } = {}) {
  const result = spawnSync(command, args, { cwd: work, encoding: 'utf8', env });
  const output = (result.stdout ?? '') + (result.stderr ?? '');
  console.log(`$ ${command} ${args.join(' ')}\n${output.trim()}`);
  if (result.error) throw result.error;
  if (fail) {
    assert.notEqual(result.status, 0);
    assert.match(output, fail);
  } else assert.equal(result.status, 0, output);
  return output;
}
const mk = (args = [], options = {}) => run(make, ['--no-print-directory', ...args], options);
const version = run(make, ['--version']).match(/GNU Make (\d+)\.(\d+)/);
assert.ok(version && (+version[1] > 4 || (+version[1] === 4 && +version[2] >= 3)), 'Set GNU_MAKE to GNU Make >=4.3');
console.log(`Workspace: ${work}`);
if (chapter === '01') {
  mk();
  assert.equal(run(join(work, 'hello'), []).trim(), 'Hello, World!');
  const unchanged = statSync(join(work, 'main.o')).mtimeMs;
  assert.doesNotMatch(mk(), /gcc -c/);
  await setTimeout(40);
  utimesSync(join(work, 'hello.c'), new Date(), new Date());
  const rebuilt = mk();
  assert.match(rebuilt, /gcc -c hello.c/);
  assert.doesNotMatch(rebuilt, /gcc -c main.c/);
  assert.equal(statSync(join(work, 'main.o')).mtimeMs, unchanged);
  await setTimeout(40);
  utimesSync(join(work, 'hello.h'), new Date(), new Date());
  const header = mk();
  assert.match(header, /gcc -c hello.c/);
  assert.match(header, /gcc -c main.c/);
  write('clean', 'name collision');
  mk(['clean']);
  assert.ok(existsSync(join(work, 'hello')));
  mk(['-f', 'complete.mk', 'clean']);
  assert.ok(!existsSync(join(work, 'hello')));
  write('broken.mk', readFileSync(join(work, 'Makefile'), 'utf8').replace('\tgcc', '    gcc'));
  mk(['-f', 'broken.mk'], { fail: /missing separator/ });
}
if (chapter === '02') {
  mk();
  const stamp = statSync(join(work, 'build/output.txt')).mtimeMs;
  await setTimeout(40);
  write('build/unrelated.txt', 'directory change');
  mk(['-q', 'build/output.txt']);
  assert.equal(statSync(join(work, 'build/output.txt')).mtimeMs, stamp);
  mk(['partial.txt'], { fail: /Error 1/ });
  assert.ok(!existsSync(join(work, 'partial.txt')));
  write('Makefile', readFileSync(join(work, 'Makefile'), 'utf8').replace('.DELETE_ON_ERROR:', ''));
  mk(['partial.txt'], { fail: /Error 1/ });
  assert.ok(existsSync(join(work, 'partial.txt')));
  write('single.mk', 'target:\n\t@echo FIRST\ntarget:\n\t@echo LAST\n');
  const single = mk(['-f', 'single.mk']);
  assert.match(single, /overriding recipe/);
  assert.match(single, /LAST/);
  assert.doesNotMatch(single, /^FIRST$/m);
  write('double.mk', 'target::\n\t@echo FIRST\ntarget::\n\t@echo LAST\n');
  assert.match(mk(['-f', 'double.mk']), /FIRST\nLAST/);
}
if (chapter === '03') {
  const output = mk();
  assert.match(output, /recursive=after simple=before prerequisites=\[\]/);
  assert.match(output, /cc=cc origin=default/);
  assert.ok(!existsSync(join(work, 'generated.txt')));
  assert.match(mk(['late']), /late prerequisites=\[generated.txt\]/);
  assert.ok(existsSync(join(work, 'generated.txt')));
  assert.match(mk(['CC=clang']), /cc=clang origin=command line/);
  assert.match(mk(['shell']), /Hello, world/);
  write('recursive.mk', 'FLAGS = $(FLAGS) -Wall\nall:\n\t@echo $(FLAGS)\n');
  mk(['-f', 'recursive.mk'], { fail: /Recursive variable/ });
}
if (chapter === '04') {
  mk(['-j2']);
  assert.equal(readFileSync(join(work, 'calls.log'), 'utf8'), 'RUN\n');
  unlinkSync(join(work, 'right.txt'));
  mk(['-j2']);
  assert.equal(readFileSync(join(work, 'calls.log'), 'utf8'), 'RUN\nRUN\n');
  write('x.in', 'pattern input');
  mk(['-f', 'pattern.mk', 'x.a', 'x.b']);
  assert.equal(readFileSync(join(work, 'pattern.log'), 'utf8'), 'PATTERN\n');
  write('extra.mk', 'target: input.txt\n%.out: %.txt\n\tcp $< $@\ninput.out: input.txt\n');
  mk(['-f', 'extra.mk', 'input.out']);
  assert.ok(existsSync(join(work, 'input.out')));
  write('empty.mk', 'input.out: input.txt ;\n');
  unlinkSync(join(work, 'input.out'));
  mk(['-f', 'empty.mk', 'input.out']);
  assert.ok(!existsSync(join(work, 'input.out')));
}
if (chapter === '05') {
  for (const path of ['src/root.c', 'src/one/child.c', 'src/one/two/deep.c']) write(path, '');
  const output = mk();
  assert.match(output, /wildcard=\[src\/one\/child.c\]/);
  assert.match(output, /find=\[src\/one\/child.c src\/one\/two\/deep.c src\/root.c\]/);
  assert.match(output, /Hello, World!\nWelcome to Make./);
  write('broken.mk', 'define greeting\nHello, World!\nWelcome to Make.\nendef\nall:\n\t@echo "$(greeting)"\n');
  mk(['-f', 'broken.mk'], { fail: /unexpected EOF|Unterminated quoted string|unterminated quoted string/ });
}
if (chapter === '06') {
  const conditions = mk(['-f', 'conditions.mk', 'DEBUG=1']);
  for (const value of ['stored-reference=true', 'expanded-reference=empty', 'debug-match=true']) assert.match(conditions, new RegExp(value));
  mk();
  assert.equal(run(join(work, 'build/release/myapp'), []).trim(), 'value=7');
  await setTimeout(40);
  write('src/header.h', '#define VALUE 8\n');
  assert.match(mk(), /-c src\/main.c/);
  assert.equal(run(join(work, 'build/release/myapp'), []).trim(), 'value=8');
  mk(['DEBUG=1']);
  assert.equal(run(join(work, 'build/debug/myapp'), []).trim(), 'value=8');
  const deps = readFileSync(join(work, 'build/release/main.d'), 'utf8');
  assert.match(deps, /src\/header.h:/);
  unlinkSync(join(work, 'src/header.h'));
  mk([], { fail: /header.h.*(not found|No such file)/ });
  write('src/main.c', '#include <stdio.h>\nint main(void) { puts("value=9"); }\n');
  write('build/release/main.d', deps.replace(/^src\/header\.h:\s*$/m, ''));
  mk([], { fail: /No rule to make target.*header.h/ });
  write('build/release/main.d', deps);
  mk();
  assert.equal(run(join(work, 'build/release/myapp'), []).trim(), 'value=9');
}
if (chapter === '07') {
  mk(['-j4']);
  assert.equal(run(join(work, 'build/release/myapp'), []).trim(), 'answer=42');
  mk(['DEBUG=1', '-j4']);
  assert.equal(run(join(work, 'build/debug/myapp'), []).trim(), 'answer=42');
  mk(['-j4', 'rebuild']);
  assert.equal(run(join(work, 'build/release/myapp'), []).trim(), 'answer=42');
  for (const [arch, prefix] of [['native', ''], ['arm', 'arm-linux-gnueabihf-'], ['aarch64', 'aarch64-linux-gnu-'], ['riscv64', 'riscv64-linux-gnu-']]) {
    assert.match(mk(['-f', 'cross-check.mk', `ARCH=${arch}`]), new RegExp(`CC=${prefix}gcc`));
  }
  mk(['-f', 'cross-check.mk', 'ARCH=invalid'], { fail: /Unsupported ARCH/ });
  for (const [name, code] of [['pass.sh', 0], ['fail.sh', 1]]) {
    write(name, '#!/bin/sh\nexit ' + code + '\n');
    chmodSync(join(work, name), 0o755);
  }
  mk(['-f', 'test-rules.mk', 'test-verbose', 'TESTS=./pass.sh']);
  mk(['-f', 'test-rules.mk', 'test-verbose', 'TESTS=./pass.sh ./fail.sh'], { fail: /Error 1/ });
  const original = readFileSync(join(work, 'Makefile'), 'utf8');
  write('Makefile', original.replace('SRCDIR := src', 'SRCDIR := missing'));
  mk([], { fail: /No C sources found/ });
}
console.log(`PASS GNU Make chapter ${chapter}`);
