---
title: "Ch 18: VirtIO 구현 심화"
date: 2025-09-03T18:00:00
description: "virtio-blk·virtio-net·virtqueue 처리 — host side."
tags: [QEMU, virtio, virtqueue, virtio-blk, virtio-net]
series: "QEMU Internals"
seriesOrder: 18
draft: true
---

## 이 챕터의 의도

Fake Device 시리즈(Ch 15-16)가 *VirtIO API 사용자 관점*이었다면 본 챕터는 *QEMU host 구현자 관점*. virtqueue pop/push/notify 흐름, iov packing, virtio-blk/virtio-net 처리 path. KVM Forum에서 가장 자주 등장하는 주제.

## 핵심 항목

- ✦ Device/Driver state machine — RESET → ACK → DRIVER → FEATURES_OK → DRIVER_OK
- ✦ Host-side virtqueue 처리
  - `virtqueue_pop(vq, sizeof(VirtQueueElement))` — driver가 push한 desc 가져옴
  - 처리 (request handler가 IO 발급)
  - `virtqueue_push(vq, elem, len)` — used ring에 push
  - `virtio_notify(vdev, vq)` — IRQ 또는 ISR vector trigger
- ✦ `VirtQueueElement` — `in_sg[]` (device→driver write), `out_sg[]` (driver→device read)
- ✦ iov packing — `iov_to_buf` / `iov_from_buf`, SG list 직접 처리
- ✦ Notification mitigation
  - Driver→Device: virtqueue 인덱스가 일정 양 쌓이기 전까지 notify 지연
  - Device→Driver: used buffer가 임계 도달 전까지 IRQ 지연
- ✦ `VIRTIO_F_EVENT_IDX` — 양쪽이 *notify 임계*를 ring에 기록
- ✦ **virtio-blk request handling**
  - SQE에 header (type/sector/io_priority) + data SG + status byte
  - QEMU host가 `bdrv_co_pwritev` 호출
  - 완료 시 status byte write + push
- ✦ **virtio-net TX path** — guest packet → host bridge/tap, vhost-net으로 offload
- ✦ **virtio-net RX path** — host packet → guest in_sg buffer
- ✦ Feature negotiation
  - `device_features` (host) → `driver_features` (guest) → intersection → `FEATURES_OK`
  - `VIRTIO_F_VERSION_1` (modern), `VIRTIO_F_RING_PACKED` (packed ring)
- ✦ Performance considerations
  - Batch — N개 request 모아서 한 번에 처리
  - Prefetch — desc array prefetch (cache friendly)
  - Notify suppression — vmexit 비용 절감
- ✦ Packed ring 처리 (Ch 16 Fake Device에서 다룸)
- ◦ Indirect descriptor — 큰 request 한 desc로 표현

## 다이어그램 (4)

1. Host side virtqueue 처리 흐름 (pop → 처리 → push → notify)
2. VirtQueueElement → in_sg / out_sg 분류
3. virtio-blk request layout — header + data + status
4. virtio-net TX/RX path — guest ↔ host bridge

## 코드 sketch

```c
/* virtio-blk request handler (단순화) */
static void virtio_blk_handle_request(VirtIOBlockReq *req) {
    VirtIOBlock *s = req->dev;
    VirtQueueElement *elem = &req->elem;

    /* Header parse */
    if (elem->out_num < 1) { error; }
    iov_to_buf(elem->out_sg, elem->out_num, 0, &req->out_hdr, sizeof(req->out_hdr));

    switch (req->out_hdr.type) {
    case VIRTIO_BLK_T_OUT:    /* write */
        qemu_iovec_init_external(&req->qiov, &elem->out_sg[1], elem->out_num - 1);
        blk_aio_pwritev(s->blk, req->out_hdr.sector * BDRV_SECTOR_SIZE,
                        &req->qiov, 0, virtio_blk_rw_complete, req);
        break;
    case VIRTIO_BLK_T_IN:     /* read */
        qemu_iovec_init_external(&req->qiov, &elem->in_sg[0], elem->in_num - 1);
        blk_aio_preadv(s->blk, req->out_hdr.sector * BDRV_SECTOR_SIZE,
                       &req->qiov, 0, virtio_blk_rw_complete, req);
        break;
    case VIRTIO_BLK_T_FLUSH:
        blk_aio_flush(s->blk, virtio_blk_flush_complete, req);
        break;
    }
}

static void virtio_blk_rw_complete(void *opaque, int ret) {
    VirtIOBlockReq *req = opaque;
    /* status byte write */
    uint8_t status = ret < 0 ? VIRTIO_BLK_S_IOERR : VIRTIO_BLK_S_OK;
    iov_from_buf(req->elem.in_sg, req->elem.in_num,
                 req->qiov.size, &status, 1);
    virtqueue_push(req->vq, &req->elem, req->qiov.size + 1);
    virtio_notify(VIRTIO_DEVICE(req->dev), req->vq);
}
```

```c
/* Notify suppression — VIRTIO_F_EVENT_IDX */
static void virtio_notify_event_idx(VirtIODevice *vdev, VirtQueue *vq) {
    uint16_t old, new;
    bool v;

    /* old = 이전 used 인덱스, new = 현재 */
    /* event_idx = driver가 IRQ 받고 싶은 used 인덱스 */
    v = vring_need_event(vring_used_event(vq), new, old);
    if (v) virtio_irq(vq);
}
```

## 레퍼런스

- VirtIO 1.2 Spec (OASIS)
- QEMU `hw/virtio/virtio.c`, `hw/block/virtio-blk.c`, `hw/net/virtio-net.c`
- QEMU `Documentation/system/devices/virtio-pmem.rst` (modern device 예)
- "Optimizing QEMU virtio-net performance" — KVM Forum
- "VirtIO Without the Virtio" — Stefan Hajnoczi (vDPA)

## 관련 항목

- [Ch 14: KVM accel](/blog/tools/emulation/qemu-internals/chapter14-kvm-accel)
- [Ch 17: 블록 I/O lifecycle](/blog/tools/emulation/qemu-internals/chapter17-block-io)
- [Ch 19: vhost-net/vhost-user](/blog/tools/emulation/qemu-internals/chapter19-vhost)
- [Fake Device Ch 15-16: VirtIO 기초·심화](/blog/tools/emulation/qemu-fake-device/chapter15-virtio-basics)
