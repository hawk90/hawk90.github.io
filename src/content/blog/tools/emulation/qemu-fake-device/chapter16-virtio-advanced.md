---
title: "Ch 16: VirtIO 디바이스 심화"
date: 2025-09-01T16:00:00
description: "Split·packed virtqueue·indirect descriptor — VirtIO 성능 layer."
tags: [QEMU, virtio, packed-ring, indirect-descriptor]
series: "QEMU Fake Device Driver"
seriesOrder: 16
draft: true
---

## 이 챕터의 의도

VirtIO 1.0의 *split ring*은 3개 영역(desc/avail/used)을 분리해 단순했지만 *3번의 cache line touch*가 필요했다. 1.1 *packed ring*은 한 ring으로 통합해 *prefetch 친화*. 본 챕터는 packed ring·indirect descriptor·event suppression 등 *성능 layer*를 다룬다.

## 핵심 항목

- ✦ Split ring (legacy) vs Packed ring (v1.1+) — 메모리 layout·cache line touch 횟수 비교
- ✦ Packed ring 단일 배열 — descriptor 자체에 *avail wrap* / *used wrap* 비트
- ✦ Wrap counter — driver와 device가 *반대 비트*를 보고 ownership 판단
- ✦ `VIRTIO_F_RING_PACKED` feature bit
- ✦ In-order feature (`VIRTIO_F_IN_ORDER`) — completion 순서 보장 시 used 인덱스만 갱신
- ✦ **Indirect descriptors** — 큰 request batching, descriptor 자체가 또 다른 desc array 가리킴
- ✦ Event suppression — `VIRTIO_F_EVENT_IDX`, driver/device가 *notify 임계*만 갱신 → 불필요 IRQ/vmexit 제거
- ✦ Notification mitigation — busy poll vs interrupt coalescing
- ✦ `VIRTIO_F_RING_RESET` — queue 단위 reset (live migration·recovery)
- ✦ Benchmark — split vs packed throughput·latency (virtio-net 측정)
- ◦ Modern device 예 — virtio-fs (DAX), virtio-gpu (Vulkan venus), NVMe-over-VirtIO

## 다이어그램 (4)

1. Split ring 3 영역 vs Packed ring 단일 배열 — cache line 비교
2. Packed ring wrap counter 동작 (driver wrap=0 / device wrap=0 → ownership)
3. Indirect descriptor — main desc → indirect table → 큰 SG list
4. Event suppression — notify threshold 갱신 흐름

## 코드 sketch

```c
/* Packed ring 핵심: descriptor에 avail/used bit 직접 */
typedef struct {
    uint64_t addr;
    uint32_t len;
    uint16_t id;
    uint16_t flags;   /* AVAIL bit / USED bit / WRITE / NEXT / INDIRECT */
} VRingPackedDesc;

#define VRING_PACKED_DESC_F_AVAIL  (1 << 7)
#define VRING_PACKED_DESC_F_USED   (1 << 15)

static bool desc_is_avail(uint16_t flags, bool wrap_counter) {
    bool avail = !!(flags & VRING_PACKED_DESC_F_AVAIL);
    bool used  = !!(flags & VRING_PACKED_DESC_F_USED);
    return (avail == wrap_counter) && (used != wrap_counter);
}

/* QEMU 측 packed queue pop */
static VirtQueueElement *virtqueue_packed_pop(VirtQueue *vq) {
    VRingPackedDesc *d = &vq->packed_ring[vq->next_avail_idx];
    if (!desc_is_avail(d->flags, vq->avail_wrap_counter)) return NULL;
    /* indirect 처리, SG 구성 */
    /* ... */
    return elem;
}
```

## 레퍼런스

- VirtIO 1.2 Specification §2.7 (Packed Virtqueues), §2.6 (Split), §2.8 (Indirect)
- LWN "Virtio's packed virtqueue"
- QEMU `hw/virtio/virtio.c::virtqueue_packed_*`
- Linux `drivers/virtio/virtio_ring.c` — driver 측 packed 지원
- Jens Freimann (Red Hat) "Performance comparison: split vs packed virtqueue"

## 관련 항목

- [Ch 15: VirtIO 기초](/blog/tools/emulation/qemu-fake-device/chapter15-virtio-basics)
- [Ch 17: 디바이스 퍼징](/blog/tools/emulation/qemu-fake-device/chapter17-fuzzing)
- [QEMU Internals Ch 19: vhost-net·vhost-user](/blog/tools/emulation/qemu-internals/chapter19-vhost)
