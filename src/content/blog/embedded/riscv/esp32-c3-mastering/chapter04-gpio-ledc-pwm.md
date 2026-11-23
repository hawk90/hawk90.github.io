---
title: "ESP32-C3 디지털 출력 — GPIO Matrix·LEDC와 PWM 한계"
slug: "embedded/riscv/esp32-c3-mastering/chapter04-gpio-ledc-pwm"
date: 2026-05-20T09:04:00
description: "ESP32-C3 데이터시트의 핀 우선순위·strapping 표로 실제로 쓸 수 있는 GPIO를 고르고, LEDC 주파수·분해능 한계를 ESP-IDF v5.4.2 driver 계산으로 확인합니다. MCPWM은 없습니다."
series: "ESP32-C3 Mastering"
seriesOrder: 4
tags: [gpio, pwm, ledc, mcpwm, esp32-c3]
draft: false
topics: ["embedded", "embedded/riscv"]
---

## 한 줄 요약

> **C3의 GPIO 22개 중 아무 제약 없이 쓸 수 있는 핀은 GPIO0, 1, 3, 10 네 개입니다.** PWM은 LEDC(timer 4개, channel 6개, 최대 14-bit)가 맡고 MCPWM은 없습니다.

핀 번호표만 보고 회로를 그리면 부팅이 안 되는 보드를 만들기 쉽습니다. C3는 핀이 적은 칩이라 flash, USB, JTAG, UART0, strapping이 상당수를 이미 점유하고 있기 때문입니다. 이 장은 [ESP32-C3 Datasheet v2.5](https://www.espressif.com/sites/default/files/documentation/esp32-c3_datasheet_en.pdf)의 2장(Pins)과 3장(Boot Configurations)으로 쓸 수 있는 핀을 먼저 고르고, [ESP-IDF v5.4.2](https://github.com/espressif/esp-idf/tree/v5.4.2)의 GPIO·LEDC driver로 출력을 만듭니다.

LEDC 설정값을 받아들일지는 driver가 소프트웨어로 분주비를 계산해 판정합니다. 그래서 이 판정은 Espressif QEMU(`esp_develop_9.0.0_20240606`)에서도 그대로 재현됩니다. 반면 실제 핀의 파형, 전압, 전류는 QEMU로 볼 수 없어 이 장에서는 데이터시트 수치만 인용합니다.

## 22개 GPIO — 데이터시트의 4단계 우선순위

데이터시트 2.3.4절은 핀마다 주변장치 배정 우선순위를 매깁니다. 아파트 주차장에 비유하면 Priority 2는 빈 일반 자리, Priority 3은 장애인·전기차 전용처럼 조건을 따져 써야 하는 자리, Priority 4는 이미 주인이 정해진 지정석입니다.

| 우선순위 | GPIO | 이유 (데이터시트 2.3.3·2.3.4) |
|------|------|------|
| 2: 제약 없음 | 0, 1, 3, 10 | — |
| 3: 주의 | 2, 8, 9 | strapping pin |
| 3: 주의 | 4, 5, 6, 7 | JTAG (MTMS, MTDI, MTCK, MTDO) |
| 3: 주의 | 18, 19 | USB Serial/JTAG (USB_D-, USB_D+) |
| 3: 주의 | 20, 21 | UART0 (U0RXD, U0TXD) |
| 3: 주의 | 11 | VDD_SPI. flash를 외부 전원으로 공급할 때만 GPIO로 사용 가능 |
| 4: 사용 비권장 | 12~17 | SPI0/1 flash 인터페이스 (SPIHD, SPIWP, SPICS0, SPICLK, SPID, SPIQ) |

아날로그 기능은 같은 장의 Table 2-6에 있습니다. ADC1_CH0~CH4가 GPIO0~4, ADC2_CH0가 GPIO5이고, GPIO0·1은 32 kHz 크리스털 입력(XTAL_32K_P/N)도 겸합니다. 패키지 안 flash가 있는 변형(Ch 1의 FN4·FH4·FH8X)에서는 GPIO12~17이 그 flash에 연결돼 있습니다. FH4AZ·FH4X는 이 핀을 bond하지 않아 GPIO가 16개입니다(Table 1-1).

결국 "C3 GPIO는 22개"라는 말과 "회로에서 바로 쓸 수 있는 핀은 4개"라는 말이 동시에 참입니다. JTAG을 쓰지 않으면 GPIO4~7을, USB Serial/JTAG을 쓰지 않으면 GPIO18·19를 돌려받는 식으로 늘려 갑니다. USB_D+/- 핀은 기본으로 USB Serial/JTAG controller에 연결돼 있어, GPIO로 쓰려면 다시 설정해야 합니다(데이터시트 2.3.3절).

### Strapping pins — GPIO2, GPIO8, GPIO9

데이터시트 3장에 따르면 GPIO2, GPIO8, GPIO9는 reset 때 값이 latch되어 boot mode를 정하고, GPIO8은 ROM 메시지 출력 여부에도 관여합니다. Table 3-1의 기본값은 GPIO2와 GPIO8이 floating, GPIO9만 weak pull-up(bit 1)입니다.

| Boot mode (Table 3-3) | GPIO2 | GPIO8 | GPIO9 |
|------|------|------|------|
| SPI boot (flash에서 부팅) | 1 | 상관없음 | 1 |
| Joint download boot (UART0·USB로 기록) | 1 | 1 | 0 |

Table 3-3 각주는 GPIO2가 두 모드를 실제로 가르지는 않지만 glitch 때문에 pull-up을 권한다고 적습니다. Table 3-2는 CHIP_EN이 high가 된 뒤 최소 3 ms(tH) 동안 strapping 값이 유지돼야 한다고 정합니다. 그래서 이 핀에 버튼이나 외부 장치를 달 때는 reset 직후 3 ms 동안 어떤 레벨이 걸리는지가 문제가 됩니다. GPIO9에 "누르면 GND" 버튼을 달면, reset 중에 누르고 있을 때 Table 3-3의 GPIO9 = 0 조건이 되어 download mode로 부팅합니다.

ESP-IDF의 QEMU 실행 스크립트(`tools/idf_py_actions/qemu_ext.py`)도 esp32c3에 `-global driver=esp32c3.gpio,property=strap_mode,value=0x02` 같은 strap 값을 넘겨 부팅 모드를 흉내 냅니다.

## GPIO Matrix와 IO MUX

C3에서 주변장치 신호를 핀에 연결하는 길은 두 가지입니다. 데이터시트 2.3.1절에 따르면 IO MUX는 핀마다 기능 F0~F2 중 하나를 고르고, 그중 UART0, JTAG, SPI0/1, SPI2 신호는 IO MUX로 직접 연결됩니다(Table 2-3). 나머지 신호는 GPIO Matrix를 거치는데, 같은 절은 이 경로가 "gives the pin access to almost any peripheral signals"이지만 "might affect the latency of routed signals"라고 적습니다.

![ESP32-C3 GPIO Matrix의 신호 routing 개요](/images/blog/esp32-c3/diagrams/ch04-gpio-matrix.svg)

실무에서는 이렇게 갈립니다. UART1처럼 IO MUX 직결 핀이 없는 주변장치는 어느 GPIO로든 Matrix를 거쳐 연결합니다. SPI2에도 IO MUX 직결 핀(FSPICLK = GPIO6, FSPID = GPIO7, FSPIQ = GPIO2, FSPICS0 = GPIO10, Table 2-4)이 있습니다. 다만 v5.4.2 SPI master 문서는 ESP32 이외의 칩에 대해 "When an SPI Host is set to 80 MHz or lower frequencies, routing SPI pins via the GPIO matrix will behave the same compared to routing them via IOMUX"라고 적고, C3의 SPI2 master 최대 clock이 80 MHz(데이터시트 4.2.1.2절)이므로 C3에서는 Matrix 경로를 써도 SPI 속도 손해가 없습니다. Ch 5에서 SPI 설정과 함께 다시 봅니다.

v5.4.2의 `uart_set_pin()`은 `GPIO_IS_VALID_OUTPUT_GPIO()`·`GPIO_IS_VALID_GPIO()`로 번호가 유효한지만 검사하고 strapping이나 JTAG 여부는 따지지 않습니다. 이 장의 QEMU 실행에서 `uart_set_pin(UART_NUM_1, 7, 6, ...)`은 `ESP_OK`였지만, GPIO6·7은 위 표에서 JTAG 핀입니다. driver가 막아 주지 않으니 핀 선택은 설계 단계에서 끝내야 합니다.

## 기본 GPIO 사용

가장 단순한 출력입니다. LED를 Priority 2 핀인 GPIO10에 둡니다.

```c title="c3-gpio.c"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "esp_err.h"
#include "driver/gpio.h"

#define LED_PIN GPIO_NUM_10

void app_main(void) {
    gpio_config_t cfg = {
        .pin_bit_mask = (1ULL << LED_PIN),
        .mode = GPIO_MODE_OUTPUT,
        .pull_up_en = GPIO_PULLUP_DISABLE,
        .pull_down_en = GPIO_PULLDOWN_DISABLE,
        .intr_type = GPIO_INTR_DISABLE,
    };
    ESP_ERROR_CHECK(gpio_config(&cfg));

    while (1) {
        ESP_ERROR_CHECK(gpio_set_level(LED_PIN, 1));
        vTaskDelay(pdMS_TO_TICKS(500));
        ESP_ERROR_CHECK(gpio_set_level(LED_PIN, 0));
        vTaskDelay(pdMS_TO_TICKS(500));
    }
}
```

여러 핀을 한 번에 설정할 때는 `pin_bit_mask`에 비트를 OR합니다. 22번 이상의 번호는 C3에 없으므로 driver가 거부합니다. QEMU에서 `gpio_set_level(22, 1)`은 `E (80) gpio: gpio_set_level(238): GPIO output gpio_num error`를 찍고 `ESP_ERR_INVALID_ARG`를 돌려줬고, `GPIO_IS_VALID_GPIO(21)`은 1, `GPIO_IS_VALID_GPIO(22)`는 0이었습니다. 이 판정은 `soc_caps.h`의 `SOC_GPIO_VALID_GPIO_MASK ((1U<<SOC_GPIO_PIN_COUNT) - 1)`에서 나옵니다.

```c
.pin_bit_mask = (1ULL << GPIO_NUM_0) | (1ULL << GPIO_NUM_1) | (1ULL << GPIO_NUM_3),
```

### Pull-up/down과 drive strength

데이터시트 5.4절 Table 5-4(DC Characteristics, 3.3 V, 25 °C)에서 내부 weak pull-up과 pull-down은 모두 typ 45 kΩ입니다. I2C처럼 pull-up 저항이 신호 상승 시간을 정하는 버스에서는 이 값으로 충분한지 따로 계산해야 하고, 외부 저항은 Ch 5의 I2C 절에서 다룹니다.

drive strength는 `gpio_set_drive_capability()`의 `GPIO_DRIVE_CAP_0`~`3`으로 고르고, v5.4.2 `gpio_types.h`는 기본값을 `GPIO_DRIVE_CAP_DEFAULT = 2`로 둡니다. 데이터시트가 수치로 적은 값은 다음과 같습니다.

| 항목 | 값 | 조건 |
|------|----|----|
| 기본 drive strength | GPIO2·3·MTMS·MTDI 10 mA, GPIO18·19 40 mA, 나머지 20 mA | 2.2절 Pin Overview 표 각주 4 |
| IOH (source) | typ 40 mA | VDD 3.3 V, VOH ≥ 2.64 V, PAD_DRIVER = 3 |
| IOL (sink) | typ 28 mA | VDD 3.3 V, VOL = 0.495 V, PAD_DRIVER = 3 |

이 값은 전압을 지정한 조건에서 흐르는 전류이고, 핀이 정전류원이 된다는 뜻은 아닙니다. LED에는 전류 제한 저항을 달아야 합니다.

### GPIO interrupt

버튼 입력처럼 엣지를 잡을 때는 ISR service를 설치하고 핀별 handler를 등록합니다. ISR은 큐에 핀 번호만 넣고 끝내며, debounce와 처리는 task에서 합니다. 아래 코드는 v5.4.2로 컴파일을 확인했습니다.

```c title="c3-gpio-isr.c"
#include <stdint.h>
#include "freertos/FreeRTOS.h"
#include "freertos/queue.h"
#include "driver/gpio.h"
#include "esp_attr.h"

#define BUTTON_GPIO GPIO_NUM_3

static QueueHandle_t s_gpio_events;

static void IRAM_ATTR button_isr(void *arg) {
    uint32_t gpio = (uint32_t)(uintptr_t)arg;
    BaseType_t woken = pdFALSE;
    xQueueSendFromISR(s_gpio_events, &gpio, &woken);   /* full queue: event dropped */
    if (woken) portYIELD_FROM_ISR();
}

esp_err_t button_init(void) {
    s_gpio_events = xQueueCreate(8, sizeof(uint32_t));
    if (!s_gpio_events) return ESP_ERR_NO_MEM;
    gpio_config_t cfg = {
        .pin_bit_mask = 1ULL << BUTTON_GPIO,
        .mode = GPIO_MODE_INPUT,
        .pull_up_en = GPIO_PULLUP_ENABLE,
        .intr_type = GPIO_INTR_NEGEDGE,
    };
    esp_err_t error = gpio_config(&cfg);
    if (error == ESP_OK) error = gpio_install_isr_service(0);
    if (error == ESP_OK)
        error = gpio_isr_handler_add(BUTTON_GPIO, button_isr, (void *)(uintptr_t)BUTTON_GPIO);
    return error;
}
```

큐를 handler 등록보다 먼저 만드는 순서가 중요합니다. 반대로 하면 등록 직후 들어온 첫 인터럽트가 NULL 큐에 쓰게 됩니다. `gpio_install_isr_service(0)`에 `ESP_INTR_FLAG_IRAM`을 주지 않았으므로 flash 작업 중에는 이 ISR이 뒤로 밀립니다. v5.4.2 interrupt allocation 문서는 IRAM-safe가 아닌 handler가 "In case of flash operations, these interrupt handlers are postponed"라고 적습니다. 그 플래그를 줄 때의 조건은 Ch 2에서 다뤘습니다.

## LEDC — LED용 PWM

LEDC는 이름과 달리 LED 전용이 아니라 범용 PWM 발생기입니다. v5.4.2 `soc_caps.h`는 C3의 LEDC를 `SOC_LEDC_TIMER_NUM (4)`, `SOC_LEDC_CHANNEL_NUM (6)`, `SOC_LEDC_TIMER_BIT_WIDTH (14)`로 선언하고, clock source로 APB(80 MHz)와 XTAL을 지원합니다(`SOC_LEDC_SUPPORT_APB_CLOCK`, `SOC_LEDC_SUPPORT_XTAL_CLOCK`). 원조 ESP32의 LEDC는 16채널이었습니다(Ch 1 비교표). C3에는 high-speed mode가 없어(`SOC_LEDC_SUPPORT_HS_MODE` 미정의) `LEDC_LOW_SPEED_MODE`만 씁니다.

### 주파수 × 2^분해능 ≤ clock

PWM 한 주기는 timer가 고정된 clock으로 0부터 2^bits - 1까지 한 칸씩 세는 시간입니다. 그래서 주파수와 분해능을 동시에 올릴 수 없습니다. 초침이 같은 속도로 도는 시계에서 한 바퀴의 눈금 수(분해능)를 늘리면 한 바퀴 도는 시간도 길어지는(주파수가 낮아지는) 것과 같습니다.

v5.4.2의 `ledc.c`는 분주비 `div_param = (src_clk << 8) / (freq × 2^bits)`를 계산하고, `LEDC_IS_DIV_INVALID(div)`가 `div <= 255`이거나 `div > 0x3FFFF`이면 거부합니다. 하위 8 bit가 소수부(`LEDC_LL_FRACTIONAL_BITS 8`)라 분주비는 1 이상, 약 1024 미만이어야 한다는 뜻입니다. APB 80 MHz로 몇 가지 조합을 계산하면 다음과 같습니다.

| 요청 | freq × 2^bits | div_param | 판정 |
|------|------|------|------|
| 5 kHz, 13-bit | 40.96 MHz | 500 | 가능 |
| 5 kHz, 14-bit | 81.92 MHz | 250 | 불가 (≤ 255) |
| 50 Hz, 14-bit | 0.82 MHz | 25000 | 가능 |
| 1 Hz, 14-bit | 16384 Hz | 1250000 | 불가 (> 0x3FFFF) |
| 1 MHz, 7-bit | 128 MHz | 160 | 불가 (≤ 255) |

같은 조합을 `ledc_timer_config()`에 넘긴 QEMU 실행 결과가 표와 일치합니다.

```text
APB = 80000000 Hz
timer   5000 Hz 13-bit AUTO     -> ESP_OK
E (80) ledc: requested frequency 5000 and duty resolution 14 can not be achieved, try reducing freq_hz or duty_resolution. div_param=0
timer   5000 Hz 14-bit AUTO     -> ESP_FAIL
E (80) ledc: requested frequency 5000 and duty resolution 14 can not be achieved, try reducing freq_hz or duty_resolution. div_param=0
timer   5000 Hz 14-bit APB      -> ESP_FAIL
timer     50 Hz 14-bit AUTO     -> ESP_OK
E (80) ledc: requested frequency 1 and duty resolution 14 can not be achieved, try reducing freq_hz or duty_resolution. div_param=0
timer      1 Hz 14-bit APB      -> ESP_FAIL
E (80) ledc: requested frequency 1000000 and duty resolution 7 can not be achieved, try reducing freq_hz or duty_resolution. div_param=0
timer 1000000 Hz  7-bit AUTO     -> ESP_FAIL
suitable res @APB: 5kHz=13 50Hz=14 1MHz=6
```

마지막 줄은 `ledc_find_suitable_duty_resolution(80000000, freq)`의 결과입니다. 5 kHz에서는 13-bit, 1 MHz에서는 6-bit가 APB로 낼 수 있는 최대 분해능입니다. 원하는 주파수가 정해져 있다면 이 함수로 분해능을 먼저 구하는 편이 시행착오가 적습니다. 오류 로그 끝의 `div_param=0`은 실패 경로에서 찍히는 값이라 계산된 분주비가 아닙니다.

### 기본 설정 — 단일 LED

5 kHz, 13-bit로 GPIO10에 PWM을 냅니다. 13-bit의 duty 범위는 0~8191입니다. 아래 코드도 v5.4.2로 컴파일을 확인했습니다.

```c title="c3-ledc.c"
#include <stdint.h>
#include "driver/ledc.h"

#define LED_GPIO 10
#define LEDC_TIMER LEDC_TIMER_0
#define LEDC_CHANNEL LEDC_CHANNEL_0

esp_err_t setup_ledc(void) {
    ledc_timer_config_t timer_cfg = {
        .speed_mode = LEDC_LOW_SPEED_MODE,
        .timer_num = LEDC_TIMER,
        .duty_resolution = LEDC_TIMER_13_BIT,
        .freq_hz = 5000,
        .clk_cfg = LEDC_AUTO_CLK,
    };
    esp_err_t error = ledc_timer_config(&timer_cfg);
    if (error != ESP_OK) return error;

    ledc_channel_config_t ch_cfg = {
        .speed_mode = LEDC_LOW_SPEED_MODE,
        .channel = LEDC_CHANNEL,
        .timer_sel = LEDC_TIMER,
        .intr_type = LEDC_INTR_DISABLE,
        .gpio_num = LED_GPIO,
        .duty = 0,
        .hpoint = 0,
    };
    return ledc_channel_config(&ch_cfg);
}

esp_err_t set_brightness(uint32_t duty) {
    if (duty > 8191) return ESP_ERR_INVALID_ARG;   /* 2^13 - 1 */
    esp_err_t error = ledc_set_duty(LEDC_LOW_SPEED_MODE, LEDC_CHANNEL, duty);
    return error == ESP_OK ? ledc_update_duty(LEDC_LOW_SPEED_MODE, LEDC_CHANNEL) : error;
}
```

`ledc_set_duty()`는 값을 써 두기만 하고, `ledc_update_duty()`를 불러야 다음 주기부터 적용됩니다.

### Fade와 여러 채널

LEDC에는 duty를 하드웨어로 서서히 바꾸는 fade 기능이 있습니다. `ledc_fade_func_install()`을 한 번 호출한 뒤 `ledc_set_fade_with_time()`으로 목표 duty와 시간을 주고 `ledc_fade_start()`로 시작합니다.

```c
esp_err_t fade_to(uint32_t duty, int ms) {
    esp_err_t error = ledc_set_fade_with_time(LEDC_LOW_SPEED_MODE, LEDC_CHANNEL, duty, ms);
    return error == ESP_OK ? ledc_fade_start(LEDC_LOW_SPEED_MODE, LEDC_CHANNEL, LEDC_FADE_WAIT_DONE) : error;
}
```

`LEDC_FADE_WAIT_DONE`은 목표 duty에 닿을 때까지 호출한 task를 막고, `LEDC_FADE_NO_WAIT`은 바로 돌아옵니다. `ledc.h`의 주석은 `ledc_fade_stop()`이 `NO_WAIT`으로 시작한 fade만 멈출 수 있고, `WAIT_DONE`으로 시작한 fade는 목표에 닿을 때까지 계속된다고 적습니다(C3는 `SOC_LEDC_SUPPORT_FADE_STOP 1`).

channel(6개)이 timer(4개)보다 많으니 일부 channel은 timer를 나눠 써야 하고, 같은 timer에 묶인 channel은 주파수와 분해능도 같아집니다. RGB LED 세 채널을 timer 하나에 묶는 것은 자연스럽지만, 5 kHz LED와 50 Hz 서보를 함께 쓰려면 timer 두 개가 필요합니다.

## MCPWM 부재와 서보 신호 계산

v5.4.2의 C3 `soc_caps.h`에는 MCPWM 관련 정의가 하나도 없습니다. `SOC_MCPWM_SUPPORTED`조차 정의돼 있지 않습니다. 따라서 `mcpwm_new_timer()`, dead-time, fault 입력을 쓰는 모터 제어 코드는 C3로 옮길 수 없습니다. 상보 PWM과 dead-time이 필요한 BLDC 인버터라면 MCPWM이 있는 다른 칩이나 외부 gate driver IC를 써야 합니다.

단순한 서보 펄스는 LEDC로 만들 수 있습니다. 아래 함수는 펄스 폭을 duty count로 바꿀 뿐 GPIO를 건드리지 않습니다.

```c title="c3-pulse-duty.c"
#include <stdbool.h>
#include <stdint.h>

bool c3_pulse_duty(uint32_t pulse_us, uint32_t period_us,
                   unsigned bits, uint32_t *duty) {
    if (!duty || period_us == 0 || pulse_us >= period_us || bits == 0 || bits > 14)
        return false;
    *duty = (uint32_t)(((uint64_t)pulse_us * (UINT32_C(1) << bits)) / period_us);
    return true;
}
```

20 ms 주기(50 Hz)와 14-bit에서 1 ms는 16384 × 1/20 = 819.2로 내림해 819, 2 ms는 1638입니다. QEMU 실행 결과도 `servo 14-bit/20ms: 1ms=819 2ms=1638`이었습니다. 1 count는 20 ms / 16384 ≈ 1.22 µs이므로, 1~2 ms 구간을 819단계로 나누는 셈입니다. 50 Hz·14-bit는 위 표에서 가능한 조합이었습니다. 몇 µs가 몇 도인지는 서보 제품의 사양을 따릅니다.

## 자주 하는 실수

- **GPIO9에 active-low 버튼을 답니다.** reset 중에 눌리면 download mode로 부팅합니다(Table 3-3).
- **GPIO12~17을 범용 I/O로 씁니다.** 패키지 내장 flash 변형에서는 flash 버스입니다.
- **GPIO18·19를 그냥 출력으로 씁니다.** 기본으로 USB Serial/JTAG에 연결돼 있어, 쓰려면 다시 설정해야 하고 USB 콘솔을 잃습니다.
- **5 kHz에 14-bit를 요청합니다.** 80 MHz APB로는 불가능하고 `ledc_timer_config()`가 `ESP_FAIL`을 돌려줍니다. 반환값을 확인하지 않으면 PWM이 아예 나오지 않습니다.
- **MCPWM 예제를 그대로 가져옵니다.** C3에는 MCPWM이 없습니다.

## 정리

- C3 GPIO 22개 중 제약 없는 핀은 GPIO0, 1, 3, 10이고, 나머지는 strapping·JTAG·USB·UART0·VDD_SPI·flash와 겹칩니다.
- GPIO2·8·9는 reset 후 최소 3 ms 동안 strapping 값이 유지돼야 하고, GPIO9 = 0이면 download mode입니다.
- 내부 pull-up/down은 typ 45 kΩ, 기본 drive strength는 핀에 따라 10/20/40 mA입니다.
- LEDC는 timer 4개, channel 6개, 최대 14-bit이며, `freq × 2^bits`가 clock보다 크거나 분주비가 1024 이상이면 driver가 거부합니다.
- MCPWM은 없고, 서보 펄스는 LEDC 50 Hz·14-bit로 1.22 µs 단위까지 만들 수 있습니다.

## 다음 장 예고

다음 편은 **Ch 5: 시리얼 통신 4종 — UART·SPI·I2C·I2S**입니다. 이 장에서 고른 핀 위에 UART1, SPI2, I2C, I2S를 올리고, 각 driver의 buffer와 DMA 설정을 다룹니다.


## 관련 항목

- [Ch 3: 메모리 맵·플래시·SPIFFS/LittleFS](/blog/embedded/riscv/esp32-c3-mastering/chapter03-memory-flash)
- [Ch 5: 시리얼 통신 4종 — UART·SPI·I2C·I2S](/blog/embedded/riscv/esp32-c3-mastering/chapter05-uart-spi-i2c-i2s)
- [Ch 6: ADC·터치 센서](/blog/embedded/riscv/esp32-c3-mastering/chapter06-adc-touch)
- [원문 — ESP-IDF GPIO API](https://docs.espressif.com/projects/esp-idf/en/latest/esp32c3/api-reference/peripherals/gpio.html)
- [원문 — ESP-IDF LEDC API](https://docs.espressif.com/projects/esp-idf/en/v5.4.2/esp32c3/api-reference/peripherals/ledc.html)
