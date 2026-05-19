---
title: "Ch 2: QOM 심화 — 타입 시스템"
date: 2026-05-17T02:00:00
description: "QEMU Object Model의 타입 시스템, 속성, 인터페이스를 깊이 이해한다."
tags: [QEMU, QOM, TypeSystem]
series: "QEMU Internals"
seriesOrder: 2
draft: true
---

## QOM 타입 시스템

QOM은 QEMU의 객체 지향 프레임워크입니다.

- 타입 상속
- 속성(Property) 시스템
- 인터페이스
- 동적 타입 생성

---

## TypeInfo 구조체

```c
static const TypeInfo my_device_info = {
    .name          = TYPE_MY_DEVICE,
    .parent        = TYPE_PCI_DEVICE,
    .instance_size = sizeof(MyDeviceState),
    .instance_init = my_device_init,
    .instance_finalize = my_device_finalize,
    .class_size    = sizeof(MyDeviceClass),
    .class_init    = my_device_class_init,
    .interfaces    = (InterfaceInfo[]) {
        { TYPE_MY_INTERFACE },
        { }
    },
};
```

---

## 속성(Property)

```c
object_property_add_uint64_ptr(obj, "size", &s->size, OBJ_PROP_FLAG_READWRITE);
```

---

## 인터페이스

```c
typedef struct MyInterfaceClass {
    InterfaceClass parent;
    void (*do_something)(Object *obj);
} MyInterfaceClass;
```

---

## 정리

- QOM은 C로 구현한 객체 지향 시스템이다.
- TypeInfo로 타입을 등록하고 상속 관계를 정의한다.
- 속성으로 객체 상태를 노출하고 인터페이스로 다형성을 구현한다.

---

## 관련 항목

- [Ch 1: QEMU 아키텍처 개요](/blog/tools/emulation/qemu-internals/chapter01-architecture)
- [Ch 3: 메모리 모델](/blog/tools/emulation/qemu-internals/chapter03-memory-model)
