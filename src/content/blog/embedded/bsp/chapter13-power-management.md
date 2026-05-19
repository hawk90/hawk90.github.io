---
title: "Ch 13: Power Management — suspend/resume, runtime PM, regulators"
date: 2026-05-09T13:00:00
description: "BSP의 전력 관리 — suspend-to-RAM, runtime PM, regulator framework, CPU idle/freq를 정리합니다."
series: "BSP Development"
seriesOrder: 13
tags: [embedded, bsp, power-management, pm, runtime-pm]
draft: false
---

## 한 줄 요약

**Linux 전력 관리는 4개의 직교 축으로 구성됩니다 — system sleep, runtime PM, cpuidle, cpufreq.** BSP는 각 축에 적절한 디바이스·정책을 *명시적*으로 연결해야 합니다. 기본값으로 두면 절전이 되지 않거나, 반대로 부팅 후 disable이 안 풀려 디바이스가 동작 안 합니다.

배터리 구동 보드, 발열 민감 보드, 24시간 운용 보드 모두 PM 작업이 필요합니다. 양산 단계에서 milliwatt 단위로 측정하며 어느 도메인이 켜져 있는지 확인하는 일이 흔합니다. 이번 글은 BSP가 PM을 통합할 때 필요한 framework 4종과 측정·튜닝 흐름을 정리합니다.

## 4개의 PM 축

```text
┌──────────────────────────────────────────────────────┐
│ System sleep (suspend-to-RAM / disk)                 │
│   사용자 명시. 전체 시스템 정지.                       │
│   echo mem > /sys/power/state                        │
├──────────────────────────────────────────────────────┤
│ Runtime PM                                           │
│   디바이스별 dynamic suspend. 사용 안 하면 자동 OFF.   │
│   pm_runtime_get / pm_runtime_put                    │
├──────────────────────────────────────────────────────┤
│ cpuidle                                              │
│   CPU의 짧은 idle 진입. C-state 진입/탈출.            │
│   /sys/devices/system/cpu/cpu*/cpuidle/              │
├──────────────────────────────────────────────────────┤
│ cpufreq                                              │
│   동작 중 CPU의 frequency·voltage 조정 (DVFS).        │
│   /sys/devices/system/cpu/cpu*/cpufreq/              │
└──────────────────────────────────────────────────────┘
```

각 축은 *독립적*으로 동작하지만 같은 PMIC, 같은 regulator를 공유합니다.

## System sleep — suspend states

```bash
$ cat /sys/power/state
freeze mem disk
```

| state | 의미 | 복귀 시간 |
|-------|------|-----------|
| `freeze` | userspace freeze, idle 진입. 가장 가벼움 | < 100 ms |
| `mem` (s2ram) | DRAM은 self-refresh, CPU OFF | 500 ms ~ 2 s |
| `disk` (hibernate) | DRAM 내용을 swap에 저장, 전원 OFF | 5 ~ 30 s |
| `off` | 완전 종료 | reboot 수준 |

대부분의 임베디드는 `mem`(suspend-to-RAM) 까지만 지원합니다.

```bash
# suspend 진입
echo mem > /sys/power/state

# wakeup 후 dmesg 확인
[  120.123456] PM: suspend entry (deep)
[  120.234567] Filesystems sync: 0.01 seconds
[  120.345678] Freezing user space processes ... (elapsed 0.001 seconds) done.
[  120.456789] Suspending console(s) (use no_console_suspend to debug)
[  121.123456] PM: suspend exit
```

### wakeup source

suspend 상태에서 어떤 이벤트가 깨우는지 명시해야 합니다.

```bash
# wakeup 가능한 디바이스 목록
$ cat /sys/kernel/debug/wakeup_sources
name              active_count  event_count  wakeup_count ...

# 특정 디바이스 wakeup 활성/비활성
$ cat /sys/devices/.../power/wakeup
disabled
$ echo enabled > /sys/devices/.../power/wakeup
```

DT에서 명시적 wakeup 선언:

```text
&gpio_keys {
    pwr-button {
        label = "Power button";
        gpios = <&gpio0 1 GPIO_ACTIVE_LOW>;
        linux,code = <KEY_POWER>;
        wakeup-source;          /* 이 키 입력으로 wakeup */
    };
};

&uart1 {
    wakeup-source;              /* RX activity로 wakeup */
};
```

### suspend ops 구현 (드라이버 측)

```c
static int mychip_suspend(struct device *dev)
{
    struct mychip_data *priv = dev_get_drvdata(dev);

    /* 인터럽트 비활성, 레지스터 저장 */
    disable_irq(priv->irq);
    priv->saved_ctrl = readl(priv->base + CTRL_REG);
    clk_disable_unprepare(priv->clk);
    return 0;
}

static int mychip_resume(struct device *dev)
{
    struct mychip_data *priv = dev_get_drvdata(dev);

    clk_prepare_enable(priv->clk);
    writel(priv->saved_ctrl, priv->base + CTRL_REG);
    enable_irq(priv->irq);
    return 0;
}

static const struct dev_pm_ops mychip_pm_ops = {
    SET_SYSTEM_SLEEP_PM_OPS(mychip_suspend, mychip_resume)
};

static struct platform_driver mychip_driver = {
    .driver = {
        .name = "mychip",
        .of_match_table = mychip_of_match,
        .pm = &mychip_pm_ops,
    },
    /* ... */
};
```

`SET_SYSTEM_SLEEP_PM_OPS`는 `mem` suspend/resume용입니다. runtime PM은 별도의 매크로입니다.

## Runtime PM — 디바이스별 dynamic suspend

디바이스를 사용하지 않을 때 *자동으로* 클럭/전원을 끕니다. 사용자가 명시하지 않아도 됩니다.

```c
/* 디바이스 사용 직전 */
pm_runtime_get_sync(dev);    /* resume까지 동기 대기 */
/* 또는 */
pm_runtime_get(dev);         /* 비동기 */

/* I/O 수행 */
readl(base + DATA_REG);

/* 사용 끝 */
pm_runtime_put(dev);         /* idle 카운트 감소 */
/* 또는 */
pm_runtime_put_autosuspend(dev);  /* delay 후 suspend */
```

runtime PM 활성:

```c
static int mychip_probe(struct platform_device *pdev)
{
    /* ... */
    pm_runtime_set_autosuspend_delay(&pdev->dev, 100);   /* 100 ms idle 후 suspend */
    pm_runtime_use_autosuspend(&pdev->dev);
    pm_runtime_enable(&pdev->dev);
    return 0;
}

static const struct dev_pm_ops mychip_pm_ops = {
    SET_SYSTEM_SLEEP_PM_OPS(mychip_suspend, mychip_resume)
    SET_RUNTIME_PM_OPS(mychip_runtime_suspend,
                        mychip_runtime_resume, NULL)
};
```

확인:

```bash
$ cat /sys/devices/.../power/runtime_status
active   # 또는 suspended
$ cat /sys/devices/.../power/runtime_active_time
1234567
$ cat /sys/devices/.../power/runtime_suspended_time
8765432
```

active/suspended 시간 비율로 절전 효과를 측정합니다.

## cpuidle — CPU 짧은 휴식

CPU가 idle 상태에 진입하면 다양한 깊이의 C-state를 선택할 수 있습니다.

```text
C0  active
C1  WFI (wait for interrupt) — 빠른 진입/탈출, 클럭 gating
C2  power gating — 더 깊지만 wakeup latency 증가
C3+ 도메인 전체 OFF — 가장 큰 절전, 가장 긴 wakeup
```

ARM Cortex-A 시리즈에서는 PSCI의 `CPU_SUSPEND` SMC가 깊은 C-state 진입을 처리합니다.

```bash
$ ls /sys/devices/system/cpu/cpu0/cpuidle/
state0  state1  state2

$ cat /sys/devices/system/cpu/cpu0/cpuidle/state1/name
WFI
$ cat /sys/devices/system/cpu/cpu0/cpuidle/state1/latency
1
$ cat /sys/devices/system/cpu/cpu0/cpuidle/state1/residency
1
$ cat /sys/devices/system/cpu/cpu0/cpuidle/state1/usage
123456

$ cat /sys/devices/system/cpu/cpu0/cpuidle/state2/name
deep-idle
$ cat /sys/devices/system/cpu/cpu0/cpuidle/state2/latency
2000
$ cat /sys/devices/system/cpu/cpu0/cpuidle/state2/residency
5000
```

DT의 idle-states:

```text
cpus {
    idle-states {
        cpu_sleep: cpu-sleep {
            compatible = "arm,idle-state";
            arm,psci-suspend-param = <0x00010000>;
            entry-latency-us = <1000>;
            exit-latency-us = <1000>;
            min-residency-us = <5000>;
        };
    };

    cpu@0 {
        /* ... */
        cpu-idle-states = <&cpu_sleep>;
    };
};
```

governor는 보통 `menu`(idle 시간 예측 기반) 또는 `teo`(timer event 기반).

```bash
$ cat /sys/devices/system/cpu/cpuidle/current_governor
menu
```

## cpufreq — DVFS (Dynamic Voltage/Frequency Scaling)

CPU 부하에 따라 frequency·voltage를 조정합니다. 전력 절감의 가장 큰 축입니다.

```bash
$ ls /sys/devices/system/cpu/cpu0/cpufreq/
scaling_governor  scaling_available_frequencies  scaling_cur_freq  ...

$ cat scaling_available_governors
conservative ondemand userspace powersave performance schedutil

$ cat scaling_available_frequencies
1200000 1416000 1608000 1800000

$ cat scaling_cur_freq
1416000
```

governor 선택:

| governor | 동작 |
|----------|------|
| `performance` | 항상 최고 주파수 |
| `powersave` | 항상 최저 주파수 |
| `ondemand` | 부하에 따라 빠른 ramp up/down (legacy) |
| `conservative` | 천천히 ramp |
| `schedutil` | 스케줄러 신호 기반 (최신 권장) |
| `userspace` | 사용자가 직접 설정 |

설정:

```bash
echo schedutil > /sys/devices/system/cpu/cpu0/cpufreq/scaling_governor
echo 1200000 > /sys/devices/system/cpu/cpu0/cpufreq/scaling_max_freq
```

### OPP table

DT에 *주파수와 전압의 쌍*을 미리 적습니다.

```text
cpu0_opp_table: opp-table {
    compatible = "operating-points-v2";
    opp-shared;

    opp-1200000000 {
        opp-hz = /bits/ 64 <1200000000>;
        opp-microvolt = <850000>;
        clock-latency-ns = <150000>;
    };

    opp-1416000000 {
        opp-hz = /bits/ 64 <1416000000>;
        opp-microvolt = <900000>;
        clock-latency-ns = <150000>;
    };

    opp-1800000000 {
        opp-hz = /bits/ 64 <1800000000>;
        opp-microvolt = <1000000>;
        clock-latency-ns = <150000>;
        turbo-mode;
    };
};

&cpu0 {
    operating-points-v2 = <&cpu0_opp_table>;
    cpu-supply = <&buck1_reg>;
};
```

cpufreq가 frequency를 바꾸면 regulator가 voltage도 같이 바꿉니다. `cpu-supply`가 그 연결입니다.

## regulator framework

PMIC의 buck·LDO·switch를 모델링합니다.

```text
&i2c2 {
    pmic@25 {
        compatible = "nxp,pca9450";
        reg = <0x25>;

        regulators {
            buck1_reg: BUCK1 {
                regulator-name = "VDD_SOC";
                regulator-min-microvolt = <600000>;
                regulator-max-microvolt = <2187500>;
                regulator-boot-on;
                regulator-always-on;
            };

            buck2_reg: BUCK2 {
                regulator-name = "VDD_ARM";
                regulator-min-microvolt = <600000>;
                regulator-max-microvolt = <2187500>;
                regulator-boot-on;
                regulator-always-on;
                regulator-ramp-delay = <3125>;
            };

            ldo3_reg: LDO3 {
                regulator-name = "VDD_3V3";
                regulator-min-microvolt = <3300000>;
                regulator-max-microvolt = <3300000>;
                regulator-boot-on;
            };
        };
    };
};
```

| property | 의미 |
|----------|------|
| `regulator-boot-on` | 부팅 시 이미 켜져 있음 |
| `regulator-always-on` | 절대 OFF 안 함 |
| `regulator-min/max-microvolt` | 허용 범위 |
| `regulator-ramp-delay` | 전압 변경 시 ramp 속도 |

확인:

```bash
$ cat /sys/kernel/debug/regulator/regulator_summary
 regulator               use open bypass voltage current     min     max
--------------------------------------------------------------------------
 VDD_SOC                    1    1     0   850mV     0mV   600mV  2187mV
    cpu0                            850mV     0mV   600mV  2187mV
 VDD_3V3                    1    1     0  3300mV     0mV  3300mV  3300mV
    eeprom@50                      3300mV     0mV  3300mV  3300mV
```

## 양산에서의 측정과 튜닝

PM 동작이 *실제로* 절감으로 이어지는지는 측정해야 합니다.

```bash
# 시스템 절전 통계
$ cat /sys/power/suspend_stats/success
123
$ cat /sys/power/suspend_stats/fail
2

# 어느 도메인이 켜져 있는지
$ cat /sys/kernel/debug/clk/clk_summary
$ cat /sys/kernel/debug/pm_genpd/pm_genpd_summary

# CPU idle 통계
$ cat /sys/devices/system/cpu/cpu0/cpuidle/state2/usage
$ cat /sys/devices/system/cpu/cpu0/cpuidle/state2/time
```

전류계로 보드 입력 전류를 측정하면서 다음을 비교합니다.

| 상태 | 기대 전류 (i.MX8M Mini, 5V) |
|------|----------------------------|
| 부팅 직후 idle | 250 mA |
| `mem` suspend | 5~10 mA |
| 전체 도메인 OFF | <1 mA |

목표치 대비 차이가 크면 어떤 regulator가 켜져 있는지 다시 확인합니다.

## 흔한 실수

- **regulator-always-on 남발**: 부팅 시 켜진 채로 두면 PM이 무력화됩니다. 정말 항상 필요한 도메인에만 씁니다.
- **runtime PM 미사용**: 디바이스 드라이버가 `pm_runtime_*`를 호출 안 하면 의존 regulator도 disable 안 됩니다.
- **wakeup source 미설정**: suspend는 되는데 wakeup이 안 되어 reboot 필요.
- **OPP table 누락**: cpufreq governor를 schedutil로 두어도 OPP가 없으면 한 단계 freq만 사용.
- **suspend ops에 sleep 호출**: suspend callback은 atomic 컨텍스트의 영향을 받습니다. msleep은 OK지만 mutex 잡고 오래 기다리면 timeout.
- **clk_disable 누락**: suspend에서 clock을 안 끄면 도메인 OFF가 안 됩니다.

## 정리

- Linux PM은 system sleep, runtime PM, cpuidle, cpufreq의 4개 축으로 구성됩니다.
- system sleep의 `mem`은 임베디드에서 가장 흔한 절전 상태이며, wakeup source 명시가 필수입니다.
- runtime PM은 디바이스를 *사용 안 할 때* 자동으로 끄며, `pm_runtime_get/put`으로 제어합니다.
- cpuidle은 짧은 idle 동안 C-state로 진입하며, ARM은 PSCI의 `CPU_SUSPEND`로 처리합니다.
- cpufreq는 부하에 따라 DVFS를 수행하며, OPP table이 frequency-voltage 쌍을 정의합니다.
- regulator framework가 PMIC의 buck/LDO를 모델링하고 디바이스 노드가 `*-supply`로 의존성을 표현합니다.
- 절전 효과는 입력 전류 측정과 `regulator_summary`로 검증합니다.
- `regulator-always-on`과 `pm_runtime` 미사용이 가장 흔한 PM 누수 원인입니다.

## 다음 편 예고

[Ch 14: Thermal과 watchdog](/blog/embedded/bsp/chapter14-thermal-watchdog)에서는 thermal zone, trip point, cooling device, hardware watchdog 통합을 살펴봅니다.

## 관련 항목

- [Ch 9: Multi-core SMP bring-up](/blog/embedded/bsp/chapter09-smp-bringup) — cpuidle의 기반
- [Ch 12: 드라이버 추가](/blog/embedded/bsp/chapter12-driver-add) — regulator binding
- [Ch 14: Thermal과 watchdog](/blog/embedded/bsp/chapter14-thermal-watchdog)
- [Embedded Performance Engineering](/blog/embedded/performance-engineering/) — DVFS와 성능 트레이드오프
- [Modern Embedded Recipes](/blog/embedded/modern-recipes/) — 양산 절전 측정
