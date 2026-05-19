---
title: "Ch 4: GPIO·LEDC·MCPWM — 디지털 출력의 세 모드"
date: 2026-05-01T04:00:00
description: "22개 GPIO, GPIO Matrix로 페리퍼럴 자유 매핑. LEDC PWM, MCPWM (모터 제어)."
series: "ESP32-C3 Mastering"
seriesOrder: 4
tags: [gpio, pwm, ledc, mcpwm, esp32-c3]
draft: false
---

## 한 줄 요약

> **"C3의 GPIO는 22개지만, *GPIO Matrix* 덕에 *어떤 페리퍼럴 신호든 어떤 핀에든 라우팅*할 수 있습니다."** LEDC는 *부드러운 LED 제어*(fade 하드웨어), MCPWM은 *모터 제어*(데드밴드, BLDC, 스테퍼)에 특화됩니다.

ESP32 계열의 *가장 강력한 차별점*이 바로 GPIO Matrix입니다. STM32에서는 *USART2_TX는 PA2 또는 PD5*처럼 *AF table에 매핑된 핀*만 사용할 수 있지만, C3에서는 *UART1 TX*를 *GPIO0부터 GPIO21까지 어디든* 보낼 수 있습니다. 보드 레이아웃이 *훨씬 자유로워집니다*.

이 장은 GPIO의 *전기적 특성*과 *Matrix 동작*을 먼저 정리하고, 디지털 출력의 세 가지 모드(GPIO direct, LEDC, MCPWM)를 비교합니다. 실습으로 *RGB LED breathing*과 *서보 제어*를 다룹니다.

## 22개 GPIO — 무엇이 어디에

C3의 GPIO는 *GPIO0부터 GPIO21까지 22개*입니다. 모든 핀이 동등하지는 않습니다.

| GPIO | 특수 기능 | 부팅 시 주의 |
|------|----------|-------------|
| 0~4 | ADC1 ch0~4 | GPIO2는 strapping |
| 8, 9 | strapping pin | boot mode 결정 |
| 12~17 | 내부 flash 연결 | 사용 금지 |
| 18, 19 | USB Serial JTAG | 디버거 사용 시 점유 |
| 20, 21 | UART0 (default) | 콘솔 출력용 |
| 5~7, 10~11 | 자유롭게 사용 가능 | — |

*실질적으로 자유롭게 쓸 수 있는 GPIO*는 *약 12~14개*입니다. 12~17은 *플래시 SPI*로 *기판 안에서* 라우팅되어 *외부로 뽑을 수 없습니다*.

### Strapping pins — GPIO2, GPIO8, GPIO9

부팅 직후 *수십 µs 동안* 이 핀들의 *레벨이 읽혀* boot mode가 결정됩니다.

```text
GPIO9 (BOOT)    GPIO8         부팅 모드
   HIGH         X             SPI flash boot (정상)
   LOW          HIGH          UART download mode (펌웨어 플래시)
   LOW          LOW           예약
```

회로 설계 시 *외부 풀업/풀다운*을 잘못 두면 *부팅 자체가 안 됩니다*. 보통:

- *GPIO9*은 *boot button*용 풀업 + 버튼 풀다운
- *GPIO8*은 *LED indicator*로도 자주 쓰지만 *부팅 시 충돌 주의*
- *GPIO2*는 *strapping이긴 하지만 외부 영향이 작아* 자유롭게 쓰는 보드가 많음

## GPIO Matrix — 페리퍼럴 자유 매핑

GPIO Matrix는 *256-input × 256-output crossbar switch*입니다. 어떤 페리퍼럴 신호도 어떤 IO에 *런타임에 매핑*할 수 있습니다.

```text
페리퍼럴 신호                           IO MUX
  UART0_TX  ─┐                          ┌─→ GPIO 0
  UART0_RX  ─┤                          ├─→ GPIO 1
  SPI2_CLK  ─┤    GPIO Matrix           ├─→ GPIO 2
  SPI2_MOSI ─┤    (256 × 256)           ├─→ ...
  I2C0_SDA  ─┤                          ├─→ GPIO 21
  ...       ─┘                          └─→
```

ESP-IDF가 이 매핑을 *자동*으로 합니다.

```c
#include "driver/uart.h"

void setup_uart_on_gpio7_8(void) {
    uart_config_t cfg = {
        .baud_rate = 115200,
        .data_bits = UART_DATA_8_BITS,
        .parity = UART_PARITY_DISABLE,
        .stop_bits = UART_STOP_BITS_1,
        .flow_ctrl = UART_HW_FLOWCTRL_DISABLE,
    };
    uart_param_config(UART_NUM_1, &cfg);

    // TX=GPIO7, RX=GPIO8 (이론적으로 임의 핀)
    uart_set_pin(UART_NUM_1, 7, 8, UART_PIN_NO_CHANGE, UART_PIN_NO_CHANGE);
}
```

`uart_set_pin`의 두 번째/세 번째 인자가 *TX/RX GPIO 번호*입니다. STM32라면 AF table을 뒤져야 할 일이 *한 줄로 끝납니다*.

### 직결 모드 — IO MUX 직접

매트릭스를 거치면 *1 코어 클럭의 지연*이 추가됩니다. 80 MHz 이상의 *고속 SPI*에서는 *IO MUX 직결 모드*가 필요합니다. 이 경우 *정해진 페리퍼럴-핀 쌍*만 가능합니다.

```text
IO MUX 직결 모드 (default 매핑, 매트릭스 우회)
  SPI2 (FSPI):  CLK=GPIO6, MOSI=GPIO7, MISO=GPIO2, CS0=GPIO10
```

40 MHz 이하 SPI는 *Matrix 경로*로 충분합니다. 80 MHz를 노릴 때만 IO MUX 직결을 고집합니다.

## 기본 GPIO 사용

가장 단순한 디지털 출력 코드입니다.

```c
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
    gpio_config(&cfg);

    while (1) {
        gpio_set_level(LED_PIN, 1);
        vTaskDelay(pdMS_TO_TICKS(500));
        gpio_set_level(LED_PIN, 0);
        vTaskDelay(pdMS_TO_TICKS(500));
    }
}
```

여러 핀을 *한꺼번에* 설정하려면 `pin_bit_mask`에 *비트로 OR*합니다.

```c
.pin_bit_mask = (1ULL << GPIO_NUM_5) | (1ULL << GPIO_NUM_6) | (1ULL << GPIO_NUM_7),
```

### Pull-up/down, open-drain, drive strength

| 옵션 | 사용처 |
|------|--------|
| `GPIO_PULLUP_ENABLE` | I2C SDA/SCL (외부 풀업이 없을 때만) |
| `GPIO_PULLDOWN_ENABLE` | floating input 방지 |
| `GPIO_MODE_OUTPUT_OD` | open-drain (I2C, multi-master bus) |
| `gpio_set_drive_capability` | 5/10/20/40 mA 단계 |

내부 풀업은 *약 45 kΩ*입니다. I2C에서 *외부 4.7 kΩ*에 비하면 약하므로 *고속 통신에는 외부 풀업 필수*입니다.

```c
gpio_set_drive_capability(LED_PIN, GPIO_DRIVE_CAP_3);  // 40 mA
```

### GPIO interrupt

```c
static void IRAM_ATTR button_isr(void *arg) {
    int gpio = (int)arg;
    xQueueSendFromISR(button_queue, &gpio, NULL);
}

void setup_button(void) {
    gpio_config_t cfg = {
        .pin_bit_mask = (1ULL << GPIO_NUM_9),
        .mode = GPIO_MODE_INPUT,
        .pull_up_en = GPIO_PULLUP_ENABLE,
        .intr_type = GPIO_INTR_NEGEDGE,    // 누름 = falling
    };
    gpio_config(&cfg);

    gpio_install_isr_service(0);
    gpio_isr_handler_add(GPIO_NUM_9, button_isr, (void *)GPIO_NUM_9);
}
```

`gpio_install_isr_service`는 *공유 ISR dispatcher*를 설치합니다. 각 핀별 핸들러를 `gpio_isr_handler_add`로 *등록*합니다. ISR 본문은 *짧게*, 본 작업은 *큐로 task*에 넘기는 것이 원칙입니다.

## LEDC — LED용 PWM

LEDC는 *6 채널, 4 timer*를 갖는 PWM 페리퍼럴입니다. *fade 하드웨어*가 있어 LED 밝기를 *부드럽게* 바꿀 수 있습니다.

### 기본 설정 — 단일 LED

```c
#include "driver/ledc.h"

#define LED_GPIO 5
#define LEDC_TIMER LEDC_TIMER_0
#define LEDC_CHANNEL LEDC_CHANNEL_0

void setup_ledc(void) {
    ledc_timer_config_t timer_cfg = {
        .speed_mode = LEDC_LOW_SPEED_MODE,
        .timer_num = LEDC_TIMER,
        .duty_resolution = LEDC_TIMER_13_BIT,
        .freq_hz = 5000,
        .clk_cfg = LEDC_AUTO_CLK,
    };
    ledc_timer_config(&timer_cfg);

    ledc_channel_config_t ch_cfg = {
        .speed_mode = LEDC_LOW_SPEED_MODE,
        .channel = LEDC_CHANNEL,
        .timer_sel = LEDC_TIMER,
        .intr_type = LEDC_INTR_DISABLE,
        .gpio_num = LED_GPIO,
        .duty = 0,
        .hpoint = 0,
    };
    ledc_channel_config(&ch_cfg);
}

void set_brightness(uint32_t duty) {
    // duty range: 0 ~ (2^13 - 1) = 0 ~ 8191
    ledc_set_duty(LEDC_LOW_SPEED_MODE, LEDC_CHANNEL, duty);
    ledc_update_duty(LEDC_LOW_SPEED_MODE, LEDC_CHANNEL);
}
```

13-bit resolution × 5 kHz는 *대부분 LED에 충분*합니다. 더 높은 resolution은 *최대 주파수가 낮아집니다* (`freq × 2^resolution ≤ src_clk`).

| Resolution | 최대 주파수 (APB 80 MHz 기준) |
|------------|------------------------------|
| 8-bit | 312.5 kHz |
| 10-bit | 78 kHz |
| 13-bit | 9.7 kHz |
| 16-bit | 1.2 kHz |

### Fade 하드웨어 — 부드러운 breathing

```c
#include "driver/ledc.h"

void breathe(void) {
    ledc_fade_func_install(0);

    while (1) {
        ledc_set_fade_with_time(LEDC_LOW_SPEED_MODE, LEDC_CHANNEL, 8191, 1000);
        ledc_fade_start(LEDC_LOW_SPEED_MODE, LEDC_CHANNEL, LEDC_FADE_WAIT_DONE);

        ledc_set_fade_with_time(LEDC_LOW_SPEED_MODE, LEDC_CHANNEL, 0, 1000);
        ledc_fade_start(LEDC_LOW_SPEED_MODE, LEDC_CHANNEL, LEDC_FADE_WAIT_DONE);
    }
}
```

CPU 개입 *없이* 하드웨어가 duty를 1 ms마다 갱신합니다. *멀티 LED breathing*도 *모두 백그라운드*에서 진행됩니다.

### RGB LED breathing 실습

```c
#define RED_GPIO   5
#define GREEN_GPIO 6
#define BLUE_GPIO  7

void setup_rgb(void) {
    ledc_timer_config_t timer = {
        .speed_mode = LEDC_LOW_SPEED_MODE,
        .timer_num = LEDC_TIMER_0,
        .duty_resolution = LEDC_TIMER_10_BIT,
        .freq_hz = 5000,
        .clk_cfg = LEDC_AUTO_CLK,
    };
    ledc_timer_config(&timer);

    int pins[] = {RED_GPIO, GREEN_GPIO, BLUE_GPIO};
    for (int i = 0; i < 3; i++) {
        ledc_channel_config_t ch = {
            .speed_mode = LEDC_LOW_SPEED_MODE,
            .channel = i,
            .timer_sel = LEDC_TIMER_0,
            .gpio_num = pins[i],
            .duty = 0,
        };
        ledc_channel_config(&ch);
    }
    ledc_fade_func_install(0);
}

void set_rgb(uint16_t r, uint16_t g, uint16_t b) {
    ledc_set_fade_with_time(LEDC_LOW_SPEED_MODE, 0, r, 100);
    ledc_set_fade_with_time(LEDC_LOW_SPEED_MODE, 1, g, 100);
    ledc_set_fade_with_time(LEDC_LOW_SPEED_MODE, 2, b, 100);
    ledc_fade_start(LEDC_LOW_SPEED_MODE, 0, LEDC_FADE_NO_WAIT);
    ledc_fade_start(LEDC_LOW_SPEED_MODE, 1, LEDC_FADE_NO_WAIT);
    ledc_fade_start(LEDC_LOW_SPEED_MODE, 2, LEDC_FADE_NO_WAIT);
}
```

세 채널이 *같은 timer*를 공유합니다. 위상이 *동기화*되어 색 변화가 *깔끔*합니다.

## MCPWM — 모터 제어 PWM

MCPWM(Motor Control PWM)은 *모터 드라이브*를 염두에 둔 별도 페리퍼럴입니다. LEDC와 비교한 차이입니다.

| 항목 | LEDC | MCPWM |
|------|------|-------|
| 용도 | LED, buzzer, 단순 제어 | BLDC, 스테퍼, 서보 |
| 채널 | 6 | 2 timer × 3 operator = 6 |
| 데드밴드 (dead-time) | 없음 | 있음 (H-bridge 보호) |
| Fault detection | 없음 | 있음 (현재 감지 시 자동 차단) |
| Sync between channels | 약함 | 강함 (H-bridge 동기) |
| Carrier injection | 없음 | 있음 (게이트 드라이버용) |

C3의 MCPWM은 *ESP32 원조*보다 *작지만 동일한 구조*입니다.

### 서보 모터 제어 예

표준 RC 서보는 *50 Hz, 1~2 ms duty*로 0~180도 회전합니다.

```c
#include "driver/mcpwm_prelude.h"

#define SERVO_GPIO 8

#define SERVO_MIN_PULSEWIDTH_US 1000
#define SERVO_MAX_PULSEWIDTH_US 2000
#define SERVO_MAX_DEGREE 180

mcpwm_timer_handle_t timer = NULL;
mcpwm_oper_handle_t oper = NULL;
mcpwm_cmpr_handle_t comparator = NULL;
mcpwm_gen_handle_t generator = NULL;

void setup_servo(void) {
    mcpwm_timer_config_t timer_cfg = {
        .group_id = 0,
        .clk_src = MCPWM_TIMER_CLK_SRC_DEFAULT,
        .resolution_hz = 1000000,        // 1 MHz, 1 µs per tick
        .period_ticks = 20000,           // 20000 µs = 20 ms = 50 Hz
        .count_mode = MCPWM_TIMER_COUNT_MODE_UP,
    };
    mcpwm_new_timer(&timer_cfg, &timer);

    mcpwm_operator_config_t oper_cfg = { .group_id = 0 };
    mcpwm_new_operator(&oper_cfg, &oper);
    mcpwm_operator_connect_timer(oper, timer);

    mcpwm_comparator_config_t cmp_cfg = {
        .flags.update_cmp_on_tez = true,
    };
    mcpwm_new_comparator(oper, &cmp_cfg, &comparator);

    mcpwm_generator_config_t gen_cfg = {
        .gen_gpio_num = SERVO_GPIO,
    };
    mcpwm_new_generator(oper, &gen_cfg, &generator);

    // Timer 0이 되면 HIGH, comparator match에서 LOW
    mcpwm_generator_set_action_on_timer_event(generator,
        MCPWM_GEN_TIMER_EVENT_ACTION(
            MCPWM_TIMER_DIRECTION_UP,
            MCPWM_TIMER_EVENT_EMPTY,
            MCPWM_GEN_ACTION_HIGH));
    mcpwm_generator_set_action_on_compare_event(generator,
        MCPWM_GEN_COMPARE_EVENT_ACTION(
            MCPWM_TIMER_DIRECTION_UP,
            comparator,
            MCPWM_GEN_ACTION_LOW));

    mcpwm_timer_enable(timer);
    mcpwm_timer_start_stop(timer, MCPWM_TIMER_START_NO_STOP);
}

void set_servo_angle(int degree) {
    uint32_t us = SERVO_MIN_PULSEWIDTH_US +
        (degree * (SERVO_MAX_PULSEWIDTH_US - SERVO_MIN_PULSEWIDTH_US)) / SERVO_MAX_DEGREE;
    mcpwm_comparator_set_compare_value(comparator, us);
}
```

`set_servo_angle(0)` → 1 ms duty, `set_servo_angle(180)` → 2 ms duty가 나옵니다.

### BLDC를 위한 dead-time

H-bridge 모터 드라이버는 *high-side와 low-side가 동시에 켜지면 단락(shoot-through)*이 발생합니다. MCPWM은 *transition마다 데드타임*을 자동 삽입합니다.

```c
mcpwm_dead_time_config_t dt_cfg = {
    .posedge_delay_ticks = 100,     // 100 ticks = 100 µs (1MHz resolution 기준)
    .negedge_delay_ticks = 100,
};
mcpwm_generator_set_dead_time(generator, generator, &dt_cfg);
```

데드타임 *없는 PWM*으로 H-bridge를 구동하면 *FET 한 쌍이 즉시 폭발*합니다. *모터 제어에서 가장 비싼 실수*입니다.

## 자주 하는 실수

### "부팅이 안 된다 — 보드를 만지면 시작된다"

GPIO9 strapping이 *부유 상태(floating)*인 경우입니다. 외부 풀업 10 kΩ을 *반드시* 답니다. 보드를 만질 때 정전기가 *우연히* 풀업을 흉내냅니다.

### "GPIO를 출력으로 설정했는데 신호가 안 나온다"

12~17 GPIO는 *내부 flash SPI*입니다. 패키지 핀에 *물리적으로 연결*되어 있지 않습니다. 데이터시트의 *bonded pin* 표를 확인합니다.

### "LEDC fade가 끊긴다"

`ledc_set_duty` + `ledc_update_duty`를 *fade 진행 중에 호출*하면 fade가 *중단*됩니다. fade 중에는 *대기*하거나 `LEDC_FADE_NO_WAIT` 모드의 *완료 콜백*에서 다음 동작을 호출합니다.

### "MCPWM gpio 출력이 toggling만 하고 PWM이 아니다"

generator의 *action*을 설정하지 않은 경우입니다. `set_action_on_timer_event`와 `set_action_on_compare_event` *둘 다*가 필요합니다. 하나만 있으면 *toggle*만 됩니다.

### "GPIO Matrix로 매핑했는데 SPI가 80 MHz가 안 나온다"

Matrix 경로는 *최대 40 MHz*가 안전한 상한입니다. *80 MHz*는 *IO MUX 직결 핀*에서만 보장됩니다. `spi_bus_initialize`에서 *기본 핀 번호*를 쓰면 자동으로 IO MUX 직결을 사용합니다.

### "fade가 1ms 이상으로 안 떨어진다"

`ledc_set_fade_with_time`의 *최소 시간*은 *resolution × duty step*에 비례합니다. 너무 짧으면 *단계가 보이는 stair-step*이 됩니다. *부드러운 fade*는 *최소 100 ms* 이상을 권장합니다.

## 정리

- C3의 GPIO는 22개지만 12~17은 *flash SPI 점유*로 사용 불가, 실질 자유 GPIO는 *약 12~14개*입니다.
- *Strapping pins (GPIO2, 8, 9)*은 부팅 시 boot mode를 결정하므로 *풀업/풀다운을 신중히* 설계합니다.
- *GPIO Matrix*가 256×256 crossbar로 동작해 *어떤 페리퍼럴 신호도 어떤 GPIO에든* 라우팅 가능합니다.
- 80 MHz 이상 고속 신호는 *IO MUX 직결 모드*가 필수이고 *기본 핀 번호*를 그대로 쓰는 것이 안전합니다.
- LEDC는 *LED·buzzer·단순 PWM*에 적합하며 *6 채널 + fade 하드웨어*로 멀티 LED breathing이 CPU 부하 없이 가능합니다.
- MCPWM은 *모터 제어 전용*으로 *데드타임·fault detection·동기 트리거*를 제공해 BLDC와 스테퍼에 적합합니다.
- 서보 모터는 *MCPWM 50 Hz + 1~2 ms duty*로 0~180도 제어가 가능합니다.

다음 편은 **Ch 5: 시리얼 통신 4종 — UART·SPI·I2C·I2S**입니다. *DMA 활용*과 *polling vs 인터럽트 vs DMA* 처리량·지연 비교를 다루고, SSD1306 OLED와 SD card 실습이 들어갑니다.

## 관련 항목

- [Ch 3: 메모리 맵·플래시·SPIFFS/LittleFS](/blog/embedded/riscv/esp32-c3-mastering/chapter03-memory-flash)
- [Ch 5: 시리얼 통신 4종 — UART·SPI·I2C·I2S](/blog/embedded/riscv/esp32-c3-mastering/chapter05-uart-spi-i2c-i2s)
- [Ch 6: ADC·터치 센서](/blog/embedded/riscv/esp32-c3-mastering/chapter06-adc-touch)
- [Modern Embedded Recipes Part 4.4: PWM 정확도](/blog/embedded/modern-recipes/part4-04-pwm-accuracy)
- [Practical RTOS Internals Part 2.4: GPIO ISR latency](/blog/embedded/rtos/practical-internals/part2-04-gpio-isr-latency)
- [원문 — ESP-IDF GPIO API](https://docs.espressif.com/projects/esp-idf/en/latest/esp32c3/api-reference/peripherals/gpio.html)
- [원문 — ESP-IDF MCPWM API](https://docs.espressif.com/projects/esp-idf/en/latest/esp32c3/api-reference/peripherals/mcpwm.html)
