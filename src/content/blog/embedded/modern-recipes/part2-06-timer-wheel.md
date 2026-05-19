---
title: "2-06: Timer Wheel — Hashed·Hierarchical·O(1) Tick"
date: 2026-05-20T07:00:00
description: "Timer wheel 자료구조. Hashed wheel·hierarchical wheel·O(1) tick·Linux jiffies."
series: "Modern Embedded Recipes"
seriesOrder: 12
tags: [recipes, timer-wheel, hashed-wheel, hierarchical, scheduler]
draft: true
---

## 한 줄 요약

> **"Timer Wheel = O(1) tick, O(1) add·cancel"** — 수천 timer에도 *상수 시간*.

## Naive — Sorted List

```c
struct timer { uint32_t expiry; struct timer *next; };
struct timer *head;

void add_timer(struct timer *t, uint32_t ms) {
    t->expiry = now() + ms;
    insert_sorted(&head, t);   /* O(N) */
}

void tick(void) {
    while (head && head->expiry <= now()) {
        head->callback();
        head = head->next;
    }
}
```

Tick = O(K) where K = expired count. Add = O(N).

→ N=1000 timer 시 add 마다 1000 cmp. *High freq use*에 부적합.

## Min-Heap

```c
struct timer heap[N];   /* min-heap by expiry */

void add(struct timer *t) {
    heap_push(heap, t);   /* O(log N) */
}

void tick(void) {
    while (heap[0].expiry <= now()) {
        heap[0].callback();
        heap_pop(heap);
    }
}
```

`O(log N)` add. Linux hrtimer = *red-black tree* (비슷한 효율).

## Hashed Timer Wheel — Varghese·Lauck 1987

```c
#define WHEEL_SIZE 256

struct slot {
    struct timer *head;
};

struct wheel {
    struct slot slots[WHEEL_SIZE];
    uint32_t current_tick;
} g_wheel;

void add_timer(struct timer *t, uint32_t ms) {
    uint32_t expiry = g_wheel.current_tick + ms;
    uint32_t slot = expiry % WHEEL_SIZE;
    t->expiry = expiry;
    t->next = g_wheel.slots[slot].head;
    g_wheel.slots[slot].head = t;
}

void tick(void) {
    uint32_t slot = g_wheel.current_tick % WHEEL_SIZE;
    struct timer *t = g_wheel.slots[slot].head;
    g_wheel.slots[slot].head = NULL;
    
    while (t) {
        struct timer *next = t->next;
        if (t->expiry == g_wheel.current_tick) {
            t->callback();
        } else {
            /* Wrapped — re-add */
            uint32_t new_slot = t->expiry % WHEEL_SIZE;
            t->next = g_wheel.slots[new_slot].head;
            g_wheel.slots[new_slot].head = t;
        }
        t = next;
    }
    g_wheel.current_tick++;
}
```

**Add = O(1), Tick = O(K)** (K = current slot의 timer 수).

> ⚠️ Wheel 한 바퀴 (256 tick) 초과 timer는 *slot 충돌* — re-add 처리.

## Hierarchical Wheel — Linux jiffies

```text
4-level wheel:
  Level 0:   8 ms 단위 × 256 slot  → 0-2 sec
  Level 1: 256 ms 단위 × 256 slot  → 0-65 sec
  Level 2:  16 sec 단위 × 256 slot → 0-1 hour
  Level 3:  ~1 hour 단위 × 256 slot → ~10 day

Add:
  - 가까운 expiry → level 0
  - 먼 expiry → 높은 level

Tick (level 0 8ms):
  - level 0 slot 처리
  - 256 tick마다 → level 1의 slot 1개 *spread* to level 0
  - 즉 level 1→0 *cascade*
```

`O(1) add + O(1) tick + 가끔 cascade*. Linux kernel 5.0까지 jiffies로 사용. 5.0+ — *hash-only* (no cascade).

## Linux New Hashed Wheel (HRtimer 아닌 timer_list)

```text
9 level, 각 64 slot:
  level 0: 1ms × 64
  level 1: 64ms × 64
  level 2: 4s × 64
  ...

Cascade 없음 — 각 level 직접 expiry 처리
Tick O(1) + occasional level 0 process
```

Linux 4.8+ → cascade 제거. 더 단순·예측 가능.

## DPDK Timer

```c
struct rte_timer t;
rte_timer_init(&t);
rte_timer_reset(&t, 1000000 /* hz */, PERIODICAL, lcore_id, callback, arg);
```

DPDK — *skiplist 기반*. O(log N) add·tick.

## 정확도 vs 효율

```text
Timer wheel 정확도 = tick frequency
  - 1 ms tick → 1 ms 해상도
  - 10 µs tick → 10 µs 해상도, but tick 비용 ↑

Tickless idle — sleep 중 *expiry까지 hardware timer set*
  → tick freq 의미 적음
  → 다음 expiry == hardware timer
```

Modern Linux·FreeRTOS — *tickless*.

## STM32 — Hardware Timer Compare

```c
/* TIM2 — compare 4 channel */
HAL_TIM_OC_Start_IT(&htim2, TIM_CHANNEL_1);
TIM2->CCR1 = expiry_ticks;   /* trigger at expiry */

void HAL_TIM_OC_DelayElapsedCallback(...) {
    timer_at_expiry_handler();
}
```

여러 compare channel → *여러 timer 동시*. Hardware 자체 정확.

## ESP32 — esp_timer (One-shot·Periodic)

```c
esp_timer_handle_t timer;
esp_timer_create_args_t args = {
    .callback = &my_callback,
    .arg = data,
    .name = "mytimer",
};
esp_timer_create(&args, &timer);
esp_timer_start_once(timer, 1000000);   /* 1 sec */
esp_timer_start_periodic(timer, 500000);   /* 500 ms */
```

내부 — *high-resolution timer + sorted list*. 1 µs 정확도.

## FreeRTOS Software Timer Wheel?

```text
FreeRTOS의 xTimer 내부:
  - Sorted list (linked, by expiry)
  - Daemon task로 처리
  - O(N) add — 적은 timer엔 OK
```

Modern Linux의 wheel과 다름. 임베디드 timer 수 적어 *수용 가능*.

## Hierarchical Wheel — Software 구현

```c
#define LVL0_SLOTS 64
#define LVL1_SLOTS 64
#define LVL_BITS 6   /* log2(64) */

struct level {
    struct list_head slots[64];
    uint32_t current;
};

struct hwheel {
    struct level levels[4];
    uint64_t time;
};

void add(uint64_t expiry) {
    uint64_t delta = expiry - hwheel.time;
    int level;
    if (delta < 64) level = 0;
    else if (delta < 64*64) level = 1;
    else if (delta < 64*64*64) level = 2;
    else level = 3;
    
    int slot = (expiry >> (level * LVL_BITS)) & 63;
    list_add(&hwheel.levels[level].slots[slot], ...);
}

void tick(void) {
    hwheel.time++;
    int l0 = hwheel.time & 63;
    expire_all(&hwheel.levels[0].slots[l0]);
    if (l0 == 0) {
        cascade(1);   /* level 1 → 0 */
        ...
    }
}
```

각 level에서 *expiry bit pattern으로 slot 결정*. Cascade로 *expiry 임박 시 lower level로 이동*.

## TCP Timeout — Wheel 사례

```text
Linux kernel TCP — connection 수만 timer 발생
  - 각 socket: retransmit·delack·keepalive·... 4+ timer
  - 1 M connection × 4 = 4 M timer
  - Sorted list 불가능 → wheel 필수
```

Linux kernel — hashed wheel + cascade 없음 (4.8+).

## 자주 하는 실수

> ⚠️ Naive sorted list로 1000+ timer

```c
add_timer(t, expiry);   /* O(N) — 1000 timer 시 1 µs+ per add */
```

→ wheel 또는 min-heap.

> ⚠️ Wheel 1 cycle 초과 timer

```c
WHEEL_SIZE = 256
add(timer, expiry = current + 1000);   /* ← slot 996 = (current+1000) % 256 = same slot of current+232? */
```

→ hierarchical wheel 또는 *re-add on wrap*.

> ⚠️ Tick frequency 너무 높음

```c
configTICK_RATE_HZ = 10000;   /* 100 µs tick — overhead 큼 */
```

→ tickless idle 또는 *hardware compare*.

> ⚠️ Cancel 자주 — list scan

```c
cancel_timer(t);   /* O(N) — list search */
```

→ doubly-linked list (O(1) remove).

## 정리

- Naive list = O(N) add, Min-heap = O(log N), **Wheel = O(1)**.
- Hashed wheel — slot collision wrap.
- **Hierarchical wheel** = multi-level + cascade.
- Linux 4.8+ — hashed no-cascade.
- STM32 hardware timer compare = *진정한 hardware*.
- Tickless idle — 다음 expiry까지 sleep.

## 관련 항목

- [2-05: Wait-Free](/blog/embedded/modern-recipes/part2-05-wait-free)
- [RTOS 4-09: Software Timer](/blog/embedded/rtos/practical-internals/part4-09-software-timer)
