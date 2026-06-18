---
title: "ARM 메모리 맵 분석 — Normal·Device·Strongly-Ordered Region"
date: 2026-04-11T09:17:00
description: "Code·SRAM·Peripheral·System 영역 — bitband·MPU 활용."
series: "Modern Embedded Recipes"
seriesOrder: 17
tags: [recipes, arm, memory-map]
draft: false
---

## 한 줄 요약

> **"Cortex-M의 4GB 주소공간은 표준 영역으로 나뉘어 있습니다."** 어디에 무엇이 있는지 알면 linker script와 fault 디버깅이 쉬워집니다.

## 어떤 상황에서 쓰나

- Linker script로 메모리 배치를 설계할 때
- HardFault에서 fault address를 분석할 때
- Bitband로 단일 비트 atomic access가 필요할 때
- DMA buffer 영역의 cache/coherency 정책을 결정할 때

## 핵심 개념

### 1) 표준 메모리 맵 (Cortex-M3/M4)

![Cortex-M standard memory map](/images/blog/modern-recipes/diagrams/part2-05-arm-memory-map.svg)

각 영역은 default access attribute가 다릅니다. MPU로 override 가능.

### 2) Code / SRAM / Peripheral

| 영역 | 시작 주소 | 용도 |
| --- | --- | --- |
| Code | 0x00000000 | Flash 또는 RAM(remap), `.text` |
| SRAM | 0x20000000 | RAM, `.data`, `.bss`, stack, heap |
| Peripheral | 0x40000000 | UART, SPI, GPIO 등 register |
| External RAM | 0x60000000 | SDRAM, QSPI XIP |
| External device | 0xA0000000 | Memory-mapped device |
| PPB | 0xE0000000 | SCB, NVIC, debug |

STM32F4 예:

```text
Flash      0x08000000 ~ 0x080FFFFF (1 MB)
                       (alias at 0x00000000 if BOOT0=0)
SRAM1      0x20000000 ~ 0x2001BFFF (112 KB)
SRAM2      0x2001C000 ~ 0x2001FFFF (16 KB)
GPIOA      0x40020000
USART1     0x40011000
NVIC       0xE000E100
```

### 3) Memory attribute — Strongly-Ordered, Device, Normal

세 가지 default attribute가 있습니다.

| Attribute | 영역 | 특성 |
| --- | --- | --- |
| Normal | Code, SRAM, ext RAM | reorder, merge, cache 가능 |
| Device | Peripheral, ext device | 순서 보장, cache 불가 |
| Strongly-Ordered | PPB | 순서·완료 모두 엄격 |

```c
// Peripheral write — Device 영역, side effect 있음
GPIOC->BSRR = (1 << 5);   // 즉시 핀에 반영, reorder 안 됨

// SRAM write — Normal, reorder/merge 가능
buffer[0] = 1;
buffer[1] = 2;            // 컴파일러/CPU가 한 word write로 merge 가능
```

DMA용 buffer를 SRAM이 아닌 strongly-ordered region에 두면 throughput이 큰 폭으로 떨어집니다.

### 4) Bitband region (M3/M4)

SRAM과 peripheral 영역의 첫 1 MB는 bitband alias를 갖습니다. 32-bit access로 한 비트만 read/modify/write 합니다.

**SRAM bitband:**

- 원본:   0x20000000 ~ 0x200FFFFF (1 MB)
- alias:  0x22000000 ~ 0x23FFFFFF (32 MB)
- alias address = 0x22000000 + (byte_offset × 32) + (bit_num × 4)

**Peripheral bitband:**

- 원본:   0x40000000 ~ 0x400FFFFF
- alias:  0x42000000 ~ 0x43FFFFFF

```c
// 0x20000000 byte 0 의 bit 3을 1로
#define BITBAND_SRAM(addr, bit)  ((volatile uint32_t *) \
    (0x22000000 + ((addr - 0x20000000) * 32) + (bit * 4)))

*BITBAND_SRAM(0x20000000, 3) = 1;   // bit 3 만 set, race-free
```

Read-modify-write를 한 명령으로 만들어 ISR과의 race를 피할 수 있습니다. Cortex-M7은 bitband를 제거했습니다(LDREX/STREX 사용).

### 5) MPU로 attribute override

MPU region을 정의하면 default attribute를 override합니다.

```c
// DMA buffer를 non-cacheable로 설정 (M7)
MPU->RNR  = 0;                          // region 0
MPU->RBAR = 0x20020000;                 // 시작 주소
MPU->RASR = MPU_RASR_ENABLE_Msk
          | (15 << MPU_RASR_SIZE_Pos)   // 64KB (2^16)
          | MPU_RASR_S_Msk              // shareable
          | MPU_RASR_B_Msk;             // bufferable, non-cacheable
MPU->CTRL = MPU_CTRL_ENABLE_Msk;
```

## 코드 / 실제 사용 예

Linker script에서 메모리 영역을 정의합니다.

```text
MEMORY
{
    FLASH (rx)  : ORIGIN = 0x08000000, LENGTH = 1024K
    SRAM1 (rwx) : ORIGIN = 0x20000000, LENGTH = 112K
    SRAM2 (rwx) : ORIGIN = 0x2001C000, LENGTH = 16K
    CCM   (rwx) : ORIGIN = 0x10000000, LENGTH = 64K   /* TCM */
}

SECTIONS
{
    .text   : { *(.text*) } > FLASH
    .rodata : { *(.rodata*) } > FLASH
    .data   : { *(.data*) } > SRAM1 AT > FLASH
    .bss    : { *(.bss*)  } > SRAM1
    .ccmram : { *(.ccmram) } > CCM
}
```

CCM(Closely Coupled Memory)은 STM32F4의 64KB TCM 영역으로, CPU가 0-wait state로 접근합니다. DMA는 못 접근하므로 stack 또는 ISR critical data 용도가 좋습니다.

## 측정 / 비교

| 영역 | 접근 cycle (STM32F4 @ 168 MHz) |
| --- | --- |
| Flash (cached) | 1 cycle |
| Flash (no cache) | 5 ~ 6 cycle |
| SRAM | 1 cycle |
| CCM (TCM) | 1 cycle |
| External SDRAM | 5 ~ 15 cycle |
| Peripheral | 2 ~ 3 cycle (AHB-APB bridge) |
| PPB | 1 ~ 2 cycle |

| Bitband alias 사용 | 효과 |
| --- | --- |
| GPIO 비트 toggle | atomic, race 없음 |
| Flag 변수 set/clear | ISR-safe |

## 자주 보는 함정

> ⚠️ DMA buffer를 cached 영역에 그대로 둠

M7의 SRAM은 default cacheable입니다. DMA가 update한 memory를 CPU가 cache에서 stale로 읽습니다. MPU로 non-cacheable region을 만들거나 매번 invalidate.

> ⚠️ Peripheral write를 reorder된 채 다음 access

Device 영역은 reorder 안 되지만, normal 영역에서 peripheral로 가는 chain은 컴파일러가 reorder합니다. `volatile` 또는 memory barrier 필요.

> ⚠️ Stack을 SRAM 끝에 두지 않고 .bss 옆에

stack overflow 시 .bss와 .data를 손상시켜 디버깅이 어려워집니다. SRAM 끝에 두고 MPU로 stack guard region을 만듭니다.

> ⚠️ Cortex-M7에서 bitband 코드 그대로 사용

M7은 bitband가 없어 hardfault 발생합니다. `LDREX/STREX` 또는 atomic intrinsic으로 대체.

> ⚠️ Boot remap 무시

STM32 BOOT0 핀에 따라 0x00000000이 flash, SRAM, system memory(ROM bootloader)로 alias됩니다. Linker는 항상 실제 주소(0x08000000)를 쓰는 게 안전합니다.

## 정리

- Cortex-M의 4GB 주소공간은 Code, SRAM, Peripheral, External, PPB로 표준 분할됩니다.
- 각 영역은 default attribute(Normal/Device/Strongly-Ordered)를 갖고, MPU로 override 가능합니다.
- Bitband region으로 단일 비트 atomic access가 가능합니다(M3/M4 only).
- Linker script에서 chip의 실제 주소(0x08000000 등)를 기준으로 영역을 정의합니다.
- DMA buffer, peripheral access, stack 배치는 attribute와 coherency를 고려해야 합니다.

다음 편에서는 **ARM 캐시 (L1/L2)**를 다룹니다. Cortex-M7과 Cortex-A의 cache 관리입니다.

## 관련 항목

- [2-04: Cortex-M 예외 처리](/blog/embedded/modern-recipes/part2-04-cortex-m-exceptions)
- [2-06: ARM 캐시 (L1/L2)](/blog/embedded/modern-recipes/part2-06-arm-cache)
- [2-07: MPU 활용](/blog/embedded/modern-recipes/part2-07-arm-mpu)
- [3-04: 링커 스크립트 기초](/blog/embedded/modern-recipes/part3-04-linker-script-basics)
