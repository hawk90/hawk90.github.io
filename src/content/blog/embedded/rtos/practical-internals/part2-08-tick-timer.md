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

ARMv7-M은 "An ARMv7-M implementation must include a system timer, SysTick"이라고 SysTick을 필수로 두고, reload 값은 SYST_RVR의 RELOAD, bits[23:0] 24비트입니다(DDI 0403E.b B3.3). 메트로놈처럼 정해진 간격으로 딸깍거리며 커널에 시간을 알려 주는 장치입니다. ARM_CM4F 원본은 `configSYSTICK_CLOCK_HZ`를 사용하며 별도 정의가 없으면 `configCPU_CLOCK_HZ`로 둡니다([`ARM_CM4F/port.c` L110-L111](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/portable/GCC/ARM_CM4F/port.c#L110-L111)).

주기 counts는 입력 Hz를 tick Hz로 나눈 값이고 LOAD는 counts − 1입니다. counter는 RELOAD에서 0까지 세고 다음 clock에 다시 RELOAD를 싣기 때문에(B3.3.1) 한 주기가 RELOAD + 1 count입니다. 나누어떨어지지 않으면 실제 주파수가 요청값과 달라지므로, 아래 계산 예제는 **정확한 정수 분주만 허용하는 정책**을 택합니다.

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

168 MHz 입력을 1 kHz로 나누면 168,000 counts이고 LOAD는 167,999입니다. 24비트 한계는 2²⁴ = 16,777,216 count이므로 25 MHz에서 한 주기는 최대 0.67초입니다. host에서 이 함수를 검사하면 다음과 같습니다(Apple clang 21.0.0).

```text
PASS systick_reload: 168MHz->167999, 25MHz->24999, 1Hz at 25MHz rejected (>2^24), 1MHz/3 rejected
```

이 시리즈의 QEMU config(`configCPU_CLOCK_HZ` 25 MHz, `configTICK_RATE_HZ` 1000)에서 scheduler가 시작된 뒤 SYST_RVR을 읽으면 `SYST_RVR=24999`로 같은 값입니다. FreeRTOS도 같은 식으로 `( configSYSTICK_CLOCK_HZ / configTICK_RATE_HZ ) - 1UL`을 LOAD에 씁니다(`ARM_CM4F/port.c` L828).

## SysTick Handler

원본 `xPortSysTickHandler`([`port.c` L560](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/portable/GCC/ARM_CM4F/port.c#L560))는 RTOS API 가능 IRQ를 마스크하고 `xTaskIncrementTick()`을 호출합니다. 전환이 필요하다는 반환값을 받으면 PendSV를 pending으로 만들고 마스크를 해제합니다. 실제 context 저장·복원은 PendSV가 처리합니다.

`xTaskIncrementTick()`은 tick을 갱신하고 만료된 delayed task를 ready로 옮깁니다(2-02). `pdTRUE`를 돌려주는 세 경로는 1-04에서 봤고, 같은 우선순위의 다음 task를 실제로 고르는 일은 PendSV 안의 `vTaskSwitchContext()`가 합니다(2-03). 스케줄러가 suspend된 동안에는 `xPendedTicks`만 올라갑니다(2-02).

## Tick Rate Trade-off

| rate | 주기 | `pdMS_TO_TICKS(1)` | 168 MHz에서 LOAD | 25 MHz에서 LOAD |
| --- | --- | ---: | ---: | ---: |
| 100 Hz | 10 ms | 0 | 1,679,999 | 249,999 |
| 500 Hz | 2 ms | 0 | 335,999 | 49,999 |
| 1 kHz | 1 ms | 1 | 167,999 | 24,999 |
| 10 kHz | 100 µs | 10 | 16,799 | 2,499 |

모든 LOAD가 24비트(16,777,215) 안에 들어갑니다. `configTICK_RATE_HZ`는 `FreeRTOS.h`에 기본값이 없어 FreeRTOSConfig.h에서 반드시 정해야 합니다. 커널이 정한 표준 rate는 없습니다.

`vTaskDelay(1)`은 다음 tick 경계까지 block하므로 호출 위상에 따라 block 시간은 거의 0부터 한 tick 사이입니다. 1-04의 QEMU 실험에서 같은 `vTaskDelay(1)`이 1.00 tick과 0.10 tick을 쉬었습니다. 만료는 ready가 되는 시점이며 실제 실행은 더 높은 task와 ISR이 끝난 뒤입니다.

`pdMS_TO_TICKS(ms)`는 `( uint64_t ) ms * configTICK_RATE_HZ / 1000`을 `TickType_t`로 자릅니다([`projdefs.h`](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/include/projdefs.h) L42). 그래서 100 Hz와 500 Hz에서 1 ms는 0 tick이 됩니다. 64비트로 곱하므로 중간 곱셈은 넘치지 않습니다.

## Tick Overhead

tick의 CPU 점유율은 **한 번의 tick 처리 시간 × 초당 tick 수**입니다. QEMU에서 task 하나가 SysTick 현재값을 쉬지 않고 읽게 하고, 연속한 두 읽기 사이의 간격을 200 tick 동안 기록했습니다. tick ISR이 끼어든 순간만 간격이 벌어집니다.

```c title="tickcost.c (발췌)"
  uint32_t prev=now(), maxgap=0, mingap=~0u; unsigned n=0, ticks0=xTaskGetTickCount();
  while(xTaskGetTickCount()-ticks0 < 200){ uint32_t x=now(); uint32_t g=x-prev; prev=x; if(g>maxgap) maxgap=g; if(g<mingap) mingap=g; n++; }
```

```text
SYST_RVR=24999
200 ticks, 189124 polls: min gap=26 max gap=66 -> tick ISR adds about 40 counts = 0.16% of a 1 kHz tick
```

깨어나는 task도 전환도 없는 tick 하나가 약 40 count였고, 1 kHz에서는 tick 주기의 0.16%입니다. 같은 비용이면 10 kHz에서 1.6%입니다. count는 QEMU icount 가상 시간(명령 수에 비례)이라 실제 보드의 µs가 아닙니다. 그래도 비율은 이렇게 잽니다. tick에 task가 깨어나면 delayed list 처리와 PendSV 전환이 더해져, 1-10의 측정처럼 128 count 이상이 됩니다.

## Cortex-A Generic Timer

AArch64 Generic Timer에서 CNTFRQ_EL0는 counter frequency, CNTPCT_EL0는 physical counter 값, CNTP_CVAL_EL0는 compare 값입니다. QEMU 11.1.3 `qemu-system-aarch64 -M virt -cpu cortex-a53`에서 EL1 bare-metal로 읽으면 `CNTFRQ_EL0=0x0000000003b9aca0`(62,500,000 Hz)와 `CurrentEL=0x1`(레지스터의 EL 필드, 즉 값을 2 bit 오른쪽으로 민 값으로 EL1)이 나왔고, 짧은 loop 전후의 CNTPCT_EL0 차이는 실행마다 달랐습니다(icount 없이 돌림). CNTFRQ_EL0 값은 보드마다 firmware가 정해 쓰는 값이므로 62.5 MHz는 QEMU `virt`의 값입니다. Cortex-A9의 AArch32 포트(2-06)는 이 레지스터 이름을 쓰지 않습니다.

```c
/* Conceptual API: board/privilege-specific accessors are required. */
uint64_t deadline = read_physical_counter() + period_counts;
write_physical_compare(deadline);
```

24 MHz에서 64-bit 전체 범위를 한 바퀴 도는 산술 시간은 약 24,356년이고, QEMU의 62.5 MHz에서는 약 9,353년입니다. 그래도 비교는 1-01·2-02처럼 unsigned 뺄셈으로 하면 wrap 여부를 따질 필요가 없습니다.

## RISC-V — mtime / mtimecmp

RISC-V privileged spec은 mtime을 "a real-time counter, exposed as a memory-mapped machine-mode read-write register"로 두고 "The mtime register has a 64-bit precision on all RV32 and RV64 systems", "The mtime register will wrap around if the count overflows"라고 적습니다([Machine-Level ISA](https://docs.riscv.org/reference/isa/v20260120/priv/machine.html) "Machine Timer Registers"). mtime이 mtimecmp 이상이 되면 machine timer interrupt가 pending됩니다. 주소는 플랫폼이 정하며, FreeRTOS RISC-V 포트는 `configMTIME_BASE_ADDRESS`·`configMTIMECMP_BASE_ADDRESS`로 받습니다(2-07).

RV32에서는 64비트 레지스터를 32비트로 두 번 나눠 써야 하므로 중간값 때문에 원치 않는 interrupt가 생길 수 있습니다. spec의 little-endian RV32 예제는 low word에 −1을 먼저 쓰고, 그다음 high, 마지막에 low를 씁니다. spec 설명대로 "Storing -1 to the low-order bits of mtimecmp prevents mtimecmp from temporarily becoming smaller than the lesser of the old and new values" 때문입니다.

```text
# New comparand is in a1:a0.
li t0, -1
la t1, mtimecmp
sw t0, 0(t1)     # No smaller than old value.
sw a1, 4(t1)     # No smaller than new value.
sw a0, 0(t1)     # New value.
```

## Time Slicing

FreeRTOS의 선점형 구성에서 `configUSE_TIME_SLICING=1`이면 tick 처리 중 현재 task의 우선순위 ready list에 task가 둘 이상일 때 전환을 요청합니다(`tasks.c` L4861-L4872). 하나뿐이면 tick이 와도 같은 task가 계속 돕니다.

`configUSE_TIME_SLICING=0`은 **tick에 의한 자동 slicing**을 끕니다. 1-03의 QEMU 실험에서 이 설정의 A·B는 tick마다 번갈아 돌지 않았지만, 우선순위 5의 task가 선점했다 잠든 뒤에는 A 대신 B가 이어받았습니다. 2-03의 POSIX 실험처럼 명시적 yield의 회전도 남습니다.

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

이 API는 다음 **기준 시각**을 유지하지만 실행 시각이나 deadline 충족을 보장하지 않습니다. 1-01의 QEMU 실험처럼 주기를 놓치면 block하지 않고 `pdFALSE`를 돌려주며, 기준은 현재 tick이 아니라 `period`만큼만 전진합니다. 그래서 놓친 주기를 따라잡느라 연달아 실행합니다. 옛 이름 `vTaskDelayUntil()`은 V11.2.0에서 `xTaskDelayUntil()`을 부르고 반환값을 버리는 매크로입니다([`task.h` L933-L936](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/include/task.h#L933-L936)). 반환값을 봐야 하므로 새 코드는 `xTaskDelayUntil()`을 씁니다.

## Tickless Idle

tickless idle은 유휴 구간의 주기 interrupt를 줄이도록 timer를 다음 필요한 시점에 맞추는 기법입니다. ARM_CM4F 기본 포트는 SysTick을 잠시 멈췄다가 긴 interval로 재설정하고(`portNVIC_SYSTICK_LOAD_REG = ulReloadValue;`, `port.c` L654), wake 후 완료 tick과 남은 부분 tick을 보정합니다(L723, L763, L777). 이 보정은 [2-09](/blog/embedded/rtos/practical-internals/part2-09-tickless)에서 따라갑니다.

## Tick 정확도 — Drift

tick 정확도는 SysTick 입력 clock의 정확도를 그대로 따릅니다. 커널은 clock을 보정하지 않고 count만 셉니다. 손목시계가 하루에 몇 초씩 빠르면 그 시계로 잰 알람도 똑같이 빠른 것과 같습니다.

주파수 오차 ε에 대해 하루의 시간 오차는 86,400 × ε 초입니다. 오차 1.5%라면 1,296초, 50 ppm이라면 4.32초입니다(가정값으로 한 산술). 실제 ε는 사용하는 oscillator의 데이터시트 값입니다. 정수 분주가 맞지 않을 때의 오차도 여기에 더해지므로, 위 `systick_reload()`는 나누어떨어지지 않는 조합을 거부합니다.

## RTC와의 차이

| 항목 | RTC | RTOS tick |
| --- | --- | --- |
| 주된 역할 | 날짜·시각, 장기 경과·alarm | 커널 timeout·스케줄링 기준 |
| 값 | 연월일시분초 | `TickType_t` 정수(32비트면 1 kHz에서 49.7일마다 wrap, 2-02) |
| 잠든 동안 | — (MCU별 RTC 사양, 이 장에서 다루지 않음) | 기본 Cortex-M tickless는 SysTick으로 깨어나 count를 보정(2-09) |

tick은 "부팅 뒤 몇 tick"만 알고 날짜를 모르므로, 날짜가 필요한 기능은 RTC를 따로 읽습니다.

## 자주 하는 실수

- **tick 단위를 ms로 간주합니다.** 100 Hz에서 `pdMS_TO_TICKS(1)`은 0이고, `vTaskDelay(0)`은 yield일 뿐입니다(2-02).
- **SysTick을 끄기만 합니다.** 기본 tickless는 늘린 SysTick 자체로 깨어나므로, SysTick이 멈추는 깊은 sleep에 들어가면 깨어날 시각을 잃습니다. 그런 MCU는 `vPortSuppressTicksAndSleep()`을 저전력 timer로 다시 구현합니다(weak 함수, 1-04).
- **clock 이름만으로 drift를 판단합니다.** tick 오차는 입력 clock의 ε를 그대로 따릅니다.
- **모든 짧은 대기를 vTaskDelay로 처리합니다.** 1 kHz tick에서 `vTaskDelay(1)`은 0~1 ms 사이를 쉬므로, 100 µs 같은 sub-tick 대기에는 쓸 수 없습니다. 하드웨어 timer interrupt로 task를 깨웁니다.

## 정리

- `configTICK_RATE_HZ`에는 기본값이 없고, 커널이 정한 표준 rate도 없습니다.
- SysTick의 LOAD는 counts − 1이고 24비트입니다. QEMU config에서 `SYST_RVR=24999`.
- 전환 없는 tick 하나는 QEMU 가상 시간으로 40 count, 1 kHz에서 0.16%였습니다.
- tick delay의 ready 시점과 실제 task 실행 시점은 다릅니다.
- time slicing을 꺼도 선점·yield 뒤의 회전은 남습니다.
- RV32의 64비트 mtimecmp는 low에 −1을 먼저 쓰는 순서로 갱신합니다.

다음 편에서는 tickless idle의 race 방지와 wake 후 보정을 구체적으로 살펴봅니다.

## 근거 자료

- [FreeRTOS V11.2.0 ARM_CM4F port.c](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/portable/GCC/ARM_CM4F/port.c): `configSYSTICK_CLOCK_HZ`(L110), `xPortSysTickHandler`(L560), tickless LOAD 갱신(L654-L777).
- ARM DDI 0403E.b B3.3(SysTick, SYST_RVR RELOAD bits[23:0]).
- QEMU 측정: `tickcost.c`(FreeRTOS V11.2.0 `ARM_CM3`, arm-none-eabi-gcc 16.2.0 `-O2`, `mps2-an385 -icount shift=5`), `gtimer.S`(clang 23.1.5 aarch64, `qemu-system-aarch64 -M virt -cpu cortex-a53`).
- [같은 태그 tasks.c](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/tasks.c), [task.h](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/include/task.h): tick·delay·time slicing.
- [RISC-V Machine-Level ISA 1.13](https://docs.riscv.org/reference/isa/v20260120/priv/machine.html): machine timer·RV32 64-bit 접근.

## 관련 항목

- [1-04: Preemption (tickless)](/blog/embedded/rtos/practical-internals/part1-04-preemption)
- [2-09: Tickless 모드 구현](/blog/embedded/rtos/practical-internals/part2-09-tickless)
