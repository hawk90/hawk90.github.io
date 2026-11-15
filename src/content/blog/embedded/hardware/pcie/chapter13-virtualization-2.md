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

vIOMMU·S-IOV·VirtIO·Confidential I/O는 서로 다른 문제를 풉니다. Guest가 보는 DMA 주소, 장치를 나누는 단위, guest와 device의 queue protocol, 신뢰 경계를 각각 구분해야 합니다. 어느 기능 하나가 있다고 나머지까지 지원되거나 빠르고 안전한 migration이 완성되는 것은 아닙니다.

이 장은 [Linux v6.12 VFIO](https://www.kernel.org/doc/html/v6.12/driver-api/vfio.html)·[IOMMUFD](https://www.kernel.org/doc/html/v6.12/userspace-api/iommufd.html), [Intel Scalable IOV Rev 1.1(2020-09) 기술 규격](https://cdrdv2-public.intel.com/671403/intel-scalable-io-virtualization-technical-specification.pdf), [VirtIO 1.2](https://docs.oasis-open.org/virtio/virtio/v1.2/virtio-v1.2.html)을 기준으로 역할과 확인 조건을 설명합니다. 실제 guest·ADI·vDPA 설정, migration 또는 TEE device assignment는 실행하지 않았습니다.

## vIOMMU와 두 주소 변환

Guest driver가 장치에 DMA 주소를 줄 때 guest 안의 IOMMU 추상을 제공할 수 있습니다. 하지만 guest에 vIOMMU가 노출됐다는 사실이 hardware nested translation 활성과 같지는 않습니다. Hypervisor가 guest mapping을 추적해 host mapping에 반영하는 방식과 hardware가 두 단계를 수행하는 방식을 구분합니다.

| 관점 | 주소 변환 |
|------|------|
| Guest가 관리하는 변환 | Guest IOVA → Guest physical address |
| Host의 보호 경계 | Guest physical address → Host physical address |
| Hardware nesting | 장치·IOMMU·kernel·hypervisor가 지원한 경우 두 단계를 hardware에서 연계 |

`intel-iommu`·virtio-iommu·SMMU 등의 이름만으로 빠르기 순서를 정할 수는 없습니다. DMA mapping 빈도, IOTLB miss, invalidation과 실제 지원 경로가 영향을 줍니다. Guest DPDK 사용도 모든 구성에서 vIOMMU를 반드시 요구하는 하나의 조건으로 묶을 수 없습니다.

## S-IOV와 ADI

Intel Scalable IOV의 ADI(Assignable Device Interface)는 공유 가능한 device backend 자원을 격리 단위로 구성한 것입니다. 별도 PCI function인 VF와 구분합니다. ADI를 같은 PCI function 아래 여러 출입구로 생각하면, 각 출입구를 식별하는 PASID와 자원을 관리하는 host 소프트웨어의 역할을 나눌 수 있습니다.

| 비교 | SR-IOV | Scalable IOV |
|------|------|------|
| 식별 단위 | 별도 PCI function인 VF | 별도 PCI function이 아닌 ADI |
| 자원 생성 | 지원 TotalVFs와 PF driver·resource 조건 안에서 설정 | 장치의 ADI 자원과 관리 소프트웨어 조건에 따라 생성 |
| 주소 공간 | function 단위 격리, PASID는 별도 기능 | PASID 기반 식별을 활용하는 구조 |
| 실제 한도 | 장치·firmware·시스템 자원에 의존 | 장치·소프트웨어 자원에 의존 |

SR-IOV도 NumVFs를 지원 범위 안에서 설정하므로 “firmware가 고정한 개수”라고 할 수는 없습니다. ADI 역시 소프트웨어가 만든다는 이유로 개수·resize·migration이 무제한인 것은 아닙니다. IDXD work queue를 설정하는 명령 하나가 ADI의 guest 할당과 격리를 모두 입증하지 않으므로, 미검증한 accel-config 예와 최초 상용 제품 단정은 사용하지 않습니다.

## VirtIO와 vDPA

VirtIO는 guest driver와 device가 feature와 queue 형식을 합의하는 protocol입니다. VirtIO 1.2 §2.7·§2.8은 Split·Packed Virtqueue를 구분하고, Packed 사용은 `VIRTIO_F_RING_PACKED` 협상으로 결정합니다. Packed를 지원한다는 사실만으로 어떤 workload에서도 더 빠르다고 판정할 수 없습니다.

| 구성 | 확인할 경계 |
|------|------|
| virtio-net·blk 등 | guest driver가 협상한 feature와 queue 구성 |
| vhost backend | queue를 처리하는 host 측 구현과 메모리 접근 범위 |
| vDPA | VirtIO data path를 제공하는 backend. hardware뿐 아니라 software 구현도 가능 |
| 실제 장치 가속 | 지원 feature·queue·DMA mapping·interrupt와 장치별 제약 |

QEMU의 device 옵션, netdev backend 옵션과 host의 management device 설정은 별개입니다. 불완전한 `-device` 문자열이나 존재를 확인하지 않은 관리 옵션을 실행 예로 제시하지 않습니다. 구현에 맞는 고정판 문서와 실제 feature negotiation 결과로 연결해야 합니다.

## Pass-through migration의 세 가지 상태

[QEMU 9.2.4 VFIO migration 문서](https://gitlab.com/qemu-project/qemu/-/blob/v9.2.4/docs/devel/migration/vfio.rst)는 장치 상태와 DMA dirty-page 수집을 따로 설명합니다. Guest RAM만 복사하면 장치도 함께 이사하는 것은 아닙니다. 진행 중인 DMA는 이동 중인 짐에 계속 손을 대는 작업에 가깝습니다. 장치 상태, DMA로 바뀐 메모리, 목적지의 호환 조건을 함께 다뤄야 합니다.

| 항목 | 필요한 확인 | 부족한 증거 |
|------|------|------|
| Device state | driver가 제공하는 migration state와 save/restore, stop·resume 순서 | VFIO에 bind됐다는 사실 |
| DMA dirty pages | 실제 장치·IOMMU의 dirty logging과 메모리 재수집 | PRI 지원. PRI는 page request이고 dirty tracking이 아님 |
| Destination | 장치·firmware·feature·queue 상태의 호환성 | 양쪽에 같은 이름의 VF가 존재한다는 사실 |
| 최종 전환 | 새 DMA 차단·잔여 작업 정리·복원 후 재개 | guest RAM 복사 완료만 확인 |

VirtIO·vDPA도 backend와 협상 feature가 migration을 지원해야 합니다. 정지 시간·반복 복사량·실패 rollback은 실제 장치 조합에서 측정하고, “vDPA이면 자동 live migration”으로 묶지 않습니다.

## Confidential I/O의 신뢰 경계

암호화된 VM 메모리만으로 외부 장치까지 신뢰할 수는 없습니다. Link 보호, 장치 신원·firmware 상태, VM에 할당된 interface의 상태를 별도로 확인합니다. 아래는 역할 구분이며 특정 제품의 인증이나 구현 지원표가 아닙니다.

| 기능 | 담당하는 것 | 그것만으로 보장하지 못하는 것 |
|------|------|------|
| PCIe IDE | 지정된 link·stream의 암호화·무결성·replay 보호 | 장치 내부 firmware의 신뢰성과 VM별 권한 전체 |
| SPDM·CMA | 장치 신원과 측정 정보를 검증하는 기반 | 측정값의 허용 정책이나 실제 IDE stream 활성 |
| TDISP | TEE에 할당할 device interface의 configuration·state 관리 | 임의 장치의 자동 지원이나 별도 조건 없는 완전한 confidential I/O |

IDE의 Link·Selective stream은 보호 범위와 경로를 기준으로 구분합니다. Selective를 단순히 성능을 위해 임의 packet만 암호화하는 기능으로 설명하지 않습니다. AES-GCM을 일반적인 stream cipher라는 이름으로 바꾸지도 않습니다.

[TDISP는 PCI-SIG 표준](https://pcisig.com/PCI%20Express/ECN/Base/TEEDeviceInterfaceSecurityProtocol)이고, SPDM secure session을 사용하는 protocol과 platform의 trusted 관리 주체가 관여합니다. “VM이 TDISP session을 열고 IDE 키를 직접 협상한다”는 고정된 다섯 단계로 모든 구현을 설명할 수 없습니다. CXL 메모리의 TSP와도 구분해야 하며, 그 범위는 [CXL 보안 장](/blog/embedded/hardware/cxl/chapter14-security)에서 다룹니다.

신뢰 anchor·측정값 정책, interface 잠금·활성 상태, key 갱신과 실패 시 접근 차단을 실제 platform에서 확인해야 합니다. 특정 GPU의 CC 기능을 PCIe IDE·TDISP의 최초 상용 구현으로 단정하거나, 보편화 연도를 추측하지 않습니다.

## 정리

- vIOMMU 노출과 실제 hardware 2-stage translation은 구분합니다.
- VF와 ADI는 식별 단위가 다르며 자원·관리 소프트웨어 제약이 있습니다.
- VirtIO queue는 feature 협상으로 정하고, vDPA도 backend 지원을 확인합니다.
- Migration에는 장치 상태·DMA dirty tracking·목적지 호환성이 필요합니다.
- PRI는 dirty tracking이 아니며, IDE·SPDM·TDISP도 각각 다른 신뢰 경계를 다룹니다.

## 다음 편

[Ch 14: Linux Operations — Hot-plug·AER·DPC·ARI](/blog/embedded/hardware/pcie/chapter14-linux-operations)에서 *운영 환경의 hot-plug·AER recovery·DPC integration·ARI의 function 식별*을 본격적으로 분해합니다.

## 관련 항목

- [Ch 11: DMA·IOMMU](/blog/embedded/hardware/pcie/chapter11-linux-dma) — PASID·SVM
- [Ch 12: Virtualization I](/blog/embedded/hardware/pcie/chapter12-virtualization-1) — SR-IOV·VFIO 토대
- [CXL Internals Ch 14: Security](/blog/embedded/hardware/cxl/chapter14-security) — IDE·SPDM·TSP·CXL TEE

## 시리즈 자료 출처 안내

본 글의 1차 자료·정책은 [Ch 1 footer](/blog/embedded/hardware/pcie/chapter01-fundamentals#시리즈-자료-출처-안내) 참고.
