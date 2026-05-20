---
title: "Ch 5: 시리얼 통신 4종 — UART·SPI·I2C·I2S"
date: 2026-05-01T05:00:00
description: "주변 디바이스와의 4대 통신. DMA 활용, 인터럽트 vs polling."
series: "ESP32-C3 Mastering"
seriesOrder: 5
tags: [uart, spi, i2c, i2s, dma, esp32-c3]
draft: false
---

## 한 줄 요약

> **"UART는 사람·로그·모뎀, SPI는 빠른 디바이스, I2C는 센서, I2S는 오디오."** 네 가지는 *처리량과 지연*이 다르고 *polling/인터럽트/DMA* 중 어느 것을 쓰느냐가 *CPU 부하를 좌우*합니다.

C3에는 *UART 2개, SPI 2개(GP-SPI 2/3), I2C 1개, I2S 1개*가 있습니다. 페리퍼럴 수가 *ESP32 원조보다 적지만*, *대부분의 IoT 노드*에는 충분합니다. 동시에 *SD card + OLED + 센서 다섯 개*까지 무리 없이 돌릴 수 있습니다.

이 장은 *언제 어느 인터페이스를 고르고*, *데이터 전송을 어떤 메커니즘으로 처리할지*를 정리합니다. 실습은 SSD1306 OLED (I2C)와 SD card (SPI), I2S DAC (PCM5102)을 다룹니다.

## 한눈 비교

| 항목 | UART | SPI | I2C | I2S |
|------|------|-----|-----|-----|
| 컨트롤러 수 (C3) | 2 | 2 (GP-SPI 2, 3) | 1 | 1 |
| 와이어 수 | 2~4 | 4+ (CS는 디바이스당) | 2 | 3~4 |
| 클럭 소스 | 비동기 | 마스터 클럭 | 마스터 클럭 | 마스터 클럭 |
| 최대 속도 | 5 Mbps | 80 MHz (IO MUX 직결) | 1 MHz | 24 Mbps |
| 멀티 디바이스 | 어려움 | CS로 다수 | 주소로 다수 (최대 127) | 어려움 |
| DMA | O | O | O (제한적) | O |
| 적합 용도 | 로그, GPS, modem | flash, display, ADC | 센서, EEPROM | 오디오 |

처음 보드를 설계할 때 *어느 페리퍼럴이 몇 개 필요한지*를 *먼저 세어* 두지 않으면 *나중에 어려워집니다*. 특히 I2C는 *컨트롤러가 한 개*뿐이라 *주소 충돌이 나는 두 센서*를 동시에 못 씁니다.

## UART — 가장 단순한 시리얼

UART는 *콘솔, GPS, 모뎀, RS-232/485* 같은 *비동기 통신*에 씁니다. C3는 UART0(콘솔용), UART1(자유 사용)이 있습니다.

### 기본 사용

```c
#include "driver/uart.h"

#define UART_NUM    UART_NUM_1
#define TX_GPIO     7
#define RX_GPIO     8
#define BUF_SIZE    1024

void setup_uart(void) {
    uart_config_t cfg = {
        .baud_rate = 115200,
        .data_bits = UART_DATA_8_BITS,
        .parity = UART_PARITY_DISABLE,
        .stop_bits = UART_STOP_BITS_1,
        .flow_ctrl = UART_HW_FLOWCTRL_DISABLE,
        .source_clk = UART_SCLK_DEFAULT,
    };

    uart_driver_install(UART_NUM, BUF_SIZE * 2, BUF_SIZE * 2, 0, NULL, 0);
    uart_param_config(UART_NUM, &cfg);
    uart_set_pin(UART_NUM, TX_GPIO, RX_GPIO,
                 UART_PIN_NO_CHANGE, UART_PIN_NO_CHANGE);
}

void uart_loopback_task(void *arg) {
    uint8_t buf[128];
    while (1) {
        int len = uart_read_bytes(UART_NUM, buf, sizeof(buf), pdMS_TO_TICKS(100));
        if (len > 0) {
            uart_write_bytes(UART_NUM, (const char *)buf, len);
        }
    }
}
```

`uart_driver_install`이 *내부적으로 ring buffer + ISR*을 설치합니다. `uart_read_bytes`는 *블로킹*이고 `uart_write_bytes`는 *논블로킹*(내부 버퍼에 채워두면 ISR이 송신)입니다.

### Pattern detection — `\r\n` 끝 검출

명령행 인터프리터에서 *줄 단위*로 받고 싶을 때 *패턴 검출 ISR*을 활용합니다.

```c
uart_enable_pattern_det_baud_intr(UART_NUM, '\n', 1, 9, 0, 0);
uart_pattern_queue_reset(UART_NUM, 20);

// 이벤트 큐로 패턴 감지 알림
QueueHandle_t uart_queue;
uart_driver_install(UART_NUM, BUF_SIZE * 2, BUF_SIZE * 2,
                    20, &uart_queue, 0);
```

이후 `xQueueReceive(uart_queue, &event, ...)`에서 `event.type == UART_PATTERN_DET`을 잡으면 *한 줄 완성*입니다.

## SPI — 가장 빠른 시리얼

SPI는 *마스터-슬레이브, 4-와이어*(CLK, MOSI, MISO, CS) 통신입니다. *display, SD card, 외부 flash, 고속 ADC*가 주 고객입니다.

### Master 기본 설정

```c
#include "driver/spi_master.h"

#define PIN_NUM_MISO 2
#define PIN_NUM_MOSI 7
#define PIN_NUM_CLK  6
#define PIN_NUM_CS   10

spi_device_handle_t spi;

void setup_spi(void) {
    spi_bus_config_t bus_cfg = {
        .miso_io_num = PIN_NUM_MISO,
        .mosi_io_num = PIN_NUM_MOSI,
        .sclk_io_num = PIN_NUM_CLK,
        .quadwp_io_num = -1,
        .quadhd_io_num = -1,
        .max_transfer_sz = 4096,
    };
    spi_bus_initialize(SPI2_HOST, &bus_cfg, SPI_DMA_CH_AUTO);

    spi_device_interface_config_t dev_cfg = {
        .clock_speed_hz = 10 * 1000 * 1000,    // 10 MHz
        .mode = 0,                              // CPOL=0, CPHA=0
        .spics_io_num = PIN_NUM_CS,
        .queue_size = 7,
    };
    spi_bus_add_device(SPI2_HOST, &dev_cfg, &spi);
}
```

`SPI_DMA_CH_AUTO`로 *DMA 채널을 자동 할당*하면 *큰 전송이 CPU 부하 없이* 진행됩니다. 한 *bus*에 *여러 device*가 붙으면 `spi_bus_add_device`를 *디바이스마다* 호출하고 각각 *CS 핀*을 따로 줍니다.

### Polling vs Queued vs DMA

```c
// 1. Polling (가장 단순, 짧은 전송에 적합)
spi_transaction_t t = {
    .length = 8 * 4,             // 4 bytes = 32 bits
    .tx_buffer = data_out,
    .rx_buffer = data_in,
};
spi_device_polling_transmit(spi, &t);

// 2. Interrupt-based queued (큰 전송, async)
spi_device_queue_trans(spi, &t, portMAX_DELAY);
// ... 다른 작업 ...
spi_transaction_t *result;
spi_device_get_trans_result(spi, &result, portMAX_DELAY);

// 3. DMA (대용량, framebuffer 같은 것)
spi_transaction_t big_t = {
    .length = 8 * 4096,
    .tx_buffer = framebuffer,    // DMA-capable heap
    .rx_buffer = NULL,
};
spi_device_polling_transmit(spi, &big_t);
```

| 메커니즘 | 적정 크기 | CPU 부하 | 지연 |
|---------|----------|---------|------|
| Polling | < 64 bytes | 높음 (busy-wait) | 매우 낮음 |
| Queued ISR | 64~1024 bytes | 낮음 | 중간 (스케줄러 wakeup) |
| DMA | > 1024 bytes | 매우 낮음 | 중간 |

ESP-IDF의 `polling_transmit`은 *내부적으로 DMA*를 활용합니다. *함수 이름과 달리* 큰 전송도 효율적입니다.

### SD card 실습

```c
#include "esp_vfs_fat.h"
#include "driver/sdspi_host.h"

void mount_sd(void) {
    sdmmc_host_t host = SDSPI_HOST_DEFAULT();
    host.max_freq_khz = 20000;

    sdspi_device_config_t slot_cfg = SDSPI_DEVICE_CONFIG_DEFAULT();
    slot_cfg.gpio_cs = GPIO_NUM_10;
    slot_cfg.host_id = SPI2_HOST;

    esp_vfs_fat_sdmmc_mount_config_t mount_cfg = {
        .format_if_mount_failed = false,
        .max_files = 5,
    };

    sdmmc_card_t *card;
    esp_vfs_fat_sdspi_mount("/sdcard", &host, &slot_cfg,
                            &mount_cfg, &card);

    sdmmc_card_print_info(stdout, card);
}
```

마운트 후 `fopen("/sdcard/log.txt", "w")`로 *그대로* 쓸 수 있습니다. VFS layer가 *FAT 파일시스템*을 처리합니다.

## I2C — 센서의 표준

I2C는 *주소 기반 multi-drop bus*입니다. *SDA, SCL 두 라인*에 *최대 127개 디바이스*를 연결할 수 있습니다. C3는 *컨트롤러가 1개*뿐입니다.

### 기본 설정

```c
#include "driver/i2c.h"

#define I2C_SDA  4
#define I2C_SCL  5
#define I2C_FREQ 400000     // 400 kHz fast mode

void setup_i2c(void) {
    i2c_config_t cfg = {
        .mode = I2C_MODE_MASTER,
        .sda_io_num = I2C_SDA,
        .scl_io_num = I2C_SCL,
        .sda_pullup_en = GPIO_PULLUP_ENABLE,
        .scl_pullup_en = GPIO_PULLUP_ENABLE,
        .master.clk_speed = I2C_FREQ,
    };
    i2c_param_config(I2C_NUM_0, &cfg);
    i2c_driver_install(I2C_NUM_0, I2C_MODE_MASTER, 0, 0, 0);
}
```

`sda_pullup_en`은 *내부 풀업*(약 45 kΩ)을 켭니다. *400 kHz 이상* 사용 시 *외부 4.7 kΩ 풀업*이 사실상 필수입니다.

### 단순 read/write

```c
// 단일 register write
uint8_t reg = 0x12;
uint8_t val = 0x34;
uint8_t buf[2] = {reg, val};
i2c_master_write_to_device(I2C_NUM_0, 0x68,    // 7-bit address
                            buf, 2,
                            pdMS_TO_TICKS(100));

// register read
uint8_t reg_addr = 0x12;
uint8_t data[6];
i2c_master_write_read_device(I2C_NUM_0, 0x68,
                              &reg_addr, 1,
                              data, 6,
                              pdMS_TO_TICKS(100));
```

`i2c_master_write_to_device`/`write_read_device`는 ESP-IDF 4.x 이상의 *간소화 API*입니다. 그 이전은 `i2c_cmd_link_create`로 *명시적 transaction*을 만들어야 했습니다.

### SSD1306 OLED 실습 — 0x3C 주소

```c
#define SSD1306_ADDR 0x3C

void ssd1306_cmd(uint8_t cmd) {
    uint8_t buf[2] = {0x00, cmd};   // Co=0, D/C=0 (command)
    i2c_master_write_to_device(I2C_NUM_0, SSD1306_ADDR,
                                buf, 2, pdMS_TO_TICKS(50));
}

void ssd1306_init(void) {
    ssd1306_cmd(0xAE);   // display OFF
    ssd1306_cmd(0xD5); ssd1306_cmd(0x80);   // clock
    ssd1306_cmd(0xA8); ssd1306_cmd(0x3F);   // multiplex
    ssd1306_cmd(0xD3); ssd1306_cmd(0x00);   // offset
    ssd1306_cmd(0x40);                       // start line
    ssd1306_cmd(0x8D); ssd1306_cmd(0x14);   // charge pump
    ssd1306_cmd(0xAF);                       // display ON
}

void ssd1306_write_buffer(const uint8_t *buf, size_t len) {
    uint8_t *tx = malloc(len + 1);
    tx[0] = 0x40;                            // D/C=1 (data)
    memcpy(tx + 1, buf, len);
    i2c_master_write_to_device(I2C_NUM_0, SSD1306_ADDR,
                                tx, len + 1, pdMS_TO_TICKS(200));
    free(tx);
}
```

128×64 OLED는 *프레임 전체 1024 bytes*이고 *400 kHz*에서 *약 22 ms*가 걸립니다. 30 fps를 노리면 *I2C는 부족*하고 *SPI 변형 OLED*로 가야 합니다.

## I2S — 오디오와 PCM/PDM

I2S는 *오디오 전용*으로 설계된 인터페이스입니다. *DAC, ADC, PDM 마이크* 연결이 주 용도입니다.

### 기본 송신 — DAC 출력

```c
#include "driver/i2s_std.h"

#define BCK_PIN  4
#define WS_PIN   5
#define DATA_PIN 18

i2s_chan_handle_t tx_handle;

void setup_i2s(void) {
    i2s_chan_config_t chan_cfg = I2S_CHANNEL_DEFAULT_CONFIG(I2S_NUM_0, I2S_ROLE_MASTER);
    i2s_new_channel(&chan_cfg, &tx_handle, NULL);

    i2s_std_config_t std_cfg = {
        .clk_cfg = I2S_STD_CLK_DEFAULT_CONFIG(44100),
        .slot_cfg = I2S_STD_PHILIPS_SLOT_DEFAULT_CONFIG(
            I2S_DATA_BIT_WIDTH_16BIT, I2S_SLOT_MODE_STEREO),
        .gpio_cfg = {
            .mclk = I2S_GPIO_UNUSED,
            .bclk = BCK_PIN,
            .ws = WS_PIN,
            .dout = DATA_PIN,
            .din = I2S_GPIO_UNUSED,
        },
    };
    i2s_channel_init_std_mode(tx_handle, &std_cfg);
    i2s_channel_enable(tx_handle);
}

void play_sine(void) {
    int16_t sample;
    size_t written;
    static float phase = 0;
    float step = 2.0f * 3.14159f * 440.0f / 44100.0f;

    for (int i = 0; i < 44100; i++) {
        sample = (int16_t)(sinf(phase) * 8000);
        phase += step;
        i2s_channel_write(tx_handle, &sample, sizeof(sample),
                          &written, portMAX_DELAY);
    }
}
```

내부적으로 *DMA descriptor ring*이 돕니다. `i2s_channel_write`는 *DMA 버퍼가 비었을 때만* 블로킹입니다. *사용자는 큰 buffer를 한 번에 줘도 무방*합니다.

### DMA descriptor 구조

ESP-IDF가 *내부적으로 link list*를 만듭니다.

![I2S DMA Ring (Circular Linked List)](/images/blog/esp32-c3/diagrams/ch05-dma-ring.svg)

기본 *2 descriptor, 240 sample/desc* (= 약 5.4 ms @ 44.1 kHz)입니다. 더 깊은 buffer는 *지연 증가 vs underrun 감소*의 트레이드오프입니다. `dma_desc_num` / `dma_frame_num`을 `chan_cfg`에서 조정합니다.

## Polling vs Interrupt vs DMA — 처리량/지연 비교

| 메커니즘 | 처리량 | CPU 부하 | 지연 (단일 전송) | 적합 시나리오 |
|---------|--------|---------|------------------|--------------|
| Polling | 중 | 매우 높음 | 가장 낮음 | 짧은 SPI/I2C 명령 |
| Interrupt | 중 | 중 | 중 (ISR + 스케줄러) | UART, I2C 센서 |
| DMA | 매우 높음 | 매우 낮음 | 중 (DMA 시동 오버헤드) | SPI display, I2S 오디오, 대용량 UART |

*경험적 규칙*입니다.

- *32 bytes 미만*: polling이 늘 빠릅니다.
- *32~512 bytes*: interrupt가 효율적.
- *512 bytes 초과*: 무조건 DMA.

I2S와 framebuffer SPI는 *항상 DMA*가 답입니다. *센서 read (보통 6~20 bytes)*는 polling 또는 interrupt가 충분합니다.

## 자주 하는 실수

### "I2C 디바이스가 NACK"

가장 흔한 원인은 *주소 오류*(8-bit vs 7-bit 혼동)와 *풀업 누락*입니다. `i2cdetect`처럼 *주소 스캔* 함수를 만들어 *어떤 주소가 응답하는지* 먼저 확인합니다.

```c
void i2c_scan(void) {
    for (uint8_t addr = 1; addr < 127; addr++) {
        uint8_t dummy = 0;
        if (i2c_master_write_to_device(I2C_NUM_0, addr, &dummy, 0,
                                        pdMS_TO_TICKS(50)) == ESP_OK) {
            printf("Found at 0x%02X\n", addr);
        }
    }
}
```

### "SPI MISO가 항상 0xFF"

CS가 *디바이스에 안 닿거나*, MISO 핀의 *내부 풀업이 안 켜진* 경우입니다. `spi_device_interface_config_t`에 *기본 CS auto-toggle*이 동작하는지 확인합니다.

### "UART에서 일부 바이트 누락"

ring buffer가 *작거나*, `uart_read_bytes` timeout이 *짧아* polling 사이에 *overflow*가 났을 수 있습니다. `BUF_SIZE`를 *수신 burst의 2배* 이상으로 둡니다.

### "I2S 오디오에서 zipper noise"

`i2s_channel_write`가 *DMA underrun*을 겪고 *마지막 sample을 반복 재생*한 신호입니다. *작성 task의 우선순위*를 올리거나 *DMA descriptor 수*를 늘립니다.

### "SPI 80 MHz가 안 나온다"

GPIO Matrix 경로는 *최대 40 MHz*입니다. *기본 핀 번호*(IO MUX 직결)를 그대로 두어야 80 MHz가 보장됩니다.

### "I2C clock stretching이 깨진다"

일부 센서(MPU6050, BME280 등)는 *slave가 clock을 잡는* clock stretching을 씁니다. `i2c_filter_enable`을 *비활성*하고 *클럭 주파수를 낮춰* 보면 해결되는 경우가 많습니다.

## 정리

- UART는 *콘솔·GPS·모뎀*에 적합하며 *pattern detection*으로 줄 단위 입력을 ISR이 효율적으로 처리합니다.
- SPI는 *80 MHz IO MUX 직결*로 가장 빠른 인터페이스이며 *flash·display·SD card*가 주 고객입니다.
- I2C는 *컨트롤러 1개*뿐이라 *주소 충돌*을 보드 설계 단계에서 확인해야 하며 *외부 풀업 4.7 kΩ*이 사실상 필수입니다.
- I2S는 *DMA descriptor ring*으로 동작해 *44.1/48 kHz 스테레오 오디오*가 CPU 부하 없이 흐릅니다.
- *32 bytes 미만은 polling, 32~512 bytes는 interrupt, 512 bytes 초과는 DMA*가 경험적 선택 기준입니다.
- ESP-IDF 4.x 이상의 `i2c_master_write_to_device`·`spi_device_polling_transmit`·`i2s_channel_write`가 *대부분의 use case*를 한 줄로 처리합니다.
- SD card는 *SPI 모드*로 마운트하면 *POSIX `fopen` 그대로* 사용 가능합니다 (FAT 파일시스템).

다음 편은 **Ch 6: ADC·터치 센서 — 아날로그 입력**입니다. *12-bit SAR ADC*의 attenuation, *eFuse 캘리브레이션*, *노이즈 대책*을 다루고 배터리 전압 모니터 실습을 합니다.

## 관련 항목

- [Ch 4: GPIO·LEDC·MCPWM](/blog/embedded/riscv/esp32-c3-mastering/chapter04-gpio-ledc-pwm)
- [Ch 6: ADC·터치 센서 — 아날로그 입력](/blog/embedded/riscv/esp32-c3-mastering/chapter06-adc-touch)
- [Modern Embedded Recipes Part 4.7: DMA descriptor 설계](/blog/embedded/modern-recipes/part4-07-dma-descriptors)
- [Practical RTOS Internals Part 2.5: ISR + queue 패턴](/blog/embedded/rtos/practical-internals/part2-05-isr-queue)
- [원문 — ESP-IDF SPI Master API](https://docs.espressif.com/projects/esp-idf/en/latest/esp32c3/api-reference/peripherals/spi_master.html)
- [원문 — ESP-IDF I2C API](https://docs.espressif.com/projects/esp-idf/en/latest/esp32c3/api-reference/peripherals/i2c.html)
- [원문 — ESP-IDF I2S API](https://docs.espressif.com/projects/esp-idf/en/latest/esp32c3/api-reference/peripherals/i2s.html)
