---
title: "Lock-Free Ring Buffer 구현 — SPSC·Power-of-2·Memory Order"
slug: "embedded/modern-recipes/part9-01-lock-free-ring"
date: 2026-04-18T09:00:00
description: "SPSC ring 구현. Power-of-2 size, head/tail atomic, memory order release/acquire."
series: "Modern Embedded Recipes"
seriesOrder: 101
tags: [recipes, lock-free, ring-buffer, spsc, atomic]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> **"SPSC ring = 한쪽만 쓰는 head/tail + release/acquire"** Producer와 consumer가 각자 자기 index만 쓰고, 데이터를 쓴 뒤 index를 release로 공개하면 lock 없이 바이트를 넘길 수 있습니다. 이 글은 그 조건을 C11 표준 문구, macOS의 ThreadSanitizer, Cortex-M 디스어셈블리, QEMU에서 돈 ISR로 하나씩 확인합니다.

## 기본 SPSC Ring

UART 수신처럼 한쪽(ISR)은 넣기만 하고 다른 쪽(task)은 빼기만 하는 통로가 SPSC(single-producer single-consumer)입니다. 회전초밥 레일에 비유하면 주방은 빈 접시 자리에만 초밥을 올리고, 손님은 올라온 접시만 집습니다. 둘이 같은 접시를 동시에 만지지 않으니 자물쇠가 필요 없습니다. 다만 "접시를 다 올렸다"는 신호가 접시보다 먼저 보이면 손님이 빈 접시를 집게 되는데, 이 순서를 지키는 것이 memory order입니다.

![SPSC ring buffer — head는 producer, tail은 consumer](/images/blog/modern-recipes/diagrams/part2-02-lock-free-ring.svg)

아래 헤더가 이 글의 기준 구현입니다. 크기는 2의 거듭제곱이고, 한 칸을 비워 둬서 `head == tail`이면 비었고 `next(head) == tail`이면 찼다고 판정합니다. 그래서 담을 수 있는 바이트는 `RING_SIZE - 1`개입니다.

```c
// spsc.h
#include <stdatomic.h>
#include <stdbool.h>
#include <stdint.h>

#define RING_SIZE 64u                 /* power of 2 */
#define RING_MASK (RING_SIZE - 1u)

typedef struct {
    uint8_t buf[RING_SIZE];
    _Atomic uint16_t head;            /* written only by the producer */
    _Atomic uint16_t tail;            /* written only by the consumer */
} ring_t;

static inline bool ring_push(ring_t *r, uint8_t b)
{
    uint16_t h = atomic_load_explicit(&r->head, memory_order_relaxed);
    uint16_t next = (h + 1u) & RING_MASK;
    if (next == atomic_load_explicit(&r->tail, memory_order_acquire))
        return false;                                     /* full */
    r->buf[h] = b;                                        /* plain data write */
    atomic_store_explicit(&r->head, next, memory_order_release);
    return true;
}

static inline bool ring_pop(ring_t *r, uint8_t *out)
{
    uint16_t t = atomic_load_explicit(&r->tail, memory_order_relaxed);
    if (t == atomic_load_explicit(&r->head, memory_order_acquire))
        return false;                                     /* empty */
    *out = r->buf[t];                                     /* plain data read */
    atomic_store_explicit(&r->tail, (t + 1u) & RING_MASK, memory_order_release);
    return true;
}
```

`head`는 producer만, `tail`은 consumer만 씁니다. 상대 index는 읽기만 하므로 같은 변수를 두 쪽이 동시에 쓰는 일은 없습니다. 그래도 *읽기와 쓰기*가 동시에 일어나므로 index는 atomic이어야 합니다. C11은 서로 다른 스레드의 두 접근이 같은 위치를 건드리고 하나라도 쓰기이며(conflict), 그중 하나라도 atomic이 아니고 어느 쪽도 다른 쪽보다 happens-before가 아니면 data race이고, data race는 undefined behavior라고 정합니다(N1570 5.1.2.4p4, p25).

### 확인: 1,000만 바이트를 두 스레드로

Producer 스레드가 0, 1, 2, …를 `uint8_t`로 넣고 main 스레드가 같은 순서로 나오는지 셉니다.

```c
// test.c
#include <pthread.h>
#include <stdio.h>
#include "spsc.h"

#define N 10000000u
static ring_t ring;

static void *producer(void *arg)
{
    (void)arg;
    for (uint32_t i = 0; i < N; i++)
        while (!ring_push(&ring, (uint8_t)i)) { }        /* spin while full */
    return NULL;
}

int main(void)
{
    pthread_t p;
    uint32_t errors = 0;
    pthread_create(&p, NULL, producer, NULL);
    for (uint32_t i = 0; i < N; i++) {
        uint8_t b;
        while (!ring_pop(&ring, &b)) { }                  /* spin while empty */
        if (b != (uint8_t)i) errors++;
    }
    pthread_join(p, NULL);
    printf("%u bytes, %u out of order\n", N, errors);
    return errors != 0;
}
```

Apple M2 Pro(macOS 27.2.1)에서 Apple clang 21.0.0으로 ThreadSanitizer를 켜고 돌린 결과입니다.

```text
$ clang -std=c11 -O2 -Wall -Wextra -fsanitize=thread test.c -o test_tsan && ./test_tsan
10000000 bytes, 0 out of order
exit=0
```

### `volatile`만 쓴 ring은 어떻게 되나

같은 ring에서 `_Atomic`을 `volatile`로 바꾸고 `atomic_*` 호출을 일반 대입으로 바꾼 판입니다. `test.c`의 `#include "spsc.h"`를 `#include "vol.h"`로 바꿔 `test_vol.c`로 씁니다.

```c
// vol.h
#include <stdbool.h>
#include <stdint.h>

#define RING_SIZE 64u
#define RING_MASK (RING_SIZE - 1u)

typedef struct {
    uint8_t buf[RING_SIZE];
    volatile uint16_t head;
    volatile uint16_t tail;
} ring_t;

static bool ring_push(ring_t *r, uint8_t b)
{
    uint16_t h = r->head;
    uint16_t next = (h + 1u) & RING_MASK;
    if (next == r->tail) return false;
    r->buf[h] = b;
    r->head = next;
    return true;
}

static bool ring_pop(ring_t *r, uint8_t *out)
{
    uint16_t t = r->tail;
    if (t == r->head) return false;
    *out = r->buf[t];
    r->tail = (t + 1u) & RING_MASK;
    return true;
}
```

TSan은 두 군데를 data race로 보고합니다. 하나는 `ring_push`의 `head` 쓰기(`vol.h:20`)와 `ring_pop`의 `head` 읽기(27행), 다른 하나는 데이터 바이트 쓰기(19행)와 읽기(28행)입니다. 어느 접근이 "Previous"로 찍히는지는 실행마다 바뀝니다.

```text
$ clang -std=c11 -O2 -g -fsanitize=thread test_vol.c -o test_vol && ./test_vol
==================
WARNING: ThreadSanitizer: data race (pid=14357)
  Write of size 2 at 0x00010460c040 by thread T1:
    #0 ring_push vol.h:20 (test_vol:arm64+0x1000007e8)
    #1 producer test_vol.c:13 (test_vol:arm64+0x1000007e8)

  Previous read of size 2 at 0x00010460c040 by main thread:
    #0 ring_pop vol.h:27 (test_vol:arm64+0x1000006e4)
    #1 main test_vol.c:24 (test_vol:arm64+0x1000006e4)

  Location is global 'ring' at 0x00010460c000 (test_vol+0x100008040)

  Thread T1 (tid=43722871, running) created by main thread at:
    #0 pthread_create <null> (libclang_rt.tsan_osx_dynamic.dylib:arm64e+0x33bac)
    #1 main test_vol.c:21 (test_vol:arm64+0x1000006b8)

SUMMARY: ThreadSanitizer: data race vol.h:20 in ring_push
==================
...
==================
10000000 bytes, 4216 out of order
ThreadSanitizer: reported 2 warnings
exit=134
```

TSan 없이 `-O2`로만 빌드해 열 번 돌리면 결과가 실제로 틀립니다. 비교를 위해 `_Atomic` 판도 같이 돌렸습니다.

```text
$ clang -std=c11 -O2 test_vol.c -o test_vol_o2   # 10 runs
10000000 bytes, 2788 out of order
10000000 bytes, 9292 out of order
10000000 bytes, 1871 out of order
10000000 bytes, 6091 out of order
10000000 bytes, 1176 out of order
10000000 bytes, 2578 out of order
10000000 bytes, 474 out of order
10000000 bytes, 10036 out of order
10000000 bytes, 2363 out of order
10000000 bytes, 3057 out of order
$ clang -std=c11 -O2 test.c -o test_o2   # 10 runs
10000000 bytes, 0 out of order
10000000 bytes, 0 out of order
10000000 bytes, 0 out of order
10000000 bytes, 0 out of order
10000000 bytes, 0 out of order
10000000 bytes, 0 out of order
10000000 bytes, 0 out of order
10000000 bytes, 0 out of order
10000000 bytes, 0 out of order
10000000 bytes, 0 out of order
```

`volatile`은 컴파일러가 접근을 지우거나 합치지 못하게 할 뿐(N1570 6.7.3p7, 5.1.2.3), CPU가 바이트 쓰기와 `head` 쓰기를 다른 코어에 어떤 순서로 보여 줄지는 정하지 않습니다. AArch64인 M2에서는 consumer가 새 `head`를 먼저 보고 아직 도착하지 않은 바이트를 읽는 경우가 1,000만 개 중 474~10,036번 나왔습니다. 횟수는 실행마다 크게 달라서, 글의 코드 블록을 다시 뽑아 세 번 돌린 마지막 재현 확인에서는 129,887~206,316번이었습니다. 이 글을 쓰며 돌린 `volatile` 판 실행 가운데 0이 나온 것은 없었습니다.

## Power-of-2 — 왜 중요한가

크기를 2의 거듭제곱으로 잡으면 `% RING_SIZE`를 `& RING_MASK`로 쓸 수 있습니다. 실제로 얼마나 차이 나는지는 컴파일러 출력을 보면 바로 보입니다. 네 가지 index 갱신을 함수로 만들어 arm-none-eabi-gcc 16.2.0 `-O2`로 컴파일했습니다.

```c
// idx.c
unsigned next_mask(unsigned h) { return (h + 1u) & 63u; }       /* RING_SIZE 64 */
unsigned next_mod64(unsigned h) { return (h + 1u) % 64u; }      /* RING_SIZE 64, % */
unsigned next_mod100(unsigned h) { return (h + 1u) % 100u; }    /* RING_SIZE 100 */
unsigned next_cmp100(unsigned h) { return h + 1u == 100u ? 0u : h + 1u; }
```

```text
arm-none-eabi-gcc (GCC) 16.2.0
### arm-none-eabi-gcc -O2 -mthumb -mcpu=cortex-m0plus -c idx.c && arm-none-eabi-objdump -d --no-show-raw-insn idx.o
00000000 <next_mask>:
   0:	adds	r3, r0, #1
   2:	movs	r0, #63	@ 0x3f
   4:	ands	r0, r3
   6:	bx	lr

00000008 <next_mod64>:
   8:	adds	r3, r0, #1
   a:	movs	r0, #63	@ 0x3f
   c:	ands	r0, r3
   e:	bx	lr

00000010 <next_mod100>:
  10:	push	{r4, lr}
  12:	movs	r1, #100	@ 0x64
  14:	adds	r0, #1
  16:	bl	0 <__aeabi_uidivmod>
  1a:	movs	r0, r1
  1c:	pop	{r4, pc}
  1e:	nop			@ (mov r8, r8)

00000020 <next_cmp100>:
  20:	cmp	r0, #99	@ 0x63
  22:	beq.n	28 <next_cmp100+0x8>
  24:	adds	r0, #1
  26:	bx	lr
  28:	movs	r0, #0
  2a:	b.n	26 <next_cmp100+0x6>
### arm-none-eabi-gcc -O2 -mthumb -mcpu=cortex-m3 -c idx.c && arm-none-eabi-objdump -d --no-show-raw-insn idx.o
00000000 <next_mask>:
   0:	adds	r0, #1
   2:	and.w	r0, r0, #63	@ 0x3f
   6:	bx	lr

00000008 <next_mod64>:
   8:	adds	r0, #1
   a:	and.w	r0, r0, #63	@ 0x3f
   e:	bx	lr

00000010 <next_mod100>:
  10:	movs	r2, #100	@ 0x64
  12:	ldr	r3, [pc, #16]	@ (24 <next_mod100+0x14>)
  14:	adds	r0, #1
  16:	umull	r1, r3, r3, r0
  1a:	lsrs	r3, r3, #5
  1c:	mls	r0, r2, r3, r0
  20:	bx	lr
  22:	nop
  24:	.word	0x51eb851f

00000028 <next_cmp100>:
  28:	cmp	r0, #99	@ 0x63
  2a:	ite	ne
  2c:	addne	r0, #1
  2e:	moveq	r0, #0
  30:	bx	lr
  32:	nop
```

결과를 정리하면 다음과 같습니다.

| 식 | Cortex-M0+ | Cortex-M3 |
| --- | --- | --- |
| `(h + 1) & 63` | `adds`·`ands` | `adds`·`and.w` |
| `(h + 1) % 64` (unsigned) | `& 63`과 같은 코드 | `& 63`과 같은 코드 |
| `(h + 1) % 100` | `__aeabi_uidivmod` 라이브러리 호출 | 역수 곱셈(`umull`·`lsrs`·`mls`) |
| `h + 1 == 100 ? 0 : h + 1` | 비교·분기 | `ite`로 분기 없는 두 명령 |

부호 없는 상수 64로 나눈 나머지는 컴파일러가 알아서 AND로 바꿉니다. 비용이 생기는 것은 크기가 2의 거듭제곱이 아닐 때이고, Cortex-M0+(ARMv6-M)에는 나눗셈 명령이 없어 런타임 라이브러리 함수를 부릅니다. 크기가 100이어야 한다면 마지막 줄처럼 비교로 wrap하는 방법이 있습니다. 다만 그러면 아래 `ring_push_n`의 `(t - h - 1) & RING_MASK` 같은 여유 공간 계산도 mask 대신 조건식으로 다시 써야 합니다.

## Memory Order — Release/Acquire

`ring_push`의 마지막 줄 `atomic_store_explicit(&r->head, next, memory_order_release)`가 이 글의 핵심입니다. Release store와, 그 값을 읽는 acquire load가 짝을 이루면 *store 앞의 모든 쓰기*(`r->buf[h] = b`)가 *load 뒤의 모든 읽기*(`*out = r->buf[t]`)보다 먼저 일어난 것으로 보장됩니다. 표준의 말로는 release 연산 A가 같은 객체에 대한 acquire 연산 B와 synchronizes-with 관계를 맺고(N1570 5.1.2.4p11, 7.17.3p3–4), 그래서 data write → release store → acquire load → data read가 happens-before로 이어집니다.

택배로 비유하면 producer는 상자를 문 앞에 놓은 *다음에* 도착 문자를 보내고, consumer는 문자를 받은 *다음에* 문을 엽니다. 문자를 먼저 보내면 문을 열어도 상자가 없을 수 있습니다. 위 `volatile` 판에서 나온 "out of order"가 바로 그 경우입니다.

반대 방향도 같은 원리입니다. Consumer가 바이트를 다 읽은 *뒤에* `tail`을 release로 올리고, producer가 그것을 acquire로 읽은 *뒤에* 그 칸을 덮어씁니다. 그래서 `ring_push`의 `tail` 읽기도 acquire입니다. 자기 index를 읽는 두 곳은 자기만 쓰는 값이라 relaxed로 충분합니다.

표준 함수는 `_Atomic` 객체만 받습니다. N1570 7.17.7.2의 원형은 `C atomic_load_explicit(volatile A *object, memory_order order)`이고, 여기서 `A`는 atomic 타입입니다(7.17.1p5). Apple clang 21은 `volatile uint16_t`에 `atomic_load_explicit`을 부르면 아래처럼 오류로 거부합니다. 그러나 같은 파일을 arm-none-eabi-gcc 16.2.0(`-std=c11 -Wall -Wextra -ffreestanding -mcpu=cortex-m7 -mthumb -O2`)으로 빌드하면 경고 없이 컴파일되고 `ldrh` 뒤에 `dmb ish`를 붙인 코드가 나옵니다. 7.17.7.2는 원형을 보이는 synopsis라 진단을 요구하지 않으므로, 컴파일러가 막아 준다고 기대할 수 없습니다.

```c
// atomic_on_volatile.c
#include <stdatomic.h>
#include <stdint.h>
typedef struct { volatile uint16_t head; } ring_t;
uint16_t load_head(ring_t *r) { return atomic_load_explicit(&r->head, memory_order_acquire); }
```

```text
$ clang -std=c11 -c atomic_on_volatile.c
atomic_on_volatile.c:5:40: error: address argument to atomic operation must be a pointer to _Atomic type ('volatile uint16_t *' (aka 'volatile unsigned short *') invalid)
    5 | uint16_t load_head(ring_t *r) { return atomic_load_explicit(&r->head, memory_order_acquire); }
      |                                        ^                    ~~~~~~~~
/Applications/Xcode.app/Contents/Developer/Toolchains/XcodeDefault.xctoolchain/usr/lib/clang/21/include/stdatomic.h:145:30: note: expanded from macro 'atomic_load_explicit'
  145 | #define atomic_load_explicit __c11_atomic_load
      |                              ^
1 error generated.
exit=1
```

## ARM Cortex-M Single Core

ISR과 task가 한 코어에서 ring을 나눠 쓸 때도 같은 `_Atomic` 코드를 그대로 쓸 수 있습니다. 위 `spsc.h`를 Cortex-M0+와 Cortex-M3용으로 컴파일하면 atomic load/store가 일반 `ldrh`/`strh`와 `dmb ish`로 내려가고, 라이브러리 호출은 생기지 않습니다(`nm -u` 출력이 비어 있음). Cortex-M3의 `push`는 다음과 같습니다.

```text
00000000 <push>:
   0:	ldrh.w	r2, [r0, #64]	@ 0x40
   4:	uxth	r2, r2
   6:	adds	r3, r2, #1
   8:	and.w	r3, r3, #63	@ 0x3f
   c:	ldrh.w	ip, [r0, #66]	@ 0x42
  10:	dmb	ish
  14:	uxth.w	ip, ip
  18:	cmp	r3, ip
  1a:	beq.n	2a <push+0x2a>
  1c:	strb	r1, [r0, r2]
  1e:	dmb	ish
  22:	strh.w	r3, [r0, #64]	@ 0x40
  26:	movs	r0, #1
  28:	bx	lr
  2a:	movs	r0, #0
  2c:	bx	lr
  2e:	nop
```

`tail`을 읽은 뒤의 `dmb`가 acquire, 바이트 쓰기(`strb`)와 `head` 쓰기(`strh.w`) 사이의 `dmb`가 release입니다. 단일 코어에서 이 `dmb`를 빼도 되는지는 C 표준이 아니라 CPU 아키텍처의 메모리 모델이 정하는 문제이고, 이 글은 ARMv7-M Architecture Reference Manual로 그 답을 확인하지 않았습니다. `_Atomic`으로 쓰면 그 답과 상관없이 컴파일러 재배치까지 포함한 순서를 표준에서 보장받고, 비용은 위처럼 `dmb` 두 개입니다.

실제 ISR로도 돌려 봤습니다. QEMU `mps2-an385`(Cortex-M3)에서 SysTick 인터럽트를 200 클록마다 걸어 ISR이 producer가 되고, main 루프가 매번 길이가 다른 지연을 두며 consumer가 됩니다.

```c
// isr.c — vector table까지 포함한 단독 프로그램
/* SysTick ISR = producer, main loop = consumer, on mps2-an385 (Cortex-M3) */
#include "spsc.h"

void pr(const char *f, ...);
void hosted_exit(int code);
extern uint32_t _etext, _sdata, _edata, _sbss, _ebss, _estack;

#define SYST_CSR (*(volatile unsigned *)0xE000E010)
#define SYST_RVR (*(volatile unsigned *)0xE000E014)
#define SYST_CVR (*(volatile unsigned *)0xE000E018)
#define N 200000u

static ring_t ring;
static volatile unsigned produced, dropped;

void SysTick_Handler(void)
{
    if (produced < N) {
        if (ring_push(&ring, (uint8_t)produced)) produced++;
        else dropped++;                        /* full: try the same byte next tick */
    }
}

void Reset_Handler(void)
{
    for (uint32_t *s = &_etext, *d = &_sdata; d < &_edata;) *d++ = *s++;   /* .data */
    for (uint32_t *d = &_sbss; d < &_ebss;) *d++ = 0;                       /* .bss */
    unsigned got = 0, bad = 0;
    SYST_RVR = 200 - 1;                        /* interrupt every 200 core clocks */
    SYST_CVR = 0;
    SYST_CSR = 7;                              /* core clock, interrupt, enable */
    while (got < N) {
        uint8_t b;
        if (ring_pop(&ring, &b)) {
            if (b != (uint8_t)got) bad++;
            got++;
            for (volatile int d = 0; d < (got & 0xff); d++) { }   /* variable consumer delay */
        }
    }
    SYST_CSR = 0;
    pr("received %u, out of order %u, full events %u\n", got, bad, dropped);
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
$ arm-none-eabi-gcc -std=c11 -mcpu=cortex-m3 -mthumb -O2 -ffreestanding -nostdlib -fno-builtin -I. -Ilibc -T link.ld -o isr.elf isr.c io.c -lgcc
$ qemu-system-arm -M mps2-an385 -nographic -semihosting -icount shift=5 -kernel isr.elf
received 200000, out of order 0, full events 484647
exit=0
```

20만 바이트가 순서대로 왔고, ring이 가득 차서 ISR이 다음 tick으로 미룬 경우가 484,647번 있었습니다. 즉 full 경로도 많이 지났습니다. `io.c`, `libc/`, `link.ld`는 [6-12: RTOS 디버깅 기법](/blog/embedded/modern-recipes/part6-12-rtos-debugging)의 재현 환경 절에 있는 파일을 그대로 씁니다. `-icount shift=5`라 실행 결과는 매번 같고, 시간은 실제 보드의 시간이 아닙니다.

## ARM SMP — 같은 코드, 다른 이유

Cortex-A SMP나 이 글의 M2처럼 코어가 여럿이면 `dmb`(AArch64에서는 `ldar`/`stlr` 등)가 실제로 순서를 지킵니다. 위의 `volatile` 판이 M2에서 틀린 결과를 낸 것이 그 증거입니다. 코드는 `_Atomic`판 그대로이고, 바뀌는 것은 컴파일러가 고르는 명령뿐입니다.

## Cache Alignment — False Sharing 방지

Producer는 `head`를 쓰고 `tail`을 읽고, consumer는 그 반대입니다. 두 변수가 같은 cache line에 있으면 한쪽이 쓸 때마다 다른 코어의 line이 무효화돼, 실제로 공유하지 않는 데이터 때문에 line이 두 코어를 오갑니다. 같은 책상 서랍을 두 사람이 번갈아 여는 셈입니다.

얼마나 차이 나는지 M2 Pro에서 쟀습니다. `head`와 `tail` 사이 거리만 바꾸고(4 B 붙임 / 64 B / 128 B) 1억 개를 넘기는 시간을 쟀습니다. 이 Mac의 `sysctl hw.cachelinesize`는 128입니다.

```c
// fs.c — clang -std=c11 -O2 -DGAP=<4|64|128> fs.c
/* SPSC ring throughput with head/tail placed GAP bytes apart */
#include <pthread.h>
#include <stdatomic.h>
#include <stdint.h>
#include <stdio.h>
#include <time.h>

#ifndef GAP
#define GAP 4
#endif
#define RING_SIZE 1024u
#define RING_MASK (RING_SIZE - 1u)
#define N 100000000u

static struct {
    _Alignas(256) _Atomic uint32_t head;
    char pad[GAP > sizeof(uint32_t) ? GAP - sizeof(uint32_t) : 1];
    _Atomic uint32_t tail;
    _Alignas(256) uint32_t buf[RING_SIZE];
} r;

static void *producer(void *a)
{
    (void)a;
    for (uint32_t i = 0; i < N; i++) {
        uint32_t h = atomic_load_explicit(&r.head, memory_order_relaxed);
        uint32_t next = (h + 1u) & RING_MASK;
        while (next == atomic_load_explicit(&r.tail, memory_order_acquire)) { }
        r.buf[h] = i;
        atomic_store_explicit(&r.head, next, memory_order_release);
    }
    return NULL;
}

int main(void)
{
    pthread_t p;
    struct timespec t0, t1;
    uint64_t sum = 0;
    clock_gettime(CLOCK_MONOTONIC, &t0);
    pthread_create(&p, NULL, producer, NULL);
    for (uint32_t i = 0; i < N; i++) {
        uint32_t t = atomic_load_explicit(&r.tail, memory_order_relaxed);
        while (t == atomic_load_explicit(&r.head, memory_order_acquire)) { }
        sum += r.buf[t];
        atomic_store_explicit(&r.tail, (t + 1u) & RING_MASK, memory_order_release);
    }
    pthread_join(p, NULL);
    clock_gettime(CLOCK_MONOTONIC, &t1);
    double s = (t1.tv_sec - t0.tv_sec) + (t1.tv_nsec - t0.tv_nsec) / 1e9;
    printf("gap=%3d B  head-tail distance=%td  %.2f s  %.1f M items/s  (sum %llu)\n", GAP,
           (char *)&r.tail - (char *)&r.head, s, N / s / 1e6, (unsigned long long)sum);
    return 0;
}
```

```text
host: Apple M2 Pro (8P+4E), macOS 27.2.1, hw.cachelinesize=128, Apple clang 21.0.0, -std=c11 -O2
gap=  4 B  head-tail distance=8  6.34 s  15.8 M items/s  (sum 4999999950000000)
gap= 64 B  head-tail distance=64  4.02 s  24.9 M items/s  (sum 4999999950000000)
gap=128 B  head-tail distance=128  4.95 s  20.2 M items/s  (sum 4999999950000000)
gap=  4 B  head-tail distance=8  5.96 s  16.8 M items/s  (sum 4999999950000000)
gap= 64 B  head-tail distance=64  3.84 s  26.1 M items/s  (sum 4999999950000000)
gap=128 B  head-tail distance=128  7.05 s  14.2 M items/s  (sum 4999999950000000)
gap=  4 B  head-tail distance=8  12.14 s  8.2 M items/s  (sum 4999999950000000)
gap= 64 B  head-tail distance=64  14.14 s  7.1 M items/s  (sum 4999999950000000)
gap=128 B  head-tail distance=128  9.77 s  10.2 M items/s  (sum 4999999950000000)
gap=  4 B  head-tail distance=8  12.97 s  7.7 M items/s  (sum 4999999950000000)
gap= 64 B  head-tail distance=64  2.79 s  35.8 M items/s  (sum 4999999950000000)
gap=128 B  head-tail distance=128  3.98 s  25.1 M items/s  (sum 4999999950000000)
gap=  4 B  head-tail distance=8  5.04 s  19.9 M items/s  (sum 4999999950000000)
gap= 64 B  head-tail distance=64  2.43 s  41.2 M items/s  (sum 4999999950000000)
gap=128 B  head-tail distance=128  3.97 s  25.2 M items/s  (sum 4999999950000000)
```

다섯 라운드의 중앙값은 붙였을 때 15.8 M items/s, 64 B일 때 26.1, 128 B일 때 20.2였습니다. 그러나 셋째 라운드는 세 배치가 모두 7~10 M items/s로 떨어졌고 64 B가 가장 느렸습니다. 이 측정은 macOS가 두 스레드를 어느 코어에 두는지 통제하지 않았고, 라운드 사이의 차이가 배치 사이의 차이만큼 큽니다. 64 B는 다섯 라운드 중 네 번(1·2·4·5), 128 B도 네 번(1·3·4·5) 붙인 배치보다 빨랐고, 둘 다 빨랐던 라운드는 세 번(1·4·5)이었습니다. 이 host에서 말할 수 있는 것은 여기까지이고, 64 B와 128 B의 순위는 가를 수 없습니다. 그래서 간격은 그 시스템의 cache line 크기로 잡습니다. 64는 고정값이 아니고, 이 Mac에서는 128입니다.

C11에서는 `_Alignas(N)`(또는 `<stdalign.h>`의 `alignas`)로 각 index를 line 시작에 놓습니다.

```c
typedef struct {
    _Alignas(128) _Atomic uint16_t head;   /* 128 = hw.cachelinesize on this Mac */
    _Alignas(128) _Atomic uint16_t tail;
    _Alignas(128) uint8_t buf[RING_SIZE];
} ring_aligned_t;
```

`_Alignas`가 다음 멤버를 line 경계로 밀어 주므로 `pad` 배열을 손으로 넣지 않아도 됩니다. Cortex-M0/M3/M4처럼 data cache가 없는 MCU에서는 이 정렬이 얻는 것이 없고 RAM만 씁니다.

## Multi-Byte Push

UART 한 줄이나 CAN frame처럼 여러 바이트를 한 번에 넣을 때는 wrap 지점에서 복사를 둘로 나눕니다. `head`는 두 복사가 끝난 뒤 한 번만 release로 올리므로 consumer는 덩어리 전체를 한꺼번에 봅니다.

```c
// pushn.h
#include <string.h>

/* copy up to n bytes; returns how many were queued */
static inline size_t ring_push_n(ring_t *r, const uint8_t *data, size_t n)
{
    uint16_t h = atomic_load_explicit(&r->head, memory_order_relaxed);
    uint16_t t = atomic_load_explicit(&r->tail, memory_order_acquire);
    size_t room = (uint16_t)(t - h - 1u) & RING_MASK;
    if (n > room) n = room;

    size_t first = RING_SIZE - h;                 /* bytes before the wrap */
    if (first > n) first = n;
    memcpy(&r->buf[h], data, first);
    memcpy(&r->buf[0], data + first, n - first);

    atomic_store_explicit(&r->head, (uint16_t)((h + n) & RING_MASK), memory_order_release);
    return n;
}
```

23바이트(일부러 64의 약수가 아닌 크기)씩 넣고 `ring_pop`으로 하나씩 꺼내는 테스트입니다(`test_n.c`는 위 `test.c`에 `#include "pushn.h"`를 더하고 producer를 이 루프로 바꾼 것).

```c
static void *producer(void *arg)
{
    uint8_t chunk[23];                            /* odd size so copies straddle the wrap */
    uint32_t sent = 0;
    (void)arg;
    while (sent < N) {
        size_t want = N - sent < sizeof chunk ? N - sent : sizeof chunk;
        for (size_t i = 0; i < want; i++) chunk[i] = (uint8_t)(sent + i);
        size_t done = 0;
        while (done < want)
            done += ring_push_n(&ring, chunk + done, want - done);
        sent += (uint32_t)want;
    }
    return NULL;
}
```

```text
$ clang -std=c11 -O2 -Wall -Wextra -fsanitize=thread test_n.c -o test_n && ./test_n
10000000 bytes, 0 out of order
exit=0
```

## ISR↔Task 사용

FreeRTOS task에서 ring을 비울 때 가장 단순한 형태는 비었으면 한 tick 쉬는 polling입니다. 이 형태는 데이터가 들어와도 최대 한 tick 늦게 처리하고, 비어 있는 동안에도 매 tick 깨어납니다.

```c
void uart_task(void *p)
{
    uint8_t byte;
    (void)p;
    for (;;) {
        if (ring_pop(&uart_rx_ring, &byte))
            process(byte);
        else
            vTaskDelay(1);
    }
}
```

## Notification 합쳐서

Polling 대신 ISR이 semaphore로 task를 깨우되, 바이트마다 give하지 않고 "task가 아직 안 깼을 때 첫 바이트에서만" give하게 합니다. 초인종을 택배 상자마다 누르지 않고 첫 상자에서 한 번만 누르는 셈입니다.

```c
// notify.c
#include "FreeRTOS.h"
#include "task.h"
#include "semphr.h"
#include "spsc.h"

extern volatile uint32_t UART_RDR;            /* receive data register of the UART */
void process(uint8_t byte);

static ring_t uart_rx_ring;
static SemaphoreHandle_t uart_sem;            /* xSemaphoreCreateBinary() */
static _Atomic bool data_ready;

void UART_IRQHandler(void)
{
    BaseType_t woken = pdFALSE;
    uint8_t byte = (uint8_t)UART_RDR;
    if (ring_push(&uart_rx_ring, byte) &&
        !atomic_load_explicit(&data_ready, memory_order_relaxed)) {
        atomic_store_explicit(&data_ready, true, memory_order_relaxed);
        xSemaphoreGiveFromISR(uart_sem, &woken);   /* only the first byte gives */
    }
    portYIELD_FROM_ISR(woken);
}

void uart_task(void *arg)
{
    (void)arg;
    for (;;) {
        xSemaphoreTake(uart_sem, portMAX_DELAY);
        atomic_store_explicit(&data_ready, false, memory_order_relaxed);
        uint8_t byte;
        while (ring_pop(&uart_rx_ring, &byte))
            process(byte);
    }
}

void uart_rx_init(void)
{
    uart_sem = xSemaphoreCreateBinary();
    xTaskCreate(uart_task, "uart", 256, NULL, 3, NULL);
}
```

`data_ready`를 읽고 쓰는 쪽은 ISR이고, task는 깨어난 직후 `false`로만 되돌립니다. 한 코어에서는 task가 ISR의 load와 store 사이에 끼어들 수 없으므로 load 후 store로 충분합니다. Task가 `false`로 되돌린 *뒤에* ring을 비우므로, 비우는 도중 들어온 바이트는 다시 give를 일으켜 놓치지 않습니다. 이 파일은 FreeRTOS-Kernel V11.2.0 헤더와 [6-12](/blog/embedded/modern-recipes/part6-12-rtos-debugging)의 `FreeRTOSConfig.h`로 다음과 같이 컴파일만 확인했고, UART 보드에서 실행하지는 않았습니다.

```text
$ arm-none-eabi-gcc -std=c11 -O2 -Wall -Wextra -ffreestanding -mthumb -mcpu=cortex-m3 -I. -I<FreeRTOSConfig dir> -I$K/include -I$K/portable/GCC/ARM_CM3 -c notify.c   (K = FreeRTOS-Kernel V11.2.0, FreeRTOSConfig.h from part6-12)
exit=0
undefined:
         U process
         U UART_RDR
         U xQueueGenericCreate
         U xQueueGiveFromISR
         U xQueueSemaphoreTake
         U xTaskCreate
ldrex/strex count: 0
```

## Vyukov MPMC Queue

생산자나 소비자가 둘 이상이면 index를 CAS로 차지해야 합니다. Dmitry Vyukov의 bounded MPMC queue는 칸마다 sequence 번호를 두고, 생산자는 자기 위치 `pos`와 칸의 sequence가 같을 때만 `enqueue_pos`를 CAS로 하나 올려 칸을 차지합니다. 원문 코드는 차이를 `intptr_t dif = (intptr_t)seq - (intptr_t)pos`로 계산해 `dif == 0`이면 시도, `dif < 0`이면 가득 참, 그 외에는 위치를 다시 읽습니다([1024cores, Bounded MPMC queue, 2022-11-27 보관본](https://web.archive.org/web/20221127075938/https://www.1024cores.net/home/lock-free-algorithms/queues/bounded-mpmc-queue)). `size_t`끼리 `seq < pos`로 비교하면 이 부호 있는 차이를 놓칩니다.

같은 문서는 이 큐를 "not lockfree in the official meaning"이고 생산자·소비자가 서로를 막을 수 있는(blocking) 큐로 분류하며, 연산마다 CAS가 한 번이라고 적습니다. 자세한 구현과 테스트는 [9-10: MPMC Queue](/blog/embedded/modern-recipes/part9-10-mpmc-queue)에서 다룹니다.

## ABA — SPSC엔 없음

Lock-free stack이나 큐에서 ABA 문제는 CAS가 "값이 A인지"만 보고 그 사이 A→B→A로 바뀐 것을 모를 때 생깁니다([9-08: ABA 문제](/blog/embedded/modern-recipes/part9-08-aba-problem)). SPSC ring에는 CAS가 없습니다.

- `head`는 producer만, `tail`은 consumer만 씁니다.
- 각 index는 쓰는 쪽이 하나뿐이라 "남이 바꿨다가 되돌렸는지"를 확인할 일이 없습니다.

## Static Allocation

ISR과 task가 같은 객체를 쓰려면 둘 다 볼 수 있는 곳에 하나만 있어야 합니다. 위 예제들은 파일 범위 `static ring_t`를 쓰므로 heap도 초기화 코드도 필요 없습니다. N1570 7.17.2.1p2는 static 저장 기간 atomic 객체의 기본(0) 초기화가 유효한 상태를 만든다고 보장합니다. 반대로 지역 변수로 둔 atomic 객체는 초기화하지 않으면 값이 정해지지 않습니다.

```c
static ring_t g_uart_ring;            /* zero-initialised: head = tail = 0, empty */

ring_t *get_uart_ring(void) { return &g_uart_ring; }
```

## DPDK rte_ring — 표준 라이브러리

DPDK의 `rte_ring`은 같은 생각을 고정 크기 포인터 ring으로 만든 라이브러리입니다. DPDK v23.11 `lib/ring/rte_ring.h`의 API는 다음과 같습니다.

```c
struct rte_ring *r = rte_ring_create("rx_ring", 1024, SOCKET_ID_ANY,
                                     RING_F_SP_ENQ | RING_F_SC_DEQ);
rte_ring_sp_enqueue(r, obj);
rte_ring_sc_dequeue(r, &obj);
```

헤더 주석에 따르면 `count`는 `RING_F_EXACT_SZ`를 주지 않는 한 2의 거듭제곱이어야 하고, 실제로 쓸 수 있는 칸은 `count - 1`입니다(`rte_ring_create()` 주석, `rte_ring.h` 128–138, 169–175행). `RING_F_SP_ENQ`·`RING_F_SC_DEQ`는 생산자·소비자가 하나라는 선언이라 이 글의 SPSC와 같은 조건입니다. 프로그래머 가이드는 장점으로 linked list 큐는 포인터 크기 CAS를 여러 번 하지만 ring은 32비트 CAS 한 번이면 된다는 점과 bulk enqueue/dequeue를 듭니다(`doc/guides/prog_guide/ring_lib.rst` 32–40행). 이 글에서는 DPDK를 빌드해 돌리지 않았습니다.

## STM32H7 — DMA UART + Ring

DMA를 circular mode로 두면 DMA가 producer가 되고, ISR 없이 task가 consumer가 될 수 있습니다. 이때 `head`는 DMA가 직접 알려 주지 않으므로 "남은 전송 수"에서 계산합니다. STM32H7 HAL의 `__HAL_DMA_GET_COUNTER()`는 "the number of remaining data units in the current DMAy Streamx transfer"를 돌려주고(stm32h7xx_hal_driver v1.11.3 `stm32h7xx_hal_dma.h` 1159–1165행), 그 값은 stream의 `NDTR` 레지스터입니다(cmsis_device_h7 v1.10.4 `stm32h743xx.h` 562행).

```c
/* DMA (circular mode) writes rx_buf; the task only reads */
static _Alignas(32) uint8_t rx_buf[RING_SIZE];   /* 32 B D-cache line */
static uint16_t rx_tail;

void uart_dma_task(void *p)
{
    (void)p;
    HAL_UART_Receive_DMA(&huart, rx_buf, RING_SIZE);
    for (;;) {
        uint16_t head = RING_SIZE - __HAL_DMA_GET_COUNTER(huart.hdmarx);
        if (head == RING_SIZE) head = 0;
        SCB_InvalidateDCache_by_Addr(rx_buf, sizeof rx_buf);   /* Cortex-M7 D-cache */
        while (rx_tail != head) {
            process(rx_buf[rx_tail]);
            rx_tail = (rx_tail + 1u) & RING_MASK;
        }
        vTaskDelay(1);
    }
}
```

`HAL_UART_Receive_DMA(UART_HandleTypeDef *huart, uint8_t *pData, uint16_t Size)`의 원형은 `stm32h7xx_hal_uart.c` 1470행입니다. STM32H743의 device header는 `__DCACHE_PRESENT`를 1로 두고(222행), CMSIS 5.9.0 `cachel1_armv7.h`의 `SCB_InvalidateDCache_by_Addr`는 32바이트 단위로 invalidate합니다(320–328행). 그래서 `rx_buf`는 32바이트 정렬·32의 배수 크기로 둡니다. 이 구조에는 "가득 참" 판정이 없습니다. Task가 한 바퀴(`RING_SIZE` 바이트) 이상 늦으면 DMA가 아직 읽지 않은 바이트를 덮어쓰고, task는 그것을 알 방법이 없습니다. 이 코드는 STM32 보드가 없어 실행하지 않았고, 위 함수 이름과 의미는 인용한 헤더와 소스에서만 확인했습니다.

## Stream Buffer — FreeRTOS Built-in

FreeRTOS의 stream buffer도 단일 writer·단일 reader를 전제로 한 바이트 ring입니다. V11.2.0 `include/stream_buffer.h`는 "Uniquely among FreeRTOS objects"라며 writer와 reader가 각각 하나라고 가정하고, 여럿이면 응용이 호출을 직렬화해야 한다고 적습니다(35–48행). 직접 만든 ring과 다른 점은 block 기능입니다. Reader는 데이터가 올 때까지 block할 수 있고, `stream_buffer.c`는 보내기가 끝나면 기다리는 task를 task notification으로 깨웁니다(`sbSEND_COMPLETED`, 146–160행).

```c
StreamBufferHandle_t sb = xStreamBufferCreate(256, 1);   /* trigger level 1 byte */

/* ISR */
xStreamBufferSendFromISR(sb, &byte, 1, &woken);
portYIELD_FROM_ISR(woken);

/* task */
size_t got = xStreamBufferReceive(sb, buf, sizeof buf, portMAX_DELAY);
```

위 Notification 절의 semaphore + 직접 만든 ring 조합을 커널이 대신해 주는 셈입니다. 두 방식의 ISR 비용은 이 글에서 측정하지 않았습니다.

## 자주 하는 실수

> ⚠️ 2의 거듭제곱이 아닌 크기에 mask를 씀

```c
#define RING_SIZE 100u
#define RING_MASK (RING_SIZE - 1u)   /* 99 = 0b1100011: & 99 is not % 100 */
```

`& 99`는 `% 100`이 아닙니다. 크기를 64나 128로 바꾸거나, 위 Power-of-2 절처럼 비교로 wrap합니다.

> ⚠️ `volatile`만으로 SMP에서 씀

위 M2 실행에서 1,000만 바이트 중 474~206,316개가 틀렸습니다. Index는 `_Atomic`으로 두고 release/acquire를 줍니다.

> ⚠️ `head`와 `tail`을 붙여 둠

```c
struct { _Atomic uint16_t head, tail; uint8_t buf[RING_SIZE]; } ring;  /* same cache line */
```

M2에서는 다섯 라운드 중 세 번은 64 B와 128 B 배치가 모두 붙인 배치보다 빨랐습니다. 그 시스템의 cache line 크기로 `_Alignas`를 줍니다.

> ⚠️ 생산자가 둘

```c
/* two ISRs at different priorities push to the same ring */
ring_push(r, b);
```

우선순위가 다른 두 ISR이 같은 ring에 넣으면 높은 쪽이 낮은 쪽의 `head` 읽기와 쓰기 사이에 끼어들어 같은 칸을 씁니다. 이 ring은 SPSC 전용입니다. 생산자가 여럿이면 넣는 구간을 인터럽트 금지로 감싸거나 MPMC 큐를 씁니다.

## 정리

- SPSC ring은 **각자 자기 index만 쓰고, 데이터를 쓴 뒤 index를 release로 공개**하는 구조입니다(N1570 5.1.2.4p11).
- `volatile` 판은 TSan이 data race 두 곳을 보고했고, M2에서 실제로 틀린 바이트를 냈습니다.
- 표준 `atomic_*` 함수의 인자는 `_Atomic` 객체입니다. clang은 `volatile uint16_t`를 거부하지만 arm-none-eabi-gcc 16.2.0은 경고 없이 받습니다.
- 크기가 2의 거듭제곱이면 `%`도 AND가 됩니다. Cortex-M0+에서 `% 100`은 `__aeabi_uidivmod` 호출입니다.
- Cortex-M에서 `_Atomic` 판의 비용은 `dmb` 두 개이고, QEMU Cortex-M3의 SysTick ISR로 20만 바이트를 순서대로 넘겼습니다.
- `head`/`tail`은 그 시스템의 cache line 크기만큼 떼어 놓습니다. 이 Mac에서는 128 B이고, 처리율 차이는 측정마다 흔들렸으므로 자기 시스템에서 다시 잽니다.

다음 편은 [9-02: Wait-Free Signaling](/blog/embedded/modern-recipes/part9-02-wait-free)입니다.

## 관련 항목

- [6-09: ISR-Safe API](/blog/embedded/modern-recipes/part6-09-isr-api)
- [9-02: Wait-Free Signaling](/blog/embedded/modern-recipes/part9-02-wait-free)
- [9-09: False Sharing](/blog/embedded/modern-recipes/part9-09-false-sharing)
- [9-10: MPMC Queue](/blog/embedded/modern-recipes/part9-10-mpmc-queue)
