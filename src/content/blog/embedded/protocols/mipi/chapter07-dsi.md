---
title: "Ch 7: DSI — Command vs Video Mode, DCS, 양방향"
date: 2026-05-16T07:00:00
description: "SoC → 패널. Command mode (frame buffer 패널)와 Video mode (continuous stream)의 두 사용 패턴."
series: "MIPI 심화"
seriesOrder: 7
tags: [mipi, dsi, display, command-mode, video-mode, dcs]
draft: true
---

## 한 줄 요약

> **"패널이 frame buffer 있으면 Command, 없으면 Video"** — 두 mode의 본질.

## DSI — SoC → 패널

CSI-2의 *반대 방향*: SoC가 *송신자*, 패널이 *수신자*. PHY 모델 (D/C-PHY, LP/HS), packet 구조 (Short/Long), ECC/CRC 등은 *CSI-2와 동일*. 다른 점은:

- **방향** — Master = SoC, Slave = 패널
- **2 mode** — Command vs Video
- **Bidirectional** — 패널이 *상태 read-back* 가능 (LP reverse)

## Command Mode

패널 안에 *frame buffer* 있음 (대부분 OLED). SoC는 *변화 있을 때만* 픽셀 update.

```text
SoC: "Memory Write Start" → 픽셀 데이터 → "Memory Write End"
Panel: 자체 buffer 업데이트, 자기 refresh로 화면 출력
```

### 장점

- *부분 업데이트* — 작은 영역만 보내면 됨
- *Tearing-free* — 패널이 자기 timing으로 표시
- *저전력* — idle 시 DSI 라인 끔

### 단점

- 패널 칩에 *RAM* 필요 → 가격 ↑
- *고해상도 + 고프레임률*은 어려움 (RAM 부담)

### 적용

- 스마트워치 (1.4" AMOLED)
- 일부 폰 AMOLED (LP 모드)
- 정적 컨텐츠 시계·HUD

## Video Mode

패널 buffer 없음 (대부분 LCD). SoC가 *매 픽셀 매 프레임 송신*. *진짜 연속 스트림*.

```text
SoC: H-Sync → Active Pixel × 1080 → H-Blank → ... × 1920줄
     V-Sync → 다음 프레임
```

### 3 변종

| 변종 | 특징 |
| --- | --- |
| **Non-Burst Sync Pulse** | H/V-Sync 정확히 통신 |
| **Non-Burst Sync Events** | Sync은 packet으로, blank는 자체 |
| **Burst Mode** | Active만 HS, blank 동안 *LP*로 절전 |

**Burst Mode**가 모던 표준 — burst 사이 *LP-11*로 절전.

### 장점

- *고해상도·고프레임* (4K 120 Hz OK)
- 패널 가격 ↓

### 단점

- *Tearing* 가능 (V-Sync 정확해야)
- *Continuous clock* 또는 정밀 timing 필요
- 절전 어려움

### 적용

- 폰 LCD
- 차량 클러스터
- 모니터·TV

## 한눈에 보는 비교

![DSI Command vs Video mode](/images/blog/mipi/diagrams/ch07-dsi-modes.svg)

Command mode의 *partial update* vs Video mode의 *continuous frame*.

## DCS — Display Command Set

MIPI 표준 명령 셋 (MIPI DCS 표준 문서, 영문 ~200 pages). 모든 DSI 패널이 *기본 명령은 같음*.

### 흔한 DCS 명령

| 코드 | 명령 | 의미 |
| --- | --- | --- |
| 0x01 | Soft Reset | 패널 reset |
| 0x10 | Sleep In | 절전 진입 |
| 0x11 | Sleep Out | 절전 해제 |
| 0x12 | Partial Mode On | 부분 표시 |
| 0x13 | Normal Mode On | 전체 표시 |
| 0x20 | Inversion Off | 색반전 끔 |
| 0x21 | Inversion On | — |
| 0x28 | Display Off | 화면 끔 |
| 0x29 | Display On | 화면 켬 |
| 0x2A | Column Address Set | X 영역 |
| 0x2B | Row Address Set | Y 영역 |
| 0x2C | Memory Write Start | 픽셀 데이터 시작 |
| 0x3A | Pixel Format Set | RGB565/666/888 |
| 0x36 | Address Mode | rotation/mirror |

### Vendor-Specific

`0x70+` 또는 *Manufacturer Command Set Protect Off* 후 비표준 명령. 패널 *튜닝* (감마 곡선, 백라이트 PWM 등).

### 부팅 시퀀스 예 — Sleep Out → Display On

![DSI panel startup sequence (tikz-timing)](/images/blog/mipi/diagrams/ch07-dsi-panel-startup.svg)

```c
// 1. Reset
dsi_dcs_write_short(0x01);
msleep(120);

// 2. Sleep Out
dsi_dcs_write_short(0x11);
msleep(120);

// 3. Pixel Format = RGB888
dsi_dcs_write_long(0x3A, 0x77, 1);

// 4. Memory Address Mode
dsi_dcs_write_long(0x36, 0x00, 1);

// 5. Display On
dsi_dcs_write_short(0x29);
msleep(20);

// 6. Video Stream 시작
dsi_start_video();
```

타이밍 `120 ms` 등은 *패널 데이터시트*의 *startup sequence*에서 가져옴.

## MIPI DBI vs DPI vs DSI — 헷갈리기 쉬움

| | DBI | DPI | DSI |
| --- | --- | --- | --- |
| **풀네임** | Display Bus Interface | Display Pixel Interface | Display Serial Interface |
| **인터페이스** | 8-bit/16-bit parallel + RD/WR | RGB888 parallel + H/V Sync | MIPI D/C-PHY 직렬 |
| **속도** | 수 MHz | 수십 MHz | 수 Gbps |
| **핀 수** | 11-22 | 28+ | 6-12 |
| **mode** | Command (buffer) | Video only | Command + Video |
| **사용** | 작은 LCD | 옛 LCD | 모든 모던 |

DSI가 사실상 모든 모던 디스플레이의 답. DBI는 임베디드 작은 LCD, DPI는 옛 시스템.

## 양방향 — Read-Back

패널 *상태 읽기* — Power Status, Display ID, Self-Diagnostic 등.

```text
SoC (LP-mode reverse): "Read Display Status" (Short Packet)
Panel: status 데이터 (Long Packet, LP 방향)
```

대부분 *initial bring-up*과 *진단*에 사용. 운영 중엔 거의 안 함.

## SoC DSI 페리퍼럴

| SoC | DSI 페리퍼럴 | 최대 |
| --- | --- | --- |
| STM32H7/MP1 | 1 controller, 2 lane | 1.5 Gbps × 2 |
| NXP i.MX 8M | 1 controller, 4 lane | 2.5 Gbps × 4 |
| Qualcomm SDM | 다수 controller | 8.5 Gbps × 4 |
| Apple A14 | 2 controller, 4 lane | 표준 |

STM32 LTDC (LCD-TFT) → DSI Host → D-PHY → 패널. 표준 패턴.

## 자주 하는 실수

> ⚠️ Sleep Out 후 충분 wait 안 함

데이터시트 `120 ms` 무시 → 첫 프레임 *깨짐*. *항상* 권장 wait.

> ⚠️ Pixel Format 미설정

`0x3A` 명령 안 보내면 패널이 *기본 format* (가끔 *RGB565*) → SoC가 *RGB888* 보내면 *색 뒤집힘*.

> ⚠️ Command Mode 패널에 Video Stream

Command mode 패널에 *continuous video* → 패널 *오버플로*. 패널 데이터시트의 *Command Mode 명시* 확인.

> ⚠️ LP 반대 모드 — read-back

Read는 *LP에서만*. HS 도중 read 시도 → 깨짐. *Video stream 정지 → LP 진입 → Read*.

## 정리

- DSI = **CSI-2의 반대 방향** — SoC → 패널.
- **Command mode** (패널 buffer 있음) vs **Video mode** (continuous).
- **DCS** — 표준 명령 셋 (Reset, Sleep Out, Display On, Pixel Format 등).
- 패널 startup은 *데이터시트 시퀀스 + 타이밍* 정확히.
- DBI/DPI/DSI 구분 — DSI가 모던 표준.

다음 편은 **DSI-2** — 고해상도·DSC·LRTE.

## 관련 항목

- [Ch 6: CSI-2 v4](/blog/embedded/protocols/mipi/chapter06-csi2-v4)
- [Ch 8: DSI-2](/blog/embedded/protocols/mipi/chapter08-dsi2)
