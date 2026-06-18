#!/usr/bin/env node
// Rename Embedded Performance Engineering titles.

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..');
const DIR = join(REPO_ROOT, 'src', 'content', 'blog', 'embedded', 'performance-engineering');
const DRY = process.argv.includes('--dry-run');

const PLAN = [
  [ 0, '00-preface.md',                         'Embedded Performance Engineering — 임베디드 성능 엔지니어링 시리즈 소개',                   '2026-04-23', 0],

  // Part 1 — 방법론
  [ 1, 'part1-01-methodology.md',               '임베디드 성능 분석 방법론 — Measure → Analyze → Optimize 사이클',                            '2026-04-23', 1],
  [ 2, 'part1-02-metrics.md',                   '성능 지표 정의 — Latency·Throughput·Utilization 분석',                                        '2026-04-23', 2],
  [ 3, 'part1-03-measurement.md',               '성능 측정의 기본 — Wall-Clock·CPU Cycle·Instruction Count',                                    '2026-04-23', 3],
  [ 4, 'part1-04-statistics.md',                '성능 데이터 통계적 분석 — Percentile·Histogram·평균의 함정',                                    '2026-04-23', 4],
  [ 5, 'part1-05-realtime.md',                  '실시간 성능 분석 — WCET·Jitter·Deadline Miss 측정',                                              '2026-04-23', 5],
  [ 6, 'part1-06-benchmark.md',                 '임베디드 벤치마킹 기초 — 재현성·Warmup·노이즈 제거',                                            '2026-04-23', 6],
  [ 7, 'part1-07-modeling.md',                  '성능 모델링 — Amdahl·Gustafson·Roofline Model 적용',                                             '2026-04-23', 7],
  [ 8, 'part1-08-profiling-overview.md',        '프로파일링 기법 개요 — Sampling vs Instrumentation·PGO·LTO',                                     '2026-04-23', 8],

  // Part 2 — CPU·캐시·메모리
  [ 9, 'part2-01-pipeline.md',                  'CPU 파이프라인 분석 — 5-stage·Cortex-M·Cortex-A 비교',                                          '2026-04-24', 0],
  [10, 'part2-02-pipeline-stall.md',            'Pipeline Stall 분석 — Data·Structural·Control Hazard·Forwarding',                                '2026-04-24', 1],
  [11, 'part2-03-branch-prediction.md',         'Branch Prediction 분석 — Static·2-bit·BTB·BHT·Mispredict 비용',                                  '2026-04-24', 2],
  [12, 'part2-04-speculative-execution.md',     'Speculative Execution 분석 — OoO·Reorder Buffer·Register Renaming',                              '2026-04-24', 3],
  [13, 'part2-05-cache-basics.md',              'CPU Cache 기초 — L1·L2·L3·Set Associative·Replacement Policy',                                   '2026-04-24', 4],
  [14, 'part2-06-cache-miss.md',                'Cache Miss 3C Model 분석 — Compulsory·Capacity·Conflict',                                         '2026-04-24', 5],
  [15, 'part2-07-cache-line.md',                'Cache Line 최적화 — Alignment·Prefetch·False Sharing 처리',                                       '2026-04-24', 6],
  [16, 'part2-08-memory-bandwidth.md',          '메모리 대역폭 분석 — STREAM·Roofline·Bus Saturation 측정',                                        '2026-04-24', 7],
  [17, 'part2-09-simd-neon.md',                 'SIMD·NEON 활용 — 128-bit Vector·Auto-Vectorization·SVE/SVE2',                                     '2026-04-24', 8],
  [18, 'part2-10-pmu.md',                       'PMU·HPM 하드웨어 카운터 분석 — 정밀 성능 진단',                                                    '2026-04-24', 9],

  // Part 3 — 버스·DMA·인터럽트
  [19, 'part3-01-bus-architecture.md',          '임베디드 Bus Architecture — AHB·AXI·CHI 진화와 5-Channel',                                         '2026-04-25', 0],
  [20, 'part3-02-bus-contention.md',            'Bus Contention 진단 — Arbitration·QoS·Starvation 측정',                                            '2026-04-25', 1],
  [21, 'part3-03-dma-performance.md',           'DMA 성능 최적화 — Burst·Scatter-Gather·Chain·Cache 일관성',                                        '2026-04-25', 2],
  [22, 'part3-04-dma-vs-cpu.md',                'DMA vs CPU Copy 성능 비교 — Break-even·Setup Overhead 실측',                                       '2026-04-25', 3],
  [23, 'part3-05-interrupt-latency.md',         'Interrupt Latency 분석 — 진입·종료·Tail-Chaining·Late Arrival',                                    '2026-04-25', 4],
  [24, 'part3-06-interrupt-storm.md',           'Interrupt Storm 처리 — NAPI·Rate-Limit·Polling 전환',                                              '2026-04-25', 5],
  [25, 'part3-07-mmio.md',                      'MMIO 접근 성능 — Cache Policy·Write-Combining·Volatile·Barrier',                                   '2026-04-25', 6],
  [26, 'part3-08-peripheral-clock.md',          'Peripheral Clock 분석 — PLL·Divider·Gating·DVFS',                                                   '2026-04-25', 7],
  [27, 'part3-09-power-vs-performance.md',      'Power vs Performance 트레이드오프 — DVFS·Race-to-Idle·Big.LITTLE',                                  '2026-04-25', 8],
  [28, 'part3-10-thermal.md',                   'Thermal Throttling 분석 — Junction Temp·Trip Point·냉각',                                          '2026-04-25', 9],
  [29, 'part3-11-cxl-interconnect.md',          'CXL Interconnect 분석 — AI 시대 메모리 대역폭 확장',                                                '2026-04-25', 10],

  // Part 4 — 동시성·SMP
  [30, 'part4-01-concurrency-basics.md',        'Concurrency 기초 — Concurrency vs Parallelism·Race·Memory Model',                                  '2026-04-26', 0],
  [31, 'part4-02-false-sharing.md',             'False Sharing 진단 — Cache Line Ping-Pong·Padding·측정',                                            '2026-04-26', 1],
  [32, 'part4-03-lock-contention.md',           'Lock Contention 분석 — Wait·Hold·Convoy·측정 기법',                                                 '2026-04-26', 2],
  [33, 'part4-04-spinlock.md',                  'Spinlock 성능 분석 — Spin-Wait vs Context Switch·Ticket·MCS',                                       '2026-04-26', 3],
  [34, 'part4-05-mutex.md',                     'Mutex 성능 분석 — Futex·Adaptive·Priority Inheritance',                                              '2026-04-26', 4],
  [35, 'part4-06-rw-lock.md',                   'Reader-Writer Lock 성능 — Reader/Writer Priority·RCU·Seqlock',                                      '2026-04-26', 5],
  [36, 'part4-07-lock-free.md',                 'Lock-Free 자료구조 성능 — CAS·ABA·Hazard Pointer·Epoch Reclamation',                                '2026-04-26', 6],
  [37, 'part4-08-memory-ordering.md',           'Memory Ordering 분석 — Acquire·Release·Seq-Cst·ARM Relaxed Model',                                 '2026-04-26', 7],
  [38, 'part4-09-cache-coherency.md',           'Cache Coherency 프로토콜 — MESI·MOESI·Snoop·Directory',                                              '2026-04-26', 8],
  [39, 'part4-10-smp-analysis.md',              'SMP 성능 분석 — Per-Core·Affinity·Load Balance·Scalability',                                         '2026-04-26', 9],

  // Part 5 — 프로파일링 도구
  [40, 'part5-01-perf-basics.md',               'Linux perf 기초 — stat·record·report 활용',                                                          '2026-04-27', 0],
  [41, 'part5-02-perf-advanced.md',             'Linux perf 고급 — Raw Event·Tracepoint·perf script',                                                 '2026-04-27', 1],
  [42, 'part5-03-ftrace.md',                    'ftrace 활용 — function·function_graph·latency tracer',                                               '2026-04-27', 2],
  [43, 'part5-04-ebpf.md',                      'eBPF·bpftrace 동적 트레이싱 — 커널 무수정 관측',                                                    '2026-04-27', 3],
  [44, 'part5-05-flamegraph.md',                'Flamegraph 분석 — On-CPU·Off-CPU·Differential',                                                      '2026-04-27', 4],
  [45, 'part5-06-arm-ds-lauterbach.md',         'ARM DS·Lauterbach 분석 — Hardware Trace 전문 도구',                                                  '2026-04-27', 5],
  [46, 'part5-07-baremetal-profiling.md',       'Bare-metal 프로파일링 — GPIO·DWT·SysTick·ITM 활용',                                                  '2026-04-27', 6],
  [47, 'part5-08-nsight.md',                    'NVIDIA Nsight Systems — GPU·NPU 포함 시스템 분석',                                                    '2026-04-27', 7],
  [48, 'part5-09-tracy-hotspot.md',             '모던 프로파일러 비교 — Tracy·Hotspot·uftrace·Coz',                                                   '2026-04-27', 8],
  [49, 'part5-10-ebpf-continuous.md',           '연속 프로파일링 — Parca·Pixie·Pyroscope·Tetragon',                                                    '2026-04-27', 9],

  // Part 6 — 실전 사례
  [50, 'part6-01-case-isr-latency.md',          '실전 사례 — ISR Latency 100µs Deadline Miss 추적',                                                   '2026-04-28', 0],
  [51, 'part6-02-case-cache-thrashing.md',      '실전 사례 — Matrix Multiply가 예상의 10배 느린 이유',                                                '2026-04-28', 1],
  [52, 'part6-03-case-lock-contention.md',      '실전 사례 — 8-core가 4-core를 넘으면 throughput이 떨어지는 이유',                                     '2026-04-28', 2],
  [53, 'part6-04-case-dma-tuning.md',           '실전 사례 — 카메라 1080p 60fps가 30fps로 떨어지는 이유',                                              '2026-04-28', 3],
];

function fmt(day, minute) {
  return `${day}T09:${minute.toString().padStart(2, '0')}:00`;
}

function applyEdit(filePath, newTitle, newDate) {
  const raw = readFileSync(filePath, 'utf8');
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) throw new Error(`no frontmatter: ${filePath}`);
  const [, fm, body] = m;

  let newFm = fm;
  newFm = newFm.replace(/^title:\s*.*$/m, `title: "${newTitle}"`);
  newFm = newFm.replace(/^date:\s*.*$/m, `date: ${newDate}`);

  const out = `---\n${newFm}\n---\n${body}`;
  if (!DRY) writeFileSync(filePath, out);
}

let count = 0;
for (const [order, file, title, day, minute] of PLAN) {
  const path = join(DIR, file);
  const date = fmt(day, minute);
  applyEdit(path, title, date);
  count++;
}
console.log(`${DRY ? 'DRY RUN' : 'APPLIED'}: ${count} files`);
