---
title: "Ch 7: DMA 버퍼 처리"
date: 2025-09-01T07:00:00
description: "QEMU 디바이스에서 DMA를 통해 게스트 메모리에 접근한다."
tags: [QEMU, DMA, Memory]
series: "QEMU Fake Device Driver"
seriesOrder: 7
draft: true
---

## DMA란?

Direct Memory Access는 CPU 개입 없이 디바이스가 메모리에 직접 접근하는 방식입니다.

---

## 게스트 메모리 읽기

```c
pci_dma_read(pdev, guest_addr, buf, len);
```

---

## 게스트 메모리 쓰기

```c
pci_dma_write(pdev, guest_addr, buf, len);
```

---

## Scatter-Gather

여러 버퍼를 연속으로 처리할 때 사용합니다.

---

## 정리

- pci_dma_read/write로 게스트 메모리에 접근한다.
- IOMMU가 있으면 주소 변환이 자동으로 적용된다.
- Scatter-Gather로 여러 버퍼를 효율적으로 처리한다.

---

## 관련 항목

- [Ch 6: 인터럽트 구현](/blog/tools/emulation/qemu-fake-device/chapter06-interrupts)
- [Ch 8: 리눅스 드라이버 작성](/blog/tools/emulation/qemu-fake-device/chapter08-linux-driver)
