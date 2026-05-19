---
title: "3-10: Thermal Throttling — Junction Temp·Trip Point·Cooling"
date: 2026-05-08T09:00:00
description: "Junction temperature, thermal sensor, trip point, throttling 동작, 자동차·우주 환경."
series: "Embedded Performance Engineering"
seriesOrder: 28
tags: [thermal, throttle, sensor, junction-temp]
draft: false
---

## 한 줄 요약

> **"Thermal throttle = CPU 자기보호"** 입니다. 정격 온도를 넘기면 frequency가 자동으로 내려갑니다.

## 온도 등급

| Grade | Junction T | 용도 |
|---|---|---|
| **Commercial** | 0 ~ 70°C | 데스크탑·소비자 |
| **Industrial** | -40 ~ 85°C | 산업 컨트롤러 |
| **Extended** | -40 ~ 105°C | 자동차 캐빈 |
| **Automotive (AEC-Q100)** | -40 ~ 125°C | ECU |
| **Mil-Spec** | -55 ~ 125°C | 군용 |
| **Space** | -55 ~ 150°C (rad-hard) | 위성·LV |

LV와 항공은 외부 환경이 영하에서 직사광선까지 넓게 변하므로, 패키지와 재료 선택이 결정적입니다.

## Thermal Sensor

```text
On-die diode based:
  V_BE diff (PTAT — Proportional To Absolute Temp)
  → ADC conversion → ° C
  
정확도 ±2~5°C, 해상도 1°C
```

```c
/* STM32 internal TS */
HAL_ADC_Start(&hadc1);
HAL_ADC_PollForConversion(&hadc1, 100);
uint32_t raw = HAL_ADC_GetValue(&hadc1);
float temp = ((float)raw * 3.3 / 4096 - V25) / AVG_SLOPE + 25;
```

각 chip에는 factory calibration이 들어 있고, ROM에 25°C와 85°C의 raw 값이 저장됩니다.

## Linux Thermal Framework

```bash
# Thermal zone 목록
ls /sys/class/thermal/
# thermal_zone0  thermal_zone1  thermal_zone2  cooling_device0

cat /sys/class/thermal/thermal_zone0/type
# cpu_thermal

cat /sys/class/thermal/thermal_zone0/temp
# 47000  (= 47°C)

cat /sys/class/thermal/thermal_zone0/trip_point_0_temp
# 75000  (= 75°C, hot)
cat /sys/class/thermal/thermal_zone0/trip_point_1_temp
# 90000  (= 90°C, critical — shutdown)
```

## Trip Point

```text
75°C "hot"      → cpufreq throttle (frequency ↓)
85°C "passive"  → fan speed ↑
90°C "critical" → kernel panic·shutdown
```

각 trip point가 해당하는 cooling action을 trigger합니다.

## Cooling Device

```bash
ls /sys/class/thermal/cooling_device*/
# thermal-cpufreq-0  thermal-cpufreq-1  thermal-cpufreq-2

cat .../thermal-cpufreq-0/cur_state
# 0 (none)

cat .../thermal-cpufreq-0/max_state
# 8 (8 throttle level)
```

Step-wise throttling 방식으로, 한 단계당 200 MHz씩 감소시키는 식으로 동작합니다.

## STM32 — Junction T Monitoring

```c
/* CMSIS-style */
float temp = read_internal_temp();
if (temp > 85.0f) {
    /* Throttle — clock 분주 ↑ */
    RCC->CFGR |= RCC_CFGR_HPRE_DIV2;   // AHB /2 → CPU 절반
}
if (temp > 105.0f) {
    /* Shutdown — safe mode */
    enter_safe_mode();
}
```

자동차 ECU는 DAPA 표준에 온도 fault 발생 시 safe state로 진입한다는 동작을 명시합니다.

## big.LITTLE — Thermal Distribution

```c
if (temp > THRESH) {
    /* Big core off, little만 사용 */
    cpu_hotplug_off(BIG_CORE_4, 5, 6, 7);
    /* → 발열 ½ */
}
```

스마트폰은 game이나 burst 구간에서는 big을 쓰고, 평소에는 little만 사용합니다.

## Cooling — Passive·Active

| Type | 동작 |
|---|---|
| **Passive** | 방열판 (heatsink) — 항상 동작 |
| **Active** | 팬 (fan) — 변속 가능 |
| **Liquid** | 액체 냉각 — 서버·고급 |
| **Throttling** | SW — frequency ↓ |
| **Migration** | Task 다른 core로 이동 |

자동차 ECU는 먼지와 물 위험 때문에 fanless로 설계하고, heatsink와 enclosure만으로 냉각을 처리합니다.

## TDP·SDP·CTDP

```text
TDP (Thermal Design Power) — sustained 최대 발열 (cooling 설계 기준)
SDP (Scenario Design Power) — 일반 workload 평균
cTDP (Configurable TDP) — OEM이 BIOS에서 조정 가능
```

Intel i7-12700:
- TDP 65 W (base)
- Max Turbo Power 180 W (peak, short)
- SDP ~30 W (idle + light)

## Cortex-A 모바일 — Heat Map

```text
Snapdragon 865:
  Big core full load → +35°C
  GPU full load → +25°C
  Modem → +10°C
  
→ peak 75°C, 충분히 throttle 영역
```

게임에서는 5분쯤 지나면 frame rate가 절반으로 떨어지는 경우가 흔하고, 게이밍 폰은 대형 vapor chamber로 이를 보완합니다.

## 항공·우주 — Cooling 어려움

```text
지상: 공기 + 방열판 충분
비행기: 캐빈 공기 + airflow 활용
위성·LV: 진공 → *방열 어려움*
  → conduction 방열 (heat pipe → 외부 panel → radiation)
  → 발열 자체 minimize → CPU 50-100 MHz (KSLV-II 누리 등)
```

낮은 전력과 낮은 frequency를 근본 설계 원칙으로 삼습니다.

## Cold Boot — Extreme Cold

```text
-55°C에서 부팅:
  Crystal oscillator drift (수 ppm)
  Flash retention 영향 미미
  Capacitor (전해질) — *frozen*, ESR 큼
  DRAM refresh — 정상 작동
```

군용과 우주 영역에서는 cold start test가 필수입니다.

## 측정 — IR Camera

PCB를 적외선으로 촬영하면 다음과 같은 정보를 얻을 수 있습니다.

- Hot spot 식별 (BGA나 QFP의 중심)
- 방열판 효과 확인
- 단락이나 과전류 detect

FLIR이나 Seek Thermal 같은 장비가 임베디드 개발실의 표준 도구로 쓰입니다.

## 자주 하는 실수

> ⚠️ Benchmark 시 thermal 무시

```c
loop_benchmark_5_sec();  // ← 처음 1초만 peak, 후 throttle
```

지속 가능한 성능을 보려면 10분 이상 장시간 측정해야 합니다. CPU specs에 표기된 base clock이 보통 지속 가능 기준입니다.

> ⚠️ Junction T vs Case T 혼동

데이터시트의 *T_J*는 die 온도를 가리키고, 사용자가 외부에서 측정하는 값은 *T_C*입니다. 둘 사이에는 10°C 정도의 차이가 날 수 있습니다.

> ⚠️ Tair 가정 잘못

```c
/* "데이터시트가 -40~85 °C 작동" */
/* → ambient 기준. 내부 발열 시 *junction 100°C* 도달 가능 */
```

thermal margin은 ambient + (P × Rja)로 계산해야 합니다.

> ⚠️ Throttling 무시한 RT design

```c
/* RT task가 1 ms 안에 끝나야 함 */
/* throttle 시 — frequency 절반 → 2 ms → deadline miss */
```

Hard RT는 fixed frequency를 보장하고, 발열도 예산 안에서 관리해야 합니다.

## 정리

- Junction T로 chip 자체를 보호하며, **trip point** 단계별로 throttle이 동작합니다.
- 자동차와 우주 영역은 온도 등급 specification이 매우 엄격합니다.
- Cooling 방식에는 passive, active, throttle, migration이 있습니다.
- **TDP**와 **SDP**는 각각 평균과 peak 발열을 가리킵니다.
- IR camera로 PCB의 hot spot을 식별할 수 있습니다.
- 우주에서는 진공에서 방열이 어렵기 때문에 근본적으로 저전력 설계를 채택합니다.

다음 part는 **Toolchain & Profiling**을 다룹니다.

## 관련 항목

- [3-09: Power vs Performance](/blog/embedded/performance-engineering/part3-09-power-vs-performance)
- [4-01: Compiler Optimization](/blog/embedded/performance-engineering/part4-01-compiler-optimization)
