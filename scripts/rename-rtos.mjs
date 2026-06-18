#!/usr/bin/env node
// Rename Practical RTOS Internals titles to descriptive, original-analysis style.
// Normalize invalid hour fields and spread across natural day groupings per Part.
//
// Usage:
//   node scripts/rename-rtos.mjs --dry-run
//   node scripts/rename-rtos.mjs

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..');
const DIR = join(REPO_ROOT, 'src', 'content', 'blog', 'embedded', 'rtos', 'practical-internals');
const DRY = process.argv.includes('--dry-run');

// [seriesOrder, file, newTitle, newDate]
const PLAN = [
  [ 0, '00-preface.md',                          'Practical RTOS Internals — 실시간 커널 내부 분석 시리즈 소개',                  '2026-05-04T09:00:00'],
  [ 1, 'part1-01-why-rtos.md',                   'RTOS가 필요한 이유 — 일반 OS와의 결정적 차이',                                   '2026-05-04T09:01:00'],
  [ 2, 'part1-02-task-thread.md',                'Task와 Thread 개념 — TCB·상태 머신·생명 주기 분석',                              '2026-05-04T09:02:00'],
  [ 3, 'part1-03-scheduling-algorithms.md',      '실시간 스케줄링 알고리즘 비교 — RR·Priority·EDF·RMS',                            '2026-05-04T09:03:00'],
  [ 4, 'part1-04-preemption.md',                 'Preemption과 Cooperation — 강제 전환 vs 자발 양보',                              '2026-05-04T09:04:00'],
  [ 5, 'part1-05-interrupts-rtos.md',            '인터럽트와 RTOS — ISR Context·Deferred Processing·FromISR API',                  '2026-05-04T09:05:00'],
  [ 6, 'part1-06-sync-basics.md',                '동기화 기초 분석 — Critical Section·Mutual Exclusion·Race Condition',            '2026-05-04T09:06:00'],
  [ 7, 'part1-07-semaphore.md',                  'Semaphore 개념 분해 — Counting·Binary·P/V 연산',                                  '2026-05-04T09:07:00'],
  [ 8, 'part1-08-mutex.md',                      'Mutex 개념 분해 — Ownership·Recursive·Priority Inheritance',                      '2026-05-04T09:08:00'],
  [ 9, 'part1-09-queues.md',                     '큐와 메시지 패싱 — Producer-Consumer·Ring Buffer·전달 의미',                      '2026-05-04T09:09:00'],
  [10, 'part1-10-realtime-analysis.md',          '실시간성 분석 — Latency·Jitter·Deadline·WCET·RMA',                                '2026-05-04T09:10:00'],

  [11, 'part2-01-ready-list.md',                 'Ready List 자료구조 분석 — Linked List·Bitmap·O(1) Scheduler',                    '2026-05-05T09:11:00'],
  [12, 'part2-02-blocked-list.md',               'Blocked List 자료구조 — Timeout 정렬·Delta List·Two-List Scheme',                 '2026-05-05T09:12:00'],
  [13, 'part2-03-scheduler-algorithm.md',        'Scheduler 알고리즘 구현 추적 — Next-Task Selection 로직',                          '2026-05-05T09:13:00'],
  [14, 'part2-04-context-switch.md',             'Context Switch 원리 분석 — 레지스터 저장·복원·Stack Frame',                       '2026-05-05T09:14:00'],
  [15, 'part2-05-cortex-m-context.md',           'ARM Cortex-M Context Switch — PendSV·MSP/PSP 어셈블리 추적',                       '2026-05-05T09:15:00'],
  [16, 'part2-06-cortex-a-context.md',           'ARM Cortex-A Context Switch — Mode 전환·SVC·Banked Registers',                    '2026-05-05T09:16:00'],
  [17, 'part2-07-riscv-context.md',              'RISC-V Context Switch 분석 — ECALL·mret·CSR',                                      '2026-05-05T09:17:00'],
  [18, 'part2-08-tick-timer.md',                 'RTOS Tick과 타이머 — SysTick·Generic Timer·configTICK_RATE_HZ',                   '2026-05-05T09:18:00'],
  [19, 'part2-09-tickless.md',                   'Tickless 모드 구현 — Idle Tick Suppression·Sleep·Wake 보정',                       '2026-05-05T09:19:00'],
  [20, 'part2-10-scheduler-latency.md',          'Scheduler Latency 측정 기법 — GPIO Toggle·DWT·ftrace·cyclictest',                  '2026-05-05T09:20:00'],
  [21, 'part2-11-tracing-observability.md',      'RTOS Tracing과 Observability — Tracealyzer·SystemView·ITM/ETM',                   '2026-05-05T09:21:00'],

  [22, 'part3-01-critical-section.md',           'Critical Section 구현 비교 — IRQ Disable·BASEPRI·Spinlock',                        '2026-05-06T09:22:00'],
  [23, 'part3-02-semaphore-impl.md',             'Semaphore 내부 구현 추적 — Counter·Wait List·ISR-Safe Variant',                    '2026-05-06T09:23:00'],
  [24, 'part3-03-mutex-impl.md',                 'Mutex 내부 구현 추적 — Owner·Recursion Count·ISR 금지',                            '2026-05-06T09:24:00'],
  [25, 'part3-04-priority-inversion.md',         'Priority Inversion 문제 — Mars Pathfinder 사례·Bounded vs Unbounded',              '2026-05-06T09:25:00'],
  [26, 'part3-05-priority-inheritance.md',       'Priority Inheritance 구현 — Inherit·Disinherit·Chain',                              '2026-05-06T09:26:00'],
  [27, 'part3-06-priority-ceiling.md',           'Priority Ceiling Protocol — Immediate vs Original 비교',                            '2026-05-06T09:27:00'],
  [28, 'part3-07-queue-impl.md',                 'Queue 내부 구현 추적 — Ring Buffer·2 Wait Lists·Atomic Send/Receive',              '2026-05-06T09:28:00'],
  [29, 'part3-08-event-group.md',                'Event Group 분석 — Bit Flag·AND/OR Wait·Sync Barrier',                              '2026-05-06T09:29:00'],
  [30, 'part3-09-isr-safe-api.md',               'ISR-Safe API 설계 — FromISR 패턴·Higher Priority Wake·Deferred Work',              '2026-05-06T09:30:00'],
  [31, 'part3-10-deadlock.md',                   'Deadlock 분석 — 4 조건·Wait-for Graph·Lock Ordering·Timeout',                       '2026-05-06T09:31:00'],
  [32, 'part3-11-stream-message-buffer.md',      'Stream Buffer와 Message Buffer — FreeRTOS 10의 Lock-Free SPSC',                    '2026-05-06T09:32:00'],

  [33, 'part4-01-realtime-memory.md',            '실시간 메모리 요구사항 — Determinism·Fragmentation·WCET',                          '2026-05-07T09:33:00'],
  [34, 'part4-02-freertos-heap.md',              'FreeRTOS Heap_1~5 분석 — 5종 Allocator의 구조와 트레이드오프',                     '2026-05-07T09:34:00'],
  [35, 'part4-03-tlsf.md',                       'TLSF Allocator 분석 — Two-Level Segregated Fit O(1)',                               '2026-05-07T09:35:00'],
  [36, 'part4-04-static-allocation.md',          'Static Allocation — 컴파일 타임으로 동적 위험 제거하기',                            '2026-05-07T09:36:00'],
  [37, 'part4-05-memory-pool.md',                'Memory Pool — Fixed-Size Block Allocator의 단순함과 강력함',                        '2026-05-07T09:37:00'],
  [38, 'part4-06-stack-overflow.md',             'Stack Overflow 탐지 — Canary·MPU·Watermark 3중 방어',                                '2026-05-07T09:38:00'],
  [39, 'part4-07-smp-rtos.md',                   'SMP RTOS 설계 — Ready List·Affinity·IPI·Load Balancing',                            '2026-05-07T09:39:00'],
  [40, 'part4-08-spinlock-smp.md',               'SMP Spinlock 구현 — LDREX/STREX·Ticket Lock·MCS·WFE/SEV',                          '2026-05-07T09:40:00'],
  [41, 'part4-09-software-timer.md',             'Software Timer 분석 — Daemon Task·자료구조·ISR-Safe API',                          '2026-05-07T09:41:00'],
  [42, 'part4-10-syscall.md',                    'RTOS System Call — SVC·ECALL·User/Kernel 분리·FreeRTOS-MPU',                       '2026-05-07T09:42:00'],
  [43, 'part4-11-trustzone-tfm.md',              'TrustZone과 TF-M — Secure/Non-Secure·NSC Veneer·PSA',                                '2026-05-07T09:43:00'],
  [44, 'part4-12-amp-openamp.md',                'AMP와 OpenAMP — Heterogeneous SoC·RPMsg·remoteproc',                                 '2026-05-07T09:44:00'],
  [45, 'part4-13-cpp-in-rtos.md',                'C++ in RTOS — RAII·std::thread·ETL·Coroutine',                                       '2026-05-07T09:45:00'],

  [46, 'part5-01-freertos-source.md',            'FreeRTOS 소스 분석 — tasks.c·queue.c·port.c 추적',                                  '2026-05-08T09:46:00'],
  [47, 'part5-02-zephyr-source.md',              'Zephyr 커널 분석 — k_thread·k_sem·Driver Model',                                    '2026-05-08T09:47:00'],
  [48, 'part5-03-rt-thread.md',                  'RT-Thread 분석 — Object 모델·Components·Smart·Studio',                              '2026-05-08T09:48:00'],
  [49, 'part5-04-porting.md',                    'RTOS 포팅 가이드 — 새 아키텍처에 옮기는 절차',                                        '2026-05-08T09:49:00'],
  [50, 'part5-05-selection-guide.md',            'RTOS 선택 가이드 — Footprint·License·Certification·Ecosystem',                       '2026-05-08T09:50:00'],
  [51, 'part5-06-nuttx.md',                      'Apache NuttX 분석 — POSIX·PX4·NASA Ingenuity',                                       '2026-05-08T09:51:00'],
  [52, 'part5-07-preempt-rt-linux.md',           'PREEMPT_RT Linux — Mainline 6.12·Xenomai 4·EVL',                                     '2026-05-08T09:52:00'],
];

function applyEdit(filePath, newTitle, newDate) {
  const raw = readFileSync(filePath, 'utf8');
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) throw new Error(`no frontmatter: ${filePath}`);
  const [, fm, body] = m;

  let newFm = fm;
  newFm = newFm.replace(/^title:\s*.*$/m, `title: "${newTitle}"`);
  newFm = newFm.replace(/^date:\s*.*$/m, `date: ${newDate}`);

  if (!/^title:/m.test(newFm) || !/^date:/m.test(newFm)) {
    throw new Error(`missing title/date after replace: ${filePath}`);
  }

  const out = `---\n${newFm}\n---\n${body}`;
  if (!DRY) writeFileSync(filePath, out);
}

let count = 0;
for (const [order, file, title, date] of PLAN) {
  const path = join(DIR, file);
  console.log(`[${order.toString().padStart(2)}] ${file}`);
  console.log(`     → ${title}`);
  console.log(`     → date: ${date}`);
  applyEdit(path, title, date);
  count++;
}
console.log(`\n${DRY ? 'DRY RUN' : 'APPLIED'}: ${count} files`);
