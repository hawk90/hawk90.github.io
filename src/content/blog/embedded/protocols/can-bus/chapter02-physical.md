---
title: "Ch 2: CAN 2.0 물리 계층 — Dominant/Recessive, 종단, Bit Timing"
date: 2027-04-01T02:00:00
description: "CAN_H·CAN_L의 차이로 비트. Dominant(0)가 Recessive(1)를 덮는 wired-AND가 중재의 핵심."
series: "CAN Bus 심화"
seriesOrder: 2
tags: [can, physical-layer, differential, termination, bit-timing, transceiver]
draft: true
---

## 한 줄 요약

> **"Dominant 0이 Recessive 1을 덮는다"** — CAN의 차동 신호가 *wired-AND*로 동작해 충돌 없이 자동 중재.

## CAN 비트 — Dominant vs Recessive

I²C가 *open-drain* + 풀업이라면, CAN은 **트랜시버가 능동 구동 (Dominant)** 또는 **driver off (Recessive)**.

| 상태 | CAN_H | CAN_L | 차이 V_diff | 비트 |
| --- | --- | --- | --- | --- |
| **Dominant** | ~3.5V | ~1.5V | ~2V | **0** |
| **Recessive** | ~2.5V | ~2.5V | ~0V | **1** |

> 💡 *Dominant = 더 강한 0*. 여러 노드가 동시에 송신할 때 *Dominant 비트가 무조건 이김*. 이게 우선순위 중재의 토대.

## 한눈에 보는 구조

![CAN differential signaling](/images/blog/can-bus/diagrams/ch02-can-differential.svg)

CAN_H와 CAN_L이 *역상*으로 움직임. 차이가 ≥0.9V면 Dominant(0), ≤0.5V면 Recessive(1)로 수신기 해석.

## Differential의 장점 — 노이즈 면역

자동차에서는 *모터·점화 코일·인버터*가 거대한 EMI 소스. CAN_H와 CAN_L이 *같이* 노이즈를 받으면 *차이는 유지* — common-mode 제거.

```text
이상적 신호:    CAN_H = 3.5V, CAN_L = 1.5V → V_diff = 2V
+ 노이즈 +5V:   CAN_H = 8.5V, CAN_L = 6.5V → V_diff = 2V ✓
```

전선이 *twisted pair*면 EMI가 더 잘 상쇄.

## Transceiver IC

MCU의 CAN 페리퍼럴은 *논리 레벨*만 다룸 (TXD·RXD). 실제 ±전압은 *transceiver*가 생성.

| 트랜시버 | 특징 | 가격대 |
| --- | --- | --- |
| **TJA1051** (NXP) | 일반 high-speed CAN | $0.50 |
| **TJA1043** | High-voltage, 진단 wake-up | $1 |
| **MCP2551** (Microchip) | 옛 표준, deprecated | — |
| **TCAN332** (TI) | 3.3V 직접 (MCU) | $0.80 |
| **ISO1050** (TI) | Galvanic isolation 내장 | $5 |

### Galvanic Isolation

산업·의료 환경에서 *접지 루프 방지*. ISO1050·ADM3053 같은 칩이 *광·자기* 격리로 ECU를 메인 버스에서 분리.

## 종단 저항 — 120 Ω

CAN 케이블 *특성 임피던스* = **120 Ω** (twisted pair). 양 끝에 같은 값의 저항으로 *반사* 차단.

```text
[Node 1] ── 120Ω ── ┬───────────────┬ ── 120Ω ── [Node N]
                     │               │
                  [Node 2]       [Node N-1]
                  (no termination)
```

> ⚠️ 중간 노드는 종단 없음. 둘 다 양 끝에 두는 게 핵심. 한쪽만 두면 *반사*로 비트 깨짐.

### Split Termination

EMI 더 줄이려면 *split termination* (60 Ω + 60 Ω) + 중간점에 4.7 nF 캐패시터 → 고주파 노이즈 흡수.

```text
        60Ω         60Ω
CAN_H ──/\/\──┬──/\/\── CAN_L
              │
              ╪ 4.7 nF
              │
             GND
```

자동차 양산 보드에서 흔한 패턴.

## Bit Timing — Sample Point

CAN 비트는 *4 segment*로 분할:

| Segment | 의미 |
| --- | --- |
| **Sync** (SS) | 동기화 — 항상 1 TQ (Time Quantum) |
| **Propagation** (PROP_SEG) | 전파 지연 보정 |
| **Phase 1** (PHASE_SEG1) | sample point 직전 |
| **Phase 2** (PHASE_SEG2) | sample point 직후 |

**Sample Point** = (Sync + Prop + Phase1) / (총 TQ). 보통 **75-87.5%** 사이.

```text
   |── SS ──|── PROP_SEG ──|── PHASE_SEG1 ──|── PHASE_SEG2 ──|
   1 TQ                                     ↑
                                       Sample Point (87.5%)
```

긴 버스일수록 *prop_seg*을 키워야 (광속 전파 지연 흡수). 1 km @ 50 kbps는 prop_seg가 큰 비중.

### 표준 권장 Sample Point

| 속도 | Sample Point |
| --- | --- |
| 50 kbps | 87.5% |
| 250 kbps | 87.5% |
| 500 kbps | 87.5% |
| **1 Mbps** | **75%** |

같은 버스의 *모든 노드*가 같은 sample point여야 함.

## 거리와 속도 — Trade-off

```text
bit time = (round trip 전파 + transceiver 지연 + 마진)
         ≈ 2 × L × (5 ns/m) + 200 ns 정도
```

| 거리 | 최대 속도 |
| --- | --- |
| 25 m | 1 Mbps |
| 50 m | 800 kbps |
| 100 m | 500 kbps |
| 250 m | 250 kbps |
| 500 m | 125 kbps |
| 1000 m | 50 kbps |

길어지면 *왕복 시간*이 비트 시간보다 길어져 *중재 실패*.

## Stub Length 제약

main bus에서 노드로 *분기선* (stub) 길이도 제한:

```text
1 Mbps:  stub ≤ 0.3 m
500 kbps: stub ≤ 1 m
250 kbps: stub ≤ 5 m
```

너무 길면 *반사* 발생. 자동차 와이어 하니스에선 *T-connector* 패턴 흔함.

## STM32 HAL 설정 예

```c
CAN_HandleTypeDef hcan1;

void can_init(void) {
    hcan1.Instance = CAN1;
    // 500 kbps @ 42 MHz APB clock 가정
    hcan1.Init.Prescaler = 6;     // → 7 MHz time quanta clock
    hcan1.Init.SyncJumpWidth = CAN_SJW_1TQ;
    hcan1.Init.TimeSeg1 = CAN_BS1_12TQ;  // PROP + PHASE1
    hcan1.Init.TimeSeg2 = CAN_BS2_1TQ;
    // 총 14 TQ × 1/7M = 2 µs = 500 kbps
    // Sample point = (1+12)/14 ≈ 92.8% (조정 가능)
    hcan1.Init.Mode = CAN_MODE_NORMAL;
    HAL_CAN_Init(&hcan1);
    HAL_CAN_Start(&hcan1);
}
```

대부분 MCU 벤더 도구 (CubeMX, MCUXpresso)가 *bit timing 계산기*를 내장.

## 자주 하는 실수

> ⚠️ 종단 없거나 잘못된 위치

종단 없이 1 m 이상 → *반사*로 *간헐 비트 에러*. 가장 흔한 첫 보드 문제.

> ⚠️ 트랜시버 V_CC 잘못

5V 트랜시버에 3.3V → 동작 안 함. 일부 칩 (TCAN332)은 3.3V, 대부분은 5V V_CC 필요.

> ⚠️ Sample point 노드별 다름

다른 sample point는 *간헐 에러*. 모든 노드 같이.

> ⚠️ TX·RX 핀 교차 안 함

MCU TXD → Transceiver TXD (1:1). Transceiver는 *내부에서* 차동 변환. 옛 UART처럼 cross 안 함.

## 정리

- CAN 비트 — **Dominant(0)**가 **Recessive(1)**를 덮는 wired-AND.
- Differential CAN_H·CAN_L = common-mode 노이즈 제거.
- 종단 = **120 Ω 양 끝**. Split termination + 캐패시터가 EMI 우수.
- **Sample point 75-87.5%**, 모든 노드 일치.
- 거리·속도 trade-off — 1 m·1 Mbps 또는 1 km·50 kbps.

다음 편은 **CAN 프레임 구조** — SOF·ID·RTR·DLC·Data·CRC·ACK·EOF.

## 관련 항목

- [Ch 1: CAN 개요](/blog/embedded/protocols/can-bus/chapter01-overview)
- [Ch 3: 프레임 구조](/blog/embedded/protocols/can-bus/chapter03-frame)
