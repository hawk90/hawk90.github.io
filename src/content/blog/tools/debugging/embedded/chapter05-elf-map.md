---
title: "Ch 5: ELF / MAP — 베어메탈 메모리"
date: 2026-05-17T05:00:00
description: "ELF의 LMA/VMA, 링커 스크립트, MAP 파일로 메모리 진단, startup 코드의 정체."
tags: [elf, map, linker, embedded, baremetal]
series: "Embedded Debugging"
seriesOrder: 5
draft: false
---

베어메탈 펌웨어는 *어디에 무엇이 놓일지를 명시적으로 결정*해야 합니다. flash인지 SRAM인지, .data를 어떻게 초기화할지, 스택은 어디 두고 인터럽트 벡터는 어디 둘지 — OS가 알아서 해 주던 일을 *링커 스크립트*가 합니다. 그 결과물이 ELF, 그 보조 자료가 MAP 파일.

이 장은 베어메탈 ELF의 정체부터 출발해 LMA/VMA 구분, 링커 스크립트 문법, MAP 파일 해독, *부팅 직후 startup 코드*가 .data·.bss로 무엇을 하는지까지 다룹니다.

:::tldr
ELF가 *굽는 단위*, 링커 스크립트가 *어디 둘지의 규칙*, MAP이 *결과 메모리 지도*. 셋이 펌웨어 메모리 진단의 삼각형.
:::

## ELF의 두 얼굴 — 섹션 vs 세그먼트

ELF는 같은 데이터를 *두 가지 방식*으로 표현합니다.

- **섹션** — 링커가 보는 단위. `.text`, `.data`, `.bss`, `.debug_*` 등 수십 개.
- **세그먼트** (Program Header) — 로더가 보는 단위. `PT_LOAD`, `PT_PHDR`, `PT_NOTE` 등 소수.

```bash
$ arm-none-eabi-readelf -S firmware.elf
[Nr] Name              Type            Addr     Off    Size   ES Flg
[ 1] .isr_vector       PROGBITS        08000000 010000 0001c0 00 WAX
[ 2] .text             PROGBITS        080001c0 0101c0 009d20 00 AX
[ 3] .rodata           PROGBITS        08009ee0 019ee0 0004c0 00 A
[ 4] .ARM.extab        PROGBITS        0800a3a0 01a3a0 000000 00 A
[ 5] .ARM              ARM_EXIDX       0800a3a0 01a3a0 000008 00 AL
[ 6] .preinit_array    PREINIT_ARRAY   0800a3a8 01a3a8 000000 00 WA
[ 7] .init_array       INIT_ARRAY      0800a3a8 01a3a8 000004 00 WA
[ 8] .fini_array       FINI_ARRAY      0800a3ac 01a3ac 000004 00 WA
[ 9] .data             PROGBITS        20000000 020000 000140 00 WA
[10] .bss              NOBITS          20000140 020140 000800 00 WA
[11] .heap             NOBITS          20000940 020140 000400 00 WA
[12] .stack            NOBITS          20000d40 020140 000400 00 WA
[13] .debug_info       PROGBITS        00000000 020140 ...
```

플래그 의미.

| 플래그 | 의미 |
|--------|------|
| `W` | 쓰기 가능 |
| `A` | 메모리에 할당 |
| `X` | 실행 가능 |
| `L` | exidx (예외 unwind 인덱스) |

`PROGBITS` = 파일에 데이터 있음 (.text, .data, .rodata).
`NOBITS` = 파일에 없음, 메모리에만 차지 (.bss, .heap, .stack — 제로 초기화).

```bash
$ arm-none-eabi-readelf -l firmware.elf
Program Headers:
  Type    Offset             VirtAddr           PhysAddr           FileSiz  MemSiz   Flg Align
  LOAD    0x0000000000010000 0x0000000008000000 0x0000000008000000 0x09f80  0x09f80  R E 0x10000
  LOAD    0x0000000000020000 0x0000000020000000 0x000000000800a4c0 0x00140  0x00140  RW  0x10000
  LOAD    0x0000000000020140 0x0000000020000140 0x000000000800a600 0x00000  0x01000  RW  0x10000

 Section to Segment mapping:
   Segment 0: .isr_vector .text .rodata .ARM .init_array .fini_array
   Segment 1: .data
   Segment 2: .bss .heap .stack
```

## LMA vs VMA

같은 .data 섹션이 두 주소를 가집니다 — *flash의 LMA*에 굽히고 *SRAM의 VMA*에서 실행.

![ELF LMA vs VMA — startup 복사 흐름](/images/blog/tools/diagrams/elf-lma-vma.svg)

이유: .data는 *초기화된 변수*입니다. 값이 flash에 있어야 (전원 끄면 사라지지 않게), 실행 시엔 SRAM에 (쓰기 가능하게). 부팅 직후 startup 코드가 flash → SRAM으로 *복사*합니다.

```c
int counter = 42;     // .data — flash에 42가 굽힘, SRAM에 0x20000000부터 변수 위치
static int g_buf[256]; // .bss — SRAM에 0 초기화
const int kMax = 100;  // .rodata — flash만 (수정 안 함)
void worker() {...}    // .text — flash만
```

readelf의 *PhysAddr*가 LMA, *VirtAddr*가 VMA. 베어메탈에선 보통 둘이 같지만(.text 등) .data만 다릅니다.

```bash
$ arm-none-eabi-readelf -l firmware.elf | grep LOAD
  LOAD   ... 0x08000000 0x08000000 ...   ← .text: VMA=LMA=flash
  LOAD   ... 0x20000000 0x0800A4C0 ...   ← .data: VMA=SRAM, LMA=flash
```

`load` 명령은 *LMA*에 굽습니다 (flash). 부팅 후 *VMA*에서 코드가 .data를 참조 (SRAM).

## startup 코드 — Reset_Handler

전원이 들어오면 CPU는 *벡터 테이블*의 첫 번째 entry (`MSP_initial`) 로 SP를 세팅하고 두 번째 entry (`Reset_Handler`) 로 점프합니다.

```c
// startup_stm32f4xx.s (단순화 C 버전)
extern int __etext;      // .data의 LMA 끝 = flash 안의 .data 값들
extern int __data_start__, __data_end__;  // .data의 VMA (SRAM)
extern int __bss_start__, __bss_end__;
extern int main(void);

void Reset_Handler(void) {
    // 1. .data 초기화 (flash → SRAM 복사)
    int *src = &__etext;
    int *dst = &__data_start__;
    while (dst < &__data_end__) *dst++ = *src++;

    // 2. .bss 영초기화
    dst = &__bss_start__;
    while (dst < &__bss_end__) *dst++ = 0;

    // 3. 클럭 설정 (옵션)
    SystemInit();

    // 4. C++ static initializer (있다면)
    __libc_init_array();

    // 5. main 진입
    main();

    // 6. main이 return하면 무한 루프
    while (1) {}
}
```

이 시퀀스가 *링커 스크립트의 심볼*과 정확히 맞물려야 합니다. 잘못된 startup → .data가 random 값으로 시작, 또는 .bss가 0이 아님 → 미스터리한 버그.

## 링커 스크립트

ARM gcc의 표준 패턴 (단순화).

```ld
/* memory map */
MEMORY {
    FLASH (rx)  : ORIGIN = 0x08000000, LENGTH = 1024K
    RAM   (rwx) : ORIGIN = 0x20000000, LENGTH = 128K
}

ENTRY(Reset_Handler)

SECTIONS {
    .isr_vector : {
        KEEP(*(.isr_vector))     /* GC가 못 지우게 */
    } > FLASH

    .text : {
        *(.text*)
        *(.rodata*)
        *(.glue_7*)              /* ARM/Thumb interworking */
        *(.eh_frame)             /* C++ exception unwind */
        KEEP(*(.init))
        KEEP(*(.fini))
    } > FLASH

    /* C++ ctor/dtor 배열 */
    .init_array : {
        PROVIDE_HIDDEN (__init_array_start = .);
        KEEP(*(SORT(.init_array.*)))
        KEEP(*(.init_array))
        PROVIDE_HIDDEN (__init_array_end = .);
    } > FLASH

    /* .data: LMA=flash, VMA=RAM */
    _sidata = LOADADDR(.data);    /* flash 안의 시작 */
    .data : {
        _sdata = .;
        *(.data*)
        _edata = .;
    } > RAM AT > FLASH

    .bss : {
        _sbss = .;
        *(.bss*)
        *(COMMON)
        _ebss = .;
    } > RAM

    /* 스택 — 보통 .bss 뒤에 */
    .stack (NOLOAD) : ALIGN(8) {
        _sstack = .;
        . = . + 0x1000;            /* 4KB 스택 */
        _estack = .;
    } > RAM

    /DISCARD/ : {
        *(.comment)
        *(.note.*)
    }
}
```

핵심 문법.

| 문법 | 의미 |
|------|------|
| `MEMORY { ... }` | 영역 정의 (이름, 권한, ORIGIN, LENGTH) |
| `> FLASH` | 이 섹션을 FLASH에 |
| `> RAM AT > FLASH` | VMA=RAM, LMA=FLASH (.data 패턴) |
| `KEEP(...)` | --gc-sections이 제거하지 않게 |
| `LOADADDR(.data)` | .data의 LMA |
| `ADDR(.data)` | .data의 VMA |
| `.` | 현재 위치 카운터 |
| `*(.text*)` | 모든 객체 파일의 .text* 섹션 |
| `(NOLOAD)` | 파일에 안 굽힘 (.bss와 같은 효과) |
| `ALIGN(N)` | N바이트 정렬 |
| `PROVIDE(sym = ...)` | 다른 데서 정의 안 됐을 때만 |

링커 스크립트의 *심볼*을 C에서 `extern`으로 받습니다.

```c
extern int _sdata, _edata, _sidata;
extern int _sbss, _ebss;
extern int _estack;
```

이 심볼들의 *주소* (값이 아니라!)가 영역 경계.

## MAP 파일 — 결과 메모리 지도

```bash
$ arm-none-eabi-gcc ... -Wl,-Map=firmware.map
```

또는 `-Wl,-Map=firmware.map,--cref` (cross reference 포함).

```text
Linker script and memory map

Memory Configuration

Name             Origin             Length             Attributes
FLASH            0x08000000         0x00100000         xr
RAM              0x20000000         0x00020000         xrw
*default*        0x00000000         0xffffffff

Linker script: stm32f4_flash.ld

LOAD /opt/cross/arm-none-eabi/lib/thumb/v7e-m+dp/hard/crti.o
LOAD /opt/cross/arm-none-eabi/lib/gcc/arm-none-eabi/13.2.0/thumb/v7e-m+dp/hard/crtbegin.o
LOAD ./build/main.o
LOAD ./build/sensor.o
...

                0x0800a3a8                __init_array_start = .
.init_array     0x0800a3a8        0x4
 *(SORT_BY_INIT_PRIORITY(.init_array.*) ...)
 *(.init_array)
 .init_array    0x0800a3a8        0x4 ./build/main.o
                0x0800a3ac                __init_array_end = .

.data           0x20000000      0x140 load address 0x0800a3ac
                0x20000000                _sdata = .
 *(.data*)
 .data          0x20000000       0xe4 ./build/main.o
                0x20000004                g_config
                0x20000040                g_state
                0x200000c0                g_calibration
 .data          0x200000e4       0x5c ./build/sensor.o
                0x200000e4                last_reading
                0x20000100                buffer
                0x20000140                _edata = .

.bss            0x20000140      0x800
                0x20000140                _sbss = .
 *(.bss*)
 .bss           0x20000140      0x4c0 ./build/main.o
                0x20000140                g_buffer
                0x20000800                state_table
 .bss           0x20000600      0x340 ./build/sensor.o
                0x20000940                _ebss = .

.stack          0x20000940      0x400
                0x20000940                _sstack = .
                0x20000d40                _estack = .

Cross Reference Table

Symbol                                            File
HAL_Init                                          ./build/main.o
                                                  ./build/sensor.o (HAL_Init)
                                                  ./build/uart.o (HAL_Init)
g_buffer                                          ./build/main.o
                                                  ./build/sensor.o (g_buffer)

...
```

각 줄이 *심볼·주소·크기·파일* 정보. 진단의 1차 자료.

### 진단 1 — 메모리 부족

링크 실패.

```
arm-none-eabi-ld: firmware.elf section `.bss' will not fit in region `RAM'
arm-none-eabi-ld: region `RAM' overflowed by 4096 bytes
```

MAP 파일의 `.bss` 섹션에서 *가장 큰 심볼*을 찾습니다.

```bash
$ awk '/^ \.bss/,/^ [^ ]/' firmware.map | \
  awk '/^                 0x[0-9a-f]+ +0x[0-9a-f]+/ {print $2, $1, $3}' | \
  sort -k1 -n | tail -10
```

또는 `nm --size-sort firmware.elf | grep ' [Bb] '`.

```bash
$ arm-none-eabi-nm --size-sort firmware.elf | tail -10
00000400 b state_table
00000480 b log_buffer
000004c0 b g_buffer
00000800 B large_buffer_in_uart.c
```

소문자 `b` = local, 대문자 `B` = global. 4KB짜리 `large_buffer_in_uart.c`가 범인이라면 그 파일에 `static char buf[4096]` 같은 게 있을 가능성.

해법: 작게 만들거나, *heap*으로 옮기거나, *별 섹션*으로 빼서 *외부 SRAM*에 두기.

```c
__attribute__((section(".ccmram"))) static char buf[4096];
```

링커 스크립트에 `.ccmram` 영역 정의 필요.

### 진단 2 — 알 수 없는 주소

콜스택에 `0x08003a12` PC만 나옴. MAP에서 검색.

```bash
$ grep '0x0800' firmware.map | sort | grep -B1 'a12'
```

또는 더 정밀하게 `addr2line`.

```bash
$ arm-none-eabi-addr2line -e firmware.elf -f -i 0x08003a12
HAL_GPIO_Init
/path/to/hal_gpio.c:128
```

### 진단 3 — 함수 크기 큰 함수

```bash
$ arm-none-eabi-nm --size-sort --print-size firmware.elf | grep ' [Tt] ' | tail -10
00000180 00000d20 T USB_OTG_HS_IRQHandler
00000080 00000ee4 T main
00000010 00001234 T process_image
```

`process_image`가 4.6KB. *너무 크면* 인라인 줄이기·서브 함수 분리.

### 진단 4 — Cross Reference

```text
Symbol                                            File
my_function                                       ./build/main.o
                                                  ./build/util.o
                                                  ./build/sensor.o
```

`my_function`을 `main.o`가 정의, 다른 셋이 호출. *정의 안 됨* 오류 디버깅의 핵심.

## --gc-sections — 미사용 코드 제거

```bash
arm-none-eabi-gcc -ffunction-sections -fdata-sections ... -Wl,--gc-sections
```

각 함수·변수를 별 섹션으로 만들고, 링커가 *참조되지 않은* 섹션을 제거. 라이브러리 함수 수십·수백 KB가 줄어듭니다.

다만 *벡터 테이블* 같은 *간접 참조*는 GC가 못 알아냅니다 → `KEEP()`로 보호.

```ld
.isr_vector : {
    KEEP(*(.isr_vector))
}
```

`KEEP` 안 하면 ISR이 사라져 인터럽트 시 hardfault.

## -fdata-sections와 .data.x

```bash
$ arm-none-eabi-readelf -S firmware.elf | grep data
.data.g_config       PROGBITS  ...
.data.last_reading   PROGBITS  ...
.data.buffer         PROGBITS  ...
```

`-fdata-sections`로 *변수마다 별 섹션*. 링커 스크립트에서 `*(.data*)`가 한 번에 묶입니다.

미사용 변수도 자동 제거 가능.

## 외부 SRAM·CCRAM 같은 다중 메모리 영역

큰 칩(STM32F4)은 *코어 결합 RAM*(CCM, 64KB)이 있고 더 큰 SRAM과 외부 SDRAM 인터페이스도 있습니다.

```ld
MEMORY {
    FLASH (rx)  : ORIGIN = 0x08000000, LENGTH = 1024K
    RAM   (rwx) : ORIGIN = 0x20000000, LENGTH = 128K
    CCRAM (rwx) : ORIGIN = 0x10000000, LENGTH = 64K
    SDRAM (rwx) : ORIGIN = 0xC0000000, LENGTH = 8M
}

SECTIONS {
    ...

    /* DMA 버퍼는 일반 SRAM에 (CCRAM은 DMA 불가) */
    .dma_buf (NOLOAD) : {
        *(.dma_buffers)
    } > RAM

    /* 핫 데이터는 CCRAM에 (DMA 접근 안 함) */
    .ccram_data (NOLOAD) : {
        *(.ccram*)
    } > CCRAM

    /* 큰 버퍼는 외부 SDRAM에 */
    .sdram (NOLOAD) : {
        *(.sdram*)
    } > SDRAM
}
```

```c
__attribute__((section(".ccram"))) static int g_hot_data[1024];
__attribute__((section(".dma_buffers"))) static uint8_t dma_buf[4096];
__attribute__((section(".sdram"))) static uint8_t image_buf[1024*1024];
```

외부 SDRAM은 *부팅 직후 init*이 필요 — Reset_Handler 안에서 SystemInit() 또는 별 함수로.

## .ARM.extab / .ARM.exidx — C++ exception

C++ exception을 쓰면 unwind 정보가 link됩니다 (~수 KB).

```ld
.ARM.extab : { *(.ARM.extab* .gnu.linkonce.armextab.*) } > FLASH
.ARM : {
    __exidx_start = .;
    *(.ARM.exidx*)
    __exidx_end = .;
} > FLASH
```

C++ 안 쓰면 `-fno-exceptions`로 끔. 코드 크기 감소.

## TLS — Thread-Local Storage

베어메탈에서 OS 없이도 `__thread` 변수를 쓰면 `.tdata` / `.tbss` 섹션이 생깁니다. RTOS의 task별 변수 (`thread_local`) 가 이 메커니즘. 링커 스크립트에서 `.tdata`/`.tbss` 처리 필요.

## .stack과 stack overflow 진단

```ld
.stack (NOLOAD) : ALIGN(8) {
    _sstack = .;
    . = . + 0x1000;        /* 4KB */
    _estack = .;
} > RAM
```

스택은 *내려가는 방향*. ARM은 `SP` 초기값 = `_estack` (위쪽 끝), 함수 호출 시 `SUB SP, #N`으로 내려갑니다.

스택 overflow 검출:

```c
extern uint32_t _sstack, _estack;

void check_stack() {
    register uint32_t sp asm("sp");
    if (sp < (uint32_t)&_sstack + 64) {
        // 스택이 거의 다 찼다 — fault
        while (1);
    }
}
```

또는 ARM CoreSight의 *Stack Limit*(Cortex-M33+).

```c
// PSPLIM 또는 MSPLIM 레지스터 설정 (CMSIS 매크로)
__set_MSPLIM((uint32_t)&_sstack);
```

이후 SP가 MSPLIM 아래로 내려가면 자동으로 *UsageFault* 발생.

## 작은 한 줄 — 펌웨어 크기 추정

```bash
$ arm-none-eabi-size firmware.elf
   text	   data	    bss	    dec	    hex	filename
  47832	    320	   2048	  50200	   c418	firmware.elf
```

- **text** = .text + .rodata + 베어메탈 vec 등. flash 차지.
- **data** = .data 초기값. flash + RAM 둘 다 차지.
- **bss** = .bss. RAM만 (0 초기화).
- **dec** = total. 16진은 `hex`.

flash = text + data. RAM = data + bss + stack + heap.

`-A`로 섹션별.

```bash
$ arm-none-eabi-size -A firmware.elf
firmware.elf  :
section              size       addr
.isr_vector         0x1c0  0x8000000
.text              0x9d20  0x80001c0
.rodata             0x4c0  0x8009ee0
.data               0x140 0x20000000
.bss                0x800 0x20000140
...
```

## stripping vs debuginfo 분리

```bash
# 디버그 심볼 분리
$ arm-none-eabi-objcopy --only-keep-debug firmware.elf firmware.debug
$ arm-none-eabi-strip firmware.elf
$ arm-none-eabi-objcopy --add-gnu-debuglink=firmware.debug firmware.elf
```

배포 빌드 시 stripped firmware.elf만 굽고 firmware.debug는 서버 보관 → core dump 분석에서 GDB가 build-id로 자동 매칭.

베어메탈에서는 *core dump 자체*가 없지만, J-Link/OpenOCD의 *snapshot*(메모리 + 레지스터 덤프)을 비슷하게 활용 가능합니다.

## hex / bin 변환

```bash
# Intel HEX (.hex) — 양산 굽기에 흔함
$ arm-none-eabi-objcopy -O ihex firmware.elf firmware.hex

# Raw binary (.bin) — 단순 굽기
$ arm-none-eabi-objcopy -O binary firmware.elf firmware.bin

# 그 외 — srec, verilog
$ arm-none-eabi-objcopy -O srec firmware.elf firmware.srec
```

hex는 *주소 정보*를 담은 ASCII 포맷. bin은 *그냥 바이트 덤프* — flash의 0x08000000부터 그대로 굽으면 됨.

대부분의 양산 라인은 hex 또는 srec를 받습니다. OpenOCD의 `flash write_image`는 ELF/HEX/SREC/BIN 모두 지원.

## 정리

- ELF의 섹션은 *링커가 보는 단위*, 세그먼트는 *로더가 보는 단위*.
- LMA = 굽는 주소, VMA = 실행 시 주소. .data만 둘이 다름.
- startup 코드가 flash → SRAM으로 .data 복사 + .bss 영초기화.
- 링커 스크립트가 MEMORY + SECTIONS로 영역 정의.
- MAP 파일이 *결과 메모리 지도* — 진단의 1차 자료.
- `--gc-sections` + `-ffunction-sections`로 미사용 제거.
- 외부 SDRAM·CCRAM은 별 섹션으로 분리해 attribute로 배치.
- `arm-none-eabi-size`가 빠른 크기 확인.
- 양산은 hex/srec, 디버깅은 ELF.

## 다음 장 예고

Ch 6 — 트레이스 (RTT / ITM / SWO / ETM / Semihosting). printf 없이 펌웨어 로그를 빼내는 다섯 가지 방법.

## 관련 항목

- [Ch 4: J-Link 도구 체인](/blog/tools/debugging/embedded/chapter04-jlink)
- [Ch 6: Trace — RTT / ITM / ETM](/blog/tools/debugging/embedded/chapter06-trace)
- [DWARF and ELF Internals 시리즈](/blog/tools/debugging/dwarf-elf/chapter01-elf-overview) — ELF 깊이
- [GNU LD manual](https://sourceware.org/binutils/docs/ld/)
- ARMv7-M Architecture Reference Manual — exception vector
