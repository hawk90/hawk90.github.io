---
title: "5-02: CQ·SQ Architecture — NVMe·io_uring·Vulkan 공통 패턴"
date: 2026-05-20T20:00:00
description: "Submission/Completion Queue 패턴. NVMe·io_uring·Vulkan·DMA descriptor 공통 구조."
series: "Modern Embedded Recipes"
seriesOrder: 26
tags: [recipes, cq, sq, nvme, vulkan, io_uring]
draft: true
---

## 한 줄 요약

> **"CQ·SQ = Producer·Consumer ring 2개"** — NVMe·io_uring·Vulkan 모두 같은 패턴.

## 핵심 구조

```text
Host (CPU)              Device (NIC·SSD·GPU)
  │                          │
  │  Submission Queue (SQ)   │
  │  CPU writes commands     │
  ├──────────────────────────┤
  │                          │
  │  Completion Queue (CQ)   │
  │  Device writes results   │
  ├──────────────────────────┤
  │                          │
```

Producer-consumer ring 2개 — *각각 다른 방향*.

## SQ — Command 발사

```c
struct sq_entry {
    uint8_t opcode;
    uint8_t flags;
    uint16_t cmd_id;
    uint64_t buffer_addr;
    uint32_t buffer_len;
    /* ... */
};

void submit(struct queue *q, struct cmd *c) {
    uint16_t tail = q->sq_tail;
    q->sq[tail] = *c;
    __DMB();
    q->sq_tail = (tail + 1) % q->sq_depth;
    
    /* Doorbell — write tail to device */
    *q->sq_doorbell = q->sq_tail;
}
```

CPU가 *SQ tail 증가* + *doorbell write* → device가 새 command 인식.

## CQ — Completion 회수

```c
struct cq_entry {
    uint64_t result;
    uint16_t cmd_id;
    uint8_t  status;
    uint8_t  phase;   /* ABA 회피 */
};

void poll_completions(struct queue *q) {
    while (1) {
        uint16_t head = q->cq_head;
        struct cq_entry *e = &q->cq[head];
        if (e->phase != q->expected_phase) break;   /* no new completion */
        
        process_completion(e);
        
        q->cq_head = (head + 1) % q->cq_depth;
        if (q->cq_head == 0) q->expected_phase ^= 1;   /* wrap */
    }
    
    /* Update CQ head doorbell */
    *q->cq_doorbell = q->cq_head;
}
```

Phase bit — *ABA 없이* fresh/stale 구분. NVMe·io_uring 표준.

## NVMe SSD

```text
NVMe queue pair:
  - 1 Admin SQ/CQ (init·config)
  - N IO SQ/CQ (data path)
  - Max 65535 commands per SQ
  - Max queue depth 64K (이론), 보통 1024
  
Submit:
  CPU writes SQ entry → doorbell
Complete:
  SSD writes CQ entry → IRQ (또는 polling)
```

NVMe — *RTT 1 µs 수준*. 가장 빠른 storage.

## io_uring — Linux

```c
struct io_uring ring;
io_uring_queue_init(QUEUE_DEPTH, &ring, 0);

/* SQ */
struct io_uring_sqe *sqe = io_uring_get_sqe(&ring);
io_uring_prep_read(sqe, fd, buf, len, offset);
io_uring_sqe_set_data(sqe, my_ctx);

io_uring_submit(&ring);

/* CQ */
struct io_uring_cqe *cqe;
io_uring_wait_cqe(&ring, &cqe);
my_ctx_t *ctx = io_uring_cqe_get_data(cqe);
io_uring_cqe_seen(&ring, cqe);
```

Linux 5.1+ — *kernel과 user space가 SQ·CQ 공유*. NVMe와 같은 모델.

## Vulkan Command Buffer

```c
VkCommandBufferAllocateInfo alloc_info = { ... };
VkCommandBuffer cmd;
vkAllocateCommandBuffers(device, &alloc_info, &cmd);

vkBeginCommandBuffer(cmd, &begin_info);
vkCmdDraw(cmd, ...);
vkCmdDispatch(cmd, ...);
vkEndCommandBuffer(cmd);

/* Submit to queue */
VkSubmitInfo submit = {
    .commandBufferCount = 1,
    .pCommandBuffers = &cmd,
};
vkQueueSubmit(queue, 1, &submit, fence);

/* Wait fence */
vkWaitForFences(device, 1, &fence, VK_TRUE, UINT64_MAX);
```

Vulkan — *command buffer가 SQ entry 묶음*. Fence = completion 신호.

## DMA Descriptor Chain

```c
struct dma_desc {
    uint32_t src;
    uint32_t dst;
    uint32_t len;
    uint32_t next;   /* link */
};

struct dma_desc ring[32];

void enqueue(int idx, void *src, void *dst, size_t len) {
    ring[idx].src = (uint32_t)src;
    ring[idx].dst = (uint32_t)dst;
    ring[idx].len = len;
    ring[idx].next = (uint32_t)&ring[(idx + 1) % 32];
}

DMA->FIRST_DESC = (uint32_t)&ring[0];
DMA->START = 1;
```

DMA controller — *SQ와 동일*. Descriptor = SQ entry.

## SmartNIC·RDMA

```text
Mellanox ConnectX·Intel E810:
  - WQ (Work Queue) = SQ
  - CQ = CQ
  - Ring buffer of WQE (Work Queue Element)
  - Doorbell to NIC
  - HCA writes CQE
  
RDMA verbs:
  ibv_post_send(qp, wr, &bad_wr);
  ibv_poll_cq(cq, n, wc);
```

RDMA — 1 µs latency·100G+ throughput.

## Phase Bit — Wrap-Around Detection

```c
/* CQ ring */
struct cq_entry {
    /* ... */
    uint8_t phase;
};

void wait_completion(queue_t *q) {
    while (q->cq[q->cq_head].phase != q->expected) {
        cpu_relax();
    }
    /* Got new entry */
    
    q->cq_head++;
    if (q->cq_head == q->cq_size) {
        q->cq_head = 0;
        q->expected ^= 1;   /* Toggle expected phase */
    }
}
```

Device가 *각 entry의 phase bit*를 alternating. Host는 *expected*와 비교 — *new vs stale*.

## Polling vs IRQ

```text
Polling:
  - Latency 매우 낮음 (~ µs)
  - CPU 100% 사용
  - High throughput
  - NVMe·DPDK·SPDK 표준

IRQ:
  - Latency 5-50 µs
  - CPU 자유
  - Coalescing 가능
  - 일반 driver
  
Hybrid:
  - 짧은 시간 poll
  - Idle 후 IRQ로 sleep
```

## DPDK Ring Buffer

```c
struct rte_ring *r = rte_ring_create("my_ring", 1024,
                                       SOCKET_ID_ANY,
                                       RING_F_SP_ENQ | RING_F_SC_DEQ);

/* Producer */
rte_ring_sp_enqueue(r, obj);

/* Consumer */
void *obj;
rte_ring_sc_dequeue(r, &obj);
```

DPDK — *user-space ring*. Bulk enqueue/dequeue도 지원.

## Performance Tuning

```text
1. Cache alignment — SQ/CQ separate cache lines
2. Pre-allocated objects — no malloc in hot path
3. Batched submit — 여러 entries 한 번에
4. Doorbell coalescing — 매 entry 안 함
5. Polling vs IRQ adaptive
```

## Cache Line — Producer·Consumer 분리

```c
struct queue {
    /* Producer fields */
    alignas(64) atomic_uint32_t sq_tail;
    char pad1[64];
    
    /* Consumer fields */
    alignas(64) atomic_uint32_t cq_head;
    char pad2[64];
    
    /* Shared data */
    alignas(64) struct sq_entry sq[SQ_DEPTH];
    struct cq_entry cq[CQ_DEPTH];
};
```

Producer·consumer가 *다른 cache line update* → false sharing 0.

## Batching — Doorbell 줄임

```c
/* 매 SQ entry doorbell */
for (i = 0; i < N; i++) {
    submit_one(...);
    *doorbell = tail;   /* N × MMIO write */
}

/* Batched */
for (i = 0; i < N; i++) {
    submit_one(...);
}
*doorbell = tail;   /* 1 × MMIO write */
```

MMIO write — 수십 cycle. Batching으로 *throughput 10x*.

## NVMe + SPDK 사례

```c
spdk_nvme_qpair_create(ctrlr, NULL);

for (i = 0; i < BATCH; i++) {
    spdk_nvme_ns_cmd_read(ns, qpair, buf[i], lba[i], 1,
                            cb, &ctx[i], 0);
}
spdk_nvme_qpair_process_completions(qpair, 0);   /* poll */
```

SPDK — *user-space NVMe driver*. 1 µs latency·1 M IOPS.

## Cortex-A FPGA + AXI Stream

```c
/* AXI DMA */
volatile uint32_t *dma = ioremap(0xA0000000, 0x1000);

dma[MM2S_CR/4] = 1;   /* Run */
dma[MM2S_SRC_ADDR/4] = (uint32_t)src_phys;
dma[MM2S_LEN/4] = 1024;   /* Start */

while (!(dma[MM2S_SR/4] & IDLE));   /* wait */
```

Xilinx AXI DMA — descriptor chain (SG) + register interface (Simple).

## 자주 하는 실수

> ⚠️ Phase bit 무시

```c
while (cq->status != 0) ...;   /* stale 데이터 보일 수 */
```

→ phase bit + wrap handling.

> ⚠️ Doorbell 매 entry

```c
for (...) {
    sq[tail] = ...;
    *doorbell = tail;   /* MMIO 수십 cycle */
}
```

→ batch + 한 번만 doorbell.

> ⚠️ False sharing — SQ·CQ 같은 line

```c
struct q {
    uint32_t sq_tail;
    uint32_t cq_head;
} q;   /* 같은 line — ping-pong */
```

→ alignas(64).

> ⚠️ MMIO read coalescing 무시

```c
while (1) {
    status = *reg;   /* 매 read MMIO transaction */
}
```

→ readback 줄임 또는 *memory hint*.

## 정리

- CQ·SQ = **2 producer-consumer ring**.
- **NVMe·io_uring·Vulkan·DMA·RDMA** 모두 같은 패턴.
- **Phase bit** — wrap-around fresh/stale 구분.
- **Doorbell**·*polling vs IRQ* 선택.
- **Batching** — MMIO write 줄임.
- **Cache alignment** — producer/consumer 분리.

다음 편은 **DMA Completion**.

## 관련 항목

- [5-01: Mailbox](/blog/embedded/modern-recipes/part5-01-mailbox)
- [5-03: DMA Completion](/blog/embedded/modern-recipes/part5-03-dma-completion)
