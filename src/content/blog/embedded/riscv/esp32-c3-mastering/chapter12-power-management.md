---
title: "Ch 12: 전력 관리 — Modem/Light/Deep Sleep와 Wake 소스"
date: 2026-05-01T12:00:00
description: "5단계 power mode, RTC 도메인 활용, ULP 코프로세서 미지원 — C3는 RTC GPIO만."
series: "ESP32-C3 Mastering"
seriesOrder: 12
tags: [power, sleep, low-power, rtc, esp32-c3]
draft: false
---

## 한 줄 요약

> **"배터리 IoT는 *Active 시간*이 아니라 *Sleep 깊이*가 수명을 결정합니다. 80 mA Active와 5 µA Deep sleep 사이의 *4단계 모드*를 자유롭게 오가는 능력이 ESP32-C3 전력 설계의 전부입니다."** C3는 ULP가 없어 *RTC GPIO*와 *RTC timer*만이 deep sleep wake 소스입니다. 그 제약을 받아들이고 *어디까지 가능한지*를 보는 것이 이번 장의 목적입니다.

ESP32-C3의 전력 모드는 *4단계*입니다. *Active*에서 *Deep sleep*까지 전류가 *15,000배 이상* 차이 납니다. 좋은 설계는 *Active 시간을 짧게 묶고 가능한 한 깊은 sleep*에 머물게 합니다.

이번 장은 시리즈의 마지막입니다. 모드별 전류와 wake 소스, RTC 도메인의 8 KB SRAM 활용, 실제 배터리 수명 계산, 그리고 *C3의 ULP 부재가 의미하는 것*까지 정리합니다. 마지막에 *이 시리즈 이후*에 다룰 만한 시리즈 추천을 곁들입니다.

## 4단계 전력 모드 — 전류 차이는 15,000배

| 모드 | CPU | WiFi/BLE | RAM | 전류 (3.3V) | Wake 시간 |
|------|-----|---------|-----|------------|----------|
| Active (160 MHz) | 동작 | 동작 가능 | 전체 | 약 80 mA | — |
| Modem Sleep | 동작 | OFF | 전체 | 약 15 mA | < 1 µs |
| Light Sleep | clock 멈춤 | OFF | 전체 보존 | 약 130 µA | 수 ms |
| Deep Sleep | OFF | OFF | RTC 8 KB만 | 약 5 µA | 200 ms (재부팅) |

전류 차이는 *5 µA → 80 mA*로 16,000배입니다. *2000 mAh 배터리*로 가정하면:

```text
Always Active 80 mA      :  25 시간 ≈ 1 일
Always Modem Sleep 15 mA :  133 시간 ≈ 5.5 일
Always Light Sleep 130 µA: 15,400 시간 ≈ 1.8 년
Always Deep Sleep 5 µA   : 400,000 시간 ≈ 45 년 (배터리 자기 방전이 한계)
```

물론 *항상 deep sleep*이면 아무 일도 못 합니다. 현실 디자인은 *대부분 sleep + 가끔 active*입니다.

## Modem Sleep — WiFi 끄기

가장 가벼운 절전입니다. CPU는 계속 동작하고 *라디오만 끕니다*. WiFi 연결 상태에서는 *DTIM 동기*가 들어와 자동으로 동작합니다.

```c
esp_wifi_set_ps(WIFI_PS_MIN_MODEM);   // DTIM마다 깸 (기본)
esp_wifi_set_ps(WIFI_PS_MAX_MODEM);   // listen_interval마다 깸
```

전류는 *15 mA 안팎*입니다. CPU가 도는 비용이 80 mA의 거의 전부였다는 사실이 여기서 드러납니다. *CPU + DRAM 액티브*가 *라디오보다 무겁지 않습니다*. *160 MHz CPU + 라디오 RX*가 비슷한 크기를 차지합니다.

## Light Sleep — 클럭 정지, 상태 보존

CPU 클럭과 peripheral 대부분이 *정지*합니다. RAM은 *전원 유지로 모든 변수 보존*됩니다. WiFi/BLE도 *RTC 슬립*에 들어갑니다. 깨어났을 때 *연속*해서 코드를 실행할 수 있는 *가장 깊은 모드*입니다.

```c
#include "esp_sleep.h"

// 1초 후 자동 wake
esp_sleep_enable_timer_wakeup(1000000);  // µs 단위
esp_light_sleep_start();

// 이 줄은 sleep에서 깬 뒤 실행됨
ESP_LOGI("pm", "woke up");
```

```c
// GPIO wake (RTC GPIO0~5 중 하나)
esp_sleep_enable_gpio_wakeup();
gpio_wakeup_enable(GPIO_NUM_4, GPIO_INTR_LOW_LEVEL);

// UART wake (RX에 데이터가 오면 깸)
esp_sleep_enable_uart_wakeup(UART_NUM_0);

// WiFi beacon wake
esp_sleep_enable_wifi_wakeup();
```

Light sleep은 *FreeRTOS tickless idle*에 통합됩니다. 일반 application에서는 *직접 esp_light_sleep_start를 부르지 않고*, `esp_pm_configure`로 *자동 진입*시키는 패턴이 표준입니다.

```c
esp_pm_config_t pm_config = {
    .max_freq_mhz = 160,
    .min_freq_mhz = 40,
    .light_sleep_enable = true,
};
esp_pm_configure(&pm_config);

// 이제 idle task가 충분히 길면 자동으로 light sleep
```

## Deep Sleep — 거의 모든 것이 꺼짐

CPU·메인 RAM·peripheral 대부분이 *전원 차단*됩니다. *RTC 도메인*만 살아남습니다. 깨어남은 *재부팅*과 동일하지만, *부트로더가 fast boot path*를 타서 보통 200 ms 안에 main loop에 진입합니다.

| 보존되는 것 | 보존되지 않는 것 |
|-----------|----------------|
| RTC SRAM (8 KB) | DRAM 변수 |
| eFuse | CPU 상태 |
| RTC GPIO 상태 | 일반 GPIO 상태 |
| RTC timer | CPU clock 설정 |

```c
#include "esp_sleep.h"

// 60초 후 wake
esp_sleep_enable_timer_wakeup(60 * 1000000ULL);

// 또는 RTC GPIO wake
esp_deep_sleep_enable_gpio_wakeup(
    BIT(GPIO_NUM_4) | BIT(GPIO_NUM_5),
    ESP_GPIO_WAKEUP_GPIO_LOW);

esp_deep_sleep_start();
// 여기로 돌아오지 않음. wake = reboot.
```

깨어난 뒤에는 *이전 원인*을 확인할 수 있습니다.

```c
esp_sleep_wakeup_cause_t cause = esp_sleep_get_wakeup_cause();
switch (cause) {
case ESP_SLEEP_WAKEUP_TIMER:    ESP_LOGI("pm", "wake: timer");    break;
case ESP_SLEEP_WAKEUP_GPIO:     ESP_LOGI("pm", "wake: gpio");     break;
case ESP_SLEEP_WAKEUP_UNDEFINED:ESP_LOGI("pm", "wake: power on"); break;
}
```

## RTC GPIO — C3의 Wake 핀

ESP32-C3는 *GPIO0~GPIO5*만 RTC 도메인에 연결됩니다. *총 6 핀*입니다. 원본 ESP32(17 핀)에 비하면 *훨씬 빈약*합니다.

```text
RTC GPIO 가능 핀 (deep sleep wake)
  GPIO0, GPIO1, GPIO2, GPIO3, GPIO4, GPIO5

일반 GPIO (light sleep wake는 가능, deep sleep wake 불가)
  GPIO6 ~ GPIO10, GPIO18 ~ GPIO21
```

버튼·인터럽트 입력은 *반드시 GPIO0~5에 배치*해야 deep sleep wake가 됩니다. 하드웨어 설계 단계에서 *PCB에 박혀 버리면 뒤늦게 못 바꿉니다*.

## RTC SRAM — Deep sleep을 건너뛰는 변수

RTC 도메인의 *8 KB SRAM*은 *deep sleep 동안에도 전원 유지*됩니다. 깨어난 뒤에 *이전 상태를 그대로 읽을 수* 있습니다. C 코드에서는 *RTC_DATA_ATTR* 매크로로 변수를 RTC SRAM에 배치합니다.

```c
RTC_DATA_ATTR int boot_count = 0;
RTC_DATA_ATTR uint32_t last_sample_value;
RTC_DATA_ATTR char last_status[32];

void app_main(void)
{
    boot_count++;
    ESP_LOGI("pm", "boot #%d, last sample = %lu", boot_count, last_sample_value);

    // 작업 수행
    uint32_t s = read_sensor();
    last_sample_value = s;
    snprintf(last_status, sizeof(last_status), "ok @ %d", boot_count);

    // 다시 잔다
    esp_sleep_enable_timer_wakeup(60 * 1000000ULL);
    esp_deep_sleep_start();
}
```

8 KB라서 *큰 데이터*는 못 담습니다. *카운터, 마지막 측정값, 상태 머신 변수* 정도가 적절합니다. 더 큰 데이터는 *NVS(flash)*에 저장하지만, *flash 쓰기*는 deep sleep 사이클마다 하면 *마모가 빠릅니다*.

## ULP 부재 — C3의 가장 큰 약점

원본 ESP32와 ESP32-S3는 *ULP(Ultra Low Power) 코프로세서*를 갖습니다. CPU가 *deep sleep인 동안* ULP가 *수 µA*로 *센서 폴링·임계값 비교*를 수행합니다. "GPIO가 임계를 넘어가면 깨우기" 같은 패턴이 가능합니다.

ESP32-C3는 ULP가 *없습니다*. 가능한 일은 *RTC timer로 정기 wake* 또는 *RTC GPIO 레벨/edge로 wake*뿐입니다. *센서 폴링 + 임계값 비교*가 필요하면 *CPU가 깨서 처리*해야 하고, 그게 *전류 소모를 올립니다*.

| 시나리오 | ESP32-S3 (ULP 있음) | ESP32-C3 (ULP 없음) |
|---------|---------------------|---------------------|
| 1초마다 ADC 폴링, 임계 시 wake | ULP가 µA로 처리, CPU는 임계 시만 깸 | CPU가 매 초 깸 (deep sleep + timer wake) |
| GPIO 디바운싱 | ULP가 처리 | external RC 필터 + GPIO wake |
| BLE beacon 듣기 | 불가능 (양쪽 다) | 불가능 |

C3로 *센서 폴링이 필요한* 장기 배터리 제품을 만들 때는 *외부 LDO 차단 + MCU 외부 wake* 같은 *PCB 레벨 대책*이 필요합니다. 또는 ULP가 있는 *ESP32-S3, ESP32-H2*를 선택하는 것도 옵션입니다.

## 실제 배터리 수명 계산

*2000 mAh CR123A 또는 18650 셀*에서 *30분에 한 번 WiFi 보고*하는 센서를 가정합니다.

**전력 사이클:**

- Active (WiFi 연결·전송):       3 초 @ 80 mA = 240 mAs
- Deep Sleep:                  1797 초 @ 5 µA = 8.985 mAs
- ──────────────────────────────────────────────────
- 사이클 총량 (1800 초):        248.985 mAs
- 평균 전류:                    248.985 / 1800 = 138 µA

**배터리:**

- 2000 mAh = 7,200,000 mAs
- 수명:    7,200,000 / 248.985 / (1800/3600) ≈ 58,200 hours / 30분
- = 14,460 일 / 30분 보고
- 실제 일자:  14,460 * 30 / (60*24) = 약 301 일

약 *10개월*입니다. 자기 방전·온도·LDO 효율을 감안하면 *8개월* 정도가 현실적입니다.

같은 시나리오에서 *5분에 한 번* 보고로 늘리면:

```text
Active 3 s + Sleep 297 s, 사이클 300 s
사이클 총량: 240 + 297 * 5/1000 ≈ 241.5 mAs
평균:        241.5 / 300 = 805 µA
수명:        2000 mAh * 1000 / 805 = 2484 시간 = 약 103 일
```

*30분 → 5분*으로 6배 더 자주 보고하면 *수명이 1/3*로 줄어듭니다. *Active 1회의 비용*이 sleep보다 *훨씬 크기* 때문입니다. 보고 빈도가 *전력 예산의 1차 변수*입니다.

## 자주 하는 실수와 troubleshooting

| 증상 | 원인 | 해결 |
|------|------|------|
| Deep sleep 전류가 50 µA 이상 | 외부 회로 leak (LED·pullup·LDO) | PCB 측정, 외부 회로 슬립 |
| RTC GPIO wake가 안 됨 | GPIO6 이상에 배치 | GPIO0~5만 사용 |
| Light sleep 안 들어감 | peripheral lock 잡혀 있음 | esp_pm_dump_locks(stdout) |
| Deep sleep 후 변수 0 | RTC_DATA_ATTR 안 붙임 | 매크로 추가 |
| 60초 wake가 50초쯤 깸 | RTC 클럭이 RC 8 MHz | 외부 32 kHz XTAL 추가 |
| WiFi 연결 후 modem sleep 적용 안 됨 | ps_type 설정 안 함 | esp_wifi_set_ps 호출 |
| sleep current가 데이터시트 5배 | brownout detector 활성 | bod off 또는 LDO 안정화 |
| boot count가 매번 0 | reset 원인이 power-on | RTC SRAM은 power-on 시 초기화 |

가장 흔한 함정은 *외부 회로 leak*입니다. ESP32 본체는 5 µA에 도달해도, *LED 풀업 저항*, *센서 모듈의 sleep 미지원*, *LDO의 quiescent 전류*가 더해져 *실측이 50~200 µA*가 되곤 합니다. *모든 외부 부품의 sleep 전류*를 데이터시트로 확인하고, *MOSFET·load switch*로 *완전 차단*하는 설계가 필요합니다.

## 시리즈를 마치며

ESP32-C3 시리즈 12편을 *내부 동작 수준*까지 훑었습니다. RISC-V 코어의 RV32IMC 명령 세트, 메모리 맵과 플래시 캐시, GPIO·LEDC·UART·SPI·I2C·I2S·ADC·터치, WiFi 4 스택의 4가지 모드, BLE 5.0의 Coded PHY, ESP-IDF의 컴포넌트 빌드, FreeRTOS의 단일 코어 동작, Secure Boot V2의 ECDSA 체인, 그리고 4단계 전력 모드까지.

ESP32-C3는 *작고 저렴한 칩*이지만 *진지한 IoT 제품*을 만들 수 있는 모든 부품을 갖췄습니다. 단일 코어, ULP 부재, 4 MB 플래시 같은 *제약*도 분명하지만, *WiFi + BLE + RISC-V + ESP-IDF 통합 생태계*를 *모듈당 2달러*로 손에 넣을 수 있다는 점은 다른 칩이 따라가기 어렵습니다.

### 다음 시리즈 추천

이 시리즈에서 닿지 못한 깊이를 채우는 다음 시리즈입니다.

- **[Embedded Security 시리즈](/blog/embedded/embedded-security/)** — Secure Boot V2를 *공격 모델 수준*에서 더 깊이. fault injection, side-channel, glitching에 대한 방어를 다룹니다. C3 같은 양산 제품의 *보안 인증* 절차도.
- **[Practical RTOS Internals 시리즈](/blog/embedded/rtos/practical-internals/)** — FreeRTOS의 *내부 자료구조와 스케줄링 정책*. C3의 *단일 코어 시분할*이 vanilla FreeRTOS와 *어디서 다른지* 명확해집니다.
- **[Modern Embedded Recipes 시리즈](/blog/embedded/modern-recipes/)** — *CMake·동기화 패턴·IRQ 설계*의 모범 사례. ESP-IDF 코드를 *더 깔끔하게* 쓰는 데 직접 도움이 됩니다.
- **[FreeRTOS Mastering 시리즈](/blog/embedded/rtos/freertos-mastering/)** — vanilla FreeRTOS를 *처음부터* 손에 익히는 코스. Espressif fork와의 차이점을 이해하는 데 좋습니다.

ESP32-S3(2 코어·ULP·USB OTG)나 *ESP32-H2(Thread·Zigbee)*로 확장하려면 *지금까지 손에 익은 ESP-IDF 지식*이 그대로 통합니다. 이 시리즈가 *그 출발점*이 되었기를 바랍니다.

## 정리

- ESP32-C3는 *4단계 전력 모드*입니다. Active 80 mA → Modem 15 mA → Light 130 µA → Deep 5 µA. 차이는 *16,000배*입니다.
- *Modem sleep*은 라디오만 끕니다. CPU와 RAM은 동작합니다. 평균 15 mA가 한계입니다.
- *Light sleep*은 CPU 클럭이 멈춰도 *RAM은 보존*됩니다. tickless idle이 *자동 진입*시킬 수 있습니다.
- *Deep sleep*은 *재부팅*과 동등합니다. RTC 도메인만 살아남고 fast boot path가 200 ms 안에 main에 진입합니다.
- ESP32-C3는 *RTC GPIO가 GPIO0~5*뿐입니다. 하드웨어 설계 단계에서 *반드시 이 범위 안*에 wake 입력을 배치해야 합니다.
- *RTC SRAM 8 KB*는 deep sleep 사이에 변수를 보존합니다. `RTC_DATA_ATTR`을 변수에 붙이면 됩니다.
- *ULP가 없습니다*. 센서 폴링이 필요한 장기 배터리 제품은 외부 load switch 같은 *PCB 레벨 대책*이 필요하거나, *ESP32-S3/H2*로 옮겨야 합니다.
- 배터리 수명 계산은 *Active 1회의 비용 vs Sleep 평균*입니다. 보고 빈도가 *전력 예산의 1차 변수*입니다.

## 관련 항목

- [Ch 7: WiFi 4 스택](/blog/embedded/riscv/esp32-c3-mastering/chapter07-wifi-stack) — Modem sleep과 DTIM
- [Ch 10: FreeRTOS on ESP32-C3](/blog/embedded/riscv/esp32-c3-mastering/chapter10-freertos) — tickless idle 통합
- [Ch 11: 보안 — Secure Boot, Flash Encryption](/blog/embedded/riscv/esp32-c3-mastering/chapter11-security)
- [Embedded Security 시리즈](/blog/embedded/embedded-security/) — 추천 다음 시리즈
- [Practical RTOS Internals 시리즈](/blog/embedded/rtos/practical-internals/) — 추천 다음 시리즈
- [Modern Embedded Recipes 시리즈](/blog/embedded/modern-recipes/) — 추천 다음 시리즈
- [원문 — ESP-IDF Sleep Modes](https://docs.espressif.com/projects/esp-idf/en/latest/esp32c3/api-reference/system/sleep_modes.html)
- [원문 — ESP-IDF Power Management](https://docs.espressif.com/projects/esp-idf/en/latest/esp32c3/api-reference/system/power_management.html)
