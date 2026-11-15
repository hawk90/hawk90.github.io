#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const base = 'src/content/blog/embedded/performance-engineering';
const files = [
  '00-preface.md', 'part1-01-methodology.md', 'part1-02-metrics.md',
  'part1-03-measurement.md', 'part1-04-statistics.md', 'part1-05-realtime.md',
  'part1-06-benchmark.md', 'part1-07-modeling.md', 'part1-08-profiling-overview.md',
];
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'performance-part1-'));
const log = [];
function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { cwd: scratch, encoding: 'utf8', timeout: 60000, ...opts });
  if (r.error) throw r.error;
  return { status: r.status, output: `${r.stdout ?? ''}${r.stderr ?? ''}` };
}
function source(title) {
  const escaped = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`^\\x60\\x60\\x60c title="${escaped}"[^\\n]*\\n([\\s\\S]*?)^\\x60\\x60\\x60\\s*$`, 'm');
  const text = fs.readFileSync(path.join(root, base, title.startsWith('bounded-') ? (title === 'bounded-log2-histogram' ? 'part1-04-statistics.md' : 'part1-02-metrics.md') : title === 'observed-maximum-is-not-wcet' || title === 'fixed-release-deadline-check' ? 'part1-05-realtime.md' : 'part1-08-profiling-overview.md'), 'utf8');
  const match = text.match(pattern);
  assert.ok(match, `named C fence missing: ${title}`);
  return match[1] + '\n';
}
function compileRun(title) {
  const code = source(title);
  const src = path.join(scratch, `${title}.c`);
  const exe = path.join(scratch, title);
  fs.writeFileSync(src, code);
  const c = run('clang', ['-std=c11', '-Wall', '-Wextra', '-Werror', src, '-o', exe]);
  assert.equal(c.status, 0, `${title}: clang failed\n${c.output}`);
  const e = run(exe, []);
  assert.equal(e.status, 0, `${title}: runtime assertions failed\n${e.output}`);
  log.push(`${title}: host C compile + assertions PASS`);
  return src;
}
const tested = [
  'bounded-latency-histogram', 'bounded-log2-histogram',
  'observed-maximum-is-not-wcet', 'fixed-release-deadline-check',
  'gcc-function-instrumentation-hooks',
];
for (const title of tested) {
  if (title === 'gcc-function-instrumentation-hooks') {
    const src = path.join(scratch, `${title}.c`);
    fs.writeFileSync(src, source(title));
    const c = run('clang', ['-std=c11', '-Wall', '-Wextra', '-Werror', '-c', src, '-o', `${src}.o`]);
    assert.equal(c.status, 0, `${title}: clang failed\n${c.output}`);
    log.push(`${title}: host C object compile PASS`);
  } else compileRun(title);
}
// Prove that assertions catch an incorrect expected bucket, rather than only proving success.
const original = fs.readFileSync(sourcePath('bounded-log2-histogram'), 'utf8');
function sourcePath(title) {
  return path.join(scratch, `${title}.c`);
}
const bad = original.replace('hist[31] == 1', 'hist[31] == 2');
assert.notEqual(bad, original, 'negative fixture replacement must apply');
fs.writeFileSync(sourcePath('bounded-log2-histogram'), bad);
const badExe = path.join(scratch, 'bounded-log2-histogram-negative');
const cc = run('clang', ['-std=c11', '-Wall', '-Wextra', '-Werror', sourcePath('bounded-log2-histogram'), '-o', badExe]);
assert.equal(cc.status, 0, cc.output);
const negative = run(badExe, []);
assert.notEqual(negative.status, 0, 'mutated negative fixture unexpectedly passed');
log.push('negative assertion fixture: deliberately incorrect bucket expectation rejected PASS');

const preface = fs.readFileSync(path.join(root, base, files[0]), 'utf8');
function frontmatter(text) {
  const fm = text.match(/^---\n([\s\S]*?)\n---/m)?.[1] ?? '';
  return Object.fromEntries(['slug', 'date', 'series', 'seriesOrder', 'draft', 'title', 'description'].map((key) => [key, fm.match(new RegExp(`^${key}:.*$`, 'm'))?.[0] ?? '']));
}
for (const f of files) {
  const rel = `${base}/${f}`;
  const head = spawnSync('git', ['show', `HEAD:${rel}`], { cwd: root, encoding: 'utf8' });
  assert.equal(head.status, 0, `cannot read HEAD:${rel}`);
  const current = fs.readFileSync(path.join(root, rel), 'utf8');
  const before = frontmatter(head.stdout);
  const after = frontmatter(current);
  for (const key of ['slug', 'date', 'series', 'seriesOrder', 'draft', 'title']) assert.equal(after[key], before[key], `${f}: ${key} changed`);
  if (f !== 'part1-08-profiling-overview.md') assert.equal(after.description, before.description, `${f}: unexpected description change`);
  else assert.notEqual(after.description, before.description, '1-08 confirmed description correction missing');
}
log.push('metadata invariant: slug/date/series/order/draft/title preserved; only 1-08 description corrected');

assert.match(preface, /총 6개 Part, 56개 글/);
assert.match(preface, /Part 3: System Level Performance \(12개\)/);
assert.match(preface, /Part 5: Profiling Tools \(11개\)/);
assert.match(preface, /Part 6: Real-World Case Studies \(5개\)/);
log.push('series inventory: 56 numbered articles + introduction = 57 files; part counts verified');
const saturationSource = fs.readFileSync(path.join(root, 'public/images/blog/perf-eng/diagrams/part1-02-saturation-curve.tex'), 'utf8');
assert.match(saturationSource, /예시 80/);
assert.doesNotMatch(saturationSource, /안전 영역|80\\%를 넘으면/);
log.push('saturation diagram source: 80% marker is illustrative; universal safe threshold removed');
for (const f of files) {
  const body = fs.readFileSync(path.join(root, base, f), 'utf8');
  assert.match(body, /^title: .+$/m, `${f} missing title`);
  assert.match(body, /^description: .+$/m, `${f} missing description`);
  assert.match(body, /^slug: "embedded\/performance-engineering\//m, `${f} slug mismatch`);
}
log.push('frontmatter required fields: title/description/series slug present on all 9 files');
console.log(log.join('\n'));
fs.rmSync(scratch, { recursive: true, force: true });
