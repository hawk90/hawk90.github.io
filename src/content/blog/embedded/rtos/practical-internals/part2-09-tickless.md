---
title: "Tickless 모드 구현 — Idle Tick Suppression·Sleep·Wake 보정"
slug: "embedded/rtos/practical-internals/part2-09-tickless"
date: 2026-05-05T09:19:00
description: "Idle 시 SysTick 멈춤 + CPU sleep. 다음 task wake 시점까지 동적 timer 설정. 배터리 IoT 핵심."
series: "Practical RTOS Internals"
seriesOrder: 19
tags: [tickless, low-power, suppress-tick, wfi, sleep]
draft: false
topics: ["embedded", "embedded/rtos"]
---

## 한 줄 요약

Tickless idle은 유휴 구간의 주기 tick interrupt를 줄이고, 실제 경과 시간을 커널 시간에 반영하는 기법입니다. 배터리 수명은 소비 전류·통신·용량·자가 방전 등에도 달려 있으므로 tickless만으로 몇 년을 보장할 수는 없습니다. 구체적인 동작은 FreeRTOS **V11.2.0 GCC/ARM_CM4F 기본 SysTick 포트**를 기준으로 봅니다.

## 문제 — 매 ms마다 깨어납니다

주기 interrupt가 있으면 할 일이 없어도 CPU가 매 tick 깨어납니다. 아무도 오지 않는 가게의 점원이 1분마다 문을 열어 확인하는 셈입니다. 그 추가 전하를 sleep 전류와 함께 계산하면 tick suppression의 이득을 추정할 수 있습니다. 다음은 **측정값이 아닌 가정**으로 하는 계산입니다.

```js title="idle-energy.mjs"
export function idleEnergy(activeUa, sleepUa, activeUs, periodUs) {
  if (![activeUa, sleepUa, activeUs, periodUs].every(Number.isFinite) ||
      activeUa < 0 || sleepUa < 0 || periodUs <= 0 ||
      activeUs < 0 || activeUs > periodUs) throw new RangeError('inputs');
  const averageUa = (activeUa * activeUs +
      sleepUa * (periodUs - activeUs)) / periodUs;
  return {averageUa, annualMah: averageUa * 24 * 365 / 1000};
}
```

10 mA active를 3 µs, 1 µA sleep을 나머지 997 µs로 가정하면 평균은 30.997 µA이고 연간 약 271.53 mAh입니다. 같은 wake 비용이 아래 QEMU 실험처럼 671 ms에 한 번으로 줄면 평균 1.045 µA, 연간 9.15 mAh입니다(Node로 같은 함수를 실행한 값). 가정한 숫자 사이의 비교일 뿐이고, 실제 보드에서는 센서·radio·regulator·누설 전류가 이 위에 더해집니다.

## 동작 원리

1. Idle 경로가 다음 timeout까지의 유휴 예상 시간을 구합니다. 실행 가능한 작업이나 설정에 따라 sleep에 진입하지 않을 수도 있습니다.
2. 포트가 timer 폭에 맞춰 예상 시간을 제한하고, 예외 마스크 아래에서 sleep 허용 여부를 다시 확인합니다.
3. 현재 tick의 남은 부분과 pending tick을 고려하여 timer를 긴 interval로 재설정합니다.
4. pre-sleep hook과 WFI를 수행하고, wake 뒤 post-sleep 처리와 clock 상태를 확인합니다.
5. timer 만료인지 다른 IRQ의 이른 wake인지 구분하고, 완료 tick과 다음 부분 tick을 보정합니다.
6. 커널 tick을 적절히 전진시키고 정상 tick 및 interrupt 상태로 돌아옵니다.

1번의 "유휴 예상 시간"은 idle task의 `prvGetExpectedIdleTime()`이 다음 unblock 시각까지 남은 tick으로 구하고, `configEXPECTED_IDLE_TIME_BEFORE_SLEEP`(기본 2)보다 짧으면 잠들지 않습니다(1-02의 `prvIdleTask`). IRQ가 들어오면 예상보다 일찍 깨고, 5번에서 실제로 지난 tick만큼만 커널 시간을 전진시킵니다.

### QEMU에서 tick interrupt 세기

정말로 tick interrupt가 줄어드는지 QEMU에서 셌습니다. `configUSE_TICK_HOOK`을 켜서 실제 SysTick ISR이 돌 때마다 `vApplicationTickHook()`이 카운터를 올리게 하고, `configPRE_SLEEP_PROCESSING(x)`로 포트가 잠들기 직전의 예상 tick 수를 기록했습니다. task 하나가 `vTaskDelay(500)`과 `vTaskDelay(2000)`을 합니다.

```c title="tickless.h"
#undef configUSE_TICK_HOOK
#define configUSE_TICK_HOOK 1
#undef configUSE_TIMERS
#define configUSE_TIMERS 0
#define configUSE_TICKLESS_IDLE TICKLESS
extern void pre_sleep(unsigned expected);
#define configPRE_SLEEP_PROCESSING( x ) pre_sleep( ( unsigned ) ( x ) )
```

FreeRTOS V11.2.0 `ARM_CM3`의 기본 `vPortSuppressTicksAndSleep()`, arm-none-eabi-gcc 16.2.0 `-O2`, QEMU 11.1.3 `mps2-an385 -icount shift=5`(SysTick 입력 25 MHz, 1 kHz tick)입니다. timer task가 깨어나 sleep을 끊지 않도록 `configUSE_TIMERS`는 껐습니다.

```text
TICKLESS=0 vTaskDelay(500): tick count advanced 500, SysTick ISRs=500, sleeps=0
TICKLESS=0 vTaskDelay(2000): tick count advanced 2000, SysTick ISRs=2000, sleeps=0
largest xExpectedIdleTime passed to pre-sleep hook=0; first ones: 0 0 0 0 0 0
TICKLESS=1 vTaskDelay(500): tick count advanced 500, SysTick ISRs=1, sleeps=1
TICKLESS=1 vTaskDelay(2000): tick count advanced 2000, SysTick ISRs=3, sleeps=3
largest xExpectedIdleTime passed to pre-sleep hook=671; first ones: 500 671 671 658 0 0
```

앞의 세 줄이 `TICKLESS=0` 빌드, 뒤의 세 줄이 `TICKLESS=1` 빌드의 출력입니다. 마지막 줄의 `0 0`은 기록 칸 여섯 개 중 쓰이지 않은 칸입니다.

tickless를 켜자 500 tick 동안 SysTick ISR이 500번에서 1번으로 줄었고, tick count는 똑같이 500 전진했습니다. 2,000 tick은 세 번(671 + 671 + 658 = 2,000) 나눠 잤습니다. 한 번에 671 tick을 넘지 못한 이유가 아래의 24비트 한계입니다.

## FreeRTOS Tickless 구현

원본 `vPortSuppressTicksAndSleep()`([`ARM_CM4F/port.c` L589](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/portable/GCC/ARM_CM4F/port.c#L589))은 단순 WFI wrapper보다 많은 경계 조건을 처리합니다. weak 함수라서 응용이 같은 이름으로 다시 정의하면 그쪽이 쓰입니다. 주요 분기는 다음과 같습니다.

| 경계 | V11.2.0 ARM_CM4F의 처리 |
| --- | --- |
| timer 폭 | 24-bit counter로 표현 가능한 예상 tick 수로 제한 |
| 진입 race | interrupt 마스크 후 `eTaskConfirmSleepModeStatus()` 재확인, `eAbortSleep`이면 취소(L608) |
| CURRENT=0 | 다음 tick까지의 남은 counts 해석을 보정 |
| 이미 pending인 SysTick | pending을 정리하고 첫 tick 중복을 피하도록 보정 |
| 자체 WFI가 있는 pre-hook | `configPRE_SLEEP_PROCESSING( xModifiableIdleTime )`(L669)에서 인자를 0으로 만들면 포트의 `wfi`(L674) 생략 |
| SysTick 만료 wake | pending tick 하나가 별도 처리될 것을 고려하여 step 수 결정 |
| 다른 IRQ로 이른 wake | 실제 완료 tick과 다음 tick의 잔여 interval 계산 |
| 커널 전진 | `vTaskStepTick( ulCompleteTickPeriods )`(L798) |

`configPRE_SLEEP_PROCESSING`·`configPOST_SLEEP_PROCESSING`은 기본이 빈 매크로라서([`FreeRTOS.h` L2725-L2730](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/include/FreeRTOS.h#L2725-L2730)), 켜기만 하면 포트는 `wfi`만 실행합니다. MCU의 더 깊은 저전력 모드로 들어가는 코드는 응용이 이 hook에 넣습니다.

```c
#define configUSE_TICKLESS_IDLE 1
#define configEXPECTED_IDLE_TIME_BEFORE_SLEEP 2
```

원본은 한 번에 잘 수 있는 tick 수를 `xMaximumPossibleSuppressedTicks = portMAX_24_BIT_NUMBER / ulTimerCountsForOneTick`으로 정합니다(L818). 168 MHz SysTick 입력과 1 kHz tick이면 0xFFFFFF / 168,000 = **99 tick**, 위 QEMU의 25 MHz에서는 0xFFFFFF / 25,000 = **671 tick**입니다. 위 실험의 671이 이 값입니다. 168 MHz 보드에서는 1분 timeout도 99 ms마다 한 번씩 깨어납니다. 더 길게 자려면 SysTick 입력을 낮은 clock으로 바꾸거나(`configSYSTICK_CLOCK_HZ`), 저전력 timer로 `vPortSuppressTicksAndSleep()`을 다시 구현합니다.

## Power Modes — Cortex-M

ARMv7-M이 정하는 것은 두 가지뿐입니다. WFI를 실행하면 "it can suspend execution and enter a low-power state"이고, reset이나 (PRIMASK가 0이었다면) 선점할 수 있는 우선순위의 비동기 예외가 오면 깹니다(DDI 0403E.b B1.5.19). SCR의 SLEEPDEEP bit는 "wakeup time from sleep state might be longer"라는 힌트이고, 실제로 무엇이 꺼지는지는 "IMPLEMENTATION DEFINED"입니다(B1.5.17 "Power management", bit 위치는 B3.2.7 SCR의 bit[2]). 그래서 Sleep·Stop·Standby 같은 이름과 전류·retention·wake latency는 MCU 데이터시트가 정합니다.

이 장의 QEMU 실험은 SLEEPDEEP를 쓰지 않은 `wfi`였고, SysTick이 계속 돌아 깨어났습니다. hook 안에서 직접 저전력 명령을 실행했다면 `configPRE_SLEEP_PROCESSING( x )`의 인자를 0으로 바꿔 포트의 두 번째 `wfi`를 막습니다. 포트가 넘기는 것이 지역 변수 `xModifiableIdleTime` 자체이므로, 매크로 안에서 `x = 0;`으로 써야 효과가 있습니다. 같은 값을 함수 인자로 복사해 넘기면 원본 변수는 바뀌지 않습니다.

## Wake Source 보장

wake source는 선택한 sleep mode에서 살아 있어야 하고, 다음 timeout 전에 깨울 수 있어야 합니다. 기본 포트에서는 늘린 SysTick 자체가 wake source입니다. SysTick의 clock이 멈추는 mode에 들어가면 깨어날 수단이 사라지므로, 그런 MCU는 살아 있는 저전력 timer로 포트 함수를 다시 구현합니다.

예를 들어 1분 간격 센서 작업이 block해도, 168 MHz 기본 포트는 99 ms마다 한 번 깹니다. 다른 task의 timeout도 유휴 시간을 나눕니다. 위 QEMU 실험에서 timer task를 끈 이유도 그 task의 timeout이 sleep을 끊지 않게 하려는 것이었습니다. 작업이 0.1초이고 주기가 정확히 60초라는 **가정**이면 그 작업만의 duty cycle은 약 0.167%입니다.

## RTC alarm 활용

RTC나 저전력 counter로 포트를 다시 구현할 때 할 일은 기본 포트와 같습니다. 잠들기 전에 깨어날 alarm을 걸고, 깨어난 뒤 실제로 지난 시간을 그 counter로 읽어 `vTaskStepTick()`에 넘깁니다. 다른 점은 counter의 해상도가 tick과 다르면 남는 부분 tick을 직접 보정해야 한다는 것입니다. 기본 포트에서 이 보정은 L723-L777의 LOAD 재계산이 합니다.

깨어날 때 reset을 거치는 mode라면 task stack이 남지 않으므로 tickless로 다룰 수 없고, 부팅부터 다시 하는 설계가 됩니다.

## Zephyr Power Management

Zephyr **3.7.0**의 system PM은 `CONFIG_PM`과 devicetree의 power state로 동작합니다. 아래는 [`dts/bindings/power/zephyr,power-state.yaml`](https://github.com/zephyrproject-rtos/zephyr/blob/v3.7.0/dts/bindings/power/zephyr,power-state.yaml)의 속성(`power-state-name`, `min-residency-us`, `exit-latency-us`)을 쓴 **부분 DTS 예시**이며, 실제로 쓰려면 CPU 노드의 `cpu-power-states`가 이 노드를 가리켜야 합니다.

```dts
power-states {
    idle_state: idle-state {
        compatible = "zephyr,power-state";
        power-state-name = "suspend-to-idle";
        min-residency-us = <100>;
        exit-latency-us = <20>;
    };
};
```

기본 정책 `pm_policy_next_state()`는 가장 깊은 state부터 거꾸로 보면서, lock이 걸린 state와 exit latency가 허용 latency 이상인 state를 건너뛰고, 예상 유휴 시간이 `min_residency + exit_latency` 이상인 첫 state를 고릅니다([`subsys/pm/policy.c` L255-L277](https://github.com/zephyrproject-rtos/zephyr/blob/v3.7.0/subsys/pm/policy.c#L255-L277)). FreeRTOS는 이런 선택 표를 커널에 두지 않고 `configPRE_SLEEP_PROCESSING` hook에 맡긴다는 점이 다릅니다.

## TI ULP — Ultra Low Power 패턴

저전력 명령과 mode 이름은 MCU 계열마다 다릅니다. 위 Cortex-M의 `wfi` + SLEEPDEEP 조합과 달리 다른 계열은 다른 명령과 레지스터를 쓰므로, 이식할 때는 `configPRE_SLEEP_PROCESSING` hook 안의 코드만 그 계열의 데이터시트대로 바꿉니다. 이 장에서는 특정 MCU의 전류를 재지 않았습니다.

## 측정 — Current Profiler

전류 측정은 위 `idleEnergy()` 계산의 입력을 실제 값으로 바꾸는 일입니다. wake 한 번의 peak 전류와 지속 시간, sleep 전류를 각각 재야 하므로, 측정기의 샘플링 간격이 wake 지속 시간(위 가정에서 3 µs)보다 짧아야 합니다. 그보다 길면 peak가 평균에 묻혀 사라집니다. 평균 전류에서 배터리 수명을 구할 때는 배터리의 실제 가용 용량으로 나눕니다.

## 자주 하는 실수

- **정적 tickless 설정만 켜고 deep sleep을 기대합니다.** 포트 timer와 MCU 전원 모드는 별도 계약입니다.
- **기본 24-bit SysTick으로 긴 timeout 전체를 한 번에 잡는다고 생각합니다.** 25 MHz에서 671 tick, 168 MHz에서 99 tick이 한 번의 상한이고, QEMU에서 2,000 tick은 세 번 나눠 잤습니다.
- **hook과 포트가 WFI를 두 번 실행합니다.** hook에서 `x = 0;`으로 인자를 바꿉니다.
- **timer task를 잊습니다.** software timer의 만료도 timeout이라 sleep을 끊습니다(위 실험에서 `configUSE_TIMERS 0`으로 둔 이유).
- **짧은 유휴 구간에서도 무조건 깊게 잡니다.** Zephyr 정책처럼 `min_residency + exit_latency`보다 짧은 유휴에서는 깊은 state를 고르지 않습니다.

## 정리

- tickless는 유휴 tick interrupt를 줄이고 경과 시간을 커널에 보정하는 기능입니다.
- QEMU에서 tickless를 켜자 500 tick 동안 SysTick ISR이 500번에서 1번으로 줄었고 tick count는 그대로 500 전진했습니다.
- 한 번의 최대 suppression은 `0xFFFFFF / (tick당 count)`: 25 MHz 671 tick, 168 MHz 99 tick입니다.
- 기본 포트의 저전력은 `wfi`까지이고, 더 깊은 mode는 `configPRE_SLEEP_PROCESSING` hook에서 응용이 넣습니다.
- Zephyr는 `min_residency + exit_latency`로 power state를 고릅니다.

다음 편은 Scheduler Latency 측정입니다. 그 뒤 추적·관찰 도구를 다루는 2-11이 이어집니다.

## 근거 자료

- [FreeRTOS V11.2.0 ARM_CM4F port.c](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/portable/GCC/ARM_CM4F/port.c): 실제 tickless 분기·최대 suppressed tick·hook 계약.
- [같은 태그 tasks.c](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/tasks.c): idle·sleep 확인·vTaskStepTick.
- [Zephyr 3.7.0 System Power Management](https://docs.zephyrproject.org/3.7.0/services/pm/system.html), [`subsys/pm/policy.c`](https://github.com/zephyrproject-rtos/zephyr/blob/v3.7.0/subsys/pm/policy.c): 정책·power state 선택.
- ARM DDI 0403E.b B1.5.17(Power management), B1.5.19(WFI), B3.2.7(SCR.SLEEPDEEP).
- QEMU 실험: `tickless.c`, FreeRTOS V11.2.0 `ARM_CM3`, arm-none-eabi-gcc 16.2.0, QEMU 11.1.3 `mps2-an385 -icount shift=5`.

## 관련 항목

- [2-08: Tick과 타이머](/blog/embedded/rtos/practical-internals/part2-08-tick-timer)
- [2-10: Scheduler Latency 측정](/blog/embedded/rtos/practical-internals/part2-10-scheduler-latency)
- [1-04: Preemption (tickless 도입)](/blog/embedded/rtos/practical-internals/part1-04-preemption)
