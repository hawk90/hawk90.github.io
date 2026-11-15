---
title: "Ch 11: DMA·IOMMU — Coherent·Streaming·ATS·PRI·PASID·IOMMUFD"
slug: "embedded/hardware/pcie/chapter11-linux-dma"
date: 2026-05-19T09:11:00
description: "Linux DMA API — coherent·streaming·scatter-gather·IOMMU mapping·ATS·PRI·PASID·SVM·IOMMUFD."
series: "PCIe Deep Dive"
seriesOrder: 11
tags: [pcie, dma, iommu, ats, pasid, iommufd, svm]
draft: false
topics: ["embedded", "embedded/hardware"]
---


## 주소와 소유권부터 구분하기

CPU가 쓰는 포인터와 장치에 전달하는 DMA 주소는 같은 값이라고 가정할 수 없습니다. CPU virtual address, host physical address, 장치가 보는 `dma_addr_t`를 구분해야 합니다. IOMMU가 있으면 장치 주소를 host 메모리에 매핑하고, 없어도 bus 주소 변환·bounce buffer 때문에 CPU 주소와 달라질 수 있습니다.

기준은 [Linux v6.12 DMA API HOWTO](https://github.com/torvalds/linux/blob/adc218676eef25575469234709c2d87185ca223a/Documentation/core-api/dma-api-howto.rst)입니다. 이 글은 API 계약과 실패·해제 경계를 설명하며 실제 장치 DMA나 kernel module을 실행하지 않았습니다. 장치의 완료 register·descriptor protocol 없이 “map 다음 unmap”만 실행하는 예를 완성 driver로 제시하지 않습니다.

## Coherent와 Streaming DMA

DMA 모델은 단순한 buffer 크기 분류보다 CPU와 장치가 언제 어떤 접근을 허용받는지로 구분하는 편이 정확합니다. Coherent는 양쪽의 변경을 cache 유지보수 호출 없이 볼 수 있는 계약입니다. Streaming은 mapping·sync·unmap에 따라 접근 소유권을 넘깁니다.

| 모델 | 성공·실패 확인 | 수명과 해제 |
|------|------|------|
| `dma_alloc_coherent()` | CPU 포인터 NULL 검사. 별도로 받은 `dma_addr_t`를 장치에 전달 | DMA 중단·완료를 확인한 뒤 같은 장치·크기·주소로 `dma_free_coherent()` |
| `dma_map_single()` | `dma_mapping_error()` 검사. 반환 주소 0만으로 실패 판정하지 않음 | 완료 확인 후 같은 크기·방향으로 unmap. 재사용 mapping은 적절한 sync로 소유권 전환 |
| `dma_map_sg()` | 반환 count가 0이면 실패 | 장치 descriptor에는 반환된 mapped entry를 사용. unmap·sync에는 원래 `nents` 전달 |

Coherent 메모리에도 ordering은 필요합니다. Descriptor의 주소 필드를 쓴 뒤 valid bit를 올리는 순서, doorbell에 알리는 순서는 장치 protocol과 적절한 barrier를 따라야 합니다. Coherent라는 말이 CPU의 모든 store 순서나 장치 작업 완료까지 보장하지는 않습니다.

### Streaming 방향은 장치 기준

방향은 CPU가 아니라 장치가 메모리를 읽고 쓰는 쪽으로 정합니다. Buffer를 화물 인도 구역으로 보면, 장치가 사용 중일 때 CPU가 임의로 짐을 바꾸면 안 됩니다. Cache flush·invalidate의 구체 동작은 architecture와 DMA 구현이 담당하므로 아래 계약을 지킵니다.

| 방향 | 장치 접근 | CPU가 다시 접근할 때 |
|------|------|------|
| `DMA_TO_DEVICE` | 메모리를 읽음 | 장치 사용 종료와 ownership 전환 확인 |
| `DMA_FROM_DEVICE` | 메모리에 씀 | 완료 확인 뒤 unmap 또는 `dma_sync_single_for_cpu()` |
| `DMA_BIDIRECTIONAL` | 읽고 씀 | 같은 mapping의 방향을 유지하며 CPU/device sync 수행 |

지속 mapping에서 CPU 처리가 끝나 다시 장치에 넘길 때는 `dma_sync_single_for_device()`가 필요할 수 있습니다. Map·unmap을 CPU 명령어별 flush 표로 외우거나 “ARM이면 driver가 직접 cache flush, x86이면 전부 생략”으로 나누면 안 됩니다. DDIO는 Linux DMA API의 필수 전제가 아닙니다.

### Scatter-gather의 두 개수

논리적인 buffer가 여러 물리 page에 흩어져 있어도 DMA mapping 과정에서 entry가 합쳐질 수 있습니다. 따라서 map에 넘긴 `nents`와 반환 `count`를 따로 보관합니다. 예를 들어 입력 4개가 출력 2개로 합쳐졌다면 장치에는 2개 DMA segment를 알리고, unmap에는 원래 4를 넘깁니다. 이 수치는 병합 상황을 설명하는 예이며 실장비 관찰값이 아닙니다.

Mapping에 성공했다는 사실은 DMA 완료가 아닙니다. Timeout이나 remove에서 DMA 발생을 막지 않은 채 unmap·free하면 장치가 이미 반환된 메모리에 접근할 수 있습니다. 실패한 mapping은 장치에 전달하지 않고, 이미 성공한 다른 mapping만 정확히 정리해야 합니다.

## DMA mask와 bounce buffer

Driver는 장치가 실제로 지원하는 DMA 주소 폭을 선언하고 `dma_set_mask_and_coherent()` 등의 반환을 검사합니다. 64-bit CPU나 64-bit BAR가 있다고 DMA engine도 64-bit인 것은 아닙니다. 64-bit 설정 실패 뒤 32-bit로 재시도할지는 장치가 두 모드를 실제 지원하는 경우에만 결정합니다.

SWIOTLB는 주소 범위 제약뿐 아니라 confidential guest 등의 공유·암호화 경계에서도 bounce buffer로 쓰일 수 있습니다. 현대 장치라는 이유로 미사용이라고 단정하지 않습니다. DMA API는 필요하면 복사·매핑을 수행하므로 zero-copy 여부도 실제 경로를 확인해야 합니다.

## IOMMU와 Group

IOMMU는 장치 주소를 host 메모리로 변환하고 허용 범위를 제한합니다. IOMMU 자체에도 translation cache가 있으므로 ATS가 없다고 모든 DMA가 매번 page walk하는 것은 아닙니다. DMA remapping과 Interrupt Remapping의 지원·활성화도 각각 확인해야 합니다.

[Linux VFIO 문서](https://www.kernel.org/doc/html/v6.12/driver-api/vfio.html)는 group을 다른 장치들과 격리 가능한 소유권 단위로 설명합니다. Group은 ACS·topology·DMA alias·장치 내부 경로 등을 반영하므로, ACS 비트 하나만으로 단독 group이나 완전한 장치 격리를 보장하지 않습니다. Group을 인위적으로 나누는 설정은 없는 하드웨어 격리를 새로 만들지 않습니다.

## ATS·PRI·PASID와 SVA

세 기능은 역할이 다릅니다. Capability가 있다는 사실과 OS가 특정 process의 address space를 장치에 bind했다는 사실도 구분합니다. ID는 [v6.12 pci_regs.h](https://github.com/torvalds/linux/blob/adc218676eef25575469234709c2d87185ca223a/include/uapi/linux/pci_regs.h)를 기준으로 합니다.

| 기능 | Extended Capability ID | 역할 |
|------|------|------|
| ATS | 0x000F | 장치가 번역 정보를 요청·cache하고 host의 invalidation 절차에 참여 |
| PRI | 0x0013 | 필요한 page에 관한 요청과 응답. 성공·권한 거부·실패 처리가 필요 |
| PASID | 0x001B | 요청의 address-space context 식별. 최대 폭은 20-bit이며 지원 폭을 확인 |

Process VA를 장치와 공유하는 SVA/SVM에는 driver·IOMMU·장치의 지원과 process 수명·권한·invalidation 처리가 필요합니다. PASID를 켠 것만으로 공유 주소 공간이나 demand paging이 완성되지 않습니다. PRI는 dirty-page tracking 기능이 아니고, page-in 실패를 자동으로 성공으로 바꾸지도 않습니다.

## IOMMUFD와 userspace

[IOMMUFD v6.12 문서](https://www.kernel.org/doc/html/v6.12/userspace-api/iommufd.html)는 `/dev/iommu`를 통한 IOAS·HWPT 등의 객체와 VFIO 연계를 설명합니다. IOAS는 I/O 주소 공간, HWPT는 hardware page-table 관련 객체이며, 실제 제공되는 ioctl과 nesting·fault 처리 기능은 kernel·IOMMU driver 판에 따라 확인해야 합니다. “6.6 이상이면 모든 S-IOV·vIOMMU 기능이 stable”이라는 하나의 기준으로 묶을 수는 없습니다.

기존 VFIO group/container API와 cdev·IOMMUFD의 경로를 한 코드 조각에서 섞지 않습니다. 어느 API를 쓰든 장치 소유권, 허용된 메모리의 map/unmap, DMA 종료, fd·process 종료 시 정리를 확인해야 합니다. 다음 장은 이 소유권을 실제 PF/VF와 guest에 연결하는 문제를 다룹니다.

## 정리

- CPU 포인터·physical address·DMA 주소를 구분하고 DMA API의 반환값을 사용합니다.
- Coherent도 barrier·장치 완료 protocol이 필요합니다.
- Streaming은 방향과 CPU/device ownership을 지키고 mapping 실패를 검사합니다.
- SG의 장치 사용 개수는 반환 count, unmap·sync 개수는 원래 nents입니다.
- DMA 중단 전에 mapping이나 메모리를 해제하면 안 됩니다.
- ATS·PRI·PASID, IOMMU group, IOMMUFD는 각각 다른 역할과 지원 조건을 가집니다.

## 다음 편

[Ch 12: Virtualization I — Pass-through·SR-IOV·VFIO](/blog/embedded/hardware/pcie/chapter12-virtualization-1)에서 *PF/VF·VFIO container·DPDK·SPDK*의 *hardware-level virtualization*을 본격적으로 분해합니다.

## 관련 항목

- [Ch 4: BAR & MMIO](/blog/embedded/hardware/pcie/chapter04-bar-mmio) — SR-IOV VF BAR
- [Ch 5: Interrupts](/blog/embedded/hardware/pcie/chapter05-interrupts) — Interrupt Remapping
- [Ch 12: Virtualization I](/blog/embedded/hardware/pcie/chapter12-virtualization-1)
- [Ch 13: Virtualization II](/blog/embedded/hardware/pcie/chapter13-virtualization-2) — vIOMMU·S-IOV·IDE/TDISP
- [Driver + RTL Co-simulation](/blog/tools/emulation/driver-cosim/chapter08-end-to-end) — DMA descriptor ring을 silicon 전에 RTL과 돌려 보는 흐름

## 시리즈 자료 출처 안내

본 글의 1차 자료·정책은 [Ch 1 footer](/blog/embedded/hardware/pcie/chapter01-fundamentals#시리즈-자료-출처-안내) 참고.
