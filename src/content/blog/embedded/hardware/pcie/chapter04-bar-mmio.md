---
title: "Ch 4: BAR & MMIO — Device 자원의 호스트 주소 매핑"
slug: "embedded/hardware/pcie/chapter04-bar-mmio"
date: 2026-05-19T09:04:00
description: "Base Address Register — Memory·I/O·64-bit·Prefetchable·size 결정·ReBAR·SR-IOV VF BAR."
series: "PCIe Deep Dive"
seriesOrder: 4
tags: [pcie, bar, mmio, rebar, sr-iov]
draft: false
topics: ["embedded", "embedded/hardware"]
---

## 한 줄 요약

> **"BAR는 장치가 '나에게 이만큼의 주소가 필요하다'고 알리고, 소프트웨어가 '그럼 여기를 써라'고 답을 적어 넣는 레지스터입니다."** 크기는 모두 1을 써 보고 되읽어서 알아냅니다. 64-bit BAR는 슬롯 두 개를 쓰고, prefetchable 비트는 읽어도 부작용이 없다는 표시입니다. SR-IOV VF의 BAR는 PF가 VF 전체 몫을 한 덩어리로 광고하고, VF 번호마다 그 안을 잘라 씁니다.

[Ch 3](/blog/embedded/hardware/pcie/chapter03-config-space)의 Type 0 header 덤프에서 0x10~0x24가 BAR0~BAR5였습니다. 이 장은 그 여섯 슬롯을 시리즈 VM(QEMU 11.1.3 virt, Debian 13, 커널 6.12.116)에서 직접 재고, 커널이 배치한 결과와 SR-IOV VF BAR까지 따라갑니다.

## BAR의 비트 — 4가지 종류

BAR 하위 비트는 종류를 나타내고, 나머지는 주소입니다. Linux v6.12 `pci_regs.h:102-113`의 정의입니다.

| 비트 | 정의 | 값 |
|------|------|------|
| bit 0 | `PCI_BASE_ADDRESS_SPACE` | 0 = memory, 1 = I/O |
| bit 2:1 (memory) | `PCI_BASE_ADDRESS_MEM_TYPE_MASK` | 00 = 32-bit, 01 = "Below 1M [obsolete]", 10 = 64-bit |
| bit 3 (memory) | `PCI_BASE_ADDRESS_MEM_PREFETCH` | prefetchable |
| 주소 mask | `PCI_BASE_ADDRESS_MEM_MASK` / `IO_MASK` | memory는 하위 4비트, I/O는 하위 2비트를 뺀 나머지 |

이전 판은 type 01을 "reserved"라고 적었지만, Linux 헤더의 이름은 1 MiB 아래 주소를 뜻하는 obsolete 인코딩입니다. I/O BAR의 bit 1은 같은 헤더 주석대로 reserved입니다.

시리즈 VM의 e1000e는 네 종류 중 세 가지를 한 장치에서 보여 줍니다.

```text
	Region 0: Memory at 10240000 (32-bit, non-prefetchable) [size=128K]
	Region 1: Memory at 10260000 (32-bit, non-prefetchable) [size=128K]
	Region 2: I/O ports at 2000 [disabled] [size=32]
	Region 3: Memory at 10280000 (32-bit, non-prefetchable) [size=16K]
	Expansion ROM at 10200000 [disabled] [size=256K]
```

## BAR Size 결정 — Probing

BAR 크기를 알아내는 방법은 간단합니다. 원래 값을 저장하고, 모두 1을 쓰고, 다시 읽고, 원래 값을 되돌립니다. 장치는 크기보다 작은 주소 비트를 0으로 고정해 두었으므로, 되읽은 값에서 종류 비트를 지우고 비트를 뒤집어 1을 더하면 크기가 나옵니다. 우편함에 "이 칸 아래로는 못 씁니다"라는 칸막이가 미리 붙어 있어서, 전부 채워 보면 칸막이 위치로 크기를 아는 것과 같습니다.

Linux v6.12 `__pci_read_base()`(`drivers/pci/probe.c:176-319`)가 그 순서를 그대로 따르고, 그 앞뒤로 decode를 끕니다.

```c
	if (!dev->mmio_always_on) {
		pci_read_config_word(dev, PCI_COMMAND, &orig_cmd);
		if (orig_cmd & PCI_COMMAND_DECODE_ENABLE) {
			pci_write_config_word(dev, PCI_COMMAND,
				orig_cmd & ~PCI_COMMAND_DECODE_ENABLE);
		}
	}

	res->name = pci_name(dev);

	pci_read_config_dword(dev, pos, &l);
	pci_write_config_dword(dev, pos, l | mask);
	pci_read_config_dword(dev, pos, &sz);
	pci_write_config_dword(dev, pos, l);
```

decode를 끄는 이유는 BAR에 모두 1이 들어 있는 동안 장치가 엉뚱한 주소에 응답하지 않게 하려는 것입니다. 함수 주석도 decode가 꺼진 동안 printk를 하지 말라고 적어 둡니다. [Bootloader Ch 34](/blog/embedded/bootloader/chapter34-pcie-enumeration)는 U-Boot의 같은 루틴이 command register 쓰기를 BAR 루프 뒤로 미룬다는 차이를 보여 줍니다.

같은 동작을 decode가 이미 꺼진 장치에서 손으로 해 봤습니다. 시리즈 VM의 `edu`(06:00.0)는 드라이버가 없어 `Control: I/O- Mem-` 상태이고 BAR0이 `[disabled]`입니다.

```text
--- edu before
	Control: I/O- Mem- BusMaster- SpecCycle- MemWINV- VGASnoop- ParErr- Stepping- SERR- FastB2B- DisINTx-
	Region 0: Memory at 10600000 (32-bit, non-prefetchable) [disabled] [size=1M]
0000
10600000
sized=fff00000
restored=10600000
```

`setpci -s 06:00.0 COMMAND BASE_ADDRESS_0`가 0x0000과 0x10600000을 돌려준 뒤, BAR0에 ffffffff를 쓰자 fff00000이 읽혔습니다. 하위 4비트 0은 32-bit non-prefetchable memory이고, 0xfff00000을 뒤집어 1을 더하면 0x00100000, 즉 1 MiB입니다. `lspci`의 `[size=1M]`과 같습니다. 원래 값을 다시 쓰고 확인했습니다. 드라이버가 쓰고 있는 장치에서는 이 실험을 하지 않습니다.

## 64-bit BAR

64-bit BAR는 슬롯 두 개를 차지합니다. 아래 슬롯에 하위 32비트와 종류 비트, 위 슬롯에 상위 32비트가 들어갑니다. `__pci_read_base()`는 `IORESOURCE_MEM_64`이면 `pos + 4`에도 같은 쓰기·되읽기를 하고 두 값을 합칩니다.

시리즈 VM의 NVMe(01:00.0)가 그 경우입니다.

```text
	Region 0: Memory at 10000000 (64-bit, non-prefetchable) [size=16K]
10000004
00000000
```

BAR0이 0x10000004(하위 4비트 0x4 = 64-bit, non-prefetchable), BAR1이 상위 0입니다. 그래서 `lspci`에는 Region 1이 없습니다. [Bootloader Ch 34](/blog/embedded/bootloader/chapter34-pcie-enumeration)에서 같은 QEMU NVMe의 sizing 응답이 `ffffffff:ffffc004`, 16 KiB였습니다.

64-bit BAR에 32-bit 주소를 줄 수도 있습니다. 이 NVMe는 64-bit BAR지만 커널이 4 GiB 아래 0x10000000에 놓았습니다. 반대로 virtio-net(07:00.0)의 BAR4는 64-bit prefetchable이고 0x8000900000, 4 GiB 위에 있습니다.

## Prefetchable

Linux `include/linux/ioport.h:46`은 `IORESOURCE_PREFETCH`에 "No side effects"라는 주석을 답니다. 읽는 것만으로 장치 상태가 바뀌지 않으니 미리 읽거나 합쳐 읽어도 된다는 뜻입니다. 반대로 읽으면 FIFO에서 값이 빠지거나 상태 비트가 지워지는 레지스터 영역은 non-prefetchable이어야 합니다. 도서관 열람용 책은 몇 번을 펼쳐도 그대로지만, 번호표 발급기는 한 번 누르면 번호가 넘어가는 것과 같습니다.

bridge 쪽에서는 두 종류가 다른 window를 씁니다. [Ch 3](/blog/embedded/hardware/pcie/chapter03-config-space)의 root port 덤프에서 Memory Base/Limit(0x20)는 32-bit non-prefetchable window, Prefetchable Base/Limit(0x24, upper 0x28·0x2C)는 64-bit가 가능한 prefetchable window였습니다. 시리즈 VM의 `/proc/iomem`에서 32-bit 장치 BAR는 0x10000000대에, 64-bit prefetchable BAR는 0x8000000000대에 놓였습니다.

## Resource Enumeration — 누가 주소를 정하나

시리즈 VM은 UEFI(edk2)가 먼저 장치를 열거하고, Linux가 부팅하면서 다시 읽어 배치를 확정합니다. 결과는 `/proc/iomem`에 bridge window → 장치 BAR → 드라이버 순서로 중첩되어 보입니다.

```text
  10000000-101fffff : PCI Bus 0000:01
    10000000-10003fff : 0000:01:00.0
      10000000-10003fff : nvme
  10200000-103fffff : PCI Bus 0000:02
    10200000-1023ffff : 0000:02:00.0
    10240000-1025ffff : 0000:02:00.0
      10240000-1025ffff : e1000e
```

셋째 줄의 `nvme`는 드라이버가 그 BAR를 자기 것으로 요청했다는 표시입니다. [Linux v6.12 PCI 드라이버 가이드](https://github.com/torvalds/linux/blob/adc218676eef25575469234709c2d87185ca223a/Documentation/PCI/pci.rst)(246-250행)는 드라이버가 `pci_request_region()`으로 다른 장치가 같은 주소를 쓰고 있지 않은지 확인하라고 적습니다. 그 뒤 `pci_iomap()`(`drivers/pci/iomap.c:122-125`)이 BAR를 커널 가상 주소로 매핑하고, igb는 `igb_main.c:3236`에서 `pci_iomap(pdev, 0, 0)`으로 BAR0을 매핑합니다.

sysfs `resource` 파일은 BAR마다 시작·끝·flag를 한 줄씩 줍니다. NVMe의 첫 줄은 `0x0000000010000000 0x0000000010003fff 0x0000000000140204`입니다. flag를 `ioport.h`로 읽으면 0x200 `IORESOURCE_MEM`, 0x40000 `IORESOURCE_SIZEALIGN`, 0x100000 `IORESOURCE_MEM_64`이고, 하위 0x4는 BAR의 64-bit 종류 비트입니다.

BAR가 들어갈 window가 부족한 경우 U-Boot 단계에서 무엇이 실패하는지는 [Bootloader Ch 34](/blog/embedded/bootloader/chapter34-pcie-enumeration)가 1 GiB BAR로 재현했습니다. 시리즈 VM에서는 그런 장치를 붙이지 않았습니다.

## Expansion ROM BAR

Type 0 header의 0x30(`PCI_ROM_ADDRESS`), Type 1의 0x38(`PCI_ROM_ADDRESS1`)이 Expansion ROM BAR입니다. `pci_regs.h:118-121`대로 bit 0이 enable, bit 10:1은 reserved, 주소 mask는 `~0x7ff`입니다.

e1000e는 `lspci`에 `Expansion ROM at 10200000 [disabled] [size=256K]`로 보이지만, [Ch 3](/blog/embedded/hardware/pcie/chapter03-config-space)에서 덤프한 config 0x30의 실제 값은 0xfffc0000이었습니다. 커널은 resource 트리에 0x10200000을 잡아 두었지만 레지스터에는 쓰지 않았습니다. Linux v6.12 `pci_std_update_resource()`(`drivers/pci/setup-res.c:72-90`)는 ROM이 enable되지 않았으면 ROM BAR를 갱신하지 않고, 주석은 그 이유로 disabled 상태에서 0으로 읽히는 일부 Matrox 장치를 듭니다. 0xfffc0000이라는 값 자체는 256 KiB 창의 주소 mask 모양이지만, 이 값을 누가 남겼는지는 이 실험으로 확인하지 않았습니다.

## Resizable BAR (ReBAR)

ReBAR는 장치가 지원하는 여러 크기 중 하나로 BAR를 바꾸게 해 주는 Extended Capability(ID 0x15)입니다. QEMU 11.1.3 소스에서 `REBAR`가 나오는 곳은 실제 장치를 넘겨주는 `hw/vfio/pci.c`와 Linux 헤더 사본뿐이고(`grep -rln REBAR hw include`), 에뮬레이션 장치에는 ReBAR Capability가 없습니다. 그래서 이 절은 실행하지 않았고 Linux 소스와 ABI 문서로만 설명합니다.

[Linux v6.12 sysfs ABI 문서](https://github.com/torvalds/linux/blob/adc218676eef25575469234709c2d87185ca223a/Documentation/ABI/testing/sysfs-bus-pci)(471-501행)의 `resourceN_resize`가 사용자 인터페이스입니다. 읽으면 지원 크기 bitmap이 나오고 bit 0이 1 MB, bit 1이 2 MB입니다. 문서의 예 `00000000000001c0`은 64·128·256 MB를 지원한다는 뜻이고, `echo 7`은 2^(7+20) = 128 MB로 바꾸라는 요청입니다. `pci.h:728-731`의 `pci_rebar_size_to_bytes()`가 같은 식입니다.

바꾸는 과정에는 조건이 많습니다. `__resource_resize_store()`(`pci-sysfs.c:1409-1463`)는 드라이버가 붙어 있으면 `-EBUSY`로 거절하고, memory decode를 끄고, 같은 종류의 BAR를 풀어 놓은 뒤 `pci_resize_resource()`를 부릅니다. 그 함수(`setup-res.c:430-`)는 firmware 배치를 보존해야 하는 host bridge(`preserve_config`), 아직 할당이 풀리지 않은 resource, decode가 켜진 장치에서 각각 실패하고, 지원하지 않는 크기는 `-EINVAL`입니다. 새 크기로 bridge window를 다시 잡지 못하면 실패를 돌려줍니다. ABI 문서도 같은 bridge 아래 다른 장치를 soft remove해야 할 수 있고 성공이 보장되지 않는다고 적습니다.

## SR-IOV VF BAR

SR-IOV(Extended Capability 0x10)를 가진 PF는 VF가 쓸 BAR를 자기 capability 안의 VF BAR(`PCI_SRIOV_BAR`, cap + 0x24)로 광고합니다. VF 하나 몫이 아니라 TotalVFs 전체 몫이 한 덩어리로 배치됩니다. 시리즈 VM의 igb(QEMU 82576 모델)로 VF 두 개를 만들었습니다.

```text
totalvfs=7 numvfs=0 offset=128 stride=2 vf_device=10ca
--- PF resource IOV lines (7-12)
0x0000008000400000 0x000000800041ffff 0x000000000014220c
0x0000008000420000 0x000000800043ffff 0x000000000014220c
```

(빈 줄 생략.) PF의 sysfs `resource` 파일에서 인덱스 7과 10(0부터 셈)이 VF BAR0·BAR3이고 각각 128 KiB입니다. capability의 `Total VFs: 8`에 VF당 16 KiB를 곱한 크기입니다. sysfs `sriov_totalvfs`가 7인 이유는 igb 드라이버가 `pci_sriov_set_totalvfs(pdev, 7)`(`igb_main.c:3930`)로 상한을 낮췄기 때문입니다.

```bash
echo 2 > /sys/bus/pci/devices/0000:03:00.0/sriov_numvfs
```

```text
03:10.0 Ethernet controller [0200]: Intel Corporation 82576 Virtual Function [8086:10ca] (rev 01)
03:10.2 Ethernet controller [0200]: Intel Corporation 82576 Virtual Function [8086:10ca] (rev 01)
	Region 0: Memory at 8000400000 (64-bit, prefetchable) [virtual] [size=16K]
	Region 3: Memory at 8000420000 (64-bit, prefetchable) [virtual] [size=16K]
	Region 0: Memory at 8000404000 (64-bit, prefetchable) [virtual] [size=16K]
	Region 3: Memory at 8000424000 (64-bit, prefetchable) [virtual] [size=16K]
```

여기서 두 가지 간격을 구분해야 합니다.

| 간격 | 값 | 계산 |
|------|------|------|
| Routing ID (First VF Offset·Stride) | offset 128, stride 2 | `pci_iov_virtfn_devfn()`(`iov.c:27-33`): PF devfn 0 + 128 + 2 × n → devfn 0x80(10.0), 0x82(10.2) |
| VF BAR 주소 | VF BAR 크기 16 KiB | VF0 BAR0 0x8000400000, VF1 BAR0 0x8000404000 |

Stride 2는 BDF 번호의 간격이고, MMIO 주소 간격은 VF BAR 하나의 크기(0x4000)입니다. `lspci`의 `[virtual]`은 OS가 sysfs로 주소를 보고하지만 장치의 BAR 레지스터는 비어 있다는 표시입니다(pciutils 3.13.0 `lspci.c:425`의 주석 "Detect virtual regions, which are reported by the OS, but unassigned in the device"). VF BAR가 그렇게 보이는 것은 VF 주소가 PF의 SR-IOV capability에서 계산되기 때문입니다. VF는 Linux에 Type 0 PCIe Endpoint로 등록되고(`pci 0000:03:10.0: [8086:10ca] type 00 class 0x020000 PCIe Endpoint`) igbvf 드라이버가 붙었습니다. 실험 뒤에는 `sriov_numvfs`에 0을 써서 VF를 지웠습니다.

## 자주 하는 실수

### "BAR Size = 장치 메모리 크기"

BAR 크기는 장치가 주소 공간에 요구한 창의 크기입니다. e1000e는 128 KiB짜리 BAR 두 개와 16 KiB BAR 하나를 요구하지만 그 안의 어느 offset이 의미 있는 레지스터인지는 장치 데이터시트와 드라이버가 압니다. ReBAR 장치는 같은 장치가 여러 크기 중 하나를 고를 수도 있습니다.

### "Memory BAR면 prefetchable"

시리즈 VM에서 NVMe·e1000e·igb PF의 레지스터 BAR는 모두 non-prefetchable이고, prefetchable은 virtio-net BAR4와 igb VF BAR였습니다. prefetchable은 읽기에 부작용이 없다는 장치의 약속이라 장치가 정합니다.

### "ReBAR는 sysfs에 쓰면 바뀐다"

`resourceN_resize`는 드라이버가 붙어 있으면 `-EBUSY`, decode가 켜져 있으면 `pci_resize_resource()`가 `-EBUSY`, 새 크기가 bridge window에 안 들어가면 실패입니다. 바꾸기 전에 드라이버를 떼고, 바꾼 뒤 `lspci -vv`와 `/proc/iomem`으로 결과를 확인합니다.

### "VF Stride는 MMIO 간격"

igb 실험에서 stride는 2였지만 VF BAR 간격은 0x4000이었습니다. stride는 VF의 devfn을 정하고, 주소 간격은 VF BAR 크기가 정합니다.

### "lspci의 Expansion ROM 주소가 레지스터 값"

e1000e는 `lspci`가 0x10200000을 보여 주지만 config의 ROM BAR는 0xfffc0000입니다. lspci는 커널 resource 트리를 보여 주고, Linux는 enable되지 않은 ROM BAR를 쓰지 않습니다.

## 정리

- BAR 하위 비트는 memory/I/O, 32/64-bit, prefetchable을 나타냅니다. type 01은 Linux 헤더에서 obsolete "Below 1M"입니다.
- 크기는 모두 1을 써서 되읽고 뒤집어 1을 더해 구합니다. Linux는 그동안 decode를 끕니다. `edu`에서 fff00000 → 1 MiB를 확인했습니다.
- 64-bit BAR는 슬롯 두 개를 쓰고, 4 GiB 아래에 놓일 수도 있습니다.
- `/proc/iomem`에 window → BAR → 드라이버 요청이 중첩되어 보입니다.
- Linux는 enable되지 않은 Expansion ROM BAR를 쓰지 않습니다.
- ReBAR는 sysfs `resourceN_resize`로 바꾸며, 드라이버 분리·decode off·window 재배치 조건이 있습니다. QEMU에는 ReBAR 장치가 없어 실행하지 않았습니다.
- SR-IOV VF는 PF capability의 VF BAR를 VF 수만큼 나눠 쓰고, Routing ID 간격(stride)과 MMIO 간격(VF BAR 크기)은 별개입니다.

## 다음 편

[Ch 5: Interrupts — INTx·MSI·MSI-X](/blog/embedded/hardware/pcie/chapter05-interrupts)에서 PCIe 인터럽트 전송 방식 세 가지와 MSI-X table이 BAR 안 어디에 있는지를 시리즈 VM에서 확인합니다.

## 관련 항목

- [Ch 3: Configuration Space](/blog/embedded/hardware/pcie/chapter03-config-space)
- [Ch 10: Linux PCI Basics](/blog/embedded/hardware/pcie/chapter10-linux-basics) — `pci_iomap`·driver matching
- [Ch 12: Virtualization I — SR-IOV·VFIO](/blog/embedded/hardware/pcie/chapter12-virtualization-1)
- [Bootloader Ch 34: U-Boot PCIe Enumeration](/blog/embedded/bootloader/chapter34-pcie-enumeration) — 펌웨어 단계 BAR 배치와 실패

## 시리즈 자료 출처 안내

이 글의 소스 인용은 Linux v6.12와 QEMU 11.1.3 기준이고 실행은 Ch 1의 시리즈 VM에서 했습니다. 자료 정책은 [Ch 1 footer](/blog/embedded/hardware/pcie/chapter01-fundamentals#시리즈-자료-출처-안내)에 있습니다.
