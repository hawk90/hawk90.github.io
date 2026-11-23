import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, copyFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const root = process.cwd();
const work = process.env.RECIPES_REVIEW_WORK ?? mkdtempSync(join(tmpdir(), 'recipes-code-power-wcet-'));
mkdirSync(work, { recursive: true });
const files = [
  'src/content/blog/embedded/modern-recipes/part8-10-code-size-optimization.md',
  'src/content/blog/embedded/modern-recipes/part8-11-power-optimization.md',
  'src/content/blog/embedded/modern-recipes/part8-12-wcet-analysis.md',
];
const read = (p) => readFileSync(join(root, p), 'utf8');
const run = (command, args, options = {}) => execFileSync(command, args, {
  cwd: work, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...options,
});
const pass = (message) => console.log(`PASS ${message}`);

for (const file of files) {
  const before = run('git', ['show', `HEAD:${file}`], { cwd: root });
  const after = read(file);
  const front = (s) => s.match(/^---\n([\s\S]*?)\n---/)[1];
  for (const key of ['title', 'slug', 'date', 'series', 'seriesOrder', 'tags', 'topics', 'draft']) {
    const line = (fm) => fm.split('\n').find((v) => v.startsWith(`${key}:`)) ?? `${key}: <absent>`;
    assert.equal(line(front(after)), line(front(before)), `${file}: ${key} changed`);
  }
}
pass('published article frontmatter identity and series ordering preserved');

const codeSize = read(files[0]);
assert.match(codeSize, /-ffunction-sections -fdata-sections/);
assert.match(codeSize, /--gc-sections/);
assert.match(codeSize, /-flto/);
assert.match(codeSize, /strip --strip-debug/);
assert.match(codeSize, /does not affect|줄지는 않습니다/);
assert.doesNotMatch(codeSize, /32104|8\.0K|11\.2K/);
pass('code-size article uses reproducible option forms and contains no unsupported size sample');

const power = read(files[1]);
assert.match(power, /configUSE_TICKLESS_IDLE 1/);
assert.match(power, /vTaskStepTick/);
assert.match(power, /보장하지 않습니다/);
assert.doesNotMatch(power, /mA에서 µA로 떨어집니다|mA 단위 차이를 만듭니다|100 µA 이하/);
const avgCurrentUa = (5000 * 2 + 5 * 998) / 1000;
assert.equal(avgCurrentUa, 14.99);
pass('power arithmetic recomputes to 14.99 µA and unsupported generic current claims are absent');

const wcet = read(files[2]);
assert.match(wcet, /관측 결과이지 WCET 증명이 아닙니다/);
assert.doesNotMatch(wcet, /aiT static analysis\s+11400|measurement-based\s+9100/);
const conversions = [[5400, 75], [8200, 113.88888888888889], [13800, 191.66666666666666], [18400, 255.55555555555554]];
for (const [cycles, expected] of conversions) assert.ok(Math.abs(cycles / 72 - expected) < 1e-9);
pass('WCET cycle-to-time examples recompute at the stated 72 MHz assumption');

const source = `
volatile unsigned sink;
__attribute__((noinline)) void retained_work(void) { sink += 7u; }
__attribute__((noinline)) void unreachable_work(void) { sink += 19u; }
void _start(void) { retained_work(); for (;;) { __asm__ volatile ("nop"); } }
`;
const linker = `
ENTRY(_start)
MEMORY { FLASH (rx) : ORIGIN = 0x08000000, LENGTH = 64K
         RAM (rwx) : ORIGIN = 0x20000000, LENGTH = 16K }
SECTIONS {
  .text : { *(.text*) *(.rodata*) } > FLASH
  .data : { *(.data*) } > RAM AT > FLASH
  .bss (NOLOAD) : { *(.bss*) *(COMMON) } > RAM
}
`;
writeFileSync(join(work, 'fixture.c'), source);
writeFileSync(join(work, 'fixture.ld'), linker);

const variants = [
  { name: 'O2', args: ['-O2'] },
  { name: 'Os', args: ['-Os'] },
  { name: 'Os-gc', args: ['-Os', '-ffunction-sections', '-fdata-sections', '-Wl,--gc-sections'] },
  { name: 'Os-lto-gc', args: ['-Os', '-flto', '-ffunction-sections', '-fdata-sections', '-Wl,--gc-sections'] },
];
const sizeRows = [];
for (const variant of variants) {
  const elf = `fixture-${variant.name}.elf`;
  run('arm-none-eabi-gcc', [
    '-mcpu=cortex-m4', '-mthumb', '-g', '-nostdlib', '-nostartfiles',
    ...variant.args, '-T', 'fixture.ld', 'fixture.c', `-Wl,-Map=${elf}.map`, '-o', elf,
  ]);
  const size = run('arm-none-eabi-size', [elf]).trim().split('\n').at(-1).trim().split(/\s+/).map(Number);
  const symbols = run('arm-none-eabi-nm', ['--defined-only', elf]);
  assert.match(symbols, /_start/);
  if (variant.name.endsWith('-gc')) assert.doesNotMatch(symbols, /unreachable_work/);
  else assert.match(symbols, /unreachable_work/);
  sizeRows.push({ variant: variant.name, text: size[0], data: size[1], bss: size[2] });
}
writeFileSync(join(work, 'synthetic-code-size-results.json'), `${JSON.stringify(sizeRows, null, 2)}\n`);
pass('GNU Arm Cortex-M4 builds link for O2, Os, section GC, and LTO; GC removes unreachable function');

const rawA = join(work, 'fixture-Os-gc.elf');
const debugStripped = join(work, 'fixture-debug-stripped.elf');
copyFileSync(rawA, debugStripped);
run('arm-none-eabi-strip', ['--strip-debug', debugStripped]);
run('arm-none-eabi-objcopy', ['-O', 'binary', rawA, 'before-strip.bin']);
run('arm-none-eabi-objcopy', ['-O', 'binary', debugStripped, 'after-strip.bin']);
assert.deepEqual(readFileSync(join(work, 'before-strip.bin')), readFileSync(join(work, 'after-strip.bin')));
pass('stripping debug information leaves this fixture raw image unchanged');

try {
  run('arm-none-eabi-gcc', ['--specs=nano.specs', '-x', 'c', '-c', '/dev/null', '-o', 'nano-probe.o']);
  pass('installed toolchain accepts nano.specs');
} catch {
  console.log('SKIP newlib-nano link check: this GNU Arm toolchain does not provide nano.specs');
}

console.log(`Synthetic size comparison: ${JSON.stringify(sizeRows)}`);
console.log(`Artifacts: ${work}`);
