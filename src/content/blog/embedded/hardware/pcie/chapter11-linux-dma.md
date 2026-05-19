---
title: "Ch 11: Linux DMA — DMA API"
date: 2026-05-16T12:00:00
description: "Linux DMA API — Coherent DMA, Streaming DMA, Scatter-Gather, IOMMU"
series: "PCIe Deep Dive"
seriesOrder: 11
tags: [pcie, linux, dma, iommu, scatter-gather]
draft: true
---

DMA(Direct Memory Access)는 CPU 개입 없이 디바이스가 메모리에 직접 접근하는 메커니즘이다. Linux DMA API는 플랫폼 독립적인 DMA 프로그래밍 인터페이스를 제공한다.

## DMA 개요

TODO: 내용 작성

- CPU vs DMA 전송
- Bus Master 기능
- DMA 주소와 물리 주소
- IOMMU의 역할

## Coherent DMA

TODO: 내용 작성

- `dma_alloc_coherent()`
- `dma_free_coherent()`
- 캐시 일관성 보장
- Descriptor Ring 등 공유 메모리
- 오버헤드

## Streaming DMA

TODO: 내용 작성

- `dma_map_single()` / `dma_unmap_single()`
- `dma_map_page()` / `dma_unmap_page()`
- DMA 방향 (TO_DEVICE, FROM_DEVICE, BIDIRECTIONAL)
- Sync 함수
- 성능 최적화

## Scatter-Gather DMA

TODO: 내용 작성

- `dma_map_sg()` / `dma_unmap_sg()`
- `struct scatterlist`
- `sg_dma_address()` / `sg_dma_len()`
- 비연속 물리 메모리 전송
- 큰 버퍼 처리

## DMA Pool

TODO: 내용 작성

- `dma_pool_create()`
- `dma_pool_alloc()`
- `dma_pool_free()`
- 작은 Coherent 할당 최적화
- Descriptor 할당

## IOMMU

TODO: 내용 작성

- I/O Memory Management Unit
- 가상 DMA 주소
- 디바이스 격리
- Scatter-Gather 하드웨어 통합
- Intel VT-d, AMD-Vi

## DMA Mask

TODO: 내용 작성

- `dma_set_mask()`
- `dma_set_coherent_mask()`
- 32-bit vs 64-bit DMA
- Bounce Buffer

## 에러 처리

TODO: 내용 작성

- `dma_mapping_error()`
- IOMMU 매핑 실패
- 리소스 부족
- 정리 패턴

## 정리

- Coherent DMA는 캐시 일관성을 보장하지만 오버헤드가 있다
- Streaming DMA는 일회성 전송에 효율적이다
- Scatter-Gather DMA는 비연속 버퍼를 효율적으로 처리한다
- IOMMU는 디바이스 메모리 접근을 가상화하고 격리한다

## 다음 장 예고

[Chapter 12: Linux Advanced](/blog/embedded/hardware/pcie/chapter12-linux-advanced)에서 SR-IOV, VFIO, P2P DMA 등 고급 주제를 다룬다.

## 관련 항목

- [Chapter 4: BAR & MMIO](/blog/embedded/hardware/pcie/chapter04-bar-mmio)
- [Chapter 10: Linux Basics](/blog/embedded/hardware/pcie/chapter10-linux-basics)
- [Chapter 12: Linux Advanced](/blog/embedded/hardware/pcie/chapter12-linux-advanced)
