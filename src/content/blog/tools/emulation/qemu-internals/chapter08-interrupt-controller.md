---
title: "Ch 8: 인터럽트 컨트롤러"
date: 2025-10-01T08:00:00
description: "GIC, APIC 인터럽트 컨트롤러 에뮬레이션을 이해한다."
tags: [QEMU, GIC, APIC, Interrupt]
series: "QEMU Internals"
seriesOrder: 8
draft: true
---

## 인터럽트 컨트롤러 종류

- **APIC**: x86 (LAPIC + I/O APIC)
- **GIC**: ARM (GICv2, GICv3)
- **PLIC**: RISC-V

---

## ARM GIC

```
┌─────────────────┐
│    CPU Core     │
│  ┌───────────┐  │
│  │CPU Intf   │  │
│  └─────┬─────┘  │
└────────┼────────┘
         │
┌────────▼────────┐
│   Distributor   │
├─────────────────┤
│ SPI  SGI  PPI   │
└─────────────────┘
```

---

## MSI/MSI-X

메시지 기반 인터럽트:

```c
msi_init(pdev, 0, num_vectors, true, false, errp);
msi_notify(pdev, vector);
```

---

## 정리

- QEMU는 다양한 인터럽트 컨트롤러를 에뮬레이션한다.
- ARM은 GIC, x86은 APIC, RISC-V는 PLIC를 사용한다.
- MSI/MSI-X는 메모리 쓰기로 인터럽트를 전달한다.

---

## 관련 항목

- [Ch 7: PCI 서브시스템](/blog/tools/qemu-internals/chapter07-pci-subsystem)
- [Ch 9: 타이머와 클럭](/blog/tools/qemu-internals/chapter09-timers)
