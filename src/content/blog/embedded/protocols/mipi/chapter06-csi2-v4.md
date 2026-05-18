---
title: "Ch 6: CSI-2 v3.0+ — Smart ROI, USL, RAW24, MIPI CCS"
date: 2027-05-01T06:00:00
description: "v3.0 (2019) → v4.2 (2024) 신기능. 확장 VC, ROI, 24-bit RAW, Always-On Sentinel."
series: "MIPI 심화"
seriesOrder: 6
tags: [mipi, csi-2-v3, csi-2-v4, smart-roi, usl, raw24, mipi-ccs]
draft: true
---

## 한 줄 요약

> **"v2.0 = 모바일 표준, v3.0+ = 자동차·XR·DNN을 위한 확장"** — 새 응용을 위해 핵심 기능 추가.

## 버전 별 신규

### v3.0 (2019)

- **확장 Virtual Channel** — 2-bit → 4-bit (4 → 16 채널)
- **Smart ROI** — 관심 영역만 전송
- **Scrambling** — 데이터 패턴 disperse → EMI 감소
- **ULPS Wake-up** 신호 개선

### v4.0 (2021)

- **VC 5-bit** — 32 채널
- **RAW24** Data Type
- **USL (Unified Serial Link)** — A-PHY와 결합
- **Always-On Sentinel Conduit** — 저전력 monitor 모드
- **MIPI CCS** (Camera Command Set) 통합

### v4.2 (2024)

- **RGB888 압축 데이터**
- **고급 메타데이터** 표준화
- 자동차 *DCG* (Dual Conversion Gain) 메타

## Extended Virtual Channel

| 버전 | VC 폭 | 최대 채널 |
| --- | --- | --- |
| v1.x - v2.x | 2-bit | 4 |
| v3.0 | 4-bit | 16 |
| v4.0+ | 5-bit | 32 |

### 한 PHY 위 다중 스트림

```text
PHY (D-PHY 4-lane)
 ├ VC 0: 메인 이미지
 ├ VC 1: 임베디드 메타데이터
 ├ VC 2: PDAF (Phase Detection Auto-Focus)
 ├ VC 3: HDR 짧은 노출
 ├ VC 4: HDR 긴 노출
 ├ VC 5-15: 미사용 또는 멀티 센서
```

자동차 *서라운드뷰* — 4개 카메라 한 PHY 위 (각자 다른 VC).

## Smart ROI — 관심 영역만

기존 — *전체 프레임* 전송. v3.0+ — *N개 ROI*만 전송, 나머지는 *skip*.

```text
원본: 4000 × 3000 = 12 MP
ROI 1: 500×500 @ (1000, 500) — 차량 1
ROI 2: 300×400 @ (2200, 800) — 차량 2
전송 = 25만 + 12만 = 0.37 MP → 12 MP 대비 30× 절감
```

### 적용

- 자동차 ADAS — *번호판*만 인식
- 드론 — *추적 대상*만
- XR — *시선 추적 영역*만 고해상도

### 메타데이터

ROI 좌표·크기·번호를 *Short Packet 또는 임베디드 데이터*로 동시 전송. ISP가 ROI 정렬.

## Scrambling — EMI 감소

데이터 byte를 *PRBS (Pseudo-Random Binary Sequence)*로 XOR. *반복 패턴 disperse* → spectral peak 분산 → EMI 감소.

```text
TX: byte_n ⊕ PRBS_n = scrambled_n
RX: scrambled_n ⊕ PRBS_n = byte_n
```

PRBS는 *고정 초기값* + LFSR. 자동차 EMC 시험 통과에 *결정적*. v3.0 옵션, v4.0부터 *권장*.

## RAW24 — 의료·과학용 24-bit

| 응용 | 사용처 |
| --- | --- |
| 의료 영상 | CT·MRI 신호 raw |
| 과학 카메라 | 천체·형광 |
| HDR 라이다 | Time-of-Flight 깊이 |

24-bit linear → 16M tone, post-processing 정밀도. Packing — 3 byte/pixel (정렬).

## USL — Unified Serial Link

CSI-2 v4.0의 핵심. **A-PHY** (9편) 위에 *CSI-2 + 양방향 컨트롤 + 진단*을 한 케이블에.

```text
SoC ← 1 wire A-PHY → 카메라 모듈
     │ Forward: CSI-2 + power
     │ Reverse: I²C·진단 (low rate)
     │ Length: 15 m
     │ EMC: 자동차 등급
```

기존 — *CSI-2 케이블 + I²C 케이블 + power*. USL — *한 케이블* (coax 또는 STP). 자동차 와이어 하니스 단순화.

## Always-On Sentinel Conduit (AOSC)

저전력 *부분 활성* 모드. 메인 ISP 끄고 *센서 → 작은 NPU*가 *움직임 감지*. 감지 시에만 메인 시스템 깨움.

응용 — 도어벨 카메라, 차량 *Sentry Mode* (Tesla), 보안 카메라.

```text
대기:  센서 ── AOSC ── 저전력 NPU (0.1W) ── (감지) ── 메인 SoC wake
운영:  센서 ── 풀 CSI-2 ── 메인 ISP (1-2W)
```

## MIPI CCS — Camera Command Set

센서 제어용 *I²C 명령*의 표준화. 이전엔 *벤더별*이라 *Sony 센서 코드 ≠ Samsung 코드*.

v4.0부터 CCS — 모든 센서가 *표준 명령*:
- `EXPOSURE` set
- `ANALOG_GAIN` set
- `DIGITAL_GAIN` set
- `FRAME_LENGTH_LINES` set
- `LINE_LENGTH_PCK` set
- `ORIENTATION` (mirror/flip)
- `STREAM` start/stop

Linux V4L2 드라이버가 CCS 표준으로 *모든 센서를 동일 코드로*. 모델별 *튜닝 값*만 차이.

### Linux 통합

`drivers/media/i2c/ccs/` — Linux CCS 드라이버. Smartypants 카메라 모듈 (Hololens, Vuzix 등 일부) 사용.

## v4.0+ 채택 시점

대부분 *시판 센서*는 *v2.0 ~ v3.0* 수준. **v4.0+ 본격 채택**은 다음 영역:

- **Tesla HW4** (2023+) — USL + Smart ROI
- **Mercedes EQE/EQS** — USL
- **차세대 Apple Vision Pro** — Smart ROI
- **신형 산업 카메라** — RAW24

## 자주 하는 실수

> ⚠️ Extended VC를 v2.0 SoC에 보냄

VC 4 이상은 *v3.0+ 수신자만 해석*. 옛 SoC는 *DT 영역 비트와 충돌* 가능. 호환성 확인.

> ⚠️ Scrambling 마스터/슬레이브 미스매치

PRBS 초기값 다르면 *전부 노이즈*. 표준 초기값 또는 *register 통일*.

> ⚠️ Smart ROI 좌표 메타 누락

ROI만 보내고 *위치 메타* 안 보내면 ISP가 *frame 못 재구성*. Short Packet 또는 임베디드 데이터 명시.

> ⚠️ USL을 일반 CSI-2처럼 다룸

USL은 *SerDes 칩* 포함. CSI-2 receiver 직결 안 됨. A-PHY 트랜시버 + de-serializer 필요.

## 정리

- v3.0 → v4.2 — *자동차·XR·DNN*용 확장.
- **Extended VC** (32), **Smart ROI**, **Scrambling**.
- **USL**이 자동차 카메라 케이블링의 표준 방향.
- **MIPI CCS** — 센서 명령 표준화, Linux 드라이버 통합.
- **AOSC** — 항상 켜진 저전력 monitor.

다음 편은 **DSI 기초** — 디스플레이 인터페이스.

## 관련 항목

- [Ch 5: CSI-2 Data Types](/blog/embedded/protocols/mipi/chapter05-csi2-data-types)
- [Ch 7: DSI 기초](/blog/embedded/protocols/mipi/chapter07-dsi)
- [Ch 9: A-PHY](/blog/embedded/protocols/mipi/chapter09-a-phy)
