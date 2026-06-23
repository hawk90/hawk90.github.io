---
title: "Ch 10: Linux PCI Basics — Enumeration·Driver Model·sysfs"
date: 2026-05-19T09:10:00
description: "Linux kernel의 PCIe — boot enumeration·struct pci_dev·driver matching·probe/remove·sysfs entry·ACPI 통합."
series: "PCIe Deep Dive"
seriesOrder: 10
tags: [pcie, linux, driver-model, sysfs, enumeration]
draft: false
---

## 한 줄 요약

> **"Linux PCI subsystem은 *firmware·UEFI가 끝낸 enumeration*을 받아 *struct pci_dev*로 표현하고, *pci_driver의 id_table*과 매칭해 *probe → resource → IRQ → I/O*의 생명주기를 관리합니다."** — `/sys/bus/pci/`가 *모든 device·driver 통합 view*. `lspci`도 결국 *sysfs read*. *ACPI PRT·MCFG*가 *firmware↔kernel 인터페이스*.

[Ch 3 Configuration Space](/blog/embedded/hardware/pcie/chapter03-config-space)·[Ch 4 BAR](/blog/embedded/hardware/pcie/chapter04-bar-mmio)에서 *device가 자기를 광고하는 layout*을 봤습니다. 이 장은 *Linux가 그 layout을 읽어 driver model로 통합*하는 흐름을 본격적으로 분해합니다.

## Boot Enumeration

| 단계 | 주체 |
|------|------|
| 1 | UEFI/BIOS가 *Configuration Space probe·BAR 할당·bridge bus numbering* |
| 2 | UEFI가 *ACPI MCFG (ECAM 영역) 등록* |
| 3 | Linux *pci-acpi.c*가 *MCFG 읽고 root bus 등록* |
| 4 | Linux *pci_scan_root_bus()*가 *각 bus walk → struct pci_dev 생성* |
| 5 | sysfs에 entry 노출 (`/sys/bus/pci/devices/`) |
| 6 | *deferred*: pci_bus_add_devices가 *driver matching·probe* 호출 |

*Re-enumeration*은 *hot-plug·VFIO*에서 일어남. `echo 1 > /sys/bus/pci/rescan`으로 *manual trigger*.

## struct pci_dev — 핵심 멤버

| 멤버 | 의미 |
|------|------|
| `struct device dev` | Linux device model 통합 |
| `u16 vendor·device` | Vendor·Device ID |
| `u16 subsystem_vendor·subsystem_device` | 서브시스템 식별 |
| `u32 class` | Class Code |
| `u8 hdr_type` | Type 0 또는 Type 1 |
| `u8 bus·devfn` | BDF |
| `struct resource resource[6]` | BAR 0~5의 *resource* |
| `struct pci_driver *driver` | 매칭된 driver |
| `void *driver_data` | driver 전용 데이터 |
| `struct pci_bus *bus` | 속한 bus |
| `struct list_head bus_list` | bus의 device list |

`drivers/pci/probe.c`에서 *struct pci_dev 할당·초기화*.

## struct pci_driver

| 멤버 | 의미 |
|------|------|
| `const struct pci_device_id *id_table` | *Vendor·Device·Class 매칭 패턴* |
| `int (*probe)(struct pci_dev *, const struct pci_device_id *)` | device 발견 시 |
| `void (*remove)(struct pci_dev *)` | device 해제 시 |
| `int (*suspend·resume)(struct pci_dev *)` | PM callback |
| `const struct pci_error_handlers *err_handler` | AER callback (Ch 7) |
| `struct device_driver driver` | Linux driver model |

```c
static const struct pci_device_id my_pci_table[] = {
    { PCI_DEVICE(0x8086, 0x1234) },
    { PCI_DEVICE_CLASS(PCI_CLASS_NETWORK_ETHERNET << 8, ~0) },
    { 0 }
};
MODULE_DEVICE_TABLE(pci, my_pci_table);

static struct pci_driver my_driver = {
    .name     = "mydrv",
    .id_table = my_pci_table,
    .probe    = my_probe,
    .remove   = my_remove,
};
module_pci_driver(my_driver);
```

## Driver Matching

*Vendor·Device ID 매칭*이 *기본*. 추가 매칭:

| 패턴 | 사용 |
|------|------|
| `PCI_DEVICE(v, d)` | 특정 V/D |
| `PCI_DEVICE_SUB(v,d,sv,sd)` | Sub-system도 매칭 |
| `PCI_DEVICE_CLASS(class, mask)` | Class 기반 (모든 NIC 등) |
| ACPI `_HID`·`_CID` | ACPI 기반 (root port 등) |

여러 driver가 *같은 device 매칭*하면 *bind priority*에 따라 결정. `/sys/bus/pci/drivers/<drv>/bind`로 *수동 binding*.

## probe·remove 생명 주기

| 단계 | 함수 | 의미 |
|------|------|------|
| 1 | `pci_enable_device(pdev)` | Memory·I/O space 활성, IRQ 할당 |
| 2 | `pci_request_regions(pdev, "mydrv")` | BAR 영역 *exclusive ownership* 요청 |
| 3 | `pci_set_master(pdev)` | DMA bus master 활성 |
| 4 | `pci_iomap(pdev, bar, max_size)` | BAR을 *kernel virtual address*로 매핑 |
| 5 | `pci_alloc_irq_vectors()` | MSI/MSI-X 할당 (Ch 5) |
| 6 | `request_irq(irq, isr, ...)` | ISR 등록 |
| 7 | Driver 자체 init (queue·workqueue 등) |
| 8 | `remove` 시 *역순* cleanup |

각 단계 실패면 *별도 errno*. `dmesg | grep <drv>`로 *각 단계 결과* 추적.

## sysfs 구조

`/sys/bus/pci/`:

| 경로 | 내용 |
|------|------|
| `devices/<BDF>/` | 각 device |
| `devices/<BDF>/config` | Configuration Space 4 KB (binary) |
| `devices/<BDF>/resource` | BAR 정보 |
| `devices/<BDF>/resource<N>` | 각 BAR (mmap 가능) |
| `devices/<BDF>/driver` | 매칭된 driver symlink |
| `devices/<BDF>/vendor·device·class` | ID 정보 |
| `devices/<BDF>/numa_node` | NUMA locality |
| `devices/<BDF>/sriov_numvfs` | SR-IOV (PF에서만) |
| `devices/<BDF>/reset` | FLR/secondary bus reset trigger |
| `drivers/<drv>/` | 각 driver |
| `drivers/<drv>/bind·unbind` | 수동 driver binding |
| `slots/` | hot-plug slot 정보 |

`lspci`는 *사실상 sysfs 읽기*. `lspci -t`로 *topology tree*, `lspci -vv`로 *상세 capability dump*.

## ACPI 통합

| 영역 | 역할 |
|------|------|
| **MCFG** | ECAM 영역 (Ch 3) |
| **DSDT** | device 동작·resource·PRT |
| **PRT (PCI Routing Table)** | INTx → APIC vector 매핑 |
| **HOTPLUG (HPET·_OST)** | hot-plug event 통보 |

x86은 *ACPI 의존도 큼*. ARM·POWER는 *DT (Device Tree)* 또는 *ACPI + DT 혼용*.

## pcie-portdriver

*Root Port·Switch Port 같은 service*를 *portdrv*가 통합:

| Service | 모듈 |
|---------|------|
| AER | aer service |
| Hot-plug | pciehp |
| Power Management | pme |
| DPC | dpc |
| BW Notification | bwctrl |

`drivers/pci/pcie/portdrv.c`가 *각 service 모듈에 dispatch*. *portbus driver model*.

## 자주 하는 실수

### "pci_enable_device 안 해도 BAR 읽기 됨"

*sysfs config는 enable 무관*. *BAR I/O·DMA*는 *반드시 enable 후*. *pci_request_regions까지* 안 하면 *다른 driver와 충돌* 가능.

### "MODULE_DEVICE_TABLE 없으면 작동 안 함"

작동은 함 — 다만 *udev autoload 안 됨*. *manual modprobe* 필요. 항상 *MODULE_DEVICE_TABLE(pci, ...)* 등록 권장.

### "ID 매칭만 되면 probe 호출"

*Class·subsystem ID*도 매칭. *generic driver (예: nouveau)*가 *priority 낮은 매칭*. *vendor-specific driver*가 *우선 binding*.

### "sysfs config write로 BAR 변경"

*BAR write는 driver가 owner일 때만 안전*. *manual setpci*는 *driver 영향* — *device hang 또는 OS crash 위험*.

### "remove가 동기로 즉시 완료"

*driver remove*는 *outstanding I/O·workqueue 등 cleanup* 필요. *비동기 cleanup* 패턴 흔함. *완료 보장은 wait_for_completion 등 명시적*.

## 정리

- Linux PCI subsystem은 *firmware enumeration*을 *struct pci_dev*로 흡수.
- *pci_driver의 id_table*과 *device ID 매칭*해 *probe/remove*.
- *Probe 패턴*: enable → request_regions → set_master → iomap → alloc_irq_vectors → request_irq.
- `/sys/bus/pci/`가 *모든 통합 view* — `lspci`도 sysfs 읽기.
- *ACPI MCFG·PRT*가 *firmware↔kernel 인터페이스*.
- *pcie-portdriver*가 *AER·hot-plug·PM·DPC* service 통합.
- *MODULE_DEVICE_TABLE*로 *udev autoload*.

## 다음 편

[Ch 11: DMA·IOMMU — ATS·PRI·PASID·IOMMUFD](/blog/embedded/hardware/pcie/chapter11-linux-dma)에서 *DMA buffer 관리·IOMMU mapping·SVM 기반*을 본격적으로 분해합니다.

## 관련 항목

- [Ch 3: Configuration Space](/blog/embedded/hardware/pcie/chapter03-config-space)
- [Ch 4: BAR & MMIO](/blog/embedded/hardware/pcie/chapter04-bar-mmio) — pci_iomap
- [Ch 5: Interrupts](/blog/embedded/hardware/pcie/chapter05-interrupts) — pci_alloc_irq_vectors
- [Ch 7: Error Handling](/blog/embedded/hardware/pcie/chapter07-error-handling) — pci_error_handlers

## 시리즈 자료 출처 안내

본 글의 1차 자료·정책은 [Ch 1 footer](/blog/embedded/hardware/pcie/chapter01-fundamentals#시리즈-자료-출처-안내) 참고.
