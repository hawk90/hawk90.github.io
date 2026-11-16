---
title: "UART 드라이버 구현 — polling·interrupt·DMA 3가지 방식 비교"
slug: "embedded/modern-recipes/part4-07-uart-driver"
date: 2026-04-13T09:41:00
description: "3가지 모드의 trade-off — CPU 사용량·latency·throughput."
series: "Modern Embedded Recipes"
seriesOrder: 41
tags: [recipes, bare-metal, uart]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> **"Polling은 단순하고, interrupt는 균형이 좋고, DMA는 throughput이 높습니다."** UART 드라이버 세 변종은 각각 다른 trade-off를 다룹니다.

## 어떤 상황에서 쓰나

UART는 printf 디버깅, sensor 통신, GPS 수신, BLE module 제어, console에 두루 쓰입니다. 같은 peripheral이라도 어떻게 쓰느냐에 따라 polling, interrupt, DMA 세 방식 중 하나를 고릅니다.

이 글은 STM32F407의 USART1을 기준으로 세 방식의 드라이버를 작성합니다. polling과 interrupt 판은 QEMU 11.1.3 `netduinoplus2`의 USART1 모델에서 실제로 돌리고, DMA 판은 QEMU가 STM32 DMA를 모델링하지 않아 빌드까지만 확인합니다.

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

이 이름과 bit는 `stm32f407xx.h`의 `USART_TypeDef`와 `USART_SR_*`·`USART_CR1_*` 정의를 따릅니다(예: `USART_SR_ORE_Pos` 3, `USART_SR_TC_Pos` 6, `USART_CR3_DMAT_Pos` 7). [4-03](/blog/embedded/modern-recipes/part4-03-gpio-driver)에서 쓴 STM32L475의 `stm32l475xx.h`는 USART를 `ISR`·`ICR`·`RDR`·`TDR`로 나눠 정의하므로, 이 코드는 다른 family에 그대로 쓰지 못합니다.

### Baud rate 계산

USART1은 APB2에 있으므로(`RCC_APB2ENR_USART1EN`) [4-04](/blog/embedded/modern-recipes/part4-04-clock-setup) 설정의 PCLK2 = 84 MHz를 씁니다. 16× oversampling(OVER8 = 0)에서 BRR의 상위 12 bit는 USARTDIV의 정수부(mantissa), 하위 4 bit는 소수부 × 16이므로 BRR 값은 결국 `f_pclk / baud`를 반올림한 정수가 됩니다.

```text
USARTDIV = f_pclk / (16 × baud)

PCLK2 = 84 MHz, baud = 115200
    USARTDIV = 84000000 / (16 × 115200) ≈ 45.573
    Mantissa = 45 = 0x2D
    Fraction = round(0.573 × 16) = 9
    BRR = (0x2D << 4) | 9 = 0x2D9 = 729 = round(84000000 / 115200)
```

아래 코드의 `(pclk + baud / 2) / baud`가 이 반올림입니다. QEMU에서 실행하면 `USART1->BRR`에 729가 들어갑니다. HAL v1.8.3의 `UART_BRR_SAMPLING16()` 매크로로 같은 값을 계산하면 84 MHz에서는 729로 같고, 42 MHz(USART2처럼 APB1)에서는 HAL이 364(`0x16C`), 위 식이 365(`0x16D`)로 1 다릅니다. HAL은 `PCLK × 25 / (4 × baud)`를 먼저 정수로 자른 뒤 소수부를 반올림하기 때문입니다. 실제 baud 오차가 허용 범위 안인지는 상대편 수신기와 clock 정확도에 달린 문제라 이 글에서 수치로 다루지 않습니다.

### 세 방식의 trade-off

| 방식 | CPU가 하는 일 | 구조 |
|------|-----------|-----------|
| **Polling** | byte마다 `TXE`/`RXNE`를 기다림 | 가장 단순. 기다리는 동안 다른 일을 못 함 |
| **Interrupt** | byte마다 ISR 한 번 | ring buffer와 ISR이 필요 |
| **DMA** | 전송 시작·완료 처리만 | stream·channel 설정과 buffer 소유권 관리가 필요 |

어느 방식이든 선로 위의 시간은 같습니다. 8N1 frame은 start 1 + data 8 + stop 1 = 10 bit이므로 115200 baud에서 1 byte는 86.8 µs, 1 KB는 1024 × 10 / 115200 = 88.9 ms입니다. 방식이 바꾸는 것은 그 88.9 ms 동안 CPU가 무엇을 하느냐입니다.

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

단순한 대신 TX/RX 동안 CPU를 묶습니다. 115200 baud에서 40자 한 줄을 보내면 위 계산대로 40 × 86.8 µs ≈ 3.5 ms 동안 `uart_putc()` 안에서 기다립니다.

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

void uart_init_dma(uint32_t baud, uint32_t pclk) {
    // GPIO + USART1 enable 동일
    USART1->BRR = (pclk + baud / 2) / baud;
    USART1->CR1 = USART_CR1_UE | USART_CR1_TE | USART_CR1_RE;
    USART1->CR3 = USART_CR3_DMAT | USART_CR3_DMAR;

    RCC->AHB1ENR |= RCC_AHB1ENR_DMA2EN;

    // RX DMA — USART1_RX = DMA2 Stream5 Channel4 (ST STM32F429I-Discovery 예제)
    DMA2_Stream5->CR = 0;
    while (DMA2_Stream5->CR & DMA_SxCR_EN);
    DMA2_Stream5->PAR  = (uint32_t)&USART1->DR;
    DMA2_Stream5->M0AR = (uint32_t)dma_rx_buf;
    DMA2_Stream5->NDTR = sizeof(dma_rx_buf);
    DMA2_Stream5->CR   = (4u << 25)             // channel 4
                       | DMA_SxCR_CIRC          // circular
                       | DMA_SxCR_MINC          // memory inc
                       | DMA_SxCR_EN;

    // TX DMA — USART1_TX = DMA2 Stream7 Channel4 (같은 예제)
    DMA2_Stream7->CR = 0;
    while (DMA2_Stream7->CR & DMA_SxCR_EN);
    DMA2_Stream7->PAR  = (uint32_t)&USART1->DR;
    DMA2_Stream7->CR   = (4u << 25)
                       | DMA_SxCR_DIR_0          // mem → peripheral
                       | DMA_SxCR_MINC
                       | DMA_SxCR_TCIE;
    NVIC_EnableIRQ(DMA2_Stream7_IRQn);
}

static volatile int tx_busy;

void DMA2_Stream7_IRQHandler(void) {
    if (DMA2->HISR & DMA_HISR_TCIF7) {
        DMA2->HIFCR = DMA_HIFCR_CTCIF7;
        tx_busy = 0;                          // previous transfer finished
    }
}

void uart_send_dma(const uint8_t *buf, uint16_t len) {
    while (tx_busy);                          // wait previous
    tx_busy = 1;
    DMA2_Stream7->NDTR = len;
    DMA2_Stream7->M0AR = (uint32_t)buf;
    DMA2->HIFCR = DMA_HIFCR_CTCIF7 | DMA_HIFCR_CHTIF7 | DMA_HIFCR_CTEIF7
                | DMA_HIFCR_CDMEIF7 | DMA_HIFCR_CFEIF7;   // clear stream 7 flags
    DMA2_Stream7->CR |= DMA_SxCR_EN;
}
```

stream·channel 번호는 ST의 STM32CubeF4 `Projects/STM32F429I-Discovery/Examples/UART/UART_TwoBoards_ComDMA/Inc/main.h`가 USART1에 쓰는 `USARTx_RX_DMA_STREAM DMA2_Stream5`, `USARTx_TX_DMA_STREAM DMA2_Stream7`, 둘 다 `DMA_CHANNEL_4`를 따랐습니다. F429는 F407과 같은 reference manual(RM0090) 계열이지만, 이 글은 RM0090의 DMA request 표를 열어 보지 못했으므로 F407 보드에서는 그 표로 한 번 더 맞춰 봅니다. `CHSEL`은 bit 27:25(`DMA_SxCR_CHSEL_Pos` 25)라 `4u << 25`가 channel 4이고, stream 7의 flag는 `HIFCR`의 bit 22·24~27입니다.

F407의 RM0090 Rev 22(st.com이 응답하지 않아 [stm32.dirba.io](https://stm32.dirba.io/rm0090-stm32f405-415-407-417-427-437-429-439/)의 본문 판으로 확인) Table 44(DMA2 request mapping)에서도 channel 4의 stream 5가 USART1_RX, stream 7이 USART1_TX입니다.

RX는 circular mode(`DMA_SxCR_CIRC`)로 두면 DMA가 buffer 끝에서 처음으로 돌아가며 계속 씁니다. main은 `NDTR`(남은 개수)을 읽어 `sizeof(dma_rx_buf) - NDTR`로 쓰기 위치를 알아냅니다.

## 측정 / 동작 확인

QEMU 11.1.3의 `netduinoplus2`는 USART1을 `hw/char/stm32f2xx_usart.c`로 모델링하고, `-serial stdio`로 host 터미널에 붙습니다. 아래 harness는 위 polling·interrupt 코드 블록을 `poll.inc`·`int.inc`로 그대로 include하고, `gpio.c`·`gpio.h`는 [4-03](/blog/embedded/modern-recipes/part4-03-gpio-driver)의 드라이버입니다.

```c
/* uart_test.c */
/* the post's polling and interrupt drivers on QEMU netduinoplus2 USART1 (stdio) */
#include "gpio.h"
void __libc_init_array(void) { }
#if defined(POLL)
#include "poll.inc"
#else
#include "poll.inc"   /* for uart_puts() used in messages */
#include "int.inc"
#endif

static void put_dec(uint32_t v) { char b[11]; int i = 10; b[i] = 0; do { b[--i] = '0' + v % 10; v /= 10; } while (v); uart_puts(&b[i]); }

int main(void) {
    const uint32_t pclk2 = 84000000u, baud = 115200u;
    uart_init_polling(baud, pclk2);
    uart_puts("BRR = (pclk + baud/2)/baud = "); put_dec(USART1->BRR); uart_puts("\n");
#if defined(POLL)
    uart_puts("polling: type 5 chars> ");
    for (int i = 0; i < 5; i++) uart_putc((char)(uart_getc() - 'a' + 'A'));
    uart_puts("\n");
#else
    uart_init_int(baud, pclk2);
    int dropped = 0;
    for (int i = 0; i < 300; i++) if (uart_putc_nb((char)('0' + i % 10)) < 0) dropped++;
    while (tx_tail != tx_head) { }
    uart_puts("\ninterrupt: queued 300, rejected (buffer full) = "); put_dec(dropped); uart_puts("\n");
    uart_puts("interrupt: echo 5 chars> ");
    for (int got = 0; got < 5; ) { int c = uart_getc_nb(); if (c >= 0) { uart_putc_nb((char)(c - 'a' + 'A')); got++; } }
    while (tx_tail != tx_head) { }
    uart_puts("\n");
#endif
    for (;;) { }
}
```

```bash
T=cmsis-device-f4/Source/Templates
for V in POLL INT; do      # stm32f411.ld is the linker script from 4-01
  arm-none-eabi-gcc -mcpu=cortex-m4 -mthumb -mfloat-abi=soft -ffreestanding -nostdlib -O2 -Wall \
      -DSTM32F407xx -D$V -I. -ICMSIS_6/CMSIS/Core/Include -Icmsis-device-f4/Include \
      -T stm32f411.ld -o uart_$V.elf $T/gcc/startup_stm32f407xx.s $T/system_stm32f4xx.c gpio.c uart_test.c
  echo "== $V"
  (sleep 1; printf 'hello'; sleep 2) | qemu-system-arm -M netduinoplus2 -display none -serial stdio -monitor none -kernel uart_$V.elf
done
```

```text
== POLL
BRR = (pclk + baud/2)/baud = 729
polling: type 5 chars> HELLO

== INT
BRR = (pclk + baud/2)/baud = 729
012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789
interrupt: queued 300, rejected (buffer full) = 0
interrupt: echo 5 chars> HELLO

```

두 판 모두 host에서 보낸 `hello`를 받아 대문자로 돌려보냈고, interrupt 판은 300자를 ring buffer로 보냈습니다. 다만 "rejected = 0"은 QEMU의 특성입니다. 모델 주석이 "I/O being synchronous, TXE is always set"이라고 적듯 QEMU는 `DR`에 쓰는 즉시 전송을 끝내므로, `TXEIE`를 켜는 순간 ISR이 buffer를 바로 비웁니다. 실제 115200 baud에서는 한 byte에 86.8 µs가 걸리므로, 255칸(256칸 중 하나는 full 판정용) buffer에 300자를 연달아 넣으면 일부가 -1로 거절됩니다. 같은 이유로 QEMU에서는 baud rate가 시간에 반영되지 않아 세 방식의 시간·CPU 점유율을 잴 수 없습니다. 그 비교는 보드에서 TX 핀을 logic analyzer로 보면서, 위 88.9 ms(1 KB) 동안 main loop가 몇 번 도는지 세는 방식으로 합니다.

DMA 판은 같은 헤더로 `-Wall` 경고 없이 컴파일되는 것까지만 확인했습니다.

## 자주 보는 함정

> ⚠️ ORE (overrun) flag 무시

수신 처리가 늦어 overrun이 나면 `SR`의 ORE(bit 3, HAL 이름 "Overrun error")가 섭니다. STM32F4의 지우는 순서는 HAL v1.8.3 `stm32f4xx_hal_uart.h`의 주석대로 "a read operation to USART_SR register followed by a read operation to USART_DR register"이고, `__HAL_UART_CLEAR_OREFLAG()`도 `SR`을 읽은 뒤 `DR`을 읽는 두 줄입니다. 위 ISR은 매번 `SR`을 먼저 읽고 `RXNE`일 때 `DR`을 읽으므로 이 순서를 따릅니다. 같은 주석은 "RXNE flag can be also cleared by a read to the USART_DR register"라고도 적습니다.

> ⚠️ Ring buffer head/tail의 소유권

위 ring buffer는 한쪽만 쓰는 index로 나뉩니다. RX는 ISR만 `rx_head`를, main만 `rx_tail`을 쓰고, TX는 반대입니다. `uint16_t` index는 정렬돼 있으면 ARMv7-M A3.5.3의 single-copy atomicity로 한 번에 읽히고 쓰이므로, 상대가 쓰는 index를 읽을 때 반쯤 바뀐 값을 볼 일이 없습니다. 다만 같은 index를 두 곳이 쓰게 되면(예: ISR에서도 `tx_head`를 쓰는 구조) 이 보장으로는 부족하고, [4-02](/blog/embedded/modern-recipes/part4-02-mmio-access)의 read-modify-write 경합이 그대로 생깁니다.

> ⚠️ TXE와 TC 혼동

`TXE`는 `DR`이 비어 다음 byte를 넣어도 된다는 뜻이고, HAL 주석대로 "TXE flag is cleared only by a write to the USART_DR register"입니다. `TC`(Transmission Complete)는 전송 자체가 끝났다는 flag입니다. Linux v6.12 `drivers/tty/serial/stm32-usart.c`는 `tx_empty()`를 `USART_SR_TC`로 판단하고, RS-485 모드에서는 `TC`가 선 뒤에야 `stm32_usart_rs485_rts_disable()`로 transceiver의 송신 enable을 끕니다. `TXE`만 보고 enable을 끄면 아직 나가는 중인 byte가 잘리기 때문에 이 순서를 씁니다.

> ⚠️ DMA TX 끝나기 전에 다시 enable

`uart_send_dma()`는 이전 전송의 완료 인터럽트(`TCIF7`)가 `tx_busy`를 0으로 돌릴 때까지 기다린 뒤 `NDTR`·`M0AR`을 바꿉니다. 이 대기 없이 바꾸면 진행 중인 전송의 설정을 덮어씁니다. `TCIE`를 켰으면 handler도 반드시 둡니다. ST startup의 `DMA2_Stream7_IRQHandler`는 weak alias로 `Default_Handler`의 무한 loop이므로([4-05](/blog/embedded/modern-recipes/part4-05-interrupt-handling)), handler 없이 `NVIC_EnableIRQ(DMA2_Stream7_IRQn)`을 하면 첫 전송이 끝나는 순간 멈춥니다. init의 `CR = 0` 뒤 `EN`이 0이 되기를 기다리는 것은 HAL v1.8.3 `stm32f4xx_hal_dma.c`가 stream을 끈 뒤 하는 확인과 같습니다.

## 정리

- **Polling**은 단순하지만 전송 시간(115200 baud에서 byte당 86.8 µs) 내내 CPU를 묶습니다.
- **Interrupt + ring buffer**는 byte마다 ISR 한 번으로 CPU를 풀어 주고, buffer가 차면 거절(-1)하거나 RX를 버립니다.
- **DMA**는 시작·완료만 CPU가 처리합니다. RX는 circular, TX는 한 번씩 시작하는 구성으로 썼습니다.
- STM32F4의 ORE 등 오류 flag는 `SR` 읽기 → `DR` 읽기로 지웁니다.
- USART1은 APB2이므로 BRR은 PCLK2(84 MHz)로 계산합니다(115200 baud → 729).

다음 편은 **SPI 드라이버**입니다. CPOL/CPHA, multi-slave CS, full-duplex DMA를 다룹니다.

## 관련 항목

- [1-04: UART 하드웨어 동작](/blog/embedded/modern-recipes/part1-04-uart-hardware)
- [4-08: SPI 드라이버](/blog/embedded/modern-recipes/part4-08-spi-driver)
- [4-10: DMA 기초](/blog/embedded/modern-recipes/part4-10-dma-basics)
- [10-05: UART이 안 찍힐 때](/blog/embedded/modern-recipes/part10-05-uart-not-printing)
