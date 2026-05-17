---
title: "Ch 6: FPGA DMA — Descriptor Ring"
date: 2025-09-04T06:00:00
description: "SG·bidirectional·zero-copy — FPGA의 표준 DMA 패턴."
tags: [QEMU, fpga, dma, descriptor-ring, zero-copy]
series: "FPGA Driver via QEMU+VFIO"
seriesOrder: 6
draft: true
---

## 이 챕터의 의도

Ch 4의 단순 DMA에 *현실 FPGA가 쓰는* 패턴 — **descriptor ring + SG + bidirectional + completion ring**을 추가. fake-fpga에 NIC/NVMe와 유사한 ring을 만들고 driver가 alloc/prep/submit/wait 사이클을 돈다.

## 핵심 항목

- ✦ FPGA DMA 표준 — descriptor ring (head/tail) + doorbell + completion ring + IRQ
- ✦ **Descriptor 구조** — addr(64b) / len / flags(SOP/EOP/INT) / next / status
- ✦ **Scatter-gather** — large buffer를 여러 page로, page-aligned, IOMMU-mapped
- ✦ **Bidirectional** — H2D (host→device) ring + D2H (device→host) ring 각각
- ✦ Multi-queue — channel당 ring (Ch 5 MSI-X와 1:1)
- ✦ Completion ring (CR) — descriptor 완료 시 CR에 push, IRQ
- ✦ **Zero-copy via dma-buf** — userspace에서 mmap된 buffer 직접 DMA
- ✦ Driver workflow
  1. **alloc** — `dma_alloc_coherent` for ring, `dma_map_sg` for buffer
  2. **prep** — descriptor 작성 (addr, len, flags)
  3. **submit** — ring tail 갱신 + doorbell write
  4. **wait** — completion IRQ 또는 polling on CR
  5. **complete** — buffer unmap, callback
- ✦ QEMU 측 ring processing — `qemu_bh_schedule` 또는 IOThread
- ✦ Backpressure — full ring 시 driver에 busy return
- ✦ NIC (mlx5, ena), NVMe (NVMe SQ/CQ), NPU (TPU PCIe descriptor)가 모두 이 패턴
- ◦ Lockless ring — atomic head/tail, no spinlock

## 다이어그램 (4)

1. Descriptor ring + completion ring 시각화 (head/tail/doorbell/IRQ)
2. SG-DMA — userspace buffer → page list → IOMMU map → descriptor
3. Driver workflow (alloc → prep → submit → wait → complete)
4. Multi-queue per CPU — N channel × N ring × N MSI-X

## 코드 sketch

```c
/* QEMU — ring process (BH) */
static void fpga_dma_bh(void *opaque) {
    FakeFPGA *s = opaque;
    DmaChannel *ch = &s->h2c[0];

    while (ch->ring_head != ch->ring_tail) {
        Desc d;
        pci_dma_read(&s->parent, ch->ring_dma + ch->ring_head * sizeof(d), &d, sizeof(d));
        if (!(d.flags & DESC_OWN_DEV)) break;

        g_autofree void *buf = g_malloc(d.len);
        pci_dma_read(&s->parent, d.addr, buf, d.len);
        /* user logic 처리 simulate (echo or transform) */
        pci_dma_write(&s->parent, d.addr, buf, d.len);

        /* completion ring에 push */
        CmplEntry ce = { .desc_id = ch->ring_head, .status = 0 };
        pci_dma_write(&s->parent, ch->cr_dma + ch->cr_tail * sizeof(ce), &ce, sizeof(ce));
        ch->cr_tail = (ch->cr_tail + 1) % ch->cr_size;
        ch->ring_head = (ch->ring_head + 1) % ch->ring_size;

        if (d.flags & DESC_INT) msix_notify(&s->parent, ch->msix_vec);
    }
}
```

```c
/* Driver — submit + wait */
struct fpga_xfer {
    struct sg_table *sgt;
    dma_addr_t       desc_dma;
    struct completion done;
};

int fpga_submit(struct my_fpga *f, void *buf, size_t len, bool h2c, struct fpga_xfer *x) {
    /* page list 생성 + SG mapping */
    x->sgt = create_sg_from_buf(buf, len);
    dma_map_sg(&f->pdev->dev, x->sgt->sgl, x->sgt->nents, h2c ? DMA_TO_DEVICE : DMA_FROM_DEVICE);

    /* descriptor write */
    struct scatterlist *sg;
    int i;
    for_each_sg(x->sgt->sgl, sg, x->sgt->nents, i) {
        Desc d = {
            .addr  = sg_dma_address(sg),
            .len   = sg_dma_len(sg),
            .flags = (i == 0 ? DESC_SOP : 0) | (i == x->sgt->nents - 1 ? DESC_EOP | DESC_INT : 0) | DESC_OWN_DEV,
        };
        write_desc(f, h2c ? 0 : 0, i, &d);
    }

    /* doorbell */
    init_completion(&x->done);
    writel(x->sgt->nents, f->shell_mmio + (h2c ? H2C_DOORBELL : C2H_DOORBELL));

    return 0;
}

/* IRQ handler에서 complete */
static void fpga_complete_xfer(struct fpga_xfer *x) {
    dma_unmap_sg(&f->pdev->dev, x->sgt->sgl, x->sgt->nents, DMA_BIDIRECTIONAL);
    complete(&x->done);
}
```

## 레퍼런스

- NVMe Spec §4 — SQ/CQ design
- Xilinx XDMA Product Guide — descriptor format
- Linux `Documentation/DMA-API-HOWTO.rst`
- "Zero-copy with dma-buf" — LWN 시리즈

## 관련 항목

- [Ch 4: AXI/PCIe bridge](/blog/tools/emulation/qemu-fpga-driver/chapter04-axi-pcie-bridge)
- [Ch 5: IRQ 모델](/blog/tools/emulation/qemu-fpga-driver/chapter05-irq-model)
- [Ch 7: 비트스트림 로딩](/blog/tools/emulation/qemu-fpga-driver/chapter07-bitstream-loading)
- [QEMU Fake Device Ch 14: SG-DMA](/blog/tools/emulation/qemu-fake-device/chapter14-scatter-gather-dma)
