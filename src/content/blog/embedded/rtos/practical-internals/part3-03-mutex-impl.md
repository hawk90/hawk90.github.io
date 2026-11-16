---
title: "Mutex 내부 구현 추적 — Owner·Recursion Count·ISR 금지"
slug: "embedded/rtos/practical-internals/part3-03-mutex-impl"
date: 2026-05-06T09:24:00
description: "FreeRTOS V11.2.0의 Queue·TCB 상태를 따라 mutex 소유자와 재귀 횟수, priority inheritance·복원 조건 및 ISR 사용 제한을 확인합니다."
series: "Practical RTOS Internals"
seriesOrder: 24
tags: [mutex, owner, recursion, lock-count, queue]
draft: false
topics: ["embedded", "embedded/rtos"]
---

## 한 줄 요약

FreeRTOS **V11.2.0**의 mutex는 Queue 구조를 사용하지만, 소유 task·보유 mutex 수·priority inheritance와 재귀 횟수의 계약이 추가됩니다. **대기자가 높으면 소유자가 priority를 상속**하며, 모든 중첩 mutex에서 완전한 chain propagation과 즉시 원상복귀를 보장하는 구현은 아닙니다.

## Queue와 TCB에 나뉜 상태

`queue.c`의 `Queue_t`는 mutex 용도로 `u.xSemaphore.xMutexHolder`와 `uxRecursiveCallCount`를 사용합니다(L74-L78, 1-08). task의 `uxBasePriority`·현재 `uxPriority`·`uxMutexesHeld`는 `tasks.c`의 TCB 쪽 상태입니다(L388, L414-L415). 열쇠 꾸러미에 비유하면 mutex 쪽에는 "지금 누가 열쇠를 가졌나", 사람 쪽에는 "열쇠를 몇 개 들고 있나"가 적혀 있습니다.

| 상태 | 위치·의미 |
| --- | --- |
| xMutexHolder | Queue의 union 안에 있는 소유 task |
| uxRecursiveCallCount | recursive take 횟수 |
| uxMessagesWaiting | 가용 token을 나타내는 count |
| uxBasePriority | task의 base priority |
| uxPriority | 상속을 포함한 현재 priority |
| uxMutexesHeld | task가 보유한 mutex 수 |

필드·함수 이름은 이 태그 기준입니다. `Queue_t`는 `queue.c` 안에서만 정의되는 불완전 타입이라 응용은 필드에 직접 접근할 수 없고, holder는 `xSemaphoreGetMutexHolder()`로만 읽습니다.

## Take의 실제 경로

일반 `xSemaphoreTake()`는 `xQueueSemaphoreTake()`로 연결됩니다(3-02). mutex를 획득하면 `pvTaskIncrementMutexHeldCount()`로 holder를 기록하고 보유 수를 올리며(`queue.c` L1702-L1706), 이미 잠겨 있어 block해야 할 때만 `xTaskPriorityInherit()`가 동작합니다(L1787-L1791). timeout 0으로 즉시 실패하는 요청은 상속을 일으키지 않습니다.

recursive API `xQueueTakeMutexRecursive()`(L818)는 holder가 자기 자신이면 `uxRecursiveCallCount`만 올리고(L833), 아니면 공통 `xQueueSemaphoreTake()`를 부릅니다(L840). 일반 mutex를 같은 task가 다시 take하면 이 분기가 없어 자기 자신을 기다립니다(1-08의 `mutex-check.c`: timeout 0에서 `pdFALSE`).

## Give와 소유자 위반

recursive give `xQueueGiveMutexRecursive()`(L759)는 현재 task가 holder인지 확인하고(L774), 아니면 `pdFAIL`을 돌려줍니다(L803). holder라면 count를 줄이고, 0이 될 때만 공통 send 경로로 실제 release합니다(L786). 내부 횟수만 줄어든 상태에서는 다른 task가 획득할 수 없습니다.

일반 `xSemaphoreGive()`는 다릅니다. non-owner가 부르면 `xTaskPriorityDisinherit()`의 `configASSERT( pxTCB == pxCurrentTCB )`에서 멈추고(1-08의 QEMU 실험: `tasks.c` line 6755), `configASSERT`가 없는 빌드에서는 검사 없이 진행합니다. recursive 쪽만 오류를 *반환*으로 알려 줍니다.

## 작은 예제 — 일반·재귀 Mutex 계약

다음은 assert가 활성화된 **test task**용 예제입니다. NDEBUG 없이 실행하며 mutex·recursive mutex·동적 allocation 지원이 필요합니다. 성공한 take와 같은 종류의 give를 짝짓습니다.

```c title="mutex-contract.c"
#include <assert.h>
#include "FreeRTOS.h"
#include "semphr.h"
void check_mutex_contract(void) {
    SemaphoreHandle_t m = xSemaphoreCreateMutex();
    assert(m != NULL);
    assert(xSemaphoreTake(m, 0) == pdTRUE);
    assert(xSemaphoreTake(m, 0) == pdFALSE);
    assert(xSemaphoreGive(m) == pdTRUE);
    vSemaphoreDelete(m);
    SemaphoreHandle_t r = xSemaphoreCreateRecursiveMutex();
    assert(r != NULL);
    assert(xSemaphoreTakeRecursive(r, 0) == pdTRUE);
    assert(xSemaphoreTakeRecursive(r, 0) == pdTRUE);
    assert(xSemaphoreGiveRecursive(r) == pdTRUE);
    assert(xSemaphoreGiveRecursive(r) == pdTRUE);
    assert(xSemaphoreGiveRecursive(r) == pdFALSE);
    vSemaphoreDelete(r);
}
```

이 단일 task 검사만으로는 다른 waiter가 첫 give 뒤에도 차단되는지 알 수 없으므로, 두 task로 QEMU에서 돌렸습니다. low(우선순위 1)가 recursive mutex를 두 번 take한 뒤 hi(우선순위 3)를 만들면, hi는 곧바로 선점해 take에서 block합니다. low가 한 번 give하고, 다시 한 번 give합니다. 같은 프로그램은 위 `mutex-contract.c`도 실제 커널로 먼저 실행합니다.

```text
mutex-contract.c passed
non-owner (hi) is blocked; low gives once -> hi_got=0; [hi took r; its give -> 1, extra give -> 0] after second give hi_got=1
recursive give by a task that does not own r -> 0
```

첫 give 뒤에는 `hi_got=0`이라 hi가 여전히 기다렸고, 두 번째 give에서 count가 0이 되자 hi가 곧바로 선점해 mutex를 가져갔습니다. hi가 한 번 give한 뒤의 여분 give, 그리고 mutex를 갖지 않은 low의 give는 둘 다 `pdFAIL`(0)이었습니다. 멈추지 않고 반환된다는 점이 일반 mutex와 다릅니다. FreeRTOS V11.2.0 `ARM_CM3`, arm-none-eabi-gcc 16.2.0 `-O2`, QEMU 11.1.3 `mps2-an385 -icount shift=5`입니다.

## Priority Inheritance와 복원

block한 높은 priority task 때문에 낮은 priority의 **holder**가 boost됩니다. 대기자의 priority를 holder 쪽으로 낮추는 동작이 아닙니다. base priority 0도 정상 priority입니다.

복원 경로는 둘입니다. 일반 give의 `xTaskPriorityDisinherit()`는 `uxMutexesHeld`가 0이 될 때만 base priority로 돌아갑니다(1-08의 QEMU 실험). waiter가 timeout으로 떠날 때는 `vTaskPriorityDisinheritAfterTimeout()`(`tasks.c` L6836)이 남은 waiter 중 가장 높은 priority와 base 중 큰 값으로 낮추되, holder가 mutex를 **하나만** 들고 있을 때만 그렇게 합니다. 원문 주석은 "Only disinherit if no other mutexes are held. This is a simplification in the priority inheritance implementation."입니다(L6865-L6871).

같은 QEMU 프로그램의 뒷부분이 이 조건을 보여 줍니다. low가 m1(그리고 두 번째에는 m2까지)을 쥔 채 일하고, hi가 m1을 timeout 5로 기다립니다.

```text
holding 1 mutex(es): low prio while hi waits = 3
  hi: take m1 with timeout 5 -> pdFALSE at t=5
holding 1 mutex(es): low prio after hi timed out = 1
after giving all: low prio = 1
holding 2 mutex(es): low prio while hi waits = 3
  hi: take m1 with timeout 5 -> pdFALSE at t=14
holding 2 mutex(es): low prio after hi timed out = 3
after giving all: low prio = 1
```

mutex를 하나 쥐었을 때는 hi가 timeout으로 떠나자 low가 1로 내려갔습니다. 둘을 쥐었을 때는 hi가 떠났는데도 low가 3에 머물렀고, 모두 give한 뒤에야 1로 돌아왔습니다. 그동안 low는 기다리는 task가 없는데도 3으로 돌았으므로, 우선순위 2인 task가 ready였다면 low보다 늦게 돌았습니다. 연쇄 상속은 [3-05](/blog/embedded/rtos/practical-internals/part3-05-priority-inheritance)에서 다룹니다.

## ISR에서 금지되는 이유

ISR은 task가 아니라서 holder로 기록될 TCB가 없고, block해서 기다릴 수도 없습니다. 그래서 FreeRTOS mutex에는 FromISR take/give를 쓰지 않습니다. `SemaphoreHandle_t`가 같은 타입이라 **컴파일은 성공합니다.** 1-08의 QEMU 실험에서 TakeFromISR은 `pdTRUE`를 돌려주고 holder 없는 mutex를 만들었고, task가 쥔 mutex의 GiveFromISR은 `queue.c` line 1356의 assert에 걸렸습니다.

ISR과 task 사이의 신호는 semaphore·notification·queue로 전달합니다. ISR과 공유하는 짧은 상태는 `taskENTER_CRITICAL_FROM_ISR()`로 보호합니다(3-01).

## Deadlock과 Timeout

A가 X→Y, B가 Y→X 순서로 잠그면 circular wait가 가능합니다. 공통 lock order를 정하고 예외 경로에서도 보유 자원을 반납해야 합니다. priority inheritance는 소유자가 실행될 기회를 돕지만 circular wait를 해결하지는 않습니다.

유한 timeout은 호출자의 기다림을 제한할 뿐 deadlock을 진단하지는 않습니다. 1-08의 QEMU 실험에서 B가 timeout으로 Y를 놓자 A가 진행했지만, B는 결국 일을 하지 못했습니다. 정상적인 긴 보유도 timeout을 만들므로 timeout만으로 deadlock이라고 판정할 수 없습니다. hold time은 RTA의 blocking 항으로 들어갑니다(1-10).

## Static Allocation과 수명

정적 allocation은 heap을 쓰지 않는 선택입니다. buffer는 mutex가 사용되는 동안 살아 있어야 하고 초기화는 이용자 생성 전에 완료해야 합니다.

```c title="static-mutex.c"
#include "FreeRTOS.h"
#include "semphr.h"
static StaticSemaphore_t mutex_storage;
SemaphoreHandle_t make_static_mutex(void) {
    /* Call once before starting any users; do not reinitialize a live mutex. */
    return xSemaphoreCreateMutexStatic(&mutex_storage);
}
```

이 예제에는 `configSUPPORT_STATIC_ALLOCATION=1`이 필요합니다. `semphr.h`의 `vSemaphoreDelete()` 설명은 "do not delete a mutex type semaphore if the mutex is held by a task"라고 적습니다(L1122). 삭제는 holder와 waiter를 정리해 주지 않습니다.

## 다른 RTOS와 비교할 때

Zephyr v3.7.0의 `k_mutex`도 owner와 `lock_count`로 재귀를 셉니다(`kernel/mutex.c` L117-L123). 복원 규칙은 다릅니다. waiter가 timeout으로 떠나면 Zephyr는 남은 waiter의 head와 owner의 원래 priority로 owner priority를 다시 계산하며, FreeRTOS 같은 "mutex 하나만 쥐었을 때만" 조건이 없습니다([`kernel/mutex.c` L170-L187](https://github.com/zephyrproject-rtos/zephyr/blob/v3.7.0/kernel/mutex.c#L170-L187)). 상속으로 올라가는 priority는 `CONFIG_PRIORITY_CEILING`보다 높아지지 않습니다(`new_prio_for_inheritance()`, L82-L88, `kernel/include/ksched.h` L78-L83). 이 장의 실행 예제는 FreeRTOS V11.2.0만 돌렸습니다.

## 정리

- owner·recursive count는 Queue에, base/current priority·보유 수는 TCB에 있습니다.
- 실제 block 경로에서 높은 waiter의 priority를 holder가 상속합니다.
- recursive API와 일반 mutex API의 짝을 유지합니다.
- non-owner 일반 give는 안전한 pdFAIL을 보장하는 사용법이 아닙니다.
- mutex는 ISR에서 사용할 수 없으며, 컴파일 성공이 사용 계약을 보장하지 않습니다.
- waiter timeout 뒤 FreeRTOS는 holder가 mutex 하나만 쥐었을 때만 priority를 낮춥니다(QEMU: 하나면 3 → 1, 둘이면 3 유지).
- recursive mutex는 count가 0이 될 때만 풀리고, non-owner give는 `pdFAIL`을 반환합니다.

다음 [3-04 Priority Inversion 문제](/blog/embedded/rtos/practical-internals/part3-04-priority-inversion)에서 왜 낮은 priority의 owner가 높은 task를 지연시키는지 살펴봅니다.

## 근거 자료

- [FreeRTOS V11.2.0 queue.c](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/queue.c): Queue_t·xQueueSemaphoreTake·recursive take/give·mutex 반환.
- [같은 태그 tasks.c](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/tasks.c): xTaskPriorityInherit·xTaskPriorityDisinherit·vTaskPriorityDisinheritAfterTimeout.
- [같은 태그 semphr.h](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/include/semphr.h): API 종류·FromISR 제한·static allocation.
- [Zephyr v3.7.0 kernel/mutex.c](https://github.com/zephyrproject-rtos/zephyr/blob/v3.7.0/kernel/mutex.c).
- QEMU 실험: `rec.c` + `mutex-contract.c`, FreeRTOS V11.2.0 `ARM_CM3`, QEMU 11.1.3 `mps2-an385 -icount shift=5`.

## 관련 항목

- [1-08: Mutex 개념](/blog/embedded/rtos/practical-internals/part1-08-mutex)
- [3-04: Priority Inversion 문제](/blog/embedded/rtos/practical-internals/part3-04-priority-inversion)
- [3-05: Priority Inheritance 구현](/blog/embedded/rtos/practical-internals/part3-05-priority-inheritance)
