---
title: "4-04: UIO·VFIO — User-Space Driver와 IOMMU 격리"
date: 2026-05-07T17:00:00
description: "UIO·VFIO로 user space에서 hardware를 다루는 방법, IOMMU 기반 DMA 안전성, DPDK·SPDK 사용 패턴을 정리합니다."
series: "Modern Embedded Recipes"
seriesOrder: 22
tags: [recipes, uio, vfio, iommu, dpdk, spdk]
---

## 한 줄 요약

> **"UIO는 user space에서 MMIO·IRQ를 보고, VFIO는 거기에 IOMMU 격리를 더한다."** Kernel module은 얇은 wrapper로 두고, 정책과 fast path를 user space에 두는 것이 두 framework의 공통 목표입니다.

## 어떤 상황에서 쓰나

FPGA 보드의 신규 register block을 일주일 안에 테스트해야 하면, 정식 kernel driver를 정성스럽게 만들기보다 UIO로 노출한 뒤 user space 코드로 동작을 확인하는 편이 훨씬 빠릅니다. Crash가 나도 process만 죽고 kernel은 안전합니다.

NIC·NVMe 같은 고성능 device를 다룰 때도 user space driver가 표준이 되었습니다. DPDK는 10G NIC에서 line rate를 받기 위해 kernel network stack을 우회하고, SPDK는 NVMe IOPS 100만을 user space에서 처리합니다. 두 경우 모두 IOMMU 보호가 필수라서 VFIO를 사용합니다.

## 핵심 개념

UIO와 VFIO는 layer가 다릅니다.

```text
UIO  : MMIO 영역과 IRQ를 /dev/uioN으로 노출
       DMA는 user가 알아서 (보통은 안 한다)
       작은 PCI/Platform device, FPGA bring-up

VFIO : IOMMU group 단위로 device를 user에 위임
       DMA address를 IOMMU가 변환·보호
       DPDK·SPDK·KVM passthrough 표준
```

UIO는 kernel side가 매우 얇습니다. `uio_register_device` 한 번이면 충분합니다. VFIO는 IOMMU·container·group이라는 세 가지 객체를 ioctl로 조립해야 합니다. Setup 복잡도가 늘어나는 대신, user process가 임의 physical memory에 DMA를 거는 사고를 원천 차단합니다.

## 코드 / 실제 사용 예

### UIO kernel side 최소 구현

```c
#include <linux/uio_driver.h>
#include <linux/platform_device.h>

struct sample_dev {
    struct uio_info info;
    void __iomem   *regs;
};

static irqreturn_t sample_isr(int irq, struct uio_info *info) {
    struct sample_dev *d = container_of(info, struct sample_dev, info);
    /* 인터럽트 ack 후 0 반환 = handled */
    writel(0x1, d->regs + IRQ_ACK);
    return IRQ_HANDLED;
}

static int sample_probe(struct platform_device *pdev) {
    struct sample_dev *d = devm_kzalloc(&pdev->dev, sizeof(*d), GFP_KERNEL);
    struct resource *r = platform_get_resource(pdev, IORESOURCE_MEM, 0);

    d->regs = devm_ioremap_resource(&pdev->dev, r);
    d->info.name   = "sample-uio";
    d->info.version= "1.0";
    d->info.mem[0].addr    = r->start;
    d->info.mem[0].size    = resource_size(r);
    d->info.mem[0].memtype = UIO_MEM_PHYS;
    d->info.irq     = platform_get_irq(pdev, 0);
    d->info.handler = sample_isr;

    return uio_register_device(&pdev->dev, &d->info);
}
```

`UIO_MEM_PHYS`로 등록된 BAR가 `/dev/uio0`로 노출됩니다. 보통 `/sys/class/uio/uio0/maps/map0/size`에서 크기를 확인합니다.

### UIO user side

```c
#include <fcntl.h>
#include <sys/mman.h>
#include <unistd.h>

int fd = open("/dev/uio0", O_RDWR);

size_t map_size = 4096;
void  *regs = mmap(NULL, map_size,
                   PROT_READ | PROT_WRITE,
                   MAP_SHARED, fd, 0);

volatile uint32_t *r = regs;
r[CTRL]     = 1;
uint32_t st = r[STATUS];

/* IRQ wait: read는 인터럽트 발생까지 블록 */
uint32_t count;
read(fd, &count, sizeof(count));

/* UIO는 ack 후 IRQ를 disable 함. 다시 활성화 */
uint32_t enable = 1;
write(fd, &enable, sizeof(enable));
```

interrupt loop은 별도 thread로 돌리고, register polling fast path는 mmap pointer로 처리하는 구조가 일반적입니다.

### VFIO PCI device 준비

```bash
# 기존 driver 분리
echo 0000:01:00.0 > /sys/bus/pci/drivers/nvme/unbind

# vfio-pci 바인딩
echo "8086 0a54" > /sys/bus/pci/drivers/vfio-pci/new_id

# 결과 확인
ls /dev/vfio
# 0  vfio        ← '0' 이 group id
```

IOMMU group은 PCIe topology에 따라 결정됩니다. 같은 group의 device들은 한꺼번에 묶여 user에게 위임됩니다.

### VFIO user side 골격

```c
#include <linux/vfio.h>

int container = open("/dev/vfio/vfio", O_RDWR);
int group     = open("/dev/vfio/0",   O_RDWR);

ioctl(group, VFIO_GROUP_SET_CONTAINER, &container);
ioctl(container, VFIO_SET_IOMMU, VFIO_TYPE1_IOMMU);

int dev = ioctl(group, VFIO_GROUP_GET_DEVICE_FD, "0000:01:00.0");

struct vfio_region_info reg = { .argsz = sizeof(reg), .index = 0 };
ioctl(dev, VFIO_DEVICE_GET_REGION_INFO, &reg);
void *bar0 = mmap(NULL, reg.size,
                  PROT_READ | PROT_WRITE,
                  MAP_SHARED, dev, reg.offset);

/* DMA buffer를 user에서 만들고 IOMMU에 매핑 */
void *dma = mmap(NULL, 1 << 20,
                 PROT_READ | PROT_WRITE,
                 MAP_PRIVATE | MAP_ANONYMOUS, -1, 0);

struct vfio_iommu_type1_dma_map m = {
    .argsz = sizeof(m),
    .vaddr = (uintptr_t)dma,
    .iova  = 0x10000000,
    .size  = 1 << 20,
    .flags = VFIO_DMA_MAP_FLAG_READ | VFIO_DMA_MAP_FLAG_WRITE,
};
ioctl(container, VFIO_IOMMU_MAP_DMA, &m);

/* HW에는 iova(0x10000000)를 알려준다 */
((volatile uint32_t*)bar0)[DMA_ADDR] = 0x10000000;
```

`iova`는 user가 정한 가상 주소이고, IOMMU가 이를 실제 physical로 변환합니다. user process가 잘못된 영역을 적어도 DMA가 그 영역으로 가지 않습니다.

### DPDK PMD가 VFIO를 쓰는 방식

```bash
dpdk-devbind.py --bind=vfio-pci 0000:81:00.0
sudo ./l3fwd -l 0-3 -n 4 -- -p 0x1 --config="(0,0,1)"
```

DPDK는 NIC를 VFIO로 grab한 뒤 PMD(Poll Mode Driver)가 RX queue를 polling합니다. IRQ가 아니라 user thread가 직접 ring을 읽으니 1 µs 단위 latency가 가능합니다.

### SPDK가 NVMe를 직접 잡는 방식

```c
spdk_nvme_probe(NULL, NULL, probe_cb, attach_cb, NULL);
/* attach_cb 안에서 namespace를 잡아 read/write 직접 발행 */
```

SPDK도 내부적으로 VFIO를 사용합니다. NVMe queue를 user space에서 만들고, doorbell write로 명령을 제출합니다. Linux block layer를 거치지 않으니 1 M IOPS, p99 latency 10 µs 같은 수치가 가능합니다.

### vfio-platform — SoC 내장 IP

```bash
# Device Tree에서 reserved-memory와 status="okay" 설정 후
echo myip > /sys/bus/platform/drivers/vfio-platform/bind
ls /dev/vfio
```

PCIe가 아닌 platform bus의 IP block도 VFIO로 user에 위임할 수 있습니다. ARM SoC의 image accelerator나 video codec을 user space에서 다룰 때 유용합니다.

## 측정 / 성능 비교

NVMe SSD를 같은 하드웨어에서 측정한 결과입니다.

```text
스택                     IOPS(4KB QD32)    p99 latency
Linux block + io_uring   720 K              48 µs
SPDK (VFIO)              1.05 M             12 µs
```

10 GbE NIC에서 64-byte packet을 forwarding했을 때입니다.

```text
스택                     PPS              latency
Linux kernel + napi      2.3 Mpps         18 µs
DPDK + VFIO              14.8 Mpps        2.5 µs
```

UIO는 보통 throughput보다 *간편함*이 이유입니다. FPGA bring-up에서 driver 한 줄도 새로 짜지 않고 register polling을 시작할 수 있다는 점이 큰 가치입니다.

## 자주 보는 함정

> UIO에서 user가 직접 DMA 주소를 만든 경우

```c
HW_REG_DMA_ADDR = (uint32_t)buf;   /* virtual = physical 아님 */
```

UIO는 IOMMU 없이 physical address를 그대로 씁니다. user space의 가상 주소를 그대로 적으면 무관한 메모리를 침범하거나 SMMU fault가 납니다. DMA가 필요하면 VFIO나 정식 kernel driver를 씁니다.

> VFIO group을 통째로 받지 않은 경우

```bash
# 같은 group에 있는 다른 device가 host driver에 묶여 있음
# → VFIO_GROUP_GET_DEVICE_FD가 -EINVAL
```

IOMMU group의 모든 device가 vfio-pci에 묶여 있어야 합니다. `/sys/kernel/iommu_groups/<id>/devices` 목록을 먼저 확인합니다.

> IOMMU 비활성 BIOS

```bash
dmesg | grep -i iommu
# DMAR: IOMMU disabled
```

`intel_iommu=on` 또는 `iommu=pt amd_iommu=on`을 kernel cmdline에 추가하거나, ARM 보드에서는 SMMU가 켜져 있는지 확인합니다. IOMMU가 꺼져 있으면 VFIO는 일반 모드로 동작할 수 없습니다.

> UIO IRQ를 enable하지 않음

```c
read(fd, &count, sizeof(count));   /* 첫 인터럽트는 도착 */
/* 그러나 write로 enable 다시 안 함 */
```

UIO는 ISR 안에서 IRQ를 자동 disable합니다. user가 처리 후 `write(fd, &one, 4)`로 다시 enable해야 다음 인터럽트가 옵니다.

> `/dev/mem`으로 우회

```c
int fd = open("/dev/mem", O_RDWR);
void *r = mmap(NULL, 4096, ..., fd, PHYS);
```

`/dev/mem`은 전체 물리 메모리에 접근할 수 있어 production에서는 금지입니다. 같은 작업이 UIO·VFIO로 가능합니다.

## 정리

- UIO는 user space에서 MMIO와 IRQ를 다루는 가장 단순한 방법이고, FPGA bring-up과 prototyping에 잘 맞습니다.
- VFIO는 IOMMU 격리를 더해 DMA를 안전하게 user space에 위임합니다.
- DPDK는 NIC을 VFIO로 grab해 PMD가 polling으로 packet을 처리하고, SPDK는 NVMe queue를 직접 다룹니다.
- IOMMU group은 PCIe 토폴로지가 결정하며, 같은 group의 device는 함께 vfio-pci로 묶어야 합니다.
- UIO는 IRQ를 자동 disable하므로 처리 후 `write(fd, &one, 4)`로 다시 enable합니다.
- IOMMU가 꺼져 있거나 group이 분리되지 않으면 VFIO는 setup 단계에서 실패합니다.
- `/dev/mem`은 부트업 디버그용으로만 두고, 실제 production driver는 UIO·VFIO를 거치는 편이 안전합니다.

다음 편은 **sysfs**입니다.

## 관련 항목

- [4-01: Kernel Module](/blog/embedded/modern-recipes/part4-01-kernel-module)
- [4-02: mmap](/blog/embedded/modern-recipes/part4-02-mmap)
- [PE 3-03: DMA Performance](/blog/embedded/performance-engineering/part3-03-dma-performance)
