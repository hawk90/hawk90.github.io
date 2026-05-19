---
title: "2-05: Wait-Free Signaling — Atomic Flag·Sequence·Latest-Value"
date: 2026-05-20T06:00:00
description: "Wait-free 보장 patterns. Atomic flag, sequence number, latest-value (double buffer)."
series: "Modern Embedded Recipes"
seriesOrder: 11
tags: [recipes, wait-free, signaling, sequence, double-buffer]
draft: true
---

## 한 줄 요약

> **"Wait-Free = 모든 thread 진행 *bounded*"** — Lock-free보다 *강한 보장*.

## Progress Property 복습

```text
- Obstruction-free: 단독 실행 시 진행
- Lock-free:        시스템 *전체*에서 한 thread는 진행
- Wait-free:        *각 thread*가 N step 이내 완료
```

Wait-free = 가장 강한 보장 — *deadline 보장*에 유리.

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

가장 단순한 wait-free signaling — *재진입성, retry 없음*.

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

Seqlock — *reader 다중 wait-free* (writer 한 명).

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

Wait-free *both sides*. *가장 최근 값만* 필요할 때 (sensor, GPS).

> ⚠️ Reader가 *읽는 동안 writer 두 번 write* → reader buf 변경 가능 (race in same buf).

→ *Triple buffer* (3 slot)로 해결.

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

3 buffer:
- writer 채우는 (writer_buf)
- 가장 최근 (next)
- reader 읽는 중 (active)

Reader·writer 절대 *같은 buffer* 안 봄.

## Wait-Free Queue — Kogan-Petrank

```text
2011년 Alex Kogan + Erez Petrank
  - 모든 push/pop이 O(1)
  - 매우 복잡 — 수백 줄 코드
  - 일반 사용엔 부담
```

academic. 임베디드에선 *SPSC lock-free*가 표준.

## Cortex-M Single-Word Atomic

```c
/* 32-bit aligned word — Cortex-M3+ 자동 atomic */
volatile uint32_t status;

ISR: status = STATUS_OK;
task: if (status == STATUS_OK) ...
```

Aligned word write/read = *single load/store* = atomic. *Wait-free by default*.

## SwiftLM — Hardware Wait-Free Counter

```c
/* ARMv8.1 LSE — single instruction */
atomic_fetch_add(&counter, 1, memory_order_relaxed);
                /* → LDADD — 단일 명령, contention 무관 wait-free */
```

ARMv8.1+ — LDADD·LDSET·LDCLR이 모두 *single instruction*. *진정한 wait-free*.

ARMv8.0 LDREX/STREX — retry 가능 → *lock-free but not wait-free*.

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

Read는 wait-free, write는 *grace period wait*. Linux kernel routing table 등.

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

ISR overhead 최소 — task가 *batch 처리*.

## RP2040 — HW Spinlock + Wait-Free

```c
/* RP2040 SIO peripheral */
uint32_t saved = spin_lock_blocking(spin_lock_instance(0));
critical();
spin_unlock(spin_lock_instance(0), saved);
```

HW spinlock — *bounded* wait (waiter 수만큼). 거의 wait-free.

## 자동차 — Wait-Free 우선

```text
ASIL-D ECU:
  - Lock 자체 회피
  - Double buffer + atomic flag
  - Sensor fusion — triple buffer
  - Critical path — wait-free 보장
```

WCET 보장 — *진행 보장*이 곧 *deadline 보장*.

## 자주 하는 실수

> ⚠️ CAS retry — wait-free 아님

```c
do {
    old = atomic_load(&x);
} while (!atomic_compare_exchange(&x, &old, old+1));
/* contention 시 무한 retry — lock-free, not wait-free */
```

→ ARMv8.1 LDADD 또는 *대기 없는 알고리즘*.

> ⚠️ Double buffer race

```c
read(buf[active]);   /* writer가 active 변경 *중* — race */
```

→ atomic swap 또는 triple buffer.

> ⚠️ 64-bit on 32-bit MCU

```c
volatile uint64_t timestamp;   /* split load/store — not atomic */
```

→ atomic_uint64 or critical section.

> ⚠️ Wait-free 가정 안 확인

```c
my_atomic_op();   /* lock-free? wait-free? — 측정 안 함 */
```

→ retry 횟수·timing 측정.

## 정리

- **Wait-free** = *각 thread* bounded steps.
- Atomic flag, sequence number, latest-value — wait-free patterns.
- **Double buffer** = reader·writer 둘 다 wait-free (race 가능).
- **Triple buffer** = race 없음.
- ARMv8.1 **LDADD** = single instruction wait-free.
- RCU — read side wait-free.
- 자동차·RT critical — wait-free 패턴 우선.

다음 편은 **Timer Wheel**.

## 관련 항목

- [2-04: Memory Barrier](/blog/embedded/modern-recipes/part2-04-memory-barrier)
- [2-06: Timer Wheel](/blog/embedded/modern-recipes/part2-06-timer-wheel)
