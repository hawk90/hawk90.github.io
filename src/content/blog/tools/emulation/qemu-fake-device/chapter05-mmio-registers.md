---
title: "Ch 5: MMIO 레지스터 구현"
date: 2025-09-01T05:00:00
description: "Memory-mapped I/O 레지스터를 구현하고 게스트에서 읽고 쓴다."
tags: [QEMU, MMIO, Register]
series: "QEMU Fake Device Driver"
seriesOrder: 5
draft: true
---

## MMIO란?

Memory-mapped I/O는 디바이스 레지스터를 메모리 주소로 매핑하는 방식입니다.

---

## MemoryRegion 설정

```c
static uint64_t my_mmio_read(void *opaque, hwaddr addr, unsigned size)
{
    MyDeviceState *s = opaque;
    return s->regs[addr / 4];
}

static void my_mmio_write(void *opaque, hwaddr addr, uint64_t val, unsigned size)
{
    MyDeviceState *s = opaque;
    s->regs[addr / 4] = val;
}

static const MemoryRegionOps my_mmio_ops = {
    .read = my_mmio_read,
    .write = my_mmio_write,
    .endianness = DEVICE_LITTLE_ENDIAN,
};
```

---

## BAR에 등록

```c
memory_region_init_io(&s->mmio, OBJECT(s), &my_mmio_ops, s,
                      "my-mmio", 0x1000);
pci_register_bar(pdev, 0, PCI_BASE_ADDRESS_SPACE_MEMORY, &s->mmio);
```

---

## 정리

- MemoryRegionOps로 read/write 콜백을 구현한다.
- pci_register_bar로 BAR에 MMIO 영역을 등록한다.
- 게스트에서 해당 주소를 읽고 쓰면 콜백이 호출된다.

---

## 관련 항목

- [Ch 4: 간단한 PCI 디바이스](/blog/tools/qemu-fake-device/chapter04-simple-pci)
- [Ch 6: 인터럽트 구현](/blog/tools/qemu-fake-device/chapter06-interrupts)
