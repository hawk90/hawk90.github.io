---
title: "BSP Power Management — Suspend/Resume·Runtime PM·Regulator"
slug: "embedded/bsp/chapter13-power-management"
date: 2026-05-18T09:13:00
description: "BSP의 전력 관리 — suspend-to-RAM, runtime PM, regulator framework, CPU idle/freq를 정리합니다."
series: "BSP Development"
seriesOrder: 13
tags: [embedded, bsp, power-management, pm, runtime-pm]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

**Linux 전력 관리는 system sleep, runtime PM, cpuidle, cpufreq 네 축으로 나뉩니다.** 각 축은 DT와 드라이버에 무엇이 적혀 있느냐에 따라 켜지기도 하고 아예 없기도 합니다.

이 글은 두 자료를 나란히 봅니다. 하나는 Linux v6.12의 i.MX 8M Plus/Mini DT에 실제로 적힌 PM 관련 노드이고, 다른 하나는 Debian 13 QEMU guest(커널 6.12.116, DT 부팅)에서 읽은 sysfs입니다. guest는 PM 하드웨어가 거의 없는 가상 머신이라, "무엇이 없으면 sysfs가 어떻게 보이는가"를 보여 주는 반례로 씁니다. 실제 보드의 전류 측정은 하지 않았습니다.

## 4개의 PM 축

| 축 | 동작 | 주 인터페이스 |
|----|------|--------------|
| **System sleep** (suspend-to-RAM / disk) | 사용자 명시, 전체 시스템 정지 | `echo mem > /sys/power/state` |
| **Runtime PM** | 디바이스별 dynamic suspend. 사용 안 하면 자동 OFF | `pm_runtime_get` / `pm_runtime_put` |
| **cpuidle** | CPU의 짧은 idle 진입, C-state 진입·탈출 | `/sys/devices/system/cpu/cpu*/cpuidle/` |
| **cpufreq** | 동작 중 CPU의 frequency·voltage 조정 (DVFS) | `/sys/devices/system/cpu/cpu*/cpufreq/` |

네 축은 별도 framework지만 같은 clock·regulator와 firmware(PSCI)를 공유합니다. 예를 들어 cpufreq가 바꾸는 CPU 전압 레일은 아래의 PMIC regulator이고, cpuidle과 system suspend는 둘 다 PSCI를 거칩니다.

## System sleep — suspend states

어떤 sleep 상태를 쓸 수 있는지는 sysfs 두 파일이 알려 줍니다. guest의 결과입니다.

```text
$ cat /sys/power/state
freeze mem disk
$ cat /sys/power/mem_sleep
[s2idle]
```

`state`에 `mem`이 있어도 그것이 suspend-to-RAM이라는 뜻은 아닙니다. `Documentation/admin-guide/pm/sleep-states.rst:177-192`에 따르면 `mem`이 어떤 변형에 연결되는지는 `mem_sleep`이 정하고, 후보는 `s2idle`(suspend-to-idle), `shallow`(standby), `deep`(suspend-to-RAM)입니다. 대괄호가 현재 선택입니다. 이 guest에는 `s2idle`만 있으므로 `echo mem > /sys/power/state`는 suspend-to-idle이 됩니다. 실제 보드에서 `deep`이 보이려면 firmware가 시스템 suspend를 제공해야 하고(arm64라면 PSCI `SYSTEM_SUSPEND`), 그 경로는 Ch 7의 TF-A BL31입니다.

이 글은 guest에서 suspend를 실행하지 않았습니다. 같은 guest에서 CPU hotplug만으로도 커널 panic이 났기 때문입니다(Ch 9). 그래서 suspend·resume 로그와 복귀 시간은 싣지 않습니다.

### wakeup source

suspend 상태에서 어떤 이벤트가 깨우는지 명시해야 합니다.

guest에서 읽은 결과입니다.

```text
$ head -5 /sys/kernel/debug/wakeup_sources
name		active_count	event_count	wakeup_count	expire_count	active_since	total_time	max_time	last_change	prevent_suspend_time
alarmtimer.0.auto	0		0		0		0		0		0		0		0		0
rtc-efi.0   	3		3		0		0		0		0		0		1351622		0
deleted     	0		0		0		0		0		0		0		0		0
$ cat /sys/class/rtc/rtc0/device/power/wakeup
enabled
```

장치마다 `power/wakeup` 파일에 `enabled`를 쓰면 그 장치가 깨울 수 있게 됩니다.

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

Ch 12의 골격에 system sleep 콜백을 더하면 다음과 같습니다.

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

static DEFINE_SIMPLE_DEV_PM_OPS(mychip_pm_ops, mychip_suspend, mychip_resume);

static struct platform_driver mychip_driver = {
    .driver = {
        .name = "mychip",
        .of_match_table = mychip_of_match,
        .pm = pm_sleep_ptr(&mychip_pm_ops),
    },
    /* ... */
};
```

`DEFINE_SIMPLE_DEV_PM_OPS`(`include/linux/pm.h:418`)는 system sleep 콜백만 채운 `dev_pm_ops`를 만듭니다. 같은 헤더에는 예전 매크로 `SET_SYSTEM_SLEEP_PM_OPS`(342행)도 남아 있지만, 이 매크로는 `CONFIG_PM_SLEEP`이 꺼지면 빈 매크로가 되어(345행) 콜백 함수가 쓰이지 않는 함수로 남습니다. 새 매크로와 `pm_sleep_ptr()`는 함수를 그대로 컴파일러에 보여 주고 포인터만 없애는 방식입니다.

## Runtime PM — 디바이스별 dynamic suspend

디바이스를 사용하지 않을 때 드라이버가 클럭·전원을 끄도록 하는 장치입니다. 빈 회의실의 불을 자동으로 끄는 센서처럼, 사용 카운트가 0이 되면 suspend 콜백이 불립니다.

```c
/* 디바이스 사용 직전 */
pm_runtime_get_sync(dev);    /* resume까지 동기 대기 */
/* 또는 */
pm_runtime_get(dev);         /* usage count 증가, resume은 비동기 요청 (include/linux/pm_runtime.h:388) */

/* 필요한 경우 resume 완료를 확인한 뒤 I/O 수행 */
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

장치마다 `power/runtime_status`와 `power/control`이 있습니다. guest의 PL011 UART는 다음과 같았습니다.

```text
$ cat /sys/bus/amba/devices/9000000.pl011/power/runtime_status
active
$ cat /sys/bus/amba/devices/9000000.pl011/power/control
auto
```

`Documentation/ABI/testing/sysfs-devices-power:35-46`에 따르면 `control`이 `auto`일 때 runtime PM이 장치를 관리하고, `on`이면 runtime PM을 막습니다. 같은 디렉터리의 `runtime_active_time`과 `runtime_suspended_time`으로 얼마나 잤는지 봅니다. 실제 전력 절감은 rail 전류로만 확인됩니다.

## cpuidle — CPU 짧은 휴식

CPU가 할 일이 없을 때 어느 깊이로 쉴지 고르는 축입니다. arm64에서 idle state 목록은 DT의 `idle-states` 노드에서 오고, 깊은 상태 진입은 PSCI `CPU_SUSPEND`가 처리합니다.

Linux v6.12에서 i.MX 8M Mini의 `imx8mm.dtsi:48-58`에는 idle state가 하나 있습니다.

```c
idle-states {
	entry-method = "psci";

	cpu_pd_wait: cpu-pd-wait {
		compatible = "arm,idle-state";
		arm,psci-suspend-param = <0x0010033>;
		local-timer-stop;
		entry-latency-us = <1000>;
		exit-latency-us = <700>;
		min-residency-us = <2700>;
	};
};
```

각 CPU 노드는 `cpu-idle-states = <&cpu_pd_wait>;`로 이것을 가리킵니다(78, 97행 등). 반면 `imx8mp.dtsi`에는 `idle-states`가 한 번도 나오지 않습니다. 같은 i.MX 8M 계열이어도 v6.12의 8M Plus DT로는 WFI 외의 cpuidle 상태가 생기지 않는다는 뜻입니다.

DT에 idle state가 없으면 sysfs가 어떻게 보이는지는 QEMU guest가 보여 줍니다.

```text
$ ls /sys/devices/system/cpu/cpu0/cpuidle
ls: cannot access '/sys/devices/system/cpu/cpu0/cpuidle': No such file or directory
$ cat /sys/devices/system/cpu/cpuidle/current_driver
none
$ cat /sys/devices/system/cpu/cpuidle/current_governor
menu
```

커널에는 `CONFIG_CPU_IDLE=y`, `CONFIG_ARM_PSCI_CPUIDLE=y`가 켜져 있지만(guest의 `/boot/config-6.12.116+deb13-arm64`), DT에 상태가 없으니 driver가 `none`입니다. 커널 설정만으로는 cpuidle이 생기지 않습니다.

## cpufreq — DVFS (Dynamic Voltage/Frequency Scaling)

CPU 부하에 따라 frequency와 voltage를 함께 바꾸는 축(DVFS)입니다. 쓸 수 있는 주파수 목록은 DT의 OPP table에서 옵니다.

guest에는 OPP table이 없어 `/sys/devices/system/cpu/cpu0/cpufreq` 디렉터리가 아예 없었습니다(`CONFIG_CPU_FREQ=y`인데도). 실제 보드에서는 이 디렉터리에 `scaling_governor`, `scaling_available_frequencies`, `scaling_cur_freq` 같은 파일이 생깁니다. governor 이름과 동작은 `Documentation/admin-guide/pm/cpufreq.rst`의 "Generic Scaling Governors" 절에 있습니다.

### OPP table

DT에 *주파수와 전압의 쌍*을 적습니다. Linux v6.12 `imx8mp.dtsi:134-163`의 실제 표입니다.

```c
a53_opp_table: opp-table {
	compatible = "operating-points-v2";
	opp-shared;

	opp-1200000000 {
		opp-hz = /bits/ 64 <1200000000>;
		opp-microvolt = <850000>;
		opp-supported-hw = <0x8a0>, <0x7>;
		clock-latency-ns = <150000>;
		opp-suspend;
	};

	opp-1600000000 {
		opp-hz = /bits/ 64 <1600000000>;
		opp-microvolt = <950000>;
		opp-supported-hw = <0xa0>, <0x7>;
		...
	};

	opp-1800000000 {
		opp-hz = /bits/ 64 <1800000000>;
		opp-microvolt = <1000000>;
		opp-supported-hw = <0x20>, <0x3>;
		...
	};
};
```

`opp-supported-hw`는 칩의 fuse 값과 비교되는 마스크입니다. `drivers/cpufreq/imx-cpufreq-dt.c`가 OCOTP의 speed grade와 market segment 필드(22~28행)를 읽어 이 마스크와 맞추므로, 같은 표를 써도 칩에 따라 1.8 GHz 항목이 빠집니다. CPU 노드는 `operating-points-v2 = <&a53_opp_table>;`로 이 표를 가리키고(`imx8mp.dtsi:66` 등), EVK는 `cpu-supply = <&reg_arm>;`으로 전압 레일을 연결합니다(`imx8mp-evk.dts:275` 등). cpufreq가 주파수를 바꿀 때 이 regulator로 `opp-microvolt`의 전압도 맞춥니다.

## regulator framework

PMIC의 buck·LDO를 모델링합니다. 위의 `reg_arm`은 EVK의 PCA9450C BUCK2입니다(`imx8mp-evk.dts:460-478`).

```c
BUCK1 {
	regulator-name = "BUCK1";
	regulator-min-microvolt = <720000>;
	regulator-max-microvolt = <1000000>;
	regulator-boot-on;
	regulator-always-on;
	regulator-ramp-delay = <3125>;
};

reg_arm: BUCK2 {
	regulator-name = "BUCK2";
	regulator-min-microvolt = <720000>;
	regulator-max-microvolt = <1025000>;
	regulator-boot-on;
	regulator-always-on;
	regulator-ramp-delay = <3125>;
	nxp,dvs-run-voltage = <950000>;
	nxp,dvs-standby-voltage = <850000>;
};
```

BUCK2의 허용 범위 720~1025 mV가 OPP 표의 850~1000 mV를 감쌉니다. 범위가 표보다 좁으면 그 OPP는 쓸 수 없습니다.

| property | 의미 |
|----------|------|
| `regulator-boot-on` | 부팅 시 이미 켜져 있음 |
| `regulator-always-on` | 절대 OFF 안 함 |
| `regulator-min/max-microvolt` | 허용 범위 |
| `regulator-ramp-delay` | 전압 변경 속도(µV/µs, `regulator.yaml:58-59`) |

속성 정의는 `Documentation/devicetree/bindings/regulator/regulator.yaml`에 있습니다. 런타임 상태는 Ch 12에서 본 `/sys/kernel/debug/regulator/regulator_summary`로 확인합니다.

## 양산에서의 측정과 튜닝

PM 동작이 실제로 절감으로 이어지는지는 보드 입력 전류로만 확인됩니다. 소프트웨어 쪽에서 볼 곳은 다음과 같습니다.

| 질문 | 파일 |
|------|------|
| suspend가 몇 번 성공·실패했나 | `/sys/power/suspend_stats/success`, `fail` (guest는 둘 다 0) |
| 어느 클록이 켜져 있나 | `/sys/kernel/debug/clk/clk_summary` (Ch 4) |
| 어느 전원 도메인이 켜져 있나 | `/sys/kernel/debug/pm_genpd/pm_genpd_summary` (`drivers/pmdomain/core.c:3549`) |
| CPU가 어느 idle state를 얼마나 썼나 | `/sys/devices/system/cpu/cpuN/cpuidle/stateM/usage`, `time` |

이 글은 실제 보드의 전류를 재지 않았으므로 상태별 전류 기대치는 싣지 않습니다.

## 흔한 실수

- **regulator-always-on 남발**: binding의 정의는 "regulator should never be disabled"입니다(`regulator.yaml:37-38`). EVK도 BUCK1·BUCK2에만 씁니다.
- **runtime PM 미사용**: 드라이버가 `pm_runtime_*`를 부르지 않으면 장치가 runtime suspend에 들어가지 않습니다.
- **wakeup source 미설정**: `power/wakeup`이 `disabled`인 장치는 시스템을 깨우지 못합니다.
- **OPP table 누락**: guest처럼 `cpufreq` 디렉터리 자체가 생기지 않습니다.
- **idle state 누락**: guest처럼 cpuidle driver가 `none`입니다. v6.12 `imx8mp.dtsi`에도 `idle-states`가 없습니다.
- **`mem`을 곧 suspend-to-RAM으로 가정**: `mem_sleep`에 `deep`이 없으면 `mem`은 s2idle입니다.

## 정리

- Linux PM은 system sleep, runtime PM, cpuidle, cpufreq의 네 축입니다.
- `mem`이 실제로 무엇인지는 `/sys/power/mem_sleep`이 정합니다. QEMU guest는 `[s2idle]`뿐이었습니다.
- 드라이버 sleep 콜백은 `DEFINE_SIMPLE_DEV_PM_OPS`와 `pm_sleep_ptr()`로 등록합니다.
- cpuidle 상태는 DT `idle-states`에서 옵니다. v6.12에서 i.MX 8M Mini에는 있고 8M Plus에는 없습니다.
- cpufreq는 OPP table이 있어야 생깁니다. i.MX 8M Plus는 1.2/1.6/1.8 GHz에 850/950/1000 mV이고, 칩의 speed grade로 항목이 걸러집니다.
- `cpu-supply`가 가리키는 regulator(EVK의 BUCK2, 720~1025 mV)가 OPP 전압을 감싸야 합니다.
- 절전 효과는 보드 입력 전류로만 확인됩니다.

## 다음 편 예고

[Ch 14: Thermal과 watchdog](/blog/embedded/bsp/chapter14-thermal-watchdog)에서는 thermal zone, trip point, cooling device, hardware watchdog 통합을 살펴봅니다.

## 관련 항목

- [Ch 9: Multi-core SMP bring-up](/blog/embedded/bsp/chapter09-smp-bringup) — cpuidle의 기반
- [Ch 12: 드라이버 추가](/blog/embedded/bsp/chapter12-driver-add) — regulator binding
- [Ch 14: Thermal과 watchdog](/blog/embedded/bsp/chapter14-thermal-watchdog)
- [Embedded Performance Engineering](/blog/embedded/performance-engineering/00-preface) — DVFS와 성능 트레이드오프
- [Modern Embedded Recipes](/blog/embedded/modern-recipes/00-preface) — 양산 절전 측정
