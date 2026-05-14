---
title: "Ch 10: Linux Basics — pci_driver와 probe"
date: 2026-06-01T11:00:00
description: "Linux PCIe 드라이버 기초 — pci_driver, probe/remove, 리소스 관리, sysfs"
series: "PCIe Deep Dive"
seriesOrder: 10
tags: [pcie, linux, driver, pci_driver, probe]
draft: true
---

Linux 커널은 PCIe 디바이스를 위한 완성된 서브시스템을 제공한다. 이 장에서는 pci_driver 프레임워크를 사용한 드라이버 개발 기초를 다룬다.

## Linux PCI 서브시스템 개요

TODO: 내용 작성

- PCI Core
- PCI Bus 열거
- 드라이버 매칭
- 리소스 할당

## pci_driver 구조체

TODO: 내용 작성

```c
struct pci_driver {
    const char *name;
    const struct pci_device_id *id_table;
    int (*probe)(struct pci_dev *dev, const struct pci_device_id *id);
    void (*remove)(struct pci_dev *dev);
    // ...
};
```

## Device ID Table

TODO: 내용 작성

- `PCI_DEVICE(vendor, device)`
- `PCI_DEVICE_CLASS(class, mask)`
- Subvendor/Subdevice
- 와일드카드 매칭

## probe 함수

TODO: 내용 작성

- `pci_enable_device()`
- `pci_request_regions()`
- `pci_ioremap_bar()`
- `pci_set_master()`
- 리소스 할당 순서

## remove 함수

TODO: 내용 작성

- `iounmap()`
- `pci_release_regions()`
- `pci_disable_device()`
- 역순 해제

## Configuration Space 접근

TODO: 내용 작성

- `pci_read_config_byte/word/dword()`
- `pci_write_config_byte/word/dword()`
- Capability 탐색
- `pci_find_capability()`

## MMIO 접근

TODO: 내용 작성

- `pci_ioremap_bar()`
- `ioread32()` / `iowrite32()`
- Memory Barriers
- `__iomem` 어노테이션

## sysfs 인터페이스

TODO: 내용 작성

- `/sys/bus/pci/devices/`
- `config` 파일
- `resource` 파일
- 속성 노출

## 에러 처리

TODO: 내용 작성

- `pci_enable_device()` 실패
- 리소스 충돌
- `goto` 기반 정리 패턴
- `devm_*` 관리형 API

## 정리

- `pci_driver`는 Linux PCIe 드라이버의 기본 구조체다
- probe에서 디바이스 초기화, remove에서 정리한다
- 리소스 할당과 해제는 순서가 중요하다
- `devm_*` API로 관리형 리소스 할당이 가능하다

## 다음 장 예고

[Chapter 11: Linux DMA](/blog/embedded/hardware/pcie/chapter11-linux-dma)에서 Linux의 DMA API를 다룬다. Coherent DMA, Streaming DMA, IOMMU 연동을 살펴본다.

## 관련 항목

- [Chapter 4: BAR & MMIO](/blog/embedded/hardware/pcie/chapter04-bar-mmio)
- [Chapter 5: Interrupts](/blog/embedded/hardware/pcie/chapter05-interrupts)
- [Chapter 11: Linux DMA](/blog/embedded/hardware/pcie/chapter11-linux-dma)
