---
title: "10-10: 통신 프로토콜 분석 — Logic Analyzer와 Protocol Decoder"
date: 2026-05-17T00:00:00
description: "Saleae·DSLogic·oscilloscope·protocol decoder로 UART/SPI/I2C/CAN 신호를 캡처·디코딩하는 실전 패턴."
series: "Modern Embedded Recipes"
seriesOrder: 120
tags: [recipes, debugging, logic-analyzer]
---

## 한 줄 요약

> **"Sender와 receiver가 *다른 메시지를 보고 있을 때*, 코드 측에서 답은 안 나옵니다."** Logic analyzer로 *전선 위*의 진짜 비트를 잡아 둘 중 누가 맞는지를 결정합니다.

## 어떤 상황에서 쓰나

UART RX가 가끔 깨진 byte를 받습니다. SPI flash가 가끔 잘못된 데이터를 돌려줍니다. I2C 센서가 NACK을 줍니다. CAN bus에 가끔 ack 없는 frame이 보입니다. 이런 류는 *어느 쪽이 거짓말하는지* 먼저 정해야 합니다. Logic analyzer는 그 *진실의 기준선*입니다.

## 도구 비교

| 도구 | 가격대 | sample rate | 채널 | decode |
|---|---|---|---|---|
| Saleae Logic Pro 8 | 800달러 | 500 MHz | 8 | UART/SPI/I2C/CAN 등 다수 |
| Saleae Logic 8 | 400달러 | 100 MHz | 8 | 동일 |
| DSLogic Pro | 300달러 | 1 GHz | 16 | 다수 |
| Sigrok-supported probe | 30~100달러 | 24 MHz | 8 | 오픈소스 |
| Oscilloscope (DSO) | 가변 | 100 MHz~ | 2~4 | 일부 모델 (Rigol, Siglent) |

100 MHz sample rate면 1 MHz 통신까지 무리 없이 봅니다. SPI 50 MHz를 보려면 500 MHz 이상이 필요합니다.

## Setup — Saleae Logic 2 예

1. Probe ground를 보드 GND에 연결
2. 신호선에 probe clip
3. Capture 설정:
   - sample rate: 신호의 10배 이상
   - duration: trigger 후 몇 ms 캡쳐
   - trigger: 특정 line의 falling edge
4. Capture
5. Analyzer 추가 (Async Serial / SPI / I2C / CAN)
6. 결과 표 확인

## UART decode

```text
신호 1개 (TX 또는 RX) + GND
설정: baud, data bits, parity, stop bits

캡쳐 후:
  bytes:  0x48 0x65 0x6C 0x6C 0x6F 0x0D 0x0A
  ascii:  H    e    l    l    o   \r   \n
```

Decode가 *원래 의도한 메시지*면 *코드 측 parsing*이 잘못된 것입니다. 깨진 byte가 나오면 *전기적 문제*입니다.

## SPI decode

```text
신호 4개: MOSI, MISO, SCLK, CS

설정: bits per transfer (8), MSB/LSB first, CPOL, CPHA

캡쳐 결과:
  CS Low ─┐
          │ MOSI: 0x05  MISO: 0xFF        (read status command)
          │ MOSI: 0x00  MISO: 0x02        (status byte = WIP)
  CS High ┘
```

CPOL/CPHA가 둘 다 일치해야 합니다. Decode가 garbled면 CPOL/CPHA mismatch입니다.

## I2C decode

```text
신호 2개: SDA, SCL

설정: 7-bit / 10-bit address

캡쳐 결과:
  Start
  Write addr 0x68 ACK
    Write 0x6B (PWR_MGMT_1)  ACK
    Write 0x00                ACK
  Stop

  Start
  Write addr 0x68 ACK
    Write 0x3B (ACCEL_XOUT_H) ACK
  Re-Start
  Read  addr 0x68 ACK
    Read  0x12 ACK
    Read  0x34 NACK
  Stop
```

NACK이 의도되지 않은 자리에 보이면 slave가 *준비 안 되었거나* address가 잘못된 것입니다.

## CAN decode

```text
신호 1개: CAN_H 또는 logic-level CAN_TX (transceiver 후단)

설정: 250 kbps / 500 kbps / 1 Mbps, standard/extended

캡쳐 결과:
  ID 0x123, DLC 8, data 11 22 33 44 55 66 77 88, ACK
  ID 0x123, DLC 8, data 11 22 33 44 55 66 77 88, NO ACK   ← 다른 노드 없음
```

CAN bus에 *수신 노드가 없으면* sender가 NO ACK으로 영원히 재전송합니다. CAN_H/CAN_L 사이의 차동 전압을 oscilloscope로 보면 *전기적 문제*도 잡힙니다.

## 사례 — UART 깨진 byte

```text
캡쳐: 1 bit가 idle 중에 가끔 0으로 떨어짐
    → start bit로 잘못 인식 → 1 byte 깨짐

원인: TX/RX 핀 옆에 GPIO toggle 신호가 *crosstalk*
해결: GND 라인 강화, 와이어 길이 단축
```

신호선과 GND가 *나란히* 가지 않으면 noise pickup이 흔합니다. Twisted pair나 shielded cable 사용.

## 사례 — SPI flash WIP 못 빠짐

```text
캡쳐:
  CMD 0x06 (WREN) — 잘 보냄
  CMD 0x20 (Sector Erase), addr — 잘 보냄
  CMD 0x05 (Read Status)
    response: 0x03                 ← WIP=1, WEL=1
  CMD 0x05 (Read Status)
    response: 0x03                 ← 여전히 1
  반복 100ms 후 timeout
```

Sector erase는 *수십~수백 ms*가 정상. 코드의 timeout이 너무 짧았습니다. 데이터시트 typical/max 모두 확인.

## 사례 — I2C NACK

```text
캡쳐:
  Start
  Write addr 0x69 NACK              ← slave가 응답 안 함
  Stop

확인:
1. addr 0x69 맞나? 데이터시트 보니 0x68.
2. SDO 핀 pull-up이 0xAA를 만들어서 LSB 1 → 0x69 보낸 것.
3. SDO를 GND로 → 0x68 정상 응답.
```

I2C address는 데이터시트의 *7 bit address*에서 SDO/SDA1 핀 상태로 LSB가 바뀌는 경우가 있습니다.

## 사례 — CAN bit timing

```text
캡쳐 (logic-level on transceiver TXD):
  bit time 측정: 1.5 µs (예상은 2 µs @ 500 kbps)

원인: BTR (Baud Time Register) 계산 오류.
     APB1 = 42 MHz, PRESCALER=6, TQ count=14 → 1.5 µs.
     올바른 설정: PRESCALER=6, TQ count=14 → 2 µs가 맞음. 계산식 확인.
```

CAN은 *bit 1 sample point*까지 ±1% 안에 들어야 합니다. CAN bus calculator로 검증.

## Trigger — 가끔 일어나는 사건 잡기

**Setup → Trigger:**

- "SPI MOSI 0x9F" (RDID command가 떨어지는 순간)
- "UART 0xFF 0xFE 0x01" (sync pattern)
- "I2C NACK"
- "CAN ID 0x100"

Trigger pre-capture로 *trigger 전*의 1ms도 함께 잡습니다. 깨진 byte가 보내진 *직전*에 무슨 일이 있었는지 보입니다.

## Oscilloscope — 전기적 분석

Logic analyzer가 잡지 못하는 것.

- 신호 ringing
- Slew rate
- Voltage level (3.3V vs 1.8V mismatch)
- Ground bounce
- Crosstalk

```text
신호 ringing: rising edge 후 oscillation
  → 임피던스 mismatch, 종단저항 필요

Slow slew rate: rising에 100 ns 걸림
  → driver strength 부족, 또는 line capacitance 큼

Voltage level: high가 2.8V (3.3V 기대)
  → driver는 3.3V인데 receiver가 1.8V로 잡아당김 → level mismatch
```

Oscilloscope는 *Y축이 전압*입니다. Digital decode는 logic analyzer가 빠르지만, 전기적 문제는 DSO 없이는 못 봅니다.

## 자주 보는 함정

> Probe ground 멀리

GND probe를 보드의 *반대편*에 걸면 ground loop으로 ringing이 측정에 끼어듭니다. 신호 핀 옆 GND에 짧게.

> Sample rate 부족

5 MHz SPI를 10 MHz logic analyzer로 캡쳐하면 edge 위치가 정확하지 않습니다. 신호의 *10배 이상* sample rate.

> Logic level mismatch

3.3V 신호를 1.8V logic analyzer로 잡으면 정상. 1.8V 신호를 3.3V analyzer로 잡으면 threshold(보통 1.4V) 위라 OK. 반대로 5V 신호를 3.3V analyzer로 직접 잡으면 *probe 또는 보드 damage*. Level shifter 필요.

> Probe capacitance가 회로에 영향

DSO probe 10pF, logic analyzer probe 수십 pF. 빠른 SPI에서 *probe만 연결해도 동작이 바뀝니다*. Active probe 또는 짧은 lead.

> Trigger pre-capture 안 설정

Trigger가 떨어진 *순간*만 보면 *원인*은 못 봅니다. Pre-trigger를 capture 길이의 절반쯤 잡습니다.

> SPI/I2C decoder 설정 잘못

CPOL/CPHA mismatch면 decode가 *완전히 다른 byte*로 나옵니다. Capture는 정상인데 *decoder 설정*이 잘못된 경우가 많습니다.

## 정리

- Logic analyzer는 *전선 위*의 진실. 코드 측 추정 대신 측정.
- UART/SPI/I2C/CAN 모두 protocol decoder가 있어 byte 단위로 보입니다.
- Sample rate는 신호의 10배 이상.
- Trigger pre-capture로 *원인 직전*을 함께 잡습니다.
- 전기적 문제(ringing, level mismatch)는 oscilloscope.
- GND probe는 가까이.
- CPOL/CPHA, I2C address LSB, CAN bit timing — decoder 설정과 *맞춰야* 결과가 의미 있습니다.
- 깨진 byte는 *전기*, 의도 다른 byte는 *코드*.

다음 편은 **로깅 시스템 설계**입니다.

## 관련 항목

- [10-05: UART 안 찍힐 때](/blog/embedded/modern-recipes/part10-05-uart-not-printing)
- [10-09: 타이밍/race 진단](/blog/embedded/modern-recipes/part10-09-timing-race-diag)
- [Embedded Serial Ch 1: UART](/blog/embedded/protocols/embedded-serial/chapter01-uart-basics)
