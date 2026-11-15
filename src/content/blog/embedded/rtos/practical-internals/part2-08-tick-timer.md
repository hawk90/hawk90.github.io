---
title: "RTOS Tick과 타이머 — SysTick·Generic Timer·configTICK_RATE_HZ"
slug: "embedded/rtos/practical-internals/part2-08-tick-timer"
date: 2026-05-05T09:18:00
description: "FreeRTOS의 tick 주기와 SysTick 24비트 한계, delay 양자화와 timer 단위를 확인합니다. 1 kHz를 보편적 표준으로 가정하지 않고 설정·비용·정확도를 구분합니다."
series: "Practical RTOS Internals"
seriesOrder: 18
tags: [tick, systick, hw-timer, time-slice]
draft: false
topics: ["embedded", "embedded/rtos"]
---

## 한 줄 요약

Tick은 커널 timeout과 스케줄링 판단에 쓰는 시간 단위입니다. 주기와 소스는 포트·제품 요구에 맞춰 정하며 1 kHz가 모든 RTOS의 표준값인 것은 아닙니다. 이 글의 구체적인 SysTick 경로는 FreeRTOS **V11.2.0 GCC/ARM_CM4F**를 기준으로 합니다.

## Cortex-M SysTick

SysTick을 제공하는 Cortex-M 구성에서는 24-bit down-counter를 tick source로 사용할 수 있습니다. 실제 사용 여부·입력 클록·저전력 중 동작은 MCU와 포트 설정에 달려 있습니다. ARM_CM4F 원본은 configSYSTICK_CLOCK_HZ를 사용하며 별도 정의가 없으면 configCPU_CLOCK_HZ로 둡니다.

주기 counts는 입력 Hz를 tick Hz로 나눈 값이고 LOAD는 counts − 1입니다. 나누어떨어지지 않으면 실제 주파수가 요청값과 달라지므로, 아래 계산 예제는 **정확한 정수 분주만 허용하는 정책**을 택합니다. 원본 포트의 레지스터 초기화 전체가 아닙니다.

```c title="systick-period.c"
#include <stdbool.h>
#include <stdint.h>
bool systick_reload(uint32_t input_hz, uint32_t tick_hz,
                    uint32_t *reload) {
    if (reload == 0 || tick_hz == 0 || input_hz < tick_hz ||
        input_hz % tick_hz != 0) return false;
    uint32_t counts = input_hz / tick_hz;
    if (counts > UINT32_C(0x1000000)) return false;
    *reload = counts - 1;
    return true;
}
```

168 MHz 입력을 1 kHz로 나누면 168,000 counts이고 LOAD는 167,999입니다. 입력값과 24-bit 범위를 확인한 뒤 실제 포트는 counter 정지·현재값 clear·LOAD·CTRL 설정을 수행합니다.

## SysTick Handler

원본 xPortSysTickHandler는 RTOS API 가능 IRQ를 마스크하고 xTaskIncrementTick을 호출합니다. 전환이 필요하다는 반환값을 받으면 PendSV를 pending으로 만들고 마스크를 해제합니다. 실제 context 저장·복원은 PendSV가 처리합니다.

xTaskIncrementTick은 tick을 갱신하고 만료된 delayed task를 ready로 옮깁니다. 선점·time slicing 설정에 따라 전환 필요를 표시하지만, 동일 우선순위 ready list의 다음 항목 선택은 실제 스케줄러 경로에서 일어납니다. 스케줄러가 suspend된 동안의 pended tick 처리도 별도입니다.

## Tick Rate Trade-off

| 예시 rate | 주기 | 검토할 조건 |
| --- | --- | --- |
| 100 Hz | 10 ms | timeout 양자화가 요구에 충분한가? |
| 500 Hz | 2 ms | timer counts와 부하가 적절한가? |
| 1 kHz | 1 ms | 예시 설정이며 범용 표준값은 아님 |
| 10 kHz | 100 µs | tick ISR 비용과 counter 범위를 감당하는가? |

vTaskDelay(1)은 다음 tick 경계까지 block하므로 호출 위상에 따라 block 시간은 거의 0부터 한 tick 사이입니다. 만료는 ready가 되는 시점이며 실제 실행은 스케줄러와 다른 부하로 더 늦어질 수 있습니다. “1 tick은 항상 정확히 1 ms 대기”라는 뜻이 아닙니다.

pdMS_TO_TICKS는 단위 변환이며 기본 정수 연산에서 작은 양의 ms가 0 tick으로 내려갈 수 있습니다. 필요한 최소 지연·반올림·중간 곱셈 overflow를 설정별로 검토해야 합니다.

## Tick Overhead

tick의 CPU 점유율은 **한 번의 실제 tick 처리 시간 × 초당 tick 수**로 추정할 수 있습니다. 예를 들어 처리 시간이 3 µs로 측정됐다는 가정에서 1 kHz는 0.3%, 10 kHz는 3%입니다. 이는 계산 예시이며 이 글에서 얻은 실측 결과가 아닙니다.

만료 task 수·trace hook·메모리·중첩 IRQ에 따라 비용이 달라집니다. 예외 entry나 tail-chain의 이상적인 명령 cycle을 합쳐 커널 전체의 비용으로 사용하지 않습니다. 평균 점유율과 최악 응답 시간은 각각 확인해야 합니다.

## Cortex-A Generic Timer

AArch64에서 사용할 수 있는 Generic Timer의 physical counter 예를 들면 CNTFRQ_EL0는 보고된 counter frequency, CNTPCT_EL0는 counter 값, CNTP_CVAL_EL0는 compare 값과 관련됩니다. 접근 권한·virtual timer·인터럽트 라우팅은 실행 EL과 플랫폼 설정에 달려 있습니다. Cortex-A9의 AArch32 전용 포트와 같은 레지스터 이름으로 혼합하지 않습니다.

```c
/* Conceptual API: board/privilege-specific accessors are required. */
uint64_t deadline = read_physical_counter() + period_counts;
write_physical_compare(deadline);
```

24 MHz에서 64-bit 전체 범위를 한 바퀴 도는 산술 시간은 약 24,356년입니다. 다만 실제 counter 구현 폭과 초기값·접근 계약을 먼저 확인해야 하며 “wrap은 절대 없다”는 코드 가정으로 바꾸면 안 됩니다.

## RISC-V — mtime / mtimecmp

RISC-V machine timer가 제공되는 플랫폼에서는 unsigned mtime과 mtimecmp 비교가 timer interrupt pending 조건을 만듭니다. 이것은 PLIC의 timer 레지스터가 아니며 주소와 interrupt routing은 플랫폼에 따라 다릅니다. CLINT 이름과 예시 주소를 모든 MCU에 적용하지 않습니다.

RV32에서는 64-bit volatile 접근 한 번이 원자적이라고 가정할 수 없습니다. 안정적인 mtime 읽기에는 상위/하위/상위 재확인 같은 절차가 필요하고, mtimecmp 갱신도 중간 비교로 인한 의도하지 않은 interrupt를 피해야 합니다. 공식 machine ISA의 little-endian RV32 예는 low word를 최댓값으로 쓴 뒤 high, 마지막 low를 갱신합니다. 실제 코드는 vendor의 검증된 accessor를 사용합니다.

counter가 64-bit여도 compare 이후 pending 반영·해제 지연과 wrap 경계는 고려해야 합니다. 주소가 없는 이 설명만으로 장치 timer 설정을 완료할 수는 없습니다.

## Time Slicing

FreeRTOS의 선점형 구성에서 configUSE_TIME_SLICING=1이면 tick 처리 중 같은 최고 우선순위 ready task가 둘 이상일 때 전환을 요청할 수 있습니다. 매 tick마다 항상 태스크가 바뀌는 것은 아닙니다.

configUSE_TIME_SLICING=0은 **tick에 의한 자동 slicing**을 끕니다. 명시적 yield뿐 아니라 blocking·우선순위 변화·다른 스케줄링 계기로 동일 우선순위 task가 선택될 수도 있습니다. 이미 앞 장에서 실제 POSIX kernel로 확인한 것처럼 slicing을 꺼도 명시적 yield의 회전은 남습니다.

## vTaskDelay vs vTaskDelayUntil

vTaskDelay는 호출 시점의 tick을 기준으로 상대 대기합니다. 주기 작업에는 이전 기준 tick을 갱신하는 xTaskDelayUntil을 사용할 수 있습니다. 다음은 configTICK_RATE_HZ=1000과 필요한 API 포함 설정을 전제로 한 예제입니다.

```c title="periodic-task.c"
#include "FreeRTOS.h"
#include "task.h"
extern void do_work(void);
extern void report_overrun(void);
void periodic_task(void *arg) {
    (void)arg;
    const TickType_t period = pdMS_TO_TICKS(100);
    configASSERT(period > 0);
    TickType_t previous = xTaskGetTickCount();
    for (;;) {
        do_work();
        if (xTaskDelayUntil(&previous, period) == pdFALSE)
            report_overrun();
    }
}
```

이 API는 다음 **기준 시각**을 유지하지만 실행 시각이나 deadline 충족을 보장하지 않습니다. 주기를 놓치면 block하지 않고 기준을 갱신하는 경우가 있으므로 반환값과 실제 응답 시간을 확인해야 합니다. vTaskDelayUntil은 호환 매크로로 제공될 수 있으며 새 코드는 해당 태그의 API 계약을 확인합니다.

## Tickless Idle

tickless idle은 유휴 구간의 주기 interrupt를 줄이도록 timer를 다음 필요한 시점에 맞추는 기법입니다. ARM_CM4F 기본 포트는 SysTick을 잠시 멈췄다가 긴 interval로 재설정하고, wake 후 완료 tick과 남은 부분 tick을 보정합니다.

단순히 클록 Hz에서 CURRENT를 빼는 식은 단위와 경계가 맞지 않습니다. 원본은 24-bit 한계·진입 중 pending tick·일찍 깨운 IRQ·COUNTFLAG·보정 오차·vTaskStepTick의 계약을 함께 처리합니다. 다음 장에서 이를 구분하며, 출처 없는 축약 C를 완성 포트처럼 제시하지 않습니다.

## Tick 정확도 — Drift

tick 정확도는 사용한 oscillator의 오차와 온도·보정·clock source, timer 정수 분주에 영향을 받습니다. HSI/HSE라는 이름만으로 ±1.5%나 ±50 ppm을 모든 MCU에 고정할 수는 없습니다.

가정한 주파수 오차 ε에 대해 하루의 시간 오차 크기는 86,400 × ε 초입니다. **가정값** 1.5%는 1,296초, 50 ppm은 4.32초입니다. 외부 crystal도 부품·보드·온도 특성에 의존하며, 장시간 동기화는 별도 clock discipline과 검증이 필요합니다.

## RTC와의 차이

| 항목 | RTC | RTOS tick |
| --- | --- | --- |
| 주된 역할 | 날짜·시각, 장기 경과·alarm 등 | 커널 timeout·스케줄링 기준 |
| 해상도·정확도 | RTC 구현·clock·보정별로 다름 | tick rate·clock·보정별로 다름 |
| 저전력 중 동작 | power domain과 mode별 확인 | 선택 timer와 clock에 따라 유지·중단·대체 |

RTC가 항상 초 단위이고 RTOS tick이 항상 µs 단위라는 구분은 성립하지 않습니다. tickless 중에는 다른 저전력 counter를 시간 기준으로 활용하는 포트도 있습니다.

## 자주 하는 실수

- **tick 단위를 ms로 간주합니다.** 변환 뒤 0 tick·overflow·실제 block 양자화까지 확인합니다.
- **SysTick을 끄기만 합니다.** 기본 tickless도 재설정한 SysTick으로 깰 수 있으며, 깊은 sleep에서 멈춘다면 살아 있는 다른 wake source와 시간 기준이 필요합니다.
- **clock 이름만으로 drift를 보장합니다.** 데이터시트·부품·온도·보정 조건을 확인합니다.
- **모든 짧은 대기를 vTaskDelay로 처리합니다.** sub-tick 요구에는 적절한 hardware timer나 bounded polling이 필요할 수 있습니다. busy wait의 CPU 점유와 스케줄링 영향도 따로 분석합니다.

## 정리

- tick source와 rate는 포트·제품 요구에 따라 정합니다.
- SysTick의 LOAD는 counts − 1이며 24-bit 한계와 정수 분주를 확인합니다.
- tick delay의 ready 시점과 실제 task 실행 시점은 다릅니다.
- time slicing을 꺼도 다른 스케줄링 계기의 전환은 남습니다.
- tickless·RTC·Generic Timer·mtime은 clock·권한·원자성 계약을 각각 확인해야 합니다.

다음 편에서는 tickless idle의 race 방지와 wake 후 보정을 구체적으로 살펴봅니다.

## 근거 자료

- [FreeRTOS V11.2.0 ARM_CM4F port.c](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/portable/GCC/ARM_CM4F/port.c): SysTick setup·tickless.
- [같은 태그 tasks.c](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/tasks.c), [task.h](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/include/task.h): tick·delay·time slicing.
- [RISC-V Machine-Level ISA 1.13](https://docs.riscv.org/reference/isa/v20260120/priv/machine.html): machine timer·RV32 64-bit 접근.

## 관련 항목

- [1-04: Preemption (tickless)](/blog/embedded/rtos/practical-internals/part1-04-preemption)
- [2-09: Tickless 모드 구현](/blog/embedded/rtos/practical-internals/part2-09-tickless)
