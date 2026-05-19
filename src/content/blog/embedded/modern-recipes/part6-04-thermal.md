---
title: "6-04: Thermal Throttling — Edge AI Sustained Performance"
date: 2026-05-21T04:00:00
description: "Jetson·자율주행 thermal. Sustained vs burst, DVFS, fan curve, passive cooling."
series: "Modern Embedded Recipes"
seriesOrder: 34
tags: [recipes, thermal, throttling, edge-ai, jetson]
draft: true
---

## 한 줄 요약

> **"Edge AI = thermal-limited"** — burst 빠름·sustained 절반.

## 문제 — Sustained 성능

```text
Jetson Orin AGX 측정:
  Burst (10 sec):   60 fps YOLOv8
  Sustained (1 hr): 30 fps (throttled)
  
원인:
  - CPU + GPU + DLA = 60 W TDP
  - 작은 보드 (105 × 105 mm)
  - Heatsink 한정
  - 열 누적 → 95°C 도달 → throttle
```

자율주행 — *sustained 성능*이 spec.

## Thermal Sensor 모니터링

```bash
# Jetson tegrastats
sudo tegrastats

# RAM 8146/30536MB CPU [3%@2201,1%@2201,...] GR3D_FREQ 0%@204
# CPU@45.5C GPU@46C SOC@46C
```

CPU·GPU·thermal zone 동시 측정.

```bash
# /sys/class/thermal/
cat /sys/class/thermal/thermal_zone0/temp     # 45000 = 45°C
cat /sys/class/thermal/thermal_zone0/policy   # step_wise·user_space
```

## Trip Points

```bash
# 단계별 trip
cat /sys/class/thermal/thermal_zone0/trip_point_0_temp
# 60000  (60°C — fan ramp)

cat /sys/class/thermal/thermal_zone0/trip_point_1_temp
# 85000  (85°C — throttle)

cat /sys/class/thermal/thermal_zone0/trip_point_2_temp
# 95000  (95°C — shutdown)
```

## DVFS Frequency Scaling

```bash
# Available frequencies
cat /sys/devices/system/cpu/cpu0/cpufreq/scaling_available_frequencies

# Current
cat /sys/devices/system/cpu/cpu0/cpufreq/scaling_cur_freq

# Force max (test only)
echo userspace > scaling_governor
echo 2200000 > scaling_setspeed
```

Thermal throttle 시 — *kernel이 자동 frequency ↓*. CPU·GPU 별도.

## Jetson nvpmodel — Power Mode

```bash
sudo nvpmodel -q   # current mode
sudo nvpmodel -m 0  # MAXN (all enabled, max freq)
sudo nvpmodel -m 1  # 30W
sudo nvpmodel -m 2  # 15W (low power)

# 각 mode = CPU/GPU/DLA freq + power cap
```

자율주행 — *thermal budget에 맞춰 mode 선택*. Production은 *30W mode*.

## jetson_clocks

```bash
# 일시적 max performance (cooling 충분 시)
sudo jetson_clocks

# 항상 max는 위험 — thermal trip
```

Benchmark·development에서만. Production deployment — *thermal aware*.

## Fan Control

```bash
# Manual fan
cat /sys/devices/.../pwmchip0/pwm0/duty_cycle
echo 255 > /sys/.../duty_cycle   # max
echo 0 > /sys/.../duty_cycle      # off

# Curve config (DTS)
fan-tach@0 {
    cooling-levels = <0 64 128 192 255>;   /* PWM levels */
};
```

자동차 ECU — *fan 없음* (먼지·물·소음). Passive cooling만.

## Sustained Performance Tuning

```text
1. Frequency cap — burst max 안 도달
   GPU 1000 MHz cap (vs 1300 MHz max)
   → temp 80°C 유지, throttle 안 됨
   
2. Workload distribution
   GPU + DLA — load 나눔
   → 각자 thermal headroom 확보
   
3. Batch processing 분산
   30 fps × 1 batch
   < 1 fps × 30 batch
   → 후자가 transient burst 클 수
   
4. Periodic idle
   Process → idle → process
   → average T 낮춤
```

## 자동차 ECU — Fanless·Passive

```text
ASIL ECU 조건:
  -40 ~ +85°C operating
  No fan (먼지·진동·수명)
  Heatsink + enclosure conduction
  
Strategy:
  Lower clock from start
  Workload predictable
  Worst-case temp analysis
  
Cortex-R52 + Cortex-A53 — typical:
  ~10-15 W
  ASIL-D compliance
```

## 우주 — Conduction Cooling

```text
LV·위성 thermal:
  No air convection (진공)
  Conduction to outside panel
  Radiation to space
  
NASA Mars Ingenuity:
  Snapdragon 801 — commercial chip!
  -90°C night, +30°C day
  Heater 사용 — 부팅 전 warming
```

극한 환경 — *thermal management = mission critical*.

## Linux Thermal Framework

```bash
# Policy
echo step_wise > /sys/class/thermal/thermal_zone0/policy

# Cooling device 연결
ls /sys/class/thermal/cooling_device0/
# type: thermal-cpufreq-0
# cur_state·max_state
```

자동 step-wise — temp 단계별 *cooling action*. Modern Linux 표준.

## Custom Thermal Driver

```c
static const struct thermal_zone_of_device_ops my_ops = {
    .get_temp = my_get_temp,
    .get_trend = my_get_trend,
    .set_emul_temp = my_set_emul,
};

devm_thermal_zone_of_sensor_register(dev, 0, my_data, &my_ops);
```

자체 sensor (board) — driver 작성. Devicetree에 thermal zone 정의.

## Power·Thermal Co-Design

```text
Edge AI device design:
  1. Use case workload — measure burst·sustained
  2. SoC TDP — sustained achievable
  3. Heatsink·enclosure thermal resistance
  4. Worst case ambient (자동차: +85°C cabin)
  5. Margin (>15°C below trip)
  
부족하면:
  - 큰 heatsink
  - Fan 추가 (소비자만)
  - 작은 model
  - Pipeline batch
```

## Battery — Drone·IoT

```text
Drone autopilot:
  Sustained inference + low power critical
  Throttle = mission abort
  
Strategy:
  Always low-power mode (Cortex-M55 NPU)
  Burst only for critical detection
  Cool periods between
```

## Monitoring Production

```c
/* Periodic temp check */
int temp;
sysfs_read("/sys/class/thermal/thermal_zone0/temp", &temp);

if (temp / 1000 > THROTTLE_WARN) {
    log_warn("Temp %d°C", temp / 1000);
    /* Adjust workload */
    reduce_inference_freq();
}

if (temp / 1000 > CRITICAL) {
    enter_safe_mode();
}
```

Production telemetry — *thermal trend* 추적.

## Thermal Camera 측정 — IR Imaging

```bash
# FLIR·Seek thermal camera
# PCB hot spot 식별:
#  CPU package
#  GPU
#  DDR
#  VRM
#  
# 단열 약점·heatsink 효과 확인
```

개발 lab 표준 장비.

## 자주 하는 실수

> ⚠️ Burst benchmark만

```c
benchmark_30sec();   /* throttle 전 측정 */
```

→ *1 hr+ sustained test*.

> ⚠️ `jetson_clocks` production

```bash
jetson_clocks   /* always max — thermal trip 위험 */
```

→ `nvpmodel`로 *thermal-aware mode*.

> ⚠️ Fan 신뢰

```c
/* fan + heatsink 가정 */
/* 먼지 누적·fan 실패 시 thermal trip */
```

→ Fanless·passive 설계 우선.

> ⚠️ Thermal margin 부족

```text
chip max 105°C, 운영 100°C
→ 1°C 변동에도 trip
```

→ 15-20°C margin.

## 정리

- Edge AI = **thermal-limited sustained 성능**.
- **DVFS·nvpmodel·jetson_clocks** — performance mode.
- 자동차 — **fanless·passive cooling**.
- 우주 — **conduction + heater + radiation**.
- Production — *thermal trend 모니터링*.
- Co-design — workload·SoC·enclosure 함께.

다음 편은 **Jetson 최적화**.

## 관련 항목

- [6-03: Quantization](/blog/embedded/modern-recipes/part6-03-quantization)
- [6-05: Jetson](/blog/embedded/modern-recipes/part6-05-jetson)
- [PE 3-10: Thermal](/blog/embedded/performance-engineering/part3-10-thermal)
