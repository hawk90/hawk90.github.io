---
title: "ESP32-C3 전력 관리 — Modem·Light·Deep Sleep와 Wake 소스"
slug: "embedded/riscv/esp32-c3-mastering/chapter12-power-management"
date: 2026-05-20T09:12:00
description: "ESP32-C3 데이터시트의 모드별 전류 표와 ESP-IDF v5.4.2의 wake source 조건으로 Modem·Light·Deep-sleep을 정리하고, GPIO wake 핀 제약과 RTC 메모리, 입력을 밝힌 배터리 예산 계산을 다룹니다."
series: "ESP32-C3 Mastering"
seriesOrder: 12
tags: [power, sleep, low-power, rtc, esp32-c3]
draft: false
topics: ["embedded", "embedded/riscv"]
---

## 한 줄 요약

> **배터리 수명은 깨어 있는 시간의 전류가 거의 다 정합니다.** C3의 Deep-sleep 전류는 데이터시트 기준 5 µA지만, 30분에 한 번 3초 깨어나는 장치에서도 평균 전류의 대부분은 그 3초에서 나옵니다.

잠든 동안의 전류를 줄이는 것보다 깨어 있는 시간을 줄이는 쪽이 효과가 큽니다. 전기 요금이 대기 전력보다 에어컨을 켠 시간에 좌우되는 것과 같습니다. 이 장은 [ESP32-C3 Datasheet v2.5](https://www.espressif.com/sites/default/files/documentation/esp32-c3_datasheet_en.pdf)의 4.1.3.5절(PMU)과 5.6절(Current Consumption), [ESP-IDF v5.4.2 Sleep Modes](https://docs.espressif.com/projects/esp-idf/en/v5.4.2/esp32c3/api-reference/system/sleep_modes.html) 문서를 기준으로 합니다.

전류는 직접 측정하지 않았습니다. 아래 전류 값은 모두 데이터시트의 칩 단독 값(Table 5-7은 peak, Table 5-8·5-9는 typical)이고, 코드는 v5.4.2로 esp32c3 빌드를 통과시켰습니다. Ch 3에서 본 것처럼 Espressif QEMU는 Deep-sleep에서 깨어나지 않아 wake 동작도 실행하지 못했습니다.

## 전력 모드와 데이터시트 전류

데이터시트 4.1.3.5절은 PMU가 미리 정의한 네 모드를 이렇게 설명합니다.

| 모드 | 4.1.3.5절 설명 |
|---|---|
| Active | CPU, RF 회로, 모든 주변장치가 켜짐 |
| Modem-sleep | CPU는 켜져 있고 clock을 낮출 수 있음. RF는 필요할 때만 주기적으로 켜서 연결 유지 |
| Light-sleep | CPU가 멈춤. MAC, RTC timer, 외부 인터럽트로 깨어나고 무선 연결 유지 가능 |
| Deep-sleep | RTC만 켜짐. 무선 연결 정보는 RTC 메모리에 저장 |

각 모드의 전류는 5.6절의 세 표에 있습니다. Table 5-7의 측정 조건은 3.3 V 공급, 25 °C, RF 포트 기준이고, Table 5-8·5-9에는 측정 조건이 따로 적혀 있지 않습니다.

| 상태 | 조건 | Typ / Peak |
|------|------|------|
| Wi-Fi TX (Table 5-7) | 802.11b 1 Mbps @21 dBm | 335 mA (peak) |
| Wi-Fi TX | 802.11n HT20 MCS7 @18.5 dBm | 276 mA (peak) |
| Wi-Fi RX | 802.11b/g/n HT20 | 84 mA (peak) |
| Modem-sleep (Table 5-8) | 160 MHz, CPU running, 주변장치 clock 꺼짐/켜짐 | 23 / 28 mA |
| Modem-sleep | 80 MHz, CPU idle, 주변장치 clock 꺼짐/켜짐 | 13 / 18 mA |
| Light-sleep (Table 5-9) | VDD_SPI와 Wi-Fi 전원 차단, 모든 GPIO high-impedance | 130 µA |
| Deep-sleep | RTC timer + RTC memory | 5 µA |
| Power off | CHIP_EN low | 1 µA |

Table 5-8 각주에 따르면 Modem-sleep에서는 Wi-Fi가 clock gating되고, flash에 접근할 때는 소비가 더 높을 수 있으며 80 Mbit/s flash를 SPI 2-line mode로 쓸 때 그 소비는 10 mA입니다. 개발 보드의 USB-UART, LDO, 전원 LED는 이 표에 없으므로, 보드 단자에서 재면 이보다 큰 값이 나옵니다.

## Modem-sleep — Wi-Fi 연결을 유지한 채 절약

Wi-Fi station이 AP에 연결된 동안 쓰는 절전입니다. Ch 7에서 본 대로 기본값은 `WIFI_PS_MIN_MODEM`이고, AP의 DTIM마다 깨어나 beacon을 받습니다. `WIFI_PS_MAX_MODEM`은 `listen_interval`마다 깨어나 더 아끼는 대신 broadcast를 놓칠 수 있습니다. Wi-Fi 가이드는 Modem-sleep이 station-only mode에서 AP에 연결된 뒤에만 동작한다고 적습니다.

## Light-sleep — 멈췄다가 그 자리에서 이어서

Light-sleep은 CPU를 멈추고 RAM 내용을 유지한 채 잠드는 모드입니다. 책을 덮지 않고 엎어 둔 채 잠깐 자는 것처럼, 깨어나면 `esp_light_sleep_start()` 다음 줄에서 이어서 실행합니다. 반환값이 `ESP_OK`가 아니면 잠들지 못한 것이므로, 반환값을 꼭 확인합니다.

C3의 Light-sleep GPIO wake는 핀 제약이 없습니다. v5.4.2 Sleep Modes 문서의 C3 해당 절(RTC IO wake가 없는 칩용)은 "Any IO can be used as the external input to wake up the chip from Light-sleep"이라고 적습니다. 핀마다 `gpio_wakeup_enable(pin, GPIO_INTR_LOW_LEVEL)`처럼 level을 정하고 `esp_sleep_enable_gpio_wakeup()`을 부릅니다. C3 `soc_caps.h`는 `SOC_PM_SUPPORT_WIFI_WAKEUP`과 `SOC_PM_SUPPORT_BT_WAKEUP`도 선언하므로, `esp_sleep_enable_wifi_wakeup()`·`esp_sleep_enable_bt_wakeup()`도 wake source로 쓸 수 있고, `SOC_UART_SUPPORT_WAKEUP_INT`에 따라 `esp_sleep_enable_uart_wakeup()`도 있습니다.

매번 직접 부르지 않고 idle 때 자동으로 Light-sleep에 들어가게 할 수도 있습니다. Ch 10에서 본 것처럼 `CONFIG_PM_ENABLE`과 `CONFIG_FREERTOS_USE_TICKLESS_IDLE`을 켜고 `esp_pm_configure()`에 `light_sleep_enable = true`를 주는 방식입니다. 이때 driver나 application이 잡은 PM lock이 하나라도 남아 있으면 잠들지 않습니다.

## Deep-sleep — RTC만 남기고 끔

Deep-sleep은 RTC 도메인만 남기고 모두 끕니다. 깨어나면 함수 다음 줄이 아니라 reset처럼 ROM부터 다시 부팅하고, `app_main()`이 처음부터 실행됩니다. RAM 내용은 사라지고 RTC 메모리(8 KB)만 남습니다.

### C3의 GPIO wake는 GPIO0~5만

같은 Sleep Modes 문서는 "IOs that are powered by the VDD3P3_RTC power domain can be used to wake up the chip from Deep-sleep"이라고 적고, `esp_deep_sleep_enable_gpio_wakeup()`으로 핀과 level을 정하게 합니다. 데이터시트 Table 2-1에서 VDD3P3_RTC로 전원을 받는 GPIO는 GPIO0~5이고, v5.4.2 `soc_caps.h`도 `SOC_GPIO_DEEP_SLEEP_WAKE_VALID_GPIO_MASK`를 `BIT0`~`BIT5`로 정의합니다. boot mode strapping pin인 GPIO9(Table 2-1에서 VDD3P3_CPU 도메인)로는 Deep-sleep에서 깨울 수 없습니다.

trigger는 edge가 아니라 level입니다. `ESP_GPIO_WAKEUP_GPIO_LOW`와 `ESP_GPIO_WAKEUP_GPIO_HIGH` 중 하나를 고릅니다. 아래 helper는 timer와 GPIO 두 wake source를 준비만 하고 잠들지는 않습니다. timer는 최대 24시간으로 제한했습니다.

```c title="c3-sleep.c"
#include <stdint.h>
#include "esp_bit_defs.h"
#include "soc/soc_caps.h"
#include "esp_sleep.h"

esp_err_t c3_prepare_deep_wake(unsigned pin, uint64_t microseconds) {
    if (pin >= 64 || microseconds == 0 || microseconds > UINT64_C(86400000000))
        return ESP_ERR_INVALID_ARG;
    uint64_t mask = UINT64_C(1) << pin;
    if (!(mask & SOC_GPIO_DEEP_SLEEP_WAKE_VALID_GPIO_MASK)) return ESP_ERR_INVALID_ARG;
    esp_err_t error = esp_sleep_enable_timer_wakeup(microseconds);
    if (error != ESP_OK) return error;
    return esp_deep_sleep_enable_gpio_wakeup(mask, ESP_GPIO_WAKEUP_GPIO_LOW);
}
```

두 설정은 한꺼번에 적용되지 않습니다. timer 설정이 성공한 뒤 GPIO 설정이 실패하면 timer source만 켜진 채로 돌아오므로, 호출자는 실패하면 잠들지 말고 오류를 처리해야 합니다.

준비가 끝나면 `esp_deep_sleep_start()`를 부르고, 깨어난 뒤에는 `esp_sleep_get_wakeup_cause()`로 원인을 읽습니다. GPIO로 깨어났다면 `esp_sleep_get_gpio_wakeup_status()`로 어느 핀인지 확인합니다. 원인이 `ESP_SLEEP_WAKEUP_UNDEFINED`이면 sleep에서 깨어난 것이 아니라 전원 투입이나 다른 reset으로 시작한 것이므로, 구체적인 원인은 `esp_reset_reason()`으로 따로 봅니다.

## RTC 메모리 — Deep-sleep을 건너는 변수

Ch 3에서 본 것처럼 `RTC_DATA_ATTR` 변수는 RTC 메모리에 놓이고 Deep-sleep을 지나도 값이 남습니다. 아래는 깨어난 횟수를 세고 60초 뒤 다시 잠드는 예입니다.

```c title="c3-rtc-counter.c"
#include <stdio.h>
#include <stdint.h>
#include "esp_attr.h"
#include "esp_err.h"
#include "esp_sleep.h"

RTC_DATA_ATTR static uint32_t wake_count;

void app_main(void) {
    ++wake_count;
    printf("wake count: %lu\n", (unsigned long)wake_count);
    ESP_ERROR_CHECK(esp_sleep_enable_timer_wakeup(UINT64_C(60000000)));
    esp_deep_sleep_start();
}
```

RTC 메모리는 8 KB이고, Ch 1의 `idf.py size`에서 본 것처럼 ESP-IDF가 이미 일부(hello 예제에서 52 byte)를 씁니다. 전원이 완전히 끊기면 값이 사라지므로, 배터리 교체 뒤에도 남아야 하는 값은 NVS(Ch 3)에 씁니다. heap pointer나 task handle처럼 부팅마다 다시 만들어지는 값은 RTC 메모리에 저장해도 다음 부팅에서 의미가 없습니다.

## ULP 부재 — 잠든 동안 센서를 읽을 수 없다

ESP32 일부 칩에는 main CPU가 잠든 동안 센서를 읽는 ULP coprocessor가 있습니다. v5.4.2 C3 `soc_caps.h`에는 ULP 관련 정의가 하나도 없습니다. 그래서 C3에서 주기적으로 센서를 읽으려면 timer로 main CPU를 깨우거나, 외부 센서의 인터럽트 출력을 GPIO0~5에 연결해 조건이 맞을 때만 깨우는 방식을 씁니다. 외부 센서가 wake 신호를 내려면 그 센서는 C3가 자는 동안에도 전원이 켜져 있어야 하므로, 센서 대기 전류를 예산에 넣습니다.

## 입력을 밝힌 배터리 예산

평균 전류는 한 주기 동안 쓴 전하량을 주기로 나눈 값입니다. 아래 예는 데이터시트 값이 아니라 계산을 보이기 위한 가정값입니다. 깨어 있는 3초 동안 80 mA는 Table 5-7의 Wi-Fi RX 84 mA와 Table 5-8의 Modem-sleep 23~28 mA 사이에 놓이는 값이고, sleep 0.005 mA는 Table 5-9의 Deep-sleep 5 µA입니다. 두 값 모두 배터리 단자 기준이라고 가정하므로 regulator 손실은 빠져 있습니다.

| 입력 | 30분 주기 예 | 5분 주기 예 |
|---|---|---|
| 사용 가능 용량 | 2000 mAh | 2000 mAh |
| 주기 | 1800 s | 300 s |
| Active | 3 s × 80 mA | 3 s × 80 mA |
| 나머지 sleep 전류 | 0.005 mA | 0.005 mA |

아래 계산기는 입력 범위를 검사하고, 주기당 전하량·평균 전류·수명(시간·일수)을 따로 돌려줍니다.

```js title="c3-power-budget.mjs"
export function powerBudget({capacityMah, periodSeconds, activeSeconds,
                              activeMilliamp, sleepMilliamp}) {
    const values = [capacityMah, periodSeconds, activeSeconds, activeMilliamp, sleepMilliamp];
    if (!values.every(Number.isFinite) || capacityMah <= 0 || periodSeconds <= 0 ||
        activeSeconds < 0 || activeSeconds > periodSeconds || activeMilliamp < 0 || sleepMilliamp < 0)
        throw new RangeError('invalid power budget');
    const chargeMas = activeSeconds * activeMilliamp +
        (periodSeconds - activeSeconds) * sleepMilliamp;
    const averageMilliamp = chargeMas / periodSeconds;
    const hours = capacityMah / averageMilliamp;
    const days = hours / 24;
    if (![chargeMas, averageMilliamp, hours, days].every(Number.isFinite) || averageMilliamp <= 0)
        throw new RangeError('zero/overflow budget');
    return {chargeMas, averageMilliamp, hours, days};
}
```

Node.js로 두 예와 잘못된 입력을 넣어 실행한 결과입니다.

```text
30min {"chargeMas":248.985,"averageMilliamp":0.138325,"hours":14458.70233146575,"days":602.4459304777396}
5min {"chargeMas":241.485,"averageMilliamp":0.80495,"hours":2484.626374308963,"days":103.52609892954013}
invalid -> RangeError invalid power budget
```

30분 주기에서 주기당 전하 248.985 mA·s 중 240 mA·s(96%)가 3초의 active 구간에서 나옵니다. 그래서 평균 전류는 0.138 mA, 이상적인 수명은 약 602일입니다. 같은 장치를 5분마다 깨우면 평균이 0.805 mA로 늘고 수명은 약 104일로 5.8배가량 짧아집니다. Deep-sleep 전류를 반으로 줄이는 것보다 깨어 있는 3초를 1초로 줄이는 쪽이 효과가 훨씬 큽니다.

실제 제품의 예산에는 Wi-Fi 재접속에 걸리는 시간, TX burst, 센서와 pull-up 저항, regulator의 대기 전류와 효율, 배터리 자가 방전처럼 이 계산에 없는 항목을 더합니다. TX peak 335 mA(Table 5-7) 같은 순간 전류는 배터리 내부 저항에서 전압 강하를 만듭니다. 이런 burst를 재려면 측정 장비의 대역폭도 충분해야 합니다.

## 진단과 관찰

Deep-sleep 전류가 데이터시트보다 높게 나오면 칩보다 보드를 먼저 의심합니다. 개발 보드의 USB-UART 칩, 전원 LED, LDO 대기 전류는 데이터시트 Table 5-9에 들어 있지 않습니다. GPIO가 외부 pull 저항으로 전류를 흘리는지도 확인합니다.

Deep-sleep timer가 예상보다 빠르거나 느리면 RTC slow clock을 봅니다. 데이터시트는 내부 slow RC oscillator를 "typically about 136 kHz, and adjustable"이라고 적고, v5.4.2의 RTC clock source choice(`RTC_CLK_SRC`)는 기본값이 `CONFIG_RTC_CLK_SRC_INT_RC`("Internal 136 kHz RC oscillator")입니다. 정확도가 필요하면 `CONFIG_RTC_CLK_SRC_EXT_CRYS`("External 32 kHz crystal")를 고르고 GPIO0·1에 32 kHz 크리스털을 답니다(Ch 4). GPIO0·1은 데이터시트 Table 2-6에서 XTAL_32K_P/N과 ADC1_CH0/CH1을 함께 맡는 핀이므로, 크리스털을 쓰려면 이 두 핀을 ADC 입력 배정에서 빼고 계획합니다.

## 시리즈를 마치며

이 시리즈는 ESP32-C3를 코어, 메모리, 주변장치, 무선, 빌드, FreeRTOS, 보안, 전력 순서로 따라왔습니다. 각 장의 수치는 데이터시트·TRM·ESP-IDF v5.4.2 소스에서 가져오거나 직접 빌드·QEMU로 돌려 얻었고, 실제 보드에서만 볼 수 있는 전류·RF·wake 동작은 측정하지 않았다고 밝혀 두었습니다. 제품을 만든다면 그 항목들이 다음에 측정할 목록입니다.

### 다음 시리즈 추천

이 시리즈에서 깊이 다루지 못한 주제를 이어서 볼 수 있는 시리즈입니다.

- **[Embedded Security 시리즈](/blog/embedded/embedded-security/chapter01-threat-model)** — Secure Boot를 공격 모델 수준에서 더 깊이 다룹니다. fault injection, side-channel, glitching 방어까지 이어집니다.
- **[Practical RTOS Internals 시리즈](/blog/embedded/rtos/practical-internals/00-preface)** — FreeRTOS의 내부 자료구조와 스케줄링 정책을 다룹니다. C3의 단일 코어 시분할이 vanilla FreeRTOS와 어디서 다른지 비교해 볼 수 있습니다.
- **[Modern Embedded Recipes 시리즈](/blog/embedded/modern-recipes/00-preface)** — CMake, 동기화 패턴, IRQ 설계의 사례 모음입니다.

## 정리

- C3의 칩 단독 전류는 Wi-Fi TX peak 276~335 mA, Modem-sleep 13~28 mA, Light-sleep 130 µA, Deep-sleep 5 µA입니다(Datasheet v2.5 Table 5-7~5-9).
- Light-sleep은 어떤 GPIO로도 깨울 수 있지만, Deep-sleep GPIO wake는 VDD3P3_RTC 도메인의 GPIO0~5만, level trigger로 됩니다.
- Deep-sleep에서 깨어나면 처음부터 다시 부팅하고, `RTC_DATA_ATTR` 변수만 남습니다.
- C3에는 ULP coprocessor가 없어, 잠든 동안의 센서 읽기는 timer wake나 외부 인터럽트로 대신합니다.
- 30분마다 3초 깨는 가정에서 평균 전류의 96%가 active 구간에서 나오고, 주기를 5분으로 줄이면 수명이 약 5.8배 짧아집니다.
- Deep-sleep timer 정확도는 RTC slow clock이 정하고, 기본은 내부 136 kHz RC입니다.

## 관련 항목

- [Ch 7: WiFi 4 스택](/blog/embedded/riscv/esp32-c3-mastering/chapter07-wifi-stack) — Modem sleep과 DTIM
- [Ch 10: FreeRTOS on ESP32-C3](/blog/embedded/riscv/esp32-c3-mastering/chapter10-freertos) — tickless idle 통합
- [Ch 11: 보안 — Secure Boot, Flash Encryption](/blog/embedded/riscv/esp32-c3-mastering/chapter11-security)
- [Embedded Security 시리즈](/blog/embedded/embedded-security/chapter01-threat-model) — 추천 다음 시리즈
- [Practical RTOS Internals 시리즈](/blog/embedded/rtos/practical-internals/00-preface) — 추천 다음 시리즈
- [Modern Embedded Recipes 시리즈](/blog/embedded/modern-recipes/00-preface) — 추천 다음 시리즈
- [원문 — ESP-IDF Sleep Modes](https://docs.espressif.com/projects/esp-idf/en/v5.4.2/esp32c3/api-reference/system/sleep_modes.html)
- [원문 — ESP-IDF Power Management](https://docs.espressif.com/projects/esp-idf/en/v5.4.2/esp32c3/api-reference/system/power_management.html)
