---
title: "U-Boot PCIe Enumeration — 장치 발견·BAR 할당과 CXL 메모리의 구분"
slug: "embedded/bootloader/chapter34-pcie-enumeration"
date: 2026-06-19T09:01:00
description: "U-Boot PCI driver model의 probe·bind와 BAR 자원 배치를 살펴보고, PCI MMIO window와 CXL.mem의 HDM decoder 주소 공간을 구분합니다."
series: "Bootloader Internals"
seriesOrder: 34
tags: [embedded, bootloader, u-boot, pcie, enumeration, cxl, root-complex]
topics: ["embedded"]
---

## 한 줄 요약

PCIe 열거는 장치를 찾고, BAR 크기를 재고, 그 BAR를 host bridge의 window 안에 배치하는 일입니다. QEMU virt에서 U-Boot v2024.04를 돌려 보면 이 셋이 각각 따로 실패합니다. 장치는 보이는데 1 GiB BAR는 배치되지 않고, 64-bit window를 켜면 이번엔 32-bit BAR가 들어갈 곳이 사라집니다. CXL Type 3 장치는 U-Boot에 아예 보이지 않습니다. ECAM을 직접 읽어 보면 256 MiB 메모리를 가진 장치의 BAR는 다 합쳐 72 KiB였습니다.

[Ch 19](/blog/embedded/bootloader/chapter19-kernel-handoff)의 커널 인계 전에 PCIe를 어디까지 준비할지는 부팅 장치에 달려 있습니다. NVMe에서 커널을 읽는다면 U-Boot이 그 경로의 bridge와 BAR를 배치해야 하고, 나머지 장치는 커널이 다시 잡습니다. 이 글은 U-Boot이 그 일을 어떤 코드로, 어떤 한계 안에서 하는지 실행 결과와 소스로 따라갑니다.

## 실험 환경

| 항목 | 값 |
| --- | --- |
| U-Boot | v2024.04, `qemu_arm64_defconfig` (`CONFIG_PCI_INIT_R=y`, `CONFIG_PCIE_ECAM_GENERIC=y`, `CONFIG_PCI_PNP=y`) |
| 비교 빌드 | 같은 설정에 `CONFIG_SYS_PCI_64BIT=y`만 추가 |
| 컴파일러 | aarch64-elf-gcc 16.2.0 |
| QEMU | 11.1.3, `-M virt -cpu cortex-a57 -m 1024` |
| 장치 | `e1000`, `nvme` 두 개(하나는 `pcie-root-port` 아래), `pci-testdev,membar=1G`·`membar=256M`, CXL은 QEMU 문서의 arm/virt 예제 토폴로지 |

주소는 QEMU virt의 배치이고 실보드와 다릅니다. 각 출력은 해당 장치 조합으로 따로 부팅해서 얻었습니다.

## U-Boot이 PCI를 훑는 시점

`qemu_arm64_defconfig`는 `CONFIG_PCI_INIT_R=y`라서 `common/board_r.c`의 init 순서에서 `stdio_add_devices` 바로 앞에 `pci_init()`이 들어갑니다. `pci_init()`은 PCI uclass의 controller를 하나씩 가져오기만 하는데, 주석대로 그 과정에서 controller가 probe되고 bus scan과 BAR 배치가 함께 일어납니다.

```c
	/*
	 * Enumerate all known controller devices. Enumeration has the side-
	 * effect of probing them, so PCIe devices will be enumerated too.
	 */
	for (uclass_first_device_check(UCLASS_PCI, &bus);
	     bus;
	     uclass_next_device_check(&bus)) {
		;
	}
```

그래서 배치 실패 메시지는 콘솔 설정(`In:`·`Out:`)보다 먼저 찍힙니다. 아래 1 GiB BAR 실험의 부팅 로그가 그 순서입니다.

scan으로 장치가 *bind*되는 것과 드라이버가 *probe*되는 것은 다른 단계입니다. 장치 네 개를 붙이고 autoboot를 멈춘 뒤의 `dm tree`에서, 이더넷으로 등록된 e1000만 `[ + ]`이고 NVMe 두 개는 bind만 된 상태입니다.

```text
 pci           0  [ + ]   pci_generic_ecam      |-- pcie@10000000
 pci_generi    0  [   ]   pci_generic_drv       |   |-- pci_0:0.0
 ethernet      0  [ + ]   eth_e1000             |   |-- e1000#0
 bootdev       1  [   ]   eth_bootdev           |   |   `-- e1000#0.bootdev
 nvme          0  [   ]   nvme                  |   |-- nvme#0
 pci           1  [ + ]   pci_bridge_drv        |   `-- pci_0:3.0
 nvme          1  [   ]   nvme                  |       `-- nvme#1
```

`nvme scan`을 실행하면 그때 NVMe 드라이버가 probe되고 그 아래 block 장치가 생깁니다.

```text
=> nvme scan
=> dm tree
 nvme          0  [ + ]   nvme                  |   `-- nvme#0
 blk           0  [ + ]   nvme-blk              |       |-- nvme#0.blk#1
 bootdev       1  [   ]   nvme_bootdev          |       `-- nvme#0.blk#1.bootdev
```

U-Boot v2024.04 문서는 `uclass_get_device()`가 PCI bus를 probe하고, 그 probe가 bus를 scan해 장치를 bind한다고 설명합니다. 문서의 lazy probe 문장은 bus에 대한 것이고, 장치 드라이버가 쓰일 때 probe된다는 것은 위 `dm tree` 결과로 확인한 사실입니다. 즉 "PCI 열거가 끝났다"와 "NVMe를 읽을 수 있다"는 따로 확인해야 합니다.

## 장치 목록과 bridge가 여는 window

같은 부팅에서 `pci`는 bus 0과 root port 아래 bus 1을 함께 보여 줍니다.

```text
=> pci
BusDevFun  VendorId   DeviceId   Device Class       Sub-Class
_____________________________________________________________
00.00.00   0x1b36     0x0008     Bridge device           0x00
00.01.00   0x8086     0x100e     Network controller      0x00
00.02.00   0x1b36     0x0010     Mass storage controller 0x08
00.03.00   0x1b36     0x000c     Bridge device           0x04
01.00.00   0x1b36     0x0010     Mass storage controller 0x08
```

00.03.00이 `pcie-root-port`(sub-class 0x04, PCI-to-PCI bridge)입니다. U-Boot이 이 bridge에 써 넣은 값을 `pci header`로 읽으면 bus 번호와 forwarding window가 보입니다.

```text
=> pci header 0.3.0
  header type =                 0x01
  primary bus number =          0x00
  secondary bus number =        0x01
  subordinate bus number =      0x01
  IO base =                     0x20
  IO limit =                    0x10
  memory base =                 0x1010
  memory limit =                0x1010
  prefetch memory base =        0xfff1
  prefetch memory limit =       0x0001
```

(출력 일부 발췌)

| 레지스터 | 값 | 뜻 |
| --- | --- | --- |
| secondary / subordinate | 0x01 / 0x01 | bus 1만 이 bridge 아래에 있음 |
| memory base / limit | 0x1010 / 0x1010 | 상위 12비트가 주소의 [31:20] → [0x10100000, 0x10200000), 1 MiB |
| IO base / limit | 0x20 / 0x10 | base > limit, I/O window 꺼짐 |
| prefetch base / limit | 0xfff1 / 0x0001 | base > limit, prefetch window 꺼짐 |

bus 1의 NVMe BAR가 이 window 안에 놓였는지 `pci bar`로 확인합니다.

```text
=> pci bar 1.0.0
ID   Base                Size                Width  Type
----------------------------------------------------------
 0   0x0000000010100000  0x0000000000004000  64     MEM   
```

0x10100000부터 16 KiB이므로 bridge의 1 MiB window 안입니다. bridge window는 1 MiB 단위라서, 16 KiB BAR 하나를 위해 32-bit 공간 1 MiB가 이 bridge에 묶입니다. 쓰지 않는 window는 base를 limit보다 크게 써서 끕니다.

## BAR 크기 재기

U-Boot의 `dm_pciauto_setup_device()`(`drivers/pci/pci_auto.c`)는 BAR마다 0xffffffff를 쓰고 다시 읽어 응답을 받습니다. 64-bit memory BAR이면 위 DWORD에도 같은 일을 하고 둘을 합칩니다.

```c
		/* Tickle the BAR and get the response */
		dm_pci_write_config32(dev, bar, 0xffffffff);
		dm_pci_read_config32(dev, bar, &bar_response);

		/* If BAR is not implemented (or invalid) go to the next BAR */
		if (!bar_response || bar_response == 0xffffffff)
			continue;
```

같은 동작을 U-Boot 셸에서 직접 해 볼 수 있습니다. NVMe만 붙인 부팅에서 00.01.00의 BAR0/BAR1 쌍을 읽고, 0xffffffff를 쓰고, 다시 읽은 뒤 원래 값으로 되돌렸습니다.

```text
=> pci display.l 0.1.0 10 2
00000010: 10000004 00000000
=> pci write.l 0.1.0 10 ffffffff
=> pci write.l 0.1.0 14 ffffffff
=> pci display.l 0.1.0 10 2
00000010: ffffc004 ffffffff
=> pci write.l 0.1.0 10 10000004
=> pci write.l 0.1.0 14 0
=> pci display.l 0.1.0 10 2
00000010: 10000004 00000000
```

응답 하위 4비트 0x4는 64-bit, non-prefetchable memory BAR입니다. 이 비트를 지운 0xffffffffffffc000의 보수에 1을 더하면 0x4000, 즉 16 KiB이고 `pci bar`의 Size와 같습니다.

이 실험은 U-Boot이 이미 memory decode를 켜 둔 장치에 썼습니다. QEMU에서는 문제가 없었지만, 실장치에서 decode가 켜진 채 BAR를 0xffffffff로 바꾸면 그 사이 주소 디코딩이 엉뚱한 곳을 가리킵니다. Linux v6.12의 `__pci_read_base()`(`drivers/pci/probe.c`)는 크기를 재기 전에 command register의 `PCI_COMMAND_MEMORY | PCI_COMMAND_IO`를 끄고, 끝나면 되돌립니다. U-Boot의 `dm_pciauto_setup_device()`는 command 값을 읽어 decode 비트를 지운 사본만 만들어 두고 BAR를 건드리며, command register에 실제로 쓰는 것은 BAR 루프가 끝난 뒤입니다. reset 직후처럼 decode가 이미 꺼진 장치라면 문제가 없습니다.

다음 함수는 이렇게 읽은 응답으로 memory BAR 크기를 계산합니다. 장치 레지스터는 건드리지 않습니다. 0 마스크는 "구현되지 않음"과 구분할 수 없으므로 거부합니다.

```js title="memory-bar-size.mjs"
export function memoryBarSize(rawMask, width = 32) {
  if (![32, 64].includes(width) || typeof rawMask !== 'bigint')
    throw new RangeError('width or mask');
  const all = (1n << BigInt(width)) - 1n;
  if (rawMask < 0n || rawMask > all || (rawMask & 1n) !== 0n ||
      (rawMask & 6n) !== (width === 64 ? 4n : 0n))
    throw new RangeError('memory BAR encoding');
  const address = rawMask & (all ^ 15n);
  if (address === 0n) throw new RangeError('ambiguous zero mask');
  const size = ((~address) & all) + 1n;
  if (size < 16n || (size & (size - 1n)) !== 0n)
    throw new RangeError('non-contiguous mask');
  return size;
}
```

이 글에서 읽은 응답을 넣은 결과입니다(Node로 실행).

| 장치·BAR | 응답 (상위:하위) | 폭 | 크기 |
| --- | --- | --- | --- |
| nvme BAR0 | ffffffff:ffffc004 | 64 | 0x4000 (16 KiB) |
| pci-testdev BAR2 | ffffffff:c000000c | 64, prefetchable | 0x40000000 (1 GiB) |
| cxl-type3 BAR0 | ffffffff:ffff0004 | 64 | 0x10000 (64 KiB) |
| cxl-type3 BAR2 | ffffffff:fffff004 | 64 | 0x1000 (4 KiB) |
| cxl-type3 BAR4 | fffff000 | 32 | 0x1000 (4 KiB) |

## Window에 배치하기 — 실패하는 두 가지 방식

U-Boot은 controller DT 노드의 `ranges`에서 window를 읽습니다. QEMU virt가 넘겨준 값과 U-Boot이 해석한 결과입니다.

```text
=> fdt print /pcie@10000000 ranges
ranges = <0x01000000 0x00000000 0x00000000 0x00000000 0x3eff0000 0x00000000 0x00010000 0x02000000 0x00000000 0x10000000 0x00000000 0x10000000 0x00000000 0x2eff0000 0x03000000 0x00000080 0x00000000 0x00000080 0x00000000 0x00000080 0x00000000>
=> pci regions
Buses 00-00
#   Bus start          Phys start         Size                Flags
0   0x0000000000000000 0x000000003eff0000 0x0000000000010000  io 
1   0x0000000010000000 0x0000000010000000 0x000000002eff0000  mem 
2   0x0000000040000000 0x0000000040000000 0x0000000040000000  mem sysmem 
```

`ranges`에는 세 window가 있습니다. I/O 64 KiB, 32-bit memory 0x10000000부터 0x2eff0000(약 752 MiB), 그리고 0x8000000000부터 512 GiB인 64-bit memory(첫 셀 0x03000000)입니다. 그런데 `pci regions`에는 64-bit window가 없습니다. 2번 줄은 DMA용으로 추가한 DRAM 영역입니다.

### 1 GiB BAR가 32-bit window에 들어가지 않는다

`pci-testdev`에 1 GiB와 256 MiB prefetchable BAR를 달고 부팅하면 콘솔보다 먼저 이 줄이 나옵니다.

```text
Loading Environment from Flash... *** Warning - bad CRC, using default environment
PCI: Failed autoconfig bar 18
In:    serial,usbkbd
```

0x18은 BAR2의 config offset입니다. `drivers/pci/pci-uclass.c`의 `decode_regions()`는 `CONFIG_SYS_PCI_64BIT`가 꺼져 있으면 PCI 주소가 32비트를 넘는 memory 범위를 버립니다.

```c
		if (!IS_ENABLED(CONFIG_SYS_PCI_64BIT) &&
		    type == PCI_REGION_MEM && upper_32_bits(pci_addr)) {
			debug(" - pci_addr beyond the 32-bit boundary, ignoring\n");
			continue;
		}
```

남은 window는 약 752 MiB짜리 하나이고, 1 GiB BAR는 1 GiB 정렬로 그 안에 들어갈 수 없습니다. 256 MiB BAR는 0x20000000에 놓였습니다. 64-bit BAR이지만 위 DWORD에 0을 써서 4 GiB 아래에 둡니다.

```text
=> pci bar 0.1.0
ID   Base                Size                Width  Type
----------------------------------------------------------
 0   0x0000000010000000  0x0000000000001000  32     MEM   
 1   0x0000000000001000  0x0000000000000100  32     I/O   
 2   0xffffffffc0000000  0x0000000040000000  64     MEM   Prefetchable
=> pci bar 0.2.0
(헤더와 BAR 0·1 줄 생략)
 2   0x0000000020000000  0x0000000010000000  64     MEM   Prefetchable
```

실패한 BAR2의 Base는 0xffffffffc0000000으로 나옵니다. 배치된 주소가 아니라 크기를 잴 때 쓴 0xffffffff가 남은 값입니다. `pci header 0.1.0`을 보면 이 장치의 command register는 0x0007(I/O·memory decode·bus master 켜짐)입니다.

```text
  command register ID =         0x0007
  base address 2 =              0xc000000c
  base address 3 =              0xffffffff
```

소스가 그대로 설명합니다. `pciauto_region_allocate()`가 실패하면 BAR에 아무것도 쓰지 않지만, 그 바로 아래 `cmdstat |= ... PCI_COMMAND_MEMORY`는 성공 여부와 상관없이 실행되고 루프 뒤 command register에 기록됩니다. 배치에 실패한 BAR가 sizing 마스크 주소를 가진 채 decode가 켜진 상태로 커널에 넘어갑니다. 커널이 자원을 다시 배치하지 않는 구성이라면 이 장치가 그 주소 범위를 decode하므로 주의해야 합니다.

### 64-bit를 켜면 32-bit BAR가 들어갈 곳이 사라진다

`CONFIG_SYS_PCI_64BIT=y`만 추가해서 다시 빌드하고 같은 장치로 부팅했습니다.

```text
PCI: Failed autoconfig bar 10
PCI: Failed autoconfig bar 10
...
=> pci bar 0.1.0
ID   Base                Size                Width  Type
----------------------------------------------------------
 0   0x00000000fffff000  0x0000000000001000  32     MEM   
 1   0x0000000000001000  0x0000000000000100  32     I/O   
 2   0x0000008000000000  0x0000000040000000  64     MEM   Prefetchable
=> pci regions
#   Bus start          Phys start         Size                Flags
0   0x0000000000000000 0x000000003eff0000 0x0000000000010000  io 
1   0x0000008000000000 0x0000008000000000 0x0000008000000000  mem 
2   0x0000000040000000 0x0000000040000000 0x0000000040000000  mem sysmem 
```

1 GiB BAR는 0x8000000000에 들어갔습니다. 대신 두 장치의 32-bit BAR0(offset 0x10)가 둘 다 실패했고, `pci regions`의 1번 줄은 32-bit window가 아니라 64-bit window로 바뀌었습니다.

원인은 두 군데입니다. 먼저 `decode_regions()`는 `CONFIG_PCI_REGION_MULTI_ENTRY`가 꺼져 있으면 같은 종류의 region을 새로 만들지 않고 기존 것을 덮어씁니다. 0x02000000과 0x03000000은 prefetch 비트가 없으므로 둘 다 `PCI_REGION_MEM`이고, 뒤에 나온 64-bit window가 32-bit window를 대체합니다.

```c
		pos = -1;
		if (!IS_ENABLED(CONFIG_PCI_REGION_MULTI_ENTRY)) {
			for (i = 0; i < hose->region_count; i++) {
				if (hose->regions[i].flags == type)
					pos = i;
			}
		}
```

다음으로 32-bit BAR를 4 GiB 위에 둘 수는 없으므로 `pciauto_region_allocate()`가 거부합니다.

```c
	if (upper_32_bits(addr) && !supports_64bit) {
		debug("Cannot assign 64-bit address to 32-bit-only resource\n");
		goto error;
	}
```

`CONFIG_PCI_REGION_MULTI_ENTRY`를 켜도 해결되지 않습니다. `pci_auto_common.c`의 `pciauto_config_init()`은 종류별로 *가장 큰* region 하나만 `pci_mem`으로 고르므로, 여전히 512 GiB window가 선택됩니다. U-Boot v2024.04 autoconfig가 쓰는 window는 I/O·memory·prefetchable memory 종류마다 하나뿐입니다. QEMU virt처럼 32-bit와 64-bit window가 둘 다 non-prefetchable로 기술된 구성에서는, 32-bit BAR와 4 GiB를 넘는 정렬이 필요한 BAR를 U-Boot 단계에서 함께 배치할 수 없습니다.

| 설정 | 32-bit window | 64-bit window | 1 GiB BAR | 32-bit BAR |
| --- | --- | --- | --- | --- |
| 기본 (`SYS_PCI_64BIT` 꺼짐) | 사용 | 버림 | 실패 (`bar 18`) | 배치됨 |
| `SYS_PCI_64BIT=y` | 덮어씀 | 사용 | 0x8000000000 | 실패 (`bar 10`) |

장치 목록에 보이는 것, BAR가 배치된 것, 드라이버가 쓸 수 있는 것은 이렇게 각각 따로 실패합니다. 두 번째 경우에도 `pci` 목록에는 두 장치가 그대로 나옵니다.

## CXL Type 3 — U-Boot에 보이지 않는 장치

QEMU 11.1 문서의 arm/virt 예제에서 CXL 장치 부분(`cxl=on`, `pxb-cxl` bus 12, `cxl-rp`, 256 MiB volatile `cxl-type3`, `cxl-fmw.0.size=4G`)을 그대로 가져와 붙였습니다. CPU·메모리 옵션은 앞의 실험과 같습니다.

```text
=> pci
BusDevFun  VendorId   DeviceId   Device Class       Sub-Class
_____________________________________________________________
00.00.00   0x1b36     0x0008     Bridge device           0x00
00.01.00   0x1b36     0x000b     Bridge device           0x00
=> pci 12
No such bus
=> pci 13
No such bus
```

00.01.00이 `pxb-cxl`입니다. header type 0, sub-class 0x00(host bridge)으로 보입니다. `dm_pciauto_config_device()`는 class가 `PCI_CLASS_BRIDGE_PCI`(0x0604)일 때만 아래 bus를 probe하고, host bridge는 `default`로 BAR 설정만 하고 지나갑니다. bus 12 아래의 root port와 Type 3 장치는 U-Boot 장치 트리에 생기지 않습니다. U-Boot v2024.04의 `.c`·`.h` 파일에는 "cxl" 문자열이 하나도 없습니다.

장치가 없는 것은 아닙니다. controller의 `reg`는 ECAM 0x4010000000부터 256 MiB이고, config 주소는 `base + (bus << 20 | dev << 15 | fn << 12 | offset)`입니다. bus 12의 root port를 `md`로 읽으면 vendor 0x8086·device 0x7075, class 0x0604가 나오지만 bus 번호 레지스터(0x18)가 0입니다. 아무도 secondary bus를 정하지 않았으므로 bus 13은 0xffffffff만 돌려줍니다. 열거가 하는 일을 손으로 대신해서 primary 12·secondary 13·subordinate 13을 쓰면 Type 3 장치가 나타납니다.

```text
=> md.l 0x4010c00000 4
4010c00000: 70758086 00100000 06040000 00010000  ..up............
=> mw.l 0x4010c00018 0x000d0d0c
=> md.l 0x4010d00000 4
4010d00000: 0d938086 00100000 05021001 00000000  ................
```

class 0x050210은 memory controller / CXL(0x0502), prog-if 0x10입니다. extended config space 0x100부터는 capability 사슬이 이어집니다.

```text
=> md.l 0x4010d00100 0x80
4010d00100: 13c10023 03c31e98 001e0000 00000002  #...............
4010d00110: 00020000 00000000 00000000 1000004b  ............K...
4010d00120: 00000000 00000000 00000000 00000000  ................
4010d00130: 00000000 00000000 00000000 16010023  ............#...
4010d00140: 02401e98 00000008 00000100 00000000  ..@.............
4010d00150: 00000302 00000000 00000000 00000000  ................
4010d00160: 17010023 01001e98 06030005 00000033  #...........3...
4010d00170: 19010023 02021e98 00260007 00260002  #.........&...&.
4010d00180: 000000ef 00000000 00000000 00000000  ................
4010d00190: 2001002e 00000001 00000000 00000000  ... ............
```

(0x1a0–0x1f0의 0 줄과 0x200의 AER부터 0x2f0까지 생략)

extended capability header는 하위 16비트가 ID, 상위 12비트가 다음 offset입니다. DVSEC(ID 0x23)은 header1에 vendor(0x1e98 = CXL)·revision·length, header2 하위 16비트에 DVSEC ID가 있습니다. Linux v6.12의 `drivers/cxl/cxlpci.h`와 `include/uapi/linux/pci_regs.h` 정의로 읽으면 다음과 같습니다.

| offset | 구조 | 읽은 값 |
| --- | --- | --- |
| 0x100 | DVSEC ID 0, PCIe DVSEC for CXL Devices (len 0x3c) | cap 0x001e: Mem_Capable(bit 2)=1, HDM_Count=1. ctrl 0x0002: Mem_Enable(bit 2)=0. Range 1 size 0x1000004b: 256 MiB, Info_Valid·Active=1. Range 1 base 0 |
| 0x13c | DVSEC ID 8, Register Locator (len 0x24) | 0x00000100: BIR 0, block 1(component registers). 0x00000302: BIR 2, block 3(memory device registers). 세 번째 칸 비어 있음 |
| 0x160 | DVSEC ID 5, Device GPF | — |
| 0x170 | DVSEC ID 7, Flex Bus Port | — |
| 0x190 | ID 0x2e, DOE | — |
| 0x200 | ID 0x01, AER | 다음 offset 0, 사슬 끝 |

BAR 크기는 앞 절의 방법으로 쟀습니다(command register 0x0000, decode 꺼짐 확인 후). BAR0 64 KiB, BAR2 4 KiB, BAR4 4 KiB입니다. Register Locator대로 component register(HDM decoder 포함)가 BAR0, mailbox 등 memory device register가 BAR2에 있습니다. **256 MiB 메모리는 어느 BAR로도 노출되지 않습니다.** 그 용량은 DVSEC의 Range Size에만 적혀 있고, 실제로 접근하려면 host physical address 범위(QEMU의 `cxl-fmw.0`, 4 GiB)를 host bridge와 장치의 HDM decoder가 이 장치로 보내도록 프로그래밍해야 합니다. 이 실행에서 Range Base는 0이고 Mem_Enable도 0입니다. 펌웨어 누구도 이 메모리를 켜지 않았습니다.

그 host physical 범위와 host bridge의 component register 위치를 OS에 알리는 수단도 PCI가 아닙니다. QEMU 문서에 따르면 CXL fixed memory window는 CFMWS, host bridge register 위치는 CHBS 구조로 ACPI CEDT 테이블에 실립니다. QEMU virt가 U-Boot에 넘긴 DT에는 CXL 노드가 없습니다. `fdt list /`의 최상위 노드 중 PCI 관련은 `pcie@10000000` 하나뿐입니다. 이 토폴로지를 Linux가 CXL로 인식하는 경로는 UEFI·ACPI이고, [다음 장](/blog/embedded/bootloader/chapter35-uefi-cxl-init)에서 다룹니다.

## DT로 넘기는 것과 넘기지 않는 것

앞에서 읽은 `ranges`는 PCI 주소와 CPU 주소 사이의 window 세 개입니다. 개별 BAR 주소는 DT에 없고, 커널은 config space에서 BAR를 다시 읽습니다. U-Boot v2024.04 문서는 discoverable 장치라도 보드 정보를 더하기 위해 DT에 PCI 장치 노드를 두는 방법(`reg`의 첫 셀에 bus·device·function)을 설명합니다. 이 글의 실험은 그런 노드 없이 동적으로 찾은 장치만 썼습니다.

CXL은 위에서 본 대로 DT 경로가 아닙니다. Linux의 CXL BIOS/EFI 문서는 펌웨어가 CEDT·SRAT 등으로 정보를 넘기고, decoder 프로그래밍은 플랫폼 정책에 따라 펌웨어 또는 OS가 맡는다고 구분합니다.

## 증상별로 나누어 보기

| 증상 | 이 글에서 본 예 | 다음 확인 |
| --- | --- | --- |
| `pci`에 장치가 없음 | bus 13 Type 3 (`No such bus`) | 위쪽 bridge의 secondary·subordinate bus 번호, bridge class(0x0604인가) |
| 장치는 보이나 `PCI: Failed autoconfig bar NN` | 1 GiB BAR (`bar 18`), 32-bit BAR (`bar 10`) | `pci regions`와 DT `ranges`, `SYS_PCI_64BIT`, BAR 폭과 window 종류 |
| BAR Base가 0xffff…로 보임 | 실패한 BAR2 | 배치 실패의 흔적. command register decode 상태 |
| 장치는 bind됐으나 드라이버가 동작 안 함 | NVMe `[   ]` | 해당 서브시스템 명령(`nvme scan` 등)으로 probe 후 다시 확인 |
| CXL 메모리가 없음 | Range Base 0, Mem_Enable 0 | ACPI CEDT·HDM decoder·OS region 설정 |

## 정리

- `CONFIG_PCI_INIT_R=y`에서 U-Boot은 콘솔 설정 전에 모든 PCI controller를 probe하며 그 부수 효과로 열거와 BAR 배치가 끝납니다. 장치 드라이버는 쓰일 때 probe됩니다.
- BAR 크기는 0xffffffff를 쓰고 읽은 응답에서 계산합니다. 실장치에서는 decode를 끈 상태에서 해야 합니다.
- U-Boot v2024.04 autoconfig는 memory window를 종류당 하나만 씁니다. 기본 설정은 64-bit window를 버리고, `SYS_PCI_64BIT`는 32-bit window를 덮어씁니다.
- 배치에 실패한 BAR는 sizing 마스크가 남은 채 decode가 켜집니다.
- CXL Type 3의 메모리 용량은 BAR가 아니라 DVSEC Range와 HDM decoder의 일입니다. U-Boot v2024.04에는 CXL 코드가 없고, 정보는 ACPI CEDT로 갑니다.

## 다음 편

[Ch 35: EFI·UEFI에서 CXL 초기화](/blog/embedded/bootloader/chapter35-uefi-cxl-init)에서는 CEDT와 decoder 설정을 나누고, firmware가 준비할 정보와 Linux가 구성할 자원을 구분합니다.

## 근거 자료

- U-Boot v2024.04 소스: `common/board_r.c`(`pci_init` 위치), `drivers/pci/pci-uclass.c`(`pci_init`, `decode_regions`), `drivers/pci/pci_auto.c`(`dm_pciauto_setup_device`, `dm_pciauto_config_device`), `drivers/pci/pci_auto_common.c`(`pciauto_region_allocate`, `pciauto_config_init`), `drivers/pci/Kconfig`(`PCI_REGION_MULTI_ENTRY`).
- [U-Boot v2024.04 PCI with Driver Model](https://docs.u-boot.org/en/v2024.04/develop/driver-model/pci-info.html): bus probe와 scan, 장치 probe 시점, DT의 PCI 장치 노드.
- Linux v6.12 소스: `drivers/pci/probe.c`(`__pci_read_base`의 decode 끄기), `drivers/cxl/cxlpci.h`(DVSEC ID·Range·Register Locator 정의), `include/uapi/linux/pci_regs.h`(extended capability ID, DVSEC header).
- [QEMU CXL 문서](https://www.qemu.org/docs/master/system/devices/cxl.html) (v11.1.0 태그의 `docs/system/devices/cxl.rst`와 대조): arm/virt 예제 토폴로지, BAR의 register·mailbox, CEDT의 CFMWS·CHBS.
- [Linux CXL BIOS/EFI Configuration](https://docs.kernel.org/driver-api/cxl/platform/bios-and-efi.html): 펌웨어가 넘기는 정보와 decoder 설정의 경계.

## 관련 항목

- [Ch 19: Linux Boot ABI](/blog/embedded/bootloader/chapter19-kernel-handoff)
- [Ch 35: EFI·UEFI에서 CXL 초기화](/blog/embedded/bootloader/chapter35-uefi-cxl-init)
- [Ch 36: 부트 시 메모리 토폴로지](/blog/embedded/bootloader/chapter36-boot-memory-topology)
- [Modern Embedded Recipes: PCIe에서 CXL로](/blog/embedded/modern-recipes/part11-15-pcie-to-cxl)
- [Modern Embedded Recipes: Linux CXL 드라이버](/blog/embedded/modern-recipes/part11-17-linux-cxl-driver)
