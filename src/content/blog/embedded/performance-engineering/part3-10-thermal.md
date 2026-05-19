---
title: "3-10: Thermal Throttling — Junction Temp·Trip Point·Cooling"
date: 2026-05-19T09:00:00
description: "Junction temperature, thermal sensor, trip point, throttling 동작, 자동차·우주 환경."
series: "Embedded Performance Engineering"
seriesOrder: 28
tags: [thermal, throttle, sensor, junction-temp]
draft: true
---

## 한 줄 요약

> **"Thermal throttle = CPU 자기보호"** — 정격 온도 초과 시 *frequency 자동 down*.

## 온도 등급

| Grade | Junction T | 용도 |
|---|---|---|
| **Commercial** | 0 ~ 70°C | 데스크탑·소비자 |
| **Industrial** | -40 ~ 85°C | 산업 컨트롤러 |
| **Extended** | -40 ~ 105°C | 자동차 캐빈 |
| **Automotive (AEC-Q100)** | -40 ~ 125°C | ECU |
| **Mil-Spec** | -55 ~ 125°C | 군용 |
| **Space** | -55 ~ 150°C (rad-hard) | 위성·LV |

LV·항공 — 외부 환경 *영하 → 직사광선까지*. 패키지·재료 선택 critical.

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

각 chip에 *factory calibration* — ROM에 25°C/85°C raw 값.

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

각 trip이 *cooling action* trigger.

## Cooling Device

```bash
ls /sys/class/thermal/cooling_device*/
# thermal-cpufreq-0  thermal-cpufreq-1  thermal-cpufreq-2

cat .../thermal-cpufreq-0/cur_state
# 0 (none)

cat .../thermal-cpufreq-0/max_state
# 8 (8 throttle level)
```

Step-wise throttling — 한 단계당 *200 MHz씩 감소* 등.

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

자동차 ECU — DAPA 표준에 *온도 fault → safe state* 명시.

## big.LITTLE — Thermal Distribution

```c
if (temp > THRESH) {
    /* Big core off, little만 사용 */
    cpu_hotplug_off(BIG_CORE_4, 5, 6, 7);
    /* → 발열 ½ */
}
```

스마트폰 — game/burst엔 big, 평소엔 little.

## Cooling — Passive·Active

| Type | 동작 |
|---|---|
| **Passive** | 방열판 (heatsink) — 항상 동작 |
| **Active** | 팬 (fan) — 변속 가능 |
| **Liquid** | 액체 냉각 — 서버·고급 |
| **Throttling** | SW — frequency ↓ |
| **Migration** | Task 다른 core로 이동 |

자동차 ECU — *fanless* (먼지·물 위험). Heatsink + enclosure.

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

게임 — *5분 후 frame rate ½*. 게이밍 폰 — *대형 vapor chamber*.

## 항공·우주 — Cooling 어려움

```text
지상: 공기 + 방열판 충분
비행기: 캐빈 공기 + airflow 활용
위성·LV: 진공 → *방열 어려움*
  → conduction 방열 (heat pipe → 외부 panel → radiation)
  → 발열 자체 minimize → CPU 50-100 MHz (KSLV-II 누리 등)
```

낮은 전력·낮은 frequency를 *근본 설계*.

## Cold Boot — Extreme Cold

```text
-55°C에서 부팅:
  Crystal oscillator drift (수 ppm)
  Flash retention 영향 미미
  Capacitor (전해질) — *frozen*, ESR 큼
  DRAM refresh — 정상 작동
```

군용·우주 — *cold start test* 필수.

## 측정 — IR Camera

PCB 적외선 촬영:
- Hot spot 식별 (BGA·QFP의 중심)
- 방열판 효과 확인
- 단락·과전류 detect

FLIR·Seek Thermal 등. 임베디드 개발실 표준.

## 자주 하는 실수

> ⚠️ Benchmark 시 thermal 무시

```c
loop_benchmark_5_sec();  // ← 처음 1초만 peak, 후 throttle
```

장시간 (10분+) 측정해야 *지속 가능 성능*. CPU specs 표기 *base clock*이 보통 지속 가능 기준.

> ⚠️ Junction T vs Case T 혼동

데이터시트의 *T_J*는 die 온도. 사용자 측정 (외부)는 *T_C*. 둘 사이 차이 ~10°C 가능.

> ⚠️ Tair 가정 잘못

```c
/* "데이터시트가 -40~85 °C 작동" */
/* → ambient 기준. 내부 발열 시 *junction 100°C* 도달 가능 */
```

→ thermal margin 계산. ambient + (P × Rja).

> ⚠️ Throttling 무시한 RT design

```c
/* RT task가 1 ms 안에 끝나야 함 */
/* throttle 시 — frequency 절반 → 2 ms → deadline miss */
```

Hard RT — *fixed frequency* 보장 + 발열 *예산 안*.

## 정리

- Junction T로 chip 자체 보호 — **trip point** 단계별 throttle.
- 자동차·우주 — *온도 등급 specification* 엄격.
- Cooling — passive·active·throttle·migration.
- **TDP·SDP** — 평균 vs peak 발열.
- IR camera로 PCB hot spot 식별.
- 우주 — 진공에서 방열 → *근본적 저전력 설계*.

다음 part는 **Toolchain & Profiling**.

## 관련 항목

- [3-09: Power vs Performance](/blog/embedded/performance-engineering/part3-09-power-vs-performance)
- [4-01: Compiler Optimization](/blog/embedded/performance-engineering/part4-01-compiler-optimization)
