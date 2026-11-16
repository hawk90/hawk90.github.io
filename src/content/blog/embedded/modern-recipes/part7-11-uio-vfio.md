---
title: "UIO·VFIO 분석 — User-Space Driver와 IOMMU 격리"
slug: "embedded/modern-recipes/part7-11-uio-vfio"
date: 2026-04-16T09:10:00
description: "UIO로 QEMU에서 장치 메모리·interrupt를 사용자 공간에 열어 직접 돌려 보고, VFIO의 IOMMU 격리와 사용 순서를 커널 문서로 정리합니다."
series: "Modern Embedded Recipes"
seriesOrder: 85
tags: [recipes, uio, vfio, iommu, dpdk, spdk]
topics: ["embedded"]
---

## 한 줄 요약

> **"UIO는 장치의 메모리 영역과 interrupt를 사용자 공간에 그대로 열어 주고, VFIO는 거기에 IOMMU 격리를 더해 DMA까지 사용자 공간에 맡깁니다."** 커널 쪽은 얇게 두고 장치 제어 로직을 사용자 공간 프로그램에 두는 방식입니다. 이 글의 UIO 부분은 QEMU `virt` 보드에서 Linux v6.12로 직접 돌렸고, VFIO는 IOMMU가 없는 VM이라 API 확인까지만 돌렸습니다.

## 어떤 상황에서 쓰나

FPGA에 새로 넣은 레지스터 블록을 빨리 시험해야 할 때, 정식 커널 driver를 쓰기 전에 UIO로 레지스터를 사용자 공간에 열고 C 프로그램으로 동작을 확인할 수 있습니다. 시험 코드가 잘못된 주소를 건드려 죽어도 그 process만 죽습니다. 다만 UIO는 장치의 DMA를 막지 않으므로, 장치가 DMA로 엉뚱한 메모리를 쓰는 것까지 막아 주지는 않습니다.

NIC·NVMe처럼 DMA가 핵심인 장치를 사용자 공간에서 다루려면 VFIO가 필요합니다. VFIO는 장치를 IOMMU group 단위로 사용자에게 넘기고, 장치가 DMA로 접근할 수 있는 주소를 IOMMU가 사용자가 등록한 범위로 제한합니다. DPDK·SPDK가 이 경로를 씁니다. 집 열쇠를 맡기면서 들어갈 수 있는 방은 정해 두는 것과 같습니다.

## 핵심 개념

| 인터페이스 | 노출 방식 | DMA | 쓰는 곳 |
|---|---|---|---|
| UIO | 메모리 영역(mmap)과 interrupt(read/poll)를 `/dev/uioN`으로 | 보호 없음. 장치는 물리 주소로 아무 데나 쓸 수 있음 | DMA 없는 장치, FPGA bring-up |
| VFIO | IOMMU group 단위로 장치를 넘기고 region·IRQ·DMA를 ioctl로 | 사용자가 `VFIO_IOMMU_MAP_DMA`로 등록한 범위만 IOMMU가 허용 | DPDK·SPDK, 가상 머신 장치 할당 |

VFIO의 격리는 IOMMU가 있어야 성립합니다. IOMMU 없이 VFIO를 쓰는 no-IOMMU 모드도 있지만, 커널 설정 설명은 이것을 "non-secure mode"라고 적고(v6.12 `drivers/vfio/Kconfig:63-71`), 이 모드로 group을 만들면 커널에 taint를 남깁니다(`drivers/vfio/group.c:674-685`).

## 코드 / 실제 사용 예

### UIO — QEMU에서 직접 돌리기

커널 쪽 driver를 새로 쓰지 않고 v6.12의 `uio_pdrv_genirq`를 썼습니다. 이 driver는 DT 노드의 메모리 영역과 interrupt를 UIO로 열어 주고, interrupt가 오면 `disable_irq_nosync()`로 line을 끈 뒤 사용자 공간이 `/dev/uioX`에 1을 쓰면 다시 켭니다(`Documentation/driver-api/uio-howto.rst:399-404`, `drivers/uio/uio_pdrv_genirq.c:71`, `:77-96`). DT에서 쓰려면 모듈 파라미터 `of_id`에 노드의 `compatible`을 줍니다(같은 문서 411-413행).

QEMU `virt` DTB를 덤프해([7-03](/blog/embedded/modern-recipes/part7-03-device-tree-basics)) 루트 끝에 아래 노드를 더했습니다. 레지스터 대신 RAM 끝의 `no-map` 예약 영역 4 KiB를 장치 메모리로 쓰고, interrupt는 GIC SPI 100입니다.

```dts
	reserved-memory {
		#address-cells = <2>;
		#size-cells = <2>;
		ranges;

		uio_regs: uio-regs@7f000000 {
			reg = <0x0 0x7f000000 0x0 0x1000>;
			no-map;
		};
	};

	uio-demo@7f000000 {
		compatible = "myco,uio-demo";
		reg = <0x0 0x7f000000 0x0 0x1000>;
		interrupts = <0x0 0x64 0x4>;
	};
```

커널은 [7-08](/blog/embedded/modern-recipes/part7-08-platform-driver)과 같은 v6.12 arm64 `defconfig`(+`CONFIG_DYNAMIC_DEBUG`) 빌드이고, 이 설정에는 UIO가 꺼져 있어 `drivers/uio/uio.c`와 `uio_pdrv_genirq.c`만 같은 트리에 대해 외부 모듈로 빌드했습니다.

```bash
mkdir uio && cp linux-6.12/drivers/uio/uio.c linux-6.12/drivers/uio/uio_pdrv_genirq.c uio/
echo "obj-m += uio.o uio_pdrv_genirq.o" > uio/Kbuild
make -C linux-6.12 M=$PWD/uio modules
```

장치 쪽 interrupt를 낼 하드웨어가 없으므로, 시험 프로그램은 `/dev/mem`으로 GIC distributor의 set-pending 레지스터(`GICD_ISPENDR`)에 해당 INTID 비트를 써서 장치가 line을 올린 것처럼 만듭니다. QEMU `virt`의 GIC distributor는 0x08000000이고(덤프한 DT의 `intc@8000000`), SPI 100은 INTID 132입니다.

```c
#include <fcntl.h>
#include <poll.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <sys/mman.h>
#include <unistd.h>

#define GICD_BASE    0x08000000UL   /* QEMU virt GIC distributor (GICv2 by default) */
#define GICD_ISPENDR 0x200          /* set-pending registers, one bit per INTID */
#define INTID        (32 + 100)     /* SPI 100 from the DT node */

static void cat(const char *path)
{
	char buf[64] = "";
	FILE *f = fopen(path, "r");
	if (f) { fgets(buf, sizeof buf, f); fclose(f); }
	printf("%s: %s", path, buf);
}

static void pend_irq(void)            /* stand-in for the device raising its line */
{
	int fd = open("/dev/mem", O_RDWR | O_SYNC);
	volatile uint32_t *gicd = mmap(NULL, 0x1000, PROT_READ | PROT_WRITE, MAP_SHARED, fd, GICD_BASE);
	gicd[(GICD_ISPENDR + 4 * (INTID / 32)) / 4] = 1u << (INTID % 32);
	munmap((void *)gicd, 0x1000);
	close(fd);
}

int main(void)
{
	cat("/sys/class/uio/uio0/name");
	cat("/sys/class/uio/uio0/maps/map0/addr");
	cat("/sys/class/uio/uio0/maps/map0/size");

	int fd = open("/dev/uio0", O_RDWR);
	volatile uint32_t *regs = mmap(NULL, 4096, PROT_READ | PROT_WRITE, MAP_SHARED, fd, 0 * getpagesize());
	regs[0] = 0xcafef00d;
	printf("regs[0] after write: 0x%08x\n", regs[0]);

	struct pollfd p = { .fd = fd, .events = POLLIN };
	printf("poll before any interrupt: %d\n", poll(&p, 1, 200));

	uint32_t count, on = 1;
	for (int i = 0; i < 2; i++) {
		pend_irq();
		read(fd, &count, sizeof count);   /* blocks until the interrupt */
		printf("interrupt %d: event count=%u\n", i, count);
		if (i == 0) {
			pend_irq();                   /* line is disabled now: nothing arrives */
			printf("second pend without re-enable, poll: %d\n", poll(&p, 1, 200));
			write(fd, &on, sizeof on);    /* irqcontrol: enable_irq() */
			printf("after write(1), poll: %d\n", poll(&p, 1, 200));
		}
	}
	return 0;
}
```

initramfs의 `/init`은 두 모듈을 올리고 시험 프로그램을 돌립니다.

```bash
#!/bin/busybox sh
B=/bin/busybox
$B mount -t proc proc /proc
$B mount -t sysfs sysfs /sys
$B mount -t devtmpfs devtmpfs /dev
$B insmod /uio.ko
$B insmod /uio_pdrv_genirq.ko of_id=myco,uio-demo
$B ls -l /dev/uio0
/uiotest
$B grep -i uio /proc/interrupts
$B poweroff -f
```

```text
crw-------    1 0        0         511,   0 Nov 16 14:36 /dev/uio0
/sys/class/uio/uio0/name: uio-demo@7f000000
/sys/class/uio/uio0/maps/map0/addr: 0x000000007f000000
/sys/class/uio/uio0/maps/map0/size: 0x0000000000001000
regs[0] after write: 0xcafef00d
poll before any interrupt: 0
interrupt 0: event count=1
second pend without re-enable, poll: 0
after write(1), poll: 1
interrupt 1: event count=2
 22:          2 GIC-0 132 Level     uio-demo@7f000000
```

출력에서 보이는 것은 다음과 같습니다.

- `/sys/class/uio/uio0/maps/map0/`의 `addr`·`size`가 DT의 `reg`와 같고, `mmap`의 offset 0이 map0입니다(N번째 영역은 `N * getpagesize()`, `uio-howto.rst:171-176`). 쓴 값이 그대로 읽혔습니다.
- interrupt가 없을 때 `poll`은 0이었고, set-pending으로 interrupt를 하나 내자 `read`가 event count 1을 돌려줬습니다. `read`는 4바이트 signed 32비트 count만 받습니다(`uio-howto.rst:516-525`).
- 그 직후 한 번 더 pending을 걸었지만 `poll`은 0이었습니다. `uio_pdrv_genirq`가 첫 interrupt에서 line을 꺼 두었기 때문입니다. `write(fd, &on, 4)`로 다시 켜자 기다리던 interrupt가 바로 들어와 `poll`이 1, count가 2가 됐습니다.
- `/proc/interrupts`에서 이 line(GIC INTID 132, Level)은 2번 들어왔습니다.

장치 이름은 `uio-demo@7f000000`로 unit address까지 붙었습니다. uio-howto는 기본 이름이 "node's name (without the unit address)"라고 적지만(같은 문서 413-415행), v6.12 `uio_pdrv_genirq.c:133-134`는 `%pfwP`로 이름을 만들고, 그 형식은 unit address를 포함한 노드 이름입니다(`Documentation/core-api/printk-formats.rst:516`의 예 `endpoint@0`). 이름을 정하려면 노드에 `linux,uio-name`을 줍니다(`uio_pdrv_genirq.c:130-131`).

### 직접 UIO driver를 쓸 때의 interrupt handler

`uio_pdrv_genirq` 대신 자기 UIO driver를 쓰면 handler는 driver가 정합니다. uio core가 line을 대신 꺼 주지 않으므로, handler가 장치의 status 레지스터를 보고 자기 interrupt면 장치 쪽에서 ack하거나 막은 뒤 `IRQ_HANDLED`를, 아니면 `IRQ_NONE`을 돌려줍니다(`uio-howto.rst:340-352`). `irqcontrol`을 구현하지 않은 driver에 `write`하면 `-ENOSYS`입니다(같은 문서 105-110행).

### VFIO — 이 VM에서 확인한 것

Debian 13 arm64 VM(커널 `6.12.116+deb13-arm64`)에서 `vfio-pci`를 올리고 container의 API와 IOMMU backend 지원을 물었습니다.

```c
#include <fcntl.h>
#include <linux/vfio.h>
#include <stdio.h>
#include <sys/ioctl.h>
int main(void)
{
	int c = open("/dev/vfio/vfio", O_RDWR);
	if (c < 0) { perror("open /dev/vfio/vfio"); return 1; }
	printf("VFIO_GET_API_VERSION = %d (VFIO_API_VERSION %d)\n", ioctl(c, VFIO_GET_API_VERSION), VFIO_API_VERSION);
	printf("CHECK_EXTENSION TYPE1 = %d, TYPE1v2 = %d, NOIOMMU = %d\n",
	       ioctl(c, VFIO_CHECK_EXTENSION, VFIO_TYPE1_IOMMU),
	       ioctl(c, VFIO_CHECK_EXTENSION, VFIO_TYPE1v2_IOMMU),
	       ioctl(c, VFIO_CHECK_EXTENSION, VFIO_NOIOMMU_IOMMU));
	return 0;
}
```

```bash
gcc -O2 -Wall -o vfiochk vfiochk.c
modprobe vfio-pci
ls /sys/kernel/iommu_groups/ | wc -l
./vfiochk
```

```text
0
VFIO_GET_API_VERSION = 0 (VFIO_API_VERSION 0)
CHECK_EXTENSION TYPE1 = 1, TYPE1v2 = 1, NOIOMMU = 0
```

API와 type1 IOMMU backend는 지원하지만, 이 VM에는 IOMMU가 없어(QEMU `virt`에 IOMMU를 붙이지 않았음) `/sys/kernel/iommu_groups/`가 비어 있습니다(`0`). VFIO는 IOMMU group이 없는 장치에 대해 no-IOMMU 모드가 아니면 group을 만들지 않으므로(`drivers/vfio/group.c:673-690`의 `-EINVAL`), 이 VM의 장치를 `vfio-pci`에 묶는 단계부터는 실행하지 않았습니다. 이 VM의 PCI 장치는 SSH가 쓰는 virtio-net과 root 디스크인 virtio-blk뿐이라 떼어 낼 수도 없었습니다.

### VFIO 사용 순서 (커널 문서의 예)

장치를 `vfio-pci`에 묶는 것은 sysfs로 합니다. 커널 문서의 예는 장치의 IOMMU group을 확인하고, 원래 driver에서 떼고, `vfio-pci`의 `new_id`에 vendor·device ID를 쓰는 순서입니다(v6.12 `Documentation/driver-api/vfio.rst:120-140`).

```bash
readlink /sys/bus/pci/devices/0000:06:0d.0/iommu_group
echo 0000:06:0d.0 > /sys/bus/pci/devices/0000:06:0d.0/driver/unbind
echo 1102 0002 > /sys/bus/pci/drivers/vfio-pci/new_id
ls /dev/vfio
```

`/dev/vfio/<group 번호>`가 생기면, 사용자 프로그램은 container를 열고 group이 쓸 수 있는 상태(viable)인지 확인한 뒤 container에 넣고, IOMMU 모델을 고르고, DMA 범위를 등록하고, 장치 fd를 받습니다. 아래는 같은 문서 168-240행의 예를 줄인 것입니다.

```c
container = open("/dev/vfio/vfio", O_RDWR);
group = open("/dev/vfio/26", O_RDWR);

ioctl(group, VFIO_GROUP_GET_STATUS, &group_status);
if (!(group_status.flags & VFIO_GROUP_FLAGS_VIABLE))
	/* not all devices in the group are bound to vfio */;

ioctl(group, VFIO_GROUP_SET_CONTAINER, &container);
ioctl(container, VFIO_SET_IOMMU, VFIO_TYPE1_IOMMU);

dma_map.vaddr = (uintptr_t)mmap(0, 1024 * 1024, PROT_READ | PROT_WRITE,
				MAP_PRIVATE | MAP_ANONYMOUS, 0, 0);
dma_map.size = 1024 * 1024;
dma_map.iova = 0;           /* 1 MiB at IOVA 0 from the device's view */
dma_map.flags = VFIO_DMA_MAP_FLAG_READ | VFIO_DMA_MAP_FLAG_WRITE;
ioctl(container, VFIO_IOMMU_MAP_DMA, &dma_map);

device = ioctl(group, VFIO_GROUP_GET_DEVICE_FD, "0000:06:0d.0");
```

장치에는 `iova`를 DMA 주소로 알려 줍니다. IOMMU가 장치의 DMA 주소 `iova`를 위 `mmap` 영역의 물리 page로 바꾸고, 등록하지 않은 주소로 가는 DMA는 IOMMU가 막습니다. 이 순서는 IOMMU가 있는 장비가 없어 실행하지 않았습니다.

### DPDK·SPDK

DPDK 문서는 DPDK가 쓰는 포트의 커널 모듈로 모든 경우에 `vfio-pci`를 권장하고, 묶는 도구로 `dpdk-devbind.py`를 씁니다(DPDK v23.11 `doc/guides/linux_gsg/linux_drivers.rst:30-48`). SPDK 문서는 IOMMU가 있고 켜져 있으면 SPDK 응용을 `vfio-pci`로 배포하라고 권하고, `scripts/setup.sh`가 그 경우 `vfio-pci`를 고른다고 적습니다(SPDK v24.01 `doc/system_configuration.md:7-9`). 이 글에서는 두 도구 모두 실행하지 않았고, 처리량 수치도 재지 않았습니다. 참고로 10 GbE에서 64 B 프레임의 이론 최대 전송률은 프레임 64 B에 preamble·SFD 8 B와 inter-frame gap 12 B를 더한 84 B마다 한 프레임이라, 10×10⁹ / (84 × 8) ≈ 14.88 Mpps입니다(계산값).

## 측정 / 성능 비교

이 글에서 잰 것은 위 UIO 실행의 동작(값이 아니라 순서)뿐입니다. UIO의 interrupt 지연, VFIO를 쓰는 DPDK·SPDK의 처리량은 해당 장치가 없어 재지 않았습니다.

## 자주 보는 함정

> ⚠️ UIO에서 사용자 공간 주소를 DMA 주소로 넘김

```c
HW_REG_DMA_ADDR = (uint32_t)(uintptr_t)buf;   /* virtual address, not a bus address */
```

`buf`는 process의 가상 주소라 장치가 쓰는 버스 주소가 아닙니다. UIO는 DMA 주소를 만들어 주지도, 장치의 DMA를 막지도 않습니다. DMA가 필요하면 VFIO의 `VFIO_IOMMU_MAP_DMA`나 커널 driver의 DMA API([8-04](/blog/embedded/modern-recipes/part8-04-dma-allocator))를 씁니다.

> ⚠️ IOMMU group의 다른 장치를 그대로 둠

커널 문서는 group 안의 장치가 모두 VFIO driver에 묶여야(또는 host driver에서 떼어져야) group에 대한 동작이 허용된다고 적습니다(`vfio.rst:91-96`). 위 순서의 `VFIO_GROUP_FLAGS_VIABLE` 확인이 그 검사입니다. `/sys/kernel/iommu_groups/<번호>/devices/`에서 같은 group의 장치를 먼저 봅니다.

> ⚠️ IOMMU 없이 VFIO

위 VM처럼 IOMMU group이 하나도 없으면 VFIO는 장치를 받을 수 없습니다. `enable_unsafe_noiommu_mode`(`drivers/vfio/vfio_main.c:58-60`)로 강제하면 격리 없이 동작하고 커널에 taint가 남습니다. Arm SoC라면 SMMU가 DT에 기술되고 그 driver가 켜져 있어야 IOMMU group이 생깁니다.

> ⚠️ `uio_pdrv_genirq`에서 interrupt를 다시 켜지 않음

위 실행의 `second pend without re-enable, poll: 0`처럼, 첫 interrupt 뒤에는 `write(fd, &on, 4)`를 하기 전까지 다음 interrupt가 오지 않습니다.

> ⚠️ `/dev/mem`으로 레지스터에 접근

위 시험 프로그램은 GIC를 흉내 내려고 `/dev/mem`을 썼지만, 장치 driver를 이 방식으로 만들면 프로그램이 물리 주소 공간 전체를 건드릴 수 있습니다. 이 커널은 `CONFIG_STRICT_DEVMEM=y`라 RAM 영역은 막히지만 I/O 영역은 열려 있었습니다. 장치 하나의 영역만 열어 주는 UIO나 VFIO를 씁니다.

## 정리

- UIO는 장치 메모리를 `mmap`으로, interrupt를 `read`/`poll`의 event count로 사용자 공간에 엽니다.
- `uio_pdrv_genirq`는 interrupt마다 line을 끄고, 사용자 공간이 `/dev/uioX`에 1을 써야 다시 켭니다. 이 실행에서 그 사이에 걸린 interrupt는 다시 켜는 순간 들어왔습니다.
- UIO는 DMA를 보호하지 않습니다. DMA가 필요하면 IOMMU가 있는 VFIO나 커널 DMA API를 씁니다.
- VFIO는 IOMMU group 단위로 장치를 넘기고, `VFIO_IOMMU_MAP_DMA`로 등록한 범위만 장치의 DMA에 열어 줍니다.
- IOMMU가 없으면 VFIO는 group을 만들지 않고, no-IOMMU 모드는 격리 없이 taint를 남깁니다.

다음 편은 **sysfs**입니다.

## 관련 항목

- [7-06: Kernel Module](/blog/embedded/modern-recipes/part7-06-kernel-module)
- [7-08: Platform 드라이버](/blog/embedded/modern-recipes/part7-08-platform-driver)
- [7-09: mmap](/blog/embedded/modern-recipes/part7-09-mmap)
- [PE 3-03: DMA Performance](/blog/embedded/performance-engineering/part3-03-dma-performance)
