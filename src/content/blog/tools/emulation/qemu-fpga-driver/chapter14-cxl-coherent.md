---
title: "Ch 14: CXL.cache·CCI-P — FPGA Host-Coherent"
date: 2026-05-17T14:00:00
description: "FPGA가 host CPU cache에 직접 — coherent accelerator."
tags: [QEMU, cxl-cache, cci-p, coherent-fpga, npu]
series: "FPGA Driver via QEMU+VFIO"
seriesOrder: 14
draft: true
---

## 이 챕터의 의도

DMA는 coarse-grained 방식이라 page 단위 transfer만 가능하다. Coherent accelerator는 FPGA가 host CPU cache에 직접 참여해 load/store를 직접 하고 snoop을 따라간다. Intel CCI-P(legacy)와 CXL.cache(modern)가 이를 가능하게 한다. NPU와 NPU 컴파일러 진로의 핵심이며, 이 시리즈의 마무리로 FPGA driver의 미래를 본다.

## 핵심 항목

- ✦ Coherent accelerator의 의미
  - DMA: descriptor + IRQ + page-level
  - Coherent: load/store 직접, cache-line 단위, snoop으로 일관성 자동
- ✦ Use case
  - **Pointer chasing** (graph, tree) — DMA로는 너무 많은 round-trip
  - **Fine-grained sync** — producer/consumer cache-line 단위
  - **Shared data structure** — lock-free queue가 FPGA↔CPU 공유
- ✦ **Intel CCI-P** (legacy) — Cache-Coherent Interconnect for Performance
  - HARP (Hardware Accelerator Research Program) 시절
  - Intel PAC FPGA + Xeon에서 사용
  - 별도 슬롯 (Skylake-SP w/ FPGA in 동일 package)
- ✦ **CXL.cache** (modern, 2019~) — PCIe 5.0+ 위 새 protocol
  - CXL 3.x = PCIe 6.0 기반
  - **CXL.io** — 기본 PCIe 호환 (driver, config)
  - **CXL.cache** — accelerator → host memory 캐싱
  - **CXL.mem** — host → accelerator memory 캐싱
- ✦ **Type 2 accelerator** — CXL.cache + CXL.mem 둘 다 (FPGA의 표준)
- ✦ **Bias mode** — host bias vs device bias, ownership switching cost 최소
- ✦ Driver impact
  - DMA descriptor 불필요 — 메모리 alloc 후 FPGA에 *주소만* 전달
  - Cache flush 불필요 — hardware 자동
  - Lock-free queue가 FPGA↔CPU 사이 가능
- ✦ Workflow change — `coherent_alloc` → 주소 전달 → FPGA가 load/store
- ✦ NPU compiler 영향 — TVM/MLIR backend가 *coherent buffer 가정* 가능
- ✦ 시리즈 종합 정리 — *fake → passthrough → SR-IOV → CXL* 4-step 완성, FPGA driver의 미래는 *coherent*
- ◦ CXL 3.x switching, memory pooling — datacenter scale

## 다이어그램 (4)

1. DMA vs coherent 비교 (round-trip 수, granularity)
2. CXL.io / .cache / .mem protocol 분리
3. Type 1/2/3 accelerator 분류 (NIC / FPGA / memory module)
4. Bias mode switching — host bias ↔ device bias

## 코드 sketch

```c
/* CXL.cache 시대의 driver — DMA descriptor 없음 */
static int my_fpga_compute_coherent(struct my_fpga *f, void *input, size_t in_len,
                                     void *output, size_t out_len) {
    /* coherent_alloc — kernel virtual addr (이미 cache-coherent) */
    void *in_buf = kmalloc(in_len, GFP_KERNEL);
    void *out_buf = kmalloc(out_len, GFP_KERNEL);
    memcpy(in_buf, input, in_len);

    /* FPGA에 *주소만* 전달 */
    writeq((u64)virt_to_phys(in_buf), f->user_mmio + USER_INPUT_PTR);
    writeq((u64)virt_to_phys(out_buf), f->user_mmio + USER_OUTPUT_PTR);
    writel(out_len, f->user_mmio + USER_OUTPUT_LEN);
    writel(1, f->user_mmio + USER_START);

    /* FPGA가 직접 load/store — cache 자동 sync */
    wait_for_completion(&f->done);

    /* cache flush 불필요 — coherent */
    memcpy(output, out_buf, out_len);
    kfree(in_buf);
    kfree(out_buf);
    return 0;
}
```

```c
/* User: lock-free queue 공유 (CXL.cache 위에서) */
struct shared_queue {
    atomic_t head;   /* CPU produces */
    atomic_t tail;   /* FPGA consumes */
    char data[1024][64];
};

/* CPU side */
void push(struct shared_queue *q, const char *data) {
    int h = atomic_read(&q->head);
    int next = (h + 1) % 1024;
    while (next == atomic_read(&q->tail)) cpu_relax();   /* full wait */
    memcpy(q->data[h], data, 64);
    atomic_set(&q->head, next);
    /* FPGA가 즉시 본다 (cache coherent) */
}

/* FPGA HLS side (의사) */
while (1) {
    int t = atomic_load(&q->tail);
    while (t == atomic_load(&q->head)) yield();    /* empty wait */
    process(q->data[t]);
    atomic_store(&q->tail, (t + 1) % 1024);
}
```

```bash
# CXL Type 2 device 확인 (Linux 6.6+)
lspci -vv | grep -A 20 "CXL"
# Capability: ... CXL3
# .io enabled, .cache enabled, .mem enabled

cat /sys/bus/cxl/devices/.../type
# 2

cxl list -d
```

## 레퍼런스

- CXL 3.1 Specification — computeexpresslink.org
- Intel CCI-P spec — opae.github.io/latest/docs/ase_userguide
- "CXL: An Open Industry Standard for Cache Coherent Interconnect" — Hot Chips
- Linux `drivers/cxl/` — kernel 6.0+ CXL subsystem
- "Coherent FPGA Accelerators with CXL.cache" — Intel, AMD whitepaper
- PCIe 시리즈 Ch 13 — Confidential I/O와 CXL 미래

## 관련 항목

- [Ch 13: Xilinx XRT 스택](/blog/tools/emulation/qemu-fpga-driver/chapter13-xilinx-xrt)
- [Ch 1: 시리즈 개관](/blog/tools/emulation/qemu-fpga-driver/chapter01-fpga-driver-challenge)
- [PCIe Ch 13: CXL 인접 표준](/blog/embedded/hardware/pcie/)
- [CXL Deep Dive 시리즈](/blog/embedded/hardware/cxl/)
- [QEMU Internals Ch 21: Confidential Computing](/blog/tools/emulation/qemu-internals/chapter21-confidential)
