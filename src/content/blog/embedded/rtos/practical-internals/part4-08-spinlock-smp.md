---
title: "SMP Spinlock 구현 — LDREX/STREX·Ticket Lock·MCS·WFE/SEV"
slug: "embedded/rtos/practical-internals/part4-08-spinlock-smp"
date: 2026-05-07T09:40:00
description: "ARM LDREX/STREX exclusive monitor와 ARMv8.1 LSE를 출발점으로 SMP spinlock 구현을 따라갑니다. test-and-test-and-set, ticket lock, MCS lock의 fairness와 cache bouncing trade-off, WFE/SEV로 만드는 저전력 spin을 정리합니다."
series: "Practical RTOS Internals"
seriesOrder: 40
tags: [spinlock, smp, ldrex, strex, mcs, ticket-lock]
topics: ["embedded", "embedded/rtos"]
---

## 한 줄 요약

> spinlock은 배제와 acquire/release ordering, 그리고 소유자가 계속 실행할 수 있는 조건이 필요합니다. 명령·lock-free 지원·IRQ 규칙은 target별로 다릅니다.

## 어떤 문제를 푸는가

[4-07편](/blog/embedded/rtos/practical-internals/part4-07-smp-rtos)에서 본 것처럼 같은 core ISR도 lock을 공유하는 경우 inter-core 배제와 local IRQ 재진입 방지가 함께 필요합니다. 그런데 spinlock 자체를 어떻게 구현해야 할까요. 다음 세 가지 요구를 동시에 만족시켜야 합니다.

첫째, *짧은 critical section*에서만 씁니다. sleep이 불가능한 ISR 컨텍스트나 수십 cycle짜리 자료구조 갱신처럼 *block-based mutex로는 비용이 더 큰* 구간이 대상입니다. 둘째, *atomic하게* lock state를 갱신해야 합니다. test-and-set이 atomic하지 않으면 두 core가 동시에 lock을 잡는 race가 생깁니다. 셋째, *spin 동안 시스템에 미치는 영향*을 최소화해야 합니다. cache line이 core 사이를 핑퐁하면 다른 작업까지 느려집니다.

이번 편은 ARM atomic primitive에서 시작해 spinlock의 다양한 형태와 trade-off를 정리합니다.

## LDREX/STREX — ARM Exclusive Monitor

다음은 ARMv7-A A32의 lock 획득을 보여 주는 instruction 예입니다. 지원 memory type·alignment·shareability와 unlock release 경로가 필요합니다. Cortex-M0/M0+에는 LDREX/STREX가 없으므로 ARM 전체의 공통 구현으로 사용할 수 없습니다.

```asm title="armv7-lock.s"
.syntax unified
.text
.global armv7_lock
armv7_lock:
    ldrex   r1, [r0]       @ load + exclusive monitor 설정
    cmp     r1, #0
    bne     armv7_lock      @ 이미 locked — retry
    mov     r2, #1
    strex   r3, r2, [r0]   @ exclusive store 시도
    cmp     r3, #0
    bne     armv7_lock      @ store 실패 — retry
    dmb                    @ acquire barrier
    bx      lr
```

핵심은 *exclusive monitor*입니다. local/global monitor와 reservation 범위는 architecture·memory 설정에 따릅니다. LDREX와 STREX 사이에 경쟁 write나 reservation 상실이 있으면 store가 실패할 수 있습니다. C thread-local 변수와 동일한 개념은 아닙니다.

실패하면 retry입니다. 이 retry 경로의 성공 여부를 검사해야 하며 단일 명령 atomic을 포함한 모든 구현이 이 instruction sequence를 쓰지는 않습니다.

## ARMv8.1 LSE — 단일 명령 Atomic

AArch64의 LSE를 사용할 때는 target feature와 compiler 선택을 확인합니다. Cortex-A72에서 LSE CASAL을 측정한 것처럼 제시한 기존 표는 근거가 없고 target도 맞지 않아 제거했습니다. 단일 instruction이라는 사실만으로 3 cycle·항상 빠름을 보장하지 않습니다.

```asm title="aarch64-lse.s"
.text
.global lse_examples
lse_examples:
    casal   w0, w1, [x2]
    ldaddal w3, w4, [x2]
    swpal   w5, w6, [x2]
    ret
```

위 코드는 armv8.1-a+lse 대상으로 assembler 문법을 확인하는 예이며 lock 함수는 아닙니다. C compiler는 memory order와 target에 따라 acquire-only CAS, LL/SC 또는 runtime helper를 선택할 수 있습니다. outline atomics도 toolchain/runtime 계약을 확인합니다.

## C 추상화 — `<stdatomic.h>`

다음 세 구현은 C11 atomic을 이용한 **task/thread 문맥의 교육용 코드**입니다. lock과 node는 접근 전에 초기화하고 같은 lock의 재귀 획득·소유자 아닌 unlock을 금지합니다. IRQ mask·scheduler preemption 제어는 포함하지 않습니다. 해당 atomic이 lock-free인지 확인하지 않고 ISR/RTOS kernel lock으로 가져가지 않습니다.

```c title="atomic-locks.c"
#include <stdatomic.h>
#include <stdbool.h>
#include <stddef.h>

static void cpu_relax(void) { atomic_signal_fence(memory_order_seq_cst); }

typedef struct { atomic_bool held; } ttas_t;
static void ttas_init(ttas_t *l) { atomic_init(&l->held, false); }
static void ttas_lock(ttas_t *l)
{
    for (;;) {
        while (atomic_load_explicit(&l->held, memory_order_relaxed)) cpu_relax();
        bool expected = false;
        if (atomic_compare_exchange_weak_explicit(&l->held, &expected, true,
                    memory_order_acquire, memory_order_relaxed)) return;
    }
}
static void ttas_unlock(ttas_t *l)
{ atomic_store_explicit(&l->held, false, memory_order_release); }

typedef struct { atomic_uint next, serving; } ticket_t;
static void ticket_init(ticket_t *l)
{ atomic_init(&l->next, 0); atomic_init(&l->serving, 0); }
static void ticket_lock(ticket_t *l)
{
    unsigned mine = atomic_fetch_add_explicit(&l->next, 1, memory_order_relaxed);
    while (atomic_load_explicit(&l->serving, memory_order_acquire) != mine)
        cpu_relax();
}
static void ticket_unlock(ticket_t *l)
{ atomic_fetch_add_explicit(&l->serving, 1, memory_order_release); }

typedef struct mcs_node mcs_node_t;
struct mcs_node { _Atomic(mcs_node_t *) next; atomic_bool waiting; };
typedef struct { _Atomic(mcs_node_t *) tail; } mcs_t;
static void mcs_init(mcs_t *l) { atomic_init(&l->tail, NULL); }
static void mcs_node_init(mcs_node_t *n)
{ atomic_init(&n->next, NULL); atomic_init(&n->waiting, false); }
static void mcs_lock(mcs_t *l, mcs_node_t *me)
{
    atomic_store_explicit(&me->next, NULL, memory_order_relaxed);
    atomic_store_explicit(&me->waiting, true, memory_order_relaxed);
    mcs_node_t *prev = atomic_exchange_explicit(&l->tail, me, memory_order_acq_rel);
    if (prev != NULL) {
        atomic_store_explicit(&prev->next, me, memory_order_release);
        while (atomic_load_explicit(&me->waiting, memory_order_acquire)) cpu_relax();
    }
}
static void mcs_unlock(mcs_t *l, mcs_node_t *me)
{
    mcs_node_t *next = atomic_load_explicit(&me->next, memory_order_acquire);
    if (next == NULL) {
        mcs_node_t *expected = me;
        if (atomic_compare_exchange_strong_explicit(&l->tail, &expected, NULL,
                    memory_order_release, memory_order_relaxed)) return;
        do { next = atomic_load_explicit(&me->next, memory_order_acquire); }
        while (next == NULL);
    }
    atomic_store_explicit(&next->waiting, false, memory_order_release);
}
```

cpu_relax의 signal fence는 CPU sleep/hint 명령이 아닙니다. 이 예제는 busy wait이며 contention·전력 최적화는 target별 별도 구현과 측정이 필요합니다.

## Test-and-Test-and-Set — Cache 절약

TTAS는 먼저 relaxed load로 잠김 상태를 관찰하고 비어 보일 때 CAS를 시도합니다. 보호 데이터 접근은 성공한 acquire 뒤에, 다음 소유자에 대한 공개는 release unlock 전에 둡니다. 경쟁 해제 순간의 여러 CAS와 starvation 가능성은 남습니다. bus traffic 0이나 일정 배수 성능 향상은 보장하지 않습니다.

## WFE / SEV — 저전력 Spin

WFE/SEV는 architecture의 event mechanism을 사용하는 hint입니다. WFE가 반드시 clock을 정지하거나 일정 전류를 절감한다는 보장은 없습니다. 깨어난 뒤에도 lock 조건을 다시 확인해야 합니다.

C atomic loop에 wfe를 한 줄 추가하는 것으로 올바른 wait/wake protocol이 완성되지는 않습니다. unlock 공개 순서·event 전달·reservation·interrupt·spurious wake를 해당 architecture와 RTOS 구현에 맞춰 검토해야 합니다. 일반 STREX 실패가 항상 필요한 event를 발생시킨다는 가정도 사용하지 않습니다. 이 글은 board 전력/저전력 lock을 실행 검증하지 않았으므로 복사 가능한 WFE lock 구현을 제시하지 않습니다.

## Ticket Lock — Fairness 보장

ticket lock은 번호 배정 순서대로 진입시킵니다. unsigned counter는 modular 증가를 사용하며 동시에 미완료인 ticket 수가 번호 공간을 소진하지 않아야 합니다. 앞 ticket 소유자가 멈추면 뒤 waiter도 진행하지 못하므로 FIFO가 실시간 대기 시간 상한 자체를 보장하지는 않습니다.

모든 waiter가 serving을 읽기 때문에 공유 line 갱신 비용이 남습니다. 몇 core 이상이면 반드시 느리다는 고정 경계는 두지 않습니다.

## MCS Lock — Per-CPU Cache Line

MCS는 각 획득 시도에 고유하고 unlock이 끝날 때까지 살아 있는 node를 사용합니다. 반드시 per-CPU node 하나인 것은 아닙니다. 위 코드는 next도 atomic pointer로 만들어 predecessor의 공개와 unlock의 관찰 사이 C data race를 피하고, tail CAS의 expected 타입도 일치시킵니다.

각 waiter는 자신의 waiting을 읽고 predecessor가 후속 waiter를 깨웁니다. 실제 cache line 분리는 node alignment/layout의 별도 문제입니다. queue 순서는 소유자·앞 waiter의 진행을 전제로 하며 host 반복 검사만으로 weak-memory의 모든 실행을 증명하지 않습니다.

## ESP-IDF `portMUX_TYPE` — RTOS 통합 예

ESP32(dual core)의 ESP-IDF는 FreeRTOS SMP variant 위에서 `portMUX_TYPE`을 제공합니다.

```c
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"

static portMUX_TYPE mux = portMUX_INITIALIZER_UNLOCKED;

void critical_section(void) {
    portENTER_CRITICAL(&mux);
    /* 수십 cycle짜리 짧은 작업 */
    /* 이 mux로 보호하는 공유 상태만 짧게 갱신 */
    portEXIT_CRITICAL(&mux);
}
```

`portENTER_CRITICAL`이 *spinlock acquire + IRQ disable*을 한 번에 처리합니다. ISR 컨텍스트에서는 `portENTER_CRITICAL_ISR`을 씁니다. 이 절은 ESP-IDF v5.4 ESP32 문서의 spinlock critical-section 계약을 예로 듭니다. ESP32 Xtensa를 ARM LDREX/STREX 기반 ticket lock이라고 설명할 수 없습니다. 다른 ESP target·IDF revision의 구현도 별도로 확인합니다.

## Spinlock vs Mutex — 결정 기준

| 조건 | 확인할 선택 |
|---|---|
| task-only이며 대기/긴 작업 필요 | blocking mutex와 priority 정책 |
| ISR도 같은 상태 접근 | port가 허용하는 IRQ mask + inter-core 배제 |
| owner가 preempt/suspend될 가능성 | 진행 조건과 최대 hold/wait 시간 분석 |

context switch의 평균 비용과 비교하는 것만으로 선택하지 않습니다. IRQ latency·우선순위 역전·owner preemption·atomic lock-free 지원·contention 분포가 함께 필요합니다. 재현 자료 없는 Cortex-A72 4-core cycle 표는 사용하지 않습니다.

## 자주 보는 함정과 안티패턴

> 경고 — exclusive monitor 규칙을 단순화

ordinary load 하나가 항상 reservation을 지워 STREX가 영원히 실패한다는 규칙은 없습니다. architecture별 제약·exception·reservation granule과 경쟁 접근을 확인하고 성공 여부를 검사합니다.

> 경고 — release를 특정 instruction으로 단정

memory_order_release는 언어 차원의 ordering입니다. compiler가 반드시 DMB ISH 하나를 삽입하는 것은 아니며 release store 등으로 구현할 수 있습니다. 생성 assembly와 target feature를 확인합니다.

> 경고 — lock 내부 block과 잘못된 nesting

spinlock을 보유한 채 기다리면 다른 참여자의 진행을 막습니다. 동일 core의 IRQ 재획득·재귀 획득과 서로 반대인 다중 lock 순서를 금지하고, 같은 node를 겹치는 MCS 획득에 재사용하지 않습니다.

## 정리

- acquire/release, 배제와 owner 진행 조건을 함께 다룹니다.
- A32 exclusive, AArch64 LSE, Cortex-M0+는 동일한 명령 지원이 아닙니다.
- TTAS·ticket·MCS는 contention·fairness·node 수명 비용이 다릅니다.
- ticket의 번호 공간과 MCS의 atomic next·고유 node 조건을 지킵니다.
- host 기능 검사는 MCU IRQ·전력·WCET나 exhaustive weak-memory 증명이 아닙니다.

## 근거 자료

- [Mellor-Crummey·Scott 원 저자의 알고리즘](https://www.cs.rochester.edu/research/synchronization/pseudocode/ss.html): ticket/MCS 구조와 진행 조건.
- [ESP-IDF v5.4 ESP32 FreeRTOS](https://docs.espressif.com/projects/esp-idf/en/v5.4/esp32/api-reference/system/freertos_idf.html): IDF critical section 계약.
- [GCC atomic builtins](https://gcc.gnu.org/onlinedocs/gcc/_005f_005fatomic-Builtins.html): target 구현과 lock-free 확인.



다음 편은 [4-09 Software Timer](/blog/embedded/rtos/practical-internals/part4-09-software-timer)에서 daemon task 기반 timer 구조를 다룹니다.

## 관련 항목

- [3-01: Critical Section](/blog/embedded/rtos/practical-internals/part3-01-critical-section)
- [3-09: ISR-Safe API](/blog/embedded/rtos/practical-internals/part3-09-isr-safe-api)
- [4-07: SMP RTOS 설계](/blog/embedded/rtos/practical-internals/part4-07-smp-rtos)
- [4-09: Software Timer](/blog/embedded/rtos/practical-internals/part4-09-software-timer)
- [Perf Eng 4-04: Spinlock](/blog/embedded/performance-engineering/part4-04-spinlock)
