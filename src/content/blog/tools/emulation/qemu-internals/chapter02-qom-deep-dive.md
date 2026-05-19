---
title: "Ch 2: QOM 심화 — 타입 시스템"
date: 2026-05-17T02:00:00
description: "QEMU Object Model의 타입 시스템, 속성, 인터페이스를 깊이 이해한다."
tags: [QEMU, QOM, TypeSystem, Object, Property]
series: "QEMU Internals"
seriesOrder: 2
draft: true
---

QEMU의 모든 device·machine·backend는 **QOM**(QEMU Object Model) 객체입니다. C로 구현한 객체 지향 시스템으로, 상속·다형성·인터페이스·런타임 reflection을 갖춥니다. 이 시스템을 *깊이 이해*하면 QEMU 소스 어디를 봐도 *구조가 보이게* 됩니다.

## 왜 C에서 OO를 흉내내는가

QEMU는 *수천 개*의 device를 *공통 인터페이스*로 다뤄야 합니다. PCI device 100여 종이 모두 같은 *probe·realize·reset* 흐름을 따르고, 새 device를 추가할 때 *기존 코드를 건드리지 않고* 등록할 수 있어야 합니다.

객체 지향 언어라면 자연스럽지만 QEMU는 *C 코드 base*. 그래서 QOM이 *직접 type system + dispatch*를 구현합니다.

## 타입 트리

```text
Object (root)
├── Device
│   ├── SysBusDevice
│   │   ├── ARMCPU
│   │   └── (PL011 UART 등)
│   ├── PCIDevice
│   │   ├── E1000
│   │   ├── XHCI
│   │   └── (VirtIO PCI 등)
│   └── (다른 bus devices)
├── Machine
│   ├── VirtMachine
│   └── (raspi, sifive_u 등)
└── (Interface, Container 등)
```

각 노드가 *TypeInfo*로 등록되어 *런타임에 동적*으로 인스턴스화 가능.

## TypeInfo — 클래스 정의

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
        { TYPE_HOTPLUG_HANDLER },
        { }
    },
};

static void my_device_register(void) {
    type_register_static(&my_device_info);
}
type_init(my_device_register)
```

핵심 필드.

| 필드 | 역할 |
|------|------|
| `name` | 타입 이름 문자열 |
| `parent` | 상속할 부모 타입 |
| `instance_size` | 인스턴스 구조체 크기 |
| `instance_init` | 생성자 callback |
| `instance_finalize` | 소멸자 callback |
| `class_size` | 클래스 구조체 크기 |
| `class_init` | 클래스 메서드 채우기 |
| `interfaces` | 구현하는 인터페이스들 |

`type_init`은 *생성자 attribute*로 module 로드 시 *자동 호출*. 따라서 사용자가 명시적으로 register할 필요 없음.

## Instance vs Class

QOM에서 *클래스*와 *인스턴스*가 명확히 분리.

| 종류 | 의미 | 메모리 |
|------|------|--------|
| **Class** | 타입의 *공유 데이터* — 함수 포인터, 상수 | 타입당 1개 |
| **Instance** | 개별 *객체 상태* | 인스턴스마다 |

```c
typedef struct MyDeviceClass {
    PCIDeviceClass parent_class;
    /* virtual functions */
    void (*do_something)(MyDevice *s);
    int magic;
} MyDeviceClass;

typedef struct MyDeviceState {
    PCIDevice parent_obj;
    /* instance fields */
    uint32_t ctrl;
    uint32_t status;
    MemoryRegion mmio;
} MyDeviceState;
```

C++의 virtual function table을 *수동*으로 구현한 셈.

## class_init — virtual function 등록

```c
static void my_device_class_init(ObjectClass *klass, void *data) {
    DeviceClass *dc = DEVICE_CLASS(klass);
    PCIDeviceClass *pc = PCI_DEVICE_CLASS(klass);
    MyDeviceClass *mc = MY_DEVICE_CLASS(klass);

    dc->realize = my_device_realize;
    dc->reset   = my_device_reset;
    dc->vmsd    = &vmstate_my_device;

    pc->vendor_id = 0x1234;
    pc->device_id = 0x6677;

    mc->do_something = my_device_do_something;
}
```

부모 클래스로 *upcast*해서 virtual function table을 채웁니다. 자식이 *override*한 method가 dispatch table에 들어감.

## 매크로로 타입 캐스팅

```c
MyDeviceState *s = MY_DEVICE(obj);     /* 인스턴스 cast */
MyDeviceClass *c = MY_DEVICE_GET_CLASS(obj);  /* 클래스 접근 */
```

이 매크로들은 *OBJECT_DECLARE_SIMPLE_TYPE* 같은 helper로 자동 생성.

```c
OBJECT_DECLARE_SIMPLE_TYPE(MyDeviceState, MY_DEVICE)
```

한 줄로 `MY_DEVICE(obj)`·`MY_DEVICE_GET_CLASS(obj)`가 만들어집니다.

## Property — runtime 노출

QOM 객체의 *상태*를 외부(CLI, QMP)에 노출.

```c
static Property my_device_props[] = {
    DEFINE_PROP_UINT32("size", MyDeviceState, size, 1024),
    DEFINE_PROP_BOOL("enable", MyDeviceState, enabled, true),
    DEFINE_PROP_STRING("filename", MyDeviceState, filename),
    DEFINE_PROP_END_OF_LIST(),
};

static void my_device_class_init(ObjectClass *klass, void *data) {
    DeviceClass *dc = DEVICE_CLASS(klass);
    device_class_set_props(dc, my_device_props);
}
```

CLI에서:

```bash
qemu-system-... -device my-device,size=2048,enable=on,filename=/tmp/data
```

QMP에서:

```text
{ "execute": "qom-set",
  "arguments": { "path": "/machine/my0",
                 "property": "size",
                 "value": 2048 } }
```

## Inheritance — 부모 호출

C++의 `super.method()`에 해당.

```c
static void my_device_realize(DeviceState *dev, Error **errp) {
    /* 자신의 초기화 */
    MyDeviceState *s = MY_DEVICE(dev);
    memory_region_init_io(&s->mmio, ...);

    /* 부모(PCI)의 realize 호출 */
    PCIDeviceClass *pc = PCI_DEVICE_CLASS(object_class_get_parent(...));
    pc->realize(dev, errp);
}
```

대부분의 경우 부모 realize는 *DeviceClass의 framework*이 알아서 부르므로 *명시적 호출 불필요*.

## Interface

C++의 *pure virtual* 인터페이스. 여러 타입이 *같은 contract*를 구현.

```c
typedef struct HotplugHandlerClass {
    InterfaceClass parent;
    void (*plug)(HotplugHandler *plug_handler, DeviceState *dev, Error **errp);
    void (*unplug)(HotplugHandler *plug_handler, DeviceState *dev, Error **errp);
} HotplugHandlerClass;

static const TypeInfo hotplug_handler_info = {
    .name          = TYPE_HOTPLUG_HANDLER,
    .parent        = TYPE_INTERFACE,
    .class_size    = sizeof(HotplugHandlerClass),
};
```

device가 이 인터페이스를 구현하면 `TypeInfo.interfaces`에 명시.

```c
static const TypeInfo my_bus_info = {
    .name          = TYPE_MY_BUS,
    .parent        = TYPE_BUS,
    .interfaces    = (InterfaceInfo[]) {
        { TYPE_HOTPLUG_HANDLER },
        { }
    },
    .class_init    = my_bus_class_init,
};
```

`object_dynamic_cast(obj, TYPE_HOTPLUG_HANDLER)`로 *interface 지원 확인*.

## ObjectClass dispatch

QOM 객체에서 method 호출은 *3단계*.

1. `obj->class` (생성 시 결정)
2. `class->method_ptr` (class_init에서 set)
3. 함수 호출

```c
DeviceClass *dc = DEVICE_GET_CLASS(dev);
if (dc->realize) {
    dc->realize(dev, errp);
}
```

이 dispatch가 *런타임*에 일어나므로 *동적 polymorphism*.

## TypeInfo.abstract

객체로 *직접 인스턴스화하지 않을 타입*에 set. C++의 abstract class.

```c
static const TypeInfo my_abstract_info = {
    .name = TYPE_MY_ABSTRACT,
    .abstract = true,
    /* ... */
};
```

자식 클래스만 인스턴스화 가능. *공통 base*를 의도할 때.

## Object lifecycle

객체 생성·소멸의 흐름.

```text
1. object_new(TYPE_NAME)
        │
        ▼
2. parent의 instance_init
        │
        ▼
3. 자신의 instance_init
        │
        ▼
4. (property 설정)
        │
        ▼
5. realize (Device의 경우)
        │
        ▼
6. (사용)
        │
        ▼
7. unrealize → instance_finalize → parent의 instance_finalize
        │
        ▼
8. object_unref
```

`realize`는 *DeviceClass에만* 존재하는 hook. 모든 property가 set된 *후* 자원 할당하는 곳.

## QMP에서 QOM 탐색

QEMU monitor에서 *런타임에* 객체 트리를 탐색.

```text
(qemu) info qom-tree
/machine (virt-machine)
  /unattached (container)
    /device[0] (pl011)
    /device[1] (gic-3.0)
  /peripheral (container)
  /peripheral-anon (container)
```

```text
(qemu) qom-list /machine
type (string)
parent_bus (link<bus>)
phandle-start (uint64)
...
```

이런 *reflection*이 QMP·HMP·migration·snapshot의 기반.

## 흔한 함정

- **`type_register_static` 누락** — type_init 매크로가 자동으로 처리. 매크로 빼면 *컴파일은 되지만 런타임에 미등록*.
- **부모 instance_size 작게** — instance_size에 *부모의 size + 자신*. `parent_obj`를 첫 필드로 둬야 cast 가능.
- **property type mismatch** — UINT32에 string set하면 *parse error*. spec 정확히.
- **realize 안에서 fail** — 항상 `Error **errp`로 보고. abort 금지.

## 정리

- **QOM**은 C로 구현한 *객체 지향 system* — 상속·다형성·interface·reflection.
- **TypeInfo**가 클래스 정의. `type_init`이 자동 등록.
- **Instance**(개별 상태)와 **Class**(공유 method/data) 분리.
- **class_init**에서 virtual function(realize·reset·vmsd 등) 채움.
- **Property**로 외부에 상태 노출. CLI·QMP 모두 사용.
- **Interface**로 cross-type contract. `interfaces` 배열에 명시.
- **realize/unrealize**가 Device의 lifecycle hook. property set 후 자원 할당.
- `info qom-tree`로 런타임 트리 탐색 — debug에 유용.

## 다음 장 예고

다음 장은 *모든 device가 사용하는* memory abstraction — **MemoryRegion + AddressSpace**. RAM·MMIO·alias·container의 tree와 IOMMU 모델까지.

## 관련 항목

- [Ch 1: QEMU 아키텍처 개요](/blog/tools/emulation/qemu-internals/chapter01-architecture)
- [Ch 3: 메모리 모델](/blog/tools/emulation/qemu-internals/chapter03-memory-model)
- [QEMU Fake Device — QOM Basics](/blog/tools/emulation/qemu-fake-device/chapter03-qom-basics)
- [QEMU RISC-V — Custom Device](/blog/tools/emulation/qemu-riscv/chapter08-custom-device)
