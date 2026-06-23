---
title: "Ch 6: FPGA DMA — Descriptor Ring"
date: 2026-05-17T06:00:00
description: "SG·bidirectional·zero-copy — FPGA의 표준 DMA 패턴."
tags: [QEMU, fpga, dma, descriptor-ring, zero-copy]
series: "FPGA Driver via QEMU+VFIO"
seriesOrder: 6
draft: true
---

Ch 4의 *단순* DMA(주소·길이만 register에)는 학습용입니다. *production FPGA*는 **descriptor ring** 패턴을 씁니다 — driver가 *여러 descriptor*를 ring에 채워 두고 doorbell 한 번으로 batch 처리. NIC(mlx5, ena)·NVMe(SQ/CQ)·NPU 모두 이 패턴. 이 장은 fake-fpga에 ring을 더해 driver가 *alloc → prep → submit → wait → complete* 사이클을 돌게 합니다.

## 어떤 문제를 푸는가

단순 DMA(register-write per transfer)는 매 transfer마다 *register write가 여러 번* 일어납니다. NIC 같은 high-rate device에서는 그 자체가 병목이죠. descriptor ring은:

- **Batching** — descriptor 여러 개를 ring에 *한 번에* 채우고 doorbell *한 번*만 write.
- **Scatter-gather** — 큰 buffer를 *여러 page*에 분산해 zero-copy.
- **Async** — driver는 submit 후 다른 일을 하고, completion은 IRQ로.
- **Bidirectional** — H2D ring과 D2H ring을 별도로 관리해 동시 진행.

## Descriptor 구조

표준 형태(NVMe·NIC와 유사).

```c
struct Desc {
    uint64_t addr;    /* host RAM의 IOVA */
    uint32_t len;     /* byte 수 */
    uint16_t flags;   /* SOP, EOP, INT, OWN */
    uint16_t next;    /* chain (or 0 for terminator) */
    uint32_t status;  /* 완료 시 device가 채움 */
    uint32_t reserved;
} __packed;
```

| Flag | 의미 |
|------|------|
| `SOP` | Start of Packet — 새 transfer 시작 |
| `EOP` | End of Packet — transfer 종료 |
| `INT` | 이 descriptor 완료 시 IRQ 발사 |
| `OWN_DEV` | device가 소유 중(driver는 *수정 금지*) |

NIC 같은 packet 단위는 SOP/EOP를 명시. 단일 buffer는 SOP+EOP를 모두 set.

## Ring layout

ring은 *원형 buffer*입니다.

```text
descriptor ring (host RAM, dma_alloc_coherent로 할당)
 ┌──────┬──────┬──────┬──────┬──────┬──────┬──────┬──────┐
 │ d[0] │ d[1] │ d[2] │ d[3] │ d[4] │ d[5] │ d[6] │ d[7] │
 └──────┴──────┴──────┴──────┴──────┴──────┴──────┴──────┘
   ▲                          ▲
   │                          │
  tail (driver 가 채움)       head (device 가 처리)
```

driver는 *tail*에 새 descriptor를 채우고 doorbell write. device는 *head*부터 처리해 완료되면 head 진행 + completion ring에 push.

## Completion ring

별도의 *CR*(Completion Ring)을 두어 완료 정보를 비동기로 driver에 전달합니다.

```c
struct CmplEntry {
    uint32_t desc_id;   /* 어느 descriptor가 완료됐는지 */
    uint32_t status;    /* 결과 코드 */
    uint64_t timestamp; /* 옵션 — performance 측정 */
};
```

driver는 IRQ 시 CR을 *iterate*해 완료된 descriptor들을 batch 처리합니다.

## QEMU 측 — Ring processor

descriptor를 처리하는 BH(Bottom Half).

```c
static void fpga_dma_bh(void *opaque) {
    FakeFPGA *s = opaque;
    DmaChannel *ch = &s->h2c[0];

    while (ch->ring_head != ch->ring_tail) {
        Desc d;
        pci_dma_read(&s->parent,
                     ch->ring_dma + ch->ring_head * sizeof(d),
                     &d, sizeof(d));

        if (!(d.flags & DESC_OWN_DEV)) break;

        g_autofree void *buf = g_malloc(d.len);
        pci_dma_read(&s->parent, d.addr, buf, d.len);

        /* user logic 처리 simulate (여기서는 echo) */
        pci_dma_write(&s->parent, d.addr, buf, d.len);

        /* completion ring에 push */
        CmplEntry ce = { .desc_id = ch->ring_head, .status = 0 };
        pci_dma_write(&s->parent,
                      ch->cr_dma + ch->cr_tail * sizeof(ce),
                      &ce, sizeof(ce));
        ch->cr_tail = (ch->cr_tail + 1) % ch->cr_size;
        ch->ring_head = (ch->ring_head + 1) % ch->ring_size;

        if (d.flags & DESC_INT) {
            msix_notify(&s->parent, ch->msix_vec);
        }
    }
}
```

doorbell write 시 BH 스케줄.

```c
case DMA_CH_DOORBELL:
    ch->ring_tail = val;
    qemu_bh_schedule(s->dma_bh);
    break;
```

BH는 main loop에서 *async*로 호출되어 simulation flow를 막지 않습니다.

## Driver — alloc + submit

5단계 워크플로.

| 단계 | 동작 |
|------|------|
| 1. alloc | `dma_alloc_coherent`로 ring, `dma_map_sg`로 user buffer |
| 2. prep | descriptor 구조체 채우기 |
| 3. submit | tail 갱신 + doorbell write |
| 4. wait | IRQ 또는 CR polling |
| 5. complete | dma_unmap_sg, callback |

```c
struct fpga_xfer {
    struct sg_table *sgt;
    int              n_desc;
    int              first_desc_idx;
    struct completion done;
};

int fpga_submit(struct my_fpga *f, void *buf, size_t len, bool h2c,
                struct fpga_xfer *x) {
    /* page list 생성 + SG mapping (IOMMU 적용) */
    x->sgt = create_sg_from_buf(buf, len);
    dma_map_sg(&f->pdev->dev, x->sgt->sgl, x->sgt->nents,
               h2c ? DMA_TO_DEVICE : DMA_FROM_DEVICE);

    /* descriptor 채우기 */
    struct scatterlist *sg;
    int i;
    for_each_sg(x->sgt->sgl, sg, x->sgt->nents, i) {
        struct Desc d = {
            .addr  = sg_dma_address(sg),
            .len   = sg_dma_len(sg),
            .flags = DESC_OWN_DEV
                   | (i == 0 ? DESC_SOP : 0)
                   | (i == x->sgt->nents - 1 ? DESC_EOP | DESC_INT : 0),
        };
        write_desc(f, h2c ? 0 : 0, i, &d);
    }
    x->n_desc = x->sgt->nents;

    /* doorbell */
    init_completion(&x->done);
    writel(x->n_desc, f->shell_mmio + (h2c ? H2C_DOORBELL : C2H_DOORBELL));

    return 0;
}
```

IRQ에서 complete.

```c
static void fpga_complete_xfer(struct my_fpga *f, struct fpga_xfer *x) {
    dma_unmap_sg(&f->pdev->dev, x->sgt->sgl, x->sgt->nents,
                 DMA_BIDIRECTIONAL);
    complete(&x->done);
}
```

## Multi-queue

각 CPU 코어에 *전용 ring*을 두면 lock-free 처리가 가능합니다.

| 코어 | H2C ring | C2H ring | MSI-X vector |
|------|----------|----------|--------------|
| CPU 0 | h2c[0] | c2h[0] | 0 |
| CPU 1 | h2c[1] | c2h[1] | 1 |
| CPU 2 | h2c[2] | c2h[2] | 2 |
| CPU 3 | h2c[3] | c2h[3] | 3 |

NIC의 `RPS`(Receive Packet Steering)와 `XPS`(Transmit Packet Steering)의 FPGA 변형이라 생각하면 됩니다.

## Zero-copy via dma-buf

userspace에서 *mmap한 page*를 *그대로* DMA 대상으로. 핵심은 `dma-buf` framework.

```c
/* userspace */
int fpga_fd = open("/dev/fpga0", O_RDWR);
struct fpga_alloc_buf req = { .size = 4*1024*1024 };
ioctl(fpga_fd, FPGA_IOCTL_ALLOC_BUF, &req);
/* req.dmabuf_fd로 다른 driver와 share 가능 */

void *buf = mmap(NULL, req.size, PROT_READ|PROT_WRITE,
                 MAP_SHARED, req.dmabuf_fd, 0);
/* 이 buf는 host에 mapped, FPGA에 DMA-able */
```

driver는 `dma_buf_export`로 dma-buf 객체 생성. NPU app이 이 buffer를 *복사 없이* GPU·NIC·다른 FPGA와 공유할 수 있습니다.

## Backpressure

ring이 가득 차면 driver는 *busy*를 반환해야 합니다.

```c
static int fpga_submit_h2c(struct my_fpga *f, ...) {
    u32 head = readl(f->shell_mmio + H2C_HEAD);
    u32 next_tail = (f->h2c_tail + 1) % RING_SIZE;
    if (next_tail == head) return -EBUSY;   /* ring full */
    /* ... */
}
```

상위 layer는 backoff·queue depth control로 대응합니다.

## 정리

- production FPGA는 **descriptor ring** 패턴 — NIC·NVMe·NPU 공통.
- 핵심 자료구조: descriptor(SOP/EOP/INT/OWN) + completion ring + doorbell.
- driver 5단계: alloc(dma_alloc_coherent + dma_map_sg) → prep → submit(doorbell) → wait(IRQ) → complete.
- **Scatter-gather**로 huge buffer를 *여러 page*로 분산해 zero-copy 가능.
- **Multi-queue**: CPU별 ring + MSI-X vector로 lock-free.
- **dma-buf**으로 userspace mmap이 *그대로* DMA 대상. NPU app과 GPU/NIC 사이 직접 공유.
- Ring full 시 backpressure(`-EBUSY`) 반환 → 상위 backoff.

## 다음 장 예고

다음 장은 *bitstream loading* — FPGA의 user logic을 *runtime에* 교체하는 메커니즘. Linux의 fpga_mgr subsystem과 driver 통합을 봅니다.

## 관련 항목

- [Ch 5: FPGA 인터럽트 모델](/blog/tools/emulation/qemu-fpga-driver/chapter05-irq-model)
- [Ch 7: 비트스트림 로딩](/blog/tools/emulation/qemu-fpga-driver/chapter07-bitstream-loading)
- [QEMU Fake Device — SG-DMA](/blog/tools/emulation/qemu-fake-device/chapter14-scatter-gather-dma)
- [NVMe Deep Dive](/blog/embedded/hardware/nvme/chapter01-architecture)
