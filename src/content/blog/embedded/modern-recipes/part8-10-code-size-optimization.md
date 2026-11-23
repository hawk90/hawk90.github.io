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

> Flash 사용량을 먼저 측정하고, 빌드 옵션·미사용 section·라이브러리 의존성을 하나씩 바꿔 비교합니다. `-Os`, LTO, section GC는 후보이지 모든 프로젝트에 통하는 처방은 아닙니다.

## 어떤 상황에서 쓰나

64 KB MCU에 기능을 자꾸 추가하다 보면 link error로 flash 영역이 넘을 수 있습니다. 새 MCU로 옮기기 전에 컴파일·link 옵션과 libc 선택을 검토할 수 있지만 절감 폭은 코드와 toolchain에 따라 측정해야 합니다.

또 한 가지 흔한 상황은 secure boot의 image 크기 제한입니다. signed image의 *max size*가 정해진 환경에서는 코드 줄이기가 필수입니다.

## 핵심 개념

| 1. -Os | 크기 최적화 |
|---|---|
| 2. -ffunction-sections + --gc-sections | 사용 안 된 함수 제거 |
| 3. -flto | 링크 시 전역 최적화 |
| 4. strip --strip-debug / --strip-unneeded | ELF symbol/debug 정보 정리 |
| 5. newlib-nano | 작은 libc |
| 6. printf-tiny / iprintf | printf 단순화 |
| 7. dead code 분석 | nm, size, bloaty |

각 단계는 서로 상호작용할 수 있어 절감량이 단순 합산되지는 않습니다. 같은 toolchain·linker script·입력으로 한 항목씩 비교합니다.

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
arm-none-eabi-gcc -mcpu=cortex-m4 -mthumb -Os -c main.c -o main.o
arm-none-eabi-gcc -mcpu=cortex-m4 -mthumb -Os main.o -T linker.ld -o firmware.elf
# -O0 디버깅용
# -O1 가벼운 최적화
# -O2 일반 성능
# -Os 크기 우선
# -O3 더 많은 throughput 최적화 후보 (크기 변화는 측정)
```

GCC의 `-Os`는 `-O2` 최적화 대부분을 사용하면서 코드 크기를 늘리는 경향이 있는 몇 가지 최적화를 끄고, 크기 기준으로 조정합니다. 성능·크기 trade-off는 target과 workload에서 비교하고, `-O2`가 더 작거나 더 빠를 수도 있습니다. `-Oz`는 toolchain이 지원할 때 더 공격적으로 크기를 우선합니다. [GCC 최적화 옵션](https://gcc.gnu.org/onlinedocs/gcc/Optimize-Options.html)을 확인합니다.

### Function/data sections + GC

```bash
arm-none-eabi-gcc -mcpu=cortex-m4 -mthumb -Os \
    -ffunction-sections -fdata-sections -c main.c -o main.o
arm-none-eabi-gcc -mcpu=cortex-m4 -mthumb -Os main.o \
    -Wl,--gc-sections -T linker.ld -o firmware.elf
```

`-ffunction-sections`와 `-fdata-sections`는 함수와 데이터를 개별 input section에 두고, `--gc-sections`는 linker가 root로 삼은 section에서 도달할 수 없는 section을 제거합니다. linker script의 `KEEP`, vector table, 생성자, 간접 참조나 외부에서 쓰는 symbol은 root·참조 관계에 따라 남을 수 있습니다. `used`는 컴파일러가 항목을 버리지 않게 할 뿐, linker의 section GC까지 항상 막는 표식은 아닙니다. 필요하면 linker script의 `KEEP()` 또는 toolchain이 지원하는 retain 기능을 사용하고 map 파일로 확인합니다.

### LTO (Link-Time Optimization)

```bash
arm-none-eabi-gcc -mcpu=cortex-m4 -mthumb -Os -flto \
    -ffunction-sections -fdata-sections -c file1.c -o file1.o
arm-none-eabi-gcc -mcpu=cortex-m4 -mthumb -Os -flto \
    -ffunction-sections -fdata-sections -c file2.c -o file2.o
arm-none-eabi-gcc -mcpu=cortex-m4 -mthumb -Os -flto \
    file1.o file2.o -Wl,--gc-sections -T linker.ld -o firmware.elf
```

LTO는 link 시 LTO intermediate representation이 있는 object 간 최적화를 수행할 수 있습니다. GCC driver로 최종 link하고 compile과 link에 맞는 옵션을 전달해야 합니다. 일반 object나 archive의 최적화 범위는 구성에 따라 다르며, assembly·외부에서 참조되는 symbol·ABI 경계는 link 결과와 map으로 확인합니다. 크기뿐 아니라 실행시간, RAM, 빌드 재현성도 비교합니다. [GCC LTO 설명](https://gcc.gnu.org/onlinedocs/gcc/Optimize-Options.html)을 참고합니다.

### strip

```bash
arm-none-eabi-objcopy -O binary firmware.elf firmware.bin
# 배포용 ELF가 필요하면 원본 debug ELF를 보존한 뒤 별도 복사본만 strip
cp firmware.elf firmware-stripped.elf
arm-none-eabi-strip --strip-debug firmware-stripped.elf
```

debug 정보는 보통 raw `.bin`에 포함되지 않으므로 ELF에서 debug symbol을 strip해도 이미 생성된 firmware image의 loadable section 크기가 줄지는 않습니다. 배포 ELF 전송 크기는 작아질 수 있습니다. Flash 사용량은 `.text`뿐 아니라 vector table, `.rodata`, 초기값이 있는 `.data` load image와 linker 배치로 확인합니다. 원본 ELF와 map은 디버깅·현장 분석용으로 보존합니다.

### Newlib-nano

```bash
arm-none-eabi-gcc -mcpu=cortex-m4 -mthumb -Os --specs=nano.specs \
    main.c -T linker.ld -o firmware.elf
```

`nano.specs`는 설치된 GNU Arm toolchain의 newlib-nano 구성을 선택합니다. 사용할 syscall stub, locale, wide-character, floating-point formatting 지원은 toolchain 구성과 link 옵션을 확인해야 합니다. 최소 기능이라고 가정하지 말고 map과 실제 포맷 테스트로 확인합니다.

```text
대표 절약 (ARM Cortex-M4)
newlib              측정 필요
newlib-nano         측정 필요
```

### printf 대안

```c title="printf-call.c"
#include <stdio.h>

void report_count(unsigned count) {
    printf("count=%u\n", count);
}
```

newlib-nano에서 floating-point `printf` 포맷이 필요하다면 최종 link에 `-u _printf_float`가 필요한 toolchain 구성이 있습니다. tinyprintf 계열은 API와 지원 포맷이 구현마다 다르므로 선택한 구현의 header/API에 맞게 교체하고 `%`, 폭·정밀도, 오류 출력 동작까지 확인합니다.

### Compiler 옵션 추가 정리

```bash
# 예시: compile과 최종 link에 target/optimization/LTO 설정 전달
arm-none-eabi-gcc -mcpu=cortex-m4 -mthumb -Os -flto \
    -ffunction-sections -fdata-sections -c main.c -o main.o
arm-none-eabi-gcc -mcpu=cortex-m4 -mthumb -Os -flto --specs=nano.specs \
    main.o -T linker.ld -Wl,--gc-sections,--print-memory-usage \
    -o firmware.elf
```

옵션을 무조건 한 묶음으로 복사하지 않습니다. 예를 들어 `-fno-builtin`은 library 호출 대체를 막아 크기·성능을 악화시킬 수 있고, unwind table 제거도 예외·unwind·진단 기능에 영향을 줍니다. 실제 toolchain이 지원하는 옵션과 제품 요구를 확인한 뒤 하나씩 비교합니다.

### Size 분석 도구

```bash
arm-none-eabi-size firmware.elf

arm-none-eabi-nm --size-sort firmware.elf | tail -20
# 가장 큰 symbol 20개

# bloaty (Google) — 가장 직관적
bloaty firmware.elf
```

`size`와 linker map은 section별 합계를 보여주고, `nm --size-sort`는 symbol 크기를 정렬합니다. Bloaty는 지원 포맷과 symbol/debug 정보가 있는 ELF에서 파일·compile unit·symbol 관점으로 분해할 수 있지만 결과는 binary와 디버그 정보 구성에 좌우됩니다. 수치가 Flash image 크기와 같은지 확인합니다.

### Section을 직접 정리

```c
/* 실행 위치 변경 예시. linker script/startup의 load·run 주소 처리 필요 */
__attribute__((section(".ramfunc")))
void hot_function(void) { ... }

/* section 이름만으로 초기화 코드가 실행 후 flash에서 제거되지는 않음 */
__attribute__((section(".init_text")))
void board_init(void) { ... }
```

linker script와 startup copy table이 section 배치를 결정합니다. `.ramfunc`는 실행 중 RAM 점유를 늘리고 초기값을 flash에서 복사한다면 flash image에도 load copy가 필요합니다. section을 `.init_text`로 이름 붙였다고 초기화 후 flash에서 제거되지는 않습니다. section 이름만으로 flash 공간이 회수되지 않습니다.

### Inline 정책

```c
/* 작은 함수는 inline */
static inline int max(int a, int b) { return a > b ? a : b; }

/* 큰 함수는 inline 금지 (`-Os`는 보통 자동 처리) */
__attribute__((noinline)) void big_func(void) { ... }
```

`inline`과 `noinline`은 크기·실행속도에 영향을 주지만 결과는 최적화·호출 지점·LTO에 따라 달라집니다. hot은 inline, cold는 noinline으로 일괄 지정하지 말고 map·disassembly와 workload로 비교합니다.

## 측정 / 성능 비교

| 비교 단계 | 결과 |
|---|---|
| baseline `-O2` | 대상 빌드에서 측정 |
| `-Os` | 대상 빌드에서 측정 |
| `-Os -ffunction-sections -Wl,--gc-sections` | 대상 빌드에서 측정 |
| 위 설정 + `-flto` | 대상 빌드에서 측정 |
| 위 설정 + newlib-nano | 해당 toolchain/link 경로에서 측정 |
| 위 설정 + 선택한 작은 printf 구현 | 필요한 format 기능을 포함해 측정 |

다섯 옵션의 합성 효과는 코드·toolchain·linker script별로 측정해야 합니다.

빌드 시간은 반대로 늘어날 수 있습니다. `-flto`의 link 비용은 project 규모와 toolchain에서 측정합니다.

LTO는 link 시간과 메모리 사용을 늘릴 수 있고 실행속도도 바뀔 수 있습니다. 최종 firmware에서 크기와 runtime 영향을 모두 비교합니다.

## 자주 보는 함정

> `-O0` 디버깅 빌드로 양산

```bash
gcc -O0 main.c       # 크기·성능 변화는 빌드별 측정
```

디버깅 빌드를 양산에 올리는 사고는 가끔 발생합니다. 빌드 system에서 `-O0`을 차단합니다.

> `-ffunction-sections` 없이 section GC granularity가 거친 경우

```bash
arm-none-eabi-gcc -Os -ffunction-sections -c main.c -o main.o
arm-none-eabi-gcc main.o -T linker.ld -o firmware.elf
```

`--gc-sections`가 켜져도 각 object가 하나의 큰 `.text` section으로 묶여 있으면, 그 안의 미사용 함수만 개별적으로 제거하기 어렵습니다. function/data section을 나누고 GC를 켠 뒤 map 파일에서 제거 범위를 확인합니다.

> LTO와 호환 안 되는 코드

inline assembly는 operand, clobber와 side effect를 compiler에 정확히 선언해야 합니다. 외부에서 참조하는 weak/assembly symbol은 linker가 볼 수 있는 참조와 script root를 확인합니다. `used`는 compiler 단계와 linker GC를 모두 해결하는 일반 해법이 아닙니다.

> Newlib-nano의 float 제거 무시

```c
printf("%.2f\n", 3.14);    /* 선택한 libc 설정에서 지원 여부를 link/test */
```

newlib-nano의 float formatter는 toolchain에 따라 별도 link option이 필요할 수 있습니다. 지원되지 않을 때 동작을 추측하지 말고 link 결과와 target test를 확인합니다.

> Inline 남용

```c
inline void log_line(const char *s) { /* 50 줄 */ }
```

큰 함수를 inline하면 호출 site별 코드 복제로 크기가 증가할 수 있습니다. 최종 disassembly와 section 크기를 보고 결정합니다.

## 정리

- `-Os`, `-ffunction-sections + --gc-sections`, `-flto`는 1차로 검토할 수 있는 옵션입니다.
- newlib-nano의 크기·기능 차이는 toolchain과 사용 API로 확인합니다.
- printf의 float 지원 제거 효과는 대상 빌드에서 측정합니다.
- map, `nm`, `size`와 지원되는 경우 `bloaty`로 큰 section·symbol의 원인을 좁힙니다.
- inline 정책은 hot/cold 경로와 code size를 측정해 정합니다.
- LTO는 build cost와 최종 크기·실행시간을 함께 비교합니다.
- 디버깅 빌드(-O0)는 양산 차단합니다.

다음 편은 **전력 최적화**입니다. Sleep, peripheral clock gating, DVFS를 다룹니다.

## 관련 항목

- [8-09: 스택 분석](/blog/embedded/modern-recipes/part8-09-stack-analysis)
- [8-11: 전력 최적화](/blog/embedded/modern-recipes/part8-11-power-optimization)
- [ECPP 1-04: Code Size Analysis](/blog/embedded/embedded-cpp/part1-04-code-size-analysis)
- [ECPP 2-07: Templates Cost](/blog/embedded/embedded-cpp/part2-07-templates-cost)
