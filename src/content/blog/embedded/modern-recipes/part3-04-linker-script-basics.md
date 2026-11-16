---
title: "링커 스크립트 기초 — SECTIONS·MEMORY·entry point"
slug: "embedded/modern-recipes/part3-04-linker-script-basics"
date: 2026-04-12T09:26:00
description: "MEMORY·SECTIONS·alignment·기본 layout."
series: "Modern Embedded Recipes"
seriesOrder: 26
tags: [recipes, toolchain, linker]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> **"링커 스크립트는 어떤 코드/데이터를 어떤 메모리 주소에 둘지 정합니다."** MEMORY로 chip의 메모리 영역을 선언하고, SECTIONS로 입력 섹션을 그 위에 매핑합니다.

## 어떤 상황에서 쓰나

- 새 chip을 처음 지원할 때
- TCM, CCM 같은 특수 영역을 활용
- Bootloader와 app의 영역 분리
- Symbol을 특정 주소에 배치(예: vector table)

이 글의 linker script는 Debian 13 arm64 guest의 `gcc-arm-none-eabi` 14.2.rel1(GNU ld 2.44)로 실제로 링크했고, STM32F4용 script로 만든 이미지는 QEMU 11.1.3의 `netduinoplus2`(STM32F405, Flash 0x08000000) 모델에서 돌렸습니다. 명령의 정의는 GNU ld 매뉴얼(sourceware.org/binutils/docs/ld)에서 옮겼습니다.

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

이것이 뼈대입니다. 이 script에는 startup 코드가 쓸 `_sdata`·`_edata` 같은 symbol이 없어서, 아래 5)절의 `copy_data()`를 그대로 링크하면 "undefined reference to `_sdata'"가 납니다. symbol 정의는 5)절에서 더합니다.

### 2) MEMORY 블록

각 메모리 영역의 속성과 범위를 선언합니다.

형식은 `NAME (속성) : ORIGIN = 시작, LENGTH = 크기`입니다. GNU ld 매뉴얼 3.7 "MEMORY Command"가 정의한 속성 문자는 다음과 같습니다.

| 문자 | 의미 |
| --- | --- |
| `R` | Read-only section |
| `W` | Read/write section |
| `X` | Executable section |
| `A` | Allocatable section |
| `I` / `L` | Initialized section |
| `!` | 뒤에 오는 속성의 의미를 뒤집음 |

매뉴얼은 이 속성이 *SECTIONS에서 region을 지정하지 않은 section*이 어느 region으로 갈지 고를 때 쓰인다고 설명합니다("If an unmapped section matches any of the listed attributes other than '!', it will be placed in the memory region"). `> FLASH`처럼 region을 직접 쓴 section에는 속성이 영향을 주지 않으므로, 속성을 `(rx)`로 적었다고 그 region이 쓰기 금지되는 것은 아닙니다.

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
    pattern
    pattern
} > MEMORY_REGION
```

중괄호 안의 `pattern`은 어떤 입력 섹션을 이 output section에 포함할지 지정합니다.

기본 패턴:

| 패턴 | 의미 |
|------|------|
| `*(.text)` | 모든 `.text` 입력 |
| `*(.text*)` | `.text`, `.text.foo`, `.text.bar` 등 모두 |
| `file.o(.data*)` | 특정 file의 `.data*` |
| `KEEP(*(.x))` | `--gc-sections`로 지우지 않음 (ld 매뉴얼 3.6.4.4) |

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

`.`(location counter)을 4의 배수로 올린 뒤 다음 데이터를 배치합니다. 아래 startup 코드가 `.data`를 `uint32_t` 단위로 복사하고 `.bss`를 word 단위로 지우므로, `_sdata`·`_edata`·`_sbss`·`_ebss`가 4의 배수여야 마지막 word가 넘치거나 모자라지 않습니다.

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

위 script를 그대로 `stm32f4.ld`로 저장하고, 앞 절의 `copy_data`·`zero_bss`를 부르는 `Reset_Handler`와 아래 `main`으로 빌드했습니다. 출력은 [2-03](/blog/embedded/modern-recipes/part2-03-arm-registers)의 semihosting `puthex`로 냅니다.

```c
uint32_t initialized = 0xCAFEF00D;     /* .data */
uint32_t zeroed[4];                     /* .bss */
__attribute__((used)) void unused_function(void) { }
void never_called(void) { }            /* removable with --gc-sections */
int main(void) {
    puthex("_sidata (LMA of .data) = ", (uint32_t)&_sidata);
    puthex("_sdata  (VMA of .data) = ", (uint32_t)&_sdata);
    puthex("_ebss                  = ", (uint32_t)&_ebss);
    puthex("initialized            = ", initialized);
    puthex("zeroed[3]              = ", zeroed[3]);
    return 0;
}
```

```bash
F="-mcpu=cortex-m4 -mthumb -O1 -ffunction-sections -fdata-sections -nostdlib"
arm-none-eabi-gcc $F -T stm32f4.ld -Wl,--gc-sections,-Map=app.map startup.c main.c semi.c -o app.elf
arm-none-eabi-size -A app.elf
qemu-system-arm -M netduinoplus2 -nographic -monitor none -serial none \
    -semihosting-config enable=on,target=native -kernel app.elf
```

```text
section             size        addr
.isr_vector           64   134217728
.text                364   134217792
.rodata              160   134218156
.data                  4   536870912
.bss                  16   536870916
._user_heap_stack   1540   536870932

_sidata (LMA of .data) = 0x0800024C
_sdata  (VMA of .data) = 0x20000000
_ebss                  = 0x20000014
initialized            = 0xCAFEF00D
zeroed[3]              = 0x00000000
```

`.data`의 LMA(`_sidata`)는 Flash의 0x0800024C, VMA(`_sdata`)는 RAM의 0x20000000이고, startup이 복사한 뒤 `initialized`가 초기값을 갖습니다. `._user_heap_stack`의 1540 byte는 `ALIGN(8)` 뒤 heap 0x200 + stack 0x400(1536)에 정렬 padding이 붙은 값입니다.

map 파일의 "Discarded input sections"에는 `--gc-sections`가 지운 함수가 나옵니다.

```text
 .text.unused_function
 .text.never_called
```

`__attribute__((used))`를 붙인 `unused_function`도 지워졌습니다. `used`는 컴파일러가 함수를 버리지 말라는 표시일 뿐, linker의 section GC를 막지는 못합니다. linker에서 지키려면 `KEEP`을 씁니다.

## 측정 / 비교

| 일반 명령 | 효과 |
| --- | --- |
| `> REGION` | output section을 region에 둠 |
| `AT > REGION` | LMA를 다른 region에 둠 |
| `. = ALIGN(N)` | location counter를 N-byte align |
| `KEEP(*(.x))` | gc-sections에서 보호 |
| `PROVIDE(sym = expr)` | 참조되었지만 어느 object도 정의하지 않은 경우에만 정의 (ld 매뉴얼 3.5.3) |
| `LOADADDR(.section)` | section의 LMA 반환 |

| 명령 옵션 | 의미 |
| --- | --- |
| `-T script.ld` | linker script 지정 |
| `-Wl,-Map=file.map` | map 파일 출력 |
| `-Wl,--gc-sections` | unused section 제거 |
| `-ffunction-sections -fdata-sections` | function/data별 section (gc 위해) |
| `-Wl,--print-gc-sections` | gc가 지운 section을 출력 |
| `-Wl,--orphan-handling=warn` | script에 없는 section을 경고 |

## 자주 보는 함정

> ⚠️ Vector table에 `KEEP` 빠짐

`--gc-sections`는 `ENTRY`와 참조에서 닿지 않는 section을 지웁니다. vector table은 코드에서 참조하지 않으므로 `KEEP`이 없으면 지워집니다. 위 script에서 `KEEP(*(.isr_vector))`만 `*(.isr_vector)`로 바꿔 `--print-gc-sections`로 링크한 결과입니다.

```text
ld: removing unused section '.isr_vector' in file '/tmp/ccrT11WV.o'
.isr_vector            0   134217728
.text                360   134217728
```

`.isr_vector` 크기가 0이 되어 Flash 첫 word에 stack pointer 대신 코드가 놓입니다.

> ⚠️ `.bss`에 `AT > FLASH`를 붙임

`.bss`는 파일에 내용이 없는 `NOBITS` section이라 LMA를 줄 이유가 없습니다. `.bss`에 `AT > FLASH`를 붙여 링크해 봐도 `objcopy -O binary` 결과는 둘 다 596 byte로 같았고, `readelf -lSW`로 본 section header·program header도 `AT`를 붙이지 않은 링크와 똑같았습니다. 효과가 없는 지정이므로 `> SRAM`만 씁니다.

> ⚠️ Stack 영역 정의 누락

`_estack`은 vector table 첫 word, 곧 reset 직후 MSP 값입니다. 위 script는 이를 RAM 끝(`ORIGIN(SRAM) + LENGTH(SRAM)`)으로 두고, `._user_heap_stack`으로 heap·stack 크기만큼 RAM을 예약합니다. 이 예약이 있어야 `.data`·`.bss`가 늘어 RAM이 부족해질 때 linker가 "region `SRAM' overflowed"로 알려 줍니다. 예약은 크기 검사일 뿐 실행 중 stack이 그 안에 머문다는 보장은 아니므로, overflow 감지는 [2-07](/blog/embedded/modern-recipes/part2-07-arm-mpu)의 MPU guard 같은 장치로 따로 합니다.

> ⚠️ Heap이 부족

newlib의 `malloc`은 `_sbrk`로 heap을 늘립니다. libgloss `libnosys/sbrk.c`의 `_sbrk`는 linker가 정한 `end` symbol에서 시작해 요청만큼 포인터를 올려 줄 뿐, 상한을 검사하지 않습니다. 위 script의 `PROVIDE(end = .)`가 그 시작점이고, `_Min_Heap_Size`는 link 때 RAM이 남는지 확인하는 용도일 뿐 실행 중의 heap 한도가 아닙니다. heap이 stack과 부딪히지 않게 하려면 `_sbrk`를 직접 구현해 상한을 검사합니다.

> ⚠️ Section name이 input과 불일치

`*(.text)`는 정확히 `.text`만 잡고 `.text.foo`는 안 잡습니다. `-ffunction-sections`로 컴파일하면 함수마다 `.text.<함수명>` section이 생기므로, 위 script의 `*(.text*)`를 `*(.text)`로 바꾸면 함수들이 모두 script에 없는 orphan이 됩니다. `--orphan-handling=warn`으로 링크하면 이렇게 알려 줍니다.

```text
ld: warning: orphan section `.text.Default_Handler' from `/tmp/cckYw3C0.o' being placed in section `.text.Default_Handler'
ld: warning: orphan section `.text.copy_data' from `/tmp/cckYw3C0.o' being placed in section `.text.copy_data'
```

ld 매뉴얼 3.10.4 "Orphan Sections"대로 linker는 orphan을 버리지 않고 같은 이름의 새 output section을 만들어 넣습니다. 링크는 성공하지만 배치가 script의 의도와 달라집니다. 같은 링크를 `--orphan-handling` 없이 하면 경고가 한 줄도 나오지 않았으므로, 이 상황을 `--orphan-handling=warn`이나 `error`로 잡아 둡니다.

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
