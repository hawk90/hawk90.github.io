---
title: "3-09: Power vs Performance — DVFS·Race-to-Idle·Big.LITTLE"
date: 2026-05-08T08:00:00
description: "DVFS governor, race-to-idle, big.LITTLE, CPU 코어 hotplug, 측정·tuning."
series: "Embedded Performance Engineering"
seriesOrder: 27
tags: [power, dvfs, cpufreq, big-little, race-to-idle]
draft: false
---

## 한 줄 요약

> **$P = V^2 \cdot f \cdot C$** — voltage, frequency, capacitive load가 모두 전력에 영향을 줍니다.

## CMOS Dynamic Power 공식

$$P_{\text{dynamic}} = \alpha \cdot C \cdot V^2 \cdot f$$

여기서 $\alpha$는 switching activity (0~1), $C$는 capacitance, $V$는 voltage, $f$는 frequency입니다.

$$P_{\text{static}} = \text{leakage} \quad (V \cdot \text{온도에 비례})$$

**V를 10% 줄이면** power가 19% 절약됩니다.
**f를 절반**으로 줄이고 **V를 약간** 더 낮추면 power를 4배까지도 절약할 수 있습니다.

## DVFS Curve

```text
Frequency (MHz):  100   400   800  1200  1600  1800
Voltage (V):      0.8   0.9   1.0  1.05  1.10  1.15
Power (W):        0.3   1.3   3.5   5.5   8.5  11.0

이상적 비례: 100 → 1800 = 18x f
실 power:   0.3 → 11.0 = 37x P  (V²·f 함께 ↑)
```

고주파로 갈수록 효율이 떨어집니다. **Sweet spot**은 보통 중간 영역에 있고, f·P 비율이 가장 좋아집니다.

## Race-to-Idle

Workload — 100 ms 작업.

| 옵션 | 시나리오 | 에너지 |
|------|----------|--------|
| A | 200 MHz 동안 100 ms 실행 | 100 ms × 1 W = 100 mJ |
| B | 1 GHz 동안 20 ms 실행 + 80 ms idle (0.1 W) | 20 × 5 + 80 × 0.1 = 108 mJ |

거의 같음 — 그러나 *부하 짧을수록 race-to-idle 유리* (idle power가 dynamic보다 압도적 작을 때).

ARM big.LITTLE 구조에서는 high 코어로 100 ms 처리하고 idle로 들어가는 쪽이, low 코어를 1 s 동안 계속 돌리는 쪽보다 효율적입니다.

## Linux Governor

### performance — 항상 최대 freq

```bash
echo performance > /sys/.../scaling_governor
```

real-time이나 low-latency network처럼 latency가 critical한 경우에 적합합니다. 그 대신 battery는 빠르게 소모됩니다.

### powersave — 항상 최소 freq

```bash
echo powersave > ...
```

throughput은 신경 쓰지 않고 수명을 최우선으로 하는 IoT 센서 같은 경우에 어울립니다.

### ondemand — Load 기반 (deprecated)

CPU usage가 95%를 넘으면 ramp up 합니다. 응답은 약간 느립니다.

### schedutil — 가장 흔함 (modern)

```bash
echo schedutil > ...
```

Scheduler가 task별 util을 추정해 즉시 frequency를 조정하기 때문에, ondemand보다 예측이 빠릅니다.

### conservative

ondemand보다 더 천천히 ramp up 하면서 배터리 절약을 우선시합니다.

## Embedded — Heterogeneous CPU

### big.LITTLE (ARM)

**Snapdragon 845:**

- Big: 4 × Cortex-A75 @ 2.8 GHz (peak)
- Little: 4 × Cortex-A55 @ 1.8 GHz (efficient)

**전환 모드:**

- CPU Migration — 한 core만 active
- CPU Cluster Switching — big or little cluster 통째
- Global Task Scheduling (GTS) — task가 *적절한 core*에 dispatch

### DynamIQ (ARM v8.2+)

big·little을 한 cluster에 묶고 *공유 L3 cache*를 둔다. 이로 인해 *migration overhead 감소*, *task를 더 미세하게 core 할당* 가능.

Cortex-A76 + A55가 DynamIQ cluster의 대표 구성이며, 모바일 표준으로 자리잡았습니다.

## CPU Hotplug

```bash
# 코어 끔
echo 0 > /sys/devices/system/cpu/cpu3/online

# 켬
echo 1 > /sys/devices/system/cpu/cpu3/online
```

전체 코어를 power off하므로 더 큰 절약 효과가 있고, 그만큼 wakeup latency도 늘어납니다.

자동차에서는 정차 시 코어 절반을 hotplug off 하는 식으로 쓰입니다.

## Idle State (C-state)

Linux CPUIdle:

```text
C0 — running
C1 — halt (대기)
C2 — deep sleep (clock off)
C3 — deeper (cache flush)
...
```

```bash
cat /sys/devices/system/cpu/cpu0/cpuidle/state*/name
# WFI, MWAIT(C1), MWAIT(C2), ...
```

깊은 state로 갈수록 전력은 더 절약되지만 wakeup latency가 길어집니다. RTOS는 보통 깊은 state를 회피합니다.

## ESP32 Light Sleep — 임베디드 사례

```c
esp_sleep_enable_timer_wakeup(1000000);   // 1 sec
esp_sleep_enable_ext0_wakeup(GPIO_PIN, 1);
esp_light_sleep_start();   // 30 µA, 1 ms wakeup
```

배터리 IoT 기기는 99% sleep과 1% active 패턴으로 동작합니다.

## Thermal Throttling

CPU가 85°C를 초과하면 frequency가 자동으로 내려가거나 코어가 꺼진다. 짧은 burst 후 throttle이 걸려 *평균 성능*이 떨어진다.

해결:

- 방열판
- 부하 분산 (다른 core, 다른 코어)
- 짧은 burst + 충분한 idle (race-to-idle 효과)

스마트폰 게이밍이나 노트북에서 흔히 나타나는 문제입니다.

## 측정 — powertop

```bash
sudo powertop
```

화면에는 다음과 같은 정보가 표시됩니다.

- Per-process power
- C-state residency (C2 이상 residency가 80% 이상이면 좋습니다)
- Wakeup/sec (낮을수록 좋습니다)
- Tunable 추천

## Wakeup Source 최소화

Linux:

```bash
sudo cat /proc/interrupts
# IRQ 횟수 — 많은 행이 *background wake* 소스
```

```bash
# Wake-on-LAN 끔
ethtool -s eth0 wol d
```

System wake가 적을수록 깊은 sleep을 더 길게 유지할 수 있습니다.

## 자동차·항공 — Power Budget

| 시스템 | Power 범위 |
|--------|-----------|
| Avionics 일반 ECU | 5–15 W |
| 중앙 컴퓨터 (high-perf) | 30–80 W |
| LV 비행 컴퓨터 | 5–20 W (열 방출 어려움) |

DVFS·hotplug는 *제한적* — *결정성 우선*. 보통 *고정 frequency* + *core 사용량 통제*.

위성과 우주선은 방열이 어렵기 때문에 fixed slow CPU를 그대로 쓰는 경우가 많습니다.

## 자주 하는 실수

> ⚠️ 항상 max frequency

```bash
governor=performance
# → 배터리 노트북 2시간, 그렇지 않으면 6시간
```

> ⚠️ ondemand·schedutil 차이 무시

ondemand는 반응이 느리고, modern Linux의 기본은 schedutil입니다.

> ⚠️ Wakeup source 무시

매 1 ms wakeup이 들어오면 깊은 C-state로 못 들어가고 *항상 C1*에 머문다. Background task의 wake 빈도를 점검해야 합니다.

> ⚠️ Thermal 무시한 benchmark

```c
loop_benchmark();   // ← 10초 후부터 thermal throttle
```

충분히 cool-down한 다음 측정해야 합니다.

## 정리

- Power는 $V^2 \cdot f$에 leakage가 더해진 값입니다.
- **Race-to-Idle**은 burst high freq로 빠르게 처리하고 깊은 sleep으로 들어가는 전략입니다.
- Linux에서는 *schedutil governor*와 CPUIdle C-state를 함께 씁니다.
- ARM **big.LITTLE / DynamIQ**는 heterogeneous 구조로 전력 효율을 끌어올립니다.
- **CPU hotplug + light sleep**은 IoT와 자동차에서 절전의 핵심입니다.
- 측정에는 `powertop`, `turbostat`, `/sys/.../cpufreq`를 사용합니다.

다음 편은 **Thermal**을 다룹니다.

## 관련 항목

- [3-08: Peripheral Clock](/blog/embedded/performance-engineering/part3-08-peripheral-clock)
- [3-10: Thermal](/blog/embedded/performance-engineering/part3-10-thermal)
