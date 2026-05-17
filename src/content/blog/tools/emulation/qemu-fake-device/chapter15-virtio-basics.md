---
title: "Ch 15: VirtIO 디바이스 기초"
date: 2025-09-01T15:00:00
description: "virtio-pci·virtqueue·feature bits — VirtIO의 본질."
tags: [QEMU, virtio, virtqueue, virtio-pci]
series: "QEMU Fake Device Driver"
seriesOrder: 15
draft: true
---

## 이 챕터의 의도

VirtIO는 paravirtualization의 사실상 표준이다. guest와 host가 서로 가상화 환경임을 알고 협력하는 인터페이스이며 virtio-net, virtio-blk, virtio-scsi, virtio-gpu가 모두 같은 토대(virtqueue) 위에 선다. 이 장에서는 QEMU에 최소 VirtIO 디바이스를 만들어 보면서 transport, queue, feature negotiation을 하나씩 풀어본다.

## 핵심 항목

- ✦ Why VirtIO — full-emul보다 빠르고, pass-through보다 안전·이식
- ✦ Transport 종류 — virtio-pci legacy(1.0 이전), virtio-pci modern(1.0+), virtio-mmio(embedded), virtio-ccw(s390)
- ✦ VirtIO PCI capability layout — Common / Notify / ISR / Device / PCI (modern)
- ✦ **Virtqueue (split ring) layout** — `desc[]`, `avail[]`, `used[]` 세 영역
- ✦ Descriptor — `addr / len / flags(NEXT·WRITE·INDIRECT) / next`
- ✦ Avail ring — driver→device, 새 desc 인덱스 push
- ✦ Used ring — device→driver, 완료 desc 인덱스 + len
- ✦ Feature negotiation — `device_features` → `driver_features` AND → `FEATURES_OK`
- ✦ Device status state machine — RESET → ACKNOWLEDGE → DRIVER → FEATURES_OK → DRIVER_OK → (FAILED)
- ✦ Notify path — driver write to notify cap → host vmexit → `virtio_queue_notify`
- ✦ Callback path (used buffer) — host calls `virtio_notify` → MSI-X / config IRQ
- ◦ virtio-mmio variant — register layout 차이만, 동일 virtqueue
- ◦ Indirect descriptors

## 다이어그램 (4)

1. VirtIO PCI capability + BAR 매핑 (modern transport)
2. Split virtqueue 3 영역 (desc/avail/used) + driver↔device 흐름
3. Device status state machine
4. Feature negotiation handshake

## 코드 sketch

```c
/* QEMU 측 minimal virtio device */
static void my_vdev_handle_output(VirtIODevice *vdev, VirtQueue *vq) {
    VirtQueueElement *elem;
    while ((elem = virtqueue_pop(vq, sizeof(*elem)))) {
        /* elem->in_sg, elem->out_sg 처리 */
        size_t len = process_request(elem);
        virtqueue_push(vq, elem, len);
        g_free(elem);
    }
    virtio_notify(vdev, vq);
}

static void my_vdev_realize(DeviceState *dev, Error **errp) {
    VirtIODevice *vdev = VIRTIO_DEVICE(dev);
    virtio_init(vdev, "my-vdev", VIRTIO_ID_MY, 0);
    add_queue(vdev, 128, my_vdev_handle_output);
}

static Property my_vdev_props[] = {
    DEFINE_PROP_BIT64("indirect_desc", MyVDev, host_features, VIRTIO_RING_F_INDIRECT_DESC, true),
    DEFINE_PROP_END_OF_LIST(),
};
```

## 레퍼런스

- VirtIO 1.2 Specification (OASIS) — *bible*
- QEMU `hw/virtio/virtio.c`, `hw/virtio/virtio-pci.c`
- LWN "Virtio: an I/O virtualization framework for Linux"
- Linux `drivers/virtio/` — driver 측 대응

## 관련 항목

- [Ch 14: Scatter-Gather DMA](/blog/tools/emulation/qemu-fake-device/chapter14-scatter-gather-dma)
- [Ch 16: VirtIO 심화](/blog/tools/emulation/qemu-fake-device/chapter16-virtio-advanced)
- [QEMU Internals Ch 18: virtio 구현 심화](/blog/tools/emulation/qemu-internals/chapter18-virtio-impl)
