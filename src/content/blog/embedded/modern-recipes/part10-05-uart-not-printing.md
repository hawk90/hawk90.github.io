---
title: "UART 안 찍힐 때 — Bare-metal 체크리스트"
slug: "embedded/modern-recipes/part10-05-uart-not-printing"
date: 2026-04-19T09:04:00
description: "UART가 안 찍힐 때 접지·교차·프레임·AF·클럭·UE/TE·baud·캡처·코드 실행을 차례로 점검하고, QEMU STM32L475에서 TE 누락과 semihosting 빌드의 동작을 실제로 확인합니다."
series: "Modern Embedded Recipes"
seriesOrder: 115
tags: [recipes, uart, debugging, bare-metal]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> **"UART가 안 찍힐 때는 전기, 핀, 클럭, 주변장치 enable, baud, 코드 순으로 위에서부터 점검합니다."** 아래 단계 중 USART 설정이 출력에 미치는 영향은 QEMU의 STM32L475 머신에서 직접 확인했고, 보드에서는 실행하지 않았습니다.

## Step 1: 전기·접지

- [ ] USB-UART 변환기의 GND와 보드 GND가 연결되어 있는가
- [ ] 보드 전원이 켜져 있고 전압이 정상인가(멀티미터)
- [ ] TX·RX·GND 세 선이 모두 연결되어 있는가
- [ ] 변환기 신호 레벨이 보드 I/O 전압과 맞는가

UART는 두 신호선의 전압을 *각자의 GND에 대해* 읽습니다. GND를 잇지 않으면 수신 측이 보는 전압에 기준이 없습니다. 레벨은 [1-03](/blog/embedded/modern-recipes/part1-03-gpio-internals)에서 본 것처럼 입력 핀의 절대 최대 정격으로 판단합니다. STM32F405/407의 일반 핀은 4.0 V, FT 핀은 V_DD + 4 V까지입니다(DS8626 Table 11).

## Step 2: TX·RX 교차

보드의 TX는 변환기의 RX로, 보드의 RX는 변환기의 TX로 갑니다. 핀 이름은 각 장치 *자신의* 방향을 나타내므로, 이름이 같은 핀끼리 이으면 TX끼리 마주 보게 됩니다. 변환기 쪽 라벨이 어느 기준인지는 그 변환기 문서에서 확인하고, 의심스러우면 두 선을 바꿔 다시 연결해 봅니다.

## Step 3: 프레임 설정 맞추기

- [ ] 양쪽 baud가 같은가
- [ ] 8N1(데이터 8, 패리티 없음, stop 1)로 같은가
- [ ] 흐름 제어(CTS/RTS)를 양쪽 다 끄거나 다 켰는가

```bash
# Linux 측 (USB-UART): 115200 8N1, 흐름 제어 없음
stty -F /dev/ttyUSB0 115200 cs8 -parenb -cstopb -crtscts
screen /dev/ttyUSB0 115200
```

STM32 HAL에서는 같은 설정을 핸들 구조체에 넣습니다.

```c
huart1.Init.BaudRate = 115200;
huart1.Init.WordLength = UART_WORDLENGTH_8B;
huart1.Init.StopBits = UART_STOPBITS_1;
huart1.Init.Parity = UART_PARITY_NONE;
huart1.Init.HwFlowCtl = UART_HWCONTROL_NONE;
```

## Step 4: 핀의 Alternate Function

STM32 GPIO는 리셋 뒤 입력 모드이고, USART 신호를 핀으로 내려면 그 핀을 alternate function으로 바꾸고 AF 번호를 골라야 합니다. STM32F407에서 USART1_TX는 PA9의 AF7입니다(DS8626 alternate function 표, HAL `GPIO_AF7_USART1` = 0x07).

```c
GPIO_InitTypeDef gpio = {0};
gpio.Pin = GPIO_PIN_9 | GPIO_PIN_10;
gpio.Mode = GPIO_MODE_AF_PP;
gpio.Pull = GPIO_PULLUP;
gpio.Speed = GPIO_SPEED_FREQ_HIGH;
gpio.Alternate = GPIO_AF7_USART1;
HAL_GPIO_Init(GPIOA, &gpio);
```

HAL v1.8.6 `stm32f4xx_hal_uart.c`의 사용법 주석은 `HAL_UART_MspInit()`에서 할 일을 순서대로 적습니다. USART 클럭을 켜고, GPIO 클럭을 켜고, TX/RX 핀을 "alternate function pull-up"으로 설정합니다. 위 코드의 `GPIO_PULLUP`은 이 주석을 따른 것입니다.

## Step 5: 클럭과 주변장치 enable

```c
__HAL_RCC_USART1_CLK_ENABLE();
__HAL_RCC_GPIOA_CLK_ENABLE();
```

같은 HAL 주석이 첫 단계로 USART 클럭 enable을 듭니다. 그 다음이 USART 자체의 enable입니다. 레지스터 수준에서는 `CR1`의 `UE`(USART enable)와 `TE`(transmitter enable)가 모두 켜져야 TX가 동작합니다. 이 차이를 QEMU 11.1.3의 `b-l475e-iot01a`(STM32L475)에서 확인했습니다. USART1 출력을 파일로 받고, 같은 코드를 `TE`를 빼고, 또 RCC enable을 빼고 빌드했습니다.

```c
#include "stm32l4xx.h"
void pr(const char *, ...);

static void uart1_putc(char c) {
    while (!(USART1->ISR & USART_ISR_TXE)) { }
    USART1->TDR = (uint8_t)c;
}
static void uart1_puts(const char *s) { while (*s) uart1_putc(*s++); }

int main(void) {
#ifndef NO_CLOCK
    RCC->APB2ENR |= RCC_APB2ENR_USART1EN;     /* Step 5 */
#endif
    USART1->BRR = 80000000u / 115200u;        /* value irrelevant to QEMU */
#ifdef NO_TE
    USART1->CR1 = USART_CR1_UE;               /* transmitter not enabled */
#else
    USART1->CR1 = USART_CR1_TE | USART_CR1_UE;
#endif
    pr("ISR=0x%08x CR1=0x%08x\n", USART1->ISR, USART1->CR1);
    uart1_puts("Hello\r\n");
    while (!(USART1->ISR & USART_ISR_TC)) { }
    pr("sent\n");
    return 0;
}
```

```bash
arm-none-eabi-gcc -mcpu=cortex-m4 -mthumb -O1 -ffreestanding -nostdlib -DSTM32L475xx \
  -I cmsis_device_l4/Include -I CMSIS_5/CMSIS/Core/Include -Wall \
  -T link-l4.ld startup.c sh.c u.c -lgcc -o u.elf          # -DNO_TE / -DNO_CLOCK 변형
qemu-system-arm -M b-l475e-iot01a -nographic -monitor none -serial file:out.bin \
  -semihosting-config enable=on,target=native -kernel u.elf
```

```text
=== OK
ISR=0x022000c0 CR1=0x00000009
sent
serial: 00000000: 4865 6c6c 6f0d 0a                        Hello..
=== NO_TE
ISR=0x020000c0 CR1=0x00000001
(TC를 기다리다 timeout)
serial:
=== NO_CLOCK
ISR=0x022000c0 CR1=0x00000009
sent
serial: 00000000: 4865 6c6c 6f0d 0a                        Hello..
```

`TE`를 빼면 `TXE`는 서 있어서 `TDR`에 쓰기는 되지만, 한 바이트도 나가지 않고 전송 완료 플래그 `TC`(bit 6)도 서지 않아 코드가 멈춥니다. 반대로 RCC enable을 빼도 QEMU에서는 그대로 출력됩니다. QEMU의 이 USART 모델은 RCC 클럭 게이팅을 흉내 내지 않으므로, 클럭 enable 누락은 QEMU로 재현되지 않습니다. 실제 칩에서는 HAL 주석의 첫 단계를 빠뜨린 것이므로 보드에서 따로 확인합니다.

## Step 6: Baud 계산 검증

USART BRR은 USARTDIV × 16이고 실제 baud는 PCLK / BRR입니다(HAL `UART_BRR_SAMPLING16` 매크로, [1-02](/blog/embedded/modern-recipes/part1-02-clock-timing)). 84 MHz에서 115200을 내면 다음과 같습니다.

```text
84 MHz, 115200: USARTDIV*16 = 729.1666666666666 -> BRR 729 actual 115226.34 err +0.023%
```

이 오차와 양쪽 클럭 오차의 합이 수신기 허용 오차 안에 있어야 합니다. STM32H743 USART의 형식별 허용 오차(8N1에서 3.33%)와 내부 RC로 통신할 때의 판정은 [1-04](/blog/embedded/modern-recipes/part1-04-uart-hardware)에, AVR 수신기 식은 1-02에 있습니다.

## Step 7: Logic analyzer로 캡처

115200 baud에서 한 비트는 1/115200 = 8.68 µs, 8N1 한 문자는 10비트이므로 86.8 µs입니다. 캡처에서 볼 것은 다음과 같습니다.

| 관찰 | 의미하는 것 |
|---|---|
| 신호가 계속 high(idle)이고 변화 없음 | TX가 나가지 않음: Step 4~5와 코드 실행 여부 |
| 비트 폭이 8.68 µs가 아님 | 송신 측 baud 설정 또는 클럭 트리 |
| 비트 폭은 맞는데 수신 측이 깨진 문자 | 수신 측 baud·패리티·데이터 길이 설정 |

logic analyzer의 UART decoder에 같은 8N1·baud를 넣고 디코드되는지 보면, 문제가 송신 쪽인지 수신 쪽인지 갈립니다.

## Step 8: GPIO 토글로 코드 실행 확인

```c
while (1) {
    HAL_GPIO_TogglePin(GPIOC, GPIO_PIN_13);
    HAL_UART_Transmit(&huart1, (uint8_t *)"Hello\r\n", 7, 100);
    HAL_Delay(1000);
}
```

LED가 토글되면 코드는 이 루프까지 왔고 UART 경로만 의심하면 됩니다. LED도 멈춰 있으면 루프에 오기 전에 멈춘 것이므로 [10-04: 하드폴트 분석](/blog/embedded/modern-recipes/part10-04-hardfault-analysis)이나 [10-06: 부팅 안 될 때](/blog/embedded/modern-recipes/part10-06-boot-failure)로 갑니다.

## Step 9: Polling부터

```c
/* Polling */
HAL_UART_Transmit(&huart1, data, len, HAL_MAX_DELAY);

/* Interrupt: HAL_UART_IRQHandler()가 불려야 진행 */
HAL_UART_Transmit_IT(&huart1, data, len);

/* DMA */
HAL_UART_Transmit_DMA(&huart1, data, len);
```

interrupt 방식은 USART 인터럽트가 NVIC에서 켜져 있고 IRQ 핸들러가 `HAL_UART_IRQHandler()`를 부를 때만 진행됩니다. DMA 방식은 여기에 DMA stream 설정과 그 인터럽트가 더해집니다. 의존하는 것이 가장 적은 polling으로 먼저 출력을 확인하고, 그 다음에 interrupt·DMA로 넘어갑니다. 세 방식의 구현은 [4-07: UART 드라이버 구현](/blog/embedded/modern-recipes/part4-07-uart-driver)에 있습니다.

## printf 리다이렉트

newlib의 `printf`는 최종적으로 `_write()`를 부르므로, 이 함수를 UART로 보내도록 정의합니다.

```c
int _write(int file, char *ptr, int len) {
    (void)file;
    HAL_UART_Transmit(&huart1, (uint8_t *)ptr, len, HAL_MAX_DELAY);
    return len;
}
```

newlib-nano(`--specs=nano.specs`)를 쓰면 `%f`가 기본으로 동작하지 않습니다. newlib `README`의 `--enable-newlib-nano-formatted-io` 설명은 부동소수점 지원이 기본으로 링크되지 않는 weak 함수 `_printf_float`로 분리되어 있어, 필요하면 `-u _printf_float`로 링크를 강제하라고 적습니다. `nano-vfprintf.c`는 이 함수가 링크되지 않았으면 해당 인자를 소비만 하고 출력 길이를 0으로 둡니다. 그래서 `printf("%f", 3.14)`는 아무것도 찍지 않습니다. 이 Mac의 `arm-none-eabi-gcc` 16.2에는 newlib이 없어 실행으로 확인하지는 않았습니다.

## SWO·ITM — UART 대신

UART 핀이나 변환기가 의심스러우면 디버그 프로브의 SWO로 출력을 우회합니다. CMSIS의 `ITM_SendChar()`가 ITM stimulus port 0으로 한 글자를 보내고, 프로브가 SWO 핀으로 받습니다. 설정 방법은 [10-03](/blog/embedded/modern-recipes/part10-03-gdb-remote-debug)의 TPIU 절에 있습니다.

```c
ITM_SendChar('H');
ITM_SendChar('i');
```

## Semihosting — 디버거가 붙어 있을 때만

semihosting은 `BKPT 0xAB`로 디버거(또는 에뮬레이터)에게 입출력을 맡기는 방식입니다. 디버거가 그 breakpoint를 받아 주지 않으면 어떻게 되는지 위의 `u_OK.elf`(semihosting으로 `pr()` 출력)를 semihosting 없이 돌려 봤습니다.

```bash
qemu-system-arm -M b-l475e-iot01a -nographic -monitor none -serial none -kernel u_OK.elf -d int
```

```text
Loaded reset SP 0x20018000 PC 0x8000043 from vector table
Taking exception 7 [Breakpoint] on CPU 0
```

첫 출력 시점에 breakpoint 예외가 나고 그 뒤로 진행하지 않습니다. ARMv7-M ARM B1.5.14는 halting debug와 DebugMonitor가 꺼진 상태에서 `BKPT`를 실행하면 HardFault로 올라간다고 적습니다(HFSR.DEBUGEVT). semihosting 빌드를 디버거 없이 양산 보드에 올리면 첫 출력에서 멈추는 이유입니다.

## 자주 하는 실수

> ⚠️ `\n`만 보내기

터미널 프로그램은 대개 LF(`\n`)를 받으면 줄만 내리고 커서를 왼쪽 끝으로 돌리지 않습니다. 줄 머리를 맞추려면 `\r\n`을 보내거나 터미널 쪽에서 LF를 CRLF로 바꾸는 옵션을 켭니다. 위 QEMU 실행의 출력 `48 65 6c 6c 6f 0d 0a`가 `Hello\r\n`입니다.

> ⚠️ 출력 직후 reset

```c
printf("error\n");
NVIC_SystemReset();
```

interrupt·DMA 방식이면 `printf`가 돌아온 시점에 바이트가 아직 버퍼나 시프트 레지스터에 있을 수 있습니다. reset 전에 `TC` 플래그가 설 때까지 기다립니다. 위 코드도 마지막에 `TC`를 기다립니다.

> ⚠️ `%f`가 빈칸

위 printf 절대로 newlib-nano에서는 `-u _printf_float`를 링크 옵션에 넣습니다.

## 정리

체크리스트:
1. GND 공유와 신호 레벨(DS8626 Table 11)
2. TX↔RX 교차
3. baud·8N1·흐름 제어 일치
4. 핀 alternate function(USART1_TX = PA9 AF7)
5. USART·GPIO 클럭, 그리고 `CR1`의 `UE`·`TE`(QEMU에서 `TE` 없이는 한 바이트도 안 나감)
6. BRR 오차와 클럭 오차의 합(1-02, 1-04)
7. logic analyzer로 비트 폭 8.68 µs(115200) 확인
8. GPIO 토글로 코드 실행 확인
9. polling으로 먼저 확인
10. SWO로 우회. semihosting은 디버거 없이는 BKPT에서 멈춤

다음 편은 **부팅 안 될 때**입니다.

## 관련 항목

- [UART 하드웨어 동작 분석 — Baud Rate·Framing·FIFO](/blog/embedded/modern-recipes/part1-04-uart-hardware) — 체크리스트 3·6번의 근거: STM32H743 USART의 프레임 형식별 수신 허용 오차와 BRR 반올림 오차
- [UART 드라이버 구현 — polling·interrupt·DMA 3가지 방식 비교](/blog/embedded/modern-recipes/part4-07-uart-driver) — 9번 "polling으로 우선 검증" 다음 단계
- [10-06: 부팅 안 될 때](/blog/embedded/modern-recipes/part10-06-boot-failure)
- Embedded Serial Ch 1: UART
