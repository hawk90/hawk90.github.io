---
title: "메모리 정렬과 패딩 분석 — Natural·Strict Alignment·Trap"
slug: "embedded/modern-recipes/part8-02-memory-alignment"
date: 2026-04-17T09:01:00
description: "Natural alignment, struct padding 규칙, packed의 unaligned access penalty, offsetof와 alignof 사용을 정리합니다."
series: "Modern Embedded Recipes"
seriesOrder: 90
tags: [recipes, memory, alignment]
topics: ["embedded"]
---

## 한 줄 요약

> **"Alignment는 correctness와 성능을 함께 좌우합니다."** 같은 C 코드라도 Cortex-M0에서는 HardFault, Cortex-M3에서는 정상 동작, 설정 비트 하나를 켠 Cortex-M3에서는 다시 HardFault가 됩니다. `packed`는 wire format처럼 필요한 곳에만 쓰고, 접근은 컴파일러가 정렬을 알 수 있는 경로로 합니다.

## 어떤 상황에서 쓰나

UART나 BLE로 받은 byte stream을 struct 포인터로 캐스팅해 읽으려 할 때 가장 먼저 부딪힙니다. 송신측이 정렬을 고려하지 않은 layout을 보내면 `__attribute__((packed))`를 붙이게 되는데, 그 뒤 멤버의 주소를 `int *`로 넘기는 순간 동작이 CPU마다 갈립니다. 아래 실행에서 같은 함수가 Cortex-M3에서는 값을 읽었고 Cortex-M0에서는 HardFault를 냈습니다.

또 하나는 struct를 정의할 때입니다. 같은 field도 순서에 따라 `sizeof`가 12와 8로 갈립니다. RAM이 빠듯한 MCU에서 이런 struct를 배열로 수천 개 둔다면 그 차이가 그대로 남는 RAM입니다.

## 핵심 개념

정렬(alignment)은 "이 type의 객체는 주소가 N의 배수인 곳에만 둔다"는 규칙입니다. 책장에 큰 책은 큰 칸에만 꽂는다고 정해 두면, 작은 책 다음에 큰 책을 꽂을 때 사이에 빈 칸(padding)이 생기는 것과 같습니다. C 표준은 멤버 정렬을 구현이 정하게 하고(N1570 6.7.2.1p14, "aligned in an implementation-defined manner"), struct 안의 padding을 허용하되 맨 앞에는 두지 못하게 합니다(같은 절 p15).

32비트 Arm에서 그 "구현"은 AAPCS32입니다. AAPCS32 2025Q4의 Fundamental Data Types 표가 정하는 크기와 정렬은 다음과 같고, 오른쪽 두 칸은 이 글에서 실제로 잰 값입니다.

| Type | AAPCS32 크기 / 정렬 | `arm-none-eabi-gcc` 16.2 (M0·M3) `alignof` | Apple clang 21 (arm64 macOS) `alignof` |
| --- | --- | ---: | ---: |
| `uint8_t` | 1 / 1 | — | — |
| `uint16_t` | 2 / 2 | — | — |
| `uint32_t` | 4 / 4 | — | — |
| `long long`·`uint64_t` | 8 / 8 | 8 | 8 |
| `double` | 8 / 8 | 8 | 8 |
| pointer | 4 / 4 | `sizeof` 4 | `sizeof` 8 |

32비트 Arm에서도 `uint64_t`의 정렬은 4가 아니라 8입니다. 그래서 `char`, `int`, `long long` 순서의 struct는 `long long` 앞에 padding이 들어갑니다.

정렬되지 않은 주소로 접근했을 때 무슨 일이 생기는지는 CPU와 명령에 따라 다릅니다. 아래 [실행](#unaligned-접근--cortex-m0과-m3에서-돌려-보기)에서 확인한 결과는 다음과 같습니다(QEMU 11.1.3 `microbit` = Cortex-M0, `mps2-an385` = Cortex-M3).

| 접근 | Cortex-M0 | Cortex-M3 | Cortex-M3 + `CCR.UNALIGN_TRP` |
| --- | --- | --- | --- |
| unaligned `LDR`(word) | HardFault | 읽힘 | HardFault (CFSR.UNALIGNED) |
| unaligned `LDRD` | 명령 없음 | HardFault (CFSR.UNALIGNED) | HardFault |
| byte 단위 `LDRB`로 조립 | 읽힘 | 읽힘 | 읽힘 |

## 코드 / 실제 사용 예

### Struct padding 규칙

```c
struct s1 {
    char  a;        /* offset 0 */
    /* padding 3 byte */
    int   b;        /* offset 4 */
    char  c;        /* offset 8 */
    /* padding 3 byte */
};
/* sizeof(s1) = 12 */

struct s2 {
    int   b;        /* offset 0 */
    char  a;        /* offset 4 */
    char  c;        /* offset 5 */
    /* padding 2 byte */
};
/* sizeof(s2) = 8 — 4 byte(33%) smaller */
```

정렬이 큰 type을 앞에, 작은 type을 뒤에 두면 padding이 줄어듭니다. 끝에 padding이 남는 것은 배열의 다음 원소도 `int` 정렬을 지켜야 하기 때문입니다.

### offsetof, alignof, sizeof로 확인하기

layout은 짐작하지 말고 컴파일러에게 물어봅니다. 아래 프로그램은 이 글의 struct를 모두 출력합니다. `HOSTED`를 정의하면 `printf`로, 아니면 semihosting으로 찍습니다(`bm.h`는 [재현 환경](#재현-환경)에 있습니다).

```c
#include <stddef.h>
#include <stdint.h>
#include <stdalign.h>

#ifdef HOSTED
#include <stdio.h>
#define SHOW(expr) printf("%-36s = %u\n", #expr, (unsigned)(expr))
#define DONE() return 0
#else
#include "bm.h"
#define SHOW(expr) do { puts_(#expr " = "); putu((unsigned)(expr)); puts_("\n"); } while (0)
#define DONE() exit_()
#endif

struct s1 { char a; int b; char c; };
struct s2 { int b; char a; char c; };
struct s  { char a; int b; long long c; };
struct frame { uint8_t type; uint8_t flags; uint16_t len; uint32_t payload; };
struct __attribute__((packed)) sensor_packet {
    uint8_t sof; uint16_t length; uint32_t timestamp; int16_t data[8]; uint16_t crc;
};

int main(void)
{
    SHOW(alignof(long long));
    SHOW(alignof(double));
    SHOW(sizeof(void *));
    SHOW(sizeof(struct s1));
    SHOW(sizeof(struct s2));
    SHOW(sizeof(struct s));
    SHOW(offsetof(struct s, b));
    SHOW(offsetof(struct s, c));
    SHOW(alignof(struct s));
    SHOW(sizeof(struct frame));
    SHOW(offsetof(struct frame, len));
    SHOW(sizeof(struct sensor_packet));
    SHOW(alignof(struct sensor_packet));
    DONE();
}
```

Cortex-M3·M0(32비트)과 Apple Silicon Mac(64비트)에서 돌린 결과입니다. 포인터 크기를 빼면 모든 값이 같습니다.

```text
== mps2-an385 (cortex-m3)
alignof(long long) = 8
alignof(double) = 8
sizeof(void *) = 4
sizeof(struct s1) = 12
sizeof(struct s2) = 8
sizeof(struct s) = 16
offsetof(struct s, b) = 4
offsetof(struct s, c) = 8
alignof(struct s) = 8
sizeof(struct frame) = 8
offsetof(struct frame, len) = 2
sizeof(struct sensor_packet) = 25
alignof(struct sensor_packet) = 1
```

```text
Apple clang version 21.0.0 (clang-2100.4.1.1)
arm64
alignof(long long)                   = 8
alignof(double)                      = 8
sizeof(void *)                       = 8
sizeof(struct s1)                    = 12
sizeof(struct s2)                    = 8
sizeof(struct s)                     = 16
offsetof(struct s, b)                = 4
offsetof(struct s, c)                = 8
alignof(struct s)                    = 8
sizeof(struct frame)                 = 8
offsetof(struct frame, len)          = 2
sizeof(struct sensor_packet)         = 25
alignof(struct sensor_packet)        = 1
```

### `_Static_assert`로 layout 고정

```c
struct frame {
    uint8_t  type;
    uint8_t  flags;
    uint16_t len;
    uint32_t payload;
};

_Static_assert(sizeof(struct frame) == 8, "frame layout drift");
_Static_assert(offsetof(struct frame, len) == 2, "len position");
```

컴파일 시점에 layout이 바뀌면 빌드가 실패합니다. 위 실행에서 `sizeof(struct frame)` = 8, `offsetof(struct frame, len)` = 2였으므로 이 assert는 세 환경 모두에서 통과합니다.

### Unaligned 접근 — Cortex-M0과 M3에서 돌려 보기

같은 4 byte를 네 가지 방법으로 읽습니다. `buf + 1`은 4의 배수가 아닌 주소이고, `struct bad`의 `b`도 offset 1에 있습니다. HardFault handler는 몇 번째 단계에서 멈췄는지와, Cortex-M3에서는 fault 상태 레지스터 CFSR(`0xE000ED28`)·HFSR(`0xE000ED2C`)을 찍습니다.

```c
#include "bm.h"

void *memcpy(void *d, const void *s, size_t n);
struct __attribute__((packed)) bad { char a; int b; };

static struct bad p = { 'x', 0x11223344 };
static uint8_t buf[16] __attribute__((aligned(4))) = { 0, 0x44, 0x33, 0x22, 0x11, 0x88, 0x77, 0x66, 0x55 };
static volatile int step;

void HardFault_Handler(void)
{
    puts_("HardFault in step "); putu(step);
#if defined(__ARM_ARCH_7M__) || defined(__ARM_ARCH_7EM__)
    puts_(", CFSR="); putx(*(volatile uint32_t *)0xE000ED28);
    puts_(" HFSR="); putx(*(volatile uint32_t *)0xE000ED2C);
#endif
    puts_("\n");
    exit_();
}

__attribute__((noinline)) int read_member(struct bad *x) { return x->b; }
__attribute__((noinline)) int read_memcpy(const void *src) { int v; memcpy(&v, src, sizeof v); return v; }
__attribute__((noinline)) int read_cast(const void *src) { return *(const int *)src; }
#if defined(__ARM_ARCH_7M__) || defined(__ARM_ARCH_7EM__)
__attribute__((noinline)) uint64_t read_ldrd(const void *src)
{
    uint32_t lo, hi;
    __asm volatile("ldrd %0, %1, [%2]" : "=r"(lo), "=r"(hi) : "r"(src));
    return ((uint64_t)hi << 32) | lo;
}
#endif

void *memcpy(void *d, const void *s, size_t n) { uint8_t *o = d; const uint8_t *i = s; while (n--) *o++ = *i++; return d; }

int main(void)
{
#ifdef TRAP
    *(volatile uint32_t *)0xE000ED14 |= 1u << 3;      /* CCR.UNALIGN_TRP */
    puts_("CCR.UNALIGN_TRP = 1\n");
#endif
    step = 1; puts_("1 packed member : "); putx((unsigned)read_member(&p)); puts_("\n");
    step = 2; puts_("2 memcpy        : "); putx((unsigned)read_memcpy(buf + 1)); puts_("\n");
    step = 3; puts_("3 (int *) cast  : "); putx((unsigned)read_cast(buf + 1)); puts_("\n");
#if defined(__ARM_ARCH_7M__) || defined(__ARM_ARCH_7EM__)
    step = 4; puts_("4 ldrd          : "); putx((unsigned)read_ldrd(buf + 1)); puts_("\n");
#endif
    puts_("done\n");
    exit_();
}
```

```text
== mps2-an385 (cortex-m3)
1 packed member : 0x11223344
2 memcpy        : 0x11223344
3 (int *) cast  : 0x11223344
4 ldrd          : HardFault in step 4, CFSR=0x01000000 HFSR=0x40000000
== microbit (cortex-m0)
1 packed member : 0x11223344
2 memcpy        : 0x11223344
3 (int *) cast  : HardFault in step 3
== mps2-an385 (cortex-m3), -DTRAP
CCR.UNALIGN_TRP = 1
1 packed member : HardFault in step 1, CFSR=0x01000000 HFSR=0x40000000
```

CFSR `0x01000000`은 bit 24, HFSR `0x40000000`은 bit 30입니다. CMSIS 5.9.0 `core_cm3.h`에서 bit 24는 `SCB_CFSR_UNALIGNED_Pos`(UFSR 시작 16 + 8), bit 30은 `SCB_HFSR_FORCED_Pos`입니다. UsageFault handler를 따로 켜지 않았으므로 unaligned UsageFault가 HardFault로 올라간 것(FORCED)입니다. `CCR.UNALIGN_TRP`는 `core_cm3.h`의 `SCB_CCR_UNALIGN_TRP_Pos` = 3입니다.

결과가 갈린 이유는 컴파일러가 만든 명령에 있습니다. 같은 `read_member`와 `read_cast`를 디스어셈블하면 다음과 같습니다.

```text
== cortex-m0
00000150 <read_member>:
 150:	ldrb	r2, [r0, #2]
 152:	ldrb	r3, [r0, #1]
 154:	lsls	r2, r2, #8
 156:	orrs	r2, r3
 158:	ldrb	r3, [r0, #3]
 15a:	ldrb	r0, [r0, #4]
 15c:	lsls	r3, r3, #16
 15e:	orrs	r3, r2
 160:	lsls	r0, r0, #24
 162:	orrs	r0, r3
 164:	bx	lr
 166:	nop			@ (mov r8, r8)

00000180 <read_cast>:
 180:	ldr	r0, [r0, #0]
 182:	bx	lr

== cortex-m3
00000198 <read_member>:
 198:	ldr.w	r0, [r0, #1]
 19c:	bx	lr
 19e:	nop

000001a4 <read_cast>:
 1a4:	ldr	r0, [r0, #0]
 1a6:	bx	lr
```

- **Cortex-M0용 `read_member`는 `ldrb` 네 번으로 조립합니다.** 컴파일러는 `packed` 멤버가 정렬되지 않았을 수 있음을 알고, unaligned `LDR`이 없는 ARMv6-M에서는 byte 접근을 씁니다. 그래서 1단계는 M0에서도 성공했습니다.
- **`read_cast`는 두 CPU 모두 `ldr` 하나입니다.** `int *`로 바뀐 순간 컴파일러는 주소가 정렬됐다고 가정합니다. C 표준도 정렬이 맞지 않는 포인터로의 변환을 미정의 동작으로 둡니다(N1570 6.3.2.3p7). M0에서는 이 `ldr`이 HardFault를 냈습니다.
- **Cortex-M3용 `read_member`는 `ldr.w` 하나입니다.** M3가 unaligned word 접근을 처리하므로 컴파일러가 byte 조립을 생략했습니다. 그래서 `CCR.UNALIGN_TRP`를 켜면 `packed` 멤버를 그냥 읽는 1단계부터 멈춥니다.
- **`LDRD`는 M3에서도 unaligned를 받지 않았습니다.** 64비트 값을 두 레지스터로 읽는 명령이라, 컴파일러가 정렬된 `uint64_t *`로 알고 이 명령을 고르면 unaligned 주소에서 fault가 납니다.

`memcpy`로 읽은 2단계는 세 경우 모두 성공했습니다. 이 글의 `memcpy`는 byte 루프지만, newlib이나 컴파일러 내장 `memcpy`도 정렬을 가정하지 않는 것이 `memcpy`의 계약입니다(N1570 7.24.2.1은 "copies n characters"라고만 정의합니다).

### Packed의 올바른 쓰임 — wire format

```c
/* wire format shared with an external device */
struct __attribute__((packed)) sensor_packet {
    uint8_t  sof;
    uint16_t length;     /* little-endian on the wire */
    uint32_t timestamp;
    int16_t  data[8];
    uint16_t crc;
};

_Static_assert(sizeof(struct sensor_packet) == 25, "wire format");
```

이 경우 `packed`가 목적입니다. 위 실행에서 `sizeof` 25, `alignof` 1이었습니다. 멤버는 `pkt.length`처럼 직접 읽고(컴파일러가 CPU에 맞는 명령을 고릅니다), 멤버 주소를 `uint16_t *`로 다른 함수에 넘기지 않습니다. 넘겨야 한다면 `memcpy`로 정렬된 지역 변수에 꺼냅니다. byte 순서는 `packed`가 해결하지 않으므로 다른 endianness의 장치와 주고받는다면 변환을 따로 합니다.

### Explicit alignment

DMA buffer나 cache line 단위로 둘 객체는 시작 주소를 명시합니다. 아래 선언을 `arm-none-eabi-gcc` 16.2.0과 Apple clang 21로 `-std=c11 -c`해 assert가 모두 통과하는 것을 확인했습니다.

```c
#include <stdalign.h>
#include <stdint.h>
struct hot { alignas(64) int a; };                       /* C11: on a member */
__attribute__((aligned(64))) struct x { int a; } y;     /* GCC attribute before 'struct' */
struct __attribute__((aligned(64))) z { int a; };       /* attribute on the type */
alignas(8) static uint8_t dma_buf[1024];
_Static_assert(alignof(struct hot) == 64, "hot");
_Static_assert(alignof(struct z) == 64, "z");
_Static_assert(sizeof(struct hot) == 64, "hot size");
int y_align = __alignof__(y), x_align = alignof(struct x);
```

세 가지를 구분해야 합니다.

- C11의 `alignas`는 객체와 멤버에 붙습니다. C++처럼 `struct alignas(64) hot { ... };`라고 쓰면 C에서는 컴파일되지 않습니다(gcc: `expected '{' before '_Alignas'`, clang: `declaration of anonymous struct must be a definition`). type 자체를 64 정렬로 만들려면 첫 멤버에 `alignas(64)`를 붙이거나 GCC 속성 `struct __attribute__((aligned(64))) z`를 씁니다.
- `__attribute__((aligned(64))) struct x { int a; } y;`처럼 속성을 `struct` 앞에 두면 type이 아니라 변수 `y`에 붙습니다. 위 `.data`를 읽으면 두 컴파일러 모두 `__alignof__(y)` = 64, `alignof(struct x)` = 4였습니다.
- type을 정렬하면 `sizeof`도 정렬의 배수로 늘어납니다. `struct hot`은 `int` 하나인데 `sizeof`가 64입니다.

### Stack 위의 over-aligned 변수

AAPCS32는 public interface에서 "SP mod 8 = 0"만 요구하고(Stack constraints at a public interface), AAPCS64는 "SP mod 16 = 0"을 요구합니다. 그보다 큰 정렬을 지역 변수에 요구하면 어떻게 되는지 직접 봅니다. `g`는 VLA로 SP를 64의 배수가 아닌 만큼 옮긴 뒤 `f`를 부릅니다.

```c
#include <stdalign.h>
#ifdef HOSTED
#include <stdio.h>
#include <stdint.h>
#define SHOWADDR(tag, p) printf("%s: addr %% 64 = %u\n", tag, (unsigned)((uintptr_t)(p) % 64))
#else
#include "bm.h"
#define SHOWADDR(tag, p) do { puts_(tag ": addr % 64 = "); putu((unsigned)((uintptr_t)(p) % 64)); puts_("\n"); } while (0)
#endif

__attribute__((noinline)) void use(volatile char *p) { p[0] = 1; }

__attribute__((noinline)) void f(int depth)
{
    alignas(64) char buf[64];
    use(buf);
    SHOWADDR("alignas(64) local", buf);
    if (depth) f(depth - 1);      /* different SP on each call */
}

__attribute__((noinline)) void g(int depth)
{
    char pad[depth * 4 + 1];      /* moves SP by a non-multiple of 64 */
    use(pad);
    f(0);
}

int main(void)
{
    f(2);
    for (int d = 1; d <= 3; d++) g(d);
#ifndef HOSTED
    exit_();
#endif
    return 0;
}
```

```text
== mps2-an385 (cortex-m3), arm-none-eabi-gcc 16.2.0 -O2
alignas(64) local: addr % 64 = 0
alignas(64) local: addr % 64 = 0
alignas(64) local: addr % 64 = 0
alignas(64) local: addr % 64 = 0
alignas(64) local: addr % 64 = 0
alignas(64) local: addr % 64 = 0
== host arm64, Apple clang version 21.0.0 (clang-2100.4.1.1) -O2
alignas(64) local: addr % 64 = 0
alignas(64) local: addr % 64 = 0
alignas(64) local: addr % 64 = 0
alignas(64) local: addr % 64 = 0
alignas(64) local: addr % 64 = 0
alignas(64) local: addr % 64 = 0
```

두 컴파일러 모두 모든 호출에서 64 정렬을 지켰습니다. Cortex-M3용 `f`의 앞부분을 보면 방법이 보입니다.

```text
000000c0 <f>:
  c0:	push	{r4, lr}
  c2:	sub	sp, #136	@ 0x88
  c4:	add.w	r4, sp, #79	@ 0x4f
  c8:	mov	r2, r0
  ca:	bic.w	r4, r4, #63	@ 0x3f
  ce:	b.n	d2 <f+0x12>
  d0:	subs	r2, #1
  d2:	mov	r0, r4
  d4:	bl	b8 <use>
  d8:	ldr	r1, [pc, #32]	@ (fc <f+0x3c>)
  da:	movs	r0, #4
  dc:	bkpt	0x00ab
  de:	movs	r3, #48	@ 0x30
```

64 B 배열 하나에 frame을 136 B 잡고(`sub sp, #136`), `sp + 79`를 `bic #63`으로 내려 64의 배수 주소를 만듭니다. 정렬은 지켜지지만 frame이 그만큼 커지므로, 작은 task stack에서는 이런 변수를 `static`으로 옮기는 편이 stack을 아낍니다.

## 측정 / 성능 비교

이 글은 실행 결과(fault 여부, 명령 선택, layout)만 측정했습니다. unaligned 접근이 정렬된 접근보다 몇 사이클 더 드는지는 QEMU로 잴 수 없습니다. QEMU의 `-icount`도 "does not provide cycle accurate emulation"이라고 문서에 적혀 있습니다(QEMU v11.1.0 `qemu-options.hx`). 사이클 비용이 중요하다면 대상 보드에서 DWT `CYCCNT`로 `read_cast`와 `read_memcpy`를 각각 재 봅니다.

RAM 쪽 효과는 위 실행에서 바로 셀 수 있습니다. `struct s1`을 1,000개 배열로 두면 12,000 B, 같은 field를 재배열한 `struct s2`는 8,000 B입니다.

## 자주 보는 함정

> ⚠️ in-memory struct에 `packed`

```c
struct __attribute__((packed)) cfg {
    char a;
    int  b;
};
```

`cfg.b`를 직접 읽는 코드는 M0에서도 동작합니다(위 1단계). 문제는 `&cfg.b`를 `int *`로 넘기는 순간 생깁니다(3단계). 그리고 M3용 코드는 unaligned `LDR`에 기대므로 `CCR.UNALIGN_TRP`를 켠 시스템에서는 직접 읽기부터 멈춥니다. 외부와 주고받지 않는 struct라면 `packed`를 빼고 field 순서로 padding을 줄입니다.

> ⚠️ buffer를 struct 포인터로 cast

```c
struct frame *p = (struct frame *)buf;   /* buf + 1 etc. may be unaligned */
int v = p->len;
```

정렬이 맞지 않는 포인터 변환은 C 표준에서 미정의 동작이고(6.3.2.3p7), 위 3단계처럼 M0에서는 HardFault가 됩니다. `memcpy(&s, buf, sizeof s)`로 정렬된 지역 변수에 복사합니다.

> ⚠️ Bit-field를 wire format으로

같은 bit-field 선언도 ABI와 endianness에 따라 byte가 달라집니다. 아래 struct를 `-mlittle-endian`과 `-mbig-endian`으로 각각 컴파일해 `.data`를 덤프했습니다.

```c
struct bf { unsigned a : 3; unsigned b : 5; unsigned c : 8; };
struct bf v = { .a = 5, .b = 17, .c = 0xAB };   /* 101, 10001, 10101011 */
```

```text
== arm-none-eabi-gcc -mlittle-endian
 0000 8dab0000                             ....            
== arm-none-eabi-gcc -mbig-endian
 0000 b1ab0000                             ....            
```

little-endian에서는 첫 byte가 `0x8d`(`10001` `101`, `a`가 하위 bit), big-endian에서는 `0xb1`(`101` `10001`, `a`가 상위 bit)입니다. C 표준은 한 단위 안에서 bit-field를 높은 bit부터 채울지 낮은 bit부터 채울지를 구현이 정하게 하고(N1570 6.7.2.1p11), AAPCS32는 Bit-fields 절에서 Arm용 규칙을 정합니다. 다른 컴파일러·CPU와 주고받는 format에는 bit-field 대신 shift와 mask를 씁니다.

> ⚠️ `sizeof`를 숫자로 가정

```c
char buf[12];
struct s msg;
memcpy(buf, &msg, sizeof(buf));    /* sizeof(struct s) is 16 here */
```

위 실행에서 `sizeof(struct s)`는 16이었습니다. 복사 크기는 `sizeof(struct s)`로 쓰고, wire size는 `_Static_assert`로 고정합니다.

## 재현 환경

도구는 `arm-none-eabi-gcc` 16.2.0(Homebrew, newlib 없음), QEMU 11.1.3, Apple clang 21.0.0입니다. bare-metal 프로그램은 C 라이브러리 없이 semihosting으로 출력하고 끝냅니다.

```c
/* bm.h */
/* bare-metal helpers: semihosting output/exit, works on any Cortex-M QEMU machine */
#include <stdint.h>
#include <stddef.h>

static inline int semihost(int op, const void *arg)
{
    register int r0 __asm("r0") = op;
    register const void *r1 __asm("r1") = arg;
    __asm volatile("bkpt 0xab" : "+r"(r0) : "r"(r1) : "memory");
    return r0;
}
static __attribute__((unused)) void puts_(const char *s) { semihost(0x04, s); }           /* SYS_WRITE0 */
static __attribute__((unused)) void putu(unsigned v)
{
    char b[12]; int i = 11; b[i] = 0;
    do { b[--i] = (char)('0' + v % 10); v /= 10; } while (v);
    puts_(&b[i]);
}
static __attribute__((unused)) void putx(unsigned v)
{
    char b[11] = "0x00000000";
    for (int i = 9; i >= 2; i--, v >>= 4) b[i] = "0123456789abcdef"[v & 15];
    puts_(b);
}
static __attribute__((unused)) void exit_(void) { static const uint32_t a[2] = { 0x20026, 0 }; semihost(0x18, a); for (;;) { } }
```

```c
/* startup_bm.c */
#include <stdint.h>
#include "bm.h"
extern uint32_t _etext, _sdata, _edata, _sbss, _ebss, _estack;
int main(void);
__attribute__((weak)) void HardFault_Handler(void) { puts_("HardFault\n"); exit_(); }
void Reset_Handler(void)
{
    uint32_t *s = &_etext, *d = &_sdata;
    while (d < &_edata) *d++ = *s++;
    for (d = &_sbss; d < &_ebss;) *d++ = 0;
    main();
    for (;;) { }
}
__attribute__((section(".vectors"), used))
void (*const vectors[16])(void) = {
    (void (*)(void))&_estack, Reset_Handler, HardFault_Handler, HardFault_Handler,
    HardFault_Handler, HardFault_Handler, HardFault_Handler,
};
```

`link-an385.ld`는 [6-12의 `link.ld`](/blog/embedded/modern-recipes/part6-12-rtos-debugging#재현-환경)와 같고, `link-microbit.ld`는 그 파일에서 FLASH 길이를 `256K`, RAM 길이를 `16K`로 바꾼 것입니다. QEMU `microbit`은 nRF51(Cortex-M0)이고 flash 256 page·SRAM 16 page(page 1 KiB)를 `0x0`·`0x20000000`에 둡니다(QEMU v11.1.0 `hw/arm/nrf51_soc.c`, `include/hw/arm/nrf51.h`).

```bash
#!/bin/bash
# usage: run-arm.sh prog.c   -> builds for Cortex-M3 (mps2-an385) and Cortex-M0 (microbit), runs both
p=${1%.c}; shift
CF="-O2 -g -ffreestanding -nostdlib -fno-builtin -mthumb"
for m in "mps2-an385 cortex-m3 link-an385.ld" "microbit cortex-m0 link-microbit.ld"; do
  set -- $m
  arm-none-eabi-gcc $CF -mcpu=$2 -T $3 -o $p-$2.elf startup_bm.c $p.c -lgcc
  echo "== $1 ($2)"
  timeout 10 qemu-system-arm -M $1 -nographic -semihosting -kernel $p-$2.elf
done
```

`./run-arm.sh layout.c`, `./run-arm.sh unal.c`처럼 부릅니다. `CCR.UNALIGN_TRP` 변형은 같은 gcc 명령에 `-DTRAP -mcpu=cortex-m3`를 주고 `mps2-an385`에서 돌립니다. Mac 쪽은 `cc -std=c11 -O2 -DHOSTED layout.c && ./a.out`입니다. bit-field 덤프는 `arm-none-eabi-gcc -std=c11 -ffreestanding -mcpu=cortex-m3 -mthumb -mbig-endian -c bf.c`(또는 `-mlittle-endian`) 뒤 `arm-none-eabi-objdump -s -j .data bf.o`입니다.

## 정리

- AAPCS32에서 `long long`·`double`의 정렬은 8입니다. 32비트 Arm이라고 `uint64_t`가 4 정렬인 것은 아닙니다.
- field를 정렬이 큰 순서로 두면 이 글의 예에서 `sizeof`가 12에서 8로 줄었습니다.
- unaligned word 읽기는 QEMU Cortex-M0에서 HardFault, Cortex-M3에서 정상, `CCR.UNALIGN_TRP`를 켠 M3에서 HardFault였습니다. M3에서도 `LDRD`는 fault가 났습니다.
- `packed` 멤버를 직접 읽으면 컴파일러가 CPU에 맞는 명령을 고르지만, 멤버 주소를 일반 포인터로 넘기면 그 보호가 사라집니다.
- C11 `alignas`는 객체와 멤버에 붙고, `struct alignas(64)`는 C에서 컴파일되지 않습니다.
- stack의 `alignas(64)`는 두 컴파일러 모두 지켰지만 frame이 커졌습니다(64 B 배열에 136 B).
- bit-field의 byte 배치는 endianness에 따라 달라지므로 wire format에는 shift·mask를 씁니다.

다음 편은 **Cache Line Alignment**입니다. False sharing 회피와 SoA 변환을 다룹니다.

## 관련 항목

- [8-01: 동적 메모리](/blog/embedded/modern-recipes/part8-01-dynamic-memory)
- [8-03: Cache Line Alignment](/blog/embedded/modern-recipes/part8-03-cache-alignment)
- [9-09: False sharing 해결](/blog/embedded/modern-recipes/part9-09-false-sharing)
- [PE 2-05: Cache Basics](/blog/embedded/performance-engineering/part2-05-cache-basics)
