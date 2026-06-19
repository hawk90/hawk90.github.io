---
title: "Ch 9: Flit Format — 68B vs 256B vs Latency-Optimized"
date: 2026-05-16T09:09:00
description: "Flit 단위 구조의 세대 별 변화."
series: "CXL 4.0 Internals"
seriesOrder: 9
tags: [cxl, flit, 68b-flit, 256b-flit, fec]
draft: false
---

## 한 줄 요약

> **"Flit은 *CXL 메시지의 데이터 전송 단위*이며, *세 가지 모드*를 가집니다."** — *68B flit* (CXL 1.1·2.0, PCIe 5.0 baseline), *256B Standard flit* (3.0+, PCIe 6.0/7.0, throughput 위주), *256B Latency-Optimized flit* (3.0+, 작은 메시지 빠르게). CXL 4.0은 *Flit 구조를 3.0과 동일하게 유지*해 *backward compat을 보장*했습니다.

[Ch 8](/blog/embedded/hardware/cxl/chapter08-cxl-mem)에서 *CXL.mem 메시지의 의미*를 봤습니다. 이 장은 *그 메시지가 실제로 케이블 위를 어떻게 흐르는지* — *flit*입니다.

## Flit이란

*Flit (Flow Control Unit)*은 *CXL 링크 위 데이터 전송의 최소 단위*입니다.

| 항목 | 의미 |
|------|------|
| 단위 | 한 transmission 단위 (PHY 위에서) |
| 내용 | message slot들 + CRC + (FEC) |
| 크기 | 세대별 다름 |
| 정렬 | flit boundary로 message 정렬 |

*패킷 (packet)*과 다른 개념. PCIe TLP·DLLP는 *가변 크기*이지만 flit은 *고정 크기*입니다. PCIe 6.0부터 PCIe 자체도 flit-based로 전환됐고, CXL도 같은 흐름을 따릅니다.

## 세대별 Flit 모드

| 세대 | Flit 모드 | 크기 | 특징 |
|------|----------|------|------|
| CXL 1.1·2.0 | 68B Flit | 528-bit (66 B) | PCIe 5.0 baseline |
| CXL 3.0+ | 256B Standard Flit | 256 B | throughput 위주, PCIe 6.0/7.0 |
| CXL 3.0+ | 256B Latency-Optimized Flit | 256 B | 작은 메시지 빠르게 |

CXL 4.0은 *flit 모드 변경 없음* — 3.0의 *256B 두 가지 모드*를 그대로 사용. *128 GT/s에서 동일 flit 구조 적용*.

## 68B Flit (CXL 1.1·2.0)

PCIe 5.0 위 32 GT/s에서 동작하는 *기존 flit*입니다.

| 항목 | 값 |
|------|-----|
| 크기 | 528-bit (66 B raw + 2 B framing) |
| CRC | 16-bit |
| Protocol payload | CXL.io/cache/mem 메시지 |
| FEC | 없음 |

*PCIe 5.0의 NRZ 신호 무결성*이 *FEC 없이도 BER (Bit Error Rate)*가 *낮습니다*. 따라서 *CRC만으로 신뢰성 유지*. *retry 메커니즘*은 *LLR (Link Layer Retry)*가 담당.

68B flit은 *작은 단위*라 *latency 우수*. CXL 1.1·2.0의 *기본 모드*입니다.

## 256B Standard Flit (CXL 3.0+)

PCIe 6.0/7.0 위 64/128 GT/s에서 동작하는 *throughput 최적 flit*입니다.

| 항목 | 값 |
|------|-----|
| 크기 | 256 B |
| FEC | 적용 (3-way interleaved Single Symbol Correction Reed-Solomon) |
| CRC | 적용 |
| Symbol time | PCIe 6.0 PAM4 |

*PAM4 신호*는 *NRZ 대비 BER이 더 높음* (eye 높이 1/3). 따라서 *FEC 추가*해 *링크 신뢰성*을 보강. *FEC가 추가 latency*를 가져오지만 *throughput이 두 배가 되는 보상*.

256B Standard flit은 *큰 payload, 많은 message slot*을 가집니다. *throughput 위주 워크로드*에 적합.

## 256B Latency-Optimized Flit (CXL 3.0+)

Standard flit의 *latency 페널티를 회피*하기 위한 모드:

| 항목 | Standard | Latency-Optimized |
|------|---------|------------------|
| Size | 256 B | 256 B |
| Layout | message 다수 packing | message 적게 packing, 빠른 transmit |
| FEC | 같음 | 같음 |
| Use case | bulk transfer | control message·small payload |

*Latency-Optimized*는 *flit 가득 차길 기다리지 않고* *빠르게 전송*. *작은 control message*에 효과적.

| 모드 | Throughput | Latency |
|------|-----------|---------|
| Standard | 높음 | 보통 |
| Latency-Optimized | 보통 | 낮음 |

*동적 전환*은 일반적으로 *워크로드 phase 의존*. 컴파일 시간이나 device firmware가 결정.

## Flit Packing Rules

한 flit에 *여러 message slot*이 들어갑니다.

| 요소 | 의미 |
|------|------|
| Slot | 한 메시지가 차지하는 영역 |
| Protocol ID | slot이 어느 protocol (CXL.io/cache/mem)에 속하는지 |
| Payload | 실제 message 데이터 |
| DLLP | Data Link Layer Packet — flow control 등 |
| LLR | Link Layer Retry header — error recovery |

예 (개념적):

| Slot | Content |
|------|---------|
| Slot 0 | CXL.mem M2S Req (read) |
| Slot 1 | CXL.cache D2H Req (RdShared) |
| Slot 2 | CXL.mem S2M DRS (data, prev tx) |
| Slot 3 | DLLP (credit update) |
| Trailer | CRC + FEC |

이 packing이 *링크 efficiency*의 핵심. *모든 slot 채워 보내는 게 이상*이지만 *latency 요구*에 따라 *덜 찬 flit도 전송*.

## Protocol ID·Payload·Trailer

각 flit의 구조 (개념적):

| 부분 | 역할 |
|------|------|
| Header | Flit 시작 표시·protocol ID |
| Payload slots | 1~N개의 message |
| LLR Header | retry sequence number |
| CRC | 데이터 무결성 |
| FEC | (3.0+) error correction |

Receiver는:
1. Flit 받음
2. *FEC로 single-bit error correction*
3. *CRC 검증*
4. Slot별 *protocol ID 보고 분배*
5. 각 message를 *CXL.io/cache/mem stack*에 전달

## Backward Compatibility Negotiation

서로 다른 세대의 host·device가 attach될 때 *flit 모드 협상*:

| Host | Device | Negotiated |
|------|--------|-----------|
| CXL 4.0 (256B) | CXL 4.0 (256B) | 256B (4.0 speed) |
| CXL 4.0 (256B) | CXL 2.0 (68B) | 68B (2.0 speed) |
| CXL 4.0 (256B) | CXL 3.0 (256B) | 256B (3.0 speed) |
| CXL 2.0 (68B) | CXL 4.0 (256B) | 68B (2.0 speed) |

*낮은 세대로 fall-back*. *동작은 보장*되지만 *4.0의 새 기능은 활성화 안 됨*.

## Credit-based Flow Control

Receiver의 *queue 한계*를 transmit가 *credit으로 추적*:

| 단계 | 동작 |
|------|------|
| Initial | Receiver가 *initial credit*을 transmit에 알림 |
| Send | Transmit가 *credit 1 소비*하고 flit 보냄 |
| Process | Receiver가 flit *처리·queue 비움* |
| Return | Receiver가 *credit 1 반환* (DLLP로) |
| Retry | Transmit가 새 flit 보낼 수 있음 |

이게 *receiver overflow 방지*. *credit 부족*하면 transmit *stall*. *credit pool 크기*가 *throughput에 큰 영향*.

## Latency Optimization (4.0)

CXL 4.0의 *latency optimization*은 *Flit packing rules의 미세한 개선*:

| 항목 | 의미 |
|------|------|
| Empty Flit | flit slot이 *비어도 빠르게 보냄* — small message latency↓ |
| Slot reuse | 미사용 slot이 *다른 protocol에 재할당* |
| FEC interleaving | 3-way interleaved Reed-Solomon으로 *correction granularity 향상* |

이 개선들이 *4.0의 128 GT/s에서도 latency를 비슷하게 유지*하는 비결입니다.

## 자주 하는 실수

### "256B flit은 무조건 빠르다"

*throughput은 빠릅니다*. *latency는 비슷하거나 약간 증가*. *FEC가 추가 latency*. small-message workload는 *68B flit이 더 빠를 수 있음*.

### "Standard·Latency-Optimized 둘 중 하나만 선택"

*동적 전환 가능*합니다. *워크로드 phase·트래픽 mix*에 따라 *flit 모드를 동적 변경*. firmware·driver hint로 제어.

### "FEC가 모든 error 보호"

*Single-symbol correction*만. *Multi-bit burst error*는 *CRC fail → LLR retry*. *cable 마모·신호 무결성 저하*는 *LLR 트래픽 증가*로 나타납니다.

### "Credit이 많을수록 빠름"

*Queue depth가 늘면 latency 증가*. *throughput과 latency의 trade-off*. *워크로드별 튜닝*.

### "68B flit은 CXL 4.0에서 deprecated"

*아닙니다*. CXL 1.1·2.0 디바이스와의 *backward compat*을 위해 *4.0 host도 68B 지원*. *legacy 디바이스 운용 가능*.

## 정리

- *Flit*은 *CXL 링크의 데이터 전송 최소 단위*. 세대별 다름.
- *68B Flit* (CXL 1.1·2.0): 528-bit, FEC 없음, PCIe 5.0 NRZ baseline.
- *256B Flit* (3.0+): FEC 포함, PCIe 6.0/7.0 PAM4·PAM4-2, throughput 위주.
- *256B Latency-Optimized*: 작은 message에 빠른 latency.
- *Flit packing rules*: slot·protocol ID·DLLP·CRC·FEC·LLR이 *각자 역할*.
- *CXL 4.0은 flit 구조 변경 없음* — 3.0과 *backward compatible*.
- *Credit-based flow control*이 *throughput vs latency 균형*.

## 다음 편

[Ch 10: ARB/MUX — 세 프로토콜의 PHY 다중화](/blog/embedded/hardware/cxl/chapter10-arb-mux)에서 *CXL.io·CXL.cache·CXL.mem 세 프로토콜이 같은 PHY로 어떻게 multiplexed*되는지를 본격적으로 분해합니다.

## 관련 항목

- [Ch 5: CXL 4.0의 핵심 새 기능](/blog/embedded/hardware/cxl/chapter05-cxl-4-features)
- [Ch 8: CXL.mem](/blog/embedded/hardware/cxl/chapter08-cxl-mem)
- [Ch 10: ARB/MUX](/blog/embedded/hardware/cxl/chapter10-arb-mux)
- [HBM·GDDR 심화 Ch 4: GDDR6·GDDR6X·GDDR7](/blog/embedded/hardware/hbm/chapter04-gddr) — PAM4·PAM3 signaling

## 시리즈 자료 출처 안내

본 글은 *CXL Consortium·PCI-SIG 공개 자료*를 1차 자료로 합니다. CXL 4.0 Specification은 *§ navigation aid*로만 인용. 자세한 spec 인용 정책은 [Ch 1 footer](/blog/embedded/hardware/cxl/chapter01-cxl-position#시리즈-자료-출처-안내) 참고.
