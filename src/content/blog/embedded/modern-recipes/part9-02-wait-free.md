---
title: "9-02: Wait-Free Signaling — Atomic Flag·Sequence·Latest-Value"
date: 2026-05-16T06:00:00
description: "Wait-free 보장 patterns. Atomic flag, sequence number, latest-value (double buffer)."
series: "Modern Embedded Recipes"
seriesOrder: 102
tags: [recipes, wait-free, signaling, sequence, double-buffer]
draft: false
---

## 한 줄 요약

> **"Wait-Free는 모든 thread 진행이 *bounded*"**임을 의미합니다. Lock-free보다 *강한 보장*입니다.

## Progress Property 복습

- Obstruction-free: 단독 실행 시 진행
- Lock-free:        시스템 *전체*에서 한 thread는 진행
- Wait-free:        *각 thread*가 N step 이내 완료

Wait-free는 가장 강한 보장입니다. 그래서 *deadline 보장*에 유리합니다.

## Atomic Flag Signaling

```c
atomic_bool ready = false;
volatile data_t data;

/* Producer */
data = compute();
atomic_store_explicit(&ready, true, memory_order_release);
                                /* O(1) — wait-free */

/* Consumer */
if (atomic_load_explicit(&ready, memory_order_acquire)) {
    use(data);
    atomic_store(&ready, false);   /* consume */
}
```

가장 단순한 wait-free signaling입니다. *재진입성이 있고 retry가 없습니다*.

## Sequence Number — Multi-Reader

```c
struct {
    atomic_uint64_t seq;
    sensor_data_t data;
} sensor;

/* Writer */
void update(sensor_data_t new_d) {
    uint64_t s = atomic_load(&sensor.seq);
    atomic_store(&sensor.seq, s | 1);   /* odd = writing */
    __DMB();
    sensor.data = new_d;
    __DMB();
    atomic_store(&sensor.seq, s + 2);   /* even = stable */
}

/* Reader */
bool read(sensor_data_t *out) {
    uint64_t s;
    do {
        s = atomic_load(&sensor.seq);
        if (s & 1) return false;   /* writing now */
        *out = sensor.data;
    } while (s != atomic_load(&sensor.seq));
    return true;
}
```

Seqlock은 *reader 다중 wait-free*입니다(writer는 한 명).

## Latest-Value — Double Buffer

```c
struct {
    atomic_int active;
    sensor_data_t buf[2];
} ds;

/* Writer */
void write(sensor_data_t new) {
    int next = !atomic_load(&ds.active);
    ds.buf[next] = new;
    __DMB();
    atomic_store(&ds.active, next);
}

/* Reader */
void read(sensor_data_t *out) {
    int idx = atomic_load(&ds.active);
    *out = ds.buf[idx];   /* may be racing — but consistent buf */
}
```

양쪽 모두 wait-free입니다. *가장 최근 값만* 필요할 때 적합합니다(sensor, GPS).

> ⚠️ Reader가 *읽는 동안 writer가 두 번 write*하면 reader buf가 변경될 수 있습니다(race in same buf).

→ *Triple buffer*(3 slot)로 해결합니다.

## Triple Buffer

```c
struct {
    atomic_int active;   /* reader 가져갈 buffer */
    atomic_int next;     /* 다음 active 후보 */
    int writer_buf;       /* writer 현재 채우는 */
    sensor_data_t buf[3];
} tb;

/* Writer */
void write(sensor_data_t new) {
    int wb = tb.writer_buf;
    tb.buf[wb] = new;
    int prev_next = atomic_exchange(&tb.next, wb);
    tb.writer_buf = prev_next;
    /* prev_next: 이전 next → 이제 writer가 채울 buffer */
}

/* Reader */
void read(sensor_data_t *out) {
    int n = atomic_exchange(&tb.next, atomic_load(&tb.active));
    atomic_store(&tb.active, n);
    *out = tb.buf[n];
}
```

3 buffer 구성은 다음과 같습니다.
- writer가 채우는 곳(writer_buf)
- 가장 최근(next)
- reader가 읽는 중(active)

Reader와 writer는 절대 *같은 buffer*를 보지 않습니다.

## Wait-Free Queue — Kogan-Petrank

2011년 Alex Kogan + Erez Petrank이 제안한 wait-free queue:

- 모든 push/pop이 O(1)
- 매우 복잡 — 수백 줄 코드
- 일반 사용엔 부담

academic 영역입니다. 임베디드에서는 *SPSC lock-free*가 표준입니다.

## Cortex-M Single-Word Atomic

```c
/* 32-bit aligned word — Cortex-M3+ 자동 atomic */
volatile uint32_t status;

ISR: status = STATUS_OK;
task: if (status == STATUS_OK) ...
```

Aligned word write/read은 *single load/store*로 atomic합니다. 기본적으로 *wait-free*입니다.

## SwiftLM — Hardware Wait-Free Counter

```c
/* ARMv8.1 LSE — single instruction */
atomic_fetch_add(&counter, 1, memory_order_relaxed);
                /* → LDADD — 단일 명령, contention 무관 wait-free */
```

ARMv8.1+에서는 LDADD·LDSET·LDCLR이 모두 *single instruction*입니다. *진정한 wait-free*입니다.

ARMv8.0의 LDREX/STREX는 retry가 가능하므로 *lock-free이지만 wait-free는 아닙니다*.

## Read-Copy-Update (Read-Side Wait-Free)

```c
/* Reader — wait-free */
rcu_read_lock();   /* no-op or preempt-disable */
struct data *d = rcu_dereference(global);
use(d);
rcu_read_unlock();

/* Writer — may wait (grace period) */
struct data *new = malloc(sizeof(*new));
copy_old_to_new(new);
modify(new);
rcu_assign_pointer(global, new);
synchronize_rcu();
free(old);
```

Read는 wait-free이고 write는 *grace period wait*입니다. Linux kernel routing table 등에서 씁니다.

## ISR↔Task Wait-Free Pattern

```c
volatile uint32_t isr_count;
volatile uint32_t task_seen;

/* ISR */
void IRQ(void) {
    isr_count++;
    /* No wake, no lock — just count */
}

/* Task — periodic poll */
void task(void *p) {
    for (;;) {
        uint32_t now = isr_count;
        if (now != task_seen) {
            handle_events(now - task_seen);
            task_seen = now;
        }
        vTaskDelay(10);
    }
}
```

ISR overhead가 최소화됩니다. task가 *batch로 처리*하기 때문입니다.

## RP2040 — HW Spinlock + Wait-Free

```c
/* RP2040 SIO peripheral */
uint32_t saved = spin_lock_blocking(spin_lock_instance(0));
critical();
spin_unlock(spin_lock_instance(0), saved);
```

HW spinlock은 *bounded* wait입니다(waiter 수만큼). 거의 wait-free에 가깝습니다.

## 자동차 — Wait-Free 우선

**ASIL-D ECU:**

- Lock 자체 회피
- Double buffer + atomic flag
- Sensor fusion — triple buffer
- Critical path — wait-free 보장

WCET 보장에서는 *진행 보장*이 곧 *deadline 보장*입니다.

## 자주 하는 실수

> ⚠️ CAS retry는 wait-free가 아닙니다

```c
do {
    old = atomic_load(&x);
} while (!atomic_compare_exchange(&x, &old, old+1));
/* contention 시 무한 retry — lock-free, not wait-free */
```

→ ARMv8.1 LDADD 또는 *대기 없는 알고리즘*을 씁니다.

> ⚠️ Double buffer에서 race가 발생합니다

```c
read(buf[active]);   /* writer가 active 변경 *중* — race */
```

→ atomic swap 또는 triple buffer로 해결합니다.

> ⚠️ 32-bit MCU에서 64-bit 변수를 다룹니다

```c
volatile uint64_t timestamp;   /* split load/store — not atomic */
```

→ atomic_uint64 또는 critical section을 사용합니다.

> ⚠️ Wait-free 가정을 확인하지 않습니다

```c
my_atomic_op();   /* lock-free? wait-free? — 측정 안 함 */
```

→ retry 횟수와 timing을 측정합니다.

## 정리

- **Wait-free**는 *각 thread*가 bounded steps 안에 진행함을 의미합니다.
- Atomic flag, sequence number, latest-value는 모두 wait-free 패턴입니다.
- **Double buffer**는 reader·writer 둘 다 wait-free이지만 race가 가능합니다.
- **Triple buffer**에서는 race가 없습니다.
- ARMv8.1 **LDADD**는 single instruction wait-free입니다.
- RCU는 read side가 wait-free입니다.
- 자동차·RT critical 영역에서는 wait-free 패턴을 우선합니다.

다음 편은 **Timer Wheel**입니다.

## 관련 항목

- [2-04: Memory Barrier](/blog/embedded/modern-recipes/part2-04-memory-barrier)
- [2-06: Timer Wheel](/blog/embedded/modern-recipes/part2-06-timer-wheel)
