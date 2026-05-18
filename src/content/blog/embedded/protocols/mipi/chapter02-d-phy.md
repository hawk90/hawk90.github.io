---
title: "Ch 2: D-PHY — LP/HS Dual-Mode, Clock + N Data Lane"
date: 2027-05-01T02:00:00
description: "1.2V differential HS + 1.2V single-ended LP. 두 모드 전환이 D-PHY의 핵심 트릭."
series: "MIPI 심화"
seriesOrder: 2
tags: [mipi, d-phy, lp, hs, lanes, burst-mode]
draft: true
---

## 한 줄 요약

> **"HS는 빠르게, LP는 절전으로"** — 두 모드를 *같은 라인*에서 전환하며 *속도 × 전력 효율*을 동시에.

## D-PHY 구조

| 항목 | 값 |
| --- | --- |
| **Topology** | 1 clock lane + N data lane (1·2·4·8) |
| **신호** | 차동 (HS), single-ended (LP) |
| **전압** | HS: ±200 mV, LP: 0-1.2V |
| **클럭** | DDR (rising + falling edge 데이터) |
| **속도/lane** (D-PHY v3.0) | ~9 Gbps (3D-stacking 옵션) |
| **속도/lane** (D-PHY v2.5, 2019) | ~4.5 Gbps |
| **속도/lane** (D-PHY v1.2, 표준 시판) | 2.5 Gbps |

## 한눈에 보는 구조

![D-PHY topology — clock + data lanes](/images/blog/mipi/diagrams/ch02-d-phy-topology.svg)

송신자 (예: 이미지 센서) → 수신자 (예: SoC). N개 lane에 *공통 clock lane* 1개.

## LP / HS Dual-Mode

```text
┌─────────────────────────────────────────────────────┐
│ LP-11 (idle, 둘 다 1.2V)                             │
│   ↓ LP-01, LP-00, ...  (mode entry sequence)        │
│ HS Sync (00011101)                                  │
│   ↓ HS payload — DDR, ±200mV                        │
│ HS Trail → LP-11 복귀                                │
└─────────────────────────────────────────────────────┘
```

### LP (Low-Power) Mode

| 항목 | 값 |
| --- | --- |
| 신호 | Single-ended, 두 라인 *각각 독립* (4 상태) |
| 전압 | 0V (LP-low) ~ 1.2V (LP-high) |
| 속도 | ≤ 10 MHz (control용) |
| 전력 | 매우 낮음 |
| 4 상태 | LP-00, LP-01, LP-10, LP-11 |
| 용도 | Wake/Sleep, ULPS, escape mode |

### HS (High-Speed) Mode

| 항목 | 값 |
| --- | --- |
| 신호 | Differential, *두 라인 역상* |
| 전압 | DP - DN = ±200 mV |
| 속도 | 100 Mbps - 9 Gbps |
| 전력 | LP의 ~10배 |
| 인코딩 | DDR (rising + falling) |
| 용도 | Pixel data, packet body |

### 모드 전환 — Burst Mode

매 데이터 packet마다 LP→HS→LP 전환. 정지 중엔 LP-11 (절전), 데이터 보낼 때만 HS.

```text
시간 → 
LP-11 ── LP-01 ── LP-00 ── HS-Zero ── HS Sync ── HS data ─── HS Trail ── LP-11
       └─ entry ─┘         └ pre-amble┘                       └─ exit ──┘
```

각 단계의 *타이밍 사양*이 표준에 정확히 명시 (`THS-PREPARE`, `THS-SETTLE`, `THS-TRAIL` 등).

## Lane 구성

### 1-lane

- 저해상도 카메라, 일부 디스플레이
- ~ 2.5 Gbps 충분

### 2-lane

- 중급 카메라 (12 MP @ 30 fps)

### 4-lane (가장 흔함)

- 고해상도 카메라 (48 MP @ 30 fps, 12 MP @ 240 fps)
- AMOLED 패널

### 8-lane (드물)

- 고급 매니지드 카메라 (108 MP)
- 8K 디스플레이

> 💡 **각 lane은 독립** — bit-by-bit 정렬. lane 간 *skew* 보정은 수신자 책임.

## Clock Lane — Continuous vs Non-Continuous

| 모드 | 동작 | 사용처 |
| --- | --- | --- |
| **Continuous** | 데이터 idle 중에도 clock 계속 toggling | 비디오 (한 프레임 끝나도 클럭 유지) |
| **Non-Continuous** | 데이터 burst 동안만 clock | 절전 (idle 시 클럭 off) |

CSI-2 비디오 스트리밍 = continuous, 사진 한 장 = non-continuous.

## 핀 / 커넥터

### 스마트폰 — board-to-board

FPC 커넥터 (Hirose CL Series 등) — 0.4 mm pitch, 30-50 핀. lane당 *2 핀* + clock *2 핀* + GND/VDD.

### 카메라 모듈 — FAKRA 또는 GMSL/FPD-Link III

자동차에선 *별도 SerDes 칩*으로 D-PHY → coax 변환. 진짜 D-PHY는 *모듈 내부 짧은 케이블만*.

## STM32 / Linux SoC D-PHY 컨트롤러

### STM32MP1 — DSI-Host 페리퍼럴

```c
DSI_HandleTypeDef hdsi;

DSI_PLLInitTypeDef pll = {
    .PLLNDIV = 100,           // PLL multiplier
    .PLLIDF = DSI_PLL_IN_DIV1,
    .PLLODF = DSI_PLL_OUT_DIV1,
};
DSI_PHY_TimerTypeDef phy_timer = {
    .ClockLaneHS2LPTime = 35,
    .ClockLaneLP2HSTime = 35,
    .DataLaneHS2LPTime = 35,
    .DataLaneLP2HSTime = 35,
    .DataLaneMaxReadTime = 0,
    .StopWaitTime = 0,
};

hdsi.Init.NumberOfLanes = DSI_TWO_DATA_LANES;
hdsi.Init.TXEscapeCkdiv = 4;
HAL_DSI_Init(&hdsi, &pll);
HAL_DSI_ConfigPhyTimer(&hdsi, &phy_timer);
```

각 *타이밍 파라미터*는 데이터시트의 PHY timing 표 + 실제 패널 데이터시트를 *둘 다 만족*해야.

### NVIDIA Jetson — CSI 입력

```bash
# 디바이스 트리에서 lane 수 설정
&csi {
    csi_ep: endpoint {
        bus-type = <4>;          // MIPI CSI-2 D-PHY
        clock-lanes = <0>;
        data-lanes = <1 2 3 4>;
        lane-polarities = <0 0 0 0 0>;
    };
};
```

## Settle Time — 디버깅의 핵심

`THS-SETTLE` — HS 시작 후 *수신자가 안정 sample*하기까지의 시간. 잘못 설정 시:

- *너무 짧음* — preamble 비트까지 sample → 데이터 깨짐
- *너무 김* — 진짜 데이터 일부 놓침

값은 *bit time + 일정 마진*. 대개 *85-145 ns* 범위. 카메라 센서·SoC 데이터시트의 *권장값*을 따름.

## 자주 하는 실수

> ⚠️ Lane skew

각 lane의 PCB 트레이스 길이가 *다르면* — bit-level skew. ±5 mm 이내 *matched length* 필수. PCB 디자이너의 *시간 소모 작업*.

> ⚠️ Continuous clock 가정

비디오 스트리밍은 continuous, 사진 캡처는 non-continuous. *디바이스 트리에서 명시 안 함* → 첫 프레임 후 멈춤.

> ⚠️ Settle time 부정확

기본값으로 두면 *고속 카메라 (12 MP @ 60 fps)*에서 *간헐 깨짐*. 센서 데이터시트의 `T_CLK-SETTLE`·`T_HS-SETTLE` 값 적용.

> ⚠️ Power-on 순서

D-PHY VDD (1.8V·3.3V) → 클럭 → reset deassert → I²C 명령 → CSI-2 stream. 순서 틀리면 *Sensor never starts*.

## 정리

- D-PHY = **clock + N data lane** + **LP/HS dual-mode**.
- LP — 절전 control, HS — 고속 차동 데이터.
- 모드 전환 시퀀스 (`LP-11 → entry → HS → exit → LP-11`)와 *정밀 타이밍* (`THS-PREPARE`, `THS-SETTLE`).
- 1·2·4·8 lane — 보통 **4 lane**.
- Continuous vs Non-continuous clock — 비디오는 continuous.
- Lane skew · settle time · power 순서가 디버깅의 90%.

다음 편은 **C-PHY** — 3-wire 심볼.

## 관련 항목

- [Ch 1: MIPI 개요](/blog/embedded/protocols/mipi/chapter01-overview)
- [Ch 3: C-PHY](/blog/embedded/protocols/mipi/chapter03-c-phy)
- [Ch 4: CSI-2 기초](/blog/embedded/protocols/mipi/chapter04-csi2-basics)
