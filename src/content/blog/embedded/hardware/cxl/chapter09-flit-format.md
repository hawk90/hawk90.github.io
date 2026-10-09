---
title: "Ch 9: Flit Format — 68B vs 256B vs Latency-Optimized"
slug: "embedded/hardware/cxl/chapter09-flit-format"
date: 2026-05-16T09:09:00
description: "68B·Standard 256B·Latency-Optimized 256B flit의 구조와 retry·credit 처리."
series: "CXL 4.0 Internals"
seriesOrder: 9
tags: [cxl, flit, 68b-flit, 256b-flit, fec]
draft: false
topics: ["embedded", "embedded/hardware"]
---

## 한 줄 요약

> **"Flit은 *CXL 링크 위 고정 크기 전송 단위*이며, *세 가지 형식*이 있습니다."** — *68B flit* (CXL 1.1·2.0, 32 GT/s까지), *Standard 256B flit* (3.0+, PCIe Flit mode), *Latency-Optimized 256B flit* (3.0+, 128 B 반쪽마다 CRC). CXL 4.0은 128 GT/s에서도 *3.x의 256B flit 형식과 FEC·CRC를 그대로* 씁니다.

[Ch 8](/blog/embedded/hardware/cxl/chapter08-cxl-mem)에서 *CXL.mem 메시지의 의미*를 봤습니다. 이 장은 *그 메시지가 실제로 링크 위를 어떻게 흐르는지* — *flit*입니다.

## Flit이란

*Flit (Flow Control Unit)*은 *CXL 링크 위 데이터 전송 단위*입니다.

| 항목 | 의미 |
|------|------|
| 크기 | 고정 (68 B 또는 256 B) |
| 내용 | 헤더 + message slot + CRC (+ 256B는 FEC) |
| 한 flit의 프로토콜 | 한 flit은 CXL.io 또는 CXL.cachemem 중 하나만 싣습니다 |

*패킷 (packet)*과 다른 개념. PCIe TLP는 *가변 크기*이지만 flit은 *고정 크기*입니다. PCIe 6.0에서 PCIe 자체도 Flit mode를 도입했고, CXL 256B flit은 그 위에서 동작합니다.

## Flit 형식 한눈에

| 형식 | 크기 | 도입 | 비고 |
|------|------|------|------|
| 68B flit | 68 B | CXL 1.1 | 32 GT/s까지 |
| Standard 256B flit | 256 B | CXL 3.0 | PCIe Flit mode에서 사용. 8 GT/s 이상 |
| Latency-Optimized 256B flit | 256 B | CXL 3.0 | 선택 기능. 128 B 반쪽마다 CRC |

CXL 4.0 웨비나(2025-12)는 128 GT/s에서도 *PCIe 7.0 FEC·CRC가 CXL 3.0과 같고*, Standard 256B와 Latency-Optimized 256B를 함께 쓴다고 정리합니다. 4.0 발표문은 3.x·2.0·1.1·1.0과의 하위 호환을 유지한다고 밝힙니다.

## 68B Flit

CXL 1.1·2.0의 기본 형식입니다(CXL 3.1 §4.2).

| 부분 | 크기 |
|------|-----|
| Protocol ID | 2 B — 이 flit이 CXL.io인지 CXL.cachemem인지 |
| Slot | 16 B × 4 |
| CRC | 2 B |
| 합계 | 68 B (Protocol ID 뒤 528 bit가 link layer flit) |

PCIe 5.0까지의 NRZ 링크에는 FEC가 없습니다. 오류는 *CRC*로 잡고, CXL.cachemem은 *LLR (Link Layer Retry)*로 재전송합니다.

## Standard 256B Flit

CXL 3.0에서 추가된 형식입니다. *PCIe Flit mode가 켜지면 256B flit mode가 함께 정해지고*, 8 GT/s 이상에서 씁니다(§6.4.1.3.1). 64 GT/s 이상은 256B flit만 됩니다.

CXL.cachemem용 Standard 256B flit(§4.3.2, Figure 4-41):

| 부분 | 크기 | 담당 |
|------|-----|------|
| HDR | 2 B | Physical Layer |
| Slot 0 (H-Slot) | 14 B | Link Layer |
| Slot 1~14 (G-Slot) | 16 B × 14 | Link Layer |
| CRD | 2 B | Link Layer — credit 반환 |
| CRC | 8 B | Physical Layer |
| FEC | 6 B | Physical Layer — 3-way interleaved ECC (PCIe Base Spec 정의) |

PCIe 6.0의 PAM4 링크는 BER이 1E-6 수준이라(§6.4.1.3.3) FEC가 필요합니다. 256B flit에서 retry buffer는 *Physical Layer*에 있습니다(§5.1.2.3). 68B의 LLR과 다릅니다.

HDR의 Flit Type 2 bit가 flit 종류를 가릅니다: NOP, CXL.io, CXL.cachemem, ALMP(§6.2.3.1.1.1).

## Latency-Optimized 256B Flit

256B flit을 *128 B 반쪽 둘*로 나누고, 반쪽마다 CRC를 붙인 형식입니다(§6.2.3.1.2).

| 반쪽 | 구성 |
|------|------|
| 짝수 반쪽 | Flit Header 2 B + Flit Data 120 B + CRC 6 B |
| 홀수 반쪽 | Flit Data 116 B + FEC 6 B (256 B 전체 보호) + CRC 6 B |

얻는 것은 *flit accumulation latency* 감소입니다. 짝수 반쪽이 CRC를 통과하면 홀수 반쪽을 기다리지 않고, FEC 디코딩도 건너뛰고 바로 소비합니다. spec은 x4 링크·64 GT/s에서 왕복 accumulation latency가 8 ns라고 예를 듭니다. 링크 폭이 좁을수록 이득이 큽니다.

| 상황 | 처리 |
|------|------|
| 두 반쪽 CRC 통과 | FEC 없이 바로 소비 |
| 한 반쪽 CRC 실패 | 256 B 전체에 FEC 디코딩·정정 후 다시 CRC |
| 정정 후에도 실패 | 256 B flit 전체를 retry |

Standard와 Latency-Optimized 중 무엇을 쓸지는 *alternate protocol negotiation에서 한 번* 정합니다. *동적 전환은 지원하지 않습니다*(§6.2.3.1.2).

## Flit에 메시지 싣기

68B flit은 slot 4개, Standard 256B CXL.cachemem flit은 H-Slot 1개 + G-Slot 14개입니다. CXL.cache와 CXL.mem 메시지는 같은 cachemem flit의 slot에 섞여 들어갈 수 있습니다. CXL.io는 별도 flit으로 갑니다.

예 (Standard 256B cachemem flit, 개념적):

| 위치 | 내용 |
|------|---------|
| Slot 0 | CXL.mem M2S Req (MemRd) |
| Slot 1 | CXL.cache D2H Req (RdShared) |
| Slot 2~5 | CXL.mem S2M DRS (data) |
| CRD | 받은 메시지에 대한 credit 반환 |
| 끝 | CRC + FEC |

보낼 메시지가 없을 때도 CXL.cachemem은 *Empty flit*으로 ARB/MUX 경로를 잡아 둘 수 있습니다. 뒤늦게 도착한 메시지를 같은 flit의 뒷 slot에 실어, 다음 256 B 경계까지 기다리지 않게 하는 장치입니다(§6.2.3.1.1.1).

## Receiver 처리

Standard 256B flit 기준:

1. 256 B를 다 받음
2. *FEC 디코딩·정정*
3. *CRC 검증* — 실패면 retry 요청
4. HDR의 *Flit Type*으로 CXL.io / CXL.cachemem / ALMP 분배
5. cachemem flit이면 slot의 메시지를 CXL.cache·CXL.mem으로 나눔

Latency-Optimized는 2번을 CRC 실패 때만 합니다.

## 세대가 다른 장치끼리

서로 다른 세대의 host·device가 붙으면 *둘 다 지원하는 쪽*으로 맞춥니다.

| Host | Device | 결과 |
|------|--------|-----------|
| CXL 4.0 | CXL 4.0 | 256B, 최대 128 GT/s |
| CXL 4.0 | CXL 3.x | 256B, 최대 64 GT/s |
| CXL 4.0 | CXL 2.0 | 68B, 최대 32 GT/s |
| CXL 2.0 | CXL 4.0 | 68B, 최대 32 GT/s |

낮은 쪽에 맞춰 동작하고, 상위 세대 기능은 쓰지 않습니다.

## Credit-based Flow Control

CXL.cachemem은 채널마다 *메시지 단위 credit*을 씁니다. 받는 쪽이 버퍼를 비우면 credit을 돌려주고, 보내는 쪽은 credit이 있을 때만 그 채널 메시지를 보냅니다.

| 형식 | Credit 반환 위치 |
|------|------|
| 68B flit | flit 헤더의 credit 필드, 또는 LLCRD control flit (§4.2) |
| 256B flit | flit 끝의 CRD 2 B (§4.3.5) |

CXL.io는 PCIe 방식 그대로 DLLP로 flow control credit을 주고받습니다.

## 자주 하는 실수

### "256B flit은 무조건 빠르다"

256B flit은 64 GT/s 이상으로 *대역폭*을 올립니다. 하지만 Standard 256B는 flit 전체를 받아 FEC를 거쳐야 소비할 수 있어 *accumulation latency*가 생깁니다. 이걸 줄이려고 Latency-Optimized 형식이 따로 있습니다.

### "Standard·Latency-Optimized는 트래픽 따라 오간다"

*아닙니다*. 링크 협상 때 한 번 정하고, 동적 전환은 없습니다(§6.2.3.1.2).

### "FEC가 모든 error를 고친다"

FEC가 고칠 수 있는 범위를 넘는 오류는 CRC에 걸리고, flit 단위 retry로 복구합니다. 256B flit에서 retry는 Physical Layer가 맡습니다.

### "68B flit은 CXL 4.0에서 사라졌다"

*아닙니다*. CXL 4.0 발표문은 1.0·1.1·2.0과의 하위 호환을 유지한다고 밝힙니다. 1.1·2.0 디바이스와는 68B flit으로 붙습니다.

## 정리

- *Flit*은 *CXL 링크의 고정 크기 전송 단위*. 한 flit은 CXL.io나 CXL.cachemem 하나만 싣습니다.
- *68B flit*: Protocol ID 2 B + slot 16 B × 4 + CRC 2 B. FEC 없음, LLR로 retry.
- *Standard 256B flit* (3.0+): HDR 2 B + slot 15개 + CRD 2 B + CRC 8 B + FEC 6 B. retry는 Physical Layer.
- *Latency-Optimized 256B flit*: 128 B 반쪽마다 CRC. 통과하면 FEC 없이 바로 소비. 협상 때 한 번 선택.
- *CXL 4.0*: 128 GT/s에서도 3.x의 256B 형식과 FEC·CRC 유지.
- *Credit*은 채널·메시지 단위. 68B는 헤더·LLCRD, 256B는 CRD 필드로 반환.

## 다음 편

[Ch 10: ARB/MUX — 세 프로토콜의 PHY 다중화](/blog/embedded/hardware/cxl/chapter10-arb-mux)에서 *CXL.io·CXL.cache·CXL.mem 세 프로토콜이 같은 PHY로 어떻게 multiplexed*되는지를 본격적으로 분해합니다.

## 관련 항목

- [Ch 5: CXL 4.0의 핵심 새 기능](/blog/embedded/hardware/cxl/chapter05-cxl-4-features)
- [Ch 8: CXL.mem](/blog/embedded/hardware/cxl/chapter08-cxl-mem)
- [Ch 10: ARB/MUX](/blog/embedded/hardware/cxl/chapter10-arb-mux)
- [HBM·GDDR 심화 Ch 4: GDDR6·GDDR6X·GDDR7](/blog/embedded/hardware/hbm/chapter04-gddr) — PAM4·PAM3 signaling

## 시리즈 자료 출처 안내

본 글은 *CXL Consortium·PCI-SIG 공개 자료*를 1차 자료로 합니다. CXL 4.0 Specification은 *§ navigation aid*로만 인용. 자세한 spec 인용 정책은 [Ch 1 footer](/blog/embedded/hardware/cxl/chapter01-cxl-position#시리즈-자료-출처-안내) 참고.
