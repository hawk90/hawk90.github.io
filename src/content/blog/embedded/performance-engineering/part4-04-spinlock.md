---
title: "Spinlock 성능 분석 — Spin-Wait vs Context Switch·Ticket·MCS"
slug: "embedded/performance-engineering/part4-04-spinlock"
date: 2026-04-26T09:03:00
description: "Spinlock 비용 분석과 ticket lock, MCS lock의 scalability 차이."
series: "Embedded Performance Engineering"
seriesOrder: 33
tags: [spinlock, smp, ticket-lock, mcs]
topics: ["embedded"]
---

## 한 줄 요약

> **"Spinlock은 busy wait입니다."** 기다리는 동안 CPU를 그대로 씁니다. 8 vCPU 게스트에서 8 thread가 spinlock 하나를 다투자 CPU 사용량은 6~8코어였고, 공정한(FIFO) MCS lock은 100 µs 임계구역에서 throughput이 mutex의 5분의 1 아래로 떨어졌습니다.

## 어떤 문제를 푸는가

Mutex처럼 잠들 수 있는 lock은 기다리는 thread를 재우고 깨우는 데 context switch가 따라옵니다. 이 비용을 직접 재 봤습니다. `ctxsw.c`는 두 thread가 `FUTEX_WAIT`/`FUTEX_WAKE`로 토큰을 주고받으며, 두 thread를 같은 CPU에 고정하면 한 번 넘길 때마다 context switch가 한 번 일어납니다(`perf stat`으로 10만 왕복에 `context-switches` 200,001번 확인).

| 배치 | 한 번 넘기는 데 걸린 시간 (5회 중앙값) |
|---|---:|
| 두 thread가 같은 CPU | 650 ns |
| 서로 다른 CPU | 13,108 ns |

측정 환경은 Debian 13 arm64 게스트(QEMU 11.1.3 HVF, 8 vCPU, host Apple M2 Pro, 커널 6.12.116, GCC 14.2.0, glibc 2.41)입니다. 서로 다른 CPU 사이가 20배 느린 원인은 이 글에서 분리하지 않았습니다. 게스트의 vCPU는 host의 thread이므로 실제 하드웨어의 값으로 옮겨 쓰지 않습니다.

Spinlock은 이 비용을 피하는 대신 lock이 풀릴 때까지 CPU를 점유한 채 계속 읽습니다. 화장실 문 앞에서 노크를 계속하며 서 있는 것과, 번호표를 받고 의자에 앉아 있다가 부르면 일어나는 것의 차이입니다. 아래에서 spinlock의 기본 구현부터 ticket lock, MCS lock까지 같은 벤치마크로 비교합니다.

## Spin vs Sleep — 손익 분기

손익 분기를 계산으로 정하는 대신 `spinbench.c`로 직접 쟀습니다. T개 thread가 lock 하나를 두고, 연산마다 lock 밖에서 `OUT` 단위, 안에서 `IN` 단위의 빈 루프를 돕니다(`OUT = IN`). 이 게스트에서 1단위는 약 2.2 ns라서 `IN`=50, 500, 5000, 50000이 hold time 약 0.1, 1, 10, 100 µs에 해당합니다. 조합마다 5회 돌린 중앙값입니다.

```bash
gcc -O2 -pthread -Wall spinbench.c -o spinbench
./spinbench tas|ttas|ticket|mcs|mutex T IN OUT OPS
```

8 thread(= vCPU 수)의 throughput(천 ops/s)입니다.

| Hold | TAS | TTAS | Ticket | MCS | `pthread_mutex` |
|---|---:|---:|---:|---:|---:|
| 약 0.1 µs | 1,394 | 1,946 | 1,340 | 190 | 2,409 |
| 약 1 µs | 654 | 763 | 480 | 718 | 370 |
| 약 10 µs | 34.7 | 27.5 | 60.8 | 80.3 | 41.7 |
| 약 100 µs | 7.0 | 9.2 | 1.3 | 0.9 | 4.9 |

같은 실행의 CPU 사용량(`getrusage`의 user+sys ÷ wall time)은 spinlock 네 종류가 6.0~8.0코어, mutex가 1.2~4.6코어였습니다. 4 thread로 줄이면 그림이 달라집니다. 100 µs hold에서 네 spinlock 모두 9.3~9.6천 ops/s로 mutex(8.2천)보다 약간 높았고, CPU는 3.7~4.0코어 대 1.8코어였습니다.

표에서 읽을 수 있는 점은 셋입니다.

- **어느 hold time에서도 한 lock이 늘 이기지는 않았습니다.** 0.1 µs에서는 mutex가 가장 빨랐고, 1 µs에서는 TTAS가 mutex의 2배였습니다. 100 µs에서는 mutex(4.9천)가 TAS·TTAS보다 느렸지만 ticket·MCS보다는 빨랐습니다.
- **spinlock은 기다리는 thread 수만큼 CPU를 씁니다.** throughput이 비슷해도 나머지 일을 할 CPU가 남지 않습니다.
- **thread 수가 CPU 수에 닿으면 FIFO spinlock이 무너졌습니다.** 아래 [Cache Line Bouncing 비교](#cache-line-bouncing-비교)에서 다룹니다.

## 기본 Spinlock — Test-and-Set

가장 단순한 spinlock은 "1을 써 넣고, 원래 값이 0이었으면 내가 잡은 것"입니다.

```c
typedef struct { atomic_int locked; } spinlock_t;

void spin_lock(spinlock_t *lock) {
    while (atomic_exchange(&lock->locked, 1)) {
        /* spin */
    }
}

void spin_unlock(spinlock_t *lock) {
    atomic_store(&lock->locked, 0);
}
```

이 코드를 컴파일하면 target마다 다른 명령이 나옵니다(Apple clang 21.0.0, `-O2 -S`). ARMv7-A에서는 `ldrex`/`strex` 재시도 루프가 되고, `atomic_exchange`가 seq_cst라서 앞뒤로 `dmb ish`가 붙습니다.

```text
spin_lock:
	mov	r1, #1
.LBB0_1:
	dmb	ish
.LBB0_2:
	ldrex	r2, [r0]
	strex	r3, r1, [r0]
	cmp	r3, #0
	bne	.LBB0_2
	cmp	r2, #0
	dmb	ish
	bxeq	lr
	b	.LBB0_1
```

AArch64에서 LSE(`-march=armv8.1-a`)를 쓰면 루프 본체가 `swpal w8, w9, [x0]`과 `cbnz w9, .LBB0_1` 두 명령으로 줄고, unlock은 `stlr wzr, [x0]` 하나입니다.

문제는 기다리는 모든 코어가 같은 cache line에 *쓰기*를 시도한다는 점입니다. `atomic_exchange`는 값을 바꾸지 못해도 line의 소유권을 가져와야 하므로, line이 기다리는 코어들 사이를 계속 오갑니다. 위 표의 8 thread 0.1 µs에서 TAS(1,394천)가 TTAS(1,946천)보다 28% 느렸습니다.

## Test-and-Test-and-Set (TTAS)

TTAS는 먼저 *읽기만* 하며 기다리다가, 풀린 것을 본 순간에만 쓰기를 시도합니다.

```c
void spin_lock(spinlock_t *lock) {
    while (1) {
        while (atomic_load_explicit(&lock->locked,
                                    memory_order_relaxed)) {
            cpu_relax();
        }
        if (!atomic_exchange(&lock->locked, 1)) return;
    }
}
```

읽기만 하는 동안에는 기다리는 코어들이 line을 공유한 채 각자 자기 캐시에서 읽을 수 있습니다. lock이 풀리면 그때 기다리던 코어들이 한꺼번에 `atomic_exchange`를 시도하고, 하나만 성공합니다. 8 thread에서 TTAS는 0.1 µs와 1 µs hold 모두 TAS보다 빨랐지만(1,946천 대 1,394천, 763천 대 654천), 10 µs에서는 오히려 느렸습니다(27.5천 대 34.7천).

## Ticket Lock — FIFO Fair

ticket lock은 은행 번호표입니다. 도착하면 번호를 하나 받고, 전광판(`now_serving`)에 자기 번호가 뜰 때까지 기다립니다.

```c
typedef struct {
    atomic_int next;
    atomic_int now_serving;
} ticket_lock_t;

void ticket_lock(ticket_lock_t *l) {
    int my_ticket = atomic_fetch_add(&l->next, 1);
    while (atomic_load(&l->now_serving) != my_ticket) {
        cpu_relax();
    }
}

void ticket_unlock(ticket_lock_t *l) {
    atomic_fetch_add(&l->now_serving, 1);
}
```

도착 순서대로 받으므로 starvation이 없습니다. [4-03](/blog/embedded/performance-engineering/part4-03-lock-contention)의 handoff 측정에서 ticket lock은 획득의 99.8%가 직전 소유자가 아닌 thread에게 갔습니다. 공정성의 효과는 tail에서 보입니다. 4 thread, 100 µs hold에서 ticket lock의 p99 대기는 245 µs였고 TTAS는 3,089 µs였습니다.

단점은 모든 waiter가 같은 `now_serving` line을 보고 있다는 점입니다. unlock 한 번에 그 line을 읽던 모든 코어가 다시 가져와야 합니다.

## MCS Lock — Scalable

MCS lock(Mellor-Crummey와 Scott)은 waiter마다 자기 노드를 두고, 각자 *자기 노드의 깃발*만 보며 기다립니다. 줄 선 사람마다 자기 진동벨을 들고 있는 것과 같습니다.

```c
#include <stdatomic.h>
#include <stdbool.h>
#include <stddef.h>

typedef struct mcs_node mcs_node;
struct mcs_node {
    _Atomic(mcs_node *) next;
    atomic_bool waiting;
};
typedef struct {
    _Atomic(mcs_node *) tail;
} mcs_lock_t;

/* Call once before sharing the lock. Each contender supplies its own node. */
void mcs_lock_init(mcs_lock_t *lock) {
    atomic_init(&lock->tail, NULL);
}

void mcs_lock_acquire(mcs_lock_t *lock, mcs_node *node) {
    atomic_store_explicit(&node->next, NULL, memory_order_relaxed);
    atomic_store_explicit(&node->waiting, true, memory_order_relaxed);
    mcs_node *pred = atomic_exchange_explicit(&lock->tail, node,
                                              memory_order_acq_rel);
    if (pred != NULL) {
        atomic_store_explicit(&pred->next, node, memory_order_release);
        while (atomic_load_explicit(&node->waiting, memory_order_acquire)) {
            /* Use the target's PAUSE/YIELD hint here when available. */
        }
    }
}

void mcs_lock_release(mcs_lock_t *lock, mcs_node *node) {
    mcs_node *succ = atomic_load_explicit(&node->next, memory_order_acquire);
    if (succ == NULL) {
        mcs_node *expected = node;
        if (atomic_compare_exchange_strong_explicit(&lock->tail, &expected,
                NULL, memory_order_release, memory_order_relaxed)) {
            return;
        }
        do {
            succ = atomic_load_explicit(&node->next, memory_order_acquire);
        } while (succ == NULL);
    }
    atomic_store_explicit(&succ->waiting, false, memory_order_release);
}
```

`spinbench.c`의 `mcs` 모드가 이 코드와 같은 알고리즘이고, 노드는 thread마다 64바이트 정렬로 따로 잡습니다. unlock은 다음 노드의 `waiting` 하나만 바꾸므로, 기다리는 코어 전체가 아니라 다음 코어 하나의 line만 건드립니다.

Linux v6.12의 `kernel/locking/qspinlock.c` 머리 주석은 queued spinlock을 이해하려면 MCS lock을 보라고 하고, qspinlock이 MCS에 기반하되 `spinlock_t`를 4바이트에 맞추려고 tail과 `next->locked`를 u32 하나로 압축했다고 설명합니다. v6.12에서 `arch/arm64/Kconfig`(90행)와 `arch/x86/Kconfig`(133행)는 모두 `ARCH_USE_QUEUED_SPINLOCKS`를 select합니다.

## Cache Line Bouncing 비교

| Lock | waiter가 보는 곳 | unlock이 건드리는 line |
|---|---|---|
| TAS | lock 변수 (쓰기 시도) | lock 변수, 기다리는 동안에도 계속 쓰기 |
| TTAS | lock 변수 (읽기) | lock 변수 하나, 풀린 순간 모든 waiter가 쓰기 시도 |
| Ticket | `now_serving` (읽기) | `now_serving` 하나, 모든 waiter가 다시 읽음 |
| MCS | 자기 노드의 `waiting` | 다음 노드의 `waiting` 하나 |

이론대로라면 MCS가 가장 잘 버텨야 합니다. 실제로 8 thread, 10 µs hold에서 MCS가 80.3천 ops/s로 다섯 lock 중 가장 높았습니다. 그런데 같은 8 thread에서도 0.1 µs와 100 µs hold에서는 MCS가 가장 낮았습니다(190천, 0.9천). ticket lock도 100 µs에서 1.3천으로 무너졌습니다. 4 thread에서는 이런 붕괴가 없었습니다.

FIFO lock은 다음 차례가 정해져 있으므로, 다음 차례의 thread가 실행 중이 아니면 모두가 그 thread를 기다립니다. 이 게스트는 thread 수가 vCPU 수와 같고, vCPU는 host에서 다른 작업과 CPU를 나눠 씁니다. Linux v6.12의 `kernel/locking/qspinlock_paravirt.h`가 바로 이 상황을 다룹니다. 이 파일은 paravirt qspinlock의 아이디어를 "vCPU를 spin시키는 대신 halt시키는 것"으로 설명하고, 앞 노드의 vCPU가 실행 중이 아니면 큐 노드 vCPU가 spin을 멈춘다고 적습니다. v6.12에서 `PARAVIRT_SPINLOCKS`는 `arch/x86/Kconfig`(815행)에는 있고 `arch/arm64/Kconfig`에는 없습니다. 그래서 "대규모 SMP에서는 MCS가 항상 낫다"는 결론은 thread가 모두 계속 실행될 수 있다는 전제가 있어야 성립합니다.

## Linux Kernel — `spin_lock`

커널의 spinlock API는 인터럽트를 함께 다루는 변형을 둡니다.

```c
spin_lock(&mylock);
critical_code();
spin_unlock(&mylock);

unsigned long flags;
spin_lock_irqsave(&mylock, flags);
critical_code();
spin_unlock_irqrestore(&mylock, flags);
```

v6.12 `Documentation/locking/spinlocks.rst`는 `spin_lock_irqsave`가 *로컬* 인터럽트를 끄므로 항상 안전하다고 적습니다. 같은 문서는 인터럽트 핸들러가 잡는 lock을 프로세스 문맥에서 irq 없는 `spin_lock`으로 잡으면 deadlock이 난다고 설명합니다. lock을 쥔 CPU에서 인터럽트가 들어와 같은 lock을 기다리면, 인터럽트가 끝나야 실행을 재개할 holder가 영원히 풀어 주지 못하기 때문입니다. 다른 CPU의 인터럽트는 holder를 멈추지 않으므로 문제가 없습니다.

## Cortex-M에서의 Spinlock

단일 코어에서는 기다리는 쪽이 CPU를 쥐고 있는 한 holder가 실행될 수 없습니다. 고정 우선순위 선점형 스케줄러에서 spinner가 holder보다 우선순위가 높으면, spinner가 스스로 양보하지 않는 한 holder는 다시 실행되지 않습니다. Linux로 이 상황을 재현했습니다. `uniprio.c`는 두 thread를 CPU 3에 고정하고, `SCHED_OTHER` holder가 TAS lock을 쥔 채 20 ms의 CPU 작업을 하는 동안 `SCHED_FIFO` 50 spinner가 같은 lock을 기다립니다.

```text
cpu=3 hold_ms=20 spinner_wait_ms=950.1
cpu=3 hold_ms=20 spinner_wait_ms=967.8
cpu=3 hold_ms=20 spinner_wait_ms=950.1
```

20 ms면 끝날 일을 기다리는 데 950 ms가 걸렸습니다. 그래도 끝난 이유는 Linux가 RT task에 CPU를 다 주지 않기 때문입니다. v6.12 `kernel/sched/deadline.c`(1637~1640행)는 CPU마다 runtime 50 ms, period 1000 ms의 fair server를 만들고, 이 게스트의 `/sys/kernel/debug/sched/fair_server/cpu3/`도 `runtime=50000000`, `period=1000000000`(ns)이었습니다. `Documentation/scheduler/sched-rt-group.rst` 2.2절의 기본값(`sched_rt_runtime_us` 950000, `sched_rt_period_us` 1000000)도 같은 비율을 정합니다. 이런 장치가 없는 RTOS라면 spinner는 끝나지 않습니다. 그래서 단일 코어 Cortex-M에서는 spin 대신 인터럽트를 끄거나 `BASEPRI`로 임계구역을 보호하고, task끼리는 잠들 수 있는 mutex를 씁니다.

멀티코어 MCU에서는 코어 사이 spinlock이 필요합니다. 예를 들어 [RP2040 datasheet](https://datasheets.raspberrypi.com/rp2040/rp2040-datasheet.pdf) 2.3.1.3절은 SIO 블록에 32개의 하드웨어 spinlock(`SPINLOCK0`~`SPINLOCK31`)이 있다고 적습니다. 읽기가 lock 획득 시도이고(0이 아니면 성공), 아무 값이나 쓰면 해제이며, 두 코어가 같은 클럭에 시도하면 core 0이 이깁니다. 같은 절은 lock을 오래 쥐면 polling이 비효율적이므로, 이 spinlock은 mutex·semaphore·queue 같은 상위 primitive의 짧은 임계구역을 보호하는 데 쓰라고 권합니다.

Zephyr SMP의 사용 예입니다. 타입 이름은 `struct k_spinlock`입니다([Zephyr v3.7.0 `include/zephyr/spinlock.h`](https://github.com/zephyrproject-rtos/zephyr/blob/v3.7.0/include/zephyr/spinlock.h) 45행).

```c
static struct k_spinlock lock;

k_spinlock_key_t key = k_spin_lock(&lock);
critical_code();
k_spin_unlock(&lock, key);
```

같은 헤더의 `k_spin_lock()` 설명은 반환 후 호출 thread가 *자기 CPU에서* `k_spin_unlock()`까지 중단되거나 인터럽트되지 않음을 보장하고, `key`가 unlock 때 필요한 인터럽트 상태를 담는다고 적습니다. 구현도 `arch_irq_lock()`으로 인터럽트를 먼저 끕니다(191행). spinlock은 재귀가 아니어서, 이미 쥔 lock을 같은 CPU에서 다시 잡으면 deadlock입니다.

## Adaptive Mutex — Spin 후 Sleep

spin과 sleep을 섞는 방법도 있습니다. 잠깐 spin해 보고, 그래도 안 풀리면 잠듭니다.

```c
void adaptive_lock(lock_t *l) {
    int spins = 0;
    while (!try_lock(l)) {
        if (++spins > THRESHOLD) {
            block_self();
            return;
        }
        cpu_relax();
    }
}
```

Linux 커널 mutex가 이런 하이브리드입니다. v6.12 `Documentation/locking/mutex-design.rst`는 획득 경로를 셋으로 나눕니다. fastpath는 owner 필드를 `cmpxchg`로 바꾸는 것이고, midpath(optimistic spinning)는 *lock owner가 실행 중이고 더 높은 우선순위 task가 기다리지 않는 동안* spin하며, slowpath는 wait-queue에 들어가 잠드는 것입니다. 기준이 "몇 µs"가 아니라 "owner가 실행 중인가"라는 점이 위 의사 코드와 다릅니다. 같은 문서는 midpath의 spinner를 MCS lock으로 줄 세워 한 spinner만 mutex를 다투게 한다고 설명합니다.

userspace에서는 glibc의 `PTHREAD_MUTEX_ADAPTIVE_NP`가 정해진 횟수만 spin합니다. 그 횟수와 효과는 [4-05](/blog/embedded/performance-engineering/part4-05-mutex)에서 잽니다.

## ARM YIELD 힌트

spin 루프 안에는 "지금 기다리는 중"이라는 힌트 명령을 넣습니다. Linux v6.12의 `cpu_relax()`가 arch별로 무엇을 내는지 보면 다음과 같습니다.

| Arch | `cpu_relax()` 구현 (v6.12, `arch/*/include/asm/vdso/processor.h`) |
|---|---|
| arm64 | `asm volatile("yield" ::: "memory")` |
| x86 | `rep; nop` (주석: "REP NOP (PAUSE) is a good thing to insert into busy-wait loops.") |
| RISC-V | `RISCV_PAUSE`(`.4byte 0x100000f`, Zihintpause의 `pause`). M 확장이 있으면 그 앞에 0으로 나누는 `div`로 긴 지연을 만듦 |

`spinbench.c`도 AArch64에서 같은 `yield`를 씁니다.

```c
static inline void cpu_relax(void) {
    asm volatile ("yield" ::: "memory");
}
```

## 자주 보는 함정과 안티패턴

> ⚠️ Single-core에서 spinlock

```c
/* 단일 코어, spinner의 우선순위가 holder보다 높음 */
spin_lock(&l);   /* holder가 실행될 기회가 없음 */
```

`uniprio.c` 재현에서 20 ms짜리 일이 950 ms 뒤에야 끝났고, 그나마 Linux fair server 덕분이었습니다. 단일 코어에서는 인터럽트 비활성화나 mutex를 씁니다.

> ⚠️ Long hold time spinlock

```c
spin_lock(&l);
http_request();   /* 응답을 기다리는 동안 다른 코어도 모두 spin */
spin_unlock(&l);
```

위 표에서 spinlock은 기다리는 thread 수만큼 CPU를 썼습니다. 끝나는 시점이 정해지지 않은 작업은 spinlock 안에 두지 않습니다.

> ⚠️ IRQ enable 상태에서 spinlock

```c
spin_lock(&l);
/* 이 CPU에 인터럽트가 들어와 핸들러가 같은 l을 잡으려 하면 deadlock */
```

인터럽트 핸들러와 공유하는 lock은 `spin_lock_irqsave`로 잡습니다(`Documentation/locking/spinlocks.rst`).

> ⚠️ 공정한 spinlock이면 안전하다는 가정

FIFO lock은 다음 차례가 실행 중이어야만 진행합니다. 8 vCPU에 8 thread를 올린 측정에서 MCS와 ticket lock은 100 µs hold에서 TTAS의 10~14% 수준으로 떨어졌습니다. 가상 머신이나 CPU보다 thread가 많은 환경에서는 공정한 spinlock이 오히려 위험합니다.

## 측정 — 실측 결과

이 글의 모든 숫자는 위 게스트에서 나왔습니다. 측정 프로그램은 `spinbench.c`(TAS·TTAS·ticket·MCS·`pthread_mutex`), `ctxsw.c`(futex ping-pong), `uniprio.c`(단일 CPU 우선순위 spin)이고, 각 조합을 5회(`uniprio`는 3회) 돌려 중앙값을 적었습니다. 측정 중 같은 Mac에서 다른 작업도 돌고 있었으므로, 절대값보다 같은 표 안의 상대 비교로 읽습니다. 실제 하드웨어에서 hold time 경계를 정하려면 같은 벤치마크를 대상 보드에서 thread 수를 CPU 수 아래와 위로 바꿔 가며 다시 돌립니다.

## 정리

아래 수치는 모두 이 글의 측정 환경(Apple M2 Pro 위 HVF Debian 13 arm64 게스트)에서 잰 값이며, 다른 CPU나 보드의 값이 아닙니다.

- 같은 CPU에서 futex로 넘기는 context switch는 650 ns였고, spinlock은 이 비용 대신 CPU를 씁니다.
- 어느 hold time에서도 항상 이기는 lock은 없었습니다. 0.1 µs에서는 mutex가, 1 µs에서는 TTAS가, 100 µs에서는 TTAS가 가장 빨랐습니다.
- TTAS는 짧은 hold에서 TAS보다 빨랐고, 공정한 ticket lock은 p99 대기를 크게 줄였습니다.
- thread 수가 vCPU 수에 닿으면 MCS·ticket lock이 무너졌습니다. Linux paravirt qspinlock이 이 문제를 다룹니다.
- 단일 코어에서 높은 우선순위로 spin하면 holder가 실행되지 못합니다. Linux에서는 fair server 덕분에 950 ms 만에 풀렸습니다.
- `cpu_relax()`는 arm64 `yield`, x86 `pause`, RISC-V `pause`입니다.

다음 편은 **Mutex 성능** — futex와 priority inheritance를 분석합니다.

## 관련 항목

- [4-03: Lock Contention](/blog/embedded/performance-engineering/part4-03-lock-contention)
- [4-05: Mutex 성능](/blog/embedded/performance-engineering/part4-05-mutex)
- [Practical RTOS Internals 3-01: Critical Section](/blog/embedded/rtos/practical-internals/part3-01-critical-section)
