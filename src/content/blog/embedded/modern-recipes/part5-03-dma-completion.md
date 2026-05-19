---
title: "5-03: DMA Completion — Interrupt·Polling·Completion Ring 골라 쓰기"
date: 2026-05-07T21:00:00
description: "DMA가 끝났음을 알려주는 세 가지 방식을 비교합니다. Interrupt, polling, completion ring과 IRQ coalescing의 trade-off를 정리합니다."
series: "Modern Embedded Recipes"
seriesOrder: 27
tags: [recipes, dma, completion, interrupt, polling]
---

## 한 줄 요약

> **"DMA가 끝났음을 알리는 방법은 interrupt, polling, completion ring 세 가지이고, transfer 크기와 latency 요구에 따라 다르게 고릅니다."** 셋을 섞은 hybrid가 보통의 실전 답입니다.

## 어떤 상황에서 쓰나

UART RX 한 글자에 IRQ를 쏘면 CPU가 1 Mbps만으로도 30% 가까이 묶입니다. 반대로 NVMe IOPS 1 M을 처리할 때 매 4 KB 전송마다 IRQ를 쏘면 IRQ entry/exit 비용만으로 CPU가 폭주합니다.

같은 "DMA 완료를 어떻게 알 것인가"라는 질문이지만, audio·sensor·UART·NIC·NVMe·FPGA가 답을 다르게 가져갑니다. Completion 처리 패턴 세 가지를 알고 있으면 새로운 device를 봐도 어디부터 손대야 할지 보입니다.

## 핵심 개념

세 가지 방식은 latency·CPU 비용·throughput 축에서 균형이 다릅니다.

```text
Interrupt
  - latency 5-30 µs (entry/exit + ISR)
  - CPU 사용 적음 (idle 가능)
  - 큰 transfer / 낮은 빈도에 유리

Polling
  - latency sub-µs
  - CPU 한 코어 100%
  - 짧은 transfer / 매우 높은 빈도 (NVMe SPDK, DPDK)

Completion ring
  - device가 descriptor에 결과를 적음
  - CPU가 ring을 batch로 읽음
  - IRQ coalescing(N개 또는 M µs마다 1 IRQ)과 결합
  - NIC·NVMe·XDMA 표준
```

Completion ring은 사실 위 두 가지를 합친 모델입니다. 평소에는 batched IRQ, busy할 때는 잠시 polling으로 바뀌는 NAPI나 SPDK polling이 그 자연스러운 결과입니다.

## 코드 / 실제 사용 예

### 기본 interrupt 모델

```c
volatile bool dma_done;

void DMA_IRQHandler(void) {
    if (DMA->ISR & TCIF) {
        DMA->IFCR = TCIF_CLR;
        dma_done = true;
    }
}

void wait_dma(void) {
    while (!dma_done) __WFI();   /* IRQ가 깨움 */
    dma_done = false;
}
```

Cortex-M에서 가장 직관적인 형태입니다. 짧은 transfer에는 IRQ entry/exit 비용이 transfer 시간보다 길어집니다.

### Polling 모델

```c
HAL_DMA_Start(&hdma, src, dst, len);
while (!(DMA->ISR & TCIF))
    ;                            /* busy-wait */
DMA->IFCR = TCIF_CLR;
```

512 byte 같은 짧은 transfer를 µs 안에 끝내야 할 때 polling이 더 빠릅니다. 다만 CPU가 그 시간 동안 다른 일을 못 합니다.

### Completion ring (NIC RX 패턴)

```c
struct rx_desc {
    uint64_t buf_addr;
    uint16_t len;
    uint16_t flags;              /* DD = Descriptor Done */
    uint32_t rss_hash;
};

#define RING_SIZE 1024
struct rx_desc rx_ring[RING_SIZE];
int rx_head;                      /* CPU consumer */

int rx_reap(struct rx_desc **out, int max) {
    int n = 0;
    while (n < max) {
        struct rx_desc *d = &rx_ring[rx_head];
        if (!(d->flags & FLAG_DD))
            break;                /* device가 아직 안 채움 */
        out[n++] = d;
        d->flags = 0;             /* re-arm */
        rx_head = (rx_head + 1) % RING_SIZE;
    }
    writel(rx_head, NIC_REG_RX_HEAD);
    return n;
}
```

ISR은 한 번만 깨우고, 실제 처리는 NAPI poll context에서 ring을 batch로 훑습니다.

### Interrupt coalescing 설정

```c
/* 매 IRQ가 너무 자주면 throughput 손해 */
nic_set_rx_coalesce(&dev, .max_pkts = 32, .max_us = 64);
/* 32개 packet 또는 64 µs 중 먼저 만족하면 1 IRQ */
```

Latency-sensitive(VoIP, RT control)이면 `max_us`를 작게, throughput 우선(스토리지 backup)이면 크게 잡습니다.

### Hybrid — busy일 때 polling, idle일 때 IRQ

```c
int reap_and_maybe_sleep(struct queue *q) {
    int n = q_reap_batch(q, 32);

    if (n > 0) {
        consecutive_idle = 0;
        return n;
    }

    if (++consecutive_idle > 1000) {
        enable_irq(q->irq);
        wait_event_interruptible(q->wait, q_has_completion(q));
        disable_irq(q->irq);
        consecutive_idle = 0;
    }
    return 0;
}
```

SPDK·NVMe poll mode, NAPI, DPDK rx_burst가 모두 이 형태입니다. Burst가 있을 때는 polling으로 latency를 깎고, 한가할 때는 IRQ로 CPU를 양보합니다.

### Linux NAPI 골격

```c
static int my_napi_poll(struct napi_struct *napi, int budget) {
    int done = 0;
    while (done < budget) {
        struct sk_buff *skb = rx_reap_one();
        if (!skb) break;
        napi_gro_receive(napi, skb);
        done++;
    }

    if (done < budget) {
        napi_complete_done(napi, done);
        enable_irq(rx_irq);          /* idle → IRQ 다시 켬 */
    }
    return done;
}
```

`budget`은 한 번 polling에서 처리할 최대 개수입니다. 큰 burst가 들어오면 budget까지 처리하고 다음 sched tick에 다시 들어옵니다.

### Cortex-M cyclic DMA + half/full IRQ

```c
HAL_UART_Receive_DMA(&huart, rx_buf, 4096);   /* cyclic */

void HAL_UART_RxHalfCpltCallback(UART_HandleTypeDef *h) {
    process(&rx_buf[0], 2048);
}
void HAL_UART_RxCpltCallback(UART_HandleTypeDef *h) {
    process(&rx_buf[2048], 2048);
}
```

DMA가 buffer를 wrap하면서 절반·전체 시점에 IRQ를 한 번씩 쏩니다. CPU는 batch로 처리할 수 있어 byte당 IRQ보다 훨씬 가볍습니다.

### 완료 확인 후 release 순서

```c
e = &cq[cq_head];
if (e->phase != expected) return 0;

dma_rmb();                          /* phase 확인 → payload 읽기 */
process(e->result);

e->phase = !expected;               /* slot 재사용 가능 표시 */
cq_head = (cq_head + 1) % depth;
writel(cq_head, cq_doorbell);
```

`dma_rmb()`를 빼면 OoO CPU에서 payload가 phase보다 먼저 읽혀 옛 값을 잡습니다.

## 측정 / 성능 비교

UART 1 Mbps 입력을 세 방식으로 받아 본 결과입니다.

```text
방식                          CPU 사용     latency 변동
byte당 IRQ                    32%          작음 (수 µs)
DMA cyclic + half/full IRQ    0.6%         작음
DMA cyclic + polling          1.5%         가장 작음 (sub-µs)
```

NVMe 4 KB 랜덤 read에서는 양상이 다릅니다.

```text
방식                          QD=1 lat    QD=32 IOPS    CPU/IOP
IRQ-driven (kernel)           65 µs       420 k         높음
Hybrid NAPI 방식              48 µs       900 k         중간
SPDK polling                  12 µs       2.4 M         가장 낮음 (per IOP)
```

IRQ 한 번의 비용은 보통 1.5-3 µs입니다. Transfer가 그보다 짧으면 polling이 이깁니다. 길어지면 IRQ 비용이 무뎌지고 CPU를 양보하는 IRQ 모델이 유리해집니다.

## 자주 보는 함정

> Polling에 cpu_relax 누락

```c
while (!(reg & DONE)) ;            /* 코어 100% 가열, cache line 점유 */
```

`cpu_relax()`(또는 `__yield()`, `PAUSE`)을 넣으면 hyperthread를 양보하고 spinlock 친구를 덜 굶깁니다.

> IRQ coalescing 과도

```c
nic_set_rx_coalesce(.max_us = 1000);   /* 1 ms */
```

Throughput은 좋아 보이지만 latency가 1 ms로 묶입니다. VoIP·게임·자율주행 control 경로에서는 치명적입니다. p99 latency를 함께 측정하지 않으면 못 잡습니다.

> Phase·DD 확인 전 payload 읽기

```c
process(e->result);                 /* phase 확인 전 */
if (e->phase != expected) return;
```

순서가 뒤집히면 stale data를 처리합니다. `if (phase != expected) return; dma_rmb(); process(...);`로 막습니다.

> Completion 처리 후 ring slot 재사용 안 표시

ring의 다음 한 바퀴에서 device가 같은 slot에 새 entry를 쓰는데, host가 phase 토글이나 ownership 비트를 갱신하지 않으면 device가 *옛 entry를 다시 처리*하는 사고가 납니다.

> ISR 안에서 무거운 work

```c
void DMA_IRQHandler(void) {
    parse_packet();                 /* µs 단위 작업 */
    decrypt();                      /* 수십 µs */
}
```

ISR은 짧게 두고 무거운 처리는 thread·tasklet·NAPI poll로 미룹니다. ISR이 길면 다른 IRQ가 묶입니다.

> Half complete만, 또는 full complete만 사용

Cyclic DMA에서 half complete만 처리하면 buffer 두 번째 반을 못 보고, full complete만 처리하면 latency가 두 배가 됩니다. 두 callback을 모두 등록해야 double-buffer 효과가 납니다.

## 정리

- DMA 완료는 interrupt, polling, completion ring 세 패턴으로 갈립니다.
- Interrupt는 가장 일반적이지만 짧은 transfer에는 entry/exit 비용이 큽니다.
- Polling은 latency가 최저이지만 CPU 한 코어를 차지합니다.
- Completion ring + IRQ coalescing이 NIC·NVMe·XDMA의 기본 모델입니다.
- Hybrid(busy면 poll, idle이면 IRQ)는 SPDK·NAPI가 보여주는 자연스러운 절충입니다.
- Cyclic DMA + half/full IRQ는 Cortex-M에서 UART·audio·sensor용 표준 패턴입니다.
- Phase·DD 비트 확인 전 payload를 읽지 않습니다. `dma_rmb`로 순서를 박습니다.
- 측정은 항상 throughput과 p99 latency를 같이 봅니다. IRQ coalescing을 과하게 잡으면 throughput만 좋아 보입니다.

다음 편은 **PCIe Streaming**입니다.

## 관련 항목

- [5-02: CQ·SQ](/blog/embedded/modern-recipes/part5-02-cq-sq)
- [5-04: PCIe Streaming](/blog/embedded/modern-recipes/part5-04-pcie-streaming)
- [3-02: DMA Allocator](/blog/embedded/modern-recipes/part3-02-dma-allocator)
- [PE 3-05: Interrupt Latency](/blog/embedded/performance-engineering/part3-05-interrupt-latency)
