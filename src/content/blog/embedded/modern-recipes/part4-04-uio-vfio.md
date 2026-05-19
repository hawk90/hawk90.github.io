---
title: "4-04: UIO·VFIO — Userspace Driver·DMA·IOMMU"
date: 2026-05-20T17:00:00
description: "UIO simple user driver. VFIO IOMMU·DMA. DPDK·SPDK·QEMU passthrough."
series: "Modern Embedded Recipes"
seriesOrder: 22
tags: [recipes, uio, vfio, dpdk, iommu, passthrough]
draft: true
---

## 한 줄 요약

> **"UIO·VFIO = user space에서 hardware 직접"** — kernel driver 없이 peripheral 통제.

## UIO — User-space I/O

```text
UIO 모델:
  - Kernel은 *minimal driver* (IRQ handler·MMIO 노출만)
  - User space가 모든 logic
  - mmap으로 MMIO·DMA buffer 접근
  - /dev/uioN으로 IRQ wait
```

장점:
- Kernel module 변경 없이 *driver 개발*
- crash해도 *kernel 영향 없음*
- Debug 쉬움 (gdb 직접)

단점:
- DMA 안전성 없음 (kernel UIO에 직접 IOMMU 없음)
- Single user (multi-process 어려움)

## UIO Kernel Side

```c
#include <linux/uio_driver.h>

static struct uio_info my_uio = {
    .name = "myuio",
    .version = "1.0",
    .irq = UIO_IRQ_NONE,   /* 또는 hardware IRQ number */
};

static int my_probe(struct platform_device *pdev) {
    struct resource *res = platform_get_resource(pdev, IORESOURCE_MEM, 0);
    
    my_uio.mem[0].addr = res->start;
    my_uio.mem[0].size = resource_size(res);
    my_uio.mem[0].memtype = UIO_MEM_PHYS;
    
    return uio_register_device(&pdev->dev, &my_uio);
}
```

## UIO User Side

```c
int fd = open("/dev/uio0", O_RDWR);

/* Map register space */
size_t size = 4096;
void *regs = mmap(NULL, size, PROT_READ | PROT_WRITE,
                   MAP_SHARED, fd, 0);

/* Direct register access */
volatile uint32_t *r = regs;
r[CTRL] = 1;
uint32_t status = r[STATUS];

/* IRQ wait */
uint32_t irq_count;
read(fd, &irq_count, 4);   /* block until IRQ */

/* Re-enable IRQ — UIO disables after delivery */
uint32_t enable = 1;
write(fd, &enable, 4);

munmap(regs, size);
close(fd);
```

## UIO 한계 — DMA 안전성

```text
UIO는 *IOMMU 사용 안 함*:
  - User process가 DMA 시키면
  - DMA address = physical address
  - Process가 임의 physical memory 접근 가능
  - → 보안 위험
```

→ DMA-capable device — **VFIO 사용**.

## VFIO — Virtual Function I/O

```text
VFIO 모델:
  - IOMMU 활용 (SMMU on ARM)
  - User-space DMA 안전 (제한된 영역만)
  - PCIe·Platform device 지원
  - Container·VM passthrough 표준
  - QEMU·DPDK·SPDK가 사용
```

## VFIO Setup

```bash
# Hardware passthrough — kernel driver unbind
echo 0000:01:00.0 > /sys/bus/pci/drivers/nvme/unbind

# VFIO bind
echo 8086 0a54 > /sys/bus/pci/drivers/vfio-pci/new_id
echo 0000:01:00.0 > /sys/bus/pci/drivers/vfio-pci/bind

# Device가 /dev/vfio/{group_id}로 노출
ls /dev/vfio/
# 0  1  vfio
```

## VFIO User Side

```c
int container = open("/dev/vfio/vfio", O_RDWR);
ioctl(container, VFIO_GET_API_VERSION);

/* Group 가져오기 */
int group = open("/dev/vfio/0", O_RDWR);
ioctl(group, VFIO_GROUP_SET_CONTAINER, &container);
ioctl(container, VFIO_SET_IOMMU, VFIO_TYPE1_IOMMU);

/* Device get */
int dev = ioctl(group, VFIO_GROUP_GET_DEVICE_FD, "0000:01:00.0");

/* BAR mmap */
struct vfio_region_info region = { .argsz = sizeof(region), .index = 0 };
ioctl(dev, VFIO_DEVICE_GET_REGION_INFO, &region);

void *bar = mmap(NULL, region.size, PROT_READ | PROT_WRITE,
                  MAP_SHARED, dev, region.offset);
/* PCIe BAR 0 → user space */

/* DMA buffer map */
void *dma_buf = mmap(NULL, 4096, PROT_READ | PROT_WRITE,
                      MAP_PRIVATE | MAP_ANONYMOUS, -1, 0);

struct vfio_iommu_type1_dma_map dma_map = {
    .argsz = sizeof(dma_map),
    .vaddr = (uint64_t)dma_buf,
    .iova = 0x10000000,
    .size = 4096,
    .flags = VFIO_DMA_MAP_FLAG_READ | VFIO_DMA_MAP_FLAG_WRITE,
};
ioctl(container, VFIO_IOMMU_MAP_DMA, &dma_map);

/* HW가 iova(0x10000000)로 DMA */
HW_REG_DMA_ADDR(0x10000000);
HW_REG_DMA_START();
```

IOMMU/SMMU가 *iova 0x10000000 → dma_buf physical* mapping.

## DPDK — VFIO 사용

```bash
# Setup
dpdk-devbind.py --bind=vfio-pci eth0

# DPDK application
sudo ./dpdk-app -l 0-3 -n 4 -- --port=0
```

DPDK가 *NIC을 VFIO로 grab* → user space에서 직접. Kernel network stack 우회.

## SPDK — NVMe Userspace

```c
/* SPDK */
spdk_nvme_probe(NULL, NULL, probe_cb, attach_cb, NULL);

/* attach_cb */
struct spdk_nvme_ns *ns = spdk_nvme_ctrlr_get_ns(ctrlr, 1);
spdk_nvme_ns_cmd_read(ns, qpair, buffer, 0, 1, cb, NULL, 0);
```

NVMe SSD를 *user space에서 직접*. 1 µs latency·1 M IOPS.

## QEMU·KVM PCI Passthrough

```bash
# VM에 NVMe SSD 통째로
qemu-system-x86_64 -enable-kvm \
    -device vfio-pci,host=01:00.0 \
    ...
```

Guest OS가 *real hardware* 사용. Cloud·자동차 hypervisor.

## ARM SMMU — IOMMU

```text
ARM System MMU:
  - Cortex-A SoC 표준 (Cortex-A53+ 일부)
  - PCIe + DMA endpoint
  - VFIO PASSTHROUGH 가능
  
Stage 1 (S1) — user/guest address translation
Stage 2 (S2) — VM/host address translation
```

자동차 ECU·자율주행 SoC — SMMU + VFIO로 *secure 격리*.

## UIO·VFIO 비교

| 항목 | UIO | VFIO |
|---|---|---|
| Kernel module | 작은 wrapper | vfio-pci |
| DMA 지원 | unsafe (raw) | safe (IOMMU) |
| Multi-process | 어려움 | container 가능 |
| PCIe | 제한적 | full |
| Container/VM | × | ✓ |
| 학습 곡선 | 낮음 | 중간 |
| 임베디드 | 일부 | modern SoC |

## RP2040 — User-Space GPIO

```c
/* /dev/gpiochipN — Linux 표준 */
int fd = open("/dev/gpiochip0", O_RDONLY);

struct gpiohandle_request req = {
    .lineoffsets = {17},
    .flags = GPIOHANDLE_REQUEST_OUTPUT,
    .lines = 1,
};
ioctl(fd, GPIO_GET_LINEHANDLE_IOCTL, &req);

struct gpiohandle_data data = { .values = {1} };
ioctl(req.fd, GPIOHANDLE_SET_LINE_VALUES_IOCTL, &data);
```

`libgpiod` — 표준 wrapper. UIO 보다 가볍게.

## /dev/mem — Direct Physical (위험)

```c
int fd = open("/dev/mem", O_RDWR);
void *regs = mmap(NULL, 4096, PROT_READ | PROT_WRITE,
                   MAP_SHARED, fd, PHYS_ADDR);
```

`/dev/mem` — 임의 physical address. **CAP_SYS_RAWIO** + kernel option 필요.

개발용 — *production 금지* (전체 memory 접근).

## 자동차·자율주행 사례

```text
DPDK on Cortex-A78AE:
  - VFIO-based NIC driver
  - 1 µs network latency
  - V2X·OTA·5G
  
NVMe SSD passthrough:
  - SPDK in guest VM
  - Real-time data logging
  - Black box recorder
  
Camera FPGA via VFIO:
  - User-space FPGA control
  - Vulkan compute integration
```

## libvfio·rte_vfio

```c
/* DPDK rte_vfio */
rte_vfio_setup_device(...);
rte_vfio_get_group_fd(...);
rte_vfio_container_dma_map(...);

/* libvfio (Solarflare) */
vfio_open();
vfio_map_iova();
```

직접 ioctl 호출 wrapping.

## 자주 하는 실수

> ⚠️ UIO에 DMA 시도

```c
/* UIO mmap된 buffer */
HW_DMA_ADDR = (uint32_t)buf;   /* virtual addr — DMA fail */
```

→ VFIO 또는 *kernel driver*.

> ⚠️ VFIO group 동시 사용

```text
VFIO group = IOMMU isolation 단위
  같은 group device는 *함께 unbind* 필요
```

→ `/sys/.../iommu_group/devices` 확인.

> ⚠️ /dev/mem 사용

```c
/dev/mem mmap PHYS_ADDR;
```

→ UIO·VFIO 사용. /dev/mem은 *bring-up·debug only*.

> ⚠️ kernel driver 안 unbind

```bash
# nvme driver active → vfio-pci bind fail
```

→ 먼저 `unbind`.

## 정리

- **UIO** = simple user-space driver, DMA unsafe.
- **VFIO** = IOMMU-based, container·VM passthrough.
- **DPDK·SPDK** = VFIO 위 user-space NIC·NVMe.
- ARM **SMMU** = IOMMU equivalent.
- **libgpiod** — GPIO user-space 표준.
- 자동차·서버 — VFIO passthrough 표준.

다음 편은 **sysfs·debugfs**.

## 관련 항목

- [4-03: epoll](/blog/embedded/modern-recipes/part4-03-epoll)
- [4-05: sysfs·debugfs](/blog/embedded/modern-recipes/part4-05-sysfs)
