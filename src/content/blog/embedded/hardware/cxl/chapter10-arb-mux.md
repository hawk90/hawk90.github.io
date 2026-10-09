---
title: "Ch 10: ARB/MUX — 세 프로토콜의 PHY 다중화"
slug: "embedded/hardware/cxl/chapter10-arb-mux"
date: 2026-05-16T09:10:00
description: "같은 PHY에 CXL.io·CXL.cache·CXL.mem을 시분할로 흘리는 layer."
series: "CXL 4.0 Internals"
seriesOrder: 10
tags: [cxl, arb-mux, vlsm, almp, multiplexing]
draft: false
topics: ["embedded", "embedded/hardware"]
---

## 한 줄 요약

> **"ARB/MUX는 *CXL.io 링크 계층·CXL.cachemem 링크 계층*과 *Flex Bus Physical Layer* 사이에서 *flit 단위로 두 쪽 트래픽을 섞는* CXL 고유 계층입니다."** — 링크 계층마다 *vLSM*(virtual Link State Machine)을 두고, 전원 상태 전환은 *ALMP*(ARB/MUX Link Management Packet)로 상대와 맞춥니다. 중재 정책 자체는 spec이 정하지 않고 구현에 맡깁니다.

[Ch 9](/blog/embedded/hardware/cxl/chapter09-flit-format)에서 *flit 단위 데이터 전송*을 봤습니다. 이 장은 *어느 링크 계층의 flit을 언제 보낼지* 정하는 *ARB/MUX*입니다.

## ARB/MUX의 위치

CXL 3.1 spec의 Flex Bus 계층 구조(§5.0, Figure 5-1):

| 계층 | 역할 |
|-------|------|
| Transaction Layer | CXL.io / CXL.cache·CXL.mem 메시지 |
| Link Layer | CXL.io 링크 계층, CXL.cachemem 링크 계층 — 각자 flit 구성 |
| **ARB/MUX** | **두 링크 계층의 flit을 중재·다중화, vLSM·ALMP 처리** |
| Physical Layer | Flex Bus PHY |

송신 쪽에서 ARB/MUX는 링크 계층들의 요청을 중재해 데이터를 다중화합니다. 링크 계층들의 전원 상태 요청을 하나로 모아 Physical Layer에 넘기고, 상대에게는 ALMP로 알립니다. 수신 쪽에서는 flit이 어느 프로토콜인지 보고 해당 링크 계층으로 넘깁니다.

*PCIe 모드*로 링크가 올라오면 ARB/MUX는 우회되고 ALMP도 만들지 않습니다(§5.0, §5.2.1).

## Flit 경계 단위 중재

ARB/MUX는 slot을 채우지 않습니다. slot 구성은 링크 계층 몫이고, ARB/MUX는 *완성된 flit 단위*로 어느 쪽을 보낼지 고릅니다. 프로토콜 사이 interleave는 68B Flit mode에서 528-bit flit 경계, 256B Flit mode에서 256B flit 경계로 일어납니다(§5.3).

## 중재 정책 — 구현 정의 + 가중치 레지스터

spec은 중재 정책을 *구현에 맡깁니다*. 상위 프로토콜의 타이밍 요구만 만족하면 됩니다(§5.3). 대신 *CXL.io* 쪽과 *CXL.cache + CXL.mem* 쪽의 상대 가중치를 프로그래밍할 방법은 있어야 합니다.

그 방법이 Component Register의 ARB/MUX 영역(Offset E000h부터 1 KB)에 있는 두 레지스터입니다(§8.2.5).

| 레지스터 | Offset | 필드 |
|---------|--------|------|
| ARB/MUX Arbitration Control Register for CXL.io | 180h | bit 7:4 — CXL.io Weighted Round Robin 가중치 |
| ARB/MUX Arbitration Control Register for CXL.cache and CXL.mem | 1C0h | bit 7:4 — CXL.cache·CXL.mem Weighted Round Robin 가중치 |

두 필드 모두 기본값은 0h입니다. 그러니 "snoop이 1순위, CXL.io가 꼴찌" 같은 고정 우선순위는 spec에 없습니다. 중재는 *CXL.io 대 CXL.cachemem*의 두 갈래 사이에서 일어나고, 그 비율은 이 가중치와 구현이 정합니다.

## vLSM — Virtual Link State Machine

ARB/MUX는 *링크 계층 인터페이스마다* vLSM을 둡니다(§5.1, Table 5-1).

| vLSM 상태 | 의미 |
|------------|------|
| Reset | 전원 인가 직후, 초기화 |
| Active | 정상 동작 |
| Active.PMNAK | PM 진입 ALMP 협상이 거절된 Active 하위 상태. Upstream Port·256B Flit mode 전용 |
| L1.0 | 절전. Retrain을 거쳐 Active 복귀. PCIe L1에 대응 |
| L1.1~L1.3 | 예약 |
| DAPM | 허용되는 가장 깊은 PM 상태 요청. L1 하위 상태로 결정됨 |
| SLEEP_L2 | 절전. Active로 가려면 Reset을 거쳐야 함 |
| LinkReset | 리셋 전파 |
| LinkError | 링크 복구로 못 고치는 오류 |
| LinkDisable | 소프트웨어가 링크를 끈 상태 |
| Retrain | Active로 가는 과도 상태 |

PM 상태와 Retrain은 인터페이스마다 다를 수 있습니다. LinkReset·LinkDisable·LinkError는 모든 링크 계층에 동기화됩니다.

ARB/MUX는 vLSM들의 상태를 *하나의 요청*으로 합쳐 Physical Layer에 보냅니다(Table 5-2). 예를 들어 한쪽 vLSM이 L1.0이고 다른 쪽이 Active면 결과는 Active입니다. 한 링크 계층만 쉬어도 물리 링크는 깨어 있어야 하기 때문입니다.

## ALMP — ARB/MUX Link Management Packet

ALMP는 ARB/MUX끼리 주고받는 제어 패킷입니다(§5.2).

| 용도 | 내용 |
|------|------|
| State Request / State Status | vLSM의 Active 진입, PM(L1·L2) 진입 요청과 응답 (§5.1.2.4, §5.1.2.6) |
| Status Synchronization | 링크 복구 뒤 양 끝 vLSM 상태 맞추기. *68B Flit mode 전용* (§5.1.2.3) |
| L0p 폭 협상 | 256B Flit mode에서 L0p 링크 폭 협상 (§5.1.2.5) |

256B Flit mode에서는 replay buffer가 Physical Layer에 있어, ALMP도 FEC·CRC 보호를 받고 replay 대상이 됩니다. 그래서 ALMP가 상대 ARB/MUX에 오류 없이 도착함이 보장되고, 68B의 Status Synchronization이 필요 없습니다.

참고로 *어떤 프로토콜을 켤지*(CXL.io·cache·mem) 정하는 건 ALMP가 아닙니다. Physical Layer가 링크 트레이닝 중 modified TS1/TS2 Ordered Set으로 하는 *alternate protocol negotiation* 몫입니다(§6.4.1).

## L0p — 일부 lane만 쓰는 Active

CXL 3.1 spec은 *256B Flit mode*에서 PCIe Base Spec의 L0p를 지원합니다(§5.1.2.5). 차이는 협상 수단입니다. PCIe는 Link Management DLLP를 쓰지만 CXL은 *ALMP*를 씁니다.

- CXL.io와 CXL.cachemem 링크 계층이 각자 원하는 폭을 ARB/MUX에 알립니다.
- ARB/MUX는 이를 모아 물리 링크 폭을 정합니다. 우선 요청(예: thermal throttling)이 아니면 *둘 중 큰 폭 이상*이어야 합니다.
- 예: 두 계층이 각각 x2를 요청하면, ARB/MUX는 합쳐서 x4를 협상할 수 있습니다. 집계 알고리즘은 구현 정의입니다.

L0p는 CXL 4.0에서 새로 생긴 것이 아닙니다. CXL 3.1 spec에 이미 있습니다.

## 오류 보고 레지스터

256B Flit mode에서 PM Request ALMP나 L0p Request ALMP가 응답을 못 받으면 ARB/MUX가 타임아웃을 기록합니다(§8.2.5.1~8.2.5.3).

| 레지스터 | Offset | 내용 |
|---------|--------|------|
| ARB/MUX PM Timeout Control | 00h | 타임아웃 enable, 값(00b = 1 ms) |
| ARB/MUX Uncorrectable Error Status | 04h | PM Timeout Error, L0p Timeout Error |
| ARB/MUX Uncorrectable Error Mask | 08h | 마스크 해제 시 Root Port의 Internal Uncorrected Error로 보고 |

## Linux에서 보이는 것

mainline 커널의 `drivers/cxl/`에는 ARB/MUX 레지스터, vLSM, ALMP를 다루는 코드가 없습니다(2026-10 기준 소스 검색). `cxl monitor`(ndctl)는 커널이 내보내는 CXL *trace event*를 JSON으로 보여 주는 도구라 vLSM 상태를 보여 주지 않습니다. ARB/MUX 동작을 보려면 플랫폼·디바이스 벤더 도구나 프로토콜 분석기가 필요합니다.

## 자주 하는 실수

### "ARB/MUX가 메시지를 slot에 채운다"

*아닙니다*. slot 구성은 링크 계층이 하고, ARB/MUX는 완성된 flit 단위로 CXL.io와 CXL.cachemem 사이를 고릅니다(§5.3).

### "spec이 프로토콜 우선순위를 정해 둔다"

*아닙니다*. 정책은 구현 정의이고, spec이 요구하는 건 CXL.io 대 CXL.cache+mem 가중치를 설정할 수단입니다(§5.3, §8.2.5.4~5).

### "ARB/MUX Bypass는 협상을 줄이는 고속 모드다"

*아닙니다*. Bypass는 링크가 *PCIe 모드*로 동작할 때 ARB/MUX가 ALMP 생성을 끄는 것입니다(§5.2.1).

### "vLSM은 CXL.io·cache·mem 세 개"

spec의 vLSM 결정 표는 두 개(vLSM[0]·vLSM[1])를 놓고 설명하고, L0p 규칙도 *CXL.io 링크 계층*과 *CXL.cachemem 링크 계층* 둘을 기준으로 씁니다.

## 정리

- *ARB/MUX*는 *링크 계층과 Physical Layer 사이*에서 CXL.io와 CXL.cachemem의 flit을 다중화합니다. PCIe 모드에서는 우회됩니다.
- 중재 정책은 *구현 정의*. CXL.io와 CXL.cache+mem의 *WRR 가중치 레지스터*(Offset 180h·1C0h)가 있습니다.
- *vLSM* 상태: Reset·Active·L1.x·DAPM·SLEEP_L2·LinkReset·LinkError·LinkDisable·Retrain.
- *ALMP*는 vLSM 상태 요청·응답, 68B의 상태 동기화, 256B의 L0p 폭 협상에 씁니다.
- *L0p*는 CXL 3.1에 이미 있는 256B Flit mode 기능. 폭 협상을 DLLP 대신 ALMP로 합니다.

## 다음 편

[Ch 11: Linux drivers/cxl/ 분석 — Mainline kernel CXL 구현](/blog/embedded/hardware/cxl/chapter11-linux-driver)에서 *Linux 6.x의 CXL subsystem 코드 구조*와 *probe 흐름*을 본격적으로 분해합니다.

## 관련 항목

- [Ch 5: CXL 4.0의 핵심 새 기능](/blog/embedded/hardware/cxl/chapter05-cxl-4-features)
- [Ch 9: Flit Format](/blog/embedded/hardware/cxl/chapter09-flit-format)
- [Ch 11: Linux drivers/cxl/ 분석](/blog/embedded/hardware/cxl/chapter11-linux-driver)

## 시리즈 자료 출처 안내

본 글은 *CXL Consortium·PCI-SIG 공개 자료*를 1차 자료로 합니다. CXL 4.0 Specification은 *§ navigation aid*로만 인용. 자세한 spec 인용 정책은 [Ch 1 footer](/blog/embedded/hardware/cxl/chapter01-cxl-position#시리즈-자료-출처-안내) 참고.
