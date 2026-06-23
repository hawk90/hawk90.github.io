---
title: "Ch 5: Interrupts — INTx·MSI·MSI-X·Interrupt Remapping"
date: 2026-05-19T09:05:00
description: "PCIe 인터럽트 메커니즘 3가지 — Legacy INTx·MSI 32 vector·MSI-X 2048 vector·IOMMU Interrupt Remapping."
series: "PCIe Deep Dive"
seriesOrder: 5
tags: [pcie, interrupts, msi, msi-x, intx, interrupt-remapping]
draft: false
---

## 한 줄 요약

> **"PCIe 인터럽트는 *INTx (legacy, virtual wire) → MSI (32 vector) → MSI-X (2048 vector)*로 진화했습니다."** — INTx는 *Assert/Deassert Message*로 *PCI 4-wire를 simulate*. MSI는 *single address+data write*, MSI-X는 *per-vector table + Pending Bit Array*. *IOMMU Interrupt Remapping*이 *virtualization 시 redirection*. NVMe·100 GbE는 *MSI-X 거의 필수*.

[Ch 2 TLP](/blog/embedded/hardware/pcie/chapter02-tlp)에서 *Message TLP*가 *implicit routing*임을 봤습니다. *INTx Message*가 그 한 종류. 이 장은 *3가지 인터럽트 메커니즘*과 *driver·OS 통합*을 본격적으로 분해합니다.

## INTx — Legacy Virtual Wire

원본 PCI는 *4 wire (INTA·INTB·INTC·INTD)*로 인터럽트. PCIe는 *wire 없음* → *INTx Message로 simulate*:

| Message | 동작 |
|---------|------|
| Assert_INTA·B·C·D | wire가 *low로 가는 것* simulate |
| Deassert_INTA·B·C·D | wire가 *high로 돌아옴* simulate |

*level-triggered semantics*. *shared interrupt 가능* — 여러 device가 *같은 INTA* 사용 시 *driver가 polling으로 source 식별*. *overhead 큼*.

*UEFI BIOS·legacy OS 호환*용. 현대 driver는 *MSI/MSI-X 우선*.

## MSI — Message Signaled Interrupt

*MSI Capability (ID 0x05)*가 *interrupt를 memory write로 전달*:

| 필드 | 의미 |
|------|------|
| Message Address | 인터럽트 message 보낼 *MMIO 주소* (CPU APIC) |
| Message Data | 보낼 *데이터* (vector·trigger 정보) |
| Multiple Message Capable | *지원 가능 vector 수* (1·2·4·8·16·32) |
| Multiple Message Enable | *실제 사용 vector 수* |
| Per-vector Masking·Pending Bit | optional |

*32 vector 최대*. *연속된 vector*만 가능 — *base vector + N*. *Mask는 *전체 또는 per-vector*.

흐름: device가 *Message Address에 Message Data를 memory write* → CPU APIC가 받음 → 해당 *vector의 ISR* 호출.

## MSI-X — Per-vector Independent

MSI 제한 (32 vector·연속만)을 해결한 게 *MSI-X (ID 0x11)*:

| 항목 | 의미 |
|------|------|
| Table | *각 vector의 address·data·mask* 따로 저장 |
| Pending Bit Array (PBA) | masked vector의 pending bit |
| Max vector | *2048* |
| Vector 분포 | *불연속 가능*, *각 vector 다른 CPU APIC 가리킬 수 있음* |

*Table·PBA는 별도 BAR 영역에 위치*. *table size = vector 수 × 16 byte*.

NIC·NVMe는 *queue별 vector*로 *core당 1 vector*. 100 GbE에 *32 core면 32 vector*. *parallel ISR*로 *throughput 극대*.

## MSI-X Table Entry — 16 byte

| Offset | 필드 |
|--------|------|
| 0~7 | Message Address (64-bit) |
| 8~11 | Message Data (32-bit) |
| 12~15 | Vector Control (mask bit·reserved) |

*per-vector mask bit*가 *vector별 independent disable* 가능. *부분 service*에 유용 (예: *부하 높은 vector만 disable*).

## Interrupt 흐름 — Device에서 ISR까지

*MSI-X 기준*:

| 단계 | 동작 |
|------|------|
| 1 | Device가 *Message Address에 Message Data write* (Posted MWr) |
| 2 | RC가 *CPU APIC에 deliver* |
| 3 | (IOMMU 활성화 시) *Interrupt Remapping*이 *redirection table 참조* |
| 4 | APIC가 *vector → CPU* lookup |
| 5 | CPU가 *interrupt 진입* — context switch, IRQ stack |
| 6 | Linux *do_IRQ()* → *IRQ handler* 호출 |
| 7 | Driver의 *ISR* (`request_irq`로 등록된 함수) 실행 |
| 8 | ISR이 *device register 읽고 cleanup*, *softirq/tasklet/threaded IRQ* schedule |

## Interrupt Remapping — IOMMU

가상화 환경에서 *device가 보낸 interrupt를 어느 vCPU로 전달*할지 결정:

| 항목 | 의미 |
|------|------|
| Intel VT-d IR | Interrupt Remapping Table Entry (IRTE) 참조 |
| AMD-Vi | AMD IOMMU의 IRTE 형태 |
| Bypass mode | remapping 없이 *직접 APIC delivery* (security 위험) |

가상화 안 쓸 때도 *MSI-X 같은 source는 IOMMU IR이 default*. *security*·*vCPU 분리* 양쪽 목적.

## Linux PCI IRQ API

대표 API:

| 함수 | 역할 |
|------|------|
| `pci_alloc_irq_vectors()` | INTx/MSI/MSI-X 자동 선택 + vector 할당 |
| `pci_irq_vector(pdev, nr)` | n번째 vector의 *Linux IRQ 번호* 반환 |
| `request_irq(irq, handler, ...)` | ISR 등록 |
| `pci_free_irq_vectors()` | 해제 |

```c
// Driver 예
int nvecs = pci_alloc_irq_vectors(pdev, 1, 32,
                                  PCI_IRQ_MSIX | PCI_IRQ_MSI);
for (int i = 0; i < nvecs; i++) {
    int irq = pci_irq_vector(pdev, i);
    request_irq(irq, my_isr, 0, "mydev", queue[i]);
}
```

*PCI_IRQ_MSIX*가 *우선*, 실패하면 *MSI fallback*, 그것도 실패하면 *INTx*.

## CPU 분산 — IRQ Affinity

여러 vector를 *여러 core에 분산*하는 게 *throughput의 핵심*:

| 방법 | 사용 |
|------|------|
| `/proc/irq/N/smp_affinity` | mask로 *어느 CPU가 처리*할지 |
| `irqbalance` daemon | *자동 분산* |
| `pci_alloc_irq_vectors_affinity()` | driver가 *affinity 지정* — NVMe·NIC 표준 |

NVMe driver는 *queue 수 = vector 수 = core 수*로 *1:1 binding*. core 0의 submit queue → vector 0 → core 0 ISR. *cache locality 극대*.

## 자주 하는 실수

### "INTx가 PCIe에도 있다"

PCIe는 *물리 wire 없음*. INTx는 *Message로 simulate*. *4 wire를 logical하게* 만들어 *legacy compatibility* 제공. 새 driver는 *INTx 회피*.

### "MSI-X면 무조건 빠르다"

*Vector·queue·core 분산 안 하면 효과 적음*. MSI-X 16 vector 받았는데 *모든 ISR이 core 0*만 처리면 *MSI보다 못한 throughput*. *affinity 설정* 필수.

### "Mask와 Disable는 같다"

*Mask*는 *vector pending*만 setting, *unmask 시 pending* 처리. *Disable*은 *완전 차단*. NVMe는 *runtime mask/unmask*로 *coalescing 유사 효과*.

### "Per-vector mask는 항상 있다"

*MSI capability*에 *per-vector mask는 optional*. *Multiple Message Capable*가 *지원 여부 표시*. MSI-X는 *항상 per-vector mask*.

### "interrupt remapping은 가상화 전용"

비가상화 환경도 *기본 활성* — *security (rogue device가 임의 vector send 방지)*. `intremap=off`는 *security 약화*.

## 정리

- *INTx*는 *legacy 4-wire를 Message로 simulate*. *shared·level-triggered*, overhead 큼.
- *MSI*는 *memory write로 interrupt*. *32 vector·연속만*. Per-vector mask는 optional.
- *MSI-X*는 *2048 vector·불연속 가능·per-vector independent*. NIC·NVMe 표준.
- *MSI-X Table·PBA*는 *별도 BAR 영역*. *table entry 16 byte*.
- *IOMMU Interrupt Remapping*이 *redirection·security*.
- Linux API: *pci_alloc_irq_vectors → pci_irq_vector → request_irq*.
- *IRQ affinity*가 *throughput의 핵심* — queue·vector·core *1:1 binding*.

## 다음 편

[Ch 6: Power Management — D-state·L-state·ASPM](/blog/embedded/hardware/pcie/chapter06-power-management)에서 *PCIe의 device·link 전력 상태*와 *active state PM (ASPM)*을 본격적으로 분해합니다.

## 관련 항목

- [Ch 3: Configuration Space](/blog/embedded/hardware/pcie/chapter03-config-space) — MSI·MSI-X Capability 위치
- [Ch 4: BAR & MMIO](/blog/embedded/hardware/pcie/chapter04-bar-mmio) — MSI-X Table BAR
- [Ch 11: DMA·IOMMU](/blog/embedded/hardware/pcie/chapter11-linux-dma) — Interrupt Remapping
- [Ch 10: Linux PCI Basics](/blog/embedded/hardware/pcie/chapter10-linux-basics) — pci_alloc_irq_vectors

## 시리즈 자료 출처 안내

본 글의 1차 자료·정책은 [Ch 1 footer](/blog/embedded/hardware/pcie/chapter01-fundamentals#시리즈-자료-출처-안내) 참고.
