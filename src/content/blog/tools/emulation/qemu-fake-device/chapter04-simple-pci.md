---
title: "Ch 4: 간단한 PCI 디바이스 만들기"
date: 2026-05-17T04:00:00
description: "QEMU에서 간단한 PCI 디바이스를 만들고 게스트에서 인식시킨다."
tags: [QEMU, PCI, DeviceModel, vendor-id, BAR]
series: "QEMU Fake Device Driver"
seriesOrder: 4
draft: true
---

PCI는 *가장 흔한* device type입니다. driver 개발의 대부분이 PCI device를 대상이죠. 이 장은 *가장 단순한* PCI device를 만들고 guest에서 `lspci`로 인식시키는 *전체 흐름*을 봅니다. 이 device가 이후 모든 장의 *baseline*.

## PCI device의 식별

PCI device를 구분하는 두 ID.

| ID | 의미 |
|----|------|
| **Vendor ID** | 회사 고유 코드 (16-bit). 예: Intel 0x8086, NVIDIA 0x10DE |
| **Device ID** | 제품 코드 (16-bit). vendor가 임의 결정 |

```bash
lspci -nn
# 00:04.0 ... [1234:5678]    ← vendor=0x1234, device=0x5678
```

vendor 0x1234·device 0x5678는 *어떤 실 vendor와도 충돌하지 않는* 학습용 값.

## 파일 구조

```text
hw/misc/
└── my-pci-device.c      ← 우리가 작성

hw/misc/meson.build      ← build 등록
hw/misc/Kconfig          ← config option
configs/devices/x86_64-softmmu/default.mak  ← 활성
```

## 최소 PCI device

```c
/* hw/misc/my-pci-device.c */
#include "qemu/osdep.h"
#include "qemu/log.h"
#include "hw/pci/pci.h"
#include "qom/object.h"

#define TYPE_MY_PCI "my-pci-device"
OBJECT_DECLARE_SIMPLE_TYPE(MyPCIState, MY_PCI)

struct MyPCIState {
    PCIDevice parent_obj;
    /* ... 나중에 채움 ... */
};

static void my_pci_realize(PCIDevice *pdev, Error **errp) {
    /* 빈 realize — 나중에 BAR 등 추가 */
    qemu_log("my-pci: device realized\n");
}

static void my_pci_class_init(ObjectClass *klass, void *data) {
    PCIDeviceClass *k = PCI_DEVICE_CLASS(klass);
    DeviceClass *dc = DEVICE_CLASS(klass);

    k->realize     = my_pci_realize;
    k->vendor_id   = 0x1234;
    k->device_id   = 0x5678;
    k->class_id    = PCI_CLASS_OTHERS;
    k->revision    = 0x01;

    set_bit(DEVICE_CATEGORY_MISC, dc->categories);
    dc->desc = "My fake PCI device";
}

static const TypeInfo my_pci_info = {
    .name          = TYPE_MY_PCI,
    .parent        = TYPE_PCI_DEVICE,
    .instance_size = sizeof(MyPCIState),
    .class_init    = my_pci_class_init,
    .interfaces = (InterfaceInfo[]) {
        { INTERFACE_CONVENTIONAL_PCI_DEVICE },
        { },
    },
};

static void my_pci_register_types(void) {
    type_register_static(&my_pci_info);
}
type_init(my_pci_register_types)
```

이 50줄짜리 파일이 *완전한 PCI device 정의*.

## Build 등록

`hw/misc/meson.build`:

```text
system_ss.add(when: 'CONFIG_MY_PCI_DEVICE', if_true: files('my-pci-device.c'))
```

`hw/misc/Kconfig`:

```text
config MY_PCI_DEVICE
    bool
    default y
    depends on PCI
```

`configs/devices/x86_64-softmmu/default.mak`:

```text
CONFIG_MY_PCI_DEVICE=y
```

## 빌드

```bash
cd qemu/build
ninja qemu-system-x86_64
```

증분 빌드라 *수초~수십초*.

## 실행

```bash
./qemu-system-x86_64 -enable-kvm -m 512M -nographic \
    -kernel /path/to/vmlinuz \
    -initrd /path/to/initramfs \
    -append "console=ttyS0" \
    -device my-pci-device
```

guest에서:

```bash
guest$ lspci -nn
00:01.0 ... [8086:1237] Intel ...
00:04.0 ... [1234:5678] My fake PCI device   ← 우리 device!
```

`[1234:5678]`이 보이면 성공.

## PCI Class ID

`class_id`는 device의 *카테고리*. Linux PCI subsystem이 *적절한 driver*를 찾는 hint.

| Class | 의미 |
|-------|------|
| `PCI_CLASS_OTHERS` (0xFF00) | 분류 안 됨 — 학습용 |
| `PCI_CLASS_NETWORK_ETHERNET` (0x0200) | Ethernet |
| `PCI_CLASS_STORAGE_SCSI` (0x0100) | SCSI |
| `PCI_CLASS_DISPLAY_VGA` (0x0300) | Video |
| `PCI_CLASS_PROCESSOR_CO` (0x0B40) | Co-processor (accelerator) |

`PCI_CLASS_PROCESSOR_CO`가 NPU/FPGA 가속기에 자주 쓰임.

## Subsystem ID

```c
pci_dev->config[PCI_SUBSYSTEM_VENDOR_ID] = 0x1234;
pci_dev->config[PCI_SUBSYSTEM_ID] = 0x0001;
```

또는 class_init에서:

```c
static void my_pci_class_init(...) {
    /* ... */
    k->subsystem_vendor_id = 0x1234;
    k->subsystem_id = 0x0001;
}
```

board/version 표시에 사용.

## Config space inspection

guest에서:

```bash
guest$ lspci -xxx -s 00:04.0
00: 34 12 78 56 00 00 00 00 01 00 00 ff 00 00 00 00
10: 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00
20: 00 00 00 00 00 00 00 00 00 00 00 00 34 12 01 00
30: 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00
```

256-byte config space. vendor/device ID·class·subsystem·BAR(아직 0)·capability.

## verbose info

```bash
guest$ lspci -vvv -s 00:04.0
00:04.0 ... [1234:5678]
    Subsystem: ... [1234:0001]
    Control: I/O- Mem- BusMaster- ...
    Status: ...
    Region 0~5: ... (BAR — 아직 없음)
```

BAR 없으므로 *MMIO 영역도 없음*. driver가 attach해도 별로 할 일 없음.

## 다음 단계 — BAR 추가

다음 장에서 *MMIO BAR*를 등록해 *register*를 노출. driver가 *읽고 쓸* 영역.

```c
/* preview */
memory_region_init_io(&s->mmio, OBJECT(s), &my_ops, s,
                      "my-mmio", 0x1000);
pci_register_bar(pdev, 0, PCI_BASE_ADDRESS_SPACE_MEMORY, &s->mmio);
```

이걸 realize에 추가하면 *4KB BAR0*가 생김.

## VirtIO 대안

VirtIO는 *paravirtualized*. 더 빠르지만 *spec 따라가야 함*.

| 비교 | Custom PCI | VirtIO |
|------|-----------|---------|
| 자유도 | 어떤 register layout이든 | spec 표준만 |
| 성능 | 그저 그럼 (vmexit per access) | 매우 빠름 (ring + ioeventfd) |
| Driver | 자작 | mainline에 표준 driver |
| 학습 | driver 전 layer | VirtIO spec |

이 시리즈 ch 15·16에서 VirtIO 다룸. 현재 ch 4~14는 *custom PCI*.

## Multi-device 인스턴스

같은 device를 *여러 개* attach 가능.

```bash
-device my-pci-device,id=dev0 \
-device my-pci-device,id=dev1
```

guest에서 *각 BDF*가 다른 device.

## qemu monitor에서 확인

```text
(qemu) info pci
Bus  0, device   4, function 0:
  Class 0xff00: PCI device 1234:5678
    PCI subsystem 1234:0001
    BAR0: 32 bit memory at 0xffffffffffffffff [0xfffffffe].
    ...
```

device가 *bus·function*에 매핑된 것을 확인.

## device 트리

```text
(qemu) info qom-tree /machine
/machine (q35-machine)
  /peripheral
  /peripheral-anon
    /device[0] (my-pci-device)
```

QOM tree에서 *anonymous device*로 등장.

## 흔한 함정

- **CONFIG flag 누락** — config option만 추가하고 default.mak에 안 넣음. *컴파일은 되지만 device 등록 안 됨*.
- **interfaces 누락** — `INTERFACE_CONVENTIONAL_PCI_DEVICE` 명시 안 하면 *modern PCIe 기능* 일부 동작 안 함.
- **vendor ID 충돌** — 실 vendor ID 사용 시 Linux가 *그 vendor driver* 시도. 0x1234 같은 *unused* ID 권장.
- **realize에서 abort** — error는 `error_setg` + return. abort 절대 금지.

## 정리

- PCI device는 **vendor ID + device ID**로 식별. class_id로 카테고리.
- 최소 device는 ~50줄 — TypeInfo·class_init·realize.
- Build 통합: meson.build + Kconfig + default.mak.
- guest에서 `lspci -nn`으로 인식 확인.
- 학습용 vendor/device ID는 *실 vendor와 충돌 안 하는* 0x1234/0x5678 등.
- Class ID는 driver 매칭 hint. PROCESSOR_CO가 accelerator에 흔함.
- 다음 장에서 *BAR*를 추가해 *MMIO register* 노출.

## 다음 장 예고

다음 장은 *register 노출* — **MMIO BAR + callback** 구현. driver가 *실제로 접근*하는 영역.

## 관련 항목

- [Ch 3: QOM 기초](/blog/tools/emulation/qemu-fake-device/chapter03-qom-basics)
- [Ch 5: MMIO 레지스터 구현](/blog/tools/emulation/qemu-fake-device/chapter05-mmio-registers)
- [QEMU Internals — PCI Subsystem](/blog/tools/emulation/qemu-internals/chapter07-pci-subsystem)
- [FPGA Driver — Fake FPGA](/blog/tools/emulation/qemu-fpga-driver/chapter03-qemu-fake-fpga)
