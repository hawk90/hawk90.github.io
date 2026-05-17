---
title: "Ch 4: 간단한 PCI 디바이스 만들기"
date: 2025-09-01T04:00:00
description: "QEMU에서 간단한 PCI 디바이스를 만들고 게스트에서 인식시킨다."
tags: [QEMU, PCI, DeviceModel]
series: "QEMU Fake Device Driver"
seriesOrder: 4
draft: true
---

## PCI 디바이스 기초

PCI 디바이스는 가장 흔한 디바이스 타입입니다.

- Vendor ID, Device ID
- BAR (Base Address Register)
- Configuration Space

---

## 최소 PCI 디바이스

```c
#include "hw/pci/pci.h"

#define TYPE_MY_PCI "my-pci-device"

static void my_pci_realize(PCIDevice *pdev, Error **errp)
{
    // 디바이스 초기화
}

static void my_pci_class_init(ObjectClass *klass, void *data)
{
    PCIDeviceClass *k = PCI_DEVICE_CLASS(klass);
    k->realize = my_pci_realize;
    k->vendor_id = 0x1234;
    k->device_id = 0x5678;
    k->class_id = PCI_CLASS_OTHERS;
}
```

---

## 정리

- PCI 디바이스는 Vendor ID와 Device ID로 식별된다.
- BAR를 통해 MMIO 영역을 노출한다.
- realize 콜백에서 디바이스를 초기화한다.

---

## 관련 항목

- [Ch 3: QEMU 디바이스 모델 기초](/blog/tools/emulation/qemu-fake-device/chapter03-qom-basics)
- [Ch 5: MMIO 레지스터 구현](/blog/tools/emulation/qemu-fake-device/chapter05-mmio-registers)
