---
title: "임베디드 코드 크기 최적화 — -Os·LTO·Section Garbage Collection"
slug: "embedded/modern-recipes/part8-10-code-size-optimization"
date: 2026-04-17T09:09:00
description: "-Os, LTO, function-sections, --gc-sections, strip, newlib-nano, printf-tiny까지 펌웨어 binary 크기를 줄이는 단계별 기법을 정리합니다."
series: "Modern Embedded Recipes"
seriesOrder: 98
tags: [recipes, performance, code-size]
topics: ["embedded"]
---

## 한 줄 요약

> **"Flash가 모자라면 `-Os` + LTO + section gc 세 옵션이 1차 답입니다."** 그 다음은 libc 교체와 printf 변경입니다.

## 어떤 상황에서 쓰나

64 KB MCU에 기능을 자꾸 추가하다 보면 link error로 flash 영역이 넘을 수 있습니다. 새 MCU로 옮기기 전에 컴파일·link 옵션과 libc 선택을 검토할 수 있지만 절감 폭은 코드와 toolchain에 따라 측정해야 합니다.

또 한 가지 흔한 상황은 secure boot의 image 크기 제한입니다. signed image의 *max size*가 정해진 환경에서는 코드 줄이기가 필수입니다.

## 핵심 개념

| 1. -Os | 크기 최적화 |
|---|---|
| 2. -ffunction-sections + --gc-sections | 사용 안 된 함수 제거 |
| 3. -flto | 링크 시 전역 최적화 |
| 4. strip --strip-unneeded | symbol 제거 |
| 5. newlib-nano | 작은 libc |
| 6. printf-tiny / iprintf | printf 단순화 |
| 7. dead code 분석 | nm, size, bloaty |

각 단계가 누적적으로 효과를 냅니다.

효과 (참고):

| Step | 효과 |
|------|------|
| `-Os` vs `-O2` | 대상 빌드에서 측정 |
| + LTO | 대상 빌드에서 측정 |
| + section gc | 대상 빌드에서 측정 |
| + newlib-nano | libc 사용 경로별 측정 |
| + printf-tiny | printf 사용량·기능별 측정 |

## 코드 / 실제 사용 예

### `-Os` (크기 최적화)

```bash
arm-none-eabi-gcc -Os main.c -o main.o
# -O0 디버깅용
# -O1 가벼운 최적화
# -O2 일반 성능
# -Os 크기 우선
# -O3 공격적 inline (크기 크게 증가)
```

`-Os`는 `-O2`에서 코드 크기를 늘리는 최적화를 제외한 변종입니다. embedded에서 기본 선택입니다.

### Function/data sections + GC

```bash
arm-none-eabi-gcc -Os -ffunction-sections -fdata-sections \
    -Wl,--gc-sections main.c -o main.elf
```

`-ffunction-sections`는 각 함수를 별도 section에 두고, `--gc-sections`는 도달할 수 없는 section을 link 시 제거합니다. linker script의 KEEP, 생성자, weak·reflection 경로 등에 따라 제거되지 않는 코드가 있을 수 있습니다.

### LTO (Link-Time Optimization)

```bash
arm-none-eabi-gcc -Os -flto -c file1.c
arm-none-eabi-gcc -Os -flto -o main.elf file1.o file2.o
```

LTO는 link 시 여러 object file을 함께 보고 inline, dead code elimination, constant propagation을 수행할 수 있습니다. 빌드 시간과 binary 크기·성능 변화는 project와 toolchain에서 측정해야 합니다.

### strip

```bash
arm-none-eabi-strip --strip-unneeded firmware.elf
arm-none-eabi-strip --strip-debug firmware.elf
```

ELF에서 debug symbol과 사용 안 된 symbol을 제거합니다. flash에 올릴 binary 크기에는 영향이 없지만(`.text`만 flash로) elf 파일 자체가 작아져 transfer가 빠릅니다.

### Newlib-nano

```bash
arm-none-eabi-gcc --specs=nano.specs main.c
```

`nano.specs`는 toolchain에 제공되는 newlib-nano 구성을 선택합니다. floating-point printf, wide char 등 지원 범위와 크기는 toolchain build와 link 옵션에 따라 달라지므로 기능·크기를 함께 확인해야 합니다.

```text
대표 절약 (ARM Cortex-M4)
newlib              측정 필요
newlib-nano         측정 필요
```

### printf 대안

```bash
# integer 전용 (float 지원은 link하지 않음)
arm-none-eabi-gcc -Os main.c
# float 지원이 필요할 때만 -u _printf_float을 추가하고 절감 폭을 측정

# tinyprintf 같은 minimal 구현
#include "tinyprintf.h"
init_printf(NULL, my_putchar);
tfp_printf("hello %d\n", 42);
```

`printf` family는 embedded에서 큰 의존성을 만들 수 있습니다. `%f` 지원 제거의 절감 폭은 libc 구현·linker·사용 포맷에 따라 측정해야 합니다.

### Compiler 옵션 추가 정리

```bash
# 공통 권장
arm-none-eabi-gcc \
    -Os \
    -ffunction-sections -fdata-sections \
    -fno-common \
    -fno-unwind-tables \
    -fno-asynchronous-unwind-tables \
    -fno-builtin \
    -flto \
    --specs=nano.specs \
    -Wl,--gc-sections \
    -Wl,--print-memory-usage \
    -o firmware.elf
```

`-fno-unwind-tables`는 일부 unwind 정보를 제거할 수 있습니다. 예외·backtrace·런타임 요구사항이 있는 빌드에서는 기능 손실 여부를 확인해야 합니다.

### Size 분석 도구

```bash
arm-none-eabi-size firmware.elf
#    text    data     bss     dec
#   32104     208    8192   40504

arm-none-eabi-nm --size-sort firmware.elf | tail -20
# 가장 큰 symbol 20개

# bloaty (Google) — 가장 직관적
bloaty firmware.elf
# FILE SIZE        VM SIZE
# 100%  32K   100%  32K  TOTAL
#  35% 11.2K   35% 11.2K  .text
#  25%  8.0K   25%  8.0K  printf family
#  ...
```

`bloaty`는 어느 함수, 어느 file이 얼마나 차지하는지 즉시 보여줍니다.

### Section을 직접 정리

```c
/* 자주 호출되는 함수 → .ramfunc로 옮겨 RAM에서 실행 (flash wait state 제거) */
__attribute__((section(".ramfunc")))
void hot_function(void) { ... }

/* 한 번만 부르는 init 코드 → .init_text로 옮겨 부팅 후 제거 가능 */
__attribute__((section(".init_text"), used))
void board_init(void) { ... }
```

linker script와 section attribute를 조합해 code/data 배치를 직접 제어할 수 있습니다.

### Inline 정책

```c
/* 작은 함수는 inline */
static inline int max(int a, int b) { return a > b ? a : b; }

/* 큰 함수는 inline 금지 (`-Os`는 보통 자동 처리) */
__attribute__((noinline)) void big_func(void) { ... }
```

`-Os`는 inline에 보수적이지만, hot path는 `static inline`으로 명시하고 cold path는 `noinline`으로 강제합니다.

## 측정 / 성능 비교

```text
단계별 적용 (Cortex-M 사례 형식; 실제 값은 대상 빌드에서 측정)
원본 -O2                                    측정 필요
-Os                                         측정 필요
-Os -ffunction-sections -Wl,--gc-sections   측정 필요
+ -flto                                     측정 필요
+ newlib-nano                               측정 필요
+ printf-tiny                               측정 필요
```

다섯 옵션의 합성 효과는 코드·toolchain·linker script별로 측정해야 합니다.

빌드 시간은 반대로 늘어날 수 있습니다. `-flto`의 link 비용은 project 규모와 toolchain에서 측정합니다.

LTO의 비용은 link 시간뿐, runtime에는 오히려 더 빠른 경우도 많습니다.

## 자주 보는 함정

> `-O0` 디버깅 빌드로 양산

```bash
gcc -O0 main.c       # 크기·성능 변화는 빌드별 측정
```

디버깅 빌드를 양산에 올리는 사고는 가끔 발생합니다. 빌드 system에서 `-O0`을 차단합니다.

> `--gc-sections` 없이 `-ffunction-sections`

```bash
gcc -ffunction-sections main.c -o main.elf    # 효과 없음
```

두 옵션은 *쌍*입니다. linker에 `-Wl,--gc-sections`가 함께 있어야 dead section이 제거됩니다.

> LTO와 호환 안 되는 코드

```c
__asm__ __volatile__ ("..." : : "r"(x));   /* LTO가 변수 제거 시 */
```

inline asm이나 weak symbol을 쓰는 코드는 LTO와 충돌할 수 있습니다. `__attribute__((used))`로 keep을 강제합니다.

> Newlib-nano의 float 제거 무시

```c
printf("%.2f\n", 3.14);    /* %f 안 보임 → 빈 출력 또는 link error */
```

float 지원을 별도 link option(`-u _printf_float`)으로 켜야 합니다. integer 출력만 한다면 기본 nano로 충분합니다.

> Inline 남용

```c
inline void log_line(const char *s) { /* 50 줄 */ }
```

큰 함수를 inline하면 호출 site마다 코드가 복제되어 *크기가 증가*합니다. cold 함수는 inline 금지가 답입니다.

## 정리

- `-Os`, `-ffunction-sections + --gc-sections`, `-flto`는 1차로 검토할 수 있는 옵션입니다.
- newlib-nano의 크기·기능 차이는 toolchain과 사용 API로 확인합니다.
- printf의 float 지원 제거 효과는 대상 빌드에서 측정합니다.
- `bloaty`로 어느 symbol이 큰지 즉시 확인합니다.
- inline 정책은 hot/cold 경로와 code size를 측정해 정합니다.
- LTO는 빌드 시간이 늘지만 runtime이 더 빠른 경우도 많습니다.
- 디버깅 빌드(-O0)는 양산 차단합니다.

다음 편은 **전력 최적화**입니다. Sleep, peripheral clock gating, DVFS를 다룹니다.

## 관련 항목

- [8-09: 스택 분석](/blog/embedded/modern-recipes/part8-09-stack-analysis)
- [8-11: 전력 최적화](/blog/embedded/modern-recipes/part8-11-power-optimization)
- [ECPP 1-04: Code Size Analysis](/blog/embedded/embedded-cpp/part1-04-code-size-analysis)
- [ECPP 2-07: Templates Cost](/blog/embedded/embedded-cpp/part2-07-templates-cost)
