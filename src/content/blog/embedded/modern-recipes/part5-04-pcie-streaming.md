---
title: "5-04: PCIe Streaming — TLP·MSI-X·Bus Master·BAR·Latency"
date: 2026-05-20T22:00:00
description: "PCIe TLP, MSI-X interrupt, bus master DMA, BAR mapping, latency tuning."
series: "Modern Embedded Recipes"
seriesOrder: 28
tags: [recipes, pcie, tlp, msi-x, dma]
draft: true
---

## 한 줄 요약

> **"PCIe = packet-based 고속 serial link"** — 64 Gbps per lane (Gen5).

## PCIe 세대

| Gen | Lane Speed | x16 Total |
|---|---|---|
| Gen1 | 2.5 GT/s | 8 GB/s |
| Gen2 | 5 GT/s | 16 GB/s |
| Gen3 | 8 GT/s | 32 GB/s |
| Gen4 | 16 GT/s | 64 GB/s |
| Gen5 | 32 GT/s | 128 GB/s |
| Gen6 | 64 GT/s | 256 GB/s (PAM4) |

자동차·자율주행 — Gen4·Gen5 표준. 카메라·NPU·SSD.

## TLP — Transaction Layer Packet

```text
PCIe transaction:
  Header (12-16 byte) + Payload (max 4 KB)
  
Types:
  Memory Read·Write
  IO Read·Write (legacy)
  Configuration Read·Write
  Message (interrupt·error)
```

Max payload size (MPS) — 128·256·512 byte. 큰 MPS → *overhead 줄임*, throughput ↑.

## Configuration Space

```c
/* 256 byte standard + 4096 byte extended */
uint16_t vendor_id = pci_read_config_word(dev, PCI_VENDOR_ID);
uint16_t device_id = pci_read_config_word(dev, PCI_DEVICE_ID);

/* BAR */
uint32_t bar0 = pci_read_config_dword(dev, PCI_BASE_ADDRESS_0);
```

`lspci -vv` — 모든 config 확인.

## BAR Mapping

```c
/* Linux driver */
static int my_probe(struct pci_dev *pdev, const struct pci_device_id *id) {
    pci_enable_device(pdev);
    pci_request_regions(pdev, "my_driver");
    pci_set_master(pdev);   /* Enable bus master */
    
    /* Map BAR 0 */
    void __iomem *mmio = pci_iomap(pdev, 0, 0);
    
    /* Read·write */
    iowrite32(0x12345678, mmio + REG_OFFSET);
    uint32_t val = ioread32(mmio + REG_STATUS);
    
    return 0;
}
```

`pci_iomap` — *internal ioremap* + cache attribute 자동 설정.

## MSI-X — Multiple IRQ

```c
struct msix_entry entries[16];
for (int i = 0; i < 16; i++) entries[i].entry = i;

int nvec = pci_alloc_irq_vectors(pdev, 1, 16, PCI_IRQ_MSIX);

/* Each vector → different IRQ */
for (int i = 0; i < nvec; i++) {
    int irq = pci_irq_vector(pdev, i);
    request_irq(irq, my_handler[i], 0, "myq-i", &queues[i]);
}
```

NVMe·NIC — *queue별 별도 IRQ*. CPU affinity 분산.

## DMA Setup — dma_alloc_coherent

```c
dma_addr_t dma_handle;
void *cpu_addr = dma_alloc_coherent(&pdev->dev, 4096,
                                      &dma_handle, GFP_KERNEL);

/* Setup HW DMA descriptor */
iowrite64(dma_handle, mmio + DMA_DESC_ADDR);
iowrite32(4096, mmio + DMA_LEN);
iowrite32(DMA_START, mmio + DMA_CTRL);
```

`dma_handle` — *device가 보는 physical address* (또는 IOVA).

## Bus Master + IOMMU

```text
PCIe device DMA:
  - PCIe device가 host memory 직접 access
  - IOMMU (SMMU on ARM) — protection·translation
  - VFIO — user-space passthrough
```

```bash
# IOMMU group 확인
ls /sys/bus/pci/devices/0000:01:00.0/iommu_group
```

## ATS·PRI — Address Translation

```text
ATS (Address Translation Service):
  - Device가 *IOTLB cache*
  - SMMU 자주 query 안 해도 됨
  
PRI (Page Request Interface):
  - Device가 page fault 직접 요청
  - Demand-paged DMA
```

GPU·NPU 표준 — *coherent shared memory*.

## NVMe SSD Driver

```c
/* SPDK example */
spdk_nvme_probe(NULL, NULL, probe_cb, attach_cb, NULL);

/* attach_cb */
struct spdk_nvme_ns *ns = spdk_nvme_ctrlr_get_ns(ctrlr, 1);
spdk_nvme_ns_cmd_read(ns, qpair, buffer, 0, 1, cb, NULL, 0);
```

NVMe — *PCIe Gen4 x4 → 8 GB/s*. 1 µs latency.

## Network — DPDK PMD

```c
rte_eal_init(argc, argv);

/* Configure port */
rte_eth_dev_configure(port, 1, 1, &port_conf);
rte_eth_rx_queue_setup(port, 0, RX_DESC, 0, NULL, mbuf_pool);
rte_eth_dev_start(port);

/* Poll RX */
struct rte_mbuf *pkts[32];
int n = rte_eth_rx_burst(port, 0, pkts, 32);
```

100G NIC — DPDK *zero copy + kernel bypass*. < 5 µs latency.

## ARM SoC — PCIe Endpoint·Root Complex

```text
Cortex-A SoC roles:
  - Root Complex (host) — slot·PCIe controller
  - Endpoint (target) — accelerator·co-processor

Xilinx Zynq Ultrascale+ — both modes.
NVIDIA Jetson — RC only.
```

## NVIDIA Jetson PCIe

```text
Jetson AGX Orin:
  Gen4 x8 (slot)
  +5G modem·NVMe·camera
  
사용:
  External NVMe SSD via PCIe
  WiFi 6E card
  Custom FPGA accelerator
```

## Latency Tuning

```text
1. MPS (Max Payload Size) — 큰 값일수록 throughput ↑
2. MRRS (Max Read Request Size) — read 한 번 크기
3. Read completion combining
4. Posted vs Non-posted
5. Snoop·NoSnoop attribute
6. RC IOMMU stages
```

```bash
# 현재 MPS
sudo setpci -s 01:00.0 CAP_EXP+8.w
```

## Read vs Write Latency

```text
PCIe Write (posted):
  - Fire and forget
  - 1 µs latency
  - 매우 빠름

PCIe Read (non-posted):
  - Round trip
  - 1-5 µs latency
  - 큰 read 권장 (overhead amortize)
```

→ MMIO read 자제, batched write.

## Hot-Plug·Surprise Removal

```c
static const struct pci_error_handlers my_err_handlers = {
    .error_detected = my_error_detected,
    .slot_reset = my_slot_reset,
    .resume = my_resume,
};

static struct pci_driver my_driver = {
    .name = "mydriver",
    .id_table = my_id_table,
    .probe = my_probe,
    .remove = my_remove,
    .err_handler = &my_err_handlers,
};
```

AER (Advanced Error Reporting) — Linux 자동 복구 시도.

## VFIO — User-Space PCIe

```bash
# Unbind from default driver
echo 0000:01:00.0 > /sys/bus/pci/drivers/nvme/unbind

# Bind to vfio-pci
modprobe vfio-pci
echo 8086 0a54 > /sys/bus/pci/drivers/vfio-pci/new_id

# /dev/vfio/N 노출
```

DPDK·SPDK·QEMU passthrough.

## CXL — Cache Coherent

```text
CXL 2.0+:
  PCIe 위 cache coherent protocol
  CXL.io   — PCIe 호환
  CXL.cache — accelerator coherent
  CXL.mem   — memory expansion
  
Use cases:
  GPU·NPU coherent shared memory
  Memory pool (수 TB)
  Disaggregated memory
```

자율주행·서버 — *coherent accelerator*.

## 자율주행 — Camera + NPU + SSD via PCIe

```text
ADAS SoC:
  10 camera × CSI/MIPI → ISP → DDR
       ↓ via PCIe Gen4 (within SoC fabric)
  GPU·NPU inference
       ↓ via PCIe Gen4
  NVMe SSD (data logging)

Total bandwidth:
  Cameras: 10 × 2 GB/s = 20 GB/s
  PCIe Gen4 x8: 16 GB/s — *부족!*
  → 일부 sensor는 다른 interconnect (CSI-2 direct)
```

## 자주 하는 실수

> ⚠️ DMA address physical 가정

```c
HW_DMA_ADDR = (uint32_t)kbuf;   /* virtual addr — wrong */
```

→ `dma_handle` (IOMMU 또는 physical).

> ⚠️ Bus master enable 안 함

```c
pci_enable_device(pdev);
/* pci_set_master 누락 */
DMA setup;
/* → DMA 동작 안 함 */
```

→ `pci_set_master`.

> ⚠️ MSI-X vector 모자람

```c
pci_alloc_irq_vectors(pdev, 1, 1, PCI_IRQ_MSI);
/* 16 queue 사용하려는데 1 vector */
```

→ multi-vector 요청.

> ⚠️ MMIO read 빈번

```c
while (1) {
    status = ioread32(mmio + STATUS);   /* PCIe round-trip 매번 */
}
```

→ doorbell·IRQ로 wake.

## 정리

- PCIe = **packet-based 고속 serial**, Gen5 32 GT/s.
- **TLP** memory read·write·config·message.
- **MSI-X** = multi-IRQ per device.
- **BAR mapping** + bus master + IOMMU.
- **DPDK·SPDK·NVMe** — user-space high-perf.
- **CXL** = PCIe coherent.
- 자율주행 — Gen4·Gen5 표준.

다음 편은 **HLS**.

## 관련 항목

- [5-03: DMA Completion](/blog/embedded/modern-recipes/part5-03-dma-completion)
- [5-05: HLS](/blog/embedded/modern-recipes/part5-05-hls)
