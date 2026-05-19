---
title: "6-11: Timer Wheel — Hashed·Hierarchical·O(1) Tick"
date: 2026-05-15T01:00:00
description: "Timer wheel 자료구조. Hashed wheel·hierarchical wheel·O(1) tick·Linux jiffies."
series: "Modern Embedded Recipes"
seriesOrder: 73
tags: [recipes, timer-wheel, hashed-wheel, hierarchical, scheduler]
draft: false
---

## 한 줄 요약

> **"Timer Wheel은 O(1) tick, O(1) add·cancel"**입니다. 수천 timer에도 *상수 시간*을 유지합니다.

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

Tick은 O(K)이고 여기서 K는 expired count입니다. Add는 O(N)입니다.

→ N=1000 timer 시 add마다 1000번의 cmp가 발생합니다. 그래서 *high freq use*에 부적합합니다.

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

add 비용은 `O(log N)`입니다. Linux hrtimer는 *red-black tree*를 쓰며 비슷한 효율을 보입니다.

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

**Add는 O(1), Tick은 O(K)**입니다(K는 current slot의 timer 수).

> ⚠️ Wheel 한 바퀴(256 tick)를 초과하는 timer는 *slot 충돌*이 발생하므로 re-add로 처리합니다.

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

O(1) add + O(1) tick에 가끔 cascade가 들어갑니다. Linux kernel 5.0까지 jiffies로 사용했고, 5.0+에서는 *hash-only*로 바뀌었습니다(no cascade).

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

Linux 4.8+에서는 cascade를 제거했습니다. 그래서 더 단순하고 예측 가능합니다.

## DPDK Timer

```c
struct rte_timer t;
rte_timer_init(&t);
rte_timer_reset(&t, 1000000 /* hz */, PERIODICAL, lcore_id, callback, arg);
```

DPDK는 *skiplist 기반*입니다. add와 tick 모두 O(log N)입니다.

## 정확도 vs 효율

```text
Timer wheel 정확도 = tick frequency
  - 1 ms tick → 1 ms 해상도
  - 10 µs tick → 10 µs 해상도, but tick 비용 ↑

Tickless idle — sleep 중 *expiry까지 hardware timer set*
  → tick freq 의미 적음
  → 다음 expiry == hardware timer
```

Modern Linux와 FreeRTOS는 *tickless*입니다.

## STM32 — Hardware Timer Compare

```c
/* TIM2 — compare 4 channel */
HAL_TIM_OC_Start_IT(&htim2, TIM_CHANNEL_1);
TIM2->CCR1 = expiry_ticks;   /* trigger at expiry */

void HAL_TIM_OC_DelayElapsedCallback(...) {
    timer_at_expiry_handler();
}
```

여러 compare channel로 *여러 timer를 동시에* 운용할 수 있습니다. Hardware 자체가 정확합니다.

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

내부는 *high-resolution timer + sorted list*로 구성되어 있습니다. 1 µs 정확도를 보장합니다.

## FreeRTOS Software Timer Wheel?

**FreeRTOS의 xTimer 내부:**

- Sorted list (linked, by expiry)
- Daemon task로 처리
- O(N) add — 적은 timer엔 OK

Modern Linux의 wheel과는 다릅니다. 임베디드에서는 timer 수가 적어 *수용 가능*합니다.

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

각 level에서 *expiry bit pattern으로 slot을 결정*합니다. Cascade를 통해 *expiry가 임박하면 lower level로 이동*합니다.

## TCP Timeout — Wheel 사례

```text
Linux kernel TCP — connection 수만 timer 발생
  - 각 socket: retransmit·delack·keepalive·... 4+ timer
  - 1 M connection × 4 = 4 M timer
  - Sorted list 불가능 → wheel 필수
```

Linux kernel은 hashed wheel을 쓰고 cascade는 없습니다(4.8+).

## 자주 하는 실수

> ⚠️ Naive sorted list로 1000+ timer를 처리합니다

```c
add_timer(t, expiry);   /* O(N) — 1000 timer 시 1 µs+ per add */
```

→ wheel 또는 min-heap을 씁니다.

> ⚠️ Wheel 1 cycle을 초과하는 timer를 처리합니다

```c
WHEEL_SIZE = 256
add(timer, expiry = current + 1000);   /* ← slot 996 = (current+1000) % 256 = same slot of current+232? */
```

→ hierarchical wheel 또는 *re-add on wrap*을 적용합니다.

> ⚠️ Tick frequency가 너무 높습니다

```c
configTICK_RATE_HZ = 10000;   /* 100 µs tick — overhead 큼 */
```

→ tickless idle 또는 *hardware compare*를 활용합니다.

> ⚠️ Cancel을 자주 하면 list scan이 발생합니다

```c
cancel_timer(t);   /* O(N) — list search */
```

→ doubly-linked list로 O(1) remove를 보장합니다.

## 정리

- Naive list는 O(N) add, Min-heap은 O(log N), **Wheel은 O(1)**입니다.
- Hashed wheel은 slot collision에서 wrap이 발생합니다.
- **Hierarchical wheel**은 multi-level + cascade 구조입니다.
- Linux 4.8+는 hashed no-cascade 방식입니다.
- STM32 hardware timer compare는 *진정한 hardware* 동작입니다.
- Tickless idle은 다음 expiry까지 sleep합니다.

## 관련 항목

- [2-05: Wait-Free](/blog/embedded/modern-recipes/part2-05-wait-free)
- [RTOS 4-09: Software Timer](/blog/embedded/rtos/practical-internals/part4-09-software-timer)
