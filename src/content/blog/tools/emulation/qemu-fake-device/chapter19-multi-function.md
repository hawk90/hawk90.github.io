---
title: "Ch 19: Multi-Function PCI 디바이스"
date: 2026-05-17T19:00:00
description: "Function 분리·shared resource — multi-function PCI 패턴."
tags: [QEMU, multi-function, pci, mfd]
series: "QEMU Fake Device Driver"
seriesOrder: 19
draft: true
---

## 이 챕터의 의도

NIC, storage, NPU 컨트롤러는 한 PCI 디바이스 안에 여러 function을 둔다. 예를 들어 4-port NIC은 1 device × 4 functions로 표현된다. function별로 BAR, configuration, driver는 분리되지만 공통 doorbell, MSI vector pool, descriptor manager 같은 내부 자원은 공유한다. 이 장에서는 QEMU에 multi-function PCI를 구현하고, 이것이 Linux MFD subsystem과 어떻게 매핑되는지 본다.

## 핵심 항목

- ✦ PCI 디바이스 = device.function (BDF: bus:device.function), function 0-7
- ✦ Function 0이 *primary* — 다른 function의 존재를 *Multi-Function bit*(Header Type bit 7)로 알림
- ✦ ARI (Alternative Routing-ID Interpretation) — 8-bit function 한계 우회, 256 function까지
- ✦ **QOM child object** — function별 인스턴스, parent device가 children 소유
- ✦ Shared resource — common doorbell, MSI vector pool, descriptor manager
- ✦ Per-function BAR — function마다 독립 BAR
- ✦ Configuration space 분리 — function 별 256B
- ✦ **Function-Level Reset (FLR)** — 한 function만 reset, 다른 function·shared resource는 영향 X (어렵다!)
- ✦ Linux **MFD subsystem** (Multi-Function Device) — `mfd_add_devices` 패턴, sub-driver 분기
- ✦ SR-IOV preview — PF (Physical Function) 안에 다수 VF — *function 폭발* — Ch 20에서 깊이
- ◦ Function isolation — IOMMU group, ACS Direct Translation
- ◦ Function 번호 hot-add (PCIe hot-plug)

## 다이어그램 (4)

1. PCI BDF — bus / device / function 트리 + multi-function bit
2. QOM parent → child (function 0..N) 트리 + shared resource block
3. Linux MFD subsystem — parent driver → cell driver 분기
4. FLR vs Hot reset — function-level reset scope 차이

## 코드 sketch

```c
/* Multi-function PCI in QEMU */
typedef struct MultiFuncDev {
    PCIDevice parent;
    MyFunction fns[4];          /* 4 functions */
    SharedDoorbell shared;      /* shared resource */
    int next_msi_vec;
} MultiFuncDev;

static void multi_func_realize(PCIDevice *pdev, Error **errp) {
    MultiFuncDev *s = MULTI_FUNC(pdev);

    /* Header Type bit 7 = multi-function */
    pci_config_set_class(pdev->config, PCI_CLASS_NETWORK_ETHERNET);
    pdev->config[PCI_HEADER_TYPE] |= PCI_HEADER_TYPE_MULTI_FUNCTION;

    /* function 1..3을 child PCI device로 추가 */
    for (int i = 1; i < 4; i++) {
        DeviceState *ch = qdev_new("my-func");
        qdev_prop_set_uint8(ch, "function", i);
        qdev_realize_and_unref(ch, BUS(pcie_bus), errp);
        s->fns[i].parent = ch;
    }
}

/* FLR — function 0만 reset, shared는 보존 */
static void func_reset(PCIDevice *pdev, int reset_type) {
    if (reset_type == PCI_RESET_FLR) {
        my_function_reset(MY_FUNC(pdev));
        /* shared doorbell pool은 touch X */
    }
}
```

```c
/* Linux MFD driver side */
static struct mfd_cell my_cells[] = {
    { .name = "my-net",     .resources = net_res,     .num_resources = ARRAY_SIZE(net_res) },
    { .name = "my-storage", .resources = storage_res, .num_resources = ARRAY_SIZE(storage_res) },
    { .name = "my-acc",     .resources = acc_res,     .num_resources = ARRAY_SIZE(acc_res) },
};

static int my_probe(struct pci_dev *pdev, ...) {
    /* parent BAR mapping ... */
    return mfd_add_devices(&pdev->dev, PLATFORM_DEVID_NONE,
                            my_cells, ARRAY_SIZE(my_cells),
                            mem_resource, 0, NULL);
}
```

## 레퍼런스

- PCIe Base Spec §7.2.5 (Multi-Function devices), §6.6 (FLR)
- QEMU `hw/pci/pci.c::pci_register_func`
- Linux `Documentation/driver-api/mfd.rst`
- Linux `drivers/mfd/` — 실 driver 예 (cs5535, twl4030)

## 관련 항목

- [Ch 4: Simple PCI](/blog/tools/emulation/qemu-fake-device/chapter04-simple-pci) (기존)
- [Ch 13: Register Bank](/blog/tools/emulation/qemu-fake-device/chapter13-register-bank)
- [Ch 20: Hot-plug](/blog/tools/emulation/qemu-fake-device/chapter20-hotplug)
- [PCIe Ch 12 SR-IOV/VFIO](/blog/embedded/hardware/pcie/) — function 폭발의 정점
