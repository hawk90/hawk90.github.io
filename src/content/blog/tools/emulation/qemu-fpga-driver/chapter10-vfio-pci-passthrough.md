---
title: "Ch 10: VFIO-PCI 패스스루"
date: 2026-05-17T10:00:00
description: "실 FPGA를 VM에 — bind·unbind·reset 흐름."
tags: [QEMU, vfio-pci, passthrough, fpga]
series: "FPGA Driver via QEMU+VFIO"
seriesOrder: 10
draft: true
---

## 이 챕터의 의도

이제 실 FPGA를 받았다. VFIO-PCI로 guest VM에 직접 pass-through하면, QEMU fake-fpga로 짠 driver를 그대로 VM에서 실행할 수 있다. 시리즈의 step 2에 해당하는, fake에서 실 보드로 넘어가는 transition 단계다.

## 핵심 항목

- ✦ **VFIO-PCI 바인딩 절차** (Ch 9 복습 + QEMU 통합)
  1. host driver unbind — `echo 0000:01:00.0 > /sys/bus/pci/devices/.../driver/unbind`
  2. vfio-pci 등록 — `echo "vendor device" > /sys/bus/pci/drivers/vfio-pci/new_id`
  3. vfio-pci bind — `echo 0000:01:00.0 > /sys/bus/pci/drivers/vfio-pci/bind`
- ✦ QEMU 옵션 — `-device vfio-pci,host=01:00.0,id=fpga0`
- ✦ Guest 안에서 — `lspci`에 정확히 같은 vendor/device, 같은 BAR layout
- ✦ Driver — fake용으로 짠 *그대로* (insmod my_fpga.ko)
- ✦ **Function-Level Reset (FLR)** — pass-through 전후 device reset
- ✦ Secondary Bus Reset — FLR 없는 device의 fallback
- ✦ Hot Reset — VM 시작 시
- ✦ **INTx vs MSI/MSI-X in pass-through**
  - INTx — shared line, host 처리 후 KVM IRQ inject (느림)
  - MSI/MSI-X — eventfd로 직접 KVM IRQFD, 거의 native 성능
- ✦ BAR mapping — `mmap` BAR via VFIO_DEVICE_GET_REGION_INFO + QEMU memory region
- ✦ DMA — IOMMU가 guest IOVA → host PA 매핑, guest는 자기 PA로 알고 DMA
- ✦ Hotplug + passthrough — runtime `device_add vfio-pci,host=...`
- ✦ Performance vs emulation
  - 가상 device emulation: 10-30% overhead (vmexit)
  - VFIO pass-through: <5% overhead (IRQ + DMA만 trap)
- ✦ Multi-board pass-through — 여러 group을 같은 container에
- ◦ Cross-host migration 한계 — pass-through device는 live migration 어려움 (PCIe Ch 13 vDPA)

## 다이어그램 (4)

1. Pass-through 흐름 — host driver unbind → vfio-pci bind → QEMU mount
2. Guest view — 같은 vendor/device, BAR layout, IRQ
3. INTx vs MSI-X eventfd → KVM IRQFD path
4. Performance 비교 (emulation / pass-through / SR-IOV)

## 코드 sketch

```bash
# Host — 실 FPGA를 VFIO에 바인딩
DEV=0000:01:00.0
sudo lspci -nn -s $DEV   # 01:00.0 ... [10ee:9038] (Xilinx Alveo U250)

# Vendor driver unbind
echo $DEV | sudo tee /sys/bus/pci/devices/$DEV/driver/unbind

# vfio-pci bind
echo "10ee 9038" | sudo tee /sys/bus/pci/drivers/vfio-pci/new_id

# Reset (FLR)
echo 1 | sudo tee /sys/bus/pci/devices/$DEV/reset

# 확인
ls -la /sys/bus/pci/devices/$DEV/iommu_group/devices/
ls /dev/vfio/   # group N 존재
```

```bash
# Guest 실행
sudo qemu-system-x86_64 -enable-kvm -m 8G -smp 4 \
    -device vfio-pci,host=$DEV,id=fpga0 \
    -kernel vmlinuz -initrd rootfs.img -nographic \
    -append "console=ttyS0"

# Guest 안에서
guest$ lspci -nn | grep 10ee
01:00.0 ... [10ee:9038]   # 같은 device 보임!

guest$ insmod my_fpga.ko
guest$ dmesg | grep my_fpga
my_fpga: probed, BAR0 = 0x ...
my_fpga: User logic version 0x1234

# Driver는 fake에서 짠 그대로 동작
```

```python
# Performance 측정 — host vs guest
# host:
$ ./fpga_bench --iter 100000
Latency p50: 5.2µs, p99: 8.1µs
# guest (VFIO pass-through):
$ ./fpga_bench --iter 100000
Latency p50: 5.4µs, p99: 8.5µs   # <5% overhead
```

## 레퍼런스

- Linux `Documentation/driver-api/vfio.rst`
- QEMU `Documentation/system/devices/vfio.rst`
- "Achieving Bare Metal Performance with VFIO" — Alex Williamson
- Xilinx XRT VFIO support, AWS F1 instance internals

## 관련 항목

- [Ch 9: VFIO 기초](/blog/tools/emulation/qemu-fpga-driver/chapter09-vfio-basics)
- [Ch 11: SR-IOV/mdev](/blog/tools/emulation/qemu-fpga-driver/chapter11-sriov-mdev)
- [PCIe Ch 12: SR-IOV/VFIO](/blog/embedded/hardware/pcie/)
- [QEMU Internals Ch 14: KVM accel](/blog/tools/emulation/qemu-internals/chapter14-kvm-accel)
