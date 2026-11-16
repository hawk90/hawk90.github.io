---
title: "Thermal Throttling 분석 — Junction Temp·Trip Point·냉각"
slug: "embedded/performance-engineering/part3-10-thermal"
date: 2026-04-25T09:09:00
description: "Junction temperature, thermal sensor, trip point, throttling 동작, 자동차·우주 환경."
series: "Embedded Performance Engineering"
seriesOrder: 28
tags: [thermal, throttle, sensor, junction-temp]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> **"Thermal throttle은 칩의 자기보호입니다."** 온도가 정해 둔 trip point를 넘으면 커널이나 펌웨어가 클럭을 낮추거나, 끝내는 시스템을 내립니다.

성능 측정에서 이 장이 중요한 이유는 간단합니다. 같은 코드가 처음 몇 초와 몇 분 뒤에 다른 속도로 돌 수 있고, 그 차이는 코드가 아니라 온도와 냉각이 만듭니다. 이 글은 온도 등급을 읽는 법, 칩 안 센서를 읽는 법, Linux thermal framework가 trip point마다 실제로 무엇을 하는지를 소스와 문서로 확인합니다.

## 온도 등급 — ambient인가 junction인가

데이터시트의 온도 숫자는 *어디의 온도인지*부터 확인해야 합니다. 같은 "125°C"라도 주변 공기(ambient, T_A) 기준인지, 다이 내부(junction, T_J) 기준인지에 따라 뜻이 완전히 다릅니다. 실내 온도 30°C인 방에서 사람 체온이 37°C인 것과 비슷합니다. 방이 견딜 만해도 몸속은 더 뜨겁습니다.

자동차용 IC 인증 기준인 AEC-Q100 Rev-J(2023-08-11) 1.3.4절 Table 1은 등급을 **ambient operating temperature range**로 정의합니다.

| AEC-Q100 Grade | Ambient Operating Temperature Range |
|---|---|
| 0 | -40°C ~ +150°C |
| 1 | -40°C ~ +125°C |
| 2 | -40°C ~ +105°C |
| 3 | -40°C ~ +85°C |

반대로 PC용 CPU 사양은 junction 한계를 적는 경우가 많습니다. Intel Core i7-12700 사양 페이지는 `TJUNCTION`을 100°C로 적습니다([Intel 제품 사양](https://www.intel.com/content/www/us/en/products/sku/134591/intel-core-i712700-processor-25m-cache-up-to-4-90-ghz/specifications.html)). Grade 1 칩의 "125°C"와 i7-12700의 "100°C"는 기준점이 달라서 크기를 바로 비교할 수 없습니다.

## Thermal Sensor — 공장 보정값으로 읽기

칩 안 온도 센서는 ADC로 읽는 아날로그 전압입니다. 전압과 온도의 관계는 칩마다 조금씩 달라서, 제조사가 공장에서 두 온도에서 잰 ADC 값을 칩 ROM에 넣어 둡니다. 저울을 쓰기 전에 0 g과 100 g 추로 영점을 맞추는 것과 같습니다.

STM32F4 계열에서 그 두 점은 ST의 LL 드라이버 헤더(`stm32f4xx_ll_adc.h`, stm32f4xx-hal-driver v1.8.3)에 주소와 함께 적혀 있습니다.

| 항목 | 값 (헤더 정의) |
|---|---|
| `TEMPSENSOR_CAL1_ADDR` | `0x1FFF7A2C` — 30°C(허용오차 ±5°C)에서 잰 ADC raw |
| `TEMPSENSOR_CAL2_ADDR` | `0x1FFF7A2E` — 110°C(허용오차 ±5°C)에서 잰 ADC raw |
| `TEMPSENSOR_CAL_VREFANALOG` | 3300 mV — 보정 당시 Vref+ |
| 보정 해상도 | 12-bit (헤더 주석: "calibration data ... corresponds to a resolution of 12 bits") |

그래서 데이터시트의 typical slope 대신 이 두 점을 직선으로 잇는 편이 칩별 편차를 줄입니다. 같은 헤더의 `__LL_ADC_CALC_TEMPERATURE()` 매크로가 바로 그 계산을 합니다. 다음 코드는 HAL로 raw 값을 읽고 LL 매크로로 °C로 바꿉니다. 실제 Vref+가 3.3 V가 아니라면 첫 인자를 보드의 값으로 바꿔야 합니다.

```c
#include "stm32f4xx_ll_adc.h"

HAL_ADC_Start(&hadc1);                       /* 채널: ADC_CHANNEL_TEMPSENSOR */
HAL_ADC_PollForConversion(&hadc1, 100);
uint32_t raw = HAL_ADC_GetValue(&hadc1);

/* (raw - TS_CAL1) * (110 - 30) / (TS_CAL2 - TS_CAL1) + 30 */
int32_t temp_c = __LL_ADC_CALC_TEMPERATURE(3300, raw, LL_ADC_RESOLUTION_12B);
```

v1.8.3 헤더에서 이 매크로는 `#if !defined(STM32F469) && !defined(STM32F479xx) && !defined(STM32F429xx) && !defined(STM32F439xx)` 안에 있습니다. F429/F439/F469/F479에서는 이 매크로가 정의되지 않으므로 해당 칩의 데이터시트 보정 주소를 따로 확인해야 합니다.

## Linux Thermal Framework

Linux에서 온도와 냉각 장치는 `/sys/class/thermal/` 아래에 `thermal_zoneN`과 `cooling_deviceN`으로 나타납니다. 속성 이름과 단위는 커널 ABI 문서 `Documentation/ABI/testing/sysfs-class-thermal`(v6.12)이 정합니다.

| 속성 | ABI 문서의 정의 |
|---|---|
| `thermal_zoneX/trip_point_Y_temp` | trip point가 발동하는 온도, 단위 millidegree Celsius |
| `thermal_zoneX/trip_point_Y_type` | trip 종류 문자열. 예: `critical`, `hot`, `passive`, `active[0-*]` |
| `cooling_deviceX/max_state` | 허용되는 최대 냉각 단계 |
| `cooling_deviceX/cur_state` | 현재 냉각 단계. 0이면 냉각 없음, `max_state`면 최대 냉각 |
| `cooling_deviceX/stats/time_in_state_ms` | 단계별 머문 시간 |

`trip_point_Y_temp`가 millidegree라서 `75000`은 75°C입니다. 커널 문서 `Documentation/driver-api/thermal/sysfs-api.rst`에는 ACPI thermal zone 예시가 실려 있습니다. 문서의 값을 그대로 옮기면 다음과 같습니다.

```text
|thermal_zone1:
  |---type:                 acpitz
  |---temp:                 37000
  |---policy:               step_wise
  |---trip_point_0_temp:    100000
  |---trip_point_0_type:    critical
  |---trip_point_1_temp:    80000
  |---trip_point_1_type:    passive
  |---trip_point_2_temp:    70000
  |---trip_point_2_type:    active0
```

모든 시스템에 thermal zone이 있지는 않습니다. 이 글의 Debian 13 arm64 QEMU 게스트(커널 6.12.116+deb13-arm64, Apple M2 Pro 호스트의 HVF)에서는 다음처럼 zone이 하나도 없고, ACPI processor 드라이버가 등록한 cooling device만 있었습니다.

```text
# ls /sys/class/thermal/
cooling_device0  cooling_device1  ...  cooling_device7
# cat /sys/class/thermal/cooling_device0/{type,cur_state,max_state}
Processor
0
0
# ls /sys/devices/system/cpu/cpu0/cpufreq
ls: cannot access '/sys/devices/system/cpu/cpu0/cpufreq': No such file or directory
```

`Processor`라는 이름은 `drivers/acpi/processor_thermal.c:314`의 `thermal_cooling_device_register("Processor", ...)`에서 옵니다. 가상 CPU에는 cpufreq도 없으니 `max_state`가 0입니다. 그래서 **VM 안에서는 thermal throttling을 관찰할 수 없습니다.** 온도 영향은 실제 보드에서 재야 합니다.

## Trip Point — 종류마다 하는 일이 다르다

trip point는 온도계의 눈금에 붙인 행동 지침입니다. 다만 종류마다 커널이 하는 일이 다릅니다. v6.12 `drivers/thermal/thermal_core.c`를 따라가면 다음과 같습니다.

| trip type | 커널 동작 (v6.12) | 근거 |
|---|---|---|
| `passive` | zone의 `passive` 카운터를 올리고, governor가 연결된 cooling device(cpufreq 등)의 단계를 올림 | `thermal_core.c:473-474` |
| `active` | governor가 fan 같은 능동 냉각 장치의 단계를 올림 | sysfs-api.rst의 `cdev1_trip_point: 2 /* cdev1 can be used for active[0]*/` |
| `hot` | 드라이버가 `ops.hot` 콜백을 등록했을 때만 그 콜백 호출 | `handle_critical_trips()`, `thermal_core.c:418-421` |
| `critical` | `ops.critical` 호출. 드라이버가 안 넣으면 기본값 `thermal_zone_device_critical()` → `hw_protection_shutdown()` | `thermal_core.c:402-406`, `1434-1435` |

즉 "hot에서 throttle"은 커널 기본 동작이 아닙니다. 클럭을 내리는 것은 `passive` trip과 governor의 몫입니다. `critical`의 종료 경로에 대해 sysfs-api.rst 5절은 `hw_protection_shutdown()`이 먼저 정상 종료를 시도하고, 지연 뒤 강제 power-off를 한다고 적습니다. 그 지연은 `CONFIG_THERMAL_EMERGENCY_POWEROFF_DELAY_MS`이고 Kconfig 기본값은 0입니다. 문서는 0이면 emergency poweroff가 지원되지 않으니 신중히 잰 양수 값을 넣으라고 적습니다.

## Cooling Device — 단계는 cpufreq 표의 한 칸

cpufreq cooling device의 단계 수는 고정 숫자가 아닙니다. v6.12 `drivers/thermal/cpufreq_cooling.c:561`은 `max_level`을 해당 policy의 유효한 cpufreq 표 항목 수에서 1을 뺀 값으로 정합니다(주석: "max_level is an index, not a counter"). 단계를 바꾸면 `get_state_freq()`로 그 단계의 주파수를 찾아 `freq_qos_update_request()`로 상한을 겁니다(`cpufreq_cooling.c:491-493`). 엘리베이터 층수가 건물마다 다르듯, 한 단계에 몇 MHz가 깎이는지는 그 SoC의 OPP 표가 정합니다.

v6.12 `drivers/thermal/Kconfig`의 기본 governor는 `THERMAL_DEFAULT_GOV_STEP_WISE`이고, 위 Debian 게스트 커널도 `CONFIG_THERMAL_DEFAULT_GOV_STEP_WISE=y`였습니다. `step_wise`는 이름 그대로 한 번에 한 단계씩 움직입니다. `drivers/thermal/gov_step_wise.c` 머리 주석은 온도가 trip 위에서 오르는 추세면 단계를 올리고, trip 아래로 내려가며 떨어지는 추세면 단계를 내린다고 적습니다.

throttle이 실제로 걸렸는지는 tracepoint로 확인합니다. 위 게스트의 `/sys/kernel/tracing/available_events`에는 `thermal:thermal_zone_trip`, `thermal:cdev_update`, `thermal:thermal_temperature`가 있었고, `cdev_update`는 `drivers/thermal/thermal_helpers.c:192`에서 cooling device에 새 단계를 적용할 때마다 그 단계(`target`)와 함께 찍힙니다.

```bash
cd /sys/kernel/tracing
echo 1 > events/thermal/thermal_zone_trip/enable
echo 1 > events/thermal/cdev_update/enable
./run-benchmark &        # 측정 대상
cat trace_pipe
```

## STM32 — 펌웨어에서 클럭 낮추기

Linux가 없는 MCU에서는 펌웨어가 governor 역할을 합니다. 센서 값을 주기적으로 읽어 기준을 넘으면 AHB 분주비를 올리는 식입니다. 다음 코드는 HAL로 HCLK를 SYSCLK/2로 바꿉니다. 문턱값 85·105는 예시 값이니 제품의 온도 사양에 맞춰 정합니다.

```c
if (temp_c > 85) {
    RCC_ClkInitTypeDef clk;
    uint32_t latency;
    HAL_RCC_GetClockConfig(&clk, &latency);      /* 현재 설정과 flash latency */
    clk.ClockType = RCC_CLOCKTYPE_HCLK;
    clk.AHBCLKDivider = RCC_SYSCLK_DIV2;
    HAL_RCC_ClockConfig(&clk, latency);
}
if (temp_c > 105) {
    enter_safe_mode();                           /* 제품별 안전 상태 */
}
```

`RCC->CFGR`의 HPRE 비트를 직접 `|=`로 건드리는 대신 HAL을 쓰는 이유가 있습니다. v1.8.3 `stm32f4xx_hal_rcc.c`의 `HAL_RCC_ClockConfig()`는 `MODIFY_REG(RCC->CFGR, RCC_CFGR_HPRE, ...)`로 필드 전체를 바꾸고(639행), 이어서 `SystemCoreClock`을 다시 계산한 뒤(719행) `HAL_InitTick()`을 호출합니다(722행). 직접 쓰면 HPRE에 남은 이전 비트와 OR되어 엉뚱한 분주비가 되거나, SysTick 기반 `HAL_Delay()`가 두 배로 느려집니다.

## big.LITTLE — 무거운 코어를 덜 쓰기

big.LITTLE SoC에서는 클러스터마다 주파수를 따로 묶을 수 있습니다. Linux에서 cpufreq cooling device는 `cpufreq_cooling_register(struct cpufreq_policy *policy)`로 policy 단위로 등록되므로(`include/linux/cpu_cooling.h:27`), 클러스터마다 policy가 따로 있는 SoC에서는 big과 LITTLE이 각자 cooling device를 가집니다. 사용자 공간에서는 스케줄러에 맡기지 않고 작업을 LITTLE 코어에 직접 묶을 수도 있습니다.

```bash
taskset -c 0-3 ./background-job   # 예: CPU 0-3이 LITTLE 클러스터인 보드
```

어느 번호가 LITTLE인지는 보드마다 다르니 `/sys/devices/system/cpu/cpuX/cpu_capacity`(ABI 문서: "information about CPUs heterogeneity")로 확인합니다.

CPU를 통째로 끄는 hotplug(`echo 0 > /sys/devices/system/cpu/cpuN/online`)도 있지만, 측정 환경에서는 조심해야 합니다. 이 글의 HVF 게스트에서 CPU 4를 offline하자 `cpu_die`에서 BUG가 나고 `Kernel panic - not syncing: Attempted to kill the idle task!`로 VM 전체가 내려갔습니다. 이 환경에서는 hotplug를 측정 도구로 쓸 수 없었습니다.

## Cooling — Passive·Active

| 방식 | 동작 | Linux에서의 대응 |
|---|---|---|
| 방열판·히트파이프 | 항상 동작하는 수동 냉각 | 없음 (하드웨어) |
| 팬 | 단계 조절 가능한 능동 냉각 | `active` trip + fan cooling device |
| 클럭 제한 | 주파수 상한을 낮춤 | `passive` trip + cpufreq cooling device |
| idle 주입 | CPU에 강제 idle 구간을 끼움 | `cpu-idle-cooling.rst`의 idle injection cooling device |

## TDP와 제품 전력 사양

TDP(Thermal Design Power)는 냉각 설계를 위한 지표이지, 칩이 실제로 내는 지속 전력을 그대로 뜻하지 않습니다. 이름도 세대마다 바뀝니다. Intel Core i7-12700 사양 페이지는 전력 항목을 **Processor Base Power 65 W**와 **Maximum Turbo Power 180 W**로 적습니다([Intel 제품 사양](https://www.intel.com/content/www/us/en/products/sku/134591/intel-core-i712700-processor-25m-cache-up-to-4-90-ghz/specifications.html)). 두 값은 각자의 이름으로 읽고, 하나를 "TDP"로 바꿔 부르지 않습니다.

## 측정 — 지금 throttle 중인가

측정 결과를 믿으려면 측정하는 동안 throttle이 없었다는 증거가 같이 있어야 합니다. 플랫폼별로 확인할 곳이 다릅니다.

| 플랫폼 | 확인 방법 |
|---|---|
| Linux 보드 | `cooling_deviceX/cur_state`, `stats/time_in_state_ms`, `thermal:cdev_update` tracepoint |
| macOS | `pmset -g therm` |
| MCU | 펌웨어가 기록한 센서 값과 클럭 변경 로그 |

이 글을 쓴 Apple M2 Pro 호스트(macOS 27.2.1)에서 `pmset -g therm`은 다음을 출력했습니다.

```text
Note: No thermal warning level has been recorded
Note: No performance warning level has been recorded
Note: No CPU power status has been recorded
```

## 자주 하는 실수

> ⚠️ Benchmark 시 thermal 무시

```c
loop_benchmark_5_sec();  /* 5초 결과만 보고 지속 성능으로 착각 */
```

짧은 측정은 cooling 단계가 0인 상태의 숫자만 보여 줍니다. 측정 전후로 `stats/time_in_state_ms`를 저장해 두거나 `thermal:cdev_update`를 켜 두면, 결과에 throttle 구간이 섞였는지 바로 압니다.

> ⚠️ Junction T vs Case T 혼동

데이터시트의 T_J는 다이 온도이고, 사용자가 열전대로 재는 것은 패키지 표면 온도입니다. TI 응용 노트 SPRA953D(*Semiconductor and IC Package Thermal Metrics*) 3절은 패키지 윗면 중심에 붙인 열전대 온도로 junction을 추정할 때 Ψ_JT(JESD51-2)를 쓰라고 하고, 식 (8)을 이렇게 적습니다. 여기서 T_C는 그 윗면 온도입니다.

$$
T_J = T_C + \Psi_{JT} \times P
$$

> ⚠️ RθJA로 실제 보드의 junction 온도 계산

$T_J = T_A + R_{\theta JA} \times P$는 흔히 쓰이지만, SPRA953D 1.1절은 이것을 *misapplication*이라고 적습니다. RθJA는 JEDEC JESD51 표준 시험 보드에서 잰 값이라 패키지끼리 비교하는 용도입니다. 같은 절은 still-air RθJA 측정에서 칩 전력의 70~95%가 패키지 표면이 아니라 시험 보드로 빠져나간다고 적습니다. 실제 보드는 그 시험 보드와 다르니, 이 식으로 낸 T_J는 크게 틀릴 수 있습니다. 설계 검증은 실보드에서 패키지 윗면 온도를 재고 Ψ_JT로 환산합니다.

> ⚠️ Throttling 무시한 RT design

```c
/* RT task: 1 ms deadline, 최고 클럭에서 0.6 ms 소요 */
/* CPU-bound라면 클럭이 절반이 될 때 소요 시간은 약 1.2 ms → deadline miss */
```

메모리 대기가 없는 CPU-bound 코드라면 실행 시간은 클럭에 반비례합니다. Hard RT 경로는 최악 온도에서 걸릴 수 있는 *최저* 클럭 기준으로 WCET를 잡거나, 그 코어를 cooling device에서 빼는 설계를 검토합니다.

## 정리

- 온도 등급은 기준점부터 확인합니다. AEC-Q100 Grade는 ambient, Intel `TJUNCTION`은 junction입니다.
- 칩 내부 센서는 공장 보정값 두 점으로 읽습니다. STM32F4는 30°C·110°C 보정값을 `0x1FFF7A2C`·`0x1FFF7A2E`에 둡니다.
- Linux에서 클럭을 내리는 것은 `passive` trip과 governor입니다. `hot`은 드라이버 콜백, `critical`은 기본 동작이 `hw_protection_shutdown()`입니다.
- cpufreq cooling의 한 단계는 그 SoC cpufreq 표의 한 칸입니다.
- 측정 결과에는 throttle 여부(`cdev_update`, `time_in_state_ms`, `pmset -g therm`)를 같이 남깁니다.
- RθJA는 패키지 비교용입니다. 실보드 junction 추정은 Ψ_JT로 합니다.

다음 편은 [3-11: CXL Interconnect 분석](/blog/embedded/performance-engineering/part3-11-cxl-interconnect)입니다.

## 관련 항목

- [3-09: Power vs Performance](/blog/embedded/performance-engineering/part3-09-power-vs-performance)
- [3-11: CXL Interconnect 분석](/blog/embedded/performance-engineering/part3-11-cxl-interconnect)
