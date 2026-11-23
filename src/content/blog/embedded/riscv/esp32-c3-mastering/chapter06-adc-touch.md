---
title: "ESP32-C3 ADC — 캘리브레이션·샘플링과 터치 부재"
slug: "embedded/riscv/esp32-c3-mastering/chapter06-adc-touch"
date: 2026-05-20T09:06:00
description: "ESP32-C3 ADC의 채널·감쇠별 측정 범위·오차를 데이터시트로 정리하고, ESP-IDF v5.4.2의 ADC2 제한·eFuse 보정 조건·continuous record 형식과 배터리 분압 계산을 다룹니다. C3에는 터치 주변장치가 없습니다."
series: "ESP32-C3 Mastering"
seriesOrder: 6
tags: [adc, touch, analog, calibration, esp32-c3]
draft: false
topics: ["embedded", "embedded/riscv"]
---

## 한 줄 요약

> **C3에서 실제로 쓸 ADC는 ADC1의 5채널(GPIO0~4)입니다.** ADC2(GPIO5)는 ESP-IDF가 기본으로 막아 두었고, 감쇠를 최대로 해도 보정된 측정 범위는 0~2500 mV입니다. 터치 센서는 없습니다.

ADC 숫자 하나를 mV로 바꾸는 데에는 감쇠, 칩마다 다른 보정값, 입력 회로가 모두 끼어듭니다. 체중계로 치면 눈금(raw 값)만으로는 몸무게를 말할 수 없습니다. 영점 조정(보정)과 체중계가 잴 수 있는 최대 무게(측정 범위)를 함께 알아야 합니다. 이 장은 [ESP32-C3 Datasheet v2.5](https://www.espressif.com/sites/default/files/documentation/esp32-c3_datasheet_en.pdf) 5.5절의 ADC 특성과 [ESP-IDF v5.4.2](https://github.com/espressif/esp-idf/tree/v5.4.2)의 `esp_adc` component를 기준으로 합니다.

코드 블록은 v5.4.2 esp32c3 target 빌드를 통과했습니다. 아래 예제를 Espressif QEMU에서 돌리면 부팅 중 `esp_adc` component의 constructor(`adc_hw_calibration()`, `components/esp_adc/adc_common.c`)가 `W (82) eFuse: calibration efuse version does not match, set default version to 0` 경고를 찍은 뒤 진행하지 않아 `app_main()`에 도달하지 않습니다. 그래서 이 장에는 ADC 측정 로그가 없고, 정확도 수치는 모두 데이터시트 값입니다.

## C3 ADC의 하드웨어와 driver 제약

데이터시트 Features 절은 "Two 12-bit SAR ADCs, up to 6 channels"라고 적고, Table 2-6이 핀을 정합니다. v5.4.2 `soc_caps.h`도 `SOC_ADC_PERIPH_NUM (2)`, `SOC_ADC_CHANNEL_NUM(PERIPH_NUM) ((PERIPH_NUM==0)? 5 : 1)`로 같은 구성을 선언합니다.

| Unit | 채널 | GPIO | ESP-IDF v5.4.2 지원 |
|------|------|------|------|
| ADC1 | CH0~CH4 | GPIO0~4 | oneshot, continuous |
| ADC2 | CH0 | GPIO5 | 기본 비활성 |

ADC2는 driver가 직접 막습니다. `components/esp_adc/adc_oneshot.c`는 C3에서 `CONFIG_ADC_ONESHOT_FORCE_USE_ADC2_ON_C3`가 꺼져 있으면 ADC2로 unit을 만드는 요청을 `"adc unit not supported"`와 함께 `ESP_ERR_INVALID_ARG`로 돌려줍니다. 이 Kconfig의 도움말은 "On ESP32C3, ADC2 Digital Controller is not stable. Therefore, ADC2 oneshot mode is not suggested on ESP32C3"라고 적고, ADC oneshot 문서는 원인을 [ESP32-C3 Series SoC Errata](https://www.espressif.com/sites/default/files/documentation/esp32-c3_errata_en.pdf)로 연결합니다. continuous mode도 기본 설정에서는 `adc_continuous.c`가 `SOC_ADC_DIG_SUPPORTED_UNIT(UNIT) ((UNIT == 0) ? 1 : 0)` 검사로 ADC1만 허용합니다(`CONFIG_ADC_CONTINUOUS_FORCE_USE_ADC2_ON_C3_S3`로 강제 가능, 기본값 n).

GPIO0·1은 32 kHz 크리스털 핀도 겸하고, GPIO2는 strapping 핀입니다(Ch 4). 외부 크리스털을 쓰지 않는 보드라면, GPIO2의 reset 레벨 문제를 피해 아날로그 입력을 GPIO0, 1, 3, 4에 먼저 배정합니다.

### 감쇠별 측정 범위와 오차

SAR ADC 자체는 낮은 전압만 직접 잴 수 있어서, 칩 안의 감쇠기로 입력을 줄인 뒤 변환합니다. ESP-IDF는 `ADC_ATTEN_DB_0`, `_2_5`, `_6`, `_12` 네 단계를 제공합니다(`SOC_ADC_ATTEN_NUM (4)`). 데이터시트 Table 5-6은 하드웨어 보정과 소프트웨어 보정을 거친 결과를 감쇠별로 적습니다.

| 감쇠 (Table 5-6 표기) | ESP-IDF enum | 유효 측정 범위 | Total error |
|------|------|------|------|
| ATTEN0 | `ADC_ATTEN_DB_0` | 0~750 mV | ±10 mV |
| ATTEN1 | `ADC_ATTEN_DB_2_5` | 0~1050 mV | ±10 mV |
| ATTEN2 | `ADC_ATTEN_DB_6` | 0~1300 mV | ±10 mV |
| ATTEN3 | `ADC_ATTEN_DB_12` | 0~2500 mV | ±35 mV |

12-bit raw 값 4095를 3.3 V로 비례 환산하면 틀리는 이유가 이 표에 있습니다. 최대 감쇠에서도 보정된 범위는 2500 mV까지이고, 그 위의 전압은 측정 범위 밖입니다. Table 5-5는 보정 전 특성도 적습니다. 외부 100 nF 커패시터, DC 입력, 25 °C, Wi-Fi off 조건에서 DNL ±7 LSB, INL ±12 LSB이고, 샘플링 속도는 최대 100 kSPS입니다. 같은 표의 각주는 "To get better DNL results, you can sample multiple times and apply a filter, or calculate the average value"라고 권합니다.

## ADC oneshot 모드

oneshot은 호출할 때마다 한 번 변환하는 방식입니다. 아래 코드는 ADC1 CH0(GPIO0)을 12 dB 감쇠로 열고, curve fitting 보정 handle을 만든 뒤, 여러 번 읽어 mV 평균을 냅니다. 초기화 중 어느 단계에서 실패해도 만든 handle을 정리하고, 정리까지 실패하면 닫지 못한 handle을 context에 그대로 두어 caller가 다시 닫을 수 있게 했습니다.

```c title="c3-adc.c"
#include <stddef.h>
#include <stdint.h>
#include "esp_adc/adc_oneshot.h"
#include "esp_adc/adc_cali.h"
#include "esp_adc/adc_cali_scheme.h"

typedef struct {
    adc_oneshot_unit_handle_t unit;
    adc_cali_handle_t calibration;
} c3_adc_t;

esp_err_t c3_adc_close(c3_adc_t *ctx) {
    if (!ctx) return ESP_ERR_INVALID_ARG;
    if (ctx->calibration) {
        esp_err_t error = adc_cali_delete_scheme_curve_fitting(ctx->calibration);
        if (error != ESP_OK) return error;
        ctx->calibration = NULL;
    }
    if (ctx->unit) {
        esp_err_t error = adc_oneshot_del_unit(ctx->unit);
        if (error != ESP_OK) return error;
        ctx->unit = NULL;
    }
    return ESP_OK;
}

esp_err_t c3_adc_open(c3_adc_t *ctx) {
    if (!ctx) return ESP_ERR_INVALID_ARG;
    if (ctx->unit || ctx->calibration) return ESP_ERR_INVALID_STATE;
    adc_oneshot_unit_init_cfg_t unit = {
        .unit_id = ADC_UNIT_1, .ulp_mode = ADC_ULP_MODE_DISABLE,
    };
    esp_err_t error = adc_oneshot_new_unit(&unit, &ctx->unit);
    if (error != ESP_OK) return error;
    adc_oneshot_chan_cfg_t channel = {
        .bitwidth = ADC_BITWIDTH_12, .atten = ADC_ATTEN_DB_12,
    };
    error = adc_oneshot_config_channel(ctx->unit, ADC_CHANNEL_0, &channel);
    if (error == ESP_OK) {
        adc_cali_curve_fitting_config_t calibration = {
            .unit_id = ADC_UNIT_1, .chan = ADC_CHANNEL_0,
            .atten = ADC_ATTEN_DB_12, .bitwidth = ADC_BITWIDTH_12,
        };
        error = adc_cali_create_scheme_curve_fitting(&calibration, &ctx->calibration);
    }
    if (error != ESP_OK) (void)c3_adc_close(ctx);
    return error;
}

esp_err_t c3_adc_read_mean_mv(c3_adc_t *ctx, size_t count, int *out) {
    if (!ctx || !out || count == 0 || count > 64) return ESP_ERR_INVALID_ARG;
    if (!ctx->unit || !ctx->calibration) return ESP_ERR_INVALID_STATE;
    int64_t sum = 0;
    for (size_t i = 0; i < count; ++i) {
        int raw, millivolts;
        esp_err_t error = adc_oneshot_read(ctx->unit, ADC_CHANNEL_0, &raw);
        if (error != ESP_OK) return error;
        if (raw < 0 || raw > 4095) return ESP_ERR_INVALID_RESPONSE;
        error = adc_cali_raw_to_voltage(ctx->calibration, raw, &millivolts);
        if (error != ESP_OK) return error;
        sum += millivolts;
    }
    *out = (int)(sum / (int64_t)count);
    return ESP_OK;
}
```

raw 값은 범위를 확인한 뒤 mV로 바꾸고, mV를 평균합니다. 보정 곡선이 비선형이라 raw를 먼저 평균하고 한 번만 변환한 값과는 일반적으로 다릅니다. 읽기나 변환이 실패하면 `out`을 건드리지 않고 오류를 돌려줍니다.

## eFuse 보정이 없으면 mV도 없다

v5.4.2 ADC calibration 문서에 따르면 C3 ADC의 설계 기준전압은 1100 mV지만 실제 칩마다 1000~1200 mV 사이로 다르고, 보정 driver가 이 차이를 줄입니다. `adc_cali_create_scheme_curve_fitting()`은 eFuse에 기록된 보정값을 읽어 보정 곡선을 만들며, 같은 문서는 이 함수의 `ESP_ERR_NOT_SUPPORTED`가 "the calibration scheme required eFuse bits are not correct on your board"라는 뜻이라고 적습니다. v5.4.2의 `adc_cali_curve_fitting.c`는 먼저 `esp_efuse_rtc_calib_get_ver()`로 eFuse의 보정 encoding version을 읽고, 그 값이 `ESP_EFUSE_ADC_CALIB_VER_MIN`~`MAX` 범위를 벗어나면 `"Calibration required eFuse bits not burnt"`와 함께 `ESP_ERR_NOT_SUPPORTED`를 돌려줍니다. C3의 `esp_efuse_rtc_calib.h`는 MIN과 MAX를 모두 `ESP_EFUSE_ADC_CALIB_VER` = 1로 정의합니다.

`esp_efuse_rtc_calib.c`는 eFuse의 `BLK_VERSION_MAJOR`가 1일 때만 version 1을 돌려주고, 아니면 위의 `calibration efuse version does not match, set default version to 0` 경고와 함께 0을 돌려줍니다. QEMU에서 이 경고가 나온 것은 QEMU eFuse의 `BLK_VERSION_MAJOR`가 1이 아니라는 뜻입니다. version 0은 허용 범위 1~1 밖이므로, 이 상태에서는 코드상 위 `c3_adc_open()`의 보정 생성 단계가 `ESP_ERR_NOT_SUPPORTED`로 끝납니다.

보정을 만들지 못했을 때 설계값 1100 mV를 기준으로 mV를 계산하면, 칩마다 1000~1200 mV로 흩어지는 기준전압 차이(약 ±9%)가 그대로 결과에 들어갑니다. Table 5-6의 ±10~35 mV보다 훨씬 큰 오차입니다. 이 경우에는 raw 값과 "미보정" 상태를 따로 보고하고, 기준 전압원을 이용한 자체 보정 절차를 둡니다. 데이터시트도 Table 5-6 앞에서 "For higher accuracy, you may implement your own calibration methods"라고 적습니다.

## 배터리 전압 모니터

1셀 리튬 배터리의 만충 전압 4.2 V는 위 표의 최대 범위 2500 mV를 넘으므로 그대로 연결할 수 없습니다. 분압기로 절반으로 줄이면 2.1 V가 되어 ATTEN3 범위 안에 들어옵니다.

![Voltage divider for battery measurement](/images/blog/riscv/esp32-c3-mastering/diagrams/ch06-voltage-divider.svg)

100 kΩ 두 개로 나누면 계산은 다음과 같습니다.

| 항목 | 값 |
|------|------|
| 분압비 (R2 / (R1 + R2)) | 0.5, 배터리 전압 = ADC 전압 × 2 |
| 4.2 V에서 ADC 입력 | 2.1 V |
| 상시 전류 (4.2 V / 200 kΩ) | 21 µA |
| ADC에서 본 소스 임피던스 (R1 ∥ R2) | 50 kΩ |

21 µA는 Ch 1에서 본 Deep-sleep 전류 5 µA의 네 배라, 배터리로 오래 자는 장치라면 이 분압기가 가장 큰 소비원이 됩니다. 저항을 더 키우면 전류는 줄지만 소스 임피던스가 커져 ADC 샘플링 커패시터를 충전하는 시간이 길어집니다. 데이터시트 Table 5-5의 DNL·INL은 "ADC connected to an external 100 nF capacitor" 조건에서 잰 값이므로, 입력에 커패시터를 두어야 데이터시트 조건과 맞습니다. 분압기를 MOSFET으로 켜고 끄는 회로라면 켠 뒤 settling 시간을 두고 읽어야 합니다. 저항 허용차 1%짜리 두 개면 분압비 자체가 최대 약 1% 틀어질 수 있다는 점도 계산에 넣습니다.

## Continuous mode — DMA로 연속 샘플링

continuous mode는 ADC 디지털 컨트롤러가 정해진 속도로 변환하고 결과를 DMA로 메모리에 쌓습니다. v5.4.2 `soc_caps.h`는 C3의 샘플링 주파수 범위를 `SOC_ADC_SAMPLE_FREQ_THRES_LOW 611`~`SOC_ADC_SAMPLE_FREQ_THRES_HIGH 83333` Hz로 정의하고, pattern table 항목은 최대 8개(`SOC_ADC_PATT_LEN_MAX (8)`)입니다. 데이터시트의 하드웨어 상한 100 kSPS보다 driver 상한 83333 Hz가 낮습니다.

결과 record는 4 byte(`SOC_ADC_DIGI_RESULT_BYTES (4)`)이고, C3의 `hal/adc_types.h`는 이를 `type2` 비트필드로 정의합니다.

| 비트 | 필드 | 뜻 |
|------|------|------|
| 0~11 | `data` | 12-bit 변환값 |
| 12 | `reserved12` | 예약 |
| 13~15 | `channel` | 채널 번호 |
| 16 | `unit` | 0 = ADC1, 1 = ADC2 |
| 17~31 | `reserved17_31` | 예약 |

32 record는 128 byte입니다. 20 kHz로 한 채널만 읽는다면 32 record가 1.6 ms 분량이고, pattern에 채널을 여럿 넣으면 그 속도를 채널들이 나눠 갖습니다.

아래 decoder는 DMA buffer가 ADC1 CH0 record만 담고 있는지 검사한 뒤 값을 꺼냅니다. byte buffer를 구조체 포인터로 바로 cast하지 않고 `memcpy()`로 읽어 정렬 문제를 피합니다.

```c title="c3-adc-decode.c"
#include <stddef.h>
#include <stdint.h>
#include <stdbool.h>
#include <string.h>
#include "hal/adc_types.h"

bool c3_adc_decode(const uint8_t *bytes, size_t size, uint16_t *out,
                   size_t capacity, size_t *count) {
    _Static_assert(sizeof(adc_digi_output_data_t) == 4, "C3 TYPE2 record size");
    if (!bytes || !out || !count || size == 0 || size % 4 || size / 4 > capacity)
        return false;
    for (size_t i = 0; i < size; i += 4) {
        adc_digi_output_data_t value;
        memcpy(&value, bytes + i, sizeof(value));
        if (value.type2.unit != 0 || value.type2.channel != 0) return false;
    }
    for (size_t i = 0; i < size; i += 4) {
        adc_digi_output_data_t value;
        memcpy(&value, bytes + i, sizeof(value));
        out[i / 4] = value.type2.data;
    }
    *count = size / 4;
    return true;
}
```

다른 unit·channel의 record가 하나라도 섞이면 batch 전체를 거부하고 `out`·`count`를 건드리지 않습니다. 여러 채널을 pattern에 넣는 제품이라면 이 검사 대신 record마다 `channel`로 분류하는 decoder를 씁니다.

## 노이즈 대책

ADC 값이 흔들리는 원인은 여러 겹입니다. 입력 신호 자체의 노이즈, 분압기 settling, 전원 변동, ADC의 DNL·INL, 보정 잔차가 각각 다른 대책을 요구합니다.

**아날로그 RC 필터.** 입력에 저역 통과 RC를 두면 cutoff는 `1 / (2πRC)`입니다. 1 kΩ·100 nF라면 약 1.59 kHz입니다. 배터리처럼 천천히 변하는 신호라면 cutoff를 훨씬 낮춰도 됩니다.

**디지털 필터.** 평균, median, EMA는 잘 걸러내는 노이즈와 치르는 대가가 서로 다릅니다.

| 필터 | 잘 걸러내는 것 | 대가 |
|------|------|------|
| N개 평균 | 무작위 노이즈 | 응답이 N 샘플만큼 늦음 |
| median | 가끔 튀는 값 | 정렬 비용, 고정 크기 buffer 필요 |
| EMA | 무작위 노이즈, 메모리 최소 | 초기값과 샘플 간격에 따라 응답이 달라짐 |

데이터시트의 DNL 각주가 권하는 것도 여러 번 샘플링한 뒤 평균하거나 필터를 거는 방법입니다. 다만 Table 5-6의 total error ±35 mV(ATTEN3)는 보정 후에도 남는 오차라, 평균을 아무리 늘려도 이 아래로 정확해진다는 근거는 없습니다.

## 터치 센서 — C3에는 없습니다

원조 ESP32 데이터시트 v5.3은 "10 touch sensors"를 적지만, C3 데이터시트 v2.5의 주변장치 목록에는 touch sensor가 없습니다. v5.4.2 C3 `soc_caps.h`에도 `SOC_TOUCH_SENSOR_SUPPORTED`가 없습니다. 터치 버튼이 필요하면 I2C나 GPIO로 결과를 내보내는 외부 터치 컨트롤러 IC를 붙입니다.

ESP32에서는 터치로 deep sleep에서 깨어날 수 있었지만, C3에서 deep sleep을 깨우는 GPIO는 정해져 있습니다. `soc_caps.h`의 `SOC_GPIO_DEEP_SLEEP_WAKE_VALID_GPIO_MASK`는 GPIO0~5만 포함하고, `esp_deep_sleep_enable_gpio_wakeup(mask, mode)`도 이 핀에서만 동작합니다. C3 `soc_caps.h`에는 RTC IO가 없고(`SOC_RTCIO_PIN_COUNT (0U)`) `EXT0`/`EXT1` wakeup 지원 정의도 없습니다. 외부 터치 IC의 인터럽트 출력을 deep sleep wake에 쓰려면 GPIO0~5 중 하나에 연결합니다. wake 설정은 Ch 12에서 다룹니다.

## 자주 하는 실수

- **ADC2(GPIO5)를 그냥 엽니다.** v5.4.2 기본 설정에서 `adc_oneshot_new_unit()`이 `ESP_ERR_INVALID_ARG`를 돌려줍니다.
- **raw 4095를 3.3 V로 계산합니다.** 보정된 측정 범위는 감쇠 최대일 때도 0~2500 mV입니다.
- **보정 실패를 무시하고 mV를 표시합니다.** `ESP_ERR_NOT_SUPPORTED`는 eFuse 보정 version이 맞지 않는다는 뜻입니다.
- **분압기의 상시 전류를 잊습니다.** 100 kΩ + 100 kΩ도 4.2 V에서 21 µA로, 칩 Deep-sleep 전류보다 큽니다.
- **DMA buffer를 구조체 배열로 cast합니다.** 반환 byte 수, 4 byte record 경계, unit·channel을 검사합니다.

## 정리

- C3 ADC는 ADC1 5채널(GPIO0~4)이 주력이고, ADC2(GPIO5)는 errata 때문에 ESP-IDF가 기본으로 막습니다.
- 보정 후 유효 범위는 감쇠별 0~750/1050/1300/2500 mV, total error는 ±10 mV(ATTEN0~2)와 ±35 mV(ATTEN3)입니다.
- curve fitting 보정은 eFuse의 보정 version 1이 필요하고, 없으면 `ESP_ERR_NOT_SUPPORTED`입니다.
- continuous mode는 611~83333 Hz, record는 4 byte `type2` 형식입니다.
- 100 kΩ 분압기는 4.2 V를 2.1 V로 줄이고 21 µA를 상시로 씁니다.
- C3에는 터치 센서와 RTC IO가 없고, deep sleep GPIO wake는 GPIO0~5만 가능합니다.

## 다음 장 예고

다음 편은 **Ch 7: WiFi 4 — STA·AP·scan·WPA2/3**입니다. C3의 Wi-Fi 스택을 프로비저닝부터 보안 모드까지 정리합니다.


## 관련 항목

- [Ch 4: GPIO Matrix·LEDC](/blog/embedded/riscv/esp32-c3-mastering/chapter04-gpio-ledc-pwm)
- [Ch 5: 시리얼 통신 4종 — UART·SPI·I2C·I2S](/blog/embedded/riscv/esp32-c3-mastering/chapter05-uart-spi-i2c-i2s)
- [Ch 12: RTC·저전력](/blog/embedded/riscv/esp32-c3-mastering/chapter12-power-management) — GPIO wake-up
- [원문 — ESP-IDF ADC API](https://docs.espressif.com/projects/esp-idf/en/v5.4.2/esp32c3/api-reference/peripherals/adc_oneshot.html)
- [원문 — ESP32-C3 ADC Calibration](https://docs.espressif.com/projects/esp-idf/en/v5.4.2/esp32c3/api-reference/peripherals/adc_calibration.html)
