---
title: "Ch 12: OPAE·DFL Framework"
date: 2025-09-04T12:00:00
description: "Intel FPGA management — Device Feature List·Accelerated Function Unit."
tags: [QEMU, opae, dfl, intel-fpga, afu]
series: "FPGA Driver via QEMU+VFIO"
seriesOrder: 12
draft: true
---

## 이 챕터의 의도

Intel FPGA(Stratix, Agilex)의 management 스택은 OPAE(userspace)와 DFL(Linux kernel framework) 둘로 나뉜다. DFL은 device 자체에 metadata가 들어 있어 driver가 sub-device를 자동으로 discovery한다. PR(Partial Reconfig), AFU, FME가 모두 표준화돼 있다.

## 핵심 항목

- ✦ **Intel FPGA stack**
  - **OPAE** (Open Programmable Acceleration Engine) — userspace, BSD license
  - **DFL** (Device Feature List) — kernel framework, mainline since 5.4
- ✦ **DFL framework** 개념 — FPGA가 *자기 capability를 metadata로* host에 노출
  - Feature header chain — bitstream에 *discovery table* 포함
  - Driver가 PCI BAR에서 chain을 walk, sub-device 자동 생성
- ✦ DFL 주요 sub-device
  - **FME (FPGA Management Engine)** — PR, sensor, error
  - **PR engine** — partial reconfiguration
  - **AFU (Accelerated Function Unit)** — user workload
  - **HSSI** (High Speed Serial Interface) — Ethernet/QSFP
- ✦ Feature header layout — 16-byte header (type, ID, version, next offset)
- ✦ uAPI — `ioctl(fd, FPGA_FME_PORT_PR, ...)`, `FPGA_PORT_DMA_MAP`
- ✦ OPAE userspace 도구
  - `fpgaconf` — PR (GBS 로드)
  - `fpgad` — daemon (event 감시)
  - `fpgadiag` — diagnostic
  - `fpgainfo` — sensor, version
- ✦ Sub-device hot-add — PR 후 AFU sub-device 동적 추가
- ✦ libopae-c — userspace library, `fpgaOpen`, `fpgaPrepareBuffer`, `fpgaReset`
- ✦ ASE (AFU Simulation Environment) — RTL simulator + opae stub
- ✦ Use case — Intel PAC N3000/D5005/IPU, NPU 회사가 채택
- ✦ DFL vs XRT 비교 — DFL은 *device discovery 표준*, XRT는 *Xilinx 전용 stack* (Ch 13)
- ◦ DFL FPGA region + fpga_mgr 통합

## 다이어그램 (4)

1. Intel FPGA stack — userspace OPAE → libopae → DFL kernel → device
2. DFL feature header chain (PCIe BAR offset 따라)
3. FME + Port (AFU) + PR engine sub-device 구조
4. PR 후 AFU sub-device hot-add 흐름

## 코드 sketch

```bash
# DFL device 확인
ls /dev/dfl-*
# /dev/dfl-fme.0   FPGA Management Engine
# /dev/dfl-port.0  AFU port

# OPAE 도구
fpgainfo fme
# Vendor ID: 0x8086
# Bitstream ID: ...
# PR Interface ID: ...

fpgainfo port
# AFU ID: ...
# Power: ...

# Partial Reconfiguration (PR)
fpgaconf -B 0xab -D 0x0 -F 0x0 my-afu.gbs
# GBS (Green Bit Stream) load
```

```c
/* OPAE userspace API */
#include <opae/fpga.h>

int run_afu(void) {
    fpga_properties props;
    fpga_token tok;
    fpga_handle h;
    fpga_guid afu_id = { /* AFU UUID */ };

    fpgaGetProperties(NULL, &props);
    fpgaPropertiesSetGUID(props, afu_id);
    uint32_t num = 0;
    fpgaEnumerate(&props, 1, &tok, 1, &num);
    fpgaOpen(tok, &h, 0);

    /* MMIO 접근 */
    uint64_t *mmio;
    fpgaMapMMIO(h, 0, &mmio);
    mmio[0] = 0xdeadbeef;

    /* DMA buffer */
    void *buf;
    uint64_t iova, wsid;
    fpgaPrepareBuffer(h, 4096, &buf, &wsid, 0);
    fpgaGetIOAddress(h, wsid, &iova);
    /* AFU에게 iova 전달 → DMA 시작 */

    fpgaReleaseBuffer(h, wsid);
    fpgaClose(h);
    fpgaDestroyToken(&tok);
    return 0;
}
```

```c
/* DFL driver — feature header chain walk (단순화) */
static int dfl_scan_features(struct dfl_fpga_cdev *cdev, void __iomem *base) {
    u64 hdr = readq(base);
    while (1) {
        u32 type = FIELD_GET(DFL_HDR_TYPE, hdr);
        u32 id   = FIELD_GET(DFL_HDR_ID, hdr);
        u32 next = FIELD_GET(DFL_HDR_NEXT, hdr);

        switch (type) {
        case DFL_FME: register_fme(cdev, base); break;
        case DFL_PORT: register_port(cdev, base); break;
        case DFL_AFU: register_afu(cdev, base); break;
        }
        if (!next || (hdr & DFL_HDR_EOL)) break;
        base += next;
        hdr = readq(base);
    }
    return 0;
}
```

## 레퍼런스

- Intel OPAE — opae.github.io, github.com/OPAE/opae-sdk
- Linux `drivers/fpga/dfl*.c`
- Linux `Documentation/fpga/dfl.rst`
- "DFL: Device Feature List framework" — LWN
- Intel PAC N3000/D5005 product brief

## 관련 항목

- [Ch 7: 비트스트림 로딩](/blog/tools/emulation/qemu-fpga-driver/chapter07-bitstream-loading)
- [Ch 11: SR-IOV/mdev](/blog/tools/emulation/qemu-fpga-driver/chapter11-sriov-mdev)
- [Ch 13: Xilinx XRT 스택](/blog/tools/emulation/qemu-fpga-driver/chapter13-xilinx-xrt)
