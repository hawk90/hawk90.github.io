---
title: "1-12: LVDS / 차동 신호 일반"
date: 2026-05-12T12:00:00
description: "고속 차동 신호 (LVDS·LVPECL·CML)·impedance matching."
series: "Modern Embedded Recipes"
seriesOrder: 12
tags: [recipes, lvds, hw-basics]
draft: false
---

## 한 줄 요약

> **"LVDS는 작은 전압 swing으로 큰 속도를 얻습니다."** 350 mV 차동, 100Ω 종단으로 Gbps급 전송이 가능합니다.

## 어떤 상황에서 쓰나

- LCD/LVDS 디스플레이 panel 인터페이스
- 카메라 센서(MIPI CSI는 LVDS 변종)
- 보드 간 high-speed backbone(SerDes)
- PCIe, SATA, USB 3.0의 기반 신호

## 핵심 개념

### 1) LVDS 신호 정의

| 항목 | 값 |
| --- | --- |
| Driver | 전류 모드 (3.5 mA) |
| 종단 | receiver 쪽 100 Ω 차동 저항 |
| Common-mode | 약 1.2 V |
| 차동 swing | ±350 mV (high = +350, low = −350) |
| 계산 | V = I × R = 3.5 mA × 100 Ω = 350 mV |

전류 모드 driver(3.5 mA)가 종단 저항 100Ω을 통해 흐릅니다. V = I × R = 3.5 mA × 100Ω = 350 mV.

작은 swing 덕에 EMI가 적고, 빠르게 전환할 수 있습니다.

### 2) 100Ω 차동 종단

전송선 임피던스 매칭이 중요합니다. PCB 트레이스를 100Ω 차동으로 설계하고, receiver에 100Ω 저항을 답니다.

```text
   |__|  |__|  |__|         두 라인이 평행
   ─── ─── ─── ───          spacing이 임피던스를 결정
```

| Trace width | Spacing | 차동 임피던스 (FR-4, 0.13 mm) |
| --- | --- | --- |
| 0.15 mm | 0.15 mm | 100Ω |
| 0.20 mm | 0.20 mm | 95Ω |
| 0.10 mm | 0.10 mm | 105Ω |

기판 stack-up과 dielectric에 따라 변하므로 시뮬레이션(예: Saturn PCB Toolkit)이 필수입니다.

### 3) 차동 패밀리 비교

| 패밀리 | Swing | Common-mode | 속도 |
| --- | --- | --- | --- |
| LVDS | ±350 mV | 1.2 V | < 3 Gbit/s |
| LVPECL | ±400 mV | V_CC - 1.3 V | < 5 Gbit/s |
| CML | ±400 mV | V_CC - 0.4 V | < 28 Gbit/s |
| HCSL (PCIe ref clk) | ±350 mV | 0.35 V | 100 / 125 MHz clk |

CML(Current Mode Logic)이 PCIe, SATA, USB 3.0의 실제 PHY입니다. LVDS는 더 낮은 속도 영역.

### 4) Pre-emphasis와 De-emphasis

긴 cable이나 lossy PCB에서는 high-frequency가 attenuate 됩니다. transmitter가 transition 직후를 의도적으로 overshoot 하면 receiver에서 평탄해집니다.

```text
   Original   Pre-emphasized   At receiver
   ┌──┐       ┌─┐__              ┌──┐
   │  │       │       __│  │  →  │  │
   ┘  └       ┘                   ┘  └
```

PCIe Gen3 이상, SATA III, 10G Ethernet 등이 모두 사용합니다.

### 5) 신호 무결성 — Eye diagram

고속 차동에서는 oscilloscope의 "eye diagram"으로 신호 품질을 봅니다. 여러 비트를 겹쳐 그려 *눈*이 얼마나 열려 있는지 확인합니다.

```text
   ─┐ ┌─┐ ┌─        eye 가운데 wide → good
    │ │ │ │
   ─┘ └─┘ └─        eye가 좁거나 닫힘 → reflection, jitter, 손실
```

기준 spec(예: PCIe receiver eye mask)이 있어 통과 여부를 판정합니다.

## 코드 / 실제 사용 예

대부분의 LVDS는 hardware PHY로 처리되므로 SW 코드가 거의 없습니다. 다음은 LVDS-friendly한 클럭을 routing 하는 예입니다.

```c
// FPGA Verilog — LVDS output
OBUFDS #(
    .IOSTANDARD("LVDS_25"),
    .SLEW("FAST")
) clk_out_buf (
    .O(CLK_P),
    .OB(CLK_N),
    .I(clk_int)
);
```

MIPI CSI-2 같은 카메라 인터페이스는 SoC의 DPHY 블록이 LVDS 신호를 처리하고, 드라이버는 단지 lane 수, frequency를 설정합니다.

```text
DT 노드 예시
&csi {
    status = "okay";
    data-lanes = <1 2 3 4>;
    link-frequencies = /bits/ 64 <800000000>;   // 800 MHz
};
```

## 측정 / 비교

| 표준 | 속도 / lane | Lane 수 | 총 대역폭 |
| --- | --- | --- | --- |
| LVDS (FPGA-out) | 3 Gbit | 8 | 24 Gbit |
| MIPI D-PHY | 4.5 Gbit | 4 | 18 Gbit |
| PCIe Gen3 | 8 Gbit | 16 | 128 Gbit |
| PCIe Gen4 | 16 Gbit | 16 | 256 Gbit |
| PCIe Gen5 | 32 Gbit | 16 | 512 Gbit |
| HDMI 2.1 | 12 Gbit | 4 (TMDS+) | 48 Gbit |

| FR-4 (1 GHz 신호) 손실 | 길이 |
| --- | --- |
| -3 dB | 약 15 cm |
| -6 dB | 약 30 cm |
| -10 dB | 약 50 cm (pre-emphasis 필수) |

## 자주 보는 함정

> ⚠️ 종단 누락 또는 잘못된 임피던스

100Ω 표준 LVDS에 50Ω 저항을 달면 reflection으로 eye가 닫힙니다. data sheet의 termination 권장을 따릅니다.

> ⚠️ 차동 pair 매칭 불량

두 line의 길이 차이가 클럭 한 cycle의 5%를 넘으면 phase shift로 eye가 좁아집니다. PCB 라우팅 도구의 "length matching" 기능 활용.

> ⚠️ 인접 layer crosstalk

LVDS pair 위/아래에 다른 high-speed signal이 있으면 noise가 침범합니다. ground plane을 적층으로 분리합니다.

> ⚠️ DC blocking cap 누락

서로 다른 common-mode를 가진 receiver와 transmitter를 직결하면 동작이 안 됩니다. 100 nF DC blocking cap이 거의 항상 필요합니다(PCIe, SATA 등 standard).

> ⚠️ Connector impedance discontinuity

좋은 PCB 디자인을 했어도 일반 0.1 inch 헤더에 LVDS를 통과시키면 reflection으로 깨집니다. SMP, MMCX 같은 차동 connector 사용.

## 정리

- LVDS는 350 mV 작은 swing으로 Gbit급 차동 통신을 합니다.
- 100Ω 차동 임피던스 PCB 트레이스와 100Ω 종단이 표준입니다.
- LVPECL, CML, HCSL 등 변종이 PCIe, SATA, USB 3.0의 기반입니다.
- 긴 거리는 pre-emphasis로 손실을 보상합니다.
- Eye diagram으로 신호 품질을 판정합니다.
- 차동 pair 매칭, 종단, 인접 layer crosstalk이 흔한 문제 원인입니다.

다음 편에서는 **Part 2 — ARM 아키텍처** 영역으로 들어갑니다. Cortex-M 코어부터 비교합니다.

## 관련 항목

- [1-05: SPI 하드웨어](/blog/embedded/modern-recipes/part1-05-spi-hardware)
- [1-10: CAN 버스 전기적 특성](/blog/embedded/modern-recipes/part1-10-can-electrical)
- [1-11: RS-485 / RS-422 차동 신호](/blog/embedded/modern-recipes/part1-11-rs485-rs422)
- [2-01: Cortex-M 시리즈 비교](/blog/embedded/modern-recipes/part2-01-cortex-m-comparison)
