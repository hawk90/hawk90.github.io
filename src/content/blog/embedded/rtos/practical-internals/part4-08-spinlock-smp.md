---
title: "4-08: SMP Spinlock — LDREX/STREX, Ticket Lock, MCS, WFE/SEV"
date: 2026-05-07T20:00:00
description: "ARM LDREX/STREX exclusive monitor와 ARMv8.1 LSE를 출발점으로 SMP spinlock 구현을 따라갑니다. test-and-test-and-set, ticket lock, MCS lock의 fairness와 cache bouncing trade-off, WFE/SEV로 만드는 저전력 spin을 정리합니다."
series: "Practical RTOS Internals"
seriesOrder: 40
tags: [spinlock, smp, ldrex, strex, mcs, ticket-lock]
---

## 한 줄 요약

> **"SMP spinlock의 뼈대는 LDREX/STREX와 DMB 둘입니다."** — 그 위에서 fairness와 cache 비용을 어떻게 균형 잡느냐가 변주입니다.

## 어떤 문제를 푸는가

[4-07편](/blog/embedded/rtos/practical-internals/part4-07-smp-rtos)에서 본 것처럼 SMP critical section은 *spinlock + IRQ disable* 조합이 필요합니다. 그런데 spinlock 자체를 어떻게 구현해야 할까요. 다음 세 가지 요구를 동시에 만족시켜야 합니다.

첫째, *짧은 critical section*에서만 씁니다. sleep이 불가능한 ISR 컨텍스트나 수십 cycle짜리 자료구조 갱신처럼 *block-based mutex로는 비용이 더 큰* 구간이 대상입니다. 둘째, *atomic하게* lock state를 갱신해야 합니다. test-and-set이 atomic하지 않으면 두 core가 동시에 lock을 잡는 race가 생깁니다. 셋째, *spin 동안 시스템에 미치는 영향*을 최소화해야 합니다. cache line이 core 사이를 핑퐁하면 다른 작업까지 느려집니다.

이번 편은 ARM atomic primitive에서 시작해 spinlock의 다양한 형태와 trade-off를 정리합니다.

## LDREX/STREX — ARM Exclusive Monitor

ARMv7-A/R/M의 atomic은 *load-linked / store-conditional* 패러다임입니다.

```asm
spin_lock:
    ldrex   r1, [r0]       @ load + exclusive monitor 설정
    cmp     r1, #0
    bne     spin_lock      @ 이미 locked — retry
    mov     r2, #1
    strex   r3, r2, [r0]   @ exclusive store 시도
    cmp     r3, #0
    bne     spin_lock      @ store 실패 — retry
    dmb                    @ acquire barrier
    bx      lr
```

핵심은 *exclusive monitor*입니다. core마다 *thread-local hardware flag*가 있어, `LDREX`가 그 flag를 set하고 *접근한 address를 tag*해 둡니다. `STREX`는 flag와 tag를 확인하고, *유효하면* store가 성공하고 flag를 clear합니다. 다른 core가 같은 address에 write하면 *exclusive monitor가 클리어*되어 `STREX`가 실패합니다.

실패하면 retry입니다. 이 *load + check + conditional store + retry* 루프가 모든 atomic 연산의 기본 골격입니다.

## ARMv8.1 LSE — 단일 명령 Atomic

ARMv8.1부터는 LSE(Large System Extensions)가 도입되어 *단일 명령 atomic*이 가능해졌습니다. Cortex-A55, A75 이후가 지원합니다.

```asm
@ Compare-and-Swap with Acquire-Release
casal   w0, w1, [x2]

@ Load-Add with Acquire-Release
ldaddal w0, w1, [x2]

@ Atomic Swap
swpal   w0, w1, [x2]
```

LDREX/STREX 루프 4~5 cycle이 `CASAL` 한 줄 *3 cycle*로 줄어듭니다. contention이 심할수록 차이가 더 벌어집니다.

| Cortex-A72 | LDREX/STREX | CASAL (LSE) |
|---|---|---|
| uncontended | ~5 cycle | ~3 cycle |
| 강한 contention | 20~50 cycle | 30~80 cycle |

embedded SMP에서 ARMv8.1+ chip을 쓴다면 LSE 활용이 표준입니다. compiler flag로 `-march=armv8.1-a` 또는 `-moutline-atomics`를 줘서 자동 선택하게 둡니다.

## C 추상화 — `<stdatomic.h>`

직접 어셈블리를 만지지 않아도 `<stdatomic.h>`가 같은 시맨틱을 제공합니다.

```c
#include <stdatomic.h>

void spin_lock(atomic_int *l) {
    int expected = 0;
    while (!atomic_compare_exchange_weak_explicit(
                l, &expected, 1,
                memory_order_acquire,
                memory_order_relaxed)) {
        expected = 0;
        cpu_relax();
    }
}

void spin_unlock(atomic_int *l) {
    atomic_store_explicit(l, 0, memory_order_release);
}
```

`memory_order_acquire`와 `memory_order_release`가 *acquire/release barrier*를 표현합니다. compiler가 ARMv8.1 LSE를 알면 `CASAL`로, 그렇지 않으면 LDREX/STREX 루프로 내려갑니다.

## Test-and-Test-and-Set — Cache 절약

기본 test-and-set spinlock에는 큰 문제가 있습니다. spin 루프 안의 `STREX`가 *매번 cache line에 write를 시도*합니다. 다른 core들이 spin하면 cache line이 *core 사이를 끊임없이 이동*합니다.

해결책이 TTAS(test-and-test-and-set)입니다.

```c
void spin_lock_ttas(atomic_int *l) {
    for (;;) {
        /* 1단계 — 읽기만 (cache line shared 상태 유지) */
        while (atomic_load_explicit(l, memory_order_relaxed) != 0) {
            cpu_relax();
        }
        /* 2단계 — 한 번 atomic 시도 */
        int expected = 0;
        if (atomic_compare_exchange_weak_explicit(
                l, &expected, 1,
                memory_order_acquire, memory_order_relaxed)) {
            return;
        }
    }
}
```

읽기 루프가 *cache line을 shared 상태*로 유지하므로 bus traffic이 0에 가까워집니다. 누군가 unlock하면 그제야 line이 invalidate되고 `CAS`를 한 번 시도합니다. uncontended 비용은 같지만 contended 비용이 *수 배* 줄어듭니다.

## WFE / SEV — 저전력 Spin

ARM은 spin loop을 위한 hint instruction을 제공합니다. *WFE(Wait For Event)*가 들어오면 core가 *clock을 멈추고* 대기 상태로 들어갑니다. 다른 core가 *SEV(Send Event)*를 보내거나 IRQ가 들어오면 깨어납니다.

```c
void spin_lock_wfe(atomic_int *l) {
    int expected = 0;
    while (!atomic_compare_exchange_weak_explicit(
                l, &expected, 1,
                memory_order_acquire, memory_order_relaxed)) {
        expected = 0;
        __asm volatile ("wfe");   /* 다음 SEV 또는 IRQ까지 sleep */
    }
}

void spin_unlock_wfe(atomic_int *l) {
    atomic_store_explicit(l, 0, memory_order_release);
    __asm volatile ("dsb sy; sev");   /* waiter 전원 깨우기 */
}
```

전력이 중요한 IoT나 wearable에서는 단순 spin 대신 WFE/SEV를 쓰는 편이 *전류 mA 단위*로 차이가 납니다. 단점은 깨는 latency가 약간 더 든다는 것뿐입니다.

`STREX`는 exclusive monitor가 clear되면 자동으로 *event*를 발생시키므로, store 쪽에서 별도로 SEV를 호출하지 않아도 되는 변형도 있습니다.

## Ticket Lock — Fairness 보장

지금까지 본 spinlock은 *공평하지 않습니다*. unlock 직후 *우연히 가까운 cache line을 가진 core*가 항상 먼저 잡아 starvation이 생길 수 있습니다. ticket lock은 이를 해결합니다.

```c
typedef struct {
    atomic_int next;
    atomic_int now_serving;
} ticket_lock_t;

void ticket_lock(ticket_lock_t *l) {
    int my = atomic_fetch_add_explicit(
                 &l->next, 1, memory_order_relaxed);
    while (atomic_load_explicit(&l->now_serving,
                                memory_order_acquire) != my) {
        cpu_relax();
    }
}

void ticket_unlock(ticket_lock_t *l) {
    atomic_fetch_add_explicit(&l->now_serving, 1,
                              memory_order_release);
}
```

은행 번호표와 똑같습니다. 도착 순서대로 `next`에서 번호를 받고, `now_serving`이 자기 번호가 될 때까지 기다립니다. *FIFO 공평성*이 보장됩니다.

문제는 *모든 waiter가 같은 cache line을 spin*한다는 것입니다. unlock 시점에 `now_serving`이 갱신되면 *모든 waiter의 cache line이 invalidate*됩니다. 수십 core가 기다리면 매 unlock마다 *broadcast invalidation*이 폭주합니다. 4~8 core까지는 견딜 만하지만 그 이상은 한계가 옵니다.

## MCS Lock — Per-CPU Cache Line

MCS lock은 *waiter마다 자기 cache line에서 spin*하도록 설계되었습니다. 1991년 Mellor-Crummey와 Scott가 제안한 구조입니다.

```c
typedef struct mcs_node {
    struct mcs_node *next;
    atomic_int       locked;
} mcs_node_t;

typedef struct {
    atomic_uintptr_t tail;   /* 마지막 waiter의 node 주소 */
} mcs_lock_t;

void mcs_lock(mcs_lock_t *l, mcs_node_t *me) {
    me->next = NULL;
    me->locked = 1;
    mcs_node_t *prev = (mcs_node_t*)atomic_exchange_explicit(
        &l->tail, (uintptr_t)me, memory_order_acq_rel);
    if (prev != NULL) {
        prev->next = me;
        while (atomic_load_explicit(&me->locked,
                                    memory_order_acquire)) {
            cpu_relax();
        }
    }
}

void mcs_unlock(mcs_lock_t *l, mcs_node_t *me) {
    if (me->next == NULL) {
        mcs_node_t *expected = me;
        if (atomic_compare_exchange_strong_explicit(
                &l->tail, (uintptr_t*)&expected, 0,
                memory_order_release, memory_order_relaxed)) {
            return;
        }
        while (me->next == NULL) cpu_relax();
    }
    atomic_store_explicit(&me->next->locked, 0,
                          memory_order_release);
}
```

각 waiter가 *자기 node의 `locked` 필드*를 spin합니다. unlock은 *바로 다음 waiter의 cache line만* invalidate합니다. broadcast가 없어집니다.

Linux kernel의 `qspinlock`(4.2+)이 MCS 변형입니다. 64 core 시스템에서 ticket lock 대비 *10배 이상* 빠른 결과가 보고되어 있습니다. embedded 4 core 환경에서는 ticket lock으로도 충분하지만, 인식해 둘 가치는 있습니다.

## ESP-IDF `portMUX_TYPE` — RTOS 통합 예

ESP32(dual core)의 ESP-IDF는 FreeRTOS SMP variant 위에서 `portMUX_TYPE`을 제공합니다.

```c
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"

static portMUX_TYPE mux = portMUX_INITIALIZER_UNLOCKED;

void critical_section(void) {
    portENTER_CRITICAL(&mux);
    /* 수십 cycle짜리 짧은 작업 */
    shared_counter++;
    portEXIT_CRITICAL(&mux);
}
```

`portENTER_CRITICAL`이 *spinlock acquire + IRQ disable*을 한 번에 처리합니다. ISR 컨텍스트에서는 `portENTER_CRITICAL_ISR`을 씁니다. 내부 구현은 LDREX/STREX 기반의 ticket-like lock입니다.

## Spinlock vs Mutex — 결정 기준

| 항목 | Spinlock | Mutex |
|---|---|---|
| Critical section 길이 | 수십~수백 cycle | 그 이상 |
| Sleep 가능 | 불가 | 가능 |
| ISR 사용 | 가능 | 불가 |
| CPU 사용 (대기 중) | 100% spin | 0% |
| Priority inheritance | 없음 | 가능 |
| 적합한 사용 | 자료구조 갱신, ISR 동기화 | I/O 대기, 긴 작업 |

규칙은 단순합니다. *기다리는 시간이 context switch 비용보다 짧으면* spinlock, 그렇지 않으면 mutex입니다. context switch 비용이 ~1 µs라면 그보다 짧은 critical section만 spinlock이 합리적입니다.

## Spinlock 측정 — Cortex-A72 4 core

uncontended와 contended 시 acquire latency 차이를 측정한 예입니다.

| Lock 종류 | 대기 1 (uncontended) | 대기 4 (contended) |
|---|---|---|
| basic test-and-set | 12 cycle | 380 cycle |
| TTAS | 13 cycle | 220 cycle |
| ticket | 14 cycle | 160 cycle (fair) |
| MCS | 18 cycle | 110 cycle (fair, cache-friendly) |

contention 환경에서 *기본 test-and-set*이 가장 비싸고, MCS가 가장 우수합니다. 다만 MCS는 per-waiter node가 필요하므로 ISR에서 쓰기 까다롭습니다. embedded 4 core 환경의 *현실적 선택*은 *TTAS + IRQ disable* 또는 *ticket lock*입니다.

## 자주 보는 함정과 안티패턴

> 경고 — LDREX와 STREX 사이에 다른 memory access

```asm
ldrex r1, [r0]
ldr   r2, [r3]    @ ← exclusive monitor가 clear됨 — STREX 항상 실패
strex r3, r2, [r0]
```

`LDREX`와 `STREX` 사이는 *반드시 짧고 단순*해야 합니다. 함수 호출, 다른 memory access, IRQ 진입이 들어가면 exclusive monitor가 깨져 *무한 retry*에 빠집니다.

> 경고 — Acquire/Release barrier 누락

```c
spin_lock(&l);
shared = 42;            /* barrier 없으면 다른 core가 늦게 봄 */
spin_unlock(&l);
```

unlock 직전에 *release barrier*가 없으면 `shared = 42` write가 *unlock store보다 뒤로 reorder*될 수 있습니다. `memory_order_release`를 명시하면 컴파일러가 적절한 `DMB ISH`를 삽입합니다.

> 경고 — Spinlock 안에서 sleep/block

```c
spin_lock(&l);
xQueueReceive(q, &msg, portMAX_DELAY);   /* ← 다른 core 전원 대기 */
spin_unlock(&l);
```

spinlock은 *짧은 critical section* 전용입니다. block이 가능한 RTOS API를 spinlock 안에서 호출하면 *모든 core가 멈춥니다*. 이런 패턴이 의심되면 mutex로 교체합니다.

> 경고 — Nested lock의 ordering 무시

```c
core 0: spin_lock(&a); spin_lock(&b);
core 1: spin_lock(&b); spin_lock(&a);
                                       /* → SMP deadlock */
```

두 lock 이상을 잡을 때는 *전역 ordering 규칙*을 정해 두고 *모든 코드에서 같은 순서*로 잡아야 합니다. lock address 오름차순이 가장 흔한 규칙입니다.

## 정리

- ARMv7 SMP spinlock의 뼈대는 *LDREX/STREX + DMB* 두 가지로, exclusive monitor가 atomic을 보장합니다.
- ARMv8.1 LSE의 `CASAL`은 *단일 명령 atomic*으로 contention 환경에서 큰 이득을 줍니다.
- `<stdatomic.h>`의 `memory_order_acquire`/`release`로 *barrier가 명시된 휴대성 있는 코드*를 만들 수 있습니다.
- TTAS는 *cache line을 shared로 유지*하며 spin해 bus traffic을 줄입니다.
- WFE/SEV는 *spin 중 core를 sleep*시켜 전력을 아낍니다.
- ticket lock은 *FIFO 공평성*을, MCS lock은 *per-CPU cache line*으로 *broadcast invalidation 회피*를 제공합니다.
- spinlock과 mutex의 결정 기준은 *critical section이 context switch 비용보다 짧은가*입니다.

다음 편은 [4-09 Software Timer](/blog/embedded/rtos/practical-internals/part4-09-software-timer)에서 daemon task 기반 timer 구조를 다룹니다.

## 관련 항목

- [3-01: Critical Section](/blog/embedded/rtos/practical-internals/part3-01-critical-section)
- [3-09: ISR-Safe API](/blog/embedded/rtos/practical-internals/part3-09-isr-safe-api)
- [4-07: SMP RTOS 설계](/blog/embedded/rtos/practical-internals/part4-07-smp-rtos)
- [4-09: Software Timer](/blog/embedded/rtos/practical-internals/part4-09-software-timer)
- [Perf Eng 4-04: Spinlock](/blog/embedded/performance-engineering/part4-04-spinlock)
