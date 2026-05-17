---
title: "Ch 8: 커스텀 디바이스 추가"
date: 2025-05-20T02:00:00
description: "QEMU 커스텀 디바이스 — MMIO 디바이스 구현을 다룬다."
series: "RISC-V QEMU 심화"
seriesOrder: 8
tags: [RISC-V, QEMU, Device, MMIO]
draft: true
---

## 개요

QEMU에 커스텀 MMIO 디바이스를 추가하는 방법을 다룬다.

---

## QEMU 디바이스 모델

TODO:

- QOM (QEMU Object Model)
- TYPE_SYS_BUS_DEVICE
- MMIO 영역

---

## 디바이스 구조체

TODO:

```c
#define TYPE_MY_DEVICE "my-device"

typedef struct MyDeviceState {
    SysBusDevice parent_obj;

    MemoryRegion mmio;
    uint32_t reg0;
    uint32_t reg1;
} MyDeviceState;
```

---

## MMIO 읽기/쓰기

TODO:

```c
static uint64_t my_device_read(void *opaque, hwaddr addr, unsigned size) {
    MyDeviceState *s = opaque;
    switch (addr) {
    case 0x00: return s->reg0;
    case 0x04: return s->reg1;
    default: return 0;
    }
}

static void my_device_write(void *opaque, hwaddr addr,
                            uint64_t val, unsigned size) {
    MyDeviceState *s = opaque;
    switch (addr) {
    case 0x00: s->reg0 = val; break;
    case 0x04: s->reg1 = val; break;
    }
}
```

---

## MemoryRegionOps

TODO:

```c
static const MemoryRegionOps my_device_ops = {
    .read = my_device_read,
    .write = my_device_write,
    .endianness = DEVICE_LITTLE_ENDIAN,
};
```

---

## 초기화

TODO:

```c
static void my_device_realize(DeviceState *dev, Error **errp) {
    MyDeviceState *s = MY_DEVICE(dev);

    memory_region_init_io(&s->mmio, OBJECT(s), &my_device_ops, s,
                          TYPE_MY_DEVICE, 0x100);
    sysbus_init_mmio(SYS_BUS_DEVICE(s), &s->mmio);
}
```

---

## 타입 등록

TODO:

```c
static const TypeInfo my_device_info = {
    .name = TYPE_MY_DEVICE,
    .parent = TYPE_SYS_BUS_DEVICE,
    .instance_size = sizeof(MyDeviceState),
    .class_init = my_device_class_init,
};

static void my_device_register_types(void) {
    type_register_static(&my_device_info);
}

type_init(my_device_register_types)
```

---

## 정리

- QOM으로 디바이스 정의
- MemoryRegionOps로 MMIO 구현
- SysBusDevice로 등록
- 머신에 연결

---

## 다음 장 예고

Ch 9에서는 풀 스택 부팅을 다룬다.

---

## 참고 자료

- [QEMU Device Model](https://www.qemu.org/docs/master/devel/qom.html)
