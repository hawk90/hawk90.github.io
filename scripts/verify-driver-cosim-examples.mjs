#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';

const root = process.cwd();
const series = 'src/content/blog/tools/emulation/driver-cosim';
const outDir = 'reports/adsense-audit/fixes';
const chapterPaths = [
  'chapter01-why-cosim.md', 'chapter02-dpi-c-basics.md',
  'chapter03-verilator.md', 'chapter04-cocotb.md',
  'chapter05-systemc-tlm.md', 'chapter06-bfm.md',
  'chapter07-uvm-c-model.md', 'chapter08-end-to-end.md',
].map((name) => `${series}/${name}`);
const simulatorLimits = [
  'NOT RUN: RTL simulation, Linux integration, and board execution',
  'NOT RUN: simulator-generated DPI header and DPI callback execution',
  'NOT RUN: Verilator compile/run and FST generation',
  'NOT RUN: cocotb simulator, AXI BFM, coverage, and runner execution',
  'NOT RUN: SystemC kernel and TLM scheduler execution',
  'NOT RUN: SystemVerilog compile and AXI skew-channel simulation',
  'NOT RUN: simulator DPI open-array ABI and UVM scoreboard execution',
  'NOT RUN: Verilator RTL/driver integration and stress run',
];

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { encoding: 'utf8', ...options });
  if (result.error) throw result.error;
  return { status: result.status, output: `${result.stdout ?? ''}${result.stderr ?? ''}` };
}

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

function read(pathname) {
  return fs.readFileSync(path.join(root, pathname), 'utf8');
}

function block(markdown, title) {
  const escaped = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = markdown.match(new RegExp('```[^\\n]*title="' + escaped + '"[^\\n]*\\n([\\s\\S]*?)\\n```'));
  expect(match, `code block title not found: ${title}`);
  return `${match[1]}\n`;
}

function sha(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

function headText(pathname) {
  const result = run('git', ['show', `HEAD:${pathname}`], { cwd: root });
  expect(result.status === 0, `cannot read HEAD:${pathname}`);
  return result.output;
}

function frontmatter(markdown) {
  return markdown.match(/^---\n[\s\S]*?\n---\n/)?.[0] ?? '';
}

function stableFrontmatter(markdown) {
  const fields = ['slug', 'date', 'series', 'seriesOrder', 'draft'];
  const fm = frontmatter(markdown);
  return fields.map((field) => {
    const match = fm.match(new RegExp(`^${field}:.*$`, 'm'));
    return `${field}:${match?.[0] ?? '<missing>'}`;
  }).join('\n');
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'driver-cosim-'));
const logs = [];
const validations = new Map();
function record(chapter, line) {
  logs.push(`[${chapter}] ${line}`);
  validations.set(chapter, [...(validations.get(chapter) ?? []), line]);
}

try {
  const cc = run('clang', ['--version']);
  expect(cc.status === 0, 'clang is required for native fixtures');
  const py = run('python3', ['--version']);
  expect(py.status === 0, 'python3 is required for the C callback fixture');

  const docs = chapterPaths.map(read);
  for (let i = 0; i < chapterPaths.length; i++) {
    const current = docs[i];
    const baseline = headText(chapterPaths[i]);
    expect(stableFrontmatter(current) === stableFrontmatter(baseline), `stable frontmatter changed: ${chapterPaths[i]}`);
    record(String(i + 1).padStart(2, '0'), 'slug/date/series/seriesOrder/draft match HEAD');
  }

  for (const [chapter, needles] of [
    ['01', ['주입할 실패', '같은 프로세스가 cosim 정의의 필수조건은 아닙니다', '실제 RTL·Linux·board 실행']],
    ['02', ['ceil(N/32)', 'little-endian byte 계약', 'len < 0 || len > 32', 'host sleep이나 별도 thread는 simulation clock을 자동 진행시키지 않습니다']],
    ['03', ['--top-module top', 'cycle < 100', 'wave.fst', 'eventsPending/nextTimeSlot']],
    ['04', ['Clock(dut.clk, 10, unit="ns")', 'await event.wait()', 'cocotb_tools.runner', '동기 ctypes callback은 Python coroutine을 await할 수 없습니다']],
    ['05', ['delay += sc_time(10, SC_NS)', '양쪽 방식을 동시에 쓰면 같은 지연을 두 번 셀 수 있습니다']],
    ['06', ['aw_done', 'w_done', 'AXI write address/data timeout', 'AWREADY와 WREADY가 동시에 올라오는 경우만 가정하지 않고']],
    ['07', ['svOpenArrayHandle', 'svGetArrayPtr', 'svLeft(A, 1) != 0', 'SIZE_MAX / (size_t)k', 'golden vector']],
    ['08', ['newly_pending(cur, prev)', 'ctypes.CDLL("./libcosim.so")', '실행 파일을 임의로 shared library처럼 불러오지 않습니다']],
  ]) {
    const source = docs[Number(chapter) - 1];
    for (const needle of needles) expect(source.includes(needle), `chapter ${chapter} missing contract: ${needle}`);
    record(chapter, `static contract checks passed (${needles.length} assertions)`);
  }

  const dpi = docs[1];
  fs.writeFileSync(path.join(tmp, 'unpack-words.c'), block(dpi, 'unpack-words.c'));
  fs.writeFileSync(path.join(tmp, 'unpack-check.c'), block(dpi, 'unpack-check.c'));
  let result = run('clang', ['-std=c11', '-Wall', '-Wextra', '-Werror', 'unpack-words.c', 'unpack-check.c', '-o', 'dpi-check'], { cwd: tmp });
  expect(result.status === 0, `DPI byte helper compile failed:\n${result.output}`);
  result = run(path.join(tmp, 'dpi-check'), [], { cwd: tmp });
  expect(result.status === 0, `DPI byte helper check failed:\n${result.output}`);
  record('02', result.output.trim());

  const cocotb = docs[3];
  fs.writeFileSync(path.join(tmp, 'driver-hooks.c'), block(cocotb, 'driver-hooks.c'));
  fs.writeFileSync(path.join(tmp, 'ffi-check.py'), block(cocotb, 'ffi-check.py'));
  result = run('clang', ['-std=c11', '-Wall', '-Wextra', '-Werror', '-shared', '-fPIC', 'driver-hooks.c', '-o', 'libdriver-hooks.so'], { cwd: tmp });
  expect(result.status === 0, `C callback fixture compile failed:\n${result.output}`);
  result = run('python3', ['ffi-check.py', './libdriver-hooks.so'], { cwd: tmp });
  expect(result.status === 0, `C callback FFI fixture failed:\n${result.output}`);
  record('04', result.output.trim());

  const ref = docs[6];
  const matmul = block(ref, 'matmul_ref.c');
  const checked = block(ref, 'checked-count.c');
  fs.writeFileSync(path.join(tmp, 'matmul_ref.c'), matmul);
  fs.writeFileSync(path.join(tmp, 'checked-count.c'), checked);
  fs.writeFileSync(path.join(tmp, 'matmul-test.c'), `#include <assert.h>\n#include <stdint.h>\nint matmul_ref(const int16_t*,const int16_t*,int32_t*,int,int,int);\nint main(void){int16_t a[]={1,2,3,4},b[]={5,6,7,8}; int32_t c[4]={0}; assert(matmul_ref(a,b,c,2,2,2)==0); assert(c[0]==19 && c[1]==22 && c[2]==43 && c[3]==50); int16_t big[]={32767,32767,32767}; int32_t out=0; assert(matmul_ref(big,big,&out,1,1,3)==-2); assert(matmul_ref(a,b,c,0,2,2)==-1); return 0;}\n`);
  result = run('clang', ['-std=c11', '-Wall', '-Wextra', '-Werror', 'matmul_ref.c', 'checked-count.c', 'matmul-test.c', '-o', 'matmul-test'], { cwd: tmp });
  expect(result.status === 0, `C reference compile failed:\n${result.output}`);
  result = run(path.join(tmp, 'matmul-test'), [], { cwd: tmp });
  expect(result.status === 0, `C reference checks failed:\n${result.output}`);
  record('07', 'C matmul reference golden vector, accumulator overflow, and invalid-dimension checks passed');

  const e2e = docs[7];
  const mask = block(e2e, 'irq-mask.cpp');
  fs.writeFileSync(path.join(tmp, 'irq-mask.cpp'), `${mask}\nint main(){return newly_pending(0x03,0x01)==0x02 && newly_pending(0x08,0x00)==0x08 && newly_pending(0x01,0x01)==0 ? 0 : 1;}\n`);
  result = run('clang++', ['-std=c++17', '-Wall', '-Wextra', '-Werror', 'irq-mask.cpp', '-o', 'irq-mask-test'], { cwd: tmp });
  expect(result.status === 0, `IRQ mask fixture compile failed:\n${result.output}`);
  result = run(path.join(tmp, 'irq-mask-test'), [], { cwd: tmp });
  expect(result.status === 0, `IRQ mask checks failed:\n${result.output}`);
  record('08', 'IRQ mask compile and simultaneous/new/unchanged bit checks passed');

  const articles = chapterPaths.map((pathname, index) => {
    const head = headText(pathname);
    return {
      path: pathname,
      beforeSha256: sha(head),
      afterSha256: sha(docs[index]),
      status: 'remediated',
      validation: validations.get(String(index + 1).padStart(2, '0')).join('; '),
      simulatorValidation: simulatorLimits[index],
    };
  });
  fs.mkdirSync(path.join(root, outDir), { recursive: true });
  const log = [
    'driver-cosim example verification',
    `date: ${new Date().toISOString()}`,
    `compiler: ${cc.output.split('\n')[0]}`,
    `python: ${py.output.trim()}`,
    'simulation tools: NOT RUN (Verilator, Icarus, SystemC unavailable in this environment)',
    ...logs,
  ].join('\n') + '\n';
  fs.writeFileSync(path.join(root, `${outDir}/driver-cosim-examples.txt`), log);
  fs.writeFileSync(path.join(root, `${outDir}/driver-cosim-2026-10-22.json`), JSON.stringify({
    date: '2026-10-22',
    sourceHead: run('git', ['rev-parse', 'HEAD'], { cwd: root }).output.trim(),
    beforeHashNote: 'beforeSha256 hashes the repository HEAD source; chapters 01-04 also contained pre-existing workspace edits when this continuation began.',
    rescored: false,
    articles,
  }, null, 2) + '\n');
  process.stdout.write(log);
} catch (error) {
  process.stderr.write(`${error.stack ?? error}\n`);
  process.exitCode = 1;
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
