---
title: "ESP32-C3 디지털 출력 — GPIO Matrix·LEDC와 PWM 한계"
slug: "embedded/riscv/esp32-c3-mastering/chapter04-gpio-ledc-pwm"
date: 2026-05-20T09:04:00
description: "ESP32-C3의 핀 제약과 LEDC 6채널·14-bit 한계를 확인하고 GPIO·PWM 오류 경로를 다룹니다. MCPWM은 지원하지 않습니다."
series: "ESP32-C3 Mastering"
seriesOrder: 4
tags: [gpio, pwm, ledc, mcpwm, esp32-c3]
draft: false
topics: ["embedded", "embedded/riscv"]
---

## 한 줄 요약

> **C3에는 LEDC가 있고 MCPWM은 없습니다.** GPIO Matrix가 있어도 flash·strapping·USB·모듈 배선의 제약이 없어지는 것은 아닙니다.

기준은 ESP-IDF v5.4.2 commit `f5c3654a1c2d2a01f7f67def7a0dc48e691f63c0`입니다. [C3 soc_caps.h](https://github.com/espressif/esp-idf/blob/f5c3654a1c2d2a01f7f67def7a0dc48e691f63c0/components/soc/esp32c3/include/soc/soc_caps.h)는 GPIO22개, LEDC4timer·6channel·14-bit를 선언하고 MCPWM support를 선언하지 않습니다. 기존 MCPWM motor 예제는 C3 실행 예로 사용할 수 없어 이 장에서 제외했습니다.

이 장의 GPIO·LEDC 예는 실제 전기적 안전성·기계 회전각·PWM 파형을 측정한 결과가 아닙니다. 사용하는 module schematic과 외부 회로를 먼저 확인합니다.

## 22개 GPIO — 무엇이 어디에

C3의 GPIO는 *GPIO0부터 GPIO21까지 22개*입니다. 모든 핀이 동등하지는 않습니다.

| GPIO | 특수 기능 | 부팅 시 주의 |
|------|----------|-------------|
| 0~4 | ADC1 ch0~4 | GPIO2는 strapping |
| 8, 9 | strapping pin | boot mode 결정 |
| 12~17 | flash 관련 신호·package별 노출 차이 | 실제 part/module 회로 확인 |
| 18, 19 | USB Serial JTAG | 디버거 사용 시 점유 |
| 20, 21 | UART0 (default) | 콘솔 출력용 |
| 5~7, 10~11 | ADC/JTAG 등 다른 기능과 공유 | 사용 중인 기능·외부 회로 확인 |

사용 가능한 pin 수를 고정12~14개로 계산하지 않습니다. Chip part number의 bonded pin, module flash 배선, JTAG·USB·console과 외부 회로를 합쳐 판단합니다.

### Strapping pins — GPIO2, GPIO8, GPIO9

이 핀들의 reset 시 입력 상태가 boot 설정에 영향을 줍니다. GPIO9만 떼어 보거나 GPIO2의 영향을 작다고 가정하지 말고 [데이터시트의 strapping 표](https://www.espressif.com/sites/default/files/documentation/esp32-c3_datasheet_en.pdf)와 board 회로를 맞춥니다. Pull resistor·버튼·외부 peripheral이 reset 중 어떤 level을 만드는지 확인한 뒤 application I/O로 재사용합니다.

## GPIO Matrix — 페리퍼럴 자유 매핑

GPIO Matrix는 내부 peripheral 신호와 GPIO 사이의 routing을 제공합니다. 모든 신호·핀 조합이 같은 timing이나 기능을 보장하는256×256 crossbar라고 설명하지 않습니다. 입출력 가능 여부, 해당 signal index와 IO MUX 직결 경로를 target 소스로 확인합니다.

![ESP32-C3 GPIO Matrix의 신호 routing 개요](/images/blog/esp32-c3/diagrams/ch04-gpio-matrix.svg)

예를 들어 UART pin을 바꿀 때 `uart_set_pin()`의 반환값과 TX/RX 방향을 확인합니다. GPIO8 같은 strapping pin을 단순 예제용 RX로 고정하지 않습니다. 실제 UART 설정·driver 설치·통신은 Ch5에서 다룹니다.

### IO MUX와 timing

IO MUX 직결과 Matrix 경로는 routing·timing 조건이 다릅니다. "항상1core clock 지연", "Matrix40MHz/직결80MHz 보장" 같은 단일 수치를 모든 버스에 적용하지 않습니다. SPI driver의 target별 timing 계산·input delay·clock source·실제 배선과 파형을 확인합니다. 최대 주파수를 요청했다고 해당 속도가 통신 성공을 보장하는 것도 아닙니다.

## 기본 GPIO 사용

가장 단순한 디지털 출력 코드입니다.

```c title="c3-gpio.c"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "esp_err.h"
#include "driver/gpio.h"

#define LED_PIN GPIO_NUM_5

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

여러 핀을 *한꺼번에* 설정하려면 `pin_bit_mask`에 *비트로 OR*합니다.

```c
.pin_bit_mask = (1ULL << GPIO_NUM_5) | (1ULL << GPIO_NUM_6) | (1ULL << GPIO_NUM_7),
```

### Pull-up/down, open-drain, drive strength

내부 pull과 외부 pull의 역할을 구분합니다. I2C는 bus capacitance·rise time·전압·sink current에 맞춰 저항을 정하고 내부 pull만으로 규격 적합을 보장하지 않습니다. Drive capability enum도 일정 전류를 공급하는 전류원 설정이 아닙니다. LED에는 적절한 제한 저항·driver를 사용합니다.

### GPIO interrupt

ISR service와 pin handler는 별도 등록입니다. Queue를 먼저 초기화하고 `gpio_config()`, `gpio_install_isr_service()`, `gpio_isr_handler_add()`의 결과를 확인합니다. ISR에서는 짧은 FromISR 처리만 수행하고 queue full 시 drop할지 다른 통지를 쓸지 명시합니다. Debounce·처리 완료·GPIO level 재확인은 task에서 수행합니다.

`ESP_INTR_FLAG_IRAM`을 사용하면 dispatcher 설정뿐 아니라 handler·참조 data·호출 code의 배치도 필요합니다. `IRAM_ATTR`만 붙인 채 초기화하지 않은 queue로 보내는 코드를 완성 예로 사용하지 않습니다.

## LEDC — LED용 PWM

LEDC는 *6 채널, 4 timer*를 갖는 PWM 페리퍼럴입니다. *fade 하드웨어*가 있어 LED 밝기를 *부드럽게* 바꿀 수 있습니다.

### 기본 설정 — 단일 LED

```c title="c3-ledc.c"
#include <stdint.h>
#include "driver/ledc.h"

#define LED_GPIO 5
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
    // duty range: 0 ~ (2^13 - 1) = 0 ~ 8191
    if (duty > 8191) return ESP_ERR_INVALID_ARG;
    esp_err_t error = ledc_set_duty(LEDC_LOW_SPEED_MODE, LEDC_CHANNEL, duty);
    return error == ESP_OK ? ledc_update_duty(LEDC_LOW_SPEED_MODE, LEDC_CHANNEL) : error;
}
```

13-bit·5kHz라는 요청은 실제 clock 선택과 divider 조건을 만족해야 합니다. `freq × 2^resolution`만으로 모든 clock/divider에서의 최대 주파수를 단정하지 않고 `ledc_timer_config()` 오류를 확인합니다. C3의 timer width는14-bit이므로 이전16-bit 행은 적용할 수 없습니다.

### Fade와 여러 채널

Fade service는 수명을 관리하며 한 번 설치하고, 각 `ledc_set_fade_with_time()`·`ledc_fade_start()`의 결과를 확인합니다. `LEDC_FADE_WAIT_DONE`은 호출 task를 대기시키고 `NO_WAIT`은 완료를 기다리지 않습니다. 같은 channel의 진행 중 fade와 duty 변경을 동시에 요청하지 않습니다. 요청 시간은 clock·step 설정으로 양자화될 수 있어 "항상1ms마다 갱신"이나 고정 최소100ms를 보장하지 않습니다.

채널이 timer를 공유하면 frequency·resolution을 공유합니다. 이것만으로 사용자 RGB update의 시작 시점과 광학적 위상이 동시에 맞는다는 뜻은 아닙니다. 여러 채널의 동작과 완료 통지는 실제 파형에서 확인합니다.

## MCPWM 부재와 서보 신호 계산

C3에는 MCPWM이 없습니다. 따라서 `mcpwm_new_timer()`·dead-time·fault generator 예를 C3 코드에 넣지 않습니다. 단순 서보 제어가 필요하면 LEDC로 pulse를 만들 수 있지만, 실제 서보의 허용 pulse·전원·부하·회전각은 해당 부품 자료를 따라야 합니다. 1~2ms가 모든 서보의0~180도를 보장하지 않습니다.

다음 helper는 pulse width를 duty count로 변환할 뿐 GPIO나 모터를 구동하지 않습니다.

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

예를 들어20ms 주기에14-bit이면1ms는819count,2ms는1638count로 내림 계산됩니다. 분해능에 따른 pulse 오차와 실제 timer 주기는 별도로 확인합니다. 상보 PWM·dead-time·fault 차단이 필요하면 해당 기능을 가진 다른 target이나 외부 driver를 선택하고 전체 전력단의 보호를 검증합니다.

## 자주 하는 실수

- **Pin 번호만 보고 연결합니다.** Strapping·flash·USB·console·module 배선을 확인합니다.
- **지원하지 않는 peripheral을 사용합니다.** C3 target의 `soc_caps.h`와 실제 component build 조건을 확인합니다.
- **설정 호출을 성공으로 가정합니다.** GPIO·timer·channel·duty/fade API 오류를 확인하고 필요한 자원을 정리합니다.
- **PWM count를 물리량으로 보장합니다.** 실제 주기·pulse 폭·전압과 부품의 허용 범위를 측정합니다.

## 정리

C3는 GPIO Matrix와 LEDC를 지원하며 MCPWM은 지원하지 않습니다. 핀의 실제 사용 가능성과 clock·분해능·update lifetime을 구분하고, native helper 검사·API 계약 확인·실제 파형 관찰을 따로 기록합니다.

## 다음 장 예고

다음 편은 **Ch 5: 시리얼 통신 4종 — UART·SPI·I2C·I2S**입니다. target별 API와 buffer·통신 오류 처리를 다룹니다. 실제 장치·파형·throughput 검증은 별도 조건을 기록합니다.


## 관련 항목

- [Ch 3: 메모리 맵·플래시·SPIFFS/LittleFS](/blog/embedded/riscv/esp32-c3-mastering/chapter03-memory-flash)
- [Ch 5: 시리얼 통신 4종 — UART·SPI·I2C·I2S](/blog/embedded/riscv/esp32-c3-mastering/chapter05-uart-spi-i2c-i2s)
- [Ch 6: ADC·터치 센서](/blog/embedded/riscv/esp32-c3-mastering/chapter06-adc-touch)
- [원문 — ESP-IDF GPIO API](https://docs.espressif.com/projects/esp-idf/en/latest/esp32c3/api-reference/peripherals/gpio.html)
- [원문 — ESP-IDF LEDC API](https://docs.espressif.com/projects/esp-idf/en/v5.4.2/esp32c3/api-reference/peripherals/ledc.html)
