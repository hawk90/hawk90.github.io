---
title: "Ch 9: VFIO 기초"
date: 2025-09-04T09:00:00
description: "Userspace driver framework·IOMMU group — VFIO 첫 걸음."
tags: [QEMU, vfio, iommu-group, userspace-driver]
series: "FPGA Driver via QEMU+VFIO"
seriesOrder: 9
draft: true
---

## 이 챕터의 의도

VFIO는 커널 드라이버 없이 userspace가 디바이스를 안전하게 소유하게 해 주는 프레임워크다. FPGA 드라이버를 userspace에서 짤 수도 있고, guest VM에 pass-through할 수도 있다. 이 장에서는 IOMMU group, container, device 3-tier 개념을 정리하고 첫 VFIO ioctl 호출까지 함께 본다.

## 핵심 항목

- ✦ **Why VFIO**
  - kernel driver 없이 device 소유 → DPDK/SPDK 같은 kernel-bypass
  - guest VM에 device pass-through → 다음 챕터(Ch 10)
  - DPDK, SPDK, QEMU vfio-pci 모두 VFIO 위에 동작
- ✦ **IOMMU group** — DMA isolation 단위
  - 같은 group 내 device끼리 *cross-DMA* 가능 → 그래서 *그룹 전체*를 userspace 점유
  - PCIe ACS (Access Control Services)로 그룹 분리 (HW 지원 필요)
  - `/sys/kernel/iommu_groups/N/devices/` — group 멤버 확인
- ✦ **3-tier 구조**
  - **Container** (`/dev/vfio/vfio`) — *address space*, multiple group fit
  - **Group** (`/dev/vfio/N`) — N = IOMMU group 번호
  - **Device** — group 안의 PCI device, `VFIO_GROUP_GET_DEVICE_FD`로 fd
- ✦ 주요 ioctl
  - `VFIO_GET_API_VERSION`, `VFIO_CHECK_EXTENSION`
  - `VFIO_GROUP_SET_CONTAINER` — group을 container에 join
  - `VFIO_SET_IOMMU` — IOMMU type 1
  - `VFIO_IOMMU_MAP_DMA` — userspace VA → IOVA 매핑
  - `VFIO_DEVICE_GET_INFO`, `VFIO_DEVICE_GET_REGION_INFO` (BAR 정보)
  - `VFIO_DEVICE_GET_IRQ_INFO`, `VFIO_DEVICE_SET_IRQS` (MSI-X eventfd)
- ✦ DMA mapping userspace API — `mmap` + `VFIO_IOMMU_MAP_DMA`로 IOVA 등록
- ✦ Linux 부팅 옵션 — `intel_iommu=on iommu=pt` (passthrough mode)
- ✦ vfio-pci 바인딩
  ```
  echo 1234 6677 > /sys/bus/pci/drivers/vfio-pci/new_id
  echo 0000:01:00.0 > /sys/bus/pci/drivers/xocl/unbind
  echo 0000:01:00.0 > /sys/bus/pci/drivers/vfio-pci/bind
  ```
- ✦ **IOMMUFD** (kernel 6.6+) — VFIO container 차세대, `/dev/iommu` (PCIe 시리즈 Ch 11/12)
- ◦ `vfio-noiommu` — IOMMU 없는 환경 (위험)

## 다이어그램 (4)

1. VFIO 3-tier — container ↔ group ↔ device
2. IOMMU group + ACS — 같은 group cross-DMA, 다른 group 격리
3. Userspace driver flow — open container/group/device → MAP_DMA → mmap BAR
4. VFIO → IOMMUFD migration 시점 (kernel 6.6+)

## 코드 sketch

```bash
# IOMMU 활성 + vfio-pci 바인딩
sudo grubby --update-kernel=ALL --args="intel_iommu=on iommu=pt"
sudo reboot

# 보드 확인
lspci -nn | grep 1234
# 01:00.0 ... [1234:6677]

# 그룹 확인
readlink /sys/bus/pci/devices/0000:01:00.0/iommu_group
# /sys/kernel/iommu_groups/15

# vfio-pci에 바인딩
sudo modprobe vfio-pci
echo "1234 6677" | sudo tee /sys/bus/pci/drivers/vfio-pci/new_id
echo 0000:01:00.0 | sudo tee /sys/bus/pci/devices/0000:01:00.0/driver/unbind || true
echo 0000:01:00.0 | sudo tee /sys/bus/pci/drivers/vfio-pci/bind

# 확인
ls /dev/vfio/
# vfio  15
```

```c
/* Userspace VFIO 첫 호출 */
#include <linux/vfio.h>
#include <sys/ioctl.h>
#include <sys/mman.h>

int main(void) {
    /* 1. container */
    int container = open("/dev/vfio/vfio", O_RDWR);
    assert(ioctl(container, VFIO_GET_API_VERSION) == VFIO_API_VERSION);

    /* 2. group */
    int group = open("/dev/vfio/15", O_RDWR);
    struct vfio_group_status gs = { .argsz = sizeof(gs) };
    ioctl(group, VFIO_GROUP_GET_STATUS, &gs);
    assert(gs.flags & VFIO_GROUP_FLAGS_VIABLE);

    /* 3. group → container */
    ioctl(group, VFIO_GROUP_SET_CONTAINER, &container);
    ioctl(container, VFIO_SET_IOMMU, VFIO_TYPE1_IOMMU);

    /* 4. device fd */
    int device = ioctl(group, VFIO_GROUP_GET_DEVICE_FD, "0000:01:00.0");

    /* 5. device info */
    struct vfio_device_info di = { .argsz = sizeof(di) };
    ioctl(device, VFIO_DEVICE_GET_INFO, &di);
    printf("num_regions=%d, num_irqs=%d\n", di.num_regions, di.num_irqs);

    /* 6. BAR0 mmap */
    struct vfio_region_info ri = { .argsz = sizeof(ri), .index = VFIO_PCI_BAR0_REGION_INDEX };
    ioctl(device, VFIO_DEVICE_GET_REGION_INFO, &ri);
    void *mmio = mmap(NULL, ri.size, PROT_READ | PROT_WRITE, MAP_SHARED, device, ri.offset);

    printf("IDENT: 0x%x\n", *(volatile uint32_t *)mmio);   /* "XLNX" */

    /* 7. DMA buffer mapping */
    void *buf = mmap(NULL, 4096, PROT_READ | PROT_WRITE, MAP_PRIVATE | MAP_ANONYMOUS, -1, 0);
    struct vfio_iommu_type1_dma_map dm = {
        .argsz = sizeof(dm),
        .flags = VFIO_DMA_MAP_FLAG_READ | VFIO_DMA_MAP_FLAG_WRITE,
        .vaddr = (uint64_t)buf,
        .iova  = 0x10000000,
        .size  = 4096,
    };
    ioctl(container, VFIO_IOMMU_MAP_DMA, &dm);
    /* 이제 device는 IOVA 0x10000000으로 buf 접근 가능 */
}
```

## 레퍼런스

- Linux `Documentation/driver-api/vfio.rst`
- Linux `drivers/vfio/`
- QEMU `hw/vfio/`
- LWN "An introduction to VFIO"
- "VFIO design and implementation" — Alex Williamson Plumbers Conference

## 관련 항목

- [Ch 10: VFIO-PCI 패스스루](/blog/tools/emulation/qemu-fpga-driver/chapter10-vfio-pci-passthrough)
- [Ch 11: SR-IOV/mdev](/blog/tools/emulation/qemu-fpga-driver/chapter11-sriov-mdev)
- [PCIe Ch 12: SR-IOV/VFIO](/blog/embedded/hardware/pcie/)
- [QEMU Internals Ch 19: vhost](/blog/tools/emulation/qemu-internals/chapter19-vhost)
