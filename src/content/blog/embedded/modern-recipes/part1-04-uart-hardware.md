---
title: "UART 하드웨어 동작 분석 — Baud Rate·Framing·FIFO"
slug: "embedded/modern-recipes/part1-04-uart-hardware"
date: 2026-04-10T09:04:00
description: "STM32H7 USART를 기준으로 프레임 형식별 수신 허용 오차, 16x oversampling 샘플 위치, BRR 반올림 오차, 내부 RC 클럭으로 통신할 수 있는지, 16단 FIFO 임계값과 receiver timeout을 계산합니다."
series: "Modern Embedded Recipes"
seriesOrder: 4
tags: [recipes, uart, hw-basics]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> **"UART 수신기는 start bit의 falling edge를 기준으로 비트 가운데를 샘플링하므로, 양쪽 클럭 오차와 baud 양자화 오차의 합이 수신기 허용 오차보다 작아야 합니다."**

계산은 모두 STM32H743 USART 하나를 기준으로 합니다. C로 레지스터 비트를 읽고 쓸 줄 알고, 주변장치가 버스 클럭과 따로 커널 클럭을 받는다는 것을 아는 독자를 가정합니다.

## 이 글의 기준

- 수신기 동작·허용 오차·레지스터: [RM0433 Rev 9](https://www.st.com/resource/en/reference_manual/rm0433-stm32h742-stm32h743753-and-stm32h750-value-line-advanced-armbased-32bit-mcus-stmicroelectronics.pdf) 48장 USART
- HSI 정확도: [DS12110 Rev 11](https://www.st.com/resource/en/datasheet/stm32h743vi.pdf) (STM32H742xI/G·STM32H743xI/G 데이터시트) Table 37, p.128
- 레지스터 비트 이름: [cmsis-device-h7 v1.9.0 `stm32h743xx.h`](https://github.com/STMicroelectronics/cmsis-device-h7/blob/v1.9.0/Include/stm32h743xx.h)
- 커널 클럭: HSI 64 MHz를 USART1 커널 클럭으로 고르고(RCC `USART16SEL` = 011 `hsi_ker_ck`, RM0433 p.417) USART 프리스케일러는 분주하지 않는다고 둡니다. 아래 계산의 `usart_ker_ck_pres`는 모두 64 MHz입니다.
- 쪽수·표 번호는 2026-10-11에 위 판과 대조했습니다.

## 프레임: 형식이 허용 오차 표의 행을 정한다

![UART 8N1 frame — start + 8 data + stop](/images/blog/modern-recipes/diagrams/part1-04-uart-frame-8n1.svg)

STM32 USART는 `CR1`의 M 비트와 `PCE`로 프레임 형식을 정합니다(Table 408, p.2042). parity 비트는 데이터 비트 자리 하나를 차지하므로, 8비트 데이터에 parity를 붙이면 M을 01로 올려야 합니다.

| 형식 | M[1:0] | `PCE` | 문자 길이 (start·stop 1비트 포함) |
| --- | :---: | :---: | ---: |
| 8N1 | 00 | 0 | 10비트 |
| 8E1·8O1 | 01 | 1 | 11비트 |

M = 01에 `PCE` = 0이면 9비트 데이터, M = 10이면 7비트 데이터입니다. stop bit 수는 `CR2`의 `STOP`으로 고릅니다(10 = 2 stop bit, p.2076). 2 stop bit에서도 수신기는 첫 stop bit만 8·9·10번째 샘플로 검사하고, 두 번째 stop bit에는 framing 검사를 하지 않습니다(p.2034). 허용 오차 표를 고르는 조건에도 stop bit 수는 들어 있지 않습니다(p.2036).

수신기가 예상한 시점에 stop bit를 인식하지 못하면 framing error(`FE`)를 세웁니다. RM0433은 원인으로 동기 이탈과 과도한 노이즈를 듭니다(48.5.6, p.2033).

## 수신기는 어디서 샘플링하나

![UART 16x oversampling — start bit 확인, 3·5·7번째와 8·9·10번째 샘플 묶음](/images/blog/modern-recipes/diagrams/part1-04-uart-oversampling.svg)

oversampling 16(`OVER8` = 0)이면 비트 하나를 16개 샘플로 나눕니다. falling edge 뒤 수신기는 3·5·7번째와 8·9·10번째 샘플을 묶음별로 확인하고, 두 묶음 모두 셋 중 둘 이상이 0이어야 start bit로 받아들입니다. 어느 묶음이든 셋 중 둘만 0이었으면 받아들이되 noise 플래그(`NE`)를 세우고, 조건을 못 채우면 플래그 없이 idle로 돌아갑니다(48.5.6, p.2027~2028).

데이터 비트는 `CR3`의 `ONEBIT`로 방법을 고릅니다(p.2032). `ONEBIT` = 0이면 비트 가운데 세 샘플의 다수결이고, 세 값이 다르면 `NE`를 세웁니다. `ONEBIT` = 1이면 가운데 샘플 하나만 봅니다. 수신기는 송신 측 클럭을 받지 않으므로, 이 샘플 시점이 송신 측 비트 가운데에서 얼마나 벗어나도 되는지가 다음 절의 허용 오차입니다.

## 허용 오차: 3.33% 안에 무엇이 들어가나

RM0433 48.5.8(p.2035~2036)은 송신기 오차 DTRA(송신 측 발진기 포함), 수신기 baud 양자화 오차 DQUANT, 수신 측 발진기 편차 DREC, 전송선 오차 DTCL(트랜시버의 상승·하강 지연 비대칭 등)의 합이 허용 오차보다 작아야 한다고 정합니다. 저전력 모드에서 깨어나며 받을 때는 DWU가 더해집니다.

허용 오차는 문자 길이(M), `OVER8`, BRR 하위 4비트, `ONEBIT`로 정해집니다. `OVER8` = 0일 때 값은 다음과 같습니다(Table 406 p.2036, Table 407 p.2037).

| 형식 (M) | BRR[3:0] | `ONEBIT` = 0 | `ONEBIT` = 1 |
| --- | --- | ---: | ---: |
| 8N1 (00) | = 0000 (Table 406) | 3.75% | 4.375% |
| 8N1 (00) | ≠ 0000 (Table 407) | 3.33% | 3.88% |
| 8E1·8O1 (01) | = 0000 (Table 406) | 3.41% | 3.97% |
| 8E1·8O1 (01) | ≠ 0000 (Table 407) | 3.03% | 3.53% |

같은 조건에서 11비트 문자(M = 01)의 허용 오차가 10비트 문자(M = 00)보다 작습니다. `OVER8` = 1(8x oversampling)이면 값이 더 줄어 8N1, `ONEBIT` = 0에서 2.50%(BRR[3:0] = 0000)와 2%(≠ 0000)입니다. 아래 예는 모두 `ONEBIT` = 0이고 BRR 하위 4비트가 0이 아니므로 기준은 8N1 3.33%, 8E1 3.03%입니다.

## BRR: 버림이 아니라 반올림

`OVER8` = 0이면 baud = `usart_ker_ck_pres` / USARTDIV이고(48.5.7, p.2034) BRR에는 USARTDIV를 그대로 씁니다. USARTDIV는 16 이상이어야 합니다(p.2035). 정수 나눗셈은 나머지를 버리므로 BRR이 작아지고, 실제 baud는 항상 목표보다 높은 쪽으로 어긋납니다.

```c
/* usart_ker_ck_pres = 64 MHz, OVER8 = 0, target 115200 baud */
USART1->BRR = 64000000U / 115200U;                  /* 555 = 0x22B -> 115315 baud, +0.10% */
USART1->BRR = (64000000U + 115200U / 2) / 115200U;  /* 556 = 0x22C -> 115108 baud, -0.08% */
```

ST HAL도 [`UART_DIV_SAMPLING16`](https://github.com/STMicroelectronics/stm32h7xx-hal-driver/blob/v1.9.0/Inc/stm32h7xx_hal_uart.h#L1198)에서 `baud / 2`를 더해 반올림합니다(stm32h7xx-hal-driver v1.9.0). 64 MHz에서 자주 쓰는 baud를 반올림한 BRR과 그 DQUANT, 그리고 8N1로 쉬지 않고 보낼 때의 전송 시간은 다음과 같습니다.

| Baud | 비트 시간 | 1 KiB 전송 | BRR | DQUANT |
| --- | ---: | ---: | ---: | ---: |
| 9600 | 104.2 µs | 1.07 s | 6667 (0x1A0B) | −0.005% |
| 115200 | 8.68 µs | 88.9 ms | 556 (0x22C) | −0.08% |
| 921600 | 1.085 µs | 11.1 ms | 69 (0x45) | +0.64% |
| 3000000 | 0.333 µs | 3.41 ms | 21 (0x15) | +1.59% |

1 KiB 전송 시간은 1024바이트 × 10비트 / baud입니다. 3 Mbaud에서는 BRR이 21로 작아져 DQUANT가 +1.59%입니다. 상대편이 정확히 3 Mbaud로 보낸다면 클럭 오차가 없어도 8N1 허용 오차 3.33% 중 1.59%를 양자화가 먼저 쓰고, 남는 여유는 1.74%p입니다. 양쪽이 같은 주파수의 클럭과 같은 BRR을 쓰면 양자화 오차는 양쪽이 같아 상쇄됩니다. `OVER8` = 0에서 64 MHz로 낼 수 있는 최대 baud는 64 MHz / 16 = 4 Mbaud입니다.

## 내부 RC(HSI)로 통신해도 되나

DS12110 Rev 11 Table 37(p.128)의 HSI 특성입니다.

| 항목 | 조건 | Min | Max |
| --- | --- | ---: | ---: |
| f_HSI | V_DD = 3.3 V, T_J = 30 °C (생산 시험) | 63.7 MHz | 64.3 MHz |
| 온도 드리프트 (기준 64 MHz) | T_J = −20 ~ 105 °C (특성 평가) | −1% | +1% |
| 온도 드리프트 (기준 64 MHz) | T_J = −40 °C ~ T_J max (특성 평가) | −2% | +1% |
| 전압 드리프트 (기준 3.3 V) | V_DD = 1.62 ~ 3.6 V | −0.12% | +0.03% |

30 °C 편차는 ±0.3 MHz / 64 MHz = ±0.47%입니다. 표는 온도 드리프트의 기준을 64 MHz라고만 적고, 그 값에 30 °C 편차가 이미 들어 있는지는 적지 않습니다. 그래서 세 항목을 같은 방향으로 더한 보수적인 합을 기준으로 씁니다. T_J = −40 °C ~ T_J max에서 HSI 편차는 −2.59% ~ +1.50%, T_J = −20 ~ 105 °C에서는 −1.59% ~ +1.50%입니다.

115200 baud(BRR 556, DQUANT −0.08%), `ONEBIT` = 0, DTCL 제외로 판정하면 다음과 같습니다. 한쪽만 HSI인 경우는 상대편 클럭 오차를 0으로 둡니다. 양쪽 모두 HSI이고 같은 BRR을 쓰면 양자화 오차가 상쇄되므로, 합은 한쪽 +최대 편차와 다른 쪽 −최대 편차의 차이입니다.

| 구성 | T_J | 최악 편차 | 8N1 (3.33%) | 8E1·8O1 (3.03%) |
| --- | --- | ---: | --- | --- |
| 한쪽만 HSI | −40 °C ~ T_J max | 2.67% | 통과, 여유 0.66%p | 통과, 여유 0.36%p |
| 양쪽 HSI | −40 °C ~ T_J max | 4.09% | 실패 | 실패 |
| 양쪽 HSI | −20 ~ 105 °C | 3.09% | 통과, 여유 0.24%p | 실패 |

30 °C 편차가 온도 드리프트에 이미 들어 있다고 보면 전 온도 범위 양쪽 HSI의 차이는 3.15%가 되어, 8N1에서 여유 0.18%p로 통과하고 8E1·8O1에서는 여전히 실패합니다. 트랜시버나 긴 배선이 끼면 DTCL이 위 여유에서 더 빠집니다.

## FIFO: 16단, 임계값, receiver timeout

STM32H7 USART의 TX·RX FIFO는 각각 16단입니다(RM0433 48.4 Table 402, p.2018, HAL의 [`RX_FIFO_DEPTH 16U`](https://github.com/STMicroelectronics/stm32h7xx-hal-driver/blob/v1.9.0/Src/stm32h7xx_hal_uart_ex.c#L63)). `CR3`의 `RXFTCFG`로 RXFIFO가 깊이의 1/8·1/4·1/2·3/4·7/8에 이르거나 가득 찰 때 `RXFT` 인터럽트를 낼 수 있습니다(p.2078). `FIFOEN`은 `UE` = 0일 때만 쓸 수 있습니다(p.2071).

임계값에 못 미치는 버스트 꼬리는 `RXFT`를 세우지 못하고 FIFO에 남습니다. 이 꼬리는 receiver timeout으로 읽습니다. `CR2`의 `RTOEN`을 켜면 마지막 문자 뒤 RX 선이 `RTOR`에 적은 비트 수만큼 조용할 때 `RTOF`가 서고, `CR1`의 `RTOIE`가 켜져 있으면 인터럽트가 납니다(48.5.16 p.2049, `RTOR` p.2084). RM0433의 Modbus 예는 이 시간을 2문자로 잡습니다(p.2041). 8N1이면 20비트입니다.

```c
USART1->CR1 &= ~USART_CR1_UE;          /* FIFOEN is writable only while UE = 0 */
USART1->CR1 |= USART_CR1_FIFOEN;
USART1->CR3 = (USART1->CR3 & ~USART_CR3_RXFTCFG)
            | (0x2U << USART_CR3_RXFTCFG_Pos);   /* 010: 1/2 of depth = 8 entries */
USART1->CR3 |= USART_CR3_RXFTIE;
USART1->RTOR = 20U;                     /* 2 characters of 8N1 = 20 bit times */
USART1->CR2 |= USART_CR2_RTOEN;
USART1->CR1 |= USART_CR1_RTOIE;
USART1->CR1 |= USART_CR1_UE;
```

921600 baud에서 문자 하나는 10.85 µs마다 들어옵니다. FIFO 없이 문자마다 인터럽트를 받으면 그 간격이 10.85 µs이고, 임계값을 1/2(8개)로 두면 연속 수신 중에는 인터럽트 한 번에 8개를 읽으므로 간격이 86.8 µs로 늘어납니다. 버스트가 끝나면 마지막 stop bit 뒤 20비트 시간, 즉 21.7 µs 뒤에 `RTOF` 인터럽트에서 남은 문자를 읽습니다. FIFO 모드에서도 RXFIFO가 가득 찬 상태로 시프트 레지스터의 다음 문자가 옮겨 갈 차례가 되면 overrun(`ORE`)이 납니다(p.2030). 인터럽트·DMA 수신 드라이버 구조는 [4-07: UART 드라이버 구현](/blog/embedded/modern-recipes/part4-07-uart-driver)에서 다룹니다(STM32F4 USART 기준).

## 정리

- 허용 오차는 프레임 형식으로 행을 고릅니다. parity를 붙인 8E1·8O1은 M = 01이라 8N1보다 작습니다.
- BRR은 반올림해서 구합니다. 그래도 상대편이 정확한 baud로 보내면 양자화 오차가 남고, baud가 높을수록 커집니다(3 Mbaud에서 +1.59%).
- HSI를 쓸지는 내부 RC(HSI)로 통신해도 되나 절의 판정 표에서 온도 범위와 프레임 형식으로 고릅니다.
- FIFO 임계값으로 인터럽트를 줄이면, 임계값에 못 미치는 버스트 꼬리는 receiver timeout으로 읽습니다.

## 수정 이력

- 2026-10-11: STM32H743 USART 기준으로 다시 썼습니다. 이전 판의 "±2.5%는 경험적 기준"을 RM0433 Table 406·407의 형식별 허용 오차로, STM32F4 84 MHz BRR 예(729/730)를 64 MHz HSI 반올림 예로 바꿨습니다. 내부 RC를 "±1~2%로 위험"이라고만 했던 것을 DS12110 Table 37로 셈한 판정으로 바꿨고, 출처가 없던 배선 길이별 권장 baud 표를 지웠습니다.

다음 편은 **[SPI 하드웨어 분석 — Clock Mode·MOSI/MISO·Chip Select](/blog/embedded/modern-recipes/part1-05-spi-hardware)**입니다.

## 관련 항목

- [1-03: GPIO 내부 구조 분해](/blog/embedded/modern-recipes/part1-03-gpio-internals)
- [1-05: SPI 하드웨어 분석](/blog/embedded/modern-recipes/part1-05-spi-hardware)
- [1-11: RS-485·RS-422 차동 신호 분석](/blog/embedded/modern-recipes/part1-11-rs485-rs422)
- [4-07: UART 드라이버 구현](/blog/embedded/modern-recipes/part4-07-uart-driver) — polling·인터럽트·DMA 세 방식 비교(STM32F4 USART 기준)
- [10-05: UART 안 찍힐 때](/blog/embedded/modern-recipes/part10-05-uart-not-printing) — 배선 교차·레벨·클럭 enable 점검 순서
