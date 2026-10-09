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
| `-O1` | 기본 최적화 | 빌드·크기 절충 |
| `-O2` | 더 많은 일반 최적화 | release에서 흔히 사용 |
| `-O3` | 더 공격적인 최적화(대상에 따라 vectorization 포함) | 측정한 핫스팟 |
| `-Os` | 크기 중심 최적화 | flash 제약이 있는 빌드 |
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

`-O0`에서는 최적화가 거의 없어 source 대응이 쉬운 편이고, `-O2`에서는 register allocation과 dead-code 제거 등이 적극적으로 적용됩니다. 실제 stack/register 배치는 코드와 compiler에 따라 달라집니다.

### 3) `-Os` — 크기 최적화

코드 크기를 줄이는 방향으로 최적화합니다. `-O2`와 비교한 크기·속도 차이는 코드, target, compiler 버전에 따라 달라지므로 실제 빌드로 측정해야 합니다.

**hello.c 빌드 결과:** toolchain, linker script, C library, target 옵션에 따라 달라집니다.

### 4) `-Og` — 디버그 친화

`-O0`은 너무 느리고, `-O2`는 변수가 사라져 디버깅이 어렵습니다. `-Og`는 그 사이 절충입니다.

- 가능한 범위에서 source와 대응하기 쉬운 최적화
- 디버깅을 고려한 최적화 조합
- 최적화로 인해 변수·실행 순서가 달라질 수 있음

개발 중에는 `-Og -g3`이 가장 편합니다.

### 5) LTO (Link-Time Optimization)

`-flto`로 활성화합니다. 모든 `.o` 파일을 합쳐서 최적화하므로, file 경계를 넘는 inline·dead code 제거가 가능합니다.

```bash
arm-none-eabi-gcc -O2 -flto -c a.c -o a.o
arm-none-eabi-gcc -O2 -flto -c b.c -o b.o
arm-none-eabi-gcc -O2 -flto a.o b.o -o app.elf
```

크기와 속도에 영향을 줄 수 있지만 방향과 폭은 프로그램·toolchain·linker 옵션에 따라 측정해야 합니다. 단점은 빌드 시간 증가와 일부 hardware-specific 코드(예: 잘못 제약된 인라인 어셈블리)에서 문제가 드러날 수 있다는 점입니다.

### 6) PGO (Profile-Guided Optimization)

실제 실행 profile을 모아 컴파일러에 알려주는 기법입니다. target에서 profile을 수집하거나 대표 workload를 host에서 재현할 수 있는지에 따라 적용 가능성이 달라집니다.

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
CFLAGS_PROFILE = -O2 -g3
# -pg/other profiling options require target runtime support
```

## 측정 / 비교

| 옵션 | hello.c 크기 (Cortex-M4) | speed (relative) |
| --- | --- | --- |
| `-O0` ~ `-O3`, `-Os`, `-flto` | 크기와 속도는 코드·target·toolchain별 측정 필요 |

| 옵션 | 디버깅 친화 |
| --- | --- |
| `-O0` | 최고 |
| `-Og` | 좋음 |
| `-O2` | 변수 자주 사라짐 |
| `-Os` | 인라인 적어 step-through OK, 변수는 사라짐 |
| `-O3 -flto` | 어려움 |

## 자주 보는 함정

> ⚠️ `-O0`으로만 빌드하고 release

`-O0`은 release 옵션과 크기·속도가 크게 다를 수 있습니다. release 후보는 target 요구사항에 맞춰 `-Os`, `-O2` 등을 측정해 선택합니다.

> ⚠️ `-O2` 후 변수가 optimized out

gdb에서 `<optimized out>`이 보입니다. `volatile`를 붙이거나 `-Og`로 디버깅.

> ⚠️ LTO로 inline assembly가 깨짐

asm constraint가 부정확하거나 compiler 가정을 위반하면 LTO에서 문제가 드러날 수 있습니다. asm constraint를 검증하고, 필요하면 해당 함수/파일을 빌드 시스템에서 LTO 제외(`-fno-lto`)하거나 `noinline` 등 실제 지원되는 속성을 사용합니다.

> ⚠️ `-Ofast` 사용 후 NaN 처리 깨짐

`-Ofast`는 `-ffast-math`를 포함, IEEE 표준 위반 허용. NaN, Inf 처리에 의존하는 코드는 깨짐.

> ⚠️ `volatile`이 부족해 HW 접근 reorder

peripheral register는 반드시 `volatile`로 선언해야 하지만, `volatile`만으로 CPU·DMA·다중 코어 간 memory ordering이나 atomicity가 보장되지는 않습니다. 필요한 경우 target의 barrier/동기화 primitive도 사용해야 합니다.

> ⚠️ Inline 함수가 너무 작아도 inline 안 됨

`-Os`에서는 inline 결정이 달라질 수 있습니다. 필요하면 `always_inline`을 신중히 사용하고, compiler 버전에 맞는 inline 관련 옵션/parameter를 확인합니다.

## 정리

- `-O` 레벨은 컴파일러 최적화의 적극성을 정합니다.
- release는 `-Os`, `-O2` 등 후보를 target workload로 비교하고 debug는 `-Og` 등을 선택합니다.
- `-O3`의 vectorization과 LTO 효과는 target·compiler·코드에 따라 확인합니다.
- 함수별 attribute로 개별 최적화 제어 가능.
- `volatile`, inline 제어, debug 친화를 옵션 선택의 함정에 주의.

다음 편에서는 **맵 파일 분석**을 다룹니다. 빌드 후 메모리 사용을 한눈에 보는 방법입니다.

## 관련 항목

- [3-02: 컴파일 4단계](/blog/embedded/modern-recipes/part3-02-compile-pipeline)
- [3-08: 메모리 레이아웃](/blog/embedded/modern-recipes/part3-08-memory-layout)
- [3-10: 맵 파일 분석](/blog/embedded/modern-recipes/part3-10-map-file-analysis)
- 더 깊이 — [Embedded C++ for Real Systems: 컴파일러 플래그](/blog/embedded/embedded-cpp/part1-02-compiler-flags)
