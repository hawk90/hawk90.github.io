---
title: "PCIe Streaming 분석 — BAR Type·MSI-X·Kernel Bypass"
date: 2026-04-20T09:08:00
description: "PCIe로 streaming traffic을 다룰 때 알아야 할 BAR 종류, prefetchable 의미, MSI-X 분산, posted/non-posted 순서, kernel bypass 패턴을 정리합니다."
series: "Modern Embedded Recipes"
seriesOrder: 131
tags: [recipes, pcie, bar, msi-x, dpdk, spdk]
---

## 한 줄 요약

> **"PCIe streaming은 BAR 타입, MSI-X 분산, posted/non-posted 순서 세 가지를 알아야 안전하게 다룰 수 있습니다."** Throughput을 위해서는 ring + batched doorbell 모델로 가고, kernel bypass(DPDK·SPDK)는 마지막 카드로 꺼냅니다.

## 어떤 상황에서 쓰나

NVMe SSD에서 1 M IOPS를 뽑거나, 10/25/100 GbE NIC을 line rate로 받거나, FPGA accelerator로 카메라 frame을 zero-copy로 흘릴 때 PCIe streaming이 등장합니다. 이때는 단순히 `pci_iomap`으로 BAR을 잡는 것만으로는 충분치 않고, BAR의 prefetchable 여부, MSI-X vector 수, kernel bypass 가능성까지 같이 설계해야 합니다.

PCIe enumeration 자체와 BAR sizing은 [1-03 PCIe BAR](/blog/embedded/modern-recipes/part11-03-pcie-bar)에서 다뤘으므로, 이 글은 *streaming traffic에 특화된 결정*에 집중합니다.

## 핵심 개념

세 축으로 정리합니다.

1. **BAR 타입**
   - Memory BAR (대부분)
   - I/O BAR (legacy, ARM 거의 없음)
   - Prefetchable / Non-prefetchable
   - 32-bit / 64-bit (두 BAR pair)

2. **Interrupt**
   - INTx (shared legacy)
   - MSI (최대 32 vector, 같은 message data)
   - MSI-X (최대 2048 vector, 독립 address/data)

3. **Write/Read ordering**
   - Memory Write — posted (fire and forget)
   - Memory Read — non-posted (round-trip)
   - Producer-consumer rule, RO/IDO 비트

Prefetchable BAR은 root complex가 *부수효과 없다*고 가정하고 burst·prefetch·write-combining을 적용해도 좋다는 약속입니다. side-effect register는 non-prefetchable에 둡니다.

MSI-X는 queue별로 독립 vector를 줄 수 있어 multi-queue NVMe·NIC의 핵심입니다. 한 vector에 한 CPU를 affinity로 묶으면 CQ poll context까지 같은 코어로 정렬됩니다.

## 코드 / 실제 사용 예

### `lspci -vv`로 BAR 분석

```text
01:00.0 NVMe: Samsung SSD ...
    Region 0: Memory at fb000000 (64-bit, non-prefetchable) [size=16K]
    Capabilities: [50] MSI-X: Enable+ Count=32 Masked-
    Capabilities: [70] Express Endpoint
        LnkCap: Speed 8GT/s, Width x4
        LnkSta: Speed 8GT/s, Width x4
```

`non-prefetchable` + 16 KB이면 doorbell·register용 BAR입니다. 같은 device가 별도의 prefetchable BAR을 둘 수 있는데, 그건 DMA buffer나 framebuffer 같은 *RAM-like* 영역입니다.

### Linux PCIe driver의 표준 probe 순서

```c
static int my_probe(struct pci_dev *pdev, const struct pci_device_id *id) {
    int rc, nvec;

    rc = pci_enable_device(pdev);
    if (rc) return rc;

    rc = pci_request_regions(pdev, DRV_NAME);
    if (rc) goto err_disable;

    void __iomem *bar0 = pci_iomap(pdev, 0, 0);
    if (!bar0) { rc = -ENOMEM; goto err_regions; }

    pci_set_master(pdev);                  /* DMA enable */

    nvec = pci_alloc_irq_vectors(pdev, 1, 32,
                                 PCI_IRQ_MSIX | PCI_IRQ_MSI);
    if (nvec < 0) { rc = nvec; goto err_unmap; }

    for (int i = 0; i < nvec; i++) {
        int irq = pci_irq_vector(pdev, i);
        request_irq(irq, queue_isr, 0, "myq", &queues[i]);
        irq_set_affinity_hint(irq, cpumask_of(i % num_online_cpus()));
    }
    return 0;
}
```

`pci_set_master`를 빼면 device가 DMA를 못 합니다. MSI-X 요청 시 lower bound와 upper bound를 *둘 다 전달*해 fallback이 가능하도록 합니다.

### Doorbell write를 위한 BAR pointer

```c
struct queue {
    void __iomem *sq_doorbell;   /* bar0 + 0x1000 + 2*N*stride */
    void __iomem *cq_doorbell;
};

q->sq_doorbell = bar0 + DOORBELL_BASE + 2 * id * doorbell_stride;
q->cq_doorbell = q->sq_doorbell + doorbell_stride;

writel(new_tail, q->sq_doorbell);
```

NVMe 표준은 doorbell stride를 capability register에서 읽어 결정합니다. 다른 device는 비슷한 layout이라도 stride가 다릅니다.

### MSI-X handler를 queue별로 분리

```c
irqreturn_t queue_isr(int irq, void *data) {
    struct queue *q = data;
    napi_schedule_irqoff(&q->napi);
    return IRQ_HANDLED;
}
```

각 vector가 자기 queue만 깨우면 lock 경합 없이 CPU별 처리로 정렬됩니다.

### Memory Write ordering

PCIe는 *posted write가 같은 traffic class 안에서 순서를 유지*합니다. 그래서 다음 흐름이 안전합니다.

```c
sq[tail] = cmd;            /* posted write */
dma_wmb();
writel(tail + 1, doorbell); /* posted write */
```

같은 root complex 경유라면 doorbell이 sq write보다 먼저 device에 도달하지 않습니다. 다만 PCIe spec의 *Relaxed Ordering* 비트를 켜면 이 보장이 깨지므로 주의가 필요합니다.

### Non-posted read의 비용

```c
uint32_t s;
for (int i = 0; i < 100; i++)
    s = ioread32(bar0 + STATUS);   /* 매번 PCIe round-trip */
```

PCIe Read는 보통 1-5 µs가 걸립니다. Hot loop에서 host MMIO read를 반복하면 device latency보다 PCIe transit이 더 큰 비용이 됩니다. 가능한 한 device가 host memory에 적은 결과를 읽도록 바꿉니다.

### VFIO + mmap으로 kernel bypass

```c
struct vfio_region_info reg = { .argsz = sizeof(reg), .index = 0 };
ioctl(dev_fd, VFIO_DEVICE_GET_REGION_INFO, &reg);

void *bar0 = mmap(NULL, reg.size,
                  PROT_READ | PROT_WRITE,
                  MAP_SHARED, dev_fd, reg.offset);

while (1) {
    int n = reap_completions(bar0);
    if (!n) cpu_relax();
}
```

VFIO로 BAR을 user space에 mapping하면 doorbell write와 completion polling이 system call 없이 발생합니다. DPDK·SPDK가 이 모델로 µs 단위 latency를 달성합니다. ([4-04 UIO·VFIO](/blog/embedded/modern-recipes/part7-11-uio-vfio) 참고)

### SPDK NVMe enumeration

```c
spdk_nvme_probe(NULL, NULL, probe_cb, attach_cb, NULL);

void attach_cb(void *ctx, const struct spdk_nvme_transport_id *trid,
               struct spdk_nvme_ctrlr *ctrlr,
               const struct spdk_nvme_ctrlr_opts *opts) {
    struct spdk_nvme_qpair *qp = spdk_nvme_ctrlr_alloc_io_qpair(ctrlr, NULL, 0);
    /* qp는 user space에서 직접 SQ·CQ를 들고 있음 */
}
```

Kernel block layer를 거치지 않으므로 io_uring 대비 latency가 절반 가까이 떨어집니다. 대신 kernel scheduler·cgroup·multipath 같은 기능을 모두 직접 구현해야 합니다.

## 측정 / 성능 비교

PCIe Gen3 x16 카드(이론 15.75 GB/s effective) 위에서 BAR 접근과 streaming throughput을 측정한 예입니다.

```text
동작                             지연/대역
BAR0 register read (host MMIO)   ~1.5 µs
BAR0 register write (posted)     ~80 ns submit, 실제 보임 ~1 µs
PCIe DMA 64 KB read (host→card)  ~13 GB/s
PCIe DMA 64 KB write (card→host) ~12 GB/s
```

NVMe 4 KB read를 host stack에 따라 비교한 결과입니다.

| 스택 | IOPS (QD=64) | p99 latency |
|------|--------------|-------------|
| Linux block + libaio | 500 k | 90 µs |
| Linux block + io_uring (poll) | 780 k | 55 µs |
| SPDK polling (VFIO) | 2.4 M | 12 µs |

10 GbE NIC line rate(14.88 Mpps)에서 64-byte packet forwarding을 측정하면 Linux kernel stack은 2-3 Mpps에서 막히고, DPDK+VFIO는 단일 코어로 14.8 Mpps에 도달합니다. 차이는 PCIe link 자체가 아니라 *host side software*에서 발생합니다.

## 자주 보는 함정

> Prefetchable에 side-effect register

```c
struct {
    uint32_t status;
    uint32_t clear_on_read;       /* read 한 번에 자동 clear */
} __iomem *regs = pci_iomap(pdev, 0, 0);
```

Prefetchable BAR을 root complex가 speculatively read하면 `clear_on_read`가 의도치 않게 트리거됩니다. side-effect register는 *반드시 non-prefetchable BAR*에 둡니다.

> MSI-X vector 1개로 multi-queue

```c
pci_alloc_irq_vectors(pdev, 1, 1, PCI_IRQ_MSI);
/* 그 뒤 16 queue 사용 */
```

모든 queue가 한 IRQ로 묶이면 vector dispatch가 software로 떨어져 cache가 깨집니다. queue 수만큼 vector를 요청합니다.

> Relaxed Ordering(RO) 비트 켜진 채 doorbell 전송

`Memory Write`의 RO 비트가 켜져 있으면 PCIe spec이 순서를 보장하지 않습니다. dma_wmb 만으로 안전하지 않으므로 device 측이 strict ordering을 요구하는지 datasheet 확인이 필요합니다.

> 매 SQE마다 read-back으로 검증

```c
writel(tail, doorbell);
readl(doorbell);                   /* round-trip */
```

PCIe Write는 fire-and-forget입니다. 굳이 readback할 필요가 없고, 했다가는 latency가 두 배가 됩니다. 진짜 ordering 강제가 필요할 때만 사용합니다.

> 32-bit BAR sizing으로 64-bit BAR 읽기

```c
uint32_t bar0 = pci_read_config_dword(dev, PCI_BASE_ADDRESS_0);
```

Type bit가 64-bit이면 BAR0 + BAR1를 합쳐 읽어야 정확한 주소를 얻습니다. 4 GB 이상 영역에 BAR가 잡히면 32-bit read는 0을 반환합니다.

> 같은 IOMMU group이 vfio-pci로 묶이지 않음

DPDK·SPDK가 device를 grab하지 못하면 보통 IOMMU group의 다른 device가 host driver에 묶여 있어서입니다. `/sys/kernel/iommu_groups/<id>/devices`로 확인하고 같은 group의 device를 한꺼번에 unbind합니다.

## 정리

- PCIe streaming은 BAR 타입, MSI-X 분산, posted/non-posted 순서 세 축으로 설계합니다.
- Prefetchable BAR은 RAM-like 영역에만, side-effect register는 non-prefetchable에 둡니다.
- MSI-X를 queue 수만큼 받고 vector마다 CPU affinity를 박아 정렬합니다.
- Memory Write는 posted, Read는 non-posted입니다. Hot loop에서 read를 반복하지 않습니다.
- BAR을 VFIO + mmap으로 user에 올리면 doorbell·polling을 system call 없이 수행할 수 있습니다.
- DPDK·SPDK는 kernel bypass의 표준 구현이고, latency가 절반 가까이 줄어듭니다.
- 64-bit BAR sizing, IOMMU group 묶기, Relaxed Ordering 같은 곳에서 silent failure가 자주 발생합니다.
- 측정은 throughput, IOPS, p99 latency를 한 묶음으로 봅니다.

다음 편은 **Vitis HLS**입니다.

## 관련 항목

- [1-03: PCIe BAR](/blog/embedded/modern-recipes/part11-03-pcie-bar)
- [5-02: CQ·SQ](/blog/embedded/modern-recipes/part11-07-cq-sq)
- [4-04: UIO·VFIO](/blog/embedded/modern-recipes/part7-11-uio-vfio)
- [PE 3-03: DMA Performance](/blog/embedded/performance-engineering/part3-03-dma-performance)
