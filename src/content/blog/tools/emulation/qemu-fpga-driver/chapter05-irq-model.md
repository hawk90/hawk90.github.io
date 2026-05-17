---
title: "Ch 5: FPGA 인터럽트 모델"
date: 2025-09-04T05:00:00
description: "MSI-X·user IRQ multiplexing — FPGA의 IRQ 토폴로지."
tags: [QEMU, msi-x, fpga, user-irq]
series: "FPGA Driver via QEMU+VFIO"
seriesOrder: 5
draft: true
---

## 이 챕터의 의도

FPGA는 수십에서 수천 개의 IRQ source(DMA 채널, user logic 이벤트)를 가질 수 있다. MSI-X가 이를 vector별로 분리해 주어 driver가 깔끔하게 처리할 수 있다. 이 장에서는 fake-fpga에 MSI-X, user IRQ multiplex, polling fallback을 차례로 더한다.

## 핵심 항목

- ✦ FPGA IRQ source — DMA 채널 완료, user logic 이벤트, error
- ✦ **MSI-X** — vector 최대 2048개 (PCIe), per-IRQ table entry
- ✦ vs Legacy INTx (1 line shared) — FPGA에 부적합
- ✦ vs MSI (최대 32 vector, contiguous) — FPGA에 충분치 않음 → MSI-X 선택
- ✦ QEMU `msix_init_exclusive_bar` — BAR 하나를 MSI-X table로
- ✦ `msix_notify(pdev, vector)` — 특정 vector trigger
- ✦ User IRQ multiplexing — N개 user IRQ source → K개 MSI-X vector (보통 N>K, OR로 묶음)
- ✦ Per-channel IRQ enable/mask — driver가 채널 단위로 on/off
- ✦ Edge vs level — MSI-X는 edge 만, 그래서 *latch + clear* 패턴 필요
- ✦ Driver — `pci_alloc_irq_vectors(pdev, n, n, PCI_IRQ_MSIX)`, `request_irq` per vector
- ✦ `threaded_irq` — hard IRQ handler에서 wake_up + thread 처리
- ✦ Latency budget — IRQ handler에서 *짧게* (< 10µs), heavy work는 thread/tasklet
- ✦ Polling fallback — high-rate (>100k IRQ/s) 시 IRQ disable + NAPI 스타일 poll
- ✦ Pattern — NPU per-job IRQ, smartNIC per-queue, HFT 매우 낮은 latency 요구
- ◦ MSI-X PBA (Pending Bit Array) — pending 추적

## 다이어그램 (4)

1. FPGA IRQ source → user IRQ multiplexer → MSI-X vector
2. MSI-X table layout (address, data, vector control per entry)
3. Driver IRQ handling — hard IRQ (latch) → thread (heavy work)
4. Polling fallback 흐름 (high rate 감지 시)

## 코드 sketch

```c
/* QEMU fake-fpga — MSI-X + user IRQ */
static void fpga_user_irq_raise(FakeFPGA *s, int source_id) {
    /* user IRQ multiplex: 32 source → 8 vector (4:1) */
    int vector = source_id / 4;
    s->user_irq_pending[vector] |= (1 << (source_id % 4));
    if (!(s->user_irq_mask[vector] & (1 << (source_id % 4))))
        msix_notify(&s->parent, vector);
}

/* Driver clear — IRQ handler 안 */
static void fpga_user_irq_clear(struct my_fpga *f, int vector, u32 mask) {
    writel(mask, f->shell_mmio + USER_IRQ_PENDING(vector));
}
```

```c
/* Driver — MSI-X 등록 + threaded handler */
static int my_fpga_setup_irq(struct my_fpga *f) {
    int n = pci_alloc_irq_vectors(f->pdev, 8, 8, PCI_IRQ_MSIX);
    if (n < 8) return -ENOSPC;

    for (int v = 0; v < n; v++) {
        int irq = pci_irq_vector(f->pdev, v);
        int ret = request_threaded_irq(irq,
                                        fpga_hard_irq,        /* fast */
                                        fpga_threaded_irq,    /* slow */
                                        IRQF_SHARED, "my-fpga", &f->vec[v]);
        if (ret) return ret;
    }
    return 0;
}

static irqreturn_t fpga_hard_irq(int irq, void *dev_id) {
    struct vec_data *v = dev_id;
    u32 pending = readl(v->fpga->shell_mmio + USER_IRQ_PENDING(v->idx));
    if (!pending) return IRQ_NONE;
    writel(pending, v->fpga->shell_mmio + USER_IRQ_PENDING(v->idx));  /* clear */
    v->pending = pending;
    return IRQ_WAKE_THREAD;
}

static irqreturn_t fpga_threaded_irq(int irq, void *dev_id) {
    struct vec_data *v = dev_id;
    process_user_event(v->fpga, v->pending);   /* heavy work */
    return IRQ_HANDLED;
}
```

## 레퍼런스

- PCIe Base Spec §6.8 (MSI-X capability)
- Linux `Documentation/PCI/MSI-HOWTO.rst`
- QEMU `hw/pci/msix.c`
- "FPGA-based Accelerators IRQ handling" — Xilinx XDMA driver

## 관련 항목

- [Ch 4: AXI/PCIe bridge](/blog/tools/emulation/qemu-fpga-driver/chapter04-axi-pcie-bridge)
- [Ch 6: DMA descriptor ring](/blog/tools/emulation/qemu-fpga-driver/chapter06-dma-descriptor-ring)
- [PCIe Ch 5: Interrupts](/blog/embedded/hardware/pcie/) (기존)
- [QEMU Fake Device Ch 6: IRQ](/blog/tools/emulation/qemu-fake-device/chapter06-irq) (기존)
