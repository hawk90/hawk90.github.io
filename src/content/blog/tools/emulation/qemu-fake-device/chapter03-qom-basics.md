---
title: "Ch 3: QEMU 디바이스 모델 기초 — QOM"
date: 2025-09-01T03:00:00
description: "QEMU Object Model (QOM) 타입 시스템과 디바이스 모델 프레임워크."
tags: [QEMU, QOM, DeviceModel]
series: "QEMU Fake Device Driver"
seriesOrder: 3
draft: true
---

## QOM이란?

QEMU Object Model (QOM)은 QEMU의 객체 지향 프레임워크입니다.

- 타입 상속
- 속성(Property) 시스템
- 인터페이스

---

## TypeInfo 구조체

```c
static const TypeInfo my_device_info = {
    .name          = TYPE_MY_DEVICE,
    .parent        = TYPE_PCI_DEVICE,
    .instance_size = sizeof(MyDeviceState),
    .instance_init = my_device_init,
    .class_init    = my_device_class_init,
};
```

---

## 디바이스 상태 구조체

```c
typedef struct MyDeviceState {
    PCIDevice parent_obj;

    MemoryRegion mmio;
    uint32_t regs[16];
} MyDeviceState;
```

---

## 정리

- QOM은 QEMU의 객체 지향 프레임워크다.
- TypeInfo로 새 디바이스 타입을 등록한다.
- 디바이스 상태는 구조체로 관리한다.

---

## 관련 항목

- [Ch 2: QEMU 설치와 빌드](/blog/tools/qemu-fake-device/chapter02-install-build)
- [Ch 4: 간단한 PCI 디바이스](/blog/tools/qemu-fake-device/chapter04-simple-pci)
