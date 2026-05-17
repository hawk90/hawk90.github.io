---
title: "Ch 2: FPGA 아키텍처 Review"
date: 2025-09-04T02:00:00
description: "Shell·user logic·AXI·PCIe bridge — driver가 봐야 할 layer."
tags: [QEMU, fpga, shell, axi, pcie-bridge]
series: "FPGA Driver via QEMU+VFIO"
seriesOrder: 2
draft: true
---

## 이 챕터의 의도

Driver는 *FPGA 내부 회로*를 안 봐도 되지만 *driver가 봐야 할 layer* — PCIe endpoint·shell·user logic·AXI 인터페이스는 알아야 한다. 본 챕터는 driver 관점에서 FPGA를 3-layer로 분해.

## 핵심 항목

- ✦ FPGA의 driver 관점 3-layer
  1. **PCIe endpoint** — host와 통신 인터페이스 (BAR, MSI-X)
  2. **Shell** — vendor-provided 정적 회로 (DMA, QSFP, HBM controller, clock, reset)
  3. **User logic** — bitstream에 들어가는 *알고리즘 회로* (NPU, codec, HFT engine 등)
- ✦ **Shell** = 항상 같은 부분, driver가 *공통으로* 다룸
  - Xilinx: XDMA, QDMA shell, Versal Block Design
  - Intel: AFU framework, PR region
  - AWS F1: Shell + Custom Logic 분리
- ✦ **User logic** = bitstream마다 달라지는 부분, driver가 *device-specific* 처리
- ✦ **AXI protocol family** (ARM AMBA)
  - **AXI4 (Full)** — high-bandwidth memory-mapped, burst, out-of-order
  - **AXI4-Stream** — streaming data (DMA), 주소 없음
  - **AXI4-Lite** — low-bandwidth control register, single beat
- ✦ AXI 채널 — AR (read addr), R (read data), AW (write addr), W (write data), B (write resp)
- ✦ **PCIe bridge** — AXI ↔ PCIe TLP 변환 (Xilinx XDMA IP, Intel HSSI)
- ✦ Register map (driver가 봐야 할 것)
  - **Control** (CSR) — start/stop, enable, mode
  - **Status** — error, ready, IRQ pending
  - **Queue** — descriptor ring head/tail (doorbell)
  - **Data** — DMA buffer pointer
- ✦ Alveo / Versal / PAC 공통 구조 (vendor-specific 디테일만 다름)
- ◦ HBM/DDR controller — FPGA 내부 메모리 (driver에 노출)

## 다이어그램 (4)

1. FPGA 3-layer — PCIe endpoint / Shell / User logic
2. AXI4-Full vs AXI4-Stream vs AXI4-Lite 비교
3. PCIe ↔ AXI bridge (TLP → AXI 채널 매핑)
4. Driver-visible register map 영역

## 코드 sketch

```c
/* Shell이 노출하는 표준 레지스터 (예: Xilinx XDMA) */
#define XDMA_REG_IDENT     0x0000   /* "XLNX" magic */
#define XDMA_REG_CTRL      0x0004
#define XDMA_REG_STATUS    0x0040
#define XDMA_REG_IRQ_MASK  0x0094
#define XDMA_REG_H2C_SQH   0x4000   /* host→card descriptor SQ head */
#define XDMA_REG_C2H_CQT   0x5000   /* card→host completion tail */

/* User logic은 BAR2 또는 BAR4에 따로 매핑 */
#define USER_REG_VERSION   0x0000
#define USER_REG_START     0x0004
#define USER_REG_INPUT_LEN 0x0008
#define USER_REG_OUTPUT_LEN 0x000C
```

```c
/* Driver probe — shell + user logic 모두 mapping */
static int my_fpga_probe(struct pci_dev *pdev, ...) {
    struct my_fpga *f = devm_kzalloc(&pdev->dev, sizeof(*f), GFP_KERNEL);
    int ret;

    pci_enable_device(pdev);
    pci_set_master(pdev);

    /* BAR0 = shell (XDMA) */
    f->shell_mmio = pci_iomap(pdev, 0, 0);
    if (readl(f->shell_mmio + XDMA_REG_IDENT) != 0x584c4e58)  /* "XLNX" */
        return -ENODEV;

    /* BAR2 = user logic */
    f->user_mmio = pci_iomap(pdev, 2, 0);
    dev_info(&pdev->dev, "User logic version: 0x%x\n",
             readl(f->user_mmio + USER_REG_VERSION));

    return 0;
}
```

## 레퍼런스

- ARM AMBA AXI4 Specification
- Xilinx XDMA IP Product Guide (PG195)
- Intel PAC AFU Framework
- "FPGA Accelerator for Datacenter" — Microsoft Catapult paper

## 관련 항목

- [Ch 3: QEMU fake FPGA 디바이스](/blog/tools/emulation/qemu-fpga-driver/chapter03-qemu-fake-fpga)
- [Ch 4: AXI ↔ PCIe bridge 모방](/blog/tools/emulation/qemu-fpga-driver/chapter04-axi-pcie-bridge)
- [QEMU Fake Device Ch 13 Register Bank](/blog/tools/emulation/qemu-fake-device/chapter13-register-bank)
