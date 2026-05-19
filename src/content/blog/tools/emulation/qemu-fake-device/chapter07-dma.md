---
title: "Ch 7: DMA 버퍼 처리"
date: 2026-05-17T07:00:00
description: "QEMU 디바이스에서 DMA를 통해 게스트 메모리에 접근한다."
tags: [QEMU, DMA, Memory, pci_dma_read, IOMMU]
series: "QEMU Fake Device Driver"
seriesOrder: 7
draft: true
---

DMA(Direct Memory Access)는 device가 *CPU 개입 없이* host RAM에 직접 접근하는 메커니즘입니다. *대용량 데이터*(disk·network·video) 전송의 표준. QEMU에서는 `pci_dma_read/write` API로 *간단히* 구현하지만, IOMMU 변환과 alignment 같은 *세부*에 주의가 필요.

## 무엇을 푸는가

MMIO register만으로 *4-byte씩* data 전송하면 *극히 느림*. 64KB packet을 16384번 write — driver의 *모든 CPU cycle*이 register에 낭비.

DMA는 *driver가 주소만 register에 setup* → *device가 자기 페이스로* host RAM 접근. CPU는 *완료만 기다림*. throughput *수백 배* 향상.

## DMA 흐름 한 라운드

```text
1. Driver:
   - DMA buffer 할당 (dma_alloc_coherent)
   - data 복사
   - device의 SRC_ADDR·LEN register에 IOVA + 크기 set
   - GO write (doorbell)

2. Device:
   - SRC_ADDR을 IOVA로 받음
   - pci_dma_read로 host RAM의 *그 영역* 읽음
   - 처리 후 DST_ADDR로 pci_dma_write
   - INTR_DONE bit set + MSI-X notify

3. Driver:
   - IRQ handler가 깨어남
   - 결과 buffer 사용
   - DMA buffer 해제
```

## Register 확장

```c
#define REG_SRC_LO   0x30
#define REG_SRC_HI   0x34
#define REG_DST_LO   0x38
#define REG_DST_HI   0x3C
#define REG_LEN      0x28
#define REG_GO       0x2C
```

64-bit address를 *LO/HI 분할*해 두 register에. 32-bit guest는 HI=0.

```c
struct MyPCIState {
    /* ... */
    uint64_t src_addr;
    uint64_t dst_addr;
    uint32_t dma_len;
};
```

## Write callback

```c
static void my_mmio_write(void *opaque, hwaddr addr,
                          uint64_t val, unsigned size) {
    MyPCIState *s = opaque;

    switch (addr) {
    case REG_SRC_LO:
        s->src_addr = (s->src_addr & 0xFFFFFFFF00000000ULL) | val;
        break;
    case REG_SRC_HI:
        s->src_addr = (s->src_addr & 0xFFFFFFFFULL) | ((uint64_t)val << 32);
        break;
    case REG_DST_LO:
        s->dst_addr = (s->dst_addr & 0xFFFFFFFF00000000ULL) | val;
        break;
    case REG_DST_HI:
        s->dst_addr = (s->dst_addr & 0xFFFFFFFFULL) | ((uint64_t)val << 32);
        break;
    case REG_LEN:
        s->dma_len = val;
        break;
    case REG_GO:
        process_dma(s);
        break;
    /* ... */
    }
}
```

## process_dma

```c
static void process_dma(MyPCIState *s) {
    g_autofree void *buf = g_malloc(s->dma_len);

    /* host RAM → buffer */
    int rc = pci_dma_read(&s->parent_obj, s->src_addr, buf, s->dma_len);
    if (rc != 0) {
        s->intr_status |= INTR_ERROR;
        msix_notify(&s->parent_obj, 1);   /* error vector */
        return;
    }

    /* 처리 — 여기서는 byte reverse */
    for (uint32_t i = 0; i < s->dma_len / 2; i++) {
        uint8_t tmp = ((uint8_t *)buf)[i];
        ((uint8_t *)buf)[i] = ((uint8_t *)buf)[s->dma_len - 1 - i];
        ((uint8_t *)buf)[s->dma_len - 1 - i] = tmp;
    }

    /* buffer → host RAM */
    pci_dma_write(&s->parent_obj, s->dst_addr, buf, s->dma_len);

    s->intr_status |= INTR_DONE;
    msix_notify(&s->parent_obj, 0);
}
```

`pci_dma_read/write`가 *PCI device 측* DMA API. 내부적으로 *device의 AddressSpace*를 거쳐 IOMMU 변환.

## Driver — DMA buffer 할당

```c
struct my_dma_req {
    void *vaddr;
    dma_addr_t dma_addr;
    size_t len;
};

static int my_dma_xfer(struct my_dev *d, const void *src, void *dst,
                       size_t len) {
    struct my_dma_req in_req, out_req;

    /* coherent memory allocate */
    in_req.vaddr = dma_alloc_coherent(&d->pdev->dev, len,
                                       &in_req.dma_addr, GFP_KERNEL);
    out_req.vaddr = dma_alloc_coherent(&d->pdev->dev, len,
                                        &out_req.dma_addr, GFP_KERNEL);
    if (!in_req.vaddr || !out_req.vaddr) {
        return -ENOMEM;
    }

    memcpy(in_req.vaddr, src, len);

    /* device에 IOVA 전달 */
    writel((u32)in_req.dma_addr,           d->mmio + REG_SRC_LO);
    writel((u32)(in_req.dma_addr >> 32),   d->mmio + REG_SRC_HI);
    writel((u32)out_req.dma_addr,          d->mmio + REG_DST_LO);
    writel((u32)(out_req.dma_addr >> 32),  d->mmio + REG_DST_HI);
    writel(len,                            d->mmio + REG_LEN);
    writel(1,                              d->mmio + REG_GO);

    /* IRQ 대기 */
    wait_for_completion(&d->done);

    memcpy(dst, out_req.vaddr, len);

    dma_free_coherent(&d->pdev->dev, len, in_req.vaddr, in_req.dma_addr);
    dma_free_coherent(&d->pdev->dev, len, out_req.vaddr, out_req.dma_addr);
    return 0;
}
```

`dma_alloc_coherent`가 *DMA-able buffer* 할당. *kernel virtual address* + *IOVA* 둘 다 반환.

## DMA mapping API 종류

| API | 의미 |
|-----|------|
| `dma_alloc_coherent` | *coherent* memory (cache 무관). 작은 metadata 적합 |
| `dma_map_single` | 기존 buffer를 *temporary DMA-able*로 |
| `dma_map_sg` | scatter-gather list 매핑 (Ch 14) |
| `dma_map_page` | page 단위 매핑 |

short-lived 큰 buffer는 `dma_map_single` + `dma_unmap_single` 패턴이 일반적.

## IOMMU 변환

guest가 `dma_alloc_coherent`로 받은 주소는 *guest physical*. PCI device가 *그 주소로* PCIe transaction을 발사하면.

```text
guest driver:    dma_addr = 0xDEAD_BEEF (GPA)
                  ↓
device DMA:      PCIe transaction with addr 0xDEAD_BEEF
                  ↓
host IOMMU:      GPA → HPA 변환
                  ↓
host RAM:        실 physical memory access
```

IOMMU 활성 시(`intel_iommu=on iommu=pt`) *device-specific address space*를 거침. guest끼리 격리.

## error handling

```c
int rc = pci_dma_read(pdev, addr, buf, len);
if (rc != 0) {
    /* MEMTX_ERROR or MEMTX_DECODE_ERROR */
    s->intr_status |= INTR_DMA_ERROR;
    msix_notify(pdev, vec);
}
```

`pci_dma_read`는 *MemTxResult* 반환.

| Result | 의미 |
|--------|------|
| `MEMTX_OK` (0) | 성공 |
| `MEMTX_ERROR` | bus error (잘못된 주소) |
| `MEMTX_DECODE_ERROR` | address가 *어디에도 매핑 안 됨* |
| `MEMTX_ACCESS_ERROR` | permission |

production driver는 *error 항상 검사*.

## Bidirectional vs Unidirectional

```c
DMA_TO_DEVICE       /* host → device */
DMA_FROM_DEVICE     /* device → host */
DMA_BIDIRECTIONAL   /* 양방향 */
```

cache flush·invalidate 방향에 영향. *정확히 지정*해야 cache coherency.

## Performance 측정

```c
/* QEMU 측 — DMA timing trace */
static void process_dma(MyPCIState *s) {
    int64_t t0 = qemu_clock_get_ns(QEMU_CLOCK_VIRTUAL);
    /* ... DMA ... */
    int64_t t1 = qemu_clock_get_ns(QEMU_CLOCK_VIRTUAL);
    qemu_log("DMA %u bytes in %ld ns\n", s->dma_len, t1 - t0);
}
```

guest 측에서는 `time_after`·`ktime_get_ns`로 측정.

## Async DMA — BH 사용

큰 DMA를 *block*하지 말고 *background*에서.

```c
static void process_dma_bh(void *opaque) {
    MyPCIState *s = opaque;
    /* DMA 처리 */
    /* ... */
    msix_notify(...);
}

static void process_dma(MyPCIState *s) {
    /* BH로 schedule — main loop이 처리 */
    qemu_bh_schedule(s->dma_bh);
}
```

main loop가 *다른 device emulation*과 *interleave*. high-throughput device에 필요.

## 흔한 함정

- **address mismatch** — guest의 dma_addr이 *우리가 받는 주소*. IOMMU 활성 시 *guest IOVA*. 변환 자동.
- **buffer free 시점** — DMA 진행 중에 free하면 *use-after-free*. completion 대기 후.
- **bouncer buffer** — driver가 *DMA-unfriendly* buffer 전달 시 *bounce*. swiotlb가 자동 처리.
- **alignment** — 일부 device는 *cache-line aligned* 요구. 4KB 권장.

## 정리

- DMA로 *대용량 data*를 CPU 개입 없이 host RAM ↔ device 이동.
- QEMU 측: `pci_dma_read/write(pdev, addr, buf, len)`. MemTxResult로 error check.
- Driver: `dma_alloc_coherent`로 buffer 할당 → IOVA를 device에 setup → doorbell.
- IOMMU 활성 시 *device address space* 거침. guest 격리 보장.
- DMA direction(`TO_DEVICE`·`FROM_DEVICE`·`BIDIRECTIONAL`) 명시 — cache coherency.
- 큰 DMA는 BH로 schedule — main loop 비점유.
- 다음 layer: scatter-gather(Ch 14)로 *page list* DMA.

## 다음 장 예고

다음 장은 *driver 측 코드*를 본격 작성 — Linux **kernel module** + ioctl + sysfs.

## 관련 항목

- [Ch 6: 인터럽트](/blog/tools/emulation/qemu-fake-device/chapter06-interrupts)
- [Ch 8: Linux 드라이버 작성](/blog/tools/emulation/qemu-fake-device/chapter08-linux-driver)
- [Ch 14: Scatter-Gather DMA](/blog/tools/emulation/qemu-fake-device/chapter14-scatter-gather-dma)
- [FPGA Driver — DMA Descriptor Ring](/blog/tools/emulation/qemu-fpga-driver/chapter06-dma-descriptor-ring)
