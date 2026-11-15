---
title: "ESP32-C3 전력 관리 — Modem·Light·Deep Sleep와 Wake 소스"
slug: "embedded/riscv/esp32-c3-mastering/chapter12-power-management"
date: 2026-05-20T09:12:00
description: "ESP-IDF v5.4.2의 Modem·Light·Deep-sleep 조건과 C3 GPIO wake·RTC 보존을 확인하고 입력이 명시된 전력 예산을 계산합니다."
series: "ESP32-C3 Mastering"
seriesOrder: 12
tags: [power, sleep, low-power, rtc, esp32-c3]
draft: false
topics: ["embedded", "embedded/riscv"]
---

## 한 줄 요약

> **배터리 수명은 Active·sleep·wake 비용과 외부 회로를 합친 예산입니다.** 가장 깊은 sleep의 칩 전류만으로 제품의 평균 전류를 계산할 수 없습니다.

기준은 ESP-IDF v5.4.2 commit `f5c3654a1c2d2a01f7f67def7a0dc48e691f63c0`입니다. 고정 소스의 wake/API 조건과 순수 산술을 대조했으며 실제 board 전류·wake latency·RTC retention·배터리 수명을 측정한 결과가 아닙니다.

## 전력 모드와 상태

| 모드 | CPU/application 상태 | 확인할 조건 |
|---|---|---|
| Active | 일반 실행 | clock·radio·peripheral·workload |
| Modem-sleep | CPU는 실행 가능, radio 활동을 절약 | connection·DTIM/listen interval·coexistence |
| Light-sleep | 실행을 멈췄다 복귀 | wake source·PM lock·driver·RAM retention 설정 |
| Deep-sleep | wake 뒤 startup 경로 재진입 | RTC domain·reset/wake 원인·유효 wake pin·보드 회로 |

고정80mA/15mA/130µA/5µA를 모든 모드의 실측값처럼 사용하지 않습니다. [데이터시트](https://www.espressif.com/sites/default/files/documentation/esp32-c3_datasheet_en.pdf)의 supply·clock·RF·유지 domain 조건과 제품의 측정 지점을 맞춥니다. Wake 시간200ms와 고정16000배 같은 보장도 사용하지 않습니다.

## Modem Sleep — WiFi 끄기

연결된 station의 power-save는 AP와의 beacon/DTIM·listen interval 관계를 포함합니다. 항상 RF를 완전히 끄는 mode나 특정15mA 평균값으로 설명하지 않습니다. `esp_wifi_set_ps()`의 반환과 실제 packet/latency·연결 유지·전류를 함께 확인합니다. Wi-Fi가 없는 workload의 Modem-sleep 조건과도 구분합니다.

## Light Sleep — 클럭 정지, 상태 보존

명시적 `esp_light_sleep_start()`는 복귀 가능한 sleep API이며 반환 오류·활성 wake source를 확인합니다. 자동 Light-sleep은 PM/tickless·lock·driver 조건과 연결되어 있고 단순히 같은 함수의 반복 호출과 동등하지 않습니다.

Light-sleep GPIO wake는 `gpio_wakeup_enable()`로 각 pin의 level을 설정하고 `esp_sleep_enable_gpio_wakeup()`을 사용합니다. 이를 RTC GPIO0~5만 가능하다고 제한하지 않습니다. 반대로 이 API를 그대로 Deep-sleep에 사용하지 않습니다. UART/Wi-Fi wake는 driver·전력 도메인·config의 조건을 해당 API 문서에서 확인합니다.

`esp_pm_configure()`를 사용한다면 `CONFIG_PM_ENABLE`, tickless 설정, 사용 가능한 CPU clock과 모든 lock의 수명을 맞춥니다. 성공 반환만으로 현재 sleep 중이거나 원하는 전류에 도달했다고 판단하지 않습니다.

## Deep Sleep — 거의 모든 것이 꺼짐

Deep-sleep wake는 함수 호출 다음 줄로 복귀하는 경로가 아닙니다. 유지한 RTC domain과 startup 초기화·reset/wake 원인을 확인합니다. eFuse와 flash의 비휘발성 보존을 RTC RAM retention과 같은 종류로 세지 않습니다.

### C3의 GPIO wake 범위

기준 `soc_caps.h`의 `SOC_GPIO_DEEP_SLEEP_WAKE_VALID_GPIO_MASK`는 GPIO0~5를 표시합니다. `esp_deep_sleep_enable_gpio_wakeup()`은 LOW/HIGH level 조건을 받습니다. GPIO9을 Deep-sleep wake pin으로 쓰거나 edge wake와 같다고 설명하지 않습니다.

다음은 C3의 timer와 GPIO source를 **준비만 하는** helper입니다. Sleep에 들어가기 전에 owner가 반환값을 확인하고 이미 활성화한 다른 wake source도 관리합니다. 예에서는 timer를 최대24시간으로 제한합니다.

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

이 준비는 atomic transaction이 아닙니다. GPIO 설정이 실패했다면 timer source는 이미 설정됐을 수 있으므로 오류를 무시하고 sleep에 들어가지 않습니다. GPIO4/5 등 실제 pin의 외부 level·pull·다른 peripheral 점유를 확인하고, wake level이 계속 active여서 곧바로 재기동하지 않는지도 시험합니다.

준비가 성공한 owner가 `esp_deep_sleep_start()`를 호출합니다. Wake 뒤 `esp_sleep_get_wakeup_cause()`로 cause를 읽고 GPIO cause라면 status도 대조합니다. `ESP_SLEEP_WAKEUP_UNDEFINED` 하나만으로 모든 reset을 power-on이라고 분류하지 않습니다.

## RTC SRAM — Deep sleep을 건너뛰는 변수

RTC 데이터를 두는 선언과 실제 유지 조건은 구분합니다. Power domain·linker 배치·reset 원인·cold boot 초기화를 확인합니다. Heap handle·task pointer 등 다시 초기화해야 할 runtime 객체를 RTC에 저장해 그대로 재사용하지 않습니다.

다음은 센서 read가 없는 counter 예입니다. 다른 app_main 예와 합쳐서 중복 정의하지 않습니다.

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

RTC 메모리는 별도 작은 영역이며 linker가 다른 RTC 자료와 함께 사용합니다. 영구 power loss 뒤 유지할 데이터는 별도의 비휘발성 정책·write 빈도·복구를 설계합니다. RTC attribute 하나로 모든 reset에서 보존을 보장하지 않습니다.

## ULP 부재 — C3의 가장 큰 약점

C3에는 application이 Deep-sleep 중 센서 코드를 실행하는 ULP coprocessor가 없습니다. Timer로 main CPU를 깨워 읽거나 외부 sensor/logic의 조건 출력을 wake pin에 연결하는 설계를 검토합니다. 외부 회로를 전부 끄면 wake 신호를 만드는 회로도 꺼질 수 있으므로 domain을 함께 설계합니다.

ULP가 필요한 경우 다른 target의 실제 coprocessor·ADC·GPIO·clock·SDK 지원을 확인합니다. 원래의 "ESP32-H2에 ULP가 있으므로 대체"라는 주장은 이 장의 대안에서 제외했습니다. 다른 칩에 대한 고정 전류·기능 우위를 추정하지 않습니다.

## 입력을 명시한 배터리 예산

아래는 **계산 예제의 가정값**입니다. 실제 battery terminal에서 측정한 전류와 사용 가능한 capacity가 같은 전압 기준으로 표현돼 있다고 가정합니다. Chip supply 전류와 battery 쪽 전류를 regulator 변환 없이 섞지 않습니다.

| 입력 |30분 주기 예 |5분 주기 예 |
|---|---|---|
| 사용 가능 capacity |2000mAh |2000mAh |
| 주기 |1800s |300s |
| Active |3s ×80mA |3s ×80mA |
| 나머지 sleep 전류 |0.005mA |0.005mA |

30분 예는 charge248.985mAs/주기, 평균0.138325mA이고 이상 수명은약14458.7시간, **602.4일**입니다. 기존301일/10개월 계산은 단위를 중복 변환한 오류였습니다.5분 예는 평균0.80495mA, 약103.5일이며 수명 비율은약5.82입니다. 특정제품의8개월/1년 수명을 측정하거나 보장한 값이 아닙니다.

다음 계산기는 유한·범위 입력과 overflow를 검사하며 charge·평균 전류·시간·일을 분리합니다.

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

실제 예산에는 cold boot·연결 재시도·RF burst·센서·LED·pull resistor·regulator quiescent/효율·battery self-discharge·온도와 사용 가능한 capacity를 넣습니다. Burst current에 따른 전압 강하와 계측 bandwidth도 확인합니다.

## 진단과 관찰

Deep-sleep 전류가 높으면 chip domain뿐 아니라 외부 부품과 측정 경로를 분리합니다. Brownout detector를 끄는 것을 일반적인 절전 해결책으로 쓰지 않습니다. 전원 무결성과 reset 원인을 확인합니다.

Timer 오차는 실제 RTC slow clock source·보정·온도·측정 기준으로 분석합니다. 원인을 단일RC8MHz로 정하거나 외부 crystal을 추가하면 항상 해결된다고 설명하지 않습니다. Sleep 함수의 반환·wake cause·PM lock·peripheral 재초기화와 실제 전류 파형을 함께 기록합니다.

## 시리즈를 마치며

이 시리즈는 core·memory·주변장치·무선·build·FreeRTOS·보안·전력 관리의 계약을 나누어 봤습니다. C3의 제약과 SDK source를 확인하는 방법은 이어지는 target 검증의 출발점입니다. 각 장의 native/helper 검사를 실제 silicon·RF·전력·security 시험으로 확대해 제품 증거를 남깁니다.

### 다음 시리즈 추천

이 시리즈에서 닿지 못한 깊이를 채우는 다음 시리즈입니다.

- **[Embedded Security 시리즈](/blog/embedded/embedded-security/chapter01-threat-model)** — Secure Boot V2를 *공격 모델 수준*에서 더 깊이. fault injection, side-channel, glitching에 대한 방어를 다룹니다. 위협 모델과 검증 범위를 넓힐 때 참고합니다.
- **[Practical RTOS Internals 시리즈](/blog/embedded/rtos/practical-internals/00-preface)** — FreeRTOS의 *내부 자료구조와 스케줄링 정책*. C3의 *단일 코어 시분할*이 vanilla FreeRTOS와 *어디서 다른지* 명확해집니다.
- **[Modern Embedded Recipes 시리즈](/blog/embedded/modern-recipes/00-preface)** — *CMake·동기화 패턴·IRQ 설계*의 모범 사례. ESP-IDF 코드를 *더 깔끔하게* 쓰는 데 직접 도움이 됩니다.
- **FreeRTOS Mastering 시리즈** — vanilla FreeRTOS를 *처음부터* 손에 익히는 코스. Espressif fork와의 차이점을 이해하는 데 좋습니다.

ESP32-S3(2 코어·ULP·USB OTG)나 *ESP32-H2(Thread·Zigbee)*로 확장하려면 *지금까지 손에 익은 ESP-IDF 지식*이 그대로 통합니다. 이 시리즈가 *그 출발점*이 되었기를 바랍니다.

## 정리

Wake API의 지원 source·pin·level과 runtime/RTC 수명을 구분합니다. 전류·charge·평균·수명은 같은 기준의 입력으로 계산하고 결과를 actual 측정과 분리합니다. 자동 Light-sleep 설정과 Deep-sleep 준비 성공은 실제 전력·복구·데이터 보존 시험을 대신하지 않습니다.

## 관련 항목

- [Ch 7: WiFi 4 스택](/blog/embedded/riscv/esp32-c3-mastering/chapter07-wifi-stack) — Modem sleep과 DTIM
- [Ch 10: FreeRTOS on ESP32-C3](/blog/embedded/riscv/esp32-c3-mastering/chapter10-freertos) — tickless idle 통합
- [Ch 11: 보안 — Secure Boot, Flash Encryption](/blog/embedded/riscv/esp32-c3-mastering/chapter11-security)
- [Embedded Security 시리즈](/blog/embedded/embedded-security/chapter01-threat-model) — 추천 다음 시리즈
- [Practical RTOS Internals 시리즈](/blog/embedded/rtos/practical-internals/00-preface) — 추천 다음 시리즈
- [Modern Embedded Recipes 시리즈](/blog/embedded/modern-recipes/00-preface) — 추천 다음 시리즈
- [원문 — ESP-IDF Sleep Modes](https://docs.espressif.com/projects/esp-idf/en/v5.4.2/esp32c3/api-reference/system/sleep_modes.html)
- [원문 — ESP-IDF Power Management](https://docs.espressif.com/projects/esp-idf/en/v5.4.2/esp32c3/api-reference/system/power_management.html)
