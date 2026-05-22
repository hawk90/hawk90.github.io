---
title: "5-07: Bare-metal 프로파일링 — GPIO·DWT·SysTick·ITM"
date: 2026-05-08T45:00:00
description: "OS도 perf도 없는 환경에서 GPIO, DWT cycle counter, SysTick, ITM으로 측정하기."
series: "Embedded Performance Engineering"
seriesOrder: 46
tags: [baremetal, dwt, gpio, cycle-counter, itm, systick]
---

## 한 줄 요약

> **"Cortex-M에서는 GPIO toggle과 DWT cycle counter 두 가지면 거의 모든 측정이 가능하며, 둘 다 측정 overhead가 cycle 단위입니다."**

## 어떤 문제를 푸는가

Cortex-M0/M3/M4 같은 작은 MCU에는 OS도 없고 perf 같은 도구도 없습니다. printf는 UART 출력 자체가 ms 단위로 측정 결과를 왜곡합니다. ETM은 외부 probe가 있어야 하고, 코드가 chip의 ROM에서 실행될 수도 있습니다.

이런 환경에서 가장 신뢰할 수 있는 방법은 두 가지입니다. GPIO 핀을 toggle하고 오실로스코프나 로직 분석기로 시간을 측정하거나, 코어 내부의 DWT cycle counter를 읽어 두 시점 간 cycle 차이를 계산하는 방법입니다.

둘 다 measurement intrusion이 1-2 cycle이며, 실제 실행 환경을 거의 그대로 측정할 수 있습니다. 이 글에서는 두 방법과 SysTick, ITM도 함께 정리합니다.

## GPIO Toggle + 오실로스코프 — 가장 원시적이며 가장 정확

```c
/* STM32F4 예시 */
#define MEASURE_PIN GPIO_PIN_5
#define MEASURE_PORT GPIOA

static inline void measure_high(void) {
    MEASURE_PORT->BSRR = MEASURE_PIN;       /* 1 cycle */
}
static inline void measure_low(void) {
    MEASURE_PORT->BSRR = MEASURE_PIN << 16; /* 1 cycle */
}

void critical_section(void) {
    measure_high();
    do_work();
    measure_low();
}
```

오실로스코프로 핀의 high 구간을 측정하면 `do_work()`의 실행 시간이 ns 단위로 보입니다. ARM Cortex-M의 BSRR 레지스터 쓰기는 1 cycle이며, set과 clear가 한 레지스터에서 분리되어 read-modify-write가 없습니다.

이 방법의 강점은 다음과 같습니다.

```text
- 측정 overhead 1-2 cycle (예: 168 MHz에서 12 ns)
- 코어와 완전 독립적으로 측정 (오실로스코프가 별도 장비)
- 인터럽트와 메인 코드의 간섭을 외부에서 관찰
- 100 MHz 로직 분석기면 10 ns resolution
```

여러 GPIO를 동시에 사용하면 인터럽트 진입과 main task 실행을 같은 timeline에 겹쳐 볼 수 있습니다.

## DWT Cycle Counter — Cortex-M3 이상

DWT(Data Watchpoint and Trace) unit은 Cortex-M3 이상에 표준 포함된 디버그 ip이며, 32-bit free-running cycle counter를 제공합니다.

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

168 MHz에서 1 cycle은 약 6 ns이며, 32-bit counter는 약 25초 후 wrap-around합니다. 짧은 구간에는 영향이 없고, 긴 구간은 wrap 처리를 추가해야 합니다.

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

함수 호출 비용까지 포함하려면 inline 매크로가 안전합니다.

## SysTick — 24-bit Counter Alternative

DWT가 없는 Cortex-M0에서는 SysTick을 측정용으로 활용합니다. SysTick은 24-bit down counter라 측정 범위는 짧습니다.

```c
void systick_measure_init(void) {
    SysTick->LOAD = 0x00FFFFFF;                  /* max reload */
    SysTick->VAL = 0;
    SysTick->CTRL = SysTick_CTRL_CLKSOURCE_Msk
                  | SysTick_CTRL_ENABLE_Msk;     /* IRQ 비활성 */
}

uint32_t systick_now(void) {
    return SysTick->VAL;                         /* down counter */
}

uint32_t cycles_between(uint32_t start, uint32_t end) {
    return (start - end) & 0x00FFFFFF;
}
```

72 MHz에서 24-bit는 약 233 ms를 cover하므로 그 안의 짧은 구간 측정에만 적합합니다. OS의 tick 인터럽트로 SysTick을 이미 쓰고 있으면 별도 timer를 활용합니다.

## ITM — Instrumentation Trace Macrocell

ITM은 Cortex-M3 이상의 SWD pin을 통해 trace 데이터를 송신하는 unit입니다. printf 대체로 자주 쓰며 송신 비용이 매우 낮습니다.

```c
void itm_send_char(uint8_t ch) {
    if ((ITM->TCR & ITM_TCR_ITMENA_Msk) && (ITM->TER & 1)) {
        while (ITM->PORT[0].u32 == 0);
        ITM->PORT[0].u8 = ch;
    }
}
```

ST-Link와 J-Link 모두 SWO(Serial Wire Output) 핀으로 ITM stream을 받습니다. UART printf는 보통 1 character당 87 us(115200 baud)지만 ITM은 한 자에 100 ns 수준입니다.

ITM 32-channel을 정의해 channel별로 다른 종류의 trace를 분리할 수 있습니다.

```c
#define ITM_CH_FUNC_ENTRY  0
#define ITM_CH_FUNC_EXIT   1
#define ITM_CH_IRQ_ENTRY   2

ITM->PORT[ITM_CH_FUNC_ENTRY].u32 = (uint32_t)func_ptr;
```

## SEGGER SystemView — RTT 기반 RTOS Trace

SEGGER SystemView는 RTT(Real-Time Transfer)를 사용한 RTOS visualization 도구입니다. RTT는 target 메모리의 ring buffer를 J-Link가 직접 읽는 방식이라 송신 비용이 거의 0입니다.

```c
#include "SEGGER_SYSVIEW.h"

void SystemView_Init(void) {
    SEGGER_SYSVIEW_Conf();
    SEGGER_SYSVIEW_Start();
}

void critical_func(void) {
    SEGGER_SYSVIEW_RecordVoid(33);   /* 사용자 정의 이벤트 */
    do_work();
    SEGGER_SYSVIEW_RecordEndCall(33);
}
```

FreeRTOS, embOS, Zephyr 등 주요 RTOS 통합이 제공되며, task switch와 ISR이 자동 timeline에 표시됩니다. ETM이 없는 작은 MCU에서 가장 가벼운 RTOS trace 옵션입니다.

```text
RTT 송신 overhead   ~0.5 us per event
SystemView buffer   기본 4-8 KB
J-Link 수신 속도   ~1 MB/s
```

## 시나리오 — ISR 지연 측정

```c
/* 인터럽트 진입에서 GPIO high */
void EXTI0_IRQHandler(void) {
    GPIOA->BSRR = GPIO_PIN_5;        /* IRQ entry marker */

    uint32_t start = DWT->CYCCNT;
    handle_event();
    uint32_t cycles = DWT->CYCCNT - start;

    if (cycles > worst_case)
        worst_case = cycles;

    GPIOA->BSRR = GPIO_PIN_5 << 16;  /* IRQ exit marker */
    EXTI->PR = EXTI_PR_PR0;
}
```

오실로스코프로 GPIO의 high 구간 폭을 측정하면 ISR 총 시간을, `worst_case` 변수로 cycle 단위 최악값을 동시에 얻습니다. 외부 이벤트가 ISR을 trigger한 순간부터 ISR 진입까지의 hardware latency도 외부 trigger pin과 비교하면 볼 수 있습니다.

## 측정 — 정확도 비교

```text
방법             Overhead    Resolution   범위
GPIO + scope      1-2 cycle   10 ns        무제한
DWT CYCCNT        1-2 cycle   1 cycle      25초 (168 MHz)
SysTick           1-2 cycle   1 cycle      233 ms (72 MHz)
ITM printf        ~100 ns     단방향       유사 무제한
SystemView RTT    ~0.5 us     1 us         buffer 의존
SWO trace         ~10 ns      cycle        수신 대역폭 의존
ETM (외부 probe)   0           cycle        buffer 의존
```

가장 가벼우면서 정확한 조합은 GPIO toggle과 DWT cycle counter입니다. 두 가지를 같이 사용하면 인터럽트 latency와 함수 실행 시간을 동시에 측정할 수 있습니다.

## 자주 보는 함정과 안티패턴

> ⚠️ printf로 시간 측정

```c
printf("start\n");                       /* ~870 us */
do_work();
printf("end\n");                         /* ~870 us */
```

UART printf 자체가 측정하려는 함수보다 오래 걸리는 경우가 흔합니다. 측정용은 GPIO나 DWT로, 로깅은 별도로 분리합니다.

> ⚠️ Cache가 있는 코어에서 DWT만으로 평균만 측정

```c
for (int i = 0; i < 100; i++)
    cycles[i] = DWT_MEASURE(work());
```

첫 호출은 I-cache miss로 느리고 이후는 hit로 빠릅니다. cold/warm을 구분하지 않으면 의미가 흐려집니다.

> ⚠️ ITM과 SWO의 baud rate mismatch

```text
ST-Link Configuration에서 SWO 속도가 코어 클럭과 정수배로 나뉘어야 함
```

mismatch 시 character가 깨져 출력됩니다. 디버거의 SWO speed 설정과 시스템 클럭을 맞춰야 합니다.

> ⚠️ 32-bit CYCCNT의 wrap-around 무시

```c
uint32_t elapsed = end - start;          /* 차이 연산이 wrap-safe */
```

부호 없는 32-bit 뺄셈은 wrap이 자연스럽게 처리됩니다. signed로 캐스팅하면 음수가 나와 잘못 해석됩니다.

## 정리

- GPIO toggle과 오실로스코프는 가장 원시적이지만 정확하며 측정 overhead가 1-2 cycle입니다.
- DWT cycle counter는 Cortex-M3 이상에서 코드 한 줄로 cycle 단위 측정을 제공합니다.
- SysTick은 24-bit이라 짧은 구간 전용이며 Cortex-M0의 대체 수단입니다.
- ITM은 SWO pin으로 printf 대비 100배 빠른 trace 송신을 제공합니다.
- SEGGER SystemView는 RTT 기반으로 작은 MCU에서 가장 가벼운 RTOS visualization입니다.
- GPIO와 DWT를 조합하면 hardware latency와 software 시간을 같은 timeline에서 봅니다.

다음 편은 **Nsight Systems** — GPU와 NPU가 포함된 시스템 분석.

## 관련 항목

- [5-06: ARM DS / Lauterbach](/blog/embedded/performance-engineering/part5-06-arm-ds-lauterbach)
- [5-08: Nsight Systems](/blog/embedded/performance-engineering/part5-08-nsight)
- [Practical RTOS Internals 2-11: Tracing·Observability](/blog/embedded/rtos/practical-internals/part2-11-tracing-observability)
