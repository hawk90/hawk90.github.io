---
title: "Ch 6: 인터럽트 (MSI/MSI-X) 구현"
date: 2025-09-01T06:00:00
description: "PCI 디바이스에서 MSI/MSI-X 인터럽트를 구현한다."
tags: [QEMU, MSI, Interrupt]
series: "QEMU Fake Device Driver"
seriesOrder: 6
draft: true
---

## PCI 인터럽트 종류

- **INTx**: 레거시 핀 기반 인터럽트
- **MSI**: Message Signaled Interrupt
- **MSI-X**: 확장 MSI (더 많은 벡터)

---

## MSI-X 초기화

```c
if (msi_init(pdev, 0, 1, true, false, errp)) {
    return;
}
```

---

## 인터럽트 발생

```c
msi_notify(pdev, 0);
```

---

## 정리

- MSI/MSI-X는 메모리 쓰기로 인터럽트를 전달한다.
- msi_init으로 초기화하고 msi_notify로 발생시킨다.
- 게스트 드라이버에서 인터럽트 핸들러를 등록한다.

---

## 관련 항목

- [Ch 5: MMIO 레지스터 구현](/blog/tools/qemu-fake-device/chapter05-mmio-registers)
- [Ch 7: DMA 버퍼 처리](/blog/tools/qemu-fake-device/chapter07-dma)
