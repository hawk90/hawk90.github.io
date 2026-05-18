---
title: "Ch 4: I²C 기초 — 2-wire, Open-Drain, Start/Stop, ACK"
date: 2027-03-01T04:00:00
description: "SDA·SCL 두 선으로 127개 슬레이브. Open-drain + 풀업이 만드는 wired-AND 버스."
series: "Embedded Protocols 심화"
seriesOrder: 4
tags: [i2c, sda, scl, open-drain, addressing, ack]
draft: true
---

## 한 줄 요약

> **"풀업 저항이 본체"** — I²C는 신호선이 아니라 *open-drain + 풀업*의 시스템. 풀업 값 하나가 속도를 결정합니다.

## 어떤 문제를 푸는가

핀이 모자랍니다. Cortex-M0 같은 작은 MCU는 GPIO가 10-20개. 거기에 온도 센서 + 자이로 + EEPROM + RTC를 다 SPI로 붙이면 *CS만 4개*. I²C라면 **2개로 다 됨**.

대신 속도가 느립니다 (Standard 100 kHz). 하지만 센서 한두 번/초 읽는 데 100 kHz면 *과잉*입니다.

## 한눈에 보는 구조

![I²C topology with pull-ups](/images/blog/embedded-serial/diagrams/ch04-i2c-topology.svg)

마스터·슬레이브·풀업 저항 두 개. 모든 디바이스가 *open-drain* 출력 → wired-AND 결과로 SCL/SDA가 결정.

## Open-Drain — 풀업이 만드는 wired-AND

각 디바이스의 출력은 **GND로 끌어내릴 수만 있음** (sink only, no source). High는 풀업 저항이 제공.

```text
누군가 한 명이 Low → 라인 Low
모두 High (=non-driving) → 풀업이 High
```

이게 멀티 마스터의 *충돌 검출*과 **clock stretching**의 토대입니다.

### 풀업 저항 값 선택

| 속도 | 권장 R_p | 비고 |
| --- | --- | --- |
| 100 kHz (Standard) | 4.7 kΩ - 10 kΩ | 보드 capacitance ≤ 400 pF |
| 400 kHz (Fast) | 2.2 kΩ - 4.7 kΩ | C_bus ≤ 400 pF |
| 1 MHz (Fast+) | 1 kΩ - 2.2 kΩ | C_bus ≤ 550 pF |
| 3.4 MHz (HS) | 100 Ω - 1 kΩ | 전용 controller 필요 |

수식: `t_rise ≈ 0.85 × R_p × C_bus`. C_bus가 400 pF, R = 4.7 kΩ → t_rise ≈ 1.6 µs (Standard 한계).

## 신호 — Start / Stop / ACK / NACK

![I²C bit timing — Start, ACK, Stop](/images/blog/embedded-serial/diagrams/ch04-i2c-bittiming.svg)

전체 한 트랜잭션을 *tikz-timing*으로 본 모습:

![I²C transaction (tikz-timing)](/images/blog/embedded-serial/diagrams/ch04-i2c-transaction-tt.svg)

| 조건 | SDA | SCL |
| --- | --- | --- |
| **Start (S)** | High → Low | High |
| **Stop (P)** | Low → High | High |
| **Data bit** | 안정 | Low |
| **Sample** | 안정 | High (상승 엣지 후) |

"SCL High일 때 SDA가 움직이면 *조건* (S 또는 P), SCL Low일 때 움직이면 *데이터*"라고 외워두면 끝.

### ACK / NACK

매 8비트 후 *9번째 클럭*에서 수신자가 응답:
- **ACK** — SDA를 Low로 잡음 (수신 OK)
- **NACK** — SDA를 High로 둠 (오류 또는 끝)

마스터가 마지막 바이트 read 후엔 **NACK + Stop**으로 "더 안 받음" 신호.

## 트랜잭션 한 사이클

```text
Write 흐름:
S | addr | W | A | reg | A | data | A | P
                    ↑           ↑
                  슬레이브 ACK   슬레이브 ACK

Read 흐름:
S | addr | W | A | reg | A | Sr | addr | R | A | data | NA | P
                                            ↑          ↑
                                          마스터 ACK    NACK
```

`Sr` = Repeated Start (Stop 없이 새 시작). Read 트랜잭션의 핵심.

## 7-bit Addressing

```text
바이트 1:  A6 A5 A4 A3 A2 A1 A0  R/W
           └────── 주소 ──────┘   └ 0=write, 1=read
```

7-bit → 128개. 그러나 *예약된 주소* 8개 제외:
- `0000 000x` — General Call, Start Byte 등
- `0000 001x` — CBUS
- `1111 1xxx` — Hs-mode master, 10-bit prefix

실용 주소 공간 = **112개**. 실제 보드에선 4-8개면 충분.

## STM32 HAL 예제

```c
I2C_HandleTypeDef hi2c1;

// 슬레이브 0x68 (MPU6050) 의 레지스터 0x75 read
uint8_t i2c_read_reg(uint16_t slave_addr_7bit, uint8_t reg) {
    uint8_t val;
    HAL_I2C_Mem_Read(&hi2c1,
                     slave_addr_7bit << 1,  // HAL은 8-bit shifted addr 사용
                     reg, I2C_MEMADD_SIZE_8BIT,
                     &val, 1, HAL_MAX_DELAY);
    return val;
}

uint8_t who_am_i = i2c_read_reg(0x68, 0x75);
// 결과: 0x68 (MPU6050 WHO_AM_I)
```

> ⚠️ STM32 HAL은 주소를 **8-bit 형태**로 넘김 — 7-bit 0x68을 `0x68 << 1 = 0xD0`로. 수많은 첫 사용자가 여기서 빠집니다.

## 예약 주소 — General Call·Start Byte

7-bit 주소 공간 중 *8개 prefix*가 예약. 가장 자주 만나는 둘:

### General Call (`0x00`)

마스터가 *모든 슬레이브에 broadcast*. 슬레이브가 *General Call에 응답*하도록 등록되면 ACK.

```text
S | 0x00 | W | A | 데이터 | A | P
   ↑       ↑
   General Call addr   슬레이브 다수가 동시 ACK (wired-AND)
```

#### 흔한 General Call 명령

| 두 번째 바이트 | 의미 |
| --- | --- |
| `0x06` | Software reset — 모든 슬레이브 reset |
| `0x04` | "프로그램 가능한 주소 받아라" — 동적 주소 |
| 다른 값 | 슬레이브 정의 |

> 💡 General Call은 *실무에서 거의 안 씀*. 슬레이브가 *명시적 enable* 안 하면 무시.

### Start Byte (`0x01`)

옛 폴링 방식 — 마스터가 *주소 잡기 전에* `0x01`을 보내 "다음 트랜잭션 시작" 신호. 슬레이브들이 *polling-on-interrupt* 모드일 때 활용.

```text
S | 0x01 | W | <NACK> | Sr | 진짜 주소 | ...
```

> 💡 *완전 deprecated*. 모던 슬레이브는 *인터럽트 핀*으로 호스트에 깨움 알림.

### 기타 예약 주소

| 주소 | 용도 |
| --- | --- |
| `0000 0000 0` (0x00 + W) | General Call |
| `0000 0000 1` (0x00 + R) | Start Byte |
| `0000 001x` | CBUS — 옛 Philips 호환 |
| `0000 010x` | 다른 버스 |
| `0000 011x` | 미래 예약 |
| `1111 0xxx` | 10-bit 주소 prefix |
| `1111 1xxx` | Hs-mode master code |

이 16개 주소는 *일반 슬레이브에 부여 금지*. 실용 공간 128 - 16 = **112개**.

## 속도 모드

| 모드 | 클럭 | 특징 |
| --- | --- | --- |
| Standard | 100 kHz | 원조 |
| Fast | 400 kHz | 가장 흔함 |
| Fast Plus | 1 MHz | 모던 센서 (BMI270, BMP380 등) |
| High-Speed | 3.4 MHz | 전용 HS-mode |
| Ultra Fast | 5 MHz | unidirectional only |

Standard와 Fast는 *상호 호환* — 400 kHz 슬레이브는 100 kHz 마스터와 OK. 반대도 가능 (느린 마스터는 모두 OK).

## 자주 하는 실수

> ⚠️ 풀업 저항 누락

I²C 모듈 (RTC, EEPROM 등) 일부에 내장 풀업이 있지만 *대부분 없습니다*. 핀이 떠 있으면 *영원히 High* — 데이터 못 보냄.

> ⚠️ 풀업 너무 약함

10 kΩ + C_bus 400 pF에서 t_rise ≈ 3.4 µs. 400 kHz 운영하려면 0.3 µs 이하 필요 → **풀업 다운, 1 kΩ 정도**.

> ⚠️ 주소 7-bit vs 8-bit 혼동

데이터시트는 7-bit (`0x68`) 또는 8-bit shifted (`0xD0`) 두 형식. 무엇이냐를 항상 확인.

> ⚠️ Pull-up을 V_DD에 안 맞춤

3.3V MCU + 5V 센서 — 풀업을 *어느 전압*에 연결? Level shifter 없이 그냥 연결하면 *5V가 MCU GPIO에 인가*되어 손상 가능.

## 정리

- I²C는 **2-wire** (SDA·SCL) + open-drain + 풀업.
- 풀업 저항 값이 **속도 한계**를 결정한다.
- Start (SCL High에 SDA 하강), Stop (SCL High에 SDA 상승), ACK (9번째 비트).
- 7-bit 주소 + R/W bit. 실용 공간 112개.
- 100k → 400k → 1M → 3.4M — 모드별 풀업·C_bus 요구 다름.

다음 편은 **I²C 심화** — Repeated Start, 10-bit, Clock Stretching, Multi-Master.

## 관련 항목

- [Ch 5: I²C 심화](/blog/embedded/protocols/embedded-serial/chapter05-i2c-advanced)
- [Ch 6: I²C 디버깅](/blog/embedded/protocols/embedded-serial/chapter06-i2c-debugging)
