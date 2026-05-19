---
title: "Ch 1: MIPI Alliance — 모바일에서 자동차·로봇까지"
date: 2026-05-16T01:00:00
description: "2003년 모바일을 위해 시작한 표준 컨소시엄. 카메라·디스플레이·디버그·전원·터치까지 다 가짐."
series: "MIPI 심화"
seriesOrder: 1
tags: [mipi, alliance, csi, dsi, d-phy, c-phy, standards]
draft: true
---

## 한 줄 요약

> **"모바일이 만들고 자동차가 키운 표준"** — 카메라·디스플레이 한 줄 인터페이스의 사실상 모든 것.

## MIPI Alliance — 22년의 역사

2003년 ARM·Nokia·STMicroelectronics·TI가 공동 설립. *Mobile Industry Processor Interface*. 핸드폰 안의 *SoC ↔ 페리퍼럴* 인터페이스를 표준화하자는 동기.

### 멤버 — 사실상 모든 SoC·센서 회사

- **SoC** — Qualcomm, MediaTek, Apple, Samsung, NXP, Renesas
- **이미지 센서** — Sony, Samsung, OmniVision, ON Semi
- **디스플레이** — Samsung Display, LG Display, BOE
- **EDA·도구** — Cadence, Synopsys, Keysight

→ 의장 자리에 *Qualcomm CTO* 같은 사람이 앉아 있는 *진짜 산업 표준*.

## 한눈에 보는 스택

![MIPI Alliance protocol stack](/images/blog/mipi/diagrams/ch01-mipi-stack.svg)

**물리 계층 (PHY)** + **프로토콜 계층** + **응용 영역** 3 층.

## 물리 계층 (PHY) — 4 종류

| PHY | 라인 수 | 최대 속도 | 특징 |
| --- | --- | --- | --- |
| **D-PHY** | 1+N pair (1 clock + N data) | 2.5-9 Gbps/lane | 가장 흔함 — CSI-2/DSI 기본 |
| **C-PHY** | 3 wires (1 trio) | 3.5-7 GS/s | 3-wire 심볼, 라인 절약 |
| **M-PHY** | 1+ lane | 11.6 Gbps (HS-G5) | UFS·UniPro·SSIC |
| **A-PHY** | 1 lane (coax/STP) | 16 Gbps | 자동차 장거리 (15 m) |

D-PHY가 가장 일반적. C-PHY는 *라인 수 부족 시*, M-PHY는 *저장장치 (UFS)*, A-PHY는 *자동차 카메라*.

## 프로토콜 계층 — 카메라·디스플레이·기타

### 카메라

- **CSI-2** (Camera Serial Interface 2) — 이미지 센서 → SoC
- **CSI-3** — 일부 응용 (drone 등), 채택 적음

### 디스플레이

- **DSI** (Display Serial Interface) — SoC → 패널
- **DSI-2** — 고해상도·DSC (Display Stream Compression)

### 기타 응용

- **I3C** — I²C 후속 (4편 참조)
- **SoundWire** — 오디오 (스마트폰 마이크·스피커)
- **SLIMbus** — 오디오 (구식, deprecated)
- **MIPI Debug** — JTAG 확장 (HSI·STP)
- **RFFE** (RF Front End) — RF 모듈 제어
- **BIF** (Battery Interface)
- **SPMI** (System Power Management Interface)

## 어디 쓰나 — 실제 시스템 예

### 스마트폰

```text
Image Sensor (Sony IMX) ── D-PHY × 4 lanes ── CSI-2 ── SoC
SoC ── D-PHY × 4 lanes ── DSI ── Display Panel (AMOLED)
SoC ── SoundWire ── Speaker / Mic
SoC ── I3C ── Sensor Hub
SoC ── RFFE ── RF Modem
```

### 자동차 — 후방·서라운드뷰 카메라

```text
ECU ── A-PHY 16 Gbps ── 차량 길이 15 m ── 후방 카메라 모듈
                                          │
                                          └ CSI-2/D-PHY (모듈 내부)
```

### 로봇 vision

```text
SoC (Jetson) ── D-PHY × 4 ── CSI-2 ── Sony IMX568 (글로벌 셔터)
```

### AR/VR

```text
SoC ── DSI-2 + DSC ── micro-OLED 패널 × 2 (양안)
```

## CSI-2 / DSI 위치

이 시리즈가 가장 깊게 다룰 두 프로토콜:

| | CSI-2 | DSI |
| --- | --- | --- |
| **방향** | 센서 → SoC | SoC → 패널 |
| **데이터** | RAW Bayer, YUV, RGB | RGB pixel |
| **속도** | 수 Gbps/lane | 수 Gbps/lane |
| **PHY** | D-PHY 또는 C-PHY | D-PHY 또는 C-PHY |
| **메타** | EXIF, Embedded Data | 패널 제어 명령 (MIPI DCS) |
| **표준 버전** | v1.0 (2005) → v4.2 (2024) | v1.0 (2006) → v2.0 (2017) |

## 표준 라이선스 정책

MIPI 표준은 *멤버사만* 무료 접근. 비멤버는 *문서 구매* ($수천 unit). 일부는 *공개 요약본* 제공.

오픈소스 (Linux V4L2, libcamera 등)는 *주요 정보*를 reverse-engineer + 표준 부분 인용으로 구현.

## 이 시리즈 12편 로드맵

1-3. **PHY** — D-PHY, C-PHY
4-6. **CSI-2** — 카메라
7-8. **DSI** — 디스플레이
9. **A-PHY** — 자동차
10-11. **Linux** — V4L2, DRM/KMS, 드라이버
12. **디버깅**

## 정리

- MIPI Alliance = *모바일 SoC 인터페이스 표준화* (2003) → 자동차·로봇으로 확장.
- **PHY 4 종**: D·C·M·A — 응용 영역별 분리.
- **CSI-2** (카메라)와 **DSI** (디스플레이)가 가장 흔함.
- **A-PHY**는 자동차 장거리 (16 Gbps, 15 m).
- 멤버사 무료, 비멤버 *문서 구매*.

다음 편은 **D-PHY** — LP/HS 모드, 차동 신호.

## 관련 항목

- [Ch 2: D-PHY](/blog/embedded/protocols/mipi/chapter02-d-phy)
- [Embedded Serial (SPI/I²C/UART)](/blog/embedded/protocols/embedded-serial/chapter01-overview)
