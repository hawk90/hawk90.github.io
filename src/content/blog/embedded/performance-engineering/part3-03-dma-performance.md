---
title: "3-03: DMA 성능 - Burst·Scatter-Gather·Chain·Cache 일관성"
date: 2026-05-08T02:00:00
description: "Burst size 최적화. Scatter-gather, chain. Cache clean/invalidate, double buffer."
series: "Embedded Performance Engineering"
seriesOrder: 21
tags: [dma, burst, scatter-gather, cache, double-buffer]
draft: false
---

## 한 줄 요약

> **"DMA는 CPU를 우회한 데이터 이동입니다."** burst size와 alignment, cache가 핵심을 결정합니다.

## DMA Throughput 결정 요소

| 요소 | 영향 |
|---|---|
| **Burst size** | 클수록 throughput이 올라갑니다 (overhead 분산) |
| **Beat size** | bus 폭에 맞춥니다. 32-bit bus는 32-bit beat가 적합합니다 |
| **Alignment** | misaligned면 split이 발생합니다 |
| **Outstanding** | DMA controller가 동시에 처리하는 transaction 수입니다 |
| **Bus contention** | 다른 master의 영향을 받습니다 |

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

`Burst length × Beat size`가 한 AXI transaction의 크기입니다. cache line 크기인 64-byte가 sweet spot입니다.

## STM32H7 MDMA - Master DMA

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

`MDMA`는 AXI master여서 *DRAM ↔ DRAM* copy까지 가능합니다. 일반 DMA1/2는 *peripheral ↔ memory*만 지원합니다.

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

CPU 개입이 전혀 없습니다. DMA controller가 *전체 chain을 자동으로 처리*합니다.

## Chain Transfer (Linked List)

```text
Frame 1 capture: DMA → buf_a
                   complete IRQ
Frame 2 capture: DMA → buf_b
                   complete IRQ
                   ...
```

Camera·display·audio에서 *연속 스트림*을 처리할 때 씁니다. CPU는 *processing*에만 집중합니다.

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

DMA와 CPU가 동시에 동작하면서 *throughput이 약 2배*로 늘어납니다.

## Cache 일관성 - Cortex-M7

### CPU가 buffer write → DMA가 send

```c
fill_data(tx_buf, 256);            // CPU writes (cache only)
SCB_CleanDCache_by_Addr(tx_buf, 256);   // ← memory에 flush
HAL_UART_Transmit_DMA(&huart1, tx_buf, 256);
```

`Clean`은 cache 내용을 memory로 write-back합니다.

### DMA가 buffer fill → CPU가 read

```c
HAL_UART_Receive_DMA(&huart1, rx_buf, 256);
/* DMA complete */
SCB_InvalidateDCache_by_Addr(rx_buf, 256);   // ← cache 폐기
process(rx_buf);
```

`Invalidate`는 stale cache line을 폐기합니다. 이후 CPU read는 *memory에서 fresh*하게 읽어옵니다.

### Misalignment 함정

```c
SCB_CleanDCache_by_Addr(buf, 100);   // 100 byte
```

Cache line이 32 byte라고 가정합니다. `buf`가 *32-byte aligned*가 아니거나 `len`이 *line 배수가 아니면* 이웃 line까지 영향을 받습니다.

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

DMA 전용 buffer는 *non-cacheable*로 두면 *cache maintenance overhead가 사라집니다*.

## DMA Latency

```text
Setup overhead - 매 transfer 시작 비용:
  STM32 DMA: ~5 cycle
  i.MX SDMA: ~50 cycle (FW 실행)
  Linux dmaengine: ~100 cycle + IRQ
```

작은 transfer (< 256 byte)에서는 *DMA setup 비용이 더 큽니다*. 이 구간은 CPU memcpy가 빠릅니다.

## CPU vs DMA - 손익 분기점

```text
memcpy: 1 byte ≈ 0.5 cycle (Cortex-M4)
DMA setup ~50 cycle + transfer cost (~ 1 byte/cycle)

손익:
  CPU: cost = 0.5 × N
  DMA: cost = 50 + 1 × N
  cross-over: 50 + N = 0.5N → N = -100 (?)
  
실제로는 DMA가 CPU를 자유롭게 만들어 *CPU offload가 진짜 이득*
```

작은 copy는 CPU가 유리합니다. 큰 copy(>256 byte)는 DMA가 유리합니다. CPU가 *다른 일을 할 수 있을 때*는 DMA가 무조건 유리합니다.

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

Linux에서는 *peripheral driver*가 dmaengine을 사용해 DMA controller를 추상화합니다.

## DMA, IRQ, Polling 비교

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

DMA buffer는 *static*, *heap*, *전역* 중 하나에 둬야 합니다. Stack 위에 두면 *함수 return 시점에 깨집니다*.

> ⚠️ Cache flush 안 함

DMA가 *cache stale data를 보거나* CPU가 *옛 data를 읽게* 됩니다. 매 transfer 전후로 *clean/invalidate*를 수행해야 합니다.

> ⚠️ MPU 영역 잘못 설정

```c
region.Size = MPU_REGION_SIZE_4KB;
```

DMA buffer가 *region 경계를 넘어가면* 일부는 cacheable, 일부는 non-cacheable이 됩니다. 결과는 미정의 동작입니다.

> ⚠️ Burst size > slave 지원

Peripheral FIFO depth가 *4*인데 burst length가 16이면 slave가 4-cycle마다 backpressure를 걸어 throughput이 손실됩니다.

## 정리

- DMA 성능은 **burst size, alignment, outstanding, bus contention**으로 결정됩니다.
- **Scatter-gather와 chain**으로 CPU 개입을 최소화합니다.
- **Double buffer**로 throughput을 2배로 끌어올립니다.
- Cortex-M7에서는 **clean/invalidate**가 필수이고 *non-cacheable region*도 선택지입니다.
- 작은 copy는 CPU memcpy, 큰 copy와 peripheral은 DMA가 유리합니다.

다음 편은 **DMA vs CPU 손익 분석**을 다룹니다.

## 관련 항목

- [3-02: Bus Contention](/blog/embedded/performance-engineering/part3-02-bus-contention)
- [3-04: DMA vs CPU](/blog/embedded/performance-engineering/part3-04-dma-vs-cpu)
