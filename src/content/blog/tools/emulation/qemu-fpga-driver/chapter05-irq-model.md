---
title: "Ch 5: FPGA 인터럽트 모델"
date: 2026-05-17T05:00:00
description: "MSI-X·user IRQ multiplexing — FPGA의 IRQ 토폴로지."
tags: [QEMU, msi-x, fpga, user-irq]
series: "FPGA Driver via QEMU+VFIO"
seriesOrder: 5
draft: true
---

FPGA는 *수십에서 수천 개*의 IRQ source를 가질 수 있습니다. DMA 채널 완료·user logic 이벤트·error condition 등. **MSI-X**는 이를 vector 단위로 분리해 driver가 깔끔하게 처리하게 해 줍니다. 이 장은 fake-fpga에 MSI-X 모델·user IRQ multiplexing·polling fallback을 차례로 더합니다.

## IRQ delivery 방법 비교

PCI device가 IRQ를 host로 보내는 세 방식.

| 방식 | vector 수 | 적합도 |
|------|-----------|--------|
| Legacy INTx | 1 line shared | FPGA에 부적합 (한 line으로는 부족) |
| MSI | 최대 32 vector, contiguous | 마이크로컨트롤러용 |
| **MSI-X** | 최대 2048 vector, per-IRQ table | **FPGA의 표준** |

MSI-X의 결정적 장점: vector마다 *별도의 address/data*를 가짐. 같은 PCI device의 IRQ를 *vector마다 다른 CPU 코어*에 라우팅할 수 있습니다.

## FPGA의 전형적 IRQ source

| Source | 빈도 | 의미 |
|--------|------|------|
| DMA 채널 완료 | 채널당 IRQ | descriptor batch 완료 |
| User logic 이벤트 | 알고리즘별 | 작업 완료, error, threshold 도달 |
| Error condition | rare | UE, parity, timeout |
| Management | rare | thermal, power, FME |

전체 IRQ source는 *수십에서 수천*. 모두에 MSI-X vector를 하나씩 줄 수 없으므로 *multiplexing*이 필요합니다.

## MSI-X 초기화 (QEMU)

```c
static void fake_fpga_realize(PCIDevice *pdev, Error **errp) {
    /* ... BAR 등록 ... */

    /* MSI-X 8 vector, BAR3을 MSI-X table용으로 */
    msix_init_exclusive_bar(pdev, 8, 3, errp);
}
```

`msix_init_exclusive_bar(pdev, nvectors, bar, errp)`:
- `nvectors=8` — 사용할 vector 수
- `bar=3` — MSI-X table이 들어갈 BAR

device가 IRQ를 발사하려면:

```c
msix_notify(&s->parent, vector_idx);
```

QEMU는 MSI-X vector에 등록된 (address, data)를 *host CPU의 LAPIC*에 전달합니다. KVM 가속 모드에서는 KVM이 *직접* eventfd로 처리해 vmexit 없이 IRQ가 도달합니다.

## User IRQ multiplexing

수십~수천 user IRQ source를 *적은* MSI-X vector로 묶는 패턴. 예를 들어 32개 source를 8개 vector로 4:1 묶음.

```c
typedef struct FakeFPGA {
    /* ... */
    uint32_t user_irq_pending[8];   /* vector 별 pending bits */
    uint32_t user_irq_mask[8];      /* mask */
} FakeFPGA;

/* user logic이 source를 raise할 때 */
static void fpga_user_irq_raise(FakeFPGA *s, int source_id) {
    /* 32 source → 8 vector, 4:1 multiplex */
    int vector = source_id / 4;
    int bit = source_id % 4;

    s->user_irq_pending[vector] |= (1u << bit);

    /* 해당 source가 mask 안 되어 있으면 vector raise */
    if (!(s->user_irq_mask[vector] & (1u << bit))) {
        msix_notify(&s->parent, vector);
    }
}
```

driver는 IRQ handler 안에서 *어떤 source*가 pending인지 register로 확인합니다.

```c
static void fpga_user_irq_clear(struct my_fpga *f, int vector, u32 mask) {
    writel(mask, f->shell_mmio + USER_IRQ_PENDING(vector));
}
```

W1C(Write-1-to-Clear) semantics — bit `1`을 쓰면 *그 bit만* clear되고 다른 bit는 영향 없음.

## Edge vs level

MSI-X는 *edge-triggered*입니다. 즉 *상승 edge*에서 한 번만 IRQ. driver가 처리하지 않으면 *재발생*하지 않습니다.

이 때문에 *latch + clear* 패턴이 필요합니다.

1. user logic이 event 발생 → `pending` register에 bit set + MSI-X notify
2. driver의 IRQ handler가 `pending` register 읽음
3. driver가 `pending` register에 *같은 bit*를 W1C로 clear
4. user logic은 *다음* event 시 다시 set + notify

level-triggered였다면 `pending` register가 set인 동안 IRQ가 *계속* 발생해 polling-like 동작이 가능하겠지만, MSI-X에서는 안 됩니다.

## Driver — MSI-X 등록과 threaded handler

```c
static int my_fpga_setup_irq(struct my_fpga *f) {
    int n = pci_alloc_irq_vectors(f->pdev, 8, 8, PCI_IRQ_MSIX);
    if (n < 8) {
        dev_err(&f->pdev->dev, "MSI-X allocation failed: %d", n);
        return -ENOSPC;
    }

    for (int v = 0; v < n; v++) {
        int irq = pci_irq_vector(f->pdev, v);
        f->vec[v].fpga = f;
        f->vec[v].idx = v;
        int ret = request_threaded_irq(irq,
                                        fpga_hard_irq,        /* hard (fast) */
                                        fpga_threaded_irq,    /* thread (slow) */
                                        IRQF_SHARED, "my-fpga",
                                        &f->vec[v]);
        if (ret) return ret;
    }
    return 0;
}
```

`request_threaded_irq`는 IRQ를 *두 단계*로 처리합니다.

- **Hard handler** — IRQ context, 빠르게 끝나야 함. pending bit clear + thread 깨우기.
- **Threaded handler** — thread context, sleep 가능. heavy work 수행.

```c
static irqreturn_t fpga_hard_irq(int irq, void *dev_id) {
    struct vec_data *v = dev_id;
    u32 pending = readl(v->fpga->shell_mmio + USER_IRQ_PENDING(v->idx));
    if (!pending) return IRQ_NONE;

    writel(pending, v->fpga->shell_mmio + USER_IRQ_PENDING(v->idx));  /* W1C */
    v->pending = pending;
    return IRQ_WAKE_THREAD;
}

static irqreturn_t fpga_threaded_irq(int irq, void *dev_id) {
    struct vec_data *v = dev_id;
    process_user_event(v->fpga, v->pending);   /* heavy work */
    return IRQ_HANDLED;
}
```

## Latency budget

IRQ 처리 시간 분배 기준.

| 단계 | 권장 latency | 이유 |
|------|--------------|------|
| Hard handler | < 10µs | scheduler latency, 다른 IRQ 막힘 방지 |
| Threaded handler | 수 ms 가능 | sleep, mutex, GFP_KERNEL alloc 자유 |
| Polling | 0(IRQ 비활성) | high-rate 시 IRQ overhead 제거 |

NPU 같은 high-throughput device에서는 *IRQ rate > 100k/s*가 되기 쉽고, 그 경우 IRQ disable + NAPI 스타일 polling이 더 효율적입니다.

## Polling fallback

```c
static void fpga_poll(struct my_fpga *f) {
    /* IRQ disable */
    writel(0, f->shell_mmio + IRQ_GLOBAL_ENABLE);

    /* spin loop with cpu_relax */
    while (!kthread_should_stop()) {
        u32 pending = readl(f->shell_mmio + USER_IRQ_PENDING(0));
        if (pending) {
            writel(pending, f->shell_mmio + USER_IRQ_PENDING(0));
            process_user_event(f, pending);
        } else {
            cpu_relax();
        }
    }

    /* IRQ 재활성 */
    writel(1, f->shell_mmio + IRQ_GLOBAL_ENABLE);
}
```

driver는 *IRQ rate 측정*해서 임계값을 넘으면 자동으로 polling으로 전환할 수도 있습니다 — NIC의 NAPI가 같은 패턴.

## 사용 패턴

| 도메인 | 추천 |
|--------|------|
| NPU per-job IRQ | threaded IRQ (큰 작업, 낮은 빈도) |
| smartNIC per-queue | NAPI polling (높은 packet rate) |
| HFT low latency | polling only (IRQ overhead 회피) |
| Management events | threaded IRQ (sleeping 가능) |

## 정리

- FPGA의 IRQ source는 *수십~수천* — MSI-X로 vector 단위 분리.
- MSI-X는 **edge-triggered** — *latch + clear*(`pending` register W1C) 패턴 필수.
- **User IRQ multiplexing**으로 많은 source를 적은 vector에 묶음. 16:1, 32:1 흔함.
- driver: `pci_alloc_irq_vectors` + `request_threaded_irq`. hard에서 clear, thread에서 work.
- Hard handler < 10µs. Heavy work는 thread / tasklet / workqueue로.
- High-rate(>100k/s)는 polling fallback. NAPI 스타일 IRQ disable + spin.
- NPU·smartNIC·HFT가 IRQ rate에 따라 다른 패턴을 씀.

## 다음 장 예고

다음 장은 *DMA descriptor ring* — NIC·NVMe·NPU가 공통으로 쓰는 *production 패턴*입니다. SG, bidirectional, completion ring, zero-copy까지 한 번에.

## 관련 항목

- [Ch 4: AXI ↔ PCIe Bridge](/blog/tools/emulation/qemu-fpga-driver/chapter04-axi-pcie-bridge)
- [Ch 6: DMA Descriptor Ring](/blog/tools/emulation/qemu-fpga-driver/chapter06-dma-descriptor-ring)
- [QEMU Fake Device — IRQs](/blog/tools/emulation/qemu-fake-device/chapter06-interrupts)
- [Driver-RTL Co-simulation — BFM](/blog/tools/emulation/driver-cosim/chapter06-bfm)
