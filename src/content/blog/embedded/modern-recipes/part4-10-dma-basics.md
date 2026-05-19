---
title: "4-10: DMA 기초"
date: 2026-05-13T20:00:00
description: "Channel·trigger·half/full complete·circular·memory-to-memory."
series: "Modern Embedded Recipes"
seriesOrder: 44
tags: [recipes, bare-metal, dma]
draft: false
---

## 한 줄 요약

> **"DMA = CPU 없이 메모리 ↔ 메모리/peripheral 이동."** Source, destination, length, trigger 네 가지만 정하면 됩니다.

## 어떤 상황에서 쓰나

UART에서 1 KB를 받거나, ADC로 1024 sample을 모으거나, SPI로 framebuffer를 LCD에 쏟는 작업을 CPU로 처리하면 *수십 ms를 날립니다*. DMA를 쓰면 *CPU는 다른 일을 하면서* peripheral과 메모리 사이 데이터가 흐릅니다. throughput이 늘고 latency는 줄며 power도 줄어듭니다.

이 글은 STM32F4의 DMA controller를 기준으로 peripheral-to-memory, memory-to-peripheral, memory-to-memory 세 가지 패턴을 모두 다룹니다.

## 핵심 개념

### DMA architecture

```text
              ┌────────────────┐
              │  DMA Controller │
              │  ┌─────────┐    │
              │  │ Stream0 │    │  ←── trigger source
              │  │ Stream1 │    │      (UART, SPI, ADC, TIM, ...)
              │  │   ...    │    │
              │  │ Stream7 │    │
              │  └─────────┘    │
              └────────────────┘
                  │  AHB
              ┌────────────────┐
              │  Bus matrix     │
              └────────────────┘
              │            │
           SRAM        Peripheral
```

STM32F4는 *DMA1, DMA2 controller 각 8 stream*, 각 stream은 *8 channel*에서 trigger source를 고릅니다. 어느 peripheral이 어느 stream·channel을 쓰는지는 datasheet의 *DMA request mapping table*을 참조합니다.

### Transfer 모드 세 가지

- **Peripheral → Memory**: ADC 결과, UART RX, SPI RX.
- **Memory → Peripheral**: UART TX, SPI TX, DAC waveform.
- **Memory → Memory**: memcpy 가속 (peripheral trigger 없이 software가 시작).

### Circular vs Normal

- **Normal**: 지정한 NDTR만큼 transfer 후 자동 stop.
- **Circular**: NDTR 도달 시 처음으로 wrap, 무한 반복. ADC sampling, UART RX buffer에 적합.

### Half/Full complete interrupt

DMA는 *NDTR의 절반과 전체*에 도달했을 때 IRQ를 발생시킬 수 있습니다. circular buffer를 두 영역으로 나눠 *한쪽이 차는 동안 다른 쪽 처리* 패턴(double buffering)이 표준입니다.

```text
DMA buffer (1024 bytes, circular):

   ┌─────────────────┬─────────────────┐
   │   first half    │   second half    │
   └─────────────────┴─────────────────┘
   ↑                  ↑                  ↑
   start            HT IRQ              TC IRQ
                   (process A)         (process B)
```

### Data width와 burst

```c
PSIZE / MSIZE = 0 (byte), 1 (halfword), 2 (word)
PBURST / MBURST = single (0), incr4 (1), incr8 (2), incr16 (3)
```

burst는 *bus arbitration overhead를 줄여 throughput을 올립니다*. 단, source/destination 모두 burst-capable이어야 합니다.

### Cache coherency (Cortex-M7)

STM32H7·F7은 *D-cache*를 가집니다. CPU가 cache에 write한 데이터를 DMA가 *SRAM에서 읽으면* stale data 위험이 있습니다. cache clean/invalidate를 명시적으로 호출해야 합니다.

```c
SCB_CleanDCache_by_Addr(buf, len);   // CPU write → DMA read 전
SCB_InvalidateDCache_by_Addr(buf, len);   // DMA write → CPU read 전
```

## 코드 예제

### 1. ADC → memory (continuous + circular)

```c
#define ADC_BUF_LEN 256
static uint16_t adc_buf[ADC_BUF_LEN];

void adc_dma_init(void) {
    RCC->AHB1ENR |= RCC_AHB1ENR_DMA2EN;
    RCC->APB2ENR |= RCC_APB2ENR_ADC1EN;

    // DMA2 Stream0, Channel 0 = ADC1
    DMA2_Stream0->CR = 0;
    while (DMA2_Stream0->CR & DMA_SxCR_EN);

    DMA2_Stream0->PAR  = (uint32_t)&ADC1->DR;
    DMA2_Stream0->M0AR = (uint32_t)adc_buf;
    DMA2_Stream0->NDTR = ADC_BUF_LEN;
    DMA2_Stream0->CR   = (0u << 25)              // channel 0
                       | DMA_SxCR_MINC           // memory increment
                       | (1u << 11)              // PSIZE = halfword
                       | (1u << 13)              // MSIZE = halfword
                       | DMA_SxCR_CIRC           // circular
                       | DMA_SxCR_HTIE | DMA_SxCR_TCIE
                       | DMA_SxCR_EN;
    NVIC_EnableIRQ(DMA2_Stream0_IRQn);

    ADC1->CR2 |= ADC_CR2_DMA | ADC_CR2_DDS | ADC_CR2_CONT | ADC_CR2_ADON;
    ADC1->CR2 |= ADC_CR2_SWSTART;
}

volatile int adc_half_ready, adc_full_ready;

void DMA2_Stream0_IRQHandler(void) {
    uint32_t flags = DMA2->LISR;
    DMA2->LIFCR = flags;
    if (flags & DMA_LISR_HTIF0) adc_half_ready = 1;
    if (flags & DMA_LISR_TCIF0) adc_full_ready = 1;
}

void process_adc(void) {
    if (adc_half_ready) {
        adc_half_ready = 0;
        process(adc_buf, ADC_BUF_LEN/2);          // first half
    }
    if (adc_full_ready) {
        adc_full_ready = 0;
        process(adc_buf + ADC_BUF_LEN/2, ADC_BUF_LEN/2);
    }
}
```

main은 *DMA가 어느 영역을 채우고 있는지* HT/TC flag로만 알면 됩니다.

### 2. UART RX circular buffer

```c
#define RX_DMA_LEN 256
static uint8_t rx_dma[RX_DMA_LEN];
static uint16_t rx_dma_read_pos;

void uart_dma_rx_init(void) {
    USART1->CR3 |= USART_CR3_DMAR;

    DMA2_Stream2->PAR  = (uint32_t)&USART1->DR;
    DMA2_Stream2->M0AR = (uint32_t)rx_dma;
    DMA2_Stream2->NDTR = RX_DMA_LEN;
    DMA2_Stream2->CR   = (4u << 25)
                       | DMA_SxCR_MINC
                       | DMA_SxCR_CIRC
                       | DMA_SxCR_EN;
}

// Polling — DMA가 어디까지 썼는지 NDTR로 계산
size_t uart_dma_rx_available(void) {
    uint16_t write_pos = RX_DMA_LEN - (uint16_t)DMA2_Stream2->NDTR;
    if (write_pos >= rx_dma_read_pos)
        return write_pos - rx_dma_read_pos;
    else
        return RX_DMA_LEN - rx_dma_read_pos + write_pos;
}

uint8_t uart_dma_rx_get(void) {
    uint8_t c = rx_dma[rx_dma_read_pos];
    rx_dma_read_pos = (rx_dma_read_pos + 1) % RX_DMA_LEN;
    return c;
}
```

이 패턴은 *IRQ 없이* RX를 무한히 받습니다. CPU는 한가할 때만 buffer를 비웁니다.

### 3. Memory-to-memory (software trigger)

```c
void dma_memcpy(void *dst, const void *src, size_t n) {
    DMA2_Stream0->CR = 0;
    while (DMA2_Stream0->CR & DMA_SxCR_EN);

    DMA2_Stream0->PAR  = (uint32_t)src;
    DMA2_Stream0->M0AR = (uint32_t)dst;
    DMA2_Stream0->NDTR = n / 4;
    DMA2_Stream0->CR   = (2u << 6)              // DIR = mem→mem
                       | DMA_SxCR_MINC
                       | DMA_SxCR_PINC
                       | (2u << 11) | (2u << 13)
                       | DMA_SxCR_EN;

    while (!(DMA2->LISR & DMA_LISR_TCIF0));
    DMA2->LIFCR = DMA_LIFCR_CTCIF0;
}
```

memory-to-memory는 *CPU memcpy보다 약간 빠르고* (peripheral bus 별도 사용), CPU 부담이 없습니다. 단 *small copy*는 setup overhead 때문에 손해.

## 측정 / 동작 확인

DMA 동작 확인은 `NDTR`을 폴링하면 됩니다.

```text
(gdb) p/d DMA2_Stream0->NDTR
$1 = 178           ← 256 → 178로 줄어들고 있음 (78 bytes 전송됨)
```

ADC sampling은 oscilloscope로 ADC 트리거 핀(TIM2 ETR 등)을 보고, sample rate 일치 확인:

```text
TIM2 → ADC EXT trigger:
  PA0 trigger: 1 µs period (1 MHz)
  adc_buf 채우는 속도: 256 sample / 256 µs = 1 sample/µs ✓
```

DMA가 안 도는 가장 흔한 원인은 *peripheral의 DMA enable bit 누락*과 *clock enable 누락*입니다.

## 자주 보는 함정

> ⚠️ Channel 잘못 선택

reference manual의 DMA request mapping은 패밀리마다 다릅니다. F4의 SPI1 RX = DMA2 Stream0/Channel 3, F7도 비슷하지만 다른 SoC는 다릅니다.

> ⚠️ Stream을 두 peripheral이 동시 사용

stream은 *한 시점에 하나의 source*만 처리합니다. 두 peripheral이 같은 stream이면 *둘 중 하나 포기* (다른 stream으로 옮김).

> ⚠️ Width 불일치

8-bit PSIZE인데 16-bit MSIZE면 align 오류. 같은 width로 통일이 안전.

> ⚠️ Buffer가 stack에 있음

local array에 DMA target을 잡으면 *함수 return 후 stale*. 항상 `static` 또는 global.

> ⚠️ Buffer alignment

`uint32_t` transfer는 4-byte align이 필요합니다. `__attribute__((aligned(4)))`.

> ⚠️ Cortex-M7 cache coherency

H7·F7에서 DMA가 SRAM에 쓴 데이터를 CPU가 *cache hit로 stale read*. `SCB_InvalidateDCache_by_Addr` 필수. 또는 *MPU로 buffer 영역만 non-cacheable*로 설정.

> ⚠️ Half-word access가 boundary를 넘김

odd address에 16-bit DMA write → bus fault. address도 width에 맞춰 align.

## 정리

- DMA = **source + destination + length + trigger**. setup 4가지로 시작.
- **Circular + HT/TC IRQ**가 double buffer 패턴의 표준.
- ADC·UART·SPI 모두 *peripheral의 DMA enable bit*도 같이 set.
- Buffer는 **static 또는 global**, **aligned**.
- Cortex-M7은 **cache clean/invalidate** 또는 **MPU non-cacheable**.

다음 편은 **저전력 모드**입니다. Sleep/Stop/Standby와 wake-up source, µA 측정을 다룹니다.

## 관련 항목

- [2-06: ARM 캐시](/blog/embedded/modern-recipes/part2-06-arm-cache)
- [4-07: UART 드라이버](/blog/embedded/modern-recipes/part4-07-uart-driver)
- [4-08: SPI 드라이버](/blog/embedded/modern-recipes/part4-08-spi-driver)
- [12-09: zero-copy 카메라](/blog/embedded/modern-recipes/part12-09-zero-copy-camera)
