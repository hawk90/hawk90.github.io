---
title: "1-06: 동기화 기초 — Critical Section, Mutual Exclusion, Race Condition"
date: 2026-05-12T06:00:00
description: "공유 자원 보호의 3가지 도구 — interrupt disable, spinlock, mutex. 언제 어느 것을 쓰나."
series: "Practical RTOS Internals"
seriesOrder: 6
tags: [sync, critical-section, mutex, race-condition, atomic]
draft: true
---

## 한 줄 요약

> **"공유 데이터엔 동기화"** — Race condition은 *간헐 버그*의 1위. 짧고 정확한 보호가 핵심.

## Race Condition — 가장 까다로운 버그

```c
// 두 task가 같은 counter 증가
volatile uint32_t counter = 0;

void task_a(void *arg) {
    while (1) { counter++; vTaskDelay(1); }
}

void task_b(void *arg) {
    while (1) { counter++; vTaskDelay(1); }
}
```

`counter++`이 single instruction 같지만, 어셈블리로 보면:

```asm
LDR  r0, [counter]    ; (1) read
ADD  r0, r0, #1       ; (2) increment
STR  r0, [counter]    ; (3) write
```

**3 단계 사이에 preempt 되면** 다른 task가 *같은 값을 read* → 한 증가 분실.

```text
시점 →
Task A: read=5 . . . . . . . . . . . . . . . . . . increment=6, write=6
Task B: . . . . . . read=5 . . . increment=6, write=6 . . . . . .
결과: counter = 6 (7이 맞음)
```

## Critical Section — 보호 구간

"이 코드 블록은 *원자적으로* 실행" — 3가지 도구.

### 1. Interrupt Disable

가장 강력. ISR도 막음. **짧게 (수십 µs)** 유지.

```c
__disable_irq();
counter++;
__enable_irq();

// 또는 FreeRTOS API
taskENTER_CRITICAL();
counter++;
taskEXIT_CRITICAL();
```

#### 장단점

- ✓ ISR과도 안전
- ✓ Spin·context switch 없음
- ✗ ISR latency 증가 → 실시간성 ↓
- ✗ Long work 금지

### 2. Spinlock (SMP)

여러 코어에서 동작. *busy-wait*.

```c
spin_lock(&lock);
shared_data = value;
spin_unlock(&lock);
```

#### 장단점

- ✓ 짧은 critical section에 효율
- ✓ Context switch 없음 — latency 결정적
- ✗ SMP only — 단일 코어에서 의미 없음
- ✗ Hold time 길면 다른 코어 spin

### 3. Mutex (Task 간)

Blocking — 대기 task가 *Blocked 상태로* 전환.

```c
xSemaphoreTake(mutex, portMAX_DELAY);
shared_data = value;
xSemaphoreGive(mutex);
```

#### 장단점

- ✓ Long critical section OK
- ✓ Priority inheritance 가능 (Mars Pathfinder 해결)
- ✗ Context switch overhead
- ✗ ISR에서 사용 불가

## 선택 기준

| 상황 | 도구 |
| --- | --- |
| ISR과 task 공유, ≤ 10 µs | Interrupt disable |
| Task 간 공유, > 100 µs work | Mutex |
| SMP 짧은 작업 | Spinlock |
| Lock-free 가능 | atomic API |

## Atomic Operations

CPU의 *원자성 보장* 명령. 짧고 빠름.

```c
#include <stdatomic.h>

atomic_int counter = 0;
atomic_fetch_add(&counter, 1);   // counter++ atomic
```

ARMv7+ `ldrex/strex` (Load-Exclusive·Store-Exclusive):

```asm
loop:
    LDREX  r0, [counter]
    ADD    r0, r0, #1
    STREX  r1, r0, [counter]
    CMP    r1, #0           ; STREX 성공?
    BNE    loop             ; 실패 시 재시도
```

CAS (Compare-And-Swap) 변형. **Lock-free 자료구조의 토대**.

## Memory Ordering — Reordering 함정

ARM·RISC-V는 **relaxed memory model** — 컴파일러·CPU가 명령 순서 바꿈.

```c
// Producer
data = 42;            // (1)
ready = 1;            // (2)

// Consumer
while (!ready);       // (3)
use(data);            // (4) — 42 받는 보장 없음!
```

(1)과 (2)의 *write order* 바뀌면 (4)에서 *garbage* 읽음. 해결 — **memory barrier**:

```c
data = 42;
__sync_synchronize();   // 또는 std::atomic_thread_fence
ready = 1;
```

ARM의 `DMB ST` (Data Memory Barrier, Store), x86은 기본 strong order.

## False Sharing — Cache 함정

```c
struct {
    int counter_a;        // CPU 0이 자주 쓰기
    int counter_b;        // CPU 1이 자주 쓰기
} shared;                  // 같은 cache line 64 byte
```

CPU 0이 `counter_a` write → cache line 전체가 CPU 0의 cache로. CPU 1이 `counter_b` write → line이 CPU 1로 이동. *코어 간 ping-pong*. 해결 — *padding*:

```c
struct {
    alignas(64) int counter_a;
    alignas(64) int counter_b;
};
```

## Critical Section 길이 — 권장

| 작업 | 추정 시간 | 적합 도구 |
| --- | --- | --- |
| 변수 1개 update | 50 ns | atomic (또는 IRQ disable) |
| 구조체 update (수십 byte) | 1 µs | IRQ disable 또는 mutex |
| 1 KB 데이터 copy | 10 µs | mutex |
| File I/O, network | ms | mutex (절대 IRQ disable 금지) |

**IRQ disable은 최대 50 µs**. 그 이상이면 ISR이 막혀 *interrupt loss* 위험.

## Volatile — 동기화 ≠

`volatile`은 **컴파일러 최적화 방지**만. *Atomic 아님*, *memory order 아님*.

```c
volatile int counter = 0;
counter++;  // 여전히 3-instruction → race condition
```

`volatile`은 *MMIO register access* (HW) 또는 *interrupt-shared flag* 같은 *single-byte flag*에만.

## FreeRTOS API 요약

| API | 효과 |
| --- | --- |
| `taskENTER_CRITICAL()` | IRQ mask (BASEPRI) + scheduler suspend |
| `taskEXIT_CRITICAL()` | 복원 |
| `taskENTER_CRITICAL_FROM_ISR()` | ISR 내 critical section |
| `vTaskSuspendAll()` | Scheduler 정지 (IRQ는 활성) |
| `xTaskResumeAll()` | 복원 |
| `portDISABLE_INTERRUPTS()` | IRQ 완전 mask |

## 자주 하는 실수

> ⚠️ `volatile`로 race condition 해결 시도

위 설명. *atomic API* 또는 *critical section* 필요.

> ⚠️ Critical section 안에서 long work

100 ms 작업 + critical section → 그 동안 *모든 ISR·task 막힘*. 짧게.

> ⚠️ Memory barrier 누락

ARM·RISC-V relaxed model에서 *write order 보장 X*. 멀티코어·DMA와 share 시 barrier 필수.

> ⚠️ Mutex를 ISR에서

ISR에서 mutex take 시도 → crash. *Semaphore Give* (signal)만 가능.

## 정리

- Race condition = *공유 데이터 + 동시 접근 + 동기화 없음*.
- 보호 도구 3종 — **IRQ disable**, **Spinlock (SMP)**, **Mutex**.
- 짧은 작업 = IRQ disable, 긴 작업 = mutex.
- **Atomic API**가 lock-free의 토대.
- `volatile` ≠ atomic ≠ memory barrier — 셋 다 별개.

다음 편은 **Semaphore 개념** — Counting·Binary·사용 패턴.

## 관련 항목

- [1-05: 인터럽트와 RTOS](/blog/embedded/rtos/practical-internals/part1-05-interrupts-rtos)
- [1-07: Semaphore 개념](/blog/embedded/rtos/practical-internals/part1-07-semaphore)
- [3-01: Critical Section 구현](/blog/embedded/rtos/practical-internals/part3-01-critical-section)
