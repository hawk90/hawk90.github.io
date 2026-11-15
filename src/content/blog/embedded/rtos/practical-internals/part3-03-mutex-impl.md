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

queue.c의 Queue_t는 mutex 용도로 u.xSemaphore.xMutexHolder와 uxRecursiveCallCount를 사용합니다. task의 uxBasePriority·현재 uxPriority·uxMutexesHeld는 tasks.c의 TCB 쪽 상태입니다. owner pointer 하나만 더하면 inheritance 전체가 완성되는 것은 아닙니다.

| 상태 | 위치·의미 |
| --- | --- |
| xMutexHolder | Queue의 union 안에 있는 소유 task |
| uxRecursiveCallCount | recursive take 횟수 |
| uxMessagesWaiting | 가용 token을 나타내는 count |
| uxBasePriority | task의 base priority |
| uxPriority | 상속을 포함한 현재 priority |
| uxMutexesHeld | task가 보유한 mutex 수 |

필드·함수 이름은 이 태그 기준입니다. application이 Queue_t 내부를 cast해 직접 고치는 방식으로 owner나 priority를 설정하면 kernel의 list·counter 계약을 깨뜨립니다.

## Take의 실제 경로

일반 xSemaphoreTake는 xQueueSemaphoreTake로 연결됩니다. mutex를 획득하면 소유 task와 보유 수를 기록하고, 이미 잠겨 있어서 block해야 할 때 xTaskPriorityInherit 경로가 동작합니다. timeout 0으로 즉시 실패하는 요청과 실제 block하는 요청은 구분해야 합니다.

recursive API는 같은 owner가 다시 take하면 recursive count를 증가시킵니다. 다른 task의 첫 획득은 공통 semaphore take 경로를 사용한 뒤 recursive count를 늘립니다. 일반 mutex를 다시 take하는 것은 recursive 동작이 아닙니다.

## Give와 소유자 위반

recursive give는 xQueueGiveMutexRecursive에서 현재 task가 owner인지 확인합니다. owner가 아니면 pdFAIL이며, owner의 count가 0이 될 때만 공통 send 경로로 실제 release합니다. 내부 횟수만 줄어든 상태에서는 다른 task가 획득할 수 없습니다.

일반 xSemaphoreGive의 잘못된 non-owner 호출을 “항상 pdFAIL로 안전하게 처리한다”고 가정하면 안 됩니다. V11.2.0의 일반 mutex 반환 경로는 xTaskPriorityDisinherit에서 현재 task와 holder 관계를 configASSERT로 검사합니다. assertion을 끈 빌드는 이 계약 위반을 안전한 오류 반환으로 바꿔 주지 않습니다.

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

이 단일 task 검사만으로 다른 waiter가 첫 give 뒤에도 차단되는지까지 확인할 수는 없습니다. 그 경계는 owner·다른 task를 함께 실행해 검사해야 합니다. 반납 후 extra recursive give의 실패를 일반 mutex의 소유자 위반 처리와 혼동하지 않습니다.

## Priority Inheritance와 복원

block한 높은 priority task 때문에 낮은 priority의 **holder**가 boost됩니다. 대기자의 priority를 holder 쪽으로 낮추는 동작이 아닙니다. base priority 0도 정상 priority이므로 “0이면 아직 상속하지 않았다”는 sentinel로 쓰지 않습니다.

V11.2.0의 일반 disinherit 경로는 uxMutexesHeld를 감소시키며, 보유 수가 0일 때 base priority로 복원하는 조건을 둡니다. waiter timeout 시의 vTaskPriorityDisinheritAfterTimeout은 별도 경로이며, 소유자가 mutex 하나만 보유한 경우 등 제한 조건이 있습니다. 일반 give와 timeout 복원을 같은 함수로 설명하지 않습니다.

| 상황 | 확인할 것 |
| --- | --- |
| 한 mutex에 높은 waiter가 block | holder 현재 priority와 ready-list 상태 |
| 여러 mutex를 보유 | 일부 release 뒤에도 boost가 유지되는지 |
| waiter timeout | 남은 waiter·보유 수와 timeout 복원 조건 |
| 연쇄 의존 | 이미 block된 owner까지 priority가 재전파되는 실제 순서 |

보유 mutex와 대기 관계의 전체 graph를 유지하는 완전한 PI 알고리즘으로 일반화하지 않습니다. [3-05 Priority Inheritance](/blog/embedded/rtos/practical-internals/part3-05-priority-inheritance)와 실제 제품의 block 순서를 함께 확인해야 합니다.

## ISR에서 금지되는 이유

ISR은 task owner가 되어 잠금을 보유하고 기다리는 실행 모델이 아닙니다. 따라서 FreeRTOS mutex에는 FromISR take/give를 사용하면 안 됩니다. SemaphoreHandle_t가 같은 표현을 공유하므로 **컴파일이 성공해도 사용 계약 위반일 수 있습니다.**

ISR과 task 사이의 신호는 지원되는 semaphore·notification·queue API로 전달합니다. shared peripheral의 짧은 상태 보호에는 허용 priority와 포트에 맞는 ISR critical 계약을 사용합니다. semaphore를 mutex 대신 쓰면 owner·inheritance가 생긴다고 가정하지 않습니다.

## Deadlock과 Timeout

A가 X→Y, B가 Y→X 순서로 잠그면 circular wait가 가능합니다. 공통 lock order를 정하고 예외 경로에서도 보유 자원을 반납해야 합니다. priority inheritance는 소유자가 실행될 기회를 돕지만 circular wait를 해결하지는 않습니다.

유한 timeout은 호출자의 기다림을 제한하지만 deadlock을 확정 진단하거나 자동 복구하지는 않습니다. 정상적인 긴 보유도 timeout을 만들 수 있고, 실패 경로가 이미 보유한 lock을 놓지 않으면 문제가 남습니다. hold time 목표는 임의의 수 µs가 아니라 제품의 deadline·간섭·I/O·복구 정책으로 정합니다.

## Static Allocation과 수명

정적 allocation은 heap 의존성을 줄이는 선택이며 모든 산업의 유일한 표준이라고 일반화하지 않습니다. buffer는 mutex가 사용되는 동안 살아 있어야 하고 초기화는 이용자 생성 전에 완료해야 합니다.

```c title="static-mutex.c"
#include "FreeRTOS.h"
#include "semphr.h"
static StaticSemaphore_t mutex_storage;
SemaphoreHandle_t make_static_mutex(void) {
    /* Call once before starting any users; do not reinitialize a live mutex. */
    return xSemaphoreCreateMutexStatic(&mutex_storage);
}
```

이 예제에는 configSUPPORT_STATIC_ALLOCATION=1이 필요합니다. mutex 삭제나 재초기화로 owner·waiter가 자동 정리된다고 가정하지 않습니다. shutdown 프로토콜에서 이용자를 먼저 종료해야 합니다.

## 다른 RTOS와 비교할 때

Zephyr k_mutex도 owner·lock count·priority inheritance를 제공하지만 동일한 내부 구조나 복원 정책을 가정할 수는 없습니다. RTOS별 nested lock·timeout·SMP·priority ceiling 설정은 해당 버전 문서로 확인합니다. 이 글의 실행 가능한 예제와 소스 경로는 FreeRTOS V11.2.0에 한정합니다.

## 정리

- owner·recursive count는 Queue에, base/current priority·보유 수는 TCB에 있습니다.
- 실제 block 경로에서 높은 waiter의 priority를 holder가 상속합니다.
- recursive API와 일반 mutex API의 짝을 유지합니다.
- non-owner 일반 give는 안전한 pdFAIL을 보장하는 사용법이 아닙니다.
- mutex는 ISR에서 사용할 수 없으며, 컴파일 성공이 사용 계약을 보장하지 않습니다.
- timeout·PI는 deadlock 복구나 모든 chain의 정확성을 자동 보장하지 않습니다.

다음 [3-04 Priority Inversion 문제](/blog/embedded/rtos/practical-internals/part3-04-priority-inversion)에서 왜 낮은 priority의 owner가 높은 task를 지연시키는지 살펴봅니다.

## 근거 자료

- [FreeRTOS V11.2.0 queue.c](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/queue.c): Queue_t·xQueueSemaphoreTake·recursive take/give·mutex 반환.
- [같은 태그 tasks.c](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/tasks.c): xTaskPriorityInherit·xTaskPriorityDisinherit·vTaskPriorityDisinheritAfterTimeout.
- [같은 태그 semphr.h](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/include/semphr.h): API 종류·FromISR 제한·static allocation.

## 관련 항목

- [1-08: Mutex 개념](/blog/embedded/rtos/practical-internals/part1-08-mutex)
- [3-04: Priority Inversion 문제](/blog/embedded/rtos/practical-internals/part3-04-priority-inversion)
- [3-05: Priority Inheritance 구현](/blog/embedded/rtos/practical-internals/part3-05-priority-inheritance)
