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

peripheral timer를 timeout마다 하나씩 배정할 수는 없습니다. software timer는 여러 논리적 만기를 kernel tick 하나와 daemon task 하나로 관리합니다. 부엌 타이머 여러 개를 사는 대신, 비서 한 명이 메모장에 "몇 시에 무엇"을 적어 두고 시계를 보다가 때가 되면 차례로 알려 주는 방식입니다. 비서가 한 명이라 한 일을 오래 붙잡으면 다른 알림이 밀립니다.

이 글은 FreeRTOS-Kernel **V11.2.0**(commit `0adc196d`) `timers.c`를 기준으로 하고, 같은 커널을 `ARM_CM3` 포트로 빌드해 QEMU 11.1.3 `mps2-an385`에서 돌린 결과를 함께 봅니다(`arm-none-eabi-gcc` 16.2.0, 1 kHz tick, daemon priority 7, `configTIMER_QUEUE_LENGTH 10`).

## Hardware vs Software Timer

| 항목 | Peripheral timer/compare | FreeRTOS software timer |
|---|---|---|
| 시간 기준 | peripheral clock·prescaler | kernel tick |
| 처리 문맥 | IRQ 또는 hardware output | daemon callback |
| 자원 한계 | channel·IRQ·clock | 객체 메모리·queue·daemon 처리량 |
| 검증할 지연 | compare부터 ISR/task까지 | command 수용·만기부터 callback까지 |

출력 edge의 시각이 중요하면 hardware output compare로 핀을 직접 바꾸고, software timer는 tick 단위로 충분한 일에 씁니다.

## FreeRTOS Timer 구조

V11.2.0의 `Timer_t`(`timers.c:85-93`)는 `pcTimerName`, `xTimerListItem`, `xTimerPeriodInTicks`, `pvTimerID`, `pxCallbackFunction`, `ucStatus`를 가집니다. 만기 tick은 `xTimerListItem`의 item value에 들어 있습니다. auto-reload 여부는 별도 field가 아니라 `ucStatus`의 `tmrSTATUS_IS_AUTORELOAD`(0x04) bit입니다(`:78-80`).

active timer는 `pxCurrentTimerList`와 `pxOverflowTimerList` **두 list**에 나뉘어 있고(`:143-146`), tick counter가 한 바퀴 돌 때 `prvSwitchTimerLists()`(`:202`)가 둘을 바꿉니다. 만기 tick이 wrap 뒤라면 overflow list에(`:912`), 아니면 current list에(`:926`) `vListInsert()`로 정렬 삽입합니다. 그래서 head 조회는 O(1), 삽입은 O(N)입니다.

## Timer Service Task — Daemon

`configUSE_TIMERS 1`이면 `vTaskStartScheduler()`가 `xTimerCreateTimerTask()`를 불러(`tasks.c:3709`) daemon task("Tmr Svc", `timers.c:64-65`)를 만듭니다. daemon은 다음 만기나 command 도착 중 먼저 오는 쪽까지 queue에서 기다리고, 깨어나면 만료 처리와 command 처리를 합니다. callback은 tick ISR이 아니라 **daemon task**에서 하나씩 실행됩니다.

그래서 callback이 block하면 daemon 전체가 멈춥니다. 아래 "One-Shot vs Auto-Reload" 절의 실행이 그 결과입니다. callback 안에서 `xTimerStart(other, portMAX_DELAY)`처럼 command queue에 block time을 주면, queue가 찼을 때 그 queue를 비울 유일한 주체인 daemon이 스스로 기다리게 됩니다.

## 자료구조 — Sorted List, Delta List, Timer Wheel, Heap

만기가 가까운 순서를 빠르게 찾아야 합니다. 자료구조 선택이 *전체 timer 시스템의 비용 곡선*을 결정합니다.

### Sorted List

가장 단순합니다. 만기 tick 오름차순으로 linked list를 유지합니다.

- **insert** — O(N), 적절한 위치 찾기
- **expire check** — O(1), head만 확인
- **pop expired** — O(1)

FreeRTOS가 이 구조를 씁니다(위의 두 list).

### Delta List

각 노드가 *절대 만기*가 아닌 *앞 노드와의 차이*를 저장합니다.

```text
head → +5 → +3 → +10 → +2 → ...
```

tick마다 head의 delta만 1 감소시키면 됩니다. insert 비용은 sorted list와 같지만 tick마다 하는 일이 head 하나로 끝납니다. 이 글에서 구현해 보지는 않았습니다.

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
- **expire check** — 그 slot에 걸린 timer 수만큼

N tick보다 먼 만기는 같은 slot을 여러 바퀴 뒤에 쓰므로, timer마다 남은 바퀴 수를 따로 두거나 계층 wheel로 넘겨야 합니다. Linux v6.12의 `Documentation/timers/hrtimers.rst`는 timer wheel이 고해상도 timer에 맞지 않았다는 경위를 설명하고, hrtimer는 "time sorted ordering"에만 쓰는 red-black tree를 택했다고 적습니다(`hrtimers.rst:92-97`).

### Min-Heap

priority queue로 구현하면 *insert와 pop 모두 O(log N)*입니다. 이 글에서 다룬 커널 중 timer에 min-heap을 쓰는 곳은 없습니다.

### 비교

| 구조 | 삽입 | 다음 만기/제거에서 확인할 점 |
|---|---|---|
| sorted list | O(N) | head 조회 O(1), 동시 만료 처리량 |
| min-heap | O(log N) | head O(1), pop O(log N) |
| wheel | 설계/범위에 따라 다름 | slot 충돌·round·cascade·동시 만료 |

Big-O는 timer 수에 따라 비용이 어떻게 늘어나는지를 말할 뿐 cycle 수가 아닙니다. 이 글에서는 자료구조별 시간을 재지 않았습니다.

## API 사용

`xTimerCreate()`와 조회 API는 바로 동작하지만, start/stop/reset/change/delete는 command queue를 거칩니다. 예를 들어 `xTimerStart(t, w)`는 `xTimerGenericCommand(t, tmrCOMMAND_START, xTaskGetTickCount(), NULL, w)` 매크로입니다(`include/timers.h:507-508`). **`pdPASS`는 queue에 넣었다는 뜻이지 timer가 이미 시작됐다는 뜻이 아닙니다.**

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

예제는 receiver 하나, timer 하나, period 3 tick입니다. start가 실패하면 handle은 만들어졌지만 dormant이므로 호출자가 다시 시도하거나 지웁니다. `receiver`가 static 하나라 이 함수는 timer 하나에만 씁니다. 그대로 돌린 결과입니다.

```text
create_once(period 3) -> 1
  notified after 3 ticks
```

## One-Shot vs Auto-Reload

one-shot은 만료 뒤 dormant가 되고, 다시 start/reset할 수 있습니다. auto-reload는 다음 만기를 "지난 만기 + period"로 잡습니다. 그 다음 만기도 이미 지났다면 `prvReloadTimer()`가 loop를 돌며 지난 만기만큼 callback을 연달아 부릅니다(`timers.c` `prvReloadTimer()` 본문). 주석도 "If the next expiry time has already passed, advance the expiry time, call the callback function, and try again"이라고 적습니다.

period 10의 auto-reload A의 첫 callback이 `vTaskDelay(35)`로 block하게 하고, period 5의 B를 함께 돌렸습니다. 이 출력은 네 번 돌려 네 번 같았습니다.

```text
auto-reload period 10 whose first callback blocks 35 ticks; plus timer B period 5:
  A callbacks at t=10 45 45 45 50 60 
  B callbacks at t=5 45 45 45 45 45 45 45 45 50 55 60 
```

A의 20·30·40 만기는 t=45에 연달아 3번 불렸고, B는 그동안 놓친 7번(10~40)을 t=45에 몰아 받았습니다. 그 뒤로는 원래 간격(A 50·60, B 50·55·60)으로 돌아옵니다. callback이 "몇 번 불렸는가"는 맞지만 "언제 불렸는가"는 daemon이 막힌 만큼 밀립니다. callback 안에서 시각을 직접 쓰는 코드라면 `xTaskGetTickCount()`로 실제 시각을 읽어야 합니다.

## Callback Context — Daemon Task에서 실행

callback은 daemon의 stack과 실행 시간을 공유합니다. 짧은 nonblocking 통지나 복사만 하고, 긴 일은 별도 worker에 맡깁니다. callback에서 queue에 보낼 때는 block time 0으로 보내고 반환값을 확인합니다. `pvTimerGetTimerID()`의 `void *`를 `int`로 좁히지 말고, 실제 객체 포인터나 `uintptr_t`로 다룹니다.

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

`xTimerStartFromISR()`도 command 매크로이고, 시각은 `xTaskGetTickCountFromISR()`로 찍습니다(`include/timers.h:885-886`). queue가 차 있으면 `pdFAIL`(= `pdFALSE`, `projdefs.h:52,60`)을 돌려줍니다. scheduler를 잠깐 멈춰 daemon이 queue를 비우지 못하게 한 상태에서 IRQ 하나를 pending시키고, 그 ISR이 위 함수를 14번 부르게 했습니다.

```text
ISR issues 14 xTimerStartFromISR with configTIMER_QUEUE_LENGTH=10 while daemon cannot run:
  accepted 10, rejected 4
```

queue 길이 10만큼 받고 나머지 4번은 거절됐습니다. 받아들여진 command도 daemon이 돌기 전까지는 처리되지 않으므로, ISR이 돌아온 시점에 timer가 이미 active라고 볼 수 없습니다.

## xTimerPendFunctionCall — 임의 함수 Deferral

`xTimerPendFunctionCall()`·`FromISR()`도 같은 daemon queue를 씁니다(3-09). 함수 포인터와 인자 두 개만 복사되므로, 포인터로 넘긴 데이터는 daemon이 처리할 때까지 살아 있어야 합니다. ISR stack의 지역 변수 주소를 넘기면 daemon이 읽을 때 이미 다른 값입니다. 위 실행처럼 timer command와 deferred call이 길이 10짜리 queue 하나를 나눠 쓰므로, deferred call이 많으면 timer command도 거절됩니다.

## 정확도 한계

만기 tick은 command를 보낸 tick + period입니다(앞의 `timers.h:507-508` 매크로). 그래서 tick 중간에 시작하면 실제 남은 시간은 period보다 그 tick의 남은 부분만큼 짧아집니다. period 5 one-shot을 tick 경계 뒤 0.1·0.5·0.9 tick 지점에서 시작하고, SysTick 현재값으로 1/100 tick 단위까지 재 봤습니다.

```text
  start at +0.10 tick -> callback after 5.35 ticks
  start at +0.50 tick -> callback after 4.90 ticks
  start at +0.90 tick -> callback after 4.24 ticks
```

네 번 돌린 값은 4.24~5.36 tick 사이에 흩어졌습니다(`logs/tmr-3runs.log`). QEMU의 SysTick은 host 시간에 묶여 있어 1/100 tick 값 자체는 실리콘과 다르고, 이 측정이 보여 줄 수 있는 것은 "period 5 timer의 실제 간격이 1 tick 넘게 흔들린다"는 데까지입니다. 예전 판의 "50.0 ms best / 51–52 ms worst" 같은 값은 출처가 없어 지웠습니다. tick보다 정밀한 시각이 필요하면 hardware timer compare를 씁니다.

## Tickless Idle — Battery 시스템

tickless idle은 지원 port가 다음 unblock 시점과 sleep 허용 상태를 확인하고 timer 중단·복귀·elapsed tick 보정을 처리하는 기능입니다. 단순히 SysTick LOAD에 idle_ticks를 곱하고 WFI 뒤 vTaskStepTick을 호출하는 예제는 race·counter 폭·조기 wake를 처리하지 못해 사용하지 않습니다.

자세한 port 조건은 [2-09 Tickless Idle](/blog/embedded/rtos/practical-internals/part2-09-tickless)을 따릅니다. 전체 MCU sleep 여부·소비 전류는 board clock·다른 peripheral·debug와 함께 측정합니다.

## 자주 보는 함정과 안티패턴

- callback에서 block해 daemon을 멈춥니다. 위 실행에서 35 tick block 한 번에 B의 callback 7번이 몰렸습니다.
- `pdPASS`를 command 완료로 봅니다. 받아들여졌을 뿐 처리는 daemon이 돌 때입니다.
- command queue 길이를 동시에 몰릴 수 있는 command 수보다 작게 잡습니다. ISR 한 번에 14개를 넣자 4개가 거절됐습니다.
- daemon priority를 가장 높게 두고 callback을 길게 씁니다. 그러면 callback 시간만큼 다른 모든 task가 밀립니다.
- tick 단위 timer로 tick보다 짧은 정밀도를 기대합니다.

## 정리

- V11.2.0은 current/overflow 두 정렬 list와 daemon task 하나로 timer를 관리합니다.
- start 등 제어 명령은 queue command이고, 만기는 보낸 tick + period입니다.
- auto-reload는 놓친 만기만큼 callback을 연달아 부릅니다(A 3번, B 7번이 t=45에 몰림).
- command queue가 차면 FromISR command는 거절됩니다(길이 10에 14개 중 4개).
- Linux hrtimer는 timer wheel 대신 시간순 red-black tree를 씁니다.

## 근거 자료

- [FreeRTOS V11.2.0 timers.c](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/timers.c), [timers.h](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/include/timers.h): 구조·command·callback·overflow/reload.
- [Linux v6.12 Documentation/timers/hrtimers.rst](https://github.com/torvalds/linux/blob/v6.12/Documentation/timers/hrtimers.rst): 정렬 tree와 timeout wheel 구분.



다음 편은 [4-10 System Call](/blog/embedded/rtos/practical-internals/part4-10-syscall)에서 user/kernel 모드 분리와 SVC trap을 다룹니다.

## 관련 항목

- [2-08: Tick Timer](/blog/embedded/rtos/practical-internals/part2-08-tick-timer)
- [3-09: ISR-Safe API](/blog/embedded/rtos/practical-internals/part3-09-isr-safe-api)
- [4-08: SMP Spinlock](/blog/embedded/rtos/practical-internals/part4-08-spinlock-smp)
- [4-10: System Call](/blog/embedded/rtos/practical-internals/part4-10-syscall)
