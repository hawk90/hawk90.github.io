---
title: "Ch 6: 인터럽트 (MSI/MSI-X) 구현"
date: 2026-05-17T06:00:00
description: "PCI 디바이스에서 MSI/MSI-X 인터럽트를 구현한다."
tags: [QEMU, MSI, Interrupt, MSI-X, irqfd]
series: "QEMU Fake Device Driver"
seriesOrder: 6
draft: true
---

device가 *완료 알림*을 driver에 보내는 메커니즘이 **interrupt**입니다. 현대 PCI device는 거의 모두 **MSI-X**(Message Signaled Interrupts) 사용. 이 장은 fake-pci에 MSI-X를 추가해 *비동기 알림*을 구현합니다.

## MSI-X — 왜

| 방식 | vector 수 | 적합도 |
|------|-----------|--------|
| Legacy INTx | 1 line shared | x86 ISA, 옛 PCI |
| MSI | 최대 32, contiguous | basic |
| **MSI-X** | 최대 2048, per-vector | **표준** |

MSI-X의 결정적 장점: vector마다 *별도 (address, data)* — guest의 *다른 CPU core*에 라우팅 가능. NIC·NVMe의 multi-queue 핵심.

## QEMU 측 MSI-X 활성

```c
#include "hw/pci/msix.h"

#define MSIX_VECTORS  8

static void my_pci_realize(PCIDevice *pdev, Error **errp) {
    MyPCIState *s = MY_PCI(pdev);

    /* BAR0 — MMIO (Ch 5) */
    memory_region_init_io(&s->mmio, OBJECT(s), &my_mmio_ops, s,
                          "my-pci-mmio", 0x1000);
    pci_register_bar(pdev, 0, PCI_BASE_ADDRESS_SPACE_MEMORY, &s->mmio);

    /* BAR1 — MSI-X table용 */
    int ret = msix_init_exclusive_bar(pdev, MSIX_VECTORS, 1, errp);
    if (ret < 0) {
        return;
    }

    /* 각 vector use */
    for (int i = 0; i < MSIX_VECTORS; i++) {
        msix_vector_use(pdev, i);
    }
}
```

`msix_init_exclusive_bar(pdev, nvectors, bar, errp)`로 MSI-X table을 *BAR1에 통째로*. BAR1은 *MSI-X 전용*.

## IRQ 발사

```c
static void process_request(MyPCIState *s) {
    if (!(s->ctrl & CTRL_ENABLE)) return;

    s->data_out = bswap32(s->data_in);
    s->intr_status |= INTR_DONE;

    /* mask가 풀려 있으면 IRQ */
    if (!(s->intr_mask & INTR_DONE)) {
        msix_notify(&s->parent_obj, 0);   /* vector 0 */
    }
}
```

`msix_notify(pdev, vector)`가 *guest의 LAPIC*에 *MSI-X message* write. KVM 가속 시 *kernel이 직접* IRQ inject — vmexit 없음.

## Vector multiplexing

device가 *수십 IRQ source*를 *8 vector*로 묶기.

```c
typedef enum {
    INTR_DONE       = (1 << 0),
    INTR_ERROR      = (1 << 1),
    INTR_QUEUE_EMPTY = (1 << 2),
    INTR_PERF_OVF   = (1 << 3),
    /* ... 32 source */
} InterruptSource;

#define IRQ_GROUPS 8

static int source_to_vector(int source) {
    return source / 4;   /* 32 source → 8 vector, 4:1 multiplex */
}

static void raise_irq(MyPCIState *s, int source) {
    int vec = source_to_vector(source);
    s->intr_status_per_vec[vec] |= (1 << (source % 4));

    if (!(s->intr_mask_per_vec[vec] & (1 << (source % 4)))) {
        msix_notify(&s->parent_obj, vec);
    }
}
```

driver는 *vector handler*에서 `INTR_STATUS_PER_VEC[vec]`를 읽어 *어느 source*인지 확인.

## Edge-triggered semantics

MSI-X는 *edge*. *raise/clear cycle*이 필요.

```c
/* device: 발사 */
s->intr_status |= INTR_DONE;
msix_notify(pdev, vec);

/* driver의 ISR: */
u32 pending = readl(mmio + REG_INTR_STATUS);
writel(pending, mmio + REG_INTR_STATUS);   /* W1C로 clear */
/* 처리 */

/* device: 다음 event 시 다시 set + notify */
```

driver가 clear 안 하면 *그 bit가 영원히 1*. device의 *다음 set + notify*가 *edge로 인식 안 됨*.

## guest 인식 확인

```bash
guest$ lspci -vvv -s 00:04.0
00:04.0 ... [1234:5678]
    Capabilities: [50] MSI-X: Enable+ Count=8 Masked-
        Vector table: BAR=1 offset=00000000
        PBA: BAR=1 offset=00000800
```

MSI-X capability + 8 vector 등록 확인.

## driver 측 — vector 할당

```c
static int my_setup_irq(struct my_dev *d) {
    int n = pci_alloc_irq_vectors(d->pdev,
                                   MSIX_VECTORS,        /* min */
                                   MSIX_VECTORS,        /* max */
                                   PCI_IRQ_MSIX);
    if (n < MSIX_VECTORS) {
        return -ENOSPC;
    }

    for (int v = 0; v < n; v++) {
        int irq = pci_irq_vector(d->pdev, v);
        int ret = request_threaded_irq(irq,
                                        my_hard_irq, my_threaded_irq,
                                        IRQF_SHARED, "my-dev", &d->vec[v]);
        if (ret) return ret;
    }
    return 0;
}

static irqreturn_t my_hard_irq(int irq, void *dev_id) {
    struct vec_data *vd = dev_id;
    u32 pending = readl(vd->dev->mmio + REG_INTR_STATUS(vd->idx));
    if (!pending) return IRQ_NONE;

    writel(pending, vd->dev->mmio + REG_INTR_STATUS(vd->idx));
    vd->pending = pending;
    return IRQ_WAKE_THREAD;
}

static irqreturn_t my_threaded_irq(int irq, void *dev_id) {
    struct vec_data *vd = dev_id;
    process_event(vd->dev, vd->pending);
    return IRQ_HANDLED;
}
```

*hard handler*(빠른 clear) + *threaded handler*(heavy work) 패턴.

## irqfd 가속

KVM 환경에서 *MSI-X notify*가 *kernel에서 직접* guest로 inject.

```text
1. device → msix_notify
2. QEMU → kvm_irqchip_send_msi (정상 path)
   또는
2'. (irqfd 활성 시) eventfd → KVM → guest IRQ vector (vmexit 없음)
```

QEMU가 자동으로 irqfd 사용. 별도 설정 불필요. 결과: IRQ latency *수 µs → 수십 ns*.

## INTx (legacy) 지원

old guest는 MSI-X 미지원. INTx fallback.

```c
static void my_pci_class_init(...) {
    PCIDeviceClass *k = PCI_DEVICE_CLASS(klass);
    /* ... */
    /* config space의 interrupt_pin */
    k->interrupt_pin = 1;   /* INTA */
}

/* IRQ 발사 시 — MSI-X 비활성이면 INTx */
static void raise_irq(MyPCIState *s, int vec) {
    if (msix_enabled(&s->parent_obj)) {
        msix_notify(&s->parent_obj, vec);
    } else {
        pci_set_irq(&s->parent_obj, 1);   /* INTx */
    }
}

static void clear_intx(MyPCIState *s) {
    pci_set_irq(&s->parent_obj, 0);
}
```

INTx는 *level-triggered* — register clear + line lower.

## VirtIO와 비교

VirtIO도 MSI-X 사용. 다만 *vring 기반*이라 *direct queue*에 vector 묶음.

```c
/* VirtIO 측 */
virtio_pci_set_guest_notifier(...);
```

custom PCI는 *register-driven*, VirtIO는 *queue-driven*. 둘 다 MSI-X 위에서.

## vmstate에 MSI-X 추가

```c
static const VMStateDescription vmstate_my_pci = {
    /* ... */
    .fields = (VMStateField[]) {
        VMSTATE_PCI_DEVICE(parent_obj, MyPCIState),
        VMSTATE_MSIX(parent_obj, MyPCIState),   /* MSI-X state 보존 */
        /* register state */
        VMSTATE_UINT32(ctrl, MyPCIState),
        /* ... */
        VMSTATE_END_OF_LIST()
    }
};
```

migration 후 *MSI-X mapping*도 복원.

## Test — 간단한 trigger

```c
/* guest driver */
int main(void) {
    void __iomem *mmio = pci_iomap(pdev, 0, 0);

    /* enable + IRQ unmask */
    writel(CTRL_ENABLE, mmio + REG_CTRL);
    writel(0, mmio + REG_INTR_MASK);

    /* IRQ 등록 */
    request_threaded_irq(...);

    /* trigger */
    writel(0x12345678, mmio + REG_DATA_IN);
    writel(1, mmio + REG_GO);   /* doorbell */

    /* IRQ handler가 동작해야 함 */
    wait_for_completion(&done);
}
```

## QMP — IRQ injection from monitor

```text
(qemu) info pic
(qemu) qom-set /machine/peripheral-anon/device[0] inject_irq 1
```

QMP 명령으로 *test 목적의 IRQ injection*. fault injection 시나리오에 유용.

## 흔한 함정

- **msix_vector_use 누락** — vector가 *unused* 상태. `msix_notify` 동작 안 함.
- **mask 안 푼 상태** — `INTR_MASK`에 *모두 1*이면 IRQ 안 옴. driver가 unmask해야.
- **W1C 잘못** — `intr_status |= clear_val`이 *bit set*이 되어 영원히 IRQ.
- **INTx + MSI-X 동시 활성** — spec 위반. 한쪽만.

## 정리

- **MSI-X**가 modern PCI device의 표준 IRQ. 최대 2048 vector.
- `msix_init_exclusive_bar`(BAR 통째로 MSI-X table) + `msix_vector_use`로 vector 활성.
- IRQ 발사: `msix_notify(pdev, vector)`. KVM irqfd로 vmexit 없는 fast path.
- **Edge-triggered**: device의 set → driver의 W1C clear cycle.
- Multi-vector multiplexing으로 *수십 source → 적은 vector* 매핑.
- INTx fallback도 가능 — `pci_set_irq(pdev, 1/0)`.
- `vmstate`에 `VMSTATE_MSIX`로 migration 호환.
- driver: `pci_alloc_irq_vectors` + `request_threaded_irq`.

## 다음 장 예고

다음 장은 *대용량 데이터 이동* — **DMA**. host RAM과 device 사이 buffer 전송.

## 관련 항목

- [Ch 5: MMIO 레지스터](/blog/tools/emulation/qemu-fake-device/chapter05-mmio-registers)
- [Ch 7: DMA 구현](/blog/tools/emulation/qemu-fake-device/chapter07-dma)
- [Ch 14: Scatter-Gather DMA](/blog/tools/emulation/qemu-fake-device/chapter14-scatter-gather-dma)
- [QEMU Internals — Interrupt Controller](/blog/tools/emulation/qemu-internals/chapter08-interrupt-controller)
