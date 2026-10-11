---
title: "TFT 디스플레이 구동 — ILI9341 SPI와 STM32F746 LTDC"
slug: "embedded/modern-recipes/part5-07-tft-display"
date: 2026-04-14T09:55:00
description: "픽셀을 패널 GRAM에 둘지 MCU 메모리에 둘지 — ILI9341 SPI 구동, STM32F746 LTDC 타이밍, vertical blanking 이중 버퍼."
series: "Modern Embedded Recipes"
seriesOrder: 55
tags: [recipes, peripheral, tft, display]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> **"TFT 구동은 픽셀을 어느 메모리에 둘지부터 정합니다."** 240×320 RGB565 한 장은 153,600 B로, STM32F407 주 SRAM 영역 128 KiB(131,072 B)보다 큽니다.

## 어떤 상황에서 쓰나

컬러 그래픽 UI를 MCU로 그릴 때 두 경로가 있습니다. 패널 컨트롤러가 화면 메모리를 가진 SPI 패널(ILI9341)이면 MCU는 바뀐 영역의 픽셀만 보내면 됩니다. 컨트롤러 없는 RGB 패널을 LTDC로 구동하면 한 화면 전체가 MCU 쪽 메모리에 있어야 합니다. 이 글은 두 경로를 코드로 보이고, 어느 쪽이 내 MCU의 RAM과 대역에 맞는지 판단하는 숫자를 줍니다.

이 글의 기준은 두 가지입니다.

- SPI 경로: STM32F407, [4-04 클럭 설정](/blog/embedded/modern-recipes/part4-04-clock-setup)의 `clock_init_168mhz()`(SYSCLK 168 MHz, PCLK2 84 MHz)에 SPI1. 패널 쪽은 ILI9341 데이터시트([Adafruit 호스팅 사본](https://cdn-shop.adafruit.com/datasheets/ILI9341.pdf), 표지는 V1.11이지만 개정 이력이 V1.13(2011/07/20)까지 있는 판)의 4-line serial interface입니다.
- LTDC 경로: STM32F746G-DISCO의 RK043FN48H 480×272 패널. 타이밍과 클럭은 ST BSP [`32f746gdiscovery-bsp` v2.1.1](https://github.com/STMicroelectronics/32f746gdiscovery-bsp/tree/v2.1.1)과 [`stm32-rk043fn48h` v1.0.3](https://github.com/STMicroelectronics/stm32-rk043fn48h/blob/v1.0.3/rk043fn48h.h#L58-L74), 레지스터 공식은 [STM32F7 HAL v1.3.3](https://github.com/STMicroelectronics/stm32f7xx-hal-driver/tree/v1.3.3), 레지스터 이름은 [CMSIS `stm32f746xx.h` v1.2.10](https://github.com/STMicroelectronics/cmsis-device-f7/blob/v1.2.10/Include/stm32f746xx.h)을 따릅니다.

## 핵심 개념

### 픽셀이 사는 곳

| 경로 | 픽셀 저장 위치 | MCU가 하는 일 | 대역 한계 |
|------|---------------|--------------|-----------|
| SPI + ILI9341 | 패널 컨트롤러의 GRAM 172,800 B = 240×320×18 bit (데이터시트 p.7, 7.5절) | 창(window)을 지정하고 그 영역 픽셀만 전송 | SCL 쓰기 주기 `twc` ≥ 100 ns, 즉 10 MHz 이하 (18.3.4절, Ta = 25 °C, VDDI = 1.65~3.3 V, VCI = 2.5~3.3 V) |
| LTDC + RGB 패널 | MCU 쪽 framebuffer | framebuffer에 쓰기. LTDC가 매 frame 읽어 송출 | 패널 pixel clock. RK043FN48H BSP 설정은 9.6 MHz |

### RGB565

16-bit 픽셀은 R 5 bit, G 6 bit, B 5 bit입니다. ILI9341 4-line SPI의 16 bit/pixel 형식(7.6.2절, p.63)과 LTDC의 RGB565(`LTDC_PIXEL_FORMAT_RGB565` = 2, [HAL header](https://github.com/STMicroelectronics/stm32f7xx-hal-driver/blob/v1.3.3/Inc/stm32f7xx_hal_ltdc.h#L343))가 같은 배치입니다.

```c
#define RGB565(r, g, b) ((uint16_t)((((r) >> 3) << 11) | (((g) >> 2) << 5) | ((b) >> 3)))
```

| 색 | RGB565 |
|----|--------|
| 흰색 | `0xFFFF` |
| 검정 | `0x0000` |
| 빨강 | `0xF800` |
| 초록 | `0x07E0` |
| 파랑 | `0x001F` |

빨강·파랑 두 값은 아래 "동작 확인"에서 R/B 순서를 가르는 시험값으로 씁니다.

### Framebuffer 크기와 RAM

| 해상도 × 2 B | 한 장 | 두 장 |
|--------------|-------|-------|
| 240 × 320 | 153,600 B (150 KiB) | 307,200 B (300 KiB) |
| 480 × 272 | 261,120 B (255 KiB) | 522,240 B (510 KiB) |

RAM 크기는 CMSIS 템플릿 링커 파일의 RAM 영역에서 읽었습니다.

- **STM32F407**: RAM 영역 0x20000000~0x2001FFFF(131,072 B)와 CCMRAM 영역 0x10000000~0x1000FFFF(65,536 B) ([`stm32f407xx_flash.icf`](https://github.com/STMicroelectronics/cmsis-device-f4/blob/v2.6.9/Source/Templates/iar/linker/stm32f407xx_flash.icf#L9-L12)). 240×320 한 장(153,600 B)도 어느 영역에 들어가지 않습니다. 이 MCU로 ILI9341을 쓰는 것은 화면을 패널 GRAM에 두기 때문입니다.
- **STM32F746**: RAM 영역 0x20000000~0x2004FFFF, 327,680 B (DTCM 64 KiB + SRAM1 240 KiB + SRAM2 16 KiB, [`stm32f746xx_flash.icf`](https://github.com/STMicroelectronics/cmsis-device-f7/blob/v1.2.10/Source/Templates/iar/linker/stm32f746xx_flash.icf#L9-L10), [base 주석](https://github.com/STMicroelectronics/cmsis-device-f7/blob/v1.2.10/Include/stm32f746xx.h#L1131-L1138)). 480×272 두 장(522,240 B)은 이 합보다 크므로 이중 버퍼는 외부 SDRAM에 둡니다. BSP는 framebuffer를 SDRAM 시작 주소 0xC0000000에 두고, SDRAM 크기를 0x800000 B(8 MiB)로 적습니다([`stm32746g_discovery_lcd.h`](https://github.com/STMicroelectronics/32f746gdiscovery-bsp/blob/v2.1.1/stm32746g_discovery_lcd.h#L99), [`stm32746g_discovery_sdram.h`](https://github.com/STMicroelectronics/32f746gdiscovery-bsp/blob/v2.1.1/stm32746g_discovery_sdram.h#L56-L57)).

### Tearing과 이중 버퍼

LTDC는 매 frame framebuffer를 처음부터 끝까지 읽어 내보냅니다. CPU가 같은 버퍼를 고치는 도중에 scan이 지나가면 한 frame 안에 옛 내용과 새 내용이 섞입니다.

- **단일 버퍼**: 메모리는 한 장이지만, 그리는 동안 scan과 겹치면 tearing이 보입니다.
- **이중 버퍼**: 보이지 않는 back 버퍼에 그린 뒤, LTDC가 읽는 주소를 vertical blanking에서 바꿉니다. 메모리는 두 장이 필요합니다. HAL 문서는 vertical blanking reload를 "avoid display flicker"를 위한 선택지로 설명합니다([`stm32f7xx_hal_ltdc.c`](https://github.com/STMicroelectronics/stm32f7xx-hal-driver/blob/v1.3.3/Src/stm32f7xx_hal_ltdc.c#L68-L78)).

## 코드 예제

### 1. ILI9341 SPI driver

전제는 세 가지입니다. SPI1 설정과 `spi_xfer8()`는 [4-08 SPI 드라이버](/blog/embedded/modern-recipes/part4-08-spi-driver)의 "SPI master init"·"Polling transfer", `delay_ms()`는 [4-06 SysTick](/blog/embedded/modern-recipes/part4-06-systick-timer)의 "delay_ms"를 씁니다. 명령·데이터 송신 함수와 핀(CS = PA4, DC = PA3, RES = PA2)의 GPIO 출력 설정은 [5-06 SPI OLED](/blog/embedded/modern-recipes/part5-06-spi-oled)의 "Low-level send"·"Init"과 같고, 여기서는 송신 함수 이름만 `tft_cmd()`·`tft_data()`로 바꿔 씁니다.

SPI 분주는 `twc` ≥ 100 ns를 지키는 가장 빠른 값으로 고릅니다. SPI 클럭은 PCLK2 / 2^(BR+1)이고 BR = 3이 /16입니다(stm32f4xx-hal-driver v1.8.3 [`SPI_BAUDRATEPRESCALER_16`](https://github.com/STMicroelectronics/stm32f4xx-hal-driver/blob/v1.8.3/Inc/stm32f4xx_hal_spi.h#L264-L265)). PCLK2 84 MHz에서 BR = 2는 10 MHz에 가까워 보여도 10.5 MHz(주기 95.2 ns)로 `twc` 위반이고, BR = 3은 5.25 MHz(주기 190.5 ns)로 통과합니다. 이 글의 SCL은 5.25 MHz입니다.

```c
void tft_init(void) {
    spi_init_master(3);               // BR = 3: 84 MHz / 16 = 5.25 MHz (twc >= 100 ns, 18.3.4)

    // Hardware reset: RESX low >= 10 us, reset cancel up to 120 ms (15.4)
    GPIOA->BSRR = (1u << (2+16));
    delay_ms(10);
    GPIOA->BSRR = (1u << 2);
    delay_ms(150);

    tft_cmd(0x01); delay_ms(150);     // SWRESET: >= 5 ms; 120 ms before SLPOUT if sent in Sleep Out (8.2.2)
    tft_cmd(0x11); delay_ms(120);     // SLPOUT: >= 5 ms before next command (8.2.12)

    tft_cmd(0x3A); tft_data((uint8_t[]){0x55}, 1);   // COLMOD: DPI = DBI = 101b, 16 bit/pixel (8.2.33)
    tft_cmd(0x36); tft_data((uint8_t[]){0x48}, 1);   // MADCTL: MX (D6) | BGR (D3) (8.2.29)
    tft_cmd(0x29);                                    // DISPON
}
```

그리기는 CASET·PASET으로 GRAM의 창을 정하고 RAMWR 뒤에 픽셀을 이어 보내는 방식입니다. 화면 전체 칠하기는 창이 화면 전체인 `tft_fill_rect()`입니다.

```c
void tft_set_window(uint16_t x0, uint16_t y0, uint16_t x1, uint16_t y1) {
    tft_cmd(0x2A);                                    // CASET
    tft_data((uint8_t[]){x0 >> 8, x0, x1 >> 8, x1}, 4);
    tft_cmd(0x2B);                                    // PASET
    tft_data((uint8_t[]){y0 >> 8, y0, y1 >> 8, y1}, 4);
    tft_cmd(0x2C);                                    // RAMWR
}

void tft_pixel(uint16_t x, uint16_t y, uint16_t color) {
    tft_set_window(x, y, x, y);
    uint8_t buf[2] = {color >> 8, color};
    tft_data(buf, 2);
}

void tft_fill_rect(uint16_t x0, uint16_t y0, uint16_t x1, uint16_t y1, uint16_t color) {
    tft_set_window(x0, y0, x1, y1);
    uint32_t n = (uint32_t)(x1 - x0 + 1) * (y1 - y0 + 1);
    GPIOA->BSRR = (1u << 3);          // DC = 1 (data)
    GPIOA->BSRR = (1u << (4+16));     // CS = 0
    for (uint32_t i = 0; i < n; i++) {
        spi_xfer8(color >> 8);
        spi_xfer8(color);
    }
    while (SPI1->SR & SPI_SR_BSY);
    GPIOA->BSRR = (1u << 4);          // CS = 1
}

void tft_fill(uint16_t color) { tft_fill_rect(0, 0, 239, 319, color); }
```

전송 시간의 하한은 SCL이 정합니다. 창 하나를 여는 데 명령·주소 11 B(CASET 1 + 4, PASET 1 + 4, RAMWR 1)가 들고, 그 뒤 픽셀마다 2 B입니다. 5.25 MHz에서 따져 보면 이렇습니다.

| 경우 | 보내는 바이트 | SCL 기준 시간 하한 |
|------|--------------|---------------|
| 화면 전체, `tft_fill()` | 11 + 153,600 B | 234.07 ms (갱신은 초당 최대 4.27번) |
| 100×20 영역, `tft_fill_rect()` | 11 + 4,000 B | 6.11 ms |
| 화면 전체를 `tft_pixel()`로 | 76,800 × 13 B | 1.52 s |

`tft_pixel()`은 픽셀 2 B마다 창 11 B를 다시 보내므로 n 픽셀에 13n B, `tft_fill_rect()`는 11 + 2n B입니다. 바이트 비는 13n / (11 + 2n)으로 넓을수록 13/2 = 6.5에 다가가고 넘지 않습니다(100×20 영역 6.48배, 화면 전체 6.4995배). 점 몇 개가 아니면 창을 한 번 열고 이어 보내야 합니다. 반대로 영역을 좁히는 비용은 창마다 11 B뿐이라, SPI 패널에서는 바뀐 사각형만 `tft_fill_rect()`처럼 창으로 보내는 것이 갱신 시간을 줄이는 방법입니다. 표의 값은 SCL 비트 시간만 센 하한이고, `spi_xfer8()`가 바이트마다 하는 RXNE 대기와 명령마다 CS를 올리고 내리는 시간이 더해집니다. [4-10 DMA](/blog/embedded/modern-recipes/part4-10-dma-basics)로 옮겨도 SCL 비트 시간은 그대로이므로 하한은 줄지 않습니다.

`twc` 100 ns가 허용하는 10 MHz에서도 화면 전체의 픽셀 데이터만 1,228,800 bit / 10 MHz = 122.88 ms입니다. 4-08의 분주로는 이 SCL을 낼 수 없고, 데이터시트 경계일 뿐입니다.

### 2. LTDC — STM32F746G-DISCO, RK043FN48H

전제는 두 가지입니다.

- FMC SDRAM 초기화(BSP `BSP_SDRAM_Init()`), LTDC 핀의 alternate function 설정, LCD_DISP(PI12)·LCD_BL_CTRL(PK3)을 high로 올리는 일은 BSP의 `BSP_LCD_MspInit()`·`BSP_LCD_Init()`이 하는 것과 같다고 둡니다([`stm32746g_discovery_lcd.c`](https://github.com/STMicroelectronics/32f746gdiscovery-bsp/blob/v2.1.1/stm32746g_discovery_lcd.c#L190-L199), [핀 정의](https://github.com/STMicroelectronics/32f746gdiscovery-bsp/blob/v2.1.1/stm32746g_discovery_lcd.h#L147-L154)).
- PLLSAI에는 자기 입력 분주가 없고(`PLLSAICFGR`에는 N·P·Q·R 필드만 있음), BSP 주석은 그 입력을 `HSE_VALUE/PLL_M`, 즉 main PLL과 같은 PLLM을 거친 값으로 적습니다. 이 입력이 1 MHz가 되도록 main PLL이 설정돼 있다고 둡니다([`BSP_LCD_ClockConfig()`](https://github.com/STMicroelectronics/32f746gdiscovery-bsp/blob/v2.1.1/stm32746g_discovery_lcd.c#L1405-L1412)). 아래의 9.6 MHz와 그 뒤 모든 주파수가 이 전제에 기댑니다.

```c
#define LCD_W   480
#define LCD_H   272
#define HSW     41      // RK043FN48H_HSYNC
#define HBP     13      // RK043FN48H_HBP
#define HFP     32      // RK043FN48H_HFP
#define VSW     10      // RK043FN48H_VSYNC
#define VBP     2       // RK043FN48H_VBP
#define VFP     2       // RK043FN48H_VFP
#define LCD_FB_ADDR 0xC0000000UL     // LCD_FB_START_ADDRESS (SDRAM)

static void pllsai_9m6(void) {
    // PLLSAI input 1 MHz (HSE / PLLM) x 192 / R 5 / DIVR 4 = 9.6 MHz
    RCC->CR &= ~RCC_CR_PLLSAION;
    while (RCC->CR & RCC_CR_PLLSAIRDY) { }
    RCC->PLLSAICFGR = (RCC->PLLSAICFGR & ~(RCC_PLLSAICFGR_PLLSAIN | RCC_PLLSAICFGR_PLLSAIR))
                    | (192u << RCC_PLLSAICFGR_PLLSAIN_Pos)
                    | (5u   << RCC_PLLSAICFGR_PLLSAIR_Pos);
    RCC->DCKCFGR1 = (RCC->DCKCFGR1 & ~RCC_DCKCFGR1_PLLSAIDIVR)
                  | RCC_DCKCFGR1_PLLSAIDIVR_0;   // RCC_PLLSAIDIVR_4
    RCC->CR |= RCC_CR_PLLSAION;
    while (!(RCC->CR & RCC_CR_PLLSAIRDY)) { }
}
```

`ltdc_init()`은 픽셀 클럭을 켠 뒤 극성·타이밍·배경색을 쓰고 LTDC를 켜고, 마지막에 layer 1을 화면 전체 크기의 RGB565 창으로 설정합니다. 극성·배경색과 layer의 alpha·blending 값은 BSP `BSP_LCD_Init()`·`BSP_LCD_LayerRgb565Init()`이 HAL에 넘기는 값을 그대로 씁니다.

```c
void ltdc_init(void) {
    pllsai_9m6();
    RCC->APB2ENR |= RCC_APB2ENR_LTDCEN;

    // Polarity: HS, VS, DE active low, PC input (all 0)
    LTDC->GCR &= ~(LTDC_GCR_HSPOL | LTDC_GCR_VSPOL | LTDC_GCR_DEPOL | LTDC_GCR_PCPOL);
    LTDC->SSCR = ((HSW - 1) << 16) | (VSW - 1);
    LTDC->BPCR = ((HSW + HBP - 1) << 16) | (VSW + VBP - 1);
    LTDC->AWCR = ((HSW + HBP + LCD_W - 1) << 16) | (VSW + VBP + LCD_H - 1);
    LTDC->TWCR = ((HSW + HBP + LCD_W + HFP - 1) << 16) | (VSW + VBP + LCD_H + VFP - 1);
    LTDC->BCCR = 0;                                            // background black
    NVIC_EnableIRQ(LTDC_IRQn);                                 // for ltdc_swap(); TE/FU IRQs not enabled
    LTDC->GCR |= LTDC_GCR_LTDCEN;

    // Layer 1: full-screen window, RGB565
    LTDC_Layer1->WHPCR  = ((HSW + HBP - 1 + LCD_W) << 16) | (HSW + HBP - 1 + 1);
    LTDC_Layer1->WVPCR  = ((VSW + VBP - 1 + LCD_H) << 16) | (VSW + VBP - 1 + 1);
    LTDC_Layer1->PFCR   = 2;                                   // RGB565
    LTDC_Layer1->DCCR   = 0;                                   // default color, alpha 0
    LTDC_Layer1->CACR   = 255;                                 // constant alpha
    LTDC_Layer1->BFCR   = 0x600 | 0x7;                         // BF1 = BF2 = PAxCA
    LTDC_Layer1->CFBAR  = LCD_FB_ADDR;
    LTDC_Layer1->CFBLR  = ((LCD_W * 2) << 16) | (LCD_W * 2 + 3);  // pitch | line length + 3
    LTDC_Layer1->CFBLNR = LCD_H;
    LTDC_Layer1->CR    |= LTDC_LxCR_LEN;
    LTDC->SRCR = LTDC_SRCR_IMR;                                // immediate reload
}
```

타이밍 상수는 [`rk043fn48h.h`](https://github.com/STMicroelectronics/stm32-rk043fn48h/blob/v1.0.3/rk043fn48h.h#L58-L74), 누적값 계산·극성·배경색은 BSP [`BSP_LCD_Init()`](https://github.com/STMicroelectronics/32f746gdiscovery-bsp/blob/v2.1.1/stm32746g_discovery_lcd.c#L155-L180), layer 값은 [`BSP_LCD_LayerRgb565Init()`](https://github.com/STMicroelectronics/32f746gdiscovery-bsp/blob/v2.1.1/stm32746g_discovery_lcd.c#L306-L327)에서 왔습니다. 레지스터에 옮기는 식은 HAL [`HAL_LTDC_Init()`](https://github.com/STMicroelectronics/stm32f7xx-hal-driver/blob/v1.3.3/Src/stm32f7xx_hal_ltdc.c#L276-L307)과 [`LTDC_SetConfig()`](https://github.com/STMicroelectronics/stm32f7xx-hal-driver/blob/v1.3.3/Src/stm32f7xx_hal_ltdc.c#L2129-L2197)를 따릅니다(창 시작은 AHBP + 1, `CFBLR` 줄 길이는 바이트 수 + 3, `BFCR` 값은 [`LTDC_BLENDING_FACTOR1/2_PAxCA`](https://github.com/STMicroelectronics/stm32f7xx-hal-driver/blob/v1.3.3/Inc/stm32f7xx_hal_ltdc.h#L323-L333)). `HAL_LTDC_Init()`과 달리 이 코드는 transfer error·FIFO underrun 인터럽트를 켜지 않고, `HAL_LTDC_Init()`도 BSP `stm32746g_discovery_lcd.c`도 하지 않는 `NVIC_EnableIRQ(LTDC_IRQn)`을 부릅니다(아래 `ltdc_swap()`의 reload 인터럽트용).

이 설정의 한 줄은 41 + 13 + 480 + 32 = 566 clock, 한 frame은 10 + 2 + 272 + 2 = 286 line입니다. 9.6 MHz에서 line 주파수는 9,600,000 / 566 = 16.96 kHz, frame 주파수는 16.96 kHz / 286 = 59.30 Hz(16.86 ms)입니다. LTDC가 framebuffer에서 읽는 양은 pixel clock 기준 active 구간에서 9.6 MHz × 2 B = 19.2 MB/s, frame 평균 261,120 B × 59.30 Hz = 15.49 MB/s입니다. CPU가 같은 SDRAM에 그리는 접근은 이 위에 더해집니다.

설정 레지스터 값으로 풀면 `SSCR` = (40, 9), `BPCR` = (53, 11), `AWCR` = (533, 283), `TWCR` = (565, 285), `WHPCR` = (533, 54), `WVPCR` = (283, 12), `CFBLR` = (960, 963)입니다.

### 3. 이중 버퍼 + vertical blanking reload

```c
static uint16_t *const fb[2] = {
    (uint16_t *)LCD_FB_ADDR,
    (uint16_t *)(LCD_FB_ADDR + LCD_W * LCD_H * 2),   // +261,120 B
};
static int front;                    // index LTDC is scanning
static volatile int reload_done;

uint16_t *ltdc_back(void) { return fb[front ^ 1]; }

void ltdc_swap(void) {
    reload_done = 0;
    LTDC_Layer1->CFBAR = (uint32_t)fb[front ^ 1];   // shadow register
    LTDC->ICR = LTDC_ICR_CRRIF;                     // drop a stale reload flag
    LTDC->IER |= LTDC_IER_RRIE;
    LTDC->SRCR = LTDC_SRCR_VBR;                     // apply at next vertical blanking
    while (!reload_done) { }
    front ^= 1;
}

void LTDC_IRQHandler(void) {
    if ((LTDC->ISR & LTDC_ISR_RRIF) && (LTDC->IER & LTDC_IER_RRIE)) {
        LTDC->IER &= ~LTDC_IER_RRIE;
        LTDC->ICR = LTDC_ICR_CRRIF;
        reload_done = 1;
    }
}
```

쓰는 순서는 `ltdc_back()`으로 받은 버퍼에 한 frame을 다 그린 뒤 `ltdc_swap()`을 부르는 것입니다. `ltdc_swap()`은 register reload 인터럽트가 올 때까지, 즉 새 주소가 실제로 적용될 때까지 돌아오지 않습니다. 그 전에 돌아오면 다음 frame을 아직 scan 중인 버퍼에 그리게 되어 tearing이 다시 생깁니다. 앞서 set된 채 남은 reload 플래그가 있으면 인터럽트를 켜는 순간 핸들러가 들어와 기다림이 바로 끝나므로, 인터럽트를 켜기 전에 플래그를 먼저 지웁니다. 인터럽트를 켜고 `SRCR`에 쓰는 순서와 핸들러의 끄기 → 플래그 지우기는 HAL [`HAL_LTDC_Reload()`](https://github.com/STMicroelectronics/stm32f7xx-hal-driver/blob/v1.3.3/Src/stm32f7xx_hal_ltdc.c#L1507-L1535)·[`HAL_LTDC_IRQHandler()`](https://github.com/STMicroelectronics/stm32f7xx-hal-driver/blob/v1.3.3/Src/stm32f7xx_hal_ltdc.c#L713-L736)와 같습니다. 기다리는 시간은 다음 vertical blanking까지라서 위 설정에서 최대 한 frame, 16.86 ms입니다.

## 동작 확인

아래 기대값은 이 글의 설정에서 계산한 값이고, 표의 첫 행이 합격, 나머지가 실패입니다.

**색 순서.** `tft_fill(0xF800)`(빨강)을 칠합니다.

| 화면 | 해석 |
|------|------|
| 빨강 | 합격. MADCTL BGR 비트가 패널과 맞음 |
| 파랑 | 실패. R/B가 뒤바뀜. MADCTL을 0x48 → 0x40으로 바꿔 BGR(D3)만 끕니다. 0x08로 바꾸면 열 주소 순서 MX(D6)까지 바뀝니다 |

**LTDC 타이밍.** 스코프로 LTDC의 HSYNC·VSYNC 신호를 봅니다.

| 관찰 | 해석 |
|------|------|
| HSYNC 16.96 kHz, VSYNC 59.30 Hz | 합격. 위 설정대로 동작 |
| HSYNC 33.92 kHz | 실패. pixel clock이 19.2 MHz로 두 배. 원인은 둘이고 레지스터를 읽어 가립니다. `RCC->DCKCFGR1`의 `PLLSAIDIVR`이 00(/2, `RCC_PLLSAIDIVR_2`)이면 분주 설정 누락, 01이면 `RCC->PLLCFGR`의 `PLLM`이 PLLSAI 입력을 1 MHz가 아니라 2 MHz로 만든 것(HSE_VALUE / PLLM = 2 MHz) |
| 두 신호 모두 없음 | 실패. PLLSAI가 켜지지 않았거나 `LTDCEN`·핀 설정 누락 |

## 자주 보는 함정

> ⚠️ 18 bit/pixel로 남은 채 2바이트씩 전송

COLMOD의 power on·HW reset 기본값은 DPI = DBI = 110b, 즉 18 bit/pixel입니다(8.2.33, p.134). COLMOD 명령을 빠뜨리거나 0x66을 쓰면 4-line SPI는 한 픽셀을 3바이트(R·G·B 각 6 bit)로 받습니다(7.6.2절, p.64). 2바이트씩 보내는 `tft_fill_rect()`와 섞으면 픽셀 경계가 어긋나 색이 깨집니다. 같은 화면을 보내는 데 16 bit 대비 3/2배의 바이트가 듭니다.

## 정리

- 화면 메모리를 **패널 GRAM**에 두면 RAM이 작은 MCU도 되지만, SCL이 갱신 시간을 정하므로 바뀐 영역만 창으로 보냅니다.
- **LTDC**는 한 화면을 MCU 쪽에 두고, 이중 버퍼는 내부 RAM을 넘으면 외부 SDRAM에 둡니다.
- 이중 버퍼의 주소 교체는 **vertical blanking reload를 기다린 뒤** 다음 그리기를 시작해야 tearing이 없습니다.

다음 편은 [5-08: 환경 센서 활용 — BME280 온습압·SHT3x 비교](/blog/embedded/modern-recipes/part5-08-environmental-sensors)입니다.

## 관련 항목

- [4-04: 클럭 설정](/blog/embedded/modern-recipes/part4-04-clock-setup)
- [4-06: SysTick 타이머](/blog/embedded/modern-recipes/part4-06-systick-timer)
- [4-08: SPI 드라이버](/blog/embedded/modern-recipes/part4-08-spi-driver)
- [4-10: DMA 기초](/blog/embedded/modern-recipes/part4-10-dma-basics)
- [5-06: SPI OLED](/blog/embedded/modern-recipes/part5-06-spi-oled)
