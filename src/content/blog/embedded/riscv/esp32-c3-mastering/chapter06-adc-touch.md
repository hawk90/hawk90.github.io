---
title: "ESP32-C3 ADC와 터치 센서 — 아날로그 입력 처리"
date: 2026-05-20T09:06:00
description: "12-bit SAR ADC × 2 unit, 정전식 터치 9 채널. 캘리브레이션과 노이즈."
series: "ESP32-C3 Mastering"
seriesOrder: 6
tags: [adc, touch, analog, calibration, esp32-c3]
draft: false
---

## 한 줄 요약

> **"C3의 ADC는 *12-bit SAR × ADC1*에 *GPIO0~GPIO4*로 6 채널이고, *터치 센서는 없습니다*."** 캘리브레이션은 *eFuse에 굽힌 보정값*을 읽어 *수십 mV 오차를 보정*하며, 노이즈 대책은 *RC filter + multisampling*이 기본입니다.

ESP32 원조와 가장 큰 차이는 *DAC와 터치 센서의 부재*입니다. C3는 *경량 IoT 노드*에 초점을 맞춰 *센서 허브 기능*을 잘라냈습니다. 그래서 이 장은 *ADC가 거의 전부*입니다. ESP32의 touch wake-up 기능을 *어떻게 대체*할지도 마지막에 정리합니다.

이 장에서는 *attenuation 선택*, *eFuse 캘리브레이션*, *continuous DMA 모드*, *노이즈 대책*을 다룹니다. 실습은 *배터리 전압 모니터*입니다.

## C3 ADC — 사양 한눈에

**ADC1:**

| 속성 | 값 |
|------|-----|
| Type | 12-bit SAR (Successive Approximation Register) |
| Channels | 6 (ADC1_CH0~CH4, ADC1_CH4 = GPIO4) |
| Pins | GPIO0, GPIO1, GPIO2, GPIO3, GPIO4 |
| Sample rate | 최대 ~2 MSPS (continuous mode) |
| Vref | ~1.1 V (internal) |

**ADC2** — 존재하지만 WiFi와 충돌해 *일반 사용 비권장*.

> **메모**: 일부 데이터시트는 "ADC1 6 channels"라고 적지만, 실제로 *GPIO에 연결된 채널*은 *5개(GPIO0~4)*입니다. CH4는 *별도 IO*가 아닌 *내부 reference channel*인 경우가 보드별로 다릅니다.

### Attenuation — 입력 전압 범위 확장

ADC의 *최대 입력 전압*은 *기본 ~1.1 V*입니다. 더 큰 전압을 측정하려면 *attenuation 단계*를 올려 *입력을 분압*합니다.

| Attenuation | 측정 범위 (대략) | 권장 사용 |
|-------------|-----------------|----------|
| 0 dB | 0 ~ 0.95 V | 정확도 중시, 1V 미만 신호 |
| 2.5 dB | 0 ~ 1.32 V | 1.2 V 셀 측정 |
| 6 dB | 0 ~ 1.75 V | 1.5 V battery |
| 12 dB | 0 ~ 3.10 V (실용) | 3.3 V 신호, 가장 흔함 |

`ADC_ATTEN_DB_12`는 *제조 시 "11 dB"로 표기*되기도 합니다. ESP-IDF 5.x에서 이름이 *_12로 통일*되었습니다.

> **주의**: attenuation을 높이면 *분해능이 떨어지고 비선형성이 커집니다*. 정확도가 필요하면 *적절한 attenuation*을 고르고, 분압 저항을 외부에 둬도 됩니다.

## ADC oneshot 모드

가장 단순한 사용은 *oneshot* (한 번 변환 후 값 반환)입니다.

```c
#include "esp_adc/adc_oneshot.h"
#include "esp_adc/adc_cali.h"
#include "esp_adc/adc_cali_scheme.h"

adc_oneshot_unit_handle_t adc1;
adc_cali_handle_t cali;

void setup_adc(void) {
    adc_oneshot_unit_init_cfg_t init_cfg = {
        .unit_id = ADC_UNIT_1,
        .ulp_mode = ADC_ULP_MODE_DISABLE,
    };
    adc_oneshot_new_unit(&init_cfg, &adc1);

    adc_oneshot_chan_cfg_t chan_cfg = {
        .bitwidth = ADC_BITWIDTH_12,
        .atten = ADC_ATTEN_DB_12,
    };
    adc_oneshot_config_channel(adc1, ADC_CHANNEL_0, &chan_cfg);   // GPIO0

    // 캘리브레이션 (Curve Fitting scheme, C3에서 기본)
    adc_cali_curve_fitting_config_t cali_cfg = {
        .unit_id = ADC_UNIT_1,
        .atten = ADC_ATTEN_DB_12,
        .bitwidth = ADC_BITWIDTH_12,
    };
    adc_cali_create_scheme_curve_fitting(&cali_cfg, &cali);
}

int read_voltage_mv(void) {
    int raw;
    adc_oneshot_read(adc1, ADC_CHANNEL_0, &raw);

    int voltage_mv;
    adc_cali_raw_to_voltage(cali, raw, &voltage_mv);
    return voltage_mv;
}
```

`adc_cali_raw_to_voltage`가 *eFuse에 구워진 보정값*을 적용해 *mV 단위*로 변환합니다. 캘리브레이션 *없이* raw 값을 직접 변환하면 *수십 mV 오차*가 흔합니다.

## eFuse 캘리브레이션 — 어떻게 동작하나

Espressif는 출하 전 *모든 칩에 대해 ADC 캘리브레이션*을 수행해 *eFuse*에 결과를 굽습니다. eFuse는 *한 번 굽고 되돌릴 수 없는* OTP 메모리입니다.

| 영역 | 내용 |
|------|------|
| BLK1 | MAC address |
| BLK2 | ADC calibration (factory) — Vref 보정, 채널별 offset |
| BLK3 | 사용자 영역 (secure boot key 등) |

`adc_cali_create_scheme_curve_fitting`은 *Curve Fitting scheme*을 씁니다. 이는 *다항식 보정*으로, *Two Point 보정*보다 *정확하지만 더 많은 eFuse 비트*를 씁니다. C3는 *Curve Fitting을 기본*으로 가집니다.

캘리브레이션 *비활성* 칩(드물지만 양산 초기 일부 ESP32-C3)에서는 다음 호출이 *ESP_ERR_NOT_SUPPORTED*를 돌려줍니다. 이 경우 *수동 보정*이 필요합니다.

```c
esp_err_t err = adc_cali_create_scheme_curve_fitting(&cfg, &cali);
if (err == ESP_ERR_NOT_SUPPORTED) {
    printf("Calibration not burned, falling back\n");
    // Vref 1100 mV 가정한 manual conversion
    voltage_mv = raw * 1100 / 4095;
}
```

## 배터리 전압 모니터 실습

리튬 배터리(3.0~4.2 V)는 *ADC 한계인 3.3 V를 넘으므로* *외부 분압*이 필요합니다.

![Voltage divider for battery measurement](/images/blog/riscv/esp32-c3-mastering/diagrams/ch06-voltage-divider.svg)

분압 비 1:1이라서 *측정값 × 2 = 실제 전압*입니다. 저항을 *100 kΩ 이상*으로 크게 잡는 이유는 *상시 누설 전류 최소화*입니다 (100 kΩ × 2 = 200 kΩ → 4.2V 시 21 µA).

```c
#define BATTERY_DIVIDER_RATIO 2.0f

float read_battery_voltage(void) {
    int sum = 0;
    const int N = 32;

    for (int i = 0; i < N; i++) {
        int raw;
        adc_oneshot_read(adc1, ADC_CHANNEL_0, &raw);
        sum += raw;
    }
    int avg_raw = sum / N;

    int voltage_mv;
    adc_cali_raw_to_voltage(cali, avg_raw, &voltage_mv);

    return (voltage_mv * BATTERY_DIVIDER_RATIO) / 1000.0f;
}
```

*32회 평균*으로 ±2 mV 수준의 안정성이 나옵니다. 100 µF 캐패시터를 *ADC 입력에 병렬*로 두면 더 안정합니다.

## Continuous mode — 고속 샘플링

오디오나 진동 측정처럼 *MHz급 sample rate*가 필요하면 *continuous mode*를 씁니다. DMA가 *링 버퍼*에 연속으로 채우면 사용자 task가 *덩어리*로 가져갑니다.

```c
#include "esp_adc/adc_continuous.h"

adc_continuous_handle_t handle;

void setup_continuous(void) {
    adc_continuous_handle_cfg_t handle_cfg = {
        .max_store_buf_size = 4096,
        .conv_frame_size = 256,
    };
    adc_continuous_new_handle(&handle_cfg, &handle);

    adc_digi_pattern_config_t pat[1] = {
        {
            .atten = ADC_ATTEN_DB_12,
            .channel = ADC_CHANNEL_0,
            .unit = ADC_UNIT_1,
            .bit_width = ADC_BITWIDTH_12,
        }
    };
    adc_continuous_config_t cont_cfg = {
        .pattern_num = 1,
        .adc_pattern = pat,
        .sample_freq_hz = 20000,         // 20 kHz
        .conv_mode = ADC_CONV_SINGLE_UNIT_1,
        .format = ADC_DIGI_OUTPUT_FORMAT_TYPE2,
    };
    adc_continuous_config(handle, &cont_cfg);

    adc_continuous_start(handle);
}

void read_continuous(void) {
    uint8_t buf[256];
    uint32_t bytes_read;

    while (1) {
        if (adc_continuous_read(handle, buf, sizeof(buf),
                                 &bytes_read, 100) == ESP_OK) {
            // buf 안에 adc_digi_output_data_t 구조체 배열
            for (int i = 0; i < bytes_read; i += sizeof(adc_digi_output_data_t)) {
                adc_digi_output_data_t *p = (void*)(buf + i);
                // p->type2.data, p->type2.channel
            }
        }
    }
}
```

20 kHz × 32 samples = 256 bytes per 1.6 ms입니다. CPU는 *읽고 처리*만 하면 됩니다.

## 노이즈 대책

ADC가 *깨끗하게 12 bits*를 다 쓰려면 *PCB 디자인부터 신경*을 써야 합니다. 실전 경험은 *유효 bit가 10~11*에 머무르는 경우가 흔합니다.

### 하드웨어

| 대책 | 효과 |
|------|------|
| ADC 입력에 100 nF 캐패시터 | 고주파 노이즈 제거 |
| RC low-pass filter (1 kΩ + 100 nF) | 100 Hz 이상 cutoff |
| GND plane 분리 (analog vs digital) | 디지털 노이즈 차단 |
| Vref 안정 (LDO regulator) | 기준 변동 제거 |
| 단일점 접지 (single-point GND) | ground loop 제거 |

### 소프트웨어

```c
// 1. Multisampling (가장 흔함)
int read_avg(int channel, int n) {
    int sum = 0;
    for (int i = 0; i < n; i++) {
        int raw;
        adc_oneshot_read(adc1, channel, &raw);
        sum += raw;
    }
    return sum / n;
}

// 2. Median filter (스파이크 제거)
int read_median(int channel, int n) {
    int samples[n];
    for (int i = 0; i < n; i++) {
        adc_oneshot_read(adc1, channel, &samples[i]);
    }
    // qsort + 중앙값 반환
    qsort(samples, n, sizeof(int), int_compare);
    return samples[n / 2];
}

// 3. Exponential moving average (저주파 추적)
float ema = 0;
const float alpha = 0.1f;
void update(int channel) {
    int raw;
    adc_oneshot_read(adc1, channel, &raw);
    ema = alpha * raw + (1.0f - alpha) * ema;
}
```

세 가지 조합이 보통입니다. *64 sample 평균 + median filter + EMA*가 *센서급 안정성*을 줍니다.

## 터치 센서 — C3에는 없습니다

ESP32(원조)는 *10채널 정전식 터치*가 있고 *deep-sleep wake-up source*로도 쓸 수 있었습니다. **C3에는 터치 페리퍼럴이 없습니다.**

대체 방안입니다.

### 1. 외부 터치 IC

CAP1188(8 channel), TTP223(1 channel) 같은 *I2C 터치 컨트롤러*를 외부에 답니다.

| IC | 인터페이스 |
|----|-----------|
| TTP223 | GPIO 인터럽트 |
| CAP1188 | I2C로 폴링 또는 인터럽트 |

### 2. RC oscillator 흉내

GPIO를 *output → input*으로 토글하며 *charge time*을 측정하면 *정전용량 변화*를 잡을 수 있습니다. *정확도와 안정성*은 낮지만 *추가 부품 없이* 됩니다. ESP-IDF의 official 예제에 *이 패턴*이 들어가 있습니다.

### 3. ADC capacitive sensing

저항 + GPIO + ADC로 *RC 회로의 시정수*를 측정하는 방식입니다. 정확도는 낮지만 *전원 켜진 상태에서 단순 터치 감지*에는 충분합니다.

### Wake-up source 대안

deep-sleep에서 깨우는 *원래의 touch wake-up* 기능은 C3에서 다음으로 대체합니다.

| 원래 (ESP32) | C3 대체 |
|--------------|---------|
| touch wake | GPIO wake (low-power) |
| touch + GPIO | GPIO + 외부 푸시버튼 |
| capacitive slider | 외부 IC + GPIO INT |

```c
// 9장에서 다룰 deep-sleep + GPIO wake
esp_sleep_enable_gpio_wakeup();
gpio_wakeup_enable(GPIO_NUM_9, GPIO_INTR_LOW_LEVEL);
esp_deep_sleep_start();
```

## 자주 하는 실수

### "ADC 값이 0V 근처에서 0이 아닌 100~200으로 깔린다"

ADC의 *zero-offset*은 정상 동작입니다. 캘리브레이션을 적용하면 *0~50 mV*로 보정됩니다. raw 값으로 0V를 기대하지 않습니다.

### "WiFi를 켜자 ADC 값이 흔들린다"

ADC2를 쓰는 경우 *WiFi와 하드웨어가 충돌*합니다. *반드시 ADC1*만 사용합니다. ESP-IDF가 ADC2를 비활성하기도 합니다.

### "high attenuation에서 값이 비선형"

12 dB attenuation은 *0~3.1 V 사실상 측정 범위*지만 *2.5 V 이상*에서 *명확한 비선형*이 생깁니다. 더 정확한 측정이 필요하면 *외부 분압 + 0 dB*로 설계합니다.

### "캘리브레이션이 ESP_ERR_NOT_SUPPORTED"

eFuse에 캘리브레이션이 *안 구워진* 칩입니다. 양산 초기 일부 batch에서 발견됩니다. 수동 보정으로 fallback하거나 *batch 교체*가 필요합니다.

### "다른 채널 읽으면 직전 채널 값이 일부 묻어 나온다"

ADC sample-and-hold 시간이 *부족*해서 *charge sharing*이 일어난 결과입니다. `bitwidth` 설정 시 *sample time*도 확인하고, 임피던스가 큰 신호는 *외부 OP-AMP buffer*를 답니다.

### "터치 센서 라이브러리가 빌드 에러"

`driver/touch_pad.h`를 include하면 C3에서 *컴파일 자체가 안 됩니다*. ESP32용 코드를 C3로 포팅 시 *터치 부분을 외부 IC 호출로 대체*해야 합니다.

## 정리

- C3의 ADC는 *12-bit SAR × ADC1*이며 *GPIO0~GPIO4*가 채널로 매핑됩니다. ADC2는 WiFi 충돌로 *실질 사용 불가*입니다.
- *Attenuation 0/2.5/6/12 dB*로 입력 범위를 *0.95 V ~ 3.1 V*까지 확장하며, 정확도와 분해능은 *낮은 attenuation*이 유리합니다.
- *eFuse Curve Fitting scheme*이 출하 시 굽혀 있어 `adc_cali_raw_to_voltage`로 *mV 단위 자동 보정*이 됩니다.
- 노이즈 대책은 *하드웨어(RC filter, GND plane) + 소프트웨어(multisampling, median, EMA)*의 조합이 표준입니다.
- Continuous mode는 *DMA로 MHz급 sample rate*를 가능하게 하며 *오디오·진동·고속 센서*에 적합합니다.
- **C3에는 터치 센서가 없습니다.** 대안은 *외부 I2C 터치 IC*(CAP1188, TTP223) 또는 *RC oscillator 흉내*입니다.
- Deep-sleep wake-up은 *GPIO wake*로 대체하며 *touch wake 시나리오*는 외부 버튼/IC로 풀어야 합니다.

## 다음 장 예고

다음 편은 **Ch 7: WiFi 4 — STA·AP·scan·WPA2/3**입니다. C3의 WiFi 스택을 *프로비저닝부터 보안 모드*까지 한 번에 정리합니다. 이 시리즈가 *진짜로 무선 IoT* 방향으로 진입하는 챕터입니다.


## 관련 항목

- [Ch 4: GPIO·LEDC·MCPWM](/blog/embedded/riscv/esp32-c3-mastering/chapter04-gpio-ledc-pwm)
- [Ch 5: 시리얼 통신 4종 — UART·SPI·I2C·I2S](/blog/embedded/riscv/esp32-c3-mastering/chapter05-uart-spi-i2c-i2s)
- [Ch 9: RTC·저전력](/blog/embedded/riscv/esp32-c3-mastering/chapter09-esp-idf-build) — GPIO wake-up
- Modern Embedded Recipes Part 4.9: ADC 노이즈 대책
- Practical RTOS Internals Part 3.4: DMA 링 버퍼
- [원문 — ESP-IDF ADC API](https://docs.espressif.com/projects/esp-idf/en/latest/esp32c3/api-reference/peripherals/adc_oneshot.html)
- [원문 — ESP32-C3 ADC Calibration](https://docs.espressif.com/projects/esp-idf/en/latest/esp32c3/api-reference/peripherals/adc_calibration.html)
