---
title: "12-07: Thermal Management — Throttling·DVFS·Fan Curve·Sustained 성능"
date: 2026-05-17T23:00:00
description: "Edge AI 보드의 sustained 성능을 결정하는 thermal 한계. throttle trip, DVFS, fan curve, nvpmodel, passive cooling 설계를 정리합니다."
series: "Modern Embedded Recipes"
seriesOrder: 143
tags: [recipes, thermal, throttling, edge-ai, jetson, dvfs]
---

## 한 줄 요약

> **"Edge AI 보드의 진짜 spec은 burst가 아니라 sustained 성능입니다."** 105 × 105 mm 보드에 60 W를 부으면 10초 안에 95°C에 도달해 frequency가 절반으로 떨어집니다. Thermal 설계 없이는 datasheet TOPS가 의미를 잃습니다.

## 어떤 상황에서 쓰나

자율주행 ECU, drone autopilot, factory inspection 박스, 카메라 NVR 모두 *수 시간 연속 동작*을 전제로 합니다. 데이터센터 GPU와 달리 큰 fan과 chiller를 못 쓰고, 자동차 cabin은 ambient가 +85°C까지 올라갑니다.

문제는 spec sheet의 TOPS·fps 숫자가 거의 항상 *burst* 기준이라는 점입니다. 30초만 측정하면 throttle이 일어나기 전이므로 실제 deploy 환경의 sustained 수치보다 1.5~2배 높게 나옵니다. 처음부터 sustained 기준으로 측정하고 enclosure·heatsink를 함께 설계해야 합니다.

## 핵심 개념

Thermal throttle은 SoC가 *junction temperature*(Tj) 한계에 도달하면 frequency를 강제로 낮추는 방식으로 동작합니다. 보통 3단계입니다.

| 온도 | 동작 |
|------|------|
| 60°C | fan ramp 시작 (있다면) |
| 85°C | soft throttle — frequency 단계 감소 |
| 95°C | hard throttle — minimum freq |
| 105°C | shutdown |

DVFS(Dynamic Voltage and Frequency Scaling)가 throttle의 실제 mechanism입니다. Linux kernel이 thermal zone trip을 감지하면 cpufreq governor가 frequency를 떨어뜨리고, GPU·DLA는 vendor driver가 별도 관리합니다.

Cooling은 세 옵션이 있습니다.

| Cooling | 특성 |
|---------|------|
| Passive heatsink | fanless, 먼지/진동 영향 적음, 자동차/위성 표준 |
| Fan | 효율 좋음, 소비자 device, 먼지·실패 위험 |
| Liquid | 대형 edge box·data center, 비싸지만 효율 압도적 |

자동차·ASIL ECU는 *fanless가 거의 강제*입니다. 먼지·진동·수명 문제로 fan을 못 쓰기 때문에 *처음부터 낮은 clock*으로 thermal headroom을 확보합니다.

Production deploy의 핵심은 *margin*입니다. Chip max가 105°C라면 정상 운영을 85°C 이하로 두고 15~20°C margin을 둡니다. Ambient가 dynamic하게 변하기 때문입니다.

## 코드 / 실제 사용 예

### tegrastats — Jetson 실시간 모니터

```bash
sudo tegrastats --interval 1000

# RAM 12345/30536MB CPU [50%@2200,30%@2200,...]
# GR3D_FREQ 80%@1300  CV0@45.5C CPU@52C GPU@67C SOC@70C
# VDD_GPU_SOC 6800/6800  VDD_CPU_CV 800/800
```

CPU·GPU·thermal zone·power rail이 한 번에 보입니다. Long-running 추론을 돌리며 1시간 trend를 찍는 것이 sustained 측정의 기본입니다.

### thermal zone 직접 읽기

```bash
# 사용 가능한 thermal zone
ls /sys/class/thermal/
# thermal_zone0  thermal_zone1  ...

# 각 zone 정보
cat /sys/class/thermal/thermal_zone0/type        # CPU-therm
cat /sys/class/thermal/thermal_zone0/temp        # 65000 (65.0°C)
cat /sys/class/thermal/thermal_zone0/policy      # step_wise

# Trip points
cat /sys/class/thermal/thermal_zone0/trip_point_0_temp   # 60000 (fan ramp)
cat /sys/class/thermal/thermal_zone0/trip_point_1_temp   # 85000 (throttle)
cat /sys/class/thermal/thermal_zone0/trip_point_2_temp   # 95000 (shutdown)
```

`/sys/class/thermal`은 표준 Linux thermal framework입니다. Custom application의 telemetry에도 활용합니다.

### nvpmodel — Jetson power mode

```bash
# 현재 mode 확인
sudo nvpmodel -q
# NV Power Mode: MAXN
# 0

# Mode 전환
sudo nvpmodel -m 0   # MAXN (all enabled, max freq)
sudo nvpmodel -m 1   # 30W
sudo nvpmodel -m 2   # 15W (low power)

# Custom mode (편집)
sudo vi /etc/nvpmodel.conf
```

각 mode는 *CPU/GPU/DLA frequency cap + power budget*의 조합입니다. Production deployment는 보통 MAXN보다 한 단계 아래(30 W)에서 운영하는 편이 sustained 성능이 더 좋습니다.

### Power telemetry를 application에서

```c
#include <stdio.h>
#include <stdlib.h>

int read_thermal(const char *path) {
    FILE *f = fopen(path, "r");
    if (!f) return -1;
    int millideg;
    fscanf(f, "%d", &millideg);
    fclose(f);
    return millideg / 1000;   /* °C */
}

void thermal_monitor(void) {
    int cpu = read_thermal("/sys/class/thermal/thermal_zone0/temp");
    int gpu = read_thermal("/sys/class/thermal/thermal_zone1/temp");

    if (cpu > 80 || gpu > 80) {
        log_warn("High temp cpu=%d gpu=%d, reducing workload", cpu, gpu);
        reduce_inference_rate();
    }
    if (cpu > 90 || gpu > 90) {
        log_error("Critical temp, entering safe mode");
        enter_safe_mode();
    }
}
```

Production application은 *thermal trend*를 1~5 sec 주기로 읽어 workload를 능동적으로 조절합니다.

### Fan curve 설정

```bash
# PWM fan 직접 제어 (Jetson)
cat /sys/devices/.../pwm-fan/hwmon0/pwm1
echo 180 > /sys/devices/.../pwm-fan/hwmon0/pwm1   # 0~255

# Device tree로 cooling-levels 정의
fan: pwm-fan {
    compatible = "pwm-fan";
    pwms = <&pwmc 0 45334>;
    cooling-levels = <0 64 128 192 255>;
};
```

`cooling-levels`는 thermal zone의 step level에 매핑됩니다. step_wise governor가 trip을 감지하면 한 단계씩 올립니다.

### Sustained 성능 측정

```bash
# 5분 burst 측정
timeout 300 ./yolo_bench --fps_log fps.log
# 평균 60 fps

# 1시간 sustained 측정
timeout 3600 ./yolo_bench --fps_log fps_long.log
# 처음 60 fps → 5분 후 50 fps → 30분 후 32 fps

# tegrastats 동시에
sudo tegrastats --logfile thermal.log &
```

Spec과 production 차이가 가장 크게 드러나는 부분입니다. *항상 1시간 이상* 측정합니다.

### jetson_clocks — burst max

```bash
# 모든 clock을 max로 lock — benchmarking·development
sudo jetson_clocks

# 원래대로 복원
sudo jetson_clocks --restore /tmp/backup.conf
```

`jetson_clocks`은 thermal awareness를 *끄는* 명령입니다. Burst 측정·single-shot demo에만 씁니다. Production에서 켜두면 thermal trip이 발생합니다.

## 측정 / 성능 비교

Jetson AGX Orin에서 YOLOv8m INT8 추론을 power mode별로 sustained 측정한 예입니다.

| Power mode | GPU freq cap | Burst fps | Sustained fps | Peak temp |
|---|---|---|---|---|
| MAXN (60W) | 1300 MHz | 220 | 140 | 96°C (throttle) |
| 50W | 1200 MHz | 200 | 180 | 92°C |
| 40W | 1000 MHz | 170 | 170 | 88°C |
| 30W | 900 MHz | 140 | 140 | 83°C |
| 15W | 600 MHz | 85 | 85 | 73°C |

MAXN은 burst 220 fps라는 화려한 숫자가 나오지만 sustained는 140 fps로 떨어집니다. *40W mode*가 burst·sustained가 같은 가장 효율적인 지점입니다.

Cooling 옵션별 비교(같은 SoC, 동일 workload)입니다.

| Cooling | Peak temp | Sustained fps |
|---|---|---|
| Passive heatsink (small) | 105°C | 40 (severe throttle) |
| Passive heatsink (large) | 92°C | 110 |
| Active fan (stock) | 78°C | 150 |
| Active fan + ducting | 70°C | 180 |
| Liquid cooling | 60°C | 220 |

Heatsink만 키워도 sustained가 2.5배 차이가 납니다. 가장 저렴한 thermal 투자가 가장 큰 효과를 냅니다.

## 자주 보는 함정

> Burst benchmark만 측정

```bash
./bench --duration 30
# 60 fps — datasheet 일치, 만족
# 실제 운영 → 1시간 후 32 fps
```

항상 1시간 이상 long-run 측정을 합니다. Cold start와 warm steady state는 다릅니다.

> jetson_clocks production 활성화

```bash
# /etc/rc.local
sudo jetson_clocks   # always max — 며칠 후 thermal trip
```

Production은 `nvpmodel`로 *thermal-aware mode*를 선택합니다.

> Fan을 무조건 신뢰

```c
/* fan 전제 설계 */
/* 1년 후 먼지 누적으로 fan RPM 50% → throttle */
```

먼지·진동·진동 환경(자동차)이라면 fanless·passive를 우선 검토합니다. Fan을 쓰더라도 monitoring + alert를 갖춥니다.

> Margin 부족

```text
chip max 105°C, 정상 운영 102°C
→ ambient 5°C 상승만으로 trip
```

Tj 한계 대비 15~20°C margin을 두고 enclosure·workload를 설계합니다.

> Enclosure ventilation 부족

```text
완전 밀폐 IP67 box → 내부 ambient SoC + 20°C
→ heatsink 무용지물
```

IP rating이 필요하면 *conduction*으로 외부 panel에 열을 전달하는 설계가 필요합니다. 위성·자동차 ECU의 표준 방식입니다.

> Workload가 transient burst만 큼

```text
30 fps × 1 batch → 매 frame burst → 평균 80°C
1 fps × 30 batch → 같은 일이지만 burst가 더 큼 → throttle
```

Batch 크기와 분배를 조절해 *순간 power spike*를 줄입니다.

## 정리

- Edge AI 보드의 실제 spec은 burst가 아닌 sustained 성능입니다.
- Throttle은 보통 85°C 부근에서 시작해 frequency를 단계적으로 낮춥니다.
- `tegrastats`·`/sys/class/thermal`로 CPU·GPU·thermal zone을 실시간 모니터합니다.
- `nvpmodel`로 power mode를 thermal-aware하게 설정합니다. `jetson_clocks`는 production 금지입니다.
- Fanless·passive cooling은 자동차·산업·위성에서 사실상 강제입니다.
- Production application은 thermal trend를 읽어 workload를 능동 조절합니다.
- Tj 한계 대비 15~20°C margin을 두고 enclosure·heatsink를 설계합니다.
- Long-run(1시간+) 측정이 sustained 성능을 드러내는 유일한 방법입니다.

다음 편은 **Jetson 가족과 최적화 stack**입니다.

## 관련 항목

- [6-03: Quantization](/blog/embedded/modern-recipes/part12-03-quantization)
- [6-05: Jetson](/blog/embedded/modern-recipes/part12-08-jetson)
- [PE 3-10: Thermal Throttling](/blog/embedded/performance-engineering/part3-10-thermal)
