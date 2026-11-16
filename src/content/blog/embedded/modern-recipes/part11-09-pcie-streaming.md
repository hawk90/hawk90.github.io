---
title: "PCIe Streaming 분석 — BAR Type·MSI-X·Kernel Bypass"
slug: "embedded/modern-recipes/part11-09-pcie-streaming"
date: 2026-04-20T09:08:00
description: "PCIe로 streaming traffic을 다룰 때 필요한 BAR 종류와 prefetchable의 뜻, MSI-X 큐별 분산, posted write 순서, VFIO·SPDK kernel bypass를 QEMU NVMe·edu 장치 실행 결과와 Linux·AMD 문서로 정리합니다."
series: "Modern Embedded Recipes"
seriesOrder: 131
tags: [recipes, pcie, bar, msi-x, dpdk, spdk]
topics: ["embedded"]
---

## 한 줄 요약

> **"PCIe streaming은 BAR 종류, 큐별 MSI-X, posted write 순서 세 가지를 알면 안전하게 짤 수 있습니다."** Throughput은 링과 묶은 doorbell로 얻고, kernel bypass(VFIO 위의 SPDK·DPDK)는 커널 스택 자체가 병목일 때 꺼내는 카드입니다.

## 어떤 상황에서 쓰나

NVMe SSD에서 큐 여러 개로 I/O를 밀어 넣거나, 멀티 큐 NIC를 받거나, FPGA 가속기로 카메라 프레임을 흘릴 때 PCIe streaming을 설계하게 됩니다. 이때 `pci_iomap()`으로 BAR를 매핑하는 것만으로는 부족합니다. BAR가 prefetchable인지, IRQ vector를 큐마다 몇 개 받을지, doorbell 쓰기가 데이터보다 먼저 도착하지 않는지, 커널을 우회할지를 함께 정해야 합니다.

비유하면 BAR는 장치가 내 준 창구이고, MSI-X vector는 큐마다 따로 단 초인종이며, doorbell은 "물건 내려놨어요"라고 두드리는 노크입니다. 노크가 물건보다 먼저 도착하면 상대는 빈 선반을 봅니다. PCIe enumeration과 BAR sizing 자체는 [11-03 PCIe BAR](/blog/embedded/modern-recipes/part11-03-pcie-bar)에서 다뤘으므로, 이 글은 streaming에 필요한 결정에 집중합니다.

## 핵심 개념

세 축으로 정리합니다.

| 축 | 선택지 | 근거 |
|---|---|---|
| BAR 종류 | Memory BAR(32/64-bit, prefetchable 여부), I/O BAR | 64-bit BAR는 다음 BAR 칸까지 씀(AMD PG213) |
| Interrupt | INTx, MSI(최대 32, 2의 거듭제곱, 연속 할당), MSI-X(1~2048, vector마다 다른 CPU 가능) | Linux `msi-howto.rst` |
| 쓰기·읽기 순서 | Memory Write는 posted, Memory Read는 응답(completion)을 기다림 | Linux `device-io.rst`, AMD PG213 |

AMD의 *UltraScale+ Devices Integrated Block for PCI Express Product Guide*(PG213 v1.3) "PF BARs Tab" 절은 prefetchable을 이렇게 정의합니다. 읽기에 부수효과가 없는 메모리 공간(읽어도 데이터가 사라지지 않는, RAM 같은 공간)이 prefetchable이고, 바이트 쓰기 여러 개를 더블워드 쓰기 하나로 합칠 수 있습니다. 같은 절은 일반 PCIe endpoint에서 prefetchable BAR는 64-bit 주소를 지원해야 한다고 적습니다. Linux도 이 구분을 그대로 씁니다. sysfs는 prefetchable BAR에만 write-combining 매핑 파일 `resourceN_wc`를 만듭니다([`pci-sysfs.c`](https://github.com/torvalds/linux/blob/v6.12/drivers/pci/pci-sysfs.c#L1242), [`sysfs-pci.rst`](https://github.com/torvalds/linux/blob/v6.12/Documentation/PCI/sysfs-pci.rst)).

MSI-X는 큐마다 vector를 따로 줄 수 있어 멀티 큐 NVMe·NIC의 바탕이 됩니다. Linux 문서 [`msi-howto.rst`](https://github.com/torvalds/linux/blob/v6.12/Documentation/PCI/msi-howto.rst)는 MSI-X가 1~2048개의 interrupt를, MSI가 최대 32개(2의 거듭제곱, 연속 할당)를 지원하고, 어떤 플랫폼에서는 MSI vector가 모두 같은 CPU 집합을 향해야 하지만 MSI-X vector는 각자 다른 CPU를 향할 수 있다고 적습니다. 숫자는 레지스터 필드 폭과도 맞습니다. [`pci_regs.h`](https://github.com/torvalds/linux/blob/v6.12/include/uapi/linux/pci_regs.h#L325)의 `PCI_MSIX_FLAGS_QSIZE`는 0x07FF(테이블 크기 − 1을 담는 11비트)입니다.

## 코드 / 실제 사용 예

아래 실행 결과는 모두 Apple M2 Pro 위 QEMU 11.1.3(`-M virt -accel hvf`)의 Debian 13 arm64 게스트(커널 6.12.116)에서 얻었습니다. 장치는 QEMU의 NVMe 모델(`-device nvme`), 교육용 장치 `edu`, e1000e입니다. 실제 SSD나 FPGA 보드가 아니므로 레지스터 배치와 드라이버 동작은 보여 주지만 지연·대역 수치는 보여 주지 않습니다.

### `lspci -vv`로 BAR와 MSI-X 읽기

QEMU NVMe 컨트롤러의 출력에서 streaming과 관련된 줄만 남겼습니다.

```text
00:03.0 Non-Volatile memory controller: Red Hat, Inc. QEMU NVM Express Controller (rev 02) (prog-if 02 [NVM Express])
	Region 0: Memory at 8000008000 (64-bit, non-prefetchable) [size=16K]
	Capabilities: [40] MSI-X: Enable+ Count=65 Masked-
		Vector table: BAR=0 offset=00002000
		PBA: BAR=0 offset=00003000
		DevCtl:	CorrErr- NonFatalErr- FatalErr- UnsupReq-
			RlxdOrd- ExtTag- PhantFunc- AuxPwr- NoSnoop- FLReset-
	Kernel driver in use: nvme
```

BAR0는 64-bit, non-prefetchable, 16 KB입니다. NVMe 레지스터와 doorbell이 여기 있고, 레지스터 쓰기·읽기에 부수효과가 있으니 non-prefetchable이 맞습니다. MSI-X는 vector 65개를 광고하고, 그 테이블과 PBA도 BAR0 안(0x2000, 0x3000)에 있습니다. `DevCtl`의 `RlxdOrd-`는 이 함수가 Relaxed Ordering 속성을 쓰도록 허용되지 않았다는 뜻입니다(`PCI_EXP_DEVCTL_RELAX_EN`).

같은 게스트의 `/proc/interrupts`를 보면 커널 NVMe 드라이버가 큐마다 MSI-X vector를 받아 CPU별로 나눈 것이 보입니다.

```text
 54:         16          0          0          0  GICv2m-PCI-MSIX-0000:00:03.0   0 Edge      nvme0q0
 60:         35          0          0          0  GICv2m-PCI-MSIX-0000:00:03.0   1 Edge      nvme0q1
 61:          0         22          0          0  GICv2m-PCI-MSIX-0000:00:03.0   2 Edge      nvme0q2
 62:          0          0         54          0  GICv2m-PCI-MSIX-0000:00:03.0   3 Edge      nvme0q3
 63:          0          0          0          0  GICv2m-PCI-MSIX-0000:00:03.0   4 Edge      nvme0q4
```

I/O 큐 1~3의 IRQ가 각각 CPU0, CPU1, CPU2에서만 셌습니다. 드라이버가 직접 affinity를 박은 것이 아니라, [`nvme/host/pci.c`](https://github.com/torvalds/linux/blob/v6.12/drivers/nvme/host/pci.c#L2264)가 `PCI_IRQ_ALL_TYPES | PCI_IRQ_AFFINITY`로 vector를 요청해 PCI 코어가 CPU에 나눠 준 결과입니다.

### Linux PCIe 드라이버의 probe 순서

probe에서 할 일은 장치 켜기 → BAR 요청·매핑 → DMA 마스크 → bus master → IRQ vector 순서입니다. 아래 모듈을 QEMU edu 장치(1234:11e8)에 붙여 실행했습니다.

```c
rc = pcim_enable_device(pdev);            /* managed: undone on unbind */
if (rc)
	return rc;
rc = pcim_iomap_regions(pdev, BIT(0), DRV_NAME);
if (rc)
	return rc;
bar0 = pcim_iomap_table(pdev)[0];
rc = dma_set_mask_and_coherent(&pdev->dev, DMA_BIT_MASK(64));
if (rc)
	return rc;
pci_set_master(pdev);                     /* allow the device to DMA */

nvec = pci_alloc_irq_vectors(pdev, 1, MAX_Q,     /* MAX_Q = 32 */
			     PCI_IRQ_MSIX | PCI_IRQ_MSI | PCI_IRQ_AFFINITY);
if (nvec < 0)
	return nvec;
for (i = 0; i < nvec; i++) {
	rc = devm_request_irq(&pdev->dev, pci_irq_vector(pdev, i),
			      queue_isr, 0, DRV_NAME, pdev);
	if (rc)
		return rc;
}
```

```text
[  644.864978] stream_probe 0000:00:04.0: id=010000ed nvec=1 msix=0 msi=1 irq0=64
	Control: I/O- Mem+ BusMaster+ SpecCycle- MemWINV- VGASnoop- ParErr- Stepping- SERR- FastB2B- DisINTx+
	Capabilities: [40] MSI: Enable+ Count=1/1 Maskable- 64bit+
```

edu는 MSI-X가 없고 MSI vector 1개만 광고합니다(`edu.c`의 `msi_init(pdev, 0, 1, ...)`). 그래서 `pci_alloc_irq_vectors(1, 32, MSIX | MSI)`가 MSI-X를 건너뛰고 MSI 1개(`nvec=1 msi=1`)로 내려왔습니다. 최소값 1과 최대값을 함께 넘겨야 이런 fallback이 됩니다. `pci_set_master()` 뒤 `Control`에 `BusMaster+`가 켜졌고, MSI를 쓰니 legacy INTx는 `DisINTx+`로 꺼졌습니다. `pcim_*`와 `devm_*`를 썼기 때문에 unbind 때 IRQ, vector, BAR 매핑이 거꾸로 풀립니다.

원래 글에 있던 `irq_set_affinity_hint()`는 6.12의 [`interrupt.h`](https://github.com/torvalds/linux/blob/v6.12/include/linux/interrupt.h#L353)에서 "Deprecated"로 표시돼 있습니다. 큐별 CPU 분산이 목적이라면 위처럼 `PCI_IRQ_AFFINITY`를 주고 PCI 코어에 맡기는 것이 NVMe 드라이버가 쓰는 방법입니다.

### Doorbell 주소 계산 (NVMe)

NVMe doorbell은 BAR0의 0x1000부터 SQ tail과 CQ head가 번갈아 놓이고, 간격은 CAP 레지스터의 DSTRD 필드로 정해집니다. Linux 드라이버는 `dev->db_stride = 1 << NVME_CAP_STRIDE(cap)`, `dev->dbs = dev->bar + 4096`으로 잡고 큐 `qid`의 doorbell을 `&dev->dbs[qid * 2 * dev->db_stride]`(u32 단위)로 계산합니다([`pci.c`](https://github.com/torvalds/linux/blob/v6.12/drivers/nvme/host/pci.c#L2565), [L1586](https://github.com/torvalds/linux/blob/v6.12/drivers/nvme/host/pci.c#L1586)). 바이트로 쓰면 아래와 같습니다.

```c
#include <linux/nvme.h>    /* NVME_REG_DBS = 0x1000, NVME_CAP_STRIDE() */

static void __iomem *sq_tail_db(void __iomem *bar0, u64 cap, int qid)
{
	u32 stride = 4u << NVME_CAP_STRIDE(cap);         /* bytes */
	return bar0 + NVME_REG_DBS + (2 * qid) * stride;
}

static void __iomem *cq_head_db(void __iomem *bar0, u64 cap, int qid)
{
	return sq_tail_db(bar0, cap, qid) + (4u << NVME_CAP_STRIDE(cap));
}
```

QEMU NVMe 컨트롤러에서 드라이버를 잠시 unbind하고 sysfs `resource0`을 매핑해 CAP를 읽은 결과입니다.

```text
CAP=0x004008200f0107ff MQES=2047 DSTRD=0 stride=4 bytes
SQ0TDBL=0x1000 CQ0HDBL=0x1004
SQ1TDBL=0x1008 CQ1HDBL=0x100c
SQ2TDBL=0x1010 CQ2HDBL=0x1014
```

이 모델은 DSTRD = 0이라 doorbell이 4바이트 간격으로 붙어 있습니다. 위 두 함수를 같은 게스트에서 커널 모듈로 빌드해 base를 0으로 두고 돌리면 큐 1에 대해 SQ 0x1008, CQ 0x100c가 나와 CAP에서 계산한 값과 같고, DSTRD = 2를 넣으면 SQ1이 0x1020으로 벌어집니다. 다른 컨트롤러는 DSTRD가 다를 수 있으므로 상수로 박지 않고 CAP에서 읽습니다.

### MSI-X handler를 큐별로 분리

```c
static irqreturn_t queue_isr(int irq, void *data)
{
	struct my_queue *q = data;

	if (napi_schedule_prep(&q->napi)) {
		my_mask_queue_irq(q);          /* device-side mask */
		__napi_schedule_irqoff(&q->napi);
	}
	return IRQ_HANDLED;
}
```

vector마다 `data`로 자기 큐를 넘기면 ISR이 다른 큐를 건드릴 일이 없고, 위 `/proc/interrupts`처럼 큐와 CPU가 1:1로 맞으면 큐 상태가 그 CPU 캐시에 머뭅니다. 장치 IRQ를 가린 뒤 poll을 예약하는 순서는 커널 [`napi.rst`](https://github.com/torvalds/linux/blob/v6.12/Documentation/networking/napi.rst)의 "Scheduling and IRQ masking" 절을 따른 것입니다.

### Doorbell 쓰기의 순서

링에 명령을 쓰고 doorbell을 두드릴 때 doorbell이 명령보다 먼저 장치에 보이면 안 됩니다. Linux에서 이 순서는 `writel()`이 지켜 줍니다. [`memory-barriers.txt`](https://github.com/torvalds/linux/blob/v6.12/Documentation/memory-barriers.txt#L2578-L2582)의 "KERNEL I/O BARRIER EFFECTS" 3번 항목은 `writeX()`가 같은 스레드의 앞선 메모리 쓰기가 모두 끝나기를 기다린 뒤 나간다고, 그래서 `dma_alloc_coherent()` 버퍼에 쓴 내용이 MMIO 제어 레지스터 쓰기보다 먼저 DMA 엔진에 보인다고 적습니다.

```c
sq[tail] = cmd;                     /* coherent DMA memory */
writel(tail + 1, sq_doorbell);      /* writel orders the store above */

/* only when using the relaxed accessor */
sq[tail] = cmd;
dma_wmb();
writel_relaxed(tail + 1, sq_doorbell);
```

`writel()` 앞의 `dma_wmb()`는 중복이고, barrier가 필요한 것은 순서 보장이 빠진 `writel_relaxed()`를 쓸 때입니다. 같은 문서의 1번 항목은 같은 장치에 대한 `readX()`·`writeX()`끼리는 프로그램 순서대로 도착한다고 적습니다.

### Non-posted read의 비용

```c
for (int i = 0; i < 100; i++)
	s = ioread32(bar0 + STATUS);   /* each one waits for a completion */
```

PCIe Memory Write는 posted라 CPU가 응답을 기다리지 않지만, Memory Read는 장치가 completion을 돌려줄 때까지 CPU 명령이 끝나지 않습니다. 그래서 hot loop에서 MMIO 읽기를 반복하면 그 왕복이 그대로 루프 시간이 됩니다. 장치가 완료를 host 메모리의 링에 쓰고 CPU는 그 메모리를 읽도록 바꾸는 것이 completion ring의 요점입니다([11-08 DMA Completion](/blog/embedded/modern-recipes/part11-08-dma-completion)). 실제 보드에서 MMIO 읽기 한 번이 몇 µs인지는 이 글이 잰 값이 없습니다. QEMU에서 잰 값은 에뮬레이션 비용이므로 쓸 수 없습니다.

### VFIO + mmap으로 kernel bypass

VFIO는 장치를 사용자 공간 프로세스에 넘기는 커널 인터페이스입니다. 장치 fd에서 BAR 영역 정보를 받아 mmap하면 doorbell 쓰기와 completion 읽기를 system call 없이 할 수 있습니다. 구조체와 ioctl 이름은 [`vfio.h`](https://github.com/torvalds/linux/blob/v6.12/include/uapi/linux/vfio.h#L271)에 있는 그대로입니다.

```c
struct vfio_region_info reg = {
	.argsz = sizeof(reg),
	.index = VFIO_PCI_BAR0_REGION_INDEX,
};
ioctl(dev_fd, VFIO_DEVICE_GET_REGION_INFO, &reg);

void *bar0 = mmap(NULL, reg.size, PROT_READ | PROT_WRITE,
		  MAP_SHARED, dev_fd, reg.offset);
```

VFIO는 IOMMU group 단위로 장치를 넘깁니다. 커널 문서 [`vfio.rst`](https://github.com/torvalds/linux/blob/v6.12/Documentation/driver-api/vfio.rst)는 group을 "시스템의 다른 모든 장치로부터 격리할 수 있는 장치 집합"으로 정의하고, group 안에 장치가 여럿이면 모두 VFIO 드라이버에 묶이거나(또는 host 드라이버에서 풀려야) group을 쓸 수 있다고 적습니다. 이 글의 게스트는 IOMMU 없이 띄워 `/sys/kernel/iommu_groups`가 비어 있었으므로 VFIO 실행은 하지 않았습니다. 자세한 사용법은 [7-11 UIO·VFIO](/blog/embedded/modern-recipes/part7-11-uio-vfio)에 있습니다.

### SPDK NVMe 초기화

SPDK는 VFIO(또는 UIO) 위에서 NVMe 큐를 사용자 공간에 직접 들고 polling으로 완료를 거두는 라이브러리입니다. 아래는 SPDK v26.09의 [`nvme.h`](https://github.com/spdk/spdk/blob/v26.09/include/spdk/nvme.h)와 예제 [`hello_world.c`](https://github.com/spdk/spdk/blob/v26.09/examples/nvme/hello_world/hello_world.c)에 맞춘 골격입니다. SPDK는 이 글에서 빌드하거나 실행하지 않았습니다.

```c
static bool probe_cb(void *ctx, const struct spdk_nvme_transport_id *trid,
		     struct spdk_nvme_ctrlr_opts *opts)
{
	return true;                               /* attach to every controller */
}

static void attach_cb(void *ctx, const struct spdk_nvme_transport_id *trid,
		      struct spdk_nvme_ctrlr *ctrlr,
		      const struct spdk_nvme_ctrlr_opts *opts)
{
	g_qpair = spdk_nvme_ctrlr_alloc_io_qpair(ctrlr, NULL, 0);
}

/* after spdk_env_init(&env_opts) */
spdk_nvme_probe(NULL, NULL, probe_cb, attach_cb, NULL);
/* ... submit I/O, then poll: */
while (outstanding)
	spdk_nvme_qpair_process_completions(g_qpair, 0);   /* non-blocking */
```

헤더 주석에 따르면 `spdk_nvme_qpair_process_completions()`는 호출 시점에 준비된 완료만 처리하고 기다리지 않으며, queue pair는 한 번에 한 스레드만 써야 합니다(상호 배제는 사용자 책임). 커널 block layer를 거치지 않는 대신 cgroup·multipath처럼 커널이 해 주던 일은 SPDK 쪽에서 해결해야 합니다.

## 측정 / 성능 비교

원래 이 절에 있던 NVMe 스택별 IOPS·p99 표와 "Linux 2-3 Mpps / DPDK 14.8 Mpps" 수치는 출처도 측정 환경도 없어 지웠습니다. 이 글은 실제 PCIe 장치에서 잰 값을 갖고 있지 않습니다. 대신 계산으로 정할 수 있는 상한과, 재는 방법을 남깁니다.

PCI-SIG의 FAQ는 PCIe 3.0이 8 GT/s에 128b/130b 인코딩을 쓴다고 적습니다. 그러면 x16 링크 한 방향의 상한은 8 × 128/130 × 16 ÷ 8 ≈ 15.75 GB/s입니다. TLP 헤더와 DLLP 오버헤드가 더 빠지므로 실제 payload 대역은 이보다 작고, 얼마나 작은지는 MaxPayload(위 QEMU 장치는 128 bytes)와 MaxReadReq에 달려 있습니다.

| 재야 할 것 | 도구 | 함께 기록할 것 |
|---|---|---|
| NVMe IOPS·지연 | `fio --ioengine=io_uring`/`libaio`, SPDK `spdk_nvme_perf` | QD, 블록 크기, CPU 수, p50·p99 |
| MMIO 읽기 왕복 | 커널 모듈에서 `ktime_get_ns()`로 `readl()` N회 | 실제 보드·링크 속도(`LnkSta`) |
| DMA 대역 | 장치 DMA 엔진 + 완료 시간 | MaxPayload, MaxReadReq, 버스트 크기 |

## 자주 보는 함정

> Prefetchable BAR에 부수효과 있는 레지스터

```c
struct regs {
	u32 status;
	u32 clear_on_read;              /* reading clears it */
};
```

PG213의 정의대로 prefetchable은 "읽기에 부수효과가 없다"는 약속이고, Linux는 그런 BAR를 write-combining으로 매핑해도 되는 영역으로 취급합니다. 읽으면 지워지는 레지스터나 쓰기 순서가 의미 있는 레지스터는 non-prefetchable BAR에 둡니다. 위 NVMe BAR0가 non-prefetchable인 이유입니다.

> MSI-X vector 1개로 멀티 큐

```c
pci_alloc_irq_vectors(pdev, 1, 1, PCI_IRQ_MSI);   /* 회피: then 16 queues */
```

모든 큐가 한 IRQ를 나눠 쓰면 ISR이 어느 큐에 일이 있는지 매번 다 뒤져야 하고, 큐 처리가 한 CPU에 몰립니다. 큐 수만큼 vector를 요청하고, 장치가 덜 주면 받은 수에 맞춰 큐를 줄입니다.

> Relaxed Ordering을 켠 장치의 DMA 쓰기 뒤 MMIO 읽기로 완료 확인

Linux [`device-io.rst`](https://github.com/torvalds/linux/blob/v6.12/Documentation/driver-api/device-io.rst)는 PCI 순서 규칙 덕분에 PIO 읽기 응답이 그 버스의 미처리 DMA 쓰기보다 뒤에 도착하므로, 상태 레지스터 읽기로 DMA 완료를 확인할 수 있다고 적습니다. PG213 v1.3의 "Receive Transaction Ordering" 절은 이 규칙("Completion TLP는 Posted request를 앞지르지 않는다")에 예외를 둡니다. Relaxed Ordering 속성 비트가 켜진 경우입니다. 장치가 데이터 쓰기에 RO를 쓴다면 상태 읽기 하나로 데이터 도착을 가정하지 말고 장치 문서가 정한 완료 방법(완료 항목의 phase·DD 비트 등)을 따릅니다. 장치가 RO를 쓸 수 있는지는 `lspci -vv`의 `DevCtl: RlxdOrd±`로 확인할 수 있습니다.

> 순서를 위해 매 쓰기마다 read-back

```c
writel(tail, doorbell);
readl(doorbell);                    /* waits for a completion */
```

`device-io.rst`는 쓰기가 장치에 도착했는지 반드시 알아야 하는 경우에 같은 장치에서 한 번 읽어 posted write를 밀어내라고 하고, `memory-barriers.txt` 5번 항목도 `readX()` 뒤 `udelay()`로 두 쓰기 사이 간격을 보장하는 예를 듭니다. 이런 경우가 아니라면 doorbell마다 읽어 확인할 필요가 없고, 읽을 때마다 위에서 본 completion 왕복을 기다리게 됩니다.

> 64-bit BAR를 32-bit로만 읽기

```c
pci_read_config_dword(dev, PCI_BASE_ADDRESS_0, &lo);   /* only half */
```

64-bit memory BAR는 다음 BAR 칸에 상위 32비트를 둡니다(`PCI_BASE_ADDRESS_MEM_TYPE_64`, PG213 "Memory BARs ... uses the next BAR"). 위 NVMe의 BAR0(0x8000008000)를 `setpci`로 읽으면 하위 dword에는 주소 하위와 플래그가, 상위 주소는 BAR1에 있습니다.

```text
+ setpci -s 00:03.0 BASE_ADDRESS_0 BASE_ADDRESS_1
00008004
00000080
```

BAR0 = 0x00008004의 하위 4비트 0x4는 "memory, 64-bit, non-prefetchable" 플래그이고, 주소는 BAR1 0x80을 위에 붙인 0x80_0000_8000입니다. 하위 dword만 쓰면 주소가 0x8000으로 잘립니다. 드라이버에서는 config space를 직접 읽지 말고 PCI 코어가 채운 `pci_resource_start()`를 씁니다.

> IOMMU group의 다른 장치가 host 드라이버에 묶여 있음

DPDK·SPDK가 장치를 잡지 못하면 `/sys/kernel/iommu_groups/<id>/devices`에서 같은 group에 무엇이 있는지 봅니다. `vfio.rst`의 설명대로 group 안의 장치가 모두 VFIO 드라이버에 묶이거나 host 드라이버에서 풀려야 group을 쓸 수 있습니다.

## 정리

- PCIe streaming은 BAR 종류, 큐별 MSI-X, posted write 순서 세 축으로 설계합니다.
- Prefetchable은 읽기 부수효과가 없다는 약속입니다. 레지스터·doorbell BAR는 non-prefetchable입니다(QEMU NVMe BAR0도 그렇습니다).
- `pci_alloc_irq_vectors(min, max, MSIX | MSI | AFFINITY)`로 받을 만큼 받고, 받은 수에 큐를 맞춥니다. edu에서는 MSI 1개로 내려왔습니다.
- NVMe doorbell은 0x1000 + (2·qid [+1]) × (4 << DSTRD)이고, DSTRD는 CAP에서 읽습니다.
- `writel()`은 앞선 메모리 쓰기를 기다립니다. `dma_wmb()`는 `writel_relaxed()`와 짝입니다.
- MMIO 읽기는 completion을 기다리므로 hot loop에서 반복하지 않고, 완료는 host 메모리 링으로 받습니다.
- VFIO는 IOMMU group 단위로 장치를 넘기고, SPDK는 그 위에서 큐를 직접 polling합니다.
- 성능 비교는 실제 장치에서 QD·블록 크기·p99를 함께 기록해서 합니다.

다음 편은 **Vitis HLS**입니다.

## 재현 절차

- 게스트: `qemu-system-aarch64 -M virt,gic-version=3 -accel hvf -cpu host -m 4g -smp 4 -bios edk2-aarch64-code.fd ... -device nvme,serial=...,drive=nv -device edu,dma_mask=0xffffffff -device e1000e,netdev=n2`, Debian 13 arm64 nocloud 이미지, 커널 6.12.116+deb13-arm64, gcc 14.2.0, `pciutils`.
- probe 모듈: `make -C /lib/modules/$(uname -r)/build M=$PWD modules && insmod stream_probe.ko`.
- CAP 읽기: `echo 0000:00:03.0 > /sys/bus/pci/drivers/nvme/unbind` 뒤 `resource0`을 `O_RDWR`로 mmap해 32-bit 두 번 읽기, 끝나면 다시 bind.
- 대역 계산: 8e9 × 128/130 × 16 / 8 = 15.75e9 B/s.

## 관련 항목

- [11-03: PCIe BAR](/blog/embedded/modern-recipes/part11-03-pcie-bar)
- [11-07: CQ·SQ](/blog/embedded/modern-recipes/part11-07-cq-sq)
- [11-08: DMA Completion](/blog/embedded/modern-recipes/part11-08-dma-completion)
- [7-11: UIO·VFIO](/blog/embedded/modern-recipes/part7-11-uio-vfio)
- [PE 3-03: DMA Performance](/blog/embedded/performance-engineering/part3-03-dma-performance)
