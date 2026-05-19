---
title: "5-03: DMA Completion Queue — Chain·Cyclic·Half-Full IRQ"
date: 2026-05-20T21:00:00
description: "DMA descriptor chain, cyclic mode, half-full IRQ. Camera·UART·SPI continuous transfer."
series: "Modern Embedded Recipes"
seriesOrder: 27
tags: [recipes, dma, completion, cyclic, descriptor-chain]
draft: true
---

## 한 줄 요약

> **"DMA Completion = chain·cyclic·half-full IRQ 3종"** — CPU 개입 없이 continuous transfer.

## 기본 — Single Transfer + Complete IRQ

```c
HAL_UART_Receive_IT(&huart, buf, len);   /* IT mode */

void HAL_UART_RxCpltCallback(UART_HandleTypeDef *huart) {
    /* 매 transfer 완료 */
    process(buf);
    HAL_UART_Receive_IT(&huart, buf, len);   /* re-arm */
}
```

문제 — *매 transfer마다 CPU re-arm* → throughput 한계.

## Descriptor Chain

```c
typedef struct dma_desc {
    uint32_t src;
    uint32_t dst;
    uint32_t len;
    uint32_t flags;   /* IRQ_AT_END, etc. */
    struct dma_desc *next;
} dma_desc_t;

dma_desc_t chain[8];

void setup_chain(void) {
    for (int i = 0; i < 8; i++) {
        chain[i].src = (uint32_t)src_buf[i];
        chain[i].dst = (uint32_t)dst_buf[i];
        chain[i].len = BUF_SIZE;
        chain[i].flags = IRQ_AT_END;
        chain[i].next = &chain[(i + 1) % 8];   /* circular */
    }
}

DMA->FIRST_DESC = (uint32_t)&chain[0];
DMA->START = 1;
```

DMA가 *자동 chain* — 매 buffer 완료 IRQ, 그러나 *xfer setup 0*.

## Cyclic Mode — 무한 Loop

```c
HAL_UART_Receive_DMA(&huart, buf, BUF_SIZE);   /* cyclic */

/* Half-complete callback */
void HAL_UART_RxHalfCpltCallback(UART_HandleTypeDef *huart) {
    process(buf, BUF_SIZE / 2);
}

/* Full-complete callback */
void HAL_UART_RxCpltCallback(UART_HandleTypeDef *huart) {
    process(buf + BUF_SIZE / 2, BUF_SIZE / 2);
}
```

DMA가 *buffer end 도달 시 자동 wrap*. CPU는 *half/full IRQ로 batch 처리*.

## Half-Full IRQ — Double Buffer 효과

```text
DMA fills buffer 1024 byte:
  
  0     256     512    768    1024
  ├──────┼──────┼──────┼──────┤
                ↑              ↑
            Half IRQ       Full IRQ
                
  Half IRQ — CPU processes 0..512
  while DMA continues 512..1024
  
  Full IRQ — CPU processes 512..1024
  while DMA wraps to 0..512
```

CPU·DMA *완전 병행* — *zero copy double buffer*.

## STM32H7 DMA 예 — UART 1 Mbps

```c
#define BUF_SIZE 4096
uint8_t rx_buf[BUF_SIZE];

void start_uart_dma(void) {
    HAL_UART_Receive_DMA(&huart1, rx_buf, BUF_SIZE);
    /* cyclic by default */
}

/* IRQ */
volatile uint16_t rx_head;

void HAL_UART_RxHalfCpltCallback(UART_HandleTypeDef *h) {
    rx_head = BUF_SIZE / 2;
}

void HAL_UART_RxCpltCallback(UART_HandleTypeDef *h) {
    rx_head = BUF_SIZE;
}

void HAL_UART_ErrorCallback(UART_HandleTypeDef *h) {
    /* Overrun·noise — abort and restart */
    HAL_UART_DMAStop(h);
    HAL_UART_Receive_DMA(h, rx_buf, BUF_SIZE);
}

/* Task */
void uart_task(void *p) {
    uint16_t tail = 0;
    for (;;) {
        uint16_t head = rx_head;
        while (tail != head) {
            process(rx_buf[tail]);
            tail = (tail + 1) % BUF_SIZE;
        }
        vTaskDelay(1);
    }
}
```

1 Mbps UART (100 KB/s) — *CPU usage < 1%*.

## Camera DCMI/CSI DMA

```c
HAL_DCMI_Start_DMA(&hdcmi, DCMI_MODE_CONTINUOUS,
                    (uint32_t)frame_buf, FRAME_SIZE);

/* Frame complete IRQ */
void HAL_DCMI_FrameEventCallback(DCMI_HandleTypeDef *hdcmi) {
    /* Frame ready — signal task */
    xSemaphoreGiveFromISR(frame_sem, &pxHP);
}
```

매 frame *complete IRQ*. Task가 *background processing*.

## Triple Buffer

```c
volatile int dma_buf_idx = 0;
volatile int ready_buf_idx = -1;
volatile int processing_buf_idx = -1;

void frame_done_irq(void) {
    ready_buf_idx = dma_buf_idx;
    dma_buf_idx = (dma_buf_idx + 1) % 3;
    if (dma_buf_idx == processing_buf_idx) {
        dma_buf_idx = (dma_buf_idx + 1) % 3;
    }
    DMA->BUFFER = (uint32_t)frame_buf[dma_buf_idx];
}

void task_consume(void) {
    while (ready_buf_idx < 0) wait;
    processing_buf_idx = ready_buf_idx;
    ready_buf_idx = -1;
    process(frame_buf[processing_buf_idx]);
    processing_buf_idx = -1;
}
```

Producer (DMA)·consumer (CPU) — *최신 frame 항상 ready*. 절대 stale 사용 안 함.

## Linux dmaengine — Submit·Tasklet·Callback

```c
struct dma_chan *chan = dma_request_chan(dev, "rx");

/* Cyclic */
struct dma_async_tx_descriptor *tx = dmaengine_prep_dma_cyclic(
    chan, buf_phys, BUF_SIZE, BUF_SIZE / 2,
    DMA_DEV_TO_MEM, DMA_PREP_INTERRUPT);

tx->callback = my_callback;
tx->callback_param = my_ctx;
dmaengine_submit(tx);
dma_async_issue_pending(chan);
```

`dma_prep_cyclic` — Linux의 *Half/Full IRQ* 표준. Tasklet에서 callback.

## DMA Error Recovery

```c
void DMA_ErrorCallback(DMA_HandleTypeDef *hdma) {
    /* Possible errors:
       - FIFO error (FE)
       - Direct mode error (DME)
       - Transfer error (TE)
    */
    log_error("DMA error: %lu", hdma->ErrorCode);
    
    HAL_DMA_Abort(hdma);
    
    /* Reset and restart */
    init_dma_again();
    start_transfer();
}
```

Production — *반드시 error handler*. UART overrun·DMA conflict 등.

## DMA Completion Queue — Multi-Channel

```c
struct dma_completion {
    uint32_t cookie;
    uint32_t status;
    uint64_t timestamp;
};

struct dma_completion cq_ring[64];
atomic_int cq_head, cq_tail;

void DMA_IRQHandler(void) {
    int slot = atomic_fetch_add(&cq_head, 1) % 64;
    cq_ring[slot].cookie = current_cookie;
    cq_ring[slot].status = DMA->STATUS;
    cq_ring[slot].timestamp = DWT->CYCCNT;
    
    BaseType_t pxHP = pdFALSE;
    xSemaphoreGiveFromISR(cq_sem, &pxHP);
    portYIELD_FROM_ISR(pxHP);
}
```

여러 DMA channel completion을 *통합 queue*. Task가 *batch poll*.

## MDMA·Chain·Linked-List

STM32H7 MDMA — *Linked List Mode*:

```c
MDMA_LinkNodeTypeDef nodes[8];

for (int i = 0; i < 8; i++) {
    HAL_MDMA_LinkedList_CreateNode(&nodes[i], &cfg);
    if (i > 0) {
        HAL_MDMA_LinkedList_AddNode(&nodes[i-1], &nodes[i]);
    }
}
nodes[7].LinkAddress = (uint32_t)&nodes[0];   /* circular */

HAL_MDMA_LinkedList_Start(&hmdma, &nodes[0]);
```

Per-node *별도 src/dst/len/config*. 매우 유연.

## NVMe Completion Queue — 비교

```text
NVMe SSD:
  - SQ (host writes commands)
  - CQ (SSD writes completions)
  - Doorbell to SSD
  - IRQ from SSD on CQ entry
  
같은 SQ·CQ 패턴.
```

## ARM AXI DMA — Scatter-Gather

```c
/* Xilinx AXI DMA */
typedef struct sg_desc {
    uint32_t next;
    uint32_t reserved;
    uint32_t buffer_addr;
    uint32_t reserved2;
    uint32_t control;   /* SOF·EOF·LEN */
    uint32_t status;
    uint32_t app[5];
} sg_desc_t __attribute__((aligned(64)));

/* SG descriptor ring */
sg_desc_t descs[16];

DMA->S2MM_CURDESC = (uint32_t)&descs[0];
DMA->S2MM_TAILDESC = (uint32_t)&descs[15];
```

FPGA + Linux dmaengine 통합.

## Performance Comparison

```text
1 Mbps UART (100 KB/s):
  IT per byte:           CPU 30%
  IT per buffer (1 KB):  CPU 1%
  DMA cyclic:            CPU 0.5%
  
4K@30fps camera (250 MB/s):
  IRQ per pixel:         impossible
  DMA cyclic + IRQ:      CPU 5% (frame processing)
  DMA chain + GPU:       CPU 0% (full offload)
```

DMA + completion queue — *CPU offload 핵심*.

## 자동차·자율주행 사례

```text
Camera DMA chain (CSI-2):
  16 frame ring buffer
  Half/Full IRQ per frame
  Task processes "ready" frame
  Triple buffer for latest
  
LiDAR DMA:
  Continuous point cloud
  Cyclic mode
  Frame timestamp via DWT
```

수십 GB/s sensor data — *CPU 안 거치고 GPU/NPU 직행*.

## 자주 하는 실수

> ⚠️ Single transfer + restart

```c
HAL_UART_Receive_IT(...);   /* 매 byte */
/* CPU 100% */
```

→ DMA cyclic.

> ⚠️ Half IRQ 무시

```c
HAL_UART_Receive_DMA(...);
/* Only RxCpltCallback */
/* Half buffer 사용 안 함 — half latency */
```

→ Half + Full 둘 다 처리.

> ⚠️ Cyclic 안 overrun

```c
/* DMA가 buffer wrap */
/* CPU processing 늦으면 — data overwrite */
```

→ 충분히 큰 buffer 또는 *triple buffer*.

> ⚠️ DMA error 무시

```c
/* Error callback 안 등록 */
/* Production silent fail */
```

→ error handler + recovery.

## 정리

- DMA Completion = **chain·cyclic·half-full IRQ** 3종.
- **Cyclic + half/full** = CPU 거의 0.
- **Triple buffer** = stale 0, latest 보장.
- **Linked list MDMA** — 유연한 multi-step transfer.
- 자동차·자율주행 — *DMA chain 표준*.
- 모든 high-throughput — *DMA completion queue*.

다음 편은 **PCIe Streaming**.

## 관련 항목

- [5-02: CQ·SQ](/blog/embedded/modern-recipes/part5-02-cq-sq)
- [5-04: PCIe Streaming](/blog/embedded/modern-recipes/part5-04-pcie-streaming)
