---
title: "Ch 14: CXL.cache·CCI-P — FPGA Host-Coherent"
date: 2026-05-17T14:00:00
description: "FPGA가 host CPU cache에 직접 — coherent accelerator."
tags: [QEMU, cxl-cache, cci-p, coherent-fpga, npu]
series: "FPGA Driver via QEMU+VFIO"
seriesOrder: 14
draft: true
---

시리즈의 마지막 장입니다. 지금까지 다룬 DMA descriptor ring·SR-IOV·passthrough가 *현재*라면, 이 장은 *미래*를 봅니다 — FPGA가 host CPU cache에 *직접* 참여하는 **CXL.cache** 시대. DMA가 *사라지고* load/store 한 줄이 cache-line 단위로 *snoop* 따라가는 패러다임.

## DMA의 한계

descriptor ring은 강력하지만 *page 단위 transfer*가 단위입니다.

- *Pointer chasing*(graph, tree traversal) — 노드 하나 읽으려 매번 page를 옮겨야 함
- *Fine-grained sync* — producer/consumer queue가 *몇 바이트* 단위로 업데이트
- *Shared data structure* — FPGA와 CPU가 같은 lock-free queue를 보고 싶을 때
- *Sparse access* — 큰 buffer에서 *작은 부분*만 읽기

이 시나리오들에서 DMA는 *round-trip 비용*이 폭증합니다. cache-line(64B) 단위로 *직접* 접근할 방법이 필요합니다.

## Coherent accelerator의 의미

| 항목 | DMA accelerator | Coherent accelerator |
|------|------------------|------------------------|
| 단위 | descriptor batch | cache-line(64B) load/store |
| Granularity | page (4KB+) | byte~ |
| Sync | IRQ/CR polling | snoop 자동 |
| Cache | driver가 flush 필요 | hardware 자동 |
| Address | IOVA | virtual addr 직접 |
| Latency | 수 µs | 수십 ns |

Coherent accelerator는 *FPGA가 CPU에 가까워지는* 방향. NPU와 FPGA 사이 경계가 흐려집니다.

## 역사 — CCI-P → CXL.cache

Coherent FPGA의 두 세대.

### Intel CCI-P (legacy)

**CCI-P**(Cache-Coherent Interconnect for Performance)는 Intel의 *내부 protocol*이었습니다.

- Intel HARP(Hardware Accelerator Research Program) 시절
- Skylake-SP가 *FPGA를 같은 package에* 통합한 시제품
- Intel PAC FPGA가 채택
- *Intel CPU* 전용

CCI-P는 *벤더 락인*이 강해 산업 표준에 자리잡지 못했습니다. 그러나 *coherent accelerator의 개념*을 산업에 도입한 첫 시도.

### CXL.cache (modern, 2019~)

**CXL**(Compute Express Link)이 그 자리를 *open standard*로 이어받았습니다.

- PCIe 5.0+ 위의 새 protocol
- CXL 3.x = PCIe 6.0 기반
- vendor-neutral — Intel·AMD·NVIDIA·Samsung·Microchip·... 모두 참여
- **CXL.io** — 기본 PCIe 호환 (config·driver)
- **CXL.cache** — accelerator → host memory 캐싱
- **CXL.mem** — host → accelerator memory 캐싱

이 세 protocol을 같이 쓰는 device가 **CXL Type 2** — coherent accelerator의 표준 카테고리입니다.

## Type 1 / 2 / 3 분류

| Type | Protocol | 예 |
|------|----------|-----|
| **Type 1** | CXL.io + CXL.cache | coherent NIC(`accelerator-only`) |
| **Type 2** | CXL.io + CXL.cache + CXL.mem | FPGA, GPU(coherent) |
| **Type 3** | CXL.io + CXL.mem | memory expansion card |

FPGA가 *coherent accelerator*로 사용되면 거의 항상 Type 2.

## Bias mode — ownership 관리

Type 2 device는 *자기 메모리*(HBM·DDR)를 가지고 있는데, 그 메모리에 *host*도 접근하고 *device*도 접근합니다. 두 접근의 ownership을 효율화하기 위해 *bias mode*가 도입됐습니다.

| Mode | 의미 |
|------|------|
| **Host bias** | host가 자주 접근 — host cache에 데이터 머무름 |
| **Device bias** | device가 자주 접근 — device cache에 머무름 |

ownership 전환은 *명시적*(driver/runtime이 hint) 또는 *자동*. 잦은 전환은 성능 저하 — 따라서 *workload pattern*에 맞춰 bias를 고정하는 게 중요합니다.

## Driver impact — 무엇이 사라지나

CXL.cache 시대의 driver는 *놀랍게 단순*해집니다.

- **DMA descriptor 불필요** — coherent_alloc 후 *주소만* 전달
- **Cache flush 불필요** — hardware 자동
- **IRQ 빈도 감소** — completion이 cache snoop으로 자연 감지
- **Lock-free queue 가능** — FPGA ↔ CPU 사이

```c
/* CXL.cache 시대의 driver — DMA descriptor 없음 */
static int my_fpga_compute_coherent(struct my_fpga *f,
                                     void *input, size_t in_len,
                                     void *output, size_t out_len) {
    /* coherent_alloc — kernel virtual addr (cache-coherent) */
    void *in_buf  = kmalloc(in_len, GFP_KERNEL);
    void *out_buf = kmalloc(out_len, GFP_KERNEL);

    memcpy(in_buf, input, in_len);

    /* FPGA에 *주소만* 전달 */
    writeq((u64)virt_to_phys(in_buf),  f->user_mmio + USER_INPUT_PTR);
    writeq((u64)virt_to_phys(out_buf), f->user_mmio + USER_OUTPUT_PTR);
    writel(out_len, f->user_mmio + USER_OUTPUT_LEN);
    writel(1,       f->user_mmio + USER_START);

    /* FPGA가 직접 load/store — cache 자동 sync */
    wait_for_completion(&f->done);

    /* cache flush 불필요 — coherent */
    memcpy(output, out_buf, out_len);
    kfree(in_buf);
    kfree(out_buf);
    return 0;
}
```

descriptor·SG·doorbell·completion ring이 *모두 사라졌습니다*. driver가 *application code*에 가깝게 되었습니다.

## Lock-free queue — FPGA와 CPU 공유

```c
struct shared_queue {
    atomic_t head;   /* CPU produces */
    atomic_t tail;   /* FPGA consumes */
    char data[1024][64];
};

/* CPU side */
void push(struct shared_queue *q, const char *data) {
    int h = atomic_read(&q->head);
    int next = (h + 1) % 1024;
    while (next == atomic_read(&q->tail)) cpu_relax();   /* full */
    memcpy(q->data[h], data, 64);
    atomic_set(&q->head, next);
    /* FPGA가 즉시 본다 (cache coherent) */
}
```

FPGA 측(HLS pseudo-code):

```text
while (1) {
    int t = atomic_load(&q->tail);
    while (t == atomic_load(&q->head)) yield();    /* empty */
    process(q->data[t]);
    atomic_store(&q->tail, (t + 1) % 1024);
}
```

이런 *producer/consumer*가 lock 없이 동작합니다. CPU와 FPGA 사이의 *공유 메모리 자료구조*가 *DDR 단일 메모리*만큼 자연스러워집니다.

## NPU 컴파일러 영향

TVM·MLIR·XLA 같은 ML 컴파일러는 *DMA-centric memory model*을 가정합니다. CXL.cache가 들어오면:

- *coherent buffer* 가정으로 *연산 그래프 변환* 단순화
- inter-kernel data passing이 *descriptor 없이* 직접
- *partial output*을 CPU가 즉시 inspect 가능
- pipelining이 cache-line granularity로

NPU 컴파일러 backend가 *CXL.cache 인지*가 되면 같은 모델이 더 효율적으로 실행됩니다.

## Linux CXL subsystem

Linux 6.0+에서 `drivers/cxl/`로 추가되어 발전 중. CXL Type 2 device 확인:

```bash
lspci -vv | grep -A 20 "CXL"
# Capability: ... CXL3
# .io enabled, .cache enabled, .mem enabled

cat /sys/bus/cxl/devices/.../type
# 2

cxl list -d
```

driver는 `cxl_dev_*` API로 device 자원에 접근. 표준화 진행 중이라 API가 *kernel 버전마다* 진화합니다.

## 산업 동향

CXL coherent FPGA의 산업 채택.

| 회사 | 제품 |
|------|------|
| Intel | Agilex with CXL.cache (제품화 진행) |
| AMD/Xilinx | Versal CXL prototype |
| Samsung | CXL memory + accelerator 제품 |
| Microchip | XpressLink CXL 컨트롤러 |
| NPU 회사 | Tenstorrent·Tachyum 등 CXL-aware NPU 발표 |

2024~2025년에 본격 양산이 시작되어, 2026~2027년에는 datacenter에 흔히 보일 전망.

## 시리즈 종합 정리

지금까지의 14장이 그린 *4-step 워크플로*를 한 번 더 보면:

| Step | 장 | 기술 | 의미 |
|------|----|------|------|
| 1. Driver dev | Ch 3~8 | QEMU fake FPGA | 보드 없이 시작 |
| 2. Passthrough | Ch 9~10 | VFIO-PCI | 실 보드에 같은 driver |
| 3. Sharing | Ch 11 | SR-IOV·mdev | multi-tenant |
| 4. Coherent | Ch 14 | CXL.cache | descriptor 없는 미래 |

각 단계가 *이전 단계의 driver 코드를 재활용*하면서 *기능을 확장*합니다. 이 *연속성*이 시리즈의 핵심 가치입니다.

## FPGA driver의 다음 10년

전망 정리.

- **CXL.cache + CXL.mem**이 *기본 인터페이스*가 됨. PCIe는 *호환성*용으로 잔존.
- *DMA driver*는 *legacy*. 새 driver는 coherent 첫.
- **CXL switching·memory pooling**으로 datacenter 단위 자원 재구성.
- *NPU·GPU·FPGA의 경계*가 흐려짐 — 모두 coherent accelerator.
- *Compute Express Link* 라는 이름의 의미가 *Compute*로 강해짐.

이 흐름을 *준비*하는 것이 지금 driver 개발자의 일입니다. 새 system은 처음부터 coherent를 *가정*하고 설계해야 *5년 뒤 retrofit 비용*을 피할 수 있습니다.

## 흔한 함정

- **Type 2 device를 PCIe-only로 사용** — CXL.cache 활성화 안 됨. `lspci -vv`로 capability 확인.
- **Bias mode 잘못된 설정** — host bias로 device-heavy workload 돌리면 cache thrash.
- **Lock-free queue의 ordering** — `atomic_store`만으로 부족. 명시적 memory barrier 필요.
- **CXL kernel 버전 의존** — API가 빠르게 진화. LTS 또는 vendor BSP 따라가기.

## 정리

- DMA는 *coarse-grained*. CXL.cache는 *cache-line 단위* 직접 접근.
- Coherent accelerator는 *pointer chasing·fine sync·shared structure·sparse access*에서 압도적.
- CXL의 셋(`.io`·`.cache`·`.mem`) — Type 2 device가 셋 다 사용. FPGA의 표준.
- **Bias mode**(host bias / device bias)로 ownership 효율화.
- Driver impact: *DMA descriptor·cache flush·IRQ·SG 모두 사라짐*. application code에 가까워짐.
- Lock-free queue가 *CPU↔FPGA*에서 자연스러움. NPU 컴파일러가 직접 활용 가능.
- Linux `drivers/cxl/` subsystem이 진화 중. 2024~2025 production 시작 전망.
- 시리즈 4-step(fake → VFIO → SR-IOV → CXL) 완성. FPGA driver의 다음 10년은 coherent.

## 시리즈 마무리

14장에 걸쳐 *fake → passthrough → SR-IOV → CXL*를 따라왔습니다. 어휘를 다 정리한 뒤 이제 자기 시스템에 적용할 차례입니다.

- *내 NPU prototype*은 fake FPGA에서 시작할 수 있습니다 — 보드 없이.
- *실 보드 도착*하면 VFIO로 *driver 무수정* 이전.
- *Cloud 제공*은 SR-IOV로 multi-tenant.
- *다음 칩*은 CXL.cache 가정으로 설계.

한국어로 이 흐름을 한 자리에 모은 *첫* 시리즈입니다. 동료·후배·자기 학습용 자료로 자유롭게 활용해 주세요.

## 관련 항목

- [Ch 13: Xilinx XRT 스택](/blog/tools/emulation/qemu-fpga-driver/chapter13-xilinx-xrt)
- [Ch 1: FPGA Driver 개발의 과제](/blog/tools/emulation/qemu-fpga-driver/chapter01-fpga-driver-challenge) — 시리즈 다시 보기

## 관련 시리즈

- [CXL 4.0 Spec Full Review](/blog/embedded/hardware/cxl-spec/chapter01-overview) — CXL spec 상세
- [CXL 심화](/blog/embedded/hardware/cxl/chapter01-overview)
- [PCIe Deep Dive](/blog/embedded/hardware/pcie/chapter01-overview)
- [QEMU Internals — Confidential](/blog/tools/emulation/qemu-internals/chapter21-confidential)
- [Driver-RTL Co-simulation](/blog/tools/emulation/driver-cosim/chapter01-why-cosim) — pre-silicon 검증

## 참고 자료

- CXL 3.1 Specification — computeexpresslink.org
- Linux `drivers/cxl/`
- "Coherent FPGA Accelerators with CXL.cache" — Intel, AMD whitepaper
- "CXL: An Open Industry Standard for Cache Coherent Interconnect" — Hot Chips
