---
title: "3-09: 컴파일러 최적화"
date: 2026-05-13T07:00:00
description: "-O0/-O1/-O2/-O3/-Os/-Og — 옵션별 차이와 디버깅 가능성."
series: "Modern Embedded Recipes"
seriesOrder: 31
tags: [recipes, toolchain, optimization]
draft: false
---

## 한 줄 요약

> **"`-O` 레벨은 컴파일러에게 얼마나 적극적으로 변환할지를 알려 줍니다."** 임베디드는 보통 `-Os`(크기) 또는 `-O2`(속도)에서 시작합니다.

## 어떤 상황에서 쓰나

- Flash가 부족해 코드 크기를 줄여야 할 때
- 핫 루프 성능을 끌어올려야 할 때
- 디버깅이 안 될 정도로 변수가 사라졌을 때
- LTO를 적용했더니 갑자기 코드가 깨질 때

## 핵심 개념

### 1) -O 레벨

| 레벨 | 의미 | 일반 사용 |
| --- | --- | --- |
| `-O0` | 거의 최적화 없음 | 디버그용 (gdb-friendly) |
| `-O1` | 기본 최적화 | 거의 안 씀 |
| `-O2` | 속도 최적화 | release 표준 |
| `-O3` | 공격적 속도 (vectorize) | 핫스팟에만 |
| `-Os` | 크기 최적화 | 임베디드 표준 |
| `-Og` | 디버그 친화 + 일부 최적화 | 개발 중 |
| `-Ofast` | `-O3` + math 표준 위반 허용 | 측정 후 사용 |

각 레벨은 사실 수십 개의 개별 옵션(`-finline-functions` 등)의 묶음입니다.

### 2) 각 레벨의 효과 비교

```c
int sum(const int *arr, int n) {
    int s = 0;
    for (int i = 0; i < n; i++) s += arr[i];
    return s;
}
```

`-O0`:
```asm
sum:
    push    {r4, r5, r7, lr}
    mov     r5, r0
    mov     r4, r1
    movs    r2, #0           @ s = 0
    str     r2, [r7, #4]
    movs    r2, #0
    str     r2, [r7]         @ i = 0
.L3:
    ldr     r2, [r7]
    cmp     r2, r4
    bge     .L2
    ...
```

`-O2`:
```asm
sum:
    cmp     r1, #0
    ble     .L4
    mov     r3, #0
    mov     r2, #0
.L3:
    ldr     ip, [r0, r3, lsl #2]
    add     r2, r2, ip
    add     r3, r3, #1
    cmp     r3, r1
    bne     .L3
    mov     r0, r2
    bx      lr
```

`-O0`은 모든 변수를 stack에 저장, `-O2`는 register 활용.

### 3) `-Os` — 크기 최적화

코드 크기를 최소화하려고 inline expansion을 제한합니다. `-O2`에서 20 ~ 30% 더 작아지지만, 약간 느려질 수 있습니다.

**hello.c 빌드 결과:**

- -O0: 28 KB
- -Os: 8 KB
- -O2: 12 KB
- -O3: 14 KB

### 4) `-Og` — 디버그 친화

`-O0`은 너무 느리고, `-O2`는 변수가 사라져 디버깅이 어렵습니다. `-Og`는 그 사이 절충입니다.

- Variable lifetime이 source와 비슷하게 유지
- Inline expansion 최소화
- Step-through가 자연스러움

개발 중에는 `-Og -g3`이 가장 편합니다.

### 5) LTO (Link-Time Optimization)

`-flto`로 활성화합니다. 모든 `.o` 파일을 합쳐서 최적화하므로, file 경계를 넘는 inline·dead code 제거가 가능합니다.

```bash
arm-none-eabi-gcc -O2 -flto -c a.c -o a.o
arm-none-eabi-gcc -O2 -flto -c b.c -o b.o
arm-none-eabi-gcc -O2 -flto a.o b.o -o app.elf
```

10 ~ 30% 추가 크기/속도 향상이 흔합니다. 단점은 빌드 시간 증가와 일부 hardware-specific 코드(예: 인라인 어셈블리)에서 가끔 문제 발생.

### 6) PGO (Profile-Guided Optimization)

실제 실행 profile을 모아 컴파일러에 알려주는 기법. 임베디드에서는 host에서 측정 후 다시 빌드가 어려워 거의 안 씁니다.

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

빌드 옵션 표준 예시:

```makefile
# Debug
CFLAGS_DEBUG = -Og -g3 -DDEBUG

# Release
CFLAGS_RELEASE = -Os -g3 -flto -ffunction-sections -fdata-sections

# Profile/measure
CFLAGS_PROFILE = -O2 -g3 -pg
```

## 측정 / 비교

| 옵션 | hello.c 크기 (Cortex-M4) | speed (relative) |
| --- | --- | --- |
| `-O0` | 28 KB | 1.0x |
| `-Og` | 16 KB | 1.5x |
| `-O1` | 14 KB | 1.7x |
| `-O2` | 12 KB | 2.5x |
| `-O3` | 14 KB | 3.0x |
| `-Os` | 8 KB | 2.2x |
| `-Os -flto` | 6 KB | 2.4x |
| `-O2 -flto` | 10 KB | 3.2x |

| 옵션 | 디버깅 친화 |
| --- | --- |
| `-O0` | 최고 |
| `-Og` | 좋음 |
| `-O2` | 변수 자주 사라짐 |
| `-Os` | 인라인 적어 step-through OK, 변수는 사라짐 |
| `-O3 -flto` | 어려움 |

## 자주 보는 함정

> ⚠️ `-O0`으로만 빌드하고 release

flash 크기와 속도가 release보다 2 ~ 3배 차이. release는 반드시 `-Os` 또는 `-O2`.

> ⚠️ `-O2` 후 변수가 optimized out

gdb에서 `<optimized out>`이 보입니다. `volatile`를 붙이거나 `-Og`로 디버깅.

> ⚠️ LTO로 inline assembly가 깨짐

asm constraint이 file 단위로 잡혔는데 LTO가 cross-file inline을 하면서 깨지는 경우. 해당 함수만 `__attribute__((noinline))` 또는 `optimize("no-lto")`.

> ⚠️ `-Ofast` 사용 후 NaN 처리 깨짐

`-Ofast`는 `-ffast-math`를 포함, IEEE 표준 위반 허용. NaN, Inf 처리에 의존하는 코드는 깨짐.

> ⚠️ `volatile`이 부족해 HW 접근 reorder

`-O2`는 적극적으로 reorder합니다. peripheral register는 반드시 `volatile` (CMSIS 헤더가 이미 해 줌).

> ⚠️ Inline 함수가 너무 작아도 inline 안 됨

`-Os`에서는 inline이 보수적. `__attribute__((always_inline))` 또는 `-finline-limit=N`으로 조정.

## 정리

- `-O` 레벨은 컴파일러 최적화의 적극성을 정합니다.
- 임베디드 표준은 release `-Os` 또는 `-O2`, debug `-Og`.
- `-O3`는 vectorize 포함, 임베디드에서는 hotspot에만.
- LTO(`-flto`)는 cross-file 최적화로 10 ~ 30% 추가 이득.
- 함수별 attribute로 개별 최적화 제어 가능.
- `volatile`, inline 제어, debug 친화를 옵션 선택의 함정에 주의.

다음 편에서는 **맵 파일 분석**을 다룹니다. 빌드 후 메모리 사용을 한눈에 보는 방법입니다.

## 관련 항목

- [3-02: 컴파일 4단계](/blog/embedded/modern-recipes/part3-02-compile-pipeline)
- [3-08: 메모리 레이아웃](/blog/embedded/modern-recipes/part3-08-memory-layout)
- [3-10: 맵 파일 분석](/blog/embedded/modern-recipes/part3-10-map-file-analysis)
- 더 깊이 — [Embedded C++ for Real Systems: 컴파일러 플래그](/blog/embedded/embedded-cpp/part1-02-compiler-flags)
