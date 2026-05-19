---
title: "Ch 3: 메모리 모델"
date: 2026-05-17T03:00:00
description: "MemoryRegion과 AddressSpace로 QEMU의 메모리 시스템을 이해한다."
tags: [QEMU, Memory, AddressSpace, MemoryRegion, IOMMU]
series: "QEMU Internals"
seriesOrder: 3
draft: true
---

QEMU의 *모든 device*는 메모리 공간 어딘가에 자리합니다 — DRAM·flash·MMIO peripheral. 이 메모리 공간을 *구조화된 tree*로 모델링한 것이 **MemoryRegion**과 **AddressSpace**입니다. 새 device를 만들거나 메모리 맵을 조정할 때 *반드시* 이 모델을 이해해야 합니다.

## MemoryRegion — 5종 type

각 메모리 영역은 다섯 종류 중 하나.

| Type | 의미 | 생성 함수 |
|------|------|----------|
| **RAM** | 진짜 host RAM 할당 | `memory_region_init_ram` |
| **I/O** | callback 기반 register | `memory_region_init_io` |
| **ROM** | read-only 데이터 | `memory_region_init_rom` |
| **Alias** | 다른 region의 view | `memory_region_init_alias` |
| **Container** | 하위 region들의 그룹 | `memory_region_init` |

대부분의 device는 *I/O*(MMIO callback)과 *RAM*(buffer)을 조합해 사용합니다.

## 가장 간단한 예 — I/O region

```c
typedef struct MyDeviceState {
    SysBusDevice parent;
    MemoryRegion mmio;
    uint32_t ctrl;
    uint32_t status;
} MyDeviceState;

static uint64_t my_read(void *opaque, hwaddr addr, unsigned size) {
    MyDeviceState *s = opaque;
    switch (addr) {
    case 0x00: return s->ctrl;
    case 0x04: return s->status;
    }
    return 0;
}

static void my_write(void *opaque, hwaddr addr,
                     uint64_t val, unsigned size) {
    MyDeviceState *s = opaque;
    switch (addr) {
    case 0x00: s->ctrl = val; break;
    }
}

static const MemoryRegionOps my_ops = {
    .read = my_read,
    .write = my_write,
    .endianness = DEVICE_LITTLE_ENDIAN,
};

static void my_device_realize(DeviceState *dev, Error **errp) {
    MyDeviceState *s = MY_DEVICE(dev);

    memory_region_init_io(&s->mmio, OBJECT(s), &my_ops, s,
                          "my-device", 0x1000);
    sysbus_init_mmio(SYS_BUS_DEVICE(s), &s->mmio);
}
```

`init_io`로 만든 region은 read/write callback이 *모든 접근*을 가로챕니다.

## RAM region

```c
memory_region_init_ram(&s->dram, OBJECT(s), "dram",
                      256 * MiB, &error_fatal);
```

host에 *256MB의 진짜 메모리*를 할당해 mmap. 게스트의 load/store가 *그 host memory*로 직접.

## ROM region

```c
memory_region_init_rom(&s->rom, OBJECT(s), "boot-rom",
                      0x10000, &error_fatal);
/* 데이터 로드 */
void *ptr = memory_region_get_ram_ptr(&s->rom);
memcpy(ptr, boot_code, sizeof(boot_code));
memory_region_set_readonly(&s->rom, true);
```

ROM은 *RAM + readonly* — 게스트가 쓰면 무시 또는 trap.

## Alias region

```c
memory_region_init_alias(&alias, OBJECT(s), "ram-alias",
                        &original_ram, 0x0, 0x10000);
```

`original_ram`의 *부분*을 *다른 주소*에 매핑. 같은 host memory를 *여러 guest 주소*에 동시 노출. multi-bank flash 등에 사용.

## Container region

```c
memory_region_init(&s->soc, OBJECT(s), "soc-region", UINT64_MAX);
memory_region_add_subregion(&s->soc, 0x9000000, &s->uart);
memory_region_add_subregion(&s->soc, 0x9001000, &s->rtc);
```

여러 region을 *논리적으로 묶음*. tree 구조를 형성.

## MemoryRegion tree

전체 시스템은 *tree* 구조.

```text
system_memory (root container)
├─ DRAM (RAM, 0x40000000~)
├─ Flash (ROM, 0x00000000)
├─ SoC container (Container)
│   ├─ UART@9000000 (I/O)
│   ├─ Timer@9001000 (I/O)
│   ├─ RTC@9010000 (I/O)
│   └─ GIC@8000000 (I/O)
└─ PCI host bridge (Container)
    ├─ PCI ECAM (I/O)
    └─ PCI MMIO (Container)
        ├─ device 0 BAR0 (I/O)
        └─ device 1 BAR0 (I/O)
```

CPU의 load/store가 *root부터 walk*해 *해당 leaf*의 callback에 도달.

## AddressSpace

게스트 *CPU나 device*가 보는 *flat한 주소 공간*. tree를 *flatten*한 결과.

| 표준 AddressSpace |
|--------------------|
| `address_space_memory` (시스템 메모리) |
| `address_space_io` (x86 I/O 포트) |
| 각 PCI device의 `pci->bus_master_as` (DMA용) |

```c
/* CPU의 메모리 접근 */
address_space_read(&address_space_memory, addr, MEMTXATTRS_UNSPECIFIED,
                  buf, len);

/* device의 DMA */
pci_dma_read(&pdev, dma_addr, buf, len);
```

`pci_dma_read`는 내부적으로 *device의 AddressSpace*를 통해 IOMMU 변환 후 host memory에.

## FlatView

AddressSpace의 *flattened* 표현. tree를 펼쳐 *주소 → region* 매핑을 *binary search-able*로 만든 자료구조. 매 region 변경 시 *재계산*.

```text
FlatView for system_memory:
0x00000000 - 0x10000000  Flash (ROM)
0x40000000 - 0x50000000  DRAM (RAM)
0x09000000 - 0x09000FFF  UART (I/O)
0x09001000 - 0x09001FFF  RTC  (I/O)
0x08000000 - 0x080FFFFF  GIC  (I/O)
0x10000000 - 0x1FFFFFFF  PCI MMIO container
  0x10000000 - 0x10000FFF  pci0 BAR0
  0x10001000 - 0x10001FFF  pci1 BAR0
```

이 flat list 위에서 binary search로 *어느 region에 속하는지* 빠르게 결정.

## Endianness

MemoryRegionOps에 명시.

| Endian | 의미 |
|--------|------|
| `DEVICE_NATIVE_ENDIAN` | host와 같음 |
| `DEVICE_LITTLE_ENDIAN` | guest가 LE라고 가정 |
| `DEVICE_BIG_ENDIAN` | guest가 BE라고 가정 |

ARM·RISC-V은 보통 little-endian. 명시적으로 `DEVICE_LITTLE_ENDIAN`이 안전.

## Access size

```c
static const MemoryRegionOps my_ops = {
    .read = my_read,
    .write = my_write,
    .endianness = DEVICE_LITTLE_ENDIAN,
    .impl = {
        .min_access_size = 4,
        .max_access_size = 4,
    },
    .valid = {
        .min_access_size = 4,
        .max_access_size = 4,
    },
};
```

`impl`은 callback이 받는 size, `valid`는 guest가 *시도할 수 있는* size. guest가 1-byte read를 시도하면 *4-byte read 후 byte 추출*로 변환.

## Subregion priority

```c
memory_region_add_subregion_overlap(&container, offset, &mr, priority);
```

겹치는 region의 *우선순위*. 높은 priority가 *위*. 이걸 활용한 패턴 — *RAM region 위에 MMIO를 덮음*(예: ROM mirror, address remap).

## IOMMU MemoryRegion

PCIe SR-IOV·VFIO 같은 시나리오에서 *device별 주소 공간*. 게스트의 DMA가 IOMMU를 거쳐 host PA로 변환.

```c
typedef struct IOMMUMemoryRegion {
    MemoryRegion parent_obj;
    QLIST_HEAD(, IOMMUNotifier) iommu_notify;
} IOMMUMemoryRegion;
```

각 IOMMUMemoryRegion이 `translate` callback으로 *IOVA → PA* 변환. vIOMMU(Intel VT-d, ARM SMMU, virtio-iommu) 모델이 이를 활용.

## Listener — region 변경 알림

```c
static MemoryListener my_listener = {
    .region_add = my_region_add,
    .region_del = my_region_del,
    .log_start = ...,
    .log_stop = ...,
};
memory_listener_register(&my_listener, &address_space_memory);
```

region이 *추가·제거·log 시작*될 때 callback. KVM의 *memory slot 업데이트*가 이 메커니즘.

## info mtree — 디버그

```text
(qemu) info mtree
address-space: memory
  0000000000000000-ffffffffffffffff (prio 0, i/o): system
    0000000040000000-00000000bfffffff (prio 0, ram): mach-virt.ram
    0000000009000000-0000000009000fff (prio 0, i/o): pl011
    0000000008000000-00000000080fffff (prio 0, i/o): gicv3_dist
    ...
```

memory tree 전체를 콘솔에. *디버깅에 필수* — 무엇이 어디에 mapping되었는지 즉시 확인.

## 흔한 함정

- **endian 누락** — host 기본을 따라. 명시 권장.
- **access size 누락** — 잘못된 size로 트랩 안 됨. min/max 명시.
- **priority overlap 의도 안 함** — 두 region이 겹쳐 *예상 외* 동작. 의도적이라면 priority 사용.
- **alias로 lifetime** — alias가 *원본보다 오래* 살면 dangling pointer. 같은 owner 권장.

## 정리

- **MemoryRegion**은 5종(RAM·I/O·ROM·Alias·Container)으로 메모리 영역 모델링.
- I/O region은 *callback 기반* MMIO — `MemoryRegionOps`의 read/write.
- 시스템 전체는 *MemoryRegion tree*. **system_memory**가 root container.
- **AddressSpace**는 tree를 view로 보는 추상. CPU·device가 사용.
- **FlatView**가 tree를 평면화해 *binary search* 가능하게 함.
- Endianness·access size·priority가 핵심 옵션.
- **IOMMUMemoryRegion**으로 device별 주소 변환(vIOMMU).
- **MemoryListener**로 region 변경 추적. KVM memory slot 동기화에 사용.
- `info mtree`가 디버깅의 첫 명령.

## 다음 장 예고

다음 장은 *모든 비동기 동작의 중심* — **event loop**. main loop·AIO·coroutine·bottom half가 어떻게 협력하는지.

## 관련 항목

- [Ch 2: QOM 심화](/blog/tools/emulation/qemu-internals/chapter02-qom-deep-dive)
- [Ch 4: 이벤트 루프](/blog/tools/emulation/qemu-internals/chapter04-event-loop)
- [QEMU Fake Device — MMIO Registers](/blog/tools/emulation/qemu-fake-device/chapter05-mmio-registers)
