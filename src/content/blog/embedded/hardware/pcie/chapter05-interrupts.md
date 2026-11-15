---
title: "Ch 5: Interrupts — INTx·MSI·MSI-X·Interrupt Remapping"
slug: "embedded/hardware/pcie/chapter05-interrupts"
date: 2026-05-19T09:05:00
description: "PCIe 인터럽트 메커니즘 3가지 — Legacy INTx·MSI 32 vector·MSI-X 2048 vector·IOMMU Interrupt Remapping."
series: "PCIe Deep Dive"
seriesOrder: 5
tags: [pcie, interrupts, msi, msi-x, intx, interrupt-remapping]
draft: false
topics: ["embedded", "embedded/hardware"]
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

Table과 PBA는 BAR 번호(BIR)와 offset으로 위치를 지정합니다. 같은 BAR의 서로 다른 범위에 있을 수도 있습니다. *table size = vector 수 × 16 byte*.

Queue와 vector의 대응은 driver와 할당 결과에 달려 있습니다. queue가 vector를 공유하거나 polling queue가 있을 수 있으므로 CPU 수와 1:1이라고 가정하지 않습니다.

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
| 2 | 플랫폼의 interrupt 수신 경로로 전달 |
| 3 | 지원·활성화된 경우 Interrupt Remapping이 출처와 목적지를 검사·변환 |
| 4 | APIC가 *vector → CPU* lookup |
| 5 | CPU가 *interrupt 진입* — context switch, IRQ stack |
| 6 | 해당 architecture의 Linux IRQ 진입 경로가 등록 handler 호출 |
| 7 | Driver의 *ISR* (`request_irq`로 등록된 함수) 실행 |
| 8 | ISR이 *device register 읽고 cleanup*, *softirq/tasklet/threaded IRQ* schedule |

## Interrupt Remapping — IOMMU

가상화 환경에서 *device가 보낸 interrupt를 어느 vCPU로 전달*할지 결정:

| 항목 | 의미 |
|------|------|
| Intel VT-d IR | Interrupt Remapping Table Entry (IRTE) 참조 |
| AMD-Vi | AMD IOMMU의 IRTE 형태 |
| Bypass mode | remapping 없이 *직접 APIC delivery* (security 위험) |

Interrupt Remapping은 비가상화 환경에서도 출처 검증에 사용됩니다. 실제 활성 여부는 architecture·firmware·커널 설정으로 확인해야 하며, DMA remapping 활성과 같은 뜻은 아닙니다.

## Linux PCI IRQ API

대표 API:

| 함수 | 역할 |
|------|------|
| `pci_alloc_irq_vectors()` | INTx/MSI/MSI-X 자동 선택 + vector 할당 |
| `pci_irq_vector(pdev, nr)` | n번째 vector의 *Linux IRQ 번호* 반환 |
| `request_irq(irq, handler, ...)` | ISR 등록 |
| `pci_free_irq_vectors()` | 해제 |

실제 driver의 실패 처리는 다음 순서로 설계합니다. [Linux v6.12 MSI 문서](https://github.com/torvalds/linux/blob/adc218676eef25575469234709c2d87185ca223a/Documentation/PCI/msi-howto.rst)와 [`drivers/pci/msi/api.c`](https://github.com/torvalds/linux/blob/adc218676eef25575469234709c2d87185ca223a/drivers/pci/msi/api.c)를 기준으로 하며, 실제 IRQ 할당·발생 시험은 하지 않았습니다.

| 결과 | 처리 |
|------|------|
| 할당 함수가 음수 반환 | IRQ 번호 조회와 handler 등록을 시작하지 않음 |
| 요청 최대보다 적은 양수 반환 | 실제 vector 수에 맞춰 queue 구성 |
| 중간 `request_irq()` 실패 | 이미 등록한 handler를 같은 dev_id로 역순 해제한 뒤 vector 해제 |
| 정상 remove | 장치 IRQ·DMA 발생 중단, handler 동기화·해제 후 vector 해제 |

`PCI_IRQ_MSIX | PCI_IRQ_MSI`이면 MSI-X 후 MSI를 시도합니다. INTx fallback은 v6.12의 `PCI_IRQ_INTX` flag와 `min_vecs == 1` 등 조건을 만족해야 합니다. 위 두 flag만으로 INTx까지 자동 선택하지 않습니다.

위 v6.12 할당 함수는 본문과 별도로 원본 그대로 추출해 host의 모의 allocator와 연결했습니다. Flag·최소 개수·INTx 존재·MSI-X/MSI 성공과 실패 조합 864개에서 반환과 fallback 호출 순서를 ASan·UBSan으로 확인했습니다. 실제 커널의 IRQ domain·handler·affinity 동작을 실행한 것은 아닙니다.

## CPU 분산 — IRQ Affinity

여러 vector를 *여러 core에 분산*하는 게 *throughput의 핵심*:

| 방법 | 사용 |
|------|------|
| `/proc/irq/N/smp_affinity` | mask로 *어느 CPU가 처리*할지 |
| `irqbalance` daemon | *자동 분산* |
| `pci_alloc_irq_vectors_affinity()` | driver가 *affinity 지정* — NVMe·NIC 표준 |

Affinity는 queue 구성·CPU online 상태·managed IRQ 정책과 함께 봅니다. 요청한 affinity와 실제 IRQ 분포를 비교해야 locality 효과를 판단할 수 있습니다.

## 자주 하는 실수

### "INTx가 PCIe에도 있다"

PCIe는 *물리 wire 없음*. INTx는 *Message로 simulate*. *4 wire를 logical하게* 만들어 *legacy compatibility* 제공. 새 driver는 *INTx 회피*.

### "MSI-X면 무조건 빠르다"

*Vector·queue·core 분산 안 하면 효과 적음*. MSI-X 16 vector 받았는데 *모든 ISR이 core 0*만 처리면 *MSI보다 못한 throughput*. *affinity 설정* 필수.

### "Mask와 Disable는 같다"

*Mask*는 *vector pending*만 setting, *unmask 시 pending* 처리. *Disable*은 *완전 차단*. NVMe는 *runtime mask/unmask*로 *coalescing 유사 효과*.

### "Per-vector mask는 항상 있다"

*MSI capability*에 *per-vector mask는 optional*. MSI Message Control의 bit 8(`PCI_MSI_FLAGS_MASKBIT`)가 지원 여부를 표시합니다. Multiple Message Capable은 vector 개수 인코딩입니다. MSI-X는 *항상 per-vector mask*.

### "interrupt remapping은 가상화 전용"

비가상화 환경에서도 지원·활성 여부를 확인해야 함 — *security (rogue device가 임의 vector send 방지)*. `intremap=off`는 *security 약화*.

## 정리

- *INTx*는 *legacy 4-wire를 Message로 simulate*. *shared·level-triggered*, overhead 큼.
- *MSI*는 *memory write로 interrupt*. *32 vector·연속만*. Per-vector mask는 optional.
- *MSI-X*는 *2048 vector·불연속 가능·per-vector independent*. NIC·NVMe 표준.
- Table·PBA는 BAR와 offset으로 지정된 범위. *table entry 16 byte*.
- *IOMMU Interrupt Remapping*이 *redirection·security*.
- Linux API: *pci_alloc_irq_vectors → pci_irq_vector → request_irq*.
- *IRQ affinity*가 *throughput의 핵심* — queue·vector·CPU 대응은 실제 할당과 workload에 맞춰 검토합니다.

## 다음 편

[Ch 6: Power Management — D-state·L-state·ASPM](/blog/embedded/hardware/pcie/chapter06-power-management)에서 *PCIe의 device·link 전력 상태*와 *active state PM (ASPM)*을 본격적으로 분해합니다.

## 관련 항목

- [Ch 3: Configuration Space](/blog/embedded/hardware/pcie/chapter03-config-space) — MSI·MSI-X Capability 위치
- [Ch 4: BAR & MMIO](/blog/embedded/hardware/pcie/chapter04-bar-mmio) — BAR resource의 주소 매핑
- [Ch 11: DMA·IOMMU](/blog/embedded/hardware/pcie/chapter11-linux-dma) — DMA 주소 변환과 메모리 격리
- [Ch 10: Linux PCI Basics](/blog/embedded/hardware/pcie/chapter10-linux-basics) — pci_alloc_irq_vectors

## 시리즈 자료 출처 안내

본 글의 1차 자료·정책은 [Ch 1 footer](/blog/embedded/hardware/pcie/chapter01-fundamentals#시리즈-자료-출처-안내) 참고.
