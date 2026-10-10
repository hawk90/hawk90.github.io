---
title: "Edge Thermal Management — Throttling·DVFS·Fan Curve·Sustained"
slug: "embedded/modern-recipes/part12-07-thermal"
date: 2026-04-21T09:06:00
description: "Edge AI 보드의 sustained 성능을 결정하는 thermal 한계. throttle trip, DVFS, fan curve, nvpmodel, passive cooling 설계를 정리합니다."
series: "Modern Embedded Recipes"
seriesOrder: 143
tags: [recipes, thermal, throttling, edge-ai, jetson, dvfs]
topics: ["embedded"]
---

## 한 줄 요약

> **"Edge AI 보드의 진짜 spec은 burst가 아니라 sustained 성능입니다."** 보드 크기·전력·냉각·ambient에 따라 온도와 throttling이 달라지므로 long-run thermal 측정이 필요합니다.

## 어떤 상황에서 쓰나

자율주행 ECU, drone autopilot, factory inspection 박스, 카메라 NVR 모두 *수 시간 연속 동작*을 전제로 합니다. 데이터센터 GPU와 달리 큰 fan과 chiller를 못 쓰고, 자동차 장착 위치에 따라 ambient 요구 범위가 넓습니다.

문제는 spec sheet의 TOPS·fps 숫자가 거의 항상 *burst* 기준이라는 점입니다. 짧게 측정하면 throttle이 일어나기 전 수치가 잡히므로 실제 deploy 환경의 sustained 수치보다 높게 나올 수 있습니다. 차이는 보드·냉각·ambient·workload로 측정합니다. 처음부터 sustained 기준으로 측정하고 enclosure·heatsink를 함께 설계해야 합니다.

## 핵심 개념

Thermal throttle은 SoC가 *junction temperature*(Tj) 한계에 도달하면 frequency를 강제로 낮추는 방식으로 동작합니다. 아래 trip 온도는 구조를 보여 주는 예시이고, 실제 값은 SoC datasheet와 BSP의 thermal zone 설정(device tree)으로 확인합니다.

| 온도 (예시) | 동작 |
|------|------|
| 60°C | fan ramp 시작 (있다면) |
| 85°C | soft throttle — frequency 단계 감소 |
| 95°C | hard throttle — minimum freq |
| 105°C | shutdown |

DVFS(Dynamic Voltage and Frequency Scaling)가 throttle의 실제 mechanism입니다. Linux kernel이 thermal zone trip을 감지하면 cpufreq governor가 frequency를 떨어뜨리고, GPU·DLA는 vendor driver가 별도 관리합니다.

Cooling은 세 옵션이 있습니다.

| Cooling | 특성 |
|---------|------|
| Passive heatsink | fanless, 먼지/진동 영향 적음, 자동차·산업 장비에서 선호 |
| Fan | 효율 좋음, 소비자 device, 먼지·실패 위험 |
| Liquid | 대형 edge box·data center, 비용·복잡도 높음 |

자동차 ECU는 먼지·진동·수명 문제로 fanless 설계를 우선 검토하는 경우가 많고, 이때는 *처음부터 낮은 clock*으로 thermal headroom을 확보합니다.

Production deploy의 핵심은 *margin*입니다. 정상 운영 온도를 throttle trip보다 충분히 낮게 두어야 ambient가 변해도 trip에 걸리지 않습니다. margin 크기는 최악 ambient·enclosure·workload 조건에서 측정해 정합니다.

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
cat /sys/class/thermal/thermal_zone0/trip_point_0_temp   # 예: 60000 (active cooling)
cat /sys/class/thermal/thermal_zone0/trip_point_1_temp   # 예: 85000 (passive/throttle)
cat /sys/class/thermal/thermal_zone0/trip_point_2_temp   # 예: 95000 (critical)
```

`/sys/class/thermal`은 표준 Linux thermal framework입니다. Custom application의 telemetry에도 활용합니다.

### nvpmodel — Jetson power mode

```bash
# 현재 mode 확인
sudo nvpmodel -q
# NV Power Mode: MAXN
# 0

# Mode 전환 — mode ID와 전력 budget의 대응은 module마다 다름
sudo nvpmodel -m 0   # 대개 MAXN
sudo nvpmodel -m <id>   # /etc/nvpmodel.conf의 POWER_MODEL 정의 참조

# Custom mode (편집)
sudo vi /etc/nvpmodel.conf
```

각 mode는 *CPU/GPU/DLA frequency cap + power budget*의 조합입니다. MAXN이 항상 sustained 성능이 가장 좋은 것은 아니므로, 냉각 조건에서 mode별 long-run 성능을 측정해 production mode를 고릅니다.

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
# 짧은 burst 측정
timeout 300 ./yolo_bench --fps_log fps.log

# 1시간 sustained 측정
timeout 3600 ./yolo_bench --fps_log fps_long.log

# tegrastats 동시에
sudo tegrastats --logfile thermal.log &
```

두 log의 fps 곡선과 thermal log를 겹쳐 보면 throttle 시점과 steady state가 드러납니다. 측정 시간은 온도가 steady state에 도달할 만큼 길게 잡습니다.

### jetson_clocks — burst max

```bash
# 현재 설정 저장 후 모든 clock을 max로 lock — benchmarking·development
sudo jetson_clocks --store /tmp/backup.conf
sudo jetson_clocks

# 원래대로 복원
sudo jetson_clocks --restore /tmp/backup.conf
```

`jetson_clocks`은 DVFS를 우회해 clock을 최대로 고정하는 명령입니다. thermal 보호는 여전히 동작하지만 발열이 커지므로 burst 측정·development 용도로만 쓰고, production은 측정한 `nvpmodel` mode로 운영합니다.

## 측정 / 성능 비교

Power mode와 cooling 비교는 같은 model·입력·ambient에서 mode나 cooling 하나만 바꿔 측정합니다. 기록할 항목입니다.

| 항목 | 출처 | 보는 것 |
|---|---|---|
| Burst fps | 첫 수 분 bench log | datasheet·demo 수치와의 비교 기준 |
| Sustained fps | steady state 이후 bench log | 실제 운영 성능 |
| Peak·steady 온도 | `tegrastats`·thermal zone | trip까지 남은 margin |
| GPU·CPU freq | `tegrastats` | throttle 발생 시점 |
| Rail power | `tegrastats` VDD_* | mode별 power budget 준수 |

Burst와 sustained가 거의 같은 mode는 냉각이 그 mode의 발열을 감당한다는 뜻입니다. 두 값이 벌어지면 mode를 낮추거나 heatsink·airflow를 키운 뒤 다시 측정해 비교합니다. Heatsink 크기·fan·ducting 같은 cooling 변경도 같은 표로 비교합니다.

## 자주 보는 함정

> Burst benchmark만 측정

```bash
./bench --duration 30
# 짧은 측정 — throttle 이전 수치만 잡힘
```

온도가 steady state에 도달할 만큼 long-run 측정을 합니다. Cold start와 warm steady state는 다릅니다.

> jetson_clocks production 활성화

```bash
# /etc/rc.local
sudo jetson_clocks   # always max — 발열 증가, thermal trip 위험
```

Production은 `nvpmodel`로 *thermal-aware mode*를 선택합니다.

> Fan을 무조건 신뢰

```c
/* fan 전제 설계 */
/* 먼지 누적·bearing 마모로 fan 성능 저하 → throttle */
```

먼지·진동·진동 환경(자동차)이라면 fanless·passive를 우선 검토합니다. Fan을 쓰더라도 monitoring + alert를 갖춥니다.

> Margin 부족

```text
정상 운영 온도가 trip 직전
→ ambient가 조금만 올라도 trip
```

최악 ambient 조건에서 측정한 margin을 기준으로 enclosure·workload를 설계합니다.

> Enclosure ventilation 부족

완전 밀폐된 IP67 box는 내부 공기 온도가 외부보다 올라가고, SoC는 그만큼 높아진 온도 위에서 동작합니다. 내부 공기로만 열을 버리는 heatsink는 효과가 제한됩니다. IP rating이 필요하면 *conduction*으로 외부 panel에 열을 전달하는 설계가 필요합니다. 밀폐형 자동차 ECU 등에서 쓰는 방식입니다.

> Workload가 transient burst만 큼

30 fps에 batch 1이면 매 frame마다 짧은 burst가 고르게 반복됩니다. 반대로 1 fps에 batch 30이면 총 연산량은 같지만 한 번의 burst가 훨씬 커져 순간 전력과 온도가 튈 수 있습니다. Batch 크기와 분배를 조절해 *순간 power spike*를 줄입니다.

## 정리

- Edge AI 보드의 실제 spec은 burst가 아닌 sustained 성능입니다.
- Throttle은 thermal zone trip에서 시작해 frequency를 단계적으로 낮춥니다. trip 온도는 SoC·BSP 설정으로 확인합니다.
- `tegrastats`·`/sys/class/thermal`로 CPU·GPU·thermal zone을 실시간 모니터합니다.
- `nvpmodel`로 power mode를 thermal-aware하게 설정합니다. `jetson_clocks`는 측정·개발 용도로만 씁니다.
- 먼지·진동이 큰 자동차·산업 환경에서는 fanless·passive cooling을 우선 검토합니다.
- Production application은 thermal trend를 읽어 workload를 능동 조절합니다.
- 최악 ambient에서 측정한 margin을 기준으로 enclosure·heatsink를 설계합니다.
- Steady state까지 가는 long-run 측정이 sustained 성능을 드러냅니다.

다음 편은 **Jetson 가족과 최적화 stack**입니다.

## 관련 항목

- [12-03: Quantization](/blog/embedded/modern-recipes/part12-03-quantization)
- [12-08: Jetson](/blog/embedded/modern-recipes/part12-08-jetson)
- [PE 3-10: Thermal Throttling](/blog/embedded/performance-engineering/part3-10-thermal)
