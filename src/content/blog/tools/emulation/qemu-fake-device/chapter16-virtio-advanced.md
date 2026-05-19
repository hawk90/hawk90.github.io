---
title: "Ch 16: VirtIO 디바이스 심화"
date: 2026-05-17T16:00:00
description: "Split·packed virtqueue·indirect descriptor — VirtIO 성능 layer."
tags: [QEMU, virtio, packed-ring, indirect-descriptor, EVENT_IDX]
series: "QEMU Fake Device Driver"
seriesOrder: 16
draft: true
---

Ch 15의 basic VirtIO 위에 *성능 최적화 layer*들이 있습니다. **packed virtqueue**(1.1+)·**indirect descriptor**·**EVENT_IDX**가 throughput을 *수 배* 끌어올립니다. modern VirtIO device는 *모두* 이 features를 활용. 이 장이 그들의 *내부*.

## Split vring vs Packed vring

VirtIO 1.0의 *split vring*은 3-ring(desc·avail·used). 1.1의 **packed vring**은 *1-ring으로 통합*.

```text
Split (1.0):
  Descriptor ring + Available ring + Used ring
  → 3 cache line, 3 atomic update

Packed (1.1):
  Single Descriptor ring (with flags bits indicating state)
  → 1 cache line, 1 atomic update
  → ~30% throughput improvement
```

같은 transaction에 *3× cache traffic 감소*. modern device에 표준.

## Packed descriptor format

```c
struct VRingPackedDesc {
    uint64_t addr;
    uint32_t len;
    uint16_t id;
    uint16_t flags;     /* AVAIL/USED bit + DESC_F_NEXT, INDIRECT */
};
```

`AVAIL + USED bit toggle`이 *얼라이먼트의 마법*.

| Avail bit | Used bit | 상태 |
|-----------|----------|------|
| 같음 (둘 다 0 또는 둘 다 1) | | Device 처리 가능 (driver-owned) |
| 다름 | | Device-owned |

`wrap counter`가 ring을 한 바퀴 돌 때마다 *interpretation 반전*.

## Indirect descriptor

ring 1 slot에 *별도 buffer*의 *수십 entry* 매핑.

```text
main ring slot:
  flags = INDIRECT
  addr  = indirect table dma_addr
  len   = entry 수

indirect table (별도 buffer):
  desc[0]: addr=..., len=..., next=1
  desc[1]: addr=..., len=..., next=0 (end)
```

main ring의 *1 slot*으로 *최대 256 descriptor* 표현. *ring depth* 폭증.

## QEMU 측 처리

```c
static void process_request(MyVirtIOState *s, VirtQueueElement *elem) {
    /* elem->in/out_sg가 *이미 indirect 풀린 상태*.
       VirtIO core가 자동 처리. */
    /* device는 elem만 보면 됨 */
    iov_to_buf(elem->out_sg, elem->out_num, 0, buf, len);
}
```

`virtqueue_pop`이 *indirect를 unfold*. device code는 *변경 없음*.

## Feature flag

```c
#define VIRTIO_RING_F_INDIRECT_DESC   28
#define VIRTIO_F_RING_PACKED          34

static uint64_t my_virtio_get_features(VirtIODevice *vdev,
                                         uint64_t features, Error **errp) {
    features |= (1ULL << VIRTIO_RING_F_INDIRECT_DESC);
    features |= (1ULL << VIRTIO_F_RING_PACKED);
    features |= (1ULL << VIRTIO_F_VERSION_1);
    return features;
}
```

driver가 accept하면 *해당 path* 활성.

## EVENT_IDX — notification suppression

매 used ring update마다 *IRQ inject*는 비싸. EVENT_IDX로 *몇 entry당 한 번* IRQ.

```c
struct VRingUsed {
    uint16_t flags;
    uint16_t idx;
    /* ... */
    uint16_t avail_event;     /* device가 어디까지 처리되면 깨워줘? */
};

struct VRingAvail {
    uint16_t flags;
    uint16_t idx;
    /* ... */
    uint16_t used_event;      /* driver가 어디까지 받으면 다시 notify? */
};
```

driver와 device가 *각자 watermark* 설정. cross threshold 시에만 notify.

```c
/* QEMU 측 — IRQ 결정 */
if (virtio_should_notify(vdev, vq)) {
    virtio_notify(vdev, vq);
}
```

`virtio_should_notify`가 *EVENT_IDX 비교*로 결정.

## Notification suppression 효과

10Gbps NIC가 *초당 수백만 packet*. 매 packet마다 IRQ면 *kernel overhead 100%*. EVENT_IDX로 *수십~수백 packet마다* IRQ — overhead *극적 감소*.

## VIRTIO_F_RING_RESET

VirtIO 1.2의 *new feature*. ring을 *runtime reset*. memory 정리·driver 재시작에 유용.

```c
static void my_virtio_reset(VirtIODevice *vdev) {
    /* ring state clear, descriptor invalidate */
}
```

## SR-IOV — Virtual Function

```c
static void my_virtio_class_init(...) {
    /* SR-IOV support */
    pcidev_k->sriov_pf_to_vf = sriov_pf_to_vf;
    /* PF가 N개 VF 노출 */
}
```

같은 device의 *VF*를 *guest에 pass-through*. cloud provider의 multi-tenant.

## VFIO via VirtIO

VirtIO device의 *vhost* 변형 — kernel·userspace bypass(QEMU Internals Ch 19).

```bash
# vhost-net
-netdev tap,id=net0,vhost=on \
-device virtio-net-pci,netdev=net0
```

QEMU의 handle_output 안 거치고 *kernel*이 직접 virtqueue 처리. *latency 절반*.

## Driver — Linux side가 자동 지원

대부분의 modern feature를 *Linux virtio core*가 자동 사용. driver는 *feature 변경* 거의 무관.

```c
/* probe에서 feature 확인만 */
if (virtio_has_feature(vdev, VIRTIO_F_RING_PACKED)) {
    /* packed ring 사용 중 */
}
```

driver code는 *대부분 동일*.

## Multi-queue support

device가 *여러 virtqueue* 제공. driver가 *CPU 코어별로* 사용.

```c
static int my_virtio_probe(struct virtio_device *vdev) {
    int nvq = 4;
    struct virtqueue *vqs[4];
    vq_callback_t *cbs[4] = { my_cb, my_cb, my_cb, my_cb };
    const char *names[4] = { "vq0", "vq1", "vq2", "vq3" };
    int err = virtio_find_vqs(vdev, nvq, vqs, cbs, names, NULL);
}
```

NIC·NVMe-virtio가 *수십 queue*. cache 친화적 scaling.

## VirtIO over MMIO

`virtio-mmio` transport — embedded·microvm 환경.

```c
TYPE_VIRTIO_MMIO_BASE
```

PCI 없는 환경(`microvm`)에서. `virtio-blk-device`·`virtio-net-device`가 MMIO 변형.

```bash
qemu-system-aarch64 -M microvm \
    -drive file=disk.img,if=none,id=hd0 \
    -device virtio-blk-device,drive=hd0
```

guest는 *memory address*로 device 접근. PCI scan 불필요.

## Performance comparison

| Feature | Throughput | Latency |
|---------|------------|---------|
| split vring (basic) | baseline | baseline |
| + indirect | 1.5× | 0.8× |
| + packed | 2.0× | 0.7× |
| + EVENT_IDX | 2.5× | 0.6× |
| + vhost-net | 5× | 0.3× |
| + vhost-user (DPDK) | 10× | 0.2× |

모든 가속 stacking 시 *수십 배* 향상.

## VirtIO 1.2 새 feature

- `RING_RESET` — runtime ring reset
- `NOTIFICATION_DATA` — notification에 data 포함
- `ADMIN_VQ` — admin command 표준화

modern device는 *1.2 빌드*가 권장.

## Debugging — virtio-trace

```bash
qemu-system-x86_64 -trace "virtio_*" -D /tmp/virtio.log ...
```

매 virtqueue 동작이 trace.

```text
virtio_queue_notify queue=0 size=128
virtio_pop_avail_idx 5
virtio_push_used_idx 5
virtio_notify vector=0
```

성능 분석에 매우 유용.

## 흔한 함정

- **packed ring driver 비호환** — old guest는 packed 지원 X. fallback to split.
- **EVENT_IDX watermark stale** — driver·device 양쪽이 consistent하게 update.
- **indirect chain 길이** — 너무 길면 *fetch overhead*. 보통 32~64.
- **VIRTIO_F_VERSION_1 누락** — legacy mode로 fallback. endian 문제.

## 정리

- **Split** vs **Packed** vring — packed가 modern. 30% throughput ↑.
- **Indirect descriptor**로 ring 1 slot이 *수십 descriptor*. depth 폭증.
- **EVENT_IDX**로 IRQ 빈도 *조정* — high-rate workload에 필수.
- **VIRTIO_F_VERSION_1**·**RING_RESET** 같은 modern feature 활성.
- **SR-IOV**·**vhost**(net/user)로 datapath 가속.
- **Multi-queue** + CPU 코어별 binding으로 scaling.
- **VirtIO over MMIO**로 microvm·embedded 환경 지원.
- Performance stacking 시 baseline 대비 *수십 배*.

## 다음 장 예고

다음 장은 *device 보안 검증* — **fuzzing**. Syzkaller·QEMU built-in fuzzer로 driver 취약점 발굴.

## 관련 항목

- [Ch 15: VirtIO Basics](/blog/tools/emulation/qemu-fake-device/chapter15-virtio-basics)
- [Ch 17: Fuzzing](/blog/tools/emulation/qemu-fake-device/chapter17-fuzzing)
- [QEMU Internals — VirtIO Impl](/blog/tools/emulation/qemu-internals/chapter18-virtio-impl)
- [QEMU Internals — vhost](/blog/tools/emulation/qemu-internals/chapter19-vhost)
