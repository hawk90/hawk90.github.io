---
title: "Ch 3: QEMU 디바이스 모델 기초 — QOM"
date: 2026-05-17T03:00:00
description: "QEMU Object Model (QOM) 타입 시스템과 디바이스 모델 프레임워크."
tags: [QEMU, QOM, DeviceModel, TypeInfo, realize]
series: "QEMU Fake Device Driver"
seriesOrder: 3
draft: true
---

QEMU의 *모든 device*는 **QOM**(QEMU Object Model)의 객체입니다. C로 구현한 객체 지향 시스템으로, 상속·property·인터페이스를 갖추죠. driver를 개발하려면 그 device의 *틀*인 QOM을 먼저 이해해야 합니다.

## QOM 핵심 개념

| 개념 | 의미 |
|------|------|
| **Type** | C++의 클래스. `TypeInfo`로 정의 |
| **Instance** | 객체. `*State` 구조체 |
| **Class** | 함수 포인터·상수 — type당 1개 |
| **Property** | 객체 상태를 외부에 노출 |
| **Interface** | 여러 type이 구현할 수 있는 contract |

이 다섯 개념의 *조합*으로 모든 QEMU device를 설명합니다.

## TypeInfo — 타입 정의

```c
#include "qemu/osdep.h"
#include "hw/pci/pci.h"
#include "qom/object.h"

#define TYPE_MY_DEVICE "my-device"

typedef struct MyDeviceState MyDeviceState;
typedef struct MyDeviceClass MyDeviceClass;

DECLARE_OBJ_CHECKERS(MyDeviceState, MyDeviceClass, MY_DEVICE, TYPE_MY_DEVICE)

/* Instance — 개별 device의 상태 */
struct MyDeviceState {
    PCIDevice parent_obj;     /* 부모를 *첫* 필드로 */
    MemoryRegion mmio;
    uint32_t ctrl;
    uint32_t status;
};

/* Class — type당 1개 */
struct MyDeviceClass {
    PCIDeviceClass parent_class;
    /* (override할 method가 있다면 여기에) */
};
```

`parent_obj`가 *반드시 첫 필드*. C에서 *cast*로 inheritance 흉내.

## class_init과 instance_init

```c
static void my_device_realize(PCIDevice *pdev, Error **errp) {
    MyDeviceState *s = MY_DEVICE(pdev);

    /* realize에서 자원 할당 — property 모두 set된 후 */
    memory_region_init_io(&s->mmio, OBJECT(s), &my_ops, s,
                          "my-mmio", 0x1000);
    pci_register_bar(pdev, 0, PCI_BASE_ADDRESS_SPACE_MEMORY, &s->mmio);
}

static void my_device_instance_init(Object *obj) {
    /* 생성 직후 — property set 전. 기본값 정도만 */
}

static void my_device_class_init(ObjectClass *klass, void *data) {
    PCIDeviceClass *k = PCI_DEVICE_CLASS(klass);
    DeviceClass *dc = DEVICE_CLASS(klass);

    k->realize     = my_device_realize;
    k->vendor_id   = 0x1234;
    k->device_id   = 0x5678;
    k->class_id    = PCI_CLASS_OTHERS;

    set_bit(DEVICE_CATEGORY_MISC, dc->categories);
}

static const TypeInfo my_device_info = {
    .name          = TYPE_MY_DEVICE,
    .parent        = TYPE_PCI_DEVICE,
    .instance_size = sizeof(MyDeviceState),
    .instance_init = my_device_instance_init,
    .class_size    = sizeof(MyDeviceClass),
    .class_init    = my_device_class_init,
};

static void my_device_register(void) {
    type_register_static(&my_device_info);
}
type_init(my_device_register)
```

`type_init` 매크로가 *automatic registration* — 모듈 로드 시 `type_register_static` 자동 호출.

## Lifecycle

```text
1. object_new("my-device")
        │
2. parent의 instance_init (PCI device init)
        │
3. 자신의 instance_init
        │
4. property 설정 (CLI -device my-device,prop=val)
        │
5. realize 호출
        │
6. (사용)
        │
7. unrealize → instance_finalize → parent의 instance_finalize
```

*property는 realize 전*에 set. realize는 *resource 할당* 단계.

## Property

property로 *device 옵션*을 외부에 노출.

```c
static Property my_device_properties[] = {
    DEFINE_PROP_UINT32("size", MyDeviceState, size, 1024),
    DEFINE_PROP_BOOL("enable", MyDeviceState, enabled, true),
    DEFINE_PROP_STRING("name", MyDeviceState, name),
    DEFINE_PROP_END_OF_LIST(),
};

static void my_device_class_init(ObjectClass *klass, void *data) {
    DeviceClass *dc = DEVICE_CLASS(klass);
    /* ... */
    device_class_set_props(dc, my_device_properties);
}
```

CLI:

```bash
qemu-system-x86_64 -device my-device,size=2048,enable=on,name=foo
```

## 자주 쓰는 매크로

| 매크로 | 의미 |
|--------|------|
| `OBJECT_DECLARE_SIMPLE_TYPE(state, NAME)` | type checker + cast 자동 생성 |
| `DECLARE_OBJ_CHECKERS(state, class, ...)` | state + class 둘 다 |
| `TYPE_CHECK(state, obj, NAME)` | runtime cast 확인 |
| `OBJECT(obj)` | upcast to Object |
| `DEVICE(obj)` | upcast to DeviceState |
| `PCI_DEVICE(obj)` | upcast to PCIDevice |
| `MY_DEVICE(obj)` | downcast (TypeInfo가 정의) |

대부분 `OBJECT_DECLARE_SIMPLE_TYPE`로 충분.

```c
OBJECT_DECLARE_SIMPLE_TYPE(MyDeviceState, MY_DEVICE)
/* 이게 expand되어 MY_DEVICE(obj) cast 매크로 등 자동 생성 */
```

## Realize callback

device의 *진짜 초기화*가 일어나는 곳.

```c
static void my_device_realize(PCIDevice *pdev, Error **errp) {
    MyDeviceState *s = MY_DEVICE(pdev);

    /* 1. memory region 등록 */
    memory_region_init_io(&s->mmio, OBJECT(s), &my_ops, s,
                          "my-mmio", 0x1000);
    pci_register_bar(pdev, 0, PCI_BASE_ADDRESS_SPACE_MEMORY, &s->mmio);

    /* 2. IRQ 설정 */
    /* (Ch 6에서 자세히) */

    /* 3. internal state 초기화 */
    s->ctrl = 0;
    s->status = 0;

    /* 4. property 검증 */
    if (s->size < 1024) {
        error_setg(errp, "size must be >= 1024");
        return;
    }
}
```

error는 *반드시* `Error **errp`로. `abort` 금지.

## reset callback

```c
static void my_device_reset(DeviceState *dev) {
    MyDeviceState *s = MY_DEVICE(dev);
    s->ctrl = 0;
    s->status = 0;
}

static void my_device_class_init(ObjectClass *klass, void *data) {
    DeviceClass *dc = DEVICE_CLASS(klass);
    /* ... */
    dc->reset = my_device_reset;
}
```

VM reset 시 호출. *power-on default*로 복귀.

## Build 통합 — meson.build

```text
# hw/misc/meson.build
system_ss.add(when: 'CONFIG_MY_DEVICE', if_true: files('my-device.c'))
```

```text
# hw/misc/Kconfig
config MY_DEVICE
    bool
    default y if PCI
    depends on PCI
```

```text
# configs/devices/x86_64-softmmu/default.mak
CONFIG_MY_DEVICE=y
```

이 3개 파일 변경으로 빌드 통합.

## 확인

빌드 후:

```bash
./qemu-system-x86_64 -device help | grep my-device
# my-device                  no description
```

device가 등록됐는지 확인.

```bash
./qemu-system-x86_64 -nodefaults -device my-device ...
```

monitor에서:

```text
(qemu) info qom-tree
/machine (q35-machine)
  /peripheral
  /peripheral-anon
    /device[0] (my-device)
      /id  string
```

device가 *QOM tree에 등장*.

## 흔한 함정

- **parent_obj가 첫 필드가 아님** — cast 시 *잘못된 메모리* 읽음.
- **realize에서 error_setg 후 return 누락** — fail해도 *그대로 진행*.
- **type_init 매크로 누락** — type이 register 안 됨. `-device my-device` 시 "no such device".
- **property type mismatch** — UINT32에 string 시도. CLI 시 parse error.

## 정리

- QOM 객체: **TypeInfo**(class def) + **Instance struct**(state) + **Class struct**(method).
- 상속: `parent`로 부모 type 지정. `parent_obj`를 첫 필드로.
- Lifecycle: `instance_init` → property set → `realize` → ... → `unrealize` → `instance_finalize`.
- **realize**에서 자원 할당. error는 `Error **errp`로.
- **Property**로 외부에 옵션 노출 — CLI·QMP에서 access.
- Build 통합: meson.build + Kconfig + default.mak.
- `info qom-tree`로 *런타임 확인*.

## 다음 장 예고

다음 장은 *가장 흔한 device type* — **PCI device**의 실제 구현.

## 관련 항목

- [Ch 2: QEMU 설치와 빌드](/blog/tools/emulation/qemu-fake-device/chapter02-install-build)
- [Ch 4: 간단한 PCI 디바이스](/blog/tools/emulation/qemu-fake-device/chapter04-simple-pci)
- [QEMU Internals — QOM Deep Dive](/blog/tools/emulation/qemu-internals/chapter02-qom-deep-dive)
