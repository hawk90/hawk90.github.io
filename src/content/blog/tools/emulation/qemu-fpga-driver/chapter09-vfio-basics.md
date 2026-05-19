---
title: "Ch 9: VFIO 기초"
date: 2026-05-17T09:00:00
description: "Userspace driver framework·IOMMU group — VFIO 첫 걸음."
tags: [QEMU, vfio, iommu-group, userspace-driver]
series: "FPGA Driver via QEMU+VFIO"
seriesOrder: 9
draft: true
---

워크플로의 *Step 2*가 시작됩니다. 지금까지는 fake FPGA로 driver를 짰는데, *실 FPGA가 도착*했을 때 그 driver를 *그대로* 옮기는 방법이 **VFIO**입니다.

VFIO는 kernel driver 없이 *userspace*가 디바이스를 *안전하게 소유*하게 해 주는 프레임워크입니다. FPGA driver를 userspace에서 짤 수도 있고, guest VM에 pass-through할 수도 있습니다. 이 장은 IOMMU group, container, device 3-tier 개념과 첫 ioctl 호출까지 정리합니다.

## Why VFIO

VFIO가 푸는 문제 세 가지.

1. **Kernel-bypass userspace driver** — DPDK, SPDK, ML inference runtime 등이 kernel driver 없이 device 직접 사용.
2. **Guest VM에 pass-through** — host driver 없이 guest가 device 소유(다음 장 Ch 10).
3. **DMA isolation** — IOMMU를 통해 device가 *허용된 주소만* DMA 가능 → 보안.

이 셋이 모두 *FPGA 시나리오*에 직결됩니다.

## IOMMU group

**IOMMU group**은 DMA isolation의 *최소 단위*입니다. 같은 group 안의 device끼리는 *서로의 메모리에 DMA 가능*하지만, 다른 group의 메모리는 못 봅니다. 그래서 VFIO는 *device 단위*가 아니라 *group 단위*로 점유합니다.

PCIe **ACS**(Access Control Services)가 HW 지원이 되어야 그룹 분리가 가능합니다. 일부 메인보드는 ACS가 *비활성*이어서 여러 PCIe device가 한 group에 묶이기도 합니다.

```bash
# 어느 group인지 확인
readlink /sys/bus/pci/devices/0000:01:00.0/iommu_group
# /sys/kernel/iommu_groups/15

# 같은 group의 다른 device들
ls /sys/kernel/iommu_groups/15/devices/
# 0000:01:00.0
```

## 3-tier 구조

VFIO API의 핵심 어휘 셋.

| Tier | 파일 | 역할 |
|------|------|------|
| **Container** | `/dev/vfio/vfio` | *address space*. 여러 group 묶음 |
| **Group** | `/dev/vfio/N` (N = iommu_group 번호) | DMA isolation 단위 |
| **Device** | group에서 ioctl로 fd 받음 | PCI device 자체 |

```text
   ┌──────────────────────────────┐
   │   /dev/vfio/vfio (container) │
   │   - DMA address space         │
   │   - IOMMU type (type1, ...)   │
   └───────────┬──────────────────┘
               │ contains
   ┌───────────┴──────────┐
   │  /dev/vfio/15 (group) │
   │  IOMMU group 15       │
   └───────────┬──────────┘
               │ contains
   ┌───────────┴──────────┐
   │ device fd            │
   │ 0000:01:00.0         │
   └──────────────────────┘
```

## 주요 ioctl

| ioctl | 대상 | 의미 |
|-------|------|------|
| `VFIO_GET_API_VERSION` | container | API 버전 확인 |
| `VFIO_CHECK_EXTENSION` | container | IOMMU type 지원 확인 |
| `VFIO_GROUP_GET_STATUS` | group | viable 여부 |
| `VFIO_GROUP_SET_CONTAINER` | group | container에 join |
| `VFIO_SET_IOMMU` | container | IOMMU type 설정 |
| `VFIO_IOMMU_MAP_DMA` | container | userspace VA → IOVA |
| `VFIO_GROUP_GET_DEVICE_FD` | group | device fd 얻기 |
| `VFIO_DEVICE_GET_INFO` | device | num_regions, num_irqs |
| `VFIO_DEVICE_GET_REGION_INFO` | device | BAR 정보 |
| `VFIO_DEVICE_SET_IRQS` | device | MSI-X eventfd 등록 |

## 환경 준비

VFIO 사용 전 두 가지.

```bash
# 1. IOMMU 활성 (Intel)
sudo grubby --update-kernel=ALL --args="intel_iommu=on iommu=pt"
sudo reboot

# AMD는 amd_iommu=on iommu=pt
```

`iommu=pt`(passthrough mode)는 host driver가 *직접* DMA할 때는 IOMMU 우회, *VFIO 점유*된 device만 IOMMU 적용 — 성능과 보안의 균형.

```bash
# 2. vfio-pci에 device 등록
sudo modprobe vfio-pci

# device ID로 자동 매칭
echo "1234 6677" | sudo tee /sys/bus/pci/drivers/vfio-pci/new_id

# 또는 명시적 unbind/bind
DEV=0000:01:00.0
echo $DEV | sudo tee /sys/bus/pci/devices/$DEV/driver/unbind || true
echo $DEV | sudo tee /sys/bus/pci/drivers/vfio-pci/bind
```

```bash
# 확인 — /dev/vfio/N 생성됨
ls /dev/vfio/
# vfio  15
```

## 첫 VFIO 호출 — userspace driver

```c
#include <linux/vfio.h>
#include <sys/ioctl.h>
#include <sys/mman.h>
#include <fcntl.h>
#include <stdio.h>
#include <stdint.h>

int main(void) {
    /* 1. container open */
    int container = open("/dev/vfio/vfio", O_RDWR);
    int api = ioctl(container, VFIO_GET_API_VERSION);
    /* API_VERSION 확인 */

    /* 2. group open */
    int group = open("/dev/vfio/15", O_RDWR);
    struct vfio_group_status gs = { .argsz = sizeof(gs) };
    ioctl(group, VFIO_GROUP_GET_STATUS, &gs);
    /* gs.flags & VFIO_GROUP_FLAGS_VIABLE 확인 */

    /* 3. group → container */
    ioctl(group, VFIO_GROUP_SET_CONTAINER, &container);
    ioctl(container, VFIO_SET_IOMMU, VFIO_TYPE1_IOMMU);

    /* 4. device fd */
    int device = ioctl(group, VFIO_GROUP_GET_DEVICE_FD, "0000:01:00.0");

    /* 5. device info */
    struct vfio_device_info di = { .argsz = sizeof(di) };
    ioctl(device, VFIO_DEVICE_GET_INFO, &di);
    printf("num_regions=%u, num_irqs=%u\n", di.num_regions, di.num_irqs);

    /* 6. BAR0 mmap */
    struct vfio_region_info ri = {
        .argsz = sizeof(ri),
        .index = VFIO_PCI_BAR0_REGION_INDEX,
    };
    ioctl(device, VFIO_DEVICE_GET_REGION_INFO, &ri);
    void *mmio = mmap(NULL, ri.size, PROT_READ | PROT_WRITE,
                      MAP_SHARED, device, ri.offset);
    printf("IDENT: 0x%x\n", *(volatile uint32_t *)mmio);   /* "XLNX" */

    /* 7. DMA buffer 매핑 */
    void *buf = mmap(NULL, 4096, PROT_READ | PROT_WRITE,
                     MAP_PRIVATE | MAP_ANONYMOUS, -1, 0);
    struct vfio_iommu_type1_dma_map dm = {
        .argsz = sizeof(dm),
        .flags = VFIO_DMA_MAP_FLAG_READ | VFIO_DMA_MAP_FLAG_WRITE,
        .vaddr = (uint64_t)buf,
        .iova  = 0x10000000,
        .size  = 4096,
    };
    ioctl(container, VFIO_IOMMU_MAP_DMA, &dm);

    /* 이제 device는 IOVA 0x10000000을 통해 buf에 접근 가능 */
    return 0;
}
```

이 코드가 *kernel driver 없이* FPGA의 BAR을 읽고 DMA를 셋업하는 *최소 골격*입니다.

## MSI-X eventfd

IRQ도 userspace에 직접 전달됩니다.

```c
int efd = eventfd(0, EFD_CLOEXEC);

struct vfio_irq_set *irq_set = calloc(1, sizeof(*irq_set) + sizeof(int));
irq_set->argsz = sizeof(*irq_set) + sizeof(int);
irq_set->flags = VFIO_IRQ_SET_DATA_EVENTFD | VFIO_IRQ_SET_ACTION_TRIGGER;
irq_set->index = VFIO_PCI_MSIX_IRQ_INDEX;
irq_set->start = 0;
irq_set->count = 1;
*(int *)irq_set->data = efd;
ioctl(device, VFIO_DEVICE_SET_IRQS, irq_set);

/* userspace는 eventfd에 read로 IRQ wait */
uint64_t val;
read(efd, &val, sizeof(val));
```

KVM 환경에서는 *KVM IRQFD*를 통해 guest로 *직접* 라우팅되어 거의 native 성능.

## vfio-noiommu

IOMMU가 없는 환경에서도 VFIO를 쓸 수 있지만 *위험*합니다.

```bash
echo 1 | sudo tee /sys/module/vfio/parameters/enable_unsafe_noiommu_mode
```

DMA isolation이 없으므로 *userspace 코드가 잘못된 주소에 DMA*하면 host 메모리 corruption 가능. 학습이나 격리된 환경에서만.

## IOMMUFD — VFIO의 차세대

Linux 6.6+에서 **IOMMUFD**가 등장. `/dev/iommu`를 통해 *container 개념을 일반화*합니다.

| 항목 | VFIO | IOMMUFD |
|------|------|---------|
| 노드 | `/dev/vfio/vfio` | `/dev/iommu` |
| 단위 | container | IOAS(I/O Address Space) |
| 확장 | type1, type2... 묶음 | 더 유연한 hwpt 모델 |

기존 VFIO 코드는 *그대로 동작*하고, 새 코드는 IOMMUFD를 선택할 수 있습니다. PCIe Deep Dive 시리즈가 자세히 다룹니다.

## 정리

- **VFIO**는 userspace가 디바이스를 *안전하게* 소유하게 하는 framework. kernel-bypass driver와 VM passthrough에 모두 사용.
- **IOMMU group**이 DMA isolation 단위. 같은 group끼리는 cross-DMA 가능 → group 단위로 점유.
- **3-tier**: container(주소 공간) → group(격리 단위) → device(개별 PCI).
- 환경 준비: `intel_iommu=on iommu=pt` + `vfio-pci`에 device bind.
- 7-step 흐름: container open → group open → set_container → device fd → device info → BAR mmap → DMA map.
- MSI-X는 *eventfd*로 userspace 또는 KVM IRQFD에 직접 전달.
- `vfio-noiommu`는 IOMMU 없는 환경. *위험*하므로 학습용에만.
- Linux 6.6+ **IOMMUFD**가 VFIO 차세대. 기존 코드와 호환.

## 다음 장 예고

다음 장은 *실 FPGA*를 VM에 pass-through하는 **VFIO-PCI** 흐름. 우리가 fake FPGA로 짠 driver가 *진짜* Alveo·PAC에서 동작하는 결정적 단계입니다.

## 관련 항목

- [Ch 8: Partial Reconfiguration](/blog/tools/emulation/qemu-fpga-driver/chapter08-partial-reconfig)
- [Ch 10: VFIO-PCI 패스스루](/blog/tools/emulation/qemu-fpga-driver/chapter10-vfio-pci-passthrough)
- [PCIe Deep Dive — SR-IOV/VFIO](/blog/embedded/hardware/pcie/chapter01-overview)
- [QEMU Internals — KVM Accel](/blog/tools/emulation/qemu-internals/chapter14-kvm-accel)
