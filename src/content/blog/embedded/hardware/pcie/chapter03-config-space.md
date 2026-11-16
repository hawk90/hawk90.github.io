---
title: "Ch 3: Configuration Space — 4 KB ECAM·Capability Linked List"
slug: "embedded/hardware/pcie/chapter03-config-space"
date: 2026-05-19T09:03:00
description: "PCIe Configuration Space — 256 byte PCI 영역 + 4 KB Extended·Type 0/1 header·Capability chain·ECAM 메모리 매핑."
series: "PCIe Deep Dive"
seriesOrder: 3
tags: [pcie, configuration-space, ecam, capability, dvsec]
draft: false
topics: ["embedded", "embedded/hardware"]
---

## 한 줄 요약

> **"Configuration Space는 PCIe function마다 붙은 4 KB짜리 신상 명세서이고, 앞 256바이트는 PCI와 같습니다."** 앞 64바이트 header가 Type 0(endpoint)인지 Type 1(bridge)인지로 나머지 해석이 갈리고, 기능 목록은 0x34에서 시작하는 Capability 연결 리스트와 0x100에서 시작하는 Extended Capability 리스트로 이어집니다. ECAM은 이 4 KB를 bus·device·function 번호로 계산한 주소의 MMIO로 보여 줍니다.

[Ch 2](/blog/embedded/hardware/pcie/chapter02-tlp)에서 Configuration TLP가 Bus·devfn·offset을 실어 나른다는 것을 봤습니다. 이 장은 그 offset이 가리키는 공간을 시리즈 VM(QEMU 11.1.3 virt, Debian 13, 커널 6.12.116)에서 직접 읽습니다.

## 256바이트와 4096바이트

Linux v6.12 `pci_regs.h:29-30`은 config space 크기를 두 가지로 정의합니다. `PCI_CFG_SPACE_SIZE`는 256, `PCI_CFG_SPACE_EXP_SIZE`는 4096입니다. 장치마다 어느 쪽인지는 `pci_cfg_space_size()`(`drivers/pci/probe.c:1728-1766`)가 정합니다. PCIe 장치와 host bridge는 offset 0x100을 읽어 보고 오류 응답(0xffffffff)이 아니고 앞쪽과 겹쳐 보이지도 않으면 4096, 그 밖의 장치는 PCI-X 266/533 MHz가 아닌 한 256입니다.

시리즈 VM에서 sysfs `config` 파일 크기가 그 결과입니다.

| 장치 | PCI Express Capability | `config` 크기 |
|------|------|------|
| 00:00.0 host bridge | 없음 | 256 |
| 00:01.0·00:02.0 virtio (root bus) | 없음 | 256 |
| 00:03.0~00:07.0 root port | 있음 | 4096 |
| 01:00.0·02:00.0·03:00.0 endpoint | 있음 | 4096 |
| 04:00.0·05:00.0·05:01.0 switch port | 있음 | 4096 |
| 06:00.0 `edu` | 없음 | 256 |
| 07:00.0 virtio-net (switch 아래) | 있음 | 4096 |

같은 virtio-net이라도 root bus의 00:01.0은 PCI Express Capability가 없어 256바이트, switch 아래의 07:00.0은 4096바이트입니다. 256바이트 장치인 `edu`에서 `setpci -s 06:00.0 100.l`로 0x100을 읽으면 `ffffffff`가 나옵니다.

## Type 0 vs Type 1 Header

앞 64바이트(0x00~0x3F)가 header이고, 0x0E의 Header Type 하위 7비트(`PCI_HEADER_TYPE_MASK` 0x7f)가 형식을 정합니다(`pci_regs.h:78-83`). 0은 일반 장치, 1은 PCI-to-PCI bridge, 2는 CardBus bridge이고, bit 7(0x80)은 multi-function 표시입니다.

시리즈 VM에서 `setpci`로 읽은 값입니다.

```text
02:00.0 HEADER_TYPE=00 CAPABILITIES=c8
00:03.0 HEADER_TYPE=01 CAPABILITIES=54
```

e1000e(02:00.0)는 Type 0, root port(00:03.0)는 Type 1입니다. root port와 switch port가 Type 1인 이유는 아래 bus로 config 요청을 넘기려면 bus 번호와 주소 window를 담을 레지스터가 필요하기 때문입니다.

## Type 0 Header (Endpoint)

e1000e의 앞 64바이트를 `lspci -xxx`로 덤프했습니다.

```text
00: 86 80 d3 10 06 04 10 00 00 00 00 02 00 00 00 00
10: 00 00 24 10 00 00 26 10 01 20 00 00 00 00 28 10
20: 00 00 00 00 00 00 00 00 00 00 00 00 86 80 00 00
30: 00 00 fc ff c8 00 00 00 00 00 00 00 ff 01 00 00
```

Linux `pci_regs.h`의 offset 정의로 읽으면 다음과 같습니다. 값은 little-endian으로 조립했습니다.

| Offset | 필드 (`pci_regs.h` 이름) | 읽은 값 |
|------|------|------|
| 0x00 | Vendor ID / Device ID | 0x8086 / 0x10d3 |
| 0x04 | Command / Status | 0x0406 / 0x0010 (Status bit 4 = Capabilities List 있음) |
| 0x08 | Revision / Class Code | 0x00 / 0x020000 (Ethernet controller) |
| 0x0E | Header Type | 0x00 |
| 0x10~0x24 | BAR0~BAR5 (`PCI_BASE_ADDRESS_0`부터) | 0x10240000, 0x10260000, 0x00002001, 0x10280000, 0, 0 |
| 0x28 | CardBus CIS Pointer (`PCI_CARDBUS_CIS`) | 0 |
| 0x2C | Subsystem Vendor / Subsystem ID | 0x8086 / 0x0000 |
| 0x30 | Expansion ROM (`PCI_ROM_ADDRESS`) | 0xfffc0000 |
| 0x34 | Capabilities Pointer (`PCI_CAPABILITY_LIST`) | 0xc8 |
| 0x3C | Interrupt Line / Pin | 0xff / 0x01 |

BAR의 해석은 [Ch 4](/blog/embedded/hardware/pcie/chapter04-bar-mmio)에서 다룹니다.

## Type 1 Header (Bridge·Root Port)

root port 00:03.0의 앞 64바이트입니다.

```text
00: 36 1b 0c 00 07 04 10 00 00 00 04 06 00 00 01 00
10: 00 10 c4 10 00 00 00 00 00 01 01 00 10 10 00 00
20: 00 10 10 10 01 00 11 00 80 00 00 00 80 00 00 00
30: 00 00 00 00 54 00 00 00 00 00 00 00 ff 01 02 00
```

| Offset | 필드 (`pci_regs.h:131-161`) | 읽은 값 | 뜻 |
|------|------|------|------|
| 0x18·0x19·0x1A | Primary·Secondary·Subordinate Bus | 00·01·01 | 이 bridge 아래는 bus 1뿐 |
| 0x1C·0x1D | I/O Base·Limit | 0x10·0x10 | I/O 0x1000~0x1fff |
| 0x20·0x22 | Memory Base·Limit | 0x1000·0x1010 | 0x10000000~0x101fffff |
| 0x24·0x26 | Prefetchable Base·Limit | 0x0001·0x0011 | 하위 4비트 1 = 64-bit window (`PCI_PREF_RANGE_TYPE_64`) |
| 0x28·0x2C | Prefetchable Base·Limit Upper 32 | 0x80·0x80 | 0x8000000000~0x80001fffff |
| 0x34 | Capabilities Pointer | 0x54 | |
| 0x38 | Expansion ROM (`PCI_ROM_ADDRESS1`) | 0 | |
| 0x3E | Bridge Control | 0x0002 | |

Memory window는 Base·Limit의 상위 12비트가 주소의 [31:20]이므로 1 MiB 단위입니다. 0x1000은 0x10000000, Limit 0x1010은 0x101fffff까지를 뜻합니다. [Bootloader Ch 34](/blog/embedded/bootloader/chapter34-pcie-enumeration)에서 U-Boot이 같은 레지스터에 window를 써 넣는 장면을 볼 수 있습니다.

### lspci의 [32-bit] 표시

같은 root port를 `lspci -vv`로 보면 prefetchable window가 이렇게 나옵니다.

```text
	Prefetchable memory behind bridge: 8000000000-80001fffff [size=2M] [32-bit]
```

주소는 4 GiB 위인데 `[32-bit]`라고 찍힙니다. config 바이트 0x24의 하위 4비트는 1(64-bit)이므로 레지스터 값과 다릅니다. pciutils 3.13.0의 `lspci.c:617-623`은 커널이 sysfs `resource`로 준 bridge window가 있으면 그 시작 주소의 하위 비트로 32/64를 고르는데, `lib/sysfs.c:212-213`은 bridge window 줄의 시작 주소에 flag 비트를 섞지 않고 저장합니다. 시작 주소 0x8000000000의 하위 비트는 0이라 32로 판정됩니다. 커널이 넘긴 해당 줄(`0x0000008000000000 0x00000080001fffff 0x0000000000102201`)의 flag에는 64-bit 표시가 있으므로, 이 표기는 lspci 쪽의 해석 결과입니다. window 폭을 판단할 때는 `-xxx`의 0x24 하위 비트를 직접 봅니다.

## Capabilities Pointer·Capability List

Capability는 offset 0x34에서 시작하는 단방향 연결 리스트입니다. 각 항목의 첫 바이트가 Capability ID, 둘째 바이트가 다음 항목의 offset이고, 0이면 끝입니다. e1000e에서 `setpci`로 한 칸씩 따라갔습니다.

```bash
p=0x$(setpci -s 02:00.0 CAPABILITIES)
while [ $((p)) -ne 0 ]; do
  w=$(setpci -s 02:00.0 $(printf %x $p).w)
  printf "off=0x%02x id=0x%s next=0x%s\n" $p ${w#??} ${w%??}
  p=0x${w%??}
done
```

```text
off=0xc8 id=0x01 next=0xd0
off=0xd0 id=0x05 next=0xe0
off=0xe0 id=0x10 next=0xa0
off=0xa0 id=0x11 next=0x00
```

ID를 Linux v6.12 `pci_regs.h:211-230`과 맞추면 0x01 Power Management, 0x05 MSI, 0x10 PCI Express, 0x11 MSI-X입니다. 리스트가 0xe0에서 0xa0으로 뒤로 돌아가는 것처럼, 순서는 offset 순서와 무관합니다. 같은 헤더에 정의된 나머지 ID 중 몇 개를 옮겨 둡니다.

| ID | `PCI_CAP_ID_*` | 의미 |
|------|------|------|
| 0x01 | `PM` | Power Management |
| 0x05 | `MSI` | Message Signalled Interrupts |
| 0x07 | `PCIX` | PCI-X |
| 0x09 | `VNDR` | Vendor-Specific (virtio가 사용) |
| 0x0D | `SSVID` | Bridge subsystem vendor/device ID |
| 0x10 | `EXP` | PCI Express |
| 0x11 | `MSIX` | MSI-X |
| 0x12 | `SATA` | SATA Data/Index Conf. |
| 0x13 | `AF` | PCI Advanced Features |
| 0x14 | `EA` | PCI Enhanced Allocation |

## PCIe Capability (ID 0x10)

PCI Express Capability 안에는 Device·Link·Slot·Root의 Capabilities/Control/Status 레지스터가 이어집니다. root port 00:03.0은 이 capability가 0x54에 있고, `lspci -vv`의 `DevCap`·`DevCtl`·`LnkCap`·`LnkCtl`·`LnkSta`·`SltCap`·`RootCtl` 줄이 각 레지스터를 해석한 결과입니다. Ch 1에서 본 type 필드와 LnkCap/LnkSta, Ch 2에서 본 Extended Tag·MaxPayload가 모두 이 capability에 있습니다. 비트별 정의는 [Ch 18 Register Maps](/blog/embedded/hardware/pcie/chapter18-register-maps)에 모았습니다.

## Extended Capability (offset 0x100~)

0x100부터는 Extended Capability 리스트입니다. header가 4바이트이고, Linux v6.12 `pci_regs.h:708-710`의 매크로로 나눕니다.

| 필드 | 매크로 | 위치 |
|------|------|------|
| ID | `PCI_EXT_CAP_ID(h)` | `h & 0xffff` |
| Version | `PCI_EXT_CAP_VER(h)` | `(h >> 16) & 0xf` |
| Next | `PCI_EXT_CAP_NEXT(h)` | `(h >> 20) & 0xffc` |

igb(03:00.0)에서 따라간 결과입니다.

```text
off=0x100 hdr=0x15010001 id=0x0001 ver=1 next=0x150
off=0x150 hdr=0x1601000e id=0x000e ver=1 next=0x160
off=0x160 hdr=0x00010010 id=0x0010 ver=1 next=0x000
```

AER(0x01) → ARI(0x0E) → SR-IOV(0x10)입니다. 아래 표는 `pci_regs.h:711-746`의 ID 일부와 pciutils 3.13.0 `lib/header.h:259`의 IDE입니다.

| ID | 이름 | 비고 |
|------|------|------|
| 0x0001 | AER | |
| 0x0002 / 0x0009 | Virtual Channel | 0x09 주석은 "same as _VC" |
| 0x0003 | Device Serial Number | e1000e에 있음 |
| 0x000B | Vendor-Specific | |
| 0x000D | ACS | QEMU root port에 있음 |
| 0x000E | ARI | |
| 0x000F | ATS | |
| 0x0010 | SR-IOV | |
| 0x0013 | PRI | |
| 0x0015 | Resizable BAR | |
| 0x0017 | TPH Requester | |
| 0x0018 | LTR | |
| 0x001B | PASID | |
| 0x001D | DPC | |
| 0x001E | L1 PM Substates | |
| 0x0023 | DVSEC | |
| 0x002E | DOE | v6.12의 `PCI_EXT_CAP_ID_MAX` |
| 0x0030 | IDE | Linux v6.12 헤더에는 없고 pciutils 3.13.0에 있음 |

## DVSEC — Vendor 확장

DVSEC(ID 0x0023)은 vendor가 자기 구조를 표준 header에 실어 광고하는 Extended Capability입니다. Linux v6.12 `pci_regs.h:1110-1115`가 header 두 개를 정의합니다.

| 레지스터 | 필드 |
|------|------|
| Header 1 (offset +4) | Vendor ID [15:0], Revision [19:16], Length [31:20] |
| Header 2 (offset +8) | DVSEC ID [15:0] |

CXL 장치는 Vendor ID 0x1e98로 DVSEC를 여러 개 둡니다. [Bootloader Ch 34](/blog/embedded/bootloader/chapter34-pcie-enumeration)의 QEMU CXL Type 3 덤프에서 header 1 값 `03c31e98`(vendor 0x1e98, revision 3, length 0x03c)을 실제로 볼 수 있습니다. 시리즈 VM에는 CXL 장치가 없습니다. CXL 쪽 해석은 [CXL Internals Ch 6](/blog/embedded/hardware/cxl/chapter06-cxl-io)에 있습니다.

## ECAM — Enhanced Configuration Access Mechanism

config 공간을 MMIO로 보여 주는 방식이 ECAM입니다. Linux v6.12 `include/linux/pci-ecam.h:23-34`의 offset 계산은 다음과 같습니다.

```c
#define PCIE_ECAM_BUS_SHIFT	20 /* Bus number */
#define PCIE_ECAM_DEVFN_SHIFT	12 /* Device and Function number */
#define PCIE_ECAM_REG_MASK	0xfff /* Limit offset to a maximum of 4K */
```

function 하나에 4 KiB(12비트), devfn 8비트로 bus 하나에 1 MiB, bus 256개면 256 MiB입니다. 시리즈 VM은 UEFI가 넘긴 ACPI MCFG에서 이 영역을 받았습니다.

```text
ACPI: MCFG table detected, 1 entries
acpi PNP0A08:00: ECAM area [mem 0x4010000000-0x401fffffff] reserved by PNP0C02:00
acpi PNP0A08:00: ECAM at [mem 0x4010000000-0x401fffffff] for [bus 00-ff]
```

0x4010000000부터 256 MiB이고, [Bootloader Ch 34](/blog/embedded/bootloader/chapter34-pcie-enumeration)에서 U-Boot이 device tree로 받은 ECAM 주소와 같습니다. 같은 QEMU 머신이기 때문입니다.

e1000e(bus 2, devfn 0)의 ECAM 주소는 0x4010000000 + (2 << 20) = 0x4010200000입니다. 게스트 커널은 `CONFIG_STRICT_DEVMEM=y`, `CONFIG_IO_STRICT_DEVMEM=y`라서 `/dev/mem`으로 이 영역을 mmap하면 `PermissionError: [Errno 1] Operation not permitted`가 납니다. 그래서 QEMU monitor의 `xp`로 게스트 물리 주소를 읽었습니다.

```text
(qemu) xp /4wx 0x4010200000
4010200000: 0x10d38086 0x00100406 0x02000000 0x00000000
(qemu) xp /4wx 0x4010900000
4010900000: 0xffffffff 0xffffffff 0xffffffff 0xffffffff
```

첫 줄은 위 `lspci -xxx`의 `86 80 d3 10 06 04 10 00 00 00 00 02`와 같은 값입니다. 둘째 줄은 장치가 없는 bus 9이고 모두 1이 돌아옵니다.

## Configuration Access — Type 0 vs Type 1

Ch 2의 Altera root port 드라이버는 config 요청을 Type 0으로 보낼지 Type 1로 보낼지를 소프트웨어가 정합니다. `get_tlp_header()`(`pcie-altera.c:319-335`)의 첫 판 IP 분기는 대상 bus가 root bus 번호와 같으면 Type 0, 아니면 Type 1을 고릅니다.

```c
	if (pcie->pcie_data->version == ALTERA_PCIE_V1)
		cfg = (bus == pcie->root_bus_nr) ? cfg0 : cfg1;
```

Type 1 요청은 bridge들이 secondary~subordinate 범위를 보고 아래로 넘기다가, 대상 bus를 secondary로 가진 bridge에서 Type 0으로 바뀌어 장치에 닿습니다. 그래서 bridge의 bus 번호 레지스터가 비어 있으면 그 아래 장치는 보이지 않습니다. [Bootloader Ch 34](/blog/embedded/bootloader/chapter34-pcie-enumeration)의 CXL 실험이 그 경우입니다. U-Boot이 root port의 secondary bus를 정하지 않아 bus 13이 0xffffffff만 돌려주다가, 손으로 bus 번호를 쓰자 Type 3 장치가 나타납니다.

## Latency Tolerance Reporting (LTR)

LTR은 장치가 견딜 수 있는 지연을 snoop·no-snoop 두 값으로 올려 보내는 Extended Capability(ID 0x18)입니다. Linux v6.12 `pci_regs.h:979-985`는 각 값이 10비트 Value와 3비트 Scale로 이루어진다고 정의합니다(`PCI_LTR_VALUE_MASK` 0x3ff, `PCI_LTR_SCALE_MASK` 0x1c00).

시리즈 VM에는 LTR Capability를 가진 장치가 없고, ACPI `_OSC` 협상 결과에도 LTR이 빠져 있습니다.

```text
acpi PNP0A08:00: _OSC: OS supports [ExtendedConfig ASPM ClockPM Segments MSI HPX-Type3]
acpi PNP0A08:00: _OSC: platform does not support [LTR]
acpi PNP0A08:00: _OSC: OS now controls [PCIeHotplug SHPCHotplug PME AER PCIeCapability]
```

LTR을 쓰는 L1 PM Substates는 [Ch 6](/blog/embedded/hardware/pcie/chapter06-power-management)에서 다룹니다.

## 자주 하는 실수

### "PCIe 장치면 config space가 4 KB다"

Linux는 PCI Express Capability가 있는 function만 4096바이트로 봅니다. 시리즈 VM에서는 PCIe 트리 안에 있는 `edu`와 root bus의 virtio 장치가 256바이트였습니다. 확장 영역을 못 읽었다면 장치가 PCIe Capability를 갖고 있는지부터 봅니다.

### "Vendor ID 0xFFFF면 장치가 없다"

Linux v6.12 `pci_bus_generic_read_dev_vendor_id()`(`probe.c:2392-2406`)는 Vendor/Device dword가 0xffffffff, 0, 0x0000ffff, 0xffff0000이면 빈 slot으로 봅니다. 주석은 일부 보드가 빈 slot에서 0이나 ~0을 돌려준다고 적습니다. 반대로 Vendor ID가 0x0001(PCI-SIG)이면 장치가 아직 준비 중이라는 Configuration RRS 응답으로 보고, 준비될 때까지 다시 읽습니다(`pci.h:156-159`, `pci_bus_wait_rrs()`). 0xFFFF 하나만 보고 판단하면 이 두 경우를 놓칩니다.

### "PCIe 트리에 있으면 PCI Express Capability가 있다"

시리즈 VM의 `edu`(06:00.0)는 switch downstream port 아래에 있지만 capability가 MSI 하나뿐입니다. ECAM으로 접근된다는 사실도 장치의 종류를 말해 주지 않습니다. ECAM은 접근 방법일 뿐입니다.

### "Capability chain은 길다"

시리즈 VM의 e1000e는 Capability 4개와 Extended Capability 2개(AER, Device Serial Number), igb는 Capability 4개와 Extended Capability 3개(AER, ARI, SR-IOV)입니다. 장치마다 다르므로 개수를 가정하지 않고 리스트를 끝까지 따라갑니다.

### "lspci 표시가 레지스터 값이다"

prefetchable window의 `[32-bit]` 표시처럼, `lspci -vv`는 커널이 sysfs로 준 값과 레지스터를 섞어 해석합니다. 판단의 근거가 되는 값은 `-xxx`나 `setpci`로 원본 바이트를 확인합니다.

## 정리

- config space는 256바이트(PCI)와 4096바이트(PCIe) 두 크기이고, Linux는 PCI Express Capability 유무와 0x100 읽기로 정합니다.
- Header Type 0은 endpoint, 1은 bridge입니다. Type 1의 bus 번호와 window가 아래로의 전달을 정합니다.
- Capability는 0x34부터, Extended Capability는 0x100부터 연결 리스트이고, 순서는 offset 순서가 아닙니다.
- Extended Capability header는 ID 16비트, Version 4비트, Next 12비트입니다.
- DVSEC은 Vendor ID·Revision·Length와 DVSEC ID로 vendor 구조를 식별합니다.
- ECAM은 bus를 20비트, devfn을 12비트 밀어 4 KiB 창을 만듭니다. 시리즈 VM에서는 0x4010000000부터 256 MiB였습니다.
- 빈 slot과 아직 준비 중인 장치는 Vendor ID 값으로 구분합니다.

## 다음 편

[Ch 4: BAR & MMIO — 자원의 호스트 주소 공간 매핑](/blog/embedded/hardware/pcie/chapter04-bar-mmio)에서 위 덤프의 BAR0~BAR5를 크기 측정·prefetchable·ReBAR·SR-IOV VF BAR로 풀어 봅니다.

## 관련 항목

- [Ch 2: TLP](/blog/embedded/hardware/pcie/chapter02-tlp) — Configuration TLP header
- [Ch 4: BAR & MMIO](/blog/embedded/hardware/pcie/chapter04-bar-mmio)
- [Ch 18: Register Maps](/blog/embedded/hardware/pcie/chapter18-register-maps) — 비트별 reference
- [Bootloader Ch 34: U-Boot PCIe Enumeration](/blog/embedded/bootloader/chapter34-pcie-enumeration) — 같은 ECAM을 펌웨어에서 읽기
- [CXL Internals Ch 6: CXL.io·DVSEC](/blog/embedded/hardware/cxl/chapter06-cxl-io)

## 시리즈 자료 출처 안내

이 글의 소스 인용은 Linux v6.12, QEMU 11.1.3, pciutils 3.13.0 기준이고 실행은 Ch 1의 시리즈 VM에서 했습니다. 자료 정책은 [Ch 1 footer](/blog/embedded/hardware/pcie/chapter01-fundamentals#시리즈-자료-출처-안내)에 있습니다.
