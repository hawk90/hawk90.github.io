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

*Flit*은 *CXL 링크 위 데이터 전송 단위*입니다.

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

[CXL 4.0 공개 소개 자료 p.15](https://computeexpresslink.org/wp-content/uploads/2025/12/CXL_4.0-Webinar_December-2025_FINAL.pdf)는 128 GT/s에서도 *PCIe 7.0 FEC·CRC가 CXL 3.0과 같고*, Standard 256B와 Latency-Optimized 256B를 함께 쓴다고 정리합니다. 4.0 발표문은 3.x·2.0·1.1·1.0과의 하위 호환을 유지한다고 밝힙니다.

## 68B Flit

68B mode의 cachemem 구성입니다([CXL 3.1 §4.2](https://computeexpresslink.org/wp-content/uploads/2024/02/CXL-3.1-Specification.pdf)). CXL.io의 비 flit PCIe 전송 내용을 같은 네 개 message slot으로 해석하지 않습니다.

| 부분 | 크기 |
|------|-----|
| Protocol ID | 2 B — 이 flit이 CXL.io인지 CXL.cachemem인지 |
| Slot | 16 B × 4 |
| CRC | 2 B |
| 합계 | 68 B (Protocol ID 뒤 528 bit가 link layer flit) |

이 68B cachemem 형식은 CRC로 오류를 검출하고 LLR(Link Layer Retry)로 재전송하며 FEC 필드를 갖지 않습니다. 256B mode가 낮은 속도에서도 사용될 수 있으므로 “NRZ 속도이면 항상 68B·FEC 없음”으로 확대하지 않습니다.

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

256B 형식에는 CRC·FEC 보호가 포함됩니다. PAM4의 오류율 목표·FEC 설계 조건은 실제 장치의 관측 BER이나 post-FEC 오류율과 구분해야 합니다(§6.4.1.3.3). 256B flit에서 retry buffer는 *Physical Layer*에 있습니다(§5.1.2.3). 68B의 LLR과 다릅니다.

HDR의 Flit Type 2 bit가 flit 종류를 가릅니다: NOP, CXL.io, CXL.cachemem, ALMP(§6.2.3.1.1.1).

## Latency-Optimized 256B Flit

256B flit을 *128 B 반쪽 둘*로 나누고, 반쪽마다 CRC를 붙인 형식입니다(§6.2.3.1.2).

| 반쪽 | 구성 |
|------|------|
| 짝수 반쪽 | Flit Header 2 B + Flit Data 120 B + CRC 6 B |
| 홀수 반쪽 | Flit Data 116 B + FEC 6 B (256 B 전체 보호) + CRC 6 B |

얻는 것은 *flit accumulation latency* 감소입니다. 짝수 반쪽이 CRC를 통과하면 홀수 반쪽을 기다리지 않고, FEC 디코딩도 건너뛰고 바로 소비합니다. §6.2.3.1.2는 x4·64 GT/s에서 왕복 accumulation latency 8 ns를 설명합니다. 이 항목은 load-to-use 전체 지연이 아니며, 한 방향 256 B의 raw serialization `256 ÷ 32 GB/s = 8 ns`와 같은 수가 나온다는 이유만으로 측정 경계를 같다고 보면 안 됩니다. 표준 CRC 통과와 부분 소비, FEC 처리의 경계를 구분해야 합니다.

| 상황 | 처리 |
|------|------|
| 두 반쪽 CRC 통과 | FEC 없이 바로 소비 |
| 한 반쪽 CRC 실패 | 256 B 전체에 FEC 디코딩·정정 후 다시 CRC |
| 정정 후에도 실패 | 256 B flit 전체를 retry |

Standard와 Latency-Optimized 중 무엇을 쓸지는 *alternate protocol negotiation에서 한 번* 정합니다. *동적 전환은 지원하지 않습니다*(§6.2.3.1.2).

## Flit에 메시지 싣기

68B flit은 slot 4개, Standard 256B CXL.cachemem flit은 H-Slot 1개 + G-Slot 14개입니다. CXL.cache와 CXL.mem 메시지는 같은 cachemem flit의 slot에 섞여 들어갈 수 있습니다. CXL.io는 별도 flit으로 갑니다.

Slot 번호에 임의의 요청·응답 이름을 적었다고 유효한 flit이 되지는 않습니다. §4.3.2의 Table 4-14/15는 slot 크기, 방향과 HBR/PBR, device-originated CXL.mem 등의 조건을 구분합니다. 아래는 **기본 host→device HBR 경로에서 사용할 수 있는 format 예**이며 완성된 binary flit이나 packing schedule은 아닙니다.

| 위치·format 예 | 해당 format의 메시지 예 | 추가 확인 |
|---|---|---|
| H-slot H4 | M2S Req | H-slot 길이와 필드의 제약 |
| G-slot G0 | H2D Req + H2D Rsp | host→device CXL.cache 메시지의 조합 |
| Data slot | 앞선 data header에 대응하는 data | 암시된 길이와 이어지는 slot·flit의 상태 |

기본 host 경로와 peer/fabric 경로의 방향 규칙을 섞지 않습니다. CXL 3.1은 일부 M2S/S2M 형식을 반대 방향에도 허용하는 조건을 정의하므로, 이름만 보고 모든 링크에서의 허용 방향을 단정하지 않습니다. LOpt의 slot 8은 12 B HS-slot이며 Standard의 G-slot과 같은 packing으로 취급할 수 없습니다.

보낼 메시지가 없을 때도 CXL.cachemem은 *Empty flit*으로 ARB/MUX 경로를 잡아 둘 수 있습니다. 뒤늦게 도착한 메시지를 같은 flit의 뒷 slot에 실어, 다음 256 B 경계까지 기다리지 않게 하는 장치입니다(§6.2.3.1.1.1).

## Receiver 처리

Standard 256B flit 기준:

1. 256 B를 다 받음
2. *FEC 디코딩·정정*
3. *CRC 검증* — 실패면 retry 요청
4. HDR의 *Flit Type*으로 CXL.io / CXL.cachemem / ALMP 분배
5. cachemem flit이면 slot의 메시지를 CXL.cache·CXL.mem으로 나눔

Latency-Optimized는 CRC가 실패한 경우 전체 flit에 FEC를 적용하는 경로를 사용합니다. 이미 소비한 반쪽은 retry된 flit에서 다시 소비하지 않아야 합니다. §6.2.3.1.2의 예처럼 첫 반쪽을 소비한 뒤 FEC 후 그 반쪽 CRC가 실패하는 경우도 있어, 단순한 “성공하면 둘 다 다시 전달”로 구현할 수 없습니다. CXL.io의 Flit Marker·PTM과 분할된 slot에는 별도 소비 제한도 있습니다.

## 세대가 다른 장치끼리

서로 다른 세대의 host·device가 붙으면 *둘 다 지원하는 쪽*으로 맞춥니다.

| 공통 지원의 예 | 해석할 상한 |
|---|---|
| 양쪽이 4.0의 해당 기능 지원 | 256B·128 GT/s를 사용할 수 있는지 실제 경로·협상을 확인합니다. |
| 공통 기능이 3.x 범위 | 지원 조합의 최대 속도·mode로 협상합니다. |
| 공통 기능이 1.1/2.0 범위 | 이전 mode의 제약 안에서 동작합니다. |

세대 이름만으로 실제 negotiated rate나 flit mode를 관측한 것처럼 쓰지 않습니다. 중간 switch·retimer·신호 조건·firmware와 지원 capability 때문에 속도·폭이 낮아질 수 있습니다.

## Credit-based Flow Control

CXL.cachemem은 채널마다 *메시지 단위 credit*을 씁니다. 받는 쪽이 버퍼를 비우면 credit을 돌려주고, 보내는 쪽은 credit이 있을 때만 그 채널 메시지를 보냅니다.

| 형식 | Credit 반환 위치 |
|------|------|
| 68B flit | flit 헤더의 credit 필드, 또는 LLCRD control flit (§4.2) |
| 256B flit | flit 끝의 CRD 2 B (§4.3.5) |

CXL.io의 credit은 PCIe의 해당 mode 규칙을 따릅니다. 비 flit mode의 DLLP flow control과 256B mode의 link 정보를 구분하며, cachemem의 CRD를 PCIe TLP credit과 같은 단위로 해석하지 않습니다.

## 자주 하는 실수

### "256B flit은 무조건 빠르다"

64 GT/s 이상에는 256B mode가 필요하지만 256B mode 자체는 더 낮은 속도에서도 사용될 수 있습니다. 하지만 Standard 256B는 flit 전체를 받아 FEC를 거쳐야 소비할 수 있어 *accumulation latency*가 생깁니다. 이걸 줄이려고 Latency-Optimized 형식이 따로 있습니다.

### "Standard·Latency-Optimized는 트래픽 따라 오간다"

*아닙니다*. 링크 협상 때 한 번 정하고, 동적 전환은 없습니다(§6.2.3.1.2).

### "FEC가 모든 error를 고친다"

FEC의 정정 능력과 CRC의 검출 능력에는 한계가 있습니다. 검출된 미복구 오류에는 retry 경로가 관여하지만 모든 비트 오류가 반드시 검출·복구된다는 보장은 아닙니다. 256B retry 책임과 fatal link failure·복구 실패도 구분해야 합니다.

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

이 글은 CXL 3.1·1.1 spec, CXL 4.0 발표문·웨비나를 근거로 합니다. 시리즈 전체의 자료 정책은 [Ch 1](/blog/embedded/hardware/cxl/chapter01-cxl-position#시리즈-자료-출처-안내)에 있습니다.
