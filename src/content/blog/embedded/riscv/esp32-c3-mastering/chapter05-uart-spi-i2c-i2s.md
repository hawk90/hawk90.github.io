---
title: "ESP32-C3 시리얼 통신 4종 — UART·SPI·I2C·I2S 분석"
slug: "embedded/riscv/esp32-c3-mastering/chapter05-uart-spi-i2c-i2s"
date: 2026-05-20T09:05:00
description: "ESP32-C3의 UART·SPI2·I2C·I2S를 데이터시트 사양과 ESP-IDF v5.4.2 driver 계약으로 정리하고, Espressif가 공개한 SPI transaction 시간과 I2S DMA buffer 지연을 계산합니다."
series: "ESP32-C3 Mastering"
seriesOrder: 5
tags: [uart, spi, i2c, i2s, dma, esp32-c3]
draft: false
topics: ["embedded", "embedded/riscv"]
---

## 한 줄 요약

> **C3에서 쓸 수 있는 범용 시리얼은 UART 2개, SPI2 1개, I2C 1개, I2S 1개입니다.** 네 가지는 속도 상한과 driver의 buffer 소유 규칙이 서로 달라서, 같은 "전송 함수"라도 반환 시점의 의미가 다릅니다.

센서 몇 개와 디스플레이 하나, 디버그 콘솔을 붙이면 컨트롤러가 금방 모자랍니다. C3는 I2C와 범용 SPI가 하나씩뿐이라 보드를 그리기 전에 몇 개가 필요한지 먼저 세어야 합니다. 이 장은 [ESP32-C3 Datasheet v2.5](https://www.espressif.com/sites/default/files/documentation/esp32-c3_datasheet_en.pdf) 4.2.1절의 사양과 [ESP-IDF v5.4.2](https://github.com/espressif/esp-idf/tree/v5.4.2)의 driver header·문서로 네 인터페이스를 정리합니다.

코드 블록은 모두 v5.4.2로 esp32c3 target 빌드를 통과시켰습니다. Espressif QEMU는 이 주변장치들의 실제 배선과 파형을 재현하지 못하므로 이 장에는 실행 로그가 없고, 시간 수치는 Espressif 문서의 측정값이나 직접 계산한 이론값입니다. 예제마다 핀을 따로 정했으므로, 한 보드에 모두 동시에 연결하는 구성이 아닙니다.

## 한눈 비교

데이터시트 4.2.1.1~4.2.1.4절과 v5.4.2 `soc_caps.h`(`SOC_UART_NUM (2)`, `SOC_I2C_NUM (1U)`, `SOC_I2S_NUM (1U)`)에서 옮긴 표입니다.

| 항목 | UART | SPI2 (GP-SPI) | I2C | I2S |
|------|------|-----|-----|-----|
| 컨트롤러 수 | 2 (UART0, UART1) | 1 | 1 | 1 |
| 속도 상한 | 5 Mbps | master 80 MHz, slave 60 MHz | 800 Kbit/s (SCL·SDA pull-up 강도에 따라) | BCK 10 kHz~40 MHz |
| 동기 방식 | 비동기 | master clock | master clock | BCK·WS |
| 다중 장치 | RS485 등 별도 계층 | CS 핀 6개 | 7-bit·10-bit 주소 | TDM slot |
| DMA | UHCI0를 거쳐 GDMA | GDMA | — | GDMA |
| 흔한 용도 | 콘솔, GPS, 모뎀 | 디스플레이, 외부 ADC | 센서, EEPROM | 오디오 codec, PDM 출력 |

SPI는 칩 안에 SPI0, SPI1, SPI2 세 개가 있지만(데이터시트 Features의 "Three SPI") SPI0·SPI1은 flash용이고, 응용이 쓰는 범용 host는 SPI2 하나입니다. `soc_caps.h`의 `SOC_SPI_PERIPH_NUM 2`는 driver가 다루는 SPI1·SPI2를 센 값입니다.

I2C 컨트롤러가 하나라서 주소가 같은 센서 두 개를 달려면 센서의 주소 선택 핀을 쓰거나 I2C multiplexer를 둡니다.

## UART — 가장 단순한 시리얼

UART는 콘솔, GPS, 모뎀, RS-232/485처럼 clock 선 없이 양쪽이 약속한 baud로 주고받는 통신입니다. 데이터시트 4.2.1.1절에 따르면 C3의 UART0와 UART1은 최대 5 Mbps, 하드웨어 흐름 제어(CTS/RTS)와 소프트웨어 흐름 제어(XON/XOFF)를 지원합니다. UART0가 기본 콘솔로 GPIO20/21에 연결돼 있으므로, 응용 통신에는 보통 UART1을 GPIO Matrix로 원하는 핀에 연결합니다.

### 기본 사용

UART1을 115200 bps로 설정하고 받은 바이트를 그대로 돌려보내는 loopback task입니다. 핀은 Ch 4에서 제약 없는 핀으로 분류한 GPIO0·1을 씁니다. 두 핀은 32 kHz 크리스털 입력도 겸하므로 외부 32 kHz 크리스털을 쓰지 않는 보드라는 전제입니다.

```c title="c3-uart.c"
#include <stdint.h>
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "driver/uart.h"

#define UART_NUM    UART_NUM_1
#define TX_GPIO     1
#define RX_GPIO     0
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

`uart_driver_install()`에 넘긴 TX buffer 크기가 `uart_write_bytes()`의 동작을 바꿉니다. v5.4.2 `uart.h`의 주석은 두 경우를 이렇게 적습니다.

| `tx_buffer_size` | `uart_write_bytes()`가 돌아오는 시점 |
|------|------|
| 0 | 모든 데이터를 보냈거나 적어도 TX FIFO에 넣은 뒤 |
| > 0 | 모든 데이터를 TX ring buffer에 복사한 뒤. 이후 ISR이 FIFO로 옮김 |

어느 쪽이든 반환은 마지막 bit가 선로를 떠났다는 뜻이 아닙니다. RS485 방향 전환처럼 송신 완료 시점이 필요하면 `uart_wait_tx_done(uart_num, ticks_to_wait)`을 씁니다. 이 함수의 timeout 단위는 FreeRTOS tick이고, 아래 I2C·I2S API의 millisecond와 다릅니다.

### Pattern 감지로 줄 단위 파싱

NMEA 문장처럼 `\n`으로 끝나는 줄을 받을 때는 driver의 pattern 감지를 씁니다. `uart_enable_pattern_det_baud_intr(uart_num, pattern_chr, chr_num, chr_tout, post_idle, pre_idle)`로 같은 문자가 `chr_num`번 연속되는 것을 감지하게 하고, `uart_pattern_queue_reset()`으로 위치 큐를 만듭니다. event queue에 `UART_PATTERN_DET`이 오면 `uart_pattern_pop_pos()`로 pattern 위치를 꺼내 그 길이만큼 읽습니다. ESP-IDF의 `examples/peripherals/uart/uart_events`와 `nmea0183_parser` 예제가 이 흐름을 그대로 보여 줍니다.

같은 event queue에는 `UART_FIFO_OVF`와 `UART_BUFFER_FULL`도 옵니다. consumer task가 늦으면 이 이벤트가 먼저 오므로, 위치 큐만 보고 있으면 데이터가 사라진 줄 모르고 지나갑니다.

## SPI — 가장 빠른 시리얼

SPI는 CLK, MOSI, MISO, CS 네 선으로 master가 clock을 주는 동기 통신입니다. 데이터시트 4.2.1.2절에 따르면 SPI2는 master로 full-duplex·half-duplex 모두 최대 80 MHz, slave로 최대 60 MHz이고, CS 핀을 6개까지 둘 수 있습니다(`SOC_SPI_MAX_CS_NUM 6`).

### Master 기본 설정

SPI2 bus를 DMA와 함께 초기화하고 10 MHz, mode 0 device 하나를 붙입니다. 핀은 v5.4.2 SPI master 문서가 C3 SPI2의 IO_MUX 핀으로 적은 번호(CLK 6, MOSI 7, MISO 2, CS 10)입니다.

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

`max_transfer_sz = 4096`은 DMA를 쓸 때의 한도입니다. DMA 없이 쓰면 C3의 `SOC_SPI_MAXIMUM_BUFFER_SIZE`가 64이므로 한 transaction이 64 byte로 제한됩니다. SPI master 문서도 "If DMA is not enabled ... the transaction length is limited to 64 bytes for both write and read"라고 적습니다. 같은 bus에 장치를 더 붙일 때는 `spi_bus_add_device()`를 장치마다 부르고 CS 핀을 따로 줍니다.

C3에서는 IO_MUX 핀이 아닌 곳에 SPI2를 연결해도 속도 손해가 없습니다. v5.4.2 SPI master 문서는 ESP32 외 칩에 대해 "When an SPI Host is set to 80 MHz or lower frequencies, routing SPI pins via the GPIO matrix will behave the same compared to routing them via IOMUX"라고 적습니다. 실제로 나오는 clock은 driver가 하드웨어 분주비에 맞춰 다시 계산하므로 `spi_device_get_actual_freq()`로 확인할 수 있습니다.

### Interrupt transaction과 polling transaction

DMA는 데이터가 오가는 길이고, interrupt와 polling은 CPU가 완료를 기다리는 방식입니다. 둘은 독립이라 네 조합이 모두 가능합니다. v5.4.2 SPI master 문서는 C3에서 1 byte transaction 하나에 걸리는 시간을 다음 표로 싣고 있습니다(`CONFIG_SPI_MASTER_ISR_IN_IRAM` 활성 상태에서 Espressif가 측정).

| 방식 | C3 typical (1 byte) |
|------|------|
| Interrupt transaction, DMA | 28 µs |
| Interrupt transaction, CPU | 27 µs |
| Polling transaction, DMA | 10 µs |
| Polling transaction, CPU | 9 µs |

문서에 따르면 interrupt transaction은 ISR이 두 번 돌기를 기다려야 하고("need to wait for the ISR to run twice") queue 처리와 context switch 비용도 치르므로, polling이 약 3배 빠릅니다. 대신 polling 중에는 CPU가 다른 일을 못 합니다. 같은 문서는 DMA를 켜면 linked list 설정에 transaction당 약 2 µs가 든다고도 적습니다. 짧은 명령 byte를 자주 보내는 디스플레이 드라이버가 polling을, 큰 frame buffer를 보내는 경로가 interrupt+DMA를 쓰는 이유가 이 표에 있습니다.

interrupt transaction의 descriptor와 buffer는 `spi_device_get_trans_result()`로 결과를 돌려받을 때까지 driver 소유입니다. 이 함수의 timeout은 tick 단위이고, timeout으로 돌아왔다고 transaction이 취소되지는 않으므로 그 사이에 stack 변수가 scope를 벗어나게 두면 안 됩니다. 같은 device에 polling을 섞으려면 문서의 "mixed transactions" 절에 따라 interrupt transaction을 모두 회수한 뒤 `spi_device_polling_start()`를 불러야 합니다.

### SD card와 VFS

SD card를 SPI로 쓸 때는 `esp_vfs_fat_sdspi_mount()`가 card 초기화와 FAT mount를 함께 합니다. 이 함수가 실패하면 card handle이 없으므로 `sdmmc_card_print_info()`나 `fopen()`으로 넘어가면 안 됩니다. 끝낼 때는 file을 닫고 unmount한 뒤 bus를 해제하는 순서입니다. 전체 흐름은 v5.4.2의 `examples/storage/sd_card/sdspi` 예제에 있습니다.

## I2C — 센서의 표준

I2C는 SDA·SCL 두 선에 여러 장치를 주소로 구분해 붙이는 bus입니다. 데이터시트 4.2.1.3절에 따르면 C3의 I2C는 standard mode(100 Kbit/s), fast mode(400 Kbit/s), 그리고 "Up to 800 Kbit/s (constrained by SCL and SDA pull-up strength)"를 지원하고 7-bit·10-bit 주소를 씁니다. 800 Kbit/s 단서에서 보듯 실제 속도는 pull-up 저항이 정하므로, Ch 4의 내부 pull-up(typ 45 kΩ)만으로는 빠른 모드를 기대하기 어렵습니다.

v5.4.2에는 새 driver(`driver/i2c_master.h`)와 deprecated legacy driver(`driver/i2c.h`)가 있습니다. I2C 문서는 "The legacy driver can't coexist with the new driver"라고 적고, legacy driver의 `i2c.c`는 둘이 함께 링크되면 부팅 중 `CONFLICT! driver_ng is not allowed to be used with this old driver`를 찍습니다. 이 장은 새 driver만 씁니다.

### Master bus와 device

`i2c_new_master_bus()`로 bus를 만들고 `i2c_master_bus_add_device()`로 주소와 SCL 속도를 가진 device handle을 얻습니다. 전송 함수의 timeout은 `xfer_timeout_ms`라는 이름 그대로 millisecond이고, -1이면 무한 대기입니다. device를 모두 제거한 뒤 bus를 지웁니다.

다음 helper는 register 주소 하나를 쓰고 이어서 읽습니다.

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

이 helper는 blocking 동작을 전제로 합니다. `i2c_master.h`의 주석에 따르면 `i2c_master_register_event_callbacks()`로 callback을 등록한 device에서는 전송이 비동기가 되어 함수가 바로 돌아옵니다. 같은 주석은 "data buffer should always be completely prepared when callback is registered, otherwise, the data will get corrupt"라고 경고합니다. stack의 `reg` 변수를 넘기는 위 코드는 callback을 등록하지 않은 device에서만 안전합니다.

장치가 응답하는지만 볼 때는 데이터를 쓰지 않는 `i2c_master_probe(bus, address, timeout_ms)`를 씁니다. 임의의 byte를 주소마다 써 보는 스캔은 쓰기에 반응하는 장치의 상태를 바꿀 수 있습니다.

### OLED payload와 전송 시간

SSD1306 계열 OLED처럼 control byte 0x40 뒤에 화면 데이터를 붙이는 장치에 최대 1024 byte를 보내는 helper입니다. 패널 초기화 명령은 들어 있지 않습니다.

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

`malloc()`한 packet을 전송 직후 `free()`하므로, 이 helper도 비동기 callback이 없는 device에서만 안전합니다.

전송 시간을 계산해 보면 128×64 1-bit 화면은 1024 byte이고, 주소 byte와 control byte를 더하면 1026 byte입니다. byte마다 ACK 1 bit가 붙어 9 bit이므로 400 kHz에서 1026 × 9 / 400,000 ≈ 23.09 ms입니다. start/stop 조건, clock stretching, 렌더링 시간은 빠져 있으니 이 값은 하한입니다. 하한만으로도 한 frame에 23 ms가 넘으므로 400 kHz I2C로 화면 전체를 다시 그리면 초당 43 frame을 넘을 수 없습니다.

## I2S — 오디오와 PCM/PDM

I2S는 BCK(bit clock), WS(좌우 선택), 데이터 선으로 오디오 sample을 연속해서 흘리는 인터페이스입니다. 데이터시트 4.2.1.4절에 따르면 C3의 I2S는 master·slave, full-·half-duplex로 동작하고 8/16/24/32-bit sample, BCK 10 kHz~40 MHz, TDM PCM·TDM MSB·TDM standard·PDM standard를 지원하며 GDMA에 연결됩니다. 다만 v5.4.2 `soc_caps.h`는 `SOC_I2S_SUPPORTS_PDM_TX`만 정의하고 `SOC_I2S_SUPPORTS_PDM_RX`는 없으므로, ESP-IDF driver로는 PDM 송신만 쓸 수 있고 PDM 마이크 입력은 받을 수 없습니다.

### 기본 송신 — DAC 출력

I2S0를 master TX로 열고 44.1 kHz, 16-bit stereo Philips 형식으로 설정합니다.

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

### Stereo frame과 byte 수

16-bit stereo에서는 L과 R 두 sample이 한 frame입니다. 44.1 kHz는 1초에 44100 frame이고, sample로는 88200개, byte로는 176400개입니다. 아래 helper는 sine 값을 양쪽 slot에 똑같이 써서 frame을 채웁니다.

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

호스트에서 1 kHz, 240 frame으로 실행하면 첫 세 frame이 `0 0 | 1135 1135 | 2248 2248`이고, `i2s_channel_write()`에 넘길 크기는 240 × 2 × 2 = 960 byte입니다. 257 frame을 요청하거나 주파수를 Nyquist(22050 Hz) 이상으로 주면 함수가 `false`를 돌려줍니다.

`i2s_channel_write(handle, src, size, &bytes_written, timeout_ms)`는 `esp_err_t`와 별도로 실제로 쓴 byte 수를 돌려줍니다. timeout으로 일부만 들어갔다면 `bytes_written` 이후부터 다시 보내야 하고, 같은 buffer를 처음부터 다시 보내면 소리가 반복됩니다.

### DMA descriptor와 지연

I2S driver는 DMA descriptor를 원형으로 연결해 두고 하나씩 채워 보냅니다.

![I2S DMA Ring (Circular Linked List)](/images/blog/esp32-c3/diagrams/ch05-dma-ring.svg)

v5.4.2의 `I2S_CHANNEL_DEFAULT_CONFIG`는 `.dma_desc_num = 6`, `.dma_frame_num = 240`입니다. 44.1 kHz에서 descriptor 하나는 240 / 44100 ≈ 5.44 ms, 6개 전체는 약 32.65 ms 분량입니다. 응용이 쓴 sample이 소리로 나오기까지 최대 이만큼 밀리고, 반대로 응용이 32 ms 넘게 데이터를 못 채우면 underrun이 납니다. 지연을 줄이려면 `dma_desc_num`·`dma_frame_num`을 줄이고, 끊김을 줄이려면 늘립니다.

## 증상별로 먼저 볼 곳

| 증상 | 먼저 볼 곳 |
|---|---|
| UART 수신 누락 | event queue의 `UART_FIFO_OVF`·`UART_BUFFER_FULL`, RX ring buffer 크기 |
| SPI에서 0xFF만 읽힘 | mode(CPOL/CPHA), CS 핀, MISO 배선, `spi_device_get_actual_freq()` 결과 |
| I2C NACK·timeout | 7-bit 주소(8-bit로 shift한 값을 넣지 않았는지), pull-up 유무, `i2c_master_probe()` 결과 |
| I2S 끊김 | `bytes_written` 확인, sample 생산 속도, `dma_desc_num × dma_frame_num` 분량 |

## 정리

- C3의 범용 시리얼은 UART 2, SPI2 1, I2C 1, I2S 1이며 SPI0·SPI1은 flash 전용입니다.
- `uart_write_bytes()`의 반환은 TX buffer 크기에 따라 의미가 다르고, 송신 완료는 `uart_wait_tx_done()`(tick 단위)으로 확인합니다.
- C3 SPI2는 master 80 MHz까지이고, 80 MHz 이하에서는 GPIO Matrix 경로도 IO_MUX와 같게 동작합니다. DMA가 없으면 transaction은 64 byte까지입니다.
- Espressif 측정으로 C3의 1 byte SPI transaction은 interrupt 27~28 µs, polling 9~10 µs입니다.
- I2C 최대 800 Kbit/s는 pull-up이 정하고, 1 KiB OLED frame은 400 kHz에서 최소 23 ms가 걸립니다.
- I2S 기본 DMA 구성(6 × 240 frame)은 44.1 kHz에서 약 32.65 ms 분량입니다.

## 다음 장 예고

다음 편은 **Ch 6: ADC·터치 센서 — 아날로그 입력**입니다. 12-bit SAR ADC의 attenuation과 eFuse 보정, 노이즈 대책을 다루고, ADC로 배터리 전압을 읽는 회로를 계산합니다.


## 관련 항목

- [Ch 4: GPIO Matrix·LEDC](/blog/embedded/riscv/esp32-c3-mastering/chapter04-gpio-ledc-pwm)
- [Ch 6: ADC·터치 센서 — 아날로그 입력](/blog/embedded/riscv/esp32-c3-mastering/chapter06-adc-touch)
- [원문 — ESP-IDF SPI Master API](https://docs.espressif.com/projects/esp-idf/en/v5.4.2/esp32c3/api-reference/peripherals/spi_master.html)
- [원문 — ESP-IDF I2C API](https://docs.espressif.com/projects/esp-idf/en/v5.4.2/esp32c3/api-reference/peripherals/i2c.html)
- [원문 — ESP-IDF I2S API](https://docs.espressif.com/projects/esp-idf/en/v5.4.2/esp32c3/api-reference/peripherals/i2s.html)
