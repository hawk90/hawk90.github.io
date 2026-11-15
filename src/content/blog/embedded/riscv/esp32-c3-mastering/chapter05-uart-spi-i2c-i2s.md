---
title: "ESP32-C3 시리얼 통신 4종 — UART·SPI·I2C·I2S 분석"
slug: "embedded/riscv/esp32-c3-mastering/chapter05-uart-spi-i2c-i2s"
date: 2026-05-20T09:05:00
description: "ESP-IDF v5.4.2의 UART·SPI2·I2C·I2S API에서 buffer 수명·오류·stereo frame과 DMA 조건을 구분합니다."
series: "ESP32-C3 Mastering"
seriesOrder: 5
tags: [uart, spi, i2c, i2s, dma, esp32-c3]
draft: false
topics: ["embedded", "embedded/riscv"]
---

## 한 줄 요약

> **"UART는 사람·로그·모뎀, SPI는 빠른 디바이스, I2C는 센서, I2S는 오디오."** 네 가지는 *처리량과 지연*이 다르고 *polling/인터럽트/DMA* 중 어느 것을 쓰느냐가 *CPU 부하를 좌우*합니다.

기준은 ESP-IDF v5.4.2 commit `f5c3654a1c2d2a01f7f67def7a0dc48e691f63c0`입니다. C3의 범용 SPI host는 SPI2 하나이며 UART2개·I2C1개·I2S1개가 있습니다. Flash 전용 SPI와 범용 host를 합쳐 GP-SPI2/3 두 개라고 세면 안 됩니다. 각 예의 pin은 독립 예이며 여러 예를 동시에 연결하는 board 구성이 아닙니다.

이 장은 *언제 어느 인터페이스를 고르고*, *데이터 전송을 어떤 메커니즘으로 처리할지*를 정리합니다. 설정 예와 buffer 처리를 다루며, 특정 OLED·SD card·DAC의 실제 동작을 확인한 결과로 제시하지 않습니다.

## 한눈 비교

| 항목 | UART | SPI | I2C | I2S |
|------|------|-----|-----|-----|
| 컨트롤러 수 (C3) | 2 | 범용 SPI2 1개 | 1 | 1 |
| 와이어 수 | 2~4 | 4+ (CS는 디바이스당) | 2 | 3~4 |
| 클럭 소스 | 비동기 | 마스터 클럭 | 마스터 클럭 | 마스터 클럭 |
| 속도 확인 | baud·clock 오차 | clock·배선·input delay | bus mode·rise time | sample rate·slot width |
| 멀티 디바이스 | protocol·transceiver에 의존 | CS·bus 공유 관리 | 유효 주소·전기 부하 확인 | slot·채널 구성 확인 |
| 전송 경로 | 일반 UART driver의 ring/ISR | 선택한 bus DMA 설정 | 해당 driver 지원 확인 | driver DMA buffer |
| 적합 용도 | 로그, GPS, modem | flash, display, ADC | 센서, EEPROM | 오디오 |

처음 보드를 설계할 때 *어느 페리퍼럴이 몇 개 필요한지*를 *먼저 세어* 두지 않으면 *나중에 어려워집니다*. 주소 충돌은 address pin·multiplexer·외부 controller 같은 설계 대안까지 검토합니다. 컨트롤러가 하나라는 사실만으로 모든 충돌 해결이 불가능한 것은 아닙니다.

## UART — 가장 단순한 시리얼

UART는 *콘솔, GPS, 모뎀, RS-232/485* 같은 *비동기 통신*에 씁니다. C3는 UART0(콘솔용), UART1(자유 사용)이 있습니다.

### 기본 사용

```c title="c3-uart.c"
#include <stdint.h>
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "driver/uart.h"

#define UART_NUM    UART_NUM_1
#define TX_GPIO     7
#define RX_GPIO     6
#define BUF_SIZE    1024

esp_err_t setup_uart(void) {
    uart_config_t cfg = {
        .baud_rate = 115200,
        .data_bits = UART_DATA_8_BITS,
        .parity = UART_PARITY_DISABLE,
        .stop_bits = UART_STOP_BITS_1,
        .flow_ctrl = UART_HW_FLOWCTRL_DISABLE,
        .source_clk = UART_SCLK_DEFAULT,
    };

    esp_err_t error = uart_param_config(UART_NUM, &cfg);
    if (error != ESP_OK) return error;
    error = uart_set_pin(UART_NUM, TX_GPIO, RX_GPIO,
                         UART_PIN_NO_CHANGE, UART_PIN_NO_CHANGE);
    if (error != ESP_OK) return error;
    return uart_driver_install(UART_NUM, BUF_SIZE * 2, BUF_SIZE * 2, 0, NULL, 0);
}

void uart_loopback_task(void *arg) {
    (void)arg;
    uint8_t buf[128];
    while (1) {
        int len = uart_read_bytes(UART_NUM, buf, sizeof(buf), pdMS_TO_TICKS(100));
        if (len > 0) {
            if (uart_write_bytes(UART_NUM, buf, (size_t)len) != len) break;
        } else if (len < 0) {
            break;
        }
    }
    vTaskDelete(NULL);
}
```

`uart_driver_install()`은 ring buffer와 ISR을 준비합니다. `uart_write_bytes()`는 TX buffer 크기가0인지에 따라 동작이 달라지고, ring buffer에 공간이 부족하면 기다릴 수 있으므로 항상 nonblocking이라고 설명하지 않습니다. 반환은 wire에서 마지막 bit가 전송됐다는 보장이 아니며 필요하면 `uart_wait_tx_done()`의 timeout 결과를 확인합니다. 위 task는 setup 성공 뒤에만 생성하고 사용이 끝난 뒤 driver 수명을 정리합니다.

### Pattern event와 실제 줄 파싱

Pattern detection은 지정한 동일 문자 반복과 timing 조건의 감지입니다. `UART_PATTERN_DET` 하나가 parser에 유효한 완전한 command line이 있다는 보장은 아닙니다. Driver/event queue 설치, pattern queue 설정, buffered byte·pattern position 소비와 overflow 처리를 순서대로 관리합니다. 이 작업을 별도 `uart_driver_install()`로 중복 설치하지 않습니다.

## SPI — 가장 빠른 시리얼

SPI는 *마스터-슬레이브, 4-와이어*(CLK, MOSI, MISO, CS) 통신입니다. *display, SD card, 외부 flash, 고속 ADC*가 주 고객입니다.

### Master 기본 설정

```c title="c3-spi.c"
#include "driver/spi_master.h"

#define PIN_NUM_MISO 2
#define PIN_NUM_MOSI 7
#define PIN_NUM_CLK  6
#define PIN_NUM_CS   10

spi_device_handle_t spi;

esp_err_t setup_spi(void) {
    spi_bus_config_t bus_cfg = {
        .miso_io_num = PIN_NUM_MISO,
        .mosi_io_num = PIN_NUM_MOSI,
        .sclk_io_num = PIN_NUM_CLK,
        .quadwp_io_num = -1,
        .quadhd_io_num = -1,
        .max_transfer_sz = 4096,
    };
    esp_err_t error = spi_bus_initialize(SPI2_HOST, &bus_cfg, SPI_DMA_CH_AUTO);
    if (error != ESP_OK) return error;

    spi_device_interface_config_t dev_cfg = {
        .clock_speed_hz = 10 * 1000 * 1000,    // 10 MHz
        .mode = 0,                              // CPOL=0, CPHA=0
        .spics_io_num = PIN_NUM_CS,
        .queue_size = 7,
    };
    error = spi_bus_add_device(SPI2_HOST, &dev_cfg, &spi);
    if (error != ESP_OK) {
        spi_bus_free(SPI2_HOST);
        return error;
    }
    return ESP_OK;
}
```

`SPI_DMA_CH_AUTO`는 DMA 사용을 요청합니다. Setup·buffer 준비·interrupt·완료 처리의 CPU 비용까지0이 되는 것은 아닙니다. 한 *bus*에 *여러 device*가 붙으면 `spi_bus_add_device`를 *디바이스마다* 호출하고 각각 *CS 핀*을 따로 줍니다.

### 완료 대기 방식과 DMA는 별개

Polling/queued는 CPU가 완료를 기다리는 방식이고 DMA는 데이터 이동 경로입니다. DMA로 설정한 SPI bus의 polling transaction도 DMA를 사용하면서 완료를 busy-wait할 수 있습니다. Driver와 DMA 설정·크기·정렬·memory capability를 함께 확인합니다.

Queued 전송의 transaction descriptor와 buffer는 `spi_device_get_trans_result()`로 완료를 회수할 때까지 살아 있어야 합니다. Timeout을 받았다고 stack object를 해제하거나 buffer를 수정하면 안 됩니다. 같은 device에 polling/queued 방식을 섞을 때 outstanding transaction을 정리하는 순서도 API 문서를 따릅니다. 전송 크기32/512 또는64/1024 byte를 고정 분기 기준으로 삼은 이전 표는 측정 근거가 없어 제외했습니다.

### SD card와 VFS

SD-SPI mount에는 먼저 준비한 bus, card의 CS, mount 설정과 성공한 card handle이 필요합니다. `esp_vfs_fat_sdspi_mount()`가 실패했는데 `sdmmc_card_print_info()`나 file 작업을 진행하지 않습니다. 다른 SPI device와 bus를 공유한다면 초기화/분리 순서를 함께 설계하고, 종료 시 file close·unmount·device/bus 해제를 수행합니다. VFS의 `fopen()` 지원은 card 호환성·전원·배선 검증을 대신하지 않습니다.

## I2C — 센서의 표준

I2C는 주소 기반 bus이지만 reserved address와 전기적 부하가 있으므로127개 장치를 항상 연결할 수 있다는 뜻은 아닙니다. 여기서는 기준 버전의 새 master driver를 사용하며 legacy `driver/i2c.h`와 같은 bus에 혼용하지 않습니다.

### Master bus와 device

`i2c_new_master_bus()`로 bus를 만든 뒤 `i2c_master_bus_add_device()`에7-bit address·SCL 속도를 넣어 device handle을 만듭니다. 실제 SDA/SCL·external pull-up·전압은 board 설계를 따릅니다. [I2C master API](https://docs.espressif.com/projects/esp-idf/en/v5.4.2/esp32c3/api-reference/peripherals/i2c.html)의 timeout 단위는 millisecond이며 FreeRTOS tick으로 다시 환산하지 않습니다. Device를 모두 제거한 뒤 bus를 해제합니다.

다음은 초기화한 device에서 register를 읽는 helper입니다. `i2c_master_register_event_callbacks()`로 asynchronous callback을 등록하지 않아 **blocking 전송**으로 사용하는 device만 받습니다. Register-address와 byte layout이 해당 device protocol에 맞는지는 별도 확인합니다.

```c title="c3-i2c-read.c"
#include <stddef.h>
#include <stdint.h>
#include "driver/i2c_master.h"

esp_err_t c3_read_register(i2c_master_dev_handle_t device, uint8_t reg,
                           uint8_t *out, size_t size) {
    if (!device || !out || !size || size > 256) return ESP_ERR_INVALID_ARG;
    return i2c_master_transmit_receive(device, &reg, 1, out, size, 100);
}
```

NACK는 address·전원·배선·device 준비 상태를 포함해 진단합니다. Probe API도 device 부작용을 고려해 사용하며, 임의의 dummy byte를 전 주소에 쓰는 스캔을 기본 진단으로 권장하지 않습니다. Clock stretching 문제를 filter를 무조건 끄는 방법으로 해결하지 않고 driver의 wait/timeout과 실제 SCL 파형을 확인합니다.

### OLED payload와 전송 시간

아래 helper도 asynchronous callback이 없는 blocking device만 받습니다. Control byte0x40을 사용하는 module이 초기화됐다는 전제에서 최대1024byte payload만 보냅니다. Panel별 init command와 addressing mode를 설정하는 완성 OLED driver가 아닙니다.

```c title="c3-oled-write.c"
#include <stddef.h>
#include <stdint.h>
#include <stdlib.h>
#include <string.h>
#include "driver/i2c_master.h"

esp_err_t c3_oled_write(i2c_master_dev_handle_t device,
                        const uint8_t *data, size_t size) {
    if (!device || !data || size == 0 || size > 1024) return ESP_ERR_INVALID_ARG;
    uint8_t *packet = malloc(size + 1);
    if (!packet) return ESP_ERR_NO_MEM;
    packet[0] = 0x40;
    memcpy(packet + 1, data, size);
    esp_err_t error = i2c_master_transmit(device, packet, size + 1, 200);
    free(packet);
    return error;
}
```

128×64의1-bit frame은1024byte입니다. ACK를 포함한9bit/byte와 address/control byte만 계산해도400kHz에서 약23ms이며 start/stop·명령·render·scheduler·stretch 비용은 별도입니다. 이 이론선만으로30fps가 가능하다거나 불가능하다고 결론내리지 않습니다.

## I2S — 오디오와 PCM/PDM

I2S는 *오디오 전용*으로 설계된 인터페이스입니다. *DAC, ADC, PDM 마이크* 연결이 주 용도입니다.

### 기본 송신 — DAC 출력

```c title="c3-i2s.c"
#include "driver/i2s_std.h"

#define BCK_PIN  4
#define WS_PIN   5
#define DATA_PIN 6

i2s_chan_handle_t tx_handle;

esp_err_t setup_i2s(void) {
    i2s_chan_config_t chan_cfg = I2S_CHANNEL_DEFAULT_CONFIG(I2S_NUM_0, I2S_ROLE_MASTER);
    esp_err_t error = i2s_new_channel(&chan_cfg, &tx_handle, NULL);
    if (error != ESP_OK) return error;

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
    error = i2s_channel_init_std_mode(tx_handle, &std_cfg);
    if (error == ESP_OK) error = i2s_channel_enable(tx_handle);
    if (error != ESP_OK) {
        i2s_del_channel(tx_handle);
        tx_handle = NULL;
    }
    return error;
}

```

### Stereo frame을 만든 뒤 byte 수 확인

16-bit stereo에서는 L/R 두 sample이 한 frame입니다. Sample 하나씩44100번 보내면44100개의 stereo frame이 되지 않습니다. 다음 helper는 동일 sample을 양쪽 slot에 복사하며 MCU FPU 성능을 보장하는 함수가 아닙니다.

```c title="c3-stereo.c"
#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>
#include <math.h>

bool c3_stereo_sine(int16_t *out, size_t capacity, size_t frames,
                    uint32_t rate, double frequency, double *phase) {
    const double tau = 6.2831853071795864769;
    if (!out || !phase || frames == 0 || frames > 256 || frames > capacity / 2 ||
        rate == 0 || !isfinite(frequency) || frequency <= 0 || frequency >= rate / 2.0 ||
        !isfinite(*phase) || *phase < 0 || *phase >= tau)
        return false;
    double current = *phase;
    for (size_t i = 0; i < frames; ++i) {
        int16_t value = (int16_t)(sin(current) * 8000.0);
        out[2*i] = value;
        out[2*i+1] = value;
        current = fmod(current + tau * frequency / rate, tau);
    }
    *phase = current;
    return true;
}
```

`i2s_channel_write()`에는 `frames * 2 * sizeof(int16_t)` byte를 전달하고 `esp_err_t`와 `bytes_written`를 모두 확인합니다. Timeout 중 일부가 들어갔다면 같은 frame 전체를 무조건 재전송하지 않습니다. Timeout은 millisecond 단위이고, driver의 software RUNNING 상태와 wire의 실제 소리·완료는 구분합니다.

### DMA descriptor 구조

ESP-IDF가 *내부적으로 link list*를 만듭니다.

![I2S DMA Ring (Circular Linked List)](/images/blog/esp32-c3/diagrams/ch05-dma-ring.svg)

기준 `I2S_CHANNEL_DEFAULT_CONFIG`는6descriptor·240frame/descriptor입니다. 44.1kHz에서1descriptor는약5.44ms,6개분량은약32.65ms입니다. 더 깊은 buffer는 *지연 증가 vs underrun 감소*의 트레이드오프입니다. `dma_desc_num` / `dma_frame_num`을 `chan_cfg`에서 조정합니다.

## 전송 방식 선택과 진단

설정·buffer copy·완료 대기·ISR/task wake-up을 나누어 측정합니다. DMA는 memory transfer를 줄여도 CPU overhead가0이 되지 않으며 polling과 양립합니다. 크기만으로 "항상 polling" 또는 "무조건 DMA"를 선택하지 않습니다.

| 증상 | 먼저 확인할 계약 |
|---|---|
| UART 누락 | frame/error/overflow event, ring 여유, consumer가 처리하지 못한 시간 |
| SPI0xFF | mode·CS·MISO·배선·device 상태·clock/input delay |
| I2C NACK/timeout |7-bit address·전압·pull-up·전원·stretch·driver timeout |
| I2S noise/underrun | slot/frame 크기·sample rate·실제 생산 속도·partial write·DMA depth |

Buffer를 수신 burst의 무조건2배로 정하거나 noise 원인을 특정 sample 반복으로 단정하지 않습니다. 관측한 event·logic analyzer 파형·반환값과 선택한 SDK 소스로 원인을 좁힙니다.

## 정리

UART의 buffer 복사와 wire 완료, SPI의 DMA와 polling, I2C device와 bus 수명, I2S sample과 stereo frame을 구분합니다. 설정·전송·cleanup 오류를 caller에게 드러내고 실제 hardware throughput과 deadline은 별도 측정합니다.

## 다음 장 예고

다음 편은 **Ch 6: ADC·터치 센서 — 아날로그 입력**입니다. *12-bit SAR ADC*의 attenuation, *eFuse 캘리브레이션*, *노이즈 대책*을 다루고 배터리 전압 모니터 실습을 합니다.


## 관련 항목

- [Ch 4: GPIO Matrix·LEDC](/blog/embedded/riscv/esp32-c3-mastering/chapter04-gpio-ledc-pwm)
- [Ch 6: ADC·터치 센서 — 아날로그 입력](/blog/embedded/riscv/esp32-c3-mastering/chapter06-adc-touch)
- [원문 — ESP-IDF SPI Master API](https://docs.espressif.com/projects/esp-idf/en/v5.4.2/esp32c3/api-reference/peripherals/spi_master.html)
- [원문 — ESP-IDF I2C API](https://docs.espressif.com/projects/esp-idf/en/v5.4.2/esp32c3/api-reference/peripherals/i2c.html)
- [원문 — ESP-IDF I2S API](https://docs.espressif.com/projects/esp-idf/en/v5.4.2/esp32c3/api-reference/peripherals/i2s.html)
