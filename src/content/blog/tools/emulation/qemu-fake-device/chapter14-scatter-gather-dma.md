---
title: "Ch 14: Scatter-Gather DMA 깊이"
date: 2026-05-17T14:00:00
description: "Descriptor ring·partial transfer·error injection — SG-DMA 정복."
tags: [QEMU, dma, scatter-gather, descriptor-ring]
series: "QEMU Fake Device Driver"
seriesOrder: 14
draft: true
---

## 이 챕터의 의도

앞선 ch07(DMA)이 단일 buffer DMA만 다뤘다면 이 장은 현실 디바이스가 쓰는 descriptor ring·scatter-gather·partial transfer·error injection을 QEMU 위에서 구현한다. NIC, NVMe, NPU, FPGA가 모두 같은 패턴을 따른다.

## 핵심 항목

- ✦ Descriptor 구조 — `addr / len / flags(SOP·EOP·INT·OWN) / status / next`
- ✦ Linked-list (next pointer) vs circular ring (head/tail) — 트레이드오프
- ✦ Phases — *prep*(driver write desc) → *kick*(doorbell) → *device process* → *post*(complete + IRQ)
- ✦ `pci_dma_sglist_init`, `pci_dma_map` / `pci_dma_unmap` — guest mem mapping
- ✦ Address Space — `pci_dma_*` vs `address_space_*`, IOMMU 활성 시 IOVA→PA 자동 변환
- ✦ Partial transfer — 디바이스 buffer 부족 시 *일부만*, status 코드로 통지, *resume after fault* 패턴
- ✦ Error injection — `dma_memory_rw` 강제 실패로 driver 에러 path 테스트
- ✦ DMA direction — `DMA_DIRECTION_TO_DEVICE` (host→dev) vs `FROM_DEVICE`
- ✦ Cache coherency — bounce buffer 사용 시 비용·DMA mask 영향
- ◦ Zero-copy mapping — `dma_memory_map`으로 host VA 직접 (위험: lifetime)

## 다이어그램 (3)

1. Descriptor ring (head/tail/own bit) + doorbell 시각화
2. Linked-list SG chain — desc[i].next → desc[j]
3. DMA flow — guest mem → IOMMU → device queue → completion IRQ

## 코드 sketch

```c
typedef struct __attribute__((packed)) Desc {
    uint64_t addr;
    uint32_t len;
    uint32_t flags;   /* SOP/EOP/INT/OWN */
    uint64_t next;
} Desc;

static void sg_dma_process(FakeAcc *s) {
    while (s->sq_head != s->sq_tail) {
        Desc d;
        pci_dma_read(&s->parent, s->ring_pa + s->sq_head * sizeof(d), &d, sizeof(d));
        if (!(d.flags & DESC_OWN_DEVICE)) break;

        /* SG chain 순회 */
        Desc cur = d;
        do {
            QEMUSGList sgl;
            pci_dma_sglist_init(&sgl, &s->parent, 1);
            qemu_sglist_add(&sgl, cur.addr, cur.len);

            if (s->inject_fault) {  /* error injection */
                d.flags |= DESC_STATUS_DMA_ERR;
                break;
            }
            /* host→device 또는 device→host 처리 */
            qemu_sglist_destroy(&sgl);
            if (cur.flags & DESC_EOP) break;
            pci_dma_read(&s->parent, cur.next, &cur, sizeof(cur));
        } while (true);

        d.flags = DESC_OWN_HOST | DESC_STATUS_OK;
        pci_dma_write(&s->parent, s->ring_pa + s->sq_head * sizeof(d), &d, sizeof(d));
        s->sq_head = (s->sq_head + 1) % s->ring_size;
        if (d.flags & DESC_INT) qemu_irq_pulse(s->irq);
    }
}
```

## 레퍼런스

- QEMU `include/sysemu/dma.h`, `hw/pci/pci.c::pci_dma_*`
- QEMU `hw/net/e1000e_core.c::e1000e_process_tx_desc` — 실 NIC descriptor 처리
- Linux `Documentation/DMA-API.txt` — driver 측 패턴
- NVMe Spec §4 — SQE/CQE + PRP/SGL

## 관련 항목

- [Ch 7: DMA 기초](/blog/tools/emulation/qemu-fake-device/chapter07-dma) (기존)
- [Ch 13: Register Bank](/blog/tools/emulation/qemu-fake-device/chapter13-register-bank)
- [Ch 15: VirtIO 기초](/blog/tools/emulation/qemu-fake-device/chapter15-virtio-basics)
