---
title: "1-01: UART 안 찍힐 때 — Bare-metal 체크리스트"
date: 2026-05-13T18:00:00
description: "UART 디버깅. 클럭·핀·baud·로직 레벨·종단·인쇄 단계별 체크."
series: "Modern Embedded Recipes"
seriesOrder: 1
tags: [recipes, uart, debugging, bare-metal]
draft: true
---

## 한 줄 요약

> **"UART 안 찍힐 땐 *전기 → 핀 → 클럭 → baud → 코드* 순"** — 위에서부터.

## Step 1: 전기·접지

```text
[ ] USB-UART converter VCC와 보드 GND 공유?
[ ] 보드 전원 ON·전압 정상? (멀티미터 측정)
[ ] USB-UART의 TX·RX·GND 라인 3개 모두 연결?
[ ] 3.3V 보드에 5V converter? → fry 위험. level shifter 또는 3.3V converter
```

가장 흔한 실수 — *GND 안 연결*. 전원만 보고 *signal ground* 잊음.

## Step 2: TX·RX 교차 확인

```text
       Board                  USB-UART
       
       TX  ─────────────────  RX
       RX  ─────────────────  TX
       GND ─────────────────  GND
```

*Crossover* — 한 쪽 TX = 다른 쪽 RX. 일자로 연결하면 *둘 다 TX끼리·RX끼리* 만남.

```c
/* 의심되면 *교차해서 다시 시도* */
swap_tx_rx();
```

USB-UART에 *TX/RX 표시 위치* 확인 (보드 표시는 *해당 보드의 신호 방향*).

## Step 3: Baud Rate 매칭

```text
일반 baud: 9600, 38400, 57600, 115200, 230400, 460800, 921600

[ ] Sender · receiver 같은 baud?
[ ] 8N1 (8-bit, no parity, 1 stop)?
[ ] Flow control 없음? (CTS/RTS 비활성)
```

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

STM32 GPIO에 *Alternate Function* 설정 안 하면 — *UART 신호 안 나옴*.

```c
GPIO_InitTypeDef gpio = {0};
gpio.Pin = GPIO_PIN_9 | GPIO_PIN_10;
gpio.Mode = GPIO_MODE_AF_PP;
gpio.Pull = GPIO_NOPULL;
gpio.Speed = GPIO_SPEED_FREQ_HIGH;
gpio.Alternate = GPIO_AF7_USART1;   // ← 핵심
HAL_GPIO_Init(GPIOA, &gpio);
```

데이터시트 *Alternate Function Mapping* 표 확인. ESP32·NXP·Nordic 모두 비슷.

## Step 5: Clock Enable

```c
/* RCC enable — 잊으면 *완전 정지* */
__HAL_RCC_USART1_CLK_ENABLE();
__HAL_RCC_GPIOA_CLK_ENABLE();
```

Cortex-M의 *peripheral clock gating* — 기본 disable. 칩 reset 직후엔 활성화 0개.

## Step 6: Baud 계산 검증

```c
/* USART_BRR = PCLK / (16 × baud) */
/* PCLK = 84 MHz, baud = 115200 → BRR = 45.572... */
/* 정수만 → fractional + mantissa */

actual_baud = PCLK / (16 × BRR);
error_pct = abs(actual_baud - 115200) / 115200 × 100;
// 3% 초과 시 통신 실패
```

> ⚠️ HSI (internal oscillator)는 *정확도 ±1-3%* — 115200 이상에서 marginal.
> 외부 crystal·HSE 사용 권장.

## Step 7: Logic Analyzer로 캡쳐

UART 신호를 *Saleae Logic·DSLogic*으로 캡쳐:

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

LED 토글되면 *코드 동작*, UART만 문제. LED도 안 토글되면 *코드 자체 hang*.

## Step 9: Polling vs IRQ vs DMA

```c
/* Polling — 가장 단순, 디버깅 용이 */
HAL_UART_Transmit(&huart1, data, len, HAL_MAX_DELAY);

/* IRQ */
HAL_UART_Transmit_IT(&huart1, data, len);

/* DMA */
HAL_UART_Transmit_DMA(&huart1, data, len);
```

DMA·IRQ가 안 되면 *polling으로 먼저* 검증. 가장 흔한 IRQ 실수 — `NVIC_EnableIRQ` 누락.

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

Newlib-nano (`-specs=nano.specs`) 사용 시 *float printf 안 됨* — `%f` 출력 빈 칸. `-u _printf_float` linker option 필요.

## SWO Trace — UART 대신 빠른 출력

Cortex-M3+ — *Single Wire Output*. UART보다 *수십 배 빠름*, GPIO 1핀만.

```c
ITM_SendChar('H');
ITM_SendChar('i');
```

ST-Link·J-Link 모두 SWO viewer 내장. 디버깅용 *최선의 선택*.

## Semihosting — 가장 느림, 가장 간단

```c
/* OpenOCD나 PyOCD + GDB */
printf("Hello\n");   // → GDB console
```

`-specs=rdimon.specs` linker option. 실행 시 *breakpoint*로 멈춤 — production 안 됨.

## 자주 하는 실수

> ⚠️ `\r\n` vs `\n`

```c
printf("Hello\n");   // ← terminal에서 줄이 *띄어쓰기 정렬* 안 됨
printf("Hello\r\n"); // ← carriage return + line feed
```

ESP-IDF·Zephyr는 *auto convert* 옵션 있음.

> ⚠️ `printf` 호출 후 즉시 reset

```c
printf("error\n");
NVIC_SystemReset();   // ← UART buffer 안 비웠는데 reset
```

DMA·IT mode면 *buffer flush 대기* 필요. Polling은 동기 — 문제 없음.

> ⚠️ Variable arg printf로 stack overflow

```c
printf("%s\n", huge_buffer);   // 1KB → format buffer overflow
```

Newlib printf는 *stack 사용량 큼*. Embedded는 `mini-printf`·`tinyprintf` 라이브러리 고려.

> ⚠️ Float 변환 누락

```c
printf("%f", 3.14);   // → ""  (newlib-nano 기본)
```

`-u _printf_float` 또는 `--specs=nano.specs --specs=nosys.specs -u _printf_float`.

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

다음 편은 **DDR 초기화**.

## 관련 항목

- [1-02: DDR 초기화](/blog/embedded/modern-recipes/part1-02-ddr-init)
- [Embedded Serial Ch 1: UART](/blog/embedded/protocols/embedded-serial/chapter01-uart-basics)
