---
title: "8-10: 코드 크기 최적화"
date: 2026-05-16T02:00:00
description: "-Os, LTO, function-sections, --gc-sections, strip, newlib-nano, printf-tiny까지 펌웨어 binary 크기를 줄이는 단계별 기법을 정리합니다."
series: "Modern Embedded Recipes"
seriesOrder: 98
tags: [recipes, performance, code-size]
---

## 한 줄 요약

> **"Flash가 모자라면 `-Os` + LTO + section gc 세 옵션이 1차 답입니다."** 그 다음은 libc 교체와 printf 변경입니다.

## 어떤 상황에서 쓰나

64 KB MCU에 기능을 자꾸 추가하다 보면 link error로 "region FLASH overflowed by 1.2K"가 나옵니다. 새 MCU로 옮기기 전에 컴파일 옵션과 link option, libc 선택만으로 30~50%를 줄일 수 있습니다.

또 한 가지 흔한 상황은 secure boot의 image 크기 제한입니다. signed image의 *max size*가 정해진 환경에서는 코드 줄이기가 필수입니다.

## 핵심 개념

```text
1. -Os                          크기 최적화
2. -ffunction-sections + --gc-sections   사용 안 된 함수 제거
3. -flto                        링크 시 전역 최적화
4. strip --strip-unneeded       symbol 제거
5. newlib-nano                  작은 libc
6. printf-tiny / iprintf        printf 단순화
7. dead code 분석               nm, size, bloaty
```

각 단계가 누적적으로 효과를 냅니다.

```text
효과 (참고)
-Os         vs -O2              -15~25%
+ LTO                           -5~15% 추가
+ section gc                    -5~10% 추가
+ newlib-nano                   -20~50% (libc heavy 코드)
+ printf-tiny                   -10~30% (printf 많이 쓰면)
```

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

`-ffunction-sections`는 각 함수를 별도 section에 두고, `--gc-sections`는 참조 없는 section을 link 시 제거합니다. 사용 안 한 함수의 코드가 0 byte가 됩니다.

### LTO (Link-Time Optimization)

```bash
arm-none-eabi-gcc -Os -flto -c file1.c
arm-none-eabi-gcc -Os -flto -o main.elf file1.o file2.o
```

LTO는 link 시 모든 object file을 함께 보고 inline, dead code elimination, constant propagation을 합니다. 빌드 시간이 늘지만 크기가 5~15% 더 줄어듭니다.

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

`nano.specs`는 standard newlib 대신 newlib-nano를 link합니다. floating-point printf, wide char 같은 무거운 기능이 제거되어 libc 크기가 절반 이하가 됩니다.

```text
대표 절약 (ARM Cortex-M4)
newlib              ~80 KB
newlib-nano         ~20 KB
```

### printf 대안

```bash
# integer 전용 (float 제외)
arm-none-eabi-gcc -Os -u _printf_float main.c
# (float을 *제외*하면 약 5 KB 절약)

# tinyprintf 같은 minimal 구현
#include "tinyprintf.h"
init_printf(NULL, my_putchar);
tfp_printf("hello %d\n", 42);
```

`printf` family는 embedded에서 가장 큰 단일 함수군입니다. `%f`를 안 쓴다면 float 지원을 빼는 것만으로 4~5 KB가 줄어듭니다.

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

`-fno-unwind-tables`는 exception unwinding 정보(.eh_frame)를 제거합니다. C 코드라면 안전합니다.

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
단계별 적용 (Cortex-M4 사례, 시작 binary 48 KB)
원본 -O2                                    48.0 KB
-Os                                         42.1 KB
-Os -ffunction-sections -Wl,--gc-sections   36.4 KB
+ -flto                                     33.2 KB
+ newlib-nano                               24.8 KB
+ printf-tiny                               19.5 KB
```

다섯 옵션의 합성 효과로 60%까지 줄어들 수 있습니다.

```text
빌드 시간 비교
-Os                  baseline
+ -flto              + 30~80% (link 단계가 김)
```

LTO의 비용은 link 시간뿐, runtime에는 오히려 더 빠른 경우도 많습니다.

## 자주 보는 함정

> `-O0` 디버깅 빌드로 양산

```bash
gcc -O0 main.c       # 2~3배 큰 binary, 2~5배 느림
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

- `-Os`, `-ffunction-sections + --gc-sections`, `-flto` 세 옵션이 1차 답입니다.
- newlib-nano는 libc 크기를 절반 이하로 줄입니다.
- printf의 float 지원 제거만으로 4~5 KB가 줄어듭니다.
- `bloaty`로 어느 symbol이 큰지 즉시 확인합니다.
- inline 정책은 small hot은 inline, big cold는 noinline이 표준입니다.
- LTO는 빌드 시간이 늘지만 runtime이 더 빠른 경우도 많습니다.
- 디버깅 빌드(-O0)는 양산 차단합니다.

다음 편은 **전력 최적화**입니다. Sleep, peripheral clock gating, DVFS를 다룹니다.

## 관련 항목

- [8-09: 스택 분석](/blog/embedded/modern-recipes/part8-09-stack-analysis)
- [8-11: 전력 최적화](/blog/embedded/modern-recipes/part8-11-power-optimization)
- [ECPP 1-04: Code Size Analysis](/blog/embedded/embedded-cpp/part1-04-code-size-analysis)
- [ECPP 2-07: Templates Cost](/blog/embedded/embedded-cpp/part2-07-templates-cost)
