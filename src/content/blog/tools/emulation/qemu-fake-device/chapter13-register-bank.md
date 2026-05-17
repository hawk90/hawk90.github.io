---
title: "Ch 13: 레지스터 뱅크 패턴 — Multi-Region 디바이스"
date: 2025-09-01T13:00:00
description: "Doorbell·CSR·queue 영역 분리 — 현실 가속기의 BAR 레이아웃."
tags: [QEMU, register-bank, bar, mmio]
series: "QEMU Fake Device Driver"
seriesOrder: 13
draft: true
---

## 이 챕터의 의도

NVMe·GPU·NPU 같은 *현실 가속기*는 하나의 BAR에 모든 레지스터를 두지 않는다. **doorbell**(연속 write로 SQ tail 통보), **CSR**(상태·설정), **queue ring**(producer/consumer 메모리)을 *서로 다른 영역*에 두는 게 표준. Atomic 영역 분리 + cacheable/uncacheable 정책 분리가 가능해진다. 본 챕터는 QEMU에서 *Multi-Region BAR* 디바이스를 만든다.

## 핵심 항목

- ✦ Single MMIO 한계 — 한 BAR에 CSR + doorbell + queue ring 섞으면 atomic 보장 어렵고 cacheability 정책 못 나눔
- ✦ Multi-region BAR — BAR0 = control/CSR, BAR1 = doorbell, BAR2 = queue ring
- ✦ `memory_region_init_io` 다중 호출 — region별 read/write callback 등록
- ✦ `MemoryRegionOps` — `.read`, `.write`, `.endianness`, `.valid.min_access_size`, `.valid.max_access_size`
- ✦ Doorbell semantics — *write-only*, 값 자체보다 *side effect*가 본질 (큐 인덱스 갱신·worker thread wake)
- ✦ Region별 cacheable 정책 — CSR(uncacheable), queue ring(write-combining or cacheable)
- ✦ NVMe BAR0 layout 모방 — CAP/VS/CC/CSTS + SQ0TDBL/CQ0HDBL doorbell stride
- ◦ Sparse BAR — 큰 BAR 내 일부만 mapping (PCIe sparse mmap)
- ◦ MSI-X table region 분리

## 다이어그램 (3)

1. NVMe 스타일 BAR 레이아웃 (BAR0 CSR + doorbell stride 시각화)
2. QEMU `memory_region` 트리 — root → BAR0..N → sub-region
3. Doorbell write → MMIO callback → guest worker thread wake 흐름

## 코드 sketch

```c
typedef struct FakeAcc {
    PCIDevice parent;
    MemoryRegion bar0_csr;    /* control/status */
    MemoryRegion bar1_doorbell;
    MemoryRegion bar2_queue;
    uint32_t cap, cc, csts;
    uint32_t sq_tail, cq_head;
} FakeAcc;

static void csr_write(void *opaque, hwaddr off, uint64_t val, unsigned sz) { /* CC/CSTS 처리 */ }
static void doorbell_write(void *opaque, hwaddr off, uint64_t val, unsigned sz) {
    /* off로 SQ/CQ 식별 후 tail/head 갱신 + qemu_bh_schedule */
}

static const MemoryRegionOps csr_ops = {
    .read = csr_read, .write = csr_write,
    .endianness = DEVICE_LITTLE_ENDIAN,
    .valid.min_access_size = 4, .valid.max_access_size = 8,
};
```

## 레퍼런스

- QEMU `softmmu/memory.c::memory_region_init_io`
- QEMU `hw/nvme/ctrl.c` — 실제 NVMe BAR layout 참고
- NVMe Base Spec §3 — Controller Properties
- LWN "PCI BAR sparse mapping"

## 관련 항목

- [Ch 5: MMIO 기초](/blog/tools/emulation/qemu-fake-device/chapter05-mmio) (기존)
- [Ch 14: Scatter-Gather DMA 깊이](/blog/tools/emulation/qemu-fake-device/chapter14-scatter-gather-dma)
- [Ch 19: Multi-function PCI](/blog/tools/emulation/qemu-fake-device/chapter19-multi-function)
