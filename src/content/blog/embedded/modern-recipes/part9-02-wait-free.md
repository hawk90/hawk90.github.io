---
title: "Wait-Free Signaling — Atomic Flag·Sequence·Latest-Value"
slug: "embedded/modern-recipes/part9-02-wait-free"
date: 2026-04-18T09:01:00
description: "Wait-free 보장 patterns. Atomic flag, sequence number, latest-value (double buffer)."
series: "Modern Embedded Recipes"
seriesOrder: 102
tags: [recipes, wait-free, signaling, sequence, double-buffer]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> **"Wait-free는 *각* 스레드가 남의 속도와 상관없이 유한한 단계 안에 끝난다는 보장"**입니다. Lock-free보다 강하고, 그래서 최악 실행 단계를 따질 때 의미가 있습니다. 이 글은 flag, seqlock, double/triple buffer, ISR 카운터를 실제로 돌려 어느 쪽이 그 보장을 지키고 어느 쪽이 못 지키는지 숫자로 봅니다.

## Progress Property 복습

세 용어의 정의는 논문에서 그대로 가져옵니다.

| 성질 | 정의 | 출처 |
| --- | --- | --- |
| Wait-free | "any process can complete any operation in a finite number of steps, regardless of the execution speeds on the other processes" | Herlihy, *Wait-Free Synchronization*, ACM TOPLAS 1991, 1절 |
| Lock-free | "ensures only that some thread always makes progress" | Herlihy·Luchangco·Moir, *Obstruction-Free Synchronization: Double-Ended Queues as an Example*, 1절 |
| Obstruction-free | "guarantees progress for any thread that eventually executes in isolation" | 같은 논문 1절 |

식당으로 비유하면 wait-free는 손님마다 "다른 손님이 아무리 몰려도 내 주문은 정해진 수의 조리 단계를 거치면 나온다"는 약속이고, lock-free는 "주방 전체로는 계속 음식이 나간다"는 약속입니다. 후자에서는 한 손님의 주문이 계속 밀릴 수 있습니다. Obstruction-free는 "다른 손님이 없으면 나온다"는 더 약한 약속입니다. Hard real-time에서 필요한 것은 앞의 것입니다. 한 task의 최악 단계 수를 다른 task의 행동과 무관하게 셀 수 있어야 하기 때문입니다. 단계 수의 보장이지 시간의 보장은 아니어서, 선점·인터럽트로 미뤄지는 시간은 따로 셉니다.

아래 실행은 모두 Apple M2 Pro(macOS 27.2.1)에서 Apple clang 21.0.0으로 했고, 각 블록의 첫 줄이 빌드 명령입니다.

## Atomic Flag Signaling

가장 단순한 wait-free 신호는 슬롯 하나짜리 우편함입니다. 깃발이 올라가 있으면 우편물은 받는 쪽 것이고, 내려가 있으면 보내는 쪽 것입니다. 어느 함수도 루프를 돌지 않으므로 호출 한 번의 단계 수가 고정됩니다. 실패하면 그냥 `false`를 돌려주고, 다시 시도할지는 호출자가 정합니다.

```c
// flag.c
/* one-slot mailbox: the flag says who owns `data` right now */
#include <pthread.h>
#include <stdatomic.h>
#include <stdbool.h>
#include <stdint.h>
#include <stdio.h>

typedef struct { uint32_t a, b, c, d; } sample_t;
static sample_t data;                  /* plain, non-atomic payload */
static atomic_bool ready;              /* true: consumer owns data, false: producer owns it */

static bool try_publish(const sample_t *s)       /* producer side, no loop */
{
    if (atomic_load_explicit(&ready, memory_order_acquire))
        return false;                            /* consumer has not taken the last one */
    data = *s;
    atomic_store_explicit(&ready, true, memory_order_release);
    return true;
}

static bool try_take(sample_t *out)              /* consumer side, no loop */
{
    if (!atomic_load_explicit(&ready, memory_order_acquire))
        return false;
    *out = data;
    atomic_store_explicit(&ready, false, memory_order_release);
    return true;
}

#define N 1000000u
static void *producer(void *arg)
{
    (void)arg;
    for (uint32_t i = 1; i <= N; ) {
        sample_t s = { i, i, i, i };
        if (try_publish(&s)) i++;
    }
    return NULL;
}

int main(void)
{
    pthread_t p;
    uint32_t expect = 1, bad = 0;
    pthread_create(&p, NULL, producer, NULL);
    while (expect <= N) {
        sample_t s;
        if (!try_take(&s)) continue;
        if (s.a != expect || s.b != expect || s.c != expect || s.d != expect) bad++;
        expect++;
    }
    pthread_join(p, NULL);
    printf("%u samples, %u bad\n", N, bad);
    return bad != 0;
}
```

```text
$ clang -std=c11 -O2 -g -Wall -Wextra -fsanitize=thread flag.c -o flag_tsan && ./flag_tsan
1000000 samples, 0 bad
exit=0
```

`data`는 일반 변수지만 TSan은 경고를 내지 않았습니다. Release store(`ready = true`)와 그 값을 읽는 acquire load가 synchronizes-with 관계를 만들어(N1570 5.1.2.4p11), payload 쓰기와 읽기가 happens-before로 정렬되기 때문입니다. 깃발을 다시 내리는 쪽도 release이므로 producer가 다음 값을 쓰기 전에 consumer의 읽기가 끝났음이 보장됩니다. 이 대칭이 빠지면(`ready = false`를 relaxed로 쓰면) 덮어쓰기가 읽기와 겹칩니다.

## Sequence Number — Multi-Reader

여러 reader가 큰 구조체를 자주 읽고 writer가 하나일 때 쓰는 것이 seqlock입니다. Writer는 쓰기 전에 sequence를 홀수로, 쓴 뒤에 짝수로 올리고, reader는 읽기 전후 sequence가 같고 짝수일 때만 결과를 씁니다.

C11에서 이것을 올바르게 쓰는 방법은 Boehm의 *Can Seqlocks Get Along With Programming Language Memory Models?*(HP Labs HPL-2012-68, MSPC 2012)가 정리했습니다. 핵심은 두 가지입니다. 첫째, 보호되는 데이터도 atomic이어야 합니다. 일반 변수로 두면 writer와 reader의 접근이 겹칠 때 data race이고, C11에서 data race는 undefined behavior입니다(N1570 5.1.2.4p25, 논문 Figure 1의 "INCORRECT! Data Race!"). 둘째, 데이터를 relaxed로 읽는다면 두 번째 sequence를 읽기 전에 acquire fence가 있어야 합니다(논문 Figure 6). 아래 코드의 writer는 논문 Figure 3처럼 seq_cst store를 쓰고, reader는 Figure 6을 따릅니다.

```c
// seqlock.c
/* single-writer seqlock: writer as in Boehm 2012 Fig. 3, reader as in Fig. 6 */
#include <pthread.h>
#include <stdatomic.h>
#include <stdbool.h>
#include <stdint.h>
#include <stdio.h>

#define FIELDS 4
static _Atomic uint32_t seq;
static _Atomic uint32_t data[FIELDS];        /* all fields hold the same value */
static atomic_bool stop;

static void write_sample(uint32_t v)
{
    uint32_t s = atomic_load_explicit(&seq, memory_order_relaxed);
    atomic_store(&seq, s + 1);                /* odd: write in progress */
    for (int i = 0; i < FIELDS; i++)
        atomic_store(&data[i], v);
    atomic_store(&seq, s + 2);                /* even: stable */
}

static unsigned read_sample(uint32_t out[FIELDS])   /* returns retries */
{
    unsigned retries = 0;
    uint32_t s0, s1;
    for (;;) {
        s0 = atomic_load_explicit(&seq, memory_order_acquire);
        for (int i = 0; i < FIELDS; i++)
            out[i] = atomic_load_explicit(&data[i], memory_order_relaxed);
        atomic_thread_fence(memory_order_acquire);
        s1 = atomic_load_explicit(&seq, memory_order_relaxed);
        if (s0 == s1 && !(s0 & 1u))
            return retries;
        retries++;
    }
}

static void *writer(void *a)
{
    (void)a;
    for (uint32_t v = 1; !atomic_load_explicit(&stop, memory_order_relaxed); v++)
        write_sample(v);
    return NULL;
}

int main(void)
{
    pthread_t w;
    unsigned long torn = 0, total_retries = 0, max_retries = 0;
    const unsigned long reads = 2000000;
    pthread_create(&w, NULL, writer, NULL);
    for (unsigned long n = 0; n < reads; n++) {
        uint32_t d[FIELDS];
        unsigned r = read_sample(d);
        total_retries += r;
        if (r > max_retries) max_retries = r;
        for (int i = 1; i < FIELDS; i++)
            if (d[i] != d[0]) { torn++; break; }
    }
    atomic_store(&stop, true);
    pthread_join(w, NULL);
    printf("reads %lu, torn %lu, retries total %lu, max retries in one read %lu\n",
           reads, torn, total_retries, max_retries);
    return torn != 0;
}
```

```text
$ clang -std=c11 -O2 -g -Wall -Wextra -fsanitize=thread seqlock.c -o seqlock_tsan && ./seqlock_tsan
reads 2000000, torn 0, retries total 5847445, max retries in one read 744
exit=0
$ clang -std=c11 -O2 seqlock.c -o seqlock && ./seqlock   # 3 runs
reads 2000000, torn 0, retries total 19677431, max retries in one read 442439
reads 2000000, torn 0, retries total 16764683, max retries in one read 772370
reads 2000000, torn 0, retries total 19575964, max retries in one read 527813
```

200만 번 읽는 동안 찢어진 값은 한 번도 나오지 않았습니다. 그러나 한 번의 읽기가 다시 시도한 횟수의 최댓값은 실행마다 744~772,370번이었습니다. Writer가 쉬지 않고 쓰면 reader는 계속 홀수를 보거나 앞뒤 sequence가 달라 다시 읽습니다. 그래서 seqlock reader는 wait-free가 아닙니다. Writer가 언젠가 멈춘다면 끝나지만, 몇 번 만에 끝나는지는 writer가 정합니다. Reader의 최악 시간이 필요하면 재시도 상한을 두고, 상한에 걸리면 "이번 주기는 이전 값 사용"처럼 실패 경로를 정해야 합니다.

## Latest-Value — Double Buffer

"가장 최근 값만 필요하다"는 센서·GPS 경로에서 자주 나오는 것이 버퍼 두 개를 번갈아 쓰는 구조입니다. Writer가 비활성 버퍼를 채우고 index를 바꾸는 것까지는 좋지만, reader가 그 버퍼를 *읽는 중*인지 writer는 모릅니다. 아래 코드는 그 경우를 일부러 만듭니다.

```c
// dbuf.c
/* naive double buffer: index publish only, no protection of the slot being read */
#include <pthread.h>
#include <stdatomic.h>
#include <stdbool.h>
#include <stdint.h>
#include <stdio.h>

#define FIELDS 4
typedef struct { uint32_t v[FIELDS]; } sample_t;
static sample_t buf[2];
static _Atomic int active;
static atomic_bool stop;

static void *writer(void *a)
{
    (void)a;
    for (uint32_t x = 1; !atomic_load_explicit(&stop, memory_order_relaxed); x++) {
        int next = !atomic_load_explicit(&active, memory_order_relaxed);
        for (int i = 0; i < FIELDS; i++) buf[next].v[i] = x;
        atomic_store_explicit(&active, next, memory_order_release);
    }
    return NULL;
}

int main(void)
{
    pthread_t w;
    unsigned long torn = 0;
    const unsigned long reads = 2000000;
    pthread_create(&w, NULL, writer, NULL);
    for (unsigned long n = 0; n < reads; n++) {
        int idx = atomic_load_explicit(&active, memory_order_acquire);
        sample_t s = buf[idx];                 /* writer may be refilling this slot */
        for (int i = 1; i < FIELDS; i++)
            if (s.v[i] != s.v[0]) { torn++; break; }
    }
    atomic_store(&stop, true);
    pthread_join(w, NULL);
    printf("reads %lu, torn %lu\n", reads, torn);
    return 0;
}
```

```text
$ clang -std=c11 -O2 -g -Wall -Wextra -fsanitize=thread dbuf.c -o dbuf_tsan && ./dbuf_tsan
SUMMARY: ThreadSanitizer: data race dbuf.c:34 in main
SUMMARY: ThreadSanitizer: data race dbuf.c:20 in writer
SUMMARY: ThreadSanitizer: data race dbuf.c:20 in writer
SUMMARY: ThreadSanitizer: data race dbuf.c:34 in main
reads 2000000, torn 82
ThreadSanitizer: reported 4 warnings
exit=134
$ clang -std=c11 -O2 dbuf.c -o dbuf && ./dbuf   # 3 runs
reads 2000000, torn 4613
reads 2000000, torn 8064
reads 2000000, torn 7492
```

TSan은 reader의 구조체 복사(34행)와 writer의 버퍼 채우기(20행)를 data race로 보고했고, TSan 없이 돌린 세 번은 200만 번 중 각각 4,613, 8,064, 7,492번 서로 다른 값이 섞인 샘플을 읽었습니다(TSan 실행에서는 82번). Reader가 index를 읽은 직후 writer가 한 바퀴 돌아 같은 버퍼를 다시 채우면 이렇게 됩니다. 횟수가 실행마다 수십 배 차이 나므로, 짧은 테스트 한 번 통과로 안전하다고 결론 낼 수 없는 종류의 버그입니다.

## Triple Buffer

버퍼를 세 개로 늘리면 writer와 reader가 각자 하나씩 *소유*하고, 나머지 하나(middle)를 atomic exchange로 주고받을 수 있습니다. 호텔 객실 청소에 비유하면 손님이 쓰는 방, 청소 중인 방, 청소가 끝나 대기 중인 방이 하나씩 있고, 프런트는 대기 방 열쇠만 맞바꿉니다. 맞바꾸는 순간이 한 번의 exchange라 누구도 상대의 방에 들어가지 않습니다.

`middle`에는 slot 번호(0~2)와 "아직 안 읽은 새 값"을 뜻하는 `FRESH` 비트를 함께 담습니다. Writer는 다 채운 자기 slot을 `FRESH`와 함께 넣고 원래 middle slot을 받아 다음 쓰기에 씁니다. Reader는 `FRESH`가 켜져 있을 때만 자기 slot과 맞바꿉니다.

```c
// tbuf.c
/* triple buffer: one writer, one reader, each side one atomic_exchange */
#include <pthread.h>
#include <stdatomic.h>
#include <stdbool.h>
#include <stdint.h>
#include <stdio.h>

#define FIELDS 4
#define FRESH 4u                               /* bit 2 of middle: unread data */
typedef struct { uint32_t v[FIELDS]; } sample_t;

static sample_t buf[3];
static _Atomic unsigned middle = 1;            /* slot index | FRESH */
static unsigned back = 0;                      /* writer-owned slot */
static unsigned front = 2;                     /* reader-owned slot */
static atomic_bool stop;

static void tb_write(const sample_t *s)
{
    buf[back] = *s;
    unsigned old = atomic_exchange_explicit(&middle, back | FRESH, memory_order_acq_rel);
    back = old & 3u;                           /* take whatever slot was in the middle */
}

static int tb_read(sample_t *out)              /* 1 = new sample, 0 = same as last time */
{
    int fresh = 0;
    if (atomic_load_explicit(&middle, memory_order_relaxed) & FRESH) {
        unsigned old = atomic_exchange_explicit(&middle, front, memory_order_acq_rel);
        front = old & 3u;
        fresh = 1;
    }
    *out = buf[front];
    return fresh;
}

static void *writer(void *a)
{
    (void)a;
    for (uint32_t x = 1; !atomic_load_explicit(&stop, memory_order_relaxed); x++) {
        sample_t s;
        for (int i = 0; i < FIELDS; i++) s.v[i] = x;
        tb_write(&s);
    }
    return NULL;
}

int main(void)
{
    pthread_t w;
    unsigned long torn = 0, fresh = 0, backwards = 0;
    uint32_t last = 0;
    const unsigned long reads = 2000000;
    pthread_create(&w, NULL, writer, NULL);
    for (unsigned long n = 0; n < reads; n++) {
        sample_t s;
        fresh += tb_read(&s);
        for (int i = 1; i < FIELDS; i++)
            if (s.v[i] != s.v[0]) { torn++; break; }
        if (s.v[0] < last) backwards++;
        last = s.v[0];
    }
    atomic_store(&stop, true);
    pthread_join(w, NULL);
    printf("reads %lu, torn %lu, went backwards %lu, new samples seen %lu\n",
           reads, torn, backwards, fresh);
    return torn || backwards;
}
```

```text
$ clang -std=c11 -O2 -g -Wall -Wextra -fsanitize=thread tbuf.c -o tbuf_tsan && ./tbuf_tsan
reads 2000000, torn 0, went backwards 0, new samples seen 915817
exit=0
$ clang -std=c11 -O2 tbuf.c -o tbuf && ./tbuf   # 3 runs
reads 2000000, torn 0, went backwards 0, new samples seen 183300
reads 2000000, torn 0, went backwards 0, new samples seen 122169
reads 2000000, torn 0, went backwards 0, new samples seen 140767
```

찢어진 값도, 이전 값으로 되돌아간 경우도 없었고 TSan도 조용했습니다. `tb_write`와 `tb_read`에는 루프가 없습니다. 각자 exchange를 최대 한 번 하고 버퍼 하나를 복사하면 끝나므로, 상대가 무엇을 하든 단계 수가 고정됩니다. 이것이 이 글의 패턴 중 양쪽이 모두 wait-free인 경우입니다. 대가는 RAM(버퍼 세 개)과 "reader는 가장 최근 값만 본다"는 의미론입니다. 200만 번 읽는 동안 새 샘플을 받은 읽기는 122,169~915,817번이었고, 나머지 읽기는 직전과 같은 샘플을 다시 읽었습니다. Writer가 연달아 두 번 쓰면 앞의 값은 reader에게 가지 않습니다.

## Wait-Free Queue — Kogan-Petrank

다중 생산자·다중 소비자 큐를 wait-free로 만든 대표적인 설계가 Kogan과 Petrank의 *Wait-Free Queues With Multiple Enqueuers and Dequeuers*(PPoPP '11)입니다. 논문은 Michael-Scott lock-free 큐를 확장하고, 연산마다 phase 번호를 받아 그보다 작은 phase의 다른 스레드 연산을 먼저 도와주는 helping 방식으로 wait-freedom을 얻습니다(초록, 3.1절). 구현과 평가는 Java로 했고, garbage collector가 메모리 회수를 맡는다는 점을 설계에 이용합니다(3절). 평가 결과에 대해서는 "the wait-free algorithm is typically slower than the lock-free implementation, but the slowdown depends on the operating system configuration"이라고 적습니다(1절).

즉 wait-free 큐는 존재하지만, GC 없는 MCU에서 그대로 쓸 수 있는 형태는 아닙니다. 성능은 논문의 Java 측정에서 대체로 lock-free 큐보다 느렸고, 일부 설정에서는 더 빨랐습니다("even faster than the lock-free one, in some realistic cases", 1절). 이 글의 범위에서는 위의 triple buffer나 [9-01](/blog/embedded/modern-recipes/part9-01-lock-free-ring)의 SPSC ring처럼 생산자·소비자 수를 제한해 루프를 없애는 쪽이 현실적입니다. SPSC ring의 `push`·`pop`도 루프가 없어 각 호출은 wait-free입니다. 다만 가득 차거나 비었을 때 기다리는 것은 호출자의 몫입니다.

## Cortex-M Single-Word Atomic

ISR과 task가 32비트 상태값 하나를 주고받을 때는 `_Atomic uint32_t`의 load/store가 일반 `ldr`/`str`로 내려갑니다. 문제는 read-modify-write입니다. 같은 `atomic_fetch_add`가 코어마다 전혀 다른 코드가 됩니다.

```c
// inc.c
#include <stdatomic.h>
#include <stdint.h>

_Atomic uint32_t counter;
_Atomic uint64_t counter64;
volatile uint64_t timestamp;

void inc(void)              { atomic_fetch_add_explicit(&counter, 1, memory_order_relaxed); }
uint64_t read_ts(void)      { return timestamp; }
uint64_t read_c64(void)     { return atomic_load_explicit(&counter64, memory_order_relaxed); }
```

```text
### clang --target=aarch64-linux-gnu -O2 -ffreestanding -march=armv8-a -mno-outline-atomics -c inc.c
0000000000000000 <inc>:
       0:      	adrp	x8, 0x0 <inc>
       4:      	add	x8, x8, #0x0
       8:      	ldxr	w9, [x8]
       c:      	add	w9, w9, #0x1
      10:      	stxr	w10, w9, [x8]
      14:      	cbnz	w10, 0x8 <inc+0x8>
      18:      	ret

### clang --target=aarch64-linux-gnu -O2 -ffreestanding -march=armv8.1-a -c inc.c
0000000000000000 <inc>:
       0:      	mov	w8, #0x1                // =1
       4:      	adrp	x9, 0x0 <inc>
       8:      	add	x9, x9, #0x0
       c:      	ldadd	w8, w8, [x9]
      10:      	ret

### arm-none-eabi-gcc -std=c11 -O2 -ffreestanding -mthumb -mcpu=cortex-m0plus -c inc.c
00000000 <inc>:
   0:	push	{r4, lr}
   2:	movs	r2, #0
   4:	movs	r1, #1
   6:	ldr	r0, [pc, #8]	@ (10 <inc+0x10>)
   8:	bl	0 <__atomic_fetch_add_4>
   c:	pop	{r4, pc}
   e:	nop			@ (mov r8, r8)
  10:	.word	0x00000000

00000014 <read_ts>:
  14:	ldr	r3, [pc, #4]	@ (1c <read_ts+0x8>)
  16:	ldr	r0, [r3, #8]
  18:	ldr	r1, [r3, #12]
  1a:	bx	lr
  1c:	.word	0x00000000

00000020 <read_c64>:
  20:	push	{r4, lr}
  22:	movs	r1, #0
  24:	ldr	r0, [pc, #4]	@ (2c <read_c64+0xc>)
  26:	bl	0 <__atomic_load_8>
  2a:	pop	{r4, pc}
  2c:	.word	0x00000010
undefined:
         U __atomic_fetch_add_4
         U __atomic_load_8
### arm-none-eabi-gcc -std=c11 -O2 -ffreestanding -mthumb -mcpu=cortex-m3 -c inc.c
00000000 <inc>:
   0:	ldr	r3, [pc, #16]	@ (14 <inc+0x14>)
   2:	ldrex	r1, [r3]
   6:	adds	r1, #1
   8:	strex	r2, r1, [r3]
   c:	cmp	r2, #0
   e:	bne.n	2 <inc+0x2>
  10:	bx	lr
  12:	nop
  14:	.word	0x00000000

00000018 <read_ts>:
  18:	ldr	r3, [pc, #4]	@ (20 <read_ts+0x8>)
  1a:	ldrd	r0, r1, [r3, #8]
  1e:	bx	lr
  20:	.word	0x00000000

00000024 <read_c64>:
  24:	movs	r1, #0
  26:	ldr	r0, [pc, #4]	@ (2c <read_c64+0x8>)
  28:	b.w	0 <__atomic_load_8>
  2c:	.word	0x00000010
undefined:
         U __atomic_load_8
```

정리하면 다음과 같습니다. AArch64 두 줄의 64비트 읽기 칸은 위 두 `clang --target=aarch64-linux-gnu` 빌드에서 `read_ts`와 `read_c64`를 디스어셈블한 결과로, 두 `-march` 모두 `adrp` 뒤 `ldr x0, [x8]` 한 번이었습니다.

| 대상 | `atomic_fetch_add` (32비트) | `volatile uint64_t` 읽기 | `_Atomic uint64_t` 읽기 |
| --- | --- | --- | --- |
| AArch64 ARMv8.0 (`-mno-outline-atomics`) | `ldxr`/`stxr` 루프 | `ldr x0` 한 번 | `ldr x0` 한 번 |
| AArch64 ARMv8.1 | `ldadd` 한 명령 | `ldr x0` 한 번 | `ldr x0` 한 번 |
| Cortex-M0+ (ARMv6-M) | `__atomic_fetch_add_4` 호출 | `ldr` 두 번 | `__atomic_load_8` 호출 |
| Cortex-M3 (ARMv7-M) | `ldrex`/`strex` 루프 | `ldrd` 한 번 | `__atomic_load_8` 호출 |

`ldxr`/`stxr`과 `ldrex`/`strex`는 exclusive 접근이 실패하면 다시 도는 루프라, 경합이 심하면 몇 번 돌지 정해지지 않습니다. Cortex-M0+는 그런 명령도 없어 런타임 라이브러리 함수를 부르고, 이 Homebrew 툴체인에는 그 함수를 제공하는 라이브러리가 없어 링크 단계에서 실패합니다(`nm -u`에 남은 심볼). `volatile uint64_t`는 C 표준에서 atomic이 아니고, M0+에서는 실제로 32비트 읽기 두 번으로 나뉩니다. M3의 `ldrd`가 64비트 전체를 한 번에 읽는다고 보장하는지는 이 글에서 ARMv7-M Architecture Reference Manual로 확인하지 않았습니다.

## LSE `LDADD` — 명령 하나로 RMW

ARMv8.1의 LSE(Large System Extensions)를 쓰면 `atomic_fetch_add`가 위 표처럼 `ldadd` 한 명령이 됩니다. 소프트웨어 루프가 없으므로 "CAS가 실패해 다시 돈다"는 일은 생기지 않습니다. 다만 명령 하나가 몇 사이클에 끝나는지는 메모리 시스템과 경합에 달린 하드웨어 문제이고, 그 상한을 아키텍처가 보장하는지는 이 글이 확인한 자료에 없습니다. 그래서 "LDADD = wait-free"라고 단정하지 않고, "소프트웨어 재시도 루프가 없다"까지만 말합니다.

비교를 위해 CAS 루프로 카운터를 올릴 때 실제로 몇 번 실패하는지 쟀습니다. 스레드 8개가 각각 100만 번 올립니다.

```c
// casretry.c
/* 8 threads increment one counter with a CAS loop and count how often a CAS fails */
#include <pthread.h>
#include <stdatomic.h>
#include <stdint.h>
#include <stdio.h>

#define THREADS 8
#define OPS 1000000
static _Atomic uint32_t x;
static unsigned long fails[THREADS], worst[THREADS];

static void *worker(void *arg)
{
    int id = (int)(intptr_t)arg;
    for (int i = 0; i < OPS; i++) {
        unsigned long tries = 0;
        uint32_t old = atomic_load_explicit(&x, memory_order_relaxed);
        while (!atomic_compare_exchange_weak_explicit(&x, &old, old + 1,
                                                      memory_order_relaxed, memory_order_relaxed))
            tries++;
        fails[id] += tries;
        if (tries > worst[id]) worst[id] = tries;
    }
    return NULL;
}

int main(void)
{
    pthread_t t[THREADS];
    unsigned long total = 0, w = 0;
    for (int i = 0; i < THREADS; i++) pthread_create(&t[i], NULL, worker, (void *)(intptr_t)i);
    for (int i = 0; i < THREADS; i++) pthread_join(t[i], NULL);
    for (int i = 0; i < THREADS; i++) { total += fails[i]; if (worst[i] > w) w = worst[i]; }
    printf("x = %u, failed CAS %lu (%.2f per op), worst single op %lu retries\n",
           atomic_load(&x), total, (double)total / (THREADS * (double)OPS), w);
    return 0;
}
```

```text
$ clang -std=c11 -O2 casretry.c -o casretry && ./casretry   # 3 runs, Apple M2 Pro
x = 8000000, failed CAS 8765813 (1.10 per op), worst single op 5997 retries
x = 8000000, failed CAS 6843825 (0.86 per op), worst single op 11964 retries
x = 8000000, failed CAS 8612574 (1.08 per op), worst single op 5198 retries
```

연산당 평균 실패는 0.86~1.10번이었지만, 운이 나쁜 한 연산은 5,198~11,964번 다시 시도했습니다. 전체 카운터는 매번 정확히 800만이 됐으므로 시스템 전체로는 계속 진행합니다(lock-free). 그러나 *특정* 연산의 시도 횟수에는 상한이 없습니다(wait-free 아님). 이 숫자는 이 Mac의 값이고, 코어 수와 경합 정도에 따라 달라집니다.

## Read-Copy-Update (Read-Side)

RCU는 reader 쪽 비용을 거의 없애고 비용을 writer에 몰아주는 방식입니다. Linux v6.12 `Documentation/RCU/whatisRCU.rst`의 "classic RCU" 장난감 구현에서 `rcu_read_lock()`과 `rcu_read_unlock()`은 빈 함수이고, 문서는 "read-side overhead is precisely zero, at least on non-Alpha CPUs"라고 적습니다(749행). 대신 RCU read-side 구간 안에서는 block할 수 없고(762행), writer는 `synchronize_rcu()`로 이전 reader가 모두 끝날 때까지 기다린 뒤 옛 데이터를 해제합니다.

```c
/* reader */
rcu_read_lock();
p = rcu_dereference(gp);
if (p)
    use(p->a, p->b);
rcu_read_unlock();

/* updater */
new = kmalloc(sizeof(*new), GFP_KERNEL);
*new = *old;                     /* copy */
new->a = 42;                     /* update the copy */
rcu_assign_pointer(gp, new);     /* publish */
synchronize_rcu();               /* wait for pre-existing readers */
kfree(old);
```

같은 문서의 Quick Quiz #2 답은 단일 CPU 비선점 커널에서 IRQ 문맥이 갱신하는 routing table을 예로 들고, RCU를 쓰면 프로세스 문맥이 표를 검색하는 동안 인터럽트를 끌 필요가 없어진다고 설명합니다(1256–1262행). Reader가 루프 없이 끝나는 이 성질이 wait-free signaling과 같은 계열입니다. Grace period와 quiescent state는 [9-03: RCU 기초](/blog/embedded/modern-recipes/part9-03-rcu-basics)에서 다룹니다.

## ISR↔Task Wait-Free Pattern

ISR이 깨울 필요 없이 "몇 번 일어났는지"만 알리면 되는 경우, ISR은 카운터만 올리고 task가 주기적으로 차이를 봅니다. ISR이 유일한 writer이므로 RMW 명령 없이 load 후 store로 충분하고, task는 부호 없는 뺄셈으로 지난번 이후 개수를 구합니다. 일부러 카운터를 `0xFFFFFF00`에서 시작해 32비트 wrap을 지나가게 했습니다.

```c
// count.c — mps2-an385용 단독 프로그램
/* SysTick ISR counts events; main loop consumes them in batches, across a 32-bit wrap */
#include <stdatomic.h>
#include <stdint.h>

void pr(const char *f, ...);
void hosted_exit(int code);
extern uint32_t _etext, _sdata, _edata, _sbss, _ebss, _estack;

#define SYST_CSR (*(volatile uint32_t *)0xE000E010)
#define SYST_RVR (*(volatile uint32_t *)0xE000E014)
#define SYST_CVR (*(volatile uint32_t *)0xE000E018)

static _Atomic uint32_t isr_count = 0xFFFFFF00u;   /* start near the wrap on purpose */
static uint32_t isr_total;                         /* ISR-private, for the final check */

void SysTick_Handler(void)
{
    /* the ISR is the only writer, so load + store is enough: no RMW instruction */
    uint32_t n = atomic_load_explicit(&isr_count, memory_order_relaxed);
    atomic_store_explicit(&isr_count, n + 1u, memory_order_relaxed);
    isr_total++;
}

void Reset_Handler(void)
{
    for (uint32_t *s = &_etext, *d = &_sdata; d < &_edata;) *d++ = *s++;   /* .data */
    for (uint32_t *d = &_sbss; d < &_ebss;) *d++ = 0;                       /* .bss */
    uint32_t seen = atomic_load_explicit(&isr_count, memory_order_relaxed);
    uint32_t handled = 0, batches = 0, biggest = 0;

    SYST_RVR = 500 - 1;                            /* interrupt every 500 core clocks */
    SYST_CVR = 0;
    SYST_CSR = 7;
    while (handled < 100000u) {
        uint32_t now = atomic_load_explicit(&isr_count, memory_order_relaxed);
        uint32_t n = now - seen;                   /* unsigned difference survives the wrap */
        if (n) {
            handled += n;
            batches++;
            if (n > biggest) biggest = n;
            seen = now;
        }
        for (volatile int d = 0; d < 300; d++) { } /* the "task" does other work */
    }
    SYST_CSR = 0;
    pr("isr_count now 0x%x, handled %u in %u batches (largest batch %u), ISR ran %u times\n",
       (unsigned)atomic_load_explicit(&isr_count, memory_order_relaxed),
       handled, batches, biggest, isr_total);
    hosted_exit(0);
}

void Default_Handler(void) { pr("unexpected exception\n"); hosted_exit(1); }

__attribute__((section(".vectors"), used))
void (*const vectors[16])(void) = {
    (void (*)(void))&_estack, Reset_Handler, Default_Handler, Default_Handler,
    Default_Handler, Default_Handler, Default_Handler, 0, 0, 0, 0,
    Default_Handler, Default_Handler, 0, Default_Handler, SysTick_Handler,
};
```

```text
$ arm-none-eabi-gcc -std=c11 -mcpu=cortex-m3 -mthumb -O2 -ffreestanding -nostdlib -fno-builtin -I. -Ilibc -T link.ld -o count.elf count.c io.c -lgcc
$ qemu-system-arm -M mps2-an385 -nographic -semihosting -icount shift=5 -kernel count.elf
isr_count now 0x185a4, handled 100001 in 33940 batches (largest batch 3), ISR ran 100004 times
exit=0
```

`0xFFFFFF00`에서 100,004번 올라 `0x185a4`가 됐고(0x100000000 − 0xFFFFFF00 = 256, 100,004 − 256 = 99,748 = 0x185A4), task는 wrap을 지나면서도 100,001개를 빠짐없이 셌습니다(루프를 빠져나온 뒤 ISR이 3번 더 돌았습니다). 한 번에 처리한 개수는 최대 3개였습니다. ISR 본문은 `ldr`·`adds`·`str` 두 쌍뿐이라 ISR 쪽 비용은 고정입니다. `io.c`, `libc/`, `link.ld`는 [6-12](/blog/embedded/modern-recipes/part6-12-rtos-debugging)의 재현 환경과 같은 파일이고, QEMU `-icount shift=5`라 시간은 실제 보드의 시간이 아닙니다.

이 패턴은 개수만 넘깁니다. 이벤트마다 데이터가 따라오면 [9-01](/blog/embedded/modern-recipes/part9-01-lock-free-ring)의 SPSC ring을 씁니다. 또 task가 카운터 한 바퀴(2^32번)보다 늦게 오면 차이를 셀 수 없지만, 그 정도 지연이면 다른 문제가 먼저입니다.

## RP2040 — HW Spinlock

RP2040의 SIO 하드웨어 spinlock은 wait-free가 아니라 기다리는 lock입니다. pico-sdk 2.1.0 `hardware/sync/spin_lock.h`의 `spin_lock_blocking()`은 인터럽트를 끄고(`save_and_disable_interrupts()`) lock을 얻을 때까지 돕니다(301–305행). `spin_unlock()`은 lock을 풀고 저장한 인터럽트 상태를 되돌립니다(332–335행).

```c
uint32_t saved = spin_lock_blocking(spin_lock_instance(0));
update_shared_state();
spin_unlock(spin_lock_instance(0), saved);
```

그래서 대기 시간의 상한은 "다른 코어가 lock을 쥐고 있는 가장 긴 구간"으로 정해지고, 그 구간 동안 이 코어의 인터럽트도 막힙니다. Deadline이 있는 경로라면 그 최장 구간을 따로 재야 합니다. 이 글에서는 RP2040 보드로 실행하지 않았습니다.

## 자주 하는 실수

> ⚠️ CAS 재시도 루프를 wait-free라고 부름

```c
uint32_t old = atomic_load_explicit(&x, memory_order_relaxed);
while (!atomic_compare_exchange_weak(&x, &old, old + 1)) { }   /* lock-free, not wait-free */
```

위 측정에서 한 연산이 11,964번까지 다시 돌았습니다. 시도 횟수에 상한이 필요하면 LSE `ldadd` 같은 RMW 명령을 쓰거나, 쓰는 쪽을 하나로 줄여 load + store로 바꿉니다.

> ⚠️ Double buffer를 경합 없는 구조로 믿음

위 실행에서 TSan이 race를 보고했고, 실제로 섞인 샘플이 200만 번 중 4,613, 8,064, 7,492번 나왔습니다. Reader가 읽는 동안 그 버퍼를 덮지 않는다는 보장이 필요하면 triple buffer나 seqlock을 씁니다.

> ⚠️ 32비트 MCU에서 `volatile uint64_t`를 공유함

Cortex-M0+에서 `volatile uint64_t` 읽기는 `ldr` 두 번입니다. ISR이 그 사이에 값을 바꾸면 상위·하위 절반이 서로 다른 시점의 값이 됩니다. `_Atomic uint64_t`는 라이브러리 함수가 필요하므로, 인터럽트를 잠깐 막고 읽거나 seqlock처럼 앞뒤 확인으로 읽습니다.

> ⚠️ Wait-free라고 가정만 하고 재지 않음

Seqlock reader가 한 번 읽는 데 772,370번 재시도한 것처럼, 루프가 있는 코드는 최악 시도 횟수를 직접 세 봐야 압니다. 위 테스트들처럼 재시도 횟수의 최댓값을 카운터로 남기는 것이 가장 싼 측정입니다.

## 정리

- **Wait-free**는 각 연산이 남의 속도와 무관하게 유한한 단계에 끝난다는 보장입니다(Herlihy 1991). Lock-free는 시스템 전체의 진행만 보장합니다.
- 루프 없는 flag 우편함과 triple buffer는 양쪽 모두 wait-free였고, TSan도 조용했습니다.
- Seqlock reader는 찢어진 값을 걸러 냈지만 한 번에 최대 772,370번 재시도했습니다. Wait-free가 아닙니다.
- 단순 double buffer는 TSan race와 실제로 섞인 샘플을 냈습니다.
- `atomic_fetch_add`는 ARMv8.1에서 `ldadd`, ARMv8.0과 Cortex-M3에서 재시도 루프, Cortex-M0+에서 라이브러리 호출이 됩니다.
- CAS 루프는 8스레드에서 한 연산이 11,964번까지 재시도했습니다.
- ISR이 유일한 writer인 카운터는 load + store만으로 wrap을 넘어 정확히 셌습니다.

다음 편은 [9-03: RCU 기초](/blog/embedded/modern-recipes/part9-03-rcu-basics)입니다.

## 관련 항목

- [2-10: ARM Memory Barrier 실전](/blog/embedded/modern-recipes/part2-10-memory-barrier)
- [9-01: Lock-Free Ring Buffer](/blog/embedded/modern-recipes/part9-01-lock-free-ring)
- [9-03: RCU 기초](/blog/embedded/modern-recipes/part9-03-rcu-basics)
- [9-05: CAS 패턴](/blog/embedded/modern-recipes/part9-05-cas-patterns)
