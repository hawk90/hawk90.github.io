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

> **"Linux PCI 코어는 장치를 찾아 `struct pci_dev`로 만들고, 드라이버의 `id_table`과 맞춰 `probe()`를 부르고, 그 결과를 sysfs로 보여 줍니다."** firmware가 먼저 배치한 BAR를 그대로 쓸지 다시 배치할지도 커널이 정합니다. 이 장은 QEMU `edu` 장치용으로 직접 짠 작은 드라이버로 probe·remove·bind·driver_override·rescan을 한 번씩 돌려 봅니다.

[Ch 3](/blog/embedded/hardware/pcie/chapter03-config-space)·[Ch 4](/blog/embedded/hardware/pcie/chapter04-bar-mmio)에서 장치가 자기를 광고하는 레지스터를 봤습니다. 이 장은 Linux v6.12가 그 레지스터를 읽어 드라이버 모델로 엮는 흐름을 시리즈 VM(QEMU 11.1.3 virt, Debian 13, 커널 6.12.116)에서 따라갑니다.

## Boot Enumeration — firmware 배치를 버리고 다시 놓다

시리즈 VM은 UEFI(edk2)가 먼저 장치를 열거하고 BAR를 배치한 뒤 Linux가 부팅합니다. 부팅 로그에서 NVMe(01:00.0)와 그 root port(00:03.0)만 골랐습니다.

```text
pci 0000:00:03.0: [1b36:000c] type 01 class 0x060400 PCIe Root Port
pci 0000:00:03.0:   bridge window [mem 0x10a00000-0x10bfffff]
pci 0000:01:00.0: [1b36:0010] type 00 class 0x010802 PCIe Endpoint
pci 0000:01:00.0: BAR 0 [mem 0x10a00000-0x10a03fff 64bit]
pci 0000:00:03.0: bridge window [mem 0x10000000-0x101fffff]: assigned
pci 0000:00:03.0: bridge window [mem 0x8000000000-0x80001fffff 64bit pref]: assigned
pci 0000:01:00.0: BAR 0 [mem 0x10000000-0x10003fff 64bit]: assigned
nvme nvme0: pci function 0000:01:00.0
```

(`journalctl -k -b` 발췌.) `assigned`가 없는 window·BAR 줄은 Linux가 읽은 firmware의 배치이고, `assigned`가 붙은 줄은 Linux가 새로 정한 주소입니다. NVMe BAR0이 0x10a00000에서 0x10000000으로 옮겨졌습니다.

이유는 Linux v6.12 `pci_acpi_scan_root()`(`drivers/pci/pci-acpi.c:1667-1711`)에 있습니다. host bridge의 `preserve_config`가 참이면 firmware 배치를 claim하고, 아니면 `pci_assign_unassigned_root_bus_resources()`가 주석대로 "reassign everything"합니다. `preserve_config`는 ACPI host bridge에 "PCI Boot Configuration" `_DSM`이 있고 0을 돌려줄 때만 참입니다(`pci_acpi_preserve_config()`, 123-143행). 이 VM은 그 조건을 만족하지 않아 전부 다시 배치됐습니다. DT로 부팅하는 [Bootloader Ch 34](/blog/embedded/bootloader/chapter34-pcie-enumeration)의 U-Boot 경로에서는 같은 판단을 `_DSM` 대신 DT의 `linux,pci-probe-only` 속성이 합니다(`drivers/pci/of.c:255-283`, `probe.c:892-898`).

| 단계 | 주체 | 시리즈 VM에서 확인한 것 |
|------|------|------|
| 1 | UEFI | 장치 열거, BAR·bridge window 배치 (로그의 첫 배치) |
| 2 | UEFI → ACPI | MCFG(ECAM), `_OSC` 협상 ([Ch 3](/blog/embedded/hardware/pcie/chapter03-config-space)) |
| 3 | Linux `pci_acpi_scan_root()` | bus를 훑어 `struct pci_dev` 생성 |
| 4 | Linux | `preserve_config`가 거짓이라 전부 재배치 (`assigned` 줄) |
| 5 | Linux `pci_bus_add_devices()` | sysfs 등록과 드라이버 매칭·probe |

## struct pci_dev — 핵심 멤버

`struct pci_dev`는 `include/linux/pci.h:322`부터 정의됩니다. 이 장의 실험에서 직접 쓴 멤버만 고르면 다음과 같습니다.

| 멤버 | 실험에서의 쓰임 |
|------|------|
| `vendor`·`device` | `id_table` 매칭 대상 (1234:11e8) |
| `devfn`, `bus->number` | BDF. `PCI_SLOT`·`PCI_FUNC` 매크로로 나눔 ([Ch 2](/blog/embedded/hardware/pcie/chapter02-tlp)) |
| `resource[]` | BAR0 0x10600000, 1 MiB |
| `msi_enabled` | `pci_alloc_irq_vectors()` 뒤 1 |
| `dev` | 내장 `struct device`. `pci_set_drvdata()`가 여기에 드라이버 데이터를 붙임 |
| `driver_override` | 아래 driver_override 실험 |

## struct pci_driver

`struct pci_driver`(`include/linux/pci.h:947-964`)의 주석이 각 멤버의 계약을 짧게 적어 둡니다. `id_table`은 "Must be non-NULL for probe to be called", `remove`는 "NULL if not a hot-plug capable driver"입니다. 오류 복구 callback `err_handler`는 [Ch 7](/blog/embedded/hardware/pcie/chapter07-error-handling), SR-IOV용 `sriov_configure`는 [Ch 12](/blog/embedded/hardware/pcie/chapter12-virtualization-1)에서 다룹니다.

실험 드라이버의 등록 부분입니다.

```c
static const struct pci_device_id edu_ids[] = {
	{ PCI_DEVICE(0x1234, 0x11e8) },
	{ }
};
MODULE_DEVICE_TABLE(pci, edu_ids);

static struct pci_driver edu_driver = {
	.name = "edu_demo",
	.id_table = edu_ids,
	.probe = edu_probe,
	.remove = edu_remove,
};
module_pci_driver(edu_driver);
```

`MODULE_DEVICE_TABLE`은 모듈에 alias를 남깁니다. 빌드한 모듈의 `modinfo`와 장치의 sysfs `modalias`를 나란히 놓으면 udev가 무엇을 비교하는지 보입니다.

```text
alias:          pci:v00001234d000011E8sv*sd*bc*sc*i*
modalias: pci:v00001234d000011E8sv00001AF4sd00001100bc00scFFi00
```

vendor·device는 정확히 맞고 subsystem·class 자리는 `*`라서 무엇이든 맞습니다. 이 alias가 없으면 장치가 나타나도 udev가 모듈을 자동으로 올리지 못합니다. 이 실험은 `insmod`로 직접 올렸습니다.

## Driver Matching

매칭 순서는 Linux v6.12 `pci_match_device()`(`drivers/pci/pci-driver.c:136-175`)가 정합니다.

| 순서 | 조건 |
|------|------|
| 1 | 장치에 `driver_override`가 있고 드라이버 이름이 다르면 매칭 안 함 (142-143행) |
| 2 | sysfs `new_id`로 추가된 동적 ID 목록(`dynids`)을 먼저 봄 |
| 3 | 드라이버의 정적 `id_table`을 `pci_match_id()`로 봄 |

`id_table` 항목을 만드는 매크로는 `PCI_DEVICE(vend, dev)`(978행), subsystem까지 보는 `PCI_DEVICE_SUB`(1021행), class로 보는 `PCI_DEVICE_CLASS`(1034행)가 있습니다.

`driver_override`가 실제로 어떻게 동작하는지 봤습니다. `edu_demo`를 떼고 장치의 `driver_override`에 `vfio-pci`를 쓴 뒤 다시 probe를 요청했습니다.

```text
--- driver_override=vfio-pci then unbind/probe
driver=
driver after modprobe vfio-pci=vfio-pci
driver after clearing override=edu_demo
```

`edu_demo`의 `id_table`이 이 장치와 정확히 맞는데도, override가 `vfio-pci`라서 아무 드라이버도 붙지 않았습니다(`driver=` 빈칸). `vfio-pci` 모듈을 올리자 그쪽이 붙었고, override를 비우고 다시 probe하자 `edu_demo`로 돌아왔습니다. [Ch 12](/blog/embedded/hardware/pcie/chapter12-virtualization-1)의 VFIO passthrough가 이 방법으로 장치를 넘깁니다.

## probe·remove 생명 주기

실험 드라이버의 `probe()`는 단계마다 로그를 남기도록 짰습니다. `edu`의 레지스터 의미는 QEMU 11.1.3 `docs/specs/edu.rst`를 따랐습니다. 0x00은 `0xRRrr00ed` 형식의 ID, 0x04는 쓴 값을 비트 반전해 돌려주는 liveness 레지스터입니다.

```c
	ret = pci_enable_device(pdev);
	ret = pci_request_regions(pdev, "edu_demo");
	ret = dma_set_mask_and_coherent(&pdev->dev, DMA_BIT_MASK(28));
	pci_set_master(pdev);
	edu->bar = pci_iomap(pdev, 0, 0);
	v = readl(edu->bar + EDU_ID);
	writel(0x12345678, edu->bar + EDU_LIVE);
	ret = pci_alloc_irq_vectors(pdev, 1, 1, PCI_IRQ_MSI | PCI_IRQ_INTX);
	edu->irq = pci_irq_vector(pdev, 0);
	ret = request_irq(edu->irq, edu_isr, 0, "edu_demo", edu);
	writel(0x1, edu->bar + EDU_IRQ_RAISE);
```

(오류 처리와 로그 줄을 뺀 발췌.) DMA mask를 28비트로 둔 것은 `edu.rst`가 이 장치의 기본 DMA 주소 폭을 28비트(256 MiB)로 적었기 때문입니다. `insmod` 뒤 로그입니다.

```text
edu_demo 0000:06:00.0: Adding to iommu group 6
edu_demo 0000:06:00.0: probe: matched 1234:11e8
edu_demo 0000:06:00.0: enabling device (0000 -> 0002)
edu_demo 0000:06:00.0: step 1 pci_enable_device ok
edu_demo 0000:06:00.0: step 2 pci_request_regions ok
edu_demo 0000:06:00.0: step 3 dma mask 28 bits ok
edu_demo 0000:06:00.0: step 4 bus master on
edu_demo 0000:06:00.0: step 5 BAR0 mapped: id=0x010000ed live(~0x12345678)=0xedcba987
edu_demo 0000:06:00.0: step 6 1 vector, msi=1 irq=87
edu_demo 0000:06:00.0: step 7 ISR registered, test irq status seen=0x1
```

`enabling device (0000 -> 0002)`는 `pci_enable_device()`가 Command 레지스터의 Memory Space Enable(0x2)을 켰다는 뜻입니다. ID 0x010000ed는 major 1, minor 0이고, 0x12345678의 반전 0xedcba987이 돌아와 MMIO가 실제 장치에 닿는다는 것이 확인됩니다. `edu`는 PCI Express Capability가 없지만 MSI Capability가 있어 MSI vector 하나를 받았고, 장치의 interrupt raise 레지스터에 1을 쓰자 ISR이 상태값 1을 읽었습니다.

probe 전후의 `lspci -vv`와 커널 자료 구조입니다.

```text
--- before
	Control: I/O- Mem- BusMaster- SpecCycle- MemWINV- VGASnoop- ParErr- Stepping- SERR- FastB2B- DisINTx-
	Region 0: Memory at 10600000 (32-bit, non-prefetchable) [disabled] [size=1M]
	Capabilities: [40] MSI: Enable- Count=1/1 Maskable- 64bit+
--- after insmod
	Control: I/O- Mem+ BusMaster+ SpecCycle- MemWINV- VGASnoop- ParErr- Stepping- SERR- FastB2B- DisINTx+
	Region 0: Memory at 10600000 (32-bit, non-prefetchable) [size=1M]
	Capabilities: [40] MSI: Enable+ Count=1/1 Maskable- 64bit+
	Kernel driver in use: edu_demo
/proc/interrupts: 87:          1          0          0          0  GICv2m-PCI-MSI-0000:06:00.0   0 Edge      edu_demo
/proc/iomem:          10600000-106fffff : edu_demo
```

`Mem+ BusMaster+`는 1·4단계, `DisINTx+`는 MSI를 켜면서 INTx를 끈 결과, `/proc/iomem`의 `edu_demo`는 2단계의 region 요청입니다.

`remove()`는 이 순서를 거꾸로 밟습니다. `free_irq` → `pci_free_irq_vectors` → `pci_iounmap` → `pci_clear_master` → `pci_release_regions` → `pci_disable_device`입니다. unbind 뒤 Command는 `Mem+ BusMaster-`였습니다. Memory Space Enable이 남은 이유는 Linux v6.12 `do_pci_disable_device()`(`drivers/pci/pci.c:2231-2242`)가 Bus Master만 끄고 decode 비트는 건드리지 않기 때문입니다. "disable"이 장치를 주소 공간에서 완전히 빼는 동작은 아닙니다.

이 드라이버는 DMA를 쓰지 않는 상태에서 remove를 했습니다. DMA나 인터럽트가 진행 중인 장치라면 발생원을 먼저 멈추고 handler를 동기화한 뒤 자원을 풀어야 합니다. `free_irq()`가 첫 줄인 것도 그 이유입니다.

## remove와 rescan — 장치 객체를 다시 만들기

unbind는 드라이버만 떼고 `struct pci_dev`는 남깁니다. 장치 객체까지 지우고 다시 찾게 하려면 sysfs `remove`와 `/sys/bus/pci/rescan`을 씁니다.

```text
ls: cannot access '/sys/bus/pci/devices/0000:06:00.0': No such file or directory
edu_demo 0000:06:00.0: remove: released in reverse order
pci 0000:06:00.0: [1234:11e8] type 00 class 0x00ff00 conventional PCI endpoint
pci 0000:06:00.0: BAR 0 [mem 0x10600000-0x106fffff]
pci 0000:06:00.0: BAR 0 [mem 0x10600000-0x106fffff]: assigned
edu_demo 0000:06:00.0: Adding to iommu group 6
edu_demo 0000:06:00.0: probe: matched 1234:11e8
```

remove 뒤 sysfs 디렉터리가 사라졌고, rescan은 config space를 다시 읽어 장치를 만들고 BAR를 배치한 뒤 드라이버를 붙였습니다. 커널은 이 장치를 `conventional PCI endpoint`로 부릅니다. [Ch 3](/blog/embedded/hardware/pcie/chapter03-config-space)에서 본 대로 `edu`에 PCI Express Capability가 없기 때문입니다.

## sysfs 구조

이 장과 앞 장에서 실제로 읽거나 쓴 경로만 정리합니다.

| 경로 | 이 시리즈에서 한 일 |
|------|------|
| `devices/<BDF>/config` | 크기 256/4096 확인 ([Ch 3](/blog/embedded/hardware/pcie/chapter03-config-space)) |
| `devices/<BDF>/resource` | BAR·IOV·bridge window 줄 해석 ([Ch 4](/blog/embedded/hardware/pcie/chapter04-bar-mmio)) |
| `devices/<BDF>/driver` | 드라이버 symlink 확인 |
| `devices/<BDF>/modalias` | 모듈 alias와 비교 |
| `devices/<BDF>/driver_override` | `vfio-pci` 지정 |
| `devices/<BDF>/remove`, `/sys/bus/pci/rescan` | 장치 객체 제거·재생성 |
| `devices/<BDF>/sriov_numvfs` | VF 2개 생성 ([Ch 4](/blog/embedded/hardware/pcie/chapter04-bar-mmio)) |
| `devices/<BDF>/reset`, `reset_method` | NVMe FLR ([Ch 7](/blog/embedded/hardware/pcie/chapter07-error-handling)) |
| `drivers/<drv>/bind`·`unbind`, `/sys/bus/pci/drivers_probe` | 수동 binding |

`lspci`는 Linux에서 sysfs를 통해 config를 읽습니다. `pci_read_config()`(`drivers/pci/pci-sysfs.c:675-680`)는 `CAP_SYS_ADMIN`이 없으면 앞 64바이트만 돌려주므로, root가 아니면 `lspci -vv`의 capability 정보가 빠집니다. 이 시리즈의 출력은 모두 root로 얻었습니다.

## ACPI 통합

시리즈 VM에서 ACPI가 PCIe에 관여한 부분입니다.

| 항목 | 시리즈 VM에서 본 것 |
|------|------|
| MCFG | `ACPI: MCFG table detected, 1 entries`, ECAM 0x4010000000 ([Ch 3](/blog/embedded/hardware/pcie/chapter03-config-space)) |
| `_OSC` | OS가 `PCIeHotplug SHPCHotplug PME AER PCIeCapability`를 제어, LTR은 플랫폼이 미지원 |
| `_DSM` PCI Boot Configuration | 없거나 0이 아님 → 커널이 전부 재배치 |
| INTx 라우팅 | `pin A routed to IRQ 50` 같은 GIC SPI 매핑 ([Ch 5](/blog/embedded/hardware/pcie/chapter05-interrupts)) |

## pcie-portdriver

root port와 switch port에는 `pcieport` 드라이버가 붙고, 그 아래 서비스가 별도 장치로 등록됩니다. 시리즈 VM의 `/sys/bus/pci_express`입니다.

```text
0000:00:03.0:pcie001
0000:00:03.0:pcie002
0000:00:03.0:pcie004
0000:00:03.0:pcie010
0000:05:00.0:pcie204
0000:05:01.0:pcie204
aer
dpc
pcie_pme
pciehp
```

(root port 다섯 개는 같은 네 서비스를 가지므로 00:03.0만 옮겼습니다.) 마지막 네 줄이 등록된 서비스 드라이버입니다. 장치 이름의 세 자리 16진수는 `portdrv.c:303-305`가 `get_descriptor_id()` 매크로(`portdrv.c:32`), 즉 `((port type - 4) << 8) | service`로 만듭니다. service 비트는 `portdrv.h:15-24`대로 PME 0x01, AER 0x02, Hotplug 0x04, DPC 0x08, Bandwidth notification 0x10입니다. 그래서 root port(type 4)의 `pcie001`·`002`·`004`·`010`은 PME·AER·hotplug·bandwidth notification이고, switch downstream port(type 6)의 `pcie204`는 hotplug입니다. 부팅 로그의 `PME: Signaling with IRQ 55`, `AER: enabled with IRQ 55`, `pciehp: Slot #1 ...`이 이 서비스들의 초기화입니다. QEMU 장치에는 DPC Capability가 없어 `dpc` 드라이버는 등록만 되고 붙은 장치가 없습니다.

## 자주 하는 실수

### "pci_disable_device()면 장치가 주소에서 빠진다"

unbind 뒤에도 `Mem+`가 남았습니다. Linux는 Bus Master만 끕니다. 장치가 주소에 응답하지 않게 하려면 다른 절차가 필요합니다.

### "MODULE_DEVICE_TABLE이 없으면 드라이버가 안 붙는다"

`insmod`로 직접 올리면 `id_table`만으로 붙습니다. `MODULE_DEVICE_TABLE`이 하는 일은 모듈에 alias를 남겨 udev 자동 로딩을 가능하게 하는 것입니다.

### "ID가 맞으면 반드시 probe된다"

`driver_override`가 다른 이름이면 ID가 정확히 맞아도 매칭되지 않습니다. 시리즈 VM에서 `edu_demo`가 붙지 않은 것이 그 경우입니다.

### "firmware가 정한 BAR 주소가 최종"

ACPI host bridge가 PCI Boot Configuration `_DSM`으로 보존을 요구하지 않으면 Linux가 전부 다시 배치합니다. 시리즈 VM의 NVMe BAR가 0x10a00000에서 0x10000000으로 옮겨졌습니다.

### "unbind와 remove는 같다"

unbind는 드라이버만 떼고 sysfs 장치는 남습니다. remove는 장치 객체를 지우고, rescan이 config space부터 다시 읽어 만듭니다.

## 정리

- 시리즈 VM에서 Linux는 firmware 배치를 읽은 뒤 `preserve_config`가 거짓이라 BAR와 window를 전부 다시 배치했습니다.
- 매칭은 `driver_override` → 동적 ID → `id_table` 순서입니다.
- probe는 enable → request_regions → DMA mask → bus master → iomap → IRQ vector → request_irq 순서로 돌았고, 각 단계의 결과가 Command·MSI·`/proc/iomem`·`/proc/interrupts`에 남았습니다.
- remove는 역순이고, `pci_disable_device()`는 Bus Master만 끕니다.
- unbind·driver_override·remove·rescan은 각각 다른 층을 건드립니다.
- `pcieport` 아래 AER·PME·hotplug 서비스가 별도 장치로 등록됩니다.

## 다음 편

[Ch 11: DMA·IOMMU — ATS·PRI·PASID·IOMMUFD](/blog/embedded/hardware/pcie/chapter11-linux-dma)에서 같은 `edu` 드라이버로 DMA를 돌리고, IOMMU가 주소를 바꾸고 막는 모습을 봅니다.

## 관련 항목

- [Ch 3: Configuration Space](/blog/embedded/hardware/pcie/chapter03-config-space)
- [Ch 4: BAR & MMIO](/blog/embedded/hardware/pcie/chapter04-bar-mmio) — `pci_iomap`
- [Ch 5: Interrupts](/blog/embedded/hardware/pcie/chapter05-interrupts) — `pci_alloc_irq_vectors`
- [Ch 7: Error Handling](/blog/embedded/hardware/pcie/chapter07-error-handling) — `pci_error_handlers`
- [Bootloader Ch 34: U-Boot PCIe Enumeration](/blog/embedded/bootloader/chapter34-pcie-enumeration) — 커널 전 단계의 BAR 배치

## 시리즈 자료 출처 안내

이 글의 소스 인용은 Linux v6.12와 QEMU 11.1.3 기준이고, 실험 드라이버는 Debian 13 게스트에서 `linux-headers-6.12.116+deb13-arm64`로 빌드해 Ch 1의 시리즈 VM에서 실행했습니다. 자료 정책은 [Ch 1 footer](/blog/embedded/hardware/pcie/chapter01-fundamentals#시리즈-자료-출처-안내)에 있습니다.
