---
title: "Priority Inheritance 구현 — Inherit·Disinherit·Chain"
slug: "embedded/rtos/practical-internals/part3-05-priority-inheritance"
date: 2026-05-06T09:26:00
description: "FreeRTOS V11.2.0의 xTaskPriorityInherit·xTaskPriorityDisinherit와 timeout 복원 경로를 따라가고, 다중 mutex와 chain 전파의 제한을 확인합니다."
series: "Practical RTOS Internals"
seriesOrder: 26
tags: [priority-inheritance, pi, inherit, disinherit]
draft: false
topics: ["embedded", "embedded/rtos"]
---

## 한 줄 요약

FreeRTOS **V11.2.0**의 PI는 block할 waiter와 holder를 연결하며, release와 timeout의 복원 조건이 다릅니다. uxBasePriority는 task API로 바뀔 수 있는 base priority이며 불변 상수가 아닙니다.

이번 글에서는 FreeRTOS의 PI 구현을 코드 수준에서 살펴봅니다. inherit과 disinherit, 그리고 chained 상황까지 따라가 봅니다.

## TCB의 PI Field

```c
typedef struct {
    UBaseType_t uxPriority;       // 현재 priority (boost 시 변경)
    UBaseType_t uxBasePriority;   // 원래 priority (PI 해제 시 복원)
    UBaseType_t uxMutexesHeld;    // 보유 mutex 수
    /* ... */
} TCB_t;
```

`uxBasePriority`가 PI 구현의 핵심입니다. base priority도 vTaskPrioritySet에 의해 바뀔 수 있습니다. 현재 priority와 base priority를 구분하고 application에서 TCB 필드를 직접 쓰지 않습니다.

## Inherit — Boost

queue.c의 xQueueSemaphoreTake가 mutex에 block하기 전에 tasks.c의 **xTaskPriorityInherit**를 호출합니다. timeout 0의 실패를 포함한 모든 take 실패에 동일한 boost를 적용하지 않습니다.

| holder 상태 | V11.2.0의 처리 |
| --- | --- |
| 현재 waiter보다 priority가 낮음 | 현재 priority와 필요한 event-item priority 값 갱신 |
| ready list에 있음 | 기존 ready list에서 제거하고 새 priority list로 이동 |
| blocked·suspended | priority를 바꾸되 무조건 ready로 이동시키지 않음 |
| 이미 더 높은 priority를 상속 | base/current 비교에 따라 상속 관련 반환값 결정 |

기존 축약 코드처럼 blocked owner까지 무조건 ready list에 삽입하면 다른 객체를 기다리는 상태를 깨뜨립니다. 실제 함수의 state-list 조건과 반환값을 함께 확인해야 합니다.

## Disinherit — 복원

일반 mutex 반환 경로는 xTaskPriorityDisinherit를 호출하여 owner와 현재 task 관계를 검사하고 uxMutexesHeld를 감소시킵니다. base와 현재 priority가 다르고 보유 수가 0이면 base로 복원하고 ready list를 조정합니다. recursive mutex는 마지막 give에서만 실제 반환 경로에 들어갑니다.

이 조건은 모든 자원의 waiter 최대값을 매번 다시 계산하는 구현이 아닙니다. 일부 mutex를 놓았는데 다른 mutex가 남아 있으면 필요 이상으로 boost가 유지될 수 있습니다. [3-03의 실제 커널 검사](/blog/embedded/rtos/practical-internals/part3-03-mutex-impl)에서는 두 mutex를 보유한 holder가 1→4로 올라가고, 첫 release 뒤 4를 유지하며 마지막 release 뒤 1로 복원되는 경우를 확인했습니다.

![Priority inheritance timeline](/images/blog/rtos/diagrams/part3-05-priority-inheritance.svg)

## Multi-Mutex 시나리오

L이 A·B를 보유한 상태에서 priority 4 waiter가 A에 block하면 L이 4를 상속할 수 있습니다. 이후 B에 priority 5 waiter가 block하면 현재 4보다 높으므로 추가 boost가 가능합니다. “이미 상속했으면 변화 없음”이라는 규칙은 아닙니다.

A만 반환한 뒤에도 B를 보유하면 일반 give 경로는 4나 5의 boost를 유지할 수 있습니다. 각 mutex의 경쟁과 실제 block 순서를 기록해야 최종 복원을 해석할 수 있습니다.

## Chained Inheritance

M이 boost된 뒤 Y에 처음 block하면 그 현재 priority로 L의 상속이 일어날 수 있습니다. 반대로 M이 먼저 Y에 block한 뒤 H가 X에 block하여 M을 boost하면, 이 변화가 이미 기다리는 Y의 owner까지 자동 재귀 전파된다고 보장할 수 없습니다.

V11.2.0에는 xTaskCheckForChainedInheritance라는 함수가 없습니다. tasks.c의 실제 상속 경로와 event list 상태를 추적해야 하며, 단순한 세 task 모델과 모든 순서의 완전한 PI chain 처리를 구분해야 합니다.

## Disinherit After Timeout

waiter timeout 경로는 **vTaskPriorityDisinheritAfterTimeout**에 해당 mutex의 남은 최고 waiter priority를 전달합니다. 후보 priority는 base와 남은 최고 waiter 중 높은 값이며, holder가 mutex 하나만 보유한 경우 등 소스의 제한 조건을 따릅니다.

owner가 다른 mutex도 보유하면 그 자원이 상속의 원인일 수 있으므로 이 단순화된 경로에서 낮추지 않습니다. timeout이 발생할 때마다 해당 waiter 영향만 정확히 graph 전체에서 제거하는 알고리즘으로 설명하지 않습니다.

## Time Slicing과 Boost 상호작용

상속 후 현재 priority가 같은 task가 여럿이면 그 priority의 스케줄링 규칙을 따릅니다. time slicing·yield·blocking·선점 설정과 ready-list 순서가 실제 실행을 결정합니다. waiter가 block하면 holder가 즉시 CPU를 받는다고 일반화하지 않습니다.

## Implementation Overhead

비용에는 holder의 상태, list 이동, trace hook, port yield와 memory 접근 등이 관여합니다. 출처 없는 50 cycle을 모든 보드에 적용하거나 chain 깊이만 곱해 실측값으로 제시하지 않습니다. 정확한 compiler·config·clock과 실행 경로에서 trace off/on 비용을 따로 측정해야 합니다.

## Zephyr — k_mutex의 PI

Zephyr 3.7.0 문서는 inheritance와 다중 mutex의 복원 순서 제한을 설명합니다. CONFIG_PRIORITY_CEILING은 PI 상승의 상한이며 PCP enable bool이 아닙니다. FreeRTOS와 같은 복원 알고리즘이라고 단정하지 않습니다.

## Linux PREEMPT_RT rtmutex

Linux rtmutex 설계는 priority에 따른 waiter tree와 chain walk를 설명합니다. PI futex도 관련 rtmutex 기능을 활용하므로 futex 전체를 “PI 없는 덜 정교한 lock”으로 비교하면 안 됩니다. 구조 일부의 O(log N) 조작만으로 전체 상속·chain 비용을 보장하지 않습니다.

## 자주 하는 실수

> ⚠️ Inherit 후 manual priority 변경

`vTaskPrioritySet()`로 priority를 바꾸면 `uxBasePriority`도 함께 갱신해야 합니다. FreeRTOS API가 이 처리를 대신해 줍니다.

> ⚠️ Multiple mutex deep nesting

한 task가 여러 mutex를 보유한 수와 여러 task가 연결된 wait chain 깊이는 다른 값입니다. 실제 owner→waiter 관계와 lock order를 분석합니다.

> ⚠️ ISR에서 PI 가정

ISR은 task가 아니므로 PI 자체가 무의미합니다. ISR과 task 사이 통신은 *task notification*을 씁니다.

## 정리

- 실제 함수는 xTaskPriorityInherit·xTaskPriorityDisinherit입니다.
- owner의 blocked 상태를 boost만으로 ready로 바꾸지 않습니다.
- 일반 give와 timeout 복원은 다른 조건을 사용합니다.
- 여러 mutex와 chain의 순서에 따른 제한을 확인합니다.
- 비용과 시간 상한은 target에서 별도 측정해야 합니다.

다음 [3-06](/blog/embedded/rtos/practical-internals/part3-06-priority-ceiling)에서 ceiling protocol의 정의와 지원 옵션을 구분합니다.

## 근거 자료

- [FreeRTOS V11.2.0 tasks.c](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/tasks.c), [queue.c](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/queue.c): 실제 상속·복원·호출 경로.
- [Zephyr 3.7.0 mutex](https://docs.zephyrproject.org/3.7.0/kernel/services/synchronization/mutexes.html).
- [Linux rtmutex design](https://docs.kernel.org/locking/rt-mutex-design.html).

## 관련 항목

- [3-04: Priority Inversion 문제](/blog/embedded/rtos/practical-internals/part3-04-priority-inversion)
- [3-06: Priority Ceiling Protocol](/blog/embedded/rtos/practical-internals/part3-06-priority-ceiling)
