---
title: "ELF와 MAP 파일 분석 — 베어메탈 메모리 레이아웃 추적"
slug: "tools/debugging/embedded/chapter05-elf-map"
date: 2026-05-26T09:05:00
description: "ELF의 LMA/VMA, 링커 스크립트, MAP 파일로 메모리 진단, startup 코드의 정체."
tags: [elf, map, linker, embedded, bare-metal]
series: "Embedded Debugging"
seriesOrder: 5
draft: false
topics: ["tools", "tools/debugging"]
---

베어메탈 펌웨어는 *어디에 무엇이 놓일지를 스스로 정해야* 합니다. flash인지 SRAM인지, `.data`를 어떻게 초기화할지, 스택과 인터럽트 벡터를 어디 둘지를 OS 대신 *링커 스크립트*가 정합니다. 그 결과물이 ELF이고, 보조 자료가 MAP 파일입니다.

이 장은 작은 펌웨어 하나를 직접 빌드해 그 ELF와 MAP을 읽습니다. LMA/VMA, 링커 스크립트 문법, MAP 파일 해독, startup 코드가 `.data`·`.bss`로 하는 일, 그리고 링커 설정이 틀렸을 때 실제로 무슨 일이 나는지까지 봅니다.

:::tldr
ELF는 *굽는 단위*, 링커 스크립트는 *어디 둘지의 규칙*, MAP은 *결과 메모리 지도*입니다. 세 가지가 펌웨어 메모리 진단의 출발점입니다.
:::

## 예제 펌웨어

1장에서 QEMU로 디버깅한 `fw.elf`가 이 장의 예제입니다. STM32F405를 흉내 내는 QEMU `netduinoplus2` 보드(flash 0x08000000, SRAM 0x20000000)에서 돌고, 출력은 semihosting으로 냅니다. 파일은 `startup.c`, `main.c`, `sensor.c`, 헤더 `semihost.h`(6장), 링커 스크립트 `fw.ld` 다섯 개입니다.

```c title="main.c"
#include <stdint.h>
#include "semihost.h"
int counter = 42;               /* .data   */
static int g_buf[256];          /* .bss    */
extern const int kMax;          /* .rodata (sensor.c) */
int sensor_read(int ch);
__attribute__((noinline)) int worker(int n) {   /* .text */
    int sum = 0;
    for (int i = 0; i < n && i < kMax; i++) g_buf[i] = sensor_read(i);
    for (int i = 0; i < n; i++) sum += g_buf[i];
    return sum;
}
int main(void) {
    semihost_puts("boot\n");
    counter += worker(8);
    semihost_puts(counter == 42 + 8 * 3 ? "ok\n" : "bad\n");
    for (;;) { counter++; }
}
```

```c title="sensor.c"
int last_reading = 3;          /* .data */
const int kMax = 100;          /* .rodata */
static char uart_log[4096];    /* .bss: the big buffer */
int sensor_read(int ch) {
    uart_log[ch & 4095] = (char)ch;
    return last_reading + uart_log[0];
}
```

빌드는 arm-none-eabi-gcc 16.2.0으로 했습니다.

```bash
CFLAGS="-mcpu=cortex-m4 -mthumb -O1 -g -ffunction-sections -fdata-sections -nostdlib -ffreestanding"
for f in startup main sensor; do arm-none-eabi-gcc $CFLAGS -c $f.c -o $f.o; done
arm-none-eabi-gcc $CFLAGS -T fw.ld -Wl,-Map=fw.map,--cref -Wl,--gc-sections startup.o main.o sensor.o -o fw.elf
```

QEMU에서 돌리면 `boot`와 `ok`가 찍힙니다.

```bash
qemu-system-arm -M netduinoplus2 -nographic -monitor none -serial null \
    -semihosting-config enable=on,target=native -kernel fw.elf
```

## ELF의 두 얼굴 — 섹션 vs 세그먼트

ELF는 같은 바이트를 두 가지로 묘사합니다.

- **섹션** — 링커가 보는 단위. `.text`, `.data`, `.bss`, `.debug_*` 등.
- **세그먼트**(program header) — 로더나 프로그래머가 보는 단위. `PT_LOAD` 등.

`readelf -S`의 실제 출력입니다(디버그 섹션 일부 생략).

```text
  [Nr] Name              Type            Addr     Off    Size   ES Flg Lk Inf Al
  [ 1] .isr_vector       PROGBITS        08000000 001000 000040 00   A  0   0  4
  [ 2] .text             PROGBITS        08000040 001040 00011c 00  AX  0   0  4
  [ 3] .data             PROGBITS        20000000 002000 000008 00  WA  0   0  4
  [ 4] .bss              NOBITS          20000008 002008 001400 00  WA  0   0  4
  [ 5] .stack            NOBITS          20001408 002408 001000 00  WA  0   0  8
  [ 6] .debug_info       PROGBITS        00000000 002008 0004b4 00      0   0  1
  ...
  [16] .symtab           SYMTAB          00000000 003008 000360 10     17  37  4
```

| 플래그 | 의미 (readelf의 Key to Flags) |
|--------|------|
| `W` | write |
| `A` | alloc (실행 시 메모리를 차지) |
| `X` | execute |

`PROGBITS`는 파일에 내용이 있는 섹션이고, `NOBITS`는 파일에는 없고 메모리만 차지하는 섹션입니다. `.bss`와 `.stack`이 NOBITS라서 파일 오프셋은 있어도 크기만큼 파일을 차지하지 않습니다. `.debug_*`와 `.symtab`은 `A` 플래그가 없어 타깃 메모리에 올라가지 않습니다.

`readelf -l`의 program header입니다.

```text
Entry point 0x8000045
There are 3 program headers, starting at offset 52

Program Headers:
  Type           Offset   VirtAddr   PhysAddr   FileSiz MemSiz  Flg Align
  LOAD           0x001000 0x08000000 0x08000000 0x0015c 0x0015c R E 0x1000
  LOAD           0x002000 0x20000000 0x0800015c 0x00008 0x01408 RW  0x1000
  LOAD           0x000408 0x20001408 0x08000168 0x00000 0x01000 RW  0x1000

 Section to Segment mapping:
  Segment Sections...
   00     .isr_vector .text 
   01     .data .bss 
   02     .stack 
```

Entry point가 `0x8000045`로 홀수인 이유는 Thumb 함수 주소의 비트 0이 1이기 때문입니다. `Reset_Handler`의 실제 위치는 0x08000044입니다.

## LMA vs VMA

같은 `.data`가 두 주소를 가집니다. *flash의 LMA*에 굽히고 *SRAM의 VMA*에서 쓰입니다.

![ELF LMA vs VMA — startup 복사 흐름](/images/blog/tools/diagrams/elf-lma-vma.svg)

`.data`는 초기값이 있는 변수입니다. 전원이 꺼져도 초기값이 남으려면 flash에 있어야 하고, 실행 중에는 쓸 수 있어야 하니 SRAM에 있어야 합니다. 그래서 부팅 직후 startup 코드가 flash의 초기값을 SRAM으로 *복사*합니다.

위 program header에서 `PhysAddr`가 LMA, `VirtAddr`가 VMA입니다. 두 번째 LOAD 세그먼트를 보면 VirtAddr 0x20000000(SRAM)인데 PhysAddr는 0x0800015c(flash), FileSiz는 8바이트(`counter`와 `last_reading`), MemSiz는 `.bss`까지 포함한 0x1408입니다. 첫 번째 세그먼트(`.isr_vector`, `.text`)는 두 주소가 같습니다.

GDB의 `load`나 프로그래머는 LMA에 굽고, 코드는 VMA에서 `.data`를 참조합니다. 1장의 QEMU 세션에서 이 복사가 보였습니다. 리셋 직후 `$m20000000,4`는 `00000000`이었고, `Reset_Handler`를 지난 뒤 같은 주소가 `2a000000`(42)으로 읽혔습니다.

## startup 코드 — Reset_Handler

Cortex-M은 리셋 때 벡터 테이블의 첫 워드로 SP를, 두 번째 워드로 PC를 설정합니다. 예제의 startup 코드 전체입니다.

```c title="startup.c"
#include <stdint.h>
extern uint32_t _sidata, _sdata, _edata, _sbss, _ebss, _estack;
extern int main(void);
void Reset_Handler(void);
void Default_Handler(void) { for (;;) {} }
void HardFault_Handler(void) __attribute__((weak, alias("Default_Handler")));

__attribute__((section(".isr_vector"), used))
const void *const g_vectors[16] = {
    &_estack,            /* 0: initial MSP */
    Reset_Handler,       /* 1: reset */
    Default_Handler,     /* 2: NMI */
    HardFault_Handler,   /* 3: HardFault */
};

void Reset_Handler(void) {
    uint32_t *src = &_sidata, *dst = &_sdata;
    while (dst < &_edata) *dst++ = *src++;      /* .data: flash -> SRAM */
    for (dst = &_sbss; dst < &_ebss; ) *dst++ = 0; /* .bss: zero */
    main();
    for (;;) {}
}
```

`fw.hex`의 첫 데이터 레코드에서 벡터 테이블 앞 네 워드가 보입니다.

```text
:1000000008240020450000084100000841000008C5
```

리틀 엔디언으로 읽으면 0x20002408(`_estack`), 0x08000045(`Reset_Handler` | 1), 0x08000041(`Default_Handler` | 1), 0x08000041(`HardFault_Handler`, 같은 함수의 alias)입니다. 1장에서 GDB가 리셋 직후 받은 SP 0x20002408과 PC 0x08000044가 바로 이 값입니다.

이 시퀀스는 링커 스크립트가 정의한 심볼과 정확히 맞물려야 합니다. 복사 범위가 틀리면 `.data`가 엉뚱한 값으로 시작하거나 `.bss`가 0이 아닌 채로 `main`에 들어갑니다. 이 예제는 `-nostdlib`이라 C 런타임 초기화 단계가 없습니다. newlib을 링크하는 펌웨어라면 C++ 정적 생성자 같은 `.init_array` 항목을 newlib의 `__libc_init_array()`가 호출하므로, startup에서 `main` 전에 이 함수를 부릅니다.

## 링커 스크립트

예제의 `fw.ld` 전체입니다.

```ld title="fw.ld"
MEMORY {
    FLASH (rx)  : ORIGIN = 0x08000000, LENGTH = 1024K
    RAM   (rwx) : ORIGIN = 0x20000000, LENGTH = 128K
}
ENTRY(Reset_Handler)
SECTIONS {
    .isr_vector : { KEEP(*(.isr_vector)) } > FLASH
    .text : { *(.text*) *(.rodata*) } > FLASH
    _sidata = LOADADDR(.data);
    .data : { _sdata = .; *(.data*) _edata = .; } > RAM AT > FLASH
    .bss  : { _sbss = .; *(.bss*) *(COMMON) _ebss = .; } > RAM
    .stack (NOLOAD) : ALIGN(8) { _sstack = .; . = . + 0x1000; _estack = .; } > RAM
}
```

핵심 문법을 [GNU ld 매뉴얼](https://sourceware.org/binutils/docs/ld/) 기준으로 정리했습니다.

| 문법 | 의미 |
|------|------|
| `MEMORY { ... }` | 영역 정의 (이름, 권한, ORIGIN, LENGTH) |
| `> FLASH` | 이 출력 섹션의 VMA를 FLASH에 |
| `> RAM AT > FLASH` | VMA는 RAM, LMA는 FLASH (`.data` 패턴) |
| `KEEP(...)` | `--gc-sections`가 지우지 않게 고정 |
| `LOADADDR(.data)` | `.data`의 LMA |
| `ADDR(.data)` | `.data`의 VMA |
| `.` | 위치 카운터 |
| `*(.text*)` | 모든 입력 파일의 `.text*` 섹션 |
| `(NOLOAD)` | 실행 시 메모리는 할당하되 로드하지 않음 |
| `ALIGN(N)` | N바이트 정렬 |
| `PROVIDE(sym = ...)` | 다른 곳에서 정의하지 않고 참조될 때만 정의 |

링커 스크립트의 심볼은 C에서 `extern`으로 받고, *값이 아니라 주소*를 씁니다. `&_sdata`가 영역 경계이고, `_sdata` 자체를 읽으면 그 주소의 내용을 읽게 됩니다.

## MAP 파일 — 결과 메모리 지도

`-Wl,-Map=fw.map,--cref`로 만든 MAP 파일에서 핵심 부분을 그대로 옮깁니다.

```text
Memory Configuration

Name             Origin             Length             Attributes
FLASH            0x08000000         0x00100000         xr
RAM              0x20000000         0x00020000         xrw
*default*        0x00000000         0xffffffff

.text           0x08000040      0x11c
 *(.text*)
 .text.Default_Handler
                0x08000040        0x2 startup.o
                0x08000040                HardFault_Handler
                0x08000040                Default_Handler
 *fill*         0x08000042        0x2 
 .text.Reset_Handler
                0x08000044       0x64 startup.o
                0x08000044                Reset_Handler
 .text.worker   0x080000a8       0x48 main.o
                0x080000a8                worker
 .text.main     0x080000f0       0x38 main.o
                0x080000f0                main
 .text.sensor_read
                0x08000128       0x1c sensor.o
                0x08000128                sensor_read
 *(.rodata*)
 .rodata.main.str1.4
                0x08000144       0x12 main.o
 *fill*         0x08000156        0x2 
 .rodata.kMax   0x08000158        0x4 sensor.o
                0x08000158                kMax
                0x0800015c                        _sidata = LOADADDR (.data)

.data           0x20000000        0x8 load address 0x0800015c
                0x20000000                        _sdata = .
 *(.data*)
 .data.counter  0x20000000        0x4 main.o
                0x20000000                counter
 .data.last_reading
                0x20000004        0x4 sensor.o
                0x20000004                last_reading
                0x20000008                        _edata = .

.bss            0x20000008     0x1400 load address 0x08000164
                0x20000008                        _sbss = .
 *(.bss*)
 .bss.g_buf     0x20000008      0x400 main.o
 .bss.uart_log  0x20000408     0x1000 sensor.o
 *(COMMON)
                0x20001408                        _ebss = .
```

한 줄마다 *입력 섹션, 주소, 크기, 들어온 파일*이 있습니다. 몇 가지가 눈에 띕니다.

- `*fill*`은 정렬 때문에 들어간 빈 공간입니다. `Default_Handler`(2바이트) 뒤에 2바이트가 채워져 `Reset_Handler`가 4바이트 경계에서 시작합니다.
- `.data`의 `load address 0x0800015c`가 LMA이고, `_sidata`도 같은 값입니다.
- `static`인 `g_buf`·`uart_log`는 입력 섹션 줄(`.bss.g_buf`)만 있고 심볼 줄이 없습니다. MAP은 전역 심볼만 따로 찍습니다.
- `.rodata.main.str1.4`는 `semihost_puts`에 넘긴 문자열 상수입니다.

### 진단 1 — 메모리 부족

RAM이 모자라면 링크가 실패합니다. `fw.ld`의 RAM `LENGTH`를 8K로 줄여 빌드했을 때의 실제 메시지입니다.

```text
arm-none-eabi-ld: fw-small.elf section `.stack' will not fit in region `RAM'
arm-none-eabi-ld: region `RAM' overflowed by 1032 bytes
collect2: error: ld returned 1 exit status
```

`.bss` 끝이 0x20001408이고 스택 0x1000을 더하면 RAM 시작에서 9224바이트가 필요한데, 8K는 8192바이트라 차이가 1032바이트입니다. 메시지는 마지막으로 넘친 섹션(`.stack`)을 가리킬 뿐이므로, 실제로 RAM을 많이 쓴 범인은 따로 찾아야 합니다. `nm --size-sort`가 빠릅니다.

```text
$ arm-none-eabi-nm -S --size-sort fw.elf
08000040 00000002 T Default_Handler
08000040 00000002 W HardFault_Handler
20000000 00000004 D counter
08000158 00000004 T kMax
20000004 00000004 D last_reading
08000128 0000001c T sensor_read
080000f0 00000038 T main
08000000 00000040 R g_vectors
080000a8 00000048 T worker
08000044 00000064 T Reset_Handler
20000008 00000400 b g_buf
20001408 00001000 B _sstack
20000408 00001000 b uart_log
```

소문자는 local(`static`), 대문자는 global입니다. 4 KiB짜리 `uart_log`가 `sensor.c`의 `static char uart_log[4096]`입니다. 두 가지는 읽을 때 조심합니다. `kMax`가 `R`이 아니라 `T`로 나오는 것은 링커 스크립트가 `.rodata*`를 `.text` 출력 섹션 안에 넣어 그 섹션이 실행 가능 속성을 갖기 때문입니다. 또 `_sstack`은 변수가 아니라 링커 스크립트 심볼입니다. `readelf -s`로 보면 크기가 0(`20001408     0 NOTYPE  GLOBAL DEFAULT    5 _sstack`)인데, `--size-sort`가 다음 심볼 `_estack`까지의 거리 0x1000을 크기로 표시했습니다.

### 진단 2 — 알 수 없는 주소

fault 핸들러가 PC 하나만 남겼다면 `addr2line`으로 위치를 찾습니다.

```text
$ arm-none-eabi-addr2line -e fw.elf -f -i -s 0x080000c0
worker
main.c:9 (discriminator 4)
```

0x080000c0은 `worker`(0x080000a8부터 0x48바이트) 안이고, `main.c` 9행은 `sensor_read()`를 부르는 첫 번째 `for` 루프입니다. `-s`는 경로를 빼고 파일 이름만 보여 줍니다.

### 진단 3 — Cross Reference

`--cref`로 만든 표는 심볼마다 *정의한 파일*을 첫 줄에, *참조하는 파일*을 다음 줄에 적습니다.

```text
Symbol                                            File
kMax                                              sensor.o
                                                  main.o
main                                              main.o
                                                  startup.o
sensor_read                                       sensor.o
                                                  main.o
```

`kMax`는 `sensor.o`가 정의하고 `main.o`가 참조합니다. `main`은 `startup.o`의 `Reset_Handler`가 부릅니다. undefined reference를 쫓을 때, 또는 어떤 심볼이 어느 파일에서 끌려 들어왔는지 확인할 때 씁니다.

## --gc-sections — 미사용 코드 제거

`-ffunction-sections -fdata-sections`로 컴파일하면 함수와 변수가 각자 섹션을 갖습니다. `main.o`를 `readelf -S`로 보면 그 모습이 그대로입니다.

```text
  [ 4] .text.worker      PROGBITS        00000000 000034 000048 00  AX  0   0  4
  [ 7] .text.main        PROGBITS        00000000 000090 000038 00  AX  0   0  4
  [ 9] .bss.g_buf        NOBITS          00000000 0000c8 000400 00  WA  0   0  4
  [10] .data.counter     PROGBITS        00000000 0000c8 000004 00  WA  0   0  4
```

링커는 `--gc-sections`로 *참조되지 않는* 섹션을 지웁니다. 아무도 부르지 않는 함수와 2 KiB 테이블을 담은 `extra.c`를 더해 빌드해 보았습니다.

```c title="extra.c"
/* never called: removed by --gc-sections */
int unused_table[512] = {1};
int unused_helper(int x) { return x * 3 + unused_table[x & 511]; }
```

`--print-gc-sections`가 지운 섹션을 알려 줍니다.

```text
arm-none-eabi-ld: removing unused section '.text.unused_helper' in file '...'
arm-none-eabi-ld: removing unused section '.data.unused_table' in file '...'
```

```text
   text	   data	    bss	    dec	    hex	filename
    372	   2056	   9216	  11644	   2d7c	fw-nogc.elf
    348	      8	   9216	   9572	   2564	fw-gc.elf
```

`--gc-sections` 없이 링크하면 `unused_table`(2048바이트)이 `.data`에 남아 flash와 RAM을 모두 차지하고, `unused_helper`가 `.text`를 24바이트 늘립니다.

### KEEP이 없으면

벡터 테이블은 코드 어디에서도 *참조하지 않습니다*. CPU가 하드웨어로 읽을 뿐입니다. 그래서 링커 입장에서는 지워도 되는 섹션입니다. `fw.ld`에서 `KEEP`만 빼고 다시 빌드하자 `.isr_vector` 섹션이 사라지고 `.text`가 0x08000000에서 시작했습니다.

```text
  [ 1] .text             PROGBITS        08000000 001000 000118 00  AX  0   0  4
```

이 ELF를 QEMU에서 `-d int,guest_errors`로 돌린 결과입니다.

```text
Loaded reset SP 0x4a12b508 PC 0x429a4b12 from vector table
Taking exception 3 [Prefetch Abort] on CPU 0
...at fault address 0x429a4b12
...really UsageFault with UFSR.UNALIGNED
...BusFault with BFSR.STKERR
```

CPU는 0x08000000의 첫 두 워드를 SP와 PC로 읽었는데, 그 자리에는 이제 `Reset_Handler`의 명령어(`08b5124a 124b9a42`)가 있습니다. 엉뚱한 PC로 뛰자마자 fault가 났고, 스택 포인터도 쓰레기 값이라 예외 진입 중 스택 push까지 실패했습니다(`STKERR`). 빌드는 경고 없이 성공했다는 점이 이 실수의 무서운 부분입니다. 예제 `startup.c`의 `used` 속성은 컴파일러가 변수를 지우지 못하게 할 뿐, 링커의 섹션 GC는 막지 못합니다.

## 여러 메모리 영역

flash와 SRAM 외에 메모리 영역이 더 있는 칩에서는 `MEMORY`에 영역을 추가하고 전용 섹션을 그쪽으로 보냅니다. 아래 주소와 크기는 문법을 보이기 위한 예이며, 실제 값은 칩 데이터시트의 메모리 맵에서 가져와야 합니다.

```ld
MEMORY {
    FLASH (rx)  : ORIGIN = 0x08000000, LENGTH = 1024K
    RAM   (rwx) : ORIGIN = 0x20000000, LENGTH = 128K
    CCRAM (rwx) : ORIGIN = 0x10000000, LENGTH = 64K
}
SECTIONS {
    /* ... */
    .ccram_data (NOLOAD) : { *(.ccram*) } > CCRAM
}
```

```c
__attribute__((section(".ccram"))) static int g_hot_data[1024];
```

`.data`나 `.bss`를 외부 SDRAM처럼 컨트롤러 초기화가 필요한 영역에 둔다면, 그 초기화가 startup의 `.data` 복사·`.bss` 0 채우기보다 *먼저* 끝나야 합니다. 그 전에는 그 주소에 쓸 수 없기 때문입니다.

## .ARM.exidx — 스택 unwind 정보

`main.c`를 `-funwind-tables`로 다시 컴파일하자, 평소에는 없던 `.ARM.extab`(0xc바이트)과 `.ARM.exidx`(0x10바이트, 타입 `ARM_EXIDX`) 섹션이 생겼습니다. C++ 예외를 쓸 때도 같은 섹션이 필요하므로, 링커 스크립트가 이 섹션을 받는 자리를 마련해야 합니다.

```ld
.ARM.extab : { *(.ARM.extab* .gnu.linkonce.armextab.*) } > FLASH
.ARM : {
    __exidx_start = .;
    *(.ARM.exidx*)
    __exidx_end = .;
} > FLASH
```

기본 옵션의 이 장 C 예제에는 둘 다 생기지 않았습니다.

## TLS — Thread-Local Storage

`__thread` 변수를 쓰면 `.tdata`·`.tbss` 섹션이 생깁니다. 작은 예를 컴파일해 보았습니다.

```c
__thread int tls_counter = 5;
__thread int tls_zero;
int bump(void){ return ++tls_counter + tls_zero; }
```

```text
  [ 5] .tbss             NOBITS          00000000 000054 000004 00 WAT  0   0  4
  [ 6] .tdata            PROGBITS        00000000 000054 000004 00 WAT  0   0  4
         U __aeabi_read_tp
```

`T` 플래그가 TLS 섹션이라는 표시이고, 코드는 `bl __aeabi_read_tp`로 스레드 포인터를 얻습니다. 베어메탈에는 이 함수가 없으므로, `__thread`를 쓰려면 RTOS나 런타임이 스레드 포인터와 task별 TLS 블록을 제공해야 하고 링커 스크립트도 `.tdata`/`.tbss`를 배치해야 합니다.

## .stack과 stack overflow 진단

스택은 *아래로* 자랍니다. 예제에서 초기 SP는 `_estack`(0x20002408)이고, 함수가 호출될 때마다 낮은 주소로 내려가 `_sstack`(0x20001408) 쪽으로 다가갑니다. 그 아래는 `.bss`(`uart_log`)이므로, 스택이 넘치면 조용히 전역 변수를 덮어씁니다.

간단한 검사는 현재 SP와 하한을 비교하는 것입니다.

```c
extern uint32_t _sstack, _estack;

void check_stack(void) {
    register uint32_t sp __asm__("sp");
    if (sp < (uint32_t)&_sstack + 64) {
        for (;;) {}   // 스택이 거의 다 참
    }
}
```

Armv8-M Mainline(Cortex-M33 등)에는 스택 한계 레지스터 MSPLIM/PSPLIM이 있습니다. CMSIS 5.9.0의 `__set_MSPLIM()`은 `MSR msplim`으로 값을 쓰고, `core_cm33.h`는 UsageFault 상태에 `SCB_CFSR_STKOF` 비트를 정의합니다. 7장에서 QEMU Cortex-M33으로 이 검출을 실제로 돌려 봅니다.

## 펌웨어 크기 확인

```text
$ arm-none-eabi-size fw.elf
   text	   data	    bss	    dec	    hex	filename
    348	      8	   9216	   9572	   2564	fw.elf
```

- **text** — `.isr_vector` 64 + `.text` 284 = 348. flash를 차지합니다.
- **data** — `.data` 초기값 8. flash(LMA)와 RAM(VMA) 둘 다 차지합니다.
- **bss** — `.bss` 5120 + `.stack` 4096 = 9216. RAM만 차지합니다. 이 링커 스크립트에서는 NOBITS인 `.stack`도 bss 열에 들어갔습니다.

flash 사용량은 text + data = 356바이트이고, `objcopy -O binary`로 만든 `fw.bin`도 정확히 356바이트였습니다. `-A`로 보면 섹션별로 나옵니다.

```text
$ arm-none-eabi-size -A fw.elf
fw.elf  :
section            size        addr
.isr_vector          64   134217728
.text               284   134217792
.data                 8   536870912
.bss               5120   536870920
.stack             4096   536876040
```

주소가 10진(134217728 = 0x08000000)으로 나오는 점만 주의하면 됩니다.

## stripping vs debuginfo 분리

```bash
arm-none-eabi-objcopy --only-keep-debug fw.elf fw.debug
arm-none-eabi-objcopy --strip-debug fw.elf fw-stripped.elf
arm-none-eabi-objcopy --add-gnu-debuglink=fw.debug fw-stripped.elf
```

결과 크기는 `fw.elf` 14324바이트, `fw-stripped.elf` 9748바이트, `fw.debug` 6272바이트였고, stripped 파일에는 `.gnu_debuglink` 섹션(0x10바이트)이 생겼습니다. `.gnu_debuglink`는 디버그 파일 *이름과 CRC*를 담습니다. 반면 build-id로 디버그 파일을 찾으려면 ELF에 build-id note가 있어야 하는데, 이 베어메탈 빌드에서는 `readelf -n fw.elf`가 아무것도 출력하지 않았습니다. build-id가 필요하면 `-Wl,--build-id`를 링크 옵션에 줍니다.

베어메탈에는 OS core dump가 없지만, 디버거로 RAM과 레지스터를 떠 두면 같은 ELF로 나중에 분석할 수 있습니다. 이때 *굽은 바이너리와 정확히 같은 빌드의 ELF*가 남아 있어야 합니다.

## hex / bin 변환

```bash
arm-none-eabi-objcopy -O ihex   fw.elf fw.hex    # Intel HEX
arm-none-eabi-objcopy -O binary fw.elf fw.bin    # raw binary
arm-none-eabi-objcopy -O srec   fw.elf fw.srec   # Motorola S-record
```

Intel HEX는 주소 정보를 담은 텍스트입니다. `fw.hex`의 처음과 끝입니다.

```text
:020000040800F2
:1000000008240020450000084100000841000008C5
...
:0400000508000045AA
:00000001FF
```

첫 줄(레코드 타입 04)이 상위 주소 0x0800을 정하고, 끝에서 두 번째 줄(타입 05)이 시작 주소 0x08000045를, 마지막 줄(타입 01)이 파일 끝을 나타냅니다. raw binary에는 주소가 없으므로, 굽는 도구에 시작 주소(여기서는 0x08000000)를 따로 알려 줘야 합니다. 4장에서 본 J-Link `VerifyBin`이 주소 인자를 받는 이유입니다.

## 정리

- 섹션은 링커가 보는 단위, 세그먼트는 로더·프로그래머가 보는 단위입니다.
- `.data`는 LMA(flash)와 VMA(SRAM)가 다르고, startup 코드가 복사합니다. 1장 QEMU 세션에서 0 → 42로 바뀌는 것이 보였습니다.
- 링커 스크립트의 `> RAM AT > FLASH`, `LOADADDR`, `KEEP`, `NOLOAD`가 베어메탈 배치의 핵심입니다.
- MAP 파일은 입력 섹션·주소·크기·파일을, `--cref`는 정의·참조 관계를 보여 줍니다.
- RAM overflow 메시지는 마지막으로 넘친 섹션만 가리키므로 `nm --size-sort`로 큰 심볼을 따로 찾습니다.
- `--gc-sections`는 미사용 섹션을 지우고, 벡터 테이블에 `KEEP`이 없으면 경고 없이 사라져 부팅이 깨집니다.
- `.gnu_debuglink`는 이름과 CRC로 디버그 파일을 연결하며, build-id는 링크 옵션으로 따로 넣어야 합니다.

## 다음 장 예고

Ch 6 — 트레이스 (RTT / ITM / SWO / ETM / Semihosting). printf 없이 펌웨어 로그를 빼내는 다섯 가지 방법.

## 관련 항목

- [Ch 4: J-Link 도구 체인](/blog/tools/debugging/embedded/chapter04-jlink)
- [Ch 6: Trace — RTT / ITM / ETM](/blog/tools/debugging/embedded/chapter06-trace)
- [DWARF and ELF Internals 시리즈](/blog/tools/debugging/dwarf-elf/chapter01-elf-overview) — ELF 깊이
- [GNU LD manual](https://sourceware.org/binutils/docs/ld/)
- ARMv7-M Architecture Reference Manual — exception vector
