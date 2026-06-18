---
title: "BSP Thermal과 Watchdog — Trip Point·Cooling Device·Hardware Reset"
date: 2026-05-18T09:14:00
description: "보드 안전 장치를 정리합니다. thermal zone과 trip point, hardware watchdog 통합을 살펴봅니다."
series: "BSP Development"
seriesOrder: 14
tags: [embedded, bsp, thermal, watchdog, safety]
draft: false
---

## 한 줄 요약

**Thermal과 watchdog은 *최후의 안전망*입니다.** 부팅 후 software가 정상 동작하지 않거나 칩이 너무 뜨거워졌을 때, 사용자 개입 없이 시스템을 보호하는 마지막 메커니즘입니다. BSP가 이 둘을 빠뜨리면 양산 후 필드에서 "왜 갑자기 보드가 죽었는가"를 영원히 추적하게 됩니다.

여름철 차량 내부 70°C, 산업 현장 먼지 속의 fanless 보드, 무인 키오스크의 24시간 운용 — 임베디드는 *사람이 옆에 없는 환경*에서 동작하는 경우가 많습니다. 그래서 BSP의 마지막 챕터는 시스템의 *자기 보호 능력*입니다. thermal framework가 발열을 다스리고, watchdog이 hang을 끊습니다.

## Thermal framework 구조

![Thermal framework — Sensor → Thermal zone → Trip point → Cooling device](/images/blog/bsp/diagrams/chapter14-thermal-flow.svg)

## DT의 thermal-zones

i.MX8M Mini를 예로 듭니다.

```text
thermal-zones {
    cpu-thermal {
        polling-delay-passive = <250>;
        polling-delay = <2000>;
        thermal-sensors = <&tmu>;

        trips {
            cpu_alert0: trip0 {
                temperature = <85000>;     /* 85 °C */
                hysteresis = <2000>;
                type = "passive";
            };

            cpu_alert1: trip1 {
                temperature = <95000>;     /* 95 °C */
                hysteresis = <2000>;
                type = "hot";
            };

            cpu_crit: trip2 {
                temperature = <105000>;    /* 105 °C */
                hysteresis = <2000>;
                type = "critical";
            };
        };

        cooling-maps {
            map0 {
                trip = <&cpu_alert0>;
                cooling-device = <&A53_0 THERMAL_NO_LIMIT THERMAL_NO_LIMIT>,
                                 <&A53_1 THERMAL_NO_LIMIT THERMAL_NO_LIMIT>,
                                 <&A53_2 THERMAL_NO_LIMIT THERMAL_NO_LIMIT>,
                                 <&A53_3 THERMAL_NO_LIMIT THERMAL_NO_LIMIT>;
            };
        };
    };
};
```

| trip type | 동작 |
|-----------|------|
| `active` | fan 같은 능동 냉각 가동 |
| `passive` | CPU throttling (DVFS down) |
| `hot` | 경고 알림, userspace 통보 |
| `critical` | 강제 shutdown |

`critical` trip은 *반드시* 한 개 이상 있어야 합니다. 이 값을 넘으면 커널이 `emergency_restart()`를 호출합니다.

## Cortex-A 등급별 최대 온도

칩 등급에 따라 허용 온도가 다릅니다.

| 등급 | 동작 범위 (Tj) | critical 권장 |
|------|----------------|---------------|
| Commercial | 0 ~ 95°C | 90 °C |
| Industrial | -40 ~ 105°C | 100 °C |
| Automotive AEC-Q100 Grade 3 | -40 ~ 125°C | 115 °C |
| Automotive AEC-Q100 Grade 2 | -40 ~ 105°C | 100 °C |

부품 datasheet의 Tj_max를 확인하고, **그 값보다 5~10°C 낮게** critical trip을 둡니다. ambient와 internal의 thermal lag을 감안한 마진입니다.

## 동작 확인

```bash
$ ls /sys/class/thermal/
cooling_device0  cooling_device1  thermal_zone0

$ cat /sys/class/thermal/thermal_zone0/type
cpu-thermal

$ cat /sys/class/thermal/thermal_zone0/temp
58234            # 58.234 °C

$ cat /sys/class/thermal/thermal_zone0/trip_point_0_temp
85000

$ cat /sys/class/thermal/thermal_zone0/trip_point_2_type
critical

$ cat /sys/class/thermal/cooling_device0/type
thermal-cpufreq-0

$ cat /sys/class/thermal/cooling_device0/cur_state
0                # 0 = no throttling
$ cat /sys/class/thermal/cooling_device0/max_state
3
```

cooling device의 `cur_state`가 증가하면 그만큼 cpufreq가 낮아집니다.

## Thermal governor

| governor | 알고리즘 |
|----------|----------|
| `step_wise` | 한 단계씩 throttle/release |
| `fair_share` | 여러 cooling device에 분배 |
| `bang_bang` | hysteresis 기반 ON/OFF |
| `user_space` | userspace daemon이 정책 결정 |
| `power_allocator` | power budget 기반 (PID 제어) |

기본은 `step_wise`이며, 정밀 제어가 필요하면 `power_allocator`로 바꿉니다.

```text
thermal-zones {
    cpu-thermal {
        thermal-governor = "power_allocator";
        sustainable-power = <1500>;
        /* ... */
    };
};
```

확인:

```bash
$ cat /sys/class/thermal/thermal_zone0/policy
step_wise
$ cat /sys/class/thermal/thermal_zone0/available_policies
bang_bang fair_share power_allocator step_wise user_space
$ echo power_allocator > /sys/class/thermal/thermal_zone0/policy
```

## 외부 sensor와 cooling device

칩 내부 sensor만으로 부족하면 외부 thermistor, fan, peltier 등을 추가합니다.

```text
/* i2c thermistor */
&i2c1 {
    tmp103@70 {
        compatible = "ti,tmp103";
        reg = <0x70>;
        #thermal-sensor-cells = <0>;
    };
};

/* fan via PWM */
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

thermal sensor가 hwmon으로도 노출됩니다.

```bash
$ sensors
imx8mm_thermal-virtual-0
Adapter: Virtual device
temp1:        +58.2°C  (high = +85.0°C, crit = +105.0°C)

tmp103-i2c-1-70
Adapter: i.MX I2C adapter 1
temp1:        +32.1°C  (low  = -55.0°C, high = +127.0°C)
```

`lm-sensors` 패키지의 `sensors` 명령이 표준입니다.

## Watchdog — 자기 reset 메커니즘

Watchdog은 *주기적으로 키워주지 않으면* 시스템을 reset하는 timer입니다. software hang 시 마지막 안전망입니다.

```text
[watchdog timer]
   ├─ enable
   ├─ timeout 설정 (예: 60 s)
   └─ tick

[application]
   └─ 매 N초마다 WDIOC_KEEPALIVE ioctl
        ↓
   watchdog 카운터 초기화

만약 application이 hang → KEEPALIVE 안 옴 → timeout → reset
```

### /dev/watchdog 사용

```c
#include <fcntl.h>
#include <linux/watchdog.h>
#include <sys/ioctl.h>
#include <unistd.h>

int main(void)
{
    int fd = open("/dev/watchdog", O_WRONLY);
    if (fd < 0) {
        perror("open");
        return 1;
    }

    /* timeout 30초 설정 */
    int timeout = 30;
    ioctl(fd, WDIOC_SETTIMEOUT, &timeout);

    /* 활성화 */
    int options = WDIOS_ENABLECARD;
    ioctl(fd, WDIOC_SETOPTIONS, &options);

    while (1) {
        sleep(10);
        /* keepalive */
        ioctl(fd, WDIOC_KEEPALIVE, NULL);
    }

    /* close하면 watchdog stop. 'V'를 쓴 후에야 stop 허용 */
    write(fd, "V", 1);
    close(fd);
    return 0;
}
```

`WDIOC_KEEPALIVE` 외에 어떤 데이터든 fd에 쓰면 keepalive 효과를 냅니다. 단, *'V'* 문자열을 보낸 후 close하면 *명시적 종료*로 처리되어 watchdog이 멈춥니다.

### systemd watchdog 통합

systemd가 PID 1로서 watchdog을 직접 잡아 줍니다.

```ini
# /etc/systemd/system.conf
[Manager]
RuntimeWatchdogSec=30
ShutdownWatchdogSec=10min

[Service]
WatchdogSec=10s
```

`RuntimeWatchdogSec=30`은 systemd가 `/dev/watchdog`을 잡고 매 ~15초마다 키워줍니다. 서비스 단위의 `WatchdogSec`은 그 서비스가 systemd에 sd_notify로 신호를 보내야 하는 주기입니다.

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

서비스가 hang하면 systemd가 그 서비스를 restart하고, systemd 자체가 hang하면 kernel watchdog이 reset.

### DT binding

```text
&wdog1 {
    pinctrl-names = "default";
    pinctrl-0 = <&pinctrl_wdog>;
    fsl,ext-reset-output;       /* WDOG_B 핀으로 외부 reset 신호 출력 */
    status = "okay";
    timeout-sec = <30>;
};
```

`timeout-sec`은 기본 timeout. `fsl,ext-reset-output`이 있으면 internal reset이 아닌 외부 reset 라인을 toggle합니다. PMIC 등을 통해 보드 전체를 reset할 때 필요합니다.

### boot-time watchdog

부팅이 너무 오래 걸리면 reset하는 메커니즘입니다. SPL이 watchdog을 켜고 timeout을 짧게(예: 120초) 둡니다. U-Boot proper, kernel 부팅을 거쳐 systemd가 watchdog을 인계받기 전까지 멈추지 않게 됩니다.

**U-Boot:**

- WDT:   Started watchdog@30280000 with servicing (60s timeout)

U-Boot가 watchdog을 서비싱하면서 부팅을 진행합니다. 부팅 단계 어디서든 hang하면 watchdog이 reset해 재부팅 루프를 만듭니다. 이 루프 자체는 정상 동작입니다 — fail-safe 설계가 의도한 동작입니다.

## 측정과 검증

### thermal 스트레스 테스트

```bash
# 부하 발생
$ stress-ng --cpu $(nproc) --timeout 600s &

# 다른 터미널에서 모니터링
$ while true; do
    cat /sys/class/thermal/thermal_zone0/temp
    cat /sys/devices/system/cpu/cpu0/cpufreq/scaling_cur_freq
    sleep 1
  done
```

passive trip에 도달하면 frequency가 단계적으로 떨어지는지 확인합니다.

### watchdog 동작 테스트

```bash
# watchdog을 잡고 의도적으로 keepalive 멈춤
echo 1 > /dev/watchdog
sleep 30   # 또는 timeout 만큼 대기
# → reset 발생해야 함
```

부팅 후 dmesg에 reset 원인을 확인:

```bash
$ cat /proc/reset-reason       # 보드별
watchdog_reset

$ dmesg | grep -i wdog
[    0.123456] imx2-wdt 30280000.watchdog: timeout 30 sec (nowayout=0)
[    0.234567] imx2-wdt 30280000.watchdog: Last reset was caused by watchdog
```

## 자주 하는 실수

- **critical trip 누락**: critical 없이는 진짜 위급 상황에서 shutdown이 안 됩니다.
- **DT의 thermal-zones 누락**: sensor는 동작하지만 throttling이 안 됩니다. dmesg에 `no thermal-zones found` 경고.
- **cooling device map 누락**: throttle해야 할 cpu를 지정 안 하면 발열만 측정하고 대응 없음.
- **wdt가 비활성**: `CONFIG_WATCHDOG=y`만 켜고 `CONFIG_<vendor>_WATCHDOG=y`가 없어 드라이버 미사용.
- **systemd RuntimeWatchdogSec 미설정**: `/dev/watchdog` 존재해도 누가 keepalive 안 함.
- **wdt timeout이 너무 짧음**: 부팅이 30초인데 timeout이 20초면 영원히 부팅 못 함.
- **`fsl,ext-reset-output` 없는 PMIC reset 의존**: 내부 reset만 동작해 PMIC가 안 끊기면 잔존 상태로 부팅.

## 정리

- Thermal framework는 sensor, zone, trip point, cooling device의 4개 레이어로 구성됩니다.
- DT의 `thermal-zones`가 zone과 trip을 선언하고, `cooling-maps`가 trip과 cooling device를 연결합니다.
- trip type은 active, passive, hot, critical이며 critical은 *반드시* 한 개 있어야 합니다.
- Cortex-A 등급별 Tj_max를 기준으로 critical을 5~10°C 마진 두고 설정합니다.
- thermal governor는 step_wise가 기본이며 정밀 제어는 power_allocator를 씁니다.
- Watchdog은 `/dev/watchdog`을 통해 `WDIOC_KEEPALIVE`로 키워 주는 timer입니다.
- systemd의 `RuntimeWatchdogSec`이 PID 1 차원에서 watchdog을 자동 운용합니다.
- 부팅 hang 보호를 위해 SPL/U-Boot부터 watchdog을 켜고 부팅 단계에서 keepalive를 유지합니다.

## 다음 편 예고

이 글은 BSP Development 시리즈의 마지막 챕터입니다. 다음 시리즈로 [Buildroot로 첫 이미지 만들기](/blog/embedded/buildroot/) 또는 [Practical RTOS Internals](/blog/embedded/rtos/practical-internals/)를 추천합니다. BSP가 완성되면 이미지 빌드와 양산 펌웨어 관리가 다음 관심사입니다.

## 관련 항목

- [Ch 12: 드라이버 추가](/blog/embedded/bsp/chapter12-driver-add) — sensor driver 통합
- [Ch 13: Power Management](/blog/embedded/bsp/chapter13-power-management) — DVFS와 thermal 연동
- [Buildroot로 첫 이미지 만들기](/blog/embedded/buildroot/) — systemd 설정
- [Modern Embedded Recipes](/blog/embedded/modern-recipes/) — 양산 안전 설계
- [Embedded Performance Engineering](/blog/embedded/performance-engineering/) — thermal과 성능의 트레이드오프
- [Practical RTOS Internals](/blog/embedded/rtos/practical-internals/) — watchdog 패턴 비교
