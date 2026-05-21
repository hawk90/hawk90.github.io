---
title: "3-07: MMIO 접근 - Cache Policy·Write-Combining·Volatile·Barrier"
date: 2026-05-08T06:00:00
description: "MMIO uncached strongly-ordered. Write-combining for PCIe BAR. Volatile, DMB·DSB·ISB."
series: "Embedded Performance Engineering"
seriesOrder: 25
tags: [mmio, register, cache-policy, volatile, barrier]
draft: false
---

## 한 줄 요약

> **"MMIO는 peripheral register를 메모리처럼 다루는 방식입니다."** 다만 cache와 reorder는 *금지*입니다.

## MMIO Cache Policy

ARM v7/v8 Memory Type:

| Type | Cache | Order | Speculation | 사용 |
|---|---|---|---|---|
| **Normal (cacheable)** | yes | weak | yes | DRAM |
| **Normal (non-cacheable)** | no | weak | yes | DMA buffer |
| **Device** (nGnRnE) | no | strict | no | MMIO register |
| **Device** (nGnRE) | no | strict | early-write OK | MMIO 일부 |
| **Strongly-Ordered** | no | very strict | no | critical config |

**nGnRnE**는 no Gather, no Reorder, no Early Write의 약자입니다.

MMIO는 보통 **Device-nGnRE**를 씁니다. Read는 *cache와 prefetch가 없고*, write는 *순서가 보장*됩니다.

## Linux ioremap

```c
void __iomem *mmio = ioremap(0xC0000000, 0x1000);
                              /* phys */ /* size */
/* Returns virtual address mapped to Device-nGnRnE */
iowrite32(0x12345678, mmio + 0x10);
val = ioread32(mmio + 0x20);
iounmap(mmio);
```

`ioremap`은 MMIO mapping을 만듭니다. `ioremap_wc`는 write-combining 매핑이며 PCIe BAR 등에 씁니다.

## Write-Combining

**일반 MMIO write:**

- 매 store → 즉시 transaction
- → 32 × 4-byte write = 32 transaction

**Write-combining:**

- store buffer가 *근접 주소 합침*
- → 32 × 4-byte → 4 × 32-byte burst transaction

PCIe BAR에서 GPU framebuffer 같은 *큰 sequential write*를 할 때 *bandwidth가 8배*로 늘어납니다.

```c
mmio = ioremap_wc(phys, size);   // Write-combining
```

## Volatile - 컴파일러 차단

```c
/* 잘못된 예 - 컴파일러가 두 read 중 하나를 제거할 수 있습니다 */
uint32_t *reg = (uint32_t*)0x40000000;
uint32_t a = *reg;
uint32_t b = *reg;   // 같은 주소여서 컴파일러가 변수에 *cache*합니다

/* Good */
volatile uint32_t *reg = (uint32_t*)0x40000000;
uint32_t a = *reg;
uint32_t b = *reg;   // 두 번 read가 보장됩니다
```

`volatile`은 *컴파일러 최적화만 차단*합니다. CPU의 OoO 실행이나 write buffer에는 영향이 *없으므로* barrier가 별도로 필요합니다.

## ARM Memory Barrier

```c
__DMB();   // Data Memory Barrier - memory access 순서 보장
__DSB();   // Data Synchronization Barrier - 모든 memory access 완료 대기
__ISB();   // Instruction Synchronization Barrier - pipeline flush
```

### 언제 어떤 barrier?

```c
/* Peripheral 활성화 후 사용 */
RCC->APB1ENR |= RCC_APB1ENR_TIM2EN;
__DSB();   // clock enable 완료를 기다립니다
TIM2->CR1 = 1;   // 이제 안전합니다

/* Self-modifying code */
flash_write(code_buf);
__DSB(); __ISB();   // cache flush와 pipeline refill
call_new_code();

/* DMA 시작 전 cache flush */
SCB_CleanDCache_by_Addr(buf, len);
__DSB();
HAL_DMA_Start(...);
```

## Read-Modify-Write Race

```c
GPIO->ODR |= (1 << 5);   // read + OR + write
```

ARM 명령으로:

```asm
ldr r0, [r1]    ; read
orr r0, #0x20   ; modify
str r0, [r1]    ; write
```

ISR이 중간에 *다른 bit를 바꿔도* ISR의 변경이 사라집니다.

해결 방법은 다음과 같습니다.
- **Atomic set/clear register** (ARM Cortex-M bit-band)
- **BSRR (Bit Set/Reset Register)** - STM32 GPIO

```c
GPIO->BSRR = (1 << 5);          // atomic set
GPIO->BSRR = (1 << 5) << 16;    // atomic reset
```

## Bit-Banding (Cortex-M3·M4)

```text
SRAM bit-band region: 0x20000000 - 0x200FFFFF
Alias region:         0x22000000 - 0x23FFFFFF

bit_addr = alias_base + (byte_offset × 32) + (bit × 4)
```

```c
#define BITBAND(addr, bit) \
    ((__IO uint32_t*)(0x22000000 + ((((uint32_t)(addr)) - 0x20000000) << 5) + ((bit) << 2)))

*BITBAND(&flag_byte, 3) = 1;   // atomic set bit 3
```

Cortex-M7부터는 *제거*되었습니다 (cache 동작이 복잡해지기 때문입니다).

## Strongly-Ordered vs Device

```c
/* GIC register, system control */
- Strongly-Ordered: 매 access 완전 직렬화 (next 시작 전 이전 완료)
- Device:           gather 안 함, reorder 안 함, but speculation 일부 OK
```

GIC와 CPU control은 Strongly-Ordered로, 일반 peripheral은 Device로 매핑합니다.

## PCIe MMIO 특수성

```c
/* Posted vs Non-posted */
- Memory write (PCIe) - posted (응답 없음, 빠름)
- Memory read         - non-posted (round-trip latency)
- Config read/write   - non-posted (sequenced)
```

PCIe MMIO write를 *flush*하려면 다음과 같이 합니다.

```c
iowrite32(val, mmio);   // posted
ioread32(mmio + STATUS);   // read로 flush
```

Read는 *post된 write가 완료된 뒤에 응답*하므로 write 효과가 보장됩니다.

## DMA와 MMIO Ordering

```c
/* 보내려는 buffer 준비 */
fill_buf(tx_buf, len);
__DSB();   // memory write 완료

/* DMA setup register */
DMA->SRC = (uint32_t)tx_buf;
DMA->LEN = len;
DMA->CR  = DMA_EN;   // start
```

DSB가 없으면 DMA가 *비어 있는 buffer*를 read할 수 있습니다.

## Word-Sized Access 강제

```c
/* 32-bit register는 8-bit access 시 잘못 동작합니다 */
volatile uint8_t *reg8 = (uint8_t*)0x40000010;
*reg8 = 0x12;   // 일부 칩은 4 byte를 한꺼번에 처리하면서 나머지를 0으로 만들어 fault
```

ARM v7에서는 *word-aligned word access만* 안전합니다. `iowrite32` / `iowrite16` / `iowrite8`로 폭을 명시해야 합니다.

## STM32 register 비트 매크로

```c
GPIO->MODER &= ~(GPIO_MODER_MODER5_Msk);   // clear
GPIO->MODER |=  (0b10 << GPIO_MODER_MODER5_Pos);   // set AF mode
```

`_Msk`는 mask, `_Pos`는 shift를 의미합니다. CMSIS 표준입니다.

## 자주 하는 실수

> ⚠️ Volatile 없이 register access

```c
*(uint32_t*)0x40000000 = 1;
/* 컴파일러가 dead store로 판단해 삭제할 수 있습니다 */
```

> ⚠️ Cache enable 잊고 빠르다고 착각

Cortex-M7에서는 *D-cache가 enable된 뒤*에는 MMIO 영역도 cacheable이 될 수 있습니다. 그러면 register read가 *stale*해집니다.

MPU로 *MMIO 영역을 non-cacheable*로 명시해야 합니다.

> ⚠️ Barrier 누락

```c
clock_enable();
peripheral_use();   // clock이 안정되기 전에 access하면 fault
```

사이에 DSB를 두어야 합니다.

> ⚠️ Bit-band region 외에 사용

```c
*BITBAND(&heap_var, 0) = 1;   // heap_var는 bit-band 영역이 아니어서 미정의 동작
```

Bit-band는 *0x20000000-0x200FFFFF*와 *0x40000000-0x400FFFFF*에서만 동작합니다.

## 정리

- MMIO는 **Device memory type**으로 매핑하며 uncached + strict order로 동작합니다.
- Linux는 **ioremap**(Device)과 **ioremap_wc**(combining)를 제공합니다.
- **volatile**은 컴파일러용, **barrier**(DMB, DSB, ISB)는 hardware용입니다.
- BSRR이나 bit-band로 *RMW race*를 회피합니다.
- DMA buffer를 준비하고 **DSB**를 거친 뒤에 start합니다.
- PCIe에서는 read로 posted write를 flush합니다.

다음 편은 **Peripheral Clock**을 다룹니다.

## 관련 항목

- [3-06: Interrupt Storm](/blog/embedded/performance-engineering/part3-06-interrupt-storm)
- [3-08: Peripheral Clock](/blog/embedded/performance-engineering/part3-08-peripheral-clock)
