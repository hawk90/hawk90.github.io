---
title: "동기화 기초 분석 — Critical Section·Mutual Exclusion·Race Condition"
date: 2026-05-04T09:06:00
description: "공유 자원 보호의 3가지 도구로 interrupt disable, spinlock, mutex가 있습니다. 언제 어느 것을 쓰는지 정리합니다."
series: "Practical RTOS Internals"
seriesOrder: 6
tags: [sync, critical-section, mutex, race-condition, atomic]
draft: false
---

## 한 줄 요약

> **"공유 데이터엔 동기화"** — Race condition은 간헐 버그의 1위입니다. 짧고 정확한 보호가 핵심입니다.

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

**3 단계 사이에 preempt 되면** 다른 task가 같은 값을 read 하면서 증가분 하나를 잃습니다.

```text
시점 →
Task A: read=5 . . . . . . . . . . . . . . . . . . increment=6, write=6
Task B: . . . . . . read=5 . . . increment=6, write=6 . . . . . .
결과: counter = 6 (7이 맞음)
```

## Critical Section — 보호 구간

"이 코드 블록은 원자적으로 실행한다"는 목표를 달성하기 위한 3가지 도구를 살펴봅니다.

### 1. Interrupt Disable

가장 강력합니다. ISR도 막습니다. **짧게(수십 µs)** 유지해야 합니다.

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

- ✓ ISR과도 안전합니다
- ✓ Spin·context switch가 없습니다
- ✗ ISR latency가 늘어 실시간성이 떨어집니다
- ✗ Long work는 금지입니다

### 2. Spinlock (SMP)

여러 코어에서 동작합니다. busy-wait 방식입니다.

```c
spin_lock(&lock);
shared_data = value;
spin_unlock(&lock);
```

#### 장단점

- ✓ 짧은 critical section에 효율적입니다
- ✓ Context switch가 없어 latency가 결정적입니다
- ✗ SMP에서만 의미가 있고, 단일 코어에서는 무의미합니다
- ✗ Hold time이 길어지면 다른 코어가 spin 합니다

### 3. Mutex (Task 간)

Blocking 방식입니다. 대기 task가 Blocked 상태로 전환됩니다.

```c
xSemaphoreTake(mutex, portMAX_DELAY);
shared_data = value;
xSemaphoreGive(mutex);
```

#### 장단점

- ✓ Long critical section도 가능합니다
- ✓ Priority inheritance를 지원합니다 (Mars Pathfinder 해결)
- ✗ Context switch overhead가 있습니다
- ✗ ISR에서는 사용할 수 없습니다

## 선택 기준

| 상황 | 도구 |
| --- | --- |
| ISR과 task 공유, ≤ 10 µs | Interrupt disable |
| Task 간 공유, > 100 µs work | Mutex |
| SMP 짧은 작업 | Spinlock |
| Lock-free 가능 | atomic API |

## Atomic Operations

CPU가 원자성을 보장하는 명령입니다. 짧고 빠릅니다.

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

CAS (Compare-And-Swap) 변형도 있습니다. **Lock-free 자료구조의 토대**입니다.

## Memory Ordering — Reordering 함정

ARM·RISC-V는 **relaxed memory model**을 따르므로 컴파일러와 CPU가 명령 순서를 바꿀 수 있습니다.

```c
// Producer
data = 42;            // (1)
ready = 1;            // (2)

// Consumer
while (!ready);       // (3)
use(data);            // (4) — 42 받는 보장 없음!
```

(1)과 (2)의 write order가 바뀌면 (4)에서 garbage를 읽게 됩니다. 해결책은 **memory barrier**입니다.

```c
data = 42;
__sync_synchronize();   // 또는 std::atomic_thread_fence
ready = 1;
```

ARM은 `DMB ST` (Data Memory Barrier, Store)를 사용하고, x86은 기본적으로 strong order를 가집니다.

## False Sharing — Cache 함정

```c
struct {
    int counter_a;        // CPU 0이 자주 쓰기
    int counter_b;        // CPU 1이 자주 쓰기
} shared;                  // 같은 cache line 64 byte
```

CPU 0이 `counter_a`에 write 하면 cache line 전체가 CPU 0의 cache로 들어옵니다. CPU 1이 `counter_b`에 write 하면 line이 CPU 1로 이동합니다. 코어 간 ping-pong이 발생합니다. 해결책은 padding입니다.

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

**IRQ disable은 최대 50 µs까지가 안전합니다**. 그 이상 길어지면 ISR이 막혀 interrupt loss 위험이 있습니다.

## Volatile — 동기화 ≠

`volatile`은 **컴파일러 최적화 방지** 역할만 합니다. Atomic도 아니고 memory order 보장도 아닙니다.

```c
volatile int counter = 0;
counter++;  // 여전히 3-instruction → race condition
```

`volatile`은 MMIO register access(HW)나 interrupt-shared flag 같은 single-byte flag에만 씁니다.

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

위에서 설명했듯이 atomic API 또는 critical section이 필요합니다.

> ⚠️ Critical section 안에서 long work

100 ms 작업을 critical section 안에 넣으면 그 동안 모든 ISR과 task가 막힙니다. 짧게 유지해야 합니다.

> ⚠️ Memory barrier 누락

ARM·RISC-V relaxed model에서는 write order가 보장되지 않습니다. 멀티코어·DMA와 공유할 때는 barrier가 필수입니다.

> ⚠️ Mutex를 ISR에서

ISR에서 mutex take를 시도하면 crash 합니다. Semaphore Give(signal)만 가능합니다.

## 정리

- Race condition은 공유 데이터, 동시 접근, 동기화 없음이 합쳐질 때 발생합니다.
- 보호 도구 3종은 **IRQ disable**, **Spinlock(SMP)**, **Mutex**입니다.
- 짧은 작업은 IRQ disable, 긴 작업은 mutex가 적합합니다.
- **Atomic API**가 lock-free의 토대입니다.
- `volatile`, atomic, memory barrier는 셋 다 별개의 개념입니다.

다음 편에서는 **Semaphore 개념**으로 Counting과 Binary, 사용 패턴을 다룹니다.

## 관련 항목

- [1-05: 인터럽트와 RTOS](/blog/embedded/rtos/practical-internals/part1-05-interrupts-rtos)
- [1-07: Semaphore 개념](/blog/embedded/rtos/practical-internals/part1-07-semaphore)
- [3-01: Critical Section 구현](/blog/embedded/rtos/practical-internals/part3-01-critical-section)
