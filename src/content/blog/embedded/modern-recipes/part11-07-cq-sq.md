---
title: "11-07: Command Queue·Submission Queue — NVMe·XDMA가 공유하는 패턴"
date: 2026-05-17T09:00:00
description: "Submission/Completion Queue 패턴을 NVMe·io_uring·Xilinx XDMA·Vulkan 사례로 묶어 정리합니다. Doorbell, phase bit, multi-queue 확장까지."
series: "Modern Embedded Recipes"
seriesOrder: 129
tags: [recipes, cq, sq, nvme, xdma, io_uring]
---

## 한 줄 요약

> **"SQ·CQ는 producer-consumer ring 두 줄과 doorbell 하나로 host와 device를 비동기로 잇는 구조입니다."** NVMe, Xilinx XDMA, io_uring, RDMA, Vulkan은 표면이 달라도 안쪽 토폴로지는 거의 같습니다.

## 어떤 상황에서 쓰나

Mailbox 한 쌍으로는 한 번에 한 명령만 발사할 수 있어, 1 µs latency device에 깊은 queue를 채우기 어렵습니다. NVMe SSD가 한 디스크에서 1 M IOPS를 끌어내려면 host가 명령을 쉬지 않고 ring에 push해야 합니다.

Xilinx XDMA 위에 올린 가속기, custom FPGA streaming engine, NIC RX/TX, GPU draw call도 같은 요구가 있습니다. "host와 device가 서로 막지 않고 흐름이 끊기지 않게" 만드는 표준 답이 SQ·CQ ring 쌍입니다.

io_uring과 SPDK가 application 단에서 이 모델을 그대로 노출했기 때문에 NVMe 외에도 익숙해질 가치가 큽니다.

## 핵심 개념

Host와 device가 SQ·CQ 두 ring과 doorbell을 어떻게 주고받는지 그림으로 정리합니다.

![NVMe SQ/CQ flow — host와 device의 비동기 통신](/images/blog/modern-recipes/diagrams/part5-02-cq-sq-flow.svg)

기본 구조는 두 ring입니다.

```text
SQ (Submission Queue)   host writes ─→ device reads
CQ (Completion Queue)   device writes ─→ host reads

Tail pointer            producer가 다음 쓸 자리
Head pointer            consumer가 다음 읽을 자리
Doorbell                상대편 pointer를 device에 알림 (MMIO write)
Phase bit               wrap-around에서 새/stale 구분
```

Tail = Head이면 비어 있고, (Tail + 1) % depth = Head이면 가득 차 있습니다. Producer가 entry 한 개를 채울 때마다 도어벨을 치면 MMIO 비용이 너무 큽니다. 따라서 batched submit이 표준입니다.

Multi-queue는 같은 패턴을 그대로 복제합니다. NVMe는 admin SQ/CQ 한 쌍과 IO SQ/CQ N쌍을 두고, 각 IO queue를 한 CPU에 고정합니다. 한 queue가 한 CPU 안에서만 쓰이므로 lock이 거의 없어 scalability가 선형으로 늘어납니다.

## 코드 / 실제 사용 예

### 단순 SQ·CQ 한 쌍

```c
struct sqe {
    uint8_t  opcode;
    uint8_t  flags;
    uint16_t cmd_id;
    uint64_t addr;
    uint32_t len;
    uint32_t reserved;
};

struct cqe {
    uint32_t result;
    uint16_t cmd_id;
    uint8_t  status;
    uint8_t  phase;
};

struct queue {
    struct sqe *sq;          /* dma_alloc_coherent */
    struct cqe *cq;
    uint16_t    sq_depth, cq_depth;
    uint16_t    sq_tail;     /* producer */
    uint16_t    cq_head;     /* consumer */
    uint8_t     cq_phase;
    uint32_t   *sq_doorbell; /* MMIO */
    uint32_t   *cq_doorbell;
};
```

Submit과 reap을 분리해 둡니다.

```c
int q_submit(struct queue *q, const struct sqe *cmd) {
    uint16_t next = (q->sq_tail + 1) % q->sq_depth;
    if (next == READ_ONCE(q->sq_head_shadow))
        return -EAGAIN;                  /* full */

    q->sq[q->sq_tail] = *cmd;
    dma_wmb();                            /* entry → device 가시화 */

    q->sq_tail = next;
    return 0;
}

void q_flush_doorbell(struct queue *q) {
    writel(q->sq_tail, q->sq_doorbell);   /* batch end */
}

int q_reap(struct queue *q, struct cqe *out) {
    struct cqe *e = &q->cq[q->cq_head];
    if (e->phase != q->cq_phase)
        return 0;                          /* no new */

    *out = *e;

    if (++q->cq_head == q->cq_depth) {
        q->cq_head  = 0;
        q->cq_phase ^= 1;
    }
    writel(q->cq_head, q->cq_doorbell);
    return 1;
}
```

`phase` 비트는 device가 새 CQE를 쓸 때 토글합니다. Host는 자신이 기대하는 phase와 비교해 *방금 도착한 entry*만 처리합니다. ABA 없이 wrap을 처리하는 표준 기법입니다.

### NVMe identify command

NVMe는 SQE 크기가 64 B, CQE가 16 B로 고정입니다. 가장 단순한 admin 명령인 Identify는 다음처럼 채웁니다.

```c
struct nvme_sqe identify = {
    .opcode = 0x06,                /* Identify */
    .cid    = next_cid(),
    .nsid   = 0,
    .prp1   = identify_buf_dma,    /* 4 KB destination */
    .cdw10  = 1,                   /* CNS = Controller */
};

q_submit(admin, &identify);
q_flush_doorbell(admin);

struct nvme_cqe c;
while (!q_reap(admin, &c))
    cpu_relax();
```

Read/write 명령도 SQE layout만 바뀔 뿐, ring 운용 방식은 같습니다.

### Xilinx XDMA host driver의 H2C/C2H queue

```c
/* XDMA descriptor ring — H2C (Host → Card) */
struct xdma_desc {
    uint32_t control;
    uint32_t len;
    uint64_t src_addr;
    uint64_t dst_addr;
    uint64_t next_desc;
};

xdma_desc_t *d = &h2c_ring[tail];
d->src_addr = host_phys;
d->dst_addr = card_addr;
d->len      = 8192;
d->control  = XDMA_DESC_STOP | XDMA_DESC_COMPL;

writel(tail, &xdma_regs->h2c_doorbell);
```

XDMA는 SQE 대신 descriptor라는 이름을 쓰지만 호스트가 ring에 채우고 doorbell로 알리는 흐름은 NVMe와 같습니다. C2H(카드 → 호스트) ring이 CQ 역할을 합니다.

### io_uring — 사용자 공간에서 그대로 쓰는 SQ·CQ

```c
struct io_uring ring;
io_uring_queue_init(64, &ring, 0);

struct io_uring_sqe *sqe = io_uring_get_sqe(&ring);
io_uring_prep_read(sqe, fd, buf, 4096, 0);
io_uring_sqe_set_data(sqe, ctx);

io_uring_submit(&ring);

struct io_uring_cqe *cqe;
io_uring_wait_cqe(&ring, &cqe);
process(io_uring_cqe_get_data(cqe), cqe->res);
io_uring_cqe_seen(&ring, cqe);
```

여기서 SQ·CQ는 host와 kernel이 공유합니다. NVMe와 다른 점은 "device"가 kernel일 뿐, ring 구조 자체는 동일합니다.

### Multi-queue로 확장

```c
for (int cpu = 0; cpu < n_cpus; cpu++) {
    queue[cpu] = alloc_queue(depth);
    bind_irq(queue[cpu]->irq, cpu);     /* MSI-X vector → CPU */
}

void issue(struct bio *bio) {
    int cpu = smp_processor_id();
    q_submit(queue[cpu], &cmd);          /* lock 없음 */
    q_flush_doorbell(queue[cpu]);
}
```

각 CPU가 자기 queue에만 접근하면 cache line bounce와 spinlock이 사라집니다. NVMe 표준은 정확히 이 모델을 가정합니다.

### Doorbell 배치(batching)

```c
for (int i = 0; i < BATCH; i++)
    q_submit(q, &cmds[i]);

q_flush_doorbell(q);                     /* MMIO write 1번 */
```

매 SQE마다 도어벨을 치면 NVMe Gen3 NVMe SSD에서 IOPS가 절반 이하로 떨어집니다. 가능한 모든 명령을 push한 뒤 마지막에 한 번 쓰는 것이 표준 패턴입니다.

## 측정 / 성능 비교

같은 NVMe SSD를 어떻게 다루느냐에 따라 IOPS와 latency가 크게 갈립니다.

```text
모델                     QD=1 IOPS   QD=32 IOPS   p99 latency
Single queue + IRQ       180 k       420 k         95 µs
16 queue + IRQ           180 k       1.6 M         55 µs
SPDK polling (VFIO)      280 k       2.4 M         12 µs
```

Xilinx XDMA에서 H2C 8 KB transfer 측정 예입니다.

```text
방식                       throughput
SQE 1개씩 doorbell         2.1 GB/s
SQE 32개 batched           6.8 GB/s
SG descriptor chain        7.4 GB/s (PCIe Gen3 x8 실효 한계)
```

Batching과 multi-queue가 SQ·CQ 모델의 진짜 가치를 끌어냅니다. 단일 queue에 매번 도어벨을 치는 구현은 device가 아무리 빨라도 PCIe MMIO 비용에 묶입니다.

## 자주 보는 함정

> Phase bit 무시하고 status로 판단

```c
while (cq->status != 0) ;     /* wrap된 옛 entry가 status != 0 */
```

Wrap이 일어난 위치의 옛 CQE는 status 필드에 이전 값이 남아 있을 수 있습니다. Phase bit를 보지 않으면 새 entry가 아닌 데이터를 처리합니다.

> Tail/head를 atomic 없이 멀티스레드 공유

```c
q->sq_tail++;
writel(q->sq_tail, doorbell);
```

여러 스레드가 같은 queue에 submit하면 tail이 깨집니다. Multi-queue로 분리하거나 한 queue를 lock으로 보호합니다.

> dma_wmb 누락

```c
q->sq[tail] = *cmd;
writel(tail + 1, doorbell);   /* device가 옛 SQE를 읽을 수 있음 */
```

SQE memory write와 doorbell MMIO write 사이에 `dma_wmb()`(또는 `wmb()`)가 없으면 device가 stale entry를 처리합니다.

> CQ doorbell 안 씀

```c
q_reap(q, &cqe);
/* writel(cq_head, cq_doorbell) 누락 */
```

CQ head를 device에 알리지 않으면 device가 CQ가 가득 찼다고 판단해 새 completion을 못 씁니다.

> SQ full 검사 누락

```c
q->sq[q->sq_tail] = *cmd;    /* head 위에 덮어 씀 */
q->sq_tail++;
```

ring overflow는 *조용한 데이터 손상*입니다. submit 직전 (tail + 1) == head 검사를 반드시 둡니다.

> 한 CPU가 모든 queue를 polling

Multi-queue를 만들었는데 reaper 스레드 하나가 모든 CQ를 polling하면 multi-queue의 의미가 사라집니다. CQ별로 affinity가 같은 스레드에 묶어야 cache hit가 살아납니다.

## 정리

- SQ·CQ는 두 ring과 doorbell, phase bit로 구성되는 표준 패턴입니다.
- NVMe·io_uring·Xilinx XDMA·RDMA·Vulkan이 같은 구조를 공유합니다.
- Tail/head는 producer/consumer 사이의 contract이고, doorbell은 그 변화를 상대에게 알리는 신호입니다.
- Phase bit가 ABA 없이 wrap을 처리합니다.
- Batched submit으로 MMIO doorbell 비용을 줄입니다.
- Multi-queue를 CPU에 묶으면 lock 없이 선형 scalability를 얻습니다.
- dma_wmb와 SQ full check, CQ doorbell 갱신은 production에서 빠뜨리면 침묵하게 깨지는 항목입니다.
- 측정은 항상 queue depth와 batch size를 같이 기록합니다. 한 숫자만으로는 비교가 안 됩니다.

다음 편은 **DMA Completion**입니다.

## 관련 항목

- [5-01: Mailbox](/blog/embedded/modern-recipes/part5-01-mailbox)
- [5-03: DMA Completion](/blog/embedded/modern-recipes/part5-03-dma-completion)
- [4-04: UIO·VFIO](/blog/embedded/modern-recipes/part4-04-uio-vfio)
- [PE 3-03: DMA Performance](/blog/embedded/performance-engineering/part3-03-dma-performance)
