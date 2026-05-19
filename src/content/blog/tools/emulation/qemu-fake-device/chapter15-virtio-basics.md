---
title: "Ch 15: VirtIO 디바이스 기초"
date: 2026-05-17T15:00:00
description: "virtio-pci·virtqueue·feature bits — VirtIO의 본질."
tags: [QEMU, virtio, virtqueue, virtio-pci]
series: "QEMU Fake Device Driver"
seriesOrder: 15
draft: true
---

지금까지 만든 custom PCI device는 *register-driven*입니다. 매 MMIO access마다 vmexit가 발생해 *수 µs latency*. **VirtIO**는 *paravirt 표준*으로, *공유 memory ring + doorbell*로 *vmexit을 최소화*. 같은 driver 개발 패턴이지만 *수십 배 빠른* device.

## VirtIO의 핵심 — vring

```text
Guest                            Host (QEMU)
─────────────────────────────────────────────
descriptor table       ↔  shared RAM
available ring         ↔  shared RAM
used ring              ↔  shared RAM
        │
        │ doorbell write
        ├───────────────────────────▶ QEMU handler
        │
        │                           ◀  IRQ
        │
```

3-ring 구조. driver와 device가 *직접 통신*. host kernel·QEMU의 *중간 layer 최소*.

## QEMU 측 — VirtIO device 골격

```c
#include "hw/virtio/virtio.h"
#include "hw/virtio/virtio-pci.h"

#define TYPE_MY_VIRTIO "virtio-my-pci"
OBJECT_DECLARE_SIMPLE_TYPE(MyVirtIOState, MY_VIRTIO)

struct MyVirtIOState {
    VirtIODevice parent_obj;
    VirtQueue *vq;
    /* device-specific state */
};

static void my_virtio_handle_output(VirtIODevice *vdev, VirtQueue *vq) {
    MyVirtIOState *s = MY_VIRTIO(vdev);
    VirtQueueElement *elem;

    while ((elem = virtqueue_pop(vq, sizeof(VirtQueueElement)))) {
        /* descriptor에서 buffer 추출 */
        process_request(s, elem);
        virtqueue_push(vq, elem, /* len processed */);
        virtio_notify(vdev, vq);
    }
}

static void my_virtio_realize(DeviceState *dev, Error **errp) {
    MyVirtIOState *s = MY_VIRTIO(dev);
    VirtIODevice *vdev = VIRTIO_DEVICE(dev);

    virtio_init(vdev, VIRTIO_ID_DEVICE, 0);
    s->vq = virtio_add_queue(vdev, 128, my_virtio_handle_output);
}
```

`virtio_add_queue`로 *virtqueue 등록*. driver의 doorbell write 시 `handle_output` 호출.

## 빌드 — virtio-pci wrapper

VirtIO device는 *transport-agnostic*. PCIe transport용 wrapper.

```c
#define TYPE_MY_VIRTIO_PCI "virtio-my-pci-base"

typedef struct MyVirtIOPCIState {
    VirtIOPCIProxy parent_obj;
    MyVirtIOState vdev;
} MyVirtIOPCIState;

static void my_virtio_pci_realize(VirtIOPCIProxy *vpci_dev, Error **errp) {
    MyVirtIOPCIState *dev = container_of(vpci_dev, MyVirtIOPCIState, parent_obj);
    DeviceState *vdev = DEVICE(&dev->vdev);

    qdev_realize(vdev, BUS(&vpci_dev->bus), errp);
}

static void my_virtio_pci_class_init(ObjectClass *klass, void *data) {
    VirtioPCIClass *k = VIRTIO_PCI_CLASS(klass);
    PCIDeviceClass *pcidev_k = PCI_DEVICE_CLASS(klass);

    k->realize = my_virtio_pci_realize;
    pcidev_k->vendor_id = PCI_VENDOR_ID_REDHAT_QUMRANET;
    pcidev_k->device_id = 0x1100 + VIRTIO_ID_DEVICE;
}
```

PCI vendor 0x1AF4(Red Hat)·device 0x1000+VIRTIO_ID가 *VirtIO PCI 표준*. Linux의 virtio-pci driver가 *자동 binding*.

## Virtqueue 핸들링

`virtqueue_pop`이 *descriptor chain*을 추출.

```c
VirtQueueElement {
    unsigned int out_num;     /* out (host→guest는 X, guest→host) */
    unsigned int in_num;
    struct iovec *in_sg;      /* in buffer (write back) */
    struct iovec *out_sg;     /* out buffer (data send) */
    /* ... */
};
```

driver가 *out (request)*와 *in (response)* buffer를 *분리해서* enqueue. handler에서 read·write.

```c
static void process_request(MyVirtIOState *s, VirtQueueElement *elem) {
    /* request 읽기 */
    char in_data[256];
    iov_to_buf(elem->out_sg, elem->out_num, 0, in_data, sizeof(in_data));

    /* 처리 */
    char response[256];
    snprintf(response, sizeof(response), "ECHO: %s", in_data);

    /* response 쓰기 */
    iov_from_buf(elem->in_sg, elem->in_num, 0, response, strlen(response));
}
```

## Feature negotiation

device와 driver가 *feature 협상*.

```c
typedef enum {
    MY_VIRTIO_F_FAST       = 0,    /* device feature bit 0 */
    MY_VIRTIO_F_ENCRYPTED  = 1,
} MyVirtIOFeatures;

static uint64_t my_virtio_get_features(VirtIODevice *vdev,
                                         uint64_t features, Error **errp) {
    /* device가 지원하는 feature */
    features |= (1ULL << MY_VIRTIO_F_FAST);
    features |= (1ULL << MY_VIRTIO_F_ENCRYPTED);
    return features;
}

static void my_virtio_set_features(VirtIODevice *vdev, uint64_t features) {
    MyVirtIOState *s = MY_VIRTIO(vdev);
    s->use_fast      = features & (1ULL << MY_VIRTIO_F_FAST);
    s->use_encrypted = features & (1ULL << MY_VIRTIO_F_ENCRYPTED);
}
```

driver가 *지원하는 feature*를 accept한 결과가 `set_features`에 통보. device는 *그 feature만* 활성.

## Standard features

VirtIO spec에 *공통 feature*.

| Bit | Feature |
|-----|---------|
| 28 (`VIRTIO_F_VERSION_1`) | modern interface |
| 27 | EVENT_IDX (notification suppression) |
| 32~ | transport-specific |

VirtIO 1.0+는 *VERSION_1 필수*. legacy는 *device-specific endian*, modern은 *항상 LE*.

## Config space

VirtIO device가 *device-specific config*를 노출.

```c
struct my_virtio_config {
    uint32_t max_buffer_size;
    uint32_t supported_modes;
} __attribute__((packed));

static void my_virtio_get_config(VirtIODevice *vdev, uint8_t *config) {
    MyVirtIOState *s = MY_VIRTIO(vdev);
    struct my_virtio_config cfg = {
        .max_buffer_size = cpu_to_le32(s->max_buf),
        .supported_modes = cpu_to_le32(s->modes),
    };
    memcpy(config, &cfg, sizeof(cfg));
}
```

driver는 *probe 시 config read*해서 *device capability* 확인.

## Driver — Linux side

```c
#include <linux/virtio.h>

static const struct virtio_device_id my_virtio_ids[] = {
    { VIRTIO_ID_DEVICE, VIRTIO_DEV_ANY_ID },
    { 0 }
};

static int my_virtio_probe(struct virtio_device *vdev) {
    int err;
    struct virtqueue *vq;

    /* feature negotiation */
    virtio_cread(vdev, struct my_virtio_config, max_buffer_size, &max_buf);

    /* virtqueue setup */
    err = virtio_find_single_vq(vdev, my_recv_cb, "my-queue", &vq);

    virtio_device_ready(vdev);
    return 0;
}

static void my_recv_cb(struct virtqueue *vq) {
    /* used ring에 entry 있을 때 호출 */
    struct request *req;
    unsigned int len;
    while ((req = virtqueue_get_buf(vq, &len)) != NULL) {
        /* request 완료 처리 */
    }
}

static struct virtio_driver my_virtio_driver = {
    .driver.name = "my_virtio",
    .id_table = my_virtio_ids,
    .probe = my_virtio_probe,
};
module_virtio_driver(my_virtio_driver);
```

Linux의 *virtio 추상*이 *transport을 숨김* — `virtqueue_add_*`로 buffer enqueue, callback에서 result 회수.

## 전송 흐름 한 round

```text
1. Driver: virtqueue_add_outbuf(vq, sg, n, request) + virtqueue_kick(vq)
                                                              │
                                                              │ doorbell
2. QEMU handle_output 호출
3. virtqueue_pop → request 추출
4. process_request → response 작성
5. virtqueue_push + virtio_notify
                                                              │
                                                              │ IRQ
6. Driver의 callback 호출
7. virtqueue_get_buf로 response 회수
```

매 transaction이 *vmexit 1번 + IRQ 1번*. 매우 효율적.

## ioeventfd 가속

`virtio_notify_irqfd`·`virtio_set_host_notifier`로 *vmexit 없는* fast path.

```c
static void my_virtio_realize(...) {
    /* ... */
    virtio_init(vdev, ...);
    /* ioeventfd 자동 활성 */
}
```

KVM 환경에서 doorbell이 *eventfd*. QEMU main loop이 event 받아 처리. *latency 절반*.

## ID 부여

VirtIO spec에 *device ID* 등록. private device는 보통 *31번* range 또는 *private feature*.

```c
#define VIRTIO_ID_MY_DEVICE 49   /* 새로 부여 */
```

mainline에 contribute 시 *spec 등록* 필요.

## QEMU CLI

```bash
qemu-system-x86_64 -enable-kvm -m 1G -nographic \
    -kernel vmlinuz -initrd initramfs \
    -device virtio-my-pci-base,id=myv0
```

`-device virtio-my-pci-base`(또는 modern transport 변형)로 attach.

## VirtIO vs Custom PCI 비교

| 항목 | Custom PCI | VirtIO |
|------|-----------|---------|
| 성능 | 매 register access vmexit | shared ring, vmexit 최소 |
| 표준화 | 자유 | spec 따라가야 |
| Driver | 자작 | mainline 표준 |
| 학습 비용 | 낮음 | 중간 |
| 적합도 | custom register layout | high throughput |

대부분의 *high-perf device*는 VirtIO. *legacy*나 *vendor-specific* device만 custom PCI.

## 흔한 함정

- **VERSION_1 누락** — legacy mode로 가서 endian 혼동.
- **ioeventfd 미사용** — fast path 못 받음. transport-specific 옵션 확인.
- **device ID 충돌** — 표준 ID 위반. mainline에 등록 또는 private ID 사용.
- **queue size 잘못** — `virtio_add_queue(vdev, N, ...)`의 N이 *power of 2* 필요.

## 정리

- **VirtIO**는 paravirt 표준 — vmexit 최소 + 공유 ring.
- QEMU 측: `virtio_add_queue` + `handle_output` callback + `virtqueue_pop/push/notify`.
- PCI transport wrapper로 PCIe로 노출. vendor 0x1AF4 + device 0x1000+ID.
- **Feature negotiation**으로 device-driver 합의.
- **Config space**로 device-specific parameter.
- Linux driver는 `virtio_driver` 등록 + `virtqueue_add_*`/`get_buf`.
- **ioeventfd**로 doorbell vmexit 우회 — fast path.
- Custom PCI 대비 *수배 빠름*. high-throughput device에 표준.

## 다음 장 예고

다음 장은 *VirtIO의 advanced features* — packed ring·indirect descriptor·EVENT_IDX.

## 관련 항목

- [Ch 14: Scatter-Gather DMA](/blog/tools/emulation/qemu-fake-device/chapter14-scatter-gather-dma)
- [Ch 16: VirtIO Advanced](/blog/tools/emulation/qemu-fake-device/chapter16-virtio-advanced)
- [QEMU Internals — VirtIO Impl](/blog/tools/emulation/qemu-internals/chapter18-virtio-impl)
- [QEMU Internals — vhost](/blog/tools/emulation/qemu-internals/chapter19-vhost)
