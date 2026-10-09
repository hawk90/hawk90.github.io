---
title: "ARM Memory Barrier 실전 — DMB·DSB·ISB·DMA·MMIO"
slug: "embedded/modern-recipes/part2-10-memory-barrier"
date: 2026-04-11T09:22:00
description: "ARM memory barrier 실전. DMB/DSB/ISB 사용 시점. DMA·MMIO·self-modifying code."
series: "Modern Embedded Recipes"
seriesOrder: 22
tags: [recipes, memory-barrier, dmb, dsb, isb, dma]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> **"DMB는 memory ordering, DSB는 이전 명령·memory access의 완료 대기, ISB는 instruction stream 동기화"**입니다. 정확한 선택은 access 종류와 architecture 상태 변경 여부에 따라 달라집니다.

## 3 가지 Barrier

| Barrier | 의미 | Cycle 비용 |
|---|---|---|
| **DMB** | 이전·이후 memory access의 관찰 순서를 제어 | 구현·memory system에 따라 상이 |
| **DSB** | 이전 명령과 명시적 memory access가 완료될 때까지 동기화 | 구현·memory system에 따라 상이 |
| **ISB** | instruction stream을 동기화하고 이후 명령을 다시 fetch | 구현·pipeline에 따라 상이 |

## DMB — Data Memory Ordering

```c
shared_data = compute();
__DMB();
flag = 1;   /* shared_data write가 flag write *전*에 가시 */
```

적절한 atomic release/acquire 연산과 결합하면 memory ordering을 구성할 수 있지만, DMB 하나가 C/C++ atomic 연산을 대체하지는 않습니다.

### 언제 DMB 필요?

- Lock-free queue producer/consumer
- ISR↔task shared variable
- SMP cross-core data sharing
- Atomic 명령 사이

### 예 — ISR↔Task

```c
volatile uint32_t data;
volatile bool ready;

/* ISR */
data = sample;
__DMB();   /* data write가 ready 변경 전 가시 보장 */
ready = true;

/* Task */
while (!ready);
__DMB();   /* ready read 후 data read */
process(data);
```

## DSB — Sync (강한 fence)

```c
/* Clock 활성화 후 register access */
RCC->APB1ENR |= RCC_APB1ENR_TIM2EN;
__DSB();   /* clock enable 완료 대기 */
TIM2->CR1 = 1;   /* safe */
```

DSB는 이전 명령의 효과와 명시된 memory access가 필요한 시점까지 완료되도록 동기화합니다. 단순히 DMB보다 “더 강한 데이터 fence”라고만 이해하지 말고 Arm의 access·completion 정의를 확인해야 합니다.

### 언제 DSB?

- Clock·power configuration 후
- MPU·MMU 설정 변경 후
- DMA setup 전 (buffer flush 보장)
- WFI·WFE 전 (state save 완료)

### 예 — DMA Start

```c
fill_buffer(tx_buf, len);
SCB_CleanDCache_by_Addr(tx_buf, len); /* cacheable buffer라면 먼저 clean */
__DSB();   /* memory access 완료 순서 동기화 */
DMA->CR = DMA_START;   /* DMA가 fresh data 봄 */
```

## ISB — Pipeline Flush

```c
/* Self-modifying code */
flash_write(addr, new_code);
SCB_CleanDCache_by_Addr(addr, size);
SCB_InvalidateICache_by_Addr(addr, size);
__DSB(); __ISB();   /* pipeline 안 *옛 명령* 클리어 */
call((void*)addr);
```

ISB는 *fetched instructions 폐기 + refetch*를 수행합니다. CPU state·MPU·VFP 활성화 후 필수입니다.

### 언제 ISB?

- Self-modifying code (FW update, JIT)
- CONTROL register 변경 (privileged mode 전환)
- MPU 활성화·변경 후
- FPU 활성화 후 (CPACR write)

### 예 — FPU 활성화

```c
SCB->CPACR |= (0xF << 20);   /* FPU enable */
__DSB(); __ISB();   /* settle + pipeline flush */

float x = compute_fp();   /* safe */
```

## DMB Variant (ARMv8)

```c
__DMB();         /* full system — slowest */
__DMB_ISH();     /* Inner Shareable — SMP cluster 안 */
__DMB_NSH();     /* Non-shareable — same CPU */
__DMB_OSH();     /* Outer Shareable — across clusters */
```

좁은 scope일수록 *더 빠릅니다*. SMP cluster 내 sync는 *ISH*로 충분합니다.

```c
/* Linux smp_mb() = DMB ISH */
smp_mb();
```

## Cortex-M Single Core — Barrier 적은 사용

**Cortex-M3/M4:**

- Pipeline in-order
- No store buffer reorder for same address
- Single core — no SMP sync

**DMB 필요 케이스:**

- MMIO·DMA 와의 ordering
- Atomic 명령 (LDREX/STREX) 후
- Self-modifying code (DSB + ISB)

Single core에서도 ISR·DMA·MMIO ordering이 있으면 barrier가 필요할 수 있습니다. `volatile`만으로 lock-free 동기화의 원자성·ordering이 보장되는 것은 아닙니다.

## Cortex-A SMP — Barrier 필수

```c
/* SMP — DMB ISH 또는 LDAR/STLR */

/* C11 atomic — 자동 처리 */
atomic_store_explicit(&head, next, memory_order_release);
                                   /* → STLR */
```

ARMv8은 *acquire/release 단일 명령*(LDAR/STLR)을 제공합니다. 그래서 DMB 수동 사용이 줄어듭니다.

## Lock-Free Queue with Barriers

```c
/* C 명시 barrier 버전 */
bool push(ring_t *r, uint8_t b) {
    uint16_t h = r->head;
    uint16_t next = (h + 1) & MASK;
    if (next == r->tail) return false;
    
    r->buf[h] = b;
    __DMB();   /* buf write 후 head update — release */
    r->head = next;
    return true;
}

bool pop(ring_t *r, uint8_t *out) {
    uint16_t t = r->tail;
    if (t == r->head) return false;
    
    __DMB();   /* head check 후 buf read — acquire */
    *out = r->buf[t];
    r->tail = (t + 1) & MASK;
    return true;
}
```

`atomic_store/load` 사용을 권장합니다. 컴파일러가 *효율적 명령*을 선택해 줍니다.

## DMA + Cache Maintenance

```c
/* TX path */
fill_data(buf, len);
SCB_CleanDCache_by_Addr(buf, len);   /* cache → memory */
__DSB();
DMA_start(buf, len);

/* RX path */
DMA_start(buf, len);
/* DMA writes memory */
wait_dma_done();
SCB_InvalidateDCache_by_Addr(buf, len);   /* cache stale data 폐기 */
__DSB();
read_data(buf);
```

Cortex-M7 D-cache + DMA는 *coherent하지 않습니다*. 명시적 maintenance가 필요합니다.

## Self-Modifying Code — FW Update

```c
void flash_write_and_jump(uint32_t addr, uint8_t *code, size_t len) {
    /* 1. Write to flash */
    flash_unlock();
    flash_erase(addr);
    for (size_t i = 0; i < len; i += 4) {
        flash_program_word(addr + i, *(uint32_t*)(code + i));
    }
    flash_lock();
    
    /* 2. Cache maintenance */
    SCB_CleanInvalidateDCache_by_Addr((uint32_t*)addr, len);
    SCB_InvalidateICache_by_Addr((uint32_t*)addr, len);
    
    /* 3. Barriers */
    __DSB();
    __ISB();
    
    /* 4. Jump */
    ((void(*)())(addr | 1))();
}
```

전체 흐름은 5 단계입니다. write + D-cache flush + I-cache invalidate + DSB + ISB + jump.

## STM32 Bootloader — Vector Table 변경

```c
SCB->VTOR = NEW_VECTOR_BASE;
__DSB();   /* settle */
__ISB();   /* pipeline flush */
/* 이제 IRQ가 새 vector 사용 */
```

VTOR 변경 후 *DSB+ISB가 없으면* 다음 IRQ가 *옛 vector*를 사용해 crash가 발생합니다.

## Multi-Core Wakeup

```c
/* Core 0 — boot core 1 */
core1_entry_addr = (uint32_t)core1_main;
__DSB();   /* entry addr write 완료 */
core1_wake();   /* core 1 reset release */

/* Core 1 — reset handler */
void core1_reset(void) {
    while (core1_entry_addr == 0);   /* wait */
    __DMB();   /* read complete */
    ((void(*)())core1_entry_addr)();
}
```

Cortex-A multi-core boot의 표준 패턴입니다.

## 자주 하는 실수

> ⚠️ DSB·ISB가 필요한 곳에 DMB만 사용합니다

```c
SCB->VTOR = new_addr;
__DMB();   /* ← 부족 — DSB·ISB 필요 */
```

→ system register에는 DSB+ISB를 사용합니다.

> ⚠️ Barrier 위치를 잘못 잡습니다

```c
flag = 1;
__DMB();   /* ← 너무 늦음 — flag가 이미 가시화 */
data = compute();
```

→ data write 후, *flag write 전*에 DMB를 배치합니다.

> ⚠️ 모든 atomic에 manual barrier를 답니다

```c
atomic_store(&x, 1);
__DMB();   /* ← atomic 자체가 acquire/release — 중복 */
```

→ C11 atomic만 신뢰합니다.

> ⚠️ Cortex-M에서 DMB ISH를 씁니다

```c
__DMB_ISH();   /* ← Cortex-M에는 share domain 개념 없음 */
```

→ Cortex-M에서는 단일 `__DMB()`만 씁니다. Variant는 Cortex-A 전용입니다.

## 정리

- **DMB**는 data ordering, **DSB**는 거기에 sync를 더한 것, **ISB**는 pipeline flush입니다.
- Cortex-M single core에서는 *MMIO·DMA·atomic*에만 씁니다.
- SMP Cortex-A에서는 *acquire/release pair*가 필수입니다.
- DMA TX에서는 clean + DSB, RX에서는 invalidate + DSB를 씁니다.
- Self-modifying에는 D/I cache maintenance + DSB + ISB를 모두 적용합니다.
- C11 `atomic_*` + `memory_order_*`를 쓰면 컴파일러가 *최적 barrier를 선택*해 줍니다.

다음 편은 **Wait-Free**입니다.

## 관련 항목

- [2-03: Priority Inversion](/blog/embedded/modern-recipes/part6-10-priority-inversion)
- [2-05: Wait-Free](/blog/embedded/modern-recipes/part9-02-wait-free)
