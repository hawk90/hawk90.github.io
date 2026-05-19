---
title: "Ch 3: QEMU Fake FPGA 디바이스"
date: 2026-05-17T03:00:00
description: "Minimal PCIe FPGA model — QEMU에서 가상 FPGA 만들기."
tags: [QEMU, fake-fpga, qom, pci-device]
series: "FPGA Driver via QEMU+VFIO"
seriesOrder: 3
draft: true
---

## 이 챕터의 의도

Driver를 작성할 대상 디바이스를 QEMU 안에 만든다. `fake-fpga`라는 PCI device를 QOM으로 정의하고 BAR 3개(CSR, descriptor ring, user logic)를 노출한다. 이것이 시리즈의 test bed가 되고, 이후 모든 챕터는 이 위에서 작업한다.

## 핵심 항목

- ✦ Goal — driver test bed, 실 FPGA가 노출하는 모든 *인터페이스 표면*을 모방
- ✦ **QOM 클래스 정의** — `TYPE_FAKE_FPGA`, `PCIDeviceClass` 상속
- ✦ PCI 식별 — vendor 0x1234, device 0x6677 (Linux mainline에 없는 ID), class `PCI_CLASS_PROCESSOR_CO`
- ✦ Multi-region BAR
  - **BAR0** (4KB) — CSR/control (ident, ctrl, status, version)
  - **BAR1** (16KB) — DMA descriptor ring + doorbell
  - **BAR2** (64KB) — user logic register space
- ✦ MMIO callbacks per BAR — `MemoryRegionOps` (Ch 13 Fake Device 참고)
- ✦ PCI capabilities — MSI-X (queue 수에 비례한 vector)
- ✦ qdev property — `bitstream-file`, `queue-depth`, `user-logic-version`
- ✦ Build 통합 — `hw/misc/Kconfig` (config FAKE_FPGA), `hw/misc/meson.build` 추가
- ✦ 처음 부팅 — `-device fake-fpga` → guest에서 `lspci -nn`로 확인
- ✦ 처음 driver — 단순 probe → `dev_info` 출력만
- ◦ Multi-function FPGA 확장 (Ch 11 SR-IOV로 진화)

## 다이어그램 (3)

1. fake-fpga PCI 트리 — vendor/device/BAR0-2
2. QOM 상속 — Object → DeviceState → PCIDevice → FakeFPGA
3. 시리즈 다음 챕터들이 이 device에 무엇을 추가하는지 트리

## 코드 sketch

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
    uint32_t ctrl, status, version;
    char *bitstream_file;
    uint32_t queue_depth;
};

static uint64_t csr_read(void *opaque, hwaddr off, unsigned sz) {
    FakeFPGA *s = opaque;
    switch (off) {
    case 0x00: return 0x584c4e58;   /* IDENT "XLNX" */
    case 0x04: return s->ctrl;
    case 0x40: return s->status;
    }
    return 0;
}

static void csr_write(void *opaque, hwaddr off, uint64_t val, unsigned sz) {
    FakeFPGA *s = opaque;
    if (off == 0x04) s->ctrl = val;
}

static const MemoryRegionOps csr_ops = {
    .read = csr_read, .write = csr_write,
    .endianness = DEVICE_LITTLE_ENDIAN,
    .impl.min_access_size = 4, .impl.max_access_size = 4,
};

static void fake_fpga_realize(PCIDevice *pdev, Error **errp) {
    FakeFPGA *s = FAKE_FPGA(pdev);
    memory_region_init_io(&s->bar0_csr, OBJECT(s), &csr_ops, s, "fpga-csr", 0x1000);
    memory_region_init_io(&s->bar1_dma, OBJECT(s), &dma_ops, s, "fpga-dma", 0x4000);
    memory_region_init_io(&s->bar2_user, OBJECT(s), &user_ops, s, "fpga-user", 0x10000);
    pci_register_bar(pdev, 0, PCI_BASE_ADDRESS_SPACE_MEMORY, &s->bar0_csr);
    pci_register_bar(pdev, 1, PCI_BASE_ADDRESS_SPACE_MEMORY, &s->bar1_dma);
    pci_register_bar(pdev, 2, PCI_BASE_ADDRESS_SPACE_MEMORY, &s->bar2_user);
    msix_init_exclusive_bar(pdev, 32, 3, errp);
}

static Property fake_fpga_props[] = {
    DEFINE_PROP_STRING("bitstream-file", FakeFPGA, bitstream_file),
    DEFINE_PROP_UINT32("queue-depth", FakeFPGA, queue_depth, 32),
    DEFINE_PROP_END_OF_LIST(),
};

static void fake_fpga_class_init(ObjectClass *klass, void *data) {
    PCIDeviceClass *k = PCI_DEVICE_CLASS(klass);
    k->realize = fake_fpga_realize;
    k->vendor_id = 0x1234; k->device_id = 0x6677;
    k->class_id = PCI_CLASS_PROCESSOR_CO;
    device_class_set_props(DEVICE_CLASS(klass), fake_fpga_props);
}

static const TypeInfo fake_fpga_info = {
    .name = TYPE_FAKE_FPGA, .parent = TYPE_PCI_DEVICE,
    .instance_size = sizeof(FakeFPGA), .class_init = fake_fpga_class_init,
    .interfaces = (InterfaceInfo[]) { { INTERFACE_CONVENTIONAL_PCI_DEVICE }, {}, },
};

static void fake_fpga_register(void) { type_register_static(&fake_fpga_info); }
type_init(fake_fpga_register);
```

```bash
# Build into QEMU
echo 'config FAKE_FPGA\n   bool\n   default y\n   depends on PCI' >> hw/misc/Kconfig
# hw/misc/meson.build에 fake-fpga.c 추가
ninja -C build

# 실행
qemu-system-x86_64 -enable-kvm -m 2G \
    -device fake-fpga,bitstream-file=/tmp/dummy.bit,queue-depth=64 \
    -kernel vmlinuz -initrd initrd -nographic
# guest: lspci -nn | grep 1234
```

## 레퍼런스

- QEMU `Documentation/devel/writing-qmp-commands.rst`, `Documentation/devel/qom.rst`
- QEMU `hw/misc/edu.c` — 가장 단순한 PCI device 참고
- Xilinx XDMA IP product guide (PG195) — 실 FPGA reg layout 참고

## 관련 항목

- [Ch 2: FPGA 아키텍처](/blog/tools/emulation/qemu-fpga-driver/chapter02-fpga-architecture)
- [Ch 4: AXI ↔ PCIe bridge](/blog/tools/emulation/qemu-fpga-driver/chapter04-axi-pcie-bridge)
- [QEMU Fake Device Ch 13: Register Bank](/blog/tools/emulation/qemu-fake-device/chapter13-register-bank)
- [QEMU Fake Device Ch 4: Simple PCI](/blog/tools/emulation/qemu-fake-device/chapter04-simple-pci) (기존)
