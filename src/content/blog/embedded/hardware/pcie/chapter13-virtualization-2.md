---
title: "Ch 13: Virtualization II — vIOMMU·Scalable IOV·VirtIO·IDE·TDISP"
date: 2026-05-19T09:13:00
description: "Guest 측 vIOMMU·Intel S-IOV·VirtIO·vDPA·live migration·Confidential I/O (IDE·TDISP·CMA-SPDM)."
series: "PCIe Deep Dive"
seriesOrder: 13
tags: [pcie, viommu, scalable-iov, virtio, ide, tdisp, confidential-computing]
draft: false
---

## 한 줄 요약

> **"Ch 12의 SR-IOV·VFIO 한계를 풀어주는 *차세대 가상화 기술 묶음*입니다."** — *vIOMMU*가 *guest 안에서도 nested IOMMU*, *Scalable IOV*가 *static partition → dynamic ADI*, *VirtIO*가 *paravirtualization·vDPA 데이터 패스 가속*, *IDE·TDISP·CMA-SPDM*이 *Confidential VM의 pass-through 신뢰* 토대.

[Ch 12 Virtualization I](/blog/embedded/hardware/pcie/chapter12-virtualization-1)에서 *SR-IOV*가 *펌웨어 정의 partition*임을 봤습니다. 이 장은 *그 한계를 해결*하는 *2025~2026의 차세대 기술*을 본격적으로 분해합니다.

## vIOMMU — Guest IOMMU

guest 안에서도 *IOMMU 추상*이 필요한 이유:

| 시나리오 | vIOMMU 필요 |
|---------|------------|
| Guest 안 *userspace driver* (DPDK·SPDK) | guest IOMMU 필요 |
| Guest 안 *nested guest* (L2) | nested translation |
| Guest *kernel security* | DMA-safe 보장 |

| 구현 | 의미 |
|------|------|
| **QEMU intel-iommu (emulated)** | software emulation — 느림 |
| **virtio-iommu (paravirt)** | guest driver가 *host와 협력* — 빠름 |
| **VT-d nested translation** | hardware 2-stage — 가장 빠름 |
| **SMMUv3 nested stages** | ARM 동일 모델 |

## 2-Stage Translation

| Stage | 역할 |
|-------|------|
| **Stage 1** | Guest IOVA → Guest PA (guest IOMMU table) |
| **Stage 2** | Guest PA → Host PA (hypervisor table) |

Hardware가 *2-stage walk*. *Guest와 host 모두 separate page table*. SR-IOV + vIOMMU + nested = *완전 가상화*.

## Scalable IOV (S-IOV) — Intel

*SR-IOV의 펌웨어 정적 partition* 한계 해결:

| 항목 | SR-IOV | S-IOV |
|------|--------|-------|
| Partition 정의 | 펌웨어가 *NumVFs 고정* | *software ADI* — runtime resize |
| Light HW | VF 자체 PCIe entity | *ADI*는 PCIe entity 아님 |
| Scale | 64~256 VF | *수천 ADI* 가능 |
| Memory overhead | VF 메타 큼 | 작음 |
| PASID 의존 | optional | *필수* |

| 요소 | 역할 |
|------|------|
| **ADI (Assignable Device Interface)** | Software 분할 단위 |
| **Mediated VFIO** | ADI ↔ VFIO 통합 |
| **Composable** | runtime add/remove |

*Intel IDXD (Data Streaming Accelerator)*가 *S-IOV 첫 상용 사례*. `drivers/dma/idxd/`의 *work queue 기반 ADI*.

```bash
# IDXD work queue 구성 (S-IOV)
accel-config config-wq dsa0/wq0.0 \
  --wq-size=64 --mode=dedicated \
  --type=user --priority=10
accel-config config-wq dsa0/wq0.0 --pasid-enable=1
accel-config enable-wq dsa0/wq0.0
```

## VirtIO — Paravirtualization

*Guest가 자기 가상화됨을 알고 협력*:

| 항목 | 의미 |
|------|------|
| VirtIO 1.x | 현대 표준 (OASIS) |
| Capability 기반 | Common·Notify·ISR·Device·PCI |
| virtqueue | descriptor·available·used ring |
| Packed virtqueue (1.1+) | single ring, cache-friendly |

대표 device:

| Device | 사용 |
|--------|------|
| virtio-net | virtual NIC |
| virtio-blk | virtual block |
| virtio-scsi | virtual SCSI |
| virtio-gpu | virtual GPU |
| virtio-iommu | paravirt IOMMU |
| virtio-fs | shared filesystem |

## vDPA — Virtio Data Path Acceleration

*VirtIO control plane + Hardware data path*:

| 영역 | 누가 |
|------|------|
| Control plane | VirtIO (paravirt) |
| Data plane | Hardware (real NIC·NVMe SR-IOV/S-IOV) |

장점: *VirtIO의 portability + Hardware의 speed*. *vhost-vdpa device*가 *Linux kernel interface*.

```bash
# vhost-vdpa NIC binding
modprobe vhost_vdpa
vdpa dev add name vdpa0 mgmtdev <hw-id>
# QEMU에 -device virtio-net,netdev=type=vhost-vdpa,...
```

DPDK·SR-IOV·VirtIO 장점 결합.

## Live Migration of Pass-through

*Pass-through device의 큰 문제*. *SR-IOV VF는 source HW에 묶여* 있어 *target host의 다른 VF로 옮기기 어려움*.

해결 시도:

| 기술 | 동작 |
|------|------|
| **Dirty page tracking (PRI)** | Guest의 *device-touched page* 추적 |
| **State migration** | device internal state save·restore |
| **vDPA·virtio-net** | *control plane 그대로*, data path만 reset |

vDPA·VirtIO가 *live migration 친화적*인 이유 — *abstraction layer*가 *device-specific 변동을 흡수*.

## Confidential I/O — 2026의 새 영역

*Confidential VM (Intel TDX·AMD SEV-SNP·ARM CCA)*이 *pass-through device를 신뢰*하려면?

| 위협 | 해결 |
|------|------|
| Hypervisor·host OS가 *I/O 가로채기* | *암호화·무결성 보호* |
| Device가 *위조* | *attestation* |
| DMA 외부 노출 | *암호화 link* |

3개 표준:

| 표준 | 책임 |
|------|------|
| **PCIe IDE (Integrity & Data Encryption)** | *link 레벨 AES-GCM 암호화* |
| **TDISP (TEE Device Interface Security Protocol)** | *Guest TEE ↔ device 신뢰 세션* |
| **CMA-SPDM (Component Measurement & Authentication)** | *device measurement·attestation* |

## PCIe IDE — Link 암호화

*TLP에 AES-GCM 적용*:

| 항목 | 의미 |
|------|------|
| Selective IDE | *특정 TLP만 암호화* (성능 trade-off) |
| Link IDE | *전체 link 암호화* |
| IDE_KM | *key management* |
| Stream cipher | *고속 stream cipher* |

NVIDIA H100 *Confidential Computing (CC mode)*가 *IDE 첫 상용 사례*. AMD MI300A도 *IDE 지원*.

## TDISP — TEE Device Session

| 단계 | 동작 |
|------|------|
| 1 | Confidential VM이 *device attestation 요청* |
| 2 | Device가 *SPDM measurement 제공* |
| 3 | VM이 *TDISP 세션 수립* |
| 4 | IDE key 협상 |
| 5 | *Encrypted DMA stream* 시작 |

Intel TDX-IO·AMD SEV-TIO·ARM CCA-IO의 *공통 spec*.

## CMA-SPDM

*Security Protocol and Data Model (DMTF DSP0274)*가 *device 신원·firmware measurement* 표준화. *MCTP·DOE (Data Object Exchange)*가 *transport*.

## 자주 하는 실수

### "S-IOV가 SR-IOV 즉시 대체"

*특정 device (Intel IDXD 등)*만 *현재 지원*. SR-IOV가 *NIC·NVMe 대부분*. *겸용*이 일반.

### "VirtIO는 항상 느리다"

*Modern VirtIO 1.1+·vDPA·packed virtqueue*는 *bare-metal에 근접*. *legacy VirtIO 0.9*는 느림.

### "Live Migration이 자동"

Pass-through는 *대부분 manual*. *vDPA·virtio*가 유리하지만 *완전 자동 아님*. 운영팀 *migration window 설계* 필요.

### "IDE면 모든 security 해결"

IDE는 *link 무결성*만. *Device-level firmware·hardware trust*는 *별도 (CMA-SPDM·TDISP)*. *3개 모두* 활성화해야 *완전 Confidential I/O*.

### "TDISP가 곧 양산"

*spec stable·NVIDIA H100 CC 첫 상용*. *완전 보편화*는 *2027~2028*. *Intel TDX·AMD SEV-SNP·ARM CCA platform*도 *순차 도입*.

## 정리

- *vIOMMU*가 *guest 안 IOMMU* — *2-stage translation (guest IOVA→guest PA→host PA)*.
- *Scalable IOV*가 *SR-IOV의 static partition → dynamic ADI*. PASID 필수.
- *VirtIO 1.x*가 *paravirt 표준*. *packed virtqueue·vDPA*가 throughput.
- *vDPA*가 *VirtIO control + HW data plane* — 양쪽 장점.
- *Live migration of pass-through*는 *PRI dirty tracking·vDPA*가 친화적.
- *Confidential I/O*: *PCIe IDE (암호화)·TDISP (세션)·CMA-SPDM (attestation)*.
- NVIDIA H100 CC가 *첫 상용 Confidential I/O*.

## 다음 편

[Ch 14: Linux Operations — Hot-plug·AER·DPC·ARI](/blog/embedded/hardware/pcie/chapter14-linux-operations)에서 *운영 환경의 hot-plug·AER recovery·DPC integration·ARI 256+ function*을 본격적으로 분해합니다.

## 관련 항목

- [Ch 11: DMA·IOMMU](/blog/embedded/hardware/pcie/chapter11-linux-dma) — PASID·SVM
- [Ch 12: Virtualization I](/blog/embedded/hardware/pcie/chapter12-virtualization-1) — SR-IOV·VFIO 토대
- [CXL Internals Ch 14: Security](/blog/embedded/hardware/cxl/chapter14-security) — IDE·SPDM·TSP·CXL TEE

## 시리즈 자료 출처 안내

본 글의 1차 자료·정책은 [Ch 1 footer](/blog/embedded/hardware/pcie/chapter01-fundamentals#시리즈-자료-출처-안내) 참고.
