---
title: "Ch 7: Error Handling — Correctable·Uncorrectable·AER·DPC"
date: 2026-05-19T09:07:00
description: "PCIe 에러 분류·계층별 처리·AER capability·DPC containment·Linux 복구 callback."
series: "PCIe Deep Dive"
seriesOrder: 7
tags: [pcie, error-handling, aer, dpc, flr]
draft: false
---

## 한 줄 요약

> **"PCIe 에러는 *Correctable (CE)·Uncorrectable Non-Fatal (UE-NF)·Uncorrectable Fatal (UE-F)*의 *3-tier 분류*입니다."** — Physical·DLL·TL 각 계층이 *자기 단계에서 정정·검출*. *AER capability*가 *상세 로깅·report*, *DPC (Downstream Port Containment)*가 *switch 단에서 fault 격리*. Linux는 *pci_error_handlers callback*으로 *driver-level 복구* 지원.

[Ch 2 TLP](/blog/embedded/hardware/pcie/chapter02-tlp)·[Ch 8 DLL](/blog/embedded/hardware/pcie/chapter08-dllp)에서 *ECRC·LCRC·ACK/NAK*가 *각 계층 무결성 보장*임을 봤습니다. 이 장은 *그 보호망을 넘은 에러*를 *어떻게 분류·report·복구*하는지 본격적으로 분해합니다.

## Error 3-Tier 분류

| Tier | 의미 | 영향 |
|------|------|------|
| **Correctable (CE)** | Hardware가 *복구*. 로깅만 | application 영향 없음 |
| **Uncorrectable Non-Fatal (UE-NF)** | 복구 못 함, *transaction은 abort* | application *그 transaction 실패* |
| **Uncorrectable Fatal (UE-F)** | *link 자체 손상* | OS panic·device offline·containment 필요 |

Critical workload (RAS-sensitive)은 *모든 tier 로깅*, server 환경은 *CE 누적도 health monitoring*.

## 계층별 에러

| 계층 | 에러 종류 |
|------|----------|
| **Physical** | LTSSM Recovery, Receiver Error, Symbol Error |
| **Data Link** | LCRC 실패 → NAK·Replay, Replay Number Rollover |
| **Transaction** | Poisoned TLP, ECRC 실패, Unsupported Request, Completer Abort, Completion Timeout |

각 계층이 *자기 단계에서 detect·report*. *상위 계층은 모름*.

## AER — Advanced Error Reporting

*AER (Extended Cap ID 0x0001)*가 *상세 에러 정보*:

| Register | 의미 |
|----------|------|
| Uncorrectable Error Status | UE 종류별 비트 |
| Uncorrectable Error Mask | report 차단할 UE |
| Uncorrectable Error Severity | UE의 *Fatal/Non-Fatal* 구분 |
| Correctable Error Status·Mask | CE 동일 |
| AER Capabilities·Control | ECRC enable, multiple header recording |
| Header Log | *첫 UE의 TLP header* (디버깅용) |
| Root Error Status·Cmd | Root Port의 AER 통합 |

`lspci -vv | grep -A 20 "Advanced Error Reporting"`로 device의 *AER 상태 dump*.

## ERR Messages

UE/CE 발생 시 *EP가 Message TLP로 RC에 report*:

| Message | 의미 |
|---------|------|
| ERR_COR | Correctable 발생 |
| ERR_NONFATAL | UE Non-Fatal |
| ERR_FATAL | UE Fatal |

Switch는 *내려온 ERR Message를 RC로 forward*. RC가 *AER root status에 record* + *MSI/MSI-X로 OS interrupt*.

## DPC — Downstream Port Containment

*DPC (Extended Cap ID 0x001D)*는 *fault 격리 메커니즘*:

| 동작 | 효과 |
|------|------|
| UE Fatal 발생 | Switch downstream port가 *link 차단* |
| 차단 후 *bus traffic 흐르지 않음* | 추가 corruption 방지 |
| Recovery 동작 | OS가 *port reset·device reinit* |

DPC 없으면 *fault가 propagate*해 *다른 device·system 영향*. *enterprise server·NVMe·CXL*에 *필수*.

## Linux pci_error_handlers

driver가 *복구 callback* 등록:

| Callback | 호출 시점 |
|----------|----------|
| `error_detected` | AER가 에러 인식, *상태 확인* |
| `mmio_enabled` | MMIO 접근 가능 확인 |
| `slot_reset` | Slot reset 후 *device reinit* |
| `link_reset` | Link reset 후 |
| `resume` | 정상 복귀, *workload 재개* |

```c
static const struct pci_error_handlers my_err_handler = {
    .error_detected = my_error_detected,
    .mmio_enabled   = my_mmio_enabled,
    .slot_reset     = my_slot_reset,
    .resume         = my_resume,
};

static struct pci_driver my_driver = {
    .name        = "mydrv",
    .id_table    = my_id_table,
    .probe       = my_probe,
    .err_handler = &my_err_handler,
};
```

## Poisoned TLP

*Header 손상 또는 명시적 poison*된 TLP는 *EP가 special bit set*:

| 시나리오 | 영향 |
|---------|------|
| EP가 *Header bit (EP=1) set*해서 send | downstream이 *bad data 인식*, AER report |
| 받은 측이 *data를 사용하지 않음* | corruption 전파 차단 |

*ECC memory의 poison bit*과 유사 — *bad data를 표시해서* downstream이 *사용 회피*.

## Reset 종류

UE Fatal 후 복구는 *다양한 reset* 옵션:

| Reset | 효과 |
|-------|------|
| **FLR (Function Level Reset)** | 단일 function 리셋, *다른 function 영향 없음* |
| **Hot Reset** | bridge에서 *secondary bus reset signal* |
| **Secondary Bus Reset** | bridge가 *자기 secondary bus의 모든 device reset* |
| **PERST# (Platform Reset)** | 보드 차원 reset |

`echo 1 > /sys/bus/pci/devices/.../reset`이 *FLR 또는 secondary bus reset*. *VFIO pass-through* 시 필수.

## Replay·Replay Timer

*DLL 단계에서 NAK 받으면 replay buffer로 재전송*. *replay timer 만료* 시:

| 시나리오 | 효과 |
|---------|------|
| Replay 1~3회 성공 | 정상 — CE 로그만 |
| Replay 반복 실패 | *Replay Number Rollover* → UE 진입 |
| Replay timer 없음 | timeout으로 ERR_NONFATAL |

*Frequent CE (Replay)*는 *physical layer 문제 신호* — cable·connector·signal integrity 검토 필요.

## EEH — Enhanced Error Handling (POWER)

IBM POWER 아키텍처의 *추가 mechanism*. Linux 일반은 *AER + DPC*만, POWER는 *EEH로 PE (Partitionable Endpoint) 격리*. enterprise POWER server에서.

## 자주 하는 실수

### "CE는 무시해도 된다"

*개별 CE는 무시 OK*. *Frequent CE 누적*은 *physical layer 임박 fault 신호*. *server monitoring*에서 *CE rate threshold alarm* 필수.

### "AER 활성하면 자동 복구"

AER는 *report만*. *복구는 driver의 pci_error_handlers callback*. *driver 미지원 device*는 *fatal 시 OS panic* 가능.

### "DPC가 NIC도 reset한다"

DPC는 *downstream port의 link 차단*만. *NIC 자체 reset은 driver의 slot_reset callback*. DPC가 *containment*이고 *recovery는 별도*.

### "FLR은 모든 device 지원"

*FLR Capability bit* 확인 필요. *legacy device*는 FLR 미지원 — *secondary bus reset*만. *FLR 미지원 device가 같은 bus*면 *모두 reset 영향*.

### "Replay Number Rollover면 끝"

UE에 진입하지만 *driver·OS가 reset으로 복구* 가능. 다만 *link instability*가 *근본 원인*이라 *물리적 해결 (cable·card 교체)* 권장.

## 정리

- PCIe error는 *CE·UE-NF·UE-F* 3-tier. *각 계층 (Physical·DLL·TL)이 detect·report*.
- *AER (0x0001)*가 *상세 로깅·classification·Header Log*.
- *ERR_COR·ERR_NONFATAL·ERR_FATAL* Message가 *EP → RC*.
- *DPC (0x001D)*가 *fault 격리* — switch가 *link 차단*.
- Linux *pci_error_handlers*가 *driver-level 복구* callback.
- *Poisoned TLP*가 *bad data 전파 차단*.
- Reset: *FLR (function)·Hot Reset·Secondary Bus·PERST#*.
- *Frequent CE*가 *physical 임박 fault 신호*.

## 다음 편

[Ch 8: Data Link Layer — DLLP·ACK/NAK·Flow Control·FLIT Mode](/blog/embedded/hardware/pcie/chapter08-dllp)에서 *TLP 위에 신뢰성·credit-based flow control을 얹는 DLL*과 *Gen 6 FLIT mode*의 큰 변화를 본격적으로 분해합니다.

## 관련 항목

- [Ch 2: TLP](/blog/embedded/hardware/pcie/chapter02-tlp) — ECRC·Poisoned TLP
- [Ch 8: DLLP](/blog/embedded/hardware/pcie/chapter08-dllp) — Replay·NAK
- [Ch 14: Linux Operations (Hot-plug·AER·DPC)](/blog/embedded/hardware/pcie/chapter14-linux-operations)
- [Ch 16: Troubleshooting](/blog/embedded/hardware/pcie/chapter16-troubleshooting) — error 시나리오

## 시리즈 자료 출처 안내

본 글의 1차 자료·정책은 [Ch 1 footer](/blog/embedded/hardware/pcie/chapter01-fundamentals#시리즈-자료-출처-안내) 참고.
