---
title: "Scheduler Latency 측정 기법 — GPIO Toggle·DWT·ftrace·cyclictest"
slug: "embedded/rtos/practical-internals/part2-10-scheduler-latency"
date: 2026-05-05T09:20:00
description: "IRQ 마커·ready·태스크 실행 사이의 지연을 GPIO와 DWT로 구분하고 Linux 추적 범위와 비교합니다. 관찰 최대값과 보장 상한을 분리합니다."
series: "Practical RTOS Internals"
seriesOrder: 20
tags: [scheduler, latency, measurement, dwt, gpio, ftrace, cyclictest]
draft: false
topics: ["embedded", "embedded/rtos"]
---

## 한 줄 요약

지연을 비교하려면 먼저 **시작 이벤트와 종료 이벤트**를 정해야 합니다. 이 글에서는 ISR 끝의 소프트웨어 마커부터 깨어난 task의 측정 지점까지를 관찰 구간으로 삼습니다. 유한 표본의 최대값은 관찰 최대값이며 hard real-time의 보장된 최악 응답 시간과 동일하지 않습니다.

## Latency 구간 정의

| 시점 | 관찰 대상 |
| --- | --- |
| t1 | 외부 event의 기준 edge |
| t2 | ISR 시작의 측정 지점 |
| t3 | ISR에서 task를 ready로 만드는 동작 |
| t4 | ISR 끝에 가까운 소프트웨어 마커 |
| t5 | PendSV 진입의 측정 지점 |
| t6 | 스케줄러 선택 |
| t7 | 깨어난 task가 대기 API에서 돌아온 뒤의 측정 지점 |

외부 event부터 ISR 마커까지는 t2−t1, ISR 끝 마커부터 task 마커까지는 t7−t4, 전체 wake 관찰은 t7−t1로 계산합니다. ready부터 실제 실행까지를 질문한다면 t7−t3가 맞습니다. t4는 하드웨어 exception return 완료와 같지 않으며 t7도 새 태스크 함수의 최초 진입과는 다를 수 있습니다.

GPIO·DWT·trace hook의 코드 위치와 실행 비용을 함께 기록해야 이 구간들을 비교할 수 있습니다. Linux의 sched_wakeup/sched_switch나 cyclictest도 서로 다른 시작·종료 이벤트를 사용합니다.

## GPIO Toggle 방법 — Bare-metal·간단

한 pin을 ISR에서 set/clear한 뒤 task에서 toggle하면 다음 반복에서 pin의 시작 상태가 달라져 edge가 사라질 수 있습니다. 다음은 **두 marker pin**을 쓰는 FreeRTOS V11.2.0 API 예제입니다. peripheral ACK·GPIO 접근·IRQ priority와 semaphore 생성은 보드 통합 코드가 제공해야 합니다.

```c title="latency-markers.c"
#include "FreeRTOS.h"
#include "task.h"
#include "semphr.h"
extern SemaphoreHandle_t sample_sem;
extern void ack_sample_irq(void);
extern void mark_isr_high(void), mark_isr_low(void);
extern void mark_task_high(void), mark_task_low(void);
void sample_irq(void) {
    BaseType_t woken = pdFALSE;
    mark_isr_high();
    ack_sample_irq();
    xSemaphoreGiveFromISR(sample_sem, &woken);
    mark_isr_low();
    portYIELD_FROM_ISR(woken);
}
void sample_task(void *arg) {
    (void)arg;
    for (;;) {
        if (xSemaphoreTake(sample_sem, portMAX_DELAY) == pdTRUE) {
            mark_task_high();
            mark_task_low();
        }
    }
}
```

반복 event가 합쳐지거나 queueing되지 않도록 **동시에 한 sample만 outstanding**인 실험부터 시작합니다. peripheral pending을 적절히 ACK하고 IRQ를 RTOS API 허용 우선순위로 설정합니다. marker 사이의 GPIO access 지연과 버스 ordering도 타깃에서 확인해야 합니다.

![ISR과 task의 별도 GPIO marker로 관찰하는 ISR 구간과 wake 지연](/images/blog/rtos/diagrams/part2-10-gpio-isr-trace.svg)

ISR pin의 하강 edge에서 task pin 상승 edge까지를 측정하면 t4–t7의 관찰 지연이 됩니다. ISR tail·PendSV·스케줄러·GPIO 계측 비용이 포함되므로 순수 context-switch cycle로 보고하지 않습니다.

## DWT Cycle Counter — Cortex-M

CYCCNT를 구현하고 접근이 허용된 Cortex-M에서는 DWT counter를 사용할 수 있습니다. 모든 Cortex-M이 제공하는 기능은 아니며 lock·debug·sleep 중 정지·clock 변화 등은 코어와 MCU 문서로 확인합니다. 일반적인 CMSIS 초기화 예는 다음과 같습니다.

```c
CoreDebug->DEMCR |= CoreDebug_DEMCR_TRCENA_Msk;
DWT->CYCCNT = 0;
DWT->CTRL |= DWT_CTRL_CYCCNTENA_Msk;
```

ISR 끝 마커와 task 마커에서 counter를 읽고 unsigned 차를 계산합니다. single core와 한 sample outstanding 조건을 유지하고, compiler·ISR/task 게시 계약을 확인해야 합니다. 중간 event가 timestamp를 덮어쓰면 다른 sample을 짝짓게 됩니다.

```c title="cycle-delta.c"
#include <stdbool.h>
#include <stdint.h>
bool cycle_delta_ns(uint32_t start, uint32_t end,
                    uint32_t counter_hz, uint64_t *ns) {
    if (counter_hz == 0 || ns == 0) return false;
    uint32_t cycles = end - start;
    *ns = (uint64_t)cycles * UINT64_C(1000000000) / counter_hz;
    return true;
}
```

이 함수는 두 읽기 사이에 counter가 **한 바퀴 미만** 진행하고 주파수가 일정하다는 전제입니다. 168 MHz의 32-bit counter는 약 25.57초에 한 바퀴이므로 긴 interval에는 확장 counter나 다른 시간 기준이 필요합니다. 1 cycle 약 5.95 ns는 양자화 해상도이지 측정 전체의 정확도 보장이 아닙니다.

## ftrace — Linux RT 환경

wake-to-run 질문에는 sched_wakeup과 sched_switch 같은 scheduler **event**가 직접적입니다. 다음은 권한과 tracefs 지원이 필요한 별도 instance 예제입니다. 이름이 이미 존재하면 다른 이름을 선택하여 기존 수집을 덮어쓰지 않습니다.

```bash title="scheduler-events.sh"
set -eu
trace_dir=/sys/kernel/tracing/instances/rtos-latency
mkdir "$trace_dir"
printf '0
' > "$trace_dir/tracing_on"
printf 'nop
' > "$trace_dir/current_tracer"
printf '1
' > "$trace_dir/events/sched/sched_wakeup/enable"
printf '1
' > "$trace_dir/events/sched/sched_switch/enable"
printf '1
' > "$trace_dir/tracing_on"
sleep 10
printf '0
' > "$trace_dir/tracing_on"
cat "$trace_dir/trace"
printf '0
' > "$trace_dir/events/sched/sched_wakeup/enable"
printf '0
' > "$trace_dir/events/sched/sched_switch/enable"
```

대상 PID·CPU, trace clock과 여러 CPU 사이의 시간 비교, migration과 이벤트 누락을 확인해 대응시킵니다. 단순히 인접한 임의의 wakeup과 switch를 빼면 안 됩니다. 필요하면 sched_wakeup_new 등도 수집합니다.

function tracer는 대상 함수의 entry를 기록하고 function_graph는 대응하는 entry/exit를 추적합니다. set_ftrace_filter는 함수명 필터이므로 이벤트 이름처럼 schedule:*를 쓰면 안 됩니다. available_filter_functions에서 실제 함수를 확인합니다.

### irqsoff Tracer

irqsoff는 interrupt가 비활성화된 구간을 조사합니다. 최장 기록은 IRQ-off 구간이며 ISR 실행 시간이나 task wake-to-run 시간과 같지 않습니다. available_tracers에 존재하는지와 kernel 설정·계측 비용을 확인합니다. 여기서는 Linux 실행 결과를 제시하지 않습니다.

## cyclictest — Linux PREEMPT_RT

cyclictest는 주기 timer wake의 예정 시각과 실제 실행의 차를 관찰하는 rt-tests 도구입니다. ISR 종료부터의 순수 scheduler 구간을 직접 측정하지는 않습니다. 다음은 해당 버전의 --help에서 옵션을 확인한 뒤 사용하는 명령 예제입니다.

```bash
sudo cyclictest -p 80 -t 4 -i 1000 -l 100000 -m
```

priority·thread 수·interval·loop 수·mlockall 설정을 명시하고 CPU affinity·IRQ 배치·다른 RT task·부하·절전·kernel 버전도 기록합니다. mlockall은 메모리를 resident로 유지하기 위한 설정이며 모든 page fault와 interrupt를 제거하는 보장은 아닙니다.

출력의 Max는 해당 실행에서 관찰한 최대 지연입니다. deadline을 넘는 표본은 반례가 되지만 넘지 않았다는 사실만으로 모든 운용 조건의 상한이 증명되지는 않습니다. 최고 priority가 무조건 정확한 측정을 만드는 것도 아니므로 제품에서 재현하려는 간섭 조건에 맞춥니다.

## SystemView — Segger 시각화

SystemView는 RTOS hook 등의 task·ISR·API 이벤트를 수집하여 호스트 시간축에 표시합니다. 대상 RTOS 통합, timestamp와 CPU clock, RTT transport와 buffer 설정 등이 필요합니다.

초기화 함수 하나로 모든 이벤트와 정확한 지연이 자동 수집된다고 가정하지 않습니다. 사용 버전의 integration guide를 확인하고 sample·probe·drop 여부를 기록합니다. 다음 장에서 trace의 정보원과 관측 범위를 나눠 다룹니다.

## Tracealyzer

Tracealyzer도 recorder와 RTOS 통합 설정을 갖추고 수집 데이터를 분석합니다. record mode와 API는 recorder 버전에 따라 확인해야 하며, version 없는 초기화 한 줄을 모든 설정에 적용하지 않습니다.

시각화는 기록한 이벤트 범위와 clock·buffer의 한계를 따릅니다. timeline에 없다는 이유만으로 사건이 발생하지 않았다고 결론내리지 말고, drop·filter·snapshot window부터 확인합니다.

## Latency 원인 분류

| 가설 | 확인할 증거·조치 |
| --- | --- |
| 긴 임계 구역 | mask/scheduler-suspend 구간과 대상 task 준비 시점을 대조 |
| 다른 IRQ 간섭 | priority·nesting·ISR 길이와 event 시점 확인 |
| cache/TLB miss | 타깃 counter·주소 공간·실행 경로 확인, 고정 µs 가정 금지 |
| bus/DMA 경쟁 | 같은 부하에서 latency 분포와 memory stall 관찰 |
| FP 상태 전환 | 정수/FP·lazy·ISR 조합별 실제 포트 경로 확인 |

hugepage·prefetch·priority 변경은 원인이 확인된 경우에 검토합니다. 타깃과 조건 없이 고정 latency 수치나 만능 해결책을 제시하지 않습니다.

## Worst-Case 추적 — Statistical

histogram은 분포를 보여주되 bucket 범위 밖 tail을 별도로 표시해야 합니다. 다음은 한 task만 기록·조회하는 집계 예제이며 99 bucket은 **99 µs 이상 전체**입니다. 다중 writer 환경에서는 동기화·일관된 snapshot이 더 필요합니다.

```c title="latency-histogram.c"
#include <stdbool.h>
#include <stdint.h>
struct LatencyHistogram {
    uint64_t buckets[100];
    uint64_t samples;
    uint32_t max_cycles;
};
bool record_latency(struct LatencyHistogram *h, uint32_t cycles,
                    uint32_t counter_hz) {
    if (h == 0 || counter_hz == 0 || h->samples == UINT64_MAX)
        return false;
    uint64_t us = (uint64_t)cycles * UINT64_C(1000000) / counter_hz;
    unsigned bucket = us >= 99 ? 99 : (unsigned)us;
    ++h->buckets[bucket];
    ++h->samples;
    if (cycles > h->max_cycles) h->max_cycles = cycles;
    return true;
}
```

유효한 struct를 0으로 초기화하고 samples와 bucket의 일관성을 유지하는 단일 writer 계약입니다.

최상위 bucket으로 몰린 표본의 정확한 p99·p999 값은 이 집계만으로 복원할 수 없습니다. 더 넓거나 세밀한 bucket 또는 원시 표본을 사용하고 누락·측정 시간·표본 수를 함께 기록합니다. 관찰 max와 분포는 상한 분석을 지원하는 자료이지 WCET 증명 자체는 아닙니다.

## 실제 측정 사례

이 저장소에서 해당 보드·kernel·측정 원시 데이터로 재현하지 않은 OS별 성능표를 실측 사례로 제시하지 않습니다. 다음 항목을 채운 독립 실험 기록이 있어야 비교할 수 있습니다.

| 기록 항목 | 예시 질문 |
| --- | --- |
| 범위 | t7−t4인가, ready-to-run인가, timer wake 지연인가? |
| 구성 | board·clock·kernel tag·config·FP·memory 배치는 무엇인가? |
| 부하 | IRQ·DMA·I/O·다른 task·power mode를 어떻게 재현했는가? |
| 관측 | probe·counter·marker 비용과 drop·wrap을 확인했는가? |
| 표본 | 실행 시간·표본 수·분포·관찰 max·반복 결과는 무엇인가? |

Bare-metal과 Linux PREEMPT_RT라는 이름만으로 우열이나 고정 µs 상한을 결정할 수 없습니다. 원시 측정이 없는 이 글은 절차와 경계 조건만 설명합니다.

## 자주 하는 실수

- **평균만 봅니다.** 분포·관찰 max·deadline 초과 표본과 누락을 함께 봅니다.
- **관찰 max를 hard bound로 부릅니다.** 미실행 경로와 간섭 조건을 포함한 별도 상한 분석이 필요합니다.
- **event를 잘못 짝짓습니다.** 반복 IRQ·binary semaphore 합침·migration·drop을 확인합니다.
- **DWT 해상도를 전체 정확도로 간주합니다.** counter 지원·wrap·주파수·계측 비용을 확인합니다.
- **cyclictest를 무조건 최고 priority로 실행합니다.** 제품과 같은 priority·IRQ·부하 조건을 재현하고 필요한 비교 실험을 설계합니다.

## 정리

- 지연 비교의 첫 단계는 시작·종료 이벤트를 고정하는 것입니다.
- GPIO는 반복 측정에서도 edge가 남도록 별도 marker 또는 명확한 pin 상태 계약을 둡니다.
- DWT는 지원·접근·주파수·wrap 조건을 확인합니다.
- ftrace event, irqsoff, function tracer와 cyclictest는 서로 다른 구간을 관찰합니다.
- histogram의 overflow bucket과 누락을 명시하고 관찰 max를 보장 상한으로 바꾸지 않습니다.

다음 2-11에서는 RTOS tracing과 observability를 다룹니다. 그 뒤 Part 3에서 IPC와 sync 내부 구현으로 넘어갑니다.

## 근거 자료

- [FreeRTOS V11.2.0 queue.h](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/include/queue.h): ISR semaphore 전달·yield 계약.
- [Linux ftrace 공식 문서](https://docs.kernel.org/trace/ftrace.html): function/function_graph·irqsoff·tracefs.
- [Linux event tracing 공식 문서](https://docs.kernel.org/trace/events.html): event 수집과 필터.
- [rt-tests cyclictest 원본](https://git.kernel.org/pub/scm/utils/rt-tests/rt-tests.git/tree/src/cyclictest/cyclictest.c): 옵션·측정 루프와 출력.

## 관련 항목

- [1-10: 실시간성 분석 (WCET)](/blog/embedded/rtos/practical-internals/part1-10-realtime-analysis)
- [2-05: Cortex-M Context Switch](/blog/embedded/rtos/practical-internals/part2-05-cortex-m-context)
- [Performance Engineering Part 1](/blog/embedded/performance-engineering/00-preface)
