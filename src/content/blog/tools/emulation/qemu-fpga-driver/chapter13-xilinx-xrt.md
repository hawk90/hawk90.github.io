---
title: "Ch 13: Xilinx XRT 스택"
date: 2026-05-17T13:00:00
description: "Alveo·Versal driver 스택 — userspace runtime + kernel module."
tags: [QEMU, xrt, alveo, versal, xilinx]
series: "FPGA Driver via QEMU+VFIO"
seriesOrder: 13
draft: true
---

Xilinx(현 AMD) FPGA의 management 스택은 Intel OPAE/DFL과 별개의 **XRT**(Xilinx Runtime)입니다. xocl과 xclmgmt 두 kernel module 위에 libxrt userspace가 올라갑니다. Alveo·Versal·Zynq MPSoC가 *모두 같은 API*를 씁니다. Ch 12 OPAE/DFL과 비교하며 학습합니다.

## XRT 한눈에

```text
Application (HLS kernel host)
   │
   ▼
libxrt (xrt_device, xrt_kernel, xrt_bo)
   │
   ▼
┌─────────────────────────────────┐
│  xocl (user mode)               │  ← AFU와 통신
│  xclmgmt (mgmt mode)            │  ← shell 관리·PR
└──────────────┬──────────────────┘
               │
   ┌───────────┴─────────────┐
   │   Alveo / Versal FPGA   │
   │   PF: function 0 (mgmt) │
   │   PF: function 1 (user) │
   └─────────────────────────┘
```

같은 카드의 PF가 *두 개*입니다 — function 0(xclmgmt), function 1(xocl). 이 분리가 management와 user 동작을 *독립적으로* 다룰 수 있게 합니다.

## 두 kernel module

| Module | 역할 |
|--------|------|
| **xocl** | user mode. AFU MMIO·DMA·exec 명령 |
| **xclmgmt** | mgmt mode. shell 관리·PR·sensor·fault recovery |

production system이 둘을 *항상 같이* 로드해야 정상 동작합니다.

## DMA engine 종류

| 엔진 | 특징 |
|------|------|
| **xdma** | 표준 Xilinx DMA IP. memory-mapped, host-managed |
| **kdma** | kernel-managed DMA. user logic 안에 |
| **zdma** | zero-copy DMA. HBM 통합 |

driver 입장에서 선택은 보통 *bitstream*이 정합니다. user logic이 xdma를 instantiate해 두면 xocl이 xdma backend로 동작.

## XCLBIN format

Xilinx의 *bitstream 표준 포맷*. 단순 binary가 아니라 *섹션 묶음*입니다.

| Section | 의미 |
|---------|------|
| `PARTITION_METADATA` | bitstream 메타데이터 |
| `MEM_TOPOLOGY` | DDR/HBM bank 구성 |
| `IP_LAYOUT` | compute unit(CU) 위치 |
| `CONNECTIVITY` | CU ↔ memory port 매핑 |
| `BITSTREAM` | 실제 합성된 회로 |
| `EMBEDDED_METADATA` | UUID, build time |

XRT는 XCLBIN load 시 *모든 섹션을 parse*해 driver state를 구성합니다.

```bash
# XCLBIN 파일 분석
xclbinutil --info --input my_app.xclbin

# 일부 출력
# XClbin Version: 2.1.0
# Sections found:
#   PARTITION_METADATA
#   MEM_TOPOLOGY (4 banks)
#   IP_LAYOUT (3 compute units)
#   CONNECTIVITY (4 connections)
#   BITSTREAM (32 MB)
#   EMBEDDED_METADATA
```

## XRT API — 핵심 4가지

| 함수 | 역할 |
|------|------|
| `xclLoadXclbin(handle, xclbin)` | PR + register |
| `xclAllocBO(handle, size, flags)` | BO(Buffer Object) 할당 |
| `xclSyncBO(handle, bo, dir)` | DMA H2D 또는 D2H |
| `xclExecBuf(handle, execbo)` | kernel command 발급 |

`BO` 추상이 Intel `wsid`와 비슷한 역할 — DMA buffer의 *handle*.

## XRT C++ API

좀 더 modern한 C++ wrapper.

```cpp
#include <xrt/xrt_device.h>
#include <xrt/xrt_kernel.h>
#include <xrt/xrt_bo.h>

int main(int argc, char *argv[]) {
    auto device = xrt::device(0);
    auto uuid = device.load_xclbin("my_app.xclbin");

    auto krnl = xrt::kernel(device, uuid, "my_kernel");

    auto bo_in  = xrt::bo(device, 4096, krnl.group_id(0));
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

이 short script가 *Alveo U250에서 합성된 kernel*을 *load → memory bind → DMA → 실행 → 결과 회수*를 한 번에 합니다.

## xocl kernel module 핵심

```c
static int xocl_probe(struct pci_dev *pdev,
                      const struct pci_device_id *id) {
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

xocl이 *DRM ioctl number space*를 쓰는 게 특이합니다 — GPU와 같은 메커니즘으로 buffer object를 다루기 위함.

## XRT variants — 카드별

| 카드 | 코어 | XRT |
|------|------|-----|
| Alveo U50/U200/U250/U280 | UltraScale+ | xocl + xclmgmt |
| Versal VCK5000 | Versal AI Core (FPGA + AI Engine) | xocl + ai_engine subdev |
| Zynq UltraScale+ MPSoC | embedded SoC | zocl (edge XRT) |
| AWS F2 | UltraScale+ + custom | XRT + AWS extensions |

Versal은 *FPGA + AI Engine*이 같은 SoC에 — XRT가 AI Engine까지 통합 관리합니다.

## AMD acquisition (2022) 이후

AMD가 Xilinx를 인수한 후 XRT는 **ROCm**과의 통합이 진행되고 있습니다.

| 트랙 | 진행 상황 |
|------|----------|
| ROCm-XRT bridge | 제안 단계 |
| HIP on XRT | 실험적 |
| MIVisionX integration | 일부 |
| AI Engine ↔ ROCm | active |

장기적으로 XRT가 *AMD GPU·FPGA·AI Engine을 묶는* 통합 stack으로 진화할 가능성. 변동이 큰 영역이라 production decision은 신중히.

## XRT vs OPAE/DFL — 비교

| 항목 | XRT | OPAE/DFL |
|------|-----|----------|
| 표준화 | XCLBIN sections | DFL feature chain |
| Discovery | XCLBIN parse | bitstream metadata |
| Mainline kernel | out-of-tree | mainline (5.4+) |
| 라이선스 | Apache | BSD/Apache |
| Vendor | Xilinx/AMD 전용 | Intel 전용 |
| 풍부함 | 더 많음(AI Engine 포함) | DFL 표준 활용 |

DFL이 *Linux kernel 표준*에 가깝고, XRT가 *vendor 풍부함*에 가깝습니다. 정답은 *어떤 카드*에 의존합니다.

## Vitis와의 통합

Xilinx의 *Vitis Unified Software Platform*은 HLS·OpenCL·C++ kernel을 XCLBIN으로 합성하는 IDE/툴체인. XRT는 그 결과를 *runtime에서 실행*하는 layer.

```bash
# Vitis로 HLS kernel을 XCLBIN으로 합성
v++ -c -k my_kernel -t hw --platform xilinx_u250_xdma_201830_2 -o my_kernel.xo my_kernel.cpp
v++ -l -t hw --platform xilinx_u250_xdma_201830_2 -o my_app.xclbin my_kernel.xo

# XRT runtime으로 실행
./host_app my_app.xclbin
```

`v++` 컴파일 시간이 *수십 분~수 시간*입니다. fake-fpga에서 *호환 layout으로 driver 검증*해 두면 이 긴 cycle을 *마지막 단계로만* 미룰 수 있습니다.

## xbutil — 운영 도구

XRT의 CLI 도구. OPAE의 `fpgainfo`와 같은 역할.

```bash
sudo xbutil examine
# BDF: 0000:01:00.0  Alveo U250
# Static: ID 12345
# Logic UUID: ...

# XCLBIN load (PR)
sudo xbutil program -d 0000:01:00.0 -u my_app.xclbin

# Validate
sudo xbutil validate -d 0000:01:00.0

# Reset
sudo xbutil reset -d 0000:01:00.0
```

## 흔한 함정

- **xocl + xclmgmt 미설치** — 한쪽만 로드되면 동작 안 함. `dkms status`로 확인.
- **XCLBIN platform mismatch** — Alveo U250용 XCLBIN을 U200에 로드하면 reject. `xbutil examine`으로 platform 확인.
- **BO group_id 오류** — kernel argument의 memory bank 매핑을 잘못 쓰면 DMA가 *엉뚱한 bank*로. `xclbinutil --info`로 CONNECTIVITY 확인.
- **AMD 인수 후 ROCm 통합 변동** — XRT API가 변화 중. production은 LTS branch 사용 권장.

## 정리

- **XRT**(Xilinx Runtime)는 Alveo·Versal·Zynq의 통합 driver 스택. *userspace libxrt + kernel xocl/xclmgmt*.
- 한 카드에 *PF 두 개* — function 0(mgmt), function 1(user). 분리로 management 안전성 확보.
- **XCLBIN**은 bitstream + metadata + AXI/AXIS map + UUID의 표준 포맷.
- XRT API 4축: `LoadXclbin`·`AllocBO`·`SyncBO`·`ExecBuf`. C++ wrapper(`xrt::device/kernel/bo`)도.
- xocl이 *DRM ioctl space*를 활용 — GPU 스타일 buffer object 관리.
- DFL/OPAE와의 차이: XRT는 *vendor 풍부*(AI Engine 포함), DFL은 *kernel 표준*. 카드에 따라 선택.
- AMD 인수 후 ROCm 통합 진행 — 장기 변동성 큼.

## 다음 장 예고

마지막 장은 *FPGA driver의 미래* — **CXL.cache**로 가는 길. DMA descriptor가 *사라지고* FPGA가 host cache에 직접 참여하는 coherent accelerator 패러다임.

## 관련 항목

- [Ch 12: OPAE·DFL Framework](/blog/tools/emulation/qemu-fpga-driver/chapter12-opae-dfl)
- [Ch 14: CXL.cache·CCI-P](/blog/tools/emulation/qemu-fpga-driver/chapter14-cxl-coherent)
- [Ch 6: DMA Descriptor Ring](/blog/tools/emulation/qemu-fpga-driver/chapter06-dma-descriptor-ring)
- [QEMU Internals — Virtio Impl](/blog/tools/emulation/qemu-internals/chapter18-virtio-impl)
