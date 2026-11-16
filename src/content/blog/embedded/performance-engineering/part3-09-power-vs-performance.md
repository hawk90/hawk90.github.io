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

α는 switching activity, C는 유효 capacitance입니다. Linux `Documentation/power/energy-model.rst`의 간단한 energy model도 같은 꼴의 `Power = C * V^2 * f`를 쓰면서, 누설(static) 전력이 중요한 장치에서는 실제와 맞지 않을 수 있다고 적습니다. 다른 항이 같을 때 전압을 10% 낮추면 이 *동적 항*은 0.9² = 0.81배, 즉 19% 줄어듭니다. 보드 전체 전력이 같은 비율로 줄어든다는 뜻은 아닙니다.

## Race-to-Idle — 유리한 경우와 불리한 경우

같은 작업을 100 ms window 안에 끝낸다고 *가정한* 계산입니다. 전력값은 예시이고 측정값이 아닙니다.

| 경우 | Active 구간 | 나머지 idle | 총 에너지 |
|------|------|------|------|
| Slow | 1 W × 100 ms | 없음 | 100 mJ |
| Fast A | 5 W × 20 ms | 0.1 W × 80 ms | 108 mJ |
| Fast B | 3 W × 20 ms | 0.1 W × 80 ms | 68 mJ |

Fast A는 먼저 끝나지만 에너지가 더 듭니다. Fast B는 같은 가정에서 적게 듭니다. 여기에 DVFS·idle 진입과 복귀의 전환 에너지가 40 mJ 붙으면 Fast B도 108 mJ가 되어 Slow보다 나빠집니다.

```js title="energy-window.mjs"
export function energyJ(activeW, activeS, idleW, windowS, transitionJ = 0) {
  if (![activeW, activeS, idleW, windowS, transitionJ]
        .every(v => Number.isFinite(v) && v >= 0) || activeS > windowS)
    throw new RangeError('invalid window or power');
  return activeW * activeS + idleW * (windowS - activeS) + transitionJ;
}
```

이 함수를 Node.js 24.21에서 돌려 위 표의 100 / 108 / 68 mJ, 전환 비용 40 mJ를 더한 Fast B의 108 mJ, 그리고 active 시간이 window보다 긴 입력의 `RangeError`를 확인했습니다(`bench/power/test.mjs`, `energy-node.log`). 이것은 계산식의 검증이고 전력 측정은 아닙니다.

## Linux Governor — driver와 policy를 먼저 확인

[Linux 6.12 CPUFreq 문서](https://www.kernel.org/doc/html/v6.12/admin-guide/pm/cpufreq.html)는 CPUFreq를 core, scaling governor, scaling driver로 나눕니다. 같은 문서의 sysfs 설명에 따르면 `scaling_driver`는 쓰이는 scaling driver를, `affected_cpus`는 같은 policy(같은 성능 조절 인터페이스)를 공유하는 online CPU 목록을 보여 줍니다. 그래서 governor를 바꾸기 전에 이 둘부터 봅니다.

```bash
cat /sys/devices/system/cpu/cpufreq/policy0/scaling_driver
cat /sys/devices/system/cpu/cpufreq/policy0/scaling_available_governors
cat /sys/devices/system/cpu/cpufreq/policy0/scaling_governor
cat /sys/devices/system/cpu/cpufreq/policy0/affected_cpus
```

이 시리즈의 Debian 게스트에서는 첫 줄부터 `No such file or directory`였습니다. QEMU virt 게스트에는 cpufreq driver가 없습니다(`logs/p3-09-vm-pm.log`).

## Heterogeneous CPU

M2 Pro는 `sysctl` 기준 P코어 8개와 E코어 4개입니다(이 시리즈 소개 글). 같은 정수 루프(10억 번 곱셈·XOR)를 기본 우선순위와 `taskpolicy -b`로 3번씩 돌렸습니다(`bench/power/spin.c`, `clang -O2`). `taskpolicy(8)` man page에 따르면 `-b`는 `PRIO_DARWIN_BG` 우선순위로 실행합니다.

| 실행 | 시간 (3회) |
|---|---|
| 기본 | 1.526, 1.611, 2.089 s |
| `taskpolicy -b` | 4.111, 4.502, 5.604 s |

background 우선순위에서는 같은 일에 2.7배 안팎이 걸렸습니다. 어느 종류의 코어에서 돌았는지, 그때 전력이 얼마였는지는 이 측정으로 확인하지 않았고, 전력도 재지 않았습니다. 같은 일을 더 느린 쪽에서 돌릴 때 에너지가 줄어드는지는 위 race-to-idle 식에 실제 전력을 넣어야 판단할 수 있습니다.

Linux에서 CPU를 offline하면 scheduler가 그 CPU에 일을 주지 않게 되지만, 그 CPU의 cluster나 전원 domain이 실제로 꺼졌는지는 따로 확인해야 합니다.

## Idle State

[Linux 6.12 CPUIdle 문서](https://www.kernel.org/doc/html/v6.12/admin-guide/pm/cpuidle.html)는 idle state마다 governor가 보는 두 값을 정의합니다. target residency는 더 얕은 state 대신 그 state에 들어가서 에너지를 더 아끼려면 머물러야 하는 최소 시간(진입 시간 포함)이고, exit latency는 그 state에서 깨어나 명령을 다시 실행하기까지의 최대 시간입니다. sysfs에서는 각 state의 `latency`와 `residency`(둘 다 µs), `name`으로 보입니다.

```bash
cat /sys/devices/system/cpu/cpu0/cpuidle/state*/name
cat /sys/devices/system/cpu/cpu0/cpuidle/state*/latency
cat /sys/devices/system/cpu/cpu0/cpuidle/state*/residency
```

게스트에는 `cpuidle/state0`가 없었고 `/sys/devices/system/cpu/cpuidle/current_driver`는 `none`이었습니다. 실제 보드라면 이 값으로 "짧게 쉬는 구간에 어떤 state까지 쓸 수 있는가"를 판단합니다. residency보다 짧게 쉬면 깊은 state는 손해입니다.

## 측정 — 완료 작업량과 에너지 경계를 고정

에너지를 비교할 때는 같은 일을 끝냈는지부터 맞춥니다.

| 기록 | 비교할 것 | 주의할 것 |
|------|------|------|
| Workload·deadline | 같은 입력, 같은 완료 작업량, latency 분포 | 높은 주파수에서 처리량이 달라져 작업량 자체가 바뀜 |
| 전원·온도 | 측정한 전원 rail, 장비, sampling 주기, 시작 온도 | 센서 누락, 단위, throttling(3-10) |
| Policy·idle | scaling driver, governor, OPP, idle residency | 지원 안 하는 설정, 공유 domain |
| 반복 결과 | job당 에너지, latency 분포, 전환 비용 | 평균 전력만 같고 완료량이 다름 |

보드 입력단에서 잰 에너지, CPU power domain의 값, 프로세스별 추정치는 서로 다른 경계의 숫자이므로 한 표에서 섞지 않습니다.

## 정리

- 동적 전력은 C·V²·f에 비례하고(energy-model.rst), 전압 10% 감소는 동적 항을 19% 줄입니다. 누설 전력은 이 식 밖입니다.
- race-to-idle의 승패는 active·idle 전력과 전환 에너지로 정해집니다. 같은 100 ms window에서 가정한 숫자만 바꿔도 결론이 뒤집혔습니다.
- governor를 바꾸기 전에 `scaling_driver`와 `affected_cpus`를 봅니다. QEMU 게스트에는 cpufreq도 cpuidle state도 없었습니다.
- M2 Pro에서 같은 루프가 background 우선순위로는 2.7배 걸렸습니다. 에너지 비교에는 실제 전력 측정이 필요합니다.

다음 편은 [3-10: Thermal](/blog/embedded/performance-engineering/part3-10-thermal)입니다.

## 관련 항목

- [3-08: Peripheral Clock](/blog/embedded/performance-engineering/part3-08-peripheral-clock)
- [3-10: Thermal](/blog/embedded/performance-engineering/part3-10-thermal)

## 참고 자료

- Linux v6.12 `Documentation/power/energy-model.rst`, [CPUFreq](https://www.kernel.org/doc/html/v6.12/admin-guide/pm/cpufreq.html), [CPUIdle](https://www.kernel.org/doc/html/v6.12/admin-guide/pm/cpuidle.html)
- macOS `taskpolicy(8)` man page
