---
title: "Ch 8: 리눅스 드라이버 작성"
date: 2025-09-01T08:00:00
description: "가상 디바이스용 리눅스 PCI 드라이버를 작성한다."
tags: [QEMU, Linux, Driver]
series: "QEMU Fake Device Driver"
seriesOrder: 8
draft: true
---

## PCI 드라이버 구조

```c
static struct pci_driver my_driver = {
    .name     = "my_driver",
    .id_table = my_ids,
    .probe    = my_probe,
    .remove   = my_remove,
};
```

---

## probe 콜백

```c
static int my_probe(struct pci_dev *pdev, const struct pci_device_id *id)
{
    pci_enable_device(pdev);
    pci_request_regions(pdev, "my_driver");
    bar0 = pci_iomap(pdev, 0, 0);
    // 레지스터 접근
    return 0;
}
```

---

## 레지스터 읽기/쓰기

```c
u32 val = ioread32(bar0 + REG_STATUS);
iowrite32(0x1, bar0 + REG_CONTROL);
```

---

## 정리

- pci_register_driver로 드라이버를 등록한다.
- probe에서 디바이스를 초기화한다.
- ioread/iowrite로 MMIO 레지스터에 접근한다.

---

## 관련 항목

- [Ch 7: DMA 버퍼 처리](/blog/tools/qemu-fake-device/chapter07-dma)
- [Ch 9: 디버깅](/blog/tools/qemu-fake-device/chapter09-debugging)
