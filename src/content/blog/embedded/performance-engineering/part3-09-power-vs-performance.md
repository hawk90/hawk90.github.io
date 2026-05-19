---
title: "3-09: Power vs Performance — DVFS·Race-to-Idle·Big.LITTLE"
date: 2026-05-19T08:00:00
description: "DVFS governor, race-to-idle, big.LITTLE, CPU 코어 hotplug, 측정·tuning."
series: "Embedded Performance Engineering"
seriesOrder: 27
tags: [power, dvfs, cpufreq, big-little, race-to-idle]
draft: true
---

## 한 줄 요약

> **"Power = V² × f × C"** — voltage·frequency·capacitive load 모두 영향.

## CMOS Dynamic Power 공식

```text
P_dynamic = α × C × V² × f

  α  — switching activity (0~1)
  C  — capacitance
  V  — voltage
  f  — frequency

P_static = leakage (V·온도 비례)
```

**V를 10% 줄이면** — power 19% 절약.
**f 절반** + **V 약간 줄임** — power *4x* 절약 가능.

## DVFS Curve

```text
Frequency (MHz):  100   400   800  1200  1600  1800
Voltage (V):      0.8   0.9   1.0  1.05  1.10  1.15
Power (W):        0.3   1.3   3.5   5.5   8.5  11.0

이상적 비례: 100 → 1800 = 18x f
실 power:   0.3 → 11.0 = 37x P  (V²·f 함께 ↑)
```

고주파일수록 *효율 ↓*. **Sweet spot** = 중간 (f·P 비율 최적).

## Race-to-Idle

```text
Workload: 100 ms 작업
  
옵션 A: 200 MHz 동안 100 ms 실행 → 100 ms × 1 W = 100 mJ
옵션 B: 1 GHz 동안 20 ms 실행 + 80 ms idle (0.1 W) → 20 × 5 + 80 × 0.1 = 108 mJ

거의 같음 — 그러나 *부하 짧을수록 race-to-idle 유리*
(idle power가 dynamic보다 압도적 작을 때)
```

ARM big.LITTLE — *high 코어 100ms → idle*가 *low 코어 1s 계속*보다 효율.

## Linux Governor

### performance — 항상 최대 freq

```bash
echo performance > /sys/.../scaling_governor
```

Latency critical (real-time, low-latency network). Battery 빠르게 소모.

### powersave — 항상 최소 freq

```bash
echo powersave > ...
```

Throughput 무관, *수명 최우선*. IoT 센서.

### ondemand — Load 기반 (deprecated)

CPU usage > 95% → ramp up. 응답 약간 느림.

### schedutil — 가장 흔함 (modern)

```bash
echo schedutil > ...
```

Scheduler가 *task별 util 추정* → 즉시 frequency 조정. ondemand보다 *예측 빠름*.

### conservative

ondemand보다 *더 천천히 ramp*. 배터리 절약 우선.

## Embedded — Heterogeneous CPU

### big.LITTLE (ARM)

```text
Snapdragon 845:
  Big: 4 × Cortex-A75 @ 2.8 GHz (peak)
  Little: 4 × Cortex-A55 @ 1.8 GHz (efficient)

전환 모드:
  CPU Migration — 한 core만 active
  CPU Cluster Switching — big or little cluster 통째
  Global Task Scheduling (GTS) — task가 *적절한 core*에 dispatch
```

### DynamIQ (ARM v8.2+)

```text
big·little을 한 cluster에 — *공유 L3 cache*
→ migration overhead 감소
→ task 더 미세하게 core 할당
```

Cortex-A76 + A55 = DynamIQ cluster. 모바일 표준.

## CPU Hotplug

```bash
# 코어 끔
echo 0 > /sys/devices/system/cpu/cpu3/online

# 켬
echo 1 > /sys/devices/system/cpu/cpu3/online
```

*전체 코어 power off* — 더 큰 절약 (그러나 wakeup latency ↑).

자동차 — 정차 시 코어 절반 hotplug off.

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

깊은 state — 전력 더 절약, *wakeup latency 더 김*. RTOS는 *깊은 state 회피*.

## ESP32 Light Sleep — 임베디드 사례

```c
esp_sleep_enable_timer_wakeup(1000000);   // 1 sec
esp_sleep_enable_ext0_wakeup(GPIO_PIN, 1);
esp_light_sleep_start();   // 30 µA, 1 ms wakeup
```

배터리 IoT — *99% sleep + 1% active*.

## Thermal Throttling

```text
CPU 85°C 초과 → frequency 자동 ↓ (or core off)
→ 짧은 burst 후 throttle → 평균 성능 ↓

해결:
- 방열판
- 부하 분산 (다른 core, 다른 코어)
- 짧은 burst + 충분한 idle (race-to-idle 효과)
```

스마트폰 게이밍·노트북 — 흔한 문제.

## 측정 — powertop

```bash
sudo powertop
```

화면:
- Per-process power
- C-state residency (좋음: C2 이상 80%↑)
- Wakeup/sec (낮을수록 좋음)
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

System wake가 적을수록 — *깊은 sleep 더 길게* 유지.

## 자동차·항공 — Power Budget

```text
Avionics 일반 ECU: 5-15 W
중앙 컴퓨터 (high-perf): 30-80 W
LV 비행 컴퓨터: 5-20 W (열 방출 어려움)

→ DVFS·hotplug *제한적* — *결정성 우선*
→ 보통 *고정 frequency* + *core 사용량 통제*
```

위성·우주선 — *방열 어려움* → *fixed slow* CPU.

## 자주 하는 실수

> ⚠️ 항상 max frequency

```bash
governor=performance
# → 배터리 노트북 2시간, 그렇지 않으면 6시간
```

> ⚠️ ondemand·schedutil 차이 무시

ondemand는 *반응 느림* — schedutil이 modern Linux 기본.

> ⚠️ Wakeup source 무시

```text
매 1 ms wakeup → 깊은 C-state 못 들어감 → 항상 C1
```

Background task의 wake 빈도 점검.

> ⚠️ Thermal 무시한 benchmark

```c
loop_benchmark();   // ← 10초 후부터 thermal throttle
```

→ 충분한 cool-down 후 측정.

## 정리

- Power = **V² × f** + leakage.
- **Race-to-Idle** — burst high freq → 깊은 sleep.
- Linux — *schedutil governor* + CPUIdle C-state.
- ARM **big.LITTLE / DynamIQ** — heterogeneous power efficiency.
- **CPU hotplug + light sleep** = IoT·자동차 절전.
- 측정 — `powertop`·`turbostat`·`/sys/.../cpufreq`.

다음 편은 **Thermal**.

## 관련 항목

- [3-08: Peripheral Clock](/blog/embedded/performance-engineering/part3-08-peripheral-clock)
- [3-10: Thermal](/blog/embedded/performance-engineering/part3-10-thermal)
