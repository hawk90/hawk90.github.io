---
title: "Ch 14: Scatter-Gather DMA 깊이"
date: 2026-05-17T14:00:00
description: "Descriptor ring·partial transfer·error injection — SG-DMA 정복."
tags: [QEMU, dma, scatter-gather, descriptor-ring]
series: "QEMU Fake Device Driver"
seriesOrder: 14
draft: true
---

Ch 7의 simple DMA는 *single contiguous buffer*를 가정했습니다. 현실 driver는 *scatter-gather*(SG)로 *page list*를 한 번에 처리. 이 장은 *descriptor ring + SG-DMA* 완전 구현을 다룹니다.

## SG-DMA의 의미

user-space buffer 4MB는 *물리적으로 연속*이지 않음 — 1024 page에 분산. SG로 *모든 page를 한 번에* device에 전달.

```text
user buffer 4MB (virtual)
  page 0 → phys 0x1000000
  page 1 → phys 0x2A00000
  page 2 → phys 0x0500000
  ... (random scattered)

SG list (descriptors):
  desc[0]: addr=0x1000000, len=4096
  desc[1]: addr=0x2A00000, len=4096
  desc[2]: addr=0x0500000, len=4096
  ...

device가 list 처리:
  for each desc: pci_dma_read/write(desc.addr, ..., desc.len)
```

## Descriptor 구조

```c
typedef struct DmaDesc {
    uint64_t addr;
    uint32_t len;
    uint16_t flags;     /* SOP, EOP, INT, OWN */
    uint16_t next;      /* chain (or terminator) */
    uint32_t status;
    uint32_t reserved;
} __attribute__((packed)) DmaDesc;

#define DESC_OWN_DEV   BIT(15)
#define DESC_SOP       BIT(0)
#define DESC_EOP       BIT(1)
#define DESC_INT       BIT(2)
```

NIC·NVMe·NPU가 *모두* 이 패턴.

## Ring layout

```text
Ring buffer (host RAM, dma_alloc_coherent):
┌────┬────┬────┬────┬────┬────┬────┬────┐
│ d0 │ d1 │ d2 │ d3 │ d4 │ d5 │ d6 │ d7 │
└────┴────┴────┴────┴────┴────┴────┴────┘
   ▲                     ▲
   │ head (device)       │ tail (driver)
```

driver가 tail에 descriptor 채우고 *doorbell*. device가 head부터 처리.

## QEMU 측 — ring 처리

```c
typedef struct DmaChannel {
    uint64_t ring_dma_addr;    /* host RAM의 ring 주소 */
    uint32_t ring_size;        /* descriptor 수 */
    uint32_t head;
    uint32_t tail;             /* driver doorbell로 set */
    QEMUBH  *bh;
} DmaChannel;

static void dma_process(void *opaque) {
    MyDeviceState *s = opaque;
    DmaChannel *ch = &s->h2c;

    while (ch->head != ch->tail) {
        DmaDesc d;
        uint64_t desc_addr = ch->ring_dma_addr +
                             ch->head * sizeof(DmaDesc);

        /* host RAM에서 descriptor read */
        if (pci_dma_read(&s->parent_obj, desc_addr, &d, sizeof(d)) != 0) {
            error_path(s);
            return;
        }

        if (!(d.flags & DESC_OWN_DEV)) break;   /* not ready */

        /* data 처리 */
        process_descriptor(s, &d);

        /* status update */
        d.status = 0;
        d.flags &= ~DESC_OWN_DEV;
        pci_dma_write(&s->parent_obj, desc_addr, &d, sizeof(d));

        /* IRQ if INT flag */
        if (d.flags & DESC_INT) {
            msix_notify(&s->parent_obj, ch->msix_vec);
        }

        ch->head = (ch->head + 1) % ch->ring_size;
    }
}

static void doorbell_write(...) {
    /* tail 갱신 + BH schedule */
    ch->tail = val;
    qemu_bh_schedule(ch->bh);
}
```

`BH`로 *async 처리*. main loop를 *block 안 함*.

## process_descriptor

```c
static void process_descriptor(MyDeviceState *s, DmaDesc *d) {
    g_autofree void *buf = g_malloc(d->len);

    /* H2C — host → device */
    if (pci_dma_read(&s->parent_obj, d->addr, buf, d->len) != 0) {
        d->status = STATUS_DMA_ERROR;
        return;
    }

    /* user logic 처리 (예: byte reverse) */
    for (uint32_t i = 0; i < d->len; i++) {
        ((uint8_t *)buf)[i] ^= 0xFF;
    }

    /* C2H — device → host */
    pci_dma_write(&s->parent_obj, d->addr, buf, d->len);

    d->status = STATUS_OK;
}
```

descriptor 하나당 *read → process → write* 사이클. 복잡한 device는 *별도 backend*(block layer 등)로 위임.

## Driver — SG mapping

```c
static int my_dma_xfer_sg(struct my_dev *d, void *buf, size_t len) {
    struct sg_table sgt;
    int ret;

    /* 1. user buffer를 page list로 */
    ret = sg_alloc_table_from_buf(&sgt, buf, len);
    if (ret) return ret;

    /* 2. DMA mapping */
    int n_dma = dma_map_sg(&d->pdev->dev, sgt.sgl, sgt.nents,
                            DMA_TO_DEVICE);
    if (n_dma == 0) {
        sg_free_table(&sgt);
        return -EIO;
    }

    /* 3. descriptor에 채움 */
    struct scatterlist *sg;
    int i;
    for_each_sg(sgt.sgl, sg, n_dma, i) {
        DmaDesc desc = {
            .addr = sg_dma_address(sg),
            .len = sg_dma_len(sg),
            .flags = DESC_OWN_DEV | (i == n_dma - 1 ? DESC_EOP | DESC_INT : 0),
        };
        write_desc(d, i, &desc);
    }

    /* 4. doorbell */
    init_completion(&d->done);
    writel(n_dma, d->mmio + REG_DOORBELL);

    /* 5. 완료 대기 */
    wait_for_completion_timeout(&d->done, msecs_to_jiffies(1000));

    /* 6. unmap */
    dma_unmap_sg(&d->pdev->dev, sgt.sgl, sgt.nents, DMA_TO_DEVICE);
    sg_free_table(&sgt);
    return 0;
}
```

`sg_table` + `dma_map_sg`가 *user buffer*를 *DMA-able SG list*로 변환.

## Indirect descriptor

descriptor 한 entry가 *별도 buffer*의 *수십 entry*를 가리킴. ring 1 slot으로 *대량 transfer*.

```c
#define DESC_INDIRECT  BIT(3)

if (d.flags & DESC_INDIRECT) {
    /* d.addr이 *indirect table*의 주소 */
    /* d.len이 indirect entry 개수 */
    DmaDesc indirect[d.len];
    pci_dma_read(&s->parent_obj, d.addr,
                 indirect, sizeof(indirect));
    for (int i = 0; i < d.len; i++) {
        process_descriptor(s, &indirect[i]);
    }
}
```

VirtIO·NVMe SGL 모두 이 패턴.

## Partial transfer

큰 transfer가 *중간에 error* 발생 시 *어디까지 성공*했는지 보고.

```c
static void process_descriptor(MyDeviceState *s, DmaDesc *d) {
    uint32_t done = 0;
    g_autofree void *buf = g_malloc(d->len);

    while (done < d->len) {
        size_t chunk = MIN(4096, d->len - done);
        if (pci_dma_read(&s->parent_obj, d->addr + done, buf, chunk) != 0) {
            d->status = STATUS_PARTIAL | done;
            return;
        }
        /* process chunk */
        done += chunk;
    }
    d->status = STATUS_OK;
}
```

driver가 *partial OK*를 보고 *그 다음부터 retry*. NIC·storage의 *resume capability*.

## Bidirectional ring

H2C(host→device)와 C2H(device→host)가 *별도 ring*.

```c
struct MyDeviceState {
    DmaChannel h2c;
    DmaChannel c2h;
};
```

driver는 둘을 *독립적*으로 submit. *full duplex*.

## Completion ring (CR)

descriptor ring과 *별도 ring*에 *완료 entry* push.

```c
typedef struct CmplEntry {
    uint32_t desc_id;
    uint32_t status;
    uint64_t timestamp;
} CmplEntry;
```

```c
static void enqueue_completion(MyDeviceState *s, uint32_t desc_id, int status) {
    CmplEntry ce = { .desc_id = desc_id, .status = status,
                     .timestamp = get_ticks() };
    pci_dma_write(&s->parent_obj,
                  s->cr_addr + s->cr_tail * sizeof(ce), &ce, sizeof(ce));
    s->cr_tail = (s->cr_tail + 1) % s->cr_size;
}
```

driver는 IRQ 후 CR을 *iterate*해서 *batch* 완료 처리.

## Error injection

```c
if (s->fault_mode == FAULT_DMA_PARTIAL) {
    d->status = STATUS_PARTIAL | (d->len / 2);
    return;
}
if (s->fault_mode == FAULT_DMA_TIMEOUT) {
    /* descriptor를 *영원히* OWN_DEV로 남김 */
    return;
}
```

Ch 11의 advanced scenario 와 결합.

## Performance considerations

- **descriptor coalescing**: 인접 descriptor를 *하나로 합쳐* DMA 한 번에.
- **interrupt coalescing**: N descriptor 처리 후 *한 번* IRQ.
- **multi-queue**: CPU 코어별 ring 분리, lock-free.
- **doorbell batching**: driver가 *여러 descriptor*를 채운 후 *한 번* doorbell.

modern NIC(mlx5)가 모두 사용.

## 흔한 함정

- **OWN bit cleared 안 됨** — device가 *영원히* 그 descriptor를 보고. ring 진행 멈춤.
- **memory barrier** — driver가 descriptor 쓰고 doorbell 사이에 *barrier* 필요. ARM 등 weak ordering에.
- **alignment** — descriptor가 *natural alignment* 어긋남. cache line 64B 권장.
- **ring full handling** — driver가 *backpressure* 처리 못 하면 *write를 잃음*.

## 정리

- **SG-DMA**는 *scattered page list*를 device가 *직접 fetch*. NIC·NVMe·NPU 표준.
- **Descriptor ring** layout — head/tail + circular buffer. doorbell + IRQ.
- QEMU 측 BH에서 *async 처리* — main loop 비점유.
- Driver 측: `dma_map_sg` + `for_each_sg` + descriptor write + doorbell.
- **Indirect descriptor**로 1 slot에 *대량 transfer*. VirtIO·NVMe SGL.
- **Partial transfer**로 error 시 *resume*. **CR**로 batch completion.
- Performance: coalescing·multi-queue·doorbell batching.

## 다음 장 예고

다음 장은 *paravirtualized device* — **VirtIO 기초**. 가장 빠른 device transport.

## 관련 항목

- [Ch 13: Register Bank](/blog/tools/emulation/qemu-fake-device/chapter13-register-bank)
- [Ch 15: VirtIO Basics](/blog/tools/emulation/qemu-fake-device/chapter15-virtio-basics)
- [FPGA Driver — Descriptor Ring](/blog/tools/emulation/qemu-fpga-driver/chapter06-dma-descriptor-ring)
