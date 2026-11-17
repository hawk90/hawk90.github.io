---
title: "임베디드 DMA 기초 — Memory-to-Memory·Peripheral·Circular Mode"
slug: "embedded/modern-recipes/part4-10-dma-basics"
date: 2026-04-13T09:44:00
description: "Channel·trigger·half/full complete·circular·memory-to-memory."
series: "Modern Embedded Recipes"
seriesOrder: 44
tags: [recipes, bare-metal, dma]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> **"DMA는 CPU가 word를 하나씩 복사하지 않아도 메모리와 peripheral 사이에서 데이터를 옮깁니다."** Source, destination, length, trigger 외에도 width, alignment, cache/coherency와 ownership을 설정해야 합니다.

## 어떤 상황에서 쓰나

UART에서 1 KB를 받는 일만 해도 115200 baud 8N1에서 88.9 ms가 걸립니다([4-07](/blog/embedded/modern-recipes/part4-07-uart-driver)). 그동안 CPU가 byte마다 `DR`을 옮기는 대신, DMA가 peripheral과 메모리 사이를 옮기고 CPU는 시작과 완료만 처리하게 하는 것이 이 글의 목표입니다.

이 글은 STM32F407의 DMA controller를 기준으로 peripheral-to-memory, memory-to-peripheral, memory-to-memory 세 패턴을 다룹니다. register 이름과 bit 위치는 `stm32f407xx.h`, 설정 규칙은 ST HAL v1.8.3 `stm32f4xx_hal_dma.c`/`.h`를 기준으로 했습니다. QEMU의 STM32F4·L4 모델은 DMA를 unimplemented device로만 두므로(`stm32f405_soc.c`, `stm32l4x5_soc.c`), 아래 코드는 arm-none-eabi-gcc 16.2.0으로 `-Wall` 경고 없이 빌드되는 것까지 확인했고 실행은 하지 않았습니다.

## 핵심 개념

### DMA architecture

| 블록 | 역할 |
| --- | --- |
| DMA Controller | DMA1·DMA2, 각각 Stream0 ~ Stream7. 각 stream은 `CHSEL`로 trigger source(UART·SPI·ADC·TIM 등)를 고름 |
| SRAM | data buffer 위치 |
| Peripheral | source 또는 destination |

`stm32f407xx.h`는 `DMA1_Stream0`~`DMA1_Stream7`, `DMA2_Stream0`~`DMA2_Stream7`을 정의하고, 각 stream의 `CR`에서 3 bit `CHSEL`(bit 27:25)로 channel 0~7 중 하나를 고릅니다. 어느 peripheral이 어느 stream·channel인지는 RM0090 Rev 22(st.com이 응답하지 않아 [stm32.dirba.io](https://stm32.dirba.io/rm0090-stm32f405-415-407-417-427-437-429-439/)의 본문 판으로 확인) Table 43(DMA1)·Table 44(DMA2) request mapping에 있습니다. 아래 예제의 stream·channel은 출처를 단 ST 예제에서 가져왔고, Table 44와 맞습니다(USART1_RX = DMA2 channel 4의 stream 2·5).

### Transfer 모드 세 가지

- **Peripheral → Memory**: ADC 결과, UART RX, SPI RX.
- **Memory → Peripheral**: UART TX, SPI TX, DAC waveform.
- **Memory → Memory**: peripheral 요청 없이 stream을 켜는 것으로 시작합니다. HAL은 이 방향에 두 제약을 답니다. 아래 circular 금지와 "The Direct mode (FIFO mode disabled) cannot be used if the memory-to-memory data transfer is configured"입니다. HAL의 `DMA_MEMORY_TO_MEMORY`는 `DMA_SxCR_DIR_1`이고, 이때는 `PAR`이 source, `M0AR`이 destination입니다(HAL `DMA_SetConfig()`).

### Circular vs Normal

- **Normal**: `NDTR`만큼 옮기면 끝납니다.
- **Circular**(`DMA_SxCR_CIRC`): 끝에 닿으면 buffer 처음으로 돌아가 계속합니다. ADC 연속 변환이나 UART RX처럼 끝이 없는 입력에 씁니다. HAL은 "The circular buffer mode cannot be used if the memory-to-memory data transfer is configured"라고 적습니다.

### Half/Full complete interrupt

DMA는 전송이 절반 지났을 때(HT, `DMA_SxCR_HTIE`)와 끝났을 때(TC, `DMA_SxCR_TCIE`) 인터럽트를 냅니다. circular buffer를 두 영역으로 나눠, DMA가 한쪽을 채우는 동안 CPU가 다른 쪽을 처리합니다.

아래 ADC 예제(`uint16_t adc_buf[256]`, 512 B)로 보면 이렇습니다.

| 원소 index | 영역 | trigger event | CPU 동작 |
| --- | --- | --- | --- |
| 0 | 앞 절반 (128개) | start | (DMA fill 시작) |
| 128 | (HT 도달) | HT IRQ | 앞 절반 처리 |
| 256 | 뒤 절반 끝 | TC IRQ | 뒤 절반 처리, 처음으로 wrap |

### Data width와 burst

```text
PSIZE (bit 12:11) / MSIZE (bit 14:13) = 0 (byte), 1 (halfword), 2 (word)
PBURST (bit 22:21) / MBURST (bit 24:23) = single (0), incr4 (1), incr8 (2), incr16 (3)
```

bit 위치는 `DMA_SxCR_PSIZE_Pos` 11, `MSIZE_Pos` 13, `PBURST_Pos` 21, `MBURST_Pos` 23이고, burst 값은 HAL의 `DMA_MBURST_SINGLE`·`INC4`·`INC8`·`INC16` 정의와 같습니다.

HAL은 burst에 대해 "The burst mode is possible only if the address Increment mode is enabled"라는 조건을 답니다. 이 글의 예제는 모두 single transfer를 씁니다.

### Cache coherency (Cortex-M7)

STM32F407(Cortex-M4)에는 D-cache가 없어 이 절은 해당하지 않습니다. D-cache가 있는 Cortex-M7 칩(예: ST `stm32f767xx.h`의 `__DCACHE_PRESENT 1U`)에서는 DMA와 CPU가 같은 buffer를 쓰기 전후에 cache를 정리합니다. CMSIS_6 `m-profile/armv7m_cachel1.h`의 두 함수는 "starting from a 32 byte aligned address in 32 byte granularity"로 동작해, 주어진 범위에 걸친 32-byte line 전체를 clean/invalidate합니다. Cortex-M7의 cache line은 같은 파일의 `__SCB_DCACHE_LINE_SIZE 32U`입니다.

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

    // DMA2 Stream0, Channel 0 = ADC1 (ST STM32F4-Discovery ADC_RegularConversion_DMA)
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
    DMA2->LIFCR = flags & (DMA_LIFCR_CHTIF0 | DMA_LIFCR_CTCIF0);   // stream 0 only
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

stream·channel은 ST STM32CubeF4의 `Projects/STM32F4-Discovery/Examples/ADC/ADC_RegularConversion_DMA/Inc/main.h`(F407 보드)가 ADC1에 쓰는 `DMA2_Stream0`, `DMA_CHANNEL_0`입니다. HT가 오면 앞 절반, TC가 오면 뒤 절반이 다 찼다는 뜻이므로 main은 두 flag만 보고 처리할 쪽을 고릅니다. `process()`는 응용 함수입니다.

### 2. UART RX circular buffer

```c
#define RX_DMA_LEN 256
static uint8_t rx_dma[RX_DMA_LEN];
static uint16_t rx_dma_read_pos;

void uart_dma_rx_init(void) {      // assumes 4-07's GPIO/USART1/DMA2 clock init
    USART1->CR3 |= USART_CR3_DMAR;
    DMA2_Stream5->CR = 0;
    while (DMA2_Stream5->CR & DMA_SxCR_EN);

    // USART1_RX = DMA2 Stream5 Channel4 (4-07과 같은 ST 예제)
    DMA2_Stream5->PAR  = (uint32_t)&USART1->DR;
    DMA2_Stream5->M0AR = (uint32_t)rx_dma;
    DMA2_Stream5->NDTR = RX_DMA_LEN;
    DMA2_Stream5->CR   = (4u << 25)
                       | DMA_SxCR_MINC
                       | DMA_SxCR_CIRC
                       | DMA_SxCR_EN;
}

// Polling — DMA가 어디까지 썼는지 NDTR로 계산
size_t uart_dma_rx_available(void) {
    uint16_t write_pos = RX_DMA_LEN - (uint16_t)DMA2_Stream5->NDTR;
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

이 패턴에서는 IRQ 없이도 RX write position을 폴링할 수 있습니다. CPU가 처리하지 못해 write position이 read position을 추월하면 데이터가 덮어쓰이므로 overrun 정책이 필요합니다.

### 3. Memory-to-memory (software trigger)

```c
void dma_memcpy(void *dst, const void *src, size_t n) {
    DMA2_Stream0->CR = 0;
    while (DMA2_Stream0->CR & DMA_SxCR_EN);

    DMA2_Stream0->PAR  = (uint32_t)src;
    DMA2_Stream0->M0AR = (uint32_t)dst;
    DMA2_Stream0->NDTR = n / 4;
    DMA2->LIFCR = 0x3Fu;                        // clear stream 0 flags (HAL_DMA_Start)
    DMA2_Stream0->FCR  = DMA_SxFCR_DMDIS | DMA_SxFCR_FTH;   // FIFO mode: direct mode not allowed for mem2mem
    DMA2_Stream0->CR   = (2u << 6)              // DIR = mem→mem
                       | DMA_SxCR_MINC
                       | DMA_SxCR_PINC
                       | (2u << 11) | (2u << 13)
                       | DMA_SxCR_EN;

    while (!(DMA2->LISR & DMA_LISR_TCIF0));
    DMA2->LIFCR = DMA_LIFCR_CTCIF0;
}
```

word 단위로 옮기므로 `NDTR = n / 4`이고 `n`은 4의 배수여야 합니다. 이 함수도 ADC 예제와 같은 `DMA2_Stream0`을 쓰므로 두 코드를 한 프로그램에 넣을 때는 둘 중 하나를 다른 stream으로 옮깁니다. 위 함수는 완료를 polling하므로 CPU가 그동안 다른 일을 하지 못합니다. CPU memcpy와 시간을 비교하려면 보드에서 [4-06](/blog/embedded/modern-recipes/part4-06-systick-timer)의 DWT `CYCCNT`로 두 방식을 같은 크기로 잽니다. 이 글은 그 측정을 하지 않았습니다.

## 측정 / 동작 확인

DMA가 돌고 있는지는 `NDTR`(남은 개수)이 줄어드는지로 봅니다. 실행 중에 코드에서(또는 디버거의 live watch로) 두 번 읽어 값이 다르면 stream이 진행 중입니다. ADC 예제에서는 `adc_half_ready`·`adc_full_ready`가 번갈아 서는지 봅니다.

`NDTR`이 처음 값에서 줄지 않으면 이 글의 코드에서 확인할 곳은 셋입니다. DMA clock(`RCC_AHB1ENR_DMA2EN`), stream의 `EN`, 그리고 peripheral 쪽의 DMA 요청 bit(ADC는 `ADC_CR2_DMA`, USART는 `USART_CR3_DMAR`/`DMAT`)입니다.

## 자주 보는 함정

> ⚠️ Channel 잘못 선택

같은 SPI DMA라도 ST 예제마다 stream·channel이 다릅니다. [4-08](/blog/embedded/modern-recipes/part4-08-spi-driver)에서 인용한 STM32F412ZG-Nucleo `SPI_FullDuplex_ComDMA`는 SPI1 RX에 DMA2 Stream2/Channel 3을, STM32F429I-Discovery의 같은 예제(`Projects/STM32F429I-Discovery/Examples/SPI/SPI_FullDuplex_ComDMA/Inc/main.h`)는 SPI4 RX에 DMA2 Stream0/Channel 4(TX는 Stream1)를 씁니다. 다른 칩의 예제에서 번호를 그대로 옮기지 않고, 대상 칩의 예제나 reference manual 표에서 다시 찾습니다.

> ⚠️ Stream을 두 peripheral이 동시 사용

stream 하나의 `CHSEL`은 한 번에 한 값이므로, 한 stream은 한 시점에 한 channel(= 한 peripheral 요청)만 받습니다. 두 peripheral이 같은 stream을 원하면 둘 중 하나를 그 peripheral이 쓸 수 있는 다른 stream으로 옮깁니다.

> ⚠️ Width 불일치

ADC 예제는 `ADC1->DR`을 halfword로 읽어 `uint16_t` buffer에 쓰므로 PSIZE·MSIZE 모두 halfword입니다. buffer 원소 크기와 MSIZE가 다르면 `NDTR` 개수만큼 옮겨도 buffer의 엉뚱한 위치가 채워집니다.

> ⚠️ Buffer가 stack에 있음

함수 안의 자동 변수 배열은 함수가 돌아오면 수명이 끝납니다(C11 6.2.4). DMA는 그 뒤에도 같은 주소에 계속 쓰므로 다른 함수의 stack frame을 덮어씁니다. DMA buffer는 `static`이나 전역으로 둡니다.

> ⚠️ Buffer alignment

`dma_memcpy()`처럼 word로 옮길 때는 `src`·`dst`를 `__attribute__((aligned(4)))` 등으로 4-byte 정렬해 둡니다. Cortex-M7에서 cache를 함께 다룰 때는 위 CMSIS 함수가 32-byte line 단위로 동작하므로, buffer 시작을 32-byte로 정렬하고 크기를 32의 배수로 맞춰 다른 변수와 line을 공유하지 않게 합니다.

> ⚠️ Cortex-M7 cache coherency

M7 칩으로 옮기면 DMA가 쓴 buffer를 읽기 전에 `SCB_InvalidateDCache_by_Addr()`, DMA가 읽을 buffer를 쓴 뒤에 `SCB_CleanDCache_by_Addr()`를 부르거나, buffer를 MPU로 non-cacheable 영역에 둡니다. F407 코드에는 해당하지 않습니다.

## 정리

- DMA 설정은 **source + destination + length + trigger(stream·channel)**이고, stream·channel은 칩의 DMA request 표나 ST 예제로 확인합니다.
- **Circular + HT/TC 인터럽트**로 buffer 두 절반을 번갈아 처리합니다.
- ADC·UART·SPI 모두 *peripheral의 DMA enable bit*도 같이 set합니다.
- Buffer는 **static 또는 global**로 두고 **정렬(aligned)**합니다.
- Cortex-M7 칩은 **cache clean/invalidate**(32-byte 정렬) 또는 **MPU non-cacheable**이 필요하고, F407에는 해당하지 않습니다.

다음 편은 **저전력 모드**입니다. Sleep/Stop/Standby와 wake-up source, µA 측정을 다룹니다.

## 관련 항목

- [2-06: ARM 캐시](/blog/embedded/modern-recipes/part2-06-arm-cache)
- [4-07: UART 드라이버](/blog/embedded/modern-recipes/part4-07-uart-driver)
- [4-08: SPI 드라이버](/blog/embedded/modern-recipes/part4-08-spi-driver)
- [12-10: zero-copy 카메라](/blog/embedded/modern-recipes/part12-10-zero-copy-camera)
