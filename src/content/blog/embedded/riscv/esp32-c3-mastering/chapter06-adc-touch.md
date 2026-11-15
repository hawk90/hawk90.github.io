---
title: "ESP32-C3 ADC — 캘리브레이션·샘플링과 터치 부재"
slug: "embedded/riscv/esp32-c3-mastering/chapter06-adc-touch"
date: 2026-05-20T09:06:00
description: "ESP-IDF v5.4.2의 ADC1 5채널·ADC2 제약과 calibration 오류·continuous record를 확인합니다. C3에는 터치 주변장치가 없습니다."
series: "ESP32-C3 Mastering"
seriesOrder: 6
tags: [adc, touch, analog, calibration, esp32-c3]
draft: false
topics: ["embedded", "embedded/riscv"]
---

## 한 줄 요약

> **C3의 ADC1은 GPIO0~4에 연결된5채널이며 ADC2는 GPIO5의1채널입니다. 터치 주변장치는 없습니다.** Hardware 채널 수와 SDK가 지원하는 사용 모드를 구분합니다.

기준은 ESP-IDF v5.4.2 commit `f5c3654a1c2d2a01f7f67def7a0dc48e691f63c0`입니다. 이 장의 helper 검사는 실제 ADC 입력·오차·전원 차단 시험과 구분합니다. Pin 보호·부품 허용 전압·기준 계측기·board 전원 조건을 함께 기록해야 전압 측정 결과를 평가할 수 있습니다.

## C3 ADC의 대상 제약

기준 `soc_caps.h`는 ADC unit2개와 channel5/1개를 선언합니다. GPIO4를 board에 따라 내부 reference로 바꾸는 설명은 근거가 없습니다. `adc_oneshot.c`는 C3의 ADC2 사용을 기본 제한하며 override는 별도의 호환성 설정입니다. Continuous ADC2도 hardware errata와 driver 제한을 따릅니다. 이를 다른 ESP32의 Wi-Fi 충돌 설명만으로 대체하지 않습니다.

Attenuation은 입력 범위와 calibration 조건을 함께 바꿉니다. `ADC_ATTEN_DB_0`, `_2_5`, `_6`, `_12`를 선택할 수 있지만 raw12-bit를 곧바로0~3.3V로 비례 환산하지 않습니다. 실제 측정 범위·오차와 절대 허용 pin 전압은 다른 값이므로 선택한 [datasheet](https://www.espressif.com/sites/default/files/documentation/esp32-c3_datasheet_en.pdf)와 [calibration driver](https://github.com/espressif/esp-idf/blob/f5c3654a1c2d2a01f7f67def7a0dc48e691f63c0/components/esp_adc/adc_cali_curve_fitting.c)를 확인합니다.

## ADC oneshot 모드

Handle 생성·channel 설정·calibration 생성·변환의 오류를 각각 확인합니다. 다음 context는 zero-initialize하고 한 task가 소유하며, 읽는 동안 다른 task가 close하지 않는 조건입니다. Init 실패의 정리도 실패했다면 남은 handle을 context에 유지하므로 caller가 close를 다시 시도할 수 있습니다.

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

Calibration 후 mV를 평균하므로 "raw 평균을 nonlinear calibration에 넣는 방식"과 일반적으로 같은 값이 아닙니다. Sample count를 늘렸다고 고정±2mV 정확도나 독립 noise 감소를 보장하지 않습니다. 읽기/변환 실패 시 `out`을 새 측정값으로 갱신하지 않습니다.

## eFuse calibration 오류는 단위 변환 실패로 처리

`adc_cali_create_scheme_curve_fitting()`의 `ESP_ERR_NOT_SUPPORTED`는 이 scheme이 요구하는 eFuse 정보를 사용할 수 없다는 계약입니다. 기준 구현은 encoding version 범위를 검사합니다. 이 오류만으로 특정 생산 batch 불량이라고 판단하거나 임의1100mV full-scale을 대신 넣지 않습니다.

C3의 key/MAC/calibration 배치를 과거 ESP32의 BLK1~3 표로 복사하지 않습니다. 고정 source의 eFuse table과 read-only SDK 조회를 사용하며, 이 장에는 fuse를 굽는 명령을 넣지 않습니다. Calibration을 준비하지 못했다면 raw 값과 미보정 상태를 구분해 보고하고 별도 계측·보정 절차를 정합니다.

## 배터리 전압 모니터 실습

배터리 전압을 pin에 직접 연결하지 않습니다. 입력 최대값·분압 오차·ADC 측정 범위·pin 절대 허용값과 전원 꺼진 상태의 역급전을 함께 검토합니다. 아래100kΩ 두 개는 계산을 설명하는 예이며 검증된 제품 회로가 아닙니다.

![Voltage divider for battery measurement](/images/blog/riscv/esp32-c3-mastering/diagrams/ch06-voltage-divider.svg)

두 저항이 정확히 같으면 nominal gain은2입니다. 4.2V를200kΩ으로 나눈 상시 전류는21µA이며 ADC 입력은2.1V가 됩니다. 실제 배터리 전압은 위 helper가 성공한 경우의 mV에 nominal ratio를 적용해 계산하되 저항 허용차·입력 누설·settling 오차를 포함합니다.

큰 저항은 상시 전류를 줄이지만 sample-and-hold 충전과 RC settling에 영향을 줍니다. 임의100µF를 병렬로 추가하면 항상 좋아진다는 설명은 제거했습니다. R1/R2·입력 capacitor·switch·샘플링 간격을 함께 정하고 기준 계측기로 지연과 정확도를 확인합니다.

## Continuous mode — 고속 샘플링

기준 C3 `soc_caps.h`의 digital sampling 범위는611~83333Hz이며 MHz급 ADC라고 설명하지 않습니다. 요청 rate·pattern 길이·실제 rate와 task의 소비 속도를 구분합니다. Oneshot과 continuous가 같은 unit을 동시에 소유하지 않도록 수명을 관리합니다.

Handle 생성, `adc_continuous_config()`, start, read의 오류를 확인하고 종료 시 stop/deinit합니다. Read timeout이나 pool overflow는 정상 sample로 해석하지 않습니다. TYPE2 record는 기준 target에서4byte이며32record는128byte입니다.20krecord/s라면32개분량은1.6ms이지만 channel pattern이 여러 개면 채널별 rate는 달라집니다.

다음 decoder는 **ADC1 channel0 pattern의 C3 TYPE2 buffer**만 허용합니다. Unaligned byte buffer를 struct pointer로 cast하지 않고 memcpy로 읽습니다.

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

단위·channel이 다른 record를 버리려는 제품이라면 별도의 정책으로 구현합니다. 위 함수는 잘못된 record를 포함한 batch를 거부하고 output/count를 갱신하지 않습니다. 실제 DMA read 경로·overflow·재시작은 target 시험이 필요합니다.

## 노이즈 대책

Noise·분압 settling·전원 변동·reference 오차·calibration 잔차를 분리합니다. Calibration만으로0V offset이 고정0~50mV가 되거나 유효 bit가 항상10~11이라고 보장하지 않습니다.

RC cutoff는 `1 / (2πRC)`로 계산합니다. 예를 들어1kΩ·100nF는약1.59kHz입니다. PCB의 return path와 부품 배치·decoupling은 실제 회로를 보고 판단하며 analog/digital ground를 무조건 나누는 규칙으로 제시하지 않습니다.

평균·median·EMA는 서로 다른 필터입니다. Average는 bounded count·읽기 오류·overflow를 확인하고, median은 고정 최대 크기와 comparator를 갖추어야 하며 EMA는 초기 상태·sampling interval을 기록합니다. 세 개를 겹쳤다고 "센서급 안정성"이 증명되지는 않습니다. 응답 지연과 noise 분포를 같은 입력에서 비교합니다.

## 터치 센서 — C3에는 없습니다

ESP32(원조)는 *10채널 정전식 터치*가 있고 *deep-sleep wake-up source*로도 쓸 수 있었습니다. **C3에는 터치 페리퍼럴이 없습니다.**

외부 touch controller의 GPIO interrupt 또는 별도 버튼을 사용할 수 있지만 interface·동작 전압·소비전류·sleep 중 출력 level을 해당 부품 자료에서 확인합니다. 근거가 없는 "공식 RC oscillator 예제"와 추가 부품 없이 같은 동작을 보장한다는 설명은 제외했습니다.

Light-sleep GPIO wake API와 Deep-sleep API를 섞지 않습니다. C3의 Deep-sleep GPIO wake는 `esp_deep_sleep_enable_gpio_wakeup(mask, mode)`의 지원 pin을 확인하며 GPIO9을 RTC GPIO로 가정하지 않습니다. 실제 pin·pull·level과 재기동 과정은 [Ch12](/blog/embedded/riscv/esp32-c3-mastering/chapter12-power-management)에서 다룹니다.

## 자주 하는 실수

- **ADC unit/channel을 혼동합니다.** ADC1의5개 pin과 ADC2 제약을 target driver·revision별로 확인합니다.
- **Calibration 실패를 숨깁니다.** 보정되지 않은 raw를 mV로 표시하지 않고 실패 원인·재시도 정책을 기록합니다.
- **DMA buffer를 바로 cast합니다.** 반환 byte 수·record 크기·unit/channel·alignment를 검사합니다.
- **평균 count만 늘립니다.** 입력 임피던스·settling·샘플 주기·지연과 calibration을 함께 측정합니다.

## 정리

C3에는 touch peripheral이 없고 ADC 사용에는 target별 제약이 있습니다. Oneshot·calibration·continuous handle 수명을 관리하고, raw/mV·채널별 rate·batch 오류를 구분합니다. 필터 계산·native decoder 검사와 실제 아날로그 정확도·sleep wake 시험은 별도로 남깁니다.

## 다음 장 예고

다음 편은 **Ch 7: WiFi 4 — STA·AP·scan·WPA2/3**입니다. C3의 WiFi 스택을 *프로비저닝부터 보안 모드*까지 한 번에 정리합니다. 이 시리즈가 *진짜로 무선 IoT* 방향으로 진입하는 챕터입니다.


## 관련 항목

- [Ch 4: GPIO Matrix·LEDC](/blog/embedded/riscv/esp32-c3-mastering/chapter04-gpio-ledc-pwm)
- [Ch 5: 시리얼 통신 4종 — UART·SPI·I2C·I2S](/blog/embedded/riscv/esp32-c3-mastering/chapter05-uart-spi-i2c-i2s)
- [Ch 12: RTC·저전력](/blog/embedded/riscv/esp32-c3-mastering/chapter12-power-management) — GPIO wake-up
- [원문 — ESP-IDF ADC API](https://docs.espressif.com/projects/esp-idf/en/v5.4.2/esp32c3/api-reference/peripherals/adc_oneshot.html)
- [원문 — ESP32-C3 ADC Calibration](https://docs.espressif.com/projects/esp-idf/en/v5.4.2/esp32c3/api-reference/peripherals/adc_calibration.html)
