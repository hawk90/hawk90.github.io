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

> **"DMB는 memory access의 관찰 순서, DSB는 앞선 access의 완료, ISB는 그 뒤 명령을 다시 가져오는 것"**입니다. Cortex-M에서는 Arm AN321이 상황마다 어떤 barrier가 아키텍처상 필요한지, 그리고 M0+/M3/M4 구현에서는 무엇을 생략해도 되는지를 나눠 적어 둡니다.

이 글의 정의는 ARMv7-M Architecture Reference Manual(DDI 0403E.e)과 Arm *Application Note 321: ARM Cortex-M Programming Guide to Memory Barrier Instructions*(DAI 0321A, 2012, 이하 AN321), Armv8-A 쪽은 Arm *Learn the architecture - Memory Systems, Ordering, and Barriers*(102336, 1.1)에서 옮겼습니다. 코드 생성 결과는 arm-none-eabi-gcc 16.2.0(CMSIS 5.9.0)과 Debian 13 arm64 guest의 GCC 14.2.0에서 직접 뽑았습니다.

## 3 가지 Barrier

| Barrier | 의미 (ARMv7-M ARM, 102336) |
|---|---|
| **DMB** | DMB 앞의 explicit memory access가 뒤의 access보다 먼저 관찰되게 함. 다른 명령의 순서에는 영향 없음 |
| **DSB** | 앞선 explicit memory access가 완료될 때까지 뒤의 명령을 진행하지 않음 |
| **ISB** | pipeline을 비우고 뒤의 명령을 다시 fetch해, 앞에서 바꾼 context(CONTROL, MPU 등)가 적용된 상태로 실행 |

ARMv7-M ARM A7.7.33은 DMB를 "all explicit memory accesses that appear in program order before the DMB instruction are observed before any explicit memory accesses that appear in program order after the DMB instruction"으로 정의하고, "It does not affect the ordering of any other instructions"라고 덧붙입니다. 편지에 비유하면 DMB는 "앞 편지가 먼저 도착하게 순서만 맞춰라", DSB는 "앞 편지가 도착했다는 확인을 받고 다음 일을 해라", ISB는 "지금까지 읽어 둔 지시서를 버리고 새로 읽어라"입니다.

CMSIS의 `__DMB()`·`__DSB()`·`__ISB()`가 실제로 무엇으로 컴파일되는지 봅니다.

```c
void barriers(void) { __DMB(); __DSB(); __ISB(); }
```

```text
barriers:
	dmb 0xF
	dsb 0xF
	isb 0xF
	bx	lr
```

옵션 0xF는 SY(full system)입니다. ARMv7-M ARM은 DMB의 option으로 SY만 정의하고, 나머지 encoding은 "reserved ... execute as system (SY) DMB operations, but software must not rely on this behavior"라고 적습니다.

## DMB — Data Memory Ordering

```c
shared_data = compute();
__DMB();
flag = 1;   /* shared_data write가 flag write *전*에 관찰됨 */
```

DMB는 순서만 정합니다. 읽기-수정-쓰기의 원자성은 주지 않으므로, 여러 주체가 같은 변수를 바꾸면 C11 atomic이나 LDREX/STREX가 따로 필요합니다.

### 언제 DMB 필요?

AN321은 Cortex-M에서 다음을 구분합니다.

- **같은 device(peripheral)에 대한 연속 접근.** 아키텍처상 프로그램 순서가 지켜지므로 barrier가 필요 없습니다(4.2절).
- **서로 다른 device 사이의 순서가 결과에 영향을 줄 때.** 아키텍처상 barrier가 필요합니다. bus 경로마다 지연이 다를 수 있기 때문입니다. 다만 AN321은 "Cortex-M processors do not re-order data transfers"라서 구현상으로는 필요 없다고 적습니다(4.2절).
- **semaphore·mutex.** lock을 잡은 뒤와 풀기 전에 DMB를 씁니다(4.19절).
- **multi-master(DMA 등) 시스템.** 다른 bus master가 보는 순서를 맞출 때입니다(4.18절).

### 예 — ISR↔Task

```c
volatile uint32_t data;
volatile bool ready;

/* ISR */
data = sample;
__DMB();   /* data write가 ready 변경 전 관찰됨 */
ready = true;

/* Task */
while (!ready);
__DMB();   /* ready read 후 data read */
process(data);
```

단일 Cortex-M 코어에서 ISR과 task는 같은 코어에서 돌기 때문에, AN321 4.2절의 구현 설명대로라면 이 DMB가 없어도 순서는 지켜집니다. 그래도 이 코드를 멀티코어나 DMA와 공유하는 구조로 옮길 때 그대로 맞도록 아키텍처 규칙을 따라 두는 것이 AN321의 권고("ARM recommends that the architectural requirements are adopted")입니다.

## DSB — 완료 대기

```c
/* Clock 활성화 후 register access */
RCC->APB1ENR |= RCC_APB1ENR_TIM2EN;
__DSB();   /* clock enable write 완료 대기 */
TIM2->CR1 = 1;
```

### 언제 DSB?

- **WFI·WFE 전.** AN321 4.14절은 "Architecturally, you should use the DSB instruction before executing the WFI or WFE instructions"라고 적습니다.
- **MPU 설정 뒤.** AN321 4.17절은 MPU 설정 전에 DMB, 끝난 뒤 DSB를 쓰고, 설정 변경이 프로그램 실행에 영향을 주면 ISB도 더하라고 적습니다.
- **VTOR 변경 뒤 즉시 예외를 받을 때.** AN321 4.11절은 아키텍처상 "a DSB instruction should be used after changing the VTOR if an exception is to be generated immediately"라고 하면서, Cortex-M3·M4·M0+는 SCS 접근이 DSB처럼 동작해 구현상으로는 필요 없다고 적습니다.
- **DMA 시작 전.** DMA가 읽을 buffer write가 끝난 뒤에 DMA를 시작해야 합니다. cache가 있는 Cortex-M7이면 그 전에 clean도 필요합니다([2-06](/blog/embedded/modern-recipes/part2-06-arm-cache)).

### 예 — DMA Start

```c
fill_buffer(tx_buf, len);
SCB_CleanDCache_by_Addr(tx_buf, len); /* cacheable buffer라면 먼저 clean */
__DSB();   /* buffer write 완료 */
DMA->CR = DMA_START;
```

## ISB — Pipeline Flush

```c
/* Self-modifying code */
flash_write(addr, new_code);
SCB_CleanDCache_by_Addr(addr, size);
SCB_InvalidateICache_by_Addr(addr, size);
__DSB(); __ISB();   /* 이미 fetch한 옛 명령 폐기 */
call((void*)addr);
```

AN321 4.20절은 프로그램 메모리를 바꾼 뒤의 아키텍처 요구를 "a DSB instruction followed by an ISB instruction"으로 정하고, 예제에 "DSB ; Ensure store is completed before flushing pipeline", "ISB ; Flush pipeline"을 둡니다.

### 언제 ISB?

- **CONTROL 변경 뒤.** AN321 4.16절: "Architecturally, after programming the CONTROL register, an ISB instruction should be used." 그래야 뒤의 명령이 새 privilege로 fetch됩니다.
- **MPU 설정이 실행 중인 코드에 영향을 줄 때**(4.17절).
- **프로그램 메모리 변경 뒤**(4.20절).
- **FPU 활성화(CPACR write) 뒤.** Cortex-M4 Devices Generic User Guide(DUI 0553A) 4.6.6절의 FPU enable 예제가 CPACR write 뒤에 DSB·ISB를 둡니다.

### 예 — FPU 활성화

```c
SCB->CPACR |= (0xF << 20);   /* CP10, CP11 full access */
__DSB(); __ISB();

float x = compute_fp();
```

## DMB 범위 옵션 (Armv8-A)

Armv8-A의 DMB·DSB는 어떤 access를 어느 범위의 관찰자에게 정렬할지 인자로 고릅니다. 102336의 인자 표에는 `SY`(any-any, full system), `ST`(store-store), `LD`(load-load·load-store), `OSH`(outer shareable) 등이 있고, AArch64에서는 인자를 반드시 명시해야 한다고 적습니다. `ISH`(inner shareable)·`NS`(non-shareable) 같은 shareability 인자도 같은 절에 나옵니다. 범위를 좁히면 "micro-architecture optimizations that could reduce some of the performance impacts"가 가능하다는 것이 이 가이드의 설명이고, 얼마나 빨라지는지는 적지 않습니다. 102336의 예제는 DMB가 없을 때 두 `STR`이 순서를 바꿔 관찰될 수 있고("Might be observed before the previous STR"), DMB를 넣으면 "Cannot observe this STR without first observing the previous STR"이 된다고 보입니다.

Linux arm64는 SMP barrier를 이 옵션으로 정의합니다. v6.12 `arch/arm64/include/asm/barrier.h`는 `__smp_mb()`를 `dmb(ish)`, `__smp_rmb()`를 `dmb(ishld)`, `__smp_wmb()`를 `dmb(ishst)`로 둡니다.

CMSIS에는 `__DMB_ISH()` 같은 함수가 없습니다. CMSIS_5 5.9.0과 CMSIS_6에 그런 이름이 없고, 쓰면 컴파일이 실패합니다.

```text
ish.c:2:16: error: implicit declaration of function '__DMB_ISH' [-Wimplicit-function-declaration]
```

## Cortex-M Single Core

AN321의 구현 설명을 요약하면, Cortex-M0/M0+/M3/M4는 data transfer 순서를 바꾸지 않고(4.2절), SCS 접근은 DSB처럼 동작합니다(4.11절). 그래서 이 코어들에서 아키텍처 규칙상 필요한 barrier 일부는 실제로 없어도 동작합니다. 그러나 AN321은 매 절마다 "ARM recommends that the architectural requirements are adopted"라고 적어, 이식성을 위해 아키텍처 규칙을 따르라고 권합니다.

`volatile`은 컴파일러가 접근을 없애거나 합치지 못하게 할 뿐이고([2-05](/blog/embedded/modern-recipes/part2-05-arm-memory-map) 3절), 읽기-수정-쓰기를 원자적으로 만들지 않습니다.

## Cortex-A SMP — acquire/release

Armv8-A는 102336이 "weakly-ordered memory architecture"라고 부르는 모델입니다. 의존성이 없는 access는 프로그램 순서와 다르게 관찰될 수 있습니다. 그래서 SMP에서 공유 데이터를 넘길 때는 barrier나 acquire/release가 필요합니다.

C11 atomic을 쓰면 컴파일러가 명령을 고릅니다. 같은 코드를 두 타깃으로 컴파일하면 다음과 같습니다.

```c
_Atomic uint32_t head;
void publish_release(uint32_t v) { atomic_store_explicit(&head, v, memory_order_release); }
uint32_t consume_acquire(void) { return atomic_load_explicit(&head, memory_order_acquire); }
```

```text
### AArch64, gcc 14.2.0 -O2 (Debian 13 arm64)
publish_release:  ...  stlr	w0, [x1]
consume_acquire:  ...  ldar	w0, [x0]
full_fence:            dmb	ish          (atomic_thread_fence(memory_order_seq_cst))
### Cortex-M4, arm-none-eabi-gcc 16.2.0 -O2
publish_release:  ...  dmb	ish / str	r0, [r3, #8]
consume_acquire:  ...  ldr	r0, [r3, #8] / dmb	ish
```

AArch64에서는 release store가 `STLR`, acquire load가 `LDAR` 한 명령이 됩니다. Cortex-M4에는 그런 명령이 없어 GCC가 일반 `str`/`ldr` 앞뒤에 `dmb ish`를 붙입니다. ARMv7-M에서 `ish` encoding은 앞에서 본 대로 SY로 실행되는 reserved encoding입니다.

### 테스트는 순서를 증명하지 못한다

Debian guest(Apple Silicon host, HVF, 4 vCPU)에서 writer가 `data = r; flag = r;`를 relaxed로 2억 번 쓰고, 다른 CPU의 reader가 `flag`·`data` 순으로 읽어 `data < flag`인 경우를 셌습니다.

```text
relaxed: 0 of 88029858 reads saw data < flag
release/acquire: 0 of 109805448 reads saw data < flag
relaxed: 0 of 110217492 reads saw data < flag
release/acquire: 0 of 120630877 reads saw data < flag
```

relaxed 버전도 한 번도 틀리지 않았습니다. 그렇다고 relaxed가 맞는 코드라는 뜻은 아닙니다. 102336이 보인 대로 아키텍처는 두 store의 순서가 바뀌어 관찰되는 것을 허용하고, 이 실행은 이 CPU에서 그 경우가 나오지 않았다는 것만 말합니다. 메모리 순서는 테스트가 아니라 모델(C11의 release/acquire, Arm의 barrier 규칙)로 보장합니다.

## Lock-Free Queue

단일 producer·단일 consumer ring을 C11 atomic으로 쓴 버전입니다. 이전 판의 `__DMB()` 버전은 `pop`에서 `buf[t]`를 읽은 뒤 `tail`을 쓰기 전에 barrier가 없어, producer가 아직 읽지 않은 칸을 덮어쓸 수 있었습니다. 아래 코드는 `tail`도 release로 써서 그 순서를 막습니다.

```c
#define SIZE 256u
#define MASK (SIZE - 1u)
typedef struct {
    uint8_t buf[SIZE];
    _Atomic uint16_t head;   /* written by the producer only */
    _Atomic uint16_t tail;   /* written by the consumer only */
} ring_t;

bool push(ring_t *r, uint8_t b) {
    uint16_t h = atomic_load_explicit(&r->head, memory_order_relaxed);
    uint16_t next = (h + 1) & MASK;
    if (next == atomic_load_explicit(&r->tail, memory_order_acquire)) return false;  /* full */
    r->buf[h] = b;
    atomic_store_explicit(&r->head, next, memory_order_release);   /* publish buf[h] */
    return true;
}

bool pop(ring_t *r, uint8_t *out) {
    uint16_t t = atomic_load_explicit(&r->tail, memory_order_relaxed);
    if (t == atomic_load_explicit(&r->head, memory_order_acquire)) return false;    /* empty */
    *out = r->buf[t];
    atomic_store_explicit(&r->tail, (t + 1) & MASK, memory_order_release);  /* free the slot */
    return true;
}
```

Debian guest에서 producer thread와 consumer thread로 1억 byte를 흘려 순서와 값을 검사했고, AArch64 코드에서 head·tail 접근이 `ldarh`/`stlrh`가 된 것을 확인했습니다.

```text
 978:	48dffca5 	ldarh	w5, [x5]
 984:	3823c801 	strb	w1, [x0, w3, sxtw]
 988:	489ffc82 	stlrh	w2, [x4]
100000000 items, 0 out-of-order or corrupted
```

같은 `push`를 Cortex-M4로 컴파일하면 `strb`(buf) 앞뒤에 `dmb ish`가 들어가, 손으로 `__DMB()`를 넣은 버전과 같은 위치에 barrier가 생깁니다.

```text
push:
	ldrh	r2, [r0, #256]
	ldrh	ip, [r0, #258]
	dmb	ish
	strb	r1, [r0, r2]
	dmb	ish
	strh	r3, [r0, #256]
```

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

CMSIS 5.9.0의 `SCB_*DCache_by_Addr` 함수는 내부에서 이미 `__DSB()`와 `__ISB()`를 실행하므로, 위의 `__DSB()`는 maintenance 없이 non-cacheable buffer를 쓰는 경로에서 필요한 것입니다. 수신 경로에서 DMA 시작 전 invalidate가 왜 한 번 더 필요한지는 [2-06](/blog/embedded/modern-recipes/part2-06-arm-cache)의 "DMA 방향별 순서"에 있습니다.

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

    /* 2. Cache maintenance (cores with caches) */
    SCB_CleanInvalidateDCache_by_Addr((uint32_t*)addr, len);
    SCB_InvalidateICache_by_Addr((uint32_t*)addr, len);

    /* 3. Barriers (AN321 4.20) */
    __DSB();
    __ISB();

    /* 4. Jump */
    ((void(*)(void))(addr | 1))();
}
```

`flash_*` 함수는 칩별 flash 드라이버가 채우는 자리입니다. 순서는 쓰기 → cache maintenance → DSB → ISB → 점프입니다.

## Vector Table 변경

```c
SCB->VTOR = NEW_VECTOR_BASE;
__DSB();   /* AN321 4.11: required architecturally if an exception follows immediately */
/* 이제 IRQ가 새 vector 사용 */
```

AN321 4.11절의 아키텍처 요구는 DSB이고, Cortex-M3·M4·M0+에서는 구현상 그것도 필요 없다고 적습니다. 이전 판의 "DSB+ISB가 없으면 다음 IRQ가 옛 vector를 써서 crash"는 AN321과 맞지 않아 고쳤습니다. vector table의 *entry*를 바꾼 경우는 AN321 4.12절에 따로 있습니다.

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
    ((void(*)(void))core1_entry_addr)();
}
```

두 코어가 같은 변수를 통해 시작 주소를 넘기는 경우입니다. 쓰는 쪽은 상대 코어를 깨우기 전에 write를 끝내고(DSB), 읽는 쪽은 flag를 본 뒤의 읽기가 앞서지 않게 DMB를 둡니다. `core1_wake()`는 칩마다 다른 메커니즘(reset release, mailbox, SEV)입니다.

## 자주 하는 실수

> ⚠️ ISB가 필요한 곳에 DMB만 사용합니다

```c
__set_CONTROL(__get_CONTROL() | CONTROL_nPRIV_Msk);
__DMB();   /* ← 부족 — AN321 4.16: CONTROL 뒤에는 ISB */
```

→ CONTROL 변경, MPU 변경, 프로그램 메모리 변경 뒤에는 ISB가 필요합니다. DMB는 data access 순서만 다룹니다.

> ⚠️ Barrier 위치를 잘못 잡습니다

```c
flag = 1;
__DMB();   /* ← 너무 늦음 — flag가 이미 관찰될 수 있음 */
data = compute();
```

→ data write 후, *flag write 전*에 DMB를 배치합니다.

> ⚠️ atomic에 manual barrier를 덧붙입니다

```c
atomic_store_explicit(&x, 1, memory_order_release);
__DMB();   /* ← release store가 이미 앞선 access의 순서를 보장 */
```

→ 위 codegen처럼 release store에는 이미 `STLR`(AArch64) 또는 `dmb`+`str`(Cortex-M)이 들어갑니다. 추가 barrier는 release가 보장하지 않는 순서(store 뒤의 load 등)가 필요할 때만 씁니다.

> ⚠️ Cortex-M에서 DMB 범위 옵션에 의미를 둡니다

ARMv7-M은 DMB option으로 SY만 정의합니다. 다른 encoding은 SY로 실행되지만 그 동작에 기대지 말라고 적혀 있습니다. CMSIS에도 범위 옵션 함수는 없습니다.

## 정리

- **DMB**는 data access의 관찰 순서, **DSB**는 앞선 access의 완료, **ISB**는 이후 명령의 재fetch입니다.
- Cortex-M0+/M3/M4는 AN321 기준으로 data transfer를 재정렬하지 않지만, Arm은 이식성을 위해 아키텍처 요구(WFI 전 DSB, CONTROL 뒤 ISB, MPU 뒤 DSB, 코드 변경 뒤 DSB+ISB)를 따르라고 권합니다.
- Armv8-A는 weakly-ordered이고, C11 release/acquire는 `STLR`/`LDAR`로, Linux `smp_mb()`는 `dmb ish`로 내려갑니다.
- relaxed 코드가 테스트를 통과해도 순서가 보장된 것은 아닙니다.
- SPSC ring은 head와 tail을 모두 release/acquire로 다뤄야 합니다.

다음 편은 **Wait-Free**입니다.

## 관련 항목

- [6-10: Priority Inversion 진단·예방](/blog/embedded/modern-recipes/part6-10-priority-inversion)
- [9-02: Wait-Free Signaling](/blog/embedded/modern-recipes/part9-02-wait-free)
- [2-06: ARM 캐시 (L1/L2)](/blog/embedded/modern-recipes/part2-06-arm-cache)
