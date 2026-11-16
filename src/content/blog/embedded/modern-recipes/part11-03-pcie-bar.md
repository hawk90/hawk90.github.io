---
title: "PCIe BAR 매핑 분석 — Config Space·Enumeration·MMIO 접근"
slug: "embedded/modern-recipes/part11-03-pcie-bar"
date: 2026-04-20T09:02:00
description: "QEMU의 교육용 PCI 장치 edu와 Linux 6.12로 BAR sizing, enumeration, pci_iomap/readl, sysfs mmap, Bus Master, AER를 직접 돌려 보고 결과를 그대로 싣습니다."
series: "Modern Embedded Recipes"
seriesOrder: 125
tags: [recipes, pcie, bar, mmio, enumeration]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> **"BAR는 장치가 '나는 이만큼의 주소 공간이 필요하다'고 선언하는 레지스터입니다."** 시스템 소프트웨어가 그 크기를 읽어 주소를 배정하고, 드라이버는 배정된 주소를 매핑해 레지스터를 읽고 씁니다.

## 이 글의 실습 환경

PCIe 장치를 손에 들고 있지 않아도 BAR의 동작은 끝까지 돌려 볼 수 있습니다. 이 글의 출력은 모두 아래 환경에서 실제로 얻은 것입니다.

- QEMU 11.1.3 `-M virt`(HVF 가속), Debian 13 arm64 guest, 커널 `6.12.116+deb13-arm64`, gcc 14.2.0.
- 장치는 QEMU에 들어 있는 교육용 PCI 장치 **edu**(`-device edu`)입니다. QEMU 문서 `docs/specs/edu.rst`에 따르면 PCI ID는 `1234:11e8`이고, BAR0는 1 MB MMIO이며, 0x00에 ID(`0xRRrr00ed`), 0x04에 비트 반전 liveness 레지스터, 0x80 이후에 DMA 레지스터가 있습니다.
- 64-bit BAR와 링크 상태는 같은 VM에 붙인 QEMU NVMe(`-device nvme`)와 igb NIC로 확인했습니다.

이 결과는 QEMU가 모델링한 장치의 동작입니다. 실제 보드의 PCIe 링크 속도나 지연은 여기서 나오지 않습니다.

## PCI Config Space

모든 PCI 함수는 config space라는 작은 레지스터 파일을 가집니다. Linux `include/uapi/linux/pci_regs.h`는 그 크기를 `PCI_CFG_SPACE_SIZE` 256바이트, PCIe의 확장 config space를 `PCI_CFG_SPACE_EXP_SIZE` 4096바이트로 정의합니다. 앞 64바이트가 표준 헤더이고, Type 0(endpoint) 헤더의 주요 필드는 다음과 같습니다(오프셋은 같은 파일의 `PCI_*` 정의).

| Offset | 크기 | 필드 |
|---|---|---|
| 0x00 / 0x02 | 2 / 2 | Vendor ID / Device ID |
| 0x04 / 0x06 | 2 / 2 | Command / Status |
| 0x08 | 1 + 3 | Revision ID + Class code |
| 0x0C~0x0F | 1씩 | Cache line size, Latency timer, Header type, BIST |
| 0x10~0x24 | 4 × 6 | BAR0~BAR5 |
| 0x28 | 4 | CardBus CIS pointer |
| 0x2C / 0x2E | 2 / 2 | Subsystem vendor ID / Subsystem ID |
| 0x30 | 4 | Expansion ROM base address |
| 0x34 | 1 | Capabilities pointer |
| 0x3C / 0x3D | 1 / 1 | Interrupt line / Interrupt pin |

VM에서 edu 장치의 config space 앞부분을 덤프하면 이 표가 그대로 보입니다.

```text
$ lspci -s 00:03.0 -xxx
00:03.0 Unclassified device [00ff]: Device 1234:11e8 (rev 10)
00: 34 12 e8 11 00 00 10 00 10 00 ff 00 00 00 00 00
10: 00 00 00 10 00 00 00 00 00 00 00 00 00 00 00 00
20: 00 00 00 00 00 00 00 00 00 00 00 00 f4 1a 00 11
30: 00 00 00 00 40 00 00 00 00 00 00 00 ff 01 00 00
```

little-endian이라 0x00의 `34 12`가 Vendor ID `0x1234`, 0x02의 `e8 11`이 Device ID `0x11e8`입니다. 0x10의 `00 00 00 10`이 BAR0 값 `0x10000000`, 0x34의 `40`이 첫 capability(MSI)의 위치, 0x3D의 `01`이 INTA#입니다.

## BAR의 비트 구성

BAR 하나는 32비트입니다. 하위 비트는 종류를 나타내는 고정 비트이고, 나머지가 주소입니다. `pci_regs.h`의 정의를 표로 옮기면 다음과 같습니다.

| 비트 | 정의 | 의미 |
|---|---|---|
| 0 | `PCI_BASE_ADDRESS_SPACE` | 0 = memory, 1 = I/O |
| 2:1 | `PCI_BASE_ADDRESS_MEM_TYPE_MASK` (0x06) | 0x00 = 32-bit, 0x04 = 64-bit (0x02 "below 1M"은 obsolete) |
| 3 | `PCI_BASE_ADDRESS_MEM_PREFETCH` (0x08) | prefetchable |
| 31:4 | `PCI_BASE_ADDRESS_MEM_MASK` (`~0x0f`) | memory BAR의 주소 |

64-bit BAR는 다음 BAR 슬롯을 상위 32비트로 씁니다. VM의 NVMe 컨트롤러가 그 예입니다.

```text
$ setpci -s 02:00.0 BASE_ADDRESS_0 BASE_ADDRESS_1
10300004
00000000
$ lspci -s 02:00.0 -v | grep "Memory at"
	Memory at 10300000 (64-bit, non-prefetchable) [size=16K]
```

BAR0 하위 비트 `0x4`가 64-bit memory BAR라는 표시이고, BAR1 `0x00000000`이 주소의 상위 32비트입니다. BAR0만 32비트로 읽고 끝내는 코드는 4 GB 위에 배정된 BAR에서 주소를 잘못 계산합니다.

## Sizing — 장치가 얼마나 필요한지 묻기

BAR 크기는 config space 어디에도 숫자로 적혀 있지 않습니다. 대신 BAR에 전부 1을 쓰고 다시 읽으면, 장치가 바꿀 수 없게 고정한 하위 주소 비트가 0으로 돌아옵니다. 그 0의 개수가 크기입니다. 열쇠 구멍 모양을 보고 열쇠 크기를 아는 것과 비슷합니다.

VM에서 edu BAR0에 이 절차를 그대로 실행했습니다. 크기를 재는 동안 장치가 엉뚱한 주소에 응답하지 않도록 Command의 Memory Space 비트를 먼저 끄고, 끝나면 원래 값을 되돌립니다.

```text
$ setpci -s 00:03.0 BASE_ADDRESS_0
10000000
$ setpci -s 00:03.0 COMMAND=0000:0002        # Memory decode off
$ setpci -s 00:03.0 BASE_ADDRESS_0=ffffffff
$ setpci -s 00:03.0 BASE_ADDRESS_0
fff00000
$ setpci -s 00:03.0 BASE_ADDRESS_0=10000000   # 원래 값 복원
```

읽은 값 `0xfff00000`에서 하위 4비트(종류 비트)를 지우고 비트를 뒤집어 1을 더하면 `~0xfff00000 + 1 = 0x100000`, 즉 1 MB입니다. edu 문서의 "1 MB"와 `lspci`의 `[size=1M]`이 모두 이 값입니다.

C로 쓰면 다음과 같습니다. Linux 커널은 이 일을 enumeration 때 대신 해 주므로(`drivers/pci/probe.c`의 `__pci_read_base()`), 드라이버가 직접 할 일은 없습니다.

```c
u32 orig, mask;
pci_read_config_dword(pdev, PCI_BASE_ADDRESS_0, &orig);
pci_write_config_dword(pdev, PCI_BASE_ADDRESS_0, 0xffffffff);
pci_read_config_dword(pdev, PCI_BASE_ADDRESS_0, &mask);
pci_write_config_dword(pdev, PCI_BASE_ADDRESS_0, orig);

mask &= PCI_BASE_ADDRESS_MEM_MASK;   /* 하위 4비트(종류 비트) 제거 */
u32 size = ~mask + 1;                /* 0xfff00000 -> 0x00100000 */
```

## Enumeration 흐름

부팅 때 시스템 소프트웨어는 버스를 훑어 장치를 찾고, BAR 크기를 재고, 주소를 배정합니다. 순서는 다음과 같습니다.

1. Root bus의 device 0~31, function 0~7의 Vendor ID를 읽습니다. 장치가 없으면 all-ones가 돌아옵니다.
2. Header type이 bridge(Type 1)이면 새 버스 번호를 주고 그 아래를 다시 훑습니다.
3. 각 함수의 BAR를 sizing합니다.
4. bridge의 window와 각 BAR에 주소를 배정합니다.
5. 드라이버가 Command 레지스터의 Memory/I/O/Bus Master 비트를 켭니다.

VM의 `dmesg`에서 이 과정이 보입니다. 첫 줄은 장치 발견, 둘째 줄은 펌웨어(EDK2)가 둔 BAR 값을 Linux가 읽은 것이고, 아래 두 줄은 Linux가 주소를 다시 배정한 결과입니다.

```text
[    0.358611] pci 0000:00:03.0: [1234:11e8] type 00 class 0x00ff00 conventional PCI endpoint
[    0.359597] pci 0000:00:03.0: BAR 0 [mem 0x10400000-0x104fffff]
[    0.387651] pci 0000:00:03.0: BAR 0 [mem 0x10000000-0x100fffff]: assigned
[    0.401976] pci 0000:02:00.0: BAR 0 [mem 0x10300000-0x10303fff 64bit]: assigned
```

같은 BAR0가 펌웨어 단계에서는 `0x10400000`, Linux가 다시 배정한 뒤에는 `0x10000000`이었습니다. BAR 주소는 누가 언제 배정하느냐에 따라 달라지는 값이므로, 드라이버가 상수로 박아 두면 안 됩니다.

## Linux 드라이버 — BAR 매핑

드라이버는 배정된 BAR를 커널 가상 주소로 매핑하고, MMIO 접근 함수로만 읽고 씁니다. 아래 모듈은 edu BAR0를 매핑해 ID 레지스터를 읽고, liveness 레지스터에 값을 써서 반전된 값이 돌아오는지 확인합니다. `pcim_*` 함수는 장치가 떨어질 때 자원을 자동으로 정리하는 managed 버전이고, Linux 6.12 `drivers/pci/devres.c`는 예전 `pcim_iomap_regions()`·`pcim_iomap_table()`을 DEPRECATED로 표시하고 `pcim_iomap_region()`을 쓰라고 안내합니다.

```c
#include <linux/module.h>
#include <linux/pci.h>

#define EDU_REG_ID        0x00   /* RO: 0xRRrr00ed */
#define EDU_REG_LIVENESS  0x04   /* RW: 읽으면 쓴 값의 비트 반전 */

static int edu_probe(struct pci_dev *pdev, const struct pci_device_id *id)
{
	void __iomem *mmio;
	int rc;

	rc = pcim_enable_device(pdev);
	if (rc)
		return rc;

	mmio = pcim_iomap_region(pdev, 0, "edu_bar");
	if (IS_ERR(mmio))
		return PTR_ERR(mmio);

	dev_info(&pdev->dev, "BAR0 %pR\n", &pdev->resource[0]);
	dev_info(&pdev->dev, "id=0x%08x\n", readl(mmio + EDU_REG_ID));

	writel(0x12345678, mmio + EDU_REG_LIVENESS);
	dev_info(&pdev->dev, "liveness: wrote 0x12345678, read 0x%08x\n",
		 readl(mmio + EDU_REG_LIVENESS));

	pci_set_master(pdev);
	return 0;
}

static const struct pci_device_id edu_ids[] = {
	{ PCI_DEVICE(0x1234, 0x11e8) },
	{ }
};
MODULE_DEVICE_TABLE(pci, edu_ids);

static struct pci_driver edu_driver = {
	.name     = "edu_bar",
	.id_table = edu_ids,
	.probe    = edu_probe,
};
module_pci_driver(edu_driver);
MODULE_LICENSE("GPL");
```

`obj-m += edu_bar.o`를 담은 Kbuild Makefile로 guest 안에서 `make -C /lib/modules/$(uname -r)/build M=$PWD modules`로 빌드해 올린 결과입니다.

```text
edu_bar 0000:00:03.0: enabling device (0000 -> 0002)
edu_bar 0000:00:03.0: BAR0 [mem 0x10000000-0x100fffff]
edu_bar 0000:00:03.0: id=0x010000ed
edu_bar 0000:00:03.0: liveness: wrote 0x12345678, read 0xedcba987
$ grep -i edu_bar /proc/iomem
    10000000-100fffff : edu_bar
```

`enabling device (0000 -> 0002)`는 Command 레지스터의 Memory Space 비트(`PCI_COMMAND_MEMORY` = 0x2)가 켜졌다는 뜻입니다. ID `0x010000ed`는 edu 문서의 형식대로 major 1, minor 0이고, `0x12345678`의 비트 반전이 `0xedcba987`입니다.

`pci_iomap()`이 무엇을 하는지는 소스에 그대로 있습니다. Linux 6.12 `drivers/pci/iomap.c`의 `pci_iomap_range()`는 memory BAR면 `ioremap(start, len)`을 부릅니다. prefetchable 여부와 관계없이 `ioremap()`입니다. `Documentation/driver-api/device-io.rst`는 `ioremap()` 매핑을 uncached, speculative 접근 없음, 재배열 없음, write-combining 없음으로 정의합니다.

## `__iomem`과 sparse

`void __iomem *`는 "이 포인터는 MMIO 주소"라는 표시입니다. gcc는 이 표시를 보지 않으므로, 포인터를 직접 역참조해도 컴파일 경고가 나지 않습니다. 잡아 주는 것은 정적 분석기 sparse입니다.

```c
// SPDX-License-Identifier: GPL-2.0
#include <linux/module.h>
#include <linux/io.h>

static u32 __maybe_unused bad_read(void __iomem *mmio)
{
	return *(u32 *)(mmio + 0x10);   /* __iomem 포인터를 직접 역참조 */
}
MODULE_LICENSE("GPL");
```

같은 guest에서 sparse 0.6.4를 깔고 Kbuild의 `C=2`로 돌린 결과입니다.

```text
$ make -C /lib/modules/$(uname -r)/build M=$PWD C=2 modules
/root/p03s/bad_deref.c:7:18: warning: cast removes address space '__iomem' of expression
```

직접 역참조를 쓰지 말아야 하는 이유는 경고 때문만이 아닙니다. 아래 순서 보장은 `readl()`/`writel()` 같은 접근 함수가 제공하는 것이고, 포인터 역참조에는 없습니다.

## MMIO 순서와 barrier

DMA 버퍼를 채운 뒤 장치 레지스터에 "시작"을 쓰는 순서가 뒤바뀌면, 장치가 아직 채워지지 않은 버퍼를 읽습니다. `Documentation/memory-barriers.txt`의 "KERNEL I/O BARRIER EFFECTS" 절은 `writeX()`에 대해 이렇게 보장합니다. CPU가 장치에 `writeX()`를 하기 전에, 같은 스레드가 앞서 한 메모리 쓰기가 모두 완료됩니다. 그래서 `dma_alloc_coherent()` 버퍼를 채우고 `writel()`로 시작 레지스터를 치는 코드에는 별도의 barrier가 필요 없습니다.

arm64에서 이 보장이 어떻게 구현되는지도 소스로 확인할 수 있습니다. `include/asm-generic/io.h`의 `writel()`은 `__io_bw()`를 먼저 부르고, `arch/arm64/include/asm/io.h`는 `__io_bw()`를 `dma_wmb()`로 정의합니다. `arch/arm64/include/asm/io.h`의 `__iowmb()`는 같은 파일이 "arm64-specific, don't use in portable drivers"라고 주석을 단 내부 매크로이므로 드라이버에서 직접 쓸 이유가 없습니다.

```c
memcpy(dma_buf, data, len);          /* 1. coherent 버퍼 채우기 */
writel(DMA_START, mmio + REG_CMD);   /* 2. writel 자체가 1을 먼저 완료시킨다 */
```

## User space에서 BAR 접근

커널 드라이버 없이 user space에서 BAR를 직접 다루는 길도 있습니다. `Documentation/PCI/sysfs-pci.rst`에 따르면 `/sys/bus/pci/devices/<dev>/resource0..N`은 각 BAR를 mmap할 수 있는 파일이고, prefetchable BAR에는 write-combining 매핑용 `resourceN_wc`가 따로 생깁니다.

```c
#include <fcntl.h>
#include <stdint.h>
#include <stdio.h>
#include <sys/mman.h>
#include <unistd.h>

int main(int argc, char **argv)
{
	const char *path = argc > 1 ? argv[1]
		: "/sys/bus/pci/devices/0000:00:03.0/resource0";
	int fd = open(path, O_RDWR | O_SYNC);
	if (fd < 0) { perror("open"); return 1; }

	volatile uint32_t *bar = mmap(NULL, 4096, PROT_READ | PROT_WRITE,
				      MAP_SHARED, fd, 0);
	if (bar == MAP_FAILED) { perror("mmap"); return 1; }

	printf("id       = 0x%08x\n", bar[0x00 / 4]);
	bar[0x04 / 4] = 0xcafef00d;
	printf("liveness = 0x%08x\n", bar[0x04 / 4]);

	munmap((void *)bar, 4096);
	close(fd);
	return 0;
}
```

드라이버를 붙이지 않은 상태에서 돌리면 함정 하나가 드러납니다. Command 레지스터의 Memory Space 비트가 꺼져 있으면 매핑은 성공하지만 장치가 응답하지 않습니다.

```text
$ setpci -s 00:03.0 COMMAND
0000
$ ./barmap
id       = 0xffffffff
liveness = 0xffffffff
$ setpci -s 00:03.0 COMMAND=0002:0002
$ ./barmap
id       = 0x010000ed
liveness = 0x35010ff2
```

`0xcafef00d`의 비트 반전이 `0x35010ff2`입니다. "레지스터가 전부 `0xffffffff`로 읽힌다"는 증상을 보면 Command 레지스터부터 확인합니다.

DPDK 같은 user-space 드라이버 프레임워크는 sysfs보다 VFIO를 씁니다. DPDK 문서(26.11.0-rc3) Getting Started Guide의 Linux Drivers 장은 DPDK가 쓰는 포트를 `vfio-pci`에 묶을 것을 권하고, IOMMU가 없으면 `vfio-pci`를 no-IOMMU 모드로 쓸 수 있다고 적습니다.

## VFIO

VFIO는 장치를 user space나 VM에 통째로 넘기는 커널 프레임워크입니다. 장치가 하는 DMA를 IOMMU로 가두는 것이 전제라서, IOMMU가 없는 이 VM(`/sys/kernel/iommu_groups`가 비어 있음)에서 edu를 `vfio-pci`에 묶으면 실패합니다.

```text
$ modprobe vfio-pci
$ echo vfio-pci > /sys/bus/pci/devices/0000:00:03.0/driver_override
$ echo 0000:00:03.0 > /sys/bus/pci/drivers_probe
vfio-pci 0000:00:03.0: probe with driver vfio-pci failed with error -22
```

`-22`는 `-EINVAL`입니다. Linux 6.12 `drivers/vfio/group.c`의 `vfio_group_find_or_alloc()`은 장치에 IOMMU group이 없고 `vfio_noiommu`도 켜져 있지 않으면 `ERR_PTR(-EINVAL)`을 돌려줍니다. 실제 passthrough는 IOMMU(arm64의 SMMU, x86의 VT-d/AMD-Vi)가 있는 시스템에서 합니다.

## Bus Master — DMA를 켜는 비트

`Documentation/PCI/pci.rst`는 `pci_set_master()`가 Command 레지스터의 bus master 비트를 켜서 DMA를 활성화한다고 설명합니다. 이 비트를 빼먹으면 어떻게 되는지 edu의 DMA 엔진으로 확인했습니다. 4 KB 버퍼를 `0xa5`로 채워 RAM → edu 내부 버퍼 → 다른 RAM 버퍼로 왕복 복사하는 모듈을, `pci_set_master()`를 부르는 경우와 빼먹는 경우로 나눠 올렸습니다(edu는 기본 DMA mask가 28비트라 `-device edu,dma_mask=0xffffffffff`로 띄웠습니다).

```text
edu_dma 0000:00:03.0: master=0 a_dma=0x0000000104630000 rc=0 b[0]=0x00 b[4095]=0x00 MISMATCH
edu_dma 0000:00:03.0: master=1 a_dma=0x0000000131bf6000 rc=0 b[0]=0xa5 b[4095]=0xa5 match
```

bus master 비트가 꺼진 쪽은 DMA가 "완료"(`rc=0`, 장치의 RUN 비트가 내려감)됐는데도 목적지 버퍼가 0 그대로입니다. QEMU는 bus master 비트가 꺼지면 장치의 DMA 주소 공간 창을 비활성화하므로(`hw/pci/pci.c`의 `bus_master_enable_region`), 장치의 DMA 요청이 메모리에 닿지 않습니다. 에러도 경고도 없이 데이터만 틀리기 때문에 이 실수는 찾기 어렵습니다.

## SoC가 Root Complex일 때

임베디드 SoC 중에는 PCIe root port를 내장한 것이 있습니다. 예를 들어 AMD DS891 v1.11.1에 따르면 Zynq UltraScale+ MPSoC의 PS에 있는 PCIe 블록은 PCI Express Base Specification 2.1을 따르고, Gen1/Gen2 속도로 x1·x2·x4 lane을 지원하며, endpoint 또는 단일 링크 root port로 동작합니다. root port 모드에서는 ECAM으로 config 요청을 만듭니다.

링크가 협상한 속도와 폭은 `lspci -vv`의 `LnkCap`(장치가 지원하는 최대)과 `LnkSta`(현재 협상된 값)로 봅니다. VM의 NVMe 컨트롤러는 둘 다 2.5 GT/s x1이었고, 같은 VM의 QEMU root port는 `LnkCap: Speed 16GT/s, Width x32`인데 `LnkSta: Speed 2.5GT/s, Width x1`이었습니다. 이 root port 아래에 붙은 igb의 `LnkCap`이 2.5 GT/s x1이었고, QEMU는 링크 학습을 흉내 내지 않고 `hw/pci/pcie.c`의 `pcie_sync_bridge_lnk()`에서 아래 장치의 `LnkSta`를 root port에 복사합니다. 실제 하드웨어에서는 양쪽이 링크 학습으로 정하는 값입니다. `LnkSta`가 기대보다 낮을 때는 이렇게 링크 반대편의 `LnkCap`을 함께 봐야 원인이 어느 쪽인지 알 수 있습니다.

## Endpoint 쪽에서 BAR 만들기

SoC가 반대로 endpoint가 되어 외부 host에 BAR를 보여 줄 수도 있습니다. Linux는 이를 PCI endpoint framework(`drivers/pci/endpoint/`)로 다룹니다. 참고 구현인 `pci-epf-test.c`는 BAR마다 크기를 정하고(`bar_size[] = { 512, 512, 1024, 16384, 131072, 1048576 }`), `pci_epf_alloc_space()`로 로컬 메모리를 확보한 뒤 `pci_epc_set_bar()`로 컨트롤러에 BAR를 설정합니다.

크기 규칙도 이 함수에 있습니다. `drivers/pci/endpoint/pci-epf-core.c`의 `pci_epf_alloc_space()`는 128바이트보다 작은 요청을 128로 올리고, 컨트롤러가 정렬값을 주지 않으면 `roundup_pow_of_two()`로 2의 거듭제곱에 맞춥니다. BAR가 고정 크기(`BAR_FIXED`)인 컨트롤러에서 그보다 큰 크기를 요청하면 "requested BAR size is larger than fixed size"로 실패합니다. 앞의 sizing 절차가 2의 거듭제곱 크기만 표현할 수 있으니 당연한 결과이기도 합니다. 장치 쪽 코드가 BAR보다 큰 영역을 쓰기로 했다면 host는 BAR 크기만큼만 보게 됩니다.

## AER — 링크 에러 보고

PCIe의 Advanced Error Reporting(AER)은 장치가 에러를 기록하고 root port로 보고하는 capability입니다. QEMU monitor의 `pcie_aer_inject_error` 명령으로 root port에 correctable receiver error를 주입했습니다.

```text
(qemu) pcie_aer_inject_error rp1 RCVR
OK id: rp1 root bus: 0000:00, bus: 0 devfn: 4.0
```

guest 커널의 AER 드라이버가 이를 받아 이렇게 기록했습니다.

```text
[  115.218273] pcieport 0000:00:04.0: AER: Correctable error message received from 0000:00:04.0
[  115.219083] pcieport 0000:00:04.0: PCIe Bus Error: severity=Correctable, type=Physical Layer, (Receiver ID)
[  115.219662] pcieport 0000:00:04.0:   device [1b36:000c] error status/mask=00000001/0000e000
[  115.220329] pcieport 0000:00:04.0:    [ 0] RxErr                  (First)
$ grep -E "RxErr|TOTAL" /sys/bus/pci/devices/0000:00:04.0/aer_dev_correctable
RxErr 1
TOTAL_ERR_COR 1
```

같은 에러를 root port 아래의 igb NIC에 주입했을 때는 결과가 달랐습니다. 장치의 `CESta`에는 `RxErr+`가 남았지만 커널 로그와 `aer_dev_correctable`에는 아무것도 없었습니다. 그 장치의 `DevCtl`이 `CorrErr- NonFatalErr- FatalErr- UnsupReq-`, 즉 에러 보고가 꺼진 상태였습니다. `setpci`로 해당 비트에 `000f`를 써도 `-`로 남았는데, QEMU v11.1.0의 igb 모델(`hw/net/igb.c`)은 root port와 달리 이 비트들을 쓰기 가능하게 만드는 `pcie_cap_deverr_init()`을 부르지 않기 때문입니다. 그리고 QEMU `hw/pci/pcie_aer.c`는 `DevCtl`의 CERE(Correctable Error Reporting Enable)가 꺼진 장치에서는 correctable 에러 메시지를 위로 보내지 않으므로, root port의 AER 드라이버에는 아무것도 도착하지 않습니다. Linux는 `pci_aer_init()`에서 이 비트를 켜려고 하지만(`drivers/pci/pcie/aer.c`), 장치가 받아 주지 않으면 소용이 없습니다. "AER 로그가 없다"가 "에러가 없다"를 뜻하지는 않으므로, 의심되는 장치는 `lspci -vv`의 `CESta`/`UESta`를 직접 봅니다.

## 자주 하는 실수

> ⚠️ 64-bit BAR를 32-bit로만 읽음

BAR0 하위 비트가 `0x4`이면 BAR1이 상위 32비트입니다. 커널 드라이버는 `pci_resource_start()`가 이미 합친 값을 주므로 직접 BAR를 읽지 말고 이 함수를 씁니다.

> ⚠️ Memory Space 비트가 꺼진 채 접근

`pci_enable_device()`(또는 `pcim_enable_device()`)를 부르지 않거나 user space에서 sysfs로 바로 접근하면 Command 레지스터의 Memory 비트가 꺼져 있을 수 있습니다. 앞의 실습처럼 모든 레지스터가 `0xffffffff`로 읽힙니다.

> ⚠️ Bus Master 비활성

`pci_set_master()`를 빼먹으면 앞의 실습처럼 DMA가 완료된 것처럼 보이는데 데이터가 오지 않습니다.

> ⚠️ prefetchable이라고 레지스터를 WC로 매핑

`device-io.rst`에 따르면 `ioremap_wc()`는 CPU가 실행하지 않은 읽기를 투기적으로 내보낼 수 있고 여러 쓰기를 합칠 수도 있습니다. 같은 문서는 `IORESOURCE_PREFETCH`가 붙은 영역에서만 WC가 대체로 안전하다고 적습니다. 읽기에 부작용이 있는 레지스터(읽으면 지워지는 status 등)는 non-prefetchable BAR에 두고 `ioremap()`/`pci_iomap()`으로 매핑합니다.

## 정리

- BAR 크기는 all-ones를 쓰고 다시 읽어 구합니다. edu BAR0는 `0xfff00000`이 돌아와 1 MB입니다.
- 64-bit BAR는 다음 BAR를 상위 32비트로 씁니다(NVMe BAR0 `0x10300004` + BAR1 `0`).
- 배정 주소는 enumeration이 정하고 부팅마다 바뀔 수 있으므로, 드라이버는 `pcim_iomap_region()`/`pci_iomap()`으로 받아 씁니다.
- MMIO는 `readl()`/`writel()`로만 접근합니다. `writel()`은 앞선 메모리 쓰기를 먼저 완료시키고, sparse(`C=2`)가 `__iomem` 직접 역참조를 잡습니다.
- 레지스터가 `0xffffffff`면 Memory Space 비트를, DMA 데이터가 안 오면 Bus Master 비트를 먼저 봅니다.
- VFIO는 IOMMU group이 필요하고, AER 로그는 `DevCtl`의 보고 비트가 켜진 장치에서만 나옵니다.

다음 편은 **AXI 인터페이스**입니다.

## 관련 항목

- [11-04: AXI 인터페이스](/blog/embedded/modern-recipes/part11-04-axi)
- [11-06: Mailbox Protocol](/blog/embedded/modern-recipes/part11-06-mailbox)
- [11-07: CQ·SQ](/blog/embedded/modern-recipes/part11-07-cq-sq)
- [PCIe Ch 4: BAR & MMIO](/blog/embedded/hardware/pcie/chapter04-bar-mmio)
