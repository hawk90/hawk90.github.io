---
title: "Ch 20: 핫플러그/핫언플러그"
date: 2025-09-01T20:00:00
description: "device_add·device_del·refcount — runtime device dynamics."
tags: [QEMU, hotplug, pcie, hot-add]
series: "QEMU Fake Device Driver"
seriesOrder: 20
draft: true
---

## 이 챕터의 의도

Hot-plug는 *runtime에 device가 나타나고 사라지는 사건*. 잘 다루지 않으면 driver의 `remove()` 경로에서 *in-flight DMA*·*open file descriptor*·*sleeping wait*가 모두 깨진다. CXL memory hot-add 시나리오에서도 동일 패턴 — 본 챕터는 QEMU의 hot-plug 메커니즘과 driver 측 안전한 unbind를 같이 본다.

## 핵심 항목

- ✦ PCIe hot-plug 종류 — **native PCIe** (Slot Capabilities + pciehp), **ACPI-based**, SHPC (PCI legacy), **NHPS** (Native Hot-Plug Surprise)
- ✦ QEMU monitor — `device_add my-pci,bus=pcie.0,addr=0x10`, `device_del my-pci`
- ✦ QMP — `{"execute": "device_add", "arguments": {...}}` 자동화
- ✦ **Surprise removal** — driver가 미처 정리 못 한 상태 (USB unplug 같은)
- ✦ Driver 측 — `pci_driver.remove()` callback — *반드시* 호출 보장
- ✦ **In-flight DMA cancellation** — `pci_disable_device` 전 *모든 outstanding* descriptor 회수
- ✦ Refcount — `kref` / `get_device` / `put_device`, *마지막 reference*까지 객체 살아있음
- ✦ RCU·synchronize — reader가 끝날 때까지 free 지연 (`synchronize_rcu`, `kfree_rcu`)
- ✦ Race conditions — open(2) vs unbind, ioctl 진행 중 remove
- ✦ Linux subsystem — udev rule, systemd auto-bind, `/sys/bus/pci/drivers/.../{bind,unbind}`
- ✦ CXL hot-add — Type 3 memory device 추가 시 numa node 동적 생성
- ◦ Hot-plug 실패 시 rollback (link train fail)
- ◦ Power budgeting — slot power 한계

## 다이어그램 (4)

1. PCIe hot-plug 시퀀스 (button press → slot ctrl → link up → device probe)
2. QEMU side — `device_add` → realize → `pci_setup_iommu` → guest IRQ
3. Driver `remove()` 흐름 — disable IRQ → drain DMA → unmap → free
4. Race window — userspace open(fd) vs kernel unbind, RCU sync

## 코드 sketch

```c
/* QEMU 측 — hotplug handler */
static void my_pci_unrealize(DeviceState *dev) {
    MyPCIDev *s = MY_PCI(dev);

    /* in-flight 작업 cancel */
    if (s->bh) {
        qemu_bh_cancel(s->bh);
        qemu_bh_delete(s->bh);
    }
    timer_del(s->complete_timer);

    /* memory region 해제 — pci_unregister는 ownership 해제 */
    qemu_irq_lower(s->irq);
}
```

```c
/* Driver 측 — remove path */
static void my_pci_remove(struct pci_dev *pdev) {
    struct my_dev *d = pci_get_drvdata(pdev);

    /* 1. 새 요청 차단 */
    atomic_set(&d->removing, 1);
    smp_wmb();

    /* 2. IRQ 비활성 — 새 callback 없음 */
    free_irq(d->irq, d);

    /* 3. in-flight DMA 회수 */
    drain_pending_requests(d);   /* wait until all outstanding done */

    /* 4. open fd 강제 close 또는 EBUSY 반환 */
    cdev_del(&d->cdev);

    /* 5. DMA mapping unmap */
    dma_free_coherent(&pdev->dev, RING_SIZE, d->ring, d->ring_dma);

    /* 6. RCU sync — reader 끝날 때까지 */
    synchronize_rcu();

    pci_iounmap(pdev, d->mmio);
    pci_release_regions(pdev);
    pci_disable_device(pdev);
    kfree(d);
}
```

```bash
# 테스트
(qemu) device_add my-pci,id=mydev0,bus=pcie.0,addr=0x10
# guest 에서 lsusb / lspci 확인
(qemu) device_del mydev0
# guest dmesg에서 driver remove path 확인
```

## 레퍼런스

- PCIe Base Spec §6.7 (Hot-Plug Capable Slot)
- QEMU `Documentation/system/devices/pcie.rst` — hot-plug 절차
- Linux `Documentation/PCI/pci-hotplug.rst`
- Linux `drivers/pci/hotplug/pciehp_*.c` — native hot-plug driver
- LWN "Surprise device removal"

## 관련 항목

- [Ch 19: Multi-Function PCI](/blog/tools/emulation/qemu-fake-device/chapter19-multi-function)
- [Ch 21: AER 에뮬레이션](/blog/tools/emulation/qemu-fake-device/chapter21-aer-emulation)
- [PCIe Ch 14 운영 — Hot-plug, AER, DPC](/blog/embedded/hardware/pcie/)
