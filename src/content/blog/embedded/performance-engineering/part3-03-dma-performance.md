---
title: "3-03: DMA 성능 — Burst·Scatter-Gather·Chain·Cache 일관성"
date: 2026-05-08T02:00:00
description: "Burst size 최적화. Scatter-gather, chain. Cache clean/invalidate, double buffer."
series: "Embedded Performance Engineering"
seriesOrder: 21
tags: [dma, burst, scatter-gather, cache, double-buffer]
draft: true
---

## 한 줄 요약

> **"DMA = CPU 우회 데이터 이동"** — burst size·alignment·cache가 핵심.

## DMA Throughput 결정 요소

| 요소 | 영향 |
|---|---|
| **Burst size** | 클수록 ↑ (overhead 분산) |
| **Beat size** | bus 폭 매칭 — 32-bit bus엔 32-bit beat |
| **Alignment** | misaligned 시 split 발생 |
| **Outstanding** | DMA controller 동시 transaction |
| **Bus contention** | 다른 master 영향 |

## Burst Size 영향

```c
/* 매 transfer 1 byte */
HAL_DMA_Init(&hdma, .PeriphDataAlignment = DMA_PDATAALIGN_BYTE);
/* → AXI overhead per byte → 매우 느림 */

/* 4-beat burst, 4-byte beat */
HAL_DMA_Init(&hdma, 
    .PeriphDataAlignment = DMA_PDATAALIGN_WORD,
    .BurstSize = DMA_BURST_INC4);
/* → 16-byte per transaction → 10x throughput */
```

`Burst length × Beat size` = 한 AXI transaction 크기. 64-byte (cache line)이 sweet spot.

## STM32H7 MDMA — Master DMA

```c
MDMA_HandleTypeDef hmdma;
hmdma.Init.Request = MDMA_REQUEST_SW;
hmdma.Init.TransferTriggerMode = MDMA_BUFFER_TRANSFER;
hmdma.Init.Priority = MDMA_PRIORITY_HIGH;
hmdma.Init.Endianness = MDMA_LITTLE_ENDIANNESS_PRESERVE;
hmdma.Init.SourceInc = MDMA_SRC_INC_WORD;
hmdma.Init.DestinationInc = MDMA_DEST_INC_WORD;
hmdma.Init.SourceDataSize = MDMA_SRC_DATASIZE_WORD;
hmdma.Init.DestDataSize = MDMA_DEST_DATASIZE_WORD;
hmdma.Init.DataAlignment = MDMA_DATAALIGN_PACKENABLE;
hmdma.Init.BufferTransferLength = 128;   // burst length

HAL_MDMA_Start(&hmdma, src, dst, len, 1);
```

`MDMA` = AXI master, *DRAM ↔ DRAM* copy 가능. 일반 DMA1/2는 *peripheral ↔ memory만*.

## Scatter-Gather

```text
Source:                Destination:
[fragment 1 @0x1000]   [block @0x80000000]
[fragment 2 @0x4500]
[fragment 3 @0x9100]
[fragment 4 @0xC200]
```

DMA descriptor list:

```c
typedef struct {
    uint32_t src;
    uint32_t dst;
    uint32_t len;
    uint32_t next_descriptor;   // null = 종료
} dma_desc_t;

dma_desc_t descriptors[4] = {
    { .src=0x1000, .dst=base+0,    .len=256, .next_descriptor=&descriptors[1] },
    { .src=0x4500, .dst=base+256,  .len=512, .next_descriptor=&descriptors[2] },
    { .src=0x9100, .dst=base+768,  .len=128, .next_descriptor=&descriptors[3] },
    { .src=0xC200, .dst=base+896,  .len=256, .next_descriptor=NULL },
};
```

CPU 개입 0 — DMA controller가 *전체 chain 자동 처리*.

## Chain Transfer (Linked List)

```text
Frame 1 capture: DMA → buf_a
                   complete IRQ
Frame 2 capture: DMA → buf_b
                   complete IRQ
                   ...
```

Camera·display·audio에서 *연속 스트림*. CPU는 *processing*에만 집중.

## Double Buffer

```text
Buf A: filled by DMA   |   Buf B: processed by CPU
              swap
Buf A: processed       |   Buf B: filled
```

```c
/* STM32 DMA — Double Buffer mode */
HAL_DMAEx_MultiBufferStart(&hdma, src, dst_a, dst_b, len);

void HAL_DMA_M0CpltCallback(DMA_HandleTypeDef *hdma) {
    /* dst_a 완료 — process_a() */
}
void HAL_DMA_M1CpltCallback(DMA_HandleTypeDef *hdma) {
    /* dst_b 완료 — process_b() */
}
```

DMA·CPU 동시 — *throughput ~2x*.

## Cache 일관성 — Cortex-M7

### CPU가 buffer write → DMA가 send

```c
fill_data(tx_buf, 256);            // CPU writes (cache only)
SCB_CleanDCache_by_Addr(tx_buf, 256);   // ← memory에 flush
HAL_UART_Transmit_DMA(&huart1, tx_buf, 256);
```

`Clean` = cache → memory (write-back).

### DMA가 buffer fill → CPU가 read

```c
HAL_UART_Receive_DMA(&huart1, rx_buf, 256);
/* DMA complete */
SCB_InvalidateDCache_by_Addr(rx_buf, 256);   // ← cache 폐기
process(rx_buf);
```

`Invalidate` = stale cache line 폐기 → CPU 다음 read는 *fresh from memory*.

### Misalignment 함정

```c
SCB_CleanDCache_by_Addr(buf, 100);   // 100 byte
```

Cache line = 32 byte. `buf`가 *32-byte aligned*가 아니거나 `len`이 *line 배수 아니면* — *이웃 line도 영향*.

```c
__attribute__((aligned(32))) uint8_t buf[128];   // line aligned
SCB_CleanDCache_by_Addr(buf, 128);                // 4 line, exact
```

## Non-Cacheable Memory 영역

```c
/* MPU로 non-cacheable region 설정 */
MPU_Region_InitTypeDef region = {0};
region.BaseAddress = 0x24000000;
region.Size = MPU_REGION_SIZE_512KB;
region.AccessPermission = MPU_REGION_FULL_ACCESS;
region.IsCacheable = MPU_ACCESS_NOT_CACHEABLE;
region.IsBufferable = MPU_ACCESS_NOT_BUFFERABLE;
HAL_MPU_ConfigRegion(&region);

/* 이 영역 변수는 cache 관리 불필요 */
__attribute__((section(".uncached"))) uint8_t dma_buf[4096];
```

DMA 전용 buffer는 *non-cacheable*로 — *cache maintenance overhead 0*.

## DMA Latency

```text
Setup overhead — 매 transfer 시작 비용:
  STM32 DMA: ~5 cycle
  i.MX SDMA: ~50 cycle (FW 실행)
  Linux dmaengine: ~100 cycle + IRQ
```

작은 transfer (< 256 byte) — *DMA setup이 더 비쌈*. CPU memcpy가 빠름.

## CPU vs DMA — 손익 분기점

```text
memcpy: 1 byte ≈ 0.5 cycle (Cortex-M4)
DMA setup ~50 cycle + transfer cost (~ 1 byte/cycle)

손익:
  CPU: cost = 0.5 × N
  DMA: cost = 50 + 1 × N
  cross-over: 50 + N = 0.5N → N = -100 (?)
  
실제 — DMA가 CPU 자유롭게 함 → *CPU offload가 진짜 이득*
```

작은 copy — CPU. 큰 copy(>256 byte) — DMA. CPU가 *다른 일 할 수 있을 때* DMA 무조건 유리.

## Linux dmaengine API

```c
struct dma_chan *chan = dma_request_chan(dev, "rx");
struct dma_async_tx_descriptor *tx;

tx = dmaengine_prep_dma_memcpy(chan, dst, src, len, DMA_PREP_INTERRUPT);
tx->callback = dma_done_cb;
dma_cookie_t cookie = dmaengine_submit(tx);
dma_async_issue_pending(chan);

/* Wait */
dma_sync_wait(chan, cookie);
```

Linux에서 *peripheral driver*가 dmaengine 사용 — DMA controller 추상화.

## DMA · IRQ · Polling 비교

| 방식 | CPU 사용 | Latency | Throughput |
|---|---|---|---|
| **Polling** | 100% | 매우 낮음 | bus 한계 |
| **IRQ per byte** | 높음 (overhead) | 낮음 | 낮음 |
| **IRQ per buffer** | 낮음 | buffer 단위 | 보통 |
| **DMA + IRQ** | 매우 낮음 | buffer 단위 | bus 한계 |
| **DMA chain** | ~0 | 0 (CPU 안 봐도 됨) | bus 한계 |

## 자주 하는 실수

> ⚠️ DMA buffer를 stack에

```c
void send_data(void) {
    uint8_t buf[256];          // ← stack
    fill(buf);
    HAL_UART_Transmit_DMA(&huart, buf, 256);
    return;   // ← buf out of scope, DMA 진행 중
}
```

DMA buffer는 *static*·*heap*·*전역*. Stack 위는 *함수 return 시 깨짐*.

> ⚠️ Cache flush 안 함

DMA가 *cache stale data 봄* 또는 *CPU가 옛 data*. 매 transfer 전후 *clean/invalidate*.

> ⚠️ MPU 영역 잘못 설정

```c
region.Size = MPU_REGION_SIZE_4KB;
```

DMA buffer가 *region 경계 넘어가면* — 일부는 cacheable, 일부는 non-cacheable → 미정의 동작.

> ⚠️ Burst size > slave 지원

Peripheral FIFO depth가 *4*인데 burst length 16 → slave가 4-cycle마다 backpressure → throughput 손실.

## 정리

- DMA 성능 = **burst size·alignment·outstanding·bus contention**.
- **Scatter-gather + chain**으로 CPU 개입 최소화.
- **Double buffer**로 throughput 2x.
- Cortex-M7 — **clean/invalidate** 필수, *non-cacheable region* 옵션.
- 작은 copy는 CPU memcpy, 큰 copy·peripheral은 DMA.

다음 편은 **DMA vs CPU 손익 분석**.

## 관련 항목

- [3-02: Bus Contention](/blog/embedded/performance-engineering/part3-02-bus-contention)
- [3-04: DMA vs CPU](/blog/embedded/performance-engineering/part3-04-dma-vs-cpu)
