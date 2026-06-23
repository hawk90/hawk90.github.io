---
title: "UART 안 찍힐 때 — Bare-metal 체크리스트"
date: 2026-04-19T09:04:00
description: "UART 디버깅. 클럭·핀·baud·로직 레벨·종단·인쇄 단계별 체크."
series: "Modern Embedded Recipes"
seriesOrder: 115
tags: [recipes, uart, debugging, bare-metal]
draft: false
---

## 한 줄 요약

> **"UART가 안 찍힐 때는 전기, 핀, 클럭, baud, 코드 순으로 위에서부터 점검합니다."**

## Step 1: 전기·접지

- [ ] USB-UART converter VCC와 보드 GND 공유?
- [ ] 보드 전원 ON·전압 정상? (멀티미터 측정)
- [ ] USB-UART의 TX·RX·GND 라인 3개 모두 연결?
- [ ] 3.3V 보드에 5V converter? → fry 위험. level shifter 또는 3.3V converter

가장 흔한 실수는 GND를 연결하지 않는 것입니다. 전원만 보고 signal ground를 잊는 경우가 많습니다.

## Step 2: TX·RX 교차 확인

```text
       Board                  USB-UART
       
       TX  ─────────────────  RX
       RX  ─────────────────  TX
       GND ─────────────────  GND
```

Crossover는 한쪽의 TX가 다른 쪽의 RX와 만나는 연결을 의미합니다. 일자로 연결하면 양쪽 TX끼리, RX끼리 마주 보게 됩니다.

```c
/* 의심되면 *교차해서 다시 시도* */
swap_tx_rx();
```

USB-UART에 표시된 TX/RX 위치를 확인합니다. 보드 표시는 해당 보드의 신호 방향을 나타냅니다.

## Step 3: Baud Rate 매칭

일반 baud: 9600, 38400, 57600, 115200, 230400, 460800, 921600

- [ ] Sender · receiver 같은 baud?
- [ ] 8N1 (8-bit, no parity, 1 stop)?
- [ ] Flow control 없음? (CTS/RTS 비활성)

```bash
# Linux 측 (USB-UART)
stty -F /dev/ttyUSB0 115200 cs8 -parenb -cstopb -crtscts
screen /dev/ttyUSB0 115200
```

STM32 코드 측:

```c
huart1.Init.BaudRate = 115200;
huart1.Init.WordLength = UART_WORDLENGTH_8B;
huart1.Init.StopBits = UART_STOPBITS_1;
huart1.Init.Parity = UART_PARITY_NONE;
huart1.Init.HwFlowCtl = UART_HWCONTROL_NONE;
```

## Step 4: Pin Mux·Alternate Function

STM32 GPIO에 Alternate Function 설정을 하지 않으면 UART 신호가 나오지 않습니다.

```c
GPIO_InitTypeDef gpio = {0};
gpio.Pin = GPIO_PIN_9 | GPIO_PIN_10;
gpio.Mode = GPIO_MODE_AF_PP;
gpio.Pull = GPIO_NOPULL;
gpio.Speed = GPIO_SPEED_FREQ_HIGH;
gpio.Alternate = GPIO_AF7_USART1;   // ← 핵심
HAL_GPIO_Init(GPIOA, &gpio);
```

데이터시트의 Alternate Function Mapping 표를 확인합니다. ESP32, NXP, Nordic 모두 비슷한 구조를 가집니다.

## Step 5: Clock Enable

```c
/* RCC enable — 잊으면 *완전 정지* */
__HAL_RCC_USART1_CLK_ENABLE();
__HAL_RCC_GPIOA_CLK_ENABLE();
```

Cortex-M의 peripheral clock gating은 기본값이 disable입니다. 칩 reset 직후에는 활성화된 peripheral이 하나도 없습니다.

## Step 6: Baud 계산 검증

```c
/* USART_BRR = PCLK / (16 × baud) */
/* PCLK = 84 MHz, baud = 115200 → BRR = 45.572... */
/* 정수만 → fractional + mantissa */

actual_baud = PCLK / (16 × BRR);
error_pct = abs(actual_baud - 115200) / 115200 × 100;
// 3% 초과 시 통신 실패
```

> ⚠️ HSI (internal oscillator)는 정확도가 ±1-3% 수준이라 115200 이상에서 marginal해집니다.
> 외부 crystal이나 HSE 사용을 권장합니다.

## Step 7: Logic Analyzer로 캡쳐

UART 신호를 Saleae Logic이나 DSLogic으로 캡쳐합니다.

```text
115200 baud → 1 bit ≈ 8.68 µs
8N1 frame:
  Start bit (0) + 8 data bits + Stop bit (1) = 10 bits ≈ 86.8 µs/byte
```

캡쳐 후:

| 관찰 | 의미 |
|---|---|
| 신호 흔들림·과도 노이즈 | 와이어 길이·종단 문제 |
| 0과 1만 줄줄이 | baud mismatch |
| 잘못된 character | parity 또는 word length 차이 |
| 신호 없음 | clock·pin mux 또는 코드 실행 안 됨 |

## Step 8: TX 핀 LED 토글로 코드 실행 확인

```c
while (1) {
    HAL_GPIO_TogglePin(GPIOC, GPIO_PIN_13);
    HAL_UART_Transmit(&huart1, "Hello\r\n", 7, 100);
    HAL_Delay(1000);
}
```

LED가 토글되면 코드는 동작하고 UART만 문제입니다. 반대로 LED도 토글되지 않으면 코드 자체가 hang 상태입니다.

## Step 9: Polling vs IRQ vs DMA

```c
/* Polling — 가장 단순, 디버깅 용이 */
HAL_UART_Transmit(&huart1, data, len, HAL_MAX_DELAY);

/* IRQ */
HAL_UART_Transmit_IT(&huart1, data, len);

/* DMA */
HAL_UART_Transmit_DMA(&huart1, data, len);
```

DMA나 IRQ가 동작하지 않으면 polling으로 먼저 검증합니다. 가장 흔한 IRQ 실수는 `NVIC_EnableIRQ` 누락입니다.

## Step 10: ESP32 / Nordic / NXP 차이

| MCU | UART 관련 주의 |
|---|---|
| **STM32** | Alternate Function 매핑 |
| **ESP32** | `uart_set_pin(UART_NUM_1, 17, 16, -1, -1)` 명시 pin |
| **Nordic nRF** | NRFX UART vs UARTE (asynchronous) |
| **NXP S32K** | LPUART vs UART — 동일 칩 안에 둘 다 |
| **RP2040** | UART0/UART1 + GPIO function select |

## printf 리다이렉트

```c
/* _write override — newlib */
int _write(int file, char *ptr, int len) {
    HAL_UART_Transmit(&huart1, (uint8_t*)ptr, len, HAL_MAX_DELAY);
    return len;
}

/* 사용 */
printf("Sensor read: %d\n", value);
```

Newlib-nano (`-specs=nano.specs`)를 사용하면 float printf가 동작하지 않아 `%f` 출력이 빈 칸으로 나옵니다. 이때 `-u _printf_float` linker option이 필요합니다.

## SWO Trace — UART 대신 빠른 출력

Cortex-M3 이상은 Single Wire Output을 지원합니다. UART보다 수십 배 빠르고 GPIO 1핀만 사용합니다.

```c
ITM_SendChar('H');
ITM_SendChar('i');
```

ST-Link와 J-Link 모두 SWO viewer를 내장합니다. 디버깅 용도로는 최선의 선택입니다.

## Semihosting — 가장 느림, 가장 간단

```c
/* OpenOCD나 PyOCD + GDB */
printf("Hello\n");   // → GDB console
```

`-specs=rdimon.specs` linker option을 사용합니다. 실행 시 breakpoint로 멈추므로 production에서는 쓸 수 없습니다.

## 자주 하는 실수

> ⚠️ `\r\n` vs `\n`

```c
printf("Hello\n");   // ← terminal에서 줄이 *띄어쓰기 정렬* 안 됨
printf("Hello\r\n"); // ← carriage return + line feed
```

ESP-IDF와 Zephyr는 auto convert 옵션을 제공합니다.

> ⚠️ `printf` 호출 후 즉시 reset

```c
printf("error\n");
NVIC_SystemReset();   // ← UART buffer 안 비웠는데 reset
```

DMA나 IT mode라면 buffer flush 대기가 필요합니다. Polling은 동기 방식이라 문제가 없습니다.

> ⚠️ Variable arg printf로 stack overflow

```c
printf("%s\n", huge_buffer);   // 1KB → format buffer overflow
```

Newlib printf는 stack 사용량이 큽니다. 임베디드 환경에서는 `mini-printf`나 `tinyprintf` 라이브러리를 고려합니다.

> ⚠️ Float 변환 누락

```c
printf("%f", 3.14);   // → ""  (newlib-nano 기본)
```

`-u _printf_float`를 추가하거나 `--specs=nano.specs --specs=nosys.specs -u _printf_float`를 사용합니다.

## 정리

체크리스트:
1. GND 공유
2. TX↔RX 교차
3. Baud·8N1 일치
4. GPIO Alternate Function
5. RCC clock enable
6. Baud 계산 error < 3%
7. Logic analyzer 캡쳐
8. LED 토글로 코드 동작 확인
9. Polling으로 우선 검증
10. SWO·semihosting 백업 채널

다음 편은 **DDR 초기화**입니다.

## 관련 항목

- 1-02: DDR 초기화
- [Embedded Serial Ch 1: UART](/blog/embedded/protocols/embedded-serial/chapter01-overview)
