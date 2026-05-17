---
title: "Ch 4: AXI ↔ PCIe Bridge 모방"
date: 2025-09-04T04:00:00
description: "Register map·DMA engine emulation — FPGA shell의 핵심 부분."
tags: [QEMU, axi, pcie-bridge, dma-engine]
series: "FPGA Driver via QEMU+VFIO"
seriesOrder: 4
draft: true
---

## 이 챕터의 의도

Ch 3의 fake-fpga에 **AXI↔PCIe bridge** (실 FPGA의 *shell* 핵심부)를 모방. 목표는 driver가 *Xilinx XDMA / Intel DMA IP와 같은 register layout*을 보게 하는 것. 그러면 *driver 코드가 그대로 실 FPGA에서 동작*한다.

## 핵심 항목

- ✦ AXI ↔ PCIe TLP 변환의 의미 — host PCIe TLP가 FPGA 내부 AXI 트랜잭션으로
  - PCIe MMIO write → AXI4-Lite write (CSR 영역)
  - PCIe MMIO read → AXI4-Lite read
  - PCIe DMA → AXI4 burst read/write
- ✦ **Shell register block** 모방 (Xilinx XDMA layout)
  - `XDMA_REG_IDENT` (0x0000) — "XLNX" magic
  - `XDMA_REG_CTRL` (0x0004) — enable, mode
  - `XDMA_REG_STATUS` (0x0040)
  - `XDMA_REG_IRQ_*` (0x0090~)
- ✦ **DMA engine register** (channel별)
  - SQH (Submission Queue Head/Tail), CQH/CQT
  - source addr, dest addr, length, command, status
  - direction — H2C (host→card), C2H (card→host)
- ✦ Doorbell — write-only, side-effect = process queue
- ✦ Completion queue — descriptor 완료 시 status word + IRQ
- ✦ Endianness — 실 FPGA가 little-endian가 표준, alignment 4 bytes
- ✦ Xilinx XDMA / Intel DMA IP와 호환되는 register layout — 그래야 driver 재사용
- ✦ Channel 다중 — H2C0, H2C1, C2H0, C2H1 ... 보통 4-16
- ✦ Per-channel BAR 또는 stride
- ✦ Driver가 같은 layout으로 talk → 실 FPGA migration 시 *코드 무수정*
- ◦ Streaming DMA (AXI-Stream)과 Memory-mapped DMA (AXI-MM) 둘 다 emulate

## 다이어그램 (4)

1. AXI ↔ PCIe TLP 변환 매트릭스 (PCIe op → AXI op)
2. Shell register block layout (XDMA 호환)
3. DMA channel register set (H2C0, C2H0, ...)
4. Doorbell + completion queue 흐름

## 코드 sketch

```c
/* QEMU fake-fpga에 shell registers 추가 */
#define SHELL_IDENT     0x0000
#define SHELL_VERSION   0x0008
#define SHELL_CTRL      0x0004
#define SHELL_STATUS    0x0040
#define SHELL_IRQ_MASK  0x0094

#define DMA_CH(n) (0x4000 + (n) * 0x100)
#define DMA_CH_CTRL    0x00
#define DMA_CH_STATUS  0x04
#define DMA_CH_SRC_LO  0x10
#define DMA_CH_SRC_HI  0x14
#define DMA_CH_DST_LO  0x18
#define DMA_CH_DST_HI  0x1C
#define DMA_CH_LEN     0x20
#define DMA_CH_GO      0x24   /* doorbell */

typedef struct DmaChannel {
    uint64_t src, dst;
    uint32_t len;
    uint32_t ctrl, status;
    bool busy;
} DmaChannel;

typedef struct FakeFPGA {
    /* ... 위 Ch3 base ... */
    DmaChannel h2c[4], c2h[4];
} FakeFPGA;

/* DMA doorbell — go bit write 시 처리 */
static void dma_go(FakeFPGA *s, DmaChannel *ch, bool h2c) {
    g_autofree void *buf = g_malloc(ch->len);
    if (h2c) {
        pci_dma_read(&s->parent, ch->src, buf, ch->len);
        /* fake processing — user logic 자리에 그냥 echo */
        pci_dma_write(&s->parent, ch->dst, buf, ch->len);
    } else {
        /* generate test data card→host */
        memset(buf, 0xa5, ch->len);
        pci_dma_write(&s->parent, ch->dst, buf, ch->len);
    }
    ch->status |= DMA_STATUS_DONE;
    msix_notify(&s->parent, ch->msix_vec);   /* IRQ */
}
```

```c
/* Driver 측 — XDMA 호환 등록 (실 FPGA와 같은 코드) */
static void xfer_h2c(struct my_fpga *f, dma_addr_t src, dma_addr_t dst, u32 len) {
    void __iomem *ch = f->shell_mmio + DMA_CH(0);
    writel((u32)src, ch + DMA_CH_SRC_LO);
    writel((u32)(src >> 32), ch + DMA_CH_SRC_HI);
    writel((u32)dst, ch + DMA_CH_DST_LO);
    writel((u32)(dst >> 32), ch + DMA_CH_DST_HI);
    writel(len, ch + DMA_CH_LEN);
    writel(1, ch + DMA_CH_GO);   /* doorbell */
}
```

## 레퍼런스

- Xilinx XDMA Product Guide PG195
- Intel HSSI / DMA IP user guide
- ARM AMBA AXI4 spec
- QEMU `hw/dma/` — 기존 DMA engine 참고

## 관련 항목

- [Ch 3: QEMU fake FPGA](/blog/tools/emulation/qemu-fpga-driver/chapter03-qemu-fake-fpga)
- [Ch 5: FPGA 인터럽트 모델](/blog/tools/emulation/qemu-fpga-driver/chapter05-irq-model)
- [Ch 6: DMA descriptor ring](/blog/tools/emulation/qemu-fpga-driver/chapter06-dma-descriptor-ring)
- [QEMU Fake Device Ch 14 SG-DMA](/blog/tools/emulation/qemu-fake-device/chapter14-scatter-gather-dma)
