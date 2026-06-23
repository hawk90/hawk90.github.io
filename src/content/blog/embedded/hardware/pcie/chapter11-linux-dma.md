---
title: "Ch 11: DMA·IOMMU — Coherent·Streaming·ATS·PRI·PASID·IOMMUFD"
date: 2026-05-19T09:11:00
description: "Linux DMA API — coherent·streaming·scatter-gather·IOMMU mapping·ATS·PRI·PASID·SVM·IOMMUFD."
series: "PCIe Deep Dive"
seriesOrder: 11
tags: [pcie, dma, iommu, ats, pasid, iommufd, svm]
draft: false
---

## 한 줄 요약

> **"PCIe DMA는 *device가 메모리에 직접 R/W*하는 메커니즘이고, *IOMMU*가 *device IOVA → host PA translation·isolation·access control*을 책임집니다."** — Linux는 *DMA API (coherent·streaming)*와 *IOMMU subsystem (Intel VT-d·AMD-Vi·ARM SMMU)*를 통합. *ATS·PRI·PASID*가 *SVM (Shared Virtual Memory)*의 토대고, *IOMMUFD (kernel 6.6+)*가 *차세대 userspace IOMMU API*입니다.

[Ch 5 Interrupts](/blog/embedded/hardware/pcie/chapter05-interrupts)에서 *Interrupt Remapping*이 IOMMU 한 가지 책임임을 봤습니다. 이 장은 *DMA 자체와 IOMMU 전체 그림*을 본격적으로 분해합니다.

## DMA API — 2 가지 모델

| Model | 사용 |
|-------|------|
| **Coherent DMA** (`dma_alloc_coherent`) | 작은 영구 buffer, *cache coherency 자동* |
| **Streaming DMA** (`dma_map_single`·`dma_map_sg`) | 큰·일회성 buffer, *명시적 sync* |

```c
// Coherent — descriptor·doorbell buffer
struct desc *ring;
dma_addr_t ring_dma;
ring = dma_alloc_coherent(&pdev->dev, RING_SIZE,
                           &ring_dma, GFP_KERNEL);

// Streaming — packet payload, ZC I/O
dma_addr_t dma = dma_map_single(&pdev->dev, skb->data,
                                  skb->len, DMA_TO_DEVICE);
// ... HW가 DMA 진행 ...
dma_unmap_single(&pdev->dev, dma, skb->len, DMA_TO_DEVICE);
```

*Coherent*는 *작고 자주 access*. *Streaming*은 *큰 transfer*. *Scatter-gather*는 *non-contiguous physical pages 묶기*.

## Cache Coherency

| Hardware | Coherent DMA |
|----------|--------------|
| x86 | DDIO·snoop — 자동 coherent |
| ARM (no SMMU CCI) | 비coherent — driver가 *cache flush* |
| RISC-V (제한적) | DMA coherent 영역 분리 |

*Streaming DMA*는 *direction에 따라 flush/invalidate*:

| Direction | Map 시 | Unmap 시 |
|-----------|--------|----------|
| TO_DEVICE | CPU cache *flush* | nothing |
| FROM_DEVICE | nothing | CPU cache *invalidate* |
| BIDIRECTIONAL | flush·invalidate | invalidate·flush |

## IOMMU 개요

| 기능 | 설명 |
|------|------|
| **Translation** | Device IOVA → Host PA |
| **Isolation** | Device가 *허락된 PA만 access* |
| **Interrupt Remapping** | Ch 5 |
| **Page faults** | PRI 처리 |
| **PASID** | Process별 다른 address space |

벤더 구현:

| Hardware | IOMMU |
|----------|-------|
| Intel | VT-d (Virtualization Technology for Directed I/O) |
| AMD | AMD-Vi (IOMMU) |
| ARM | SMMU v2·v3 |

## IOMMU Group

*동일 IOMMU 그룹 내 device들은 *분리 불가*. *ACS (Access Control Services)*가 *그룹 분리 가능 여부* 결정:

| 시나리오 | 결과 |
|---------|------|
| Device 단독 group | *완전 분리* — VFIO·pass-through 가능 |
| 여러 device 한 group | *그룹 전체*가 host 또는 guest 한쪽 |
| Switch port가 ACS 미지원 | downstream device들이 *한 group* |

`/sys/kernel/iommu_groups/`로 *그룹 구성* 확인. `lspci -vv | grep ACS`로 *ACS capability* 확인.

## ATS — Address Translation Services

*Device가 직접 translation cache 보유*:

| 시나리오 | 동작 |
|---------|------|
| ATS 없음 | 모든 DMA가 *IOMMU page walk* → latency |
| ATS 있음 | Device가 *IOVA→PA translation을 미리 받아 cache* → DMA 빠름 |

ATS Extended Cap (0x0026). NIC·NVMe·GPU 같은 *high-throughput device*에 *큰 latency 절약*.

## PRI — Page Request Interface

*Device가 page fault 요청*:

| 시나리오 | 동작 |
|---------|------|
| Device가 *swap-out된 page에 access* | PRI 요청 send |
| OS가 *page fault handler 처리* (page-in) | success response |
| OS가 *fail* (e.g., 권한) | error response |

SVM의 *demand paging 핵심* — process가 *swap된 page 있어도 device 동작 정상*.

## PASID — Process Address Space ID

20-bit ID로 *process별 다른 IOVA → PA mapping*:

| 시나리오 | 효과 |
|---------|------|
| PASID 없음 | Device가 *한 address space*만 |
| PASID 있음 | 각 *DMA에 PASID 표시*, IOMMU가 *다른 page table 참조* |

ATS + PRI + PASID 묶음이 *SVM (Shared Virtual Memory)*. Process의 *virtual address*가 *그대로 device IOVA로 동작*. *unified address space*가 *GPU·NPU·smart NIC*에서 큰 productivity 향상.

## SVM 흐름

| 단계 | 동작 |
|------|------|
| 1 | Process가 *PASID 할당받음* |
| 2 | Process가 *user-mode 메모리 buffer 준비* (mmap) |
| 3 | Device에 *buffer 주소 (process VA) + PASID* 전달 |
| 4 | Device가 *PASID 표시한 DMA send* |
| 5 | IOMMU가 *PASID page table에서 translation* — *page fault 시 PRI* |

NVIDIA *Grace Hopper UMA*·Intel *Tile·Sapphire Rapids*가 SVM 기반.

## swiotlb — Bounce Buffer

*IOMMU 없거나 32-bit DMA mask device*용 *fallback*:

| 시나리오 | 동작 |
|---------|------|
| Device DMA mask < 가능 PA range | swiotlb로 *낮은 영역 buffer에 copy* |
| 32-bit only NIC + 64-bit system | swiotlb 거쳐 DMA |

*Performance overhead 큼*. 대부분 *현대 64-bit device*는 swiotlb 미사용.

## IOMMUFD — 차세대 IOMMU userspace API (kernel 6.6+)

기존 *VFIO container*를 *IOMMUFD가 대체*:

| 객체 | 의미 |
|------|------|
| `ioas` (I/O Address Space) | guest IOVA space |
| `hwpt` (Hardware Page Table) | 실 page table object |
| `device` | bound device |

새 *file descriptor*: `/dev/iommu`·`/dev/vfio/devices/vfioN`. *kernel 6.6+에서 stable*, *VFIO compat shim*도 제공. *vIOMMU·SR-IOV·S-IOV* 모두 IOMMUFD 위에서 통합.

## Linux DMA mask

```c
// 64-bit DMA 지원 device
dma_set_mask_and_coherent(&pdev->dev, DMA_BIT_MASK(64));
// 또는 32-bit only
dma_set_mask_and_coherent(&pdev->dev, DMA_BIT_MASK(32));
```

*mask*에 따라 *어떤 PA range*를 *device가 access 가능*한지 표시. *부적절*하면 *swiotlb로 fallback*.

## 자주 하는 실수

### "Coherent DMA가 항상 빠름"

*Coherent buffer*는 *uncached 또는 SMMU translation*. *Random access*는 *streaming + cache-friendly*보다 *느릴 수 있음*. *큰 transfer*는 streaming이 일반.

### "Streaming DMA은 unmap 안 해도 OK"

*Unmap이 cache invalidate trigger*. Skip 하면 *stale data* read. *반드시 unmap*.

### "ATS 있으면 IOMMU 안 쓴다"

ATS는 *translation cache*만 device에. *IOMMU page table은 여전히 host*. *cache invalidation*도 host가 trigger.

### "PASID 활성하면 자동 SVM"

*kernel·driver·device 모두 PASID 인식*해야. *Process 측 mmap + PASID alloc*, *Driver의 PASID bind*, *Device의 PASID-aware DMA* 모두 통합 필요.

### "IOMMUFD가 VFIO 즉시 대체"

*kernel 6.6+에서 stable*하지만 *userspace tooling (QEMU·libvirt)*가 *점진적 마이그레이션*. 현재 *VFIO compat shim*으로 *둘 다 동작*.

## 정리

- *Coherent (작고 영구)·Streaming (크고 일회성)*가 *Linux DMA의 2 모델*.
- *Cache coherency*는 *x86 자동*, *ARM 명시 flush·invalidate*.
- *IOMMU*가 *translation·isolation·interrupt remapping·page fault·PASID*.
- *IOMMU Group*이 *분리 최소 단위*. ACS가 *그룹 분리 가능성* 결정.
- *ATS (translation cache)·PRI (page fault)·PASID (process ID)*가 *SVM*의 토대.
- *swiotlb*는 *legacy device용 bounce buffer*. overhead 큼.
- *IOMMUFD (kernel 6.6+)*가 *VFIO container 대체* — `ioas/hwpt/device` 모델.

## 다음 편

[Ch 12: Virtualization I — Pass-through·SR-IOV·VFIO](/blog/embedded/hardware/pcie/chapter12-virtualization-1)에서 *PF/VF·VFIO container·DPDK·SPDK*의 *hardware-level virtualization*을 본격적으로 분해합니다.

## 관련 항목

- [Ch 4: BAR & MMIO](/blog/embedded/hardware/pcie/chapter04-bar-mmio) — SR-IOV VF BAR
- [Ch 5: Interrupts](/blog/embedded/hardware/pcie/chapter05-interrupts) — Interrupt Remapping
- [Ch 12: Virtualization I](/blog/embedded/hardware/pcie/chapter12-virtualization-1)
- [Ch 13: Virtualization II](/blog/embedded/hardware/pcie/chapter13-virtualization-2) — vIOMMU·S-IOV·IDE/TDISP

## 시리즈 자료 출처 안내

본 글의 1차 자료·정책은 [Ch 1 footer](/blog/embedded/hardware/pcie/chapter01-fundamentals#시리즈-자료-출처-안내) 참고.
