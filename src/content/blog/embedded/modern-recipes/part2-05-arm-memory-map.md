---
title: "ARM 메모리 맵 분석 — Normal·Device·Strongly-Ordered Region"
slug: "embedded/modern-recipes/part2-05-arm-memory-map"
date: 2026-04-11T09:17:00
description: "Code·SRAM·Peripheral·System 영역 — bitband·MPU 활용."
series: "Modern Embedded Recipes"
seriesOrder: 17
tags: [recipes, arm, memory-map]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> **"Cortex-M의 4GB 주소공간은 아키텍처가 정한 영역과 기본 attribute로 나뉘어 있습니다."** 어느 영역이 Normal이고 어느 영역이 Device인지 알면 linker script, MPU 설정, fault 주소 분석이 같은 지도 위에서 풀립니다.

## 어떤 상황에서 쓰나

- Linker script로 메모리 배치를 설계할 때
- HardFault에서 fault address를 분석할 때
- Bitband로 단일 비트 atomic access가 필요할 때
- DMA buffer 영역의 cache/coherency 정책을 결정할 때

이 글의 영역과 attribute는 ARMv7-M Architecture Reference Manual(DDI 0403E.e, 이하 ARMv7-M ARM) B3.1의 Table B3-1·B3-2, bit-band는 Cortex-M3 TRM r2p0 3.7, STM32F407 주소는 ST의 `stm32f407xx.h`(cmsis_device_f4 v2.6.9)에서 옮겼습니다. 코드는 arm-none-eabi-gcc 16.2.0과 QEMU 11.1.3(`mps2-an386` = Cortex-M4, `mps2-an500` = Cortex-M7)에서 돌린 결과를 함께 실었습니다.

## 핵심 개념

### 1) 표준 메모리 맵 (ARMv7-M)

![Cortex-M standard memory map](/images/blog/modern-recipes/diagrams/part2-05-arm-memory-map.svg)

지도의 칸 나누기와 기본 attribute는 아키텍처가 정합니다. MPU가 꺼져 있거나, 켜져 있어도 PRIVDEFENA로 background region을 쓰는 privileged 접근은 이 기본값을 따릅니다(ARMv7-M ARM B3.5). MPU region을 정의하면 그 범위의 attribute를 바꿀 수 있습니다.

### 2) 영역별 기본 attribute

ARMv7-M ARM Table B3-1과 B3-2를 그대로 옮기면 다음과 같습니다.

| 주소 | 이름 | 메모리 타입 | XN | Cache |
| --- | --- | --- | --- | --- |
| 0x00000000–0x1FFFFFFF | Code | Normal | — | WT |
| 0x20000000–0x3FFFFFFF | SRAM | Normal | — | WBWA |
| 0x40000000–0x5FFFFFFF | Peripheral | Device | XN | — |
| 0x60000000–0x7FFFFFFF | RAM | Normal | — | WBWA |
| 0x80000000–0x9FFFFFFF | RAM | Normal | — | WT |
| 0xA0000000–0xBFFFFFFF | Device | Device, shareable | XN | — |
| 0xC0000000–0xDFFFFFFF | Device | Device, non-shareable | XN | — |
| 0xE0000000–0xE00FFFFF | PPB | Strongly-ordered | XN | — |
| 0xE0100000–0xFFFFFFFF | Vendor_SYS | Device | XN | — |

XN(Execute Never) 영역에서는 명령을 가져올 수 없습니다. 그래서 Peripheral 영역 주소로 함수 포인터가 튀면 instruction fetch 단계에서 fault가 납니다.

STM32F407의 실제 배치는 `stm32f407xx.h`의 base 주소 정의로 확인할 수 있습니다.

| 블록 | 주소 (`stm32f407xx.h`) | 헤더 주석의 크기 |
| --- | --- | --- |
| Flash | `FLASH_BASE` 0x08000000 ~ `FLASH_END` 0x080FFFFF | up to 1 MB |
| CCM data RAM | `CCMDATARAM_BASE` 0x10000000 ~ `CCMDATARAM_END` 0x1000FFFF | 64 KB |
| SRAM1 | `SRAM1_BASE` 0x20000000 | 112 KB |
| SRAM2 | `SRAM2_BASE` 0x2001C000 | 16 KB |
| GPIOA | `AHB1PERIPH_BASE` + 0x0000 = 0x40020000 | — |
| USART1 | `APB2PERIPH_BASE` + 0x1000 = 0x40011000 | — |
| SRAM1 bit-band alias | `SRAM1_BB_BASE` 0x22000000 | — |
| Peripheral bit-band alias | `PERIPH_BB_BASE` 0x42000000 | — |

0x00000000에 무엇이 보일지는 remap으로 바뀝니다. STM32F4 HAL v1.8.5의 `stm32f4xx_hal.h`에는 main Flash, System Flash, embedded SRAM, FSMC bank를 0x00000000에 매핑하는 `__HAL_SYSCFG_REMAPMEMORY_*()` 매크로가 있고, 모두 `SYSCFG->MEMRMP`의 `MEM_MODE` 필드를 씁니다.

### 3) Memory attribute — Strongly-ordered, Device, Normal

Normal 메모리는 같은 주소를 두 번 읽어도 부작용이 없다고 가정할 수 있는 곳입니다. 그래서 하드웨어와 컴파일러가 접근을 합치거나 순서를 바꿀 여지가 있습니다. Device는 읽기·쓰기 자체가 부작용인 레지스터용이고, Strongly-ordered는 거기에 더해 완료까지 순서대로 처리합니다. 편지에 비유하면 Normal은 모아서 한꺼번에 부쳐도 되는 일반 우편, Device는 한 통씩 순서대로 보내야 하는 등기입니다.

여기서 흔히 섞이는 것이 *메모리 타입*과 *컴파일러*입니다. 메모리 타입은 CPU가 버스에 낸 접근의 순서를 다루지만, 컴파일러가 아예 접근을 없애거나 합치는 것은 `volatile`로만 막을 수 있습니다. 아래 코드를 arm-none-eabi-gcc 16.2.0 `-O2 -mcpu=cortex-m4`로 컴파일하면 차이가 드러납니다.

```c
#include <stdint.h>
uint8_t buffer[4];
void fill(void) { buffer[0] = 1; buffer[1] = 2; }            /* Normal SRAM data */

struct uart { uint32_t DR; uint32_t SR; };
void send_plain(struct uart *u)             { u->DR = 'A'; u->DR = 'B'; }
void send_volatile(volatile struct uart *u) { u->DR = 'A'; u->DR = 'B'; }
```

```text
fill:
	ldr	r3, .L3
	movw	r2, #513
	strh	r2, [r3]	@ movhi
	bx	lr
send_plain:
	movs	r3, #66
	str	r3, [r0]
	bx	lr
send_volatile:
	movs	r2, #65
	movs	r3, #66
	str	r2, [r0]
	str	r3, [r0]
	bx	lr
```

`fill`의 byte store 두 개는 halfword store 하나(`0x0201` = 513)로 합쳐졌습니다. `send_plain`은 `'A'` 쓰기를 통째로 지웠습니다. UART 데이터 레지스터라면 문자 하나가 사라진 것입니다. `volatile`을 붙인 `send_volatile`만 두 번 씁니다. CMSIS 장치 헤더가 peripheral 레지스터를 `__IO`(= `volatile`)로 선언하는 이유가 이것입니다.

### 4) Bitband region (M3/M4)

Cortex-M3 TRM 3.7은 SRAM과 Peripheral 영역의 가장 아래 1 MB를 bit-band region으로 두고, 각각 32 MB alias region을 갖는다고 적습니다. alias word에 쓰면 bus interface가 그 쓰기를 "atomic read-modify-write operation"으로 바꿉니다.

**SRAM bitband:**

- 원본:   0x20000000 ~ 0x200FFFFF (1 MB)
- alias:  0x22000000 ~ 0x23FFFFFF (32 MB)
- alias address = 0x22000000 + (byte_offset × 32) + (bit_num × 4)

**Peripheral bitband:**

- 원본:   0x40000000 ~ 0x400FFFFF
- alias:  0x42000000 ~ 0x43FFFFFF

아래 매크로로 0x20000000에 있는 word의 bit 3을 alias로 켜고, 원래 word와 alias를 다시 읽었습니다.

```c
// 0x20000000 byte 0 의 bit 3을 1로
#define BITBAND_SRAM(addr, bit)  ((volatile uint32_t *) \
    (0x22000000 + ((addr - 0x20000000) * 32) + (bit * 4)))

*BITBAND_SRAM(0x20000000, 3) = 1;   // bit 3 만 set, race-free
```

```text
### bb-m4.elf on mps2-an386
&word = 0x20000000
alias of bit 3 = 0x2200000C
word after alias write = 0x00000008
alias read of bit 3 = 0x00000001
alias read of bit 4 = 0x00000000
```

alias 주소 0x2200000C = 0x22000000 + 0×32 + 3×4이고, 원래 word에는 bit 3만 켜진 0x8이 남았습니다.

Cortex-M7 TRM r1p2 2.3.1 "Binary compatibility with other Cortex processors"는 M3·M4용 코드가 M7과 호환된다고 하면서 "as long as it does not rely on bit-banding"이라는 조건을 붙입니다. 같은 프로그램을 QEMU `mps2-an500`(Cortex-M7)에서 돌려도 위와 똑같은 결과가 나옵니다. 즉 이 QEMU 모델은 M7 구성에서도 bit-band alias를 처리합니다. 에뮬레이터에서 통과했다고 M7 실리콘에서 bit-band가 동작한다는 뜻은 아니므로, M7로 옮기는 코드는 `LDREX`/`STREX`나 C11 atomic으로 바꿉니다.

### 5) MPU로 attribute override

MPU region은 기본 attribute를 덮어씁니다. Cortex-M7에서 DMA buffer 64 KB를 non-cacheable로 만드는 예입니다. ARMv7-M ARM Table B3-13에서 Normal non-cacheable은 TEX=001, C=0, B=0이고, region 크기는 RASR.SIZE로 2^(SIZE+1) byte입니다.

```c
// DMA buffer를 non-cacheable로 설정 (M7)
MPU->RNR  = 0;                                   // region 0
MPU->RBAR = 0x20020000;                          // base, aligned to the 64KB size
MPU->RASR = (1U << MPU_RASR_TEX_Pos)             // TEX=001, C=0, B=0: Normal, non-cacheable
          | MPU_RASR_S_Msk                       // shareable
          | (3U << MPU_RASR_AP_Pos)              // full access
          | (15U << MPU_RASR_SIZE_Pos)           // 2^(15+1) = 64KB
          | MPU_RASR_ENABLE_Msk;
MPU->CTRL = MPU_CTRL_PRIVDEFENA_Msk | MPU_CTRL_ENABLE_Msk;   // keep the default map for privileged code
__DSB(); __ISB();
```

이 글의 이전 판은 `MPU_RASR_S_Msk | MPU_RASR_B_Msk`만 켜고 `MPU->CTRL = MPU_CTRL_ENABLE_Msk`로 끝냈습니다. 그 코드에는 두 가지 문제가 있습니다. 첫째, Table B3-13에서 TEX=000, C=0, B=1은 Normal non-cacheable이 아니라 "Shared device"입니다. 둘째, PRIVDEFENA 없이 MPU를 켜면 region에 들지 않은 주소, 곧 코드와 stack까지 접근할 수 없게 됩니다. AP도 0(no access)입니다. 두 버전을 `mps2-an500`에서 CMSIS 5.9.0 `core_cm7.h`로 빌드해 돌린 결과입니다.

```text
### mpu-post.elf (post's original code) on mps2-an500
MPU_TYPE = 0x00001000
HardFault HFSR = 0x40000000
  CFSR = 0x00000011
### mpu-fixed.elf on mps2-an500
MPU_TYPE = 0x00001000
MPU enabled
RASR = 0x030C001F
dma_buf[0] = 0x00001234
```

이전 코드는 `MPU->CTRL`을 쓰자마자 instruction fetch가 막혀 CFSR에 IACCVIOL(bit 0)과 MSTKERR(bit 4)가 남고, HFSR의 FORCED(bit 30)가 켜진 HardFault로 끝납니다. 고친 코드는 RASR이 TEX=1·S·AP=3·SIZE=15·ENABLE(0x030C001F)로 읽히고 buffer 접근도 정상입니다. `MPU_TYPE`의 DREGION 0x10은 이 모델의 region이 16개라는 뜻으로, Arm Cortex-M Comparison Table의 M7 최대값과 같습니다.

## 코드 / 실제 사용 예

STM32F407용 linker script의 메모리 정의입니다. 주소와 크기는 2절 표의 `stm32f407xx.h` 값과 같습니다.

```text
MEMORY
{
    FLASH (rx)  : ORIGIN = 0x08000000, LENGTH = 1024K
    SRAM1 (rwx) : ORIGIN = 0x20000000, LENGTH = 112K
    SRAM2 (rwx) : ORIGIN = 0x2001C000, LENGTH = 16K
    CCM   (rwx) : ORIGIN = 0x10000000, LENGTH = 64K   /* core coupled memory */
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

CCM은 `stm32f407xx.h`가 "core coupled memory"라고 부르는 별도 64 KB 영역이고, 주소가 Code 영역(0x10000000)에 있어 bit-band alias 범위 밖입니다. CCM에 DMA buffer를 둘 수 있는지는 RM0090의 bus matrix 설명으로 확인해야 하고, 이 글에서는 RM0090 원문을 대조하지 않아 판단하지 않았습니다. linker script의 `.data`·`.bss` 배치와 `AT >`의 의미는 [3-04 링커 스크립트 기초](/blog/embedded/modern-recipes/part3-04-linker-script-basics)에서 다룹니다.

## 측정 / 비교

이 글에서 잰 것은 위의 codegen과 QEMU 실행 결과입니다. 정리하면 다음과 같습니다.

| 확인 항목 | 결과 | 환경 |
| --- | --- | --- |
| 두 byte store (Normal 데이터) | `strh` 하나로 병합 | gcc 16.2.0 `-O2` |
| 같은 레지스터 두 번 쓰기, `volatile` 없음 | 첫 쓰기 삭제 | gcc 16.2.0 `-O2` |
| 같은 레지스터 두 번 쓰기, `volatile` | `str` 두 번 | gcc 16.2.0 `-O2` |
| SRAM bit-band alias 쓰기 | 원 word의 해당 bit만 변경 | QEMU `mps2-an386` |
| TEX=0 C=0 B=1 + PRIVDEFENA 없이 MPU enable | 즉시 HardFault (FORCED) | QEMU `mps2-an500` |
| TEX=1 C=0 B=0 + PRIVDEFENA | 정상 접근 | QEMU `mps2-an500` |

영역별 접근 cycle은 QEMU로 잴 수 없고, STM32F407 데이터시트·RM0090 값을 대조하지 않아 싣지 않았습니다.

## 자주 보는 함정

> ⚠️ DMA buffer를 cached 영역에 그대로 둠

Table B3-1에서 SRAM 영역의 기본값은 Normal WBWA입니다. Cortex-M7처럼 data cache가 있는 코어에서 이 기본값을 그대로 쓰면, DMA가 메모리에 쓴 값을 CPU가 cache에 남은 옛 값으로 읽을 수 있습니다. 5절처럼 MPU로 non-cacheable region을 만들거나, DMA 전후에 CMSIS의 `SCB_CleanDCache_by_Addr()`·`SCB_InvalidateDCache_by_Addr()`를 부릅니다. 자세한 순서는 [2-06 ARM 캐시](/blog/embedded/modern-recipes/part2-06-arm-cache)에서 다룹니다.

> ⚠️ Peripheral 접근에 `volatile`을 빠뜨림

Peripheral 영역이 Device 타입이라도 컴파일러는 그 사실을 모릅니다. 3절의 `send_plain`처럼 `volatile`이 없으면 쓰기 자체가 사라집니다. CMSIS 헤더의 `__IO`/`__IOM` 구조체로 접근합니다.

> ⚠️ MPU를 켤 때 PRIVDEFENA와 AP를 빠뜨림

5절의 실행처럼 region 하나만 정의하고 PRIVDEFENA 없이 MPU를 켜면 그 즉시 코드 fetch가 막힙니다. background region이 필요 없는 설계라면 코드·stack·peripheral region을 모두 먼저 정의한 뒤 enable합니다.

> ⚠️ Stack을 .bss 바로 위에 둠

stack이 아래로 자라다 넘치면 바로 아래의 `.bss`·`.data`를 덮어써 증상이 엉뚱한 변수에서 나타납니다. stack을 RAM 끝에 두고, MPU region으로 stack 아래에 접근 금지 영역을 만들면 넘치는 순간 MemManage fault로 잡힙니다.

> ⚠️ Cortex-M7으로 bit-band 코드를 그대로 옮김

M7 TRM은 bit-banding에 의존하지 않는 코드만 M3/M4와 호환된다고 적습니다. QEMU `mps2-an500`은 bit-band를 에뮬레이션하므로 에뮬레이터 테스트로는 이 문제를 잡을 수 없습니다.

> ⚠️ 0x00000000 alias 주소로 link

0x00000000에 보이는 내용은 remap 설정(`SYSCFG->MEMRMP`)에 따라 Flash, System Flash, SRAM, FSMC로 바뀝니다. linker script는 실제 주소(Flash 0x08000000)를 씁니다.

## 정리

- ARMv7-M ARM Table B3-1이 Code·SRAM·Peripheral·RAM·Device·System 영역과 기본 attribute(Normal WT/WBWA, Device, Strongly-ordered, XN)를 정합니다.
- 메모리 타입은 CPU 접근 순서를, `volatile`은 컴파일러의 접근 삭제·병합을 막습니다. 둘은 서로를 대신하지 못합니다.
- Bit-band는 M3/M4의 SRAM·Peripheral 하위 1 MB에만 있고, M7 TRM은 bit-band 의존 코드를 호환 범위에서 뺍니다.
- MPU로 Normal non-cacheable을 만들 때는 TEX=001 C=0 B=0이고, PRIVDEFENA와 AP를 함께 설정해야 enable 직후 fault가 나지 않습니다.
- Linker script는 `stm32f407xx.h`가 정의한 실제 주소를 기준으로 영역을 정의합니다.

다음 편에서는 **ARM 캐시 (L1/L2)**를 다룹니다. Cortex-M7과 Cortex-A의 cache 관리입니다.

## 관련 항목

- [2-04: Cortex-M 예외 처리](/blog/embedded/modern-recipes/part2-04-cortex-m-exceptions)
- [2-06: ARM 캐시 (L1/L2)](/blog/embedded/modern-recipes/part2-06-arm-cache)
- [2-07: MPU 활용](/blog/embedded/modern-recipes/part2-07-arm-mpu)
- [3-04: 링커 스크립트 기초](/blog/embedded/modern-recipes/part3-04-linker-script-basics)
