---
title: "2-11: RTOS Tracing과 Observability — Tracealyzer·SystemView·ITM/ETM"
date: 2026-05-08T21:00:00
description: "Percepio Tracealyzer와 Segger SystemView, Cortex-M의 ITM/ETM 하드웨어 트레이스. Task switch·ISR·queue·mutex 이벤트를 시간축에 펼쳐 인과를 추적합니다."
series: "Practical RTOS Internals"
seriesOrder: 21
tags: [tracing, observability, tracealyzer, systemview, itm, etm]
---

## 한 줄 요약

> **"RTOS는 print만으로는 안 보입니다."** — Task switch, ISR, IPC 이벤트를 *시간축*에 펼쳐야 인과가 보입니다. Tracealyzer·SystemView·ITM이 그 도구입니다.

## 어떤 문제를 푸는가

RTOS 위에서 버그를 잡아 본 사람은 *한 번쯤 겪는 무력감*이 있습니다. UART 데이터가 가끔 깨지고, 어떤 task가 늦게 깨어나고, 어디서 우선순위 역전이 일어나는 것 같은데 `printf`로는 도무지 *순서*가 잡히지 않습니다.

문제는 RTOS가 만들어내는 이벤트가 *수십 종류*에 *μs 단위*로 발생한다는 점입니다.

- Task switch — 어느 시점에 누가 누구를 밀어냈는가
- ISR 진입/종료 — 어떤 인터럽트가 얼마나 길게 실행되었는가
- Queue/semaphore/mutex 동작 — 누가 보내고 누가 받았는가
- Tick, timer expiry, software event

`printf`를 그 안에 박으면 *그 자체*가 실행 시간을 바꿔서 버그가 사라지거나 새로 생깁니다. 필요한 건 *오버헤드가 무시할 만한 trace 인프라*와, *그 trace를 사람이 읽을 수 있게 시각화*해 주는 도구입니다.

이 글에서는 Tracealyzer, SystemView, 그리고 그 아래에서 동작하는 ITM·ETM 하드웨어 트레이스를 살펴봅니다.

## 두 가지 접근 — SW Trace vs HW Trace

| | SW Trace | HW Trace |
|---|---|---|
| 예 | Tracealyzer, SystemView, FreeRTOS+Trace | ITM, ETM, PTM |
| 데이터 출처 | RTOS hook에서 event record | CPU/bus가 자동으로 생성 |
| 오버헤드 | event당 ~100 ns | ≈0 (별도 trace port) |
| 정보량 | 이벤트 단위 | 명령 단위까지 가능 |
| 호스트 전송 | RTT, UART, USB | TPIU, ETB, off-chip |
| 디바이스 요구 | 없음 (메모리만) | trace 지원 칩 + 프로브 |

SW trace는 *대부분의 칩에서 작동*하고 RTOS 이벤트 수준에서 충분히 풍부합니다. HW trace는 *프로파일링·드물게 발생하는 버그* 같은 어려운 문제에서 빛납니다. 둘은 *서로를 대체하지 않습니다*.

## Tracealyzer — 시각화의 결정판

Percepio Tracealyzer는 *RTOS 이벤트의 시간축 시각화* 도구입니다. FreeRTOS, Zephyr, ThreadX, SafeRTOS, embOS 등 주요 RTOS를 지원합니다.

수집 방법은 두 가지입니다.

- **Snapshot mode**: 타겟의 ring buffer에 trace를 쌓아 두고, 필요할 때 디버거로 한꺼번에 *덤프* 합니다. 호스트 연결 불필요.
- **Streaming mode**: J-Link RTT, USB, TCP 등으로 *실시간 전송*합니다. 장시간 캡처 가능.

호스트 GUI에서는 *task별 timeline*, *CPU load 히트맵*, *IPC graph*, *responsiveness chart* 같은 view가 제공됩니다. 같은 데이터를 여러 관점에서 펼쳐 볼 수 있는 게 핵심 가치입니다.

```c
// FreeRTOSConfig.h
#define configUSE_TRACE_FACILITY        1
#define configUSE_STATS_FORMATTING_FUNCTIONS 1
#define configGENERATE_RUN_TIME_STATS   1

// TraceRecorder 통합
#include "trcRecorder.h"

void main(void) {
    /* RTOS 시작 전 trace 초기화 */
    xTraceInitialize();
    xTraceEnable(TRC_START);

    /* 태스크 생성 */
    xTaskCreate(task_a, "A", 256, NULL, 3, NULL);
    xTaskCreate(task_b, "B", 256, NULL, 2, NULL);
    vTaskStartScheduler();
}
```

`xTraceEnable()` 호출 이후 *모든 RTOS 이벤트*가 자동으로 기록됩니다. 추가 코드는 보통 필요 없습니다.

## SystemView — RTT의 친구

SEGGER SystemView는 SystemView 자체 호스트 GUI와 *Real Time Transfer (RTT)* 인프라를 묶은 솔루션입니다.

RTT는 SEGGER가 만든 *호스트-타겟 통신 채널*입니다. 타겟 메모리에 *ring buffer*를 두고, J-Link가 SWD/JTAG로 *CPU를 멈추지 않고* 그 메모리를 읽어 갑니다. 평균 오버헤드가 *μs 단위*입니다.

```c
// SEGGER RTT + SystemView 통합
#include "SEGGER_SYSVIEW.h"

void main(void) {
    SEGGER_SYSVIEW_Conf();
    SEGGER_SYSVIEW_Start();

    /* RTOS 시작 */
    vTaskStartScheduler();
}

// 사용자 이벤트
SEGGER_SYSVIEW_PrintfHost("DMA complete: %d bytes", count);
SEGGER_SYSVIEW_MarkStart(0x42);
process_frame();
SEGGER_SYSVIEW_MarkStop(0x42);
```

`MarkStart`/`MarkStop`은 사용자 정의 구간을 *timeline 위의 색 bar*로 보여 줍니다. 함수 실행 시간을 시각적으로 비교하기에 편합니다.

Tracealyzer와의 차이를 정리하면 이렇습니다.

| | Tracealyzer | SystemView |
|---|---|---|
| 가격 | 상용 (eval 가능) | 무료 (J-Link 필요) |
| RTOS 지원 폭 | 매우 넓음 | FreeRTOS·embOS 중심 |
| 분석 view | 다양함 (graph·heatmap·responsiveness) | 기본 timeline + table |
| 전송 채널 | RTT/UART/USB/TCP | RTT 위주 |
| 라이센스 부담 | 있음 | J-Link 묶음 |

소규모 프로젝트나 초기 디버깅엔 SystemView가 가볍게 시작하기 좋고, *제품 단위 분석*에는 Tracealyzer가 더 깊이 들어갑니다.

## ITM — Cortex-M의 Trace Macrocell

Instrumentation Trace Macrocell은 Cortex-M3/M4/M7에 들어 있는 *하드웨어 trace port*입니다. CPU가 직접 *32개 stimulus port*에 데이터를 쓰면, 그 데이터가 *TPIU(Trace Port Interface Unit)*를 거쳐 외부 trace probe로 나갑니다.

```c
// ITM port 0에 한 byte 전송 — 거의 0 오버헤드
static inline void itm_putc(char c) {
    if (ITM->TCR & ITM_TCR_ITMENA_Msk) {       // ITM enabled?
        while (ITM->PORT[0].u32 == 0);          // port ready?
        ITM->PORT[0].u8 = c;
    }
}
```

CPU 입장에선 *memory-mapped register에 write 한 번*이 전부입니다. 데이터 export는 TPIU가 알아서 합니다.

ITM이 자동으로 만들어 주는 이벤트도 있습니다.

- *PC sampling* — 일정 주기로 program counter 캡처
- *Exception trace* — IRQ 진입/종료
- *Watchpoint trace* — 특정 주소 access

이걸 OpenOCD/J-Link가 받아서 *flame graph* 생성에 쓰면 별도 코드 없이 profiling이 됩니다.

## ETM — 명령어 단위 트레이스

Embedded Trace Macrocell은 *실행된 모든 명령*을 압축해서 export하는 더 강력한 trace입니다. ITM은 *명시적 print*만 보내지만 ETM은 *모든 branch*를 자동으로 기록합니다.

```text
ETM 출력 예 (압축 해제 후):
0x0800_1234  ldr  r0, [r1]
0x0800_1238  cmp  r0, #0
0x0800_123C  beq  0x0800_1300        ← taken
0x0800_1300  mov  r2, #1
...
```

수 GB/s를 export하므로 *off-chip TPIU*나 *ETB(Embedded Trace Buffer)*가 필요합니다. Lauterbach TRACE32, ARM DS-5/DS, SEGGER J-Trace 같은 *고가 프로브*가 받아 줍니다.

ETM이 진짜 빛나는 경우는 *재현 안 되는 crash*입니다. ETB에 마지막 수천 명령이 남아 있으면 *crash까지의 control flow*를 정확히 재구성할 수 있습니다.

## Run-Time Stats — 가장 가벼운 시작

`configGENERATE_RUN_TIME_STATS = 1`을 켜면 FreeRTOS가 *task별 누적 실행 시간*을 추적합니다. 추가 도구 없이도 *CPU 점유율*을 볼 수 있는 가장 가벼운 옵션입니다.

```c
// FreeRTOSConfig.h
#define configGENERATE_RUN_TIME_STATS  1
#define portCONFIGURE_TIMER_FOR_RUN_TIME_STATS()  timer_init()
#define portGET_RUN_TIME_COUNTER_VALUE()          timer_get_cycles()
```

조회 코드는 다음과 같습니다.

```c
char buf[512];
vTaskGetRunTimeStats(buf);
printf("%s\n", buf);

// 출력 예
// Task          Abs Time      % Time
// IDLE          1234567       65%
// AUDIO_TASK    234567        12%
// NET_TASK      345678        18%
// LOG_TASK      45678         2%
```

오버헤드는 *task switch당 timer read 두 번*입니다. 보통 *2~3% 미만*입니다. 본격적인 trace 도구를 붙이기 전, 첫 진단 도구로 쓰기 좋습니다.

## 측정 — 오버헤드 비교

대표적인 실측 오버헤드입니다(Cortex-M4F @ 168 MHz 기준).

| 도구 | 이벤트당 비용 | 전체 CPU 오버헤드 |
|---|---|---|
| `printf` over UART | 100~500 μs | 측정 불가 (system 망가짐) |
| Run-time stats only | 50 ns | <1% |
| SystemView RTT | 100~200 ns | 2~5% |
| Tracealyzer streaming | 100~300 ns | 3~7% |
| ITM stimulus | 5~10 ns | <0.1% |
| ETM (full instr) | 0 (별도 port) | 0% (CPU 부담 없음) |

ITM이 SW trace보다 *10~30배 가볍습니다*. 단, ETM 수준의 정보 밀도는 *대용량 export bandwidth*를 요구해서 별도 HW를 깔아야 합니다.

## 실전 — IPC 인과 추적

다음과 같은 시나리오를 생각해 봅니다.

> "Task A가 큐에 메시지를 보냈는데, Task B가 가끔 5 ms 지나서 깨어납니다. 평소엔 100 μs면 깨는데요."

Tracealyzer로 이 trace를 캡처하면 *timeline 위에 무엇이 일어났는지* 한눈에 보입니다.

```text
t=0     Task A: xQueueSend → Task B를 ready로 표시
t=0     Scheduler: Task B preempt? — 더 높은 priority Task X가 RUNNING
t=0     ... Task X 계속 실행
t=5ms   Task X: vTaskDelay → block
t=5ms   Scheduler: Task B run → xQueueReceive return
```

원인은 *Task X의 priority가 B보다 높았고, 그동안 X가 자기 일을 했기 때문*이라는 게 분명해집니다. Print 디버깅으로는 *시간 정렬*이 안 되어 보이지 않을 일입니다.

## 자주 보는 함정과 안티패턴

> ⚠️ Trace buffer overflow

Snapshot mode에서 buffer가 작으면 *오래된 이벤트가 지워집니다*. 버그 발생 시점이 buffer보다 더 옛날이면 trace에 안 잡힙니다. Streaming mode로 바꾸거나, buffer를 *수 MB* 수준으로 늘립니다.

> ⚠️ Hook 안에서 RTOS API 호출

Trace hook은 *RTOS 내부에서* 호출되므로 그 안에서 `xQueueSend` 같은 API를 다시 부르면 *재진입 무한 루프*가 발생할 수 있습니다. Hook은 *기록만* 합니다.

> ⚠️ USB/UART trace의 bandwidth 한계

Full-speed USB는 *12 Mbps*입니다. Trace 데이터가 그보다 빠르게 만들어지면 buffer가 차서 drop이 발생합니다. RTT가 *수십 Mbps*로 훨씬 여유 있습니다.

> ⚠️ 디버거 의존성

RTT나 ITM은 *J-Link/ST-Link 연결*이 필요합니다. 필드 디바이스에서는 못 씁니다. 그럴 땐 *flash에 ring buffer로 dump*하고 나중에 회수하는 방식이 필요합니다.

> ⚠️ Trace 켜면 동작이 달라지는 버그

5% 오버헤드라도 *race condition*에는 영향을 줍니다. Trace 켜면 사라지는 버그는 *trace를 다시 끄고* 가벼운 ITM stimulus 몇 줄로 재현해 봅니다.

> ⚠️ 시계 기준이 다른 두 trace 비교

호스트 시각과 타겟 cycle count가 *동기화되지 않은 채* 비교하면 인과가 뒤집힙니다. 두 trace를 합치려면 *공통 trigger* 이벤트를 정해 시각을 정렬합니다.

## 정리

- RTOS는 `printf`로는 안 보이고, *시간축 시각화*가 본질적으로 필요합니다.
- Tracealyzer는 다양한 RTOS와 풍부한 view를 제공하며, snapshot/streaming 두 모드를 지원합니다.
- SystemView는 J-Link RTT 기반으로 가벼운 시작에 좋습니다.
- ITM은 Cortex-M의 하드웨어 trace port로 5~10 ns 수준의 stimulus를 보냅니다.
- ETM은 명령 단위 트레이스로 재현 안 되는 crash 분석에 빛납니다.
- Run-time stats는 FreeRTOS 자체 기능으로 1% 미만 오버헤드에 CPU 점유율을 보여 줍니다.
- Trace는 동작을 *살짝 바꿉니다*. race condition은 lightweight ITM으로 재확인합니다.

다음 편은 **2-12: 임베디드 시스템의 시간 동기화** — Tick, PTP, IEEE 1588을 다룹니다.

## 관련 항목

- [2-10: Scheduler Latency](/blog/embedded/rtos/practical-internals/part2-10-scheduler-latency)
- [2-05: Cortex-M Context Switch](/blog/embedded/rtos/practical-internals/part2-05-cortex-m-context)
- [5-06: ARM DS·Lauterbach](/blog/embedded/performance-engineering/part5-06-arm-ds-lauterbach)
- [5-07: Baremetal Profiling](/blog/embedded/performance-engineering/part5-07-baremetal-profiling)
