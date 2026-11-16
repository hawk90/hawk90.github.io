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

달리기 기록을 잴 때 출발 신호를 총소리로 보느냐 발이 움직인 순간으로 보느냐에 따라 기록이 달라지는 것과 같습니다. GPIO·DWT·trace hook의 코드 위치와 실행 비용을 함께 기록해야 이 구간들을 비교할 수 있습니다. Linux의 sched_wakeup/sched_switch나 cyclictest도 서로 다른 시작·종료 이벤트를 사용합니다.

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

반복 event가 합쳐지거나 queueing되지 않도록 **동시에 한 sample만 outstanding**인 실험부터 시작합니다. binary semaphore는 take 전의 give를 하나로 합치므로(1-07의 QEMU 실험), 두 번째 IRQ가 먼저 오면 그 sample은 짝이 맞지 않습니다. IRQ 우선순위는 `configMAX_SYSCALL_INTERRUPT_PRIORITY`보다 숫자가 같거나 커야 합니다(1-05).

![ISR과 task의 별도 GPIO marker로 관찰하는 ISR 구간과 wake 지연](/images/blog/rtos/diagrams/part2-10-gpio-isr-trace.svg)

ISR pin의 하강 edge에서 task pin 상승 edge까지를 측정하면 t4–t7의 관찰 지연이 됩니다. ISR tail·PendSV·스케줄러·GPIO 계측 비용이 포함되므로 순수 context-switch cycle로 보고하지 않습니다.

### QEMU에서 t7−t4 재기

QEMU에는 GPIO 로직 분석기도 DWT CYCCNT도 없으므로(1-10), marker 함수 대신 SysTick 현재값으로 시각을 찍어 같은 구간을 쟀습니다. ISR이 semaphore를 give한 직후(t4)와, 깨어난 task가 `xSemaphoreTake()`에서 돌아온 직후(t7)입니다. 우선순위 2의 trigger task가 매번 다른 위상에서 TIMER0 IRQ를 pending시키고, 한 번에 한 sample만 outstanding으로 둡니다.

```c title="markers.c (발췌)"
void TIMER0_IRQHandler(void){ BaseType_t woken=pdFALSE; xSemaphoreGiveFromISR(sample_sem,&woken); t4=now(); portYIELD_FROM_ISR(USE_YIELD ? woken : pdFALSE); }
static void sample_task(void*a){ (void)a;
  for(int i=0;i<NS;i++){ xSemaphoreTake(sample_sem,portMAX_DELAY); uint32_t t7=now(); d[i]=t7-t4; outstanding=0; }
  /* ... min/avg/max ... */ }
```

`USE_YIELD`는 ISR이 `xHigherPriorityTaskWoken`을 넘기는지, `LOAD`는 우선순위 1의 task가 critical section(0~2,000 회 빈 loop)을 반복하는지를 정합니다. FreeRTOS V11.2.0 `ARM_CM3`, arm-none-eabi-gcc 16.2.0 `-O2`, QEMU 11.1.3 `mps2-an385 -icount shift=5`에서 sample 200개씩입니다.

```text
USE_YIELD=1 LOAD=0 samples=200 t7-t4 min=125 avg=125 max=126 SysTick counts
USE_YIELD=1 LOAD=1 samples=200 t7-t4 min=125 avg=126 max=192 SysTick counts
USE_YIELD=0 LOAD=0 samples=200 t7-t4 min=235 avg=235 max=236 SysTick counts
USE_YIELD=0 LOAD=1 samples=200 t7-t4 min=235 avg=235 max=329 SysTick counts
```

yield를 넘기면 t7−t4가 125 count로 거의 일정했습니다. ISR 꼬리, PendSV, `vTaskSwitchContext()`, semaphore take의 남은 경로가 이 안에 들어 있습니다. 넘기지 않으면 235 count였는데, 이 실험에서는 trigger task가 곧바로 `vTaskDelay(1)`로 block하며 전환이 일어났기 때문입니다. trigger가 block하지 않았다면 다음 tick까지 기다렸을 것입니다(1-04). 낮은 우선순위 task에 critical section을 넣자 평균은 거의 그대로인데 최대가 192, 329로 늘었습니다. 이 실험은 그 증가가 어느 경로에서 왔는지 가르지 않았지만, 평균만 봤다면 차이를 못 봤다는 점은 분명합니다. count는 icount 가상 시간이고 실제 보드의 ns가 아닙니다.

## DWT Cycle Counter — Cortex-M

CYCCNT가 없는 구현도 있으며, 이때 DWT_CTRL.NOCYCCNT가 1입니다(DDI 0403E.b C1.8 DWT). QEMU `mps2-an385`에서는 켜도 0으로만 읽혔습니다(1-10). 있는 코어에서는 DEMCR.TRCENA(bit 24)와 DWT_CTRL.CYCCNTENA(bit 0)를 켭니다. CMSIS로 쓰면 다음과 같습니다.

```c
CoreDebug->DEMCR |= CoreDebug_DEMCR_TRCENA_Msk;
DWT->CYCCNT = 0;
DWT->CTRL |= DWT_CTRL_CYCCNTENA_Msk;
```

ISR 끝 마커와 task 마커에서 counter를 읽고 unsigned 차를 계산합니다. 위 QEMU 실험의 `t4`처럼 ISR이 쓰고 task가 읽는 timestamp는 한 sample만 outstanding이어야 합니다. 중간 event가 timestamp를 덮어쓰면 다른 sample을 짝짓게 됩니다.

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

이 함수는 두 읽기 사이에 counter가 **한 바퀴 미만** 진행하고 주파수가 일정하다는 전제입니다. 168 MHz의 32-bit counter는 2³² / 168×10⁶ ≈ 25.57초에 한 바퀴입니다. host에서 0xFFFFFF00 → 0x00000100(wrap을 넘는 512 cycle)을 넣으면 `512 cycles across the 32-bit wrap at 168 MHz = 3047 ns; 2^32 cycles = 25.57 s`가 나왔습니다(Apple clang 21). 1 cycle 약 5.95 ns는 양자화 해상도입니다.

## ftrace — Linux RT 환경

wake-to-run 질문에는 sched_wakeup과 sched_switch 같은 scheduler **event**가 직접적입니다. 다음은 권한과 tracefs 지원이 필요한 별도 instance 예제입니다. 이름이 이미 존재하면 다른 이름을 선택하여 기존 수집을 덮어쓰지 않습니다.

```bash title="scheduler-events.sh"
set -eu
trace_dir=/sys/kernel/tracing/instances/rtos-latency
mkdir "$trace_dir"
echo 0 > "$trace_dir/tracing_on"
echo nop > "$trace_dir/current_tracer"
echo 1 > "$trace_dir/events/sched/sched_wakeup/enable"
echo 1 > "$trace_dir/events/sched/sched_switch/enable"
echo 1 > "$trace_dir/tracing_on"
sleep 10
echo 0 > "$trace_dir/tracing_on"
cat "$trace_dir/trace"
echo 0 > "$trace_dir/events/sched/sched_wakeup/enable"
echo 0 > "$trace_dir/events/sched/sched_switch/enable"
```

이 스크립트는 실행하지 않았습니다. 경로와 파일 이름은 Linux v6.12 `Documentation/trace/ftrace.rst`(tracefs는 `/sys/kernel/tracing`, `instances`는 "a way to make multiple trace buffers where different events can be recorded in different buffers", L656-L660)와 `events.rst`(`sched_wakeup` 활성화 예, L29-L64)를 따랐습니다. wakeup과 switch를 짝지을 때는 같은 PID의 sched_wakeup과 그 PID로 바뀌는 sched_switch를 찾아야 하고, 둘이 다른 CPU에서 기록되면 trace clock이 CPU 사이에서 비교 가능해야 합니다.

ftrace.rst에 따르면 function tracer는 "trace all kernel functions"이고, function_graph는 entry와 exit를 모두 추적합니다(L800-L808). `set_ftrace_filter`에는 `available_filter_functions`에 나오는 함수 이름을 넣습니다(L355-L359). 이벤트 이름(`sched:*`)은 `set_event`에 넣는 것이라 섞으면 안 됩니다.

### irqsoff Tracer

ftrace.rst는 irqsoff를 "Traces the areas that disable interrupts and saves the trace with the longest max latency"라고 적습니다(L824-L828). 최장 기록은 IRQ-off 구간이며 ISR 실행 시간이나 task wake-to-run 시간과 같지 않습니다. RT task의 wake-to-run 최댓값은 같은 문서의 `wakeup_rt` tracer가 기록합니다(L851-L855). 여기서는 Linux 실행 결과를 제시하지 않습니다.

## cyclictest — Linux PREEMPT_RT

cyclictest는 주기 timer wake의 예정 시각과 실제 실행의 차를 관찰하는 rt-tests 도구입니다. 1-10의 QEMU latency 측정과 같은 구조이고, ISR 종료부터의 scheduler 구간만 따로 재지는 않습니다. 옵션 의미는 rt-tests `cyclictest.8`을 따랐습니다.

```bash
sudo cyclictest -p 80 -t 4 -i 1000 -l 100000 -m
```

`-p 80`은 첫 thread의 우선순위이고 다음 thread는 하나씩 낮아집니다. `-t 4`는 thread 4개, `-i 1000`은 첫 thread의 주기 1,000 µs이고 나머지 thread는 `-d` 기본값 500 µs씩 길어져 1,500·2,000·2,500 µs가 되며, `-l 100000`은 10만 번, `-m`은 "Lock current and future memory allocations to prevent being paged out"입니다(cyclictest.8 L98, L112-L116, L131-L153). 이 명령은 macOS에서 쓴 이 글에서는 실행하지 않았습니다.

출력의 Max는 해당 실행에서 관찰한 최대 지연입니다. 위 QEMU 실험에서 LOAD를 켜기 전과 후의 최대가 126과 192로 달랐듯, Max는 그 실행의 부하가 정합니다. deadline을 넘는 표본은 반례가 되지만, 넘지 않았다는 사실만으로 다른 부하의 상한이 증명되지는 않습니다.

## SystemView — Segger 시각화

SystemView는 RTOS의 trace hook으로 task·ISR·API 이벤트를 기록해 호스트 시간축에 표시합니다. 2-03에서 `traceTASK_SWITCHED_IN()`으로 전환 순서를 기록한 것을 도구가 대신 해 주는 셈입니다. 연동 방식과 제약은 [2-11](/blog/embedded/rtos/practical-internals/part2-11-tracing-observability)에서 다룹니다.

## Tracealyzer

Tracealyzer도 같은 trace hook 위에 recorder를 얹는 도구입니다. timeline은 기록된 이벤트만 보여 주므로, buffer가 넘쳐 버린 이벤트는 timeline에 없어도 일어났을 수 있습니다. 자세한 내용은 2-11에서 봅니다.

## Latency 원인 분류

| 원인 | 이 시리즈에서 본 증거 |
| --- | --- |
| 긴 임계 구역 | 1-10: 낮은 task의 critical section이 최대 release latency를 147 → 9,588 count로 늘림 |
| yield 요청 누락 | 위 실험: `portYIELD_FROM_ISR(pdFALSE)`면 125 → 235 count(다음 전환 지점까지 대기) |
| 다른 IRQ 간섭 | 1-05: UART IRQ가 연달아 들어오는 동안 task가 한 번도 돌지 못함 |
| FP 상태 저장 | 2-04: FP task의 저장 frame이 17 → 51 word |
| cache miss | 이 시리즈의 QEMU 실험에는 없음(QEMU는 cache를 모델링하지 않음) |

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

유효한 struct를 0으로 초기화하고 samples와 bucket의 일관성을 유지하는 단일 writer 계약입니다. host에서 168 MHz 기준 50 µs와 250 µs를 넣으면 `bucket[50]=1 bucket[99]=1 samples=2 max_cycles=42000`이 됩니다. 250 µs는 99 bucket에 들어가고, 실제 값은 `max_cycles`(42,000 cycle = 250 µs)에만 남습니다.

그래서 최상위 bucket으로 몰린 표본의 정확한 p99·p999 값은 이 집계만으로 복원할 수 없습니다. tail이 중요하면 bucket 범위를 넓히거나 원시 표본을 따로 남깁니다.

## 실제 측정 사례

이 장의 측정 사례는 위 QEMU 실험 하나입니다. 기록 형식으로 정리하면 다음과 같습니다.

| 기록 항목 | 위 실험 |
| --- | --- |
| 범위 | t7−t4 (ISR의 give 직후 → task의 take 반환 직후) |
| 구성 | FreeRTOS V11.2.0 `ARM_CM3`, `configTICK_RATE_HZ` 1000, gcc 16.2.0 `-O2` |
| 부하 | 우선순위 1 task의 critical section 유무 |
| 관측 | SysTick CVR(QEMU icount 가상 시간), timestamp 함수 자체 비용 포함 |
| 표본 | 조합당 200개, min/avg/max |

실제 보드와 Linux PREEMPT_RT는 재지 않았습니다. 다른 환경의 결과와 비교할 때는 이 다섯 칸을 같게 맞춰야 합니다.

## 자주 하는 실수

- **평균만 봅니다.** 분포·관찰 max·deadline 초과 표본과 누락을 함께 봅니다.
- **관찰 max를 hard bound로 부릅니다.** 미실행 경로와 간섭 조건을 포함한 별도 상한 분석이 필요합니다.
- **event를 잘못 짝짓습니다.** binary semaphore는 give를 합치므로(1-07) 한 번에 한 sample만 outstanding으로 둡니다.
- **DWT가 있다고 가정합니다.** QEMU에서는 CYCCNT가 0으로만 읽혔습니다. 쓰기 전에 값이 증가하는지부터 봅니다.
- **부하 없이 잰 max를 씁니다.** 위 실험에서 부하를 켜자 max가 126에서 192로 바뀌었습니다.

## 정리

- 지연 비교의 첫 단계는 시작·종료 이벤트를 고정하는 것입니다.
- GPIO는 반복 측정에서도 edge가 남도록 ISR용과 task용 marker pin을 따로 둡니다.
- QEMU에서 t7−t4는 yield 요청 시 125 count, 없으면 235 count였고, 낮은 task의 critical section이 max만 늘렸습니다.
- DWT CYCCNT는 32비트라 168 MHz에서 25.57초마다 wrap합니다.
- ftrace event, irqsoff, function tracer와 cyclictest는 서로 다른 구간을 관찰합니다.
- histogram의 overflow bucket과 누락을 명시하고 관찰 max를 보장 상한으로 바꾸지 않습니다.

다음 2-11에서는 RTOS tracing과 observability를 다룹니다. 그 뒤 Part 3에서 IPC와 sync 내부 구현으로 넘어갑니다.

## 근거 자료

- [FreeRTOS V11.2.0 queue.h](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/include/queue.h): ISR semaphore 전달·yield 계약.
- [Linux ftrace 문서](https://docs.kernel.org/trace/ftrace.html)(v6.12 `Documentation/trace/ftrace.rst`): function/function_graph·irqsoff·wakeup_rt·instances.
- [Linux event tracing 문서](https://docs.kernel.org/trace/events.html)(v6.12 `events.rst`): event 수집과 필터.
- [rt-tests cyclictest.8](https://git.kernel.org/pub/scm/utils/rt-tests/rt-tests.git/tree/src/cyclictest/cyclictest.8): 옵션 의미.
- QEMU 실험: `markers.c`, FreeRTOS V11.2.0 `ARM_CM3`, QEMU 11.1.3 `mps2-an385 -icount shift=5`.

## 관련 항목

- [1-10: 실시간성 분석 (WCET)](/blog/embedded/rtos/practical-internals/part1-10-realtime-analysis)
- [2-05: Cortex-M Context Switch](/blog/embedded/rtos/practical-internals/part2-05-cortex-m-context)
- [Performance Engineering Part 1](/blog/embedded/performance-engineering/00-preface)
