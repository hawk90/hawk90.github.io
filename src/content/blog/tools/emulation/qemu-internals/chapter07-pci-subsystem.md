---
title: "Ch 7: PCI 서브시스템"
date: 2026-05-17T07:00:00
description: "QEMU PCI 버스, 브릿지, 디바이스 구현을 이해한다."
tags: [QEMU, PCI, PCIe, BAR, Bus]
series: "QEMU Internals"
seriesOrder: 7
draft: true
---

PCI는 x86·ARM·RISC-V 모두에서 *device discovery + 메모리 mapping*의 표준입니다. QEMU의 PCI 서브시스템은 *host bridge·root complex·bus·device·BAR·capability·MSI-X*를 모두 모델링해, mainline Linux PCI driver가 *그대로 동작*합니다.

## PCI 토폴로지

```text
Root Complex (Host bridge)
    │
    ├── PCI Bus 0
    │   ├── device 0 (CPU/memory)
    │   ├── device 1 (chipset)
    │   └── PCI-PCI Bridge
    │       └── PCI Bus 1
    │           ├── device 0 (NIC)
    │           └── device 1 (Storage)
    └── (다른 root port)
```

QEMU는 *Q35 chipset*(PCIe)와 *i440FX*(legacy PCI) 두 host bridge 모델 제공.

## PCIDevice 구조체

```c
typedef struct PCIDevice {
    DeviceState qdev;
    /* config space */
    uint8_t config[PCIE_CONFIG_SPACE_SIZE];

    /* BARs (Base Address Registers) */
    PCIIORegion io_regions[PCI_NUM_REGIONS];

    /* MSI/MSI-X */
    MSIVectorUseNotifier msi_vector_use_notifier;

    /* AddressSpace for DMA */
    AddressSpace bus_master_as;

    /* bus pointer */
    PCIBus *bus;

    /* ... */
} PCIDevice;
```

`config`가 *PCI configuration space*(256B 또는 4KB). vendor/device ID·class·BAR·capability 모두 여기에.

## Vendor/Device ID 등록

```c
static void my_pci_class_init(ObjectClass *klass, void *data) {
    DeviceClass *dc = DEVICE_CLASS(klass);
    PCIDeviceClass *k = PCI_DEVICE_CLASS(klass);

    k->realize     = my_pci_realize;
    k->vendor_id   = 0x1234;
    k->device_id   = 0x5678;
    k->class_id    = PCI_CLASS_PROCESSOR_CO;
    k->revision    = 0x01;

    set_bit(DEVICE_CATEGORY_MISC, dc->categories);
}
```

guest의 `lspci`가 이 값을 그대로 보임.

## BAR — Base Address Register

device가 노출하는 *메모리/IO 영역*. 최대 6개(또는 64-bit BAR로 3쌍).

```c
static void my_pci_realize(PCIDevice *pdev, Error **errp) {
    MyDevice *s = MY_DEVICE(pdev);

    /* BAR0 — MMIO 4KB */
    memory_region_init_io(&s->mmio, OBJECT(s), &my_ops, s,
                          "my-mmio", 0x1000);
    pci_register_bar(pdev, 0, PCI_BASE_ADDRESS_SPACE_MEMORY, &s->mmio);

    /* BAR1 — MMIO 64KB */
    memory_region_init_io(&s->user, OBJECT(s), &user_ops, s,
                          "user", 0x10000);
    pci_register_bar(pdev, 1, PCI_BASE_ADDRESS_SPACE_MEMORY, &s->user);

    /* BAR2 — I/O port 16B (legacy) */
    memory_region_init_io(&s->portio, OBJECT(s), &port_ops, s,
                          "port", 0x10);
    pci_register_bar(pdev, 2, PCI_BASE_ADDRESS_SPACE_IO, &s->portio);
}
```

| BAR type | flag |
|----------|------|
| 32-bit MMIO | `PCI_BASE_ADDRESS_SPACE_MEMORY` |
| 64-bit MMIO | + `PCI_BASE_ADDRESS_MEM_TYPE_64` |
| Prefetchable | + `PCI_BASE_ADDRESS_MEM_PREFETCH` |
| I/O port | `PCI_BASE_ADDRESS_SPACE_IO` |

## Config space 접근

```c
/* 자체 config read/write 정의 */
static uint32_t my_pci_config_read(PCIDevice *pdev,
                                    uint32_t addr, int len) {
    if (addr == MY_CUSTOM_REG) {
        return s->custom_value;
    }
    return pci_default_read_config(pdev, addr, len);
}

static void my_pci_config_write(PCIDevice *pdev, uint32_t addr,
                                 uint32_t val, int len) {
    pci_default_write_config(pdev, addr, val, len);
    if (addr == MY_CUSTOM_REG) {
        s->custom_value = val;
    }
}

static void my_pci_class_init(...) {
    k->config_read  = my_pci_config_read;
    k->config_write = my_pci_config_write;
}
```

대부분은 *기본 함수*로 충분. custom capability 추가 시 override.

## MSI-X capability

```c
static void my_pci_realize(PCIDevice *pdev, Error **errp) {
    MyDevice *s = MY_DEVICE(pdev);

    /* BAR 등록 */
    /* ... */

    /* MSI-X: 32 vectors, BAR3을 table/PBA로 */
    int ret = msix_init_exclusive_bar(pdev, 32, 3, errp);
    if (ret < 0) return;

    /* 각 vector enable */
    for (int i = 0; i < 32; i++) {
        msix_vector_use(pdev, i);
    }
}
```

IRQ 발사.

```c
msix_notify(pdev, vector_idx);
```

KVM 모드에서는 `irqfd`를 통해 *vmexit 없이* guest로 inject.

## DMA — pci_dma_*

PCI device가 host RAM에 직접 접근(DMA).

```c
/* PCI device가 host memory 읽기 */
pci_dma_read(&pdev->parent, dma_addr, buf, len);

/* 쓰기 */
pci_dma_write(&pdev->parent, dma_addr, buf, len);
```

내부적으로 *device의 AddressSpace*(`bus_master_as`)를 거쳐 IOMMU 변환 후 host RAM에.

## PCIe vs PCI

QEMU는 둘 다 지원.

| 측면 | PCI | PCIe |
|------|-----|------|
| config space | 256B | 4KB |
| host bridge | i440FX | Q35 (root complex) |
| MSI | 옵션 | 표준 |
| MSI-X | 옵션 | 일반 |
| Hot-plug | 제한적 | 표준 |

새 device는 *PCIe 권장* — Q35 머신에서.

## Hot-plug

PCIe device를 *런타임에* attach/detach.

```text
(qemu) device_add my-device,id=dev1,bus=root-port-0
(qemu) device_del dev1
```

guest의 PCI hotplug driver가 새 device를 *자동 enumerate*.

## SR-IOV

physical function이 *여러 virtual function* 생성. FPGA Driver Ch 11에서.

```c
pcie_sriov_pf_init(pdev, offset, "my-vf", vf_dev_id,
                    init_vfs, total_vfs, ...);
```

guest가 `sriov_numvfs`에 N을 쓰면 N개 VF가 *동적 생성*.

## Capability list

PCI의 *확장 기능* 등록.

```c
/* MSI capability */
pos = pci_add_capability(pdev, PCI_CAP_ID_MSI, 0,
                          PCI_MSI_FLAGS_64BIT, errp);
/* PCIe capability */
pcie_endpoint_cap_init(pdev, 0x80);

/* AER */
pcie_aer_init(pdev, AER_CAP_VER, 0x100, PCI_ERR_SIZEOF, errp);
```

linked list로 관리. guest driver가 capability ID로 *각 기능 활성*.

## Q35 머신의 PCIe 토폴로지

```text
Q35 root complex (mch)
├── ICH9 LPC bridge (ISA)
├── ICH9 SMBus
├── ICH9 AHCI (SATA)
├── ICH9 USB
├── pcie.0 (root bus)
│   ├── slot 0 — first PCIe device
│   ├── slot 1
│   └── pcie-root-port (downstream)
│       └── 추가 device or switch
└── (다른 slot/bridge)
```

real Q35 chipset 토폴로지를 그대로 따라감.

## 흔한 함정

- **BAR 크기 0이거나 비2의 거듭제곱** — PCI spec 위반. 항상 2^N.
- **MSI-X table BAR 충돌** — MSI-X table을 *기존 BAR*에 두면 callback이 *capture*해야. exclusive_bar 권장.
- **config_write override 시 default 호출 누락** — vendor reg만 처리하고 default 잊으면 *모든 standard cfg가 깨짐*.
- **DMA address가 IOVA** — IOMMU 없는 환경에서 guest PA로 가정 가능. IOMMU 활성 시 IOVA로 변환 필요.

## 정리

- QEMU PCI 서브시스템은 *host bridge·bus·device·BAR·MSI-X*를 모두 모델링.
- `PCIDevice` 구조체에 *config space·BAR·MSI-X·AddressSpace* 통합.
- BAR 등록: `pci_register_bar` — MMIO·I/O·64-bit·prefetch.
- MSI-X: `msix_init_exclusive_bar` + `msix_notify` — KVM irqfd로 가속.
- DMA: `pci_dma_read/write` — device의 AddressSpace 경유 IOMMU 변환.
- Q35(PCIe) vs i440FX(legacy) 두 머신. 새 device는 Q35.
- Hot-plug, SR-IOV(Ch 11 FPGA), capability list, AER 등 advanced 지원.

## 다음 장 예고

다음 장은 *PCI device의 핵심 출력*인 **IRQ** — interrupt controller(GIC·APIC·PLIC) 구현을 봅니다.

## 관련 항목

- [Ch 6: 네트워크 레이어](/blog/tools/emulation/qemu-internals/chapter06-network-layer)
- [Ch 8: 인터럽트 컨트롤러](/blog/tools/emulation/qemu-internals/chapter08-interrupt-controller)
- [QEMU Fake Device — Simple PCI](/blog/tools/emulation/qemu-fake-device/chapter04-simple-pci)
- [FPGA Driver — SR-IOV](/blog/tools/emulation/qemu-fpga-driver/chapter11-sriov-mdev)
