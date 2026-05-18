---
title: "Part 1-07: 링커 스크립트와 C++"
date: 2026-05-13T07:00:00
description: "MEMORY와 SECTIONS — Flash와 RAM에 C++ 객체와 코드를 정확한 위치에 두는 법."
series: "Embedded C++ for Real Systems"
seriesOrder: 7
tags: [cpp, embedded, linker-script, sections, memory, init-array, vector-table]
type: tech
---

## 한 줄 요약

> **"링커 스크립트는 *바이너리의 지도*입니다."** — 각 섹션이 Flash와 RAM 어디에 가는지, C++ 객체는 어떻게 배치되는지를 정의합니다.

## 어떤 문제를 푸는가

ELF 파일은 *섹션의 집합*입니다. `.text`, `.rodata`, `.data`, `.bss`, `.init_array` 등이 *자동으로 어딘가에 배치되지 않습니다*. *링커 스크립트*가 *어느 메모리에, 어느 주소에* 두는지 결정합니다.

벤더 (STM32, NXP)가 *기본 링커 스크립트*를 제공하지만, *C++가 추가하는 섹션*(`.init_array`, `.fini_array`, `.gnu.linkonce.*`)이나 *프로젝트 특화 영역*(외부 SDRAM, CCM RAM, DMA buffer)을 다루려면 *직접 이해*해야 합니다.

전형적인 STM32F4의 메모리 레이아웃은 다음과 같이 배치됩니다.

![STM32F4 메모리 맵 — Flash/RAM/CCM 배치](/images/blog/embedded-cpp/diagrams/part1-07-memory-map.svg)

## 링커 스크립트의 두 핵심 — MEMORY와 SECTIONS

### MEMORY — 사용 가능한 메모리 영역

```ld
MEMORY {
    FLASH (rx)  : ORIGIN = 0x08000000, LENGTH = 1024K
    RAM   (rwx) : ORIGIN = 0x20000000, LENGTH = 192K
    CCM   (rwx) : ORIGIN = 0x10000000, LENGTH = 64K
}
```

각 영역:
- 이름 (`FLASH`, `RAM`, `CCM`)
- 권한 (`r`=read, `w`=write, `x`=execute)
- 시작 주소 (`ORIGIN`)
- 크기 (`LENGTH`)

STM32F407 예시:
- *FLASH* = 0x08000000부터 1MB
- *RAM* = 0x20000000부터 192KB (main SRAM)
- *CCM* = 0x10000000부터 64KB (Core-Coupled Memory, CPU 전용 빠른 RAM)

### SECTIONS — 섹션의 배치

```ld
SECTIONS {
    .isr_vector : {
        KEEP(*(.isr_vector))
    } >FLASH

    .text : {
        *(.text*)
        *(.rodata*)
    } >FLASH

    .data : {
        *(.data*)
    } >RAM AT >FLASH

    .bss : {
        *(.bss*)
        *(COMMON)
    } >RAM
}
```

`>FLASH`는 *VMA (Virtual Memory Address)*. `AT >FLASH`는 *LMA (Load Memory Address)*. 차이가 *`.data` 섹션*에서 중요.

## VMA vs LMA — `.data` 섹션의 이중성

`.data`는 *초기값 있는 mutable 변수*. *런타임에 RAM에 있어야* 하지만 *초기값은 Flash에 저장*되어야 함 (RAM은 전원 꺼지면 사라짐).

```cpp
int counter = 42;   // 초기값 42가 Flash, 런타임 사용은 RAM
```

링커 스크립트:

```ld
.data : {
    _sdata = .;           /* RAM 시작 주소 */
    *(.data*)
    _edata = .;           /* RAM 끝 주소 */
} >RAM AT >FLASH         /* VMA=RAM, LMA=FLASH */

_sidata = LOADADDR(.data); /* Flash 위치 */
```

Reset_Handler에서 *Flash의 _sidata에서 RAM의 _sdata로 복사*. (Part 1-06 참조).

## C++가 추가하는 섹션

C 코드 빌드와 다른 *C++ 특유 섹션*들.

### `.init_array` — static 생성자 포인터

```ld
.init_array : {
    PROVIDE_HIDDEN(__init_array_start = .);
    KEEP(*(SORT(.init_array.*)))
    KEEP(*(.init_array))
    PROVIDE_HIDDEN(__init_array_end = .);
} >FLASH
```

- `KEEP` — `--gc-sections`가 *제거하지 않게* 보호
- `SORT` — 초기화 우선순위에 따라 정렬
- `PROVIDE_HIDDEN` — symbol 노출하지만 dynamic symbol table엔 안 들어감

`__libc_init_array`가 `__init_array_start`부터 `__init_array_end`까지 *함수 포인터를 차례로 호출*. 자세한 흐름은 [Part 1-06](/blog/embedded/embedded-cpp/part1-06-startup-code).

### `.fini_array` — 소멸자 포인터

```ld
.fini_array : {
    PROVIDE_HIDDEN(__fini_array_start = .);
    KEEP(*(SORT(.fini_array.*)))
    KEEP(*(.fini_array))
    PROVIDE_HIDDEN(__fini_array_end = .);
} >FLASH
```

`__libc_fini_array`가 호출. 임베디드에선 *main이 안 끝나서* 보통 *호출 안 됨*. `-fno-use-cxa-atexit` 추가 시 *공간 절약*.

### `.gnu.linkonce.*` 또는 `.text.*` — 템플릿 인스턴스

같은 템플릿이 *여러 TU에서 인스턴스화*되면 *링커가 중복 제거*. C++17 이후 *대부분 자동 처리*.

### `.eh_frame` — 예외 unwind table

```ld
/DISCARD/ : {
    *(.eh_frame*)
    *(.ARM.extab*)
    *(.ARM.exidx*)
}
```

`-fno-exceptions` 환경에선 *완전 제거*. 수 KB 절약.

## 완성 링커 스크립트 — STM32F407 예시

C++ 임베디드 표준 스크립트.

```ld
/* STM32F407 1MB Flash, 192KB RAM */

MEMORY {
    FLASH (rx)  : ORIGIN = 0x08000000, LENGTH = 1024K
    RAM   (rwx) : ORIGIN = 0x20000000, LENGTH = 128K
    CCM   (rwx) : ORIGIN = 0x10000000, LENGTH = 64K
}

/* stack은 RAM 끝에서 시작 (downward 성장) */
_estack = ORIGIN(RAM) + LENGTH(RAM);

ENTRY(Reset_Handler)

SECTIONS {
    /* 0. Vector table — Flash 시작 */
    .isr_vector : {
        KEEP(*(.isr_vector))
        . = ALIGN(4);
    } >FLASH

    /* 1. Code — Flash */
    .text : {
        . = ALIGN(4);
        *(.text)
        *(.text*)
        *(.rodata)
        *(.rodata*)
        *(.glue_7)         /* ARM/Thumb interworking */
        *(.glue_7t)
        KEEP(*(.eh_frame))  /* keep if exceptions; else /DISCARD/ */
        . = ALIGN(4);
        _etext = .;
    } >FLASH

    /* 2. ARM exception index (예외 끄면 DISCARD) */
    .ARM.extab   : { *(.ARM.extab* .gnu.linkonce.armextab.*) } >FLASH
    .ARM : {
        __exidx_start = .;
        *(.ARM.exidx*)
        __exidx_end = .;
    } >FLASH

    /* 3. C++ static 생성자 — Flash */
    .preinit_array : {
        PROVIDE_HIDDEN(__preinit_array_start = .);
        KEEP(*(.preinit_array*))
        PROVIDE_HIDDEN(__preinit_array_end = .);
    } >FLASH

    .init_array : {
        PROVIDE_HIDDEN(__init_array_start = .);
        KEEP(*(SORT(.init_array.*)))
        KEEP(*(.init_array))
        PROVIDE_HIDDEN(__init_array_end = .);
    } >FLASH

    .fini_array : {
        PROVIDE_HIDDEN(__fini_array_start = .);
        KEEP(*(SORT(.fini_array.*)))
        KEEP(*(.fini_array))
        PROVIDE_HIDDEN(__fini_array_end = .);
    } >FLASH

    /* 4. .data — VMA=RAM, LMA=FLASH */
    _sidata = LOADADDR(.data);

    .data : {
        . = ALIGN(4);
        _sdata = .;
        *(.data)
        *(.data*)
        . = ALIGN(4);
        _edata = .;
    } >RAM AT >FLASH

    /* 5. .bss — RAM */
    .bss : {
        . = ALIGN(4);
        _sbss = .;
        __bss_start__ = _sbss;
        *(.bss)
        *(.bss*)
        *(COMMON)
        . = ALIGN(4);
        _ebss = .;
        __bss_end__ = _ebss;
    } >RAM

    /* 6. heap (newlib sbrk가 _end 사용) */
    ._user_heap_stack : {
        . = ALIGN(8);
        PROVIDE(end = .);
        PROVIDE(_end = .);
        . = . + _Min_Heap_Size;
        . = . + _Min_Stack_Size;
        . = ALIGN(8);
    } >RAM

    /* 7. CCM RAM에 임의 데이터 배치 (선택) */
    .ccmram : {
        . = ALIGN(4);
        _siccmram = LOADADDR(.ccmram);
        _sccmram = .;
        *(.ccmram)
        *(.ccmram*)
        . = ALIGN(4);
        _eccmram = .;
    } >CCM AT >FLASH

    /* 8. 불필요 섹션 제거 */
    /DISCARD/ : {
        libc.a (*)
        libm.a (*)
        libgcc.a (*)
    }
}

_Min_Heap_Size  = 0x200;   /* 512 bytes */
_Min_Stack_Size = 0x400;   /* 1 KB */
```

## Custom 섹션 — 특정 데이터를 특정 위치에

C++에서 *특정 변수*를 *특정 메모리 영역*에 두고 싶을 때 — `__attribute__((section(...)))`.

```cpp
// 큰 DMA buffer를 CCM RAM에
__attribute__((section(".ccmram")))
uint8_t dma_buffer[4096];

// 부트 시점에 .text 옆 const table
__attribute__((section(".text.const_lut")))
const uint8_t lookup_table[256] = { /* ... */ };
```

링커 스크립트가 `.ccmram` 섹션을 *CCM RAM에 배치*. 컴파일러는 *해당 변수를 그 섹션에* 넣음.

DMA buffer를 CCM에 두는 *흔한 케이스*는 *주의*. CCM은 *DMA가 접근 못 함* (peripheral bus와 연결 안 됨). *DMA용은 일반 SRAM*.

## C++ 객체의 *지정된 위치 배치*

C++ 객체도 같은 attribute로 위치 지정 가능.

```cpp
// 큰 lookup 객체를 Flash에 직접
__attribute__((section(".rodata.lookups")))
const std::array<uint16_t, 1024> sin_table = { /* compile-time computed */ };

// CCM에 두는 buffer pool
__attribute__((section(".ccmram")))
alignas(8) uint8_t packet_pool[8192];
```

*constexpr로 생성된 const data*는 `.rodata`에 자동 배치. 별도 지정 불필요한 경우가 많음.

## Symbol 정의 — Reset_Handler가 사용

링커 스크립트가 *symbol을 정의*하면 *C/C++ 코드에서 extern으로 참조* 가능.

```ld
/* 링커 스크립트 */
_sdata = .;
*(.data*)
_edata = .;
```

```cpp
// C++에서 사용
extern "C" {
    extern uint32_t _sdata;
    extern uint32_t _edata;
    extern uint32_t _sidata;
}

void copy_data() {
    uint32_t* src = &_sidata;
    uint32_t* dst = &_sdata;
    while (dst < &_edata) *dst++ = *src++;
}
```

*주소 자체*가 의미를 가지므로 *`&` 사용*. (변수 값이 아닌 위치).

## Memory Map 생성

링커 옵션 `-Wl,-Map=file.map`이 *모든 섹션과 심볼의 배치 정보*를 텍스트로 출력.

```bash
arm-none-eabi-g++ ... -Wl,-Map=firmware.map -o firmware.elf
```

`firmware.map` 안:

```text
Memory Configuration
Name             Origin             Length             Attributes
FLASH            0x08000000         0x100000           rx
RAM              0x20000000         0x20000            rwx
CCM              0x10000000         0x10000            rwx

Linker script and memory map
...
.text           0x08000000      0x4a3c
                0x08000000        _stext = .
 *(.text*)
 .text          0x08000000      0x0034 build/startup.o
                0x08000000                Reset_Handler
 .text          0x08000034      0x0080 build/main.o
                0x08000034                main
 ...
.init_array     0x08004b40       0x20
                0x08004b40                PROVIDE_HIDDEN (__init_array_start = .)
 *(.init_array)
 .init_array    0x08004b40       0x18 build/main.o
 .init_array    0x08004b58       0x04 build/logger.o
 .init_array    0x08004b5c       0x04 build/timer.o
                0x08004b60                PROVIDE_HIDDEN (__init_array_end = .)
```

*어느 .o 파일이 어느 섹션에 얼마나 기여*했는지 정확히 보임. *크기 분석의 핵심 도구* (Part 1-04 참조).

## 자주 보는 함정과 안티패턴

### 1. *`.init_array`에 `KEEP` 없음*
`--gc-sections`가 *static 생성자 함수 제거*. 객체 *zero-init만으로 시작* → 잘못된 동작. `KEEP` 필수.

### 2. *`AT >FLASH` 누락*
`.data` 초기값이 *Flash에 안 들어감*. *RAM의 초기값이 garbage*. Reset_Handler의 .data copy가 *garbage 복사*.

### 3. *Stack pointer 미정의*
vector table의 첫 entry가 *invalid*. CPU가 *random 주소를 SP로* 사용 → 즉시 crash. `_estack = ORIGIN(RAM) + LENGTH(RAM)` 필수.

### 4. *Heap과 Stack 영역 충돌*
*Heap 위로 자라고 Stack 아래로 자람*. 만나면 *조용히 데이터 corruption*. `_Min_Heap_Size`와 `_Min_Stack_Size` 명시.

### 5. *DMA buffer를 CCM에 두기*
CCM은 *CPU 전용 RAM*. *DMA controller가 접근 불가*. *bus fault*. DMA는 *AHB로 접근 가능한 일반 SRAM*에.

### 6. *예외 사용하면서 `.eh_frame` /DISCARD/*
`-fexceptions` + DISCARD → 런타임 *예외 정보 없음* → unwind 실패 → crash. 둘 중 하나로 통일.

### 7. *외부 SDRAM 미설정으로 access*
external memory는 *MMU 또는 FMC 초기화* 필요. 링커 스크립트만으로는 *주소 할당만*, *실제 access는 SystemInit 이후*.

## 측정 — 링커 스크립트 변경 효과

CCM RAM에 큰 buffer 옮김으로 main RAM 절약.

```text
# Before: 일반 RAM
.bss            32 KB  (4KB DMA buffer 포함)

# After: DMA buffer를 CCM에
.bss            28 KB
.ccmram          4 KB
```

main SRAM에 *4KB 여유*. RTOS task stack 추가에 활용.

## ld 스크립트 디버깅 — `--print-memory-usage`

```bash
arm-none-eabi-g++ ... -Wl,--print-memory-usage

Memory region         Used Size  Region Size  %age Used
           FLASH:       42688 B         1 MB      4.07%
             RAM:       30432 B       128 KB     23.21%
             CCM:        4096 B        64 KB      6.25%
```

CI에 추가해 *영역별 사용량 추적*.

## 정리

- 링커 스크립트는 MEMORY 영역 정의와 SECTIONS 배치 두 부분으로 구성됩니다.
- C++가 추가하는 섹션은 `.init_array`, `.fini_array`, `.eh_frame`이며 `KEEP`과 `--gc-sections`의 상호작용에 주의합니다.
- `.data`는 VMA를 RAM에, LMA를 FLASH에 둡니다. Reset_Handler가 부팅 시 복사합니다.
- 큰 buffer는 custom 섹션으로 CCM이나 SDRAM에 배치할 수 있습니다. 단 DMA buffer는 일반 SRAM에 두어야 합니다.
- `-Wl,-Map`으로 완전한 배치 정보를 얻고, CI에는 `--print-memory-usage`를 추가해 영역별 사용량을 추적합니다.

## 관련 항목

- [Part 1-06: 스타트업 코드](/blog/embedded/embedded-cpp/part1-06-startup-code) — Reset_Handler가 사용하는 symbol
- [Part 1-04: 코드 크기 분석](/blog/embedded/embedded-cpp/part1-04-code-size-analysis) — .map 파일과 size 명령
- [Part 3-03: Pool Allocator 구현](/blog/embedded/embedded-cpp/part3-03-pool-allocator) — custom 섹션에 pool 배치

## 다음 글

[Part 1-08: C++ 표준 선택](/blog/embedded/embedded-cpp/part1-08-cpp-standard-choice) — C++11/14/17/20/23 *어느 표준을 골라야 하나*. 임베디드 관점의 기능 비교.
