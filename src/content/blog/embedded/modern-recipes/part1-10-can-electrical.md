---
title: "CAN 버스 전기적 특성 — 종단·전압 레벨·GND 전위차와 1 Mbit/s 버스 길이 예산"
slug: "embedded/modern-recipes/part1-10-can-electrical"
date: 2026-04-10T09:10:00
description: "CAN_H/CAN_L 전압 범위, 120Ω 종단 확인법, 노드 간 GND 전위차 한계, 그리고 42 MHz STM32 bxCAN과 TCAN1042-Q1 지연에서 1 Mbit/s 버스가 PROP_SEG·oscillator 허용 편차와 함께 몇 m로 묶이는지 데이터시트 값으로 계산합니다."
series: "Modern Embedded Recipes"
seriesOrder: 10
tags: [recipes, can, hw-basics]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> **"1 Mbit/s CAN 버스의 길이는 transceiver·케이블 왕복 지연, 컨트롤러 bit timing이 그 지연에 내줄 수 있는 PROP_SEG, 그 분할이 남기는 oscillator 허용 편차가 함께 정합니다."** 종단이 파형을 지키고, 왕복 지연이 PROP_SEG 안에 들어와야 arbitration이 맞게 끝납니다.

이 글은 보드에 CAN transceiver를 붙이고 종단·배선 길이·bitrate를 정해야 하는 펌웨어·하드웨어 개발자를 위한 글입니다. CAN frame 구조와 비트 하나를 SYNC·PROP·PHASE 구간으로 나누는 bit timing의 기본은 알고 있다고 가정합니다. bxCAN 레지스터로 frame을 보내고 filter를 거는 방법은 [5-10: CAN 통신 구현](/blog/embedded/modern-recipes/part5-10-can-communication)에서 다루고, 여기서는 그 아래층인 전기 신호와, 그 신호가 bit timing 설정에 요구하는 숫자만 봅니다.

인용한 수치와 규칙에는 그 문장에 자료와 절 번호를 붙였고, 전체 목록은 「참고 자료」에 있습니다. 길이·허용 편차 표와 40 m 판정은 그 값으로 이 글이 계산한 결과입니다. "SLLA270 4.9절"처럼 적은 것은 그 자료의 절이고, 이 글 안의 절은 「왕복 지연 예산」처럼 제목으로 부릅니다.

## 이 글이 답하는 질문

- 오실로스코프로 CAN_H·CAN_L을 찍었을 때 어떤 전압이 정상인가? → [1) 차동 신호](#1-차동-신호--데이터시트가-보장하는-전압-범위), 측정은 [보드에서 확인하는 순서](#보드에서-확인하는-순서) 2·3단계
- 종단 저항이 맞게 달렸는지 어떻게 확인하는가? → [2) 종단](#2-종단--120-ω-두-개-그리고-확인하는-방법), 측정은 1단계
- 1 Mbit/s에서 버스를 몇 m까지 쓸 수 있는가, 그리고 그 근거는 무엇인가? → [3) 왕복 지연 예산](#3-왕복-지연-예산--1-mbits에서-몇-m까지-되는가)과 [실제 사용 예](#실제-사용-예--42-mhz-bxcan-1-mbits-설정을-길이에서-거꾸로-고르기)
- 노드 사이 GND 전위차는 어디까지 버티는가? → [4) Common-mode 전압과 공통 GND](#4-common-mode-전압과-공통-gnd), 측정은 4단계

TI [SLLA270 "Controller Area Network Physical Layer Requirements"](https://www.ti.com/lit/an/slla270/slla270.pdf)(2008-01) 초록은 high-speed CAN을 *ISO 11898:1993*이라는 판 번호로 소개합니다. 그래서 아래에서 SLLA270을 거쳐 인용하는 ISO 11898 수치(1 Mbit/s에서 40 m, 노드 30개, common-mode −2~+7 V)는 1993년판 기준입니다. 현행 물리층 표준은 ISO 11898-2이고, TCAN1042-Q1 데이터시트는 ISO 11898-2:2016을 충족한다고 적습니다(1쪽 Features). 이 글은 ISO 11898-2:2016 원문과 대조하지 않았으므로, 1993년판 수치에는 판 번호를 붙여 둡니다.

## 핵심 개념

### 1) 차동 신호 — 데이터시트가 보장하는 전압 범위

CAN_H와 CAN_L의 *차이*(VOD = CANH − CANL)가 신호입니다. 아래는 [TCAN1042-Q1 데이터시트](https://www.ti.com/lit/ds/symlink/tcan1042-q1.pdf)(SLLSES9D, 2021-10 개정) 7.7절 Electrical Characteristics의 값입니다. 최소·최대는 권장 동작 조건 전체(TA −55~125 °C, 7.7절 표 머리)에서 보장되는 값입니다. 모두 Normal mode(STB = 0 V) 행입니다.

| 항목 | 조건 | 최소 | 최대 |
| --- | --- | ---: | ---: |
| Dominant CANH 출력 | 50 Ω ≤ RL ≤ 65 Ω | 2.75 V | 4.5 V |
| Dominant CANL 출력 | 50 Ω ≤ RL ≤ 65 Ω | 0.5 V | 2.25 V |
| Dominant 차동 VOD | 50 Ω ≤ RL ≤ 65 Ω | 1.5 V | 3 V |
| Dominant 차동 VOD | 45 Ω ≤ RL < 50 Ω | 1.4 V | 3 V |
| Recessive CANH·CANL | 무부하 | 2 V | 3 V (typ 0.5 × VCC) |
| Recessive 차동 VOD | RL = 60 Ω | −120 mV | 12 mV |
| 수신기 dominant 판정 VIT+ | −20 V ≤ VCM ≤ +20 V | — | 0.9 V |
| 수신기 recessive 판정 VIT− | −20 V ≤ VCM ≤ +20 V | 0.5 V | — |
| 수신기 dominant 판정 VIT+ | −30 V ≤ VCM ≤ +30 V | — | 1.0 V |
| 수신기 recessive 판정 VIT− | −30 V ≤ VCM ≤ +30 V | 0.4 V | — |

읽는 방법은 이렇습니다.

- 스코프에서 dominant 구간의 CANH − CANL이 1.5 V 아래면 데이터시트 보장 범위 밖입니다. 이 보장은 부하가 50~65 Ω일 때의 값이고, 120 Ω 두 개를 병렬로 단 정상 버스가 60 Ω입니다. 부하가 45~50 Ω으로 내려가면 최소값은 1.4 V입니다.
- Recessive에서 두 선은 구동되지 않고, 수신기의 높은 입력 저항 RIN을 통해 VCC/2로 bias됩니다(TCAN1042-Q1 9.4.1절 "CAN Bus States"). recessive 구간에서 두 선이 같은 전압에 붙어 있는 것이 정상입니다.
- 수신기 Function Table(Table 9-5)은 VID ≥ VIT+(max)를 dominant, VID ≤ VIT−(min)을 recessive로 보고, 그 사이를 "?"(판정 불확정)로 둡니다. common-mode가 ±20 V 안이면 그 띠는 0.5~0.9 V이고, ±20~30 V까지 밀리면 0.4~1.0 V로 넓어집니다. 반사나 노이즈로 VOD가 이 띠 안에서 흔들리면 RXD 출력은 보장되지 않습니다.

### 2) 종단 — 120 Ω 두 개, 그리고 확인하는 방법

SLLA270 4장에 따르면 ISO 11898(1993년판)은 특성 임피던스 120 Ω의 twisted-pair 한 줄을 쓰고, 양 끝을 120 Ω으로 종단해 반사를 막습니다. 같은 절은 노드 *안에* 종단 저항을 두지 말라고 합니다. 그 노드를 버스에서 빼면 종단도 함께 사라지기 때문입니다. SLLA270 Figure 7은 종단 없는 1 m 케이블에서 반사파가 약 10 ns 간격의 계단으로 쌓이는 파형을 보여 줍니다. 종단이 빠진 버스를 스코프로 보면 이런 계단이 에지에 붙습니다.

종단은 CANH와 CANL *사이*에 답니다(SLLA270 Figure 8). 저항계로 확인할 때는 모든 노드의 전원을 끕니다. TCAN1042-Q1 데이터시트 9.3.4절 "Unpowered Device"는 전원이 없을 때 버스 단자의 누설 전류가 매우 작아 버스에 부하가 되지 않는다("ideal passive" 또는 "no load")고 적었고, Microchip [MCP2561/2 데이터시트](https://ww1.microchip.com/downloads/en/DeviceDoc/20005167C.pdf)(DS20005167C)도 전원이 없으면 버스 핀이 분리된다고 적었습니다(1쪽 Features). 그래서 측정값에는 종단 저항만 남습니다.

| CANH–CANL 측정값 | 의미 |
| ---: | --- |
| 60 Ω (120 ‖ 120) | 120 Ω 두 개 (정상) |
| 120 Ω | 종단이 하나 빠짐 |
| 40 Ω (120 ‖ 120 ‖ 120) | 120 Ω 세 개 — 중간 노드에도 종단이 달림 |

전원을 켠 채 재면 수신기 입력 저항이 병렬로 붙습니다. TCAN1042-Q1의 차동 입력 저항 RID는 30~80 kΩ입니다(7.7절, 전원 인가 조건). SLLA270이 인용하는 ISO 11898(1993년판)의 최대 노드 수 30개가 모두 최소값 30 kΩ이면 병렬 1 kΩ이 되고, 60 Ω 종단과 합치면 60 ‖ 1000 ≈ 56.6 Ω으로 읽힙니다. 전원을 켠 측정값이 60 Ω보다 조금 낮다고 종단을 의심할 필요는 없다는 뜻입니다.

### 3) 왕복 지연 예산 — 1 Mbit/s에서 몇 m까지 되는가

SLLA270 4장은 ISO 11898 고속 규격의 사양이 "최대 1 Mbps, 버스 길이 40 m, 노드 최대 30개"를 기준으로 주어진다고 적고, Table 1에 권장 케이블 길이를 둡니다.

| Bitrate | 권장 최대 버스 길이 |
| ---: | ---: |
| 1 Mbit/s | 40 m |
| 500 kbit/s | 100 m |
| 250 kbit/s | 200 m |
| 100 kbit/s | 500 m |
| 50 kbit/s | 1000 m |

이 길이를 묶는 것은 arbitration입니다. Bosch의 F. Hartwich·A. Bassemir, [The Configuration of the CAN Bit Timing](http://www.oertel-halle.de/files/cia99paper.pdf)(6th iCC, 1999, 제3자 사본) 2절은 bitwise arbitration과 수신 노드의 dominant ACK 때문에 송신 노드가 자기와 동기된 다른 노드의 dominant 비트를 같은 비트 안에서 받아야 한다고 설명합니다. 다른 노드가 보낸 dominant 에지가 너무 늦게 돌아오면 송신 노드가 recessive를 sampling해 bit error를 내고, error flag로 그 frame을 깨뜨립니다. SLLA270 4.9절도 가장 먼 두 노드 사이를 *갔다 돌아오는* 지연의 합을 계산하고, 첫 비트의 입사파가 sampling보다 *충분히 먼저*("long before") 송신 노드로 돌아와야 한다고 설명합니다.

이 예산을 TCAN1042-Q1 값으로 직접 계산해 보겠습니다. 재료는 세 가지입니다.

- **Transceiver loop delay** (TXD → 버스 → RXD, driver와 receiver를 합친 값, 데이터시트 7.8절, RL 60 Ω·CL 100 pF): recessive → dominant 에지인 `tPROP(LOOP1)`은 typ 100 ns / max 160 ns, dominant → recessive 에지인 `tPROP(LOOP2)`는 typ 110 ns / max 175 ns입니다. SLLA270 Figure 14의 왕복 경로는 노드 A의 driver, 노드 B의 receiver, 노드 B의 driver, 노드 A의 receiver를 한 번씩 거치므로 loop delay 두 개와 같습니다.
- **CAN 컨트롤러 지연**: bxCAN의 노드 지연은 이 글이 인용한 자료에 없으므로, SLLA270 4.9절이 일반 CAN 컨트롤러 값으로 든 50~75 ns를 씁니다.
- **케이블**: SLLA270의 twisted-pair typical 값 5 ns/m, 왕복이므로 길이의 두 배.

컨트롤러 지연을 몇 번 셀지는 자료가 정해 주지 않습니다. SLLA270 4.9절의 618 ns 예시는 상대 노드의 컨트롤러 지연만 한 번 셉니다. Hartwich 논문은 2절에서 왕복을 "노드 A 출력 지연 + 버스 지연 + 노드 B 입력 지연"과 그 반대 방향의 합으로 쓰고, 6절에서 노드 지연을 *프로토콜 컨트롤러 state machine과 버스 연결점 사이*에서 잰다고 정의합니다. 그러나 SLLA270의 50~75 ns가 노드 하나의 입력·출력 지연을 합친 값인지는 어느 자료에도 없습니다. 그래서 이 글은 보수적인 쪽을 기준으로 삼아 컨트롤러 지연을 노드 A와 노드 B에서 한 번씩, 모두 두 번 세고, 한 번만 센 값을 함께 적어 판정이 이 선택에 따라 바뀌는지 봅니다.

어느 loop delay를 쓸지는 에지 방향으로 정합니다. Hartwich 논문 2절이 문제 삼는 것은 노드 A의 recessive → dominant 에지(SOF)에 동기한 노드 B가 보낸 *recessive → dominant 에지*가 늦게 돌아오는 경우입니다. 그래서 같은 방향의 `tPROP(LOOP1)`이 이 조건에 맞는 데이터시트 값입니다. 이 글의 기준선은 max 기준 15 ns 더 큰 LOOP2로 일부러 보수적으로 잡습니다.

| 고정 지연 (케이블 제외) | typ | max |
| --- | ---: | ---: |
| LOOP2 · 컨트롤러 두 번 (이 글의 기준) | 2 × 110 + 2 × 50 = 320 ns | 2 × 175 + 2 × 75 = 500 ns |
| LOOP1 · 컨트롤러 두 번 | 2 × 100 + 2 × 50 = 300 ns | 2 × 160 + 2 × 75 = 470 ns |
| LOOP1 · 컨트롤러 한 번 (SLLA270 예시 방식) | 2 × 100 + 50 = 250 ns | 2 × 160 + 75 = 395 ns |

아래 왕복 지연은 첫 행(LOOP2 · 컨트롤러 두 번) 기준입니다.

| Bitrate · 길이 | 왕복 typ | 왕복 max | Sample point |
| --- | ---: | ---: | ---: |
| 1 Mbit/s · 40 m | 720 ns | 900 ns | 75% · 750 ns |
| 500 kbit/s · 100 m | 1320 ns | 1500 ns | 87.5% · 1750 ns |
| 250 kbit/s · 200 m | 2320 ns | 2500 ns | 87.5% · 3500 ns |

sample point 비율은 Linux 커널 CAN 계층이 bitrate만 받고 sample point를 지정받지 않았을 때 고르는 값입니다. 소스 주석은 이를 "CiA recommended sample points"라 부르고, 800 kbit/s 초과는 75%, 500 kbit/s 초과는 80%, 그 이하는 87.5%를 씁니다([`drivers/net/can/dev/calc_bittiming.c` L13-L23](https://github.com/torvalds/linux/blob/v7.3-rc6/drivers/net/can/dev/calc_bittiming.c#L13-L23), v7.3-rc6 태그).

**왕복은 sample point가 아니라 PROP_SEG 안에 들어와야 합니다.** Bosch [CAN Specification 2.0](http://esd.cs.ucr.edu/webres/can20.pdf)(1991, UC Riverside 사본)은 Part A 8장 "Bit Timing Requirements"에서 PROP_SEG를 "네트워크 안의 물리 지연을 보상하는 구간"으로 정의하고, 그 길이가 "버스 선 전파 시간, 입력 comparator 지연, 출력 driver 지연을 합한 값의 두 배"라고 적었습니다. Hartwich 논문 2절은 같은 조건을 `Prop_Seg ≥ 2 × max(노드 출력 지연 + 버스 지연 + 노드 입력 지연)`으로 쓰고 이유를 설명합니다. 각 노드의 oscillator 편차 때문에 송신 노드의 실제 sample point는 PHASE_SEG1·PHASE_SEG2 범위 안 어디에나 올 수 있습니다. 그래서 상대 노드의 비트는 PHASE_SEG1이 *시작되기 전에* 도착해야 합니다.

이 글은 판정선을 두 개 둡니다.

- **필요조건 (sample point 선)**: 왕복이 nominal sample point 전에 끝난다. oscillator 편차를 0으로 본 값입니다.
- **설계 기준 (PROP_SEG 선)**: 왕복이 PROP_SEG 길이 이하다. Bosch 사양과 Hartwich 논문의 조건입니다.

1 Mbit/s · 75%에서 sample point 선으로 길이를 풀면 기준선 max로 (750 − 500) / 10 ns/m = 25 m, typ로 (750 − 320) / 10 = 43 m입니다. 가장 덜 보수적인 LOOP1 · 컨트롤러 한 번의 max로도 (750 − 395) / 10 = 35.5 m입니다. 그래서 ISO 11898(1993년판)의 40 m는 이 필요조건부터 typ 지연으로만 통과하고, 데이터시트 max 지연으로는 컨트롤러 지연을 몇 번 세든 실패합니다. 40 m 판정을 가르는 입력은 transceiver 지연을 typ로 넣느냐 max로 넣느냐입니다. PROP_SEG 선은 컨트롤러가 PROP_SEG를 몇 TQ까지 낼 수 있느냐에 달려 있어서, 아래 「실제 사용 예」에서 bxCAN으로 숫자를 냅니다. 500 kbit/s · 100 m와 250 kbit/s · 200 m는 기준선 max를 넣어도 왕복이 sample point보다 각각 250 ns, 1000 ns 먼저 끝납니다.

SLLA270 4.9절이 "지연을 합한 뒤 oscillator 편차에 대한 여유를 두라"고 한 부분은 Hartwich 논문 4절이 식으로 정리합니다. PHASE_SEG와 SJW가 oscillator 편차를 흡수하고, 허용 편차 df(nominal 주파수 대비 비율)는 다음 두 조건을 모두 만족해야 합니다. 비트 길이와 각 구간은 TQ 단위입니다.

- 조건 I: `df ≤ min(PHASE_SEG1, PHASE_SEG2) / (2 × (13 × 비트 길이 − PHASE_SEG2))`
- 조건 II: `df ≤ SJW / (20 × 비트 길이)`

PROP_SEG 선으로 길이를 정하면 oscillator 여유는 길이에서 따로 빼지 않고, 남은 PHASE_SEG·SJW가 허용하는 df로 확인합니다. PROP_SEG를 늘리면 PHASE_SEG에 남는 TQ가 줄고, 남은 TQ를 PHASE_SEG1과 PHASE_SEG2에 고르게 나누지 않으면 조건 I의 min과 SJW 상한이 작은 쪽에 묶여 df가 더 줄어듭니다.

절연 소자를 넣으면 예산이 바로 늘어납니다. SLLA270 4.9절의 예시는 10 m 버스에서 TI 디지털 isolator(17 ns)를 네 번 거치는 경로로 618 ns를 냅니다. 1 Mbit/s · 75% sample point인 750 ns 가운데 대부분입니다.

### 4) Common-mode 전압과 공통 GND

차동 신호라도 두 선의 *평균* 전압(common-mode)이 수신기 허용 범위 안에 있어야 합니다. 노드마다 GND 전위가 다르면 이 평균이 밀립니다.

| 근거 | 수신기가 보장되는 버스 전압 범위 |
| --- | --- |
| ISO 11898:1993 (SLLA270 4.2절이 인용) | −2 V ~ +7 V |
| MCP2561/2 (DS20005167C 2.2절, ISO-11898-2 구현 표기) | −12 V ~ +12 V (특성화로 보장, 생산 시험은 −2 V ~ +7 V) |
| TCAN1042-Q1 Normal mode (7.7절, ISO 11898-2:2016 충족) | −30 V ~ +30 V (±20 V 밖에서는 임계값 띠가 0.4~1.0 V) |
| TCAN1042-Q1 Standby mode (7.7절) | −12 V ~ +12 V ("V" 변형을 VIO 3.0~4.5 V로 쓰면 −2 V ~ +7 V) |

두 transceiver 모두 1993년판의 −2~+7 V보다 넓은 범위를 보장하지만, TCAN1042-Q1의 ±30 V는 Normal mode 값이고 Standby mode에서는 ±12 V 이하로 좁아집니다. 범위의 기준은 각 노드의 GND입니다. MCP2561/2 데이터시트 2.1.1절은 VCANH·VCANL을 "각 노드의 ground에 대한 버스 선 전압"으로 정의합니다.

SLLA270 4.12절은 노드 간 기준 GND 차이를 최소로 유지하라고 하고, common-mode 극단에서 여러 transceiver의 전류 수요가 쌓이면 transceiver가 thermal shutdown에 들어가거나 파손될 수 있다고 설명합니다. 그래서 DeviceNet 같은 상위 프로토콜은 신호선 두 가닥과 함께 전원·GND 선을 케이블에 넣도록 정합니다. shield는 SLLA270 4.3절에 따라 한 지점에서만 접지해 shield를 타고 흐르는 기생 전류를 막습니다. 서로 다른 전원의 GND를 연결해야 하면 SLLA270은 디지털 isolator를 쓰라고 권합니다(4.4절). 이때 위 「왕복 지연 예산」의 isolator 지연이 더해집니다.

## 실제 사용 예 — 42 MHz bxCAN 1 Mbit/s 설정을 길이에서 거꾸로 고르기

위 「왕복 지연 예산」의 PROP_SEG 선을 STM32 bxCAN 레지스터 값으로 옮겨 보겠습니다. 500 kbit/s 설정 예는 [5-10](/blog/embedded/modern-recipes/part5-10-can-communication)에 있으므로, 여기서는 길이 문제가 빠듯한 1 Mbit/s만 봅니다.

BTR 레지스터는 BRP[9:0], TS1[19:16], TS2[22:20], SJW[25:24] 필드로 되어 있습니다(STM32CubeF4 CMSIS 헤더 [`stm32f407xx.h`](https://github.com/STMicroelectronics/cmsis_device_f4/blob/v2.6.11/Include/stm32f407xx.h)의 `CAN_BTR_*_Pos`, v2.6.11 태그). Linux bxCAN 드라이버는 각 필드에 값−1을 쓰고, 허용 범위를 tseg1 1~16, tseg2 1~8, SJW 최대 4, prescaler 1~1024로 둡니다([`drivers/net/can/bxcan.c` L183-L193](https://github.com/torvalds/linux/blob/v7.3-rc6/drivers/net/can/bxcan.c#L183-L193), v7.3-rc6). 한 비트는 `1 + tseg1 + tseg2` TQ이고, sample point는 `(1 + tseg1) / (1 + tseg1 + tseg2)`입니다.

### PROP_SEG는 TS1 안의 예산이다

bxCAN에는 PROP_SEG 필드가 따로 없습니다. 같은 드라이버는 `prop_seg + phase_seg1`을 합쳐 TS1 필드 하나에 씁니다([bxcan.c L669-L673](https://github.com/torvalds/linux/blob/v7.3-rc6/drivers/net/can/bxcan.c#L669-L673)). Hartwich 논문 5절도 대부분의 CAN 구현이 `Prop_Seg + Phase_Seg1`의 합을 TSEG1 하나로 받는다고 적었습니다. 하드웨어 입장에서 TS1은 한 덩어리이고, 그 가운데 얼마를 지연 보상 몫으로 볼지는 설계자가 정하는 예산 분할입니다.

Bosch CAN 2.0 Part A 8장이 PROP_SEG에 요구하는 최소 프로그래밍 범위는 1~8 TQ입니다. 아래 표의 PROP_SEG(9~14 TQ)는 이 범위를 넘으며, bxCAN이 16 TQ까지 받는 TS1 안에서 지연 보상 몫으로 잡은 예산이고, 레지스터에 따로 쓰는 값이 아닙니다.

### PHASE_SEG2를 정하는 두 규칙

남은 TQ를 PHASE_SEG1과 PHASE_SEG2에 나누는 규칙은 두 자료가 다르게 적습니다.

- **CAN 2.0 정의**: Bosch CAN 2.0 Part A 8장은 PHASE_SEG2를 "PHASE_SEG1과 Information Processing Time(IPT) 가운데 큰 값"으로, IPT를 2 TQ 이하로 정의합니다.
- **Hartwich 7절 순서**: PROP_SEG를 정하고 TQ 단위로 올림한 뒤, 남은 `비트 길이 − PROP_SEG − 1` TQ가 짝수면 PHASE_SEG2 = PHASE_SEG1, 홀수면 PHASE_SEG2 = PHASE_SEG1 + 1로 나눕니다. PHASE_SEG2는 IPT(구현에 따라 0~2 TQ)보다 짧을 수 없고, SJW는 `min(4, PHASE_SEG1)`로 둡니다. 가능한 설정이 여럿이면 논문 4절의 df가 가장 큰 것을 고릅니다.

홀수 분할 PHASE_SEG2 = PHASE_SEG1 + 1은 Hartwich 순서에만 있고, CAN 2.0 정의를 글자 그대로 따르면 PHASE_SEG2는 PHASE_SEG1과 같거나 IPT로 올린 값이어야 합니다. bxCAN의 IPT는 이 글이 인용한 자료에 없으므로, 아래에서는 상한인 2 TQ를 넣어 PHASE_SEG2 ≥ 2로 둡니다.

### 42 MHz에서 가능한 비트 구성

bxCAN 클록이 42 MHz면 1 Mbit/s의 한 비트는 42 클록이고, 이를 `prescaler × 비트당 TQ 수`로 나눕니다. Hartwich 논문 7절은 한 비트를 8~25 TQ로 둡니다. 42의 약수 가운데 이 범위에 드는 TQ 수는 14와 21뿐이므로 2 × 21(TQ ≈ 47.6 ns)과 3 × 14(TQ ≈ 71.4 ns)만 봅니다.

두 구성에서 PHASE_SEG2 ≥ 2, tseg1 ≤ 16, SJW = min(4, PHASE_SEG1)을 만족하는 분할을 모두 계산하고, PROP_SEG 시간과 df 두 쪽 모두에서 다른 분할에 밀리지 않는 것 가운데 길이가 1 m 이상인 것만 남기면 다음과 같습니다. 길이는 `(PROP_SEG 시간 − 고정 지연) / 10 ns/m`이고, 고정 지연은 기준선인 LOOP2 max · 컨트롤러 두 번의 500 ns입니다.

| 구성 · PROP+PS1+PS2 | 분할 규칙 | PROP_SEG | 허용 df | 길이 |
| --- | --- | ---: | ---: | ---: |
| 2×21 · 11+4+5 | Hartwich만 (홀수) | 524 ns | ±0.746% | 2.4 m |
| 2×21 · 12+4+4 | CAN 2.0·Hartwich | 571 ns | ±0.743% | 7.1 m |
| 2×21 · 13+3+4 | Hartwich만 (홀수) | 619 ns | ±0.558% | 11.9 m |
| 3×14 · 9+2+2 | CAN 2.0·Hartwich | 643 ns | ±0.556% | 14.3 m |
| 2×21 · 14+2+4 | 두 규칙 밖 | 667 ns | ±0.372% | 16.7 m |
| 3×14 · 10+1+2 | CAN 2.0·Hartwich | 714 ns | ±0.278% | 21.4 m |

고정 지연을 바꾸면 모든 행의 길이가 같은 만큼 움직입니다. LOOP1 max(470 ns)로는 3 m, LOOP1 max에 컨트롤러 지연을 한 번만 센 395 ns로는 10.5 m 길어집니다.

2×21 · 14+2+4는 남은 6 TQ를 3+3으로 나누면 tseg1이 17이 되어 bxCAN에 들어가지 않으므로, PHASE_SEG2를 PHASE_SEG1 + 2로 둔 분할입니다. 두 규칙 어디에도 없는 분할이지만, bxCAN은 TS2를 TS1과 다른 필드로 받으므로 레지스터에는 쓸 수 있습니다.

df는 Hartwich 논문 4절의 두 조건 가운데 작은 쪽입니다. 예를 들어 3×14 · 9+2+2는 조건 I에서 2 / (2 × (13 × 14 − 2)) = 1/180 ≈ 0.556%, 조건 II에서 2 / (20 × 14) = 1/140 ≈ 0.714%이므로 ±0.556%입니다.

버스 길이 질문의 답은 한 숫자가 아니라 이 표의 경계선입니다. 필요한 길이를 넘는 행 가운데 df가 가장 큰 것을 고르면, 42 MHz bxCAN · 1 Mbit/s · LOOP2 max · 컨트롤러 두 번 · isolator 없음이라는 조건에서는 다음과 같습니다.

- 모든 노드 클록이 nominal 대비 ±0.556% 안이면 14.3 m까지 됩니다(3×14 · 9+2+2).
- ±0.278% 안이면 21.4 m까지 됩니다(3×14 · 10+1+2).
- 그 사이의 16.7 m(±0.372%)는 두 규칙 밖의 2×21 · 14+2+4로만 됩니다.

### 40 m 판정

40 m는 데이터시트 max 지연으로는 실패이고, typ 지연으로는 통과입니다.

- **max 지연, 42 MHz**: 40 m 왕복은 기준선 900 ns, LOOP1 · 컨트롤러 두 번 870 ns, LOOP1 · 컨트롤러 한 번 795 ns입니다. 42 MHz에서 PHASE_SEG2 ≥ 2로 낼 수 있는 가장 긴 PROP_SEG는 714 ns이고, IPT가 1 TQ 이하라 PHASE_SEG2를 1로 둘 수 있다고 해도 3×14 · 11+1+1의 786 ns입니다. 셋 모두 실패합니다.
- **max 지연, 다른 클록**: bxCAN의 tseg1 ≤ 16에서 PHASE_SEG1 ≥ 1을 남기면 PROP_SEG는 15 TQ 이하입니다. PHASE_SEG2 ≥ 2이면 한 비트는 `PROP_SEG + 4` TQ 이상이라 PROP_SEG 비율은 15/19가 최대이고, 1 Mbit/s에서 어떤 클록이든 약 789 ns입니다. 가장 짧은 795 ns에도 못 미치므로 실패합니다. PHASE_SEG2를 1로 둘 수 있으면 상한이 5/6, 약 833 ns로 올라가 컨트롤러 지연을 한 번 센 795 ns는 통과하고, 두 번 센 870 ns는 실패합니다. 이 경우 판정은 컨트롤러 지연을 몇 번 세느냐에 달립니다.
- **typ 지연, 42 MHz**: LOOP1 typ · 컨트롤러 두 번의 왕복 700 ns는 3×14 · 10+1+2(714 ns, ±0.278%)에 들어가 통과합니다. 기준선 typ 720 ns는 PHASE_SEG2 ≥ 2에서는 실패합니다.

Hartwich 논문 7절은 계산 결과 프로토콜에 맞는 설정이 없으면 버스 길이나 bitrate를 낮추거나 oscillator 안정도를 높여야 한다고 적습니다. 여기서는 oscillator가 아니라 PROP_SEG가 모자라므로 선택지는 셋입니다.

- 길이를 위 표의 값으로 줄입니다.
- bitrate를 낮춥니다.
- 고정 지연이 PROP_SEG 상한에서 40 m 케이블 왕복 400 ns를 뺀 값(PHASE_SEG2 ≥ 2에서 약 389 ns) 이하가 되는 transceiver·컨트롤러 조합으로 바꿉니다.

Hartwich 논문 7절은 네트워크의 허용 편차가 가장 좁은 노드가 전체를 제한하고, 왕복 지연 계산은 지연이 가장 긴 노드 기준으로 네트워크 전체에 한 번 한다고 적었습니다. 다른 클록을 쓰는 노드는 같은 PROP_SEG 시간을 자기 TQ로 나눠 df를 따로 구합니다.

Linux의 자동 계산은 tseg1을 반으로 나눠 `prop_seg = tseg1 / 2`로 둡니다([calc_bittiming.c L182-L184](https://github.com/torvalds/linux/blob/v7.3-rc6/drivers/net/can/dev/calc_bittiming.c#L182-L184)). bxCAN에서는 둘을 합쳐 쓰므로 레지스터 값에는 영향이 없지만, 이 분할을 PROP_SEG 예산으로 읽으면 2×21 · tseg1 15의 PROP_SEG는 7 TQ(333 ns)라서 기준선 고정 지연 500 ns보다 짧습니다.

### BTR 값

±0.556% 행을 BTR 값으로 옮기면 다음과 같습니다.

```c
#include "stm32f4xx.h"

/* bxCAN clock 42 MHz, 1 Mbit/s, 14 TQ (TQ = 71.4 ns), sample point 12/14 = 6/7 = 85.7% */
#define CAN_PRESC 3u
#define CAN_TSEG1 11u   /* PROP_SEG 9 + PHASE_SEG1 2 */
#define CAN_TSEG2 2u
#define CAN_SJW   2u    /* min(4, PHASE_SEG1) */

static const uint32_t can_btr_1m =
      ((CAN_PRESC - 1u) << CAN_BTR_BRP_Pos)
    | ((CAN_TSEG1 - 1u) << CAN_BTR_TS1_Pos)
    | ((CAN_TSEG2 - 1u) << CAN_BTR_TS2_Pos)
    | ((CAN_SJW   - 1u) << CAN_BTR_SJW_Pos);   /* = 0x011A0002 */
```

이 설정의 sample point는 6/7 ≈ 85.7%(857 ns)이고 PROP_SEG 선은 643 ns입니다. 40 m를 대 보면 기준선 max 왕복 900 ns와 LOOP1 max 870 ns는 sample point 선부터 넘습니다. 컨트롤러 지연을 한 번 센 LOOP1 max 795 ns와 typ 왕복 720 ns(LOOP1 typ 700 ns)는 sample point 선은 통과하지만 PROP_SEG 선을 넘습니다. 판정은 실패입니다. 이 값을 init mode에서 `CAN1->BTR`에 쓰는 순서와 filter·송신 코드는 [5-10: CAN 통신 구현](/blog/embedded/modern-recipes/part5-10-can-communication)에 있습니다.

## 보드에서 확인하는 순서

아래는 측정 순서와 데이터시트가 정한 기대값, 그리고 기대값을 벗어났을 때 가리키는 원인입니다.

1. **종단**: 모든 노드 전원을 끄고 CANH–CANL 저항을 잽니다. 60 Ω이 정상이고, 120 Ω이면 종단 하나가 빠졌고, 40 Ω이면 세 번째 종단이 달렸습니다.
2. **Recessive 레벨**: 전원을 켜고 아무도 송신하지 않을 때 CANH, CANL을 GND 기준으로 두 채널에 걸고 차이(CH1 − CH2)를 math로 봅니다. 60 Ω 종단 버스에서 TCAN1042-Q1의 recessive VOD 보장 범위는 −120~12 mV입니다(7.7절).
3. **Dominant 레벨**: frame을 보내면서 같은 math 파형의 dominant 구간을 봅니다. 50~65 Ω 부하에서 1.5~3 V 안이어야 하고, 각 선의 GND 기준 전압은 CANH 2.75~4.5 V, CANL 0.5~2.25 V입니다(7.7절). 1단계에서 40 Ω이 나온 버스는 부하가 데이터시트 VOD 행(45 Ω 이상)의 조건 밖이므로 1.4 V 보장도 적용되지 않습니다.
4. **GND 전위차**: 노드마다 프로브 ground를 *그 노드의* GND에 물리고 CANH와 CANL을 잽니다. MCP2561/2 데이터시트 2.1.1절의 정의대로 버스 전압은 각 노드 GND 기준이고, 두 선 모두 위 「Common-mode 전압과 공통 GND」 표에서 그 노드 transceiver와 동작 모드에 맞는 범위 안에 있어야 합니다. 같은 두 선을 두 노드에서 각자의 GND 기준으로 잰 recessive 전압의 차이가 곧 두 노드 GND 사이의 전위차입니다.
5. **Loop delay**: 한 노드에서 TXD 에지와 RXD 에지 사이 시간을 잽니다. 하강 에지끼리가 데이터시트 Figure 8-4의 `tPROP(LOOP1)`(보장 max 160 ns), 상승 에지끼리가 `tPROP(LOOP2)`(보장 max 175 ns)입니다(7.8절, RL 60 Ω·CL 100 pF 조건). 측정값은 그 보드·그 온도에서의 값 하나이므로, 길이 예산에는 위 표처럼 데이터시트 max를 씁니다.

## 자주 보는 함정

### Sample point만 보고 PROP_SEG를 정함

sample point 전에 왕복이 끝나도 PROP_SEG가 왕복보다 짧으면, oscillator가 서로 반대 방향으로 치우친 두 노드가 arbitration할 때만 bit error가 납니다. Hartwich 논문 2절은 이를 가끔씩 bus error를 내는 설정 오류(Prop_Seg가 너무 짧음)의 예로 듭니다. sample point를 75%에 가깝게(16/21 ≈ 76.2%) 맞추려고 2×21 · 13+3+4 대신 13+2+5를 쓰면, PROP_SEG는 같은 619 ns인데 PHASE_SEG1이 2라서 df가 ±0.558%에서 ±0.373%로 줄어듭니다.

### Linux에서 SJW를 지정하지 않음

SJW를 지정하지 않으면 Linux 기본값은 `max(1, min(phase_seg1, phase_seg2 / 2))`입니다([bittiming.c L10-L17](https://github.com/torvalds/linux/blob/v7.3-rc6/drivers/net/can/dev/bittiming.c#L10-L17)). 3×14 · 9+2+2를 Linux로 설정하면서 SJW를 비워 두면 1이 되고, 조건 II가 1/280 ≈ 0.357%로 df를 묶습니다. 표의 ±0.556%는 SJW = 2일 때 값입니다. Linux는 SJW가 phase_seg1이나 phase_seg2보다 크면 설정을 거부합니다([bittiming.c L19-L43](https://github.com/torvalds/linux/blob/v7.3-rc6/drivers/net/can/dev/bittiming.c#L19-L43)).

## 정리

- 정상 파형은 TCAN1042-Q1 기준 dominant VOD 1.5~3 V(50~65 Ω 부하), recessive VOD −120~12 mV이고, common-mode ±20 V 안에서 차동 전압 0.5~0.9 V 사이는 수신기 판정이 정해지지 않습니다.
- 종단은 양 끝 120 Ω을 CANH–CANL 사이에 달고, 전원을 끈 채 60 Ω으로 확인합니다.
- 1 Mbit/s 버스 길이는 왕복 지연이 PROP_SEG 안에 들어오느냐로 정합니다. 42 MHz bxCAN · TCAN1042-Q1 LOOP2 max · 컨트롤러 지연 두 번 기준으로 CAN 2.0 정의와 Hartwich 규칙을 함께 따르는 한계는 14.3 m(±0.556%)와 21.4 m(±0.278%)입니다. 40 m는 max 지연에서 42 MHz의 어떤 분할로도 맞지 않고, PHASE_SEG2 ≥ 2이면 bxCAN의 어떤 클록으로도 맞지 않습니다. typ 지연이면 42 MHz에서도 들어갑니다.
- GND 전위차 허용폭은 transceiver와 동작 모드마다 다르므로, 각 노드에서 자기 GND 기준으로 CANH·CANL을 재고 Standby mode 범위까지 고려해 GND를 함께 배선하거나 절연합니다.

다음 편 [1-11: RS-485·RS-422 차동 신호 분석](/blog/embedded/modern-recipes/part1-11-rs485-rs422)에서는 같은 차동 버스이면서 SLLA270 결론이 말하듯 두 상태를 모두 능동 구동하는 RS-485의 종단·biasing·topology를 다룹니다.

## 참고 자료

- TI, [SLLA270 — Controller Area Network Physical Layer Requirements](https://www.ti.com/lit/an/slla270/slla270.pdf), 2008-01, ISO 11898:1993 기준. ISO 1 Mbit/s·40 m 사양, 권장 길이, 종단, common-mode, 지연 예산.
- TI, [TCAN1042-Q1 데이터시트](https://www.ti.com/lit/ds/symlink/tcan1042-q1.pdf), SLLSES9D, 2021-10 개정. 출력 전압, 수신 임계값, 입력 저항, loop delay(LOOP1/LOOP2 에지 방향), unpowered 동작, ISO 11898-2:2016 충족 표기.
- Microchip, [MCP2561/2 데이터시트](https://ww1.microchip.com/downloads/en/DeviceDoc/20005167C.pdf), DS20005167C, ©2013-2014. 버스 전압 정의(2.1.1절), 수신기 입력 전압 범위, unpowered 동작.
- Robert Bosch GmbH, [CAN Specification Version 2.0](http://esd.cs.ucr.edu/webres/can20.pdf), 1991, Part A 8장 "Bit Timing Requirements"(UC Riverside 사본). PROP_SEG·PHASE_SEG2·IPT 정의, 구간별 최소 프로그래밍 범위.
- F. Hartwich, A. Bassemir (Robert Bosch GmbH), [The Configuration of the CAN Bit Timing](http://www.oertel-halle.de/files/cia99paper.pdf), 6th International CAN Conference, 1999(제3자 사본). PROP_SEG 조건과 에지 방향, oscillator 허용 편차 식, 노드 지연 정의(6절), 7절 설정 순서와 8~25 TQ 범위.
- Linux v7.3-rc6 태그(2026-10-04), [`drivers/net/can/dev/calc_bittiming.c`](https://github.com/torvalds/linux/blob/v7.3-rc6/drivers/net/can/dev/calc_bittiming.c) · [`drivers/net/can/dev/bittiming.c`](https://github.com/torvalds/linux/blob/v7.3-rc6/drivers/net/can/dev/bittiming.c) · [`drivers/net/can/bxcan.c`](https://github.com/torvalds/linux/blob/v7.3-rc6/drivers/net/can/bxcan.c). 기본 sample point, prop_seg 분할, SJW 기본값·검사, bxCAN 필드 범위.
- STMicroelectronics, [cmsis_device_f4 v2.6.11 `stm32f407xx.h`](https://github.com/STMicroelectronics/cmsis_device_f4/blob/v2.6.11/Include/stm32f407xx.h). BTR 필드 위치.

수정 이력: 2026-10-11 — 1 Mbit/s 버스 길이를 PROP_SEG 조건(Bosch CAN 2.0, Hartwich 논문)으로 다시 계산했습니다. 컨트롤러 지연을 두 번 세는 것은 이 글의 보수적 가정으로 밝히고 한 번 센 값을 함께 적었으며, 40 m 판정이 typ·max 지연과 PHASE_SEG2 하한에 따라 어떻게 갈리는지 적었습니다. stub·노드 간격, split 종단, CAN FD 설명은 이 글의 질문 밖이라 뺐습니다.

## 관련 항목

- 이전 편: [1-09: PWM 신호 생성 분석](/blog/embedded/modern-recipes/part1-09-pwm-signal)
- [1-11: RS-485·RS-422 차동 신호 분석](/blog/embedded/modern-recipes/part1-11-rs485-rs422)
- [1-12: LVDS 차동 신호 분석](/blog/embedded/modern-recipes/part1-12-lvds-differential)
- [5-10: CAN 통신 구현 — bxCAN·Filter·Mailbox·CAN-FD](/blog/embedded/modern-recipes/part5-10-can-communication)
- [10-10: 통신 프로토콜 분석 — Logic Analyzer와 Protocol Decoder](/blog/embedded/modern-recipes/part10-10-protocol-analyzer)
