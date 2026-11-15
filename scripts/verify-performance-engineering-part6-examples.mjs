import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const root = process.cwd();
const base = 'src/content/blog/embedded/performance-engineering';
const names = [
  'part6-01-case-isr-latency.md', 'part6-02-case-cache-thrashing.md',
  'part6-03-case-lock-contention.md', 'part6-04-case-dma-tuning.md',
  'part6-05-case-cxl-llm-kv-cache.md',
];
const sources = names.map((name) => readFileSync(path.join(root, base, name), 'utf8'));
const fences = (source) => [...source.matchAll(/^```([^\n]*)\n([\s\S]*?)^```\s*$/gm)]
  .map(([, info, body]) => ({ info: info.trim(), body }));
const sha = (s) => createHash('sha256').update(s).digest('hex');
const fm = (source) => source.match(/^---\n([\s\S]*?)\n---/m)?.[1];
const value = (source, key) => fm(source)?.match(new RegExp(`^${key}:\\s*(.*)$`, 'm'))?.[1] ?? null;

for (let i = 0; i < names.length; i++) {
  const blocks = fences(sources[i]);
  assert.ok(blocks.length, `${names[i]} has named source fences`);
  assert.ok(blocks.every(({ body }) => body.trim()), `${names[i]} has no empty fences`);
  const head = execFileSync('git', ['show', `HEAD:${path.posix.join(base, names[i])}`], { encoding: 'utf8' });
  for (const key of ['slug', 'date', 'draft', 'seriesOrder']) {
    assert.equal(value(sources[i], key), value(head, key), `${names[i]} preserves ${key}`);
  }
  console.log(`PASS named fence extraction and metadata preservation ${names[i]} (${blocks.length} fences)`);
}

const [p1, p2, p3, p4, p5] = sources;
assert.match(p1, /irqsoff`는 IRQ가 비활성화된 구간의 길이를 추적/);
assert.match(p1, /histogram은 IRQ entry 횟수를 세는 예시일 뿐 latency를 측정하지 않습니다/);
assert.match(p1, /Deadline miss rate \(>100 µs\).*\| 0\.12% \| 0%/);
assert.doesNotMatch(p1, /SD 카드 IRQ 핸들러가 범인입니다|정확히 일치했습니다/);
console.log('PASS 6-01 tracer scope, histogram count semantics, and deadline table consistency');

assert.match(p2, /2 × 1024³ = 2,147,483,648 FLOP/);
assert.match(p2, /2\.15 GFLOP \/ 15 GFLOP\/s ≈ 0\.143 초/);
assert.match(p2, /kk == 0 \? 0\.0f : C\[i \* N \+ j\]/);
assert.match(p2, /i_end = ii \+ TILE < N/);
assert.match(p2, /수평 합산과 scalar tail/);
assert.doesNotMatch(p2, /^이론값:\s*2\.1 GFLOPS × 1\.8 GHz × 4/m);
console.log('PASS 6-02 unit arithmetic and matrix loop boundary/initialization source assertions');

assert.match(p3, /perf-lock 매뉴얼/);
assert.match(p3, /not verbatim perf output for a pthread mutex/);
assert.match(p3, /_Atomic uint64_t/);
assert.match(p3, /worker_id is assigned once to a worker/);
assert.doesNotMatch(p3, /`sched_getcpu\(\)`로 현재 실행 중인 CPU의 슬롯/);
console.log('PASS 6-03 userspace lock evidence boundary and race-safe worker counter source assertions');

assert.match(p4, /248,832,000 B\/s = 248\.832 MB\/s/);
assert.match(p4, /2048 byte \/ 340 ns ≈ 6\.02 GB\/s/);
assert.match(p4, /DMAengine client 문서/);
assert.doesNotMatch(p4, /dma_engine_start_chain|안정적으로 도달했고/);
console.log('PASS 6-04 payload/transfer arithmetic and documented DMAengine API boundary');

assert.match(p5, /H100 SXM 5개 \(GPU당 80 GB HBM\)/);
assert.match(p5, /\| HBM 총량 \| 400 GB nominal/);
assert.match(p5, /3\.35 TB\/s/);
assert.match(p5, /per direction/);
assert.match(p5, /DAMON이 LLM KV block을 자동 식별·이동한다는 뜻은 아닙니다/);
assert.match(p5, /실행 가능한 vLLM CXL 설정을 제공하지 않습니다/);
assert.doesNotMatch(p5, /\| GPU \| 5x NVIDIA H100 96 GB|\*PCIe 5\.0 x16 양방향 64 GB\/s\*|215 ns|56 GB\/s\/카드|275% 향상/);
console.log('PASS 6-05 H100/CXL/PCIe/vLLM scope and unsupported performance claims removed');

const temp = mkdtempSync(path.join(os.tmpdir(), 'perf-part6-'));
try {
  const m2 = fences(p2);
  const scalar = m2.find(({ body }) => body.includes('void matmul(float *A'))?.body;
  const transpose = m2.find(({ body }) => body.includes('void transpose(float *B'))?.body;
  const tiled = m2.find(({ body }) => body.includes('void matmul_tiled(float *A'))?.body;
  assert.ok(scalar && transpose && tiled, '6-02 baseline, transpose, and tiled C fences extracted');
  const matrixHarness = `
#include <stdio.h>
#include <stdlib.h>
${scalar}
${transpose}
${tiled}
static int check(int n, int negative) {
  float *a=calloc((size_t)n*n,sizeof(float)), *b=calloc((size_t)n*n,sizeof(float));
  float *bt=calloc((size_t)n*n,sizeof(float)), *ref=calloc((size_t)n*n,sizeof(float));
  float *out=calloc((size_t)n*n,sizeof(float));
  if(!a||!b||!bt||!ref||!out) return 2;
  for(int i=0;i<n*n;i++){ a[i]=(float)((i*7)%19-9)/7.0f; b[i]=(float)((i*11)%23-11)/9.0f; }
  transpose(b,bt,n); matmul(a,b,ref,n); matmul_tiled(a,negative?b:bt,out,n);
  int mismatch=0;
  for(int i=0;i<n*n;i++) if(__builtin_fabsf(ref[i]-out[i])>1e-4f) mismatch=1;
  free(a);free(b);free(bt);free(ref);free(out); return mismatch;
}
int main(void){
  if(check(3,0)||check(32,0)||check(33,0)) return 1;
  if(!check(3,1)) return 2;
  puts("PASS matmul scalar reference vs tiled (N=3,32,33); negative B/BT layout detected");
  return 0;
}
`;
  const mf = path.join(temp, 'matmul.c');
  const me = path.join(temp, 'matmul');
  writeFileSync(mf, matrixHarness);
  execFileSync('clang', ['-std=c11', '-O2', '-Wall', '-Wextra', mf, '-o', me], { stdio: 'inherit' });
  console.log(execFileSync(me, { encoding: 'utf8' }).trim());

  const neon = m2.find(({ body }) => body.includes('float32x4_t acc = vdupq_n_f32'))?.body;
  assert.ok(neon, '6-02 AArch32 NEON excerpt extracted');
  const neonFile = path.join(temp, 'neon.c');
  writeFileSync(neonFile, `#include <arm_neon.h>\nvoid dot4(const float *A,const float *B,float *C,int i,int j,int N){\n${neon}\n}\n`);
  execFileSync('clang', ['-target', 'armv7-none-eabi', '-mfpu=neon', '-std=c11', '-Wall', '-Wextra', '-fsyntax-only', neonFile], { stdio: 'inherit' });
  console.log('PASS extracted AArch32 NEON syntax-only cross-target compile; no target execution/performance test');

  const m3 = fences(p3);
  const worker = m3.find(({ body }) => body.includes('_Atomic uint64_t packets'))?.body;
  const aggregate = m3.find(({ body }) => body.includes('struct stats aggregate(void)'))?.body;
  assert.ok(worker && aggregate, '6-03 worker and aggregation C fences extracted');
  const atomicHarness = `
#include <stdint.h>
#include <stdatomic.h>
#include <stdio.h>
#include <unistd.h>
typedef struct { uint64_t len; int err; } packet_t;
struct stats { uint64_t packets, bytes, errors; };
static void publish(struct stats *s){(void)s;}
${worker}
${aggregate}
int main(void){ packet_t p={.len=64,.err=1}; for(unsigned i=0;i<10000;i++) on_packet(0,&p);
  struct stats s=aggregate(); if(s.packets!=10000||s.bytes!=640000||s.errors!=10000) return 1;
  on_packet(MAX_WORKERS,&p); s=aggregate(); if(s.packets!=10000) return 2;
  printf("PASS worker atomic counters positive/invalid-worker checks: %llu packets\\n",(unsigned long long)s.packets); return 0; }
`;
  const af = path.join(temp, 'atomic.c');
  const ae = path.join(temp, 'atomic');
  writeFileSync(af, atomicHarness);
  execFileSync('clang', ['-std=c11', '-O2', '-Wall', '-Wextra', af, '-o', ae], { stdio: 'inherit' });
  console.log(execFileSync(ae, { encoding: 'utf8' }).trim());
} finally {
  rmSync(temp, { recursive: true, force: true });
}

const articleBase = path.join(root, base);
const manifestPath = path.join(root, 'reports/adsense-audit/fixes/performance-engineering-part6-2026-10-22.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
assert.equal(manifest.articles.length, names.length);
for (let i = 0; i < names.length; i++) {
  const article = manifest.articles[i];
  assert.equal(article.path, path.posix.join(base, names[i]));
  assert.match(article.status, /^(remediated|accepted|unassessed)$/);
  assert.equal(article.afterSha256, sha(readFileSync(path.join(root, article.path))));
  assert.ok(article.validation.length);
  if (article.status === 'unassessed') assert.ok(article.nextAction && article.reviewQuestion);
}
assert.equal(manifest.readyForIntegration, true, 'manifest finalized after all scoped checks');
console.log('PASS canonical status, article paths, after SHA, validation, and final readyForIntegration=true');
console.log(`PASS scoped article count ${sources.length}; no site build or hardware/runtime claim is implied`);
