---
title: "Ch 14: Linux Operations — Hot-plug·AER Recovery·DPC·ARI"
slug: "embedded/hardware/pcie/chapter14-linux-operations"
date: 2026-05-19T09:14:00
description: "PCIe 운영 — pciehp surprise·orderly hot-plug·AER recovery callback chain·DPC integration·ARI 8-bit function 식별·EEH."
series: "PCIe Deep Dive"
seriesOrder: 14
tags: [pcie, hotplug, aer-recovery, dpc, ari, linux-operations]
draft: false
topics: ["embedded", "embedded/hardware"]
---

## 한 줄 요약

> **"운영 환경에서 자주 만나는 *hot-plug·AER recovery·DPC integration*은 *kernel callback chain*으로 짜여 있습니다."** — *pciehp driver*가 *surprise·orderly hot-plug* 처리, *AER가 detected → reset → resume의 4-callback chain*, *DPC가 fault containment*, *ARI*가 *single device에 256 function*. POWER 환경은 *EEH로 PE 격리*.

[Ch 7 Error Handling](/blog/embedded/hardware/pcie/chapter07-error-handling)에서 *AER·DPC 개념*을 봤습니다. 이 장은 *그것이 운영 중 어떻게 동작*하고 *hot-plug·ARI*는 어떻게 통합되는지 본격적으로 분해합니다.

## Hot-plug 종류

| 종류 | 의미 |
|------|------|
| **Surprise** | 사용자가 *통보 없이 제거* — NVMe U.2·OCP NIC |
| **Orderly** | button·software로 사전 요청하고 OS가 I/O 중단·제거를 처리 |

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

단계별 시간은 controller·장치·driver·재시도에 따라 확인해야 합니다. Presence와 전원 제어 기능도 모든 slot이 같지 않으며, link 활성·자원 할당·probe 성공은 별도 조건입니다.

## Hot-plug 시퀀스 — 제거

| 종류 | 단계 |
|------|------|
| Orderly | 사용자 button → Slot Status event → driver detach → power off |
| Surprise | 예고 없는 link·장치 상실을 감지해 제거 처리. AER·DPC가 항상 모두 관여하는 고정 순서는 아님 |

Surprise removal에서는 진행 중 I/O가 실패할 수 있습니다. PCI driver의 remove와 오류 처리 경로가 새 요청을 막고 종료를 처리해야 하며, 이미 사라진 장치의 register 완료를 무한히 기다리면 안 됩니다.

## AER Recovery Callback Chain

`pci_error_handlers`의 *callback 순서*:

| 단계 | Callback | 의미 |
|------|----------|------|
| 1 | `error_detected` | AER가 *에러 인식* — driver 상태 record, return `PCI_ERS_RESULT_NEED_RESET` |
| 2 | (option) `mmio_enabled` | MMIO 가능한지 확인 |
| 3 | `slot_reset` | Reset 후 *device reinit* |
| 4 | `resume` | 정상 복귀, *workload 재개* |

Return 값:

| 값 | 의미 |
|----|------|
| `PCI_ERS_RESULT_NEED_RESET` | reset 필요 |
| `PCI_ERS_RESULT_CAN_RECOVER` | reset 없이 복구를 시도할 수 있음 |
| `PCI_ERS_RESULT_DISCONNECT` | 복구 불가, *driver detach* |
| `PCI_ERS_RESULT_RECOVERED` | 정상 복귀 |

Callback이 반환한 결과와 관련 driver들의 집계 결과에 따라 다음 단계가 결정됩니다. 모든 오류에서 네 callback이 반드시 한 번씩 순서대로 호출되는 것은 아닙니다. `error_detected`에서는 새 I/O를 중단하고 접근이 금지된 장치 register를 기다리지 않아야 합니다. `slot_reset`은 필요한 설정 복원이 성공한 뒤에만 복구 성공을 반환하고, 실패 시에는 사용을 재개하지 않습니다.


## DPC Integration

DPC가 *AER recovery와 어떻게 결합*:

| 시나리오 | 동작 |
|---------|------|
| UE Fatal | DPC가 *downstream port link 차단* |
| 같은 port의 *모든 device 영향* | 보통 *DPC는 단일 device port에 적용* |
| DPC trigger 후 | `pci_error_handlers`의 *error_detected → slot_reset → resume* |
| Recovery 시 | DPC가 *link 재활성* |

[Linux v6.12 dpc.c](https://github.com/torvalds/linux/blob/adc218676eef25575469234709c2d87185ca223a/drivers/pci/pcie/dpc.c)와 `err.c`의 실제 recovery 흐름을 기준으로 봅니다. 이 글에서는 DPC trigger나 reset을 실행하지 않았습니다.

## ARI — Alternative Routing-ID Interpretation

기존 devfn은 Device 5-bit와 Function 3-bit로 나뉩니다. ARI는 이 8-bit를 Function으로 해석해 256개 인코딩을 제공합니다. Routing ID 해석 변화이며 실제 생성 가능한 VF 수와 같지는 않습니다.

| 시나리오 | 효과 |
|---------|------|
| SR-IOV | 실제 First VF Offset·VF Stride·Routing ID 배치와 upstream ARI forwarding 조건 확인 |
| 여러 function을 가진 장치 | 지원하는 function과 자원 한도를 별도 확인 |
| 복잡 ASIC | function 분할 자유도 |

장치의 ARI capability와 upstream port의 ARI forwarding 지원·활성 상태를 구분합니다. [v6.12 iov.c](https://github.com/torvalds/linux/blob/adc218676eef25575469234709c2d87185ca223a/drivers/pci/iov.c)는 ARI 상태에 따라 SR-IOV control을 설정하고 offset·stride를 읽습니다.

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
| VF 수를 늘리는 경우 | 개수만으로 ARI 필수 경계를 단정하지 않고 RID 배치를 확인 |
| 여러 bus로 확장되는 VF | 필요한 bus 번호와 platform 자원을 확인 |
| Switch가 ARI 미지원 | NumVFs 한계 |

구체적인 장치·firmware의 지원 조건은 해당 자료와 실제 enumeration으로 확인합니다.

## Pciehp + SR-IOV 상호작용

| 시나리오 | 결과 |
|---------|------|
| VF live 시 PF hot-remove | 모든 VF 자동 제거 |
| Hot-plug와 VF 변경이 겹침 | kernel lock·driver 수명 관리와 실패 처리를 확인. 외부 I/O까지 원자적으로 성공한다는 보장은 아님 |
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

*ARI는 routing 확장*, *SR-IOV는 virtualization*. VF 수 하나만으로 ARI 필요 여부를 결정하지 않습니다. 다른 용도는 *순수 ARI*만.

### "Surprise removal은 OS panic"

Driver는 장치 상실을 처리해야 하지만, 진행 중인 데이터·파일시스템·상위 서비스의 복구까지 자동 보장하지는 않습니다. Panic의 원인도 driver bug 하나로 확정할 수 없습니다.

## 정리

- *pciehp*가 *native PCIe hot-plug*, *Slot Capabilities·Status·Control* register 활용.
- *Surprise vs Orderly* — 사용자 통보 여부.
- *AER recovery callback chain*: `error_detected → mmio_enabled → slot_reset → resume`.
- *DPC integration* — fault containment 후 AER chain 진행.
- ARI는 8-bit function 식별을 제공하며, 실제 VF RID 배치와 forwarding을 확인합니다.
- *EEH (POWER)*가 *PE frozen·unfreeze 모델*.
- *Surprise removal*은 *driver의 graceful handle*에 의존.

## 다음 편

[Ch 15: Tools — lspci·setpci·pcimem·protocol analyzer](/blog/embedded/hardware/pcie/chapter15-tools)에서 *PCIe 트러블슈팅 도구*를 본격적으로 분해합니다.

## 관련 항목

- [Ch 7: Error Handling](/blog/embedded/hardware/pcie/chapter07-error-handling) — AER·DPC 개념
- [Ch 10: Linux PCI Basics](/blog/embedded/hardware/pcie/chapter10-linux-basics) — pcie-portdrv
- [Ch 12: Virtualization I](/blog/embedded/hardware/pcie/chapter12-virtualization-1) — PF·VF와 소유권

## 시리즈 자료 출처 안내

구현 기준은 [Linux v6.12 PCI Error Recovery](https://github.com/torvalds/linux/blob/adc218676eef25575469234709c2d87185ca223a/Documentation/PCI/pci-error-recovery.rst), [pci.h의 실제 callback](https://github.com/torvalds/linux/blob/adc218676eef25575469234709c2d87185ca223a/include/linux/pci.h), `pciehp`·`dpc.c`·`err.c`·`iov.c`입니다. Hot-remove·AER 주입·실제 recovery는 실행하지 않았습니다. 본 글의 1차 자료·정책은 [Ch 1 footer](/blog/embedded/hardware/pcie/chapter01-fundamentals#시리즈-자료-출처-안내) 참고.
