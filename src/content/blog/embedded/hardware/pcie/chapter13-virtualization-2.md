---
title: "Ch 13: Virtualization II — vIOMMU·Scalable IOV·VirtIO·IDE·TDISP"
slug: "embedded/hardware/pcie/chapter13-virtualization-2"
date: 2026-05-19T09:13:00
description: "Guest 측 vIOMMU·Intel S-IOV·VirtIO·vDPA·live migration·Confidential I/O (IDE·TDISP·CMA-SPDM)."
series: "PCIe Deep Dive"
seriesOrder: 13
tags: [pcie, viommu, scalable-iov, virtio, ide, tdisp, confidential-computing]
draft: false
topics: ["embedded", "embedded/hardware"]
---

## 가상화 기능을 하나의 보장으로 묶지 않기

vIOMMU·S-IOV·VirtIO·Confidential I/O는 서로 다른 문제를 풉니다. guest가 보는 DMA 주소, 장치를 나누는 단위, guest와 장치 사이의 queue 형식, 신뢰 경계가 각각 다릅니다. 이 장은 시리즈 VM(QEMU 11.1.3 virt + SMMUv3, Debian 13, 커널 6.12.116) 자체가 guest라는 점을 이용해 vIOMMU와 virtio를 직접 관찰하고, 실행할 수 없는 S-IOV와 IDE·TDISP는 공개 규격과 Linux 헤더로만 다룹니다.

## vIOMMU와 두 주소 변환

시리즈 VM의 SMMUv3는 QEMU가 에뮬레이션하는 vIOMMU입니다. guest 커널이 SMMU page table을 만들고, QEMU가 그 table을 따라가 장치의 DMA 주소를 바꿉니다. [Ch 11](/blog/embedded/hardware/pcie/chapter11-linux-dma)의 QEMU trace가 그 장면이었습니다.

```text
smmu_ptw_level stage=1 level=0 iova=0xabc0000 subpage_sz=0x8000000000 baseaddr=0x100c8a000 offset=0 => pte=0x100c8c003
smmuv3_translate_success smmuv3-iommu-memory-region-0-5 sid=0x300 iova=0xfffff040 translated=0x8020040 perm=0x3 stage=1
```

`stage=1`은 guest가 관리하는 변환입니다. 결과 주소(trace의 0x8020040, [Ch 11](/blog/embedded/hardware/pcie/chapter11-linux-dma)에서 커널이 보고한 0x135199000)는 guest 물리 주소이고, 그 뒤 host 물리 주소로 가는 단계는 HVF가 맡아 guest에서는 보이지 않습니다. guest에 vIOMMU가 보인다는 사실과 하드웨어가 두 단계를 함께 처리한다는 사실은 이렇게 구분됩니다.

| 관점 | 변환 | 시리즈 VM에서 맡은 쪽 |
|------|------|------|
| guest가 관리 | guest IOVA → guest physical | guest Linux가 만든 SMMU stage 1 table, QEMU가 에뮬레이션 |
| host 보호 경계 | guest physical → host physical | 하이퍼바이저(HVF) |

### virtio는 기본으로 vIOMMU를 거치지 않는다

guest의 virtio 장치들도 IOMMU group에 들어가 있지만, 실제로 vIOMMU를 쓰는지는 virtio feature가 정합니다. [VirtIO 1.2](https://docs.oasis-open.org/virtio/virtio/v1.2/virtio-v1.2.html)의 `VIRTIO_F_ACCESS_PLATFORM(33)` 설명은 이 비트가 0이면 장치가 드라이버와 같은 주소, 즉 보통 CPU 물리 주소를 그대로 쓰고, 이 경우 IOMMU 같은 플랫폼 설명을 무시한다고 적습니다. Linux v6.12 `vring_use_dma_api()`(`drivers/virtio/virtio_ring.c:280-298`)도 이 비트가 없으면 Xen guest가 아닌 한 DMA API를 쓰지 않습니다.

시리즈 VM의 virtio 장치가 협상한 feature입니다. sysfs `features`는 bit 0부터 왼쪽에서 오른쪽으로 찍습니다(`drivers/virtio/virtio.c:47-59`).

```text
virtio2 [2, 5, 15, 16, 17, 18, 19, 21, 23, 28, 29, 32, 40]
virtio3 [2, 5, 15, 16, 17, 18, 19, 21, 23, 28, 29, 32, 34, 40]
diff [34]
```

(`features` 문자열에서 1인 위치를 Python으로 뽑은 결과.) 두 장치 모두 bit 32(`VERSION_1`)는 있고 bit 33(`ACCESS_PLATFORM`)은 없습니다. QEMU 11.1.3의 `virtio-net-pci`는 `iommu_platform` 속성 기본값이 `off`입니다. 이 VM의 virtio 장치는 SMMU를 거치지 않고 guest 물리 주소로 DMA합니다. guest에 vIOMMU가 있다는 사실이 모든 장치가 그것을 쓴다는 뜻은 아닙니다.

## S-IOV와 ADI

[Intel Scalable I/O Virtualization Technical Specification Rev 1.1](https://cdrdv2-public.intel.com/671403/intel-scalable-io-virtualization-technical-specification.pdf)(Order Number 337679-002, 2020년 9월)은 §1.2.2에서 장치를 나눠 할당하는 단위를 ADI(Assignable Device Interface)로 정의합니다. 각 ADI는 소프트웨어가 가상 장치의 direct-path 동작을 위해 할당한 장치 자원의 묶음입니다. §1.2.3은 한 function의 모든 ADI가 그 function의 Requester ID를 함께 쓰고, ADI마다의 메모리 요청은 20비트 PASID로 구분한다고 적습니다.

| 비교 | SR-IOV ([Ch 12](/blog/embedded/hardware/pcie/chapter12-virtualization-1)) | Scalable IOV (규격 §1.2) |
|------|------|------|
| 할당 단위 | VF, 별도 PCI function | ADI, 소프트웨어가 묶은 장치 자원 |
| 요청 식별 | VF마다 다른 Requester ID (시리즈 VM에서 03:10.0, 03:10.2) | 같은 Requester ID, ADI마다 다른 PASID |
| IOMMU group | VF마다 따로 (13·14) | 이 VM에서 확인할 수 없음 |

시리즈 VM에는 PASID Capability를 가진 장치가 없고, Debian 커널은 SMMUv3 SVA도 꺼져 있어([Ch 11](/blog/embedded/hardware/pcie/chapter11-linux-dma)) S-IOV는 실행하지 않았습니다.

## VirtIO와 vDPA

VirtIO는 드라이버와 장치가 feature를 협상하고 정해진 virtqueue 형식으로 요청을 주고받는 규격입니다. VirtIO 1.2 §2.7은 Split Virtqueue, §2.8은 Packed Virtqueue를 정의하고, §2.8 둘째 문장은 packed 사용이 `VIRTIO_F_RING_PACKED` feature 협상으로 정해진다고 적습니다. 이 비트는 34번입니다.

이것을 확인하려고 비어 있던 root port rp5에 `packed=on`인 virtio-net을 hot-plug했습니다.

```text
(qemu) netdev_add user,id=n5,restrict=on
(qemu) device_add virtio-net-pci,id=vn5,bus=rp5,netdev=n5,packed=on,disable-legacy=on
```

새 장치 virtio3(08:00.0)은 위 feature 목록에서 기존 virtio2와 bit 34 하나만 다릅니다. QEMU `packed` 속성의 기본값은 `off`이므로, 기존 장치들은 split virtqueue를 쓰고 있었다는 뜻입니다. packed가 성능에 어떤 차이를 내는지는 측정하지 않았습니다. hot-plug 과정 자체는 [Ch 14](/blog/embedded/hardware/pcie/chapter14-linux-operations)에서 봅니다.

vDPA와 vhost backend는 이 VM에서 구성하지 않았습니다.

## Pass-through migration의 세 가지 상태

[QEMU 11.1.3 `docs/devel/migration/vfio.rst`](https://gitlab.com/qemu-project/qemu/-/blob/v11.1.3/docs/devel/migration/vfio.rst)는 VFIO 장치 migration에서 장치 상태 저장과 DMA로 더러워진 page 추적을 따로 다룹니다. guest RAM만 복사해서는 장치가 따라가지 않습니다. 이사로 치면, 짐은 다 옮겼는데 아직 누군가 옛집에서 상자를 채우고 있는 상황이 진행 중인 DMA입니다.

| 항목 | 필요한 것 |
|------|------|
| 장치 상태 | 드라이버가 제공하는 migration state와 save/restore |
| DMA dirty page | 장치나 IOMMU의 dirty page 추적 |
| 목적지 | 같은 장치·feature·상태를 받을 수 있는 대상 |

이 VM에서 migration은 실행하지 않았습니다. PRI(Page Request Interface)는 장치가 page를 요청하는 기능이라 dirty page 추적과는 다릅니다.

## Confidential I/O의 신뢰 경계

암호화된 VM 메모리만으로 외부 장치까지 믿을 수는 없습니다. 링크 보호, 장치 신원, VM에 할당된 interface 상태를 따로 봐야 합니다. 이 VM에는 이 기능을 가진 장치가 없어, Linux 헤더와 [Embedded Security Ch 11](/blog/embedded/embedded-security/chapter11-pcie-cxl-ide)의 분석으로만 다룹니다.

| 기능 | 공개 자료로 확인한 것 |
|------|------|
| PCIe IDE | Extended Capability 0x30. Linux v6.12 `pci_regs.h`에는 없고, 2026-11-16에 받은 mainline 7.4-rc3 `pci_regs.h:764`와 pciutils 3.13.0 `lib/header.h:259`에 있음. 같은 mainline 헤더 792-793행에 AER의 `IDE Check Failed`·`Misrouted IDE TLP` 비트 |
| TDISP | mainline 7.4-rc3 `pci_regs.h:511`의 Device Capabilities `PCI_EXP_DEVCAP_TEE`, 주석 "TEE I/O (TDISP) Support". 시리즈 VM의 `lspci -vv`에도 `DevCap: ... TEE-IO-`로 나옴 |
| IDE stream 종류 | Embedded Security Ch 11: Link IDE는 TC별, Selective IDE는 RID·주소 범위 association을 가짐 (CXL 3.1 Table 11-1, pciutils 레지스터 정의) |

시리즈 VM root port의 AER 출력에도 IDE 관련 비트가 이미 보입니다. pciutils 3.13.0이 `UESta: ... IDECheck- MisIDETLP- PCRC_CHECK- ...`를 찍는데, Linux v6.12 커널 헤더에는 이 비트의 정의가 없고 mainline에 들어왔습니다. 도구와 커널의 지원 시점이 다르다는 예입니다. Link IDE 제어 레지스터를 pciutils 3.13.0이 잘못 해석하는 문제는 Embedded Security Ch 11에 재현이 있습니다.

이전 판의 TDISP 링크는 pcisig.com 문서로, 이번 작업에서 열 수 없어 지웠습니다. SPDM·TDISP의 세션 절차는 이번에 연 자료에 없어 다루지 않습니다. CXL 쪽 TSP는 [CXL 보안 장](/blog/embedded/hardware/cxl/chapter14-security)에 있습니다.

## 정리

- 시리즈 VM의 SMMUv3는 guest가 관리하는 stage 1 변환이고, guest 물리 주소에서 host 물리 주소로 가는 단계는 하이퍼바이저가 맡습니다.
- virtio 장치는 `VIRTIO_F_ACCESS_PLATFORM`(bit 33)을 협상해야 vIOMMU를 씁니다. 이 VM의 virtio 장치에는 그 비트가 없었습니다.
- Scalable IOV의 ADI는 같은 Requester ID 아래 PASID로 구분되는 할당 단위이고, VF는 별도 function입니다.
- Packed virtqueue는 bit 34 협상으로 정해지고, `packed=on` 장치에서만 그 비트가 켜졌습니다.
- migration에는 장치 상태와 DMA dirty page 추적이 따로 필요합니다.
- IDE·TDISP 정의는 Linux v6.12에는 없고 mainline 7.4-rc3에 있으며, pciutils 3.13.0은 IDE 관련 AER 비트를 이미 찍습니다.

## 다음 편

[Ch 14: Linux Operations — Hot-plug·AER·DPC·ARI](/blog/embedded/hardware/pcie/chapter14-linux-operations)에서 위에서 붙였다 뗀 장치의 hot-plug 흐름과 운영 중 확인할 값을 정리합니다.

## 관련 항목

- [Ch 11: DMA·IOMMU](/blog/embedded/hardware/pcie/chapter11-linux-dma) — SMMU trace와 IOMMU group
- [Ch 12: Virtualization I](/blog/embedded/hardware/pcie/chapter12-virtualization-1) — SR-IOV·VFIO
- [Embedded Security Ch 11: PCIe·CXL IDE](/blog/embedded/embedded-security/chapter11-pcie-cxl-ide) — IDE stream과 pciutils 해석
- [CXL Internals Ch 14: Security](/blog/embedded/hardware/cxl/chapter14-security) — IDE·SPDM·TSP·CXL TEE

## 시리즈 자료 출처 안내

이 글의 소스 인용은 Linux v6.12, mainline 7.4-rc3 `pci_regs.h`(kernel.org, 2026-11-16), QEMU 11.1.3, VirtIO 1.2, Intel S-IOV Rev 1.1 기준이고 실행은 Ch 1의 시리즈 VM에서 했습니다. 자료 정책은 [Ch 1 footer](/blog/embedded/hardware/pcie/chapter01-fundamentals#시리즈-자료-출처-안내)에 있습니다.
