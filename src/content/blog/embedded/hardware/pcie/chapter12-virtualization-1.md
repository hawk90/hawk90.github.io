---
title: "Ch 12: Virtualization I — Pass-through·SR-IOV·VFIO·DPDK·SPDK"
date: 2026-05-19T09:12:00
description: "PCIe hardware virtualization — SR-IOV PF/VF·VFIO container/group/device·DPDK·SPDK·ACS·FLR."
series: "PCIe Deep Dive"
seriesOrder: 12
tags: [pcie, sr-iov, vfio, dpdk, spdk, virtualization, acs]
draft: false
---

## 한 줄 요약

> **"PCIe pass-through는 *guest VM·userspace process*에 *물리 device를 직접 owner로 제공*하는 메커니즘입니다."** — *SR-IOV*가 *PF 1개를 N개 VF로 분할*하는 *hardware partition*, *VFIO*가 *Linux kernel의 userspace DMA-safe interface*, *DPDK·SPDK*가 *그 위에 응용*. *ACS*가 *IOMMU 그룹 분리*의 핵심, *FLR*가 *device 격리 reset*.

[Ch 11 IOMMU](/blog/embedded/hardware/pcie/chapter11-linux-dma)에서 *IOMMU group·ATS·PRI·PASID*를 봤습니다. 이 장은 *그 토대 위 hardware virtualization*을 본격적으로 분해합니다.

## SR-IOV — PF·VF 모델

*PF (Physical Function)*가 *N개 VF (Virtual Function)*를 광고:

| 객체 | 의미 |
|------|------|
| **PF** | 원본 device. *full configuration·VF 관리* |
| **VF** | 가벼운 가상 instance. *기본 I/O만 가능·VF 설정은 PF로* |
| **NumVFs** | PF가 활성화한 VF 수 (펌웨어 max 한계 내) |
| **VF BAR** | template으로 광고, stride로 매핑 (Ch 4) |

활성화:

```bash
# PF에 8개 VF 활성
echo 8 > /sys/bus/pci/devices/0000:01:00.0/sriov_numvfs

# VF가 새 BDF로 등록
ls /sys/bus/pci/devices/ | grep "01:00"
0000:01:00.0  # PF
0000:01:10.0  # VF 0
0000:01:10.1  # VF 1
...
```

*VF는 별도 driver 가능*. Mellanox NIC·Intel 100 GbE가 *SR-IOV 채택*해 *one NIC이 64+ VF로 분할*.

## VF Capability·Restrictions

| 항목 | PF | VF |
|------|----|----|
| Configuration Space write | 전부 가능 | *제한적* |
| MSI-X | full table | *VF 자체 vector table* |
| BAR | 자체 자원 | *VF BAR stride로 PF가 할당* |
| Reset | 모든 reset | *FLR만* |
| ACS | 자체 | PF의 ACS 정책 적용 |
| Hot-plug | full | 제한적 |

VF가 *light-weight*인 만큼 *대부분 기능을 PF에 의존*. *NIC driver*는 *PF driver + VF driver* 별도.

## VFIO — Userspace PCI Driver Framework

*kernel이 device를 userspace에 넘기는 안전한 방법*. 4 계층:

| 계층 | 의미 |
|------|------|
| **vfio-pci** driver | 일반 PCI driver 대체 |
| **container** | address space (IOMMU group들의 묶음) |
| **group** | IOMMU group (분리 단위) |
| **device** | 실 device |

```c
// Userspace에서 (간략화)
int container = open("/dev/vfio/vfio", O_RDWR);
int group = open("/dev/vfio/15", O_RDWR);
ioctl(group, VFIO_GROUP_SET_CONTAINER, &container);
ioctl(container, VFIO_SET_IOMMU, VFIO_TYPE1_IOMMU);
int device = ioctl(group, VFIO_GROUP_GET_DEVICE_FD, name);
```

이후 *device fd로 BAR mmap·IRQ event·DMA buffer 등록*. *kernel은 IOMMU·interrupt remapping만 보호*, *나머지는 userspace 자유*.

## vfio-pci → QEMU 흐름

```text
QEMU process
  └─ VFIO API 호출
        ├─ container (guest address space)
        ├─ group (IOMMU group)
        └─ device fd (실 PCIe device)
              ↓
        Kernel VFIO driver
              ↓
        IOMMU (mapping·isolation)
              ↓
        Real PCIe device
```

```bash
# QEMU
qemu-system-x86_64 \
  -device vfio-pci,host=01:00.0 \
  ...

# Guest 안에서 그 device가 *그대로* 보임
```

GPU·NIC pass-through가 흔한 사용. *Guest driver가 직접 device 제어*.

## ACS — Access Control Services

*IOMMU 그룹 분리 가능성* 결정:

| ACS 비트 | 의미 |
|----------|------|
| Source Validation | Source ID 검증 |
| Translation Blocking | 변환 차단 |
| P2P Request Redirect | P2P 차단 |
| Completion Redirect | Completion 차단 |

*Switch downstream port*가 *ACS 활성*해야 *그 port에 매달린 device가 단독 group*. *ACS 미지원 switch*면 *모든 downstream device가 한 group*.

`lspci -vvv | grep ACS`로 확인. *ACS override patch*로 강제 분리 가능하지만 *security 약화*.

## DPDK — Userspace NIC Driver

*Poll Mode Driver (PMD)*가 *kernel network stack 우회*:

| 요소 | 역할 |
|------|------|
| **vfio-pci** | NIC을 userspace 소유로 |
| **PMD** | userspace driver, kernel 없이 |
| **hugepage** | 2 MB·1 GB page, TLB miss 절약 |
| **lcore** | dedicated CPU core, polling |
| **zero-copy** | DMA 직접, copy 없음 |

```bash
# NIC을 vfio-pci binding
dpdk-devbind.py --bind=vfio-pci 01:00.0

# hugepage 예약
echo 4096 > /proc/sys/vm/nr_hugepages

# DPDK app 실행 (lcore 4개)
./l3fwd -l 0-3 -n 4 -- -p 0x3 --config="(0,0,0),(1,0,1)"
```

Telco vRAN·UPF·Open vSwitch-DPDK·SmartNIC firmware가 *DPDK 토대*.

## SPDK — Userspace NVMe Driver

*같은 패턴을 NVMe SSD에 적용*:

| 요소 | 역할 |
|------|------|
| vfio-pci binding | NVMe controller을 userspace |
| PMD | SQ·CQ doorbell 직접 |
| hugepage | I/O buffer |
| vhost-user-blk | KVM guest에 export 가능 |

NVMe AFA (Lightbits·Pavilion·NetApp) target이 *SPDK 기반*. *latency·throughput*에서 *kernel block stack 대비 큰 우위*.

## VFIO와 DPDK/SPDK 관계

| 역할 | 누가 |
|------|------|
| 인프라 (IOMMU·DMA-safe) | VFIO |
| 응용 (network·storage) | DPDK·SPDK |
| 공유 토대 | IOMMU 활성 + ACS + hugepage |

VFIO는 *제공만*, *어떻게 쓸지는 userspace*. *vfio-user (out-of-process)*도 SPDK가 활발 채택.

## Mediated Devices (mdev)

*soft partition* — hardware SR-IOV 없을 때 *driver가 software로 분할*:

| 예 | 의미 |
|----|------|
| NVIDIA vGPU | physical GPU를 *driver level partition* |
| Intel GVT-g | Intel iGPU virtualization |

*hardware partition (SR-IOV) vs software partition (mdev)*. mdev는 *isolation 약함*, *flexibility 높음*.

## Reset 종류 (VFIO 시점)

| Reset | 적용 |
|-------|------|
| **FLR** | VF·function 단위 | *우선* |
| **Secondary Bus Reset** | bridge가 *secondary bus 전체* reset |
| **Hot Reset** | 양단 link 강제 reset |

VFIO는 *device를 guest에 넘기기 전 reset* — *이전 상태 영향 제거*. *FLR 미지원 device*는 *secondary bus reset* 필요해 *같은 bus 다른 device 영향*.

## 자주 하는 실수

### "SR-IOV NumVFs은 자유"

*PF의 펌웨어 max VF*까지만. *데이터시트 확인 필요*. *NumVFs 변경 후 VF 등록 실패*면 *resource 부족 또는 펌웨어 한계*.

### "VFIO bind = userspace 안전"

*반드시 IOMMU 활성 + ACS 적절 + group 분리* 필요. 미흡하면 *user space process가 임의 메모리 corruption 가능*. `vfio_iommu_type1_dma_map`에서 *권한 검증*.

### "DPDK 쓰면 모든 NIC 빨라진다"

*PMD·driver 지원 필수*. *지원 안 되는 NIC*는 DPDK에서 작동 안 함. *NIC capability + driver 매칭* 확인.

### "ACS override patch 안전"

*같은 group의 device들 사이 cross-DMA 가능*. *security 명백히 약화*. *production*에서 *피해야 함*. *home lab GPU pass-through*에는 흔히 사용.

### "VF는 PF와 독립"

VF의 *대부분 설정·reset·hot-plug*는 *PF 관여*. *PF 비활성*하면 *모든 VF 동작 안 함*.

## 정리

- *SR-IOV*가 *PF 1개 → N개 VF*의 *hardware partition*.
- *VF*는 *light-weight*. PF가 *대부분 control*.
- *VFIO*가 *kernel userspace DMA-safe interface*. 4 계층 (container·group·device·vfio-pci).
- *ACS*가 *IOMMU 그룹 분리*. switch downstream port의 ACS 활성이 *핵심*.
- *DPDK·SPDK*가 *VFIO 위 userspace driver framework*. PMD·hugepage·lcore.
- *Mediated Devices (mdev)*는 *software partition* (vGPU 등).
- *FLR·Secondary Bus·Hot Reset*이 *VFIO reset 옵션*.

## 다음 편

[Ch 13: Virtualization II — vIOMMU·Scalable IOV·VirtIO·IDE·TDISP](/blog/embedded/hardware/pcie/chapter13-virtualization-2)에서 *guest 측 vIOMMU·dynamic partition (S-IOV)·VirtIO·Confidential I/O*를 본격적으로 분해합니다.

## 관련 항목

- [Ch 4: BAR & MMIO](/blog/embedded/hardware/pcie/chapter04-bar-mmio) — VF BAR stride
- [Ch 11: DMA·IOMMU](/blog/embedded/hardware/pcie/chapter11-linux-dma) — IOMMU group·ATS
- [Ch 13: Virtualization II](/blog/embedded/hardware/pcie/chapter13-virtualization-2)

## 시리즈 자료 출처 안내

본 글의 1차 자료·정책은 [Ch 1 footer](/blog/embedded/hardware/pcie/chapter01-fundamentals#시리즈-자료-출처-안내) 참고.
