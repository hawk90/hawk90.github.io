---
title: "링커 스크립트 고급 — Overlay·BSS·init_array·LMA/VMA"
slug: "embedded/modern-recipes/part3-05-linker-script-advanced"
date: 2026-04-12T09:27:00
description: "LMA vs VMA·KEEP·AT>·overlay·custom section."
series: "Modern Embedded Recipes"
seriesOrder: 27
tags: [recipes, toolchain, linker]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> **"LMA와 VMA를 분리하면 코드와 데이터의 저장 위치와 실행 위치를 따로 정할 수 있습니다."** RAM 실행 함수, dual-bank flash, overlay 모두 이 한 가지 원리에서 출발합니다.

## 어떤 상황에서 쓰나

- ISR을 RAM에서 실행해 wait state를 피할 때
- 부트로더 영역과 app 영역을 명확히 분리
- A/B firmware update를 위한 dual-bank 구성
- DMA buffer를 특정 alignment·영역에 강제 배치

이 글의 linker script 조각은 [3-04](/blog/embedded/modern-recipes/part3-04-linker-script-basics)의 STM32F4 script에 실제로 붙여 Debian 13 arm64 guest의 `gcc-arm-none-eabi` 14.2.rel1(GNU ld 2.44)로 링크했고, 결과 이미지를 QEMU 11.1.3 `netduinoplus2`(STM32F405)에서 돌렸습니다.

## 핵심 개념

### 1) LMA vs VMA 복습

- **LMA (Load Memory Address)** — 이미지에 저장되는 위치. 보통 Flash입니다.
- **VMA (Virtual Memory Address)** — 실행 중에 접근하는 위치. RAM 또는 Flash입니다.

`.data`가 대표 예입니다. Flash에 초기값 저장(LMA), boot 시 RAM으로 복사(VMA).

### 2) RAM에서 실행하는 함수

Flash를 읽을 때 wait state가 붙는 칩에서는 ISR이나 critical loop를 RAM에 두는 방법이 있습니다. 방법은 `.data`와 같아서, 코드를 Flash(LMA)에 저장해 두고 부팅 때 RAM(VMA)으로 복사합니다.

```c
// 함수에 section attribute 부여
__attribute__((section(".ramfunc")))
void __attribute__((noinline)) fast_isr(void) {
    /* ... */
}
```

linker script:

```text
.ramfunc :
{
    . = ALIGN(4);
    _sramfunc = .;
    *(.ramfunc*)
    . = ALIGN(4);
    _eramfunc = .;
} > SRAM AT > FLASH

_siramfunc = LOADADDR(.ramfunc);
```

startup code가 `.data`처럼 LMA → VMA로 복사:

```c
extern uint32_t _sramfunc, _eramfunc, _siramfunc;

void copy_ramfunc(void) {
    uint32_t *src = &_siramfunc;
    uint32_t *dst = &_sramfunc;
    while (dst < &_eramfunc) *dst++ = *src++;
}
```

QEMU `netduinoplus2`에서 함수 안에서 PC를 읽어 실제 실행 위치를 확인했습니다.

```c
__attribute__((section(".ramfunc"), noinline))
uint32_t fast_isr_body(void) {
    uint32_t pc;
    __asm volatile("mov %0, pc" : "=r"(pc));
    return pc;
}
```

```text
fast_isr_body address = 0x20000005
PC inside fast_isr_body = 0x20000008
```

함수 주소(Thumb bit 포함 0x20000005)와 실행 중 PC 모두 RAM입니다. 속도 이득은 칩의 Flash wait state와 cache·accelerator 구성에 달려 있고, QEMU는 cycle을 재지 않으므로 이 글에서는 측정하지 않았습니다.

### 3) Custom section

특정 변수를 별도 section에 두고 싶을 때 attribute로 표시하고 linker script에서 처리합니다.

```c
__attribute__((section(".battery_data")))
uint32_t battery_data[64];
```

```text
MEMORY
{
    BACKUP (rw) : ORIGIN = 0x40024000, LENGTH = 4K   /* BKP SRAM */
}

SECTIONS
{
    .battery_data (NOLOAD) :
    {
        *(.battery_data)
    } > BACKUP
}
```

`(NOLOAD)`는 section을 `NOBITS`로 만들어 파일에 내용을 넣지 않고 주소만 배정합니다. 아래 링크 결과에서 `.noinit_buf`가 `NOBITS`로 나옵니다. 부팅 코드가 `.bss`처럼 0으로 지우지도 않으므로, reset을 거쳐도 남아야 하는 값(backup SRAM, reset 원인 기록)에 씁니다.

### 4) Dual-bank A/B 분할

```text
MEMORY
{
    BOOT  (rx) : ORIGIN = 0x08000000, LENGTH = 32K
    APP_A (rx) : ORIGIN = 0x08008000, LENGTH = 496K
    APP_B (rx) : ORIGIN = 0x08084000, LENGTH = 496K
    SRAM  (rwx): ORIGIN = 0x20000000, LENGTH = 128K
}
```

slot마다 link 주소가 다르므로 slot A용과 slot B용 이미지를 따로 빌드합니다(예: `-DSLOT=A`로 linker script의 `REGION_ALIAS`를 고름). 위 주소는 예시이고, 실제로는 slot 경계를 칩 reference manual의 flash erase 단위(sector) 경계에 맞춰야 한쪽 slot을 지울 때 다른 slot이 함께 지워지지 않습니다.

### 5) Overlay

같은 RAM 주소에 여러 코드 묶음을 번갈아 올리는 기법입니다. GNU ld의 `OVERLAY` 명령은 안의 section들에 같은 VMA를 주고 LMA는 차례로 이어 붙입니다. 아래는 이 글의 script에 넣어 링크한 형태입니다.

```text
OVERLAY 0x2001F000 : AT (0x08080000)
{
    .ovl1 { *(.ovl1*) }
    .ovl2 { *(.ovl2*) }
}
```

```text
  [ 9] .ovl1             PROGBITS        2001f000 02f000 000004 00  AX  0   0  2
  [10] .ovl2             PROGBITS        2001f000 03f000 000004 00  AX  0   0  2
  LOAD           0x02f000 0x2001f000 0x08080000 0x00004 0x00004 R E 0x10000
  LOAD           0x03f000 0x2001f000 0x08080004 0x00004 0x00004 R E 0x10000
```

두 section의 VMA는 모두 0x2001F000이고 LMA는 0x08080000, 0x08080004입니다. 실행 전에 필요한 묶음을 Flash에서 그 RAM 주소로 복사하므로, 한 번에 한 묶음만 RAM에 있습니다. 주의할 점이 하나 있습니다. 이 LMA를 다른 section과 떨어진 0x08080000에 두었더니 `objcopy -O binary` 결과가 524,296 byte가 됐습니다. 0x08000000부터 0x08080008까지 사이를 0으로 채운 이미지이기 때문입니다.

### 6) `gc-sections`와 `KEEP`

빌드 옵션 `-Wl,--gc-sections`는 참조되지 않는 section을 제거합니다. 단, `.isr_vector`처럼 코드가 명시적으로 참조 안 하는 것은 `KEEP`으로 보호.

```bash
# 컴파일 옵션 — function/data별 section
arm-none-eabi-gcc -ffunction-sections -fdata-sections ...

# 링크 옵션 — 미참조 section 제거, 제거 목록 출력
arm-none-eabi-gcc -Wl,--gc-sections -Wl,--print-gc-sections ...
```

[3-04](/blog/embedded/modern-recipes/part3-04-linker-script-basics)의 실행에서 `--gc-sections`가 호출되지 않는 함수 두 개와, `KEEP`이 없는 `.isr_vector`까지 지운 것을 map 파일과 `--print-gc-sections`로 확인했습니다. 얼마나 줄어드는지는 프로젝트마다 map 파일로 봅니다.

## 코드 / 실제 사용 예

DMA buffer를 non-cacheable region에 두기 (Cortex-M7):

```c
// SRAM2를 non-cacheable로 MPU에서 설정
// linker script에서 buffer를 SRAM2에 배치

__attribute__((section(".dma_buffer"), aligned(32)))
uint8_t dma_rx_buf[1024];
```

```text
MEMORY
{
    FLASH  (rx)  : ORIGIN = 0x08000000, LENGTH = 2048K
    SRAM1  (rwx) : ORIGIN = 0x20000000, LENGTH = 384K
    SRAM2  (rwx) : ORIGIN = 0x20060000, LENGTH = 64K    /* DMA non-cacheable */
}

SECTIONS
{
    /* 일반 .text, .data, .bss ... > SRAM1 */
    
    .dma_buffer (NOLOAD) :
    {
        . = ALIGN(32);
        *(.dma_buffer)
        . = ALIGN(32);
    } > SRAM2
}
```

Vector table을 RAM으로 옮기기 (dynamic IRQ handler 교체용). 복사하는 entry 수는 Flash vector table의 실제 크기를 넘으면 안 됩니다. 이전 판은 256 entry를 복사했는데, STM32F407의 table은 16 + 82 = 98 word([2-04](/blog/embedded/modern-recipes/part2-04-cortex-m-exceptions))라 그 뒤의 Flash 내용까지 vector로 복사하게 됩니다. RAM table의 정렬은 2-04에서 계산한 대로 STM32F407에서 512 byte입니다.

```text
.vector_ram (NOLOAD) :
{
    . = ALIGN(512);
    _vector_ram = .;
    . = . + 512;   /* 128 entries * 4 byte */
} > SRAM
```

아래는 이 글의 예제 이미지(system vector 16개만 정의)에서 table을 RAM으로 옮기고 SysTick entry만 RAM의 다른 handler로 바꾼 코드입니다.

```c
extern uint32_t _vector_ram[];
extern void (*const vectors[16])(void);   /* the Flash table in .isr_vector */

for (int i = 0; i < 16; i++) _vector_ram[i] = (uint32_t)vectors[i];
_vector_ram[15] = (uint32_t)ram_systick;   /* SysTick = exception 15 */
__asm volatile("dsb");
SCB->VTOR = (uint32_t)_vector_ram;
```

```text
VTOR = 0x20000200
ticks from RAM SysTick handler = 0x00000001
```

VTOR가 512 byte 정렬된 RAM 주소(0x20000200)를 가리키고, SysTick이 RAM table의 handler로 갔습니다.

## 측정 / 비교

| 기법 | 효과 | 비용 |
| --- | --- | --- |
| ISR을 .ramfunc로 | Flash wait state를 피할 수 있음 | RAM 사용량, startup 복사 |
| `--gc-sections` | 미참조 section 제거 | 빌드 시간·linker 설정 관리 |
| Dual-slot A/B | A/B firmware swap 가능 | slot마다 이미지를 따로 빌드, flash를 두 몫으로 나눔 |
| Custom NOLOAD section | 특수 영역 활용 | 코드 복잡도 |

| 명령/속성 | 의미 |
| --- | --- |
| `(NOLOAD)` | ELF에 load entry 만들지 않음 |
| `KEEP(...)` | gc-sections에서 보호 |
| `LOADADDR(.x)` | section의 LMA 주소 반환 |
| `AT(addr)` | 명시적 LMA 지정 |
| `OVERLAY` | 같은 VMA에 여러 section |
| `PROVIDE(sym = ...)` | 미정의 시만 정의 |

## 자주 보는 함정

> ⚠️ `.ramfunc` 복사 누락

linker script에 section만 정의하고 startup에서 복사하지 않으면 RAM의 그 주소에는 함수가 없습니다. 위 이미지를 `copy_ramfunc()` 없이 빌드해 QEMU에서 돌린 결과입니다.

```text
fast_isr_body address = 0x20000005
HardFault, stacked PC unknown; CFSR = 0x00008200
```

QEMU는 RAM을 0으로 시작하므로 0x0000 명령을 이어 실행하다 BusFault(PRECISERR + BFARVALID)가 HardFault로 올라왔습니다. 실제 칩에서는 RAM의 초기 내용이 정해져 있지 않아 증상이 매번 다를 수 있으므로, map 파일에서 `.ramfunc`의 크기와 `_siramfunc`를 확인하고 startup의 복사를 먼저 봅니다.

> ⚠️ NOLOAD section에 초기값 의도

`(NOLOAD)`는 단순 placement만. 초기값이 필요하면 일반 section + AT >로 LMA 지정.

> ⚠️ `--gc-sections`로 vector table 사라짐

vector table은 코드에서 참조하지 않으므로 `KEEP`이 없으면 `--gc-sections`가 지웁니다([3-04](/blog/embedded/modern-recipes/part3-04-linker-script-basics)의 실행 결과). `KEEP(*(.isr_vector))`로 보호합니다.

> ⚠️ A/B slot의 절대 주소 가정 코드

slot A 빌드와 B 빌드에서 vector table 주소가 다르면 SCB->VTOR 설정도 달라야 합니다. 빌드 매크로로 분기.

> ⚠️ Overlay 전환 중 IRQ 발생

overlay group A → B 복사 도중 IRQ가 들어와 A의 함수를 호출하면 부분 손상된 코드를 실행. 복사 동안 IRQ disable.

## 정리

- LMA와 VMA 분리로 코드/데이터의 저장 위치와 실행 위치를 따로 정할 수 있습니다.
- `.ramfunc`로 함수를 RAM에서 실행하려면 startup의 복사가 꼭 필요합니다.
- `(NOLOAD)` section은 파일에 내용이 없고 0으로 지워지지도 않습니다.
- OVERLAY는 같은 VMA에 LMA만 다른 section을 만들고, LMA를 떨어뜨리면 binary 이미지가 그만큼 커집니다.
- A/B slot은 slot별로 따로 빌드하고 경계를 flash sector에 맞춥니다.
- `--gc-sections`로 미참조 section을 제거할 수 있으며, 절감 폭은 프로젝트별로 측정해야 합니다.
- `KEEP`, `LOADADDR`, `PROVIDE` 같은 명령이 고급 배치의 도구입니다.

다음 편에서는 **스타트업 코드 분석**을 다룹니다. Reset_Handler부터 main까지 일어나는 일입니다.

## 관련 항목

- [3-04: 링커 스크립트 기초](/blog/embedded/modern-recipes/part3-04-linker-script-basics)
- [3-06: 스타트업 코드 분석](/blog/embedded/modern-recipes/part3-06-startup-code)
- [3-08: 메모리 레이아웃](/blog/embedded/modern-recipes/part3-08-memory-layout)
- [3-12: Bootloader 체인](/blog/embedded/modern-recipes/part3-12-bootloader-chain)
