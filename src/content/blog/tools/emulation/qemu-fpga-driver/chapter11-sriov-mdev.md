---
title: "Ch 11: SR-IOV·mdev"
date: 2025-09-04T11:00:00
description: "FPGA 공유 — PF/VF·virtual function·mediated device."
tags: [QEMU, sr-iov, mdev, multi-tenant]
series: "FPGA Driver via QEMU+VFIO"
seriesOrder: 11
draft: true
---

## 이 챕터의 의도

FPGA 1대를 여러 VM 또는 tenant가 공유하는 것은 datacenter ROI의 핵심이다. SR-IOV는 하드웨어로, mdev는 소프트웨어로 디바이스를 분할한다. 이 장에서는 두 패턴과 FPGA에 특화된 응용(XRT VF, OPAE, DFL AFU)을 함께 본다.

## 핵심 항목

- ✦ Why share FPGA — datacenter ROI, multi-tenant cloud (AWS F1, Alibaba/Tencent FPGA-as-a-service)
- ✦ **SR-IOV** (Single Root I/O Virtualization)
  - **PF (Physical Function)** — host에서 보이는 *진짜* device, FPGA 관리
  - **VF (Virtual Function)** — *가상 device*, guest에 pass-through 가능
  - HW 지원 필요 (PCIe SR-IOV capability + Xilinx/Intel FPGA shell 지원)
  - NumVFs는 *펌웨어*가 정함, runtime 변경 어려움
- ✦ PF driver — VF 생성·관리, resource allocation, partition reset
- ✦ VF driver — 일반 PCI driver처럼 보임, VF만의 BAR
- ✦ **Mediated device (mdev)** — VF *없는* hardware도 *가상 function* 제공
  - parent driver(host)가 mdev type 정의 (e.g., "fpga-1q-256m")
  - userspace `echo UUID > /sys/.../mdev_supported_types/.../create`
  - mdev = sub-device, 같은 PF가 다수 mdev 제공
  - **NVIDIA vGPU**가 대표적 사례
- ✦ vfio-mdev API — `mdev_parent_ops`, `mdev_driver`
- ✦ **Scalable IOV (S-IOV)** — Intel의 mdev 발전형 (PCIe Ch 13)
- ✦ FPGA-specific patterns
  - Xilinx XRT VF — PF가 shell 관리, VF가 user logic slot
  - Intel **OPAE** — PF가 PR region 관리, VF/mdev가 AFU
  - **DFL AFU** (Accelerated Function Unit) — Linux DFL framework
- ✦ Resource partition — 각 VF에 dedicated memory·queue 할당
- ✦ Performance isolation — QoS, bandwidth cap
- ✦ Cloud FPGA — AWS F1, Azure NP-series, GCP FPGA
- ◦ Composable FPGA — 동적 PR + mdev 결합

## 다이어그램 (4)

1. SR-IOV PF/VF 트리 + VF BAR stride
2. mdev — parent + UUID-based mdev 다수
3. SR-IOV vs mdev vs Scalable IOV 비교
4. Cloud FPGA tenancy — 같은 FPGA, 4 tenant 공유

## 코드 sketch

```bash
# SR-IOV — VF 활성
echo 4 | sudo tee /sys/bus/pci/devices/0000:01:00.0/sriov_numvfs
lspci -d 10ee:
# 01:00.0  PF
# 01:00.1  VF0
# 01:00.2  VF1
# 01:00.3  VF2
# 01:00.4  VF3

# 각 VF를 vfio-pci에 바인딩 후 guest에 pass-through
for vf in 01:00.1 01:00.2; do
    echo "10ee 5038" > /sys/bus/pci/drivers/vfio-pci/new_id   # VF device id (PF와 다름)
    echo 0000:$vf > /sys/bus/pci/drivers/vfio-pci/bind
done

# Guest A
qemu-system-x86_64 -enable-kvm -device vfio-pci,host=01:00.1 ...
# Guest B
qemu-system-x86_64 -enable-kvm -device vfio-pci,host=01:00.2 ...
```

```bash
# mdev — parent에 mdev 생성
PARENT=/sys/bus/pci/devices/0000:01:00.0
ls $PARENT/mdev_supported_types/
# fpga-1q-256m  fpga-2q-512m  fpga-4q-1g

UUID=$(uuidgen)
echo $UUID | sudo tee $PARENT/mdev_supported_types/fpga-1q-256m/create

# /sys/bus/mdev/devices/$UUID 생성됨
ls /sys/bus/mdev/devices/$UUID

# Guest에 pass-through
qemu-system-x86_64 -enable-kvm \
    -device vfio-pci,sysfsdev=/sys/bus/mdev/devices/$UUID
```

```c
/* PF driver — VF management */
static int my_fpga_pf_sriov_configure(struct pci_dev *pdev, int num_vfs) {
    int ret;
    if (num_vfs > MAX_VFS) return -EINVAL;
    if (num_vfs == 0) {
        pci_disable_sriov(pdev);
        return 0;
    }
    /* HW partition — bind each VF to user logic slot */
    my_fpga_setup_vf_partitions(pdev, num_vfs);
    ret = pci_enable_sriov(pdev, num_vfs);
    return ret < 0 ? ret : num_vfs;
}

static struct pci_driver my_fpga_pf_driver = {
    .name           = "my-fpga-pf",
    .id_table       = pf_id_table,
    .probe          = my_fpga_pf_probe,
    .sriov_configure = my_fpga_pf_sriov_configure,
};

/* VF driver — 일반 PCI driver */
static struct pci_driver my_fpga_vf_driver = {
    .name     = "my-fpga-vf",
    .id_table = vf_id_table,    /* VF device id */
    .probe    = my_fpga_vf_probe,
};
```

## 레퍼런스

- PCIe SR-IOV Specification
- Linux `Documentation/driver-api/vfio-mediated-device.rst`
- Intel OPAE — opae.github.io
- Xilinx XRT SR-IOV / FPGA-as-a-Service whitepaper
- "Multi-tenant FPGA in Cloud" — Microsoft Catapult 후속

## 관련 항목

- [Ch 10: VFIO-PCI passthrough](/blog/tools/emulation/qemu-fpga-driver/chapter10-vfio-pci-passthrough)
- [Ch 12: OPAE/DFL](/blog/tools/emulation/qemu-fpga-driver/chapter12-opae-dfl)
- [Ch 13: Xilinx XRT](/blog/tools/emulation/qemu-fpga-driver/chapter13-xilinx-xrt)
- [PCIe Ch 12-13: SR-IOV / Scalable IOV](/blog/embedded/hardware/pcie/)
