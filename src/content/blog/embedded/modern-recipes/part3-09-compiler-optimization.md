---
title: "임베디드 컴파일러 최적화 분석 — -O0~-O3·-Os·-LTO 비교"
slug: "embedded/modern-recipes/part3-09-compiler-optimization"
date: 2026-04-12T09:31:00
description: "-O0/-O1/-O2/-O3/-Os/-Og — 옵션별 차이와 디버깅 가능성."
series: "Modern Embedded Recipes"
seriesOrder: 31
tags: [recipes, toolchain, optimization]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> **"`-O` 레벨은 컴파일러에게 얼마나 적극적으로 변환할지를 알려 줍니다."** 같은 함수도 `-O0`의 31줄 assembly가 `-O2`에서 12줄이 되고, 어느 레벨이 가장 작은지는 실제로 빌드해 봐야 압니다.

## 어떤 상황에서 쓰나

- Flash가 부족해 코드 크기를 줄여야 할 때
- 핫 루프 성능을 끌어올려야 할 때
- 디버깅이 안 될 정도로 변수가 사라졌을 때
- LTO를 적용했더니 갑자기 코드가 깨질 때

이 글의 출력은 Debian 13 arm64 guest의 `gcc-arm-none-eabi` 14.2.rel1(GCC 14.2.1, `-mcpu=cortex-m4 -mthumb`)과 host용 GCC 14.2.0·GDB 16.3에서 직접 뽑았습니다. 각 레벨의 정의는 GCC 매뉴얼 "Options That Control Optimization"에서 옮겼습니다.

## 핵심 개념

### 1) -O 레벨

| 레벨 | GCC 매뉴얼의 설명 | 일반 사용 |
| --- | --- | --- |
| `-O0` | 기본값. "completely disables most optimization passes" | 디버그 |
| `-O1` | 크기와 실행 시간을 줄이되 "optimizations that take a great deal of compilation time"은 하지 않음 | 빌드·크기 절충 |
| `-O2` | `-O1` + 더 많은 최적화. GCC 14는 여기서 `-ftree-loop-vectorize`·`-ftree-slp-vectorize`도 켬 | release에서 흔히 사용 |
| `-O3` | `-O2` + `-fipa-cp-clone`, `-floop-interchange`, `-fpeel-loops` 등 | 측정한 핫스팟 |
| `-Os` | `-O2`에서 코드 크기를 늘리기 쉬운 옵션(`-falign-functions` 등)을 뺌 | flash 제약이 있는 빌드 |
| `-Og` | "Optimize while keeping in mind debugging experience" | 개발 중 |
| `-Ofast` | `-O3` + `-ffast-math`, `-fallow-store-data-races` 등 표준 위반 허용 | 측정 후 사용 |

각 레벨은 개별 `-f` 옵션의 묶음입니다. 매뉴얼은 정확한 목록을 `-Q --help=optimizers`로 확인하라고 적고, target과 GCC 구성에 따라 조금씩 다르다고 덧붙입니다. 이전 판은 vectorization을 `-O3`의 특징으로 적었지만, GCC 14 매뉴얼의 `-O2` 목록에 이미 `-ftree-loop-vectorize`가 있습니다.

### 2) 각 레벨의 효과 비교

```c
int sum(const int *arr, int n) {
    int s = 0;
    for (int i = 0; i < n; i++) s += arr[i];
    return s;
}
```

`arm-none-eabi-gcc -mcpu=cortex-m4 -mthumb -O<level> -S sum.c`에서 지시어를 뺀 명령만 남겼습니다.

`-O0`:

```asm
sum:
	push	{r7}
	sub	sp, sp, #20
	add	r7, sp, #0
	str	r0, [r7, #4]
	str	r1, [r7]
	movs	r3, #0
	str	r3, [r7, #12]
	movs	r3, #0
	str	r3, [r7, #8]
	b	.L2
	ldr	r3, [r7, #8]
	lsls	r3, r3, #2
	ldr	r2, [r7, #4]
	add	r3, r3, r2
	ldr	r3, [r3]
	ldr	r2, [r7, #12]
	add	r3, r3, r2
	str	r3, [r7, #12]
	ldr	r3, [r7, #8]
	adds	r3, r3, #1
	str	r3, [r7, #8]
	ldr	r2, [r7, #8]
	ldr	r3, [r7]
	cmp	r2, r3
	blt	.L3
	ldr	r3, [r7, #12]
	mov	r0, r3
	adds	r7, r7, #20
	mov	sp, r7
	pop	{r7}
	bx	lr
```

`-O2` (`-O3`도 `cmp` operand 순서만 다르고 같음):

```asm
sum:
	cmp	r1, #0
	ble	.L4
	subs	r3, r0, #4
	add	r1, r3, r1, lsl #2
	movs	r0, #0
	ldr	r2, [r3, #4]!
	cmp	r3, r1
	add	r0, r0, r2
	bne	.L3
	bx	lr
	movs	r0, #0
	bx	lr
```

`-Os`:

```asm
sum:
	push	{r4, lr}
	movs	r3, #0
	mov	r2, r0
	mov	r0, r3
	cmp	r3, r1
	blt	.L3
	pop	{r4, pc}
	ldr	r4, [r2, r3, lsl #2]
	adds	r3, r3, #1
	add	r0, r0, r4
	b	.L2
```

`-O0`은 `s`와 `i`를 매번 stack(`[r7, #8]`, `[r7, #12]`)에 저장하고 다시 읽습니다. `-O2`는 둘을 register에 두고 index 대신 post-increment 주소(`ldr r2, [r3, #4]!`)로 바꿨습니다. `-Os`는 `n == 0`을 위한 별도 반환 경로를 두지 않아 명령 수가 줄었습니다. Cortex-M4에는 벡터 명령이 없으므로 `-O3`에서도 이 루프는 벡터화되지 않았습니다(MVE가 있는 Cortex-M55의 경우는 [2-01](/blog/embedded/modern-recipes/part2-01-cortex-m-comparison) 참고).

### 3) `-Os` — 크기 최적화

CRC-32, insertion sort, Q15 FIR, 문자열→정수 변환을 담은 작은 `work.c`를 레벨마다 object로 컴파일해 `.text` 크기를 쟀습니다.

| 레벨 | `work.o` text (byte) |
| --- | ---: |
| `-O0` | 456 |
| `-O1` | 288 |
| `-O2` | 284 |
| `-O3` | 344 |
| `-Os` | 196 |
| `-Og` | 256 |

이 코드에서는 `-Os`가 가장 작고, `-O3`는 `-O2`보다 21% 컸습니다. 숫자는 이 코드와 이 GCC의 결과일 뿐이라, 실제 프로젝트에서는 map 파일([3-10](/blog/embedded/modern-recipes/part3-10-map-file-analysis))로 다시 봅니다. 속도는 QEMU로 잴 수 없어 이 글에서는 비교하지 않았습니다.

### 4) `-Og` — 디버그 친화

GCC 매뉴얼은 `-Og`를 "the optimization level of choice for the standard edit-compile-debug cycle"이라고 부르고, `-O0`과 달리 `-fvar-tracking-assignments`·`-fvar-tracking`을 켜서 함수 앞뒤의 디버그 정보를 더 잘 다룬다고 적습니다.

그렇다고 `-Og`가 항상 변수를 더 잘 보여 주는 것은 아닙니다. host GCC 14.2.0으로 아래 함수를 `-O2 -g`와 `-Og -g`로 빌드하고 GDB 16.3에서 `break scale`, `info locals`를 실행했습니다.

```c
__attribute__((noinline)) int scale(int v) {
    int doubled = v * 2;
    int result = doubled + 3;
    return result;
}
```

```text
### -O2 -g
Breakpoint 1, scale (v=1) at opt.c:5
5	    return result;
doubled = 2
result = 5
### -Og -g
Breakpoint 1, scale (v=1) at opt.c:3
3	    int doubled = v * 2;
doubled = <optimized out>
result = <optimized out>
```

`-O2`는 3~4행을 합쳐 breakpoint가 5행에 걸렸고, DWARF location 정보로 두 값을 복원했습니다. `-Og`는 3행, 곧 값을 계산하기 전에 멈춰 둘 다 `<optimized out>`입니다. `<optimized out>`은 레벨만이 아니라 *어디서 멈췄는지*에 달려 있으므로, 한 줄 더 진행(`next`)하고 다시 보는 것이 첫 번째 확인입니다.

### 5) LTO (Link-Time Optimization)

`-flto`로 활성화합니다. 각 `.o`에 중간 표현을 넣어 두고 link 단계에서 다시 최적화하므로, file 경계를 넘는 inline과 미사용 함수 제거가 가능합니다.

```c
/* a.c */
int helper(int x) { return x * 3 + 1; }
int unused_helper(int x) { return x - 7; }
/* b.c */
int helper(int x);
int app(int y) { return helper(y) + helper(y + 1); }
int main(void) { return app(4); }
```

```text
$ arm-none-eabi-gcc -mcpu=cortex-m4 -mthumb -O2 -nostdlib -Wl,-e,main a.c b.c -o nolto.elf
$ arm-none-eabi-nm nolto.elf | grep " T "
00008014 T app
00008008 T helper
00008000 T main
00008010 T unused_helper
$ arm-none-eabi-gcc ... -flto a.c b.c -o lto.elf
$ arm-none-eabi-nm lto.elf | grep " T "
00008000 T main
$ arm-none-eabi-objdump -d lto.elf
00008000 <main>:
    8000:	201d      	movs	r0, #29
    8002:	4770      	bx	lr
```

LTO 없이는 `b.c`가 `a.c`의 `helper`를 볼 수 없어 함수 네 개가 모두 남습니다. LTO를 켜면 `helper(4) + helper(5) = 13 + 16 = 29`를 link 단계에서 계산해 `main`이 상수 29를 반환하는 두 명령만 남았습니다. 그 대가로 link 단계가 컴파일 일을 떠맡아 빌드가 느려집니다.

### 6) PGO (Profile-Guided Optimization)

실행 profile을 모아(`-fprofile-generate`) 다시 컴파일(`-fprofile-use`)하는 기법입니다. profile을 쓰려면 target에서 실행 결과를 파일로 내보낼 수 있어야 하므로, bare-metal에서는 그 경로(semihosting 등)를 먼저 마련해야 합니다. 이 글에서는 실행하지 않았습니다.

## 코드 / 실제 사용 예

함수별 최적화 옵션 제어:

```c
// 이 함수만 -O3로 (속도 critical)
__attribute__((optimize("O3")))
void hot_loop(void) {
    for (int i = 0; i < N; i++) /* ... */;
}

// 디버깅 중 이 함수만 -O0로
__attribute__((optimize("O0")))
void debug_me(void) {
    int x = 5;
    // breakpoint
}

// inline 강제 또는 금지
static inline __attribute__((always_inline))
int small_helper(int x) { return x + 1; }

__attribute__((noinline))
void never_inline_me(void) { ... }
```

빌드 옵션 예시:

```makefile
# Debug
CFLAGS_DEBUG = -Og -g3 -DDEBUG

# Release
CFLAGS_RELEASE = -Os -g3 -flto -ffunction-sections -fdata-sections

# Profile/measure
CFLAGS_PROFILE = -O2 -g3
```

`work.c`를 `-Os`와 `-Os -g3`로 각각 컴파일해 `.text`만 뽑아 비교하면 두 결과의 md5가 같았습니다(`cbdbc13a…`). `-g3`는 이 코드의 기계어를 바꾸지 않고 ELF의 debug section만 늘렸으므로([3-03](/blog/embedded/modern-recipes/part3-03-elf-format)), release 빌드에도 붙여 두고 flash 이미지는 `objcopy`로 뽑을 수 있습니다.

## 측정 / 비교

| 옵션 | 이 글에서 확인한 것 |
| --- | --- |
| `-O0` → `-O2` | `sum` 31줄 → 12줄, `work.o` 456 → 284 byte |
| `-O3` | Cortex-M4에서 `sum`은 `-O2`와 같음, `work.o`는 344 byte로 더 큼 |
| `-Os` | `work.o` 196 byte로 가장 작음 |
| `-Og` | breakpoint가 값 계산 전 줄에 걸려 `<optimized out>` |
| `-flto` | file 경계 너머 inline·상수 계산, 미사용 함수 제거 |
| `-Ofast` | `isnan()` 검사가 사라짐 (아래 함정) |

## 자주 보는 함정

> ⚠️ `-O0`으로만 빌드하고 release

위 표처럼 `-O0`의 `work.o`는 `-Os`의 2.3배였습니다. 개발 중 `-O0`으로만 확인하고 release를 다른 레벨로 내면, 크기·타이밍·드러나는 버그가 모두 달라집니다. release 레벨로 빌드한 이미지로 시험합니다.

> ⚠️ `-O2`에서 변수가 `<optimized out>`

4)절처럼 멈춘 위치에 따라 다릅니다. 같은 함수에서 `-O2`는 값을 보여 주고 `-Og`는 못 보여 준 경우도 있었습니다. 한 줄 진행해 보거나, 그 함수만 `__attribute__((optimize("O0")))`로 빌드합니다.

> ⚠️ LTO로 드러나는 숨은 의존

LTO는 file 경계를 넘어 inline하고 쓰이지 않는 함수를 지웁니다. 위 실행처럼 `unused_helper`가 사라졌는데, 어떤 함수를 이름으로만(예: 링커 script의 `ENTRY`나 assembly에서) 참조하는 코드라면 `__attribute__((used))`와 linker의 `KEEP`으로 표시해야 합니다. 문제가 되는 파일만 `-fno-lto`로 뺄 수도 있습니다.

> ⚠️ `-Ofast` 사용 후 NaN 처리 깨짐

GCC 매뉴얼대로 `-Ofast`는 `-ffast-math`를 켜고, `-ffast-math`가 켜는 `-ffinite-math-only`는 "arguments and results are not NaNs or +-Infs"라고 가정합니다. host GCC 14.2.0에서 실행 중에 0/0을 만드는 프로그램을 돌린 결과입니다.

```c
double z = argc - 1;            /* 0.0 at runtime, unknown to the compiler */
double x = z / z;               /* NaN */
printf("isnan(x) = %d, x != x = %d\n", isnan(x), x != x);
```

```text
$ gcc -O2 nan.c -o nan-O2 -lm && ./nan-O2
isnan(x) = 1, x != x = 1
$ gcc -Ofast nan.c -o nan-Ofast -lm && ./nan-Ofast
isnan(x) = 0, x != x = 0
```

값은 NaN인데 `-Ofast`에서는 검사가 0을 돌려줍니다. 센서 값의 NaN을 걸러 내는 코드가 이렇게 조용히 무력화됩니다.

> ⚠️ `volatile`이 부족해 HW 접근이 사라짐

peripheral register 접근에 `volatile`이 없으면 최적화 레벨에 따라 쓰기 자체가 없어집니다([2-05](/blog/embedded/modern-recipes/part2-05-arm-memory-map)의 `send_plain` codegen). `volatile`은 컴파일러만 막고 CPU·DMA 간 순서는 barrier가 맡습니다([2-10](/blog/embedded/modern-recipes/part2-10-memory-barrier)).

## 정리

- `-O` 레벨은 개별 최적화 옵션의 묶음이고, GCC 14에서는 `-O2`부터 loop vectorization이 켜집니다.
- 이 글의 코드에서는 `-Os`가 가장 작았고 `-O3`는 `-O2`보다 컸습니다. 크기와 속도는 코드별로 측정합니다.
- `<optimized out>`은 레벨뿐 아니라 멈춘 위치에 달려 있습니다.
- LTO는 file 경계를 넘는 inline과 상수 계산까지 하지만, 이름으로만 쓰는 함수는 표시해 두어야 합니다.
- `-Ofast`는 `isnan()` 같은 검사를 무력화할 수 있습니다.

다음 편에서는 **맵 파일 분석**을 다룹니다. 빌드 후 메모리 사용을 한눈에 보는 방법입니다.

## 관련 항목

- [3-02: 컴파일 4단계](/blog/embedded/modern-recipes/part3-02-compile-pipeline)
- [3-08: 메모리 레이아웃](/blog/embedded/modern-recipes/part3-08-memory-layout)
- [3-10: 맵 파일 분석](/blog/embedded/modern-recipes/part3-10-map-file-analysis)
- 더 깊이 — [Embedded C++ for Real Systems: 컴파일러 플래그](/blog/embedded/embedded-cpp/part1-02-compiler-flags)
