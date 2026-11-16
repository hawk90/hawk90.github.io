---
title: "Zynq PS-PL 통신 — GP·HP·ACP 인터페이스 선택"
slug: "embedded/modern-recipes/part11-05-ps-pl-communication"
date: 2026-04-20T09:04:00
description: "Zynq-7000의 M_AXI_GP·S_AXI_GP·S_AXI_HP·S_AXI_ACP를 UG585 TRM 기준으로 비교하고, Linux에서 PL 레지스터에 접근하는 /dev/mem·UIO·DMA API 경로를 QEMU에서 직접 돌려 봅니다."
series: "Modern Embedded Recipes"
seriesOrder: 127
tags: [recipes, fpga, zynq, ps-pl, axi]
topics: ["embedded"]
---

## 한 줄 요약

> **"Zynq의 GP·HP·ACP는 폭·버퍼·cache coherency가 다른 세 갈래 길입니다."** 레지스터 제어는 GP, DDR 대량 전송은 HP, CPU cache와 공유하는 중간 크기 데이터는 ACP로 보냅니다.

## 어떤 상황에서 쓰나

Zynq처럼 Arm 코어(PS)와 FPGA fabric(PL)이 한 칩에 있으면, 둘이 데이터를 주고받을 때마다 어떤 포트를 쓸지 정해야 합니다. 같은 4 KB를 옮겨도 포트에 따라 거치는 버퍼와 cache가 다르므로, 고르기 전에 각 포트가 무엇에 연결되어 있는지부터 알아야 합니다.

비유하면 GP는 사무실 내선 전화, HP는 물류 창고로 바로 가는 화물 도크, ACP는 CPU 책상 옆 공용 서랍입니다. 서랍에 넣으면 CPU가 바로 꺼내 쓰지만, 큰 짐을 넣으면 서랍이 넘칩니다.

### 이 글의 출처와 실행 환경

- Zynq-7000 포트 사양은 AMD **UG585**(Zynq 7000 SoC Technical Reference Manual, v1.15, 2026-02-06 게시)의 "PS–PL AXI Interfaces", "AXI_GP Interfaces", "AXI_HP Interfaces", "AXI_ACP Interface", "ACP Limitations", "PL DMA via …" 절과 System Address Map 표에서 가져왔습니다.
- **Zynq 보드는 돌리지 않았습니다.** 포트별 throughput 숫자는 이 글에 없습니다. 원래 글의 실측 표는 출처가 없어 지웠습니다.
- Linux 쪽 접근 방법(`/dev/mem`, UIO, 인터럽트 대기)은 QEMU 11.1.3 `virt` + Debian 13 arm64 guest(커널 `6.12.116+deb13-arm64`)에서 QEMU 교육용 PCI 장치 edu를 PL 주변장치 대신 써서 돌렸습니다. 주소와 버스는 Zynq와 다르지만 커널 API와 동작은 같습니다. 시간 측정값은 이 VM의 것이고 Zynq의 값이 아닙니다.

## 인터페이스 종류

UG585에 따르면 PS 쪽 AXI 인터페이스는 **AXI3** 사양을 따르고, PL로 나가는 AXI 인터페이스는 9개입니다. AXI3이므로 burst는 최대 16 beat입니다(Arm IHI 0022C 13.1.1).

| 인터페이스 | Master → Slave | 데이터 폭 | 연결 | 주 용도 |
|---|---|---|---|---|
| `M_AXI_GP0`, `GP1` | PS → PL | 32-bit | master interconnect | PL 레지스터 제어 |
| `S_AXI_GP0`, `GP1` | PL → PS | 32-bit | slave interconnect | PL에서 PS 주변장치·메모리 접근 |
| `S_AXI_HP0`~`HP3` | PL → PS | 32 또는 64-bit(포트별 설정) | read/write FIFO → DDR 포트 2개 또는 OCM | 대량 DMA |
| `S_AXI_ACP` | PL → PS | 64-bit | SCU(CPU L1·L2와 연결) | cache coherent 접근 |

각 칸의 근거는 다음과 같습니다.

- **AXI_GP**: UG585의 AXI_GP Features 절이 데이터 폭 32, master port issuing capability 8 reads·8 writes, slave port acceptance 8 reads·8 writes를 적습니다. 같은 문서의 Performance 절은 GP가 HP와 달리 FIFO 버퍼 없이 interconnect 포트에 바로 붙어 "general-purpose use only"이고 "not intended to achieve high performance"라고 못 박습니다.
- **AXI_HP**: Features 절에 32/64-bit 포트별 설정, 읽기·쓰기 각각 1 KB(128 × 64 bit) 데이터 FIFO, PL과 PS 사이 비동기 clock crossing, 14~70개 명령(burst 길이에 따라)의 read acceptance가 있습니다.
- **AXI_ACP**: "PL DMA via AXI ACP" 절은 ACP가 64-bit이고 SCU에 붙어 CPU L1·L2와 상호작용하므로 cache flush/invalidate를 피할 수 있으며, PL 인터페이스 중 메모리 지연이 가장 낮다고 설명합니다.

PS가 PL을 보는 주소 창도 정해져 있습니다. UG585 System Address Map 표에서 `M_AXI_GP0`는 `0x4000_0000`~`0x7FFF_FFFF`, `M_AXI_GP1`은 `0x8000_0000`~`0xBFFF_FFFF`입니다. PL에 둔 레지스터 블록의 정확한 주소는 Vivado block design의 Address Editor가 이 창 안에서 배정합니다.

## GP — 레지스터 제어

CPU가 PL 가속기에 "이 주소의 버퍼를 처리해라"라고 알리는 것은 몇 개의 32-bit 쓰기면 됩니다. UG585의 HP DMA 예시 토폴로지도 PL IP를 "저속 control 인터페이스 + 고성능 burst 인터페이스"로 나누고, control 쪽에 `M_AXI_GP`를 쓰는 구성을 그립니다. 상태는 PL→PS 인터럽트로 알릴 수 있다고 덧붙입니다.

PL 쪽 레지스터 블록은 [앞 편의 AXI4-Lite slave](/blog/embedded/modern-recipes/part11-04-axi)를 그대로 쓸 수 있습니다. 그 글에서 시뮬레이션한 `axil_regs.v`가 `M_AXI_GP0` 뒤에 붙는 형태입니다.

## HP — DDR 대량 전송

HP 포트는 PL master가 DDR이나 OCM을 직접 읽고 쓰는 길입니다. UG585에 따르면 HP 포트는 OCM과 DDR 말고 다른 slave에는 접근할 수 없고, 64-bit 포트 4개로 PL 인터페이스 중 가장 큰 총 대역폭을 냅니다. FIFO와 중재 로직 때문에 최소 지연은 다른 인터페이스보다 큽니다.

HP를 잘 쓰기 위한 조건 두 가지가 TRM에 있습니다.

1. **outstanding을 여러 개 띄울 것.** "PL DMA via AXI HP" 절은 HP에 붙은 장치가 HP FIFO를 활용하려면 여러 outstanding transaction을 낼 수 있어야 한다고 적습니다. 효과는 [11-04의 outstanding 모델](/blog/embedded/modern-recipes/part11-04-axi)에서 숫자로 봤습니다.
2. **HP 포트 2개를 쓸 때는 0과 2(또는 1과 3)를 고를 것.** "Interconnect Throughput Bottlenecks" 절에 따르면 포트 0/1과 2/3은 DDR 컨트롤러 앞에서 쌍으로 중재되므로, 포트 2개만 쓴다면 각 쌍에서 하나씩 쓰는 편이 유리합니다.

HP는 CPU cache를 거치지 않습니다. 그래서 CPU가 cache에 남겨 둔 데이터와 PL이 DDR에 쓴 데이터가 어긋나지 않게 소프트웨어가 cache를 관리해야 합니다(아래 "DMA buffer와 cache" 절).

## ACP — cache coherent 접근

ACP는 PL master가 CPU와 같은 SCU 경로로 메모리에 접근하는 포트입니다. coherent로 접근하면 CPU cache에 있는 최신 값을 보고, 쓴 값도 CPU cache와 맞춰지므로 flush/invalidate가 필요 없습니다.

대신 대가가 있습니다. UG585는 ACP 접근이 APU와 같은 interconnect 경로를 써서 CPU 성능을 떨어뜨릴 수 있고, 크고 coherent한 ACP 전송은 cache thrashing을 일으킬 수 있으므로 "가장 큰 데이터 세트보다 작은 것"에 알맞다고 적습니다. "ACP Limitations" 절은 더 구체적인 제약을 나열합니다.

- coherent 메모리에 대한 exclusive·locked access는 허용되지 않습니다.
- `AWLEN = 3`, `AWSIZE = 3`(64-bit × 4 beat)이면서 `WSTRB`가 `11111111`이 아닌 쓰기는 지원되지 않고 CPU의 L1 cache line을 망가뜨릴 수 있습니다. 회피책으로 작은 비최적화 접근, 모든 strobe를 켠 read-modify-write, strobe를 끌 필요가 없게 데이터 구조 정렬을 제시합니다.
- OCM에 ACP로 계속 접근하면 다른 master를 굶길 수 있으므로 burst를 64-bit 8 word보다 작게 조절하라고 권합니다.
- PCIe처럼 쓰기를 읽기보다 우선하는 블록은 deadlock 가능성 때문에 ACP에 연결하지 말라고 합니다.

## 선택 가이드

UG585의 각 절이 권하는 용도를 한 표로 모으면 다음과 같습니다.

| 하려는 일 | 포트 | 근거 |
|---|---|---|
| CPU가 PL 레지스터를 읽고 씀 | `M_AXI_GP` | GP는 general-purpose, control 용도 |
| PL이 PS 주변장치·레지스터를 저속으로 접근 | `S_AXI_GP` | 32-bit라 DMA 용도로는 한계 |
| PL이 DDR에 프레임 버퍼 같은 대량 데이터를 씀 | `S_AXI_HP` | FIFO 버퍼, 최대 총 대역폭 |
| CPU가 곧바로 쓸 중간 크기 데이터를 PL이 만듦 | `S_AXI_ACP` | 가장 낮은 메모리 지연, flush 불필요 |
| 큰 데이터를 coherent하게 주고받음 | `S_AXI_ACP`는 피함 | cache thrashing 경고 |

## Linux에서 PL 레지스터에 접근하기

PS에서 Linux를 돌린다면 PL 레지스터에 닿는 길은 세 가지입니다. 커널 드라이버를 쓰는 방법은 [11-03](/blog/embedded/modern-recipes/part11-03-pcie-bar)과 같으므로, 여기서는 user space에서 가는 두 방법을 VM에서 돌린 결과로 봅니다.

### /dev/mem

물리 주소를 그대로 mmap하는 가장 짧은 길입니다. 디버깅에는 편하지만 커널이 막아 둘 수 있습니다. Debian 6.12 커널은 `CONFIG_STRICT_DEVMEM=y`와 `CONFIG_IO_STRICT_DEVMEM=y`로 빌드되어 있고, `lib/Kconfig.debug`는 `IO_STRICT_DEVMEM`이 켜지면 `/dev/mem`이 `/proc/iomem`에서 *사용 중이 아닌* I/O 메모리만 허용한다고 설명합니다.

```c
#include <fcntl.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <sys/mman.h>
#include <unistd.h>

int main(int argc, char **argv)
{
	off_t phys = argc > 1 ? strtoull(argv[1], NULL, 0) : 0x10000000;
	int fd = open("/dev/mem", O_RDWR | O_SYNC);
	if (fd < 0) { perror("open /dev/mem"); return 1; }
	volatile uint32_t *regs = mmap(NULL, 0x1000, PROT_READ | PROT_WRITE,
				       MAP_SHARED, fd, phys);
	if (regs == MAP_FAILED) { perror("mmap /dev/mem"); return 1; }
	printf("0x%llx: id = 0x%08x\n", (unsigned long long)phys, regs[0]);
	return 0;
}
```

edu 장치의 BAR0(`0x10000000`)에 대해, 드라이버가 그 영역을 잡기 전과 후를 비교했습니다.

```text
$ ./devmem
0x10000000: id = 0x010000ed
$ insmod edu_bar.ko && grep -i edu /proc/iomem
    10000000-100fffff : edu_bar
$ ./devmem
mmap /dev/mem: Operation not permitted
$ rmmod edu_bar && ./devmem
0x10000000: id = 0x010000ed
```

커널 드라이버가 `/proc/iomem`에 영역을 등록하는 순간 `/dev/mem` 접근이 막힙니다. 제품 코드가 `/dev/mem`에 기대면 커널 설정이나 드라이버 하나 때문에 동작이 바뀐다는 뜻입니다.

### UIO

UIO는 "레지스터 mmap과 인터럽트 대기만 커널이 해 주고 나머지는 user space가 하는" 프레임워크입니다. `/dev/uioN`을 mmap하면 장치 메모리가 보이고, `read()`로 4바이트를 읽으면 다음 인터럽트까지 잠들었다가 누적 인터럽트 횟수를 받습니다(`drivers/uio/uio.c`의 `uio_read()`는 `count != sizeof(s32)`이면 거부합니다).

PCI 장치용 `uio_pci_generic`에는 주의할 점이 있습니다. `Documentation/driver-api/uio-howto.rst`에 따르면 이 드라이버는 인터럽트마다 PCI Command 레지스터의 Interrupt Disable 비트를 세우고, user space 드라이버가 기다리기 전에 이 비트를 config space로 직접 풀어야 합니다. `/dev/uio0`에 `write()`로 인터럽트를 다시 여는 방식(`irqcontrol`)은 이 드라이버가 구현하지 않으므로, 실제로 해 보면 `write: Function not implemented`가 돌아옵니다. 아래 코드는 문서의 예제 순서를 따릅니다.

```c
#include <fcntl.h>
#include <stdint.h>
#include <stdio.h>
#include <sys/mman.h>
#include <time.h>
#include <unistd.h>

#define EDU_IRQ_STATUS 0x24
#define EDU_IRQ_RAISE  0x60
#define EDU_IRQ_ACK    0x64

static double now_us(void)
{
	struct timespec ts;
	clock_gettime(CLOCK_MONOTONIC, &ts);
	return ts.tv_sec * 1e6 + ts.tv_nsec / 1e3;
}

int main(void)
{
	int uio = open("/dev/uio0", O_RDWR);
	int cfg = open("/sys/class/uio/uio0/device/config", O_RDWR);
	if (uio < 0 || cfg < 0) { perror("open"); return 1; }
	volatile uint32_t *r = mmap(NULL, 4096, PROT_READ | PROT_WRITE, MAP_SHARED, uio, 0);
	if (r == MAP_FAILED) { perror("mmap"); return 1; }

	unsigned char cmd_hi;                       /* Command 레지스터 상위 바이트(offset 5) */
	pread(cfg, &cmd_hi, 1, 5);
	cmd_hi &= ~0x4;                             /* bit 10 = Interrupt Disable 해제 */

	for (int i = 0; i < 5; i++) {
		uint32_t count;
		pwrite(cfg, &cmd_hi, 1, 5);             /* 기다리기 전에 INTx를 다시 연다 */
		double t0 = now_us();
		r[EDU_IRQ_RAISE / 4] = 0x100 + i;       /* doorbell: 장치에 인터럽트를 올리게 함 */
		if (read(uio, &count, 4) != 4) { perror("read"); return 1; }
		double t1 = now_us();
		uint32_t st = r[EDU_IRQ_STATUS / 4];
		r[EDU_IRQ_ACK / 4] = st;                /* 장치 쪽 원인 지우기 */
		printf("irq count=%u status=0x%x raise->wakeup %.1f us\n", count, st, t1 - t0);
	}
	return 0;
}
```

`modprobe uio_pci_generic`과 `echo "1234 11e8" > /sys/bus/pci/drivers/uio_pci_generic/new_id`로 edu를 묶은 뒤 돌린 결과입니다.

```text
$ cat /sys/class/uio/uio0/maps/map0/addr /sys/class/uio/uio0/maps/map0/size
0x0000000010000000
0x0000000000100000
$ ./uio_irq
irq count=2 status=0x101 raise->wakeup 5.0 us
irq count=3 status=0x101 raise->wakeup 9.4 us
irq count=4 status=0x102 raise->wakeup 6.6 us
irq count=5 status=0x103 raise->wakeup 6.7 us
irq count=6 status=0x104 raise->wakeup 6.3 us
$ grep uio /proc/interrupts
 48:          6          0          0          0     GICv3  38 Level     uio_pci_generic
```

`map0`이 BAR0 1 MB 그대로입니다. 횟수가 2부터 시작하고 첫 status가 `0x101`인 것은, 앞서 Interrupt Disable을 풀지 않은 채 돌렸던 실행이 인터럽트 하나(0x100)를 ack하지 않고 남겼기 때문입니다. edu 문서대로 status는 raise 값의 bitwise OR이라 `0x100 | 0x101 = 0x101`이 됐습니다. 이런 잔여 인터럽트를 피하려면 시작할 때 status를 읽어 한 번 ack하고 들어갑니다.

`raise->wakeup` 5~9 µs는 HVF 가속 QEMU VM에서 MMIO 쓰기부터 `read()`가 깨어날 때까지의 시간입니다. 에뮬레이션 비용이 섞인 값이므로 Zynq에서의 인터럽트 지연으로 읽으면 안 됩니다.

### Device tree로 PL 장치를 UIO에 묶기

Zynq의 PL 장치는 PCI가 아니라 device tree의 platform device이므로 `uio_pdrv_genirq`를 씁니다. 여기에도 함정이 있습니다. Linux 6.12 `drivers/uio/uio_pdrv_genirq.c`의 OF match table은 비어 있고, `of_id` 모듈 파라미터로 채우게 되어 있습니다. 즉 `compatible = "generic-uio"`라고 적어도 커널 명령줄이나 모듈 옵션에 `uio_pdrv_genirq.of_id=generic-uio`를 주지 않으면 묶이지 않습니다.

```text
my_accel@40000000 {
    compatible = "generic-uio";
    reg = <0x40000000 0x1000>;
    interrupt-parent = <&intc>;
    interrupts = <0 29 4>;
};
```

`reg`는 `M_AXI_GP0` 창(`0x4000_0000`부터) 안의 주소여야 합니다. 그리고 이 드라이버는 커널 설정에 따라 아예 없을 수도 있습니다. Debian 13 arm64 커널은 `# CONFIG_UIO_PDRV_GENIRQ is not set`이었습니다. 쓰려는 커널에 `CONFIG_UIO_PDRV_GENIRQ`가 켜져 있는지 먼저 확인합니다.

## DMA buffer와 cache

HP 포트로 PL이 DDR을 읽고 쓰면 CPU cache와 어긋날 수 있습니다. Linux에서는 이를 arch 내부 함수로 직접 다루지 않고 DMA API로 다룹니다. `Documentation/core-api/dma-api-howto.rst`가 정리한 두 가지 방법은 다음과 같습니다.

```c
/* 1. coherent 버퍼: CPU와 장치가 언제나 같은 값을 본다 */
void *buf = dma_alloc_coherent(dev, SIZE, &dma_handle, GFP_KERNEL);
/* dma_handle을 PL에 넘긴다 */

/* 2. streaming 매핑: 소유권을 넘길 때마다 sync */
dma_addr_t h = dma_map_single(dev, buf, SIZE, DMA_FROM_DEVICE);
/* ... PL이 h에 쓰고 완료 인터럽트 ... */
dma_sync_single_for_cpu(dev, h, SIZE, DMA_FROM_DEVICE);  /* 이제 CPU가 읽어도 됨 */
```

`dma_handle`은 장치가 쓸 주소이고, CPU 물리 주소와 같다는 보장은 없습니다(IOMMU가 있으면 다릅니다). 그래서 원래 글의 `virt_to_phys(buf)`를 PL에 넘기는 코드는 user space에서는 컴파일조차 안 되고, 커널에서도 DMA API가 준 주소를 쓰는 것이 맞습니다. ACP로 coherent하게 접근하는 설계라면 이 sync 단계가 필요 없다는 것이 ACP의 장점입니다.

## 자주 보는 함정

> HP로 받은 데이터를 cache 관리 없이 읽음

```c
start_pl_dma(h);                     /* PL이 HP로 DDR에 씀 */
wait_for_completion(&done);
process(buf);                        /* dma_sync_single_for_cpu() 없이 읽음 */
```

CPU가 예전에 읽어 cache에 남은 값을 볼 수 있습니다. streaming 매핑이면 `dma_sync_single_for_cpu()`를 먼저 부릅니다.

> ACP에 부분 strobe 쓰기

64-bit × 4 beat 쓰기에서 `WSTRB`를 일부만 켜면 UG585 "ACP Limitations"가 말하는 L1 cache line 손상 조건에 해당합니다. ACP에 붙는 PL master는 strobe를 모두 켠 쓰기만 내도록 설계합니다.

> ACP로 큰 데이터를 계속 흘림

UG585는 크고 coherent한 ACP 전송이 cache thrashing을 일으킬 수 있다고 경고합니다. 큰 데이터는 HP로 보내고 cache는 DMA API로 관리합니다.

> GP로 대량 데이터를 옮김

```c
for (int i = 0; i < 1024; i++) regs[i] = data[i];   /* 32-bit 쓰기 1024번 */
```

GP는 FIFO가 없고 고성능 용도가 아니라고 TRM이 명시합니다. 4 KB는 32-bit 단일 쓰기 1,024번이 됩니다. 대량 데이터는 PL DMA + HP로 옮깁니다.

> HP 포트 두 개를 같은 쌍에서 고름

HP0과 HP1처럼 같은 쌍을 쓰면 DDR 앞 중재를 둘이 나눠 갖습니다. UG585 권고대로 HP0과 HP2처럼 쌍을 나눕니다.

> 인터럽트를 장치에서 ack하지 않음

위 UIO 실습에서 ack하지 않은 인터럽트 하나가 다음 실행까지 남아 status에 섞였습니다. 인터럽트를 처리했으면 장치 쪽 원인 레지스터를 지우고, UIO라면 Interrupt Disable 비트를 다시 풀어야 다음 인터럽트가 옵니다.

## 정리

- Zynq-7000 PS의 PL AXI 인터페이스 9개는 AXI3 기반이라 burst는 16 beat까지입니다.
- GP는 32-bit·FIFO 없음으로 control 용도, HP는 32/64-bit·1 KB FIFO로 DDR 대량 전송, ACP는 64-bit·SCU 연결로 coherent 접근입니다(UG585).
- HP는 outstanding을 여러 개 띄우고, 포트 2개라면 0과 2처럼 쌍을 나눕니다.
- ACP는 부분 strobe 쓰기, 큰 coherent 전송, OCM 독점에 제약이 있습니다.
- `/dev/mem`은 드라이버가 잡은 영역에서 막히고(`IO_STRICT_DEVMEM`), `uio_pci_generic`은 Interrupt Disable 비트를 config space로 풀어야 하며, `generic-uio`는 `of_id` 파라미터가 있어야 묶입니다.
- cache 관리는 DMA API(`dma_alloc_coherent`, `dma_sync_single_for_cpu`)로 합니다.

다음 편은 **Mailbox Protocol**입니다.

## 관련 항목

- [11-01: FPGA 기초](/blog/embedded/modern-recipes/part11-01-fpga-basics)
- [11-04: AXI 인터페이스](/blog/embedded/modern-recipes/part11-04-axi)
- [11-06: Mailbox Protocol](/blog/embedded/modern-recipes/part11-06-mailbox)
- [11-08: DMA Completion](/blog/embedded/modern-recipes/part11-08-dma-completion)
