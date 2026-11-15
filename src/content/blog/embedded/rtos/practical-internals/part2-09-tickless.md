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

주기 interrupt가 있으면 할 일이 없어도 CPU가 깨어날 수 있습니다. 그 추가 전하를 sleep 전류와 함께 계산하면 tick suppression의 이득을 추정할 수 있습니다. 다음은 **측정값이 아닌 가정**이며 같은 부하 조건을 비교하는 계산 예제입니다.

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

10 mA active를 3 µs, 1 µA sleep을 나머지 997 µs로 가정하면 평균은 30.997 µA이고 연간 약 271.53 mAh입니다. 이는 평균 mA가 아니며 배터리 용량 없이 “일주일도 못 간다”고 결론낼 수 없습니다. tickless 뒤에도 센서·radio·regulator·누설·wake 비용은 남으므로 실제 전류 파형을 비교해야 합니다.

## 동작 원리

1. Idle 경로가 다음 timeout까지의 유휴 예상 시간을 구합니다. 실행 가능한 작업이나 설정에 따라 sleep에 진입하지 않을 수도 있습니다.
2. 포트가 timer 폭에 맞춰 예상 시간을 제한하고, 예외 마스크 아래에서 sleep 허용 여부를 다시 확인합니다.
3. 현재 tick의 남은 부분과 pending tick을 고려하여 timer를 긴 interval로 재설정합니다.
4. pre-sleep hook과 WFI를 수행하고, wake 뒤 post-sleep 처리와 clock 상태를 확인합니다.
5. timer 만료인지 다른 IRQ의 이른 wake인지 구분하고, 완료 tick과 다음 부분 tick을 보정합니다.
6. 커널 tick을 적절히 전진시키고 정상 tick 및 interrupt 상태로 돌아옵니다.

이 흐름은 “모든 task가 blocked이면 정확히 그 시간만큼 잔다”는 보장이 아닙니다. IRQ와 새 작업이 들어오면 sleep을 취소하거나 일찍 깰 수 있습니다.

## FreeRTOS Tickless 구현

원본 vPortSuppressTicksAndSleep은 단순 WFI wrapper보다 많은 경계 조건을 처리합니다. 이전의 축약 C처럼 변수·분기·계산이 생략된 코드를 완성 구현으로 설치하면 안 됩니다. 실제 코드 기준은 아래 링크한 port.c이며 주요 분기는 다음과 같습니다.

| 경계 | V11.2.0 ARM_CM4F의 처리 |
| --- | --- |
| timer 폭 | 24-bit counter로 표현 가능한 예상 tick 수로 제한 |
| 진입 race | interrupt 마스크 후 eTaskConfirmSleepModeStatus 재확인, 취소 가능 |
| CURRENT=0 | 다음 tick까지의 남은 counts 해석을 보정 |
| 이미 pending인 SysTick | pending을 정리하고 첫 tick 중복을 피하도록 보정 |
| 자체 WFI가 있는 pre-hook | 수정 가능한 idle 인자를 0으로 만들어 포트의 추가 WFI 생략 |
| SysTick 만료 wake | pending tick 하나가 별도 처리될 것을 고려하여 step 수 결정 |
| 다른 IRQ로 이른 wake | 실제 완료 tick과 다음 tick의 잔여 interval 계산 |
| 커널 전진 | vTaskStepTick의 다음 unblock 시점 계약을 지키며 적용 |

설정은 이 기능을 포함시키는 조건일 뿐 하드웨어 저전력 모드가 자동으로 준비됐다는 뜻이 아닙니다.

```c
#define configUSE_TICKLESS_IDLE 1
#define configEXPECTED_IDLE_TIME_BEFORE_SLEEP 2
```

168 MHz SysTick 입력과 1 kHz tick이면 counts/tick은 168,000입니다. 원본의 보수적인 최대 suppressed tick 계산 floor(0xFFFFFF / 168000)는 **99 tick, 약 99 ms**입니다. 긴 timeout이 있어도 이 기본 포트가 한 번에 59초를 잔다고 할 수 없습니다. 더 긴 interval에는 지원 clock 설정 또는 다른 저전력 timer를 사용하는 별도 포트 구현이 필요합니다.

## Power Modes — Cortex-M

Sleep·Stop·Standby 이름과 전류·retention·wake latency는 **MCU별 전원 모드**입니다. Cortex-M ISA가 모든 칩에 같은 전류 범위와 동작을 규정하지 않습니다. WFI는 대기 명령이며 SLEEPDEEP와 MCU 전원 제어 설정에 따라 실제 진입 상태가 달라집니다.

| 확인 항목 | 필요한 근거 |
| --- | --- |
| clock | SysTick·peripheral·저전력 counter 중 무엇이 계속 동작하는가? |
| retention | SRAM·CPU context·전원 domain이 유지되는가? |
| wake | 선택 mode에서 어떤 IRQ·pin·alarm이 실제로 가능한가? |
| 복귀 | 명령 다음으로 재개하는가, reset 경로를 타는가? |
| 시간 예산 | 진입·복귀 시간과 clock 안정화가 다음 deadline 안에 드는가? |

pre/post hook은 MCU의 실제 전원·clock·driver 계약에 맞춰 구현합니다. hook 안에서 이미 WFI를 실행했다면 **호출자의 수정 가능한 idle 인자**를 0으로 만드는 매크로/참조 계약이 필요합니다. 값을 복사해 받는 함수의 지역 인자만 0으로 만들어서는 원본 포트의 두 번째 WFI를 막을 수 없습니다.

HAL tick이 RTOS와 같은 SysTick을 쓰는지도 확인합니다. HAL_SuspendTick을 무조건 호출하거나 clock이 멈춘 SysTick만 유지한 채 Stop에 들어가면 timeout과 복귀 보정이 어긋날 수 있습니다. 이식 코드는 device·clock·timer를 한 세트로 검증해야 합니다.

## Wake Source 보장

wake source는 선택한 sleep mode에서 살아 있어야 하고, 다음 timeout 전에 깨울 수 있어야 합니다. 재설정한 SysTick 자체가 wake source일 수 있으며 더 깊은 mode에서 그 clock이 멈춘다면 RTC·저전력 timer·외부 pin 등 지원 source를 준비합니다. watchdog reset은 context를 보존한 interrupt 복귀와 다릅니다.

예를 들어 1분 간격 센서 작업이 block해도, 기본 ARM_CM4F SysTick 포트는 앞 절의 최대 suppression interval마다 깰 수 있습니다. radio·DMA·다른 task의 timeout과 IRQ도 유휴 시간을 나눕니다. 작업이 0.1초이고 주기가 정확히 60초라는 **가정**이면 해당 작업만의 duty cycle은 약 0.167%지만 시스템 전체 소비 전류나 한 번의 sleep 시간을 뜻하지는 않습니다.

## RTC alarm 활용

RTC 또는 저전력 counter는 시스템 clock이 멈추는 mode에서 wake와 경과 시간 측정에 사용할 수 있습니다. 실제 주파수·prescaler·subsecond·alarm 해상도·wrap·IRQ pending 정리와 clock domain을 확인해야 합니다.

Standby라는 이름만으로 모든 MCU가 같은 reset/retention 동작을 보장하지 않습니다. reset형 mode라면 태스크 스택을 보존한 일반 tickless 복귀와 다른 부팅·상태 복구 설계가 필요합니다. 위 코드에 RTC alarm 한 번을 추가하는 것으로 이 계약을 대신하지 않습니다.

## Zephyr Power Management

Zephyr **3.7.0**의 system PM은 CONFIG_PM과 플랫폼이 정의한 power state, wake source 및 정책에 따라 동작합니다. 아래는 power-state 노드의 **부분 DTS 예시**이며 해당 CPU의 cpu-power-states 참조와 SoC 지원 등이 더 필요합니다.

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

residency 정책은 예상 유휴 시간이 min-residency와 exit-latency의 합 이상인지 등의 조건을 봅니다. lock이나 device 상태도 선택을 제한할 수 있습니다. 이 구조만으로 모든 보드가 자동 저전력화되거나 FreeRTOS보다 우월하다고 평가하지 않습니다.

## TI ULP — Ultra Low Power 패턴

저전력 명령과 mode 이름도 MCU 계열별로 다릅니다. MSP430의 LPM 명칭을 Cortex-M 기반 wireless MCU에 그대로 적용해서는 안 됩니다.

반복 작업 뒤 sleep하는 구조에서는 데이터시트가 규정한 mode 진입·IRQ 복귀·clock 유지 조건을 확인합니다. 저전력 내장 함수 이름 하나와 “수 µA”라는 수치만으로 서로 다른 칩의 전류나 RTOS 복귀 동작을 설명할 수는 없습니다.

## 측정 — Current Profiler

Otii Arc·Power Profiler Kit II·Joulescope 같은 도구나 shunt와 oscilloscope를 사용할 때는 **해당 모델·range·샘플링률의 사양**을 확인합니다. 분해능, 정확도, noise floor와 dynamic range는 서로 다른 지표이며 특정 nA 분해능을 모든 range의 정확도로 제시하면 안 됩니다.

전원 경로와 측정기 burden voltage, active peak·짧은 wake·sleep baseline을 포함해 전류를 적분합니다. 배터리 수명 추정에는 실제 가용 용량, 전압·온도·pulse 부하·자가 방전·regulator 효율도 반영합니다. 단일 평균 전류로 수명을 정확히 보장할 수는 없습니다.

## 자주 하는 실수

- **정적 tickless 설정만 켜고 deep sleep을 기대합니다.** 포트 timer와 MCU 전원 모드는 별도 계약입니다.
- **기본 24-bit SysTick으로 긴 timeout 전체를 한 번에 잡습니다.** 최대 interval을 계산하고 조기 wake·반복 sleep을 검증합니다.
- **hook과 포트가 WFI를 두 번 실행합니다.** 수정 가능한 idle 인자를 바꾸는 방식까지 확인합니다.
- **항상 같은 clock으로 복귀한다고 가정합니다.** MCU의 mode별 복귀 clock과 peripheral 재개 절차를 따릅니다.
- **RTC만 유일한 wake source라고 단정합니다.** mode·SoC가 지원하는 source를 확인합니다.
- **짧은 유휴 구간에서도 무조건 깊게 잡니다.** 진입·복귀 energy와 latency가 이득을 상쇄할 수 있습니다.

## 정리

- tickless는 유휴 tick interrupt를 줄이고 경과 시간을 커널에 보정하는 기능입니다.
- ARM_CM4F 기본 포트는 24-bit timer 한계·pending tick·조기 wake·부분 tick을 함께 처리합니다.
- 168 MHz/1 kHz 예에서는 원본 계산의 최대 suppression이 99 tick입니다.
- deep sleep·retention·wake source·clock 복귀는 MCU별로 검증해야 합니다.
- 평균 전류 계산과 실제 배터리 수명 보장은 구분해야 합니다.

다음 편은 Scheduler Latency 측정입니다. 그 뒤 추적·관찰 도구를 다루는 2-11이 이어집니다.

## 근거 자료

- [FreeRTOS V11.2.0 ARM_CM4F port.c](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/portable/GCC/ARM_CM4F/port.c): 실제 tickless 분기·최대 suppressed tick·hook 계약.
- [같은 태그 tasks.c](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/tasks.c): idle·sleep 확인·vTaskStepTick.
- [Zephyr 3.7.0 System Power Management](https://docs.zephyrproject.org/3.7.0/services/pm/system.html): 정책·wake source·power state 선택.

## 관련 항목

- [2-08: Tick과 타이머](/blog/embedded/rtos/practical-internals/part2-08-tick-timer)
- [2-10: Scheduler Latency 측정](/blog/embedded/rtos/practical-internals/part2-10-scheduler-latency)
- [1-04: Preemption (tickless 도입)](/blog/embedded/rtos/practical-internals/part1-04-preemption)
