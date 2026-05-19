---
title: "1-10: CAN 버스 전기적 특성"
date: 2026-05-12T10:00:00
description: "CAN_H/CAN_L 차동 신호·120Ω termination·1Mbit 한계."
series: "Modern Embedded Recipes"
seriesOrder: 10
tags: [recipes, can, hw-basics]
draft: false
---

## 한 줄 요약

> **"CAN은 두 선 차동 multi-master 버스로, 자동차의 표준 신경계입니다."** 120Ω 종단과 dominant/recessive 비대칭이 핵심입니다.

## 어떤 상황에서 쓰나

- 자동차 ECU 간 통신
- 산업용 자동화(CANopen, DeviceNet)
- 의료 장비, 농기계
- 보드 간 강한 노이즈 환경의 신뢰성 통신

## 핵심 개념

### 1) 차동 신호 — CAN_H / CAN_L

```text
   Recessive (1)        Dominant (0)
   CAN_H ── 2.5 V       CAN_H ── 3.5 V
   CAN_L ── 2.5 V       CAN_L ── 1.5 V
   diff   = 0 V         diff   = 2 V
```

두 라인의 *차이*가 신호입니다. common-mode 노이즈가 두 라인에 똑같이 들어오면 차이는 그대로 유지되므로, 외부 노이즈에 강합니다.

### 2) Dominant / Recessive — Wired-AND

CAN은 wired-AND입니다. 모든 노드가 recessive를 보낼 때만 line이 recessive가 됩니다. 한 노드라도 dominant를 보내면 line이 dominant가 됩니다.

이 특성으로 **multi-master arbitration**을 합니다. 두 노드가 동시에 송신을 시작해도, ID가 낮은(우선순위 높은) 노드의 dominant 비트가 이깁니다. 진 쪽은 자동으로 송신을 중단합니다.

### 3) Bus topology와 120Ω 종단

```text
CAN bus는 linear topology

Node ─┬───── Node ───── Node ───── Node ──┬─
      │                                    │
     120Ω                                 120Ω
      │                                    │
     GND                                  GND
```

양 끝에 120Ω을 답니다. 중간 노드는 종단을 하면 안 됩니다. drop 길이(분기)는 가능한 짧게(< 30 cm) 유지합니다.

종단이 잘못되면 reflection으로 비트가 깨집니다. 양 끝 둘 다 종단해야 합니다.

### 4) Bit timing — Sample point

CAN은 한 비트를 여러 time quanta(TQ)로 나누고, 그 중 일부 지점에서 sampling 합니다.

```text
   bit ┌──────────────────────────────┐
       │ Sync│ Prop_Seg │ Phase1│Phase2│
       │ (1) │  (1-8)   │ (1-8) │(1-8) │
       └─────┴──────────┴───────┴──────┘
                          ↑
                     sample point
                     (보통 75 ~ 87.5%)
```

Sample point가 너무 빠르면 ringing이 끝나기 전에 sampling, 너무 늦으면 다음 비트 영향. 표준은 75 ~ 87.5%입니다.

### 5) CAN-FD — 최대 8 Mbit/s

Classic CAN은 1 Mbit/s, 최대 8 byte/payload입니다. CAN-FD는 data phase 속도를 따로(보통 2 ~ 5 Mbit/s) 올리고 payload를 64 byte까지 확장합니다.

```text
Arbitration phase (1 Mbit/s) | Data phase (2~5 Mbit/s) | EOF
```

Arbitration은 multi-master를 위해 느리게 유지하고, data만 빠르게 보냅니다.

## 코드 / 실제 사용 예

STM32 bxCAN 초기화입니다.

```c
// CAN1 — 500 kbit/s, 87.5% sample point
// APB1 = 42 MHz, TQ = 42 MHz / prescaler / (1 + tseg1 + tseg2)

CAN1->MCR = CAN_MCR_INRQ;            // init mode
while (!(CAN1->MSR & CAN_MSR_INAK));

// 500 kbit/s = 42M / 6 / (1 + 13 + 2) = 437.5k → 6 → 7
// 정확: 42M / 6 / 14 = 500k
CAN1->BTR = (5 << 0)                  // prescaler = 6
          | (12 << 16)                // TSEG1 = 13
          | (1 << 20);                // TSEG2 = 2

CAN1->MCR &= ~CAN_MCR_INRQ;
while (CAN1->MSR & CAN_MSR_INAK);

// Filter — accept all
CAN1->FMR  |= CAN_FMR_FINIT;
CAN1->FA1R |= 1;
CAN1->FS1R |= 1;                      // 32-bit scale
CAN1->sFilterRegister[0].FR1 = 0;
CAN1->sFilterRegister[0].FR2 = 0;
CAN1->FMR  &= ~CAN_FMR_FINIT;

// Transmit
void can_send(uint32_t id, uint8_t *data, uint8_t len) {
    int mb = 0;
    while (!(CAN1->TSR & (CAN_TSR_TME0 << mb)));
    CAN1->sTxMailBox[mb].TIR  = (id << 21);
    CAN1->sTxMailBox[mb].TDTR = len;
    CAN1->sTxMailBox[mb].TDLR = *(uint32_t *)data;
    CAN1->sTxMailBox[mb].TDHR = *(uint32_t *)(data + 4);
    CAN1->sTxMailBox[mb].TIR |= CAN_TI0R_TXRQ;
}
```

CAN transceiver(예: TJA1050, MCP2562)가 별도로 필요합니다. MCU는 TX/RX를 CMOS로 내고, transceiver가 차동 신호로 변환합니다.

## 측정 / 비교

| Bit rate | Bus 길이 (권장 최대) | 대표 응용 |
| --- | --- | --- |
| 1 Mbit/s | 25 m | 자동차 powertrain |
| 500 kbit/s | 100 m | 자동차 body |
| 250 kbit/s | 250 m | CANopen 산업 |
| 125 kbit/s | 500 m | OBD-II |
| 50 kbit/s | 1000 m | 농기계 ISO11783 |

| Bus 길이 vs 권장 stub 길이 |
| --- |
| 1 Mbit/s → 30 cm 이하 |
| 500 kbit/s → 60 cm 이하 |
| 125 kbit/s → 2.4 m 이하 |

## 자주 보는 함정

> ⚠️ 종단 잘못

한쪽만 종단하거나 중간 노드를 종단하면 reflection으로 sporadic 에러가 발생합니다. 양 끝 120Ω 표준.

> ⚠️ Stub 길이 과다

bus에서 30 cm 이상 분기하면 reflection이 들어옵니다. node를 bus에 가깝게 배치합니다.

> ⚠️ Transceiver 누락

CAN 컨트롤러만으로는 신호가 안 나옵니다. transceiver IC가 있어야 합니다. 종종 모듈 외부에 transceiver가 있고 cable 끝에 종단이 있는지 확인합니다.

> ⚠️ Bit timing 부정확

sample point 계산을 잘못해 ringing 도중 sampling하면 random error가 발생합니다. CAN bus analyzer로 확인합니다.

> ⚠️ 공통 GND 누락

차동 신호이지만 common-mode 전압 범위는 -2 ~ +7 V로 제한됩니다. ground reference가 없으면 노드 간 전위차로 transceiver가 죽을 수 있습니다.

## 정리

- CAN은 차동 wired-AND 버스로 multi-master arbitration이 가능합니다.
- 양 끝 120Ω 종단이 필수입니다. 중간 노드는 종단 금지.
- Sample point는 75 ~ 87.5% 표준. 잘못 설정하면 sporadic 에러 발생.
- CAN-FD로 arbitration은 1 Mbit, data는 5 Mbit까지 확장 가능합니다.
- Transceiver와 공통 GND 없이는 동작하지 않습니다.

다음 편에서는 **RS-485 / RS-422 차동 신호**를 다룹니다. 산업 현장의 다른 차동 표준입니다.

## 관련 항목

- [1-09: PWM 신호 생성](/blog/embedded/modern-recipes/part1-09-pwm-signal)
- [1-11: RS-485 / RS-422 차동 신호](/blog/embedded/modern-recipes/part1-11-rs485-rs422)
- [1-12: LVDS / 차동 신호 일반](/blog/embedded/modern-recipes/part1-12-lvds-differential)
- 더 깊이 — [Practical RTOS Internals: 통신 ISR 패턴](/blog/embedded/rtos/practical-internals/)
