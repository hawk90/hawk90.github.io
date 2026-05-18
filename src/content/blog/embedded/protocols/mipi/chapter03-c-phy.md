---
title: "Ch 3: C-PHY — 3-Wire Trio, 7개 심볼, 2.28 bit/symbol"
date: 2027-05-01T03:00:00
description: "D-PHY (clock+data 2 pair = 4 wire/lane)보다 3 wire로 같은 처리량. 라인 절약 트릭."
series: "MIPI 심화"
seriesOrder: 3
tags: [mipi, c-phy, trio, symbol-encoding, lane-reduction]
draft: true
---

## 한 줄 요약

> **"3 wire = 1 lane, 7 symbol로 2.28 bit/symbol"** — D-PHY 4-wire를 3-wire로 줄이는 wire-encoding 트릭.

## 어떤 문제를 푸는가

D-PHY는 *데이터 lane = 차동 (2 wire) + 별도 clock (2 wire)*. 4 lane = 10 wire. 핀·트레이스가 부담.

C-PHY는 **clock 임베드**한 *3-wire 그룹 (trio)*. 4 lane = 3 × 4 = 12 wire (vs D-PHY 10) 비슷하지만 *물리 lane 수*가 적어 *심볼 속도×bit/symbol*로 *처리량 향상* + *EMI 우수*.

## C-PHY 구조 — Trio

각 lane이 **3 wire** (A·B·C). 각 wire는 *3 상태* (high·middle·low). 3 wire × 3 상태 = 27 조합 — 그 중 *7 valid symbol*만 사용.

### 7 Valid Symbol

각 symbol은 *직전 symbol과 적어도 한 wire 차이*가 보장 — 매 symbol마다 *상태 전이* → clock 임베드.

| Symbol | A | B | C | 의미 |
| --- | --- | --- | --- | --- |
| +x | H | L | M | (전이 가능 6) |
| -x | L | H | M | |
| +y | M | H | L | |
| -y | M | L | H | |
| +z | L | M | H | |
| -z | H | M | L | |
| (no 0,0,0 or 1,1,1) | | | | "all-same" 금지 |

### 2.28 bit/symbol — 왜?

```text
가능 valid 직전 → 다음 symbol = 6 (자기 자신 제외)
log2(6) ≈ 2.585 → 실제 인코딩 효율 ≈ 2.28 bit/symbol (코드 제약 후)
```

→ 1 symbol에 2.28 bit. *Symbol rate × 2.28 = bit rate*.

## 한눈에 보는 구조

![C-PHY trio signaling — 3 wires, 6-state transition](/images/blog/mipi/diagrams/ch03-c-phy-trio.svg)

3 wire (A·B·C) + state 전이 그래프 (6 valid transition).

## 속도 비교 — D-PHY vs C-PHY

| 버전·표준 | Symbol rate | Bit rate / lane | 4-lane 총 대역폭 |
| --- | --- | --- | --- |
| D-PHY v1.2 | — | 2.5 Gbps | 10 Gbps |
| D-PHY v2.5 | — | 4.5 Gbps | 18 Gbps |
| C-PHY v1.2 | 2.5 GS/s | 5.7 Gbps | **22.8 Gbps** |
| C-PHY v2.0 (2020) | 7.0 GS/s | 16.0 Gbps | **64 Gbps** |
| C-PHY v2.1 (2022) | 8.0 GS/s | 18.24 Gbps | **73 Gbps** |

**같은 lane 수에서 C-PHY가 약 2배 처리량**. 물리 lane 수도 *D-PHY = 2+2N wire, C-PHY = 3N wire* → 4 lane 시 D-PHY 10, C-PHY 12 (1 lane 추가시 D-PHY +2, C-PHY +3).

## 채택 — 어디서 쓰나

### 카메라 — 일부 Sony 고해상도 센서

Sony IMX589, IMX787 (108-200 MP 등) 일부가 C-PHY 옵션. 4-lane C-PHY로 *D-PHY 8-lane 대체* — 모듈 PCB 단순.

### 디스플레이 — 일부 AMOLED

Samsung 신형 패널 일부 C-PHY. 라인 적어 *플렉시블 디스플레이*에 유리.

### 자동차 — A-PHY와 결합

C-PHY 신호를 *A-PHY 1 wire*로 SerDes. 차량 케이블링 단순화.

## SoC 지원

| SoC | D-PHY | C-PHY |
| --- | --- | --- |
| Qualcomm SDX55+ | 4 lane × 2.5 Gbps | 3 lane × 5.7 Gbps |
| Apple A14+ | 모든 lane | 일부 모델 |
| Samsung Exynos | 표준 | 옵션 |
| NXP i.MX 8M | 표준 | 미지원 |
| Renesas R-Car V4H | 표준 | 표준 |
| STM32 (대부분) | 표준 | 미지원 |

→ **임베디드 SoC는 대부분 D-PHY만**. C-PHY는 *고급 모바일·자동차 SoC*에 한정.

## D-PHY vs C-PHY 선택

| 기준 | D-PHY | C-PHY |
| --- | --- | --- |
| 단순성 | ✓ 더 단순 | 복잡 (6-state encoding) |
| 핀 / Wire | 비슷 | 약간 많음 (lane당) |
| 같은 wire 수 처리량 | 기준 | **2배** |
| EMI | 차동 | 더 좋음 (3-wire balance) |
| SoC 지원 | 거의 모든 SoC | 고급 SoC만 |
| 칩 가격 | 표준 | 약간 비쌈 |

→ *대부분 시스템은 D-PHY*, *극고해상도 카메라·신형 자동차 카메라*에서 C-PHY.

## CSI-2 / DSI 위 호환

같은 CSI-2 packet이 D-PHY 또는 C-PHY 위로 전송 — *프로토콜 계층*은 동일. PHY 변경 시 *센서·SoC만 교체*, 상위 stack은 그대로.

## 자주 하는 실수

> ⚠️ C-PHY와 D-PHY 혼용

같은 lane 그룹에 *D-PHY 슬레이브 + C-PHY 마스터* 불가. *SoC·센서 모두 C-PHY 지원* 확인.

> ⚠️ 3-wire matched length

Trio의 *3 wire 길이 차이* 5 mil (0.13 mm) 이상이면 *심볼 디코딩 깨짐*. D-PHY 차동 pair보다 *더 정밀* 매칭.

> ⚠️ C-PHY를 항상 더 빠르다고 가정

C-PHY 2.5 GS/s = 5.7 Gbps. D-PHY v2.5 = 4.5 Gbps. *동일 세대*에선 C-PHY 우세. 하지만 *D-PHY v3.0 + 3D stacking*은 9 Gbps — 다시 우세.

> ⚠️ 직접 신호 분석

C-PHY 6-state 직접 분석은 *고가 장비* (Keysight, Tektronix) 필요. 일반 로직 분석기 못 함. *SoC 페리퍼럴의 빌트인 카운터*로 디버그.

## 정리

- C-PHY = **3-wire trio per lane**, 6-state 전이로 *clock 임베드*.
- **2.28 bit / symbol** — D-PHY 대비 비슷한 라인 수에 *2배 처리량*.
- 채택은 *고급 모바일·자동차 카메라·일부 디스플레이*.
- 임베디드 SoC는 *D-PHY만 지원이 대부분*.
- 같은 CSI-2/DSI 프로토콜이 두 PHY 위에서 동작.

다음 편은 **CSI-2 기초** — 카메라 인터페이스 프로토콜.

## 관련 항목

- [Ch 2: D-PHY](/blog/embedded/protocols/mipi/chapter02-d-phy)
- [Ch 4: CSI-2 기초](/blog/embedded/protocols/mipi/chapter04-csi2-basics)
