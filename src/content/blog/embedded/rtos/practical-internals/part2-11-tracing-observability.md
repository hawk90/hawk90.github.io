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

문제는 RTOS가 만들어내는 이벤트가 *수십 종류*에 *μs 단위*로 발생한다는 점입니다.

- Task switch — 어느 시점에 누가 누구를 밀어냈는가
- ISR 진입/종료 — 어떤 인터럽트가 얼마나 길게 실행되었는가
- Queue/semaphore/mutex 동작 — 누가 보내고 누가 받았는가
- Tick, timer expiry, software event

`printf`를 그 안에 박으면 *그 자체*가 실행 시간을 바꿔서 버그가 사라지거나 새로 생깁니다. 필요한 것은 관측 비용과 유실을 관리하는 trace 수집 구조와, 기록을 시간축에서 해석할 수 있는 도구입니다. trace도 실행 시간과 메모리·전송 부하를 바꾸므로 비용을 측정해야 합니다.

이 글에서는 Tracealyzer, SystemView, 그리고 그 아래에서 동작하는 ITM·ETM 하드웨어 트레이스를 살펴봅니다.

## 두 가지 접근 — SW Trace vs HW Trace

| 항목 | SW event trace | HW trace 구성 |
| --- | --- | --- |
| 데이터 출처 | RTOS hook·사용자 계측 코드 | ITM stimulus·DWT packet·ETM instruction trace 등 |
| CPU 영향 | 이벤트 기록·clock 읽기·buffer/전송 비용 | ITM의 SW write는 CPU 비용이 있고 ETM 등도 수집 설정·경쟁·stall 조건 확인 |
| 정보 범위 | 설치된 hook·filter·이벤트 | 구현·필터·decoder·실행 이미지에 따른 범위 |
| 전송 | RTT·UART·USB·네트워크·snapshot 등 | on-chip sink 또는 지원 trace 출력 |
| 요구 | recorder 통합·메모리·timestamp·지원 transport | 코어/SoC trace 기능·접근 권한·sink/probe·decoder |

ITM을 이용한 사용자 print는 하드웨어 trace 경로를 쓰더라도 SW instrumentation입니다. DWT 기반 PC sampling·exception·data trace와 ETM instruction trace도 같은 종류의 이벤트로 뭉뚱그리면 안 됩니다. “SW는 100 ns, HW는 0” 같은 고정 비용 비교는 실제 구성을 설명하지 못합니다.

## Tracealyzer — 시각화의 결정판

Percepio Tracealyzer는 recorder가 수집한 RTOS 이벤트를 timeline·CPU load·IPC 관점 등으로 분석합니다. 지원 RTOS·버전·transport는 사용하는 recorder와 호스트 도구의 문서를 확인합니다.

snapshot은 타깃 buffer를 나중에 회수하고 streaming은 실행 중 데이터를 전송합니다. snapshot buffer가 가득 찼을 때는 stop/overwrite 정책이 있을 수 있으며, streaming도 bandwidth·buffer·수집 장애에 따라 drop이 생길 수 있습니다.

공식 FreeRTOS getting-started guide는 trace facility와 trcRecorder.h·recorder 설정·hardware port·stream port 통합을 요구합니다. 다음은 **그 통합을 완료한 뒤** 사용하는 API 발췌이며 독립 main 함수 전체가 아닙니다.

```c
/* Recorder headers/configuration and hardware setup are required. */
if (xTraceEnable(TRC_START) != TRC_SUCCESS) {
    /* Report recorder startup failure through a safe application path. */
}
```

일반 경로에서는 RTOS object 생성 전 초기화·시작을 수행합니다. 다만 FreeRTOS tick과 같은 timestamp source를 쓰는 일부 hardware port는 object 생성 전에 xTraceInitialize를 하고 scheduler 시작 뒤 xTraceEnable을 해야 합니다. 문서에 적힌 포트별 순서를 우선합니다. configGENERATE_RUN_TIME_STATS나 formatting 설정을 켜는 것만으로 trace 통합을 대신할 수는 없습니다.

기록되는 범위는 설치한 hook·지원 이벤트·filter에 따릅니다. “모든 이벤트가 추가 코드 없이 자동 기록된다”는 보편적 보장은 하지 않습니다.

## SystemView — RTT의 친구

SEGGER SystemView는 RTOS integration과 사용자 event를 수집하고 호스트에서 분석합니다. RTT는 타깃 메모리의 ring buffer를 이용하는 전송 방식이며 debug probe가 비정지 접근을 지원하는 환경에서 CPU를 멈추지 않고 읽을 수 있습니다. 실제 처리량과 간섭은 probe·debug clock·타깃 memory·event 양에 달려 있습니다.

SEGGER_SYSVIEW_Conf와 SEGGER_SYSVIEW_Start 같은 함수는 timestamp·RTOS hook·buffer·transport 설정이 준비된 통합 예제 안에서 사용합니다. MarkStart/MarkStop 등의 사용자 이벤트도 사용하는 SDK 버전의 선언과 설정을 확인합니다.

| 항목 | 확인할 조건 |
| --- | --- |
| 분석 | 필요한 task/ISR/IPC 이벤트와 view가 지원되는가? |
| 전송 | live RTT인지, 저장된 trace를 나중에 분석하는지? |
| 손실 | buffer 포화·drop·blocking 정책을 관찰했는가? |
| 라이선스 | 목적·호스트 도구·타깃 코드·probe별 조건이 맞는가? |

**2026-10-22 확인한 공식 user guide**는 SystemView 비상업 용도의 무료 조건과 상업 용도 라이선스를 구분합니다. “J-Link가 있으면 모든 용도로 무료”라고 할 수 없습니다. 저장 trace의 offline 분석도 가능하므로 모든 분석 단계에 probe 연결이 필수인 것은 아닙니다.

## ITM — Cortex-M의 Trace Macrocell

ITM을 구현한 Cortex-M에서는 stimulus port로 software event를 보낼 수 있습니다. core·SoC의 trace 경로와 pin·clock·접근 권한·TER 설정 및 host decode를 준비해야 합니다. ITM write 한 번만으로 수신이 보장되거나 거의 0 비용이 되는 것은 아닙니다.

다음은 **Cortex-M4 CMSIS register 정의를 사용하는 조건부 전송 예제**입니다. stimulus가 준비되지 않으면 기다리지 않고 false를 반환합니다. 단일 writer 또는 외부 동기화 계약을 전제로 하며 probe 연결과 실제 전송 완료까지 보장하지 않습니다.

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

CMSIS의 ITM_SendChar도 buffer가 busy이면 기다리는 구현을 포함합니다.

기존의 무제한 while 대기는 trace가 막힐 때 관측 대상의 진행을 멈추는 원인이 됩니다.

PC sampling·exception trace·data trace는 DWT가 생성하고 ITM 경로에 실리는 기능과 구분해서 봅니다. 임의의 ITM print만으로 호출 stack과 flame graph가 자동 생성되지는 않으며 sampling·symbol·decoder가 추가로 필요합니다.

## ETM — 명령어 단위 트레이스

ETM instruction trace는 분기·주소·상태 등 압축 packet과 실행 이미지를 이용해 선택된 실행 흐름을 재구성합니다. 모든 instruction을 항상 그대로 전송하는 메모리 dump가 아니며 필터·on/off 구간·overflow·decode 조건의 영향을 받습니다.

on-chip buffer 또는 SoC가 지원하는 trace output과 수집·decode 도구가 필요합니다. TPIU와 ETB는 서로 같은 종류의 장치가 아니며 모든 MCU가 같은 trace fabric이나 충분한 buffer를 제공하지 않습니다. 필요한 bandwidth는 코어·trace 설정·실행 패턴에 따라 계산합니다.

crash 직전의 trace를 보존하면 경로 분석에 도움이 되지만 buffer가 얼마나 남는지, reset 뒤 유지되는지, 실행 이미지와 동기 packet을 확보했는지 확인해야 합니다. 출처 없는 GB/s 수치나 마지막 몇 천 명령 보존을 범용 보장으로 사용하지 않습니다.

## Run-Time Stats — 가장 가벼운 시작

FreeRTOS **V11.2.0**의 run-time stats는 태스크별 누적 실행 counter를 제공합니다. configGENERATE_RUN_TIME_STATS와 유효한 timer accessor가 필요하며, raw snapshot API에는 configUSE_TRACE_FACILITY 설정도 확인합니다. timer 폭·overflow·주파수와 snapshot 비용을 분석해야 합니다.

고정 512 byte 문자열에 vTaskGetRunTimeStats를 쓰면 태스크 수·이름 길이·API 버전에 따른 출력 크기를 보장하기 어렵습니다. 다음은 raw data를 **최대 8개 태스크**까지 읽고, 작으면 실패로 처리하는 예제입니다. snapshot 메모리·이름 수명·출력 동기화는 호출자 계약에 포함합니다.

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

단일 코어에서 태스크 누적 시간을 전체 counter와 나누면 점유율을 계산할 수 있습니다. ISR 시간의 귀속과 SMP의 분모는 별도로 해석해야 하며 태스크 비율의 합이 언제나 100%라고 가정하지 않습니다. 이 함수 호출의 스택 사용량과 scheduler 정지 구간도 관찰 대상에 영향을 줄 수 있습니다.

원본 포트·kernel 경로에 따라 counter 읽기 횟수와 hook 비용이 달라집니다. “전환당 두 번, 항상 1% 미만” 같은 고정 비용을 보장하지 않습니다.

## 측정 — 오버헤드 비교

아래 조건을 맞춰 trace off/on을 비교해야 관측 비용을 말할 수 있습니다. 실제 수집 로그가 없는 168 MHz 측정표나 ITM 5–10 ns, ETM 0%, 도구 간 배수 비교는 실측 결과로 제시하지 않습니다.

| 관측 항목 | 비교할 조건 |
| --- | --- |
| task latency | 같은 workload·IRQ·clock에서 off/on 분포 |
| CPU·memory | event rate·recorder code·buffer·stack 사용량 |
| 전송 | 생성 bytes/s·실제 drain rate·drop·block 시간 |
| trace 유효성 | filter·timestamp·overflow·snapshot 범위 |
| 계측 비용 | marker/clock read 자체의 비용과 최악 영향 |

non-blocking drop 정책은 target 진행을 우선하는 대신 trace가 불완전해질 수 있습니다. blocking 정책은 보존에 유리할 수 있지만 지연을 늘립니다. 정책과 손실 수를 함께 보고해야 관측 결과를 해석할 수 있습니다.

## 실전 — IPC 인과 추적

Task A가 큐로 보낸 메시지를 Task B가 5 ms 뒤에 처리했다는 **가상 시나리오**를 봅니다. 다음은 실제 수집 로그가 아니라 가설을 확인하기 위한 이벤트 순서입니다.

| 상대 시각 | 확인할 event |
| --- | --- |
| 0 | A의 queue send, B의 blocked→ready |
| 0 부근 | B보다 높은 우선순위 X가 실행 중인지 |
| 0–5 ms | X의 실행·IRQ·scheduler suspend·trace 누락 여부 |
| 5 ms | X block 이후 B 선택과 queue receive 복귀 |

완전한 trace에서 이 순서가 확인되면 우선순위 정책에 의한 지연이라는 가설을 지지합니다. send 자체의 block·메시지 대기·IRQ 간섭·buffer drop 같은 다른 원인도 배제해야 합니다. timeline만 보고 인과를 확정하지 않습니다.

## 자주 보는 함정과 안티패턴

- **buffer full 정책을 모릅니다.** snapshot은 stop/overwrite, streaming은 drop/block 등의 설정을 확인합니다. RAM을 무조건 수 MB 늘리는 처방 대신 사건 window와 event rate로 계산합니다.
- **hook에서 RTOS API를 재호출합니다.** lock·IRQ·재진입 계약을 깨뜨릴 수 있으므로 지원 recorder 방식으로 최소 기록만 수행합니다.
- **link nominal rate를 trace payload로 간주합니다.** USB·UART·RTT 모두 framing·probe·clock·buffer·host drain 조건을 포함해 실제 처리량을 측정합니다.
- **필드 수집은 불가능하다고 단정합니다.** 현장 transport 또는 저장 후 회수도 가능하지만 flash 수명·crash 보존·재부팅·개인 데이터 등의 제품 계약을 설계해야 합니다.
- **trace가 버그를 바꾸지 않는다고 생각합니다.** 최소 계측·다른 수집 방식·off/on 실험으로 간섭을 확인합니다.
- **다른 clock의 기록을 바로 병합합니다.** 공통 trigger로 정렬하고 offset·drift·불확실성을 기록합니다.

## 정리

- RTOS trace는 task·ISR·IPC 순서를 보는 데 유용하지만 관측 비용과 유실을 관리해야 합니다.
- recorder 통합과 지원 이벤트·timestamp·transport 설정이 수집 범위를 정합니다.
- SystemView의 용도별 라이선스와 offline 분석 가능 여부는 공식 문서로 확인합니다.
- ITM software write·DWT event·ETM instruction trace는 서로 다른 정보원입니다.
- run-time stats는 bounded raw snapshot과 counter·ISR·SMP 해석 범위를 확인합니다.
- 비용·정확도·전송률은 실제 구성으로 비교하며 고정 ns·%를 일반화하지 않습니다.

이 장으로 Part 2를 마칩니다. 다음은 Part 3의 Critical Section 구현 비교입니다. ISR·trace hook에서 어떤 동기화가 허용되는지 이어서 살펴봅니다.

## 근거 자료

- [Percepio 공식 FreeRTOS 시작 가이드](https://percepio.com/getstarted/latest/html/freertos.html): 초기화 순서·hardware port 예외·snapshot buffer 정책.
- [SEGGER SystemView User Guide](https://doc.segger.com/UM08027_SystemView.html): 통합·기록·라이선스·offline 분석.
- [Arm CMSIS 6.1.0 core_cm4.h](https://github.com/ARM-software/CMSIS_6/blob/v6.1.0/CMSIS/Core/Include/core_cm4.h): ITM register·ITM_SendChar 조건과 대기.
- [FreeRTOS V11.2.0 task.h](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/include/task.h), [tasks.c](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/tasks.c): raw stats API·snapshot 범위.

- [3-01: Critical Section 구현 비교](/blog/embedded/rtos/practical-internals/part3-01-critical-section)

## 관련 항목

- [2-10: Scheduler Latency](/blog/embedded/rtos/practical-internals/part2-10-scheduler-latency)
- [2-05: Cortex-M Context Switch](/blog/embedded/rtos/practical-internals/part2-05-cortex-m-context)
- [5-06: ARM DS·Lauterbach](/blog/embedded/performance-engineering/part5-06-arm-ds-lauterbach)
- [5-07: Baremetal Profiling](/blog/embedded/performance-engineering/part5-07-baremetal-profiling)
