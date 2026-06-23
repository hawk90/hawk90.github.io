---
title: "Ch 14: Linux Operations — Hot-plug·AER Recovery·DPC·ARI"
date: 2026-05-19T09:14:00
description: "PCIe 운영 — pciehp surprise·orderly hot-plug·AER recovery callback chain·DPC integration·ARI 256+ function·EEH."
series: "PCIe Deep Dive"
seriesOrder: 14
tags: [pcie, hot-plug, aer-recovery, dpc, ari, linux-operations]
draft: false
---

## 한 줄 요약

> **"운영 환경에서 자주 만나는 *hot-plug·AER recovery·DPC integration*은 *kernel callback chain*으로 짜여 있습니다."** — *pciehp driver*가 *surprise·orderly hot-plug* 처리, *AER가 detected → reset → resume의 4-callback chain*, *DPC가 fault containment*, *ARI*가 *single device에 256 function*. POWER 환경은 *EEH로 PE 격리*.

[Ch 7 Error Handling](/blog/embedded/hardware/pcie/chapter07-error-handling)에서 *AER·DPC 개념*을 봤습니다. 이 장은 *그것이 운영 중 어떻게 동작*하고 *hot-plug·ARI*는 어떻게 통합되는지 본격적으로 분해합니다.

## Hot-plug 종류

| 종류 | 의미 |
|------|------|
| **Surprise** | 사용자가 *통보 없이 제거* — NVMe U.2·OCP NIC |
| **Orderly** | 사용자가 *button·software 명시 후 제거* | enterprise blade·CXL device |

| 메커니즘 | Linux 드라이버 |
|---------|---------------|
| Native PCIe Hot-plug | `pciehp` |
| ACPI-based | `acpiphp` |
| Sub-system specific | NVMe hot-add 등 |

## Slot Capabilities·Status·Control

PCIe Cap의 *Slot register 3개*:

| Register | 의미 |
|----------|------|
| Slot Capabilities | hot-plug 지원·attention·power indicator·MRL sensor |
| Slot Control | command issue (power on/off·attention·power indicator) |
| Slot Status | event (presence detect·MRL sensor·button) |

pciehp가 *이 register들로 hot-plug 처리*. `lspci -vv | grep -A 5 "SltCap"`로 확인.

## Hot-plug 시퀀스 — 추가

| 단계 | 동작 |
|------|------|
| 1 | Card 삽입 → *Presence Detect 비트* 활성 |
| 2 | Slot이 *Hot-plug Interrupt* trigger |
| 3 | pciehp가 *Slot Power on* |
| 4 | *LTSSM Detect → L0* (link training) |
| 5 | Configuration Space scan |
| 6 | Bus allocation·BAR 할당 |
| 7 | Driver matching·probe |

각 단계 *delay·timeout*. 보통 *수백 ms ~ 수 s*.

## Hot-plug 시퀀스 — 제거

| 종류 | 단계 |
|------|------|
| Orderly | 사용자 button → Slot Status event → driver detach → power off |
| Surprise | Link Down detect → AER + DPC → driver remove |

Surprise removal은 *진행 중 I/O가 fail* — *driver의 unbind callback*에서 *graceful cleanup*.

## AER Recovery Callback Chain

`pci_error_handlers`의 *callback 순서*:

| 단계 | Callback | 의미 |
|------|----------|------|
| 1 | `error_detected` | AER가 *에러 인식* — driver 상태 record, return `PCI_ERS_RESULT_NEED_RESET` |
| 2 | (option) `mmio_enabled` | MMIO 가능한지 확인 |
| 3 | `slot_reset` 또는 `link_reset` | Reset 후 *device reinit* |
| 4 | `resume` | 정상 복귀, *workload 재개* |

Return 값:

| 값 | 의미 |
|----|------|
| `PCI_ERS_RESULT_NEED_RESET` | reset 필요 |
| `PCI_ERS_RESULT_CAN_RECOVER` | reset 없이 복구 |
| `PCI_ERS_RESULT_DISCONNECT` | 복구 불가, *driver detach* |
| `PCI_ERS_RESULT_RECOVERED` | 정상 복귀 |

```c
static pci_ers_result_t my_error_detected(
    struct pci_dev *pdev,
    pci_channel_state_t state)
{
    struct my_dev *dev = pci_get_drvdata(pdev);
    drain_outstanding_io(dev);
    return PCI_ERS_RESULT_NEED_RESET;
}

static pci_ers_result_t my_slot_reset(struct pci_dev *pdev)
{
    pci_restore_state(pdev);
    reinit_hardware(dev);
    return PCI_ERS_RESULT_RECOVERED;
}
```

## DPC Integration

DPC가 *AER recovery와 어떻게 결합*:

| 시나리오 | 동작 |
|---------|------|
| UE Fatal | DPC가 *downstream port link 차단* |
| 같은 port의 *모든 device 영향* | 보통 *DPC는 단일 device port에 적용* |
| DPC trigger 후 | `pci_error_handlers`의 *error_detected → slot_reset → resume* |
| Recovery 시 | DPC가 *link 재활성* |

`drivers/pci/pcie/dpc.c`가 *handler*. `dpcgo`·debug script로 *manual trigger* 가능.

## ARI — Alternative Routing-ID Interpretation

기존: *8-bit function (8 function/device)*. ARI: *전체 8-bit를 function*으로 — *256 function/device*:

| 시나리오 | 효과 |
|---------|------|
| SR-IOV with N>8 VF | ARI 필수 |
| NVMe multi-controller | ARI로 *128 controller* |
| 복잡 ASIC | function 분할 자유도 |

활성화: *Switch downstream port + EP 모두 ARI Capability*. `lspci -vv | grep "ARI Cap"`.

## EEH — POWER Architecture

IBM POWER의 *Partitionable Endpoint (PE)* 기반 격리:

| 요소 | 의미 |
|------|------|
| PE | *IOMMU·MSI·BAR을 하나의 단위로 묶음* |
| Frozen state | PE 에러 시 *전체 PE frozen* |
| Recovery | OS가 *PE unfreeze·reset·resume* |

x86은 *AER + DPC*, POWER는 *EEH + AER*. 동일 목적 다른 메커니즘.

## ARI vs SR-IOV 결합

| 시나리오 | 결과 |
|---------|------|
| SR-IOV 32 VF | ARI 필요 (>8) |
| SR-IOV 128 VF (NIC) | ARI + 적절한 Bus 할당 |
| Switch가 ARI 미지원 | NumVFs 한계 |

NIC vendor가 *ARI 활성 펌웨어 권장*.

## Pciehp + SR-IOV 상호작용

| 시나리오 | 결과 |
|---------|------|
| VF live 시 PF hot-remove | 모든 VF 자동 제거 |
| Hot-plug 진행 중 SR-IOV 활성 | *atomicity* 보장 — pciehp lock |
| Hot-plug → driver probe → SR-IOV enable | 일반 흐름 |

## Surprise Removal

| 단계 | 동작 |
|------|------|
| 1 | Link Down detect (LTSSM) |
| 2 | pcie-portdrv가 *device removal event* |
| 3 | Driver의 `pci_error_handlers::error_detected` (option) |
| 4 | Driver의 `remove` callback |
| 5 | struct pci_dev 해제 |

진행 중 I/O는 *fail*. *driver가 graceful handle* — outstanding submission에 *error 표시*.

## 자주 하는 실수

### "Hot-plug가 자동 detect"

*Slot Cap의 Hot-Plug Capable 비트*가 *firmware·platform 지원* 표시. UEFI/BIOS에서 *Hot-plug enable* 옵션이 *별도*. *PCIe slot이 Hot-plug 지원 hardware*일 것.

### "AER recovery 자동"

*pci_error_handlers 등록 안 한 driver*는 *recovery callback chain 진입 안 함* → *device offline* 또는 *OS panic*. *production driver*는 *항상 등록*.

### "DPC가 AER 대체"

*보완*. AER는 *detection·logging·report*, DPC는 *containment*. *둘 다 활성*해야 *완전 RAS*.

### "ARI = SR-IOV"

*ARI는 routing 확장*, *SR-IOV는 virtualization*. *SR-IOV with NumVFs > 7*에 *ARI 필요*. 다른 용도는 *순수 ARI*만.

### "Surprise removal은 OS panic"

*잘 짠 driver는 graceful handle*. NVMe는 *transfer 진행 중 surprise removal도 안전*. *driver bug*가 *panic의 진짜 원인*.

## 정리

- *pciehp*가 *native PCIe hot-plug*, *Slot Capabilities·Status·Control* register 활용.
- *Surprise vs Orderly* — 사용자 통보 여부.
- *AER recovery callback chain*: `error_detected → mmio_enabled → slot_reset → resume`.
- *DPC integration* — fault containment 후 AER chain 진행.
- *ARI*가 *256 function/device* — SR-IOV with NumVFs > 7 필수.
- *EEH (POWER)*가 *PE frozen·unfreeze 모델*.
- *Surprise removal*은 *driver의 graceful handle*에 의존.

## 다음 편

[Ch 15: Tools — lspci·setpci·pcimem·protocol analyzer](/blog/embedded/hardware/pcie/chapter15-tools)에서 *PCIe 트러블슈팅 도구*를 본격적으로 분해합니다.

## 관련 항목

- [Ch 7: Error Handling](/blog/embedded/hardware/pcie/chapter07-error-handling) — AER·DPC 개념
- [Ch 10: Linux PCI Basics](/blog/embedded/hardware/pcie/chapter10-linux-basics) — pcie-portdrv
- [Ch 12: Virtualization I](/blog/embedded/hardware/pcie/chapter12-virtualization-1) — SR-IOV·ARI

## 시리즈 자료 출처 안내

본 글의 1차 자료·정책은 [Ch 1 footer](/blog/embedded/hardware/pcie/chapter01-fundamentals#시리즈-자료-출처-안내) 참고.
