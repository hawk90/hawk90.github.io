---
title: "RTOS Tracing과 Observability — Tracealyzer·SystemView·ITM/ETM"
slug: "embedded/rtos/practical-internals/part2-11-tracing-observability"
date: 2026-05-05T09:21:00
description: "Percepio Tracealyzer와 Segger SystemView, Cortex-M의 ITM/ETM 하드웨어 트레이스. Task switch·ISR·queue·mutex 이벤트를 시간축에 펼쳐 인과를 추적합니다."
series: "Practical RTOS Internals"
seriesOrder: 21
tags: [tracing, observability, tracealyzer, systemview, itm, etm]
topics: ["embedded", "embedded/rtos"]
---

## 한 줄 요약

> **"RTOS는 print만으로는 안 보입니다."** — Task switch, ISR, IPC 이벤트를 *시간축*에 펼쳐야 인과가 보입니다. Tracealyzer·SystemView·ITM이 그 도구입니다.

## 어떤 문제를 푸는가

RTOS 위에서 버그를 잡아 본 사람은 *한 번쯤 겪는 무력감*이 있습니다. UART 데이터가 가끔 깨지고, 어떤 task가 늦게 깨어나고, 어디서 우선순위 역전이 일어나는 것 같은데 `printf`로는 도무지 *순서*가 잡히지 않습니다.

문제는 RTOS 이벤트가 아주 촘촘하다는 점입니다. 2-03의 QEMU 기록에서는 tick 0부터 7까지 16번의 전환이 일어났고, 1 kHz라면 8 ms 안쪽입니다.

- Task switch — 어느 시점에 누가 누구를 밀어냈는가
- ISR 진입/종료 — 어떤 인터럽트가 얼마나 길게 실행되었는가
- Queue/semaphore/mutex 동작 — 누가 보내고 누가 받았는가
- Tick, timer expiry, software event

`printf`를 그 안에 박으면 *그 자체*가 실행 시간을 바꿔서 버그가 사라지거나 새로 생깁니다. 이 시리즈의 QEMU `pr()`도 UART 레지스터에 바이트를 하나씩 쓰는 함수라, 부르는 동안 그 task는 다른 일을 못 합니다. 필요한 것은 짧은 기록을 메모리에 남기고 나중에 꺼내는 구조입니다. 비행기의 블랙박스가 조종사에게 말을 걸지 않고 기록만 하는 것과 같습니다. 그 기록 비용도 0은 아니어서, 아래에서 잽니다.

이 글에서는 Tracealyzer, SystemView, 그리고 그 아래에서 동작하는 ITM·ETM 하드웨어 트레이스를 살펴봅니다.

## 두 가지 접근 — SW Trace vs HW Trace

| 항목 | SW event trace | HW trace |
| --- | --- | --- |
| 데이터 출처 | RTOS trace macro(`traceTASK_SWITCHED_IN` 등)와 사용자 계측 코드 | ITM stimulus write, DWT가 만드는 PC sample·exception packet, ETM instruction trace |
| CPU 영향 | 기록 코드가 CPU에서 돎(아래 QEMU 측정: 전환당 50 count 증가) | ITM은 CPU가 stimulus 레지스터에 씀. DWT·ETM packet은 하드웨어가 만듦 |
| 전송 | RAM buffer → RTT·UART·파일 | ITM/DWT는 SWO 또는 TPIU, ETM은 TPIU나 on-chip buffer |

ITM을 이용한 사용자 print는 하드웨어 trace 경로를 쓰더라도 CPU가 stimulus 레지스터에 쓰는 SW instrumentation입니다. 이 장에서는 ITM·ETM을 실행하지 않았습니다. QEMU가 이 장치들을 모델링하지 않기 때문입니다.

## Tracealyzer — 시각화의 결정판

Percepio Tracealyzer는 타깃에 넣는 trace recorder(TraceRecorderSource)가 수집한 RTOS 이벤트를 호스트에서 timeline·CPU load·IPC 관점으로 분석합니다. recorder는 FreeRTOS의 trace macro를 정의해 이벤트를 RAM buffer에 씁니다. 2-03에서 `traceTASK_SWITCHED_IN()`을 직접 정의한 것과 같은 원리입니다.

recorder v4.12.0의 `trcRecorder.h`는 두 수집 방식을 나눕니다. snapshot("RingBuffer")은 타깃 RAM의 ring buffer에 계속 쓰고 나중에 꺼내며, streaming은 "stream port"를 통해 실행 중에 내보냅니다. streaming의 `TRC_START_AWAIT_HOST`는 "This call is intentionally blocking!"이라고 적혀 있어, 호스트가 Start를 누를 때까지 타깃이 멈춥니다([TraceRecorderSource `Tz4/4.12/v4.12.0` `include/trcRecorder.h`](https://github.com/percepio/TraceRecorderSource/blob/Tz4/4.12/v4.12.0/include/trcRecorder.h) L129-L187). 다음은 recorder 통합을 마친 뒤 쓰는 API 발췌입니다.

```c
/* Recorder headers/configuration and hardware setup are required. */
if (xTraceEnable(TRC_START) != TRC_SUCCESS) {
    /* Report recorder startup failure through a safe application path. */
}
```

순서 규칙은 같은 헤더의 `xTraceEnable()` 설명에 있습니다. "the startup must call xTraceInitialize() or xTraceEnable(...) before any RTOS calls are made (including "create" calls)"이고, "This function should only be called after the timestamp source is properly initialized"입니다. timestamp source가 scheduler 뒤에야 준비되는 구성이면 RTOS 호출 전에 `xTraceInitialize()`만 하고, timestamp가 준비된 뒤 `xTraceEnable(TRC_START)`을 부릅니다. `configGENERATE_RUN_TIME_STATS`를 켜는 것은 아래 run-time stats 기능이며 recorder 통합과는 별개입니다.

## SystemView — RTT의 친구

SEGGER SystemView([UM08027 User Guide](https://doc.segger.com/UM08027_SystemView.html))도 타깃 recorder가 RTOS 이벤트를 RTT buffer에 쓰고 호스트가 읽는 구조입니다. user guide에서 확인한 내용은 다음과 같습니다.

- "The RTT module stores the data in the target buffer, which enables continuous recording, as well as single-shot recording and post-mortem analysis."
- 연속 기록은 "only possible with CPUs, which support background memory access - ARM Cortex-M and Renesas RX"이고, 다른 CPU는 single-shot이나 post-mortem 모드로 씁니다. J-Link가 debug interface로 실행 중인 타깃의 buffer를 읽기 때문입니다.
- 초기화는 `SEGGER_SYSVIEW_Conf()`(또는 `SEGGER_SYSVIEW_Init`), 기록 시작은 `SEGGER_SYSVIEW_Start()`, 사용자 구간 표시는 `SEGGER_SYSVIEW_MarkStart()`·`SEGGER_SYSVIEW_Mark()`·`SEGGER_SYSVIEW_MarkStop()`입니다.
- 저장한 데이터는 "can analyzed without a J-Link and even without the target hardware"입니다.
- 라이선스는 "SystemView can be used free of charge for non-commercial purposes under SEGGER's Friendly License"이고 "For any other use a commercial-use license is required"입니다.

이 장에서는 SystemView를 실행하지 않았습니다.

## ITM — Cortex-M의 Trace Macrocell

ITM을 구현한 Cortex-M에서는 stimulus port 레지스터에 쓰는 것으로 software event를 보냅니다. port가 FIFO에 자리가 있을 때만 받으므로, 쓰기 전에 port를 읽어 0이 아닌지(받을 준비) 확인합니다.

다음은 **Cortex-M4 CMSIS register 정의를 사용하는 조건부 전송 예제**입니다. stimulus가 준비되지 않으면 기다리지 않고 false를 반환합니다.

```c title="itm-try-putc.c"
#include <stdbool.h>
#include <stdint.h>
/* Include the actual device CMSIS header before compiling this source. */
bool itm_try_putc(uint8_t byte) {
    if ((ITM->TCR & ITM_TCR_ITMENA_Msk) == 0U ||
        (ITM->TER & 1U) == 0U || ITM->PORT[0].u32 == 0U)
        return false;
    ITM->PORT[0].u8 = byte;
    return true;
}
```

CMSIS 6.1.0의 `ITM_SendChar()`는 port 0이 준비될 때까지 `while (ITM->PORT[0U].u32 == 0UL) { __NOP(); }`로 기다립니다([`core_cm4.h` L2172-L2184](https://github.com/ARM-software/CMSIS_6/blob/v6.1.0/CMSIS/Core/Include/core_cm4.h#L2172-L2184)). 기한 없는 대기라서 SWO를 읽는 쪽이 없으면 관측 대상의 진행을 멈춥니다. 위 함수가 기다리지 않고 false를 돌려주는 이유입니다.

PC sampling·exception trace는 DWT가 만들어 ITM 경로에 싣는 packet이고, ITM print와는 정보원이 다릅니다. PC sample로 함수별 실행 비율을 보려면 호스트가 ELF 심볼로 주소를 함수에 대응시킵니다.

## ETM — 명령어 단위 트레이스

ETM instruction trace는 분기·주소 같은 압축 packet을 내보내고, decoder가 실행 이미지(ELF)와 맞춰 실제 실행 흐름을 다시 만듭니다. 명령마다 전부 보내지 않으므로 decoder에는 같은 빌드의 ELF가 꼭 있어야 합니다. packet은 TPIU를 통해 칩 밖으로 내보내거나, ETB 같은 on-chip buffer에 담았다가 debugger가 읽습니다. 이 장에서는 ETM을 실행하지 않았습니다. 다른 시리즈의 [ARM DS·Lauterbach](/blog/embedded/performance-engineering/part5-06-arm-ds-lauterbach) 장이 이 도구를 다룹니다.

## Run-Time Stats — 가장 가벼운 시작

FreeRTOS **V11.2.0**의 run-time stats는 태스크별 누적 실행 counter를 제공합니다. `configGENERATE_RUN_TIME_STATS`를 1로 두고 `portGET_RUN_TIME_COUNTER_VALUE()`에 시간 counter를 연결하면, `vTaskSwitchContext()`가 나가는 task의 counter에 그 사이 시간을 더합니다(2-03의 발췌에서 줄인 부분). `uxTaskGetSystemState()`는 `configUSE_TRACE_FACILITY == 1`이어야 컴파일됩니다.

고정 512 byte 문자열에 `vTaskGetRunTimeStats()`를 쓰면 task 수와 이름 길이에 따라 넘칠 수 있습니다. 다음은 raw data를 **최대 8개 태스크**까지 읽고, 작으면 실패로 처리하는 예제입니다.

```c title="runtime-snapshot.c"
#include <stdbool.h>
#include "FreeRTOS.h"
#include "task.h"
extern void report_task_stat(const TaskStatus_t *task,
                             configRUN_TIME_COUNTER_TYPE total);
bool report_runtime_snapshot(void) {
    TaskStatus_t snapshot[8];
    configRUN_TIME_COUNTER_TYPE total = 0;
    UBaseType_t count = uxTaskGetSystemState(snapshot, 8, &total);
    if (count == 0 || total == 0) return false;
    for (UBaseType_t i = 0; i < count; ++i)
        report_task_stat(&snapshot[i], total);
    return true;
}
```

QEMU에서 돌려 봤습니다. `portGET_RUN_TIME_COUNTER_VALUE()`를 SysTick count(1 tick = 25,000)로 연결하고, `work`(우선순위 2)는 30 tick 일하고 10 tick 쉬기를 반복하며 `spin`(우선순위 1)은 쉬지 않고 돕니다. 400 tick 뒤 감독 task가 위 함수를 부릅니다.

```c title="stats.h"
#define configGENERATE_RUN_TIME_STATS 1
extern uint32_t rt_now(void);
#define portCONFIGURE_TIMER_FOR_RUN_TIME_STATS()
#define portGET_RUN_TIME_COUNTER_VALUE() rt_now()
#if HOOK
extern void trace_in(void);
#define traceTASK_SWITCHED_IN() trace_in()
#endif
```

```text
HOOK=0 run-time stats after 400 ticks:
  sup prio 5 run-time 800 = 0%
  work prio 2 run-time 7500230 = 74%
  spin prio 1 run-time 2499434 = 24%
  IDLE prio 0 run-time 0 = 0%
  Tmr Svc prio 7 run-time 282 = 0%
```

`work`의 30 / 40 = 75%와 `spin`의 25%가 정수 나눗셈으로 74%, 24%가 되었습니다. ISR이 쓴 시간은 그때 돌던 task의 counter에 들어가므로, task 비율만으로 ISR 부하를 따로 볼 수는 없습니다. FreeRTOS V11.2.0 `ARM_CM3`, arm-none-eabi-gcc 16.2.0 `-O2`, QEMU 11.1.3 `mps2-an385 -icount shift=5`입니다.

## 측정 — 오버헤드 비교

관측 비용은 같은 workload를 trace off/on으로 돌려 비교합니다. 위 프로그램의 뒷부분은 우선순위 4의 task 둘이 `taskYIELD()`로 5,000번씩, 모두 10,000번 서로 전환하는 시간을 잽니다. `HOOK=1`이면 `traceTASK_SWITCHED_IN()`이 전환마다 timestamp 하나를 256칸 ring buffer에 씁니다. 가장 작은 recorder를 흉내 낸 것입니다.

```text
HOOK=0 10000 yields between two tasks: 1032314 SysTick counts (103 per switch)
HOOK=1 10000 yields between two tasks: 1532314 SysTick counts (153 per switch)
```

timestamp 하나를 기록하자 전환 하나가 103에서 153 count로 약 49% 늘었습니다. 이 hook은 tick 수와 SysTick 값을 일관되게 읽으려고 `rt_now()` 안에서 tick count를 두 번 읽습니다. 실제 recorder는 이벤트마다 이보다 많은 필드를 쓰므로 그 비용도 같은 방법으로 잽니다. count는 QEMU icount 가상 시간입니다.

ring buffer가 가득 차면 위 hook은 옛 기록을 덮어씁니다. 기다리는 정책(위 `TRC_START_AWAIT_HOST`나 CMSIS `ITM_SendChar`처럼)은 기록을 지키는 대신 타깃을 멈출 수 있습니다. 어느 쪽인지와 잃은 개수를 함께 남겨야 기록을 해석할 수 있습니다.

## 실전 — IPC 인과 추적

Task A가 큐로 보낸 메시지를 Task B가 5 ms 뒤에 처리했다는 **가상 시나리오**를 봅니다. 다음은 실제 수집 로그가 아니라 가설을 확인하기 위한 이벤트 순서이고, 2-03의 전환 기록에서 tick 4~7 사이 HI가 기다린 이유를 읽은 방식과 같습니다.

| 상대 시각 | 확인할 event |
| --- | --- |
| 0 | A의 queue send, B의 blocked→ready |
| 0 부근 | B보다 높은 우선순위 X가 실행 중인지 |
| 0–5 ms | X의 실행·IRQ·scheduler suspend·trace 누락 여부 |
| 5 ms | X block 이후 B 선택과 queue receive 복귀 |

trace에서 이 순서가 확인되면 우선순위 정책에 의한 지연이라는 가설을 지지합니다. 반대로 0–5 ms 사이에 X의 이벤트가 하나도 없다면, X가 아니라 기록이 빠졌을 가능성(buffer drop)부터 봅니다.

## 자주 보는 함정과 안티패턴

- **buffer 크기를 감으로 정합니다.** 필요한 크기는 "보고 싶은 시간 window × 초당 이벤트 수 × 이벤트 크기"입니다. 위 ping-pong처럼 전환이 1 tick에 수백 번 일어나면 256칸 ring buffer는 1 tick도 담지 못합니다.
- **hook에서 RTOS API를 부릅니다.** `traceTASK_SWITCHED_IN()`은 `vTaskSwitchContext()` 안, 즉 PendSV와 critical section 안에서 불립니다(2-03). 여기서 queue나 semaphore API를 부르면 커널을 다시 들어가게 됩니다. 위 hook처럼 메모리에 쓰기만 합니다.
- **trace가 버그를 바꾸지 않는다고 생각합니다.** 위 측정에서 hook 하나가 전환 비용을 49% 늘렸습니다. timing 버그는 trace를 켜면 사라질 수 있습니다.
- **SystemView 라이선스를 J-Link 유무로 판단합니다.** user guide의 조건은 용도(비상업/상업)입니다.

## 정리

- RTOS trace는 FreeRTOS trace macro 위에 recorder를 얹는 구조이고, 2-03의 `traceTASK_SWITCHED_IN()` 기록이 그 가장 작은 형태입니다.
- QEMU에서 timestamp 하나를 기록하는 hook이 전환 비용을 103 → 153 count(약 49%)로 늘렸습니다.
- Percepio recorder는 RTOS 호출 전에 초기화하고, `TRC_START_AWAIT_HOST`는 타깃을 멈춥니다.
- SystemView는 비상업 용도 무료·상업 용도 유료이고, 저장한 기록은 probe 없이 분석할 수 있습니다.
- CMSIS `ITM_SendChar()`는 기한 없이 기다립니다.
- run-time stats는 ISR 시간을 그때 돌던 task에 넣습니다(QEMU: work 74%, spin 24%).

이 장으로 Part 2를 마칩니다. 다음은 Part 3의 Critical Section 구현 비교입니다. ISR·trace hook에서 어떤 동기화가 허용되는지 이어서 살펴봅니다.

## 근거 자료

- [Percepio TraceRecorderSource v4.12.0 `trcRecorder.h`](https://github.com/percepio/TraceRecorderSource/blob/Tz4/4.12/v4.12.0/include/trcRecorder.h): 초기화 순서·start option. Percepio의 [FreeRTOS 시작 가이드](https://percepio.com/getstarted/latest/html/freertos.html)는 접속이 차단되어 열지 못했습니다.
- [SEGGER SystemView User Guide UM08027](https://doc.segger.com/UM08027_SystemView.html): RTT 기록 방식·지원 CPU·API·라이선스·offline 분석.
- [Arm CMSIS 6.1.0 core_cm4.h](https://github.com/ARM-software/CMSIS_6/blob/v6.1.0/CMSIS/Core/Include/core_cm4.h): ITM register·ITM_SendChar 조건과 대기.
- [FreeRTOS V11.2.0 task.h](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/include/task.h), [tasks.c](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/tasks.c): raw stats API·snapshot 범위.
- QEMU 실험: `stats.c` + `runtime-snapshot.c`, FreeRTOS V11.2.0 `ARM_CM3`, QEMU 11.1.3 `mps2-an385 -icount shift=5`.

- [3-01: Critical Section 구현 비교](/blog/embedded/rtos/practical-internals/part3-01-critical-section)

## 관련 항목

- [2-10: Scheduler Latency](/blog/embedded/rtos/practical-internals/part2-10-scheduler-latency)
- [2-05: Cortex-M Context Switch](/blog/embedded/rtos/practical-internals/part2-05-cortex-m-context)
- [5-06: ARM DS·Lauterbach](/blog/embedded/performance-engineering/part5-06-arm-ds-lauterbach)
- [5-07: Baremetal Profiling](/blog/embedded/performance-engineering/part5-07-baremetal-profiling)
