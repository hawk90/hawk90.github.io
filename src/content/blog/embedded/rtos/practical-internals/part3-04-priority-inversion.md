---
title: "Priority Inversion 문제 — Mars Pathfinder 사례·Bounded vs Unbounded"
slug: "embedded/rtos/practical-internals/part3-04-priority-inversion"
date: 2026-05-06T09:25:00
description: "고우선 task가 저우선 task 때문에 막힘. 1997 화성 탐사선 reset의 원인."
series: "Practical RTOS Internals"
seriesOrder: 25
tags: [priority-inversion, mars-pathfinder, bounded, unbounded]
draft: false
topics: ["embedded", "embedded/rtos"]
---

## 한 줄 요약

> **"고우선 task가 저우선 task 때문에 막힌다"** — 이것이 Priority Inversion입니다.

Priority Inversion은 RTOS 설계에서 가장 악명 높은 함정 중 하나입니다. 우선순위 기반 스케줄링의 전제 자체를 흔드는 현상이라 정확히 이해해 두는 것이 좋습니다.

## Bounded vs Unbounded

높은 priority H가 낮은 priority L이 보유한 자원을 기다릴 때, 중간 priority M이 L의 실행을 지연시키면 H도 간접적으로 지연됩니다. 단순한 resource blocking과 중간 task의 간섭을 나누어 분석해야 합니다.

| 구분 | 확인할 조건 |
| --- | --- |
| 상한을 분석할 수 있는 blocking | L의 남은 작업·IRQ·다른 task·중첩 자원과 protocol 가정을 포함한 유한 상한 |
| 제한되지 않는 inversion | 중간 priority 작업 때문에 L이 진행할 기회를 확보하지 못함 |

유한한 M 작업 하나가 곧 수학적 무한 대기를 뜻하지는 않습니다. 그 간섭의 상한을 자원 보유 시간만으로 제한하지 못한다는 것이 핵심입니다. 짧은 critical section도 제품의 deadline을 넘길 수 있고, ready와 실제 실행 시각은 다릅니다.

## Mars Pathfinder 1997

JPL 엔지니어 Glenn E. Reeves의 직접 설명은 반복 reset을 지상에서 재현하고 pipe·select 경로의 priority inversion으로 좁힌 과정을 기록합니다. select 내부 semaphore의 생성 옵션에 priority inheritance를 적용하여 수정했으며, 공통 경로에 미칠 영향도 검토했습니다.

이는 task 세 개짜리 예시를 실제 flight trace로 제시한 자료가 아닙니다. 아래 H·M·L 모델은 현상을 설명하는 모델이며 탐사선의 모든 task·mutex를 재현하지 않습니다. [Reeves의 설명](https://jacobfilipp.com/DrDobbs/articles/DDJ/1999/9911/9911a/9911as1.htm)을 구현·진단 근거와 구분해 읽어야 합니다.

## 해결책 1 — Priority Inheritance

높은 priority waiter가 mutex에 block하면 holder의 priority를 높여 중간 task의 간섭을 제한합니다. 보유자가 다른 자원이나 I/O를 기다리면 boost만으로 즉시 실행할 수는 없습니다. release·timeout·다중 mutex의 복원 조건은 구현별로 확인합니다.

FreeRTOS V11.2.0에는 configUSE_MUTEX_PI라는 설정이 없습니다. configUSE_MUTEXES로 mutex 지원을 포함하며, 실제 상속은 queue.c와 tasks.c의 mutex 경로에 연결됩니다. binary semaphore는 같은 PI 계약을 제공하지 않습니다.

## 해결책 2 — Priority Ceiling 계열

ceiling은 해당 자원을 사용할 task들의 priority를 미리 분석해 정합니다. Immediate ceiling의 획득 시 boost와 Original PCP의 system-ceiling admission·blocking 시 상속은 다른 규칙입니다. 두 방식을 모두 “take 즉시 boost”로 정의하지 않습니다.

| 비교 | Priority inheritance | Ceiling protocol |
| --- | --- | --- |
| 필요한 정보 | 실제 waiter·owner 관계 | 자원 이용자와 ceiling, 해당 protocol 규칙 |
| 보장 범위 | 구현과 중첩·간섭 조건에 따름 | 단일 CPU 등 분석 가정과 정확한 구현에 따름 |
| deadlock | PI만으로 방지하지 않음 | 논문의 가정을 만족하는 protocol에서 방지 성질 분석 |

Zephyr 3.7.0의 CONFIG_PRIORITY_CEILING은 **PI로 올릴 수 있는 priority의 상한**이며 Immediate PCP 활성화 설정이 아닙니다. 특정 RTOS의 지원 여부를 이름이 비슷한 옵션으로 추정하지 않습니다. 다음 3-06에서 차이를 다룹니다.

## PI의 한계 — Chained Inheritance

H가 X의 owner M을 기다리고, M이 이미 Y의 owner L을 기다리는 chain을 봅니다. FreeRTOS V11.2.0은 이 graph 전체를 재귀적으로 재계산하는 구현이 아닙니다. M이 언제 boost됐고 언제 Y에 block했는지에 따라 전파 결과가 달라질 수 있습니다.

[3-05](/blog/embedded/rtos/practical-internals/part3-05-priority-inheritance)에서 실제 xTaskPriorityInherit·timeout·보유 수 조건을 확인합니다. 임의의 깊이 제한이나 완전한 chain 처리 함수를 만들어 설명하지 않습니다.

## Linux PREEMPT_RT

Linux rtmutex는 PI chain을 처리하는 별도 구현입니다. kernel mutex·rtmutex·PI futex와 PREEMPT_RT에서 바뀌는 lock 의미를 구분해야 합니다. rtmutex가 있다는 사실만으로 전체 시스템의 deadline이 보장되는 것은 아닙니다.

[Linux rtmutex 설계](https://docs.kernel.org/locking/rt-mutex-design.html)는 owner·waiter tree와 chain walk를 설명합니다. FreeRTOS의 보유 수 기반 단순화와 같은 알고리즘으로 취급하지 않습니다.

## 실전 — 회피 우선

1. Critical section의 최대 길이와 간섭을 제품의 deadline에 맞춰 분석합니다.
2. Lock을 보유한 채로 long blocking 호출을 피합니다.
3. Lock 획득 순서를 일관되게 유지합니다.
4. 공유 자원을 최소화합니다.

## 자주 하는 실수

> ⚠️ Semaphore로 critical 자원을 보호하면 PI가 적용되지 않습니다.

> ⚠️ RTOS마다 존재하는 설정과 실제 mutex 종류를 확인해야 합니다. 이름이 비슷한 옵션만으로 PI 활성 여부를 판단하지 않습니다.

> ⚠️ PI를 믿고 critical section을 길게 두는 것은 위험합니다. bounded일 뿐 zero는 아닙니다.

> ⚠️ 여러 mutex를 lock order 없이 쓰면 chain inheritance와 deadlock이 함께 발생합니다.

## 정리

- resource blocking과 중간 priority task의 간섭을 나누어 봅니다.
- 관찰 가능한 짧은 실행 시간과 보장 상한은 다릅니다.
- Pathfinder의 수정은 실제 select 경로와 영향 분석에 근거했습니다.
- PI와 ceiling protocol은 구현·분석 가정을 확인해야 합니다.
- FreeRTOS의 다중 mutex·chain·timeout에는 별도 제한이 있습니다.

다음 [3-05](/blog/embedded/rtos/practical-internals/part3-05-priority-inheritance)에서 V11.2.0의 상속 경로를 살펴봅니다.

## 근거 자료

- [FreeRTOS V11.2.0 tasks.c](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/tasks.c), [queue.c](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/queue.c).
- [Zephyr 3.7.0 mutex](https://docs.zephyrproject.org/3.7.0/kernel/services/synchronization/mutexes.html).
- [Sha·Rajkumar·Lehoczky, 1990 논문](https://www.math.unipd.it/~tullio/RTS/2009/SRL-1990.pdf): 단일 CPU 모델에서의 protocol과 분석 가정.

## 관련 항목

- [1-08: Mutex 개념](/blog/embedded/rtos/practical-internals/part1-08-mutex)
- [3-03: Mutex 내부 구현](/blog/embedded/rtos/practical-internals/part3-03-mutex-impl)
- [3-05: Priority Inheritance 구현](/blog/embedded/rtos/practical-internals/part3-05-priority-inheritance)
