---
title: "Ch 12: Linux Advanced — SR-IOV, VFIO, P2P"
date: 2026-05-16T13:00:00
description: "Linux PCIe 고급 주제 — SR-IOV 가상화, VFIO 사용자 공간 드라이버, P2P DMA"
series: "PCIe Deep Dive"
seriesOrder: 12
tags: [pcie, linux, sr-iov, vfio, p2p, virtualization]
draft: true
---

고급 PCIe 기능은 가상화, 사용자 공간 드라이버, 디바이스 간 직접 통신을 가능하게 한다. 이 장에서는 SR-IOV, VFIO, P2P DMA를 다룬다.

## SR-IOV 개요

TODO: 내용 작성

- Single Root I/O Virtualization
- Physical Function (PF)
- Virtual Function (VF)
- 하드웨어 가상화
- VM 직접 할당

## SR-IOV Capability

TODO: 내용 작성

- Extended Capability (ID 0x0010)
- VF Enable
- Num VFs
- VF Offset/Stride
- VF BAR

## Linux에서 SR-IOV

TODO: 내용 작성

- `sriov_numvfs` sysfs
- VF 드라이버
- PF와 VF 관계
- libvirt/QEMU 연동

## VFIO 개요

TODO: 내용 작성

- Virtual Function I/O
- 사용자 공간 드라이버
- IOMMU 기반 격리
- DPDK, SPDK 활용
- VM 디바이스 Passthrough

## VFIO 사용법

TODO: 내용 작성

- IOMMU Group
- `/dev/vfio/`
- 디바이스 바인딩
- 메모리 매핑
- 인터럽트 처리

## P2P DMA

TODO: 내용 작성

- Peer-to-Peer DMA
- GPU Direct Storage
- NVMe → GPU 직접 전송
- Root Complex 지원
- `pci_p2pdma_*` API

## ATS와 PRI

TODO: 내용 작성

- Address Translation Services
- Page Request Interface
- IOMMU 효율화
- Shared Virtual Memory

## Hot-Plug

TODO: 내용 작성

- Native PCIe Hot-Plug
- ACPI Hot-Plug
- 알림 메커니즘
- 드라이버 대응

## 정리

- SR-IOV는 하드웨어 레벨 I/O 가상화를 제공한다
- VFIO는 IOMMU 기반으로 사용자 공간 드라이버를 가능하게 한다
- P2P DMA는 디바이스 간 직접 메모리 전송으로 CPU 부하를 줄인다
- 이들 기능은 고성능/가상화 환경의 핵심이다

## 다음 장 예고

[Chapter 13: Tools](/blog/embedded/hardware/pcie/chapter15-tools)에서 lspci, setpci 등 PCIe 디버깅 도구의 실전 사용법을 다룬다.

## 관련 항목

- [Chapter 10: Linux Basics](/blog/embedded/hardware/pcie/chapter10-linux-basics)
- [Chapter 11: Linux DMA](/blog/embedded/hardware/pcie/chapter11-linux-dma)
- [Chapter 13: Tools](/blog/embedded/hardware/pcie/chapter15-tools)
