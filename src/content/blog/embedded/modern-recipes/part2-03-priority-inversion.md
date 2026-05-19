---
title: "2-03: Priority Inversion 진단·예방 — Mars Pathfinder Lesson"
date: 2026-05-07T04:00:00
description: "Priority Inversion 발생 시나리오. Mars Pathfinder 사례. PI mutex, Priority Ceiling."
series: "Modern Embedded Recipes"
seriesOrder: 9
tags: [recipes, priority-inversion, mars-pathfinder, pi, mutex]
draft: false
---

## 한 줄 요약

> **"Priority Inversion = High task가 Low 잠금 자원 대기 + Medium에 차단됨"** 1997년 Mars Pathfinder를 정지시켰던 bug입니다.

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

Medium task는 lock과 무관한데도 결과적으로 *high task를 블록*합니다.

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

매 며칠마다 *system reset*이 일어났습니다. 지구에서 원격으로 debug를 진행했고, priority inheritance를 활성화해 문제를 해결했습니다.

## Tony Hoare의 회상

```text
"Priority Inheritance was implemented in VxWorks but disabled by default
 because of overhead concerns. We had to push the update."
```

VxWorks의 `selectPriorityInherit`를 활성화해 문제를 해결했습니다.

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

체인 길이가 N이면 boost가 N번 propagation됩니다. 그러면 *수십 µs*까지 시간이 누적될 수 있습니다.

자동차 ASIL-D에서는 *chain depth를 제한*합니다(보통 3 이하).

## 해결 2: Priority Ceiling Protocol (PCP)

```text
각 mutex에 *ceiling priority* 미리 지정
  ceiling = mutex를 *사용할 가능성 있는* 모든 task 중 *최고 priority*

Take 시 — task priority가 ceiling 수준으로 *즉시 boost*
Give 시 — 원래 priority 복원
```

VxWorks와 INTEGRITY, 일부 µC/OS는 PCP를 지원합니다. 덕분에 WCET 분석이 *훨씬 쉬워집니다*.

### Immediate vs Original PCP

```text
Immediate PCP (Sha 1990):
  Take 즉시 ceiling boost — 다른 mutex 대기 안 함
  
Original PCP:
  Ceiling만큼 boost되어 *다른 lower priority task만* preempt 가능
```

Immediate 방식이 *구현이 쉬우면서도* 효과는 같습니다. 그래서 Modern RTOS의 표준이 되었습니다.

## 해결 3: Priority Ceiling Emulation (PCE)

Linux PREEMPT_RT는 *robust mutex와 priority ceiling*을 함께 제공합니다.

```c
pthread_mutexattr_setprotocol(&attr, PTHREAD_PRIO_PROTECT);
pthread_mutexattr_setprioceiling(&attr, 90);
pthread_mutex_init(&mtx, &attr);
```

Take 시점에 *ceiling인 90으로 boost*되어 우선순위가 자동으로 통제됩니다.

## 진단 — Tracealyzer / SystemView

Trace 화면에서는 다음과 같이 확인할 수 있습니다.

- Task L이 "running" 상태로 priority boost와 함께 표시됩니다.
- Mutex가 L에 의해 잡혀 있다고 보입니다.
- Task H는 "blocked on mutex" 상태로 표시됩니다.

이렇게 하면 priority inversion을 직접 시각적으로 확인할 수 있습니다.

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

ISR과 task 사이에는 *semaphore*(signaling)를 씁니다. Mutex는 *task 간에만* 사용합니다.

## 예방 — Design Rule

1. **Short critical section**을 μs 단위로 유지합니다.
2. Sleep이나 IO 중에는 **mutex를 잡지 않습니다**.
3. **Lock ordering**으로 deadlock과 chain inheritance를 제한합니다.
4. **PI mutex**를 사용합니다(기본 활성화).

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

자동차에서는 *예측 가능성*이 *throughput*보다 우선합니다.

## Boeing 787 Bug

```text
2015 — 787 시스템:
  248일 후 RTOS counter overflow
  → priority inversion-like 상태로 fail
```

테스트되지 않은 long-run path는 *WCET 분석에 반드시 포함*해야 합니다. 단기 테스트만으로는 잡히지 않습니다.

## WCET 분석

```text
Task H budget: 100 µs
Mutex hold worst case (Low): 50 µs
Inheritance chain depth: 2 → +100 µs
Total worst case wait: 150 µs

H가 매 1 ms tick에 — budget 안 OK? → 100 µs < 1 ms ✓
```

aiT와 Bound-T 같은 *정적 WCET 도구*를 활용합니다. 자동차와 항공 분야의 표준입니다.

## 자주 하는 실수

> ⚠️ Non-PI mutex 사용

```c
SemaphoreHandle_t mtx = xSemaphoreCreateBinary();   /* ← PI 없음 — semaphore */
```

대신 `xSemaphoreCreateMutex`를 써야 PI가 자동으로 동작합니다.

> ⚠️ Long task in mutex

```c
xSemaphoreTake(mtx, ...);
http_request();   /* seconds — high task block */
xSemaphoreGive(mtx);
```

이때는 데이터를 미리 fetch해 두고 critical section을 짧게 유지해야 합니다.

> ⚠️ ISR이 mutex 사용

```c
ISR: xSemaphoreTake(mtx, 0);   /* ✗ */
```

ISR에서는 mutex 대신 semaphore를 써야 합니다.

> ⚠️ Priority 계층 잘못 설계

```c
Task H priority 5
Task M priority 5    /* ← same priority → preempt 없음, FIFO */
```

이런 경우에는 priority를 명확히 다르게 지정해야 합니다.

## 정리

- Priority Inversion은 **Low가 보유 + Medium이 preempt = High가 block**되는 상황입니다.
- Mars Pathfinder는 1997년에 *원격 patch로 해결*했습니다.
- **PI mutex**는 보유자 priority를 동적으로 boost합니다.
- **PCP**는 컴파일 타임 ceiling을 활용해 더 단순한 분석이 가능합니다.
- Chain inheritance는 depth 제한이 필요합니다.
- ASIL-D에서는 *lock 자체를 자제*하고 double buffer를 선호합니다.

다음 편은 **Memory Barrier**입니다.

## 관련 항목

- [2-02: Lock-Free Ring](/blog/embedded/modern-recipes/part2-02-lock-free-ring)
- [2-04: Memory Barrier](/blog/embedded/modern-recipes/part2-04-memory-barrier)
- [RTOS 3-04: Priority Inversion](/blog/embedded/rtos/practical-internals/part3-04-priority-inversion)
