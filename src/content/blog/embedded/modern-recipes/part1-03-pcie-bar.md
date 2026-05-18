---
title: "1-03: PCIe BAR 매핑 — Config Space·Enumeration·MMIO 접근"
date: 2026-05-13T20:00:00
description: "PCIe BAR (Base Address Register), enumeration, sizing, MMIO 매핑, ioremap."
series: "Modern Embedded Recipes"
seriesOrder: 3
tags: [recipes, pcie, bar, mmio, enumeration]
draft: true
---

## 한 줄 요약

> **"BAR = device 메모리/IO 영역 선언"** — CPU가 *어디로 접근*할지 알려줌.

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

PCIe extended config = *4 KB* (PCIe Spec). 일반 OS는 0x100 이상도 액세스.

## BAR Layout

```text
BAR (32-bit register):

  31                          4  3  2 1  0
  ┌─────────────────────────────┬──┬──┬──┐
  │ Base Address              0 │ P│Ty│M │
  └─────────────────────────────┴──┴──┴──┘

  M (bit 0): 0 = Memory, 1 = I/O
  Type (bit 1-2 for memory):
    00 = 32-bit
    10 = 64-bit (다음 BAR과 pair)
  P (bit 3): Prefetchable
```

64-bit BAR — 두 인접 BAR 사용 (예: BAR0 + BAR1).

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

예: device가 64 KB 요청 → mask = `0xFFFF0000`, size = `0x10000`.

## Enumeration 흐름

```text
Boot 시:
1. Root Complex (CPU) — bus 0 scan
2. Bus 0 device 0~31 × function 0~7 query
3. Vendor ID = 0xFFFF — device 없음
4. Bridge 발견 → 새 bus 번호 할당, recursive scan
5. 각 endpoint device의 BAR sizing
6. BIOS/BootROM이 free MMIO 영역에서 *주소 할당*
7. Command register Enable Memory·I/O·Bus Master
```

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

`pci_iomap`은 *내부에서 `ioremap`* — page table에 *non-cacheable mapping* 추가.

## __iomem 타입 표시

```c
void __iomem *mmio;
uint32_t v = ioread32(mmio + 0x10);   // ← 정확
uint32_t v = *(uint32_t*)(mmio + 0x10);   // ← 컴파일러 경고, 위험
```

`__iomem` (sparse annotation) — *pointer가 IO space*임을 표시. Direct dereference 금지. `iowrite32`·`ioread32`·`readl`·`writel` 사용.

## Volatile + Memory Barrier

```c
uint32_t val = ioread32(mmio + 0x10);
__iowmb();   // ← write memory barrier
iowrite32(val, mmio + 0x14);
```

DMA + MMIO 순서 보장. `dma_wmb()`·`smp_wmb()` 와 *다른 barrier*.

## DPDK·SPDK — User-space PCIe

Linux kernel bypass:

```c
struct rte_pci_device *dev;
void *mmio = rte_pci_map_resource(dev, 0);

/* User-space에서 직접 register read/write */
volatile uint32_t *reg = (uint32_t*)mmio;
*reg = 0x12345678;
```

장점 — kernel/user mode 전환 없음, 매우 빠름.
단점 — driver 통제 안 됨, 위험.

## VFIO — Hardware Passthrough

```bash
# VM에 NVMe SSD 직접 할당
echo 0000:01:00.0 > /sys/bus/pci/drivers/nvme/unbind
echo 8086 0a54   > /sys/bus/pci/drivers/vfio-pci/new_id
```

QEMU/KVM이 VFIO로 *PCIe device 통째로* VM에 넘김. BAR도 VM의 게스트 메모리에 mapping.

## PCIe Root Complex 임베디드

| SoC | PCIe Spec | Lane |
|---|---|---|
| Xilinx Zynq Ultrascale+ | Gen3 x16 | host or endpoint |
| NVIDIA Jetson AGX | Gen4 x8 | host |
| NXP LS1043A | Gen2 x4 | host |
| TI AM65x | Gen2 x2 | host |
| Cortex-M에는 PCIe 없음 (USB·Ethernet) | | |

Zynq Ultrascale+ — PCIe Gen3 16 lane = 16 GB/s 양방향. *카메라·SSD·GPU* 연결.

## PCIe Endpoint — 우리가 device 만들 때

```c
/* Cortex-A SoC가 PCIe endpoint로 동작 */
/* 외부 host가 *우리 BAR* 액세스 */

/* BAR 설정 */
pcie_ep->BAR0_CFG = SIZE_64KB | TYPE_MEM32;

/* Host write → 우리 SoC memory에 mapping */
pcie_ep->BAR0_BASE = 0xC0000000;   // 우리 DRAM
```

NVMe SSD·FPGA accelerator 가 host PC의 endpoint.

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

`LnkSta`가 *원하는 속도·폭*보다 *낮으면* — *training failure* 또는 *link error*.

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

Corrected → hardware 자동 처리. Uncorrectable Fatal → device hang·system crash.

## 자주 하는 실수

> ⚠️ BAR가 64-bit인데 32-bit으로 read

```c
uint32_t addr = pci_read_config_dword(dev, BAR0);
// ← 상위 32-bit 무시 — 4GB 이상 device 매핑 못 찾음
```

Type bit 확인 후 64-bit이면 *BAR1까지 합쳐서* 64-bit address.

> ⚠️ Bus Master 비활성

```c
pci_enable_device(pdev);
/* DMA 시작 */
dma_alloc_coherent(...);
/* → DMA 동작 안 함 */
```

`pci_set_master(pdev)` 필수.

> ⚠️ Prefetchable Memory에 MMIO register

```c
struct device_config {
    uint32_t version;
    uint32_t control;   // ← write 시 영향 있는 register
};

mmio = pci_iomap(pdev, 0, 0);   // prefetchable 영역
```

Prefetchable이면 CPU가 *speculative read* 가능 — side effect register는 *non-prefetchable*에.

> ⚠️ Endpoint 측 BAR sizing 잘못

```c
pcie_ep->BAR0_CFG = SIZE_128KB;   // 128 KB 요청
/* 그러나 device 코드가 256 KB 사용 */
/* → 외부 host가 256 KB 영역 access 시 *나머지 절반* 안 보임 */
```

## 정리

- BAR = device의 *MMIO 영역 선언*.
- Enumeration — config space scan + BAR sizing.
- Linux `pci_iomap` + `ioread32`/`iowrite32`.
- 64-bit BAR은 *두 BAR* 합쳐서.
- AER로 link error 감지.
- Endpoint side는 *우리가 host에 노출할 영역*.

다음 편은 **Device Tree**.

## 관련 항목

- [1-02: DDR 초기화](/blog/embedded/modern-recipes/part1-02-ddr-init)
- [1-04: Device Tree](/blog/embedded/modern-recipes/part1-04-device-tree)
