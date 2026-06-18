---
title: "링커 스크립트 기초 — SECTIONS·MEMORY·entry point"
date: 2026-04-12T09:26:00
description: "MEMORY·SECTIONS·alignment·기본 layout."
series: "Modern Embedded Recipes"
seriesOrder: 26
tags: [recipes, toolchain, linker]
draft: false
---

## 한 줄 요약

> **"링커 스크립트는 어떤 코드/데이터를 어떤 메모리 주소에 둘지 정합니다."** MEMORY로 chip의 메모리 영역을 선언하고, SECTIONS로 입력 섹션을 그 위에 매핑합니다.

## 어떤 상황에서 쓰나

- 새 chip을 처음 지원할 때
- TCM, CCM 같은 특수 영역을 활용
- Bootloader와 app의 영역 분리
- Symbol을 특정 주소에 배치(예: vector table)

## 핵심 개념

### 1) 가장 단순한 linker script

```text
ENTRY(Reset_Handler)

MEMORY
{
    FLASH (rx) : ORIGIN = 0x08000000, LENGTH = 1024K
    RAM   (rw) : ORIGIN = 0x20000000, LENGTH = 128K
}

SECTIONS
{
    .text :
    {
        KEEP(*(.vector_table))
        *(.text*)
        *(.rodata*)
    } > FLASH

    .data : 
    {
        *(.data*)
    } > RAM AT > FLASH

    .bss : 
    {
        *(.bss*)
    } > RAM
}
```

이 작은 스크립트만으로 단순 펌웨어가 빌드됩니다.

### 2) MEMORY 블록

각 메모리 영역의 속성과 범위를 선언합니다.

```text
NAME (속성) : ORIGIN = 시작, LENGTH = 크기

속성:
   r — readable
   w — writable
   x — executable
   ! — invert
```

```text
MEMORY
{
    BOOT    (rx)  : ORIGIN = 0x08000000, LENGTH = 32K
    APP     (rx)  : ORIGIN = 0x08008000, LENGTH = 992K
    SRAM    (rwx) : ORIGIN = 0x20000000, LENGTH = 128K
    CCM     (rwx) : ORIGIN = 0x10000000, LENGTH = 64K
    BACKUP  (rw)  : ORIGIN = 0x40024000, LENGTH = 4K
}
```

### 3) SECTIONS — output section 정의

```text
.section_name [start_addr] :
{
    pattern   ← 어떤 입력 섹션을 포함할지
    pattern
} > MEMORY_REGION
```

기본 패턴:

| 패턴 | 의미 |
|------|------|
| `*(.text)` | 모든 `.text` 입력 |
| `*(.text*)` | `.text`, `.text.foo`, `.text.bar` 등 모두 |
| `file.o(.data*)` | 특정 file의 `.data*` |
| `KEEP(*(.x))` | GC 대상 제외 (`gc-sections`에서 보호) |

### 4) `>` (VMA)와 `AT >` (LMA)

VMA(Virtual Memory Address)는 runtime 주소, LMA(Load Memory Address)는 처음에 저장된 주소입니다. 보통 같지만 `.data`는 다릅니다.

```text
.data :
{
    *(.data*)
} > RAM AT > FLASH
```

- VMA = RAM (실행 시 위치)
- LMA = FLASH (처음 저장 위치)

startup code가 LMA → VMA로 복사합니다. 다음 편에서 자세히 다룹니다.

### 5) Symbol 정의 — `_etext`, `_sdata` 등

linker는 script 안에서 symbol을 만들 수 있습니다.

```text
.data :
{
    _sdata = .;
    *(.data*)
    _edata = .;
} > RAM AT > FLASH

_sidata = LOADADDR(.data);   /* .data의 LMA */

.bss :
{
    _sbss = .;
    *(.bss*)
    *(COMMON)
    _ebss = .;
} > RAM
```

startup code가 이 symbol들로 영역 시작/끝을 압니다.

```c
extern uint32_t _sdata, _edata, _sidata, _sbss, _ebss;

void copy_data(void) {
    uint32_t *src = &_sidata;
    uint32_t *dst = &_sdata;
    while (dst < &_edata) *dst++ = *src++;
}

void zero_bss(void) {
    for (uint32_t *p = &_sbss; p < &_ebss; p++) *p = 0;
}
```

### 6) `ALIGN` — 정렬

```text
.text :
{
    *(.text*)
    . = ALIGN(4);        /* 4-byte alignment */
    *(.rodata*)
} > FLASH
```

`.`(location counter)을 align 한 후 다음 데이터 배치. ARM은 32-bit access를 위해 4-byte alignment 권장.

## 코드 / 실제 사용 예

STM32F4용 실제 linker script:

```text
ENTRY(Reset_Handler)

MEMORY
{
    FLASH (rx)  : ORIGIN = 0x08000000, LENGTH = 1024K
    SRAM  (rwx) : ORIGIN = 0x20000000, LENGTH = 128K
}

_estack = ORIGIN(SRAM) + LENGTH(SRAM);   /* stack top */
_Min_Heap_Size  = 0x200;                  /* 512 byte */
_Min_Stack_Size = 0x400;                  /* 1 KB */

SECTIONS
{
    .isr_vector :
    {
        . = ALIGN(4);
        KEEP(*(.isr_vector))
        . = ALIGN(4);
    } > FLASH

    .text :
    {
        . = ALIGN(4);
        *(.text*)
        *(.glue_7)
        *(.glue_7t)
        KEEP (*(.init))
        KEEP (*(.fini))
        . = ALIGN(4);
        _etext = .;
    } > FLASH

    .rodata :
    {
        . = ALIGN(4);
        *(.rodata*)
        . = ALIGN(4);
    } > FLASH

    .data :
    {
        . = ALIGN(4);
        _sdata = .;
        *(.data*)
        . = ALIGN(4);
        _edata = .;
    } > SRAM AT > FLASH

    _sidata = LOADADDR(.data);

    .bss :
    {
        . = ALIGN(4);
        _sbss = .;
        *(.bss*)
        *(COMMON)
        . = ALIGN(4);
        _ebss = .;
    } > SRAM

    ._user_heap_stack :
    {
        . = ALIGN(8);
        PROVIDE(end = .);
        . = . + _Min_Heap_Size;
        . = . + _Min_Stack_Size;
        . = ALIGN(8);
    } > SRAM
}
```

빌드:

```bash
arm-none-eabi-gcc \
    -mcpu=cortex-m4 -mthumb \
    -T linker.ld \
    -Wl,-Map=app.map \
    main.c startup.s -o app.elf

arm-none-eabi-size app.elf
```

## 측정 / 비교

| 일반 명령 | 효과 |
| --- | --- |
| `> REGION` | output section을 region에 둠 |
| `AT > REGION` | LMA를 다른 region에 둠 |
| `. = ALIGN(N)` | location counter를 N-byte align |
| `KEEP(*(.x))` | gc-sections에서 보호 |
| `PROVIDE(sym)` | 정의되지 않은 경우만 정의 |
| `LOADADDR(.section)` | section의 LMA 반환 |

| 명령 옵션 | 의미 |
| --- | --- |
| `-T script.ld` | linker script 지정 |
| `-Wl,-Map=file.map` | map 파일 출력 |
| `-Wl,--gc-sections` | unused section 제거 |
| `-ffunction-sections -fdata-sections` | function/data별 section (gc 위해) |

## 자주 보는 함정

> ⚠️ Vector table에 `KEEP` 빠짐

`--gc-sections`가 사용 안 보이는 vector table을 제거합니다. `KEEP(*(.isr_vector))`로 보호 필수.

> ⚠️ `.bss`를 LOAD 영역에 둠

`.bss`는 0으로 초기화되므로 flash에 데이터를 가질 필요 없습니다. AT 없이 `> RAM`만 쓰면 됩니다.

> ⚠️ Stack 영역 정의 누락

linker script에 stack을 명시 안 하면 heap과 stack이 같은 영역에서 자라 충돌. `_estack = ORIGIN(SRAM) + LENGTH(SRAM)`로 stack top 명시.

> ⚠️ Heap이 부족

`malloc`을 쓰는데 `_Min_Heap_Size`가 0이면 첫 호출에서 실패. newlib는 `_sbrk`가 heap을 확장.

> ⚠️ Section name이 input과 불일치

`*(.text)`는 정확히 `.text`만 잡고 `.text.foo`는 안 잡습니다. `*(.text*)`로 모든 변형 포함.

## 정리

- 링커 스크립트는 MEMORY로 영역을 선언하고 SECTIONS로 입력을 매핑합니다.
- `>` (VMA)와 `AT >` (LMA)로 runtime 위치와 저장 위치를 분리할 수 있습니다.
- `_sdata`, `_sbss` 같은 symbol을 정의해 startup code가 활용합니다.
- `KEEP`, `ALIGN`, `PROVIDE` 같은 명령으로 세밀한 제어가 가능합니다.
- Vector table KEEP, stack symbol 정의가 기본 체크포인트입니다.

다음 편에서는 **링커 스크립트 고급**을 다룹니다. LMA vs VMA의 응용, overlay, custom section입니다.

## 관련 항목

- [3-03: ELF 파일 구조](/blog/embedded/modern-recipes/part3-03-elf-format)
- [3-05: 링커 스크립트 고급](/blog/embedded/modern-recipes/part3-05-linker-script-advanced)
- [3-06: 스타트업 코드 분석](/blog/embedded/modern-recipes/part3-06-startup-code)
- [3-08: 메모리 레이아웃](/blog/embedded/modern-recipes/part3-08-memory-layout)
