---
title: "Edge Thermal Management — Throttling·DVFS·Fan Curve·Sustained"
slug: "embedded/modern-recipes/part12-08-thermal"
date: 2026-04-21T09:06:00
description: "Edge AI 보드의 sustained 성능을 결정하는 thermal 한계. throttle trip, DVFS, fan curve, nvpmodel, passive cooling 설계를 정리합니다."
series: "Modern Embedded Recipes"
seriesOrder: 144
tags: [recipes, thermal, throttling, edge-ai, jetson, dvfs]
topics: ["embedded"]
---

## 한 줄 요약

> **"Edge AI 보드에서 믿을 숫자는 짧은 burst가 아니라 온도가 안정된 뒤의 sustained 성능입니다."** Linux thermal framework의 trip point와 Jetson의 power mode·fan 설정이 그 숫자를 정하므로, 장치에서 직접 읽고 long-run으로 잽니다.

## 이 글의 근거

이 글을 쓴 환경에는 Jetson 보드가 없어 Jetson 명령은 실행하지 않았습니다. 대신 다음 1차 자료와 대조했습니다.

- NVIDIA Jetson Linux Developer Guide r36.4의 "Platform Power and Performance"(Orin Nano·NX·AGX Orin)와 "Tegrastats Utility" 페이지
- Linux 7.4-rc3 소스의 `Documentation/driver-api/thermal/sysfs-api.rst`, `bindings/thermal/thermal-zones.yaml`, `bindings/hwmon/pwm-fan.yaml`, `drivers/thermal/gov_step_wise.c`

아래 C 코드는 Debian 13 arm64 guest(gcc 14.2.0)에서 빌드해 실행했습니다. 이 guest는 QEMU `virt` machine이라 thermal zone이 하나도 없으므로, Jetson 문서의 trip 값으로 만든 가짜 sysfs tree에도 돌렸습니다.

## 어떤 상황에서 쓰나

카메라 분석 박스나 로봇처럼 추론을 몇 시간씩 연속으로 돌리는 장치입니다. 짧게 재면 온도가 trip에 닿기 전의 숫자만 잡히므로, 실제 운영 조건에서 온도가 안정될 때까지 재야 합니다.

NVIDIA 문서도 같은 점을 짚습니다. Orin의 MAXN mode는 "an unconstrained power mode"이지만, "this mode does not guarantee the best performance for all use cases because hardware throttling is engaged when the total module power exceeds the TDP budget. Therefore, it is not the maximum performance mode."라고 적습니다.

## 핵심 개념

### Thermal zone과 trip point

Linux thermal framework의 단위는 thermal zone입니다. zone 하나는 온도 sensor, cooling device, trip point, governor로 이루어집니다. 온도와 trip 온도는 millidegree Celsius로 읽힙니다.

trip point 종류는 Jetson 문서 기준으로 셋입니다.

| trip type | 동작 |
|-----------|------|
| `passive` | clock throttling처럼 성능을 낮춰 발열을 줄이는 cooling device를 켬 |
| `active` | fan처럼 열을 내보내는 cooling device를 켬 |
| `critical` | thermal shutdown |

`critical`을 넘으면 커널은 먼저 정상 power-off(또는 reboot)를 시도하고, 정해진 delay 뒤에는 강제 power-off로 넘어갑니다(`sysfs-api.rst` 5장).

Jetson Orin 문서에 실린 `gpu-thermal` zone의 device tree입니다.

```text
gpu-sw-shutdown { temperature = <0x19834>; type = "critical"; hysteresis = <0x0>; }
gpu-sw-slowdown { temperature = <0x182b8>; type = "passive";  hysteresis = <0x0>; }
gpu-hot-surface { temperature = <0x11170>; type = "active";   hysteresis = <0x1f40>; }
...
thermal-zone-params { governor-name = "step_wise"; };
```

16진수를 풀면 critical 104,500(104.5 °C), passive 99,000(99.0 °C), active 70,000(70.0 °C)이고, active trip의 hysteresis는 8,000(8 °C)입니다. 같은 문서의 본문은 passive trip을 99.5 °C라고 적는데, 예시 DT 값은 99,000입니다. 실제 값은 장치에서 `trip_point_*_temp`로 읽습니다.

### Throttling을 누가 하나

Jetson Orin 문서는 thermal 동작을 이렇게 나눕니다.

| 동작 | 담당 |
|------|------|
| 온도 측정 | BPMP firmware(on-chip sensor), Linux `lm90.c`(on-board sensor) |
| software clock throttling | Linux `cpufreq_cooling.c`, `devfreq_cooling.c` |
| fan | Linux `pwm-fan.c` |
| hardware clock throttling(slowdown) | BPMP firmware |
| software shutdown | Linux `thermal_core.c` |
| hardware shutdown | BPMP firmware, `lm90.c` |

governor `step_wise`의 동작은 `gov_step_wise.c`에 있습니다(같은 Jetson 문서는 passive throttling에 BSP의 PID controller를 쓴다고도 적지만, 위 DT 예의 governor는 `step_wise`입니다). 온도가 trip보다 높고 상승 중이면 cooling state를 한 단계 올리고, 내려가는 중이면 한 단계 낮추되 trip 위에 있는 동안은 최소 state보다 한 단계 위에 둡니다. trip 아래로 내려가 계속 떨어지면 그 trip의 cooling 요청을 거둡니다.

## 코드 / 실제 사용 예

### thermal zone 읽기

```bash
ls /sys/class/thermal/
cat /sys/class/thermal/thermal_zone0/type
cat /sys/class/thermal/thermal_zone0/temp                  # millidegree Celsius
cat /sys/class/thermal/thermal_zone0/policy                # governor
cat /sys/class/thermal/thermal_zone0/trip_point_0_type     # critical / passive / active / hot
cat /sys/class/thermal/thermal_zone0/trip_point_0_temp
```

`type`, `temp`, `policy`, `available_policies`, `trip_point_[0-*]_temp`, `trip_point_[0-*]_type`, `trip_point_[0-*]_hyst`, `emul_temp`는 `sysfs-api.rst`가 thermal zone 아래에 정의하는 attribute입니다.

### Application에서 margin 읽기

모든 zone의 온도와 각 trip까지 남은 margin을 출력하는 프로그램입니다. 인자로 sysfs root를 바꿀 수 있습니다.

```c
/* Read every thermal zone's type, temp and trip points under a sysfs root.
 * usage: thermal_mon [root]   (default /sys/class/thermal) */
#include <dirent.h>
#include <stdio.h>
#include <string.h>

static int read_line(const char *path, char *buf, size_t n) {
    FILE *f = fopen(path, "r");
    if (!f) return -1;
    if (!fgets(buf, (int)n, f)) { fclose(f); return -1; }
    fclose(f);
    buf[strcspn(buf, "\n")] = '\0';
    return 0;
}

static int read_millic(const char *path, long *out) {   /* millidegree Celsius */
    char b[32];
    if (read_line(path, b, sizeof b) != 0) return -1;
    return sscanf(b, "%ld", out) == 1 ? 0 : -1;
}

int main(int argc, char **argv) {
    const char *root = argc > 1 ? argv[1] : "/sys/class/thermal";
    DIR *d = opendir(root);
    if (!d) { perror(root); return 1; }
    struct dirent *e;
    int zones = 0;
    while ((e = readdir(d))) {
        if (strncmp(e->d_name, "thermal_zone", 12) != 0) continue;
        char p[512], type[64] = "?", ttype[32];
        long t, trip;
        snprintf(p, sizeof p, "%s/%s/type", root, e->d_name);  read_line(p, type, sizeof type);
        snprintf(p, sizeof p, "%s/%s/temp", root, e->d_name);
        if (read_millic(p, &t) != 0) { printf("%s %s: temp unreadable\n", e->d_name, type); continue; }
        printf("%s %-12s %6.1f C", e->d_name, type, t / 1000.0);
        for (int i = 0; ; i++) {
            snprintf(p, sizeof p, "%s/%s/trip_point_%d_temp", root, e->d_name, i);
            if (read_millic(p, &trip) != 0) break;
            snprintf(p, sizeof p, "%s/%s/trip_point_%d_type", root, e->d_name, i);
            if (read_line(p, ttype, sizeof ttype) != 0) strcpy(ttype, "?");
            printf("  [%s %.1f C, margin %.1f]", ttype, trip / 1000.0, (trip - t) / 1000.0);
        }
        printf("\n");
        zones++;
    }
    closedir(d);
    printf("%d thermal zone(s) under %s\n", zones, root);
    return 0;
}
```

```bash
gcc -std=c11 -Wall -Wextra -O2 thermal_mon.c -o thermal_mon
./thermal_mon                       # real sysfs
./thermal_mon /root/p1208/fakesys   # fake tree: gpu-thermal, temp 67500, trips from the Orin DT above
```

```text
0 thermal zone(s) under /sys/class/thermal
thermal_zone1 gpu-thermal    67.5 C  [critical 104.5 C, margin 37.0]  [passive 99.0 C, margin 31.5]  [active 70.0 C, margin 2.5]
1 thermal zone(s) under /root/p1208/fakesys
```

첫 줄은 QEMU `virt` guest의 결과입니다. 가상 machine에는 sensor가 없어 zone이 0개입니다. 개발 PC나 VM에서 thermal 코드를 시험하면 이렇게 아무것도 읽히지 않으므로, 실제 보드에서 다시 확인합니다. 가짜 tree는 Jetson 문서의 trip 값에 온도 67.5 °C를 넣은 것입니다. application은 이 margin이 줄어드는 추세를 보고 추론 rate를 낮추는 식으로 씁니다.

### tegrastats

Tegrastats Utility 문서의 사용법입니다.

```bash
tegrastats --interval 1000 --logfile thermal.log &
tegrastats --stop
```

`--interval`은 ms 단위이고 기본값은 1000 ms입니다. 문서가 보여 주는 출력 항목의 예는 `RAM 220/38955MB (lfb 847x4MB)`, 온도 `MCPU@45C`, 전력 `VDDRQ 312/234`입니다. 온도는 `/sys/devices/virtual/thermal/thermal_zone<x>/temp`에서 읽은 값입니다.

### nvpmodel — power mode

```bash
sudo /usr/sbin/nvpmodel -q          # current mode
sudo /usr/sbin/nvpmodel -m <x>      # switch mode; <x> is the mode ID
```

문서에 따르면 설정한 mode는 바꿀 때까지 유지되고 전원을 껐다 켜도 남습니다. GPU `tpc_pg_mask`가 달라지는 mode로 바꾸면 reboot가 필요하다는 경고가 나옵니다. custom mode는 `/etc/nvpmodel.conf`에 `< POWER_MODEL ID=2 NAME=MODE_15W >` 형식으로 추가하고, 그 안에서 CPU core on/off와 CPU(kHz)·GPU·EMC(Hz) 최대 주파수를 정합니다. 문서는 "The frequencies you select are subject to the MaxN limit defined in mode 0"이라고 적습니다.

### jetson_clocks

```bash
sudo /usr/bin/jetson_clocks --show
sudo /usr/bin/jetson_clocks --store        # default file: ${HOME}/.jetsonclocks_conf.txt
sudo /usr/bin/jetson_clocks                # CPU, GPU, EMC to static max of the current nvpmodel mode
sudo /usr/bin/jetson_clocks --restore
```

문서는 이 script가 CPU·GPU·EMC clock을 고정 최대 주파수로 맞춘다("setting the static maximum frequencies of the CPU, GPU and EMC clocks")고 적고, 그 최대값은 nvpmodel power mode가 정한다고 적습니다. 또 `jetson_clocks`를 돌린 뒤에는 nvpmodel mode를 바꿀 수 없고, 바꾸려면 reboot해야 합니다. 측정 전에 mode를 먼저 정해 둡니다.

### Fan

Orin에서 fan 속도는 userspace daemon `nvfancontrol`이 `/etc/nvfancontrol.conf`의 온도-PWM 표에 따라 정합니다. profile은 `quiet`와 `cool` 두 가지이고, 바꾸려면 service를 멈추고 `FAN_DEFAULT_PROFILE`을 고친 뒤 status 파일을 지우고 다시 시작합니다.

```bash
sudo nvfancontrol -q
sudo systemctl stop nvfancontrol
# set FAN_DEFAULT_PROFILE quiet|cool in /etc/nvfancontrol.conf
sudo rm /var/lib/nvfancontrol/status
sudo systemctl start nvfancontrol
```

fan을 daemon이 관리하므로, hwmon의 PWM 값을 직접 쓰기 전에 `nvfancontrol` service 상태부터 확인합니다. 이 글에서는 daemon이 도는 중에 직접 쓴 값이 어떻게 되는지 확인하지 않았습니다. 커널 쪽 fan은 `pwm-fan` binding으로 정의합니다. `cooling-levels`는 "PWM duty cycle values corresponding to thermal cooling states"이고 각 값은 최대 255입니다. binding의 예입니다.

```text
pwm-fan {
  compatible = "pwm-fan";
  cooling-levels = <0 102 170 230>;
  pwms = <&pwm 0 10000 0>;
  #cooling-cells = <2>;
};
```

## 측정 / 성능 비교

이 글에서는 보드가 없어 측정값을 싣지 않습니다. power mode나 냉각을 비교할 때는 같은 모델·입력·주변 온도에서 하나만 바꾸고, 다음을 함께 기록합니다.

| 항목 | 출처 | 보는 것 |
|---|---|---|
| 처음 몇 분의 처리량 | 벤치마크 log | burst 기준값 |
| 온도가 안정된 뒤의 처리량 | 벤치마크 log | sustained 성능 |
| zone별 온도와 trip까지 margin | `tegrastats`, 위 `thermal_mon` | 여유 |
| CPU·GPU 주파수 | `tegrastats` | throttling 시점 |
| rail 전력 | `tegrastats`의 `VDD*` 항목 | mode별 전력 |

burst와 sustained가 거의 같으면 냉각이 그 mode의 발열을 감당한다는 뜻입니다. 차이가 크면 mode를 낮추거나 냉각을 키운 뒤 같은 표로 다시 비교합니다.

## 자주 보는 함정

> ⚠️ 짧은 벤치마크만 돌림

온도가 trip에 닿기 전에 끝난 측정은 burst 숫자입니다. 온도 곡선이 평평해질 때까지 돌립니다.

> ⚠️ MAXN이 가장 빠르다고 가정

NVIDIA 문서대로 MAXN에서도 모듈 전력이 TDP budget을 넘으면 hardware throttling이 걸립니다. mode마다 sustained 처리량을 재서 고릅니다.

> ⚠️ `jetson_clocks` 뒤 mode 변경

`jetson_clocks`를 돌린 뒤에는 reboot 없이 nvpmodel mode를 바꿀 수 없습니다. 자동화 script에서 순서를 지킵니다.

> ⚠️ VM·개발 PC에서 thermal 코드를 시험

위 실행처럼 VM에는 thermal zone이 없을 수 있습니다. 읽기 실패와 zone 0개를 오류로 처리하고, 실제 보드에서 다시 확인합니다.

> ⚠️ fan PWM을 직접 쓰고 daemon을 잊음

Orin의 fan 속도는 `nvfancontrol`이 온도 표에 따라 정합니다. 바꿀 때는 문서의 절차대로 profile을 바꾸거나 service를 멈춘 뒤 다룹니다.

## 정리

- 연속 동작하는 edge 장치의 성능은 온도가 안정된 뒤의 sustained 값으로 봅니다.
- thermal zone의 `passive` trip은 clock throttling, `active`는 fan, `critical`은 shutdown을 부릅니다. 값은 `trip_point_*_temp`에서 millidegree Celsius로 읽습니다.
- Jetson Orin 문서의 `gpu-thermal` 예는 active 70 °C, passive 99 °C, critical 104.5 °C입니다.
- `nvpmodel`이 mode의 최대 주파수를 정하고, `jetson_clocks`는 그 최대값으로 clock을 고정합니다. MAXN도 TDP를 넘으면 throttling됩니다.
- Orin의 fan은 `nvfancontrol`이 관리하므로 profile과 service로 다룹니다.

다음 편은 **Jetson 가족과 최적화 stack**입니다.

## 관련 항목

- [12-04: Quantization](/blog/embedded/modern-recipes/part12-04-quantization)
- [12-09: Jetson](/blog/embedded/modern-recipes/part12-09-jetson)
- [PE 3-10: Thermal Throttling](/blog/embedded/performance-engineering/part3-10-thermal)
