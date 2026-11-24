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

우선순위 기반 스케줄링은 "높은 task가 먼저 돈다"는 전제 위에 있는데, priority inversion은 그 전제를 뒤집습니다. 구급차(H)가 좁은 골목에서 앞의 손수레(L)를 기다리는 동안, 옆 큰길의 승용차들(M)이 손수레가 골목을 빠져나갈 틈을 계속 막는 상황과 같습니다. 이 장에서는 QEMU에서 그 지연을 직접 만들어 잽니다.

## Bounded vs Unbounded

높은 priority H가 낮은 priority L이 보유한 자원을 기다릴 때, 중간 priority M이 L의 실행을 지연시키면 H도 간접적으로 지연됩니다. 단순한 resource blocking과 중간 task의 간섭을 나누어 분석해야 합니다.

| 구분 | H의 대기 상한 |
| --- | --- |
| Bounded | L이 자원을 쥔 남은 시간. 자원 보유 시간으로 정해짐 |
| Unbounded | L의 남은 시간 + L보다 높고 H보다 낮은 **모든** task의 실행 시간 |

"unbounded"는 무한하다는 뜻이 아니라, 상한이 자원 보유 시간이 아니라 M들의 실행 시간에 묶인다는 뜻입니다. M이 하나 더 생기면 H의 대기도 그만큼 늘어납니다. 반대로 priority inheritance만 켰다고 제품의 blocking 상한이 자동으로 생기지는 않습니다. owner의 남은 임계 구역 실행량, 중첩 자원 대기, IRQ 간섭과 재진입을 함께 제한해야 합니다.

### QEMU에서 inversion 만들기

H(우선순위 3)·M(2)·L(1)을 만듭니다. L이 먼저 자원을 잡고 CPU 시간 10 tick짜리 작업을 시작합니다. 2 tick 뒤 H가 깨어나 같은 자원을 기다리고, 3 tick에 M이 깨어나 CPU 시간 50 tick을 씁니다. 자원을 binary semaphore로 만들 때와 mutex로 만들 때를 비교했습니다.

```c title="inversion.c (발췌)"
/* CPU-time burn: counts tick edges seen while this task runs, so time spent preempted is not counted */
static void burn(TickType_t n){ TickType_t last=xTaskGetTickCount(), seen=0; while(seen<n){ TickType_t t=xTaskGetTickCount(); if(t!=last){ seen++; last=t; } } }
static void L(void*a){ (void)a; xSemaphoreTake(res,portMAX_DELAY); burn(10); l_prio_at_give=uxTaskPriorityGet(NULL); t_l_give=xTaskGetTickCount(); xSemaphoreGive(res); for(;;) vTaskDelay(100); }
static void M(void*a){ (void)a; vTaskDelay(3); t_m_start=xTaskGetTickCount(); burn(50); t_m_end=xTaskGetTickCount(); for(;;) vTaskDelay(100); }
```

FreeRTOS V11.2.0 `ARM_CM3`, arm-none-eabi-gcc 16.2.0 `-O2`, QEMU 11.1.3 `mps2-an385 -icount shift=5`입니다.

```text
t=2 H blocks on the resource (L prio=1)
binary semaphore: M ran t=3..53, L (prio 1 at give) gave at t=60, H got it at t=60 -> H waited 58 ticks for a 10-tick section
t=2 H blocks on the resource (L prio=1)
mutex (PI)      : M had not run yet, L (prio 3 at give) gave at t=10, H got it at t=10 -> H waited 8 ticks for a 10-tick section
```

binary semaphore에서는 M이 3부터 53까지 50 tick을 다 쓴 뒤에야 L이 남은 7 tick을 끝냈고(L이 M 이전에 2 tick, 이후에 7 tick을 돌았고 H는 그 사이 58 tick을 기다림), H는 58 tick을 기다렸습니다. 10 tick짜리 보호 구간 때문에 H와 무관한 M의 50 tick까지 기다린 것이 unbounded inversion입니다. mutex에서는 H가 기다리는 순간 L이 3으로 올라가(`prio 3 at give`) M보다 먼저 돌았고, H는 L의 남은 8 tick만 기다렸습니다. 이것이 bounded blocking이고, M은 H가 끝날 때까지 시작조차 못 했습니다.

## Mars Pathfinder 1997

JPL의 Glenn E. Reeves가 Dr. Dobb's Journal 1999년 11월호에 쓴 "Priority Inversion: How We Found It, How We Fixed It"([전문](https://jacobfilipp.com/DrDobbs/articles/DDJ/1999/9911/9911a/9911as1.htm))에 따르면 경과는 이렇습니다. 실험실에서 "In less than 18 hours, we were able to repeat the problem, isolate it to an interaction of the pipe() and select() mechanisms, diagnose it as a priority inversion problem"했고, 진단에는 Wind River가 pipe·msgQ·interrupt·select 서비스와 tExec task에 넣은 trace/log 기능을 썼습니다. 수정은 "change the creation flags for the semaphore used within the select() facility so as to enable priority inheritance"였고, VxWorks가 `semMCreate`의 options 같은 인자를 전역 변수로 제공했기 때문에 비행 중 바꿀 수 있었습니다. Wind River 엔지니어는 이 변경의 "performance impact would be minimal"이라고 분석했습니다.

위 QEMU의 H·M·L은 이 구조를 셋으로 줄인 모델이며 탐사선의 실제 task와 자원을 재현하지 않습니다.

## 해결책 1 — Priority Inheritance

높은 priority waiter가 mutex에 block하면 holder의 priority를 높여 중간 task의 간섭을 막습니다. 위 실험에서 L이 1에서 3으로 올라간 것이 그 동작입니다. 보유자가 다른 자원이나 I/O를 기다리고 있으면 boost되어도 돌 수 없습니다. FreeRTOS의 복원 조건(보유 mutex 수가 0일 때, timeout이면 하나만 쥐었을 때)은 3-03에서 QEMU로 확인했습니다.

FreeRTOS V11.2.0에는 `configUSE_MUTEX_PI`라는 설정이 없고(1-08), `configUSE_MUTEXES`가 켜져 있으면 `xSemaphoreCreateMutex()`로 만든 객체에 PI가 걸립니다. binary semaphore에는 PI가 없어서 위 실험처럼 58 tick을 기다렸습니다(`queue.c` L1787-L1791, 1-07).

## 해결책 2 — Priority Ceiling 계열

Sha·Rajkumar·Lehoczky의 "Priority Inheritance Protocols: An Approach to Real-Time Synchronization"(*IEEE Trans. Computers* 39(9), 1990, [PDF](https://www.math.unipd.it/~tullio/RTS/2009/SRL-1990.pdf))은 두 protocol을 다룹니다. basic priority inheritance와 priority ceiling protocol(PCP)입니다. PCP는 각 semaphore에 "the highest priority task that may use this semaphore"를 ceiling으로 주고, "allow a job J to start a new critical section only if J's priority is higher than all priority ceilings of all the semaphores locked by jobs other than J"라는 규칙을 씁니다. 목표는 "to prevent the formation of deadlocks and of chained blocking"입니다(IV.A Overview). 잠그는 순간 priority를 올리는 immediate ceiling과는 다른 규칙입니다.

| 비교 | Priority inheritance | Priority ceiling protocol (SRL 1990) |
| --- | --- | --- |
| 필요한 정보 | 실제 waiter·owner 관계 | 어느 task가 어느 semaphore를 쓰는지(설계 시점) |
| H의 blocking | 낮은 job 하나당 critical section 하나까지(Lemma 2) | 낮은 job 전체에서 critical section 하나까지(Theorem 12) |
| deadlock | 막지 못함 | 막음(Theorem 10, 논문의 단일 프로세서 가정) |

Zephyr v3.7.0의 `CONFIG_PRIORITY_CEILING`은 Kconfig 도움말이 "the minimum priority value (i.e. the logically highest priority) that a thread will acquire as part of k_mutex priority inheritance"라고 적듯 **PI로 올라갈 수 있는 상한**입니다(`kernel/Kconfig` L83-L89). 이름은 비슷하지만 PCP를 켜는 설정이 아닙니다. 3-06에서 두 ceiling 방식을 비교합니다.

## PI의 한계 — Chained Inheritance

H가 X의 owner M을 기다리고, M이 이미 Y의 owner L을 기다리는 chain을 봅니다. FreeRTOS V11.2.0의 `xTaskPriorityInherit()`(`tasks.c` L6639)는 H가 block하는 순간 X의 holder 하나(M)의 priority만 올립니다. M이 이미 Y에서 block해 있으면 L은 그 순간 올라가지 않습니다. chain을 따라 전파되는지는 [3-05](/blog/embedded/rtos/practical-internals/part3-05-priority-inheritance)에서 소스로 따라갑니다.

## Linux PREEMPT_RT

Linux rtmutex는 PI chain을 처리하는 별도 구현입니다. v6.12 [`Documentation/locking/rt-mutex-design.rst`](https://docs.kernel.org/locking/rt-mutex-design.html)에 따르면 각 mutex는 waiter를 priority 순으로 담는 rbtree를 갖고("Mutex Waiters Tree", L196-L200), 각 task는 PI chain을 따라가기 위한 자기 PI rbtree(`pi_waiters`)를 갖습니다(L208). owner가 또 다른 lock을 기다리면 chain을 따라 priority를 전파합니다. FreeRTOS는 이런 tree 없이 보유 mutex 수 하나로 복원 시점을 정한다는 점이 다릅니다(3-03).

## 실전 — 회피 우선

1. 공유 자원은 binary semaphore가 아니라 mutex로 보호합니다. 위 실험에서 H의 대기가 58 → 8 tick이 됐습니다.
2. Lock을 보유한 채로 block하는 호출을 피합니다. holder가 block하면 boost되어도 돌지 못합니다.
3. Lock 획득 순서를 일관되게 유지합니다(1-08의 deadlock 실험).
4. 보호 구간을 짧게 둡니다. bounded blocking의 상한이 곧 그 길이입니다(1-10의 $B_i$).

## 자주 하는 실수

> ⚠️ Semaphore로 critical 자원을 보호하면 PI가 적용되지 않습니다.

> ⚠️ 이름이 비슷한 옵션으로 PI를 판단합니다. FreeRTOS에는 `configUSE_MUTEX_PI`가 없고, Zephyr의 `CONFIG_PRIORITY_CEILING`은 PCP가 아니라 PI의 상한입니다.

> ⚠️ PI를 믿고 critical section을 길게 둡니다. 위 mutex 실험에서도 H는 L의 남은 8 tick을 기다렸습니다. PI는 대기를 bounded로 만들 뿐 0으로 만들지 않습니다.

> ⚠️ 여러 mutex를 lock order 없이 씁니다. PI는 deadlock을 막지 못하고(SRL 1990), FreeRTOS는 여러 mutex를 쥔 holder의 priority를 늦게 내립니다(3-03).

## 정리

- QEMU에서 10 tick 보호 구간 때문에 H가 binary semaphore로는 58 tick, mutex(PI)로는 8 tick을 기다렸습니다.
- unbounded inversion의 상한은 중간 priority task들의 실행 시간에 묶입니다.
- Pathfinder는 select() 안의 semaphore 생성 flag에 priority inheritance를 켜서 고쳤습니다(Reeves, DDJ 1999).
- SRL 1990의 PCP는 ceiling 규칙으로 deadlock과 chained blocking을 막습니다.
- Zephyr `CONFIG_PRIORITY_CEILING`은 PI의 상한일 뿐 PCP가 아닙니다.

다음 [3-05](/blog/embedded/rtos/practical-internals/part3-05-priority-inheritance)에서 V11.2.0의 상속 경로를 살펴봅니다.

## 근거 자료

- [FreeRTOS V11.2.0 tasks.c](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/tasks.c), [queue.c](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/queue.c).
- [Zephyr 3.7.0 mutex](https://docs.zephyrproject.org/3.7.0/kernel/services/synchronization/mutexes.html).
- [Sha·Rajkumar·Lehoczky, 1990 논문](https://www.math.unipd.it/~tullio/RTS/2009/SRL-1990.pdf): *IEEE Trans. Computers* 39(9), pp. 1175-1185.
- G. E. Reeves, "Priority Inversion: How We Found It, How We Fixed It", Dr. Dobb's Journal, 1999-11.
- QEMU 실험: `inversion.c`, FreeRTOS V11.2.0 `ARM_CM3`, QEMU 11.1.3 `mps2-an385 -icount shift=5`.

## 관련 항목

- [1-08: Mutex 개념](/blog/embedded/rtos/practical-internals/part1-08-mutex)
- [3-03: Mutex 내부 구현](/blog/embedded/rtos/practical-internals/part3-03-mutex-impl)
- [3-05: Priority Inheritance 구현](/blog/embedded/rtos/practical-internals/part3-05-priority-inheritance)
