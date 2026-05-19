---
title: "3-07: MMIO 접근 — Cache Policy·Write-Combining·Volatile·Barrier"
date: 2026-05-08T06:00:00
description: "MMIO uncached strongly-ordered. Write-combining for PCIe BAR. Volatile, DMB·DSB·ISB."
series: "Embedded Performance Engineering"
seriesOrder: 25
tags: [mmio, register, cache-policy, volatile, barrier]
draft: true
---

## 한 줄 요약

> **"MMIO = peripheral register를 메모리처럼"** — 그러나 cache·reorder *금지*.

## MMIO Cache Policy

ARM v7/v8 Memory Type:

| Type | Cache | Order | Speculation | 사용 |
|---|---|---|---|---|
| **Normal (cacheable)** | yes | weak | yes | DRAM |
| **Normal (non-cacheable)** | no | weak | yes | DMA buffer |
| **Device** (nGnRnE) | no | strict | no | MMIO register |
| **Device** (nGnRE) | no | strict | early-write OK | MMIO 일부 |
| **Strongly-Ordered** | no | very strict | no | critical config |

**nGnRnE** = no Gather, no Reorder, no Early Write.

MMIO는 보통 **Device-nGnRE**. Read는 *cache·prefetch 없음*, write는 *순서 보장*.

## Linux ioremap

```c
void __iomem *mmio = ioremap(0xC0000000, 0x1000);
                              /* phys */ /* size */
/* Returns virtual address mapped to Device-nGnRnE */
iowrite32(0x12345678, mmio + 0x10);
val = ioread32(mmio + 0x20);
iounmap(mmio);
```

`ioremap` = MMIO mapping. `ioremap_wc` = write-combining (PCIe BAR 등).

## Write-Combining

```text
일반 MMIO write:
  매 store → 즉시 transaction
  → 32 × 4-byte write = 32 transaction

Write-combining:
  store buffer가 *근접 주소 합침*
  → 32 × 4-byte → 4 × 32-byte burst transaction
```

PCIe BAR — GPU framebuffer 등 *큰 sequential write* 시 *bandwidth 8x*.

```c
mmio = ioremap_wc(phys, size);   // Write-combining
```

## Volatile — 컴파일러 차단

```c
/* 잘못 — 컴파일러가 두 read 중 하나 제거 */
uint32_t *reg = (uint32_t*)0x40000000;
uint32_t a = *reg;
uint32_t b = *reg;   // ← 같은 주소 → 컴파일러 *cache* (변수에)

/* Good */
volatile uint32_t *reg = (uint32_t*)0x40000000;
uint32_t a = *reg;
uint32_t b = *reg;   // ← 두 번 read 보장
```

`volatile`은 *컴파일러 최적화 차단*. CPU OoO·write buffer엔 영향 *없음* → barrier 별도 필요.

## ARM Memory Barrier

```c
__DMB();   // Data Memory Barrier — memory access 순서 보장
__DSB();   // Data Synchronization Barrier — 모든 memory access 완료 대기
__ISB();   // Instruction Synchronization Barrier — pipeline flush
```

### 언제 어떤 barrier?

```c
/* Peripheral 활성화 후 사용 */
RCC->APB1ENR |= RCC_APB1ENR_TIM2EN;
__DSB();   // ← clock enable 완료 대기
TIM2->CR1 = 1;   // 이제 안전

/* Self-modifying code */
flash_write(code_buf);
__DSB(); __ISB();   // ← cache flush + pipeline refill
call_new_code();

/* DMA 시작 전 cache flush */
SCB_CleanDCache_by_Addr(buf, len);
__DSB();
HAL_DMA_Start(...);
```

## Read-Modify-Write Race

```c
GPIO->ODR |= (1 << 5);   // ← read + OR + write
```

ARM 명령으로:

```asm
ldr r0, [r1]    ; read
orr r0, #0x20   ; modify
str r0, [r1]    ; write
```

ISR이 중간에 *다른 bit 바꿔도* → ISR 변경 사라짐.

해결:
- **Atomic set/clear register** (ARM Cortex-M bit-band)
- **BSRR (Bit Set/Reset Register)** — STM32 GPIO

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

*BITBAND(&flag_byte, 3) = 1;   // ← atomic set bit 3
```

Cortex-M7부터 *제거됨* (cache 복잡).

## Strongly-Ordered vs Device

```c
/* GIC register, system control */
- Strongly-Ordered: 매 access 완전 직렬화 (next 시작 전 이전 완료)
- Device:           gather 안 함, reorder 안 함, but speculation 일부 OK
```

GIC·CPU control = Strongly-Ordered. 일반 peripheral = Device.

## PCIe MMIO 특수성

```c
/* Posted vs Non-posted */
- Memory write (PCIe) — posted (응답 없음, 빠름)
- Memory read         — non-posted (round-trip latency)
- Config read/write   — non-posted (sequenced)
```

PCIe MMIO write *flush* 위해:

```c
iowrite32(val, mmio);   // posted
ioread32(mmio + STATUS);   // ← read flush
```

Read는 *post된 write 완료 후 응답* → write 효과 보장.

## DMA · MMIO Ordering

```c
/* 보내려는 buffer 준비 */
fill_buf(tx_buf, len);
__DSB();   // memory write 완료

/* DMA setup register */
DMA->SRC = (uint32_t)tx_buf;
DMA->LEN = len;
DMA->CR  = DMA_EN;   // start
```

DSB 없으면 — DMA가 *empty buffer* read 가능.

## Word-Sized Access 강제

```c
/* 32-bit register — 8-bit access 시 wrong */
volatile uint8_t *reg8 = (uint8_t*)0x40000010;
*reg8 = 0x12;   // ← 일부 칩은 4 byte 한꺼번에 처리, 나머지 0 → fault
```

ARM v7 — *word-aligned word access만* 안전. `iowrite32` / `iowrite16` / `iowrite8` 명시.

## STM32 register 비트 매크로

```c
GPIO->MODER &= ~(GPIO_MODER_MODER5_Msk);   // clear
GPIO->MODER |=  (0b10 << GPIO_MODER_MODER5_Pos);   // set AF mode
```

`_Msk` mask, `_Pos` shift. CMSIS 표준.

## 자주 하는 실수

> ⚠️ Volatile 없이 register access

```c
*(uint32_t*)0x40000000 = 1;
/* 컴파일러가 dead store로 판단 → 삭제 가능 */
```

> ⚠️ Cache enable 잊고 빠르다고 착각

Cortex-M7 — *D-cache enable 후* MMIO 영역도 cacheable 가능 → register read가 *stale*.

→ MPU로 *MMIO 영역 non-cacheable* 명시.

> ⚠️ Barrier 누락

```c
clock_enable();
peripheral_use();   // ← clock 안정 전에 access → fault
```

DSB 사이에 둠.

> ⚠️ Bit-band region 외에 사용

```c
*BITBAND(&heap_var, 0) = 1;   // ← heap_var는 bit-band 영역 아님 → 미정의
```

Bit-band는 *0x20000000-0x200FFFFF + 0x40000000-0x400FFFFF*만.

## 정리

- MMIO = **Device memory type** — uncached, strict order.
- Linux **ioremap** (Device) / **ioremap_wc** (combining).
- **volatile**은 컴파일러용, **barrier** (DMB·DSB·ISB)는 hardware용.
- BSRR·bit-band으로 *RMW race* 회피.
- DMA buffer prep → **DSB** → start.
- PCIe — read로 posted write flush.

다음 편은 **Peripheral Clock**.

## 관련 항목

- [3-06: Interrupt Storm](/blog/embedded/performance-engineering/part3-06-interrupt-storm)
- [3-08: Peripheral Clock](/blog/embedded/performance-engineering/part3-08-peripheral-clock)
