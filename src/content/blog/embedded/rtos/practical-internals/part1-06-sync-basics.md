---
title: "동기화 기초 분석 — Critical Section·Mutual Exclusion·Race Condition"
slug: "embedded/rtos/practical-internals/part1-06-sync-basics"
date: 2026-05-04T09:06:00
description: "공유 자원 보호의 3가지 도구로 interrupt disable, spinlock, mutex가 있습니다. 언제 어느 것을 쓰는지 정리합니다."
series: "Practical RTOS Internals"
seriesOrder: 6
tags: [sync, critical-section, mutex, race-condition, atomic]
draft: false
topics: ["embedded", "embedded/rtos"]
---

## 한 줄 요약

> **"공유 데이터엔 동기화"** — 공유 데이터의 read-modify-write와 게시 순서를 구분합니다. 짧고 정확한 보호가 핵심입니다.

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

해당 코어의 선택된 IRQ를 막는 도구입니다. 마스크 종류와 포트에 따라 범위가 다르며 NMI·다른 코어·DMA까지 일괄 차단하지 않습니다. 길이는 제품의 latency 예산에서 정합니다.

```c
// CMSIS Cortex-M, 비특권/TrustZone 등의 사용 조건은 별도 확인
uint32_t old_mask = __get_PRIMASK();
__disable_irq();
counter++;
__set_PRIMASK(old_mask); // 진입 전 이미 disabled였다면 그대로 보존

// 또는 FreeRTOS API
taskENTER_CRITICAL();
counter++;
taskEXIT_CRITICAL();
```

#### 장단점

- ✓ 마스킹 범위에 속하는 ISR과의 접근을 해당 코어에서 분리할 수 있습니다
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
- ✓ blocking context switch 없이 기다리지만 경쟁·선점에 따른 최대 대기는 별도로 분석합니다
- ✗ 단일 코어에서 lock 보유자를 선점한 실행자가 spin하면 진행 불가할 수 있습니다. IRQ·선점 정책이 필요합니다
- ✗ Hold time이 길어지면 다른 코어가 spin 합니다

### 3. Mutex (Task 간)

Blocking 방식입니다. 대기 task가 Blocked 상태로 전환됩니다.

```c
if (xSemaphoreTake(mutex, portMAX_DELAY) == pdTRUE) {
    shared_data = value;
    configASSERT(xSemaphoreGive(mutex) == pdTRUE);
}
```

#### 장단점

- ✓ task 대기를 허용하는 자원에 사용하되 긴 hold와 lock 중 blocking의 최악 시간을 제한합니다
- ✓ Priority inheritance를 지원합니다 (Mars Pathfinder 해결)
- ✗ Context switch overhead가 있습니다
- ✗ ISR에서는 사용할 수 없습니다

## 선택 기준

| 상황 | 확인할 조건과 도구 |
| --- | --- |
| ISR과 task 공유 | IRQ 마스크 범위·ISR 허용 priority·최대 지연에 맞는 critical section/atomic 게시 |
| task 간 자원 보호 | owner·실패·hold 시간·lock 순서·PI를 검토한 mutex |
| SMP 공유 상태 | 다른 코어와의 배제·메모리 순서·IRQ/선점 규칙을 포함한 spinlock |
| 개별 값 갱신·게시 | target의 lock-free 여부와 수명·memory order를 검증한 atomic |

10 µs/100 µs 같은 보편적 문턱만으로 도구를 고르지 않습니다.

## Atomic Operations

C11 atomic API는 언어 수준의 원자성과 순서 계약입니다. 단일 명령·lock-free·고정 시간을 모두 보장하지 않으며, 타깃에 따라 runtime helper나 재시도 루프를 사용합니다.

```c
#include <stdatomic.h>

atomic_int counter = 0;
atomic_fetch_add(&counter, 1);   // counter++ atomic
```

Cortex-M3/M4 같은 일부 코어에서 atomic RMW가 다음 형태의 exclusive 재시도로 내려갈 수 있습니다. 모든 ARMv7+ 코어와 모든 폭의 공통 출력은 아닙니다.

```asm
loop:
    LDREX  r0, [counter]
    ADD    r0, r0, #1
    STREX  r1, r0, [counter]
    CMP    r1, #0           ; STREX 성공?
    BNE    loop             ; 실패 시 재시도
```

CAS 등의 원자 연산은 lock-free 알고리즘의 재료이지만, 연산 하나가 lock-free라고 전체 알고리즘이 wait-free이거나 ISR 안전한 것은 아닙니다.

## Memory Ordering — Reordering 함정

CPU의 메모리 모델뿐 아니라 C 언어의 data race 규칙을 지켜야 합니다. 서로 다른 C thread가 일반 변수 `ready`를 동기화 없이 읽고 쓰면 undefined behavior일 수 있으며, producer 쪽에 barrier 하나를 추가해도 그 data race를 없애지 못합니다.

다음은 one-shot 게시를 보여주는 완전한 호스트 예제입니다. producer가 `data`를 쓴 뒤 atomic `ready`에 release로 게시하고, consumer가 acquire로 관찰한 뒤 읽습니다. 게시 후 `data`를 다시 수정하지 않으며 모든 thread가 끝날 때까지 저장 공간을 유지합니다.

```c title="publication.c"
#include <assert.h>
#include <pthread.h>
#include <stdatomic.h>
#include <stdio.h>
static int data;
static atomic_bool ready = 0;
static void *producer(void *unused) {
    (void)unused;
    data = 42;
    atomic_store_explicit(&ready, 1, memory_order_release);
    return NULL;
}
static void *consumer(void *unused) {
    (void)unused;
    while (!atomic_load_explicit(&ready, memory_order_acquire)) {}
    assert(data == 42);
    return NULL;
}
int main(void) {
    pthread_t a, b;
    assert(pthread_create(&a, NULL, consumer, NULL) == 0);
    assert(pthread_create(&b, NULL, producer, NULL) == 0);
    assert(pthread_join(a, NULL) == 0);
    assert(pthread_join(b, NULL) == 0);
    puts("PASS one-shot release/acquire publication");
}
```

```bash
clang -std=c11 -Wall -Wextra -Werror -pthread publication.c -o publication
./publication
```

이것은 호스트 C11 thread의 게시 검사입니다. 보드 ISR·DMA cache coherency·MMIO 순서를 증명한 코드가 아닙니다. DMA에는 device 및 cache-maintenance 계약이 추가로 필요합니다.

## False Sharing — Cache 함정

```c
struct {
    int counter_a;        // CPU 0이 자주 쓰기
    int counter_b;        // CPU 1이 자주 쓰기
} shared;                  // 같은cache line에배치됐다는가정,실제line크기는타깃별확인
```

CPU 0이 `counter_a`에 write 하면 cache line 전체가 CPU 0의 cache로 들어옵니다. CPU 1이 `counter_b`에 write 하면 line이 CPU 1로 이동합니다. 코어 간 ping-pong이 발생합니다. 관련 변수의 배치·정렬을 분리하면 줄일 수 있으나 target의 coherence와 line 크기를 확인하고 효과를 측정해야 합니다. 아래 64는 그 크기를 가정한 설명용 정렬값입니다. C11에서는 `_Alignas(64)` 또는 `<stdalign.h>`의 `alignas`를 사용합니다.

```c
struct {
    alignas(64) int counter_a;
    alignas(64) int counter_b;
};
```

## Critical Section 길이 — 예산에서 정하기

보편적인 50 ns/1 µs/50 µs 안전 한계는 없습니다. 보호 대상 데이터의 크기, 버스/메모리, 예외 urgency와 deadline을 명시하고 최악 비선점 구간을 latency 예산에 포함합니다. I/O 대기·print·다른 lock 취득은 특히 점검합니다. 긴 구간의 이벤트 누락 여부는 주변 장치의 FIFO·pending 보존·발생률에도 의존합니다.

## Volatile — 동기화 ≠

`volatile`은 구현 규칙에 따른 관찰 가능한 접근을 지정합니다. 모든 최적화를 끄는 기능은 아니며, 원자성·다른 데이터의 게시 순서·thread 간 동기화를 보장하지 않습니다.

```c
volatile int counter = 0;
counter++;  // 여전히 3-instruction → race condition
```

MMIO에는 toolchain/device 접근 규약을 따라 사용합니다. interrupt와 공유하는 single-byte flag라도 이벤트 누적·수명·원자성·동기화 계약을 별도로 확인해야 합니다.

## FreeRTOS API 요약

| API | 효과 |
| --- | --- |
| `taskENTER_CRITICAL()` | ARM_CM4F: BASEPRI·nesting, scheduler suspend API와 별개 |
| `taskEXIT_CRITICAL()` | 복원 |
| `taskENTER_CRITICAL_FROM_ISR()` | ISR 내 critical section |
| `vTaskSuspendAll()` | Scheduler 정지 (IRQ는 활성) |
| `xTaskResumeAll()` | 복원 |
| `portDISABLE_INTERRUPTS()` | ARM_CM4F: syscall 경계까지 BASEPRI mask, 모든 IRQ 차단 아님 |

## 자주 하는 실수

> ⚠️ `volatile`로 race condition 해결 시도

위에서 설명했듯이 atomic API 또는 critical section이 필요합니다.

> ⚠️ Critical section 안에서 long work

긴 critical section은 보호 범위의 IRQ와 해당 코어 task 전환을 지연시킵니다. 더 높은 urgency의 IRQ·다른 코어까지 모두 막히는 것은 아닙니다. 짧게 유지해야 합니다.

> ⚠️ Memory barrier 누락

ARM·RISC-V relaxed model에서는 write order가 보장되지 않습니다. CPU thread 공유는 언어 atomic/lock을 사용하고, DMA/MMIO는 cache clean/invalidate와 device barrier 등 플랫폼 규약을 추가로 검토합니다. 단일 barrier만으로 모든 공유 문제를 해결하지 않습니다.

> ⚠️ Mutex를 ISR에서

ISR에서 mutex를 취득·해제하면 FreeRTOS 계약 위반입니다. 허용 priority에서 binary/counting의 FromISR take/give와 queue/notification 등 각 API의 조건을 확인합니다.

## 정리

- Race condition은 공유 데이터, 동시 접근, 동기화 없음이 합쳐질 때 발생합니다.
- 보호 도구 3종은 **IRQ disable**, **Spinlock(SMP)**, **Mutex**입니다.
- 짧은 작업은 IRQ disable, 긴 작업은 mutex가 적합합니다.
- **Atomic API**가 lock-free의 토대입니다.
- `volatile`, atomic, memory barrier는 셋 다 별개의 개념입니다.

다음 편에서는 **Semaphore 개념**으로 Counting과 Binary, 사용 패턴을 다룹니다.

## 1차 자료와 검증 범위

- [C11 N1570](https://www.open-std.org/jtc1/sc22/wg14/www/docs/n1570.pdf) §5.1.2.4·§7.17: data race와 atomic 순서
- [GCC atomic builtins](https://gcc.gnu.org/onlinedocs/gcc/_005f_005fatomic-Builtins.html): target의 lock-free 여부와 helper 조건
- [FreeRTOS V11.2.0 ARM_CM4F portmacro.h](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/portable/GCC/ARM_CM4F/portmacro.h): mask 범위

호스트 게시 프로그램의 성공을 보드 ISR·최악 시간·DMA 검증으로 환산하지 않습니다. 설명용 asm·spinlock 조각은 완성된 RTOS 구현이 아닙니다.

## 관련 항목

- [1-05: 인터럽트와 RTOS](/blog/embedded/rtos/practical-internals/part1-05-interrupts-rtos)
- [1-07: Semaphore 개념](/blog/embedded/rtos/practical-internals/part1-07-semaphore)
- [3-01: Critical Section 구현](/blog/embedded/rtos/practical-internals/part3-01-critical-section)
