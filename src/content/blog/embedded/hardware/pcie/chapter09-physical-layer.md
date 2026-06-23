---
title: "Ch 9: Physical Layer — LTSSM·Equalization·SerDes"
date: 2026-05-19T09:09:00
description: "PCIe Physical Layer — LTSSM 11 state·link training timeline·4-phase equalization·TS1/TS2·SKP·encoding 진화."
series: "PCIe Deep Dive"
seriesOrder: 9
tags: [pcie, ltssm, physical-layer, equalization, serdes, pam4]
draft: false
---

## 한 줄 요약

> **"Physical Layer는 *lane·SerDes·LTSSM*으로 *bit signal을 신뢰성 있게 lane 양단에 전달*합니다."** — *LTSSM (Link Training and Status State Machine)*이 *Detect → Polling → Configuration → L0*의 *link 활성화 절차*. *Equalization 4 phase*가 *Gen 3+의 link 안정성*. *TS1·TS2 ordered set*이 *link 정보 교환*. Gen 6부터 *PAM4 + FEC*로 *bit rate를 2배로*.

[Ch 1 Fundamentals](/blog/embedded/hardware/pcie/chapter01-fundamentals)에서 *Gen 6 PAM4·encoding 진화*를 봤습니다. 이 장은 *그 신호가 lane에서 어떻게 trained·equalized·encoded*되는지 본격적으로 분해합니다.

## LTSSM — 11 State 머신

| State | 의미 |
|-------|------|
| **Detect** | Lane에 *receiver 존재 감지*. Reset 후 첫 state |
| **Polling.Active** | TS1 ordered set 교환, link rate 협상 |
| **Polling.Compliance** | 신호 무결성 test (제조 검사용) |
| **Configuration** | Lane reversal·polarity·link width 결정, FC Init |
| **Recovery** | 일시적 에러·rate 변경 시 진입, equalization 가능 |
| **L0** | Active — normal data transfer |
| **L0s** | Lower power, *송신측 idle* |
| **L1** | Standby, *양방향 idle* |
| **L2** | Sleep, 주 전원 off |
| **Hot Reset** | Software-trigger reset |
| **Disabled** | 명시적 disable |

LTSSM이 *PCIe device의 link 생명 주기*를 모두 표현. *Recovery는 normal 동작 중 자주 진입* — 일시적 noise 등에서 *retraining*.

## Link Training Timeline

Reset 후 *L0 도달*까지:

| 단계 | LTSSM | 동작 |
|------|-------|------|
| 0 | Detect | Receiver detect — *lane에 termination 감지* |
| 1 | Polling.Active | *TS1 ordered set 교환* — link 양단 식별 |
| 2 | Polling.Configuration | *link width·rate 협상* |
| 3 | Configuration | *Lane numbering·reversal·polarity inversion 결정* |
| 4 | Recovery (option) | *Equalization* (Gen 3+) |
| 5 | L0 | Active — DLL이 FC Init |

전체 *수십 ms* 일반. Gen 5 이상은 *equalization 추가 시간*.

## TS1·TS2 Ordered Set

*16-symbol 길이*의 *training sequence*:

| 영역 | 의미 |
|------|------|
| Symbol 0 | Comma (COM) — sync용 |
| Symbol 1 | Link Number — lane이 속한 link |
| Symbol 2 | Lane Number |
| Symbol 3 | N_FTS — FTS(Fast Training Sequence) 수 |
| Symbol 4 | Data Rate Identifier — 지원 rate (Gen 1~7) |
| Symbol 5 | Training Control — equalization request 등 |
| Symbol 6~15 | TS identifier (TS1 또는 TS2 패턴) |

TS1·TS2 *반복 교환*으로 *link 양단이 서로 인식*. *TS2가 final agreement*.

## Equalization — Phase 0~3 (Gen 3+)

Gen 3 이상의 *고속 신호*는 *PCB·card·connector의 reflection·loss*를 *equalizer로 보상*:

| Phase | 동작 |
|-------|------|
| Phase 0 | RX detect 후 *기본 preset 적용* |
| Phase 1 | *Initial coefficients exchange* — 양단이 preset 정보 교환 |
| Phase 2 | *TX coefficient sweep* — DSP가 *best EQ 검색* |
| Phase 3 | *RX feedback*으로 *final coefficient 결정* |

Equalization 실패는 *Gen 5·6 보드에서 흔한 문제* — *signal integrity 측정·preset 조정* 필요.

## Lane Reversal·Polarity Inversion

물리적 lane 배선 실수를 *softwarefree 보정*:

| 항목 | 의미 |
|------|------|
| **Lane Reversal** | Lane 번호 *역순* — boards layout 단순화 |
| **Polarity Inversion** | Differential pair *극성 반전* — wiring 실수 보정 |

*Configuration state에서 자동 협상*. *PCB 디자이너*가 *layout 자유도 확보*.

## SKP Ordered Set

*Clock compensation*용. 양단 *PPM 차이*로 *bit 누적*되면 *SKP로 조정*:

| 동작 | 의미 |
|------|------|
| 주기적 SKP 삽입 | *수천 symbol마다 SKP ordered set* |
| Receiver가 SKP 흡수·추가 | *clock domain 보정* |
| Gen 6 FLIT | *SKP가 FLIT 일부* — 별도 처리 |

*Gen 1·2의 8b/10b*는 *DC balance를 위해 SKP 빈도 높음*. *Gen 6 PAM4*는 *다른 mechanism*.

## Encoding 진화 (재확인)

| Generation | Encoding | Overhead | 특징 |
|-----------|----------|----------|------|
| Gen 1·2 | 8b/10b | 20% | DC balance 쉬움 |
| Gen 3·4·5 | 128b/130b | 1.5% | Scrambler 필수 |
| Gen 6·7 | PAM4 + FEC | 1.5% + FEC overhead | *4-level signaling*, FEC로 noise 회복 |

PAM4는 *symbol rate 절반에 bit rate 2배* — *signal integrity 한계 회피*. 다만 *noise margin 1/3* → *FEC 필수*.

## Recovery State

L0에서 *transient error*나 *rate change* 발생 시 *Recovery 진입*:

| 시나리오 | 동작 |
|---------|------|
| Frequent LCRC error | Recovery → re-equalization |
| User가 rate change request | Recovery에서 *new rate로 training* |
| ASPM L1 exit | L1 → Recovery → L0 (간단한 path) |

*Recovery 진입은 정상 동작 일부*. `lspci -vv | grep "LnkSta:"` 의 *RT (Recovery Time)*가 *얼마나 자주 진입*했는지 확인.

## FTS — Fast Training Sequence

*L0s exit 시 빠른 복귀*용:

| 시나리오 | 동작 |
|---------|------|
| L0s 진입 시 | sender가 *N_FTS 개수만큼 FTS 보낼 약속* 알림 |
| L0s exit 시 | sender가 *FTS 보내고 normal traffic* 시작 |

FTS 개수는 *Gen·implementation 따라 다름* — *50~500 FTS* 일반.

## LTSSM 디버깅

`lspci -vv`의 LnkCap·LnkSta·LnkCtl로 *현재 LTSSM 상태 추적 어려움* — *vendor-specific debug register* 필요. 일부 *protocol analyzer (Teledyne LeCroy 등)*가 *LTSSM 상태 실시간 capture*.

Linux에는 *pcie_aer.c* 외에 *별도 LTSSM trace 없음*. *드라이버 측 debug log* + *protocol analyzer*가 일반적 접근.

## 자주 하는 실수

### "Link Training이 완료되면 끝"

L0 진입 후도 *Recovery 자주 진입*. *frequent Recovery*는 *signal integrity 문제* 신호.

### "Gen 5 보드에서 Gen 4로 동작하면 호환성 OK"

*Equalization 실패*로 *rate downgrade*된 결과일 수 있음. *card·boards·cable 신호 무결성 점검* 필요.

### "Polarity Inversion이 자동이라 wiring 자유"

*Differential pair 내부 극성*만 보정. *lane 자체의 wiring 실수*는 *Lane Reversal*. *board 설계 시 명시*가 권장.

### "SKP이 latency 영향"

*수 ns 수준*. *측정 가능*하지만 *applications에 영향 적음*. *high-precision timing*만 의식.

### "PAM4면 무조건 빠르다"

*Gen 6 PAM4 = symbol rate 32 GBaud, bit rate 64 Gbps/lane*. *NRZ Gen 5의 32 GT/s*보다 *bit rate 2배*지만 *symbol rate 같음*. 즉 *PCB는 같은 EQ*가 *bit는 2배*.

## 정리

- *Physical Layer*가 *lane·SerDes·LTSSM*으로 *signal 전달*.
- *LTSSM 11 state*: Detect → Polling → Configuration → L0, 그 위에 L0s·L1·L2·Recovery·Disabled·Hot Reset.
- *Link Training* — TS1·TS2 ordered set + Equalization 4 phase로 *link 활성*.
- *Lane Reversal·Polarity Inversion*이 *PCB layout 자유도*.
- *SKP*가 *clock PPM drift 보정*.
- *Encoding* 진화: 8b/10b → 128b/130b → PAM4 + FEC.
- *Recovery state*가 *normal 동작 중 transient error 복구*.
- *FTS*가 *L0s exit 빠르게*.

## 다음 편

[Ch 10: Linux PCI Basics — enumeration·driver model](/blog/embedded/hardware/pcie/chapter10-linux-basics)에서 *Linux kernel이 PCIe device를 어떻게 인식·driver 매칭·resource 할당*하는지 본격적으로 분해합니다.

## 관련 항목

- [Ch 1: PCIe Fundamentals](/blog/embedded/hardware/pcie/chapter01-fundamentals) — Gen 진화·encoding
- [Ch 6: Power Management](/blog/embedded/hardware/pcie/chapter06-power-management) — LTSSM·L states
- [Ch 8: DLLP](/blog/embedded/hardware/pcie/chapter08-dllp) — FC Init이 L0 도달 후

## 시리즈 자료 출처 안내

본 글의 1차 자료·정책은 [Ch 1 footer](/blog/embedded/hardware/pcie/chapter01-fundamentals#시리즈-자료-출처-안내) 참고.
