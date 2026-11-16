---
title: "SPI OLED 제어 — SSD1306·Frame Buffer·Page 단위 갱신"
slug: "embedded/modern-recipes/part5-06-spi-oled"
date: 2026-04-14T09:54:00
description: "128×64 OLED·framebuffer·page mode·partial update."
series: "Modern Embedded Recipes"
seriesOrder: 54
tags: [recipes, peripheral, oled]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> **"128×64 화면은 1024 byte입니다. RAM에 다 그린 뒤 SPI로 한 번에 보냅니다."** SSD1306의 GDDRAM은 page 8개 × column 128개이고, byte 하나가 세로 8 pixel입니다.

## 어떤 상황에서 쓰나

센서 값의 추세 그래프, 상태 아이콘, 몇 줄의 글자를 함께 보여야 해서 character LCD로는 모자란 곳에 SSD1306 controller를 쓴 128×64 OLED 모듈을 씁니다.

이 글은 STM32F407의 SPI1으로 SSD1306을 4-wire SPI mode로 초기화하고, MCU RAM의 framebuffer에 점·선·글자를 그린 뒤 화면으로 보냅니다. controller 수치는 Solomon Systech SSD1306 datasheet Rev 1.5(Aug 2010)에서 가져왔습니다. 코드는 arm-none-eabi-gcc 16.2.0으로 `-Wall -Wextra` 경고 없이 빌드되고, host에서 SPI byte 흐름을 받아 GDDRAM을 흉내 내는 harness로 돌려 화면 내용이 framebuffer와 같은지 확인했습니다. OLED 모듈로 한 측정은 없습니다.

## 핵심 개념

### 4-wire SPI 신호

SSD1306은 BS[2:0] 핀으로 interface를 고르므로, 같은 controller라도 모듈이 I2C로 배선돼 있으면 SPI 코드로는 움직이지 않습니다. 4-wire SPI에서 쓰는 신호는 다음과 같습니다.

| SSD1306 | STM32F407 | datasheet 설명 |
|---|---|---|
| SCLK (D0) | PA5 (SPI1_SCK) | "SDIN is shifted into an 8-bit shift register on every rising edge of SCLK in the order of D7, D6, ... D0." |
| SDIN (D1) | PA7 (SPI1_MOSI) | 위와 같음 |
| CS# | PA4 | chip select, active LOW |
| D/C# | PA3 | "A LOW in D/C# indicates COMMAND read/write and HIGH in D/C# indicates DATA read/write." |
| RES# | PA2 | LOW면 chip 초기화, 동작 중에는 HIGH |

rising edge에서 읽고 MSB부터이므로 STM32 SPI mode 0, MSB-first, 8-bit입니다. SPI·GPIO 초기화는 [4-08](/blog/embedded/modern-recipes/part4-08-spi-driver)의 `spi_init_master()`를 씁니다.

### SPI clock 상한

datasheet Table 13-4의 4-wire serial timing(VDD 1.65 ~ 3.3 V)에서 clock cycle time tcycle이 최소 100 ns이므로 SCLK는 10 MHz 이하입니다. PCLK2 = 84 MHz에서 4-08의 `BR` = 2는 10.5 MHz라 이 상한을 넘고, `BR` = 3이 5.25 MHz입니다. 이 글은 `BR` = 3을 씁니다.

| `BR` | SCLK | 1024 byte 전송 시간 |
|---|---|---|
| 2 | 10.5 MHz | 상한 초과 |
| 3 | 5.25 MHz | 8192 bit / 5.25 MHz = 1560 µs |

### GDDRAM layout

datasheet 8.7절: GDDRAM은 "128 x 64 bits and the RAM is divided into eight pages, from PAGE0 to PAGE7"이고, byte 하나를 쓰면 현재 column의 세로 8 row가 채워집니다. "Data bit D0 is written into the top row, while data bit D7 is written into bottom row"입니다(row·column remap이 없을 때).

| Page | row |
|---|---|
| 0 | 0–7 |
| 1 | 8–15 |
| … | … |
| 7 | 56–63 |

8 page × 128 column × 1 byte = 1024 byte입니다. pixel (x, y)는 `fb[(y / 8) * 128 + x]`의 bit `y % 8`입니다. 아래 init의 `0xC8`(COM 역순 scan)과 `0xA1`(column 역순)은 패널 배선에 맞춰 고르는 값이라, 모듈에 따라 상하·좌우가 뒤집혀 보이면 `C0h`·`A0h`로 바꿉니다.

### Memory addressing mode

`20h`의 A[1:0]로 고릅니다.

| A[1:0] | mode | 쓰기 후 이동 (datasheet 10.1.3) |
|---|---|---|
| 00b | Horizontal | column +1, column 끝에서 column start로 돌아가고 page +1 |
| 01b | Vertical | page +1, page 끝에서 page start로 돌아가고 column +1 |
| 10b | Page (reset 값) | column +1, page는 그대로 |

horizontal mode에서 column 0–127, page 0–7 범위를 잡으면 1024 byte를 한 번에 이어서 보낼 수 있습니다.

### 전원 순서와 charge pump

datasheet 8.9.2절의 "Power ON sequence with Charge Pump Application"은 VDD → VBAT 순서로 켜고, RES#를 3 µs 이상 LOW로 둔 뒤 HIGH로 올리고, "8Dh 14h for enabling charge pump" → "AFh for display ON"을 보내면 "SEG/COM will be ON after 100ms"라고 합니다. charge pump는 VBAT(3.3 ~ 4.2 V)에서 패널 구동 전압 VCC(7.5 V)를 만듭니다. 패널 VCC를 외부에서 넣는 모듈이라면 8.9.1절의 다른 순서를 따르므로, 모듈 회로가 어느 쪽인지 먼저 봅니다.

### Init sequence

```c
const uint8_t ssd1306_init[] = {
    0xAE,                   // display OFF
    0xD5, 0x80,             // clock: divide ratio 1, FOSC setting 1000b (reset values)
    0xA8, 0x3F,             // multiplex ratio 64
    0xD3, 0x00,             // display offset 0
    0x40,                   // display start line 0
    0x8D, 0x14,             // enable charge pump
    0x20, 0x00,             // horizontal addressing mode
    0xA1,                   // segment remap: column 127 -> SEG0
    0xC8,                   // COM scan: COM[N-1] -> COM0
    0xDA, 0x12,             // COM pins: alternative, no left/right remap (reset value)
    0x81, 0xCF,             // contrast 0xCF (reset 0x7F)
    0xD9, 0xF1,             // pre-charge: phase 1 = 1 DCLK, phase 2 = 15 DCLK
    0xDB, 0x20,             // VCOMH ~0.77 x VCC (reset value)
    0xA4,                   // output follows RAM content
    0xA6,                   // normal display
    0xAF,                   // display ON
};
```

각 값은 datasheet 9장 command table의 정의와 RESET 값으로 주석을 달았습니다. reset 값이 아닌 contrast `0xCF`와 pre-charge `0xF1`은 128×64 모듈 사양서 UG-2864HSWEG01의 charge pump 초기화 예와 같은 값입니다. `DBh`는 table에 00h·20h·30h 세 값만 있어 20h(reset)를 썼습니다.

frame rate는 datasheet 8.3절의 FFRM = FOSC / (D × K × MUX)입니다. K = phase 1 + phase 2 + BANK0 pulse width(50)이므로 위 설정에서 K = 1 + 15 + 50 = 66입니다. FOSC typ 370 kHz(Table 13-1, VDD 2.8 V)로 계산하면 370000 / (1 × 66 × 64) ≈ 87.6 Hz이고, FOSC 범위 333 ~ 407 kHz에 따라 78.8 ~ 96.4 Hz입니다.

## 코드 예제

`gpio_init()`은 [4-03](/blog/embedded/modern-recipes/part4-03-gpio-driver), `delay_ms()`는 [4-06](/blog/embedded/modern-recipes/part4-06-systick-timer), `spi_init_master()`·`spi_xfer8()`은 [4-08](/blog/embedded/modern-recipes/part4-08-spi-driver)의 것입니다.

### 1. Low-level send

```c
// CS=PA4, DC=PA3, RES=PA2 + SPI1 (PA5 SCK, PA7 MOSI)
static void oled_send_cmd(uint8_t cmd) {
    GPIOA->BSRR = (1u << (3+16));   // DC=0 (command)
    GPIOA->BSRR = (1u << (4+16));   // CS=0
    spi_xfer8(cmd);
    while (SPI1->SR & SPI_SR_BSY);
    GPIOA->BSRR = (1u << 4);        // CS=1
}

static void oled_send_data(const uint8_t *data, uint16_t n) {
    GPIOA->BSRR = (1u << 3);        // DC=1 (data)
    GPIOA->BSRR = (1u << (4+16));   // CS=0
    for (uint16_t i = 0; i < n; i++) spi_xfer8(data[i]);
    while (SPI1->SR & SPI_SR_BSY);
    GPIOA->BSRR = (1u << 4);        // CS=1
}
```

### 2. Init

```c
void oled_init(void) {
    spi_init_master(3);             // 84 MHz / 16 = 5.25 MHz (tcycle >= 100 ns)
    gpio_init(GPIOA, 2, &(gpio_config_t){.mode=GPIO_MODE_OUTPUT});  // RES#
    gpio_init(GPIOA, 3, &(gpio_config_t){.mode=GPIO_MODE_OUTPUT});  // D/C#

    // Hardware reset: RES# low >= 3 us
    GPIOA->BSRR = (1u << (2+16));
    delay_ms(1);
    GPIOA->BSRR = (1u << 2);
    delay_ms(1);

    for (size_t i = 0; i < sizeof(ssd1306_init); i++) {
        oled_send_cmd(ssd1306_init[i]);
    }
    delay_ms(100);                  // SEG/COM on after 100 ms (tAF)
}
```

`spi_init_master()`가 CS(PA4)를 출력으로 만들고 HIGH로 둡니다.

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
    uint16_t idx = (uint16_t)((y / 8) * OLED_W + x);
    uint8_t  bit = (uint8_t)(1u << (y % 8));
    if (on) fb[idx] |= bit;
    else    fb[idx] &= (uint8_t)~bit;
}

void oled_flush(void) {
    oled_send_cmd(0x21); oled_send_cmd(0); oled_send_cmd(127);   // column 0..127
    oled_send_cmd(0x22); oled_send_cmd(0); oled_send_cmd(7);     // page 0..7
    oled_send_data(fb, sizeof(fb));
}
```

모든 그리기는 `fb`만 바꾸고, 마지막에 `oled_flush()` 한 번으로 화면에 옮깁니다. `21h`·`22h`로 범위를 매번 다시 잡으므로, 직전 전송이 중간에 끊겨 주소 pointer가 어긋나 있어도 첫 byte는 (column 0, page 0)에 들어갑니다.

### 4. Line draw (Bresenham)

```c
void oled_line(int16_t x0, int16_t y0, int16_t x1, int16_t y1) {
    int16_t dx = (int16_t)abs(x1 - x0), sx = x0 < x1 ? 1 : -1;
    int16_t dy = (int16_t)-abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
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

글꼴 표는 글자마다 column 5개, 각 byte의 bit 0이 맨 위 row인 형식입니다. 아래 `font5x7.h`는 host 실행에 쓴 'H'와 'I' 두 글자만 채운 예시이고, 나머지 글자는 같은 형식으로 채웁니다.

```c
/* font5x7.h */
static const uint8_t font5x7[95][5] = {
    ['H' - 32] = {0x7F, 0x08, 0x08, 0x08, 0x7F},
    ['I' - 32] = {0x00, 0x41, 0x7F, 0x41, 0x00},
};
```

```c
#include "font5x7.h"   // 95 characters x 5 bytes

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
        x += 6;                     // 5 columns + 1 blank
    }
}
```

### 6. DMA flush

5.25 MHz에서 1024 byte의 SCLK 시간만 1560 µs이고, byte마다 RXNE를 기다리는 polling `oled_send_data()`는 그보다 오래 CPU를 잡습니다. DMA로 보내면 그 시간 동안 CPU가 다른 일을 합니다.

```c
volatile int oled_dma_busy;

void oled_dma_init(void) {
    // SPI1_TX = DMA2 Stream3 channel 3 (same mapping as 4-08)
    RCC->AHB1ENR |= RCC_AHB1ENR_DMA2EN;
    DMA2_Stream3->CR  = 0;
    while (DMA2_Stream3->CR & DMA_SxCR_EN);
    DMA2_Stream3->PAR = (uint32_t)&SPI1->DR;
    DMA2_Stream3->CR  = (3u << DMA_SxCR_CHSEL_Pos)
                      | DMA_SxCR_DIR_0          // memory -> peripheral
                      | DMA_SxCR_MINC
                      | DMA_SxCR_TCIE;
    NVIC_EnableIRQ(DMA2_Stream3_IRQn);
}

void oled_flush_dma(void) {
    oled_send_cmd(0x21); oled_send_cmd(0); oled_send_cmd(127);
    oled_send_cmd(0x22); oled_send_cmd(0); oled_send_cmd(7);

    oled_dma_busy = 1;
    GPIOA->BSRR = (1u << 3);              // DC=1
    GPIOA->BSRR = (1u << (4+16));         // CS=0

    DMA2->LIFCR = 0x3Fu << 22;            // clear stream 3 flags
    DMA2_Stream3->M0AR = (uint32_t)fb;
    DMA2_Stream3->NDTR = sizeof(fb);
    DMA2_Stream3->CR  |= DMA_SxCR_EN;
    SPI1->CR2 |= SPI_CR2_TXDMAEN;
}

void DMA2_Stream3_IRQHandler(void) {
    DMA2->LIFCR = DMA_LIFCR_CTCIF3;
    SPI1->CR2 &= ~SPI_CR2_TXDMAEN;
    while (!(SPI1->SR & SPI_SR_TXE));
    while (SPI1->SR & SPI_SR_BSY);        // last byte leaves the shifter
    (void)SPI1->DR;                       // clear OVR: RX was never read
    (void)SPI1->SR;
    GPIOA->BSRR = (1u << 4);              // CS=1
    oled_dma_busy = 0;
}
```

stream·channel 번호는 4-08처럼 ST STM32F412ZG-Nucleo 예제를 따른 것입니다. F407의 DMA request 표가 있는 RM0090은 이 글에서 열어 보지 못했으므로, F407에서 이 번호가 맞는지는 이 글의 자료로 확인되지 않았습니다. 완료 처리 순서는 HAL v1.8.3 `SPI_DMATransmitCplt()`를 따랐습니다. HAL도 `TXDMAEN`을 끄고 `SPI_EndRxTxTransaction()`으로 BSY를 기다린 뒤, "Clear overrun flag in 2 Lines communication mode because received data is not read" 주석과 함께 OVR을 지웁니다. `oled_dma_busy`가 1인 동안 `fb`를 고치면 전송 중인 화면이 섞이므로, 다음 그리기는 0이 된 뒤 시작합니다.

## 측정 / 동작 확인

### host에서 화면 내용 확인

init 표와 1~5절 코드를 host에서 돌렸습니다. harness는 `BSRR` 쓰기로 D/C#·CS# 상태를 기록하고, `spi_xfer8()`이 받은 byte를 SSD1306 쪽에서 해석합니다. command면 `20h`·`21h`·`22h`를 처리하고, data면 horizontal mode 규칙대로 GDDRAM에 쓰고 pointer를 옮깁니다. 끝나면 GDDRAM이 `fb`와 같은지 비교하고 왼쪽 위 32 × 16 pixel을 찍습니다.

```c
/* oled_host.c */
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

typedef struct { uint32_t odr; } port_t;
static port_t PA;
#define GPIOA (&PA)
static struct { uint32_t SR; } spi1;
#define SPI1 (&spi1)
#define SPI_SR_BSY 0x80u
#define BSRR_WRITE(p, v) do { (p)->odr &= ~((v) >> 16); (p)->odr |= (v) & 0xFFFF; } while (0)

static uint8_t ram[8][128];
static int mode = 2, col, page, c0, c1 = 127, p0, p1 = 7;
static int cur, nargs, got, args[2], ncmd, ndata;

static int arg_count(uint8_t c) {            /* datasheet command table */
    switch (c) {
    case 0x21: case 0x22: return 2;
    case 0x20: case 0x81: case 0x8D: case 0xA8: case 0xD3:
    case 0xD5: case 0xD9: case 0xDA: case 0xDB: return 1;
    default: return 0;
    }
}

uint8_t spi_xfer8(uint8_t b) {
    if (PA.odr & (1u << 3)) {                  /* D/C# = 1: GDDRAM data */
        ram[page][col] = b; ndata++;
        if (mode == 0 && ++col > c1) { col = c0; if (++page > p1) page = p0; }
        return 0;
    }
    ncmd++;
    if (nargs) {                               /* argument byte */
        args[got++] = b;
        if (got < nargs) return 0;
        if (cur == 0x20) mode = args[0] & 3;
        if (cur == 0x21) { c0 = col = args[0]; c1 = args[1]; }
        if (cur == 0x22) { p0 = page = args[0]; p1 = args[1]; }
        nargs = 0;
        return 0;
    }
    cur = b; got = 0; nargs = arg_count(b);
    return 0;
}
static void delay_ms(uint32_t ms) { (void)ms; }
static void spi_init_master(uint32_t div) { (void)div; }
#define gpio_init(...) ((void)0)

#include "oled_post.inc"   /* init table + blocks 1-5 (font5x7.h included by
                              block 5), "X->BSRR = v;" -> BSRR_WRITE(X, v); */

int main(void) {
    oled_init();
    oled_clear();
    oled_line(0, 0, 31, 15);
    oled_text(2, 8, "HI");
    oled_flush();
    printf("mode=%d cmd bytes=%d data bytes=%d gddram==fb: %s\n",
           mode, ncmd, ndata, memcmp(ram, fb, sizeof fb) ? "NO" : "yes");
    for (int y = 0; y < 16; y++) {
        for (int x = 0; x < 32; x++)
            putchar(ram[y / 8][x] >> (y % 8) & 1 ? '#' : '.');
        putchar('\n');
    }
    return 0;
}
```

```bash
clang -O2 -Wall -o oled_host oled_host.c && ./oled_host
```

```text
mode=0 cmd bytes=31 data bytes=1024 gddram==fb: yes
##..............................
..##............................
....##..........................
......##........................
........##......................
..........##....................
............##..................
..............##................
..#...#..###....##..............
..#...#...#.......##............
..#...#...#.........##..........
..#####...#...........##........
..#...#...#.............##......
..#...#...#...............##....
..#...#..###................##..
..............................##
```

GDDRAM이 `fb`와 byte 단위로 같고, 선은 (0, 0)에서 (31, 15)까지, "HI"는 x = 2와 8에서 시작하는 5 column 글자로 찍혔습니다. command byte 수는 init 표 25 byte와 flush의 6 byte를 합한 31입니다.

### 보드에서

화면이 켜지지 않으면 모듈의 전원 회로가 charge pump(VBAT)형인지 외부 VCC형인지부터 봅니다. charge pump형인데 `8Dh 14h`가 빠지면 패널 구동 전압이 생기지 않습니다. 그다음 scope로 CS#·D/C#·SCLK를 보면, flush 한 번에 CS# low 구간이 command 6개와 data 1개, data 구간이 SCLK 8192 clock입니다.

## 자주 보는 함정

> ⚠️ SPI clock이 10 MHz를 넘음

SCLK 주기가 tcycle 최소 100 ns보다 짧으면 datasheet가 보증하는 범위 밖입니다. PCLK2 84 MHz에서 /8은 10.5 MHz라 /16을 씁니다.

> ⚠️ D/C# 전환 시점

D/C#는 byte의 마지막 bit(D0)를 받을 때 읽히므로("D/C# is sampled on every eighth clock"), 다음 byte를 위해 D/C#를 바꾸기 전에 BSY가 0이 될 때까지 기다립니다. 위 `oled_send_cmd()`·`oled_send_data()`는 CS#를 올리기 전에 BSY를 확인합니다.

> ⚠️ flush 전에 주소 범위를 다시 잡지 않음

horizontal mode라도 `21h`·`22h` 범위를 다시 잡지 않으면, 이전 전송이 남긴 pointer 위치부터 써집니다.

> ⚠️ DMA 전송 중 framebuffer 수정

`oled_dma_busy`가 0이 되기 전에 `fb`를 바꾸면 그 일부만 화면에 들어갑니다. 바뀐 것이 없으면 flush를 건너뛰는 dirty flag를 두면 SPI 전송 자체가 줄어듭니다.

> ⚠️ 글자 줄 간격

7 row 글자를 8 pixel 간격으로 놓으면 줄 사이에 한 row가 비고, 한 줄이 page 하나에 들어갑니다. y를 8의 배수로 두면 한 글자가 두 page에 걸치지 않습니다.

## 정리

- GDDRAM은 **8 page × 128 column × 1 byte = 1024 byte**, D0가 위쪽 row.
- SCLK는 **tcycle 100 ns → 10 MHz 이하**. 84 MHz PCLK2에서 /16(5.25 MHz), 1024 byte에 1560 µs.
- charge pump 모듈은 **RES# low 3 µs 이상 → `8Dh 14h` → `AFh`**, 100 ms 뒤 표시.
- horizontal mode + `21h`·`22h` 범위로 **framebuffer를 한 번에 전송**.
- DMA flush는 **TXDMAEN 해제 → BSY 대기 → OVR 정리 → CS# high** 순서.

다음 편은 **TFT display**입니다. parallel RGB, LTDC, framebuffer, double buffering을 다룹니다.

## 관련 항목

- [4-08: SPI 드라이버](/blog/embedded/modern-recipes/part4-08-spi-driver)
- [4-10: DMA 기초](/blog/embedded/modern-recipes/part4-10-dma-basics)
- [5-05: Character LCD](/blog/embedded/modern-recipes/part5-05-character-lcd)
- [5-07: TFT 디스플레이](/blog/embedded/modern-recipes/part5-07-tft-display)
