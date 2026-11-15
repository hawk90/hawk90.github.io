---
title: "Power vs Performance 트레이드오프 — DVFS·Race-to-Idle·Big.LITTLE"
slug: "embedded/performance-engineering/part3-09-power-vs-performance"
date: 2026-04-25T09:08:00
description: "DVFS governor, race-to-idle, big.LITTLE, CPU 코어 hotplug, 측정·tuning."
series: "Embedded Performance Engineering"
seriesOrder: 27
tags: [power, dvfs, cpufreq, big-little, race-to-idle]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> 같은 일을 같은 deadline 안에 끝낼 때의 **총 에너지**를 비교해야 합니다. 높은 주파수로 빨리 끝내는 race-to-idle이 항상 유리하지는 않습니다.

## CMOS Dynamic Power 공식

$$P_{\text{dynamic}} = \alpha C V^2 f$$

Switching activity·유효 capacitance·전압·주파수를 사용한 단순 모델입니다. 다른 항이 같을 때 전압을 10% 낮추면 이 **dynamic 항**은 19% 줄어듭니다. Board 전체 전력이 같은 비율로 줄어든다는 뜻은 아닙니다. Static power는 누설 전류와 전압의 곱으로 볼 수 있지만 온도·공정 의존성을 단순 선형식으로 두지 않습니다.

기존의 SoC가 없는 DVFS 전압·전력 표와 임의 배터리 수명·차량 전력 budget은 측정 근거가 없어 제거했습니다. 실제 OPP, 공유 전압 domain, memory/peripheral 전력과 thermal 상태를 함께 기록합니다.

## Race-to-Idle — 유리한 경우와 불리한 경우

동일 작업을 100ms window 안에 끝낸다고 **가정한 계산 예**입니다. 주파수에 반비례하는 완료 시간이나 표의 전력값을 실제 CPU 측정으로 주장하지 않습니다.

| 경우 | Active 구간 | 나머지 idle | 총 에너지 |
|------|------|------|------|
| Slow | 1W × 100ms | 없음 | 100mJ |
| Fast A | 5W × 20ms | 0.1W × 80ms | 108mJ |
| Fast B | 3W × 20ms | 0.1W × 80ms | 68mJ |

Fast A는 먼저 끝나지만 에너지가 더 듭니다. Fast B는 같은 가정에서 적게 듭니다. DVFS·idle 진입/복귀의 전환 에너지를 더하면 다시 역전될 수 있습니다. 부하가 짧다는 사실만으로 결과를 결정할 수 없습니다.

```js title="energy-window.mjs"
export function energyJ(activeW, activeS, idleW, windowS, transitionJ = 0) {
  if (![activeW, activeS, idleW, windowS, transitionJ]
        .every(v => Number.isFinite(v) && v >= 0) || activeS > windowS)
    throw new RangeError('invalid window or power');
  return activeW * activeS + idleW * (windowS - activeS) + transitionJ;
}
```

위 함수를 실행해 100/108/68mJ, 전환 비용 때문에 결론이 바뀌는 경우와 잘못된 window 거부를 확인했습니다. 단위·계산 검증이며 실제 전력 측정은 아닙니다.

## Linux Governor — driver와 policy를 먼저 확인

[Linux6.12 CPUFreq 문서](https://www.kernel.org/doc/html/v6.12/admin-guide/pm/cpufreq.html)는 core·governor·driver를 구분합니다. Generic performance/powersave는 policy 제한 안의 높은/낮은 주파수를 요청합니다. `intel_pstate` 같은 driver의 같은 이름 정책이 항상 최대/최소 고정 주파수와 같은 것은 아닙니다. Ondemand가 전부 deprecated라거나 임계값이 항상95%, schedutil이 모든 배포판의 기본이라고 쓰지 않습니다.

```bash
cat /sys/devices/system/cpu/cpufreq/policy0/scaling_driver
cat /sys/devices/system/cpu/cpufreq/policy0/scaling_available_governors
cat /sys/devices/system/cpu/cpufreq/policy0/scaling_governor
cat /sys/devices/system/cpu/cpufreq/policy0/affected_cpus
```

미실행 조사 예입니다. Policy0·경로가 없을 수 있고 같은 policy의 여러 CPU가 함께 영향을 받을 수 있습니다. 지원하지 않는 governor나 권한 실패를 측정 성공으로 처리하지 않습니다.

## Heterogeneous CPU와 CPU Hotplug

big.LITTLE·DynamIQ처럼 용량이 다른 CPU를 쓰더라도 작업 특성·migration·shared cache·memory 대기·scheduler 정책에 따라 에너지가 달라집니다. 특정 Snapdragon 구성이나 big core가 항상 더 효율적이라는 비교는 제품·workload 증거 없이 일반화하지 않습니다.

Linux CPU offline은 scheduler의 실행 대상과 CPU lifecycle을 바꿉니다. 공유 cluster·전원 domain까지 물리적으로 꺼졌다는 증거가 아닙니다. Hotplug 자체의 지연·상태 복구와 driver 지원도 확인합니다.

## Idle State와 Thermal

[Linux6.12 CPUIdle](https://www.kernel.org/doc/html/v6.12/admin-guide/pm/cpuidle.html)의 idle state는 driver·platform에 따릅니다. C1/C2/C3를 모든 Arm·x86 시스템에 같은 clock/cache 동작으로 대응시키지 않습니다. Exit latency·target residency·wakeup 조건을 확인합니다.

```bash
cat /sys/devices/system/cpu/cpu0/cpuidle/state*/name
cat /sys/devices/system/cpu/cpu0/cpuidle/state*/latency
cat /sys/devices/system/cpu/cpu0/cpuidle/state*/residency
```

Thermal trip·throttling 온도와 동작도 SoC·firmware 정책에 따릅니다. 보편적인85°C·10초 수치를 두지 않습니다. ESP32 sleep 전류·wakeup API도 chip·ESP-IDF 판·전원 구성별이며 이 작업에서 board 측정을 하지 않았습니다.

## 측정 — 완료 작업량과 에너지 경계를 고정

Board 입력에서 측정한 에너지와 CPU power-domain 값, PowerTOP의 모델 기반 process 추정은 서로 다른 자료입니다. PowerTOP 추천을 적용했다고 battery 수명이 입증되지는 않습니다. `/proc/interrupts`의 누적 IRQ는 suspend wake 원인을 직접 증명하지 않습니다.

| 기록 | 비교할 것 | 실패·예외 |
|------|------|------|
| Workload·deadline | 같은 입력·완료 작업량·tail latency | 고주파에서 작업량 자체가 달라짐 |
| 전원·온도 | 전압 rail·장비·sampling·thermal 시작점 | sensor 누락·단위·throttle |
| Policy·idle | driver·governor·OPP·residency | unsupported·공유 domain·진입 실패 |
| 반복 결과 | energy/job·latency 분포·전환 비용 | 평균 전력만 같고 완료량이 다름 |

## 정리

Dynamic power 식으로 board 전력을 단정하거나 race-to-idle을 기본 승자로 고르지 않습니다. 동일 작업·deadline의 완료 시간, idle·전환 에너지와 온도 조건을 함께 비교합니다. 이 장의 실행 결과는 가정한 에너지 계산에 한정됩니다.

다음 편은 [3-10: Thermal](/blog/embedded/performance-engineering/part3-10-thermal)입니다.

## 관련 항목

- [3-08: Peripheral Clock](/blog/embedded/performance-engineering/part3-08-peripheral-clock)
- [3-10: Thermal](/blog/embedded/performance-engineering/part3-10-thermal)
