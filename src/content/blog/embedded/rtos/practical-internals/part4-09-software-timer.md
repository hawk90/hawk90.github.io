---
title: "Software Timer 분석 — Daemon Task·자료구조·ISR-Safe API"
slug: "embedded/rtos/practical-internals/part4-09-software-timer"
date: 2026-05-07T09:41:00
description: "FreeRTOS Software Timer 내부를 따라가며 daemon task 구조, sorted list와 timer wheel 자료구조, one-shot/auto-reload 동작, xTimerStartFromISR과 xTimerPendFunctionCall을 통한 ISR 워크 deferral을 정리합니다."
series: "Practical RTOS Internals"
seriesOrder: 41
tags: [software-timer, daemon, callback, timer-wheel]
topics: ["embedded", "embedded/rtos"]
---

## 한 줄 요약

> FreeRTOS software timer의 만기 callback은 timer daemon에서 실행됩니다. 수량·tick 해상도·command queue·daemon 응답 시간에 한계가 있습니다.

## 어떤 문제를 푸는가

peripheral timer를 timeout마다 하나씩 배정할 수는 없습니다. software timer는 여러 논리적 만기를 kernel tick과 daemon으로 관리합니다. 이 글은 FreeRTOS-Kernel **V11.2.0 timers.c**를 기준으로 합니다.

hardware compare 해상도와 ISR/task가 실제로 실행되는 지연은 다릅니다. software timer도 메모리·queue·CPU 예산의 유한한 범위에서 사용할 수 있으며 수량 무제한이나 보편적인 수 ms 오차를 보장하지 않습니다.

## Hardware vs Software Timer

| 항목 | Peripheral timer/compare | FreeRTOS software timer |
|---|---|---|
| 시간 기준 | peripheral clock·prescaler | kernel tick |
| 처리 문맥 | IRQ 또는 hardware output | daemon callback |
| 자원 한계 | channel·IRQ·clock | 객체 메모리·queue·daemon 처리량 |
| 검증할 지연 | compare부터 ISR/task까지 | command 수용·만기부터 callback까지 |

출력 edge가 중요하면 hardware output compare와 task wake를 구분합니다. watchdog·control loop의 허용 오차는 제품 요구에 따라 분석합니다.

## FreeRTOS Timer 구조

V11.2.0의 Timer_t는 pcTimerName, xTimerListItem, xTimerPeriodInTicks, pvTimerID, pxCallbackFunction과 ucStatus 등의 상태를 가집니다. expiry는 list item value에 보관합니다. auto-reload 여부 등은 status bit로 관리되므로 독립 auto_reload field를 가정하지 않습니다.

active timer에는 current/overflow **두 list**를 사용하며 tick wrap 때 전환합니다. 한 list에서 head 조회는 O(1), 정렬 삽입은 O(N)입니다. 단순 now >= expiry 비교만 있는 의사 loop는 wrap·command timestamp·reload catch-up을 재현하지 못합니다.

## Timer Service Task — Daemon

configUSE_TIMERS가 켜지면 scheduler 시작 과정에서 timer service task가 준비됩니다. daemon은 다음 만기 또는 command 도착까지 기다리고, timer command와 만료 처리를 수행합니다. callback은 tick ISR이 아니라 **daemon task**에서 직렬 실행됩니다.

callback에서 blocking I/O·vTaskDelay·양의 block time을 쓰는 API 호출은 daemon 전체를 지연시킬 수 있습니다. task context라는 이유로 모든 API를 무제약 호출할 수 있는 것은 아닙니다. command queue에 자기 자신이 기다리는 식의 교착도 피해야 합니다. priority와 stack은 workload·timer budget·다른 task deadline을 함께 분석해 설정합니다.

## 자료구조 — Sorted List, Delta List, Timer Wheel, Heap

만기가 가까운 순서를 빠르게 찾아야 합니다. 자료구조 선택이 *전체 timer 시스템의 비용 곡선*을 결정합니다.

### Sorted List

가장 단순합니다. 만기 tick 오름차순으로 linked list를 유지합니다.

- **insert** — O(N), 적절한 위치 찾기
- **expire check** — O(1), head만 확인
- **pop expired** — O(1)

timer 수가 적으면(수십 개) 충분합니다. FreeRTOS가 이 구조를 씁니다.

### Delta List

각 노드가 *절대 만기*가 아닌 *앞 노드와의 차이*를 저장합니다.

```text
head → +5 → +3 → +10 → +2 → ...
```

tick마다 head의 delta만 1 감소시키면 됩니다. insert 비용은 sorted list와 같지만 *tick 처리가 O(1)*입니다. tick ISR에서 직접 처리하는 시스템에 적합합니다.

### Timer Wheel

원형 배열을 시계처럼 사용합니다. 각 slot이 *그 시각에 만료될 timer들의 list*를 가집니다.

```text
slot[0]   → timer A, timer B
slot[1]   → (empty)
slot[2]   → timer C
...
slot[N-1] → timer D
```

- **insert** — O(1), `slot index = expiry_tick % N`
- **expire check** — O(slot 안 timer 수), 보통 O(1)

Linux hrtimer는 time-ordered red-black tree 기반입니다. 일반 timeout용 timer wheel과 구분해야 합니다. 단순 modulo slot만으로 먼 만기·round 수·wrap 처리가 해결되지는 않습니다.

### Min-Heap

priority queue로 구현하면 *insert와 pop 모두 O(log N)*입니다. 이는 일반적인 자료구조 대안입니다. Linux POSIX timer가 모두 min-heap이라는 뜻은 아닙니다.

### 비교

| 구조 | 삽입 | 다음 만기/제거에서 확인할 점 |
|---|---|---|
| sorted list | O(N) | head 조회 O(1), 동시 만료 처리량 |
| min-heap | O(log N) | head O(1), pop O(log N) |
| wheel | 설계/범위에 따라 다름 | slot 충돌·round·cascade·동시 만료 |

Big-O를 cycle 수로 바꿀 수는 없습니다. timer 수만으로 수백 개부터 wheel이 정답이라고 결정하지 말고, 범위·정확도·취소 빈도·burst와 실제 구현을 측정합니다.

## API 사용

xTimerCreate와 조회 API까지 모두 queue command인 것은 아닙니다. start/stop/reset/change/delete 같은 제어 명령은 queue를 거치며 **pdPASS는 enqueue 성공이지 완료 확인이 아닙니다.** 생성 실패와 command 실패를 각각 처리합니다.

```c title="timer-once.c"
#include "FreeRTOS.h"
#include "task.h"
#include "timers.h"

static TaskHandle_t receiver;
static void once_callback(TimerHandle_t timer)
{
    (void)timer;
    xTaskNotifyGive(receiver); /* nonblocking; receiver 수명은 timer보다 길어야 함 */
}

/* 시작 전에 호출. 생성 성공/command 실패면 dormant handle을 호출자에게 돌려줌. */
BaseType_t create_once(TaskHandle_t target, TimerHandle_t *out)
{
    if (target == NULL || out == NULL || receiver != NULL) return pdFAIL;
    *out = xTimerCreate("once", 3, pdFALSE, NULL, once_callback);
    if (*out == NULL) return pdFAIL;
    receiver = target;
    return xTimerStart(*out, 0);
}
```

예제는 한 receiver/한 timer, period 3 tick입니다. start가 실패하면 handle은 생성되었지만 dormant이므로 호출자가 retry 또는 delete 수용·완료를 관리합니다. 이 storage/lifetime을 여러 timer에 공유하지 않습니다. callback 통지의 최종 소비·작업 실행 시간도 별도입니다.

## One-Shot vs Auto-Reload

one-shot은 만료 뒤 dormant이 됩니다. 다시 start/reset할 수 있습니다. auto-reload는 period 기준으로 다음 만기를 관리하지만 daemon이 늦어지면 이미 지난 여러 만기에 대한 callback이 밀려 실행될 수 있습니다. 모든 callback이 정확한 wall-clock 간격으로 불린다고 가정하지 않습니다.

둘 다 command 처리 시점·tick wrap와 pending command를 포함한 상태 계약을 확인합니다.

## Callback Context — Daemon Task에서 실행

callback은 daemon의 stack과 실행 시간을 공유합니다. 짧은 nonblocking signal/copy만 하고, 시간이 긴 일은 별도 worker에 맡깁니다. queue send를 쓰면 0 block time과 반환값을 검사하고 포화 시 drop/coalesce/fault 정책을 정합니다. pvTimerGetTimerID의 void pointer를 int로 좁히지 말고 실제 객체 포인터 또는 명시한 uintptr_t 범위를 사용합니다.

## ISR-Safe API

ISR에서는 지원되는 FromISR 변형과 해당 port의 IRQ priority 계약을 사용합니다.

```c title="timer-irq.c"
#include "FreeRTOS.h"
#include "task.h"
#include "timers.h"

/* 실제 ISR에서 ACK 이후 호출. 실패는 호출자가 기록/재시도 정책으로 처리. */
BaseType_t request_timer_start_from_irq(TimerHandle_t timer)
{
    BaseType_t woken = pdFALSE;
    BaseType_t result = xTimerStartFromISR(timer, &woken);
    portYIELD_FROM_ISR(woken);
    return result;
}
```

queue가 full이면 pdFAIL이 반환됩니다. 수용되더라도 daemon 실행 전이므로 ISR이 timer를 즉시 active로 바꾸었다고 해석하지 않습니다. header compile 검사는 실제 IRQ ACK·priority·queue 포화 동작을 검증하지 않습니다.

## xTimerPendFunctionCall — 임의 함수 Deferral

xTimerPendFunctionCall/FromISR도 같은 daemon queue를 사용합니다. callback function과 pointer payload는 daemon이 소비할 때까지 살아 있어야 합니다. ISR stack의 지역 객체 주소를 넘겨 나중에 읽게 해서는 안 됩니다. payload 복사·pool·ownership 이전 등 수명 계약을 정하고 enqueue 실패도 처리합니다.

deferred work를 무제한 늘리면 timer 자체의 응답 시간도 나빠집니다. 긴 작업은 별도 worker queue로 분리할 수 있습니다.

## 정확도 한계

100 Hz에서 5 tick은 명목상 50 ms지만 start 호출의 tick phase에 따라 실제 남은 시간은 달라집니다. daemon scheduling·command backlog·다른 callback·IRQ·tickless 보정도 영향을 줍니다. 50.0 ms best case나 51–52 ms worst case 같은 보편값은 없습니다.

hardware timer가 semaphore/notification으로 task를 깨워도 task 실행 지연은 남습니다. µs deadline은 compare/ISR/task 각각의 latency budget과 측정으로 검증해야 합니다.

## Tickless Idle — Battery 시스템

tickless idle은 지원 port가 다음 unblock 시점과 sleep 허용 상태를 확인하고 timer 중단·복귀·elapsed tick 보정을 처리하는 기능입니다. 단순히 SysTick LOAD에 idle_ticks를 곱하고 WFI 뒤 vTaskStepTick을 호출하는 예제는 race·counter 폭·조기 wake를 처리하지 못해 사용하지 않습니다.

자세한 port 조건은 [2-09 Tickless Idle](/blog/embedded/rtos/practical-internals/part2-09-tickless)을 따릅니다. 전체 MCU sleep 여부·소비 전류는 board clock·다른 peripheral·debug와 함께 측정합니다.

## 자주 보는 함정과 안티패턴

- callback에서 blocking API를 호출해 daemon과 다른 timer를 지연시키는 경우.
- pdPASS를 command 완료로 보거나 delete 뒤 pending callback·payload 수명을 무시하는 경우.
- command queue 용량을 timer 수의 고정 배수로 정하고 producer burst·daemon service rate를 분석하지 않는 경우.
- daemon priority를 무조건 최고로 높여 다른 deadline을 침해하는 경우.
- tick 해상도와 callback/worker 실제 실행 지연을 혼동하는 경우.

## 정리

- timer 수는 메모리·queue·처리 예산으로 제한됩니다.
- V11.2.0은 current/overflow sorted list와 daemon task를 사용합니다.
- 제어 명령 enqueue와 실제 상태 변경·callback 완료는 구분합니다.
- callback은 nonblocking으로 짧게 유지하고 ISR/payload 수명·포화를 처리합니다.
- Linux hrtimer는 timer wheel과 다른 tree 기반이며 Big-O는 cycle 측정값이 아닙니다.

## 근거 자료

- [FreeRTOS V11.2.0 timers.c](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/timers.c), [timers.h](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/include/timers.h): 구조·command·callback·overflow/reload.
- [Linux hrtimers 설계](https://docs.kernel.org/timers/hrtimers.html): 정렬 tree와 timeout wheel 구분.



다음 편은 [4-10 System Call](/blog/embedded/rtos/practical-internals/part4-10-syscall)에서 user/kernel 모드 분리와 SVC trap을 다룹니다.

## 관련 항목

- [2-08: Tick Timer](/blog/embedded/rtos/practical-internals/part2-08-tick-timer)
- [3-09: ISR-Safe API](/blog/embedded/rtos/practical-internals/part3-09-isr-safe-api)
- [4-08: SMP Spinlock](/blog/embedded/rtos/practical-internals/part4-08-spinlock-smp)
- [4-10: System Call](/blog/embedded/rtos/practical-internals/part4-10-syscall)
