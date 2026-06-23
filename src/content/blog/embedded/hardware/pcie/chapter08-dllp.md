---
title: "Ch 8: Data Link Layer — DLLP·ACK/NAK·Flow Control·FLIT Mode"
date: 2026-05-19T09:08:00
description: "PCIe DLL — ACK/NAK·replay buffer·credit-based flow control·LCRC·Gen 6+ FLIT mode."
series: "PCIe Deep Dive"
seriesOrder: 8
tags: [pcie, dllp, ack-nak, flow-control, flit-mode]
draft: false
---

## 한 줄 요약

> **"Data Link Layer는 *TLP를 무결성·신뢰성 있게 link 너머로 전달*하는 책임을 집니다."** — *DLLP (Data Link Layer Packet)*가 *ACK·NAK·Flow Control·Power Management*를 운반, *Replay Buffer*가 *NAK 시 재전송*, *Credit-based Flow Control*이 *수신측 buffer overrun 방지*. *Gen 6+의 FLIT mode*는 *가변 TLP를 256 byte 고정 FLIT*으로 바꾸며 *FEC 통합*했습니다.

[Ch 2 TLP](/blog/embedded/hardware/pcie/chapter02-tlp)에서 *TLP가 transaction layer의 packet*임을 봤습니다. DLL은 *그 TLP를 wrap*해서 *link error 복구·flow control·priority*를 책임집니다.

## DLLP 종류

| 종류 | 의미 |
|------|------|
| **ACK** | TLP 잘 받음 — sequence number까지 acknowledge |
| **NAK** | TLP 손상 — replay 요청 |
| **InitFC1·InitFC2** | Flow Control 초기화 |
| **UpdateFC** | Flow Control credit 갱신 |
| **PM** | Power Management (PM_Enter_L1, PM_Active_State_Request_L1 등) |
| **Vendor** | vendor-specific |

DLLP는 *짧음 — 6 byte (header + payload + 16-bit CRC)*. TLP보다 *훨씬 가벼움*.

## TLP Wrapping — DLL이 TLP에 추가하는 것

| 영역 | 크기 | 의미 |
|------|------|------|
| **STP/SDP** | 1 byte | Start frame (PHY가 처리) |
| **Sequence Number** | 2 byte | TLP 순번 — replay 시 사용 |
| TLP (TL이 만든 패킷) | N byte | header + payload + 선택 ECRC |
| **LCRC** | 4 byte | Link-layer CRC, 32-bit |
| **END** | 1 byte | End frame |

*DLL이 sequence number와 LCRC 추가*. 받는 측은 *LCRC 검증 → 통과면 ACK·실패면 NAK*.

## ACK/NAK 프로토콜

| 단계 | 동작 |
|------|------|
| 1 | Sender가 *TLP (seq=N) 보냄* + *replay buffer에 저장* |
| 2 | Receiver가 *LCRC 검증* |
| 3a | 성공 → *ACK (seq=N) 보냄* |
| 3b | 실패 → *NAK (마지막 정상 seq) 보냄* |
| 4 | Sender가 *ACK 받으면* replay buffer에서 *해당 TLP 제거* |
| 5 | Sender가 *NAK 받으면* replay buffer의 *NAK 이후 TLP 모두 재전송* |

*Sliding window*로 *여러 outstanding TLP 가능*. *Replay Timer 만료* 시도 *NAK 동작*.

## Replay Buffer

Sender는 *ACK 받기 전 TLP를 buffer에 보관*. Buffer 크기가 *throughput · latency 결정*:

| 항목 | 영향 |
|------|------|
| Buffer 부족 | Stall — *flow control은 통과해도 buffer 꽉 차서 transmission 중단* |
| Replay Timer 만료 | Timeout으로 *NAK 동작* |
| Replay Number Rollover | 너무 많은 replay → *UE 진입* (Ch 7) |

*Gen 4·5 link*는 buffer가 *수십 ~ 수백 KB*. *Gen 6 FLIT mode*는 다름 (아래).

## Credit-Based Flow Control

PCIe는 *수신측의 buffer overrun 방지*를 *credit*으로 관리:

| Credit 종류 | 의미 |
|-------------|------|
| Posted Header (PH) | Posted TLP의 header 받을 buffer |
| Posted Data (PD) | Posted TLP의 payload |
| Non-Posted Header (NPH) | Non-Posted TLP의 header |
| Non-Posted Data (NPD) | Non-Posted TLP의 payload |
| Completion Header (CplH) | Completion의 header |
| Completion Data (CplD) | Completion의 payload |

*수신측이 buffer 비우면 UpdateFC DLLP로 credit 증가 알림*. *Sender는 credit이 충분할 때만 TLP send*.

## FC Init — 링크 활성화 시

링크가 *L0에 도달*하면 *FC Initialization*:

| 단계 | 동작 |
|------|------|
| 1 | Sender가 *InitFC1 (Posted·Non-Posted·Completion 각각)* DLLP 보냄 |
| 2 | 자기 *buffer 크기* 광고 |
| 3 | 양단이 *InitFC2*로 confirm |
| 4 | Normal traffic 시작 |

FC Init 실패면 *link 활성 안 됨* — *LTSSM에 재진입*.

## LCRC vs ECRC

| CRC | 영역 | 위치 |
|-----|------|------|
| **LCRC** | DLL 단위 — TLP + Sequence Number | *항상* 적용 |
| **ECRC** | TL 단위 — TLP만 | *option*, AER로 enable |

LCRC는 *link 1 hop*. ECRC는 *RC↔EP end-to-end*. Switch가 *TLP transform*하지 않으니 *ECRC가 multi-hop 무결성* 보장.

## FLIT Mode — Gen 6+의 큰 변화

PCIe 6.0부터 *FLIT (Flow Control Unit) mode*가 *기존 가변 TLP 모델 교체*:

| 항목 | 기존 (Gen 5까지) | FLIT mode (Gen 6+) |
|------|-----------------|---------------------|
| Unit | 가변 TLP | *256 byte 고정 FLIT* |
| Error 검출 | LCRC (CRC-32) | *CRC + FEC* |
| Retry 단위 | TLP | *FLIT* |
| Latency | 가변 | *predictable* |
| FC | DLLP | *FLIT header에 포함* |

*FLIT mode는 PAM4·128b/130b의 한계에서 필요*. *CRC 단독 retry*가 *bit rate 높아질수록 비효율* — *FEC 통합*이 *retry rate 감소*. *256 byte 고정 unit*이 *processing pipeline 단순*.

## FLIT Mode 진입 협상

Link이 *Configuration*에서 *Gen 6 FLIT mode* 협상:

| 시나리오 | 결과 |
|---------|------|
| 양단 모두 Gen 6 FLIT 지원 | FLIT mode 활성 |
| 한쪽만 지원 | *Non-FLIT mode*로 fallback |
| FLIT mode 안정 | *기존 TLP 모델 deprecated* (Gen 7부터) |

CXL 3.x·UCIe 2.0이 *FLIT mode를 transport로 채택*. *PCIe·CXL·UCIe가 같은 FLIT* 위에서 동작.

## DLLP CRC

DLLP 자체도 *16-bit CRC*로 보호. *DLLP 손상*은 *재전송 없음* — *다음 DLLP가 정정*. UpdateFC는 *주기적으로* 보내져 *손실되어도 다음번에 회복*.

## 자주 하는 실수

### "ACK 안 받으면 영원히 stall"

*Replay Timer 만료* 시도 자동 *retransmission*. Timer가 *Gen·payload size 따라 결정*. timeout 동안은 *throughput 떨어짐*.

### "Flow Control = TLP 우선순위"

*FC는 buffer overrun 방지*만. *priority/QoS는 별도 TC (Traffic Class)*. TC는 *Virtual Channel*과 결합돼서 *high-priority traffic 보장*.

### "FLIT mode는 PCIe 7.0부터"

*Gen 6부터 도입*. Gen 6 device가 *NRZ legacy mode와 FLIT mode 둘 다 지원* — 협상 결과에 따라. Gen 7부터 *FLIT 전용 가능성 큼*.

### "LCRC 실패 자주면 cable 교체"

*Cable·connector·card 모두 의심*. *Replay rate counter* (`lspci -vv | grep "AER.*Cor"`)로 *frequent CE 확인*. *signal integrity 측정*도.

### "DLLP는 PCIe Cap에 안 보임"

DLLP는 *DLL 자체 protocol*. *Configuration Space에 별도 register 없음*. *Replay buffer 크기·credit은 vendor-specific*.

## 정리

- DLL이 *TLP에 Sequence Number + LCRC + STP/END* 추가해 *신뢰성·flow control* 책임.
- *DLLP*는 *ACK·NAK·FC·PM·Vendor*. 짧은 6 byte.
- *ACK/NAK 프로토콜*과 *Replay Buffer*가 *transient bit error 복구*.
- *Credit-based Flow Control*이 *수신 buffer overrun 방지* (P/NP/Cpl × Header/Data 6 종류).
- *LCRC (link)·ECRC (end-to-end)* — 보호 범위 다름.
- *Gen 6+ FLIT mode*가 *256 byte 고정 unit + FEC*로 *higher rate signal*에 대응.
- *CXL·UCIe가 같은 FLIT mode*를 transport로 공유.

## 다음 편

[Ch 9: Physical Layer — LTSSM·Equalization·Encoding](/blog/embedded/hardware/pcie/chapter09-physical-layer)에서 *link training의 모든 state*와 *PAM4·equalization·SKP*를 본격적으로 분해합니다.

## 관련 항목

- [Ch 2: TLP](/blog/embedded/hardware/pcie/chapter02-tlp)
- [Ch 7: Error Handling](/blog/embedded/hardware/pcie/chapter07-error-handling) — Replay Number Rollover
- [Ch 9: Physical Layer](/blog/embedded/hardware/pcie/chapter09-physical-layer)
- [CXL Internals Ch 9: Flit Format](/blog/embedded/hardware/cxl/chapter09-flit-format) — 같은 FLIT 표준

## 시리즈 자료 출처 안내

본 글의 1차 자료·정책은 [Ch 1 footer](/blog/embedded/hardware/pcie/chapter01-fundamentals#시리즈-자료-출처-안내) 참고.
