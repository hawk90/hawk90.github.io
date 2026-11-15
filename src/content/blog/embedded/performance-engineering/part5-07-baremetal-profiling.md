---
title: "Bare-metal 프로파일링 — GPIO·DWT·SysTick·ITM 활용"
slug: "embedded/performance-engineering/part5-07-baremetal-profiling"
date: 2026-04-27T09:06:00
description: "OS도 perf도 없는 환경에서 GPIO, DWT cycle counter, SysTick, ITM으로 측정하기."
series: "Embedded Performance Engineering"
seriesOrder: 46
tags: [bare-metal, dwt, gpio, cycle-counter, itm, systick]
topics: ["embedded"]
---

## 한 줄 요약

> **"MCU에서 외부 GPIO 관측과 구현된 cycle counter는 서로 다른 측정 관점을 제공합니다."**

## 어떤 문제를 푸는가

Cortex-M0/M3/M4 같은 작은 MCU에는 OS도 없고 perf 같은 도구도 없습니다. printf는 UART 출력 자체가 ms 단위로 측정 결과를 왜곡합니다. ETM은 외부 probe가 있어야 하고, 코드가 chip의 ROM에서 실행될 수도 있습니다.

이런 환경에서 가장 신뢰할 수 있는 방법은 두 가지입니다. GPIO 핀을 toggle하고 오실로스코프나 로직 분석기로 시간을 측정하거나, 코어 내부의 DWT cycle counter를 읽어 두 시점 간 cycle 차이를 계산하는 방법입니다.

두 방법의 resolution과 instrumentation 영향은 GPIO 경로·counter 접근·계측기 구성에 따라 달라집니다. 이 글에서는 SysTick과 ITM을 포함해 대상 MCU에서 확인할 지점을 정리합니다.

이 장은 [CMSIS-Core SysTick 문서](https://arm-software.github.io/CMSIS_6/latest/Core/group__SysTick__gr.html)와 register API의 전제를 확인한 예입니다. Board·GPIO·DWT·ITM·SystemView 실행은 하지 않았습니다. Register code는 대상 BSP에서 clock·pin·권한·feature를 초기화한 뒤 적용할 설명용 조각입니다.

## GPIO Toggle + 오실로스코프 — 외부 관찰

```c
/* STM32F4 예시 */
#define MEASURE_PIN GPIO_PIN_5
#define MEASURE_PORT GPIOA

static inline void measure_high(void) {
    MEASURE_PORT->BSRR = MEASURE_PIN;       /* measured GPIO write */
}
static inline void measure_low(void) {
    MEASURE_PORT->BSRR = MEASURE_PIN << 16; /* measured GPIO write */
}

void critical_section(void) {
    measure_high();
    do_work();
    measure_low();
}
```

오실로스코프로 핀의 high 구간을 측정하면 GPIO의 실제 edge 사이 구간이 보입니다. 함수 앞뒤 store·bus·pin 경로까지 포함할 수 있으며 계측기 표본 간격과 정확도는 다릅니다. STM32의 BSRR는 set/clear 동작을 제공해 ODR을 읽고 수정하는 패턴을 피할 수 있습니다. 실제 write latency는 peripheral bus와 clock에 따라 측정합니다.

이 방법의 강점은 다음과 같습니다.

- GPIO write의 시간 비용은 코어·버스·주변장치 경로와 compiler 설정에 따라 달라지므로, 기준 신호와 비교해 보정합니다.
- 코어와 완전히 독립적으로 측정합니다 (오실로스코프가 별도 장비).
- 인터럽트와 메인 코드의 간섭을 외부에서 관찰할 수 있습니다.
- 100 MHz sampling logic analyzer의 표본 간격은 10 ns입니다. 실제 timing accuracy는 장비 사양과 edge 설정을 확인합니다.

여러 GPIO를 동시에 사용하면 인터럽트 진입과 main task 실행을 같은 timeline에 겹쳐 볼 수 있습니다.

## DWT Cycle Counter — 구현 확인

CMSIS core register map은 [Cortex-M core별 DWT register 가용성](https://arm-software.github.io/CMSIS_6/latest/Core/group__Core__Register.html)을 확인하는 출발점입니다. 최종 확인은 target datasheet/TRM에서 합니다.

DWT(Data Watchpoint and Trace)와 `CYCCNT`의 제공 여부는 core와 SoC 구현에 따라 다릅니다. Cortex-M0/M0+에서는 사용할 수 없는 경우가 일반적이며, Cortex-M3 이상도 실제 target의 debug feature, lock/권한, `NOCYCCNT` 상태를 확인해야 합니다.

```c
#include "core_cm4.h"

void dwt_init(void) {
    CoreDebug->DEMCR |= CoreDebug_DEMCR_TRCENA_Msk;  /* trace 활성화 */
    DWT->CYCCNT = 0;
    DWT->CTRL |= DWT_CTRL_CYCCNTENA_Msk;             /* cycle counter on */
}

static inline uint32_t dwt_now(void) {
    return DWT->CYCCNT;
}
```

측정은 단순한 차이 계산입니다.

```c
uint32_t start = dwt_now();
do_work();
uint32_t elapsed = dwt_now() - start;

float us = (float)elapsed / (SystemCoreClock / 1000000.0f);
```

168MHz가 일정하고 counter가 계속 돈다는 가정이면 한 cycle은 약5.95ns, 32bit 주기는 약25.57초입니다. Unsigned 차이는 **실제 경과가 한 주기 미만**일 때 wrap을 포함해 유효합니다. 여러 번 wrap했거나 sleep/debug 중 counter가 멈췄다면 두 값만으로 복원할 수 없습니다.

```c
/* DWT 측정 매크로 */
#define DWT_MEASURE(code) ({                          \
    uint32_t _start = DWT->CYCCNT;                    \
    code;                                             \
    uint32_t _end = DWT->CYCCNT;                      \
    _end - _start;                                    \
})

uint32_t cycles = DWT_MEASURE(parse_packet(buf, len));
```

위 매크로는 GNU statement-expression을 쓴 설명용 조각입니다. Inline이 정확도·compiler 재배치 방지를 보증하지 않습니다. 최종 assembly·barrier 요구·계측 자체 비용을 target에서 확인합니다.

## SysTick — 24-bit Counter Alternative

DWT가 없거나 비활성화된 코어에서는 SysTick을 측정용으로 고려할 수 있습니다. SysTick은 24-bit down counter라 측정 범위는 짧습니다.

SysTick이 OS tick에 쓰이는지와 reload·clock·enable 상태를 먼저 확인합니다. 다음은 register를 만지지 않는 **down-counter 차이 계산 함수**입니다. 실제 elapsed가 한 주기 미만이고 두 읽기 사이 reload·clock이 바뀌지 않았다는 전제가 필요합니다.

```c title="down-counter.c"
#include <stdint.h>
#include <stdbool.h>
#include <stddef.h>

bool elapsed_down(uint32_t start, uint32_t end, uint32_t reload,
                  uint32_t *elapsed)
{
    if (elapsed == NULL || reload > 0x00ffffffu ||
        start > reload || end > reload)
        return false;
    uint32_t period = reload + 1u;
    *elapsed = start >= end ? start - end : start + period - end;
    return true;
}
```

Max24bit뿐 아니라 임의 reload의 wrap·동일 값·잘못된 범위를 host에서 검사했습니다. 동일 값은 이 전제에서0tick이며 여러 주기 경과 여부를 판별하지 못합니다. 72MHz·max reload라면 주기는 약233ms라는 계산 예이고 board에서 측정한 값은 아닙니다.

## ITM — Instrumentation Trace Macrocell

ITM은 구현된 stimulus port에 software event를 기록하는 경로입니다. SWD debug control과 SWO/TPIU trace 출력은 같은 개념이 아닙니다. Trace block·출력 routing·권한과 수신 장비 설정을 확인합니다.

준비되지 않은 port에 무한 대기하는 함수는 계측하려던 경로를 멈출 수 있습니다. Ready·enable·privilege·buffer 정책을 확인하고 drop·bounded wait를 설계합니다. Port 개수·지원 write width·timestamp는 target TRM에 따르며 무조건 모든32port가 같은 기능이라고 가정하지 않습니다.

## SEGGER SystemView — RTT 기반 RTOS Trace

SEGGER SystemView는 RTT(Real-Time Transfer)를 사용하는 RTOS visualization 도구입니다. RTT는 target memory buffer와 debug probe를 이용하며, 처리 비용과 영향은 target·buffer mode·probe 설정에 따릅니다.

[SEGGER SystemView](https://www.segger.com/products/development-tools/systemview/)의 recorder·RTOS integration과 RTT buffer mode는 선택한 release에서 확인합니다. 확인하지 않은 event ID·RecordEndCall 조합을 완성된 측정 예로 쓰지 않습니다. 이 환경에서는 SystemView나 RTT를 실행하지 않았습니다.

## ISR 경계의 측정

ISR 안에서 읽은 DWT 구간과 GPIO edge 구간은 exception entry/exit 전체를 포함하지 않을 수 있습니다. 외부 입력 event부터 ISR 진입까지의 latency, ISR body·nested interrupt·return을 별도로 정의하고 외부 trigger와 동기화해야 합니다. 관찰한 최대값을 자동으로 WCET라고 부르지 않습니다.

## 측정 — 정확도 비교

| 방법 | instrumentation 영향 | 시간 분해능 | 범위 |
|------|----------------------|------------|------|
| GPIO + scope | GPIO·버스·probe 경로에 따름 | scope/edge 설정에 따름 | 측정 설정에 따름 |
| DWT CYCCNT | register 접근·compiler 영향 | 구현된 counter tick | 32-bit counter라면 wrap 시점은 clock에 따름 |
| SysTick | register 접근·interrupt 설정에 따름 | timer tick | 24-bit down counter의 범위는 clock에 따름 |
| ITM/SWO | instrumentation·port throughput에 따름 | trace timestamp/config에 따름 | buffer와 수신 bandwidth에 따름 |
| SystemView RTT | recording mode와 buffer 상태에 따름 | target timer resolution에 따름 | buffer/host 처리에 따름 |
| ETM | trace 설정·target 영향에 따름 | trace timestamp/core에 따름 | probe buffer·bandwidth에 따름 |

GPIO·DWT는 서로 다른 관점의 교차 확인에 쓸 수 있습니다. 두 가지를 같이 사용하면 인터럽트 latency와 함수 실행 시간을 동시에 측정할 수 있습니다.

## 자주 보는 함정과 안티패턴

> ⚠️ printf로 시간 측정

```c
printf("start\n");                       /* output and formatting cost depend on setup */
do_work();
printf("end\n");                         /* output and formatting cost depend on setup */
```

UART printf 자체가 측정하려는 함수보다 오래 걸리는 경우가 흔합니다. 측정용은 GPIO나 DWT로, 로깅은 별도로 분리합니다.

> ⚠️ Cache가 있는 코어에서 DWT만으로 평균만 측정

```c
for (int i = 0; i < 100; i++)
    cycles[i] = DWT_MEASURE(work());
```

첫 호출은 I-cache miss로 느리고 이후는 hit로 빠릅니다. cold/warm을 구분하지 않으면 의미가 흐려집니다.

> ⚠️ ITM과 SWO의 baud rate mismatch

SWO의 clock source·prescaler·trace encoding·probe 수신 설정을 해당 target 문서로 확인합니다.

mismatch 시 character가 깨져 출력됩니다. 디버거의 SWO speed 설정과 시스템 클럭을 맞춰야 합니다.

> ⚠️ 32-bit CYCCNT의 wrap-around 무시

```c
uint32_t elapsed = end - start;          /* 차이 연산이 wrap-safe */
```

부호 없는32bit 뺄셈은 실제 경과가 한 주기 미만이고 counter가 연속 동작한다는 전제에서 wrap을 처리합니다. signed로 캐스팅하면 음수가 나와 잘못 해석됩니다.

## 정리

- GPIO toggle과 오실로스코프는 외부에서 핀 변화를 관찰하며, GPIO·버스·계측기 경로를 고려해 보정합니다.
- DWT cycle counter는 target이 해당 기능을 구현하고 활성화한 경우에만 사용할 수 있습니다.
- SysTick은 24-bit이라 짧은 구간 전용이며 Cortex-M0의 대체 수단입니다.
- ITM/SWO를 사용할 수 있는지는 MCU 구현과 board routing에 따르며, 전송 비용은 target setup에서 확인합니다.
- SystemView·RTT의 비용과 손실·buffer mode는 해당 target에서 평가합니다.
- GPIO와 DWT를 조합하면 hardware latency와 software 시간을 같은 timeline에서 봅니다.

다음 편은 **Nsight Systems** — GPU와 NPU가 포함된 시스템 분석.

## 관련 항목

- [5-06: ARM DS / Lauterbach](/blog/embedded/performance-engineering/part5-06-arm-ds-lauterbach)
- [5-08: Nsight Systems](/blog/embedded/performance-engineering/part5-08-nsight)
- [Practical RTOS Internals 2-11: Tracing·Observability](/blog/embedded/rtos/practical-internals/part2-11-tracing-observability)
- [Embedded Debugging: Trace 비교](/blog/tools/debugging/embedded/chapter06-trace) — RTT·ITM·SWO·ETM 중 어느 채널을 쓸지
