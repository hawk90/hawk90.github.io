---
title: "임베디드 C++ 링커 스크립트 — vtable·정적 객체 배치 추적"
slug: "embedded/embedded-cpp/part1-07-linker-scripts"
date: 2026-04-28T09:07:00
description: "MEMORY와 SECTIONS — Flash와 RAM에 C++ 객체와 코드를 정확한 위치에 두는 법."
series: "Embedded C++ for Real Systems"
seriesOrder: 7
tags: [cpp, embedded, linker-script, sections, memory, init-array, vector-table]
type: tech
topics: ["embedded"]
---

## 한 줄 요약

> **"링커 스크립트는 바이너리의 지도입니다."** 각 섹션이 Flash와 RAM 어디에 가는지, C++ 객체는 어떻게 배치되는지를 정의합니다.

## 어떤 문제를 푸는가

ELF 파일은 섹션의 집합입니다. `.text`, `.rodata`, `.data`, `.bss`, `.init_array` 등은 자동으로 어딘가에 배치되지 않습니다. 링커 스크립트가 어느 메모리의 어느 주소에 두는지 결정합니다.

벤더(STM32, NXP)가 기본 링커 스크립트를 제공하지만, C++가 추가하는 섹션(`.init_array`, `.fini_array`, `.gnu.linkonce.*`)이나 프로젝트 특화 영역(외부 SDRAM, CCM RAM, DMA buffer)을 다루려면 직접 이해해야 합니다.

아래 예시는 STM32F407VG의 1MiB Flash, 128KiB 일반 SRAM과 별도 64KiB CCM을 구분합니다. 총 192KiB를 0x20000000의 연속 SRAM으로 선언하면 안 됩니다. 같은 STM32F4 계열이라도 SKU별 크기는 제품 자료에서 확인합니다.

![STM32F4 메모리 맵 — Flash/RAM/CCM 배치](/images/blog/embedded-cpp/diagrams/part1-07-memory-map.svg)

그림의 중간 section 경계 주소는 설명용 예시이며 이 글의 오브젝트에서 측정한 최종 주소가 아닙니다.

## 링커 스크립트의 두 핵심 — MEMORY와 SECTIONS

### MEMORY — 사용 가능한 메모리 영역

```ld
MEMORY {
    FLASH (rx)  : ORIGIN = 0x08000000, LENGTH = 1024K
    RAM   (rwx) : ORIGIN = 0x20000000, LENGTH = 128K
    CCM   (rwx) : ORIGIN = 0x10000000, LENGTH = 64K
}
```

각 영역은 다음과 같이 구성됩니다.

- 이름(`FLASH`, `RAM`, `CCM`)
- 영역 속성(`r`=read, `w`=write, `x`=execute). GNU ld의 orphan section 배치 선택에 쓰이며 MPU 권한을 설정하지는 않습니다
- 시작 주소(`ORIGIN`)
- 크기(`LENGTH`)

STM32F407 예시는 다음과 같습니다.

- FLASH는 0x08000000부터 1MB입니다
- 일반 SRAM은 0x20000000부터 128KiB이며, 총 SRAM 192KiB 중 나머지 64KiB는 CCM입니다
- CCM은 0x10000000부터 64KB(Core-Coupled Memory, CPU 전용 빠른 RAM)입니다

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

`>FLASH`는 실행 시 주소인 VMA(Virtual Memory Address)의 영역을 고르고, `AT >FLASH`는 초기 이미지 주소인 LMA(Load Memory Address)의 영역을 고릅니다. 차이는 `.data` 섹션에서 중요해집니다.

## VMA vs LMA — `.data` 섹션의 이중성

`.data`는 초기값 있는 mutable 변수입니다. 런타임에는 RAM에 있어야 하지만 초기값은 Flash에 저장되어야 합니다(RAM은 전원이 꺼지면 사라집니다).

```cpp
int counter = 42;   // 초기값 42가 Flash, 런타임 사용은 RAM
```

링커 스크립트는 다음과 같습니다.

```ld
.data : {
    _sdata = .;           /* RAM 시작 주소 */
    *(.data*)
    _edata = .;           /* RAM 끝 주소 */
} >RAM AT >FLASH         /* VMA=RAM, LMA=FLASH */

_sidata = LOADADDR(.data); /* Flash 위치 */
```

Reset_Handler에서 Flash의 `_sidata`에서 RAM의 `_sdata`로 복사합니다(Part 1-06 참조).

## C++가 추가하는 섹션

C 코드 빌드와 다른 C++ 특유의 섹션들입니다.

### `.init_array` — static 생성자 포인터

```ld
.init_array : {
    PROVIDE_HIDDEN(__init_array_start = .);
    KEEP(*(SORT_BY_INIT_PRIORITY(.init_array.*)))
    KEEP(*(.init_array))
    PROVIDE_HIDDEN(__init_array_end = .);
} >FLASH
```

- `KEEP`은 `--gc-sections`가 제거하지 않도록 보호합니다
- `SORT_BY_INIT_PRIORITY`는 우선순위 숫자에 따라 정렬합니다. 일반 SORT의 이름순 정렬과 구분합니다
- `PROVIDE_HIDDEN`은 참조되고 다른 곳에 정의되지 않은 symbol을 hidden visibility로 제공합니다

`__libc_init_array`가 `__init_array_start`부터 `__init_array_end`까지 함수 포인터를 차례로 호출합니다. 자세한 흐름은 [Part 1-06](/blog/embedded/embedded-cpp/part1-06-startup-code)에서 다룹니다.

### `.fini_array` — 소멸자 포인터

```ld
.fini_array : {
    PROVIDE_HIDDEN(__fini_array_start = .);
    KEEP(*(SORT_BY_INIT_PRIORITY(.fini_array.*)))
    KEEP(*(.fini_array))
    PROVIDE_HIDDEN(__fini_array_end = .);
} >FLASH
```

`__libc_fini_array`가 호출합니다. main 이후 종료 경로가 있는지 startup에서 확인해야 합니다. 전역 C++ 객체의 소멸자 등록은 .fini_array와 별개로 __cxa_atexit/atexit를 사용할 수 있습니다. `-fno-use-cxa-atexit`는 등록 방식을 바꾸며 소멸자를 없애지 않습니다.

### `.gnu.linkonce.*` 또는 `.text.*` — 템플릿 인스턴스

같은 템플릿이 여러 TU에서 인스턴스화되면 링커가 중복을 제거합니다. COMDAT/weak 등의 오브젝트·링커 규칙에 따른 동작이며 C++17에 처음 도입된 기능이 아닙니다.

### `.eh_frame` — 예외 unwind table

```ld
/DISCARD/ : {
    *(.eh_frame*)
    *(.ARM.extab*)
    *(.ARM.exidx*)
}
```

예외를 끈 C++이라도 unwind 정보는 디버깅·stack unwinding 등 다른 소비자가 사용할 수 있습니다. ARM EHABI는 .ARM.exidx/.ARM.extab를 사용하므로 .eh_frame만으로 판단하지 않습니다. 위 DISCARD 조각을 무조건 적용하지 말고 toolchain과 runtime 계약을 확인합니다.

## 링커 스크립트 예시 — SRAM과 CCM을 분리하기

다음은 GNU ld 문법으로 작성한 교육용 Cortex-M 메모리 배치입니다. vector·copy/zero symbol·array 경계를 정의하지만 vendor startup, newlib, 실제 board 설정을 포함한 완성 firmware는 아닙니다. main SRAM의 heap·stack 최소 여유는 ASSERT로 검사하며 런타임의 실제 stack 최대 사용량까지 보장하지는 않습니다.

```ld title="memory.ld"
ENTRY(Reset_Handler)
MEMORY {
    FLASH (rx) : ORIGIN = 0x08000000, LENGTH = 1024K
    RAM (rw)   : ORIGIN = 0x20000000, LENGTH = 128K
    CCM (rw)   : ORIGIN = 0x10000000, LENGTH = 64K
}
_estack = ORIGIN(RAM) + LENGTH(RAM);
_Min_Heap_Size = 0x200;
_Min_Stack_Size = 0x400;
SECTIONS {
    .isr_vector : { KEEP(*(.isr_vector)) } >FLASH
    .text : { *(.text .text.*) *(.rodata .rodata.*) } >FLASH
    .ARM.extab : { *(.ARM.extab* .gnu.linkonce.armextab.*) } >FLASH
    .ARM.exidx : {
        __exidx_start = .; *(.ARM.exidx*) __exidx_end = .;
    } >FLASH
    .preinit_array : {
        __preinit_array_start = .; KEEP(*(.preinit_array*)) __preinit_array_end = .;
    } >FLASH
    .init_array : {
        __init_array_start = .;
        KEEP(*(SORT_BY_INIT_PRIORITY(.init_array.*))) KEEP(*(.init_array))
        __init_array_end = .;
    } >FLASH
    .fini_array : {
        __fini_array_start = .;
        KEEP(*(SORT_BY_INIT_PRIORITY(.fini_array.*))) KEEP(*(.fini_array))
        __fini_array_end = .;
    } >FLASH
    .data : {
        . = ALIGN(4); _sdata = .; *(.data .data.*) . = ALIGN(4); _edata = .;
    } >RAM AT >FLASH
    _sidata = LOADADDR(.data);
    .bss (NOLOAD) : {
        . = ALIGN(4); _sbss = .; *(.bss .bss.*) *(COMMON) . = ALIGN(4); _ebss = .;
    } >RAM
    .dma (NOLOAD) : { . = ALIGN(4); *(.dma .dma.*) . = ALIGN(4); } >RAM
    . = ALIGN(8); _end = .;
    .ccmram (NOLOAD) : {
        . = ALIGN(8); _sccmram = .; *(.ccmram .ccmram.*) . = ALIGN(8); _eccmram = .;
    } >CCM
}
ASSERT(_end + _Min_Heap_Size + _Min_Stack_Size <= _estack, "RAM reserve overflow")
```

`.dma`와 `.ccmram`은 초기 이미지가 없는 NOLOAD 영역입니다. 위 스크립트에서는 .bss zero loop에 포함되지 않으므로 사용 전에 명시적으로 초기화합니다. CCM에 초기값 있는 데이터를 넣으려면 NOLOAD 대신 별도의 LMA와 copy 경로를 함께 설계해야 합니다. libc/libgcc 전체를 DISCARD하면 실제로 필요한 초기화·산술 helper까지 제거하므로 그런 규칙은 넣지 않습니다.

## Custom 섹션 — 특정 데이터를 특정 위치에

C++에서 특정 변수를 특정 메모리 영역에 두고 싶을 때는 `__attribute__((section(...)))`를 씁니다.

```cpp
// DMA buffer는 DMA가 접근 가능한 일반 SRAM에
__attribute__((section(".dma")))
alignas(4) uint8_t dma_buffer[4096];

// 읽기 전용 lookup table
__attribute__((section(".rodata.const_lut")))
const uint8_t lookup_table[256] = { /* ... */ };
```

링커 스크립트가 `.ccmram` 섹션을 CCM RAM에 배치합니다. 컴파일러는 해당 변수를 그 섹션에 넣습니다.

STM32F407의 CCM은 CPU 데이터 경로에 연결되며 DMA가 접근할 수 없습니다. CPU 전용 scratch만 CCM에 두고 DMA buffer는 일반 SRAM에 둡니다. DMA 오류·전송 실패의 구체적 증상은 DMA와 bus 설정에 따라 달라지므로 항상 CPU bus fault가 난다고 단정하지 않습니다.

## C++ 객체의 지정된 위치 배치

C++ 객체도 같은 attribute로 위치를 지정할 수 있습니다.

```cpp
// 큰 lookup 객체를 Flash에 직접
__attribute__((section(".rodata.lookups")))
const std::array<uint16_t, 1024> sin_table = { /* compile-time computed */ };

// CCM에 두는 CPU 전용 scratch pool (DMA에 넘기지 않음)
__attribute__((section(".ccmram")))
alignas(8) uint8_t packet_pool[8192];
```

읽기 전용 상수는 보통 .rodata 계열에 놓이지만 최적화로 없어지거나 relocation이 있는 다른 입력 section에 놓일 수도 있습니다. ELF와 map을 확인합니다. Itanium 계열 vtable도 읽기 전용 데이터와 relocation을 포함할 수 있으며, 이름은 llvm-nm --demangle에서 `vtable for`로 찾습니다. C++ 객체의 mutable 필드와 vptr은 객체 자체의 .data/.bss/RAM 위치에 있으므로 vtable 표와 객체 저장 공간을 구분합니다.

## Symbol 정의 — Reset_Handler가 사용

링커 스크립트가 symbol을 정의하면 C/C++ 코드에서 extern으로 참조할 수 있습니다.

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

주소 자체가 의미를 가지므로 `&`를 사용합니다(변수 값이 아니라 위치이기 때문입니다).

## Memory Map 생성

링커 옵션 `-Wl,-Map=file.map`이 모든 섹션과 심볼의 배치 정보를 텍스트로 출력합니다.

```bash
arm-none-eabi-g++ ... -Wl,-Map=firmware.map -o firmware.elf
```

map 형식과 주소는 실제 입력 파일에 따라 달라집니다. .isr_vector가 Flash 시작을 차지하면 Reset_Handler가 같은 주소에서 시작한다고 가정하면 안 됩니다. `llvm-readelf -lW firmware.elf`로 load segment의 실행 주소와 load 주소를 함께 확인하고, map에서는 각 입력 section의 기여를 추적합니다.

### 재현 — custom section과 vtable 입력 확인

```cpp title="placement.cpp"
extern "C" {
__attribute__((section(".dma"), used, aligned(4))) unsigned char dma_buffer[4096];
__attribute__((section(".ccmram"), used, aligned(8))) unsigned char cpu_scratch[4096];
}
struct Sensor {
    virtual int read();
};
int Sensor::read() { return 42; }
Sensor sensor;
extern "C" int read_sensor() { return sensor.read(); }
```

```bash
clang++ --target=arm-none-eabi -mcpu=cortex-m4 -mthumb -std=c++17 -O0 -fno-exceptions -fno-rtti -c placement.cpp -o placement.o
llvm-readelf -SW placement.o
llvm-readelf -r placement.o
llvm-nm --demangle placement.o
```

Clang 23.1.3에서 .dma와 .ccmram 입력 section의 크기는 각각 4096바이트이며, 정렬은 각각 4·8입니다. vtable 심볼과 sensor의 vtable relocation도 확인했습니다. 아직 링크 전이므로 이 관찰만으로 Flash/RAM 주소나 NOLOAD 결과, DMA의 실제 동작이 검증된 것은 아닙니다. 제품에서는 vendor startup과 함께 `-T memory.ld`로 링크하고 region overflow·load segment·copy/zero 경계를 확인한 뒤 board에서 검증합니다.

## 자주 보는 함정과 안티패턴

### 1. `.init_array`에 `KEEP` 없음

필요한 초기화 entry가 linker 도달성 규칙에 따라 제거될 수 있습니다. KEEP으로 의도를 명시하고 최종 map에서 확인합니다.

### 2. `AT >FLASH` 누락

ROM에 저장해야 할 초기값의 LMA가 의도대로 잡히지 않을 수 있습니다. GNU ld의 LMA 추론 규칙이 있으므로 무조건 같은 실패가 나는 것은 아닙니다. 최종 load 주소와 startup copy source를 대조합니다.

### 3. Stack pointer 미정의

vector table의 첫 entry가 invalid가 됩니다. CPU가 random 주소를 SP로 사용해 즉시 crash가 납니다. `_estack = ORIGIN(RAM) + LENGTH(RAM)`이 필수입니다.

### 4. Heap과 Stack 영역 충돌

Heap은 위로 자라고 Stack은 아래로 자랍니다. 만나면 조용히 데이터 corruption이 발생합니다. `_Min_Heap_Size`와 `_Min_Stack_Size`를 명시합니다.

### 5. DMA buffer를 CCM에 두기

STM32F407 CCM에 DMA를 연결할 수 없습니다. DMA controller가 접근 가능한 일반 SRAM 영역을 사용하고 transfer error 상태를 확인합니다.

### 6. 예외 사용하면서 `.eh_frame`을 /DISCARD/

`-fexceptions`와 DISCARD를 함께 쓰면 런타임에 예외 정보가 없어 unwind가 실패하고 crash가 납니다. 둘 중 하나로 통일합니다.

### 7. 외부 SDRAM 미설정으로 access

STM32F407의 외부 메모리는 해당 controller와 GPIO·clock·장치 초기화가 필요합니다. Cortex-M4에 MMU 설정을 요구하는 것은 맞지 않습니다. 링커 스크립트만으로는 주소 할당만 하고, 실제 access는 SystemInit 이후에 가능합니다.

## 영역 사용량과 후속 검증

```bash
arm-none-eabi-g++ ... -T memory.ld -Wl,-Map=firmware.map,--print-memory-usage -o firmware.elf
arm-none-eabi-readelf -lW firmware.elf
arm-none-eabi-nm --demangle firmware.elf
```

이 명령은 제품 빌드의 템플릿이며 이 글에서 실행한 완성 firmware 명령이 아닙니다. CPU 전용 scratch 4096바이트를 일반 SRAM에서 CCM으로 옮기면 그 저장 공간의 영역 분포가 바뀌지만, DMA buffer까지 옮겨도 된다는 뜻은 아닙니다. 실제 절감량은 정렬·section GC·초기 이미지·예약 영역을 포함해 비교하고 측정 파일과 toolchain 버전을 함께 저장합니다.

## 1차 자료와 한계

- [GNU ld MEMORY](https://sourceware.org/binutils/docs/ld/MEMORY.html), [LMA](https://sourceware.org/binutils/docs/ld/Output-Section-LMA.html), [KEEP](https://sourceware.org/binutils/docs/ld/Input-Section-Keep.html), [NOLOAD](https://sourceware.org/binutils/docs/ld/Output-Section-Type.html) — 메모리 배치 문법
- [ST STM32F407VG 제품 자료](https://www.st.com/en/microcontrollers-microprocessors/stm32f407vg.html)와 [RM0090](https://www.st.com/resource/en/reference_manual/rm0090-stm32f405415-stm32f407417-stm32f427437-and-stm32f429439-advanced-armbased-32bit-mcus-stmicroelectronics.pdf) — 일반 SRAM·CCM과 DMA 경로

2026-10-22 검증 범위는 Clang 23.1.3의 ARM ELF 입력 오브젝트입니다. 최종 GNU ld 링크, startup copy/zero와 실제 DMA 전송은 미검증입니다.

## 정리

- 링커 스크립트는 MEMORY 영역 정의와 SECTIONS 배치 두 부분으로 구성됩니다.
- C++가 추가하는 섹션은 `.init_array`, `.fini_array`, `.eh_frame`이며 `KEEP`과 `--gc-sections`의 상호작용에 주의합니다.
- `.data`는 VMA를 RAM에, LMA를 FLASH에 둡니다. Reset_Handler가 부팅 시 복사합니다.
- 큰 buffer는 custom 섹션으로 CCM이나 SDRAM에 배치할 수 있습니다. 단 DMA buffer는 일반 SRAM에 두어야 합니다.
- `-Wl,-Map`으로 완전한 배치 정보를 얻고, CI에는 `--print-memory-usage`를 추가해 영역별 사용량을 추적합니다.

## 관련 항목

- [Part 1-06: 스타트업 코드](/blog/embedded/embedded-cpp/part1-06-startup-code) — Reset_Handler가 사용하는 symbol
- [Part 1-04: 코드 크기 분석](/blog/embedded/embedded-cpp/part1-04-code-size-analysis) — .map 파일과 size 명령
- [Part 3-03: Pool Allocator 구현](/blog/embedded/embedded-cpp/part3-03-pool-allocator) — 고정 크기 객체 저장 공간을 관리하는 allocator

## 다음 글

[Part 1-08: C++ 표준 선택](/blog/embedded/embedded-cpp/part1-08-cpp-standard-choice) — C++11/14/17/20/23 중 어느 표준을 골라야 하는지 임베디드 관점에서 기능을 비교합니다.
