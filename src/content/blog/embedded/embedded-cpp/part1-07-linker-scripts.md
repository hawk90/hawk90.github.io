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

벤더(STM32, NXP)가 기본 링커 스크립트를 제공하지만, C++가 추가하는 섹션(`.init_array`, `.fini_array`, 템플릿 인스턴스의 COMDAT 섹션)이나 프로젝트 특화 영역(외부 SDRAM, CCM RAM, DMA buffer)을 다루려면 직접 이해해야 합니다.

아래 예시는 STM32F407VG의 1MiB Flash, 128KiB 일반 SRAM과 별도 64KiB CCM을 구분합니다. 총 192KiB를 0x20000000의 연속 SRAM으로 선언하면 안 됩니다. 아래 [memory.ld](#링커-스크립트-예시--sram과-ccm을-분리하기)는 Homebrew arm-none-eabi-g++ 16.2.0과 GNU ld(binutils)로 실제로 링크해 본 결과를 함께 적었습니다. 보드에서는 실행하지 않았습니다.

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

`__libc_fini_array`가 끝에서부터 역순으로 호출합니다. newlib crt0에서는 `exit` 안에서 돕니다([Part 1-03](/blog/embedded/embedded-cpp/part1-03-runtime-requirements#부트-시퀀스--무엇이-언제-실행되는가)). 전역 C++ 객체의 소멸자는 arm-none-eabi-g++ 16.2.0 기본 설정에서 `.fini_array`가 아니라 `__aeabi_atexit`로 등록됐고, `-fno-use-cxa-atexit`를 주면 `.fini_array` entry가 됐습니다([Part 1-02](/blog/embedded/embedded-cpp/part1-02-compiler-flags#-fno-use-cxa-atexit--등록-방식-변경)). 어느 쪽이든 소멸자는 남습니다.

### COMDAT 그룹 `.text._Z...` — 템플릿 인스턴스

같은 템플릿이 여러 TU에서 인스턴스화되면 링커가 하나만 남깁니다. `.gnu.linkonce.*`는 COMDAT 그룹 이전의 GNU 방식 이름이고, arm-none-eabi-g++ 16.2.0은 COMDAT 그룹을 만듭니다. `template <class T> T twice(T)`를 쓰는 두 파일 중 하나의 오브젝트입니다.

```text
COMDAT group section [    1] `.group' [_Z5twiceIiET_S0_] contains 4 sections:
   [Index]    Name
   [    9]   .text._Z5twiceIiET_S0_
   [   10]   .ARM.extab.text._Z5twiceIiET_S0_
   [   11]   .ARM.exidx.text._Z5twiceIiET_S0_
   [   12]   .rel.ARM.exidx.text._Z5twiceIiET_S0_
```

두 오브젝트를 링크한 ELF에는 `twice<int>(int)`가 weak 심볼(`W`) 하나로 남았습니다. 링커 스크립트의 `*(.text .text.*)` 패턴이 이 섹션을 받으므로 별도 규칙은 필요 없습니다.

### `.eh_frame` — 예외 unwind table

```ld
/DISCARD/ : {
    *(.eh_frame*)
    *(.ARM.extab*)
    *(.ARM.exidx*)
}
```

ARM EHABI는 예외 unwind에 `.eh_frame`이 아니라 `.ARM.exidx`/`.ARM.extab`를 씁니다. 그래서 `.eh_frame`만 지우는 규칙은 ARM에서 예외 테이블을 지우지 못합니다. 아래 `memory.ld`에 이 `/DISCARD/` 조각을 넣고 `-fno-exceptions` 오브젝트를 링크하면 경고 없이 링크됩니다. 예외를 쓰는 코드라면 throw 시점에 unwinder가 해당 함수의 테이블을 찾지 못합니다. GCC 16 libsupc++의 `__cxa_throw`(`eh_throw.cc`)는 `_Unwind_RaiseException`이 돌아오면 "some sort of unwinding error"로 보고 `std::terminate()`를 부릅니다. 예외를 끄지 않은 빌드에는 이 조각을 넣지 않습니다. 디버거·크래시 덤프 도구가 `.ARM.exidx`로 스택을 풀기도 합니다.

## 링커 스크립트 예시 — SRAM과 CCM을 분리하기

다음은 GNU ld 문법으로 작성한 Cortex-M 메모리 배치입니다. vector·copy/zero symbol·array 경계를 정의하지만 vendor startup, newlib, 실제 board 설정을 포함한 완성 firmware는 아닙니다. main SRAM의 heap·stack 최소 여유는 ASSERT로 검사하며, 이 ASSERT는 링크 시점의 예약 크기만 봅니다. 런타임의 실제 stack 최대 사용량은 검사하지 않습니다.

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

컴파일러는 해당 변수를 지정한 입력 섹션에 넣고, 링커 스크립트가 그 섹션을 메모리 영역에 배치합니다. 위 `memory.ld`에서는 `.dma`가 일반 SRAM(`>RAM`), `.ccmram`이 CCM(`>CCM`)으로 갑니다. `.rodata.const_lut`는 `*(.rodata .rodata.*)` 패턴에 걸려 `.text`와 함께 Flash로 갑니다.

STM32F407의 CCM은 CPU 데이터 버스에만 연결되며 DMA가 접근할 수 없습니다(RM0090). CPU 전용 scratch만 CCM에 두고 DMA buffer는 일반 SRAM에 둡니다. 이 글에서는 DMA 전송을 실행하지 않았으므로 CCM 주소를 DMA에 줬을 때의 증상은 적지 않습니다.

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

vtable 표와 객체 저장 공간은 따로 배치됩니다. 아래 재현 절의 `placement.cpp`를 링크한 ELF에서 `vtable for Sensor`는 `0x08000074`(Flash, `.rodata`가 `.text`에 합쳐져 `T`로 표시)에 있고, vptr을 담은 객체 `sensor`는 `0x20000004`(RAM의 `.data`)에 있었습니다. `sensor`가 `.bss`가 아니라 `.data`에 간 것은 vptr이 0이 아닌 초기값이기 때문입니다.

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

`.isr_vector`가 Flash 시작을 차지하므로 Reset_Handler는 그 뒤에서 시작합니다. load segment의 실행 주소(VirtAddr)와 load 주소(PhysAddr)는 `readelf -lW`가 함께 보여 줍니다. 아래 재현에서 링크한 ELF의 결과입니다.

```text
Program Headers:
  Type           Offset   VirtAddr   PhysAddr   FileSiz MemSiz  Flg Align
  LOAD           0x001000 0x08000000 0x08000000 0x00080 0x00080 R E 0x1000
  LOAD           0x002000 0x20000000 0x08000080 0x00008 0x01008 RW  0x1000
  LOAD           0x001000 0x10000000 0x10000000 0x00000 0x01000 RW  0x1000
```

두 번째 segment가 `.data`입니다. 실행 주소는 RAM(`0x20000000`), load 주소는 Flash(`0x08000080`)이고 파일에는 8바이트만 있으며, 메모리 크기 `0x1008`은 뒤따르는 NOLOAD `.bss`·`.dma`까지 포함합니다. 세 번째 segment는 `.ccmram`이며 파일 크기가 0입니다.

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

Clang 23.1.5에서 .dma와 .ccmram 입력 section의 크기는 각각 4096바이트이며, 정렬은 각각 4·8입니다. 링크까지 확인하려고 `.data` 복사·`.bss` 정리·`.init_array` 순회를 하는 작은 `start.cpp`(vector 두 개와 Reset_Handler)를 더해 arm-none-eabi-g++ 16.2.0으로 `-T memory.ld` 링크했습니다.

```bash
arm-none-eabi-g++ -mcpu=cortex-m4 -mthumb -Os -ffreestanding -fno-exceptions -fno-rtti -nostdlib \
  -T memory.ld -Wl,-Map=fw.map,--print-memory-usage start.cpp placement.cpp -lgcc -o fw.elf
```

```text
Memory region         Used Size  Region Size  %age Used
           FLASH:         136 B         1 MB      0.01%
             RAM:        4104 B       128 KB      3.13%
             CCM:          4 KB        64 KB      6.25%
```

`dma_buffer`는 `0x20000008`(RAM), `cpu_scratch`는 `0x10000000`(CCM)에 놓였습니다. RAM 4,104바이트는 `.data` 8바이트(`counter`와 `sensor`)와 `.dma` 4,096바이트입니다. 이 ELF는 보드나 에뮬레이터에서 실행하지 않았습니다.

## 자주 보는 함정과 안티패턴

### 1. `.init_array`에 `KEEP` 없음

`--gc-sections`가 `.init_array`를 지웁니다. [Part 1-06](/blog/embedded/embedded-cpp/part1-06-startup-code#init_array-섹션이-flash에-있는지)의 QEMU 실험에서 `KEEP`만 지웠더니 링크는 경고 없이 성공했고 생성자가 하나도 돌지 않았습니다.

### 2. `AT >FLASH` 누락

위 `memory.ld`에서 `.data`의 `AT >FLASH`만 지우고 링크하면 오류 없이 링크되지만, `.data` segment의 PhysAddr가 `0x20000000`이 되고 `_sidata`도 `0x20000000`이 됩니다. 초기값이 Flash에 없으니 startup의 복사는 RAM에서 RAM으로 자기 자신을 복사합니다. `objcopy -O binary`로 만든 이미지는 Flash 시작부터 RAM 끝까지를 채워 402,653,192바이트가 됐습니다(정상 빌드는 136바이트). GNU ld는 LMA 영역을 지정하지 않은 섹션에 [LMA 추론 규칙](https://sourceware.org/binutils/docs/ld/Output-Section-LMA.html)을 적용하는데, 이 스크립트에서는 그 결과가 VMA와 같은 RAM 주소였습니다.

### 3. Stack pointer 미정의

vector table의 첫 entry가 `_estack`을 참조하므로, 이 정의가 없으면 링크가 먼저 실패합니다. `memory.ld`에서 `_estack = ...` 줄만 지웠을 때의 GNU ld 메시지입니다.

```text
arm-none-eabi-ld:noestack.ld:42: undefined symbol `_estack' referenced in expression
```

반면 정의는 있는데 값이 틀린 경우(존재하지 않는 RAM 끝 주소 등)는 링크가 통과하므로, `_estack`은 `ORIGIN(RAM) + LENGTH(RAM)`처럼 MEMORY 정의에서 계산합니다.

### 4. Heap과 Stack 영역 충돌

Heap은 위로 자라고 Stack은 아래로 자랍니다. 만나면 둘 중 하나가 다른 쪽 데이터를 덮어씁니다. Cortex-M4에는 이를 막는 하드웨어 stack limit 레지스터가 없고(ARMv8-M의 `MSPLIM`·`PSPLIM`부터 생김), MPU 영역으로 guard를 두지 않으면 오류 없이 진행됩니다. `_Min_Heap_Size`와 `_Min_Stack_Size`를 명시하면 링크 시 예약 공간 부족은 잡을 수 있습니다.

### 5. DMA buffer를 CCM에 두기

STM32F407 CCM에는 DMA 경로가 없습니다(RM0090). DMA buffer는 DMA controller가 접근하는 일반 SRAM 영역(`.dma`)에 둡니다.

### 6. 예외 사용하면서 `.eh_frame`을 /DISCARD/

`-fexceptions`와 DISCARD를 함께 쓰면 링크는 되지만, 첫 throw에서 unwinder가 테이블을 찾지 못해 `__cxa_throw`가 `std::terminate()`로 끝납니다(GCC 16 `eh_throw.cc`). 둘 중 하나로 통일합니다.

### 7. 외부 SDRAM 미설정으로 access

STM32F407의 외부 메모리는 해당 controller와 GPIO·clock·장치 초기화가 필요합니다. Cortex-M4에 MMU 설정을 요구하는 것은 맞지 않습니다. 링커 스크립트만으로는 주소 할당만 하고, 실제 access는 SystemInit 이후에 가능합니다.

## 영역 사용량과 후속 검증

```bash
arm-none-eabi-g++ ... -T memory.ld -Wl,-Map=firmware.map,--print-memory-usage -o firmware.elf
arm-none-eabi-readelf -lW firmware.elf
arm-none-eabi-nm --demangle firmware.elf
```

위 재현 절의 링크가 이 명령의 축소판입니다. 그 출력에서 CPU 전용 scratch 4,096바이트는 CCM 쪽 사용량(4 KB)에 잡혔고 RAM 쪽에는 없습니다. CCM으로 옮긴 만큼 일반 SRAM이 비지만, DMA buffer까지 옮겨도 된다는 뜻은 아닙니다.

## 1차 자료와 한계

- [GNU ld MEMORY](https://sourceware.org/binutils/docs/ld/MEMORY.html), [LMA](https://sourceware.org/binutils/docs/ld/Output-Section-LMA.html), [KEEP](https://sourceware.org/binutils/docs/ld/Input-Section-Keep.html), [NOLOAD](https://sourceware.org/binutils/docs/ld/Output-Section-Type.html) — 메모리 배치 문법
- [ST STM32F407VG 제품 자료](https://www.st.com/en/microcontrollers-microprocessors/stm32f407vg.html)와 [RM0090](https://www.st.com/resource/en/reference_manual/rm0090-stm32f405415-stm32f407417-stm32f427437-and-stm32f429439-advanced-armbased-32bit-mcus-stmicroelectronics.pdf) — 일반 SRAM·CCM과 DMA 경로

2026-11-16 검증 범위는 Clang 23.1.5의 ARM ELF 입력 오브젝트와, arm-none-eabi-g++ 16.2.0·GNU ld로 `memory.ld`를 링크한 ELF(`--print-memory-usage`, `readelf -lW`, `AT >FLASH`·`_estack` 제거 실험)입니다. 이 ELF의 실행과 실제 DMA 전송은 하지 않았습니다.

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
