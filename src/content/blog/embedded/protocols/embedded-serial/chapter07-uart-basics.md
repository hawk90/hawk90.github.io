---
title: "Ch 7: UART 기초 — 비동기, Baud Rate, Frame 형식, Oversampling"
date: 2027-03-01T07:00:00
description: "Start·Data·Parity·Stop. 클럭 공유 없이 양단 baud rate만 맞으면 동작하는 비동기 직렬."
series: "Embedded Protocols 심화"
seriesOrder: 7
tags: [uart, baud, parity, framing, oversampling]
draft: true
---

## 한 줄 요약

> **"양단 baud rate만 맞으면 됨"** — 클럭 라인 없이 1-2 선만으로 통신. 첫 보드의 *살아 있나*를 확인하는 첫 인터페이스.

## 어떤 문제를 푸는가

SPI·I²C는 동기 — 마스터가 클럭을 흘립니다. UART는 *비동기* — 클럭 라인 없이 양쪽이 *시간*으로만 합의:

- 양쪽이 **동일 baud rate** (예 115200) 설정.
- 송신자가 *start bit*로 "여기서 한 프레임 시작" 신호.
- 수신자는 *baud rate 주기* 단위로 비트 샘플링.

핀 1-2개 (TX·RX)로 끝. **MCU 디버그 콘솔의 표준**.

## 한눈에 보는 구조

![UART frame format](/images/blog/embedded-serial/diagrams/ch07-uart-frame.svg)

`Start (1) → Data (5-9 bit, LSB first) → Parity (옵션) → Stop (1 또는 2)` 한 프레임.

## Frame 형식

```text
Idle (High) ── Start (Low) ── Data 0 ── Data 1 ── ... ── Data N ── [Parity] ── Stop (High) ── Idle
              │  1 bit  │ │   N bits (보통 8)         │   │ 1 bit │ │ 1-2 bit │
```

### 표기법 `8N1`

가장 흔한 설정 — `8N1`:
- **8** — 데이터 8 bit
- **N** — No parity
- **1** — Stop bit 1개

다른 흔한 조합:
- `7E1` — 7 data, Even parity, 1 stop (옛 시스템)
- `8E1` — 8 data, Even parity, 1 stop (Modbus ASCII)
- `8N2` — 8 data, No parity, 2 stop (멀티드롭에 사용되기도)

### Parity

- **Even** — 데이터 비트 + parity 합이 *짝수*
- **Odd** — 합이 *홀수*
- **Mark** — parity 항상 1 (특수)
- **Space** — parity 항상 0 (특수)

1비트 오류 검출 가능, 2비트 동시 오류는 미감지. *낮은 신뢰성*이라 모던 시스템에선 거의 안 씀.

## Baud Rate — 양단의 약속

| Baud | 비트 시간 (T) | 1 KB 전송 (8N1) |
| --- | --- | --- |
| 9600 | 104 µs | 8.5 ms |
| 19200 | 52 µs | 4.3 ms |
| 57600 | 17.4 µs | 1.4 ms |
| **115200** | 8.7 µs | 720 µs |
| 230400 | 4.3 µs | 360 µs |
| 921600 | 1.1 µs | 90 µs |
| 1500000 | 0.67 µs | 56 µs |

`115200`이 *사실상 표준*. printf 콘솔, GPS NMEA, Bluetooth 모듈 다 이 속도 기본.

### Baud Rate 오차 한계

양단 baud rate 오차가 누적되면 *마지막 비트에서 어긋남*. 한 프레임 (10 bit = start + 8 data + stop)에서 *최대 2.5%* 차이면 안전 한계.

```text
양단 오차 1% + 1% = 2% (안전)
양단 오차 3% + 0% = 3% → 프레임 끝에서 ±0.3 bit → 위험
```

MCU 내부 RC oscillator는 ±2-3% — 외부 크리스털 (±50 ppm) 권장.

## Oversampling — 수신의 안정성 비결

UART 수신자는 *baud rate × 16* (또는 8)의 클럭으로 라인을 sampling. 각 비트 중앙 3개 샘플 → *다수결*.

```text
한 비트 = 16 sample
샘플 8 (중앙), 7, 9 — 세 점 다수결
모두 0 → bit = 0
하나만 1 → 글리치 무시
```

이 덕분에 *baud rate 오차*와 *작은 글리치*에 강함. STM32 `OVER8` bit로 8× / 16× 선택.

## STM32 HAL 예제

```c
UART_HandleTypeDef huart1;

void uart_init(void) {
    huart1.Instance = USART1;
    huart1.Init.BaudRate = 115200;
    huart1.Init.WordLength = UART_WORDLENGTH_8B;
    huart1.Init.StopBits = UART_STOPBITS_1;
    huart1.Init.Parity = UART_PARITY_NONE;
    huart1.Init.Mode = UART_MODE_TX_RX;
    huart1.Init.HwFlowCtl = UART_HWCONTROL_NONE;
    huart1.Init.OverSampling = UART_OVERSAMPLING_16;
    HAL_UART_Init(&huart1);
}

// printf 리다이렉트
int _write(int fd, char *ptr, int len) {
    HAL_UART_Transmit(&huart1, (uint8_t*)ptr, len, HAL_MAX_DELAY);
    return len;
}

// 사용
printf("Hello UART\r\n");
```

## 흔한 에러 플래그

| 에러 | 의미 | 원인 |
| --- | --- | --- |
| **Framing Error (FE)** | Stop bit 위치에 Low | baud 불일치, 라인 노이즈 |
| **Parity Error (PE)** | Parity 안 맞음 | 비트 깨짐 (1 bit) |
| **Overrun (ORE)** | 버퍼 비우기 전에 새 프레임 | 인터럽트 처리 늦음, FIFO 부족 |
| **Noise (NE)** | 한 비트 내 sample 불일치 | 전기 노이즈 |
| **Idle Line** | 연속 idle 감지 (에러 아님) | 정상 — RX timeout 트리거 |

대부분의 STM32 HAL 함수는 ORE 발생 시 *RX를 멈춤*. 명시적 클리어 (`__HAL_UART_CLEAR_OREFLAG`) 필요.

## TX·RX 핀 외에

- **DTR / DSR / RI / DCD** — 모뎀 제어 신호 (RS-232 시대), 모던 시스템에선 거의 미사용
- **RTS / CTS** — Hardware flow control (다음 챕터)
- **RX timeout** — IDLE 라인 검출로 *프레임 경계* 인식 (DMA + IDLE 인터럽트 패턴)

## 자주 하는 실수

> ⚠️ Baud rate 부정확

MCU baud rate 계산 오차 > 2%면 *높은 속도*에서 깨짐. 데이터시트의 *baud rate error 표* 확인 (특히 921600 같은 비표준).

> ⚠️ TX/RX 교차 연결 누락

**A의 TX → B의 RX**, **A의 RX → B의 TX**. 모뎀 케이블 (cross)·null modem 인지 확인. 양쪽 다 TX→TX로 연결하면 0 통신.

> ⚠️ 8N1 가정

대부분 8N1이지만 *옛 시스템* (Modbus ASCII 등)은 8E1 또는 7E1. 데이터시트 확인.

> ⚠️ printf 후 `\n`만

`\n`만 보내면 콘솔이 *carriage return 없이* 다음 줄로 → "줄 끝 → 줄 시작 안 함" 현상. `\r\n`으로 보내야 안전.

## 정리

- UART는 **비동기** — clock 라인 없이 양단 baud rate 합의.
- Frame = `Start (1) + Data (N) + [Parity] + Stop (1/2)`.
- **8N1 + 115200**이 사실상 디폴트.
- **Oversampling**(16× 또는 8×) + 다수결로 노이즈 견딤.
- 양단 baud 오차 합 **2.5%** 이내.

다음 편은 **UART 심화** — Hardware Flow Control (RTS/CTS), DMA + IDLE 인터럽트, multidrop.

## 관련 항목

- [Ch 8: UART 심화](/blog/embedded/protocols/embedded-serial/chapter08-uart-advanced)
- [Ch 9: RS-232 / RS-485](/blog/embedded/protocols/embedded-serial/chapter09-rs232-rs485)
