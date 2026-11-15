---
title: "Ch 9: Physical Layer — LTSSM·Equalization·SerDes"
slug: "embedded/hardware/pcie/chapter09-physical-layer"
date: 2026-05-19T09:09:00
description: "PCIe link training의 상태·ordered set·equalization과 Linux에서 관찰할 수 있는 범위를 구분합니다."
series: "PCIe Deep Dive"
seriesOrder: 9
tags: [pcie, ltssm, physical-layer, equalization, serdes, pam4]
draft: false
topics: ["embedded", "embedded/hardware"]
---

## 한 줄 요약

> **"Physical Layer는 *lane·SerDes·LTSSM*으로 *bit signal을 신뢰성 있게 lane 양단에 전달*합니다."** — *LTSSM (Link Training and Status State Machine)*이 *Detect → Polling → Configuration → L0*의 *link 활성화 절차*. *Equalization 4 phase*가 *Gen 3+의 link 안정성*. *TS1·TS2 ordered set*이 *link 정보 교환*. Gen 6부터 *PAM4 + FEC*로 *bit rate를 2배로*.

[Ch 1 Fundamentals](/blog/embedded/hardware/pcie/chapter01-fundamentals)에서 *Gen 6 PAM4·encoding 진화*를 봤습니다. 이 장은 *그 신호가 lane에서 어떻게 trained·equalized·encoded*되는지 본격적으로 분해합니다.

이 글은 기본 NRZ training 흐름의 길잡이이며, 모든 세대의 LTSSM substate를 열거한 규범표가 아닙니다. [PCI-SIG FAQ](https://pcisig.com/faq?keys=LTSSM)의 Polling·Recovery 설명, [AMD PG239 Equalization Sequences](https://docs.amd.com/r/en-US/pg239-pcie-phy/Equalization-Sequences), [pciutils v3.13.0의 Link Status 출력](https://github.com/pciutils/pciutils/blob/v3.13.0/ls-caps.c)을 대조했습니다. 실제 PHY 측정이나 analyzer capture는 하지 않았습니다.

## LTSSM의 주요 상태

| State | 의미 |
|-------|------|
| **Detect** | Lane에 *receiver 존재 감지*. Reset 후 첫 state |
| **Polling.Active** | TS1 ordered set 교환, link rate 협상 |
| **Polling.Compliance** | 규정된 compliance pattern 전송 |
| **Loopback** | 시험용 loopback 동작 |
| **Configuration** | Link·lane 번호와 width 구성. DLL의 FC initialization과 상태 기계를 구분 |
| **Recovery** | 일시적 에러·rate 변경 시 진입, equalization 가능 |
| **L0** | Active — normal data transfer |
| **L0s** | Lower power, *송신측 idle* |
| **L1** | Standby, *양방향 idle* |
| **L2** | Sleep, 주 전원 off |
| **Hot Reset** | Software-trigger reset |
| **Disabled** | 명시적 disable |

LTSSM이 *PCIe device의 link 생명 주기*를 모두 표현. Recovery는 속도 변경·재훈련 등에서 진입할 수 있음 — 일시적 noise 등에서 *retraining*.

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

완료 시간은 장치·속도·재시도에 따라 측정해야 합니다. L0 도달과 DLL 준비·OS enumeration 완료도 같은 사건이 아닙니다.

## TS1·TS2 Ordered Set

아래는 8b/10b TS의 기본 field 예입니다. 다른 encoding과 PAM4 training에 그대로 적용하지 않습니다.

| 영역 | 의미 |
|------|------|
| Symbol 0 | Comma (COM) — sync용 |
| Symbol 1 | Link Number — lane이 속한 link |
| Symbol 2 | Lane Number |
| Symbol 3 | N_FTS — FTS(Fast Training Sequence) 수 |
| Symbol 4 | Data Rate Identifier — 해당 판에서 정의한 지원 속도 정보 |
| Symbol 5 | Training Control — equalization request 등 |
| Symbol 6~15 | TS identifier (TS1 또는 TS2 패턴) |

TS1·TS2 *반복 교환*으로 *link 양단이 서로 인식*. *TS2가 final agreement*.

## Equalization — Phase 0~3 (Gen 3+)

Gen 3 이상의 *고속 신호*는 *PCB·card·connector의 reflection·loss*를 *equalizer로 보상*:

| Phase | 동작 |
|-------|------|
| Phase 0 | 초기 transmitter preset 등의 설정 |
| Phase 1 | 초기 설정과 고속 동작의 기본 조건 확인 |
| Phase 2 | Upstream Port가 Downstream Port transmitter 설정을 요청·평가하는 방향 |
| Phase 3 | 반대 방향의 transmitter 설정을 요청·평가 |

Equalization 실패는 *Gen 5·6 보드에서 흔한 문제* — *signal integrity 측정·preset 조정* 필요.

## Lane Reversal·Polarity Inversion

허용된 배선 변형을 다루는 기능입니다. 임의의 lane 뒤섞기나 단선까지 자동으로 복구하지는 않습니다.

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
| Flit Mode | 해당 속도·clock 구조의 SKP 절차를 별도로 확인 |

SKP의 목적은 clock 차이 보상입니다. 8b/10b의 DC balance와 혼동하면 안 됩니다. 삽입·제거 빈도는 mode·clock 조건과 해당 규격으로 확인합니다.

## Encoding 진화 (재확인)

| Generation | Encoding | Overhead | 특징 |
|-----------|----------|----------|------|
| Gen 1·2 | 8b/10b | 20% | DC balance 쉬움 |
| Gen 3·4·5 | 128b/130b | 1.5% | Scrambler 필수 |
| Gen 6·7 | PAM4 + FEC | Flit·CRC·FEC 비용을 별도 계산 | *4-level signaling*, FEC로 noise 회복 |

PAM4는 *symbol rate 절반에 bit rate 2배* — *signal integrity 한계 회피*. 다만 *noise margin 1/3* → *FEC 필수*.

## Recovery State

L0에서 *transient error*나 *rate change* 발생 시 *Recovery 진입*:

| 시나리오 | 동작 |
|---------|------|
| Frequent LCRC error | Recovery → re-equalization |
| User가 rate change request | Recovery에서 *new rate로 training* |
| ASPM L1 exit | L1 → Recovery → L0 (간단한 path) |

*Recovery 진입은 정상 동작 일부*. `lspci`의 LnkSta에는 Recovery Time 또는 진입 횟수라는 RT counter가 없습니다. 현재 속도·폭·Train 등의 bit만으로 전체 LTSSM 이력이나 반복 횟수를 복원할 수 없습니다.

## FTS — Fast Training Sequence

*L0s exit 시 빠른 복귀*용:

| 시나리오 | 동작 |
|---------|------|
| L0s 진입 시 | sender가 *N_FTS 개수만큼 FTS 보낼 약속* 알림 |
| L0s exit 시 | sender가 *FTS 보내고 normal traffic* 시작 |

FTS 개수는 *Gen·implementation 따라 다름* — 장치와 협상된 값을 확인해야 합니다.

## LTSSM 디버깅

`lspci -vv`의 LnkCap·LnkSta·LnkCtl로 *현재 LTSSM 상태 추적 어려움* — *vendor-specific debug register* 필요. 일부 *protocol analyzer (Teledyne LeCroy 등)*가 *LTSSM 상태 실시간 capture*.

이 장에서 확인한 표준 Link Status 출력은 전체 LTSSM trace가 아닙니다. 특정 driver·vendor의 추가 기능은 별도로 확인해야 합니다. *드라이버 측 debug log* + *protocol analyzer*가 일반적 접근.

## 자주 하는 실수

### "Link Training이 완료되면 끝"

L0 진입 후도 *Recovery 자주 진입*. *frequent Recovery*는 *signal integrity 문제* 신호.

### "Gen 5 보드에서 Gen 4로 동작하면 호환성 OK"

*Equalization 실패*로 *rate downgrade*된 결과일 수 있음. *card·boards·cable 신호 무결성 점검* 필요.

### "Polarity Inversion이 자동이라 wiring 자유"

*Differential pair 내부 극성*만 보정. *lane 자체의 wiring 실수*는 *Lane Reversal*. *board 설계 시 명시*가 권장.

### "SKP이 latency 영향"

SKP의 영향은 실제 속도·폭·clock 구조와 workload에서 판단합니다. 측정 없이 고정된 ns 값이나 애플리케이션 영향의 크기를 단정하지 않습니다.

### "PAM4면 무조건 빠르다"

*Gen 6 PAM4 = symbol rate 32 GBaud, bit rate 64 Gbps/lane*. *NRZ Gen 5의 32 GT/s*보다 *bit rate 2배*지만 *symbol rate 같음*. 같은 symbol rate라도 PAM4의 여러 전압 수준과 오류율 요구 때문에 동일한 EQ·채널 조건으로 충분하다고 할 수는 없습니다.

## 정리

- *Physical Layer*가 *lane·SerDes·LTSSM*으로 *signal 전달*.
- 주요 LTSSM 상태: Detect → Polling → Configuration → L0, 그 위에 L0s·L1·L2·Recovery·Disabled·Hot Reset.
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
