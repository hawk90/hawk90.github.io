---
title: "11-03: PCIe BAR 매핑 — Config Space·Enumeration·MMIO 접근"
date: 2026-05-17T05:00:00
description: "PCIe BAR (Base Address Register), enumeration, sizing, MMIO 매핑, ioremap."
series: "Modern Embedded Recipes"
seriesOrder: 125
tags: [recipes, pcie, bar, mmio, enumeration]
draft: false
---

## 한 줄 요약

> **"BAR는 device의 메모리/IO 영역 선언입니다."** CPU에게 어디로 접근해야 할지 알려주는 역할을 합니다.

## PCIe Config Space 256 byte

```text
Offset
0x00  Vendor ID (2)
0x02  Device ID (2)
0x04  Command (2)
0x06  Status (2)
0x08  Revision + Class (1+3)
0x0C  Cache Line + Latency + Header Type + BIST
0x10  BAR0 (4)
0x14  BAR1 (4)
0x18  BAR2 (4)
0x1C  BAR3 (4)
0x20  BAR4 (4)
0x24  BAR5 (4)
0x28  Cardbus CIS
0x2C  Subsystem Vendor + Device
0x30  ROM Base Address
0x34  Capability Pointer
0x3C  IRQ Line / Pin
```

PCIe extended config는 4 KB까지 확장됩니다 (PCIe Spec). 일반 OS는 0x100 이상도 액세스 가능합니다.

## BAR Layout

| 비트 | 폭 | 필드 | 의미 |
| --- | --- | --- | --- |
| 31:4 | 28 | Base Address | 자연 정렬, 하위는 0 |
| 3 | 1 | P | Prefetchable |
| 2:1 | 2 | Type | 00 = 32-bit, 10 = 64-bit (다음 BAR과 pair) |
| 0 | 1 | M | 0 = Memory, 1 = I/O space |

64-bit BAR은 인접한 두 BAR을 사용합니다 (예: BAR0 + BAR1).

## Sizing — Device가 얼마 필요한지

```c
/* Step 1: 원래 값 저장 */
uint32_t orig = pci_read_config_dword(dev, BAR0);

/* Step 2: 모든 비트 1 쓰기 */
pci_write_config_dword(dev, BAR0, 0xFFFFFFFF);

/* Step 3: 다시 읽음 — device가 *고정 비트만 0*으로 만듦 */
uint32_t mask = pci_read_config_dword(dev, BAR0);
mask &= ~0xF;   // type bits 제거
size = ~mask + 1;

/* Step 4: 원래 값 복원 */
pci_write_config_dword(dev, BAR0, orig);
```

예를 들어 device가 64 KB를 요청하면 mask는 `0xFFFF0000`이 되고 size는 `0x10000`이 됩니다.

## Enumeration 흐름

Boot 시:

1. Root Complex (CPU) — bus 0 scan
2. Bus 0 device 0~31 × function 0~7 query
3. Vendor ID = `0xFFFF` — device 없음
4. Bridge 발견 → 새 bus 번호 할당, recursive scan
5. 각 endpoint device의 BAR sizing
6. BIOS/BootROM이 free MMIO 영역에서 *주소 할당*
7. Command register Enable Memory·I/O·Bus Master

## Linux Driver — BAR 매핑

```c
static int my_probe(struct pci_dev *pdev, const struct pci_device_id *id) {
    int rc;
    
    rc = pci_enable_device(pdev);
    if (rc) return rc;
    
    rc = pci_request_regions(pdev, "my_driver");
    if (rc) goto err_disable;
    
    /* BAR0 mapping */
    void __iomem *mmio = pci_iomap(pdev, 0, 0);
    if (!mmio) { rc = -ENOMEM; goto err_regions; }
    
    /* Read device register */
    uint32_t version = ioread32(mmio + REG_VERSION);
    printk("Device version: 0x%x\n", version);
    
    /* Bus master enable for DMA */
    pci_set_master(pdev);
    
    /* ... */
    return 0;
}
```

`pci_iomap`은 내부에서 `ioremap`을 호출해 page table에 non-cacheable mapping을 추가합니다.

## __iomem 타입 표시

```c
void __iomem *mmio;
uint32_t v = ioread32(mmio + 0x10);   // ← 정확
uint32_t v = *(uint32_t*)(mmio + 0x10);   // ← 컴파일러 경고, 위험
```

`__iomem` (sparse annotation)은 pointer가 IO space임을 표시합니다. Direct dereference는 금지이므로 `iowrite32`, `ioread32`, `readl`, `writel`을 사용합니다.

## Volatile + Memory Barrier

```c
uint32_t val = ioread32(mmio + 0x10);
__iowmb();   // ← write memory barrier
iowrite32(val, mmio + 0x14);
```

DMA와 MMIO 사이의 순서를 보장합니다. `dma_wmb()`, `smp_wmb()`와는 다른 barrier입니다.

## DPDK·SPDK — User-space PCIe

Linux kernel bypass 방식입니다.

```c
struct rte_pci_device *dev;
void *mmio = rte_pci_map_resource(dev, 0);

/* User-space에서 직접 register read/write */
volatile uint32_t *reg = (uint32_t*)mmio;
*reg = 0x12345678;
```

장점은 kernel/user mode 전환이 없어 매우 빠르다는 점입니다. 반대로 단점은 driver 통제가 안 돼 위험하다는 점입니다.

## VFIO — Hardware Passthrough

```bash
# VM에 NVMe SSD 직접 할당
echo 0000:01:00.0 > /sys/bus/pci/drivers/nvme/unbind
echo 8086 0a54   > /sys/bus/pci/drivers/vfio-pci/new_id
```

QEMU/KVM이 VFIO를 이용해 PCIe device를 통째로 VM에 넘깁니다. BAR도 VM의 게스트 메모리에 mapping됩니다.

## PCIe Root Complex 임베디드

| SoC | PCIe Spec | Lane |
|---|---|---|
| Xilinx Zynq Ultrascale+ | Gen3 x16 | host or endpoint |
| NVIDIA Jetson AGX | Gen4 x8 | host |
| NXP LS1043A | Gen2 x4 | host |
| TI AM65x | Gen2 x2 | host |
| Cortex-M에는 PCIe 없음 (USB·Ethernet) | | |

Zynq Ultrascale+의 PCIe Gen3 16 lane은 양방향 16 GB/s를 제공합니다. 주로 카메라, SSD, GPU 연결에 쓰입니다.

## PCIe Endpoint — 우리가 device 만들 때

```c
/* Cortex-A SoC가 PCIe endpoint로 동작 */
/* 외부 host가 *우리 BAR* 액세스 */

/* BAR 설정 */
pcie_ep->BAR0_CFG = SIZE_64KB | TYPE_MEM32;

/* Host write → 우리 SoC memory에 mapping */
pcie_ep->BAR0_BASE = 0xC0000000;   // 우리 DRAM
```

NVMe SSD나 FPGA accelerator가 host PC의 endpoint로 동작하는 예입니다.

## Linux로 PCIe 디버깅

```bash
# Device 목록
lspci -v

# Config space 덤프
lspci -xxxx -s 01:00.0

# Topology
lspci -tv

# Speed·Width
lspci -vv -s 01:00.0 | grep LnkSta
# LnkSta: Speed 8GT/s (ok), Width x16 (ok)
```

`LnkSta`가 원하는 속도나 폭보다 낮게 나오면 training failure나 link error를 의심합니다.

## Error — AER (Advanced Error Reporting)

```bash
# /sys/kernel/debug/aer
echo 1 > /sys/bus/pci/devices/0000:01:00.0/reset
```

```c
/* dmesg log */
[12345.678] pcieport 0000:00:01.0: AER: PCIe Bus Error: severity=Corrected,
            type=Physical Layer
[12345.679]   Receiver Error Receiver ID: 00
```

Corrected는 hardware가 자동으로 처리합니다. 반대로 Uncorrectable Fatal은 device hang이나 system crash로 이어집니다.

## 자주 하는 실수

> ⚠️ BAR가 64-bit인데 32-bit으로 read

```c
uint32_t addr = pci_read_config_dword(dev, BAR0);
// ← 상위 32-bit 무시 — 4GB 이상 device 매핑 못 찾음
```

Type bit를 확인해서 64-bit이면 BAR1까지 합쳐 64-bit address를 만들어야 합니다.

> ⚠️ Bus Master 비활성

```c
pci_enable_device(pdev);
/* DMA 시작 */
dma_alloc_coherent(...);
/* → DMA 동작 안 함 */
```

`pci_set_master(pdev)` 호출이 필수입니다.

> ⚠️ Prefetchable Memory에 MMIO register

```c
struct device_config {
    uint32_t version;
    uint32_t control;   // ← write 시 영향 있는 register
};

mmio = pci_iomap(pdev, 0, 0);   // prefetchable 영역
```

Prefetchable 영역이면 CPU가 speculative read를 할 수 있습니다. side effect가 있는 register는 non-prefetchable 영역에 배치해야 합니다.

> ⚠️ Endpoint 측 BAR sizing 잘못

```c
pcie_ep->BAR0_CFG = SIZE_128KB;   // 128 KB 요청
/* 그러나 device 코드가 256 KB 사용 */
/* → 외부 host가 256 KB 영역 access 시 *나머지 절반* 안 보임 */
```

## 정리

- BAR는 device의 MMIO 영역 선언입니다.
- Enumeration은 config space scan과 BAR sizing으로 구성됩니다.
- Linux에서는 `pci_iomap`과 `ioread32`/`iowrite32`를 사용합니다.
- 64-bit BAR은 두 BAR을 합쳐 표현합니다.
- AER로 link error를 감지합니다.
- Endpoint 측에서는 host에 노출할 영역을 우리가 정의합니다.

다음 편은 **Device Tree**입니다.

## 관련 항목

- [1-02: DDR 초기화](/blog/embedded/modern-recipes/part1-02-ddr-init)
- [1-04: Device Tree](/blog/embedded/modern-recipes/part1-04-device-tree)
