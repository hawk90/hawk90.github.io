---
title: "Ch 13: Xilinx XRT 스택"
date: 2026-05-17T13:00:00
description: "Alveo·Versal driver 스택 — userspace runtime + kernel module."
tags: [QEMU, xrt, alveo, versal, xilinx]
series: "FPGA Driver via QEMU+VFIO"
seriesOrder: 13
draft: true
---

## 이 챕터의 의도

Xilinx(현 AMD) FPGA의 management 스택은 Intel OPAE/DFL과 별개인 XRT(Xilinx Runtime)다. xocl과 xclmgmt 두 kernel module 위에 libxrt userspace가 올라간다. Alveo 카드, Versal, Zynq MPSoC가 모두 같은 API를 쓴다. Ch 12 OPAE/DFL과 비교하며 학습한다.

## 핵심 항목

- ✦ **XRT (Xilinx Runtime)** — userspace runtime + kernel module
- ✦ Kernel module 2개
  - **xocl** — user mode, AFU와 통신
  - **xclmgmt** — management mode, shell 관리·PR
- ✦ 같은 카드의 PF가 두 개 — function 0 (xclmgmt), function 1 (xocl)
- ✦ DMA engines
  - **xdma** — Xilinx DMA IP (memory-mapped, host-managed)
  - **kdma** — kernel-managed DMA (사용자 logic 안에)
  - **zdma** — zero-copy DMA (HBM 통합)
- ✦ **XCLBIN format** — bitstream + metadata + AXI map + AXIS map + UUID
- ✦ XCLBIN section parsing — PARTITION_METADATA, MEM_TOPOLOGY, IP_LAYOUT, CONNECTIVITY, BITSTREAM
- ✦ XRT API
  - `xclLoadXclbin(handle, xclbin)` — PR + register
  - `xclAllocBO(handle, size, flags)` — BO (Buffer Object) 할당
  - `xclSyncBO(handle, bo, dir)` — DMA H2D / D2H
  - `xclExecBuf(handle, execbo)` — kernel command 발급
- ✦ XRT variants
  - **Alveo U-series** (U50, U200, U250, U280) — PCIe data center FPGA
  - **VCK5000** — Versal AI Core (FPGA + AI Engine)
  - **Zynq UltraScale+ MPSoC** — edge SoC, edge XRT (`zocl`)
- ✦ AMD acquisition (2022) 이후 — XRT가 ROCm 통합 진행, ROCm-XRT bridge
- ✦ XRT vs OPAE 비교
  - XRT: Xilinx 전용, 더 풍부한 API, Versal AI 통합
  - OPAE: Intel 전용, DFL 표준 활용, mainline kernel
- ✦ Vitis HLS / Vivado workflow와 통합 — `.cl` (OpenCL) / C++ HLS → `.xclbin`
- ◦ Multi-board scaling — XRT가 hot-add/remove, ARI fragmentation

## 다이어그램 (4)

1. XRT 전체 스택 — App → libxrt → xocl/xclmgmt → Alveo FPGA
2. XCLBIN format — sections + metadata
3. PCI function 분리 — function 0 (mgmt) / function 1 (user)
4. XRT vs OPAE/DFL 비교 매트릭스

## 코드 sketch

```bash
# Alveo 카드 확인
sudo xbutil examine
# BDF: 0000:01:00.0  Alveo U250
# Static: ID 12345
# Logic UUID: ...

# XCLBIN load (PR)
sudo xbutil program -d 0000:01:00.0 -u my_app.xclbin

# Validate
sudo xbutil validate -d 0000:01:00.0
```

```cpp
// XRT C++ API
#include <xrt/xrt_device.h>
#include <xrt/xrt_kernel.h>
#include <xrt/xrt_bo.h>

int main(int argc, char *argv[]) {
    auto device = xrt::device(0);
    auto uuid = device.load_xclbin("my_app.xclbin");

    auto krnl = xrt::kernel(device, uuid, "my_kernel");

    auto bo_in = xrt::bo(device, 4096, krnl.group_id(0));
    auto bo_out = xrt::bo(device, 4096, krnl.group_id(1));

    auto in_ptr = bo_in.map<int *>();
    for (int i = 0; i < 1024; i++) in_ptr[i] = i;
    bo_in.sync(XCL_BO_SYNC_BO_TO_DEVICE);

    auto run = krnl(bo_in, bo_out, 1024);
    run.wait();

    bo_out.sync(XCL_BO_SYNC_BO_FROM_DEVICE);
    auto out_ptr = bo_out.map<int *>();
    for (int i = 0; i < 10; i++) std::cout << out_ptr[i] << " ";
    return 0;
}
```

```c
/* xocl kernel module 핵심 (단순화) */
static int xocl_probe(struct pci_dev *pdev, ...) {
    struct xocl_dev *xdev = devm_kzalloc(...);
    pci_enable_device(pdev);
    pci_set_master(pdev);

    /* BAR 매핑 — user PF (function 1) */
    xdev->user_bar = pci_iomap(pdev, 0, 0);

    /* sub-device 등록 — kdma, xdma, intc, cu (compute unit) */
    xocl_subdev_create(xdev, "kdma");
    xocl_subdev_create(xdev, "intc");

    /* char dev — userspace ioctl 인터페이스 */
    cdev_init(&xdev->cdev, &xocl_fops);
    cdev_add(&xdev->cdev, devt, 1);
    return 0;
}

static long xocl_ioctl(struct file *f, unsigned int cmd, unsigned long arg) {
    switch (cmd) {
    case DRM_IOCTL_XOCL_CREATE_BO: return xocl_create_bo(...);
    case DRM_IOCTL_XOCL_SYNC_BO:   return xocl_sync_bo(...);
    case DRM_IOCTL_XOCL_EXECBUF:   return xocl_execbuf(...);
    }
    return -ENOTTY;
}
```

## 레퍼런스

- XRT — github.com/Xilinx/XRT
- XRT documentation — xilinx.github.io/XRT
- Xilinx Alveo product brief, Vitis Unified Software Platform
- "From OpenCL to Alveo with XRT" — Xilinx Developer
- AMD ROCm-XRT bridge proposal

## 관련 항목

- [Ch 11: SR-IOV/mdev](/blog/tools/emulation/qemu-fpga-driver/chapter11-sriov-mdev)
- [Ch 12: OPAE/DFL](/blog/tools/emulation/qemu-fpga-driver/chapter12-opae-dfl)
- [Ch 14: CXL.cache/CCI-P](/blog/tools/emulation/qemu-fpga-driver/chapter14-cxl-coherent)
