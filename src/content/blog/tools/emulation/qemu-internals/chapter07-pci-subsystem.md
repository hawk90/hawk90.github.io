---
title: "Ch 7: PCI 서브시스템"
date: 2025-10-01T07:00:00
description: "QEMU PCI 버스, 브릿지, 디바이스 구현을 이해한다."
tags: [QEMU, PCI, Bus]
series: "QEMU Internals"
seriesOrder: 7
draft: true
---

## PCI 서브시스템 구조

```
┌──────────────────┐
│   Root Complex   │
└────────┬─────────┘
         │
┌────────▼─────────┐
│    PCIe Bus 0    │
├──────────────────┤
│ ┌──────┐ ┌─────┐ │
│ │ Dev  │ │Bridge│─┼──► Bus 1
│ └──────┘ └─────┘ │
└──────────────────┘
```

---

## PCIDevice 구현

```c
static void my_pci_realize(PCIDevice *pdev, Error **errp)
{
    pci_config_set_interrupt_pin(pdev->config, 1);

    memory_region_init_io(&s->mmio, OBJECT(s), &my_mmio_ops, s,
                          "my-mmio", 0x1000);
    pci_register_bar(pdev, 0, PCI_BASE_ADDRESS_SPACE_MEMORY, &s->mmio);
}
```

---

## Configuration Space

PCI 설정 공간:
- Vendor ID, Device ID
- Command, Status
- BAR0-5
- Interrupt Line/Pin

---

## 정리

- PCI 서브시스템은 버스 계층 구조를 에뮬레이션한다.
- PCIDevice를 상속해 PCI 디바이스를 구현한다.
- Configuration Space와 BAR로 디바이스를 설정한다.

---

## 관련 항목

- [Ch 6: 네트워크 레이어](/blog/tools/emulation/qemu-internals/chapter06-network-layer)
- [Ch 8: 인터럽트 컨트롤러](/blog/tools/emulation/qemu-internals/chapter08-interrupt-controller)
