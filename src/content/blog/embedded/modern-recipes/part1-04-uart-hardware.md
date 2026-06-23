---
title: "UART 하드웨어 동작 분석 — Baud Rate·Framing·FIFO"
date: 2026-04-10T09:04:00
description: "Baud·framing·parity·FIFO·RS-232 레벨까지 UART 회로의 동작 원리."
series: "Modern Embedded Recipes"
seriesOrder: 4
tags: [recipes, uart, hw-basics]
draft: false
---

## 한 줄 요약

> **"UART는 비동기 직렬 통신의 가장 단순한 형태입니다."** 두 핀(TX, RX)과 합의된 baud rate만으로 동작하고, 클럭조차 공유하지 않습니다.

## 어떤 상황에서 쓰나

- MCU 디버그 콘솔
- GPS, GSM 모듈 같은 외부 모듈과의 통신
- 보드 간 저속 데이터 링크
- 부트로더의 펌웨어 업로드 인터페이스

## 핵심 개념

### 1) 비동기 프레임 구조

UART는 클럭선이 없습니다. 양쪽이 같은 baud rate에 합의하고, 각자의 클럭으로 sampling 합니다.

![UART 8N1 frame — start + 8 data + stop](/images/blog/modern-recipes/diagrams/part1-04-uart-frame-8n1.svg)

가장 흔한 프레임은 **8N1**입니다. 8 data bits, no parity, 1 stop bit. 한 frame이 10 bit를 차지합니다(start + 8 + stop).

### 2) Start bit과 oversampling

수신기는 start bit의 falling edge를 감지하면 sampling을 시작합니다. UART hardware는 보통 **16x oversampling**을 합니다.

Baud = 9600일 때, sampling clock = 9600 × 16 = 153.6 kHz입니다.

![UART 16x oversampling — start bit 가운데 3 sample로 majority vote](/images/blog/modern-recipes/diagrams/part1-04-uart-oversampling.svg)

가운데 3 sample을 보고 majority vote를 합니다. start edge가 들어오면 reset 후 8 sample 후부터 시작하므로, baud rate 오차가 약간 있어도 견딥니다.

### 3) Baud rate 정확도

송수신 양측의 baud rate 차이가 누적되면 한 frame 안에서 sampling 위치가 어긋납니다. 일반적으로 **±2.5%** 이내가 안전 기준입니다.

```c
// USART BRR 계산 (STM32 — 16x oversampling 기준)
// BRR = APB clock / baud
USART1->BRR = 84000000 / 115200;   // 729 (실제 730 = 115068, 오차 0.11%)
```

내부 RC oscillator를 쓰면 ±1 ~ 2% 오차가 누적되어 위험합니다. 크리스털을 권장합니다.

### 4) Parity와 framing error

Parity는 8 bit 데이터에 1 bit를 더해 단순 오류 검출을 합니다.

| 모드 | 의미 |
| --- | --- |
| None (N) | parity 비트 없음 |
| Even (E) | 1의 개수가 짝수가 되도록 |
| Odd (O) | 1의 개수가 홀수가 되도록 |

Framing error는 stop bit 위치에서 0이 들어오는 경우입니다. baud rate 오차가 크거나, 다른 baud로 보냈을 때 발생합니다.

### 5) FIFO

옛 UART는 1 byte buffer만 있어 매 byte마다 IRQ가 발생했습니다. 현대 MCU의 UART는 보통 4 ~ 64 byte FIFO를 갖습니다.

```c
// STM32H7 — RX FIFO 8 byte
// FIFO threshold IRQ 사용으로 byte별 IRQ 회피
USART1->CR1 |= USART_CR1_FIFOEN;
USART1->CR3 |= (0b010 << USART_CR3_RXFTCFG_Pos);   // threshold = 1/2 (4 byte)
USART1->CR3 |= USART_CR3_RXFTIE;
```

FIFO 덕분에 1 Mbaud 이상에서도 IRQ 부하가 감당 가능합니다.

## 코드 / 실제 사용 예

기본적인 polled UART 송수신입니다.

```c
void uart_putc(char c) {
    while (!(USART1->ISR & USART_ISR_TXE_TXFNF));
    USART1->TDR = c;
}

char uart_getc(void) {
    while (!(USART1->ISR & USART_ISR_RXNE_RXFNE));
    return USART1->RDR;
}

void uart_puts(const char *s) {
    while (*s) uart_putc(*s++);
}
```

DMA를 쓰면 IRQ 부하 없이 대량 전송이 가능합니다.

```c
// DMA TX
DMA1_Stream6->PAR  = (uint32_t)&USART2->TDR;
DMA1_Stream6->M0AR = (uint32_t)tx_buf;
DMA1_Stream6->NDTR = tx_len;
DMA1_Stream6->CR   = DMA_SxCR_MINC | DMA_SxCR_DIR_0
                   | DMA_SxCR_TCIE | DMA_SxCR_EN;
USART2->CR3 |= USART_CR3_DMAT;
```

## 측정 / 비교

| Baud rate | Bit time | 1 frame (8N1, 10 bit) | 1 KB 전송 시간 |
| --- | --- | --- | --- |
| 9600 | 104 µs | 1.04 ms | 1.07 s |
| 115200 | 8.68 µs | 86.8 µs | 89 ms |
| 921600 | 1.08 µs | 10.8 µs | 11 ms |
| 3000000 | 333 ns | 3.33 µs | 3.4 ms |

| 라인 길이 (TTL) | 권장 최대 baud |
| --- | --- |
| 30 cm | 3 Mbaud |
| 1 m | 921 kbaud |
| 3 m | 115 kbaud |
| 10 m+ | RS-232 또는 RS-485 변환 필요 |

## 자주 보는 함정

> ⚠️ TX/RX 교차 연결 누락

A의 TX → B의 RX, B의 TX → A의 RX로 cross 연결해야 합니다. straight 연결은 양쪽 모두 송신만 하게 됩니다.

> ⚠️ 3.3V MCU와 5V 모듈 직결

3.3V MCU의 TX가 5V 모듈의 RX를 잡지 못하거나, 반대로 5V TX가 3.3V 핀을 죽일 수 있습니다. 레벨 시프터 또는 분압 저항 필요.

> ⚠️ Baud rate mismatch

송수신 보드의 클럭 소스가 다르면 같은 baud 설정에도 오차가 다릅니다. logic analyzer로 1 frame을 측정해 실제 baud를 확인합니다.

> ⚠️ FIFO 오버런

high baud + slow ISR이면 FIFO가 차서 데이터가 손실됩니다. DMA로 옮기거나 ISR의 처리를 가볍게 합니다.

> ⚠️ Idle line 미사용

가변 길이 패킷에서는 IDLE IRQ를 활용해 패킷 종료를 감지합니다. 끝을 모르고 무한 대기하면 응답이 늦어집니다.

## 정리

- UART는 클럭선 없이 양측이 baud rate에 합의해 동작하는 가장 단순한 시리얼입니다.
- 16x oversampling과 majority vote로 ±2.5% baud 오차까지 견딥니다.
- 내부 RC는 ±1 ~ 2%로 위험합니다. 크리스털을 권장합니다.
- FIFO와 DMA를 활용하면 1 Mbaud 이상에서도 안정적인 통신이 가능합니다.
- TX/RX cross, 레벨 차이, baud mismatch가 가장 흔한 디버깅 원인입니다.

다음 편에서는 **SPI 하드웨어**를 다룹니다. 동기 직렬의 가장 빠른 형태입니다.

## 관련 항목

- [1-03: GPIO 내부 구조](/blog/embedded/modern-recipes/part1-03-gpio-internals)
- [1-05: SPI 하드웨어](/blog/embedded/modern-recipes/part1-05-spi-hardware)
- [1-11: RS-485 / RS-422 차동 신호](/blog/embedded/modern-recipes/part1-11-rs485-rs422)
- 더 깊이 — [Practical RTOS Internals: ISR latency](/blog/embedded/rtos/practical-internals/00-preface)
