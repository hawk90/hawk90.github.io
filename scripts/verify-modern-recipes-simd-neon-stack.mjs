// Extracts named examples and checks host behavior, ARM code generation, and FreeRTOS API use.
import assert from 'node:assert/strict';
import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {join, resolve} from 'node:path';
import {spawnSync} from 'node:child_process';

const work = resolve(process.env.RECIPES_REVIEW_WORK ?? '/tmp/recipes-simd-stack-review');
mkdirSync(work, {recursive: true});
const content = 'src/content/blog/embedded/modern-recipes';
const names = new Set();
for (const file of ['part8-07-simd.md', 'part8-08-neon.md', 'part8-09-stack-analysis.md']) {
  const source = readFileSync(join(content, file), 'utf8');
  for (const [, name, body] of source.matchAll(/^```[\w+]+ title="([^"]+)"\n([\s\S]*?)^```/gm)) {
    assert.ok(!names.has(name), `duplicate snippet title: ${name}`);
    names.add(name);
    writeFileSync(join(work, name), body);
  }
}
function run(command, args, {cwd = work, fail = false, match} = {}) {
  const result = spawnSync(command, args, {cwd, encoding: 'utf8', timeout: 60000});
  if (result.error) throw result.error;
  const output = (result.stdout ?? '') + (result.stderr ?? '');
  if (fail) {
    assert.notEqual(result.status, 0, output);
    if (match) assert.match(output, match);
  } else assert.equal(result.status, 0, `${command} ${args.join(' ')}\n${output}`);
  return output;
}
function pass(label) { console.log(`PASS ${label}`); }
const clang = process.env.RECIPES_CLANG ?? 'clang';
const armcc = process.env.ARM_CC ?? 'arm-none-eabi-gcc';

// Compile exact article snippets for AArch64 Advanced SIMD and SVE.
for (const file of ['neon-matmul-4x4.c', 'neon-rgb-gray.c', 'neon-sobel-gx.c', 'neon-saturating-add.c', 'simd-add-neon.c']) {
  run(clang, ['-target', 'aarch64-none-elf', '-march=armv8-a+simd', '-std=c11', '-O2', '-ffreestanding',
    '-Wall', '-Wextra', '-Werror', '-c', file, '-o', `${file}.o`]);
}
const neonAsm = run('llvm-objdump', ['-d', 'neon-rgb-gray.c.o']);
assert.match(neonAsm, /ld3|ld1|umull|umlal|shrn|st1/i);
pass('AArch64 NEON snippets cross-compile and generate vector instructions');
run(clang, ['-target', 'aarch64-none-elf', '-march=armv8-a+sve', '-std=c11', '-O2', '-ffreestanding',
  '-Wall', '-Wextra', '-Werror', '-c', 'simd-add-sve.c', '-o', 'simd-add-sve.o']);
pass('SVE vector-length-agnostic snippet cross-compiles');
run(armcc, ['-std=c11', '-mcpu=cortex-m55', '-mthumb', '-mfloat-abi=hard', '-O2', '-ffreestanding',
  '-Wall', '-Wextra', '-Werror', '-c', 'simd-add-mve.c', '-o', 'simd-add-mve.o']);
pass('MVE predicated tail snippet cross-compiles for Cortex-M55');
run(clang, ['-std=c11', '-O2', '-Wall', '-Wextra', '-Werror', '-fopenmp-simd', '-c', 'simd-openmp.c', '-o', 'simd-openmp.o']);
pass('OpenMP SIMD snippet compiles');
run(clang, ['-std=c11', '-O2', '-Wall', '-Wextra', '-Werror', '-c',
  'simd-independent-and-recurrence.c', '-o', 'simd-independent-and-recurrence.o']);
pass('scalar independent and recurrence examples compile');

// Exercise the watermark scanner against synthetic stack patterns under sanitizers.
let scanner = readFileSync(join(work, 'main-stack-high-water.c'), 'utf8');
scanner = scanner.replace('extern uint32_t _stack_limit, _stack_top;',
  'uint32_t stack_area[12];\n#define _stack_limit stack_area[0]\n#define _stack_top stack_area[12]');
writeFileSync(join(work, 'stack-watermark-test.c'), `${scanner}\n#include <assert.h>\nint main(void) {\n  for (size_t i=0;i<12;++i) stack_area[i]=UINT32_C(0xA5A5A5A5);\n  assert(main_stack_high_water_bytes()==0);\n  stack_area[11]=0; assert(main_stack_high_water_bytes()==sizeof(uint32_t));\n  stack_area[0]=0; assert(main_stack_high_water_bytes()==sizeof(stack_area));\n  return 0;\n}\n`);
run('clang', ['-std=c11', '-O1', '-Wall', '-Wextra', '-Werror', '-fsanitize=address,undefined',
  '-fno-sanitize-recover=all', 'stack-watermark-test.c', '-o', 'stack-watermark-test']);
run(join(work, 'stack-watermark-test'), []);
pass('watermark scanner free, partial, and full-use boundaries under ASan/UBSan');

// Confirm the compiler emits and classifies per-function .su records.
writeFileSync(join(work, 'stack-usage-probe.c'), `#include <stddef.h>\n__attribute__((noinline)) int fixed_frame(int x) { volatile char frame[48]; frame[0]=(char)x; return frame[0]; }\n__attribute__((noinline)) int dynamic_frame(size_t n) { volatile char frame[n ? n : 1]; frame[0]=1; return frame[0]; }\n`);
run(armcc, ['-mcpu=cortex-m4', '-mthumb', '-O2', '-fstack-usage', '-Wstack-usage=16',
  '-c', 'stack-usage-probe.c', '-o', 'stack-usage-probe.o']);
const su = readFileSync(join(work, 'stack-usage-probe.su'), 'utf8');
assert.match(su, /fixed_frame.*static/);
assert.match(su, /dynamic_frame.*dynamic/);
pass('GCC Cortex-M4 .su output distinguishes fixed and dynamic stack use');

// Assemble the pre-C Cortex-M startup excerpt and validate the linker symbols/overlap assertion.
run(armcc, ['-mcpu=cortex-m4', '-mthumb', '-ffreestanding', '-c', 'main-stack-fill.S', '-o', 'main-stack-fill.o']);
writeFileSync(join(work, 'reset-c-stub.c'), 'void Reset_C(void) { for (;;) {} }\n');
run(armcc, ['-mcpu=cortex-m4', '-mthumb', '-ffreestanding', '-c', 'reset-c-stub.c', '-o', 'reset-c-stub.o']);
const script = readFileSync(join(work, 'main-stack-region.ld'), 'utf8');
writeFileSync(join(work, 'stack-link.ld'), script);
run('arm-none-eabi-ld', ['-T', 'stack-link.ld', '-Map=stack-link.map', 'main-stack-fill.o', 'reset-c-stub.o', '-o', 'stack-link.elf']);
const sections = run('arm-none-eabi-readelf', ['-sW', 'stack-link.elf']);
assert.match(sections, /_stack_limit/); assert.match(sections, /_stack_top/);
writeFileSync(join(work, 'stack-link-overflow.ld'), script.replace('LENGTH = 128K', 'LENGTH = 1K'));
run('arm-none-eabi-ld', ['-T', 'stack-link-overflow.ld', 'main-stack-fill.o', 'reset-c-stub.o', '-o', 'stack-link-overflow.elf'],
  {fail: true, match: /stack alignment|RAM sections overlap/});
pass('Cortex-M4 startup assembly, linker symbols, and small-RAM ASSERT');

writeFileSync(join(work, 'stack-protected-probe.c'), `extern void consume(volatile char *);\n__attribute__((noinline)) void protected_function(void) { volatile char frame[32]; frame[0]=1; consume(frame); }\n`);
run(armcc, ['-mcpu=cortex-m4', '-mthumb', '-O2', '-fstack-protector-strong', '-c',
  'stack-protected-probe.c', '-o', 'stack-protected-probe.o']);
run(armcc, ['-mcpu=cortex-m4', '-mthumb', '-O2', '-fstack-protector-strong', '-c',
  'stack-protector-failure.c', '-o', 'stack-protector-failure.o']);
const probeSymbols = run('arm-none-eabi-nm', ['-u', 'stack-protected-probe.o']);
const handlerSymbols = run('arm-none-eabi-nm', ['stack-protector-failure.o']);
assert.match(probeSymbols, /__stack_chk_fail/); assert.match(handlerSymbols, / T __stack_chk_fail/);
pass('GCC stack protector emits failure call and compiles no-protector handler');

// Type-check the snippets against the actual locally available FreeRTOS kernel headers.
const kernel = process.env.FREERTOS_KERNEL_DIR;
if (kernel) {
  assert.ok(existsSync(join(kernel, 'include/task.h')), 'FreeRTOS task.h is missing');
  const taskHeader = readFileSync(join(kernel, 'include/task.h'), 'utf8');
  assert.match(taskHeader, /Returns the high water mark[\s\S]{0,300}in words/);
  if (!existsSync(join(kernel, 'include/projdefs.h'))) {
    console.log('SKIP FreeRTOS compile: supplied checkout is partial (include/projdefs.h missing)');
  } else {
  const template = join(kernel, 'examples/template_configuration/FreeRTOSConfig.h');
  let configText = readFileSync(template, 'utf8');
  configText += '\n#define INCLUDE_uxTaskGetStackHighWaterMark2 1\n';
  const config = join(work, 'freertos-config');
  mkdirSync(config, {recursive: true});
  writeFileSync(join(config, 'FreeRTOSConfig.h'), configText);
  run(armcc, ['-std=c11', '-mcpu=cortex-m4', '-mthumb', '-ffreestanding', '-Wall', '-Wextra', '-Werror',
    '-I', config, '-I', kernel, '-I', join(kernel, 'include'), '-I', join(kernel, 'portable/GCC/ARM_CM4F'),
    '-c', 'freertos-task-watermark.c', '-o', 'freertos-task-watermark.o']);
  run(armcc, ['-std=c11', '-mcpu=cortex-m4', '-mthumb', '-ffreestanding', '-Wall', '-Wextra', '-Werror',
    '-I', config, '-I', kernel, '-I', join(kernel, 'include'), '-I', join(kernel, 'portable/GCC/ARM_CM4F'),
    '-c', 'freertos-stack-overflow-hook.c', '-o', 'freertos-stack-overflow-hook.o']);
  pass('FreeRTOS API examples type-check against supplied upstream headers');
  }
} else {
  console.log('SKIP FreeRTOS header compile: FREERTOS_KERNEL_DIR not set');
}

console.log(`Extracted ${names.size} named snippets to ${work}`);
