---
title: "Ch 7: UART 기초 — 비동기, Baud Rate, Frame 형식, Oversampling"
date: 2026-05-16T07:00:00
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

### Baud Rate 오차 한계 — 정확한 계산

양단 baud rate 오차가 누적되면 *마지막 비트에서 샘플 윈도우 이탈* → frame drop. 정확히 얼마까지 허용?

#### 수신측 sample window

Oversampling 16×의 경우, 한 비트는 *16 sample tick* 폭. 중앙 3 sample (7·8·9)로 다수결. 따라서 *허용 오차*:

```text
한 비트 폭 = 16 ticks
샘플 윈도우 = 7-9 = 3 ticks (중앙 ±1)
누적 오차 한계 = 3 / 16 = 18.75% 한 비트 폭
→ 누적 오차가 비트 폭의 약 ±9.4%까지 허용 (이상적)
```

이 오차가 한 프레임 (start + 8 data + parity + stop = 약 10-11 bit) 동안 *누적*되므로:

```text
프레임 끝 (10 bit 후) 오차 한계 ≈ 9.4% / 10 ≈ 0.94% (보수적)
실용 한계 = 2.5% (양단 합)
```

#### 양단 분담

```text
TX 오차 + RX 오차 ≤ 2.5%

크리스털 (±50 ppm = ±0.005%): 0.005% + 0.005% = 0.01% ✓ 매우 안전
HSE PLL 후 (±0.1%): 0.1% + 0.1% = 0.2% ✓ 안전
내부 HSI RC (±2%): 2% + 2% = 4% ✗ 깨짐
보정된 RC (±1%): 1% + 1% = 2% ⚠ 한계
```

#### 표준 baud rate 매핑 오차

MCU 클럭이 12 MHz, 16 MHz, 25 MHz 같이 *깔끔한 값*일 때 prescaler가 *정확한 정수*가 안 떨어짐 → *합성 오차* 발생.

| 시스템 클럭 | 목표 baud | Prescaler (반올림) | 실제 baud | 오차 |
| --- | --- | --- | --- | --- |
| 16 MHz | 9600 | 104 | 9615 | +0.16% |
| 16 MHz | 115200 | 8.68 → 9 | 111111 | -3.55% ✗ |
| 16 MHz | 230400 | 4.34 → 4 | 250000 | +8.5% ✗✗ |
| **48 MHz** | 115200 | 26.04 → 26 | 115385 | +0.16% ✓ |
| **48 MHz** | 921600 | 3.26 → 3 | 1000000 | +8.5% ✗ |

> 💡 **고속 baud (921600, 1.5M, 3M)를 쓰려면 시스템 클럭을 *baud 정수배*로 설계**. STM32F4의 48/96/168 MHz는 115200·230400은 잘 떨어지지만 921600은 깨짐.

#### 드롭 (Frame Drop) 시그니처

오차 한계 *근접*에서 운영하면:

- 100 프레임에 1-2개 *간헐 framing error*
- 데이터 한 비트 *밀려서* 다른 값 해석 (예: 0x55 → 0xAA)
- 짧은 프레임은 OK, 긴 프레임 (8 byte 이상)에서 깨짐

해결 — *외부 크리스털*, *baud rate 재계산*, *낮은 baud로 회피*.

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

## Auto-Baud Detection

송신자의 baud rate를 *모를 때* 수신자가 자동 추정. 두 방법:

### 방법 1 — 알려진 첫 바이트

대부분의 통신은 첫 바이트로 *0x55* (LIN의 Sync byte) 또는 *0xAA* 를 송신 약속. 0x55 = `01010101` → 10개 엣지가 *bit time* 측정 → baud 역산.

### 방법 2 — Falling edge 폭 측정

수신자가 *idle High → 첫 start bit (Low)* 의 *길이*를 측정 → bit time → baud. 노이즈 한 펄스로 오인 가능.

STM32 USART의 `ABREN` 비트 + `ABRMOD[1:0]` 선택 — 0x55 모드, falling edge 모드 등.

```c
huart1.AdvancedInit.AdvFeatureInit = UART_ADVFEATURE_AUTOBAUDRATE_INIT;
huart1.AdvancedInit.AutoBaudRateEnable = UART_ADVFEATURE_AUTOBAUDRATE_ENABLE;
huart1.AdvancedInit.AutoBaudRateMode = UART_ADVFEATURE_AUTOBAUDRATE_ONFALLINGEDGE;
```

LIN 마스터-슬레이브, 부트로더 (사용자가 baud 모름)에서 사용.

## Fractional Baud Rate Generator (BRG)

MCU 시스템 클럭이 *baud 정수배가 아니면* 합성 오차. 모던 USART는 *정수 + 소수* prescaler 지원.

### STM32 USART_BRR — 16× oversampling

```text
USART_BRR = USART_CLK / baud

12-bit 정수부 + 4-bit 소수부 (1/16 단위)
```

예 — 72 MHz / 115200:

```text
72,000,000 / 115,200 = 625.0   → USART_BRR = 0x271 (정수 625)
실제 baud = 72,000,000 / 625 = 115,200   ✓ 오차 0%
```

예 — 72 MHz / 921600:

```text
72,000,000 / 921,600 = 78.125
정수부 = 78, 소수부 = 0.125 × 16 = 2
USART_BRR = (78 << 4) | 2 = 0x4E2
실제 baud = 72M / 78.125 = 921,600   ✓ 오차 0%
```

소수부가 없으면 921600 ≈ 923,077 → 0.16% 오차. **Fractional BRG가 고속 baud의 정확도를 살림**.

### 8× oversampling 변형

USART_CR1.OVER8 = 1 시 — 16× → 8× oversampling, 분주 한 단계 추가. 더 높은 baud (~10 Mbps) 가능하지만 노이즈 마진 절반.

## Break Signal

UART 라인을 *11+ bit time 연속 Low*로 유지 → "통신 중단 신호". Frame이 아니라 *line-level* 시그널.

### 용도

| 용도 | 설명 |
| --- | --- |
| **LIN Wake-up** | LIN 마스터가 슬레이브 깨우기 (≥13 bit Low) |
| **콘솔 attention** | Linux 콘솔 RS-232: Break → Magic SysRq |
| **모뎀 hang-up** | 옛 모뎀에서 끊기 신호 |
| **에러 신호** | 사용자 정의 "중지" |

### STM32 송신·수신

```c
// 송신 — break 11 bit time
__HAL_UART_SEND_REQ(&huart1, UART_SENDBREAK_REQUEST);

// 수신 — Break detect 인터럽트
if (__HAL_UART_GET_FLAG(&huart1, UART_FLAG_LBDF)) {
    __HAL_UART_CLEAR_FLAG(&huart1, UART_FLAG_LBDF);
    // Break 감지됨
}
```

LIN 슬레이브는 *Break + Sync(0x55) + ID + Data + Checksum* 시퀀스로 깨어남.

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
