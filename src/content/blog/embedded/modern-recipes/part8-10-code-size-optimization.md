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

> **"Flash가 모자라면 `-Os` + section gc + LTO가 1차 답입니다."** FreeRTOS 기반 예제 하나가 `-O2`의 22,368 B에서 세 옵션으로 7,732 B가 됐습니다. 그다음은 C 라이브러리입니다. `printf` 한 줄짜리 프로그램이 newlib에서 27 KB, newlib-nano에서 7 KB였고, nano에서 `%f`를 켜자 20 KB가 됐습니다.

## 어떤 상황에서 쓰나

64 KB flash MCU에 기능을 계속 더하다 보면 링커가 `region FLASH overflowed`로 멈춥니다. 더 큰 MCU로 바꾸기 전에 컴파일·링크 옵션과 C 라이브러리 선택만으로 얼마나 줄어드는지 먼저 봅니다. 이삿짐을 줄일 때 가구를 버리기 전에 상자마다 무엇이 들었는지부터 확인하는 것과 같습니다. 이 글은 각 단계의 효과를 실제 빌드의 `size` 출력으로 봅니다.

secure boot처럼 서명할 image의 최대 크기가 정해진 환경에서도 같은 순서로 줄입니다.

## 핵심 개념

| 단계 | 하는 일 | 이 글의 측정 |
| --- | --- | --- |
| `-Os` | 크기를 늘리는 `-O2` 최적화를 빼고 크기 기준으로 조정 | 22,368 → 18,512 B |
| `-ffunction-sections -fdata-sections` + `-Wl,--gc-sections` | 함수·변수마다 section을 나누고, 도달하지 않는 section을 링커가 버림 | → 9,588 B |
| `-flto` | 링크 때 모든 object를 한 번에 최적화 | → 7,732 B |
| `--specs=nano.specs` | newlib 대신 newlib-nano | `printf` 프로그램 27,068 → 7,057 B |
| `printf`의 `%f` 지원 | nano는 `-u _printf_float`를 줘야 링크 | 7,981 → 20,021 B |
| `strip` | ELF 파일의 symbol·debug 정보 제거 | flash image는 그대로 |

GCC 14.2 매뉴얼은 `-Os`를 "enables all -O2 optimizations except those that often increase code size"이고 "causes the compiler to tune for code size rather than execution speed"라고 설명합니다. 반대로 `-O3`는 이 글의 예제에서 `-O2`보다 6,956 B 컸습니다.

## 코드 / 실제 사용 예

### 컴파일 옵션 단계별 크기

[8-01](/blog/embedded/modern-recipes/part8-01-dynamic-memory)의 allocator 벤치마크(FreeRTOS-Kernel V11.2.0 + heap_4 + TLSF)를 옵션만 바꿔 다섯 번 빌드했습니다. 소스와 하네스는 8-01의 재현 환경과 같고, `K`는 FreeRTOS-Kernel 경로입니다.

```bash
#!/bin/bash
# FreeRTOS V11.2.0 + heap_4 + TLSF + the 8-01 benchmark, built five ways; text/data/bss from arm-none-eabi-size
K=${K:-FreeRTOS-Kernel}; P=$K/portable/GCC/ARM_CM3
SRC="startup.c io.c allocbench.c tlsf.c $K/tasks.c $K/queue.c $K/list.c $K/timers.c $P/port.c $K/portable/MemMang/heap_4.c"
BASE="-mcpu=cortex-m3 -mthumb -g -ffreestanding -nostdlib -fno-builtin -I. -Ilibc -I$K/include -I$P -T link.ld"
build() {   # name, flags...
  local name=$1; shift
  /usr/bin/time -p arm-none-eabi-gcc $BASE "$@" -o $name.elf $SRC -lgcc 2> $name.time || return
  printf "%-34s %s  (build %ss)\n" "$name" "$(arm-none-eabi-size $name.elf | awk 'NR==2{printf "text %6d data %4d bss %6d", $1, $2, $3}')" "$(awk '/^real/{print $2}' $name.time)"
}
arm-none-eabi-gcc --version | head -1
build O2           -O2
build O3           -O3
build Os           -Os
build Os+gc        -Os -ffunction-sections -fdata-sections -Wl,--gc-sections
build Os+gc+lto    -Os -ffunction-sections -fdata-sections -Wl,--gc-sections -flto
```

```text
arm-none-eabi-gcc (GCC) 16.2.0
O2                                 text  22368 data    4 bss 211996  (build 1.18s)
O3                                 text  29324 data    4 bss 211996  (build 1.37s)
Os                                 text  18512 data    4 bss 211996  (build 1.02s)
Os+gc                              text   9588 data    4 bss 211996  (build 0.96s)
Os+gc+lto                          text   7732 data    4 bss 211992  (build 0.76s)
```

- **section gc가 가장 크게 줄였습니다(18,512 → 9,588 B).** `-Os` 빌드와 `-Os` + gc 빌드의 `nm` 출력을 비교하면 코드 symbol 116개가 사라졌습니다. `eTaskGetState`, `pcTaskGetName`, `pcTimerGetName`처럼 예제가 부르지 않는 FreeRTOS API와 `arena_reset`, TLSF의 `default_walker`·`integrity_walker` 같은 함수입니다. 함수마다 section이 나뉘자 링커가 도달하지 않는 것을 버렸습니다. 두 옵션은 짝입니다. `-ffunction-sections`만 주면 section이 나뉘기만 하고 버려지지 않습니다.
- **LTO는 그 위에서 1,856 B를 더 줄였습니다.** 파일 경계를 넘어 inline하고 쓰이지 않는 코드를 지웁니다. 이 예제에서는 빌드 시간도 늘지 않았지만(0.96 → 0.76초), 큰 프로젝트에서는 링크 단계가 무거워집니다.
- **`bss`(211,996 B)는 LTO에서 4 B 준 것 말고는 옵션과 무관했습니다.** FreeRTOS heap 64 KiB, TLSF pool 64 KiB, 벤치마크 배열이 정적으로 잡혀 있기 때문입니다. flash와 RAM은 따로 봐야 합니다.

### 무엇이 큰지 찾기

```bash
#!/bin/bash
# what strip changes: the ELF file, not the bytes that go to flash
cp Os+gc+lto.elf fw.elf
arm-none-eabi-objcopy -O binary fw.elf fw.bin
arm-none-eabi-strip --strip-all -o fw-stripped.elf fw.elf
arm-none-eabi-objcopy -O binary fw-stripped.elf fw-stripped.bin
ls -l fw.elf fw-stripped.elf fw.bin fw-stripped.bin | awk '{printf "%-18s %8d bytes\n", $9, $5}'
cmp fw.bin fw-stripped.bin && echo "flash image identical"
echo "-- 8 largest symbols (Os+gc+lto)"
arm-none-eabi-nm --size-sort -S fw.elf | grep -i " [tT] " | tail -8
```

```text
fw-stripped.bin        7736 bytes
fw-stripped.elf       12688 bytes
fw.bin                 7736 bytes
fw.elf               115540 bytes
flash image identical
-- 8 largest symbols (Os+gc+lto)
00000538 000000fc t prvAddNewTaskToReadyList
00000aa8 00000148 t pvPortMalloc
000013b8 00000164 t tlsf_malloc
00000940 00000168 t xTaskResumeAll
000007b4 0000018c t xTaskIncrementTick
00000ea4 00000290 t prvTimerTask
0000152c 00000298 t bench_task
000018a0 000002fc T Reset_Handler
```

`nm --size-sort -S`의 둘째 열이 크기(16진)입니다. 여기서 가장 큰 `Reset_Handler`(0x2fc = 764 B)는 LTO가 `main`과 초기화 코드를 그 안으로 inline한 결과입니다. LTO를 켜면 symbol 이름과 실제 코드의 대응이 달라지므로, 함수별 크기를 볼 때는 LTO를 끈 빌드와 함께 봅니다.

### `strip`은 flash를 줄이지 않는다

같은 출력의 위쪽이 그 확인입니다. `strip --strip-all`로 ELF 파일은 115,540 B에서 12,688 B로 줄었지만, `objcopy -O binary`로 뽑은 flash image는 두 경우 모두 7,736 B로 byte 단위까지 같았습니다(`cmp`). `strip`이 지우는 symbol table과 debug section은 flash에 올라가지 않습니다. 줄어드는 것은 전송·보관하는 ELF 파일 크기이고, 대신 그 ELF로는 symbol 단위 디버깅을 할 수 없습니다.

### C 라이브러리: newlib vs newlib-nano

Homebrew의 `arm-none-eabi-gcc`에는 C 라이브러리가 없어서, 이 절은 Debian 13 게스트의 `gcc-arm-none-eabi` 14.2.1 + `libnewlib-arm-none-eabi` 4.5.0으로 했습니다.

```c
#include <stdio.h>
volatile int x = 42;
volatile float f = 3.14f;
int main(void)
{
    printf("value=%d\n", x);
#ifdef WITH_FLOAT
    printf("f=%.2f\n", f);
#endif
    return 0;
}
```

```bash
#!/bin/bash
# newlib vs newlib-nano, Debian gcc-arm-none-eabi 14.2.1 + libnewlib-arm-none-eabi 4.5.0
CF="-mcpu=cortex-m3 -mthumb -Os -ffunction-sections -fdata-sections -Wl,--gc-sections --specs=nosys.specs"
sz() { arm-none-eabi-size $1 | awk 'NR==2{printf "text %6d data %5d bss %5d", $1, $2, $3}'; }
arm-none-eabi-gcc $CF                                   -o a.elf pf.c && echo "newlib,      %d only        $(sz a.elf)"
arm-none-eabi-gcc $CF -DWITH_FLOAT                      -o b.elf pf.c && echo "newlib,      %d and %.2f    $(sz b.elf)"
arm-none-eabi-gcc $CF --specs=nano.specs                -o c.elf pf.c && echo "newlib-nano, %d only        $(sz c.elf)"
arm-none-eabi-gcc $CF --specs=nano.specs -DWITH_FLOAT   -o d.elf pf.c && echo "newlib-nano, %d and %.2f    $(sz d.elf)"
arm-none-eabi-gcc $CF --specs=nano.specs -DWITH_FLOAT -u _printf_float -o e.elf pf.c && echo "newlib-nano + -u _printf_float $(sz e.elf)"
```

```text
newlib,      %d only        text  27068 data  1768 bss   808
newlib,      %d and %.2f    text  27108 data  1768 bss   808
newlib-nano, %d only        text   7057 data   104 bss   504
newlib-nano, %d and %.2f    text   7981 data   108 bss   504
newlib-nano + -u _printf_float text  20021 data   472 bss   504
```

(링커가 `_write is not implemented and will always fail` 같은 경고를 함께 내는데, `nosys.specs`가 시스템 호출을 빈 함수로 채우기 때문이고 크기 측정과는 무관해 위에서 뺐습니다.)

- **newlib-nano로 바꾸자 `printf` 한 줄 프로그램이 27,068 B에서 7,057 B가 됐습니다.** `data`도 1,768 B에서 104 B로 줄었습니다.
- **nano에서 `%.2f`를 써도 크기는 924 B만 늘었습니다.** 실수 형식화 코드가 아직 링크되지 않았기 때문이고, 그 결과 출력이 비어 나옵니다(아래 실행).
- **`-u _printf_float`로 실수 형식화를 켜자 20,021 B가 됐습니다.** `%f` 하나가 nano의 이점 대부분을 되돌립니다.

### nano에서 `%f`가 비어 나오는 것 확인

같은 프로그램을 semihosting(`rdimon.specs`)으로 링크해 QEMU 10.0.13 `mps2-an385`에서 돌렸습니다. `vec.c`는 vector table 두 칸(초기 SP, `_start`)만 둔 파일입니다.

```c
extern void _start(void);
extern unsigned long __stack;
__attribute__((section(".isr_vector"), used)) void (*const vtab[2])(void) = { (void (*)(void))0x20400000, _start };
```

```bash
#!/bin/bash
# run the %d/%.2f program on QEMU mps2-an385 with newlib-nano + semihosting (rdimon)
for f in "" "-u _printf_float"; do
  arm-none-eabi-gcc -mcpu=cortex-m3 -mthumb -Os --specs=nano.specs --specs=rdimon.specs -DWITH_FLOAT $f \
    -Wl,--section-start=.isr_vector=0 -Wl,-Ttext=0x400 -Wl,-Tdata=0x20000000 -o r.elf vec.c pf.c
  echo "== nano.specs $f"
  timeout 10 qemu-system-arm -M mps2-an385 -nographic -semihosting -kernel r.elf
done
```

```text
== nano.specs 
value=42
f=
== nano.specs -u _printf_float
value=42
f=3.14
```

`-u _printf_float` 없이는 `f=` 뒤가 비었고, 링크 오류나 경고도 없었습니다. 실수를 찍는 코드가 있는데 결과가 비어 있다면 이 옵션부터 봅니다. 정수만 찍는다면 기본 nano로 충분합니다.

### 권장 옵션 묶음

```bash
arm-none-eabi-gcc -mcpu=cortex-m4 -mthumb \
    -Os -flto \
    -ffunction-sections -fdata-sections \
    --specs=nano.specs \
    -Wl,--gc-sections -Wl,--print-memory-usage \
    -o firmware.elf $SRCS
```

`-Wl,--print-memory-usage`는 링크가 끝날 때 region마다 사용량과 비율을 찍습니다. `-fno-common`은 GCC 14.2 매뉴얼이 기본값이라고 적고("The default is -fno-common"), GCC 10 변경 사항에 "GCC now defaults to -fno-common"이 있어 따로 줄 필요가 없습니다. `-fno-unwind-tables`·`-fno-asynchronous-unwind-tables`는 unwind 정보를 빼지만, C++ 예외나 backtrace를 쓰는 빌드에서는 그 기능이 함께 사라지므로 이 글에서는 넣지 않았습니다.

### Inline 정책

```c
static inline int max_i(int a, int b) { return a > b ? a : b; }   /* small: inline */

__attribute__((noinline)) void log_line(const char *s);            /* large, cold: keep one copy */
```

크기가 큰 함수를 여러 곳에서 inline하면 호출 위치마다 코드가 복제됩니다. `-Os`는 크기 기준으로 inline 여부를 정하지만, 오류 처리처럼 드물게 도는 큰 함수는 `noinline`으로 한 벌만 두는 편이 확실합니다. 이 절은 별도로 재지 않았습니다.

## 측정 / 성능 비교

| 빌드 (FreeRTOS + heap_4 + TLSF 예제, Cortex-M3) | text | `-O2` 대비 |
| --- | ---: | ---: |
| `-O2` | 22,368 B | 100% |
| `-O3` | 29,324 B | 131% |
| `-Os` | 18,512 B | 83% |
| `-Os` + section gc | 9,588 B | 43% |
| `-Os` + section gc + LTO | 7,732 B | 35% |

| `printf` 프로그램 (Cortex-M3, `-Os` + gc) | text |
| --- | ---: |
| newlib, `%d` | 27,068 B |
| newlib-nano, `%d` | 7,057 B |
| newlib-nano, `%d`+`%.2f` (실수 출력 안 됨) | 7,981 B |
| newlib-nano + `-u _printf_float` | 20,021 B |

이 숫자는 이 예제의 것입니다. section gc의 효과는 "쓰지 않는 코드가 얼마나 링크되어 있었나"에 달려 있어, 라이브러리를 통째로 넣은 프로젝트일수록 큽니다. 속도 변화는 재지 않았습니다.

## 자주 보는 함정

> ⚠️ 디버깅 빌드를 양산에 올림

```bash
arm-none-eabi-gcc -O0 -g ...      # debug build
```

`-O0`은 크기 최적화를 하지 않습니다. 빌드 시스템에서 release 설정의 최적화 옵션을 검사해 `-O0` 빌드가 서명·배포 단계로 넘어가지 않게 합니다.

> ⚠️ `-ffunction-sections`만 주고 `--gc-sections`를 빠뜨림

section만 나뉘고 아무것도 버려지지 않습니다. 위 표의 18,512 → 9,588 B는 두 옵션을 함께 줬을 때의 값입니다.

> ⚠️ gc가 필요한 코드를 지움

vector table처럼 코드에서 직접 참조하지 않지만 하드웨어가 쓰는 데이터는 `--gc-sections`가 지울 수 있습니다. vector table 하나짜리 파일을 `arm-none-eabi-gcc` 16.2로 링크해 보면, `__attribute__((used))`만 붙인 경우는 `--gc-sections`에 지워졌고, 링커 스크립트의 `KEEP(*(.vectors))`만 둔 경우는 LTO 없이는 남았지만 `-flto`를 켜자 지워졌습니다. 둘 다 둔 경우만 LTO 유무와 상관없이 남았습니다. 이 글의 하네스(8-01·6-12)가 vector table에 `used`와 `KEEP`을 둘 다 두는 이유입니다.

> ⚠️ nano에서 `%f`가 조용히 비어 나옴

위 실행처럼 경고 없이 빈 문자열이 나옵니다. 실수를 찍어야 하면 `-u _printf_float`를 주고 약 12 KB(7,981 → 20,021 B)를 감수하거나, 정수로 바꿔 찍습니다(`printf("%d.%02d", v / 100, v % 100)`).

> ⚠️ 큰 함수를 `inline`으로

호출 위치마다 복제되어 크기가 늘어납니다. `-O3`는 이 글의 예제를 31% 키웠습니다.

## 재현 환경

- 옵션 단계별 크기: Apple M2 Pro, `arm-none-eabi-gcc` 16.2.0(Homebrew, newlib 없음), FreeRTOS-Kernel V11.2.0, 8-01의 `allocbench.c`·하네스. `K=FreeRTOS-Kernel bash sizes.sh`, 이어서 `bash strip.sh`.
- C 라이브러리: Debian 13 arm64 게스트의 `gcc-arm-none-eabi` 14.2.1, `libnewlib-arm-none-eabi` 4.5.0, `qemu-system-arm` 10.0.13. `bash libc.sh`, `bash run-pf.sh`.

## 정리

- `-Os`, section gc, LTO 세 단계로 이 예제의 text가 22,368 B에서 7,732 B(35%)가 됐고, 가장 큰 몫은 section gc였습니다.
- `-O3`는 `-O2`보다 31% 컸습니다.
- `strip`은 ELF 파일(115,540 → 12,688 B)만 줄이고 flash image(7,736 B)는 바꾸지 않았습니다.
- newlib-nano는 `printf` 프로그램을 27 KB에서 7 KB로 줄였지만, `%f`를 켜면(`-u _printf_float`) 20 KB가 됩니다.
- nano에서 `-u _printf_float` 없이 `%f`를 쓰면 경고 없이 빈 문자열이 나왔습니다.
- `--gc-sections`를 쓸 때는 vector table처럼 하드웨어만 참조하는 것을 `KEEP`과 `used` 둘 다로 지킵니다.

다음 편은 **전력 최적화**입니다. Sleep, peripheral clock gating, DVFS를 다룹니다.

## 관련 항목

- [8-09: 스택 분석](/blog/embedded/modern-recipes/part8-09-stack-analysis)
- [8-11: 전력 최적화](/blog/embedded/modern-recipes/part8-11-power-optimization)
- [ECPP 1-04: Code Size Analysis](/blog/embedded/embedded-cpp/part1-04-code-size-analysis)
- [ECPP 2-07: Templates Cost](/blog/embedded/embedded-cpp/part2-07-templates-cost)
