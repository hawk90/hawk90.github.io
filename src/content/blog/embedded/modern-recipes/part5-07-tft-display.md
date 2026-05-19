---
title: "5-07: TFT 디스플레이"
date: 2026-05-14T07:00:00
description: "Parallel RGB·framebuffer·LTDC·tearing 방지."
series: "Modern Embedded Recipes"
seriesOrder: 55
tags: [recipes, peripheral, tft, display]
draft: false
---

## 한 줄 요약

> **"TFT는 RAM이 무겁습니다."** 480×272 RGB565 = 261 KB. 한 framebuffer가 일반 MCU SRAM 전체보다 큽니다.

## 어떤 상황에서 쓰나

산업용 HMI panel, 의료기기 UI, 자동차 cluster, smart home hub — full color graphic UI가 필요할 때 TFT를 씁니다. SPI ILI9341 (2.4-3.5 inch)은 작은 MCU도 구동, parallel RGB LTDC는 STM32F7/H7 이상이 필요합니다.

이 글은 두 가지 변종 — *SPI TFT*와 *parallel LTDC TFT*를 다룹니다.

## 핵심 개념

### 두 가지 인터페이스

| 인터페이스 | 해상도 | MCU 요구사항 | 전송 속도 |
|-----------|--------|-------------|-----------|
| SPI (ILI9341) | 240×320 ~ 320×480 | Cortex-M3 이상 | 40-60 MHz |
| FSMC/FMC parallel | 480×320 ~ 800×480 | STM32F4 + FSMC | ~50 MHz × 16-bit |
| LTDC (RGB parallel) | 480×272 ~ 800×480 | STM32F7/H7 | DMA framebuffer |

LTDC는 *DMA controller가 framebuffer를 RGB output으로 자동 송출*. CPU는 framebuffer만 그리면 됩니다.

### RGB565 format

16-bit pixel = 5-bit R + 6-bit G + 5-bit B.

```c
RGB565 = ((R >> 3) << 11) | ((G >> 2) << 5) | (B >> 3)
```

| 색 | RGB565 |
|----|--------|
| 흰색 | `0xFFFF` |
| 검정 | `0x0000` |
| 빨강 | `0xF800` |
| 초록 | `0x07E0` |
| 파랑 | `0x001F` |
| 노랑 | `0xFFE0` |

### Framebuffer size

| 해상도 | 크기 | 비고 |
|--------|------|------|
| 240 × 320 × 2 | 153 KB | ILI9341 |
| 480 × 272 × 2 | 261 KB | STM32F7-DISCO LCD |
| 800 × 480 × 2 | 768 KB | 큰 panel |

STM32F411 (128 KB SRAM)은 240×320만 가능, F7/H7 + external SDRAM은 800×480까지.

### Tearing과 double buffering

화면 refresh와 framebuffer 업데이트가 *동시에 일어나면* tearing 발생. 해결책 두 가지.

```text
Single buffer:    뜸. tearing 발생.
Double buffer:    front + back. back 그리고 vsync에 swap. 메모리 ×2.
Tear-free single: vsync 신호 기다린 후 update.
```

## 코드 예제

### 1. ILI9341 SPI driver

```c
// CS=PA4, DC=PA3, RES=PA2, SPI1
static void tft_cmd(uint8_t cmd) {
    GPIOA->BSRR = (1u << (3+16));   // DC=0
    GPIOA->BSRR = (1u << (4+16));   // CS=0
    spi_xfer8(cmd);
    while (SPI1->SR & SPI_SR_BSY);
    GPIOA->BSRR = (1u << 4);
}

static void tft_data(const uint8_t *data, uint16_t n) {
    GPIOA->BSRR = (1u << 3);
    GPIOA->BSRR = (1u << (4+16));
    for (uint16_t i = 0; i < n; i++) spi_xfer8(data[i]);
    while (SPI1->SR & SPI_SR_BSY);
    GPIOA->BSRR = (1u << 4);
}

void tft_init(void) {
    // Hardware reset
    GPIOA->BSRR = (1u << (2+16));
    delay_ms(10);
    GPIOA->BSRR = (1u << 2);
    delay_ms(150);

    tft_cmd(0x01); delay_ms(150);     // software reset
    tft_cmd(0x11); delay_ms(120);     // sleep out

    tft_cmd(0x3A); tft_data((uint8_t[]){0x55}, 1);   // 16-bit color
    tft_cmd(0x36); tft_data((uint8_t[]){0x48}, 1);   // MADCTL: BGR
    tft_cmd(0x29);                                    // display ON
}

void tft_set_window(uint16_t x0, uint16_t y0, uint16_t x1, uint16_t y1) {
    tft_cmd(0x2A);
    tft_data((uint8_t[]){x0 >> 8, x0, x1 >> 8, x1}, 4);
    tft_cmd(0x2B);
    tft_data((uint8_t[]){y0 >> 8, y0, y1 >> 8, y1}, 4);
    tft_cmd(0x2C);   // memory write
}

void tft_pixel(uint16_t x, uint16_t y, uint16_t color) {
    tft_set_window(x, y, x, y);
    uint8_t buf[2] = {color >> 8, color};
    tft_data(buf, 2);
}

void tft_fill(uint16_t color) {
    tft_set_window(0, 0, 239, 319);
    GPIOA->BSRR = (1u << 3);
    GPIOA->BSRR = (1u << (4+16));
    for (uint32_t i = 0; i < 240u * 320; i++) {
        spi_xfer8(color >> 8);
        spi_xfer8(color);
    }
    GPIOA->BSRR = (1u << 4);
}
```

`tft_fill`로 240×320 = 76800 pixel × 2 byte = 153600 byte. 30 MHz SPI에서 ~41 ms (DMA로 옮기면 비슷한 시간이지만 CPU 0%).

### 2. LTDC parallel — STM32F7

LTDC는 *framebuffer를 SDRAM에 두고* hardware가 자동 송출. CPU는 framebuffer 수정만.

```c
#define LCD_W 480
#define LCD_H 272
#define SDRAM_BASE 0xD0000000UL
static volatile uint16_t *fb = (uint16_t *)SDRAM_BASE;

void ltdc_init(void) {
    RCC->APB2ENR |= RCC_APB2ENR_LTDCEN;

    // PLLSAI: LTDC clock = 9 MHz (60 Hz refresh on 480x272)
    // ... PLLSAI 설정 생략

    // Timing
    LTDC->SSCR = ((41 - 1) << 16) | (10 - 1);     // sync size
    LTDC->BPCR = ((43 - 1) << 16) | (12 - 1);     // back porch
    LTDC->AWCR = ((480+43-1) << 16) | (272+12-1); // active width
    LTDC->TWCR = ((480+43+8-1) << 16) | (272+12+4-1); // total

    LTDC->GCR = LTDC_GCR_LTDCEN;

    // Layer 1
    LTDC_Layer1->WHPCR = ((480+43) << 16) | (43+1);
    LTDC_Layer1->WVPCR = ((272+12) << 16) | (12+1);
    LTDC_Layer1->PFCR  = 2;                       // RGB565
    LTDC_Layer1->CFBAR = (uint32_t)fb;
    LTDC_Layer1->CFBLR = ((480*2) << 16) | (480*2 + 3);
    LTDC_Layer1->CFBLNR = 272;
    LTDC_Layer1->CR    = LTDC_LxCR_LEN;

    LTDC->SRCR = LTDC_SRCR_IMR;   // reload
}

void ltdc_pixel(uint16_t x, uint16_t y, uint16_t color) {
    fb[y * LCD_W + x] = color;
}

void ltdc_fill(uint16_t color) {
    for (uint32_t i = 0; i < LCD_W * LCD_H; i++) fb[i] = color;
}
```

framebuffer 변경이 *즉시* 화면에 반영. CPU 부담 0%.

### 3. Double buffer + vsync

```c
static volatile uint16_t *fb_front = (uint16_t *)SDRAM_BASE;
static volatile uint16_t *fb_back  = (uint16_t *)(SDRAM_BASE + LCD_W * LCD_H * 2);

static volatile int swap_pending;

void ltdc_swap(void) {
    swap_pending = 1;
    // wait for vsync ISR
    while (swap_pending);
}

void LTDC_IRQHandler(void) {
    if (LTDC->ISR & LTDC_ISR_LIF) {
        LTDC->ICR = LTDC_ICR_CLIF;
        if (swap_pending) {
            volatile uint16_t *tmp = fb_front;
            fb_front = fb_back;
            fb_back  = tmp;
            LTDC_Layer1->CFBAR = (uint32_t)fb_front;
            LTDC->SRCR = LTDC_SRCR_VBR;   // shadow reload on vsync
            swap_pending = 0;
        }
    }
}
```

화면이 *완전한 frame*만 표시 — tearing 없음.

## 측정 / 동작 확인

화면에 단색 fill이 보이면 success. 색이 이상하면:

- **MADCTL 0x36** — BGR/RGB 비트 ('48' vs '08') 시도.
- **Color format 0x3A** — 0x55 (16-bit) vs 0x66 (18-bit).
- **Orientation** — portrait/landscape mode 비트 확인.

스코프로 SPI 또는 RGB output을 보면 transaction이 보입니다. LTDC는 HSYNC, VSYNC, DE 신호를 *지속적으로* 출력.

```text
VSYNC: 60 Hz (16.7 ms 주기)
HSYNC: 60 × (272+12+4+12) = 18 kHz
DE:    active 영역에서 high
```

## 자주 보는 함정

> ⚠️ Framebuffer size가 SRAM 초과

f411 (128 KB)에 480×272×2=261 KB 두면 link error. *external SDRAM 필수* 또는 작은 panel.

> ⚠️ MADCTL 색 잘못

R/B 뒤바뀐 화면이 보임. MADCTL의 BGR/RGB 비트 토글.

> ⚠️ LTDC clock 잘못

너무 빠르면 panel이 못 따라가 화면이 *깨짐*. datasheet의 pixel clock max 확인.

> ⚠️ Tearing

single buffer + 빠른 update면 *반쯤 그려진 frame*이 보임. double buffer + vsync swap.

> ⚠️ SPI TFT 색 깊이

ILI9341 16-bit/18-bit/24-bit 선택. 18-bit (R 6, G 6, B 6) format은 byte 3개로 1 pixel — bandwidth 1.5배.

> ⚠️ Backlight brightness

PWM duty로 backlight 조정. 100% duty면 *power 30 mA*, 50%면 15 mA. battery 절약에 중요.

## 정리

- TFT는 **framebuffer가 큰 메모리** — 480×272×2 = 261 KB.
- 작은 MCU는 **SPI TFT (240×320)**, 중대형은 **LTDC parallel + SDRAM**.
- **RGB565** = 5+6+5 bit. 일반적 색.
- **Double buffer + vsync swap**으로 tearing 제거.
- MADCTL의 **BGR/RGB**, color format **0x3A**가 처음 디버깅 포인트.

다음 편은 **환경 센서 (온도·습도·기압)**입니다. BME280, SHT3x I2C/SPI driver pattern을 다룹니다.

## 관련 항목

- [4-08: SPI 드라이버](/blog/embedded/modern-recipes/part4-08-spi-driver)
- [4-10: DMA 기초](/blog/embedded/modern-recipes/part4-10-dma-basics)
- [5-06: SPI OLED](/blog/embedded/modern-recipes/part5-06-spi-oled)
- [12-09: zero-copy 카메라](/blog/embedded/modern-recipes/part12-09-zero-copy-camera)
