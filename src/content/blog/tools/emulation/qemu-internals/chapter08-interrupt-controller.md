---
title: "Ch 8: 인터럽트 컨트롤러"
date: 2026-05-17T08:00:00
description: "GIC, APIC 인터럽트 컨트롤러 에뮬레이션을 이해한다."
tags: [QEMU, GIC, APIC, PLIC, Interrupt, MSI]
series: "QEMU Internals"
seriesOrder: 8
draft: true
---

device가 *비동기 이벤트*(DMA 완료·packet 수신·timer expired)를 CPU에 알리는 메커니즘이 **interrupt**입니다. QEMU는 각 architecture의 표준 interrupt controller를 모두 모델링 — ARM **GIC**·x86 **APIC**·RISC-V **PLIC + CLINT**. 새 device를 만들 때 IRQ wiring 방식을 이해해야 합니다.

## Architecture별 IC

| Architecture | Controller |
|--------------|------------|
| **ARM** | GIC v2/v3/v4 (Generic Interrupt Controller) |
| **x86** | LAPIC + IOAPIC (또는 PIC for legacy) |
| **RISC-V** | PLIC (외부) + CLINT (per-HART) |
| **PowerPC** | OpenPIC, MPIC |
| **MIPS** | GIC (different from ARM's) |

`hw/intc/`가 모든 IC 구현. 새 architecture 추가 시 *적합한 IC* 모델 필요.

## QEMU의 IRQ abstraction

QEMU 내부에서는 *architecture-agnostic*한 IRQ object.

```c
qemu_irq irq;
irq = qemu_allocate_irq(handler, opaque, n);

/* device가 IRQ raise */
qemu_set_irq(irq, 1);
qemu_set_irq(irq, 0);
```

`qemu_irq`는 *함수 포인터 + opaque*의 wrapper. IC가 `handler`를 set해 *실 IRQ delivery* 처리.

## SysBus IRQ wiring

대부분의 device는 *SysBus IRQ*로 IC와 연결.

```c
/* device 측 */
sysbus_init_irq(SYS_BUS_DEVICE(s), &s->irq_out);

/* device 안에서 raise */
qemu_set_irq(s->irq_out, 1);

/* machine init 측 — IRQ를 IC에 연결 */
sysbus_connect_irq(SYS_BUS_DEVICE(s), 0,
                   qdev_get_gpio_in(DEVICE(gic), IRQ_NUM));
```

`gic`이 *수신 측*. 32 같은 *interrupt line number*에 device가 *raise* 가능.

## ARM GIC

ARM의 표준 IC. 두 부분으로 분리.

| 부분 | 역할 |
|------|------|
| **Distributor** | 모든 IRQ를 모음, priority·affinity 결정 |
| **Redistributor** (GICv3) | 각 CPU 코어별 인터페이스 |
| **CPU Interface** (GICv2) | CPU와 직접 통신 |

```c
DeviceState *gic = qdev_new("arm-gic");
qdev_prop_set_uint32(gic, "revision", 3);   /* GICv3 */
qdev_prop_set_uint32(gic, "num-cpu", 4);
qdev_prop_set_uint32(gic, "num-irq", 96);
sysbus_realize(SYS_BUS_DEVICE(gic), &error_fatal);
sysbus_mmio_map(SYS_BUS_DEVICE(gic), 0, 0x08000000);   /* distributor */
sysbus_mmio_map(SYS_BUS_DEVICE(gic), 1, 0x080A0000);   /* redistributor */
```

`-M virt`의 `gic-version=3`이 이 모델.

## GIC IRQ 종류

| 종류 | 범위 | 의미 |
|------|------|------|
| **SGI** | 0~15 | Software Generated (inter-CPU) |
| **PPI** | 16~31 | Private Peripheral (per-CPU, timer 등) |
| **SPI** | 32~ | Shared Peripheral (device IRQ) |

device IRQ는 거의 모두 *SPI*. timer는 PPI.

## x86 APIC

`hw/intc/ioapic.c` + `hw/intc/apic.c`.

- **IOAPIC** — 외부 device IRQ aggregate, *system-wide*
- **LAPIC** — 각 CPU 코어별 *local APIC*

```text
device IRQ → IOAPIC → IPI → LAPIC of target CPU → interrupt
```

modern x86은 *MSI/MSI-X 위주*. IOAPIC은 legacy IRQ에 잔존.

## RISC-V PLIC + CLINT

| 컨트롤러 | 역할 |
|----------|------|
| **PLIC** (Platform-Level Interrupt Controller) | 외부 device IRQ → priority → target HART |
| **CLINT** (Core-Local Interruptor) | per-HART soft IRQ + machine timer |

```c
/* PLIC source 등록 */
qdev_get_gpio_in(DEVICE(plic), IRQ_VIRTIO_MMIO);
```

source ID로 *어떤 IRQ인지* 구분. priority register로 *threshold 이상*만 CPU에 전달.

## MSI/MSI-X — message-based IRQ

PCI/PCIe가 *memory write*로 IRQ 발사. 별도 wire 불필요.

```c
/* QOM PCIDevice의 메서드 */
msix_notify(pdev, vector_idx);
```

내부적으로 `vector`에 등록된 *address + data*에 memory write. IOAPIC이나 GIC ITS가 그 write를 *interrupt*로 변환.

## ARM GIC ITS — MSI-X 지원

GIC v3의 **ITS**(Interrupt Translation Service)가 MSI write를 *Linux IRQ로* 변환.

```c
DeviceState *its = qdev_new("arm-gic-its");
sysbus_realize(SYS_BUS_DEVICE(its), &error_fatal);
sysbus_mmio_map(SYS_BUS_DEVICE(its), 0, 0x080C0000);
```

VirtIO-PCI·SR-IOV device의 MSI-X가 모두 ITS를 거침.

## Level vs Edge

```c
qemu_irq_pulse(irq);   /* edge — 한 번 pulse */
qemu_set_irq(irq, 1);  /* level — 1 유지 */
qemu_set_irq(irq, 0);  /* level — 0으로 */
```

| Mode | 의미 |
|------|------|
| Edge | 0→1 transition에 한 번만 trigger |
| Level | 1 유지 동안 *지속* trigger |

PCI INTx는 level, MSI-X는 edge.

## KVM IRQ acceleration

KVM 모드에서 IRQ delivery가 *kernel에서 직접*.

| 기능 | 역할 |
|------|------|
| `irqfd` | eventfd → guest IRQ inject |
| `ioeventfd` | guest MMIO write → eventfd 신호 |
| in-kernel IRQ chip | GIC·APIC을 kernel에 |

`-machine kernel_irqchip=on`이 in-kernel IRQ chip 활성. 대부분 vmexit 없이 IRQ delivery.

## Interrupt remapping

vIOMMU(virtio-iommu·Intel VT-d) 환경에서 *MSI address*가 *iommu group마다* 재매핑. 보안 격리에.

## QEMU 측 IRQ 호출 흐름

```text
1. device가 qemu_set_irq(irq_out, 1) 호출
        │
        ▼
2. qemu_irq의 handler 호출 (IC가 set한 함수)
        │
        ▼
3. IC가 *pending 상태* 갱신
        │
        ▼
4. priority·mask 검사
        │
        ▼
5. KVM_INTERRUPT ioctl (KVM mode) 또는 cpu_interrupt
        │
        ▼
6. guest CPU가 interrupt vector로 분기
```

각 단계가 architecture별 IC에서 *조금씩 다름*.

## Edge/Level 호환성

PCI device를 *MSI-X edge*로 design했는데 *INTx level*과 같은 guest driver를 쓰면 mismatch. driver 등록 시 *trigger type* 명시:

```dts
interrupts = <0 32 IRQ_TYPE_EDGE_RISING>;
/* or */
interrupts = <0 32 IRQ_TYPE_LEVEL_HIGH>;
```

## 흔한 함정

- **IRQ line 충돌** — 두 device가 같은 GIC line. shared IRQ로 동작하지만 distinguishing 어려움.
- **MSI-X vector 부족** — guest가 N vector 요청, device가 M만 제공. 일부만 동작.
- **edge에 level 가정** — driver가 *clear pending* 안 함. IRQ re-trigger 안 됨.
- **in-kernel irqchip + user device** — KVM kernel chip은 *일부* device만 alloc. userspace device가 같은 IRQ 못 받을 수 있음.

## 정리

- QEMU IRQ는 *architecture-agnostic* `qemu_irq` abstraction.
- 각 architecture별 IC: **ARM GIC** (Distributor + Redistributor + ITS), **x86 APIC** (LAPIC + IOAPIC), **RISC-V PLIC + CLINT**.
- SysBus IRQ wiring으로 device → IC 연결. `sysbus_init_irq` + `sysbus_connect_irq`.
- **MSI/MSI-X**가 modern device의 표준 — memory write로 IRQ.
- Edge vs Level — PCI INTx level, MSI-X edge.
- KVM `irqfd`·`ioeventfd`·in-kernel IRQ chip으로 KVM 가속.
- ARM GIC v3의 ITS가 MSI를 Linux IRQ로 변환.

## 다음 장 예고

다음 장은 *시간 관리* — **timer + clock**. virtual time과 real time의 분리, icount의 결정론.

## 관련 항목

- [Ch 7: PCI 서브시스템](/blog/tools/emulation/qemu-internals/chapter07-pci-subsystem)
- [Ch 9: 타이머와 클럭](/blog/tools/emulation/qemu-internals/chapter09-timers)
- [Ch 14: KVM Accel](/blog/tools/emulation/qemu-internals/chapter14-kvm-accel)
- [QEMU Fake Device — Interrupts](/blog/tools/emulation/qemu-fake-device/chapter06-interrupts)
