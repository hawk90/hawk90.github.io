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

첫째, *짧은 critical section*에서만 씁니다. sleep할 수 없는 ISR 문맥이나 몇 줄짜리 자료구조 갱신처럼, task를 재우고 깨우는 mutex보다 잠깐 도는 편이 나은 구간이 대상입니다. 둘째, lock 상태를 *atomic하게* 바꿔야 합니다. 셋째, 기다리는 동안 다른 core에 주는 부담을 줄여야 합니다. 화장실 문 앞에서 기다리는 사람이 손잡이를 계속 덜컥거리면(매번 쓰기) 안에 있는 사람도 방해받습니다.

lock이 없으면 어떻게 되는지부터 봅니다. Debian 13 arm64 guest(QEMU `-M virt -accel hvf -cpu host`, vCPU 4개, Linux 6.12.116, gcc 14.2.0)에서 thread 4개가 lock 없이 `volatile long` 하나를 200만 번씩 올렸습니다.

```text
nolock 4 threads x 2000000 iters: counter=3143792 (expected 8000000)
```

800만이어야 할 값이 314만입니다. `counter++`가 load·add·store 세 단계라 다른 core의 증가분을 덮어썼기 때문입니다. 이 글의 VM 측정은 HVF 위 가상 CPU에서 한 것이라 실제 SoC의 cache·bus 동작과 같지 않습니다.

## LDREX/STREX — ARM Exclusive Monitor

다음은 ARMv7-A A32의 lock 획득 예입니다. 같은 파일을 `arm-none-eabi-as` 16.2.0(binutils 동봉)으로 세 target에 넣어 봤습니다. `-march=armv7-a`와 `-mcpu=cortex-m3 -mthumb`는 통과했고, `-mcpu=cortex-m0 -mthumb`는 "selected processor does not support `ldrex r1,[r0]' in Thumb mode"로 거절했습니다. Cortex-M0/M0+에서는 이 방식의 lock을 쓸 수 없습니다.

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

LDREX는 값을 읽으면서 "이 주소를 지켜보겠다"는 표시(exclusive monitor)를 걸고, STREX는 그 표시가 아직 살아 있을 때만 씁니다. 그 사이 다른 core가 그 주소에 쓰면 표시가 풀리고 STREX는 실패를 뜻하는 1을 `r3`에 돌려줍니다. 그래서 `r3`를 검사해 다시 시도합니다. 마지막 `dmb`는 옵션이 없어 objdump에서 `dmb sy`로 나왔습니다.

## ARMv8.1 LSE — 단일 명령 Atomic

ARMv8.1의 LSE(Large System Extensions)는 CAS·덧셈·교환을 한 명령으로 합니다. 예전 판의 "Cortex-A72에서 LSE CASAL 3 cycle" 표는 근거가 없어 지웠습니다.

```asm title="aarch64-lse.s"
.text
.global lse_examples
lse_examples:
    casal   w0, w1, [x2]
    ldaddal w3, w4, [x2]
    swpal   w5, w6, [x2]
    ret
```

guest의 GNU as는 기본값과 `-march=armv8-a`에서 세 명령 모두 "selected processor does not support"로 거절했고, `-march=armv8.1-a`에서만 받았습니다. 이 guest의 `/proc/cpuinfo` Features에는 `atomics`가 있어 CPU 자체는 LSE를 지원합니다.

C 컴파일러가 실제로 무엇을 만드는지는 옵션에 따라 다릅니다. 아래 `atomic-locks.c`를 Debian gcc 14.2.0 `-O2`로 세 가지로 빌드해 objdump를 봤습니다.

| 빌드 | atomic 연산이 된 것 |
| --- | --- |
| 기본 옵션 | `__aarch64_cas1_acq`, `__aarch64_ldadd4_rel` 같은 libgcc helper 호출 (outline atomics) |
| `-march=armv8.1-a` | `casa`·`ldadd`·`swp` 계열 명령을 직접 생성 |
| `-mno-outline-atomics` | `ldaxr`/`stlxr` 같은 LL/SC loop |

GCC 매뉴얼(AArch64 Options)은 `-moutline-atomics`가 기본으로 켜져 있고, 이 helper가 "at runtime, determine if the LSE instructions from ARMv8.1-A can be used"하며 아니면 ARMv8.0의 load/store-exclusive를 쓴다고 설명합니다. `-march=armv8.1-a`처럼 더 높은 revision을 주면 LSE 명령을 직접 씁니다. 같은 소스가 빌드 옵션 하나로 세 가지 코드가 됩니다. lock 성능을 잴 때는 어느 쪽으로 빌드됐는지 objdump로 먼저 확인합니다.

## C 추상화 — `<stdatomic.h>`

다음 세 구현은 C11 atomic을 이용한 **thread 문맥의 교육용 코드**입니다. lock과 node는 쓰기 전에 초기화하고, 같은 lock을 재귀로 잡거나 소유자가 아닌 쪽이 unlock하지 않습니다. IRQ mask와 preemption 제어는 들어 있지 않습니다.

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

`cpu_relax()`의 signal fence는 컴파일러 barrier일 뿐 CPU에게 쉬라는 힌트(`yield`, `wfe`)가 아닙니다.

이 코드를 그대로 include한 stress test를 guest에서 돌렸습니다. thread 4개가 lock 안에서 공유 카운터를 200만 번씩 올립니다. 기본 빌드와 `-march=armv8.1-a` 빌드 모두 세 lock이 800만을 정확히 맞췄습니다.

```text
ttas   4 threads x 2000000 iters: counter=8000000 (expected 8000000) OK
ticket 4 threads x 2000000 iters: counter=8000000 (expected 8000000) OK
mcs    4 threads x 2000000 iters: counter=8000000 (expected 8000000) OK
```

이것은 세 lock이 이 guest에서 상호 배제를 지켰다는 결과이고, weak memory의 모든 실행 순서를 증명한 것은 아닙니다.

## Test-and-Test-and-Set — Cache 절약

TTAS는 먼저 읽기만 하며 기다리다가, 비어 보일 때만 CAS를 시도합니다. 문 앞에서 손잡이 대신 "사용 중" 표시만 보다가 꺼지면 손잡이를 잡는 식입니다. 기다리는 동안 쓰기가 없으니 cache line을 덜 흔듭니다. 대신 순서가 없습니다. 풀리는 순간 여러 core가 동시에 CAS를 시도하고 아무나 이깁니다.

같은 stress test에서 1초 동안 4 thread가 경쟁하게 두고 thread별 획득 횟수를 셌습니다. 기본 빌드로 세 번, LSE 빌드로 한 번 돌렸습니다.

```text
ttas   1 s contended: per-thread acquisitions 5202351 2847918 2016184 4539537 (max/min 2.58)
ttas   1 s contended: per-thread acquisitions 1022046 1330933 1815819 767807 (max/min 2.36)
ttas   1 s contended: per-thread acquisitions 3336160 846432 816997 621838 (max/min 5.36)
ttas   1 s contended: per-thread acquisitions 679765 611025 471259 542843 (max/min 1.44)
```

가장 많이 얻은 thread가 가장 적게 얻은 thread의 1.4~5.4배를 가져갔습니다. 방금 풀어 준 thread가 그 line을 cache에 가진 채 바로 다시 잡는 일이 반복되면 이렇게 기웁니다.

## WFE / SEV — 저전력 Spin

WFE는 "event가 올 때까지 기다리라"는 hint이고, SEV는 모든 core에 event를 보냅니다. spin loop 안에서 쓰면 core가 계속 load를 반복하는 대신 쉬다가, unlock 쪽 SEV에 깨어나 다시 확인합니다.

이 글에서는 WFE lock을 돌리지 않았습니다. QEMU guest에서는 전력 효과를 볼 수 없고, WFE·SEV를 올바르게 짝짓는 순서는 ARM ARM의 event register 규칙을 따라야 하는데 그 원문을 이 글에서 확인하지 않았기 때문입니다. 그래서 복사해 쓸 WFE lock 코드는 싣지 않습니다.

## Ticket Lock — Fairness 보장

ticket lock은 은행 번호표입니다. `next`에서 번호표를 뽑고(`fetch_add`), 화면의 `serving`이 내 번호가 될 때까지 기다립니다. 뽑은 순서대로 들어가니 TTAS 같은 쏠림이 없습니다. 같은 1초 경쟁에서의 결과입니다.

```text
ticket 1 s contended: per-thread acquisitions 924782 908285 907083 899895 (max/min 1.03)
ticket 1 s contended: per-thread acquisitions 763925 758304 758371 758594 (max/min 1.01)
ticket 1 s contended: per-thread acquisitions 1501584 1497508 1497680 1496527 (max/min 1.00)
ticket 1 s contended: per-thread acquisitions 1141198 1137561 1136952 1135190 (max/min 1.01)
```

네 번 모두 max/min이 1.03 이하였습니다. 대가도 있습니다. 앞 번호 소유자가 멈추면(가상 CPU가 host에서 밀리는 경우 포함) 뒤 번호는 모두 그만큼 기다립니다. 모든 waiter가 같은 `serving`을 읽으므로 unlock 때마다 그 line이 모든 core로 다시 퍼집니다. `unsigned` 번호는 2^32에서 한 바퀴 돌지만, 동시에 기다리는 수가 그보다 작으면 비교가 맞습니다.

## MCS Lock — Per-CPU Cache Line

MCS(Mellor-Crummey·Scott, ACM TOCS 1991)는 대기 줄을 linked list로 만들고, 각 waiter가 **자기 node의 `waiting`**만 보며 기다립니다. 앞사람이 나갈 때 뒷사람 node의 `waiting`만 false로 바꾸므로, ticket lock처럼 모든 waiter가 같은 line을 보는 일이 없습니다. node는 획득 시도마다 하나씩 필요하고 unlock이 끝날 때까지 살아 있어야 합니다. 위 stress test는 thread마다 stack에 node 하나를 둡니다.

```text
mcs    1 s contended: per-thread acquisitions 840090 840065 832563 840575 (max/min 1.01)
mcs    1 s contended: per-thread acquisitions 877154 590219 853962 789238 (max/min 1.49)
mcs    1 s contended: per-thread acquisitions 1226849 1223051 1222945 1223670 (max/min 1.00)
mcs    1 s contended: per-thread acquisitions 1138426 1141310 1136777 1139376 (max/min 1.00)
```

네 번 중 세 번은 1.01 이하였고 한 번은 1.49였습니다. FIFO 순서라도 줄에 선 thread의 vCPU가 host에서 밀리면 그 뒤가 모두 늦어지는데, VM에서는 이런 일이 실제 SoC보다 자주 일어납니다. 실제 core의 cache line 분리 효과를 보려면 node를 cache line 크기로 정렬하고 실보드에서 재야 합니다.

## ESP-IDF `portMUX_TYPE` — RTOS 통합 예

ESP-IDF v5.4의 ESP32 "FreeRTOS (IDF)" 문서는 critical section을 spinlock 하나에 묶습니다. 문서 표현으로 spinlock은 `portMUX_TYPE`이고 "not to be confused to FreeRTOS mutexes"입니다. 문서는 SMP에서 "disabling interrupts is not a valid method of ensuring mutual exclusion"이라고 못 박고, 대신 아래 API를 씁니다.

```c
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"

static portMUX_TYPE mux = portMUX_INITIALIZER_UNLOCKED;

void update_shared(void) {
    taskENTER_CRITICAL(&mux);      /* ISR에서는 taskENTER_CRITICAL_ISR(&mux) */
    /* 이 mux로 보호하는 공유 상태만 짧게 갱신 */
    taskEXIT_CRITICAL(&mux);
}
```

같은 문서에 따르면 진입하는 core는 `configMAX_SYSCALL_INTERRUPT_PRIORITY`까지 interrupt를 막은 뒤 "atomic compare-and-set instruction"으로 spinlock을 돌며 잡습니다. critical section 안에서는 FreeRTOS API나 block·yield하는 함수를 부르지 말라고도 적습니다. 4-07에서 본 "IRQ mask + inter-core lock"을 API 하나로 묶은 형태입니다. 이 코드는 ESP32에서 돌리지 않았습니다.

## Spinlock vs Mutex — 결정 기준

| 조건 | 확인할 선택 |
|---|---|
| task-only이며 대기/긴 작업 필요 | blocking mutex와 priority 정책 |
| ISR도 같은 상태 접근 | port가 허용하는 IRQ mask + inter-core 배제 |
| owner가 preempt/suspend될 가능성 | 진행 조건과 최대 hold/wait 시간 분석 |

spinlock은 쥐고 있는 시간만큼 다른 core를 돌게 만들고, IRQ를 막는 형태라면 그 시간만큼 이 core의 interrupt도 늦춥니다. 그래서 hold time이 짧고 상한이 분명할 때만 spinlock이 맞습니다. 예전 판의 Cortex-A72 4-core cycle 표는 재현 자료가 없어 지웠습니다.

## 자주 보는 함정과 안티패턴

> 경고 — exclusive monitor 규칙을 단순화

STREX는 실패할 수 있는 명령이고, 실패하면 결과 레지스터에 1을 남길 뿐 아무 일도 하지 않습니다. 위 `armv7_lock`처럼 결과 레지스터를 매번 검사해 다시 시도해야 합니다. 검사를 빼면 lock을 잡지 못했는데 잡은 것으로 알고 진행합니다.

> 경고 — release를 특정 instruction으로 단정

`memory_order_release` store와 `acquire` load 한 쌍을 두 target에서 컴파일했습니다. ARMv7-A(`arm-none-eabi-gcc -O2 -march=armv7-a -marm`)에서는 store 앞에 `dmb ish`, load 뒤에 `dmb ish`가 붙었습니다. AArch64(Debian gcc 14.2.0 `-O2`)에서는 barrier 없이 `stlrb`·`ldarb` 명령 하나씩이 됐습니다. 같은 C 코드가 target에 따라 별도 barrier가 되기도 하고 명령 자체에 ordering이 들어가기도 합니다.

> 경고 — lock 내부 block과 잘못된 nesting

spinlock을 보유한 채 기다리면 다른 참여자의 진행을 막습니다. 동일 core의 IRQ 재획득·재귀 획득과 서로 반대인 다중 lock 순서를 금지하고, 같은 node를 겹치는 MCS 획득에 재사용하지 않습니다.

## 정리

- lock 없는 4 thread 증가는 800만 중 314만만 남았고, 세 lock은 모두 800만을 맞췄습니다.
- LDREX/STREX는 ARMv7-A와 Cortex-M3에서 assemble되고 Cortex-M0에서는 거절됩니다. LSE 명령은 `-march=armv8.1-a`에서만 assemble됩니다.
- Debian gcc 14.2.0 기본 빌드는 atomic을 outline helper 호출로, `-march=armv8.1-a`는 LSE 명령으로, `-mno-outline-atomics`는 LL/SC loop로 만듭니다.
- 1초 경쟁에서 TTAS는 thread 간 획득 횟수가 1.4~5.4배 차이 났고, ticket은 1.03 이하, MCS는 한 번을 빼고 1.01 이하였습니다.
- release store는 ARMv7-A에서 `dmb ish` + store, AArch64에서 `stlr`이 됐습니다.

## 근거 자료

- [Mellor-Crummey·Scott, Scalable Synchronization pseudocode](https://www.cs.rochester.edu/research/synchronization/pseudocode/ss.html): ACM TOCS 1991 논문의 ticket lock·MCS lock pseudocode.
- [ESP-IDF v5.4 ESP32 FreeRTOS](https://docs.espressif.com/projects/esp-idf/en/v5.4/esp32/api-reference/system/freertos_idf.html): IDF critical section 계약.
- [GCC atomic builtins](https://gcc.gnu.org/onlinedocs/gcc/_005f_005fatomic-Builtins.html), [AArch64 Options](https://gcc.gnu.org/onlinedocs/gcc/AArch64-Options.html): outline atomics와 LSE 선택.



다음 편은 [4-09 Software Timer](/blog/embedded/rtos/practical-internals/part4-09-software-timer)에서 daemon task 기반 timer 구조를 다룹니다.

## 관련 항목

- [3-01: Critical Section](/blog/embedded/rtos/practical-internals/part3-01-critical-section)
- [3-09: ISR-Safe API](/blog/embedded/rtos/practical-internals/part3-09-isr-safe-api)
- [4-07: SMP RTOS 설계](/blog/embedded/rtos/practical-internals/part4-07-smp-rtos)
- [4-09: Software Timer](/blog/embedded/rtos/practical-internals/part4-09-software-timer)
- [Perf Eng 4-04: Spinlock](/blog/embedded/performance-engineering/part4-04-spinlock)
