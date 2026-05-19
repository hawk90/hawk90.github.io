---
title: "3-05: 링커 스크립트 고급"
date: 2026-05-13T03:00:00
description: "LMA vs VMA·KEEP·AT>·overlay·custom section."
series: "Modern Embedded Recipes"
seriesOrder: 27
tags: [recipes, toolchain, linker]
draft: false
---

## 한 줄 요약

> **"LMA와 VMA를 분리하면 코드와 데이터의 저장 위치와 실행 위치를 따로 정할 수 있습니다."** RAM 실행 함수, dual-bank flash, overlay 모두 이 한 가지 원리에서 출발합니다.

## 어떤 상황에서 쓰나

- ISR을 RAM에서 실행해 wait state를 피할 때
- 부트로더 영역과 app 영역을 명확히 분리
- A/B firmware update를 위한 dual-bank 구성
- DMA buffer를 특정 alignment·영역에 강제 배치

## 핵심 개념

### 1) LMA vs VMA 복습

```text
LMA (Load Memory Address)    — 저장 위치 (Flash)
VMA (Virtual Memory Address) — 실행 위치 (RAM 또는 Flash)
```

`.data`가 대표 예입니다. Flash에 초기값 저장(LMA), boot 시 RAM으로 복사(VMA).

### 2) RAM에서 실행하는 함수

ISR이나 critical loop를 Flash가 아닌 RAM에서 실행하면 wait state가 없어 빠릅니다.

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

이후 함수 호출 시 RAM에서 실행되며, M4 기준 보통 20 ~ 30% 빠릅니다.

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

`(NOLOAD)`는 ELF에 데이터 영역을 만들지 않습니다. 단순히 주소만 할당.

### 4) Dual-bank A/B 분할

```text
MEMORY
{
    BOOT  (rx) : ORIGIN = 0x08000000, LENGTH = 32K
    APP_A (rx) : ORIGIN = 0x08008000, LENGTH = 496K
    APP_B (rx) : ORIGIN = 0x08084000, LENGTH = 496K
    SRAM  (rwx): ORIGIN = 0x20000000, LENGTH = 128K
}

/* 같은 binary가 A 또는 B에 들어가도록 -DSLOT=A 매크로로 빌드 */
```

빌드 시 어느 slot에 들어갈지 옵션으로 결정합니다.

### 5) Overlay

같은 RAM 영역에 두 함수 그룹을 번갈아 두는 기법. M3/M4에서는 거의 안 씁니다(메모리가 충분). DSP나 작은 chip에서 유용.

```text
OVERLAY 0x20000000 :
{
    .text1 { *(group1.text) } AT > FLASH
    .text2 { *(group2.text) } AT > FLASH
}
```

각 group을 실행 전에 Flash → RAM 복사. 한 번에 한 group만 RAM에 존재.

### 6) `gc-sections`와 `KEEP`

빌드 옵션 `-Wl,--gc-sections`는 참조되지 않는 section을 제거합니다. 단, `.isr_vector`처럼 코드가 명시적으로 참조 안 하는 것은 `KEEP`으로 보호.

```c
// 컴파일 옵션 — function/data별 section
gcc -ffunction-sections -fdata-sections ...

// 링크 옵션 — 미참조 section 제거
gcc -Wl,--gc-sections -Wl,--print-gc-sections ...
```

대규모 코드에서 20 ~ 40% flash 절감이 가능합니다.

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

Vector table을 RAM으로 옮기기 (dynamic IRQ handler 교체용):

```c
extern uint32_t _vector_ram[];
extern uint32_t _vector_flash[];

void relocate_vectors(void) {
    for (int i = 0; i < 256; i++) {
        _vector_ram[i] = _vector_flash[i];
    }
    SCB->VTOR = (uint32_t)_vector_ram;
}
```

```text
.vector_ram (NOLOAD) :
{
    . = ALIGN(512);
    _vector_ram = .;
    . = . + 1024;   /* 256 entry * 4 byte */
} > SRAM
```

## 측정 / 비교

| 기법 | 효과 | 비용 |
| --- | --- | --- |
| ISR을 .ramfunc로 | 20-30% 빠른 entry | RAM 사용량 증가 |
| `--gc-sections` | 20-40% flash 감소 | 빌드 시간 약간 증가 |
| Dual-bank A/B | A/B firmware swap 가능 | flash 절반만 사용 |
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

linker script에 section만 정의하고 startup에서 복사 안 하면, RAM의 함수는 garbage가 들어 있어 hardfault.

> ⚠️ NOLOAD section에 초기값 의도

`(NOLOAD)`는 단순 placement만. 초기값이 필요하면 일반 section + AT >로 LMA 지정.

> ⚠️ `--gc-sections`로 vector table 사라짐

vector table 함수가 `weak`이거나 명시 참조가 없으면 gc-sections가 제거. `KEEP(*(.isr_vector))` 필수.

> ⚠️ A/B slot의 절대 주소 가정 코드

slot A 빌드와 B 빌드에서 vector table 주소가 다르면 SCB->VTOR 설정도 달라야 합니다. 빌드 매크로로 분기.

> ⚠️ Overlay 전환 중 IRQ 발생

overlay group A → B 복사 도중 IRQ가 들어와 A의 함수를 호출하면 부분 손상된 코드를 실행. 복사 동안 IRQ disable.

## 정리

- LMA와 VMA 분리로 코드/데이터의 저장 위치와 실행 위치를 따로 정할 수 있습니다.
- `.ramfunc`로 critical 함수를 RAM에서 실행해 wait state 회피.
- Custom section과 NOLOAD로 특수 메모리 영역 활용.
- Dual-bank A/B로 OTA 업데이트 지원.
- `--gc-sections`로 unused section 제거, 20 ~ 40% flash 절감 가능.
- `KEEP`, `LOADADDR`, `PROVIDE` 같은 명령이 고급 배치의 도구입니다.

다음 편에서는 **스타트업 코드 분석**을 다룹니다. Reset_Handler부터 main까지 일어나는 일입니다.

## 관련 항목

- [3-04: 링커 스크립트 기초](/blog/embedded/modern-recipes/part3-04-linker-script-basics)
- [3-06: 스타트업 코드 분석](/blog/embedded/modern-recipes/part3-06-startup-code)
- [3-08: 메모리 레이아웃](/blog/embedded/modern-recipes/part3-08-memory-layout)
- [3-12: Bootloader 체인](/blog/embedded/modern-recipes/part3-12-bootloader-chain)
