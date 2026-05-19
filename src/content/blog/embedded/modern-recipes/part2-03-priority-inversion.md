---
title: "2-03: Priority Inversion 진단·예방 — Mars Pathfinder Lesson"
date: 2026-05-20T04:00:00
description: "Priority Inversion 발생 시나리오. Mars Pathfinder 사례. PI mutex, Priority Ceiling."
series: "Modern Embedded Recipes"
seriesOrder: 9
tags: [recipes, priority-inversion, mars-pathfinder, pi, mutex]
draft: true
---

## 한 줄 요약

> **"Priority Inversion = High task가 Low 잠금 자원 대기 + Medium에 차단됨"** — Mars Pathfinder 1997을 정지시켰던 bug.

## 시나리오

세 task가 시간축에서 어떻게 얽히는지 timeline으로 보면 한눈에 들어옵니다.

![Priority inversion timeline — High이 Low의 mutex를 기다리는 동안 Medium에 차단됨](/images/blog/modern-recipes/diagrams/part2-03-priority-inversion.svg)

```text
Task H (high) — periodic, 10 ms deadline
Task M (medium) — 일반 작업
Task L (low) — log writer, mutex 보유

t=0:  L take(mtx) → 시작
t=1:  H runnable → preempt L, H 실행
t=2:  H take(mtx) → block (L 보유 중)
t=2:  L ready, but M now CPU 점유 (L 못 가짐)
t=10: M 계속 진행 → H deadline miss
```

Medium task가 lock과 무관함에도 *high task 블록*.

## Mars Pathfinder (1997)

```text
NASA의 Sojourner rover 시스템:
  - Bus management task (high)
  - Comm task (medium) — frequent
  - Weather task (low) — info_bus mutex 보유
  
순환:
  - Weather 작업 중 → bus mgmt preempt
  - Bus mgmt → mutex 시도 → block
  - Comm 빈번 → CPU 점유
  - Weather 미실행 → mutex 못 풀음
  - Bus mgmt deadline miss → watchdog reset
```

매 며칠마다 *system reset*. 지구에서 *원격 debug* → priority inheritance 활성화 → 해결.

## Tony Hoare의 회상

```text
"Priority Inheritance was implemented in VxWorks but disabled by default
 because of overhead concerns. We had to push the update."
```

VxWorks `selectPriorityInherit` 활성화 → 해결.

## 해결 1: Priority Inheritance (PI)

```text
Low task가 mutex 보유 중 High task가 same mutex 대기:
  → Low task의 priority가 *High 수준으로 boost*
  → Medium이 preempt 못 함
  → Low 빨리 완료 → mutex give → High 진행
```

FreeRTOS PI mutex (`xSemaphoreCreateMutex`):

```c
SemaphoreHandle_t mtx = xSemaphoreCreateMutex();   /* PI 자동 활성 */

xSemaphoreTake(mtx, portMAX_DELAY);   /* High waiting → Low boost */
critical();
xSemaphoreGive(mtx);   /* boost 복원 */
```

POSIX:

```c
pthread_mutexattr_setprotocol(&attr, PTHREAD_PRIO_INHERIT);
pthread_mutex_init(&mtx, &attr);
```

## Chain Inheritance

```text
L1 보유 mtx_A, L2 보유 mtx_B
L1 mtx_B 대기 → L2 boost
H mtx_A 대기 → L1·L2 둘 다 boost
```

체인 길이 N → boost N번 propagation. *수십 µs* 가능.

자동차 ASIL-D — *chain depth 제한* (보통 ≤ 3).

## 해결 2: Priority Ceiling Protocol (PCP)

```text
각 mutex에 *ceiling priority* 미리 지정
  ceiling = mutex를 *사용할 가능성 있는* 모든 task 중 *최고 priority*

Take 시 — task priority가 ceiling 수준으로 *즉시 boost*
Give 시 — 원래 priority 복원
```

VxWorks·INTEGRITY·µC/OS 일부 — PCP 지원. WCET 분석 *훨씬 쉬움*.

### Immediate vs Original PCP

```text
Immediate PCP (Sha 1990):
  Take 즉시 ceiling boost — 다른 mutex 대기 안 함
  
Original PCP:
  Ceiling만큼 boost되어 *다른 lower priority task만* preempt 가능
```

Immediate가 *구현 쉬움* + 효과 같음. Modern RTOS 표준.

## 해결 3: Priority Ceiling Emulation (PCE)

Linux PREEMPT_RT — *robust mutex + priority ceiling*:

```c
pthread_mutexattr_setprotocol(&attr, PTHREAD_PRIO_PROTECT);
pthread_mutexattr_setprioceiling(&attr, 90);
pthread_mutex_init(&mtx, &attr);
```

Take 시 *ceiling 90으로 boost*. 자동 *우선순위 통제*.

## 진단 — Tracealyzer / SystemView

Trace 화면:
- Task L "running" with priority boost 표시
- Mutex held by L
- Task H "blocked on mutex"

→ Priority inversion 직접 시각화.

```c
/* Debug — boost 횟수 측정 */
struct mutex_stats {
    uint32_t boost_count;
    uint32_t max_boost_ms;
};
```

## ISR과 Priority Inversion

```text
ISR run on H mutex held → ISR no priority concept
  → 단순 block 아니라 *ISR is blocked task* — 일반적으로 ISR이 mutex 안 잡음
```

ISR ↔ task — *semaphore* (signaling). Mutex는 *task 간만*.

## 예방 — Design Rule

1. **Short critical section** — μs 단위
2. **No mutex held during sleep/IO**
3. **Lock ordering** — deadlock + chain inheritance 제한
4. **PI mutex 사용** — default activated

```c
/* 회피 */
xSemaphoreTake(&mtx, portMAX_DELAY);
read_file();   /* ← seconds */
xSemaphoreGive(&mtx);

/* Good */
read_file();
xSemaphoreTake(&mtx, portMAX_DELAY);
update_var();
xSemaphoreGive(&mtx);
```

## Automotive — Lock 사용 자제

```text
ASIL-D ECU:
  - Mutex 자제, double buffer 또는 lock-free
  - 사용 시 *Immediate PCP* + WCET 분석
  - 일부 코드는 *mutex 자체 금지*
```

자동차 — *예측 가능*이 *throughput*보다 우선.

## Boeing 787 Bug

```text
2015 — 787 시스템:
  248일 후 RTOS counter overflow
  → priority inversion-like 상태로 fail
```

테스트되지 않은 long-run path — *WCET 분석에 포함*. 단기 테스트로 못 잡음.

## WCET 분석

```text
Task H budget: 100 µs
Mutex hold worst case (Low): 50 µs
Inheritance chain depth: 2 → +100 µs
Total worst case wait: 150 µs

H가 매 1 ms tick에 — budget 안 OK? → 100 µs < 1 ms ✓
```

aiT·Bound-T 등 *정적 WCET 도구*. 자동차·항공 표준.

## 자주 하는 실수

> ⚠️ Non-PI mutex 사용

```c
SemaphoreHandle_t mtx = xSemaphoreCreateBinary();   /* ← PI 없음 — semaphore */
```

→ `xSemaphoreCreateMutex` (PI 자동).

> ⚠️ Long task in mutex

```c
xSemaphoreTake(mtx, ...);
http_request();   /* seconds — high task block */
xSemaphoreGive(mtx);
```

→ data 사전 fetch + 짧은 critical.

> ⚠️ ISR이 mutex 사용

```c
ISR: xSemaphoreTake(mtx, 0);   /* ✗ */
```

→ semaphore.

> ⚠️ Priority 계층 잘못 설계

```c
Task H priority 5
Task M priority 5    /* ← same priority → preempt 없음, FIFO */
```

→ Priority 명확히 다르게.

## 정리

- Priority Inversion = **Low 보유 + Medium preempt = High block**.
- Mars Pathfinder 1997 — *원격 patch로 해결*.
- **PI mutex** = 보유자 priority 동적 boost.
- **PCP** = 컴파일 타임 ceiling, 더 단순한 분석.
- Chain inheritance = depth 제한 필요.
- ASIL-D — *lock 자체 자제*, double buffer 선호.

다음 편은 **Memory Barrier**.

## 관련 항목

- [2-02: Lock-Free Ring](/blog/embedded/modern-recipes/part2-02-lock-free-ring)
- [2-04: Memory Barrier](/blog/embedded/modern-recipes/part2-04-memory-barrier)
- [RTOS 3-04: Priority Inversion](/blog/embedded/rtos/practical-internals/part3-04-priority-inversion)
