---
title: "Ch 3: QEMU Fake FPGA 디바이스"
date: 2026-05-17T03:00:00
description: "Minimal PCIe FPGA model — QEMU에서 가상 FPGA 만들기."
tags: [QEMU, fake-fpga, qom, pci-device]
series: "FPGA Driver via QEMU+VFIO"
seriesOrder: 3
draft: true
---

이제 본격적으로 *가짜 FPGA*를 만듭니다. QEMU 안에 `fake-fpga`라는 PCI device를 QOM(QEMU Object Model)으로 정의하고, BAR 3개(CSR·DMA descriptor ring·user logic)를 노출해 driver가 *진짜 FPGA처럼* 다룰 수 있는 test bed를 구축합니다. 이 device가 이후 모든 장의 출발점이 됩니다.

## 어떤 문제를 푸는가

driver를 짜기 위해 *대상 디바이스*가 필요합니다. 실 FPGA는 비싸고, 합성 시간이 길고, 디버깅이 어렵죠. 우리가 만들 fake-fpga는:

- **실 FPGA가 노출하는 *인터페이스 표면*을 그대로 모방** — vendor/device ID, BAR layout, register encoding, MSI-X vector
- **함수적 동작은 *최소한*만** — 데이터 echo·counter·간단한 transform 정도
- **driver 코드를 재사용 가능하게** — Ch 4에서 register layout을 XDMA 호환으로 진화

driver 단위 테스트와 CI 통합에 충분한 baseline을 만드는 게 이 장의 목표입니다.

## QOM 클래스 정의

QEMU의 모든 device는 QOM 객체입니다. PCI device는 `TYPE_PCI_DEVICE`를 상속.

```text
TYPE_OBJECT
  └─ TYPE_DEVICE
       └─ TYPE_PCI_DEVICE
            └─ TYPE_FAKE_FPGA  ← 우리 device
```

## PCI 식별

PCI device를 구분하는 식별자.

| 필드 | 값 | 의미 |
|------|-----|------|
| Vendor ID | `0x1234` | 가짜 vendor (Linux mainline 미사용 ID) |
| Device ID | `0x6677` | 임의 |
| Class | `PCI_CLASS_PROCESSOR_CO` | "Co-processor" — accelerator 카테고리 |
| Sub-vendor | `0x1234` | (옵션) |
| Sub-device | `0x0001` | (옵션) bitstream 버전 표시 |

`0x1234`/`0x6677`은 *실 vendor와 충돌하지 않으면서* 시각적으로 구분이 쉽도록 고른 값입니다. 실 fab vendor ID(Xilinx 0x10ee, Intel 0x8086)는 피해야 합니다.

## Multi-region BAR

BAR(Base Address Register)는 PCI device가 host에 노출하는 *메모리 영역*입니다. fake-fpga는 3개 BAR을 사용합니다.

| BAR | 크기 | 용도 |
|-----|------|------|
| BAR0 | 4KB | CSR/control (ident, ctrl, status, version) |
| BAR1 | 16KB | DMA descriptor ring + doorbell |
| BAR2 | 64KB | user logic register space |

Shell 영역(BAR0+BAR1)과 user logic 영역(BAR2)을 *분리한* 이유는 Ch 2에서 본 *driver 재사용성*입니다. 같은 shell driver가 다양한 user logic에 붙을 수 있어야 합니다.

## 가장 간단한 구현

`hw/misc/fake-fpga.c`에 작성. 핵심 골격.

```c
/* hw/misc/fake-fpga.c — 최소 구현 */
#include "qemu/osdep.h"
#include "hw/pci/pci.h"
#include "hw/pci/msix.h"

#define TYPE_FAKE_FPGA "fake-fpga"
OBJECT_DECLARE_SIMPLE_TYPE(FakeFPGA, FAKE_FPGA)

struct FakeFPGA {
    PCIDevice parent;
    MemoryRegion bar0_csr;
    MemoryRegion bar1_dma;
    MemoryRegion bar2_user;

    /* CSR state */
    uint32_t ctrl;
    uint32_t status;
    uint32_t version;

    /* Properties */
    char *bitstream_file;
    uint32_t queue_depth;
};
```

## CSR 영역 read/write

`bar0_csr`에 대한 MMIO callback. CSR 표준 register들을 처리합니다.

```c
#define CSR_IDENT       0x0000   /* RO: "XLNX" magic */
#define CSR_CTRL        0x0004   /* RW */
#define CSR_VERSION     0x0008   /* RO */
#define CSR_STATUS      0x0040   /* RO */

static uint64_t csr_read(void *opaque, hwaddr off, unsigned size) {
    FakeFPGA *s = opaque;
    switch (off) {
    case CSR_IDENT:    return 0x584c4e58;   /* "XLNX" */
    case CSR_CTRL:     return s->ctrl;
    case CSR_VERSION:  return s->version;
    case CSR_STATUS:   return s->status;
    default:
        qemu_log_mask(LOG_GUEST_ERROR,
                      "fake-fpga: bad CSR read 0x%" HWADDR_PRIx "\n", off);
        return 0;
    }
}

static void csr_write(void *opaque, hwaddr off, uint64_t val, unsigned size) {
    FakeFPGA *s = opaque;
    switch (off) {
    case CSR_CTRL:
        s->ctrl = val & 0x1;
        break;
    case CSR_STATUS:
        /* W1C */
        s->status &= ~val;
        break;
    default:
        qemu_log_mask(LOG_GUEST_ERROR,
                      "fake-fpga: bad CSR write 0x%" HWADDR_PRIx "\n", off);
        break;
    }
}

static const MemoryRegionOps csr_ops = {
    .read = csr_read, .write = csr_write,
    .endianness = DEVICE_LITTLE_ENDIAN,
    .impl.min_access_size = 4, .impl.max_access_size = 4,
};
```

`dma_ops`와 `user_ops`도 같은 패턴으로 작성(Ch 4·6에서 채워 나갑니다).

## Realize — BAR 등록과 MSI-X 초기화

```c
static void fake_fpga_realize(PCIDevice *pdev, Error **errp) {
    FakeFPGA *s = FAKE_FPGA(pdev);

    /* BAR0 — CSR */
    memory_region_init_io(&s->bar0_csr, OBJECT(s), &csr_ops, s,
                          "fpga-csr", 0x1000);
    pci_register_bar(pdev, 0, PCI_BASE_ADDRESS_SPACE_MEMORY, &s->bar0_csr);

    /* BAR1 — DMA */
    memory_region_init_io(&s->bar1_dma, OBJECT(s), &dma_ops, s,
                          "fpga-dma", 0x4000);
    pci_register_bar(pdev, 1, PCI_BASE_ADDRESS_SPACE_MEMORY, &s->bar1_dma);

    /* BAR2 — user logic */
    memory_region_init_io(&s->bar2_user, OBJECT(s), &user_ops, s,
                          "fpga-user", 0x10000);
    pci_register_bar(pdev, 2, PCI_BASE_ADDRESS_SPACE_MEMORY, &s->bar2_user);

    /* MSI-X — 32 vector */
    msix_init_exclusive_bar(pdev, 32, 3, errp);

    /* 초기값 */
    s->version = 0x00010000;  /* 1.0 */
}
```

## qdev properties

device 인스턴스 옵션. command line에서 `-device fake-fpga,bitstream-file=...,queue-depth=64`로 전달.

```c
static Property fake_fpga_props[] = {
    DEFINE_PROP_STRING("bitstream-file", FakeFPGA, bitstream_file),
    DEFINE_PROP_UINT32("queue-depth", FakeFPGA, queue_depth, 32),
    DEFINE_PROP_END_OF_LIST(),
};
```

`bitstream-file`은 Ch 7(비트스트림 로딩)에서 사용. `queue-depth`는 Ch 6(descriptor ring)에서.

## 클래스 등록

```c
static void fake_fpga_class_init(ObjectClass *klass, void *data) {
    PCIDeviceClass *k = PCI_DEVICE_CLASS(klass);
    DeviceClass *dc = DEVICE_CLASS(klass);

    k->realize = fake_fpga_realize;
    k->vendor_id = 0x1234;
    k->device_id = 0x6677;
    k->class_id = PCI_CLASS_PROCESSOR_CO;
    k->revision = 0x01;
    device_class_set_props(dc, fake_fpga_props);
    dc->desc = "Fake FPGA for driver development";
}

static const TypeInfo fake_fpga_info = {
    .name          = TYPE_FAKE_FPGA,
    .parent        = TYPE_PCI_DEVICE,
    .instance_size = sizeof(FakeFPGA),
    .class_init    = fake_fpga_class_init,
    .interfaces = (InterfaceInfo[]) {
        { INTERFACE_CONVENTIONAL_PCI_DEVICE },
        {},
    },
};

static void fake_fpga_register(void) {
    type_register_static(&fake_fpga_info);
}
type_init(fake_fpga_register)
```

## Build 통합

QEMU 빌드에 통합하는 한 줄짜리 변경들.

```text
# hw/misc/Kconfig
config FAKE_FPGA
    bool
    default y if PCI

# hw/misc/meson.build
system_ss.add(when: 'CONFIG_FAKE_FPGA', if_true: files('fake-fpga.c'))
```

```bash
# QEMU 재빌드
ninja -C build
```

## 첫 부팅 — 확인

```bash
qemu-system-x86_64 -enable-kvm -m 2G -nographic \
    -kernel vmlinuz -initrd rootfs.img \
    -device fake-fpga,id=fpga0,bitstream-file=/tmp/dummy.bit,queue-depth=64 \
    -append "console=ttyS0"
```

guest 안에서:

```bash
# PCI device 확인
guest$ lspci -nn
00:04.0 Co-processor [0b40]: ... [1234:6677]  # 우리 fake-fpga!

guest$ lspci -vv -s 00:04.0
00:04.0 Co-processor: ...
    Subsystem: ...
    Region 0: Memory at fea00000 (32-bit, non-prefetchable) [size=4K]
    Region 1: Memory at fea01000 (32-bit, non-prefetchable) [size=16K]
    Region 2: Memory at fea05000 (32-bit, non-prefetchable) [size=64K]
    Capabilities: [50] MSI-X: Enable- Count=32 Masked-
```

3개 BAR이 정확한 크기로 보이고, MSI-X capability가 등록된 것을 확인할 수 있습니다.

## 첫 driver

minimal driver — probe시 IDENT register만 읽어 확인.

```c
/* my_fake_fpga.c */
#include <linux/module.h>
#include <linux/pci.h>

#define IDENT_MAGIC 0x584c4e58   /* "XLNX" */

static int my_fpga_probe(struct pci_dev *pdev, const struct pci_device_id *id) {
    void __iomem *mmio;
    u32 ident;

    if (pci_enable_device(pdev)) return -ENODEV;
    pci_set_master(pdev);

    mmio = pci_iomap(pdev, 0, 0);
    if (!mmio) return -EIO;

    ident = readl(mmio + 0x00);
    dev_info(&pdev->dev, "Fake FPGA IDENT: 0x%08x", ident);
    if (ident != IDENT_MAGIC) {
        dev_warn(&pdev->dev, "Bad IDENT!");
        return -ENODEV;
    }
    dev_info(&pdev->dev, "Version: 0x%08x", readl(mmio + 0x08));
    return 0;
}

static const struct pci_device_id my_fpga_ids[] = {
    { PCI_DEVICE(0x1234, 0x6677) }, { 0 }
};
MODULE_DEVICE_TABLE(pci, my_fpga_ids);

static struct pci_driver my_fpga_driver = {
    .name     = "my-fake-fpga",
    .id_table = my_fpga_ids,
    .probe    = my_fpga_probe,
};
module_pci_driver(my_fpga_driver);

MODULE_LICENSE("GPL");
```

guest에서 컴파일·삽입.

```bash
guest$ make -C /lib/modules/$(uname -r)/build M=$PWD modules
guest$ insmod my_fake_fpga.ko
guest$ dmesg | tail
my-fake-fpga 0000:00:04.0: Fake FPGA IDENT: 0x584c4e58
my-fake-fpga 0000:00:04.0: Version: 0x00010000
```

이로써 *QEMU에서 가짜 FPGA가 동작하고 driver가 인식*하는 사이클이 완성됐습니다. 이후 모든 장은 이 기반 위에서 진화합니다.

## 정리

- **fake-fpga**는 QEMU PCI device로 정의된 가짜 FPGA. driver test bed 역할.
- QOM 상속: `TYPE_PCI_DEVICE` → `TYPE_FAKE_FPGA`. realize·class_init·TypeInfo로 등록.
- BAR 3개 — **BAR0(CSR 4KB)**, **BAR1(DMA 16KB)**, **BAR2(user logic 64KB)**.
- MSI-X 32 vector 등록. 이후 IRQ injection의 기반.
- qdev property — `bitstream-file`·`queue-depth`로 시나리오 조정.
- `hw/misc/Kconfig` + `meson.build` 2줄 변경으로 빌드 통합.
- guest의 `lspci`에 정확한 BAR 크기·MSI-X capability가 보이면 성공.

## 다음 장 예고

다음 장에서는 fake-fpga의 BAR1에 **AXI ↔ PCIe bridge + DMA engine**을 구현합니다. Xilinx XDMA 호환 register layout을 만들어 driver 코드가 *실 FPGA로 그대로 이전*되게 합니다.

## 관련 항목

- [Ch 2: FPGA 아키텍처 Review](/blog/tools/emulation/qemu-fpga-driver/chapter02-fpga-architecture)
- [Ch 4: AXI ↔ PCIe Bridge 모방](/blog/tools/emulation/qemu-fpga-driver/chapter04-axi-pcie-bridge)
- [QEMU Fake Device — Simple PCI](/blog/tools/emulation/qemu-fake-device/chapter04-simple-pci)
- [QEMU Internals — QOM Deep Dive](/blog/tools/emulation/qemu-internals/chapter02-qom-deep-dive)
