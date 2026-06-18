---
title: "Map 파일 분석 — Symbol·Section·Size 추적으로 코드 크기 진단"
date: 2026-04-12T09:32:00
description: "메모리 사용·심볼 위치·dead code 추적."
series: "Modern Embedded Recipes"
seriesOrder: 32
tags: [recipes, toolchain, mapfile]
draft: false
---

## 한 줄 요약

> **"맵 파일은 빌드 후 메모리 지도입니다."** 어떤 함수가 어디 있는지, 누가 큰지, 무엇이 제거됐는지 모두 보여 줍니다.

## 어떤 상황에서 쓰나

- Flash가 가득 차 무엇을 줄일지 결정
- 의도와 다른 영역에 변수가 배치된 경우 추적
- LTO나 gc-sections 후 무엇이 살아남았는지 확인
- Static library 중 어떤 file이 실제로 들어갔는지 파악

## 핵심 개념

### 1) 맵 파일 생성

```bash
arm-none-eabi-gcc -Wl,-Map=app.map main.c -o app.elf
```

`app.map`은 텍스트 파일이며 보통 수천 줄입니다. 주요 섹션은 5개:

1. Archive member 사용 여부
2. Discarded input section (gc-sections 결과)
3. Memory configuration (MEMORY block)
4. Linker script와 SECTIONS 처리
5. Symbol 위치 list

### 2) Memory configuration 섹션

```text
Memory Configuration

Name             Origin             Length             Attributes
FLASH            0x08000000         0x00100000         xr
SRAM             0x20000000         0x00020000         xrw
*default*        0x00000000         0xffffffff
```

linker script의 MEMORY가 그대로 출력됩니다. chip별 영역 확인용.

### 3) Linker script section dump

```text
.text           0x08000000     0x10c4
 *(.isr_vector)
 .isr_vector    0x08000000      0x1ac startup.o
                0x08000000                vector_table
 *(.text*)
 .text.main     0x080001ac       0x30 main.o
                0x080001ac                main
 .text.setup    0x080001dc       0x40 main.o
                0x080001dc                setup
 *(.rodata*)
 .rodata.str1   0x0800020c       0x0a main.o
```

각 input section이 어디서 와서 어디에 갔는지 한 눈에 보입니다. file 단위 추적 가능.

### 4) Symbol 위치 list

**Symbol Table:**

- 0x080001ac                main
- 0x080001dc                setup
- 0x080001fc                gpio_init
- 0x20000000                _sdata
- 0x20000010                _edata
- 0x20000010                _sbss
- 0x20000130                _ebss
- 0x20020000                _estack

`grep`로 특정 symbol 위치 추적이 빠릅니다.

### 5) Archive member usage

```text
LOAD c:/.../libc_nano.a
LOAD c:/.../libgcc.a

Archive member included to satisfy reference by file (symbol)

libc_nano.a(lib_a-printf.o)
                              main.o (printf)
libc_nano.a(lib_a-vfprintf.o)
                              lib_a-printf.o (_vfprintf_r)
libc_nano.a(lib_a-malloc.o)
                              lib_a-vfprintf.o (malloc)
```

`printf` 한 번 호출이 vfprintf → malloc → free 등 연쇄로 들어옴을 확인.

### 6) `--print-gc-sections`

`--gc-sections` 사용 시 어떤 section이 제거됐는지 출력합니다.

```bash
arm-none-eabi-gcc -Wl,--gc-sections -Wl,--print-gc-sections \
    main.c -o app.elf
```

```text
removing unused section '.text.unused_func' in file 'main.o'
removing unused section '.text.other_unused' in file 'foo.o'
```

대규모 코드에서 의도치 않은 제거를 잡을 때 유용합니다.

## 코드 / 실제 사용 예

큰 함수 찾기 — symbol을 size로 정렬:

```bash
arm-none-eabi-nm --size-sort --print-size app.elf | tail -20
# 00000234 t vfprintf
# 00000180 t printf
# 0000010c t main
# 000000a0 T USART1_IRQHandler
# 00000080 r vector_table
```

소문자(t, b, d)는 LOCAL, 대문자(T, B, D)는 GLOBAL.

Section 크기 한눈에 보기:

```bash
arm-none-eabi-size -A app.elf
# section            size       addr
# .isr_vector         428    134217728
# .text              4292    134218156
# .rodata             576    134222448
# .data                64    536870912
# .bss               1024    536870976
# .heap               512    536872000
# .stack             4096    536872512
# Total             10992
```

map 파일에서 특정 file의 기여도 분석:

```bash
# main.o가 차지하는 모든 위치
grep "main.o" app.map | head

# libgcc 함수만
grep "libgcc.a" app.map
```

map 파일을 분석하는 도구도 있습니다.

```bash
# bloaty (구글 도구)
bloaty app.elf

# puncover (인터랙티브 시각화)
pip install puncover
puncover --gcc_tools_base /usr/bin/arm-none-eabi- --elf_file app.elf
```

## 측정 / 비교

| 분석 작업 | 도구 |
| --- | --- |
| Section 크기 | `size -A` |
| 큰 symbol | `nm --size-sort` |
| Symbol 위치 | map file 또는 `nm` |
| Dead section | `--print-gc-sections` |
| Library 사용 | map file "Archive member" |
| 시각화 | bloaty, puncover |

| 일반적인 펌웨어 분포 (32 KB flash) |
| --- |
| Vector table: 0.4 KB |
| Application code: 18 KB |
| Library (printf 등): 8 KB |
| `.rodata`: 3 KB |
| `.data` init: 1 KB |
| Padding: 1.6 KB |

## 자주 보는 함정

> ⚠️ Map 파일 안 만들고 빌드

`-Wl,-Map=` 빠지면 map 파일이 안 만들어집니다. CMake `target_link_options(... -Wl,-Map=$<TARGET_NAME>.map)` 처럼 미리 빌드 시스템에 추가.

> ⚠️ `printf` 한 번이 8 KB 차지

stdio 전체 chain이 같이 link됩니다. embedded는 `tinyprintf` 또는 custom 구현으로 1 KB 이하 가능.

> ⚠️ Static library 전체가 link됨

`-Wl,--gc-sections` 없으면 사용 안 하는 함수도 link됩니다. `-ffunction-sections`와 함께 써야 효과.

> ⚠️ `nm`이 `.bss` symbol을 못 보여줌

stripped binary는 symbol 정보가 사라짐. `app.elf`(stripped 전) 사용. `objcopy --strip-debug`로 debug만 제거 가능.

> ⚠️ Map 파일 line이 너무 많아 분석 포기

처음에는 grep로 특정 section만 보기, bloaty 같은 시각화 도구 활용.

## 정리

- 맵 파일은 빌드 후 메모리 사용 전체 지도입니다.
- `-Wl,-Map=app.map`으로 생성하고, section별·symbol별 위치를 확인합니다.
- `nm --size-sort`로 큰 symbol을 찾고, archive member 섹션으로 library 사용을 분석합니다.
- `--print-gc-sections`로 제거된 dead code를 확인.
- bloaty, puncover 같은 시각화 도구가 큰 코드베이스에 유용.
- `printf` 같은 한 번의 호출이 KB 단위로 link 결과를 키울 수 있습니다.

다음 편에서는 **Make와 CMake (cross-compile)**을 다룹니다. 빌드 시스템의 표준화입니다.

## 관련 항목

- [3-03: ELF 파일 구조](/blog/embedded/modern-recipes/part3-03-elf-format)
- [3-08: 메모리 레이아웃](/blog/embedded/modern-recipes/part3-08-memory-layout)
- [3-09: 컴파일러 최적화](/blog/embedded/modern-recipes/part3-09-compiler-optimization)
- [3-11: Make와 CMake (cross-compile)](/blog/embedded/modern-recipes/part3-11-make-cmake-cross)
