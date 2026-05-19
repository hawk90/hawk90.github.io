---
title: "Ch 18: VirtIO 구현 심화"
date: 2026-05-17T18:00:00
description: "virtio-blk·virtio-net·virtqueue 처리 — host side."
tags: [QEMU, virtio, virtqueue, virtio-blk, virtio-net]
series: "QEMU Internals"
seriesOrder: 18
draft: true
---

**VirtIO**는 *paravirtualized device*의 표준입니다. guest와 host 사이의 *공유 메모리 ring*과 *doorbell + IRQ*로 *kernel-bypass에 가까운* 성능. virtio-blk·virtio-net·virtio-9p·virtio-gpu 등 *수십 종*의 device가 같은 framework 위에 구축. 이 장은 QEMU 측 *host implementation*을 들여다봅니다.

## VirtIO architecture

```text
Guest VirtIO driver         Host (QEMU)
─────────────────────────────────────
descriptor ring          ↔  공유 메모리
available ring           ↔  공유 메모리
used ring                ↔  공유 메모리
        │                            │
        │ doorbell write             │
        ├──────────────────────────▶│ vring fetch
        │                            │
        │                            │ process request
        │                            │
        │                  IRQ      │
        │◀──────────────────────────┤
```

3-ring 구조: descriptor·available·used. *최소한의 vmexit*으로 high throughput.

## Transport variants

| Transport | 의미 |
|-----------|------|
| **virtio-pci** | PCI host bridge에 device로 attach |
| **virtio-mmio** | memory-mapped (ARM virt embedded) |
| **virtio-ccw** | s390x의 CCW |

대부분의 datacenter는 *virtio-pci*. ARM embedded는 *virtio-mmio*.

## Virtqueue

device 인스턴스마다 *1개 이상*의 virtqueue.

```c
typedef struct VirtQueue {
    VRing vring;
    uint64_t pa;        /* guest physical address */
    uint16_t last_avail_idx;
    /* ... */
    VirtIOHandleOutput handle_output;
    VirtIODevice *vdev;
} VirtQueue;
```

`handle_output`이 *doorbell write 시* 호출되는 callback. device-specific.

## Descriptor ring

```c
typedef struct VRingDesc {
    uint64_t addr;       /* guest physical addr */
    uint32_t len;
    uint16_t flags;      /* NEXT, WRITE, INDIRECT */
    uint16_t next;       /* chained descriptors */
} VRingDesc;
```

descriptor가 *chain* 가능 — large request를 여러 descriptor로 분산(scatter-gather).

## Doorbell handler

```c
static void virtio_blk_handle_output(VirtIODevice *vdev, VirtQueue *vq) {
    while (true) {
        VirtIOBlockReq *req = virtio_blk_get_request(vdev, vq);
        if (req == NULL) break;
        virtio_blk_handle_request(req);
    }
}
```

guest가 doorbell write → vmexit → `handle_output` 호출 → vring 비울 때까지 처리.

KVM의 *ioeventfd*가 활성이면 vmexit *없이* `handle_output` 호출.

## virtio-blk 구현

`hw/block/virtio-blk.c`. 핵심 함수.

```c
static int virtio_blk_handle_request(VirtIOBlockReq *req) {
    /* descriptor에서 sector/buffer 정보 추출 */
    int64_t sector = req->out.sector;
    QEMUIOVector iov = /* descriptor chain → iov */;

    /* BlockBackend에 submit */
    if (is_write) {
        blk_aio_pwritev(blk, sector * 512, &iov, 0,
                       virtio_blk_complete, req);
    } else {
        blk_aio_preadv(blk, sector * 512, &iov, 0,
                      virtio_blk_complete, req);
    }
    return 0;
}

static void virtio_blk_complete(void *opaque, int ret) {
    VirtIOBlockReq *req = opaque;
    /* used ring에 push + IRQ */
    virtqueue_push(req->vq, &req->elem, /* len */);
    virtio_notify(VIRTIO_DEVICE(req->dev), req->vq);
    g_free(req);
}
```

block layer의 *coroutine*과 자연스럽게 결합.

## virtio-net 구현

`hw/net/virtio-net.c`. RX/TX queue 각각.

```c
static void virtio_net_handle_tx(VirtIONet *n, VirtQueue *vq) {
    while (virtqueue_pop(vq, &elem)) {
        /* descriptor → packet */
        qemu_sendv_packet(n->nic, elem.out_sg, elem.out_num);
        virtqueue_push(vq, &elem, 0);
    }
    virtio_notify(VIRTIO_DEVICE(n), vq);
}
```

TX queue에서 packet 꺼내 *backend(tap·user·vhost)에 송신*. RX는 backend에서 받은 packet을 RX queue에 push.

## Indirect descriptor

큰 chain을 *별도 buffer*에.

```c
typedef struct VRingIndirect {
    uint16_t flags;       /* INDIRECT */
    uint16_t next;        /* unused */
    uint64_t addr;        /* indirect table 주소 */
    uint32_t len;
} VRingIndirect;
```

main ring에서 *INDIRECT flag*. 그 descriptor가 *별도 indirect table*을 가리킴. ring 1 entry로 *최대 256 descriptor* 표현.

## Packed virtqueue (1.1+)

VirtIO 1.1에서 도입. *avail/used/desc 합쳐* 1 ring으로. *cache friendly*하고 더 빠름.

```c
typedef struct VRingPackedDesc {
    uint64_t addr;
    uint32_t len;
    uint16_t id;
    uint16_t flags;      /* AVAIL/USED bit toggle */
} VRingPackedDesc;
```

`AVAIL bit + USED bit`이 *반대* 위치에 있으면 *driver가 작성*, 같으면 *device가 처리*. wrap counter로 ring을 한 바퀴 돌 때마다 *interpretation flip*.

## Feature negotiation

driver와 device가 *최초 init 시* feature 협상.

```c
/* device feature: 지원하는 것 */
vdev->host_features = VIRTIO_BLK_F_SEG_MAX | VIRTIO_BLK_F_BLK_SIZE | ...;

/* driver가 accept할 feature 선택 */
/* 양쪽이 합의한 feature만 enable */
```

deprecated feature·new feature가 *공존* 가능.

## Status field

```c
typedef enum {
    VIRTIO_CONFIG_S_ACKNOWLEDGE = 1,    /* OS recognizes device */
    VIRTIO_CONFIG_S_DRIVER = 2,         /* OS has driver */
    VIRTIO_CONFIG_S_DRIVER_OK = 4,      /* driver ready */
    VIRTIO_CONFIG_S_FEATURES_OK = 8,    /* feature negotiation done */
    VIRTIO_CONFIG_S_FAILED = 0x80,
    VIRTIO_CONFIG_S_NEEDS_RESET = 0x40,
} VirtIOConfigStatus;
```

guest driver init이 *순차적으로* 이 bit를 set. device가 *각 단계 검증*.

## ioeventfd 통합

```c
virtio_pci_set_host_notifier_internal(proxy, n, true);
```

각 virtqueue가 *eventfd*로 doorbell. KVM이 *vmexit 없이* eventfd signal. main loop이 그 eventfd watch.

## Multi-queue + iothread

virtio-blk가 *multi-queue* + *별도 iothread*.

```bash
-object iothread,id=iothread0 \
-device virtio-blk-pci,drive=hd0,iothread=iothread0,num-queues=4
```

각 queue가 *별도 iothread context*에서 처리 → throughput 향상.

## VirtIO modern vs legacy

| Version | 차이 |
|---------|------|
| Legacy (0.9.5) | endian fixed (LE for x86, BE for PowerPC), 1.0 이전 |
| Modern (1.0+) | endian-aware, deprecated features 정리 |

current QEMU는 modern. legacy compat을 위해 disable_legacy=on 등 옵션.

## VirtIO PCI 호스트 구현

```c
typedef struct VirtIOPCIProxy {
    PCIDevice pci_dev;
    VirtIODevice *vdev;
    /* BAR 0~5 */
    MemoryRegion bar[VIRTIO_QUEUE_MAX];
    /* MSI-X */
    /* ... */
} VirtIOPCIProxy;
```

PCI device가 VirtIO transport 역할. BAR이 *config space*·*notify*·*ISR*·*device-specific config*에 매핑.

## 흔한 함정

- **doorbell race** — guest가 도어벨 직후 다음 descriptor 작성. host는 *전부 처리* 후 last_avail_idx 갱신.
- **descriptor chain 무한 loop** — `next` field에 *자기 자신* set 시 device hang. validation 필요.
- **endian** — modern은 LE 고정. legacy는 architecture별. 명시적 처리.
- **memory barrier** — guest와 host가 *공유 메모리*. ordering 보장 위해 `smp_*` barrier 사용.

## 정리

- **VirtIO**는 paravirtualized device 표준. *공유 메모리 ring + doorbell + IRQ*.
- Transport: **virtio-pci**(datacenter)·**virtio-mmio**(embedded)·**virtio-ccw**(s390x).
- **Virtqueue**가 device의 통신 unit. *descriptor·available·used* 3-ring.
- `handle_output` callback이 doorbell 시 처리 entry.
- **virtio-blk**는 BlockBackend·**virtio-net**은 net backend로 위임.
- **Indirect descriptor**·**Packed virtqueue**(1.1+)로 성능 가속.
- **Feature negotiation**으로 device-driver 호환.
- ioeventfd·multi-queue·iothread로 production 성능.

## 다음 장 예고

다음 장은 *VirtIO의 host bypass* — **vhost**. kernel과 userspace에서 *QEMU를 우회*해 data path를 처리.

## 관련 항목

- [Ch 17: Block I/O Lifecycle](/blog/tools/emulation/qemu-internals/chapter17-block-io)
- [Ch 19: vhost](/blog/tools/emulation/qemu-internals/chapter19-vhost)
- [Ch 6: Network Layer](/blog/tools/emulation/qemu-internals/chapter06-network-layer)
