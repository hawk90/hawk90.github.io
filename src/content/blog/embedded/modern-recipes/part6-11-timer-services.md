---
title: "Timer Wheel 분석 — Hashed·Hierarchical·O(1) Tick"
slug: "embedded/modern-recipes/part6-11-timer-services"
date: 2026-04-15T09:10:00
description: "타이머 자료구조를 추가·tick 비용으로 비교합니다. 정렬 리스트·트리에서 Varghese·Lauck의 hashed·hierarchical wheel, Linux 4.8의 cascade 없는 wheel까지 어떤 조건에서 O(1)인지 정리합니다."
series: "Modern Embedded Recipes"
seriesOrder: 73
tags: [recipes, timer-wheel, hashed-wheel, hierarchical, scheduler]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> **"Timer wheel은 만료 시각을 배열 index로 바꿔 타이머 추가를 O(1)로 만들고, tick 비용은 현재 slot에 걸린 타이머 수에 맡기는 구조입니다."** Tick이 O(1)이 되는 조건은 wheel 종류마다 다르고, 이 글은 그 조건을 하나씩 따라갑니다.

## 어떤 문제를 푸는가

이 글은 MCU·RTOS에서 타이머 모듈을 직접 고르거나 짜는 독자를 기준으로 합니다. RTOS software timer API를 쓰는 법은 [6-08: RTOS Software Timer 활용](/blog/embedded/modern-recipes/part6-08-software-timer)에서 다뤘고, 여기서는 그 아래의 자료구조를 비용으로 비교합니다.

타이머 모듈은 세 연산을 제공합니다. 타이머 시작(add), 정지(cancel), 그리고 하드웨어 tick마다 만료를 확인하는 bookkeeping입니다. Varghese·Lauck의 1987년 논문([SOSP '87, pp. 25–38](https://doi.org/10.1145/41457.37504))은 이 세 연산의 비용을 기준으로 타이머 자료구조를 Scheme 1~7로 나눴고, 이 글의 비교도 그 번호를 따릅니다. 논문 서론의 예는 연결 200개에 연결마다 타이머 3개를 둔 서버이고, 기존 알고리즘은 타이머 하나를 시작하거나 유지하는 데 O(n)이 걸려 n이 크면 비싸다는 것이 논문의 문제 제기입니다. 만료 전에 취소되는 타이머가 많으면 tick 처리만이 아니라 시작·정지 비용도 중요해집니다. Linux 커널 주석도 timeout 타이머(네트워킹, disk I/O)는 대부분 만료 전에 취소된다고 적습니다([`kernel/time/timer.c` v6.6 L83-L87](https://github.com/torvalds/linux/blob/v6.6/kernel/time/timer.c#L83-L87)).

## 정렬 리스트와 트리

가장 단순한 구현은 만료 시각 순으로 정렬한 리스트입니다(논문의 Scheme 2).

```c
#include <stdint.h>

struct timer {
    uint32_t expires;
    void (*fn)(struct timer *);
    struct timer *next;
};

uint32_t now(void);              /* tick counter */
static struct timer *head;

void add_timer(struct timer *t, uint32_t delay)
{
    t->expires = now() + delay;
    struct timer **pp = &head;
    while (*pp && (int32_t)((*pp)->expires - t->expires) <= 0)
        pp = &(*pp)->next;       /* O(n) walk to the insertion point */
    t->next = *pp;
    *pp = t;
}

void tick(void)
{
    while (head && (int32_t)(head->expires - now()) <= 0) {
        struct timer *t = head;
        head = t->next;
        t->fn(t);
    }
}
```

Tick은 리스트 맨 앞만 보므로 만료가 없으면 O(1)이고, 추가는 삽입 위치를 찾느라 최악 O(n)입니다. 타이머 1,000개가 걸려 있으면 최악의 경우 추가 한 번에 비교가 1,000번입니다. 트리 기반 구조(Scheme 3)는 이 추가 비용을 O(log n)으로 줄이려는 것이고, 논문은 균형을 잡지 않은 이진 트리가 쉽게 선형 리스트로 퇴화한다고 덧붙입니다.

실제 구현이 고른 자료구조는 다음과 같습니다.

| 구현 (버전) | 자료구조 | 추가 | 만료 처리 | 출처 |
| --- | --- | --- | --- | --- |
| FreeRTOS software timer (V11.1.0) | 만료 tick 순 정렬 리스트 2개(현재·overflow), daemon task가 처리 | `vListInsert`의 선형 탐색, O(n) | 리스트 앞에서 | [`timers.c` L894-L933](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.1.0/timers.c#L894-L933), [`list.c` L192](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.1.0/list.c#L192) |
| Linux hrtimer (v6.6) | red-black tree(`timerqueue`, leftmost 캐시) | O(log n) | 캐시된 leftmost 노드부터 | [`timerqueue.h` L14-L38](https://github.com/torvalds/linux/blob/v6.6/include/linux/timerqueue.h#L14-L38), [`hrtimers.rst`](https://github.com/torvalds/linux/blob/v6.6/Documentation/timers/hrtimers.rst) |
| DPDK `rte_timer` (v23.11) | lcore마다 10 level skiplist | log(n), lcore당 4^10개(약 100만 개)까지 | level 0 리스트를 앞에서부터 아직 만료되지 않은 항목까지 | [`timer_lib.rst`](https://github.com/DPDK/dpdk/blob/v23.11/doc/guides/prog_guide/timer_lib.rst) |
| Linux `timer_list` (v4.7까지) | hierarchical wheel(tv1~tv5) | 상수 횟수 비교 | tick마다 slot 하나, 256 tick마다 cascade | 아래 [Hierarchical Wheel](#hierarchical-wheel--linux-v47의-tv1tv5) 절 |
| Linux `timer_list` (v4.8부터) | level별 64 bucket, cascade 없음 | 상수 횟수 비교 | level별 bucket 하나씩 | 아래 [Cascade 없는 Wheel](#cascade-없는-wheel--linux-v48) 절 |

## Hashed Timing Wheel — Scheme 4에서 Scheme 6으로

모든 타이머가 `MaxInterval`보다 짧다고 보장할 수 있으면, 크기 `MaxInterval`의 원형 배열에 만료 시각을 index로 넣으면 됩니다(Scheme 4). 추가는 O(1), tick은 포인터를 한 칸 옮기고 그 칸의 리스트만 보므로 만료가 없으면 O(1), 리스트가 이중 연결이면 정지도 O(1)입니다.

배열 크기보다 긴 타이머를 받으려면 만료 시각을 배열 크기로 나눈 나머지를 index로 씁니다. 각 bucket의 리스트를 정렬하면 Scheme 5, 정렬하지 않으면 Scheme 6입니다. 아래 코드는 Scheme 6의 변형입니다. 논문은 몫(상위 비트)을 저장해 bucket을 지날 때마다 줄이지만, 이 코드는 32비트 절대 만료 시각을 저장하고 현재 tick과 같은지 비교합니다.

```c
#include <stdint.h>
#include <stddef.h>

#define WHEEL_SIZE 256u

struct timer {
    uint32_t expires;
    void (*fn)(struct timer *);
    struct timer *next;
};

static struct timer *slots[WHEEL_SIZE];
static uint32_t current_tick;            /* next tick to process */

void add_timer(struct timer *t, uint32_t delay)
{
    t->expires = current_tick + delay;
    struct timer **slot = &slots[t->expires % WHEEL_SIZE];
    t->next = *slot;
    *slot = t;
}

void tick(void)
{
    uint32_t now = current_tick++;
    struct timer **slot = &slots[now % WHEEL_SIZE];
    struct timer *t = *slot;
    *slot = NULL;

    while (t) {
        struct timer *next = t->next;
        if (t->expires == now) {
            t->fn(t);
        } else {                         /* a later lap: put it back */
            t->next = *slot;
            *slot = t;
        }
        t = next;
    }
}
```

`current_tick`을 콜백보다 먼저 올리므로, 콜백 안에서 `delay = 0`으로 다시 건 타이머는 다음 tick의 slot에 들어갑니다. 이 코드는 리스트가 단일 연결이고 취소 함수가 없습니다. O(1) 취소를 붙이는 방법은 아래 hierarchical 코드의 `pprev`와 `del_timer`에서 보입니다.

추가는 리스트 머리에 붙이므로 최악에도 O(1)입니다. Tick은 현재 slot의 타이머를 모두 훑고, 살아 있는 타이머는 256 tick마다 한 번씩 검사되므로 타이머 n개면 tick당 평균 n/256번 검사합니다. 논문은 이 평균이 hash 분포와 무관하고, 분포는 몇몇 tick에 검사가 몰리는 정도(burstiness)만 정한다고 결론짓습니다. 그래서 hash 함수 선택은 중요하지 않다고 보고, 배열 크기를 2의 거듭제곱으로 잡아 나머지를 AND 한 번으로 구하라고 권합니다. 이 코드의 256도 그 경우입니다.

## Hierarchical Wheel — Linux v4.7의 tv1~tv5

두 번째 확장(Scheme 7)은 시계처럼 단위가 다른 배열 여러 개를 둡니다. 논문의 예는 일(100칸)·시(24칸)·분(60칸)·초(60칸) 배열 244칸으로 100일까지의 타이머를 표현합니다. 먼 타이머는 높은 단위 배열에 들어갔다가, 그 칸에 도달하면 나머지 시간만큼 낮은 배열로 옮겨집니다. 이 이동을 Linux는 cascade라고 부릅니다.

Linux v4.7의 `timer_list`가 이 구조입니다(`CONFIG_BASE_SMALL`이 아닐 때, [`timer.c` v4.7 L64-L94](https://github.com/torvalds/linux/blob/v4.7/kernel/time/timer.c#L64-L94)). 첫 배열 tv1은 `TVR_BITS = 8`로 256칸, 나머지 tv2~tv5는 `TVN_BITS = 6`으로 64칸입니다. 단위와 범위는 이 비트 수에서 나오며, 아래 ms 값은 HZ = 1000(1 jiffy = 1 ms)일 때의 환산입니다.

| 배열 | 칸 수 | 한 칸의 단위 | 들어가는 남은 시간 (jiffy, 32비트 counter) | HZ = 1000 환산 |
| --- | ---: | --- | --- | --- |
| tv1 | 256 | 1 jiffy | 0 ~ 2^8 − 1 | 256 ms 미만 |
| tv2 | 64 | 2^8 jiffy | 2^8 ~ 2^14 − 1 | 16.384 s 미만 |
| tv3 | 64 | 2^14 jiffy | 2^14 ~ 2^20 − 1 | 약 17.5분 미만 |
| tv4 | 64 | 2^20 jiffy | 2^20 ~ 2^26 − 1 | 약 18.6시간 미만 |
| tv5 | 64 | 2^26 jiffy | 2^26 ~ 2^31 − 1 | 약 24.9일 미만 |

tv5의 상한이 2^32 − 1이 아닌 것은 과거 판정 때문입니다. 남은 시간 `idx`가 2^31 이상이면 부호 있는 비교에서 음수가 되어 이미 지난 타이머로 처리되고, 다음 tick에 바로 실행됩니다. 아래 코드도, 32비트 `unsigned long`에서 돌아가는 v4.7도 같습니다. v4.7의 `MAX_TVAL`(2^32 − 1) clamp는 소스 주석대로 64비트에서 걸리는 상한입니다([`__internal_add_timer`, v4.7 L373-L413](https://github.com/torvalds/linux/blob/v4.7/kernel/time/timer.c#L373-L413)). 이 코드로 24.9일보다 긴 지연을 걸려면 호출하는 쪽에서 나눠 걸어야 합니다.

추가는 `idx = expires - timer_jiffies`로 배열을 고르고 그 배열의 비트 구간으로 칸을 고릅니다. 비교는 가장 긴 tv5 경로에서도 6번(범위 검사 4번, 과거 판정, `MAX_TVAL` 검사)이라 타이머 수와 무관합니다. Tick([`__run_timers`, v4.7 L1190-L1245](https://github.com/torvalds/linux/blob/v4.7/kernel/time/timer.c#L1190-L1245))은 tv1 index가 0이 될 때, 즉 256 jiffy마다 tv2의 현재 칸을 통째로 꺼내 다시 넣습니다([`cascade`, L1117-L1136](https://github.com/torvalds/linux/blob/v4.7/kernel/time/timer.c#L1117-L1136)). tv2의 index도 0이었으면 tv3, 그다음 tv4, tv5 순으로 같은 일을 합니다. Cascade를 tv1의 현재 칸보다 먼저 처리해야, 방금 내려온 타이머 중 이번 tick에 만료되는 것을 놓치지 않습니다.

같은 구조를 32비트 tick counter로 옮기면 다음과 같습니다. 배열 크기와 index 계산, cascade 순서는 v4.7을 따랐고, 취소를 O(1)로 하려고 v4.7의 `hlist_node`처럼 `next`와 `pprev`를 둡니다([`types.h` v4.7 L192-L194](https://github.com/torvalds/linux/blob/v4.7/include/linux/types.h#L192-L194)). `pprev`는 자기를 가리키는 포인터(slot 또는 앞 노드의 `next`)의 주소라, 앞 노드를 찾지 않고 리스트에서 빠집니다.

```c
#include <stdint.h>
#include <stddef.h>

#define TVR_BITS 8
#define TVN_BITS 6
#define TVR_SIZE (1u << TVR_BITS)   /* 256 */
#define TVN_SIZE (1u << TVN_BITS)   /* 64 */
#define TVR_MASK (TVR_SIZE - 1)
#define TVN_MASK (TVN_SIZE - 1)

struct timer {
    uint32_t expires;
    void (*fn)(struct timer *);
    struct timer *next;
    struct timer **pprev;                /* NULL = not pending */
};

static struct timer *tv1[TVR_SIZE];
static struct timer *tvn[4][TVN_SIZE];   /* tv2..tv5 */
static uint32_t timer_ticks;             /* next tick to process */

static void link_head(struct timer **head, struct timer *t)
{
    t->next = *head;
    if (t->next)
        t->next->pprev = &t->next;
    *head = t;
    t->pprev = head;
}

static void unlink_timer(struct timer *t)
{
    *t->pprev = t->next;
    if (t->next)
        t->next->pprev = t->pprev;
    t->pprev = NULL;
}

static void enqueue(struct timer *t)
{
    uint32_t idx = t->expires - timer_ticks;

    if ((int32_t)idx < 0) {                       /* already in the past */
        link_head(&tv1[timer_ticks & TVR_MASK], t);
    } else if (idx < TVR_SIZE) {
        link_head(&tv1[t->expires & TVR_MASK], t);
    } else {
        int lvl = 0;                              /* 0 = tv2 */
        while (lvl < 3 && idx >= 1u << (TVR_BITS + (lvl + 1) * TVN_BITS))
            lvl++;
        link_head(&tvn[lvl][(t->expires >> (TVR_BITS + lvl * TVN_BITS)) & TVN_MASK], t);
    }
}

void add_timer(struct timer *t, uint32_t delay)
{
    t->expires = timer_ticks + delay;
    enqueue(t);
}

int del_timer(struct timer *t)
{
    if (!t->pprev)
        return 0;
    unlink_timer(t);
    return 1;
}
```

Tick 쪽은 slot의 리스트를 지역 변수 `work`로 옮긴 뒤 하나씩 떼어 처리합니다. v4.7 `__run_timers`도 칸을 `work_list`로 옮기고 타이머를 떼어 낸 뒤 콜백을 부릅니다. 그래서 콜백이 같은 칸의 다른 타이머를 취소하거나 자기를 다시 걸어도 처리 중인 리스트가 깨지지 않습니다.

```c
static struct timer *take_list(struct timer **slot, struct timer **work)
{
    *work = *slot;
    *slot = NULL;
    if (*work)
        (*work)->pprev = work;
    return *work;
}

static void cascade(int lvl, uint32_t index)
{
    struct timer *work;

    take_list(&tvn[lvl][index], &work);
    while (work) {
        struct timer *t = work;
        unlink_timer(t);
        enqueue(t);
    }
}

void run_one_tick(void)
{
    uint32_t index = timer_ticks & TVR_MASK;
    struct timer *work;

    if (index == 0) {                             /* tv1 wrapped */
        for (int lvl = 0; lvl < 4; lvl++) {
            uint32_t i = (timer_ticks >> (TVR_BITS + lvl * TVN_BITS)) & TVN_MASK;
            cascade(lvl, i);
            if (i != 0)
                break;
        }
    }
    timer_ticks++;

    take_list(&tv1[index], &work);
    while (work) {
        struct timer *t = work;
        unlink_timer(t);                          /* fn may re-add or cancel */
        t->fn(t);
    }
}
```

이 코드에는 동시성 보호가 없습니다. 논문도 VAX 구현의 명령 수에서 인터럽트 우선순위를 내리고 올리는 동기화 비용을 뺐는데, 어느 타이머 알고리즘에나 필요하고 비용이 기계마다 다르다는 이유입니다(p. 32). v4.7 `__run_timers`는 slot을 옮기고 타이머를 떼어 내는 동안 인터럽트를 끈 채 `base->lock`을 잡고, 콜백을 부를 때만 풀었다가 다시 잡습니다([v4.7 L1190-L1245](https://github.com/torvalds/linux/blob/v4.7/kernel/time/timer.c#L1190-L1245)). `run_one_tick`을 SysTick ISR에서 부르면 콜백도 ISR 안에서 돌므로 콜백이 길수록 그 ISR이 길어지고, task에서 부르는 `add_timer`·`del_timer`는 SysTick을 막은 구간 안에서 불러야 리스트가 깨지지 않습니다(이 글의 유도).

### 경계값 검사

표의 범위가 코드와 맞는지는 배열 경계마다 타이머를 걸어 보면 확인됩니다. 아래 코드를 위 두 블록과 같은 파일 끝에 붙여 호스트에서 `cc -std=c11 -O2`로 컴파일합니다(`timer_ticks`가 `static`이라 같은 파일이어야 합니다). `0x7fffffff` 경우는 2^31 tick을 돌리므로 시간이 걸립니다.

```c
#include <stdio.h>

static int fired;
static uint32_t fired_tick;

static void record(struct timer *t)
{
    (void)t;
    fired = 1;
    fired_tick = timer_ticks - 1;          /* the tick being processed */
}

static uint32_t fire_after(uint32_t delay)
{
    struct timer t = { .fn = record };
    uint32_t start = timer_ticks;

    fired = 0;
    add_timer(&t, delay);
    while (!fired && timer_ticks - start <= delay)
        run_one_tick();
    del_timer(&t);                         /* unlink if it never fired */
    return fired ? fired_tick - start : UINT32_MAX;   /* UINT32_MAX = lost */
}

#define CHECK(c) do { if (!(c)) { printf("FAIL line %d\n", __LINE__); return 1; } } while (0)

int main(void)
{
    static const uint32_t exact[] = {
        0, 255, 256, (1u << 14) - 1, 1u << 14,
        (1u << 20) - 1, 1u << 20, (1u << 26) - 1, 1u << 26, 0x7fffffffu,
    };
    for (unsigned i = 0; i < sizeof exact / sizeof exact[0]; i++)
        CHECK(fire_after(exact[i]) == exact[i]);
    while (timer_ticks & TVR_MASK)         /* start on a tv1 wrap */
        run_one_tick();
    CHECK(fire_after(512) == 512);         /* cascade before tv1 */
    CHECK(fire_after(0x80000000u) == 0);   /* treated as already past */
    CHECK(fire_after(0xffffffffu) == 0);

    struct timer a = { .fn = record };
    add_timer(&a, 1000);
    CHECK(del_timer(&a) == 1);
    CHECK(del_timer(&a) == 0);
    fired = 0;
    for (int i = 0; i <= 1000; i++)
        run_one_tick();
    CHECK(!fired);

    printf("all checks passed\n");
    return 0;
}
```

통과하면 `all checks passed`를 출력합니다. `FAIL`이 `exact` 반복문 줄에서 나오면 배열이나 칸 선택이 틀려 만료 tick이 어긋나거나 타이머가 사라진 것입니다. `fire_after(512)` 줄에서 나오면 cascade를 tv1 처리보다 늦게 한 것입니다. `exact`의 만료 tick은 모두 256의 배수가 아니라서 이 순서를 가르지 못하므로, 256 경계에서 시작한 512 tick 타이머로 따로 봅니다. `0x80000000u` 줄에서 나오면 과거 판정이 빠져 2^31 이상이 tv5에 들어간 것입니다.

### Hashed wheel과의 비용 비교

tv1의 한 칸에 든 타이머는 모두 그 tick에 만료되므로, hashed wheel과 달리 비교 없이 실행합니다. 대신 cascade하는 tick에는 그 칸에 모인 타이머 수만큼 다시 넣습니다. 논문은 수명 T인 타이머 하나가 사는 동안의 작업을 Scheme 6은 c(6) × T / M(M은 배열 원소 수), Scheme 7은 최대 c(7) × m(m은 level 수)으로 둡니다.

이 글의 두 코드에 1 tick = 1 ms, 10초 timeout(10,000 tick)을 넣으면(이 글의 유도) 차이가 구체적으로 보입니다. Hashed wheel(M = 256)에서는 10,000 = 39 × 256 + 16이라 만료 전에 slot을 39번 지나며 비교합니다. Hierarchical 코드에서는 tv2에 들어갔다가 만료 전 256 tick 안에서 한 번 tv1로 옮겨집니다. 만료 전에 취소되는 timeout이라면 hierarchical 쪽은 만료 256 tick 전보다 먼저 취소될 때 옮기는 비용이 0이고, hashed 쪽은 취소 전까지 지난 바퀴 수만큼 이미 비교했습니다.

메모리는 반대입니다. 포인터가 4바이트인 32비트 Arm MCU([AAPCS32 2025Q4, Data Types](https://github.com/ARM-software/abi-aa/blob/2025Q4/aapcs32/aapcs32.rst))에서 이 글의 코드 기준으로 slot 배열은 정렬 리스트가 head 포인터 하나(4 B), hashed wheel이 256 × 4 = 1,024 B, hierarchical이 (256 + 4 × 64) × 4 = 2,048 B입니다. 타이머 노드는 앞 두 코드가 12 B, `pprev`를 더한 hierarchical이 16 B입니다.

## Cascade 없는 Wheel — Linux v4.8

논문에는 Wick Nichols의 제안이 덧붙어 있습니다. 높은 level로 갈수록 정밀도가 떨어져도 된다면 level 사이 이동을 아예 하지 않아도 됩니다. 시 단위 배열에 넣은 타이머는 시 단위로 반올림해 그 칸에서 바로 만료시키는 것이고, 대가는 최대 50%의 정밀도 손실(1분 30초 타이머가 1분으로 반올림되는 예)입니다.

Linux는 v4.8에서 이 방향으로 `timer_list`를 다시 썼습니다. v4.7 `timer.c`에는 위의 `cascade()`가 있고, v4.8 `timer.c`는 "We don't have cascading anymore"라고 적습니다([v4.8 L90](https://github.com/torvalds/linux/blob/v4.8/kernel/time/timer.c#L90)). v6.6 기준 구조는 다음과 같습니다([`timer.c` v6.6 L65-L177](https://github.com/torvalds/linux/blob/v6.6/kernel/time/timer.c#L65-L177)).

- level마다 bucket 64개(`LVL_BITS = 6`), level 수는 HZ > 100이면 9, 아니면 8(`LVL_DEPTH`)입니다.
- level n의 단위는 8^n jiffy입니다(`LVL_CLK_SHIFT = 3`). 이웃한 level의 단위는 64배가 아니라 8배입니다.
- 마지막 level의 범위를 넘는 타이머는 그 최대값에서 강제로 만료됩니다.

소스 주석의 HZ = 1000 표 중 앞 네 level은 다음과 같습니다(전체 9 level은 위 링크의 L104-L114).

| Level | 단위 | 범위 |
| ---: | --- | --- |
| 0 | 1 ms | 0 ~ 63 ms |
| 1 | 8 ms | 64 ~ 511 ms |
| 2 | 64 ms | 512 ~ 4,095 ms |
| 3 | 512 ms | 4,096 ~ 32,767 ms |

Cascade가 없으므로 tick에는 level마다 현재 bucket 하나만 꺼냅니다. 다음 level은 현재 clock의 하위 3비트가 0일 때만 봅니다([`collect_expired_timers`, v6.6 L1759-L1782](https://github.com/torvalds/linux/blob/v6.6/kernel/time/timer.c#L1759-L1782)). 대가는 만료 시각의 정밀도입니다. `calc_index()`는 일찍 만료되지 않도록 만료 시각을 그 level의 단위로 올림합니다([v6.6 L516-L531](https://github.com/torvalds/linux/blob/v6.6/kernel/time/timer.c#L516-L531)). 이 식 `((expires >> LVL_SHIFT(lvl)) + 1) << LVL_SHIFT(lvl)`에 넣어 보면(이 글의 유도), HZ = 1000에서 100 ms timeout은 level 1에 들어가 요청보다 1~8 ms 늦게 만료됩니다. 소스 주석은 timeout이 만료됐다면 이미 정상 동작이 아니므로 조금 늦어도 크게 상관없다고 보고, 짧은 네트워킹 타이머는 HZ 단위인 level 0에 들어간다고 적습니다.

## 다음 만료 시각 — Tickless Idle과 맞물리기

Tickless idle로 다음 만료까지 tick을 멈추려면, 타이머 모듈이 가장 이른 만료 시각을 바로 답해야 합니다. 정렬 리스트는 맨 앞 원소가 답입니다. FreeRTOS V11.1.0 timer daemon은 현재 리스트 맨 앞의 만료 값을 읽고([`prvGetNextExpireTime`, `timers.c` L844-L868](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.1.0/timers.c#L844-L868)) 그 시각까지 command queue에서 block합니다([L820](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.1.0/timers.c#L820)). `configUSE_TICKLESS_IDLE`을 켜면 커널은 block된 task 중 가장 빨리 깨어날 시각에서 잠들 수 있는 tick 수를 구합니다([`prvGetExpectedIdleTime`, `tasks.c` L3894-L3951](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.1.0/tasks.c#L3894-L3951)).

Wheel에는 그런 원소가 없습니다. 이 글의 hierarchical 코드로 답하려면 tv1부터 비어 있지 않은 slot을 찾아야 하고, 상위 배열의 칸은 한 칸이 여러 tick을 덮으므로 그 칸 리스트의 `expires`까지 훑어야 합니다. Linux v6.6은 bucket마다 비트 하나인 `pending_map`을 두고, 더 이른 bucket에 타이머가 들어오면 캐시한 `next_expiry`를 바로 고칩니다([`enqueue_timer`, L596-L625](https://github.com/torvalds/linux/blob/v6.6/kernel/time/timer.c#L596-L625)). bucket의 마지막 타이머가 빠질 때만 다시 계산하라고 표시하고([L885-L896](https://github.com/torvalds/linux/blob/v6.6/kernel/time/timer.c#L885-L896)), 그 계산은 level마다 `find_next_bit`로 비트맵을 찾습니다([`__next_timer_interrupt`, L1789-L1877](https://github.com/torvalds/linux/blob/v6.6/kernel/time/timer.c#L1789-L1877)). Cascade 없는 wheel은 bucket의 만료 시각(`bucket_expiry`)이 곧 답이라 bucket 안을 훑지 않습니다. 이 글의 코드에 비트맵을 더하면 slot 512개에 512비트(64 B)가 들고, 상위 배열은 칸 안을 훑는 대신 그 칸이 cascade되는 tick을 깨어날 시각으로 쓸 수 있습니다(이 글의 유도). 칸 안의 타이머는 모두 그 tick 이후에 만료되므로 일찍 깰 수는 있어도 늦게 깨지는 않습니다.

## 자주 하는 실수

> ⚠️ Hashed wheel 한 바퀴보다 긴 타이머를 "한 바퀴 안"이라고 가정합니다

```c
add_timer(t, 1000);   /* WHEEL_SIZE = 256 */
```

1000 = 3 × 256 + 232이므로 이 타이머는 `(current_tick + 232) % 256` slot에 들어갑니다. 만료 시각을 비교하는 Scheme 6 코드라면 이 slot을 +232, +488, +744 tick에 지나치고 +1000 tick에 실행합니다. Scheme 4처럼 slot에 든 것을 비교 없이 실행하는 코드라면 232 tick에 일찍 실행됩니다. Scheme 4 구현을 쓰면 `delay < WHEEL_SIZE`를 add에서 막거나 hierarchical wheel로 바꿉니다.

## 정리

- **타이머 수가 적고 RAM이 빠듯한 MCU**라면 정렬 리스트가 맞습니다. 추가 비용은 타이머 수만큼의 비교이지만 wheel의 slot 배열(이 글의 코드 기준 1~2 KiB)이 없고, 맨 앞 원소가 곧 다음 만료 시각이라 tickless idle과 바로 맞물립니다.
- **만료 tick이 정확해야 하고, timeout이 대부분 만료 전에 취소**된다면 hierarchical wheel이 맞습니다. tv2에 든 타이머(지연 2^14 tick 미만)는 tv1로 내려오기 전에 취소되면 추가와 취소 비용만 내고, tv3~tv5에 든 타이머는 취소 전에 이미 cascade로 옮겨졌을 수 있습니다.
- **수명이 slot 수에 비해 짧은 타이머가 대부분**이라면 hashed wheel이 메모리를 덜 쓰고, 만료까지 slot을 지나치는 횟수(T/M)도 적습니다.
- **만료가 조금 늦어도 되는 timeout 위주**라면 Linux v4.8처럼 cascade를 없애고 level 단위로 올림합니다. Linux는 정밀한 만료가 필요한 타이머를 이 wheel과 분리해 red-black tree 기반 hrtimer로 둡니다([`hrtimers.rst` v6.6](https://github.com/torvalds/linux/blob/v6.6/Documentation/timers/hrtimers.rst)).

다음 편은 [6-12: RTOS 디버깅 기법 — Tracealyzer·SystemView·Stack 추적](/blog/embedded/modern-recipes/part6-12-rtos-debugging)입니다.

## 관련 항목

- [6-08: RTOS Software Timer 활용](/blog/embedded/modern-recipes/part6-08-software-timer)
- [6-12: RTOS 디버깅 기법](/blog/embedded/modern-recipes/part6-12-rtos-debugging)
- [RTOS 4-09: Software Timer 분석 — Daemon Task·자료구조·ISR-Safe API](/blog/embedded/rtos/practical-internals/part4-09-software-timer)

수정 이력: 2026-10-11 — 글을 다시 썼습니다. Hierarchical 표(4 level × 256 slot, 8 ms 단위)를 Linux v4.7 소스의 tv1~tv5(256칸·64칸)로, v4.8 이후 wheel의 level 단위(1 ms·64 ms·4 s)를 v6.6 소스의 8배 간격(1·8·64·512 ms)으로 바꿨습니다. DPDK의 "add와 tick 모두 O(log N)"은 문서대로 추가 log(n), 만료 처리는 level 0 리스트 순회로 고쳤습니다. 출처를 확인하지 못한 STM32·ESP32·TCP 절은 뺐고, O(1) 취소 코드와 경계값 검사를 더했습니다.
