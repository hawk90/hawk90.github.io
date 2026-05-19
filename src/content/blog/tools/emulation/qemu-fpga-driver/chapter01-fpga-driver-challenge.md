---
title: "Ch 1: FPGA Driver 개발의 과제"
date: 2026-05-17T01:00:00
description: "실 보드 없이도 driver 검증 — QEMU + VFIO 워크플로 개관."
tags: [QEMU, fpga, driver, vfio, workflow]
series: "FPGA Driver via QEMU+VFIO"
seriesOrder: 1
draft: true
---

## 이 챕터의 의도

FPGA driver 개발의 실제 어려움은 코드 자체가 아니라 환경에 있다. 보드 1대를 여러 명이 공유하고, bitstream은 자주 바뀌며, 로그는 dmesg 한 줄에 그치고, 재현이 어렵다. 이 시리즈는 QEMU fake FPGA로 driver를 작성한 뒤 VFIO로 실 FPGA에서 검증하는 4단계 워크플로를 처음부터 끝까지 다룬다.

## 핵심 항목

- ✦ FPGA driver 개발 환경의 현실
  - 보드 1대를 여러 명·여러 시간대 공유
  - bitstream 변경 시 *수십 분* 합성
  - dmesg 외 로깅 거의 없음 (JTAG 별도)
  - lock-up 시 재현 어려움 (전원 사이클)
  - CI 자동화 거의 불가능
- ✦ **4-step 워크플로**
  1. **Driver dev** — QEMU + fake FPGA model → driver 작성·단위 테스트
  2. **Passthrough** — VFIO-PCI로 실 FPGA → bare-metal driver를 VM에서
  3. **Sharing** — SR-IOV/mdev → multi-tenant FPGA
  4. **Coherent** — CXL.cache → FPGA가 host cache에 직접
- ✦ 시리즈 구성
  - Ch 1-2: 동기·아키텍처
  - Ch 3-8: QEMU fake FPGA로 driver dev
  - Ch 9-10: VFIO + passthrough
  - Ch 11-13: SR-IOV/mdev + 벤더 framework (OPAE/XRT)
  - Ch 14: CXL coherent 미래
- ✦ 대상 FPGA — **Xilinx Alveo U/Versal**, **Intel PAC N3000/D5005**, AWS F1/F2
- ✦ Application — NPU 가속기, 항우주 control board, 자율주행 sensor fusion, 금융 HFT
- ✦ 이 시리즈의 *unique value* — 한국어로 *fake → passthrough → SR-IOV → CXL* 전 단계를 묶은 자료 없음

## 다이어그램 (3)

1. FPGA driver dev pain point 다이어그램 (보드 부족, 합성 시간, 로깅 한계, 재현성)
2. 4-step 워크플로 흐름 — fake → passthrough → SR-IOV → CXL
3. 시리즈 챕터 맵

## 코드 sketch

```bash
# Step 1: fake FPGA로 driver dev
qemu-system-x86_64 -enable-kvm -m 4G \
    -device fake-fpga,id=fpga0 \
    -kernel vmlinuz -initrd initrd
# guest 안: insmod my_fpga_driver.ko && dmesg

# Step 2: 실 FPGA passthrough (실 보드 받은 후)
echo 0000:01:00.0 > /sys/bus/pci/drivers/xilinx_xocl/unbind
echo 0000:01:00.0 > /sys/bus/pci/drivers/vfio-pci/bind
qemu-system-x86_64 -enable-kvm -m 4G \
    -device vfio-pci,host=01:00.0 \
    -kernel vmlinuz -initrd initrd
# guest 안: 같은 driver 사용
```

## 레퍼런스

- Xilinx Vivado / Vitis platform docs
- Intel PAC OPAE — opae.github.io
- "FPGA in the Cloud: Booting Virtualized Hardware Accelerators with OPAE" — Intel
- AWS F1 instance docs

## 관련 항목

- [Ch 2: FPGA 아키텍처 review](/blog/tools/emulation/qemu-fpga-driver/chapter02-fpga-architecture)
- [QEMU Fake Device 시리즈](/blog/tools/emulation/qemu-fake-device/)
- [PCIe Ch 12 VFIO](/blog/embedded/hardware/pcie/)
