---
title: "UART 드라이버 구현 — polling·interrupt·DMA 3가지 방식 비교"
date: 2026-04-13T09:41:00
description: "3가지 모드의 trade-off — CPU 사용량·latency·throughput."
series: "Modern Embedded Recipes"
seriesOrder: 41
tags: [recipes, bare-metal, uart]
draft: false
---

## 한 줄 요약

> **"Polling은 단순, interrupt는 균형, DMA는 throughput."** UART 드라이버 세 변종은 각각 다른 trade-off를 다룹니다.

## 어떤 상황에서 쓰나

UART는 임베디드의 lingua franca입니다. printf 디버깅, sensor 통신, GPS 수신, BLE module 제어, console — 거의 모든 보드에 한 두 채널은 살아 있습니다. 같은 peripheral이라도 *언제 어떻게 사용하느냐*에 따라 polling, interrupt, DMA 세 방식을 선택합니다.

이 글은 STM32 USART를 기준으로 세 방식의 드라이버 코드를 모두 작성하고, 각각의 성능과 CPU 부담을 비교합니다.

## 핵심 개념

### USART register (STM32F4)

| Register | 역할 |
|----------|------|
| `CR1` | enable (UE), word length (M), TE/RE, RXNEIE, TXEIE, TCIE |
| `CR2` | stop bits, clock polarity |
| `CR3` | flow control (CTS/RTS), DMA enable |
| `BRR` | baud rate divider |
| `SR` | RXNE, TXE, TC, ORE, FE, PE flags |
| `DR` | data register (read=RX, write=TX) |

STM32F7/H7/G0/G4 등 신규는 register 이름이 약간 다릅니다 (`ISR`, `RDR`, `TDR`, `ICR`).

### Baud rate 계산

```text
USARTDIV = f_pclk / (8 × (2 - OVER8) × baud)

OVER8 = 0 (16x oversample, default) → USARTDIV = f_pclk / (16 × baud)

예) PCLK1 = 42 MHz, baud = 115200
    USARTDIV = 42000000 / (16 × 115200) ≈ 22.7864
    
    Mantissa = 22 = 0x16
    Fraction = round(0.7864 × 16) = 13 = 0xD
    BRR = (0x16 << 4) | 0xD = 0x16D
```

대부분의 STM32 HAL은 자동 계산해 줍니다. 직접 작성 시 *반올림 오차*가 ±2% 안에 들어와야 합니다.

### 세 방식의 trade-off

| 방식 | CPU 사용량 | latency | throughput | 복잡도 |
|------|-----------|---------|-----------|--------|
| **Polling** | 매우 높음 (waste) | 매우 빠름 | 낮음 | 단순 |
| **Interrupt** | 중간 (ISR overhead) | 빠름 | 중간 | 보통 |
| **DMA** | 가장 낮음 | 약간 느림 (DMA setup) | 가장 높음 | 복잡 |

DMA는 *연속 바이트 처리량*에서 압도적이지만, setup overhead 때문에 *짧은 전송*에는 오히려 손해입니다.

## 코드 예제

### 1. Polling UART

```c
void uart_init_polling(uint32_t baud, uint32_t pclk) {
    RCC->APB2ENR |= RCC_APB2ENR_USART1EN;
    RCC->AHB1ENR |= RCC_AHB1ENR_GPIOAEN;

    // PA9 TX, PA10 RX (AF7)
    gpio_init(GPIOA, 9,  &(gpio_config_t){.mode=GPIO_MODE_AF, .speed=GPIO_SPEED_HIGH, .af=7});
    gpio_init(GPIOA, 10, &(gpio_config_t){.mode=GPIO_MODE_AF, .pull=GPIO_PULL_UP,     .af=7});

    USART1->BRR = (pclk + baud / 2) / baud;   // round
    USART1->CR1 = USART_CR1_UE | USART_CR1_TE | USART_CR1_RE;
}

void uart_putc(char c) {
    while (!(USART1->SR & USART_SR_TXE));   // wait TX buffer empty
    USART1->DR = c;
}

int uart_getc(void) {
    while (!(USART1->SR & USART_SR_RXNE));  // block until RX
    return USART1->DR;
}

void uart_puts(const char *s) {
    while (*s) uart_putc(*s++);
}
```

단순합니다. 단점은 *TX/RX 동안 CPU를 묶는다*는 점. printf 한 줄로 수 ms를 날립니다.

### 2. Interrupt + ring buffer

```c
#define RX_BUF_SIZE 256
#define TX_BUF_SIZE 256

static volatile uint8_t rx_buf[RX_BUF_SIZE];
static volatile uint16_t rx_head, rx_tail;
static volatile uint8_t tx_buf[TX_BUF_SIZE];
static volatile uint16_t tx_head, tx_tail;

void uart_init_int(uint32_t baud, uint32_t pclk) {
    // ... GPIO + clock 동일
    USART1->BRR = (pclk + baud / 2) / baud;
    USART1->CR1 = USART_CR1_UE | USART_CR1_TE | USART_CR1_RE
                | USART_CR1_RXNEIE;
    NVIC_SetPriority(USART1_IRQn, 8);
    NVIC_EnableIRQ(USART1_IRQn);
}

void USART1_IRQHandler(void) {
    uint32_t sr = USART1->SR;

    // RX
    if (sr & USART_SR_RXNE) {
        uint8_t c = USART1->DR;
        uint16_t next = (rx_head + 1) % RX_BUF_SIZE;
        if (next != rx_tail) {
            rx_buf[rx_head] = c;
            rx_head = next;
        }   // else overflow — drop
    }

    // TX
    if ((sr & USART_SR_TXE) && (USART1->CR1 & USART_CR1_TXEIE)) {
        if (tx_tail != tx_head) {
            USART1->DR = tx_buf[tx_tail];
            tx_tail = (tx_tail + 1) % TX_BUF_SIZE;
        } else {
            USART1->CR1 &= ~USART_CR1_TXEIE;   // empty — disable
        }
    }
}

int uart_putc_nb(char c) {
    uint16_t next = (tx_head + 1) % TX_BUF_SIZE;
    if (next == tx_tail) return -1;   // full
    tx_buf[tx_head] = c;
    tx_head = next;
    USART1->CR1 |= USART_CR1_TXEIE;
    return 0;
}

int uart_getc_nb(void) {
    if (rx_head == rx_tail) return -1;
    uint8_t c = rx_buf[rx_tail];
    rx_tail = (rx_tail + 1) % RX_BUF_SIZE;
    return c;
}
```

이제 main loop은 다른 일을 하면서도 UART RX를 놓치지 않습니다.

### 3. DMA UART

```c
static uint8_t dma_rx_buf[256];
static uint8_t dma_tx_buf[256];

void uart_init_dma(uint32_t baud, uint32_t pclk) {
    // GPIO + USART1 enable 동일
    USART1->BRR = (pclk + baud / 2) / baud;
    USART1->CR1 = USART_CR1_UE | USART_CR1_TE | USART_CR1_RE;
    USART1->CR3 = USART_CR3_DMAT | USART_CR3_DMAR;

    RCC->AHB1ENR |= RCC_AHB1ENR_DMA2EN;

    // RX DMA — Stream 2, Channel 4, USART1_RX, circular
    DMA2_Stream2->CR = 0;
    while (DMA2_Stream2->CR & DMA_SxCR_EN);
    DMA2_Stream2->PAR  = (uint32_t)&USART1->DR;
    DMA2_Stream2->M0AR = (uint32_t)dma_rx_buf;
    DMA2_Stream2->NDTR = sizeof(dma_rx_buf);
    DMA2_Stream2->CR   = (4u << 25)             // channel 4
                       | DMA_SxCR_CIRC          // circular
                       | DMA_SxCR_MINC          // memory inc
                       | DMA_SxCR_EN;

    // TX DMA — Stream 7, Channel 4, USART1_TX, normal
    DMA2_Stream7->CR = 0;
    while (DMA2_Stream7->CR & DMA_SxCR_EN);
    DMA2_Stream7->PAR  = (uint32_t)&USART1->DR;
    DMA2_Stream7->CR   = (4u << 25)
                       | DMA_SxCR_DIR_0          // mem → peripheral
                       | DMA_SxCR_MINC
                       | DMA_SxCR_TCIE;
    NVIC_EnableIRQ(DMA2_Stream7_IRQn);
}

void uart_send_dma(const uint8_t *buf, uint16_t len) {
    while (DMA2_Stream7->CR & DMA_SxCR_EN);   // wait previous
    DMA2_Stream7->NDTR = len;
    DMA2_Stream7->M0AR = (uint32_t)buf;
    DMA2->HIFCR = 0x3F << 22;                 // clear flags
    DMA2_Stream7->CR |= DMA_SxCR_EN;
}
```

RX는 *circular mode*로 두면 DMA가 알아서 ring buffer처럼 돌립니다. main은 `NDTR`을 폴링해 *얼마나 들어왔는지* 파악합니다.

## 측정 / 동작 확인

오실로스코프 + 로직 애널라이저로 TX 핀을 보면 *byte 사이 gap*이 명확합니다.

```text
Polling 모드, 115200 baud (8N1, 87 µs per byte):
TX: byte | gap 0~5 µs | byte | gap 0~5 µs | ...   ← back-to-back

Interrupt 모드:
TX: byte | gap 3~10 µs (ISR overhead) | byte | ...

DMA 모드:
TX: byte | gap < 1 µs | byte | ...   ← 거의 perfect back-to-back
```

throughput 측정은 1KB 전송 시간을 비교합니다.

| Mode | 1 KB @ 115200 | CPU 점유율 |
|------|---------------|-----------|
| Polling | 89.0 ms | 100% |
| Interrupt | 89.5 ms | ~5% |
| DMA | 89.0 ms | < 1% |

baud rate가 한계를 정하므로 시간은 비슷하지만, *CPU가 자유롭다*는 점에서 DMA가 압도적입니다.

## 자주 보는 함정

> ⚠️ Baud rate 오차 > 2%

수신 측이 동일 clock으로 sample 하려면 ±2% 안에 들어와야 합니다. HSI 16 MHz로 ±1% 보장이 어렵습니다. 정확한 baud가 필요하면 HSE crystal을 씁니다.

> ⚠️ ORE (overrun) flag 무시

수신이 너무 빠르면 ORE가 set되고 *그 이후 RXNE가 안 들어옵니다*. ISR에서 ORE를 명시적으로 clear해야 합니다 (F4는 SR read → DR read 순서).

> ⚠️ Ring buffer head/tail이 atomic하지 않음

ARM은 32-bit access가 atomic이라 *16-bit head/tail은 안전*합니다. 그러나 *64-bit 또는 struct*는 critical section이 필요합니다.

> ⚠️ TXE와 TC 혼동

`TXE` = TX buffer empty (다음 데이터 넣어도 됨). `TC` = transmission complete (마지막 bit까지 나간 뒤). half-duplex나 RS-485 enable line 제어에는 *TC*를 봐야 합니다.

> ⚠️ DMA TX 끝나기 전에 다시 enable

`while (DMA->CR & EN)` 폴링을 빼먹으면 DMA가 *중간에 끊깁니다*. flush 또는 TC interrupt로 동기화합니다.

> ⚠️ Flow control이 없는 상태에서 high-speed

921600+ baud에 hardware CTS/RTS 없으면 *RX overflow가 빈번*. CR3의 CTSE/RTSE를 enable합니다.

## 정리

- **Polling**은 단순하고 latency가 낮지만 CPU를 묶습니다. 부트로더·디버그에 적합.
- **Interrupt + ring buffer**는 일반 용도 표준. RX overflow 처리 필수.
- **DMA**는 throughput 최고, CPU 부담 최소. circular RX + linear TX가 표준 패턴.
- **Flag clear 순서**(SR read → DR read)는 STM32 F1/F4 패밀리의 함정입니다.
- baud rate 정확도가 ±2% 안에 들어오는지 항상 검증합니다.

다음 편은 **SPI 드라이버**입니다. CPOL/CPHA, multi-slave CS, full-duplex DMA를 다룹니다.

## 관련 항목

- [1-04: UART 하드웨어 동작](/blog/embedded/modern-recipes/part1-04-uart-hardware)
- [4-08: SPI 드라이버](/blog/embedded/modern-recipes/part4-08-spi-driver)
- [4-10: DMA 기초](/blog/embedded/modern-recipes/part4-10-dma-basics)
- [10-05: UART이 안 찍힐 때](/blog/embedded/modern-recipes/part10-05-uart-not-printing)
