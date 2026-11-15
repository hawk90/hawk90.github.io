---
title: "Ch 10: Linux PCI Basics — Enumeration·Driver Model·sysfs"
slug: "embedded/hardware/pcie/chapter10-linux-basics"
date: 2026-05-19T09:10:00
description: "Linux kernel의 PCIe — boot enumeration·struct pci_dev·driver matching·probe/remove·sysfs entry·ACPI 통합."
series: "PCIe Deep Dive"
seriesOrder: 10
tags: [pcie, linux, driver-model, sysfs, enumeration]
draft: false
topics: ["embedded", "embedded/hardware"]
---

## 한 줄 요약

> **"Linux PCI subsystem은 *firmware·UEFI가 끝낸 enumeration*을 받아 *struct pci_dev*로 표현하고, *pci_driver의 id_table*과 매칭해 *probe → resource → IRQ → I/O*의 생명주기를 관리합니다."** — `/sys/bus/pci/`가 *모든 device·driver 통합 view*. `lspci`는 플랫폼과 선택한 backend에 따라 sysfs·다른 접근 방법·dump 파일을 사용합니다. *ACPI PRT·MCFG*가 *firmware↔kernel 인터페이스*.

[Ch 3 Configuration Space](/blog/embedded/hardware/pcie/chapter03-config-space)·[Ch 4 BAR](/blog/embedded/hardware/pcie/chapter04-bar-mmio)에서 *device가 자기를 광고하는 layout*을 봤습니다. 이 장은 *Linux가 그 layout을 읽어 driver model로 통합*하는 흐름을 본격적으로 분해합니다.

## Boot Enumeration

| 단계 | 주체 |
|------|------|
| 1 | UEFI/BIOS가 *Configuration Space probe·BAR 할당·bridge bus numbering* |
| 2 | UEFI가 *ACPI MCFG (ECAM 영역) 등록* |
| 3 | 플랫폼의 host bridge 초기화 경로가 MCFG·DT 등으로 config 접근과 root bus 구성 |
| 4 | Linux *pci_scan_root_bus()*가 *각 bus walk → struct pci_dev 생성* |
| 5 | sysfs에 entry 노출 (`/sys/bus/pci/devices/`) |
| 6 | *deferred*: pci_bus_add_devices가 *driver matching·probe* 호출 |

Hotplug·rescan으로 추가 장치를 찾을 수 있지만, driver 재binding과 hardware 재열거는 다릅니다. 이 글에서는 rescan·bind/unbind·module load를 실행하지 않았습니다.

## struct pci_dev — 핵심 멤버

| 멤버 | 의미 |
|------|------|
| `struct device dev` | Linux device model 통합 |
| `u16 vendor·device` | Vendor·Device ID |
| `u16 subsystem_vendor·subsystem_device` | 서브시스템 식별 |
| `u32 class` | Class Code |
| `u8 hdr_type` | Type 0 또는 Type 1 |
| `unsigned int devfn` | Device·function 인코딩. bus 번호는 `bus->number` |
| `struct resource resource[DEVICE_COUNT_RESOURCE]` | BAR·ROM·bridge window 등 전체 resource. BAR 슬롯 6개보다 큼 |
| `struct pci_driver *driver` | 매칭된 driver |
| `dev`에 연결한 driver data | `pci_set_drvdata()`·`pci_get_drvdata()`로 접근 |
| `struct pci_bus *bus` | 속한 bus |
| `struct list_head bus_list` | bus의 device list |

`drivers/pci/probe.c`에서 *struct pci_dev 할당·초기화*.

## struct pci_driver

| 멤버 | 의미 |
|------|------|
| `const struct pci_device_id *id_table` | *Vendor·Device·Class 매칭 패턴* |
| `int (*probe)(struct pci_dev *, const struct pci_device_id *)` | device 발견 시 |
| `void (*remove)(struct pci_dev *)` | device 해제 시 |
| driver의 `dev_pm_ops` | runtime·system PM callback. 기존 PCI legacy PM callback과 구분 |
| `const struct pci_error_handlers *err_handler` | AER callback (Ch 7) |
| `struct device_driver driver` | Linux driver model |

장치 ID 표는 driver가 실제로 지원하는 장치로 제한해야 합니다. Ethernet class 전체를 임의 driver에 매칭하면 register·DMA protocol이 다른 장치까지 probe할 수 있습니다. `MODULE_DEVICE_TABLE`은 module alias를 만들어 자동 load에 쓰이며, 그 자체가 장치 초기화를 수행하거나 matching 성공을 보장하지는 않습니다.


## Driver Matching

*Vendor·Device ID 매칭*이 *기본*. 추가 매칭:

| 패턴 | 사용 |
|------|------|
| `PCI_DEVICE(v, d)` | 특정 V/D |
| `PCI_DEVICE_SUB(v,d,sv,sd)` | Sub-system도 매칭 |
| `PCI_DEVICE_CLASS(class, mask)` | Class 기반 (모든 NIC 등) |
| `driver_override` | 지정된 driver 이름으로 binding을 제한하는 별도 정책 |

PCI core의 ID matching, 이미 binding된 상태와 driver_override 등을 확인해야 합니다. vendor-specific driver가 class driver보다 항상 우선한다는 보편적 우선순위는 없습니다.

## probe·remove 생명 주기

| 단계 | 함수 | 의미 |
|------|------|------|
| 1 | `pci_enable_device(pdev)` | 사용할 자원을 활성화. MSI/MSI-X vector 할당은 뒤 단계 |
| 2 | `pci_request_regions(pdev, "mydrv")` | BAR 영역 *exclusive ownership* 요청 |
| 3 | `dma_set_mask_and_coherent()` 등 | 실제 장치의 DMA 주소 폭 지원을 검사 |
| 4 | `pci_set_master(pdev)` | 준비된 DMA 경로의 bus master 활성 |
| 5 | `pci_iomap(pdev, bar, max_size)` | BAR을 *kernel virtual address*로 매핑 |
| 6 | `pci_alloc_irq_vectors()` | MSI/MSI-X 할당 (Ch 5) |
| 7 | `request_irq(irq, isr, ...)` | ISR 등록 |
| 8 | Driver 자체 init (queue·workqueue 등) |
| 9 | `remove` 시 *역순* cleanup |

실패하면 이미 획득한 자원만 되돌립니다. DMA·interrupt가 발생 가능한 상태라면 발생원을 먼저 중단하고 handler·work를 동기화한 뒤 mapping과 resource를 해제해야 합니다. 단순히 함수 이름을 역순으로 나열하는 것만으로는 안전한 remove가 되지 않습니다. 실제 module build·probe/remove 시험은 수행하지 않았습니다.

각 단계 실패면 별도 errno를 확인합니다. `dmesg | grep <drv>`로 *각 단계 결과* 추적.

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

Linux에서 sysfs backend를 사용할 수 있지만 `lspci -F`는 저장된 dump를 읽는 별도 backend입니다. `lspci -t`로 *topology tree*, `lspci -vv`로 *상세 capability dump*.

## ACPI 통합

| 영역 | 역할 |
|------|------|
| **MCFG** | ECAM 영역 (Ch 3) |
| **DSDT** | device 동작·resource·PRT |
| **PRT (PCI Routing Table)** | INTx → APIC vector 매핑 |
| **ACPI hotplug** | Notify·`_EJ0` 등의 플랫폼 절차. HPET는 hotplug가 아니라 timer 기능 |

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

*Class·subsystem ID*도 매칭. 이미 bind된 장치, driver_override, ID table·동적 ID와 probe 결과를 함께 확인합니다. 드라이버 이름이나 vendor 전용 여부만으로 우선순위를 정하지 않습니다.

### "sysfs config write로 BAR 변경"

Driver가 owner여도 임의 BAR config write가 안전한 것은 아닙니다. decode·resource·사용 중인 매핑을 관리하는 PCI core 절차를 따라야 합니다. *manual setpci*는 *driver 영향* — *device hang 또는 OS crash 위험*.

### "remove가 동기로 즉시 완료"

*driver remove*는 *outstanding I/O·workqueue 등 cleanup* 필요. *비동기 cleanup* 패턴 흔함. *완료 보장은 wait_for_completion 등 명시적*.

## 정리

- Linux PCI subsystem은 *firmware enumeration*을 *struct pci_dev*로 흡수.
- *pci_driver의 id_table*과 *device ID 매칭*해 *probe/remove*.
- *Probe 패턴*: enable → request_regions → set_master → iomap → alloc_irq_vectors → request_irq.
- `/sys/bus/pci/`가 *모든 통합 view* — backend에 따라 config 접근 방식이 달라집니다.
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

구현은 [Linux v6.12 pci.h](https://github.com/torvalds/linux/blob/adc218676eef25575469234709c2d87185ca223a/include/linux/pci.h), [pci-driver.c](https://github.com/torvalds/linux/blob/adc218676eef25575469234709c2d87185ca223a/drivers/pci/pci-driver.c), [PCI driver 문서](https://github.com/torvalds/linux/blob/adc218676eef25575469234709c2d87185ca223a/Documentation/PCI/pci.rst)를 대조했습니다. 본 글의 1차 자료·정책은 [Ch 1 footer](/blog/embedded/hardware/pcie/chapter01-fundamentals#시리즈-자료-출처-안내) 참고.
