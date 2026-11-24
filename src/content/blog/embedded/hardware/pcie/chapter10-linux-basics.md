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

## 장치 하나의 상태를 순서대로 확인하기

Linux host에서 `lspci -D`로 대상 장치의 domain을 포함한 BDF를 찾고, 아래 `bdf`를 그 값으로 바꿉니다. 이 절차는 sysfs의 식별·자원·driver·IRQ 할당 정보를 읽습니다. 아래에는 실장비 실행 결과를 제시하지 않았으며, 아직 없는 장치 주소를 넣으면 첫 검사에서 중단합니다.

```bash
(
  bdf=0000:01:00.0
  dev=/sys/bus/pci/devices/$bdf
  if [ ! -d "$dev" ]; then
    printf '장치를 찾을 수 없습니다: %s\n' "$bdf" >&2
    exit 1
  fi
  cat "$dev/vendor" "$dev/device" "$dev/class"
  cat "$dev/resource"
  if [ -L "$dev/driver" ]; then
    readlink "$dev/driver"
  else
    printf '연결된 driver 없음\n'
  fi
  if [ -d "$dev/msi_irqs" ]; then
    for irq in "$dev"/msi_irqs/*; do
      [ -f "$irq" ] || continue
      printf '%s: ' "${irq##*/}"
      cat "$irq"
    done
  fi
)
```

값을 모은 다음에는 어느 단계까지 확인했는지 구분합니다. 특히 IRQ 파일 수를 MSI-X capability의 최대 vector 수나 장치 queue 수로 해석하면 안 됩니다.

| 관찰 | 확인한 것 | 아직 확인하지 못한 것 |
|------|------|------|
| 장치 디렉터리와 ID가 있음 | PCI core에 해당 function이 등록됨 | driver 연결과 I/O 성공 |
| `resource`에 자원 범위가 있음 | host 측 자원 배치 정보 | driver의 영역 요청·MMIO 매핑·register 접근 성공 |
| `driver` symlink가 있음 | 현재 driver가 연결됨 | DMA·interrupt가 정상 완료되는지 |
| `msi_irqs/<N>`이 있고 내용이 `msi` 또는 `msix` | 해당 Linux IRQ가 장치에 할당된 모드 | handler 등록·실행, 특정 queue와의 대응 |

`msi_irqs`가 없거나 비어 있다고 바로 장치 고장으로 판단하지 않습니다. 아직 vector를 할당하지 않았거나 INTx·polling 경로를 사용할 수 있습니다. IRQ가 실제로 증가하는지는 장치의 workload를 실행하며 `/proc/interrupts`와 driver의 완료 경로를 함께 봅니다. IRQ 증가만으로 DMA buffer 내용까지 올바르다는 결론도 낼 수 없습니다.

자원 행의 범위·길이는 [Ch 4의 BAR 자원 열거](/blog/embedded/hardware/pcie/chapter04-bar-mmio#resource-enumeration--누가-주소를-정하나), MSI/MSI-X 할당과 handler 수명은 [Ch 5](/blog/embedded/hardware/pcie/chapter05-interrupts#linux-pci-irq-api), buffer의 주소와 소유권은 [Ch 11](/blog/embedded/hardware/pcie/chapter11-linux-dma)에서 이어집니다. 파일의 의미는 [v6.12 PCI sysfs 문서](https://github.com/torvalds/linux/blob/adc218676eef25575469234709c2d87185ca223a/Documentation/PCI/sysfs-pci.rst)와 [`msi_irqs` ABI](https://github.com/torvalds/linux/blob/adc218676eef25575469234709c2d87185ca223a/Documentation/ABI/testing/sysfs-bus-pci)를 기준으로 합니다.

## QEMU NVMe 한 대로 연결해서 확인하기

앞의 관찰이 실제 I/O와 어떻게 연결되는지 QEMU **11.1.3**, `virt`·TCG·Cortex-A57·2 vCPU·1 GiB RAM에서 실행했습니다. Guest는 Debian 13 nocloud arm64, kernel **6.12.116+deb13-arm64**, pciutils **3.13.0**입니다. 장치는 QEMU NVMe `1b36:0010`, serial `pcie-lab`, BDF `0000:01:00.0`이며 `pcie-root-port` 아래에 연결했습니다. 본문의 API 설명 기준 v6.12와 이 실행 kernel의 패치 판은 구분합니다.

### Host에서 실험 장치 만들기

부팅 가능한 `debian-13-nocloud-arm64.qcow2`를 준비하고 새 작업 디렉터리에서 실행합니다. OS 원본은 backing image로 두고 변경은 overlay에 저장합니다. NVMe는 **새로 만든 64 MiB 실험 파일**만 연결합니다. 아래 firmware 경로는 이 실험의 macOS Homebrew 설치 기준입니다.

```bash
qemu-img create -f qcow2 -F qcow2 \
  -b "$PWD/debian-13-nocloud-arm64.qcow2" pcie-os.qcow2
qemu-img create -f raw pcie-nvme.raw 64M
qemu-system-aarch64 -M virt -accel tcg -cpu cortex-a57 -smp 2 -m 1024 \
  -bios /opt/homebrew/share/qemu/edk2-aarch64-code.fd \
  -drive if=none,id=os,file=pcie-os.qcow2,format=qcow2 \
  -device virtio-blk-pci,drive=os \
  -device pcie-root-port,id=rp1,chassis=1,slot=1 \
  -drive if=none,id=lab,file=pcie-nvme.raw,format=raw \
  -device nvme,drive=lab,bus=rp1,serial=pcie-lab -nic none -nographic
```

이후 명령은 guest의 root console에서 실행합니다. 이 실험에서는 GRUB command line에서 `ls`로 OS partition을 찾은 뒤 `(hd1,gpt1)`을 root로 선택하고, 아래처럼 kernel과 initrd를 적재했습니다. 다른 이미지에서는 partition과 파일 이름을 먼저 확인합니다. 별도 network 없이 관찰 명령을 실행하기 위한 최소 shell이며 일반적인 시스템 서비스가 올라온 부팅과는 다릅니다.

```text
grub> set root=(hd1,gpt1)
grub> linux /boot/vmlinuz-6.12.116+deb13-arm64 root=/dev/vda1 rw console=ttyAMA0 init=/bin/sh
grub> initrd /boot/initrd.img-6.12.116+deb13-arm64
grub> boot
```

### Guest에서 실행한 I/O와 관찰 결과

Guest의 root shell에서 앞 절의 sysfs 확인을 실행했습니다. BAR0의 host 범위는 `0x10000000`~`0x10003fff`, 길이는 16 KiB였고 driver symlink는 `nvme`를 가리켰습니다. `lspci`의 MSI-X capability는 `Count=65`였지만 실제 `msi_irqs`는 55·56·57의 세 개였습니다. `/proc/interrupts`의 라벨은 `nvme0q0`~`nvme0q2`였고 Arm의 GICv2m 경로였습니다. 이는 이번 구성의 관찰값이며 고정 IRQ 번호가 아닙니다.

아래 명령은 연결한 실험용 namespace에 씁니다. Serial과 용량을 검사한 뒤 16 KiB를 쓰고 다시 읽어 내용을 비교합니다. 이 장치의 serial 속성에는 끝을 채운 공백이 포함돼 있었으므로 비교 전에 끝 공백을 제거합니다. BDF나 namespace 번호가 달라졌다면 먼저 앞 절의 장치 식별로 대상을 다시 확인합니다.

```bash
(
  set -eu
  test "$(sed 's/[[:space:]]*$//' /sys/class/nvme/nvme0/serial)" = pcie-lab
  test "$(cat /sys/block/nvme0n1/size)" = 131072
  grep nvme /proc/interrupts
  dd if=/dev/urandom of=/tmp/pcie-payload bs=4096 count=4 status=none
  dd if=/tmp/pcie-payload of=/dev/nvme0n1 bs=4096 count=4 \
    oflag=direct conv=fsync status=none
  dd if=/dev/nvme0n1 of=/tmp/pcie-readback bs=4096 count=4 \
    iflag=direct status=none
  cmp /tmp/pcie-payload /tmp/pcie-readback
  grep nvme /proc/interrupts
)
```

쓰기·읽기·비교의 종료 코드는 모두 0이었습니다. 같은 구간에서 `nvme0q1`의 IRQ count는 43에서 52로 증가했고 다른 두 queue의 count는 그대로였습니다. 4회 write·flush·4회 read와 맞아떨어지는 이번 관찰을 모든 I/O와 IRQ가 항상 1:1이라는 규칙으로 일반화하지 않습니다.

### DMA 해제와 명령 완료를 trace로 대조하기

IRQ 증가만 확인하고 DMA가 끝났다고 판단하지 않도록, 같은 I/O를 실행할 때 NVMe의 명령·완료 tracepoint와 `nvme_unmap_data` 호출도 기록했습니다. 아래 설정은 위 전용 guest에서 I/O 명령 **전에** 실행합니다. 이 kernel에서는 tracefs와 해당 함수가 제공됐으며 다른 kernel에서는 tracing 설정·함수 존재를 먼저 확인해야 합니다.

```bash
mount -t tracefs tracefs /sys/kernel/tracing
echo nvme_unmap_data > /sys/kernel/tracing/set_ftrace_filter
echo function > /sys/kernel/tracing/current_tracer
echo 1 > /sys/kernel/tracing/events/nvme/nvme_setup_cmd/enable
echo 1 > /sys/kernel/tracing/events/nvme/nvme_complete_rq/enable
echo > /sys/kernel/tracing/trace
echo 1 > /sys/kernel/tracing/tracing_on
```

I/O 후에는 tracing을 멈추고 기록을 읽습니다. 이미 tracefs가 mount돼 있으면 위 mount를 반복하지 않습니다.

```bash
echo 0 > /sys/kernel/tracing/tracing_on
cat /sys/kernel/tracing/trace
```

기록 중 한 read의 핵심 필드를 발췌하면 다음과 같습니다. CPU·PID·timestamp는 생략했습니다.

```text
nvme_setup_cmd: nvme0: disk=nvme0n1, qid=1, cmdid=4673, nsid=1, flags=0x0, meta=0x0, cmd=(nvme_cmd_read slba=0, len=7, ctrl=0x0, dsmgmt=0, reftag=0)
nvme_unmap_data <-nvme_pci_complete_batch
nvme_complete_rq: nvme0: disk=nvme0n1, qid=1, cmdid=4673, res=0x0, retries=0, flags=0x0, status=0x0
```

같은 `qid`와 `cmdid`를 묶어 제출과 완료를 대조합니다. `len=7`은 NVMe의 zero-based block count이며, 이 namespace의 512 B LBA 기준으로 8개 block, 곧 4 KiB입니다. 이는 PCIe TLP의 DW Length와 다릅니다. 함수 trace는 DMA 해제 경로를 거쳤다는 증거이고, data가 맞았는지는 별도로 수행한 `cmp` 결과로 확인합니다. 관찰을 마치면 해당 guest에서 켠 tracing을 해제합니다.

```bash
echo 0 > /sys/kernel/tracing/events/nvme/nvme_setup_cmd/enable
echo 0 > /sys/kernel/tracing/events/nvme/nvme_complete_rq/enable
echo nop > /sys/kernel/tracing/current_tracer
echo > /sys/kernel/tracing/set_ftrace_filter
```

### 용량 밖 요청의 실패도 확인하기

같은 전용 guest의 실험 디스크는 131072개의 512 B sector, 곧 64 MiB입니다. `bs=4096 seek=16384`는 정확히 그 끝에서 쓰기를 시작합니다. 기존 tracing 기록을 보존한 뒤 비우고 이 요청만 따로 기록했습니다.

```bash
dd if=/tmp/pcie-payload of=/dev/nvme0n1 bs=4096 seek=16384 count=1 \
  oflag=direct status=none
```

결과는 `No space left on device`, 종료 코드 1이었습니다. 그 요청 구간의 `nvme_setup_cmd`는 0개였으므로 NVMe controller가 반환한 오류 status나 AER 주입 결과로 해석하지 않습니다. 이후 유효 범위의 16 KiB를 다시 읽어 비교한 결과는 여전히 일치했습니다. 요청이 block 경계에서 거절된 것과 장치가 명령을 받아 실패한 것은 다릅니다.

### 이 실험이 확인한 범위

이 결과는 같은 가상 function의 enumeration·BAR resource·driver 연결·MSI-X 할당을 실제 I/O의 data 비교·완료 trace·IRQ 관찰까지 연결합니다. DMA 주소 값이나 IOMMU fault·격리는 측정하지 않았고, PHY·실제 link training·Gen별 대역폭·AER 복구도 검증하지 않았습니다. QEMU가 표시한 `2.5GT/s, Width x1`을 TCG 디스크 처리량의 물리 상한으로 쓰면 안 됩니다. 장치 모델과 구현은 [QEMU NVMe 문서](https://www.qemu.org/docs/master/system/devices/nvme.html)와 [고정판 v11.1.3 소스](https://gitlab.com/qemu-project/qemu/-/tree/v11.1.3/hw/nvme)를 참고합니다.

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
