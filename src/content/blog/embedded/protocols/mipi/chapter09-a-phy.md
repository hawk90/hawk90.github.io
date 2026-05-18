---
title: "Ch 9: A-PHY — 자동차 SerDes, 15m, 단일 케이블"
date: 2027-05-01T09:00:00
description: "MIPI 자동차 PHY. 16 Gbps 단일 coax/STP, 15m, 전원·신호 통합. GMSL/FPD-Link III와 경쟁."
series: "MIPI 심화"
seriesOrder: 9
tags: [mipi, a-phy, automotive, serdes, functional-safety, asa]
draft: true
---

## 한 줄 요약

> **"카메라 ↔ ECU 한 케이블"** — 신호·전원·제어가 *coax 하나*로. 15m 견딤.

## 어떤 문제를 푸는가

자동차 후방·서라운드·사이드 카메라:

- ECU와 카메라 사이 **거리 5-15 m**
- CSI-2 D-PHY는 *수 cm 한정* — 직결 불가
- 케이블 *4-8 개* 필요 — 와이어 하니스 무거움
- **EMC** — 모터·인버터 옆에서도 동작
- **Functional Safety** — ISO 26262 ASIL B/C/D 호환

해결책 — *SerDes (Serializer/Deserializer)*. 카메라 출력 CSI-2를 *직렬화*해 *한 케이블*로 ECU로 보내고, ECU에서 다시 CSI-2 복원.

## 기존 SerDes — 경쟁 표준

| 표준 | 회사 | 최대 속도 | 비고 |
| --- | --- | --- | --- |
| **GMSL2/3** | Maxim → Analog Devices | 12-25 Gbps | 시장 leading |
| **FPD-Link III/IV** | Texas Instruments | 6-15 Gbps | 두 번째 |
| **A-PHY** | MIPI Alliance | 16 Gbps | 표준 (multi-vendor) |
| **HCL ASA Motion Link** | MIPI Alliance | 12 Gbps | A-PHY 기반 |

GMSL·FPD-Link는 *vendor-locked*. A-PHY는 *open standard*로 다른 회사 SerDes도 호환 — 자동차 OEM의 *공급망 우려*에 답.

## A-PHY 사양 — G1/G2/G3

| Grade | 최대 다운스트림 | 업스트림 | 거리 | 케이블 |
| --- | --- | --- | --- | --- |
| **G1** (2020) | 2 Gbps | 100 Mbps | 15 m | coax 또는 STP |
| **G2** (2021) | 4 Gbps | 100 Mbps | 15 m | coax 또는 STP |
| **G3** (2022) | 8 Gbps | 100 Mbps | 15 m | coax (STP 어려움) |
| **G4** (예정) | 16 Gbps | — | 15 m | coax |

→ **Asymmetric** — 다운 (카메라 → ECU) 빠르게, 업 (제어·진단) 느리게.

## 한눈에 보는 구조

![A-PHY SerDes link](/images/blog/mipi/diagrams/ch09-a-phy-link.svg)

카메라 모듈에 *Serializer 칩* (예: ADI MAX9296), ECU에 *Deserializer 칩*. 두 사이 *coax 또는 STP 케이블*.

## 단일 케이블의 마법 — PoC

**PoC (Power over Coax)** — 같은 coax로 *전원도 같이*. 카메라 모듈에 별도 전원선 필요 없음.

```text
ECU 측:
  Serializer ↔ DC injection circuit ↔ coax
              ↓
              12V power (DC)
              + RF signal (~Gbps)

카메라 측:
  Deserializer ↔ DC blocking ↔ coax
                ↓
                12V → 패널 power
                + RF → 신호
```

DC와 RF를 *수동 LC 회로*로 분리. 1 코어 + shield → *진짜 단일 케이블*.

## ASA Motion Link

A-PHY 기반 *application layer*. *CSI-2 + 양방향 제어 + 진단*을 묶음.

```text
Forward (다운): CSI-2 video stream (압축 가능)
Reverse (업): I²C 명령, 진단
시간 동기: PTP-like
```

ASA = Automotive SerDes Alliance. MIPI 멤버사가 *자동차 특화 spec* 제정.

## Functional Safety — ISO 26262

자동차 안전 표준. *ASIL A·B·C·D* 등급. A-PHY는 *ASIL B/C 인증 SoC*에 적합.

### Safety 기능

- **CRC + ECC** — 데이터 무결성
- **Watchdog** — 링크 끊김 *수 ms 안* 감지
- **Diagnostic Channel** — 양방향 status·error reporting
- **Lockstep** — 두 deserializer가 *동일 신호 처리*, 결과 비교
- **End-to-End Protection** — 카메라 → ECU 전체 경로 무결성

## SerDes 칩 예 — Analog Devices ADIN1110 / MAX9296

### Serializer (카메라 측)

```
입력: CSI-2 D-PHY 4-lane × 2 Gbps = 8 Gbps
출력: A-PHY G2 4 Gbps (압축 후) 또는 G3 8 Gbps
+ I²C up
+ GPIO (트리거, 동기)
+ 12V → 1.8V/3.3V 내부 LDO
```

### Deserializer (ECU 측)

```
입력: A-PHY G2/G3
출력: CSI-2 D-PHY 4-lane → SoC ISP
+ I²C down
+ 동기 / 트리거 신호
```

## NVIDIA Jetson 자동차 — Maxim/ADI 통합

NVIDIA Orin SoC + Maxim (ADI) MAX96712 Quad Deserializer = *최대 4 카메라*를 한 ECU에. Tesla, Rivian, Mercedes EQ 등 적용.

```text
[Camera 1 ─ A-PHY] ──┐
[Camera 2 ─ A-PHY] ──┼── MAX96712 ─── CSI-2 (16 lane) ─── Jetson Orin
[Camera 3 ─ A-PHY] ──┤
[Camera 4 ─ A-PHY] ──┘
```

## A-PHY vs Automotive Ethernet

| | A-PHY | Automotive Ethernet (100/1000BASE-T1) |
| --- | --- | --- |
| 속도 | 2-16 Gbps | 100 Mbps / 1 Gbps |
| 거리 | 15 m | 15 m |
| Latency | < 100 µs | TSN 시 ~수 ms |
| 결정성 | High | TSN 필요 |
| 용도 | 카메라·디스플레이 raw | IT/엔터테인먼트 |
| 케이블 | coax/STP | UTP |

A-PHY가 *raw bandwidth*는 우세, Ethernet은 *generality*. 자동차는 *둘 다* 사용 — A-PHY는 *비전·디스플레이*, Ethernet은 *백본*.

## OPEN Alliance 기여

A-PHY 표준 일부는 **OPEN Alliance** (Automotive Ethernet 그룹)과 *상호 인용*. 두 표준의 *MAC 호환*으로 향후 *통합 SoC* 가능성.

## 채택 — 2024-2025 본격화

- **Mercedes EQE/EQS** — A-PHY 카메라
- **Tesla HW4** — Maxim SerDes (GMSL+/A-PHY 호환)
- **Hyundai Ioniq 6** — 일부 모델
- **Volvo EX90** — A-PHY
- **신차 OEM** — 2025+ 광범위 채택 예정

## 자주 하는 실수

> ⚠️ A-PHY를 *raw CSI-2 직결*

A-PHY는 *SerDes 칩* 필요. SoC의 CSI-2 receiver는 *디시리얼라이저 출력*에 연결. 직결 안 됨.

> ⚠️ Cable Loss·Pre-emphasis 미설정

15 m coax = *수 GHz에서 신호 감쇠*. Serializer의 *pre-emphasis* + Deserializer의 *equalization* 설정 필수.

> ⚠️ Vendor lock-in

A-PHY 표준이지만 *vendor-specific* 명령 (configuration register)도 많음. SerDes 칩 변경 시 *재튜닝* 필요.

> ⚠️ Functional Safety 검증 없이 양산

ASIL-B 이상 시스템은 *각 부품 인증* 필수. SerDes 칩의 *ISO 26262 인증서* 확인.

## 정리

- A-PHY = **자동차 장거리 SerDes** — 15 m, 2-16 Gbps, 단일 coax/STP.
- *Asymmetric* — 다운 빠름, 업 100 Mbps.
- **PoC** (Power over Coax)로 *진짜 단일 케이블*.
- **ASA Motion Link**가 CSI-2를 위한 application layer.
- **GMSL/FPD-Link III** 경쟁 (vendor-locked) → A-PHY가 *open*.
- 자동차 OEM 2025+ 본격 채택.

다음 편은 **Linux Media** — V4L2·DRM/KMS.

## 관련 항목

- [Ch 8: DSI-2](/blog/embedded/protocols/mipi/chapter08-dsi2)
- [Ch 6: CSI-2 v4 (USL)](/blog/embedded/protocols/mipi/chapter06-csi2-v4)
- [Ch 10: Linux Media](/blog/embedded/protocols/mipi/chapter10-linux-media)
