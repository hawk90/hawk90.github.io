---
title: "5-06: SPI OLED (SSD1306)"
date: 2026-05-14T06:00:00
description: "128×64 OLED·framebuffer·page mode·partial update."
series: "Modern Embedded Recipes"
seriesOrder: 54
tags: [recipes, peripheral, oled]
draft: false
---

## 한 줄 요약

> **"128×64 = 1024 byte framebuffer. RAM에 그리고 SPI로 한 번에 송신."** SSD1306 OLED는 임베디드 graphic display의 기본.

## 어떤 상황에서 쓰나

작은 *graphic display*가 필요할 때 — 산업 sensor의 trend chart, smart watch, 3D printer status, BLE module debug screen. SSD1306 controller가 들어간 128×64 또는 128×32 OLED 모듈은 *1-3 달러*에 SPI/I2C 둘 다 지원합니다. 더 큰 화면이 필요하면 SH1106 (132×64), SSD1309 (128×64 더 큰 module).

이 글은 SPI OLED 128×64를 STM32에 연결하고 framebuffer 기반 graphics를 구현합니다.

## 핵심 개념

### SSD1306 핀 (SPI 4-wire)

```text
OLED        역할
─────       ────
GND         GND
VCC         3.3V
SCL         SPI clock
SDA         SPI MOSI
RES         reset (active-low)
DC          0=command, 1=data
CS          chip select (active-low)
```

I2C 변종은 SDA·SCL 2 wire만 + address pin 1개.

### Framebuffer layout

SSD1306은 128×64 pixel을 *"page" 8개*로 나눕니다. 한 page는 *8 row × 128 column*, 한 column이 8 vertical pixel = 1 byte.

```text
Page 0: rows 0-7   (1 byte vertical per col)
Page 1: rows 8-15
...
Page 7: rows 56-63

Total: 8 page × 128 col × 1 byte = 1024 bytes
```

byte의 *LSB가 top row*입니다 (page 0의 0xFF = column 전체 ON, 0x01 = top pixel만).

### Memory addressing mode

```text
Horizontal: col 증가 후 page wrap → 좌상부터 우하까지 일렬
Vertical:   page 증가 후 col wrap
Page:       한 page 안에서만, page는 수동 set
```

전체 framebuffer 한 번에 보내려면 *horizontal mode*가 효율적.

### Init sequence

SSD1306 datasheet의 init sequence는 *charge pump enable*이 핵심. 잘못하면 *깜빡임이나 dim*.

```c
const uint8_t ssd1306_init[] = {
    0xAE,                   // display OFF
    0xD5, 0x80,             // clock divider
    0xA8, 0x3F,             // multiplex 1/64
    0xD3, 0x00,             // display offset 0
    0x40,                   // start line 0
    0x8D, 0x14,             // charge pump enable
    0x20, 0x00,             // horizontal addressing mode
    0xA1,                   // segment remap (mirror)
    0xC8,                   // COM scan dir (mirror)
    0xDA, 0x12,             // COM pins config
    0x81, 0xCF,             // contrast
    0xD9, 0xF1,             // pre-charge
    0xDB, 0x40,             // VCOMH deselect level
    0xA4,                   // output follows RAM
    0xA6,                   // normal display (not inverted)
    0xAF,                   // display ON
};
```

## 코드 예제

### 1. Low-level send

```c
// CS=PA4, DC=PA3, RES=PA2 + SPI1 (PA5/6/7)
static void oled_send_cmd(uint8_t cmd) {
    GPIOA->BSRR = (1u << (3+16));   // DC=0 (command)
    GPIOA->BSRR = (1u << (4+16));   // CS=0
    spi_xfer8(cmd);
    while (SPI1->SR & SPI_SR_BSY);
    GPIOA->BSRR = (1u << 4);
}

static void oled_send_data(const uint8_t *data, uint16_t n) {
    GPIOA->BSRR = (1u << 3);        // DC=1 (data)
    GPIOA->BSRR = (1u << (4+16));   // CS=0
    for (uint16_t i = 0; i < n; i++) spi_xfer8(data[i]);
    while (SPI1->SR & SPI_SR_BSY);
    GPIOA->BSRR = (1u << 4);
}
```

### 2. Init

```c
void oled_init(void) {
    // GPIO setup
    gpio_init(GPIOA, 2, &(gpio_config_t){.mode=GPIO_MODE_OUTPUT});  // RES
    gpio_init(GPIOA, 3, &(gpio_config_t){.mode=GPIO_MODE_OUTPUT});  // DC
    gpio_init(GPIOA, 4, &(gpio_config_t){.mode=GPIO_MODE_OUTPUT});  // CS
    GPIOA->BSRR = (1u << 4);    // CS high (deselect)

    // Hardware reset
    GPIOA->BSRR = (1u << (2+16));
    delay_ms(10);
    GPIOA->BSRR = (1u << 2);
    delay_ms(10);

    // SPI is already initialized (e.g., 10 MHz, mode 0)
    for (size_t i = 0; i < sizeof(ssd1306_init); i++) {
        oled_send_cmd(ssd1306_init[i]);
    }
}
```

### 3. Framebuffer + flush

```c
#define OLED_W 128
#define OLED_H 64

static uint8_t fb[OLED_W * OLED_H / 8];   // 1024 bytes

void oled_clear(void) {
    memset(fb, 0, sizeof(fb));
}

void oled_pixel(int16_t x, int16_t y, int on) {
    if (x < 0 || x >= OLED_W || y < 0 || y >= OLED_H) return;
    uint16_t idx = (y / 8) * OLED_W + x;
    uint8_t  bit = 1u << (y % 8);
    if (on) fb[idx] |= bit;
    else    fb[idx] &= ~bit;
}

void oled_flush(void) {
    oled_send_cmd(0x21); oled_send_cmd(0); oled_send_cmd(127);   // col range
    oled_send_cmd(0x22); oled_send_cmd(0); oled_send_cmd(7);     // page range
    oled_send_data(fb, sizeof(fb));
}
```

framebuffer는 RAM 1 KB. 모든 그리기는 fb 수정만, *마지막에 flush 한 번*으로 화면 갱신.

### 4. Line draw (Bresenham)

```c
void oled_line(int16_t x0, int16_t y0, int16_t x1, int16_t y1) {
    int16_t dx = abs(x1 - x0), sx = x0 < x1 ? 1 : -1;
    int16_t dy = -abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
    int16_t err = dx + dy;

    while (1) {
        oled_pixel(x0, y0, 1);
        if (x0 == x1 && y0 == y1) break;
        int16_t e2 = err * 2;
        if (e2 >= dy) { err += dy; x0 += sx; }
        if (e2 <= dx) { err += dx; y0 += sy; }
    }
}
```

### 5. Text — 5×7 bitmap font

```c
#include "font5x7.h"   // 95 character × 5 byte each

void oled_char(int16_t x, int16_t y, char c) {
    if (c < 32 || c > 126) c = '?';
    const uint8_t *glyph = font5x7[c - 32];
    for (int col = 0; col < 5; col++) {
        uint8_t byte = glyph[col];
        for (int row = 0; row < 7; row++) {
            if (byte & (1 << row))
                oled_pixel(x + col, y + row, 1);
        }
    }
}

void oled_text(int16_t x, int16_t y, const char *s) {
    while (*s) {
        oled_char(x, y, *s++);
        x += 6;
    }
}
```

### 6. Partial update — DMA

전체 1024 byte를 매 frame 보내면 *10 MHz SPI에서 ~820 µs*. 60 Hz update면 5% CPU. *DMA*로 옮기면 0%.

```c
void oled_flush_dma(void) {
    oled_send_cmd(0x21); oled_send_cmd(0); oled_send_cmd(127);
    oled_send_cmd(0x22); oled_send_cmd(0); oled_send_cmd(7);

    GPIOA->BSRR = (1u << 3);              // DC=1
    GPIOA->BSRR = (1u << (4+16));         // CS=0

    DMA2_Stream3->M0AR = (uint32_t)fb;
    DMA2_Stream3->NDTR = sizeof(fb);
    DMA2_Stream3->CR  |= DMA_SxCR_EN;
}

void DMA2_Stream3_IRQHandler(void) {
    DMA2->LIFCR = DMA_LIFCR_CTCIF3;
    while (SPI1->SR & SPI_SR_BSY);
    GPIOA->BSRR = (1u << 4);              // CS high
}
```

## 측정 / 동작 확인

OLED에 픽셀이 보이면 success. 안 보이면:

1. **VCC** — 3.3V 정확히. 5V는 OLED 파괴.
2. **Init sequence** — charge pump enable (0x8D, 0x14) 확인.
3. **Reset pulse** — 10 ms low 후 10 ms high.
4. **CS / DC 핀** — voltage check, 0/1이 정확히 들어가는지.

scope로 SPI 전송 확인.

```text
update 한 번 (1024 byte @ 10 MHz):
  ┌── 820 µs ──┐
  CS low | data... | CS high
  
60 Hz update:
  매 16.6 ms마다 위 transaction 발생
```

## 자주 보는 함정

> ⚠️ Charge pump 안 켬

display ON인데 *너무 dim*하면 0x8D 0x14 누락 의심.

> ⚠️ DC 핀 잘못 (command과 data 섞임)

random pixel pattern이 보이면 DC mode 토글 오류.

> ⚠️ Address mode 잘못

horizontal mode (0x20 0x00)인데 *col/page set 안 함*. flush 전마다 col/page range 설정.

> ⚠️ Framebuffer를 *직접* SPI로 보냄

framebuffer가 변하지 않았는데 매 frame 보내면 낭비. *dirty flag*로 변경 시만 flush.

> ⚠️ 5×7 font line spacing

7-pixel char를 row 0과 row 7에 배치하면 *겹침*. 줄 간격 8 pixel.

> ⚠️ I2C OLED를 SPI mode 코드로

같은 SSD1306 chip이지만 module에 따라 *I2C 또는 SPI 고정*. 결선과 코드 매칭.

## 정리

- SSD1306 OLED = **128×64 = 1024 byte framebuffer**.
- **8 page × 128 column × 1 byte vertical** layout.
- Init에 **charge pump enable** (0x8D 0x14)가 핵심.
- **Bresenham line + 5×7 font**로 기본 graphics 충분.
- **DMA flush**로 CPU 0%, 60 Hz update.

다음 편은 **TFT display**입니다. parallel RGB, LTDC, framebuffer, double buffering을 다룹니다.

## 관련 항목

- [4-08: SPI 드라이버](/blog/embedded/modern-recipes/part4-08-spi-driver)
- [4-10: DMA 기초](/blog/embedded/modern-recipes/part4-10-dma-basics)
- [5-05: Character LCD](/blog/embedded/modern-recipes/part5-05-character-lcd)
- [5-07: TFT 디스플레이](/blog/embedded/modern-recipes/part5-07-tft-display)
