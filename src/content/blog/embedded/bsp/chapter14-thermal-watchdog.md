---
title: "BSP Thermal과 Watchdog — Trip Point·Cooling Device·Hardware Reset"
slug: "embedded/bsp/chapter14-thermal-watchdog"
date: 2026-05-18T09:14:00
description: "보드 안전 장치를 정리합니다. thermal zone과 trip point, hardware watchdog 통합을 살펴봅니다."
series: "BSP Development"
seriesOrder: 14
tags: [embedded, bsp, thermal, watchdog, safety]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

**Thermal과 watchdog은 *최후의 안전망*입니다.** 칩이 너무 뜨거워지거나 software가 멈췄을 때, 사람이 없어도 시스템을 보호합니다. 온도 조절기와 데드맨 스위치(손을 떼면 기차가 멈추는 장치)에 해당합니다.

이 글의 thermal 부분은 Linux v6.12의 i.MX 8M Plus DT와 드라이버 소스로 설명합니다. QEMU guest에는 thermal zone이 없어 온도 측정은 하지 않았습니다. watchdog 부분은 QEMU의 i6300ESB 가상 watchdog을 붙인 Debian 13 guest에서 실제로 keepalive를 멈춰 시스템이 꺼지는 것까지 확인했습니다.

## Thermal framework 구조

![Thermal framework — Sensor → Thermal zone → Trip point → Cooling device](/images/blog/bsp/diagrams/chapter14-thermal-flow.svg)

## DT의 thermal-zones

Linux v6.12 `imx8mp.dtsi:282-311`의 CPU zone입니다. 같은 파일에 `soc-thermal` zone(`&tmu 1`)이 하나 더 있습니다.

```c
thermal-zones {
	cpu-thermal {
		polling-delay-passive = <250>;
		polling-delay = <2000>;
		thermal-sensors = <&tmu 0>;
		trips {
			cpu_alert0: trip0 {
				temperature = <85000>;
				hysteresis = <2000>;
				type = "passive";
			};

			cpu_crit0: trip1 {
				temperature = <95000>;
				hysteresis = <2000>;
				type = "critical";
			};
		};

		cooling-maps {
			map0 {
				trip = <&cpu_alert0>;
				cooling-device =
					<&A53_0 THERMAL_NO_LIMIT THERMAL_NO_LIMIT>,
					<&A53_1 THERMAL_NO_LIMIT THERMAL_NO_LIMIT>,
					<&A53_2 THERMAL_NO_LIMIT THERMAL_NO_LIMIT>,
					<&A53_3 THERMAL_NO_LIMIT THERMAL_NO_LIMIT>;
			};
		};
	};
	...
};
```

85 °C에서 CPU 4개를 cooling device로 써서 주파수를 낮추고(passive), 95 °C에서 시스템을 끕니다(critical). passive가 동작하려면 Ch 13의 OPP table이 있어야 합니다. CPU cooling device는 cpufreq 주파수 단계를 cooling state로 쓰고, 가장 높은 state가 가장 낮은 주파수입니다(`drivers/thermal/cpufreq_cooling.c:29-34`).

trip type 네 가지는 `drivers/thermal/thermal_of.c:28-31`의 문자열 표(`active`, `passive`, `hot`, `critical`)에 있습니다.

| trip type | 동작 |
|-----------|------|
| `active` | fan 같은 능동 냉각 가동 |
| `passive` | CPU throttling (DVFS down) |
| `hot` | zone 드라이버의 `hot` 콜백 호출 |
| `critical` | 시스템 정지 |

critical에 도달하면 `thermal_zone_device_halt()`(`drivers/thermal/thermal_core.c:385-400`)가 `"%s: critical temperature reached"`를 찍고 `hw_protection_shutdown("Temperature too high", poweroff_delay_ms)`을 부릅니다. 지연값은 `CONFIG_THERMAL_EMERGENCY_POWEROFF_DELAY_MS`이고, 정상 종료가 그 시간 안에 끝나지 않으면 강제 전원 차단으로 넘어갑니다.

## 온도 등급과 trip 값

trip 값을 DT에 고정할지, 칩의 온도 등급에 따라 바꿀지는 드라이버가 정합니다. i.MX 8M Plus의 TMU는 `imx8mm_thermal.c`가 맡고, 이 드라이버는 DT의 85/95 °C를 그대로 씁니다. 반면 i.MX6/7의 `drivers/thermal/imx_thermal.c`는 fuse에서 온도 등급을 읽어 trip을 계산합니다(421~450행).

| fuse 등급 (`imx_thermal.c`) | `temp_max` | passive (`max - 10 °C`) | critical (`max - 5 °C`) |
|------|------|------|------|
| Commercial | 95 °C | 85 °C | 90 °C |
| Extended Commercial | 105 °C | 95 °C | 100 °C |
| Industrial | 105 °C | 95 °C | 100 °C |
| Automotive | 125 °C | 115 °C | 120 °C |

이 드라이버는 부팅 때 `"%s CPU temperature grade - max:%dC critical:%dC passive:%dC"`를 찍습니다(696~698행). i.MX 8M Plus 제품을 산업용 등급 칩으로 만든다면, DT의 95 °C critical이 그 칩의 등급에 맞는지 datasheet의 동작 온도와 대조해 보드 dts에서 덮어씁니다. 이 글은 i.MX 8M Plus datasheet의 등급별 온도를 인용하지 않았으므로 값을 제시하지 않습니다.

## 동작 확인

sysfs에서는 `/sys/class/thermal/thermal_zoneN/`에 `type`, `temp`(밀리도), `trip_point_M_temp`, `trip_point_M_type`이 있고, `/sys/class/thermal/cooling_deviceN/`에 `type`, `cur_state`, `max_state`가 있습니다. 이 글의 QEMU guest에서는 `/sys/class/thermal/` 아래가 비어 있었습니다(Ch 5). 실제 보드의 값은 싣지 않습니다.

## Thermal governor

| governor | 알고리즘 |
|----------|----------|
| `step_wise` | 한 단계씩 throttle/release |
| `fair_share` | 여러 cooling device에 분배 |
| `bang_bang` | hysteresis 기반 ON/OFF |
| `user_space` | userspace daemon이 정책 결정 |
| `power_allocator` | power budget 기반 (PID 제어) |

기본 governor는 Kconfig의 choice로 정하고, 그 기본값은 `THERMAL_DEFAULT_GOV_STEP_WISE`입니다(`drivers/thermal/Kconfig:97`). DT binding(`thermal/thermal-zones.yaml`)에는 governor를 고르는 속성이 없습니다. `power_allocator`가 쓰는 `sustainable-power`만 zone 속성으로 있습니다(118행). 런타임에는 `/sys/class/thermal/thermal_zoneN/policy`에 governor 이름을 써서 바꾸고, 고를 수 있는 목록은 같은 디렉터리의 `available_policies`에 있습니다(`Documentation/driver-api/thermal/sysfs-api.rst:289`).

## 외부 sensor와 cooling device

칩 내부 sensor만으로 부족하면 외부 온도 센서와 fan을 추가합니다. 아래의 `ti,tmp103`은 `drivers/hwmon/tmp103.c:206`의 OF compatible이고, `pwm-fan`의 `cooling-levels`는 `hwmon/pwm-fan.yaml:17`의 속성입니다.

```text
/* i2c thermistor */
&i2c1 {
    tmp103@70 {
        compatible = "ti,tmp103";
        reg = <0x70>;
        #thermal-sensor-cells = <0>;
    };
};

/* PWM output for fan control */
fan0: pwm-fan {
    compatible = "pwm-fan";
    pwms = <&pwm1 0 40000 0>;
    cooling-levels = <0 102 170 255>;  /* PWM duty */
    #cooling-cells = <2>;
};

thermal-zones {
    case-thermal {
        polling-delay-passive = <1000>;
        polling-delay = <5000>;
        thermal-sensors = <&tmp103>;

        trips {
            case_active: trip0 {
                temperature = <60000>;
                hysteresis = <2000>;
                type = "active";
            };
        };

        cooling-maps {
            map0 {
                trip = <&case_active>;
                cooling-device = <&fan0 0 3>;  /* fan level 0~3 */
            };
        };
    };
};
```

## hwmon 통합

thermal sensor는 hwmon 장치로도 노출되어 `lm-sensors` 패키지의 `sensors` 명령으로 읽힙니다. 이 글에서는 센서가 있는 보드에서 실행하지 않았으므로 출력은 싣지 않습니다.

## Watchdog — 자기 reset 메커니즘

Watchdog은 *주기적으로 신호를 주지 않으면* 시스템을 reset하는 timer입니다. 열어서 timeout을 정하면 카운트다운이 시작되고, 프로그램이 timeout 안에 `WDIOC_KEEPALIVE`를 보낼 때마다 카운트다운이 처음으로 돌아갑니다. 프로그램이 멈춰 신호가 끊기면 timeout이 지나 시스템이 reset됩니다.

### /dev/watchdog 사용 — QEMU에서 실제로 해 보기

QEMU에 `-device i6300esb -action watchdog=poweroff`를 주면 guest에 Intel 6300ESB watchdog이 보이고, 그것이 만료되면 QEMU가 전원을 끕니다. Debian 13 guest의 부팅 로그와 sysfs입니다.

```text
[    0.629647] i6300ESB timer 0000:00:03.0: initialized. heartbeat=30 sec (nowayout=0)
$ cat /sys/class/watchdog/watchdog0/identity /sys/class/watchdog/watchdog0/timeout /sys/class/watchdog/watchdog0/state
i6300ESB timer
30
inactive
```

시험 프로그램은 timeout을 정하고, timeout의 절반마다 keepalive를 보내고, 마지막에 magic close(`'V'`)를 쓸지 고릅니다.

```c
int fd = open("/dev/watchdog", O_WRONLY);
ioctl(fd, WDIOC_SETTIMEOUT, &timeout);
ioctl(fd, WDIOC_GETTIMEOUT, &timeout);
for (int i = 0; i < n; i++) {
	sleep(timeout / 2);
	ioctl(fd, WDIOC_KEEPALIVE, 0);
}
if (magic)
	write(fd, "V", 1);
close(fd);
```

먼저 magic close를 쓰고 닫은 경우입니다. watchdog이 `inactive`로 돌아가고 시스템은 그대로입니다.

```text
$ ./wdt 10 2 1
timeout now 10 s
1794816122 keepalive 1
1794816127 keepalive 2
1794816127 closed (magic=1)
$ cat /sys/class/watchdog/watchdog0/state
inactive
```

다음은 `'V'` 없이 닫은 경우입니다. 커널은 `watchdog: watchdog0: watchdog did not stop!`을 찍고(`drivers/watchdog/watchdog_dev.c:968`) watchdog을 켠 채로 둡니다.

```text
$ ./wdt 10 1 0
timeout now 10 s
1794816142 keepalive 1
1794816142 closed (magic=0)
$ cat /sys/class/watchdog/watchdog0/state
active
[  134.523166] watchdog: watchdog0: watchdog did not stop!
```

guest에서 2초마다 찍던 시각이 1794816152에서 끊겼고, 바로 그때 ssh 연결이 끊기고 QEMU 프로세스가 종료됐습니다. 마지막 keepalive에서 10초, 설정한 timeout과 같습니다. `Documentation/watchdog/watchdog-api.rst:62-66`의 Magic Close 절이 이 동작을 설명합니다. magic close를 지원하는 드라이버는 `'V'`를 받기 전에는 close해도 watchdog을 끄지 않습니다. 감시 프로그램이 죽어서 fd가 닫힌 경우와 정상 종료를 구분하기 위한 장치입니다.

### systemd watchdog 통합

systemd가 PID 1로서 watchdog을 직접 잡아 줍니다.

```ini
# /etc/systemd/system.conf
[Manager]
RuntimeWatchdogSec=30
RebootWatchdogSec=10min
```

```ini
# 서비스 unit 파일
[Service]
WatchdogSec=10s
```

Debian 13의 `systemd-system.conf(5)`는 `RuntimeWatchdogSec=`가 0이 아니면 하드웨어 watchdog을 그 timeout으로 설정하고, systemd가 "at least once in half the specified timeout interval" 신호를 보낸다고 적습니다. 위 guest의 기본값은 `systemctl show`로 `RuntimeWatchdogUSec=0`, `RebootWatchdogUSec=10min`이었습니다. 즉 Debian 기본 설정에서는 systemd가 런타임 watchdog을 잡지 않습니다. 서비스 단위의 `WatchdogSec`은 그 서비스가 `sd_notify`로 신호를 보내야 하는 주기입니다.

```c
#include <systemd/sd-daemon.h>

void worker_loop(void)
{
    while (1) {
        do_work();
        sd_notify(0, "WATCHDOG=1");   /* systemd에 신호 */
        usleep(5000000);
    }
}
```

서비스가 신호를 끊으면 systemd가 그 서비스를 처리하고(unit의 `Restart=` 설정에 따라), systemd 자체가 멈추면 하드웨어 watchdog이 reset합니다.

### DT binding

i.MX 8M Plus EVK의 watchdog 노드입니다(`imx8mp-evk.dts:794-799`). `timeout-sec`은 공통 binding `watchdog/watchdog.yaml:26`의 선택 속성이라 EVK처럼 생략하면 드라이버 기본값을 씁니다.

```c
&wdog1 {
	pinctrl-names = "default";
	pinctrl-0 = <&pinctrl_wdog>;
	fsl,ext-reset-output;
	status = "okay";
};
```

`fsl,ext-reset-output`(binding `watchdog/fsl-imx-wdt.yaml:51-54`)이 있으면 watchdog이 WDOG_B 신호를 내보내 외부 reset을 겁니다. Ch 7의 TF-A `imx_system_reset()`이 `IMX_WDOG_B_RESET`에 따라 `imx_wdog_restart(true/false)`를 고르던 것과 같은 배선 문제입니다.

### boot-time watchdog

부팅 도중의 hang도 watchdog으로 끊을 수 있습니다. U-Boot의 watchdog driver model은 장치를 켜고 U-Boot가 도는 동안 신호를 줍니다(U-Boot v2024.04 `drivers/watchdog/Kconfig:13-19`의 `WATCHDOG_AUTOSTART`, 기본값 y). 커널로 넘어간 뒤에는 커널 드라이버나 systemd가 이어받아야 합니다. 이어받는 쪽이 없으면 위 QEMU 시험처럼 timeout 뒤 reset됩니다. 이 글은 U-Boot에서 watchdog을 켜 보지 않았습니다.

## 측정과 검증

### thermal 스트레스 테스트

실제 보드에서는 `stress-ng --cpu $(nproc)`로 부하를 걸고 `thermal_zone0/temp`와 `cpufreq/scaling_cur_freq`를 함께 기록해, 85 °C passive trip에서 주파수가 내려가는지 봅니다. 이 글은 thermal zone이 없는 QEMU guest만 써서 이 시험을 하지 않았습니다.

### watchdog 동작 테스트

위 QEMU 시험이 그 절차입니다. `'V'` 없이 닫고 timeout만큼 기다리면 reset(QEMU에서는 설정에 따라 poweroff)이 나야 합니다.

재부팅 뒤 원인은 `/sys/class/watchdog/watchdog0/bootstatus`로 봅니다(`Documentation/ABI/testing/sysfs-class-watchdog`). i.MX의 `imx2_wdt` 드라이버는 reset 원인 레지스터(WRSR)의 timeout 비트가 서 있으면 `bootstatus`에 `WDIOF_CARDRESET`을 넣습니다(`drivers/watchdog/imx2_wdt.c:324`).

## 자주 하는 실수

- **critical trip 누락**: `thermal_zone_device_halt()`가 불릴 조건이 없어집니다.
- **DT의 thermal-zones 누락**: OF thermal 코드는 `thermal-zones` 노드를 찾아 zone을 만듭니다(`thermal_of.c:144`). 노드가 없으면 zone도 throttling도 없습니다.
- **cooling device map 누락**: 온도는 읽히지만 passive trip에서 할 일이 없습니다.
- **watchdog 드라이버 미선택**: `CONFIG_WATCHDOG=y`만으로는 장치가 생기지 않습니다. i.MX는 `CONFIG_IMX2_WDT`가 필요합니다.
- **systemd RuntimeWatchdogSec 미설정**: Debian 기본값은 0이라 systemd가 watchdog을 잡지 않습니다.
- **magic close 생략**: 감시 프로그램을 정상 종료할 때 `'V'`를 쓰지 않으면 위 시험처럼 timeout 뒤 reset됩니다.
- **`fsl,ext-reset-output` 누락**: 이 속성이 없으면 WDOG_B 핀으로 외부 reset이 나가지 않습니다. PMIC까지 reset해야 하는 보드라면 필요합니다.

## 정리

- Thermal framework는 sensor, zone, trip point, cooling device의 네 층입니다.
- i.MX 8M Plus(v6.12)는 CPU zone에 85 °C passive, 95 °C critical을 둡니다.
- critical은 `hw_protection_shutdown()`으로 이어집니다.
- i.MX6/7의 `imx_thermal.c`는 fuse 등급의 최대 온도에서 10 °C(passive), 5 °C(critical)를 뺍니다.
- 기본 governor는 Kconfig 기본값 `step_wise`이고, DT로는 governor를 고르지 않습니다.
- Watchdog은 `'V'`로 magic close하지 않고 닫으면 켜진 채로 남아, QEMU 시험에서 정확히 timeout 뒤 시스템을 껐습니다.
- Debian 13의 systemd는 기본으로 런타임 watchdog을 잡지 않습니다(`RuntimeWatchdogUSec=0`).

## 다음 편 예고

다음은 BSP Development Ch 15의 [부트 시간 최적화](/blog/embedded/bsp/chapter15-boot-time-optimization)입니다. 이어서 [Buildroot로 첫 이미지 만들기](/blog/embedded/buildroot/chapter01-problem) 또는 [Practical RTOS Internals](/blog/embedded/rtos/practical-internals/00-preface)를 추천합니다. BSP가 완성되면 이미지 빌드와 양산 펌웨어 관리가 다음 관심사입니다.

## 관련 항목

- [Ch 12: 드라이버 추가](/blog/embedded/bsp/chapter12-driver-add) — sensor driver 통합
- [Ch 13: Power Management](/blog/embedded/bsp/chapter13-power-management) — DVFS와 thermal 연동
- [Buildroot로 첫 이미지 만들기](/blog/embedded/buildroot/chapter01-problem) — systemd 설정
- [Modern Embedded Recipes](/blog/embedded/modern-recipes/00-preface) — 양산 안전 설계
- [Embedded Performance Engineering](/blog/embedded/performance-engineering/00-preface) — thermal과 성능의 트레이드오프
- [Practical RTOS Internals](/blog/embedded/rtos/practical-internals/00-preface) — watchdog 패턴 비교
