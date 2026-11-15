import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const root = process.cwd();
const base = 'src/content/blog/embedded/performance-engineering';
const names = [
  'part4-01-concurrency-basics.md', 'part4-02-false-sharing.md',
  'part4-03-lock-contention.md', 'part4-04-spinlock.md',
  'part4-05-mutex.md', 'part4-06-rw-lock.md',
  'part4-07-lock-free.md', 'part4-08-memory-ordering.md',
  'part4-09-cache-coherency.md', 'part4-10-smp-analysis.md',
];
const docs = new Map(names.map((name) => [name, readFileSync(path.join(root, base, name), 'utf8')]));
const fences = (source) => [...source.matchAll(/^```([^\n]*)\n([\s\S]*?)^```\s*$/gm)]
  .map(([, info, body]) => ({ info: info.trim(), body }));
for (const [name, source] of docs) {
  const blocks = fences(source);
  assert.ok(blocks.length > 0, `${name}: no named examples found`);
  assert.ok(blocks.every(({ body }) => body.trim()), `${name}: empty code fence`);
  console.log(`PASS static extraction ${name}: ${blocks.length} non-empty named fences`);
  const sourcePath = path.join(base, name);
  const head = execFileSync('git', ['show', `HEAD:${sourcePath}`], { encoding: 'utf8' });
  const metadata = (text, key) => {
    const frontmatter = text.match(/^---\n([\s\S]*?)\n---/);
    assert.ok(frontmatter, `${name}: frontmatter found`);
    return frontmatter[1].match(new RegExp(`^${key}:\\s*(.*)$`, 'm'))?.[1] ?? null;
  };
  for (const key of ['slug', 'date', 'seriesOrder', 'draft']) {
    assert.equal(metadata(source, key), metadata(head, key), `${name}: ${key} unchanged`);
  }
}
console.log('PASS slug/date/seriesOrder/draft frontmatter unchanged against HEAD for all 10 articles');

const temp = mkdtempSync(path.join(os.tmpdir(), 'perf-part4-'));
try {
  const spin = docs.get(names[3]);
  const mcs = fences(spin).find(({ body }) => body.includes('void mcs_lock_acquire'));
  assert.ok(mcs, 'part4-04: MCS C example fence found');
  const harness = `
#include <pthread.h>
#include <stdio.h>
#define THREADS 4
#define ITERATIONS 250000
typedef struct { mcs_lock_t *lock; long *counter; mcs_node node; } worker_arg;
static void *worker(void *p) {
  worker_arg *a = p;
  for (int i = 0; i < ITERATIONS; ++i) {
    mcs_lock_acquire(a->lock, &a->node);
    ++*a->counter;
    mcs_lock_release(a->lock, &a->node);
  }
  return NULL;
}
int main(void) {
  mcs_lock_t lock;
  mcs_lock_init(&lock);
  long counter = 0;
  pthread_t threads[THREADS];
  worker_arg args[THREADS];
  for (int i = 0; i < THREADS; ++i) {
    args[i] = (worker_arg){ .lock = &lock, .counter = &counter };
    if (pthread_create(&threads[i], NULL, worker, &args[i])) return 2;
  }
  for (int i = 0; i < THREADS; ++i) if (pthread_join(threads[i], NULL)) return 3;
  printf("counter=%ld expected=%d\\n", counter, THREADS * ITERATIONS);
  return counter == (long)THREADS * ITERATIONS ? 0 : 1;
}
`;
  const mcsFile = path.join(temp, 'mcs.c');
  const mcsExe = path.join(temp, 'mcs');
  writeFileSync(mcsFile, `${mcs.body}\n${harness}`);
  execFileSync('clang', ['-std=c11', '-O2', '-pthread', mcsFile, '-o', mcsExe], { stdio: 'inherit' });
  const mcsOutput = execFileSync(mcsExe, { encoding: 'utf8' }).trim();
  assert.equal(mcsOutput, 'counter=1000000 expected=1000000');
  console.log(`PASS extracted MCS source + 4-thread host stress (${mcsOutput}); host-only, not target timing`);

  const order = docs.get(names[7]);
  const orderSource = fences(order).find(({ info, body }) => info === 'cpp' && body.includes('store_seq_cst'));
  assert.ok(orderSource, 'part4-08: C++ atomic mapping source fence found');
  const orderFile = path.join(temp, 'orders.cpp');
  writeFileSync(orderFile, orderSource.body);
  const assembly = execFileSync('clang++', [
    '-std=c++20', '-O2', '-S', '-target', 'arm64-apple-macos13', orderFile, '-o', '-'
  ], { encoding: 'utf8' });
  for (const [functionName, instruction] of [
    ['store_relaxed', /\bstr\s+w\d+,\s*\[/i],
    ['store_release', /\bstlr\s+w\d+,\s*\[/i],
    ['store_seq_cst', /\bstlr\s+w\d+,\s*\[/i],
  ]) {
    const symbol = `__Z${functionName.length}${functionName}i:`;
    const start = assembly.indexOf(symbol);
    assert.notEqual(start, -1, `${functionName} symbol emitted`);
    const next = assembly.indexOf('; -- End function', start + 1);
    const body = assembly.slice(start, next === -1 ? undefined : next);
    assert.match(body, instruction, `${functionName} target instruction`);
  }
  console.log('PASS extracted C++ atomic example assembly: Apple Clang target arm64-apple-macos13 maps relaxed=STR, release=STLR, seq_cst=STLR; no cycle measurement');
} finally {
  rmSync(temp, { recursive: true, force: true });
}

const concurrency = docs.get(names[0]);
assert.match(concurrency, /_Atomic int x = 0, y = 0/);
assert.match(concurrency, /원자 load와 store로 데이터 race는 피하지만/);
assert.doesNotMatch(concurrency, /ARM: seq_cst store → DMB ISH 명령 추가 \(~30 cycle\)/);
console.log('PASS part4-01 C11 atomic race/interleaving scope; unsupported fixed ARM cycle assertion rejected');

const mutex = docs.get(names[4]);
assert.match(mutex, /pthread_mutexattr_setpshared\(&attr, PTHREAD_PROCESS_SHARED\)/);
assert.match(mutex, /EOWNERDEAD.*pthread_mutex_consistent/s);
assert.doesNotMatch(mutex, /30 ns|8 µs|수십 µs까지 늘어날 수 있습니다/);
console.log('PASS part4-05 robust/process-shared API scope and negative unsupported latency examples');

const rw = docs.get(names[5]);
assert.match(rw, /PTHREAD_RWLOCK_PREFER_WRITER_NONRECURSIVE_NP/);
assert.match(rw, /PTHREAD_RWLOCK_PREFER_WRITER_NP`는 glibc에서 무시/);
assert.match(rw, /non-PREEMPT_RT `rwlock_t`.*fair/s);
assert.doesNotMatch(rw, /Linux의 기본 `rwlock_t`가 unfair reader-preferring/);
console.log('PASS part4-06 glibc and Linux kernel fairness scope assertions');

const usl = docs.get(names[9]);
const alpha = 0.1, beta = 0.01;
const results = [4, 8, 16, 32].map((n) => n / (1 + alpha * (n - 1) + beta * n * (n - 1)));
assert.deepEqual(results.map((x) => x.toFixed(2)), ['2.82', '3.54', '3.27', '2.28']);
for (const [n, value] of [4, 8, 16, 32].map((n, i) => [n, results[i].toFixed(2)])) {
  assert.match(usl, new RegExp(`${n} core:\\s+${value}x`));
}
assert.match(usl, /가상 예시이지 실측 결과가 아닙니다/);
console.log('PASS part4-10 USL arithmetic positive values and explicit non-measurement scope');

const manifestPath = 'reports/adsense-audit/fixes/performance-engineering-part4-2026-10-22.json';
const manifest = JSON.parse(readFileSync(path.join(root, manifestPath), 'utf8'));
assert.equal(manifest.articles.length, names.length);
for (let i = 0; i < names.length; ++i) {
  const article = manifest.articles[i];
  assert.equal(article.path, path.posix.join(base, names[i]), `manifest order/path ${names[i]}`);
  assert.match(article.status, /^(remediated|accepted|unassessed)$/);
  const sha = createHash('sha256').update(readFileSync(path.join(root, article.path))).digest('hex');
  assert.equal(article.afterSha256, sha, `${names[i]} afterSha256 matches current source`);
  assert.ok(article.validation.length > 0, `${names[i]} validation recorded`);
  if (article.status === 'unassessed') {
    assert.ok(article.nextAction && article.reviewQuestion, `${names[i]} follow-up fields present`);
  }
}
assert.equal(manifest.readyForIntegration, true, 'manifest finalized only after evidence/checks');
console.log('PASS manifest order/status/validation and all 10 afterSha256 values match current source; readyForIntegration=true');

console.log('NOTE other fences were extracted only; this script does not validate simulator, kernel, RTOS, NUMA or hardware behavior.');
