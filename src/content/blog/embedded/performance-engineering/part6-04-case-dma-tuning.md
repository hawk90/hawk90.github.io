---
title: "6-04: 사례 — DMA 튜닝 (이미지 capture 30% 부족 → 해결)"
date: 2026-05-08T33:00:00
description: "Camera DMA throughput 부족. Descriptor chain + burst size + non-cacheable로 해결."
series: "Embedded Performance Engineering"
seriesOrder: 50
tags: [case-study, dma, tuning, descriptor, chain]
draft: true
---

## 한 줄 요약

> **"DMA throughput 30% 부족 — descriptor 단일 + burst 작음"** — chain + burst-up으로 해결.

## 시나리오 — 8K Camera Capture

```text
보드: NVIDIA Jetson Orin Nano
센서: 8K (7680x4320) 60 fps Bayer raw
대역폭 필요: 7680 × 4320 × 2 byte × 60 = 4.0 GB/s

증상: throughput 2.8 GB/s만 — 30% 부족
       frame drop 빈번
       memory bus *saturated 안 보임* (use 65%)
```

## 측정 — DMA Throughput

```c
/* Cycle counter로 */
uint64_t start = read_cycles();
HAL_CSI_DMA_Start(&hcsi, buf, frame_size);
wait_dma_done();
uint64_t cycles = read_cycles() - start;
uint64_t bytes_per_sec = frame_size * cpu_freq / cycles;

printf("DMA throughput: %llu MB/s\n", bytes_per_sec >> 20);
/* 출력: DMA throughput: 2867 MB/s (target 4000) */
```

## 측정 — Bus Utilization

```bash
# Perf bus events (Cortex-A53)
perf stat -e r19,r1d ./capture
# r19 BUS_ACCESS
# r1d BUS_CYCLES

# bus utilization = BUS_ACCESS × 64 / BUS_CYCLES (assuming 64-byte transactions)
```

Bus 사용 65% — *여유 있음*. 그렇다면 *DMA 자체 문제*.

## 원인 분석 — DMA Descriptor

```c
/* 현재 — single descriptor per frame */
HAL_CSI_DMA_Start(&hcsi, frame_buf, frame_size);
/* IRQ → next frame */
HAL_CSI_DMA_Start(&hcsi, frame_buf2, frame_size);
```

```text
Frame N: [DMA xfer | IRQ | DMA setup | DMA xfer | IRQ | ...
                  ↑
                  IRQ+setup overhead = 50 µs gap
                  frame 16 ms 대비 0.3%만 — but
```

매 frame *gap* 누적 → throughput 손실.

## 해결 1 — Descriptor Chain

```c
typedef struct dma_desc {
    uint32_t src;
    uint32_t dst;
    uint32_t len;
    struct dma_desc *next;
} dma_desc_t;

/* 4 frame buffer pre-chain */
dma_desc_t chain[4];
for (int i = 0; i < 4; i++) {
    chain[i].src = CSI->FIFO;
    chain[i].dst = frame_buf[i];
    chain[i].len = FRAME_SIZE;
    chain[i].next = &chain[(i+1) % 4];   /* circular */
}

/* Start once */
HAL_CSI_DMA_Chain_Start(&hcsi, &chain[0]);
```

DMA controller가 *자동 chain* — IRQ는 *frame ready notify*만, *xfer setup overhead 0*.

```text
측정 후:
  throughput 2867 → 3450 MB/s   (20% ↑)
  frame drop ↓
  target 아직 미달
```

## 해결 2 — Burst Size

```c
/* AXI burst 설정 */
DMA->BURST_CFG = (
    BURST_LEN_16    |    /* 16 transfer per burst */
    BEAT_SIZE_64    |    /* 64-bit beat */
    OUTSTANDING_8        /* 8 outstanding */
);
/* → 한 burst = 128 byte, max 1024 byte in flight */
```

이전 — `BURST_LEN_4, BEAT_32`. 새로운 — *bus efficient*.

```text
측정 후:
  throughput 3450 → 3850 MB/s   (12% ↑)
  
원인: burst 크면 bus efficiency ↑
  - AXI overhead per transaction ~5 cycle
  - 4-beat burst: 5 + 4 = 9 cycle → 44% efficient
  - 16-beat burst: 5 + 16 = 21 cycle → 76% efficient
```

## 해결 3 — Buffer Alignment

```c
/* Cache line aligned */
__attribute__((aligned(64))) uint8_t frame_buf[FRAME_SIZE];
```

이전 — 4-byte align만. DMA가 *cross-line transaction* — extra cycle.

```text
측정 후:
  throughput 3850 → 3920 MB/s   (2% ↑)
```

## 해결 4 — Non-Cacheable Buffer

```c
/* MPU/device tree — DMA buffer 영역 non-cacheable */
/* 또는 ioremap_wc */
dma_buf = dma_alloc_wc(&pdev->dev, FRAME_SIZE, &dma_handle, GFP_KERNEL);
```

```text
효과:
  - Cache maintenance overhead 0 (clean/invalidate 안 함)
  - Cache pollution 0 (다른 hot data 보존)
  
측정 후:
  throughput 3920 → 4050 MB/s   (3% ↑)  ← target 4000+ 도달
```

## 측정 정리

| 단계 | Throughput | 비고 |
|---|---|---|
| Original | 2867 MB/s | single descriptor |
| + Chain | 3450 MB/s | +20% |
| + Burst 16 | 3850 MB/s | +12% |
| + Align 64 | 3920 MB/s | +2% |
| + Non-cacheable | 4050 MB/s | +3%, target 달성 |

총 *41% 향상*.

## STM32H7 DMA — 사례 적용

```c
/* MDMA — Master DMA */
hmdma.Init.Request = MDMA_REQUEST_DCMI;
hmdma.Init.TransferTriggerMode = MDMA_BUFFER_TRANSFER;
hmdma.Init.SourceBurst = MDMA_SOURCE_BURST_128BEATS;
hmdma.Init.DestBurst = MDMA_DEST_BURST_128BEATS;
hmdma.Init.SourceDataSize = MDMA_SRC_DATASIZE_WORD;
hmdma.Init.DestDataSize = MDMA_DEST_DATASIZE_WORD;
hmdma.Init.SourceInc = MDMA_SRC_INC_DOUBLEWORD;
hmdma.Init.DestinationInc = MDMA_DEST_INC_DOUBLEWORD;
hmdma.Init.BufferTransferLength = 128;

HAL_MDMA_Init(&hmdma);
HAL_MDMA_LinkedList_Start(&hmdma, &chain[0]);
```

128 beat × 8 byte = 1024 byte per transaction → *AXI saturate*.

## Linux dmaengine — Auto Tuning

```c
struct dma_chan *chan = dma_request_chan(dev, "rx");

/* Pre-allocated descriptor list */
struct scatterlist sg[NUM_FRAMES];
sg_init_table(sg, NUM_FRAMES);
for (int i = 0; i < NUM_FRAMES; i++) {
    sg_set_buf(&sg[i], frame_buf[i], FRAME_SIZE);
}

struct dma_async_tx_descriptor *tx = dmaengine_prep_slave_sg(
    chan, sg, NUM_FRAMES, DMA_DEV_TO_MEM,
    DMA_PREP_INTERRUPT | DMA_CTRL_ACK);

dmaengine_submit(tx);
dma_async_issue_pending(chan);
```

Linux generic API — driver가 *최적 burst·alignment* 자동 선택.

## Multi-Channel — 추가 가속

```c
/* 4 channel parallel — 4 stripe */
for (int ch = 0; ch < 4; ch++) {
    DMA_start_channel(ch, &chain_per_channel[ch]);
}
```

같은 frame을 *4 사분면* 동시 DMA. Bus bandwidth 한계까지 push.

다만 — *bus contention* 증가, 다른 master 영향.

## ARM CCI QoS — DMA priority 조정

```c
/* CCI-400 — DMA master에 priority */
CCI->QOS[DMA_MASTER] = QOS_HIGH;   /* CPU·GPU와 경쟁 */
```

DMA가 *throughput 우선*. CPU latency 약간 손실 — trade-off.

## Lesson Learned

```text
1. DMA throughput 부족 — 단순 "DMA 느림" 아닌 *구성 문제*
2. Descriptor chain = setup overhead 제거 (핵심)
3. Burst size = bus efficiency (큰 영향)
4. Alignment·non-cacheable = 마지막 추가 이득
5. Multi-channel = 한계 push (다른 master 영향)
```

## 자율주행 — Sensor DMA 표준 설정

```text
Camera·LiDAR·Radar — 모두 DMA chain:
  - Pre-allocated buffer pool
  - Circular chain
  - Non-cacheable (cache maintenance 0)
  - 128+ beat burst
  - High QoS
  
End-to-end: sensor → DMA → DDR → GPU/NPU
  → CPU 개입 최소화 (IRQ 통계만)
```

## 자주 하는 실수

> ⚠️ Single descriptor per frame

```c
HAL_DMA_Start_IT(...);   /* IRQ end → 다음 start */
```

→ chain.

> ⚠️ Small burst

```c
DMA->BURST = 4;   /* AXI overhead per burst — efficiency ↓ */
```

→ 16+ beat.

> ⚠️ Cacheable buffer

```c
uint8_t buf[8MB];   /* default cacheable */
HAL_DMA_Start(...);
SCB_InvalidateDCache_by_Addr(buf, 8MB);   /* 매 frame 8MB cache flush! */
```

→ non-cacheable region 또는 *MDMA cache 우회*.

> ⚠️ DMA priority 안 조정

```text
CPU·GPU·DMA 모두 default priority → DMA가 starve 가능
```

→ QoS 설정.

## 정리

- DMA throughput 부족 — **descriptor chain·burst·alignment·non-cacheable** 4 단계.
- **41% 향상** 가능 (case study).
- STM32 MDMA·Linux dmaengine — built-in 도구.
- Multi-channel = 한계 push.
- 자율주행 — *모든 sensor가 DMA chain* 표준.

이번 시리즈 **Performance Engineering**은 여기까지.

## 관련 항목

- [6-03: Lock Contention](/blog/embedded/performance-engineering/part6-03-case-lock-contention)
- [3-03: DMA Performance](/blog/embedded/performance-engineering/part3-03-dma-performance)
- [3-04: DMA vs CPU](/blog/embedded/performance-engineering/part3-04-dma-vs-cpu)
