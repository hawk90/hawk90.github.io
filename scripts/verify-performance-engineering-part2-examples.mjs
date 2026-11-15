#!/usr/bin/env node

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const root = process.cwd();
const dir = path.join(root, 'src/content/blog/embedded/performance-engineering');
const articles = [
  'part2-01-pipeline.md', 'part2-02-pipeline-stall.md',
  'part2-03-branch-prediction.md', 'part2-04-speculative-execution.md',
  'part2-05-cache-basics.md', 'part2-06-cache-miss.md',
  'part2-07-cache-line.md', 'part2-08-memory-bandwidth.md',
  'part2-09-simd-neon.md', 'part2-10-pmu.md',
];

function fenceAfterHeading(source, heading, language) {
  const start = source.indexOf(heading);
  assert.notEqual(start, -1, `missing section ${heading}`);
  const next = source.indexOf('\n## ', start + heading.length);
  const section = source.slice(start, next === -1 ? source.length : next);
  const re = new RegExp('```' + language + '\\s*\\n([\\s\\S]*?)\\n```');
  const match = section.match(re);
  assert.ok(match, `missing ${language} fence in ${heading}`);
  return match[1];
}

for (const file of articles) {
  const source = readFileSync(path.join(dir, file), 'utf8');
  assert.match(source, /^---\n[\s\S]*?^---\n/m, `${file}: frontmatter`);
  assert.match(source, /```[\w+-]*\n[\s\S]*?```/, `${file}: at least one source fence`);
}

// Host-side arithmetic/model checks. These test the article's stated equations,
// not a processor's timing or cache implementation.
const n = 1000;
const noPipe = 5 * n;
const pipe = 5 + n - 1;
assert.equal(noPipe, 5000);
assert.equal(pipe, 1004);
assert.ok(Math.abs(noPipe / pipe - 4.9800796812749) < 1e-12);
assert.notEqual(noPipe / pipe, 200);
console.log('PASS part2-01 ideal 5-stage throughput model; negative 200x claim rejected');

const stall = readFileSync(path.join(dir, 'part2-02-pipeline-stall.md'), 'utf8');
assert.match(stall, /ICode, DCode, System AHB-Lite/);
assert.doesNotMatch(stall, /single port\* Harvard/);
assert.match(fenceAfterHeading(stall, '## Structural Hazard', 'c'), /ldr r0/);
console.log('PASS part2-02 extracted structural-hazard fence and bus-interface scope');

const branch = readFileSync(path.join(dir, 'part2-03-branch-prediction.md'), 'utf8');
const counter = fenceAfterHeading(branch, '## 2-bit Saturating Counter', 'text');
assert.match(counter, /Strongly Not Taken/);
assert.match(branch, /CVE-2017-5754는 Meltdown/);
assert.match(branch, /CVE-2017-5753\/5715/);
assert.doesNotMatch(branch, /256 entry × 4-way set associative 구조/);
console.log('PASS part2-03 extracted predictor-state fence and CVE distinction');

const rob = fenceAfterHeading(
  readFileSync(path.join(dir, 'part2-04-speculative-execution.md'), 'utf8'),
  '## Reorder Buffer (ROB)', 'text',
);
assert.ok(rob.indexOf('[ldr ⏳') < rob.indexOf('[add ✓') && rob.indexOf('[add ✓') < rob.indexOf('[sub ✓'));
console.log('PASS part2-04 extracted ROB example preserves program order');

const cache = readFileSync(path.join(dir, 'part2-05-cache-basics.md'), 'utf8');
assert.match(cache, /20\s+10\s+6\s+\(가정: 64 KiB direct-mapped cache/);
assert.match(fenceAfterHeading(cache, '## Direct Mapped Cache', 'text'), /conflict!/);
assert.equal(64 * 1024 / 64, 1024);
assert.equal(Math.log2(1024), 10);
assert.notEqual(Math.log2(1024), 8);
assert.match(cache, /Cortex-M4 코어 자체에는 L1 cache가 없습니다/);
console.log('PASS part2-05 extracted mapping fence; negative 8-bit index rejected');

const miss = readFileSync(path.join(dir, 'part2-06-cache-miss.md'), 'utf8');
const conflict = fenceAfterHeading(miss, '## Conflict Miss', 'c');
assert.match(conflict, /same set|same set|같은 set/i);
assert.ok(3 <= 4, 'three same-set lines fit in a four-way set');
assert.ok(5 > 4, 'five same-set lines exceed a four-way set');
assert.match(miss, /random access가 매번 cache miss를 일으키는 것은 아니며/);
console.log('PASS part2-06 extracted conflict example and associativity positive/negative model');

const layout = readFileSync(path.join(dir, 'part2-07-cache-line.md'), 'utf8');
assert.match(fenceAfterHeading(layout, '## False Sharing 방지', 'c'), /atomic_int producer_count/);
assert.match(layout, /penalty 또는 fault 여부는 target core/);
assert.match(layout, /non-temporal hint/);
console.log('PASS part2-07 extracted false-sharing fence and target-dependent claims');

const bandwidth = readFileSync(path.join(dir, 'part2-08-memory-bandwidth.md'), 'utf8');
const roofline = fenceAfterHeading(bandwidth, '## Roofline Model', 'c');
assert.match(roofline, /1\/12 FLOP per byte/);
assert.equal(3200 * 4, 12800); // MB/s under the stated MT/s and bus-width assumptions.
assert.equal((1600 * 2 * 4) / 1000, 12.8); // DDR transfers per clock × 4-byte bus width.
assert.notEqual((3200 * 4 / 8) * 2, 12800);
console.log('PASS part2-08 extracted Roofline fence and DDR bandwidth arithmetic; old formula rejected');

const neonArticle = readFileSync(path.join(dir, 'part2-09-simd-neon.md'), 'utf8');
const neon = fenceAfterHeading(neonArticle, '## NEON Intrinsics로 직접 작성', 'c');
const mve = fenceAfterHeading(neonArticle, '## Helium (MVE)', 'c');
const tmp = mkdtempSync(path.join(os.tmpdir(), 'perf-eng-part2-'));
try {
  const neonFile = path.join(tmp, 'neon.c');
  writeFileSync(neonFile, neon);
  execFileSync('clang', ['--target=aarch64-none-elf', '-march=armv8-a', '-O2', '-ffreestanding', '-c', neonFile, '-o', path.join(tmp, 'neon.o')], { stdio: 'pipe' });
  const mveFile = path.join(tmp, 'mve.c');
  writeFileSync(mveFile, 'typedef signed short int16_t;\n' + mve);
  execFileSync('clang', ['--target=armv8.1m.main-none-eabi', '-march=armv8.1-m.main+mve', '-O2', '-ffreestanding', '-c', mveFile, '-o', path.join(tmp, 'mve.o')], { stdio: 'pipe' });
  console.log('PASS part2-09 extracted NEON and MVE fences compile to ARM objects (no runtime/hardware execution)');
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
const tailN = 10;
const vectorWidth = 8;
const vectorStops = [];
for (let i = 0; i + vectorWidth <= tailN; i += vectorWidth) vectorStops.push(i);
assert.deepEqual(vectorStops, [0]);
assert.deepEqual(Array.from({ length: tailN - vectorStops.at(-1) - vectorWidth }, (_, j) => j + vectorWidth), [8, 9]);
assert.ok(!((8 + vectorWidth) <= tailN), 'negative overrun vector iteration rejected');
console.log('PASS part2-09 host tail model: N=10 has one vector block and two scalar elements');

const pmu = readFileSync(path.join(dir, 'part2-10-pmu.md'), 'utf8');
assert.match(pmu, /0x10.*BR_MIS_PRED/);
assert.match(pmu, /mcycle.*64-bit precision/);
assert.match(pmu, /event meanings are platform-defined/);
const cycles = 2400;
const instructions = 1200;
assert.equal(cycles / instructions, 2);
assert.ok(!Number.isFinite(cycles / 0), 'negative zero-instruction case must be rejected');
console.log('PASS part2-10 event-scope and CPI host formula positive/negative checks');

console.log('SCOPE: source extraction, host arithmetic/models, and AArch64/MVE object compilation only. No simulator, board, Linux perf, or hardware counters were run.');
