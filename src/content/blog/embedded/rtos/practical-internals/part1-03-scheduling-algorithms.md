---
title: "1-03: 스케줄링 알고리즘 — RR, Priority, EDF, RMS"
date: 2026-05-07T03:00:00
description: "Round Robin, Priority-based preemptive, Earliest Deadline First, Rate Monotonic을 다룹니다. 임베디드 RTOS는 대부분 fixed-priority preemptive를 씁니다."
series: "Practical RTOS Internals"
seriesOrder: 3
tags: [rtos, scheduler, rr, priority, edf, rms]
draft: false
---

## 한 줄 요약

> **"임베디드 RTOS는 Fixed-Priority Preemptive + RR (same priority)입니다."** 95% 케이스의 답이 됩니다.

## 4가지 주요 알고리즘

| 알고리즘 | 결정 기준 | 사용처 |
| --- | --- | --- |
| **Round Robin (RR)** | 시간 할당 (time slice) 회전 | 같은 우선순위 task 간 |
| **Fixed-Priority Preemptive** | 고정 우선순위 | 99% RTOS 기본 |
| **Earliest Deadline First (EDF)** | 다음 deadline 임박 task 우선 | 학술·일부 hard real-time |
| **Rate Monotonic (RM)** | 짧은 주기 task 우선 | 분석 가능한 hard real-time |

대부분의 임베디드 RTOS는 **"Fixed-Priority Preemptive + 같은 priority 내 RR"** 혼합 방식을 씁니다.

## Round Robin (RR)

같은 우선순위 task들이 *time slice* 단위로 차례로 실행됩니다.

```text
시간 →
[T1: 10ms][T2: 10ms][T3: 10ms][T1: 10ms]...
```

### 특징

- **공정성**: 모든 task가 같은 CPU 시간을 받습니다.
- **응답성**: 새 task가 와도 최대 1 slice만 대기합니다.
- **deadline 보장 X**: 결정성이 없습니다.

### FreeRTOS 적용

`configUSE_TIME_SLICING = 1`이 기본값입니다. 같은 priority 내에서만 RR이 동작하고, 다른 priority는 무시합니다.

```c
xTaskCreate(taskA, "A", 256, NULL, 3, NULL);  // Priority 3
xTaskCreate(taskB, "B", 256, NULL, 3, NULL);  // Priority 3 → A와 RR
xTaskCreate(taskC, "C", 256, NULL, 5, NULL);  // Priority 5 → A·B preempt
```

## Fixed-Priority Preemptive

**가장 흔한 RTOS 모델**입니다. 각 task에 *고정 우선순위*를 부여하고, 항상 *가장 높은 ready task*가 실행됩니다.

### 동작

```c
// Priority 3 PID task
void pid_task(void *arg) {
    while (1) {
        compute_pid();
        vTaskDelay(1);   // Blocked → 1ms 후 Ready
    }
}

// Priority 1 logger task
void log_task(void *arg) {
    while (1) {
        log_data();      // 5 ms 걸림
        // ↑ 도중 PID task가 ready 되면 *즉시 preempt*
    }
}
```

PID가 매 ms ready 되면 log는 *5ms 작업을 여러 번 쪼개* 진행합니다. 결국 *PID가 100%까지 차지할 수 있습니다*.

### 우선순위 선택 — Rate Monotonic Theorem

Liu & Layland (1973)에 따르면 **짧은 주기 task에 더 높은 priority**를 주는 것이 최적입니다.

| Task | 주기 | Priority |
|---|---|---|
| PID | 1 ms | 5 |
| 센서 | 10 ms | 4 |
| 로그 | 100 ms | 3 |
| UI | 1000 ms | 2 |

이 규칙이 **Rate Monotonic Scheduling (RMS)**입니다. 분석 가능한 *schedulability bound*가 존재합니다.

![RMS timeline — PID·Sensor·Log scheduling](/images/blog/practical-internals/diagrams/part1-03-rms-timeline.svg)

## Rate Monotonic Schedulability

n개 task의 utilization 합이 다음 한계 안이면 **항상 deadline 만족이 보장됩니다**.

```
U = Σ (Ci / Ti) ≤ n × (2^(1/n) − 1)
```

n이 무한대일 때 한계는 **ln(2) ≈ 0.693**입니다. 즉 **CPU 69%까지 사용해도 안전**합니다.

### 예 — 3 task

| Task | Ci (실행시간) | Ti (주기) | Ci/Ti |
|---|---|---|---|
| A | 1 ms | 4 ms | 0.25 |
| B | 2 ms | 5 ms | 0.40 |
| C | 1 ms | 10 ms | 0.10 |
| | | 합 | 0.75 |

n=3일 때 한계는 3 × (2^(1/3) − 1) ≈ **0.78**입니다. 0.75 < 0.78이므로 **schedulable**합니다.

만약 한계를 초과해도 *deadline 만족이 가능*합니다. Response Time Analysis (RTA)로 정확히 확인할 수 있습니다.

## Earliest Deadline First (EDF)

각 task의 *다음 absolute deadline*이 가장 가까운 것이 우선합니다.

```text
시점 t=0:
  T1 deadline t=10
  T2 deadline t=15
  T3 deadline t=8
→ T3 실행

시점 t=8:
  T1 deadline t=10
  T2 deadline t=15
→ T1 실행
```

### 장점

- **CPU 100%까지 사용 가능합니다** (이론적 최적입니다).
- 동적 우선순위라서 preemption이 *deadline 임박*에 의해 결정됩니다.

### 단점

- **구현이 복잡합니다.** 매 작업마다 deadline을 비교하고 dynamic priority를 재계산해야 합니다.
- **Overrun 시 cascading failure가 발생합니다.** 한 task가 늦으면 다음 task들도 연쇄로 miss합니다.
- **임베디드 RTOS에서 거의 채택되지 않습니다.** FreeRTOS, Zephyr, VxWorks 모두 RMS 기반입니다.

ERIKA Enterprise, MIRTOS 같은 *학술 OS*에 구현되어 있습니다. 자동차 안전 시스템에서 일부 채택합니다.

## Cooperative Scheduling

각 task가 *자발적 yield*를 호출할 때만 전환됩니다. Preemption이 없습니다.

```c
void taskA(void *arg) {
    while (1) {
        do_stuff();
        taskYIELD();   // 다른 task에 양보
    }
}
```

### 장점

- 단순합니다 (race condition이 적습니다).
- 결정적입니다 (어디서 전환할지 명확합니다).

### 단점

- 한 task가 yield하지 않으면 *전체가 멈춥니다*.
- 실시간성이 없습니다.

`configUSE_PREEMPTION = 0`이면 FreeRTOS가 cooperative로 동작합니다. 작은 시스템이나 디버그용입니다.

## Priority Inversion (예고)

Mars Pathfinder (1997)는 화성 탐사선이 *지속적으로 reset*되는 문제를 겪었습니다. 원인은 다음과 같았습니다.

- `T_high` (priority 5) — mutex 대기
- `T_med` (priority 3) — 계속 실행
- `T_low` (priority 1) — mutex 보유, `T_med`에 preempt 당함 → 영원히 못 해제

해결책은 **Priority Inheritance**입니다 (3-04, 3-05 챕터에서 자세히 다룹니다).

## SMP — Multi-Core 스케줄링

다중 코어에서는 한 번에 N개 task를 동시에 실행합니다. 두 가지 접근이 있습니다.

### 1. Global Scheduling

```text
[Ready Queue] ← 모든 코어 공유
Core 0: T_high1
Core 1: T_high2
```

장점은 *load balancing*이 자동이라는 점입니다. 단점은 *lock contention*과 *cache locality*가 깨진다는 점입니다.

### 2. Partitioned Scheduling

```text
[Ready Queue Core 0] ← T1·T2·T3
[Ready Queue Core 1] ← T4·T5
```

장점은 *cache friendly*하다는 점입니다. 단점은 *manual balancing*이 필요하다는 점입니다.

FreeRTOS SMP (10.4+)는 partitioned + task affinity 방식을 씁니다. Zephyr SMP는 global with affinity hint를 씁니다.

## 임베디드 RTOS 표준 답

대부분의 임베디드 시스템에서 **Fixed-Priority Preemptive + RMS 우선순위 + RR (same priority)** 조합을 사용합니다.

```c
// 주기별 priority 할당 (RMS)
xTaskCreate(pid_1ms,    "PID",    256, NULL, 5, NULL);  // 1 ms 주기
xTaskCreate(sensor_10ms,"SENS",   256, NULL, 4, NULL);  // 10 ms
xTaskCreate(log_100ms,  "LOG",    256, NULL, 3, NULL);  // 100 ms
xTaskCreate(ui_1000ms,  "UI",     512, NULL, 2, NULL);  // 1 s

// 같은 priority면 RR 자동
xTaskCreate(net_handler1,"NET1",  256, NULL, 3, NULL);  // log와 RR
xTaskCreate(net_handler2,"NET2",  256, NULL, 3, NULL);
```

이 패턴이 **95% 임베디드 시스템**에서 정답입니다.

## 자주 하는 실수

> ⚠️ 모든 task에 같은 priority

RR로 떨어져 *실시간성이 없습니다*. 주기와 중요도에 따라 분배해야 합니다.

> ⚠️ Critical task에 낮은 priority

PID나 안전 제어가 낮은 priority면 다른 task에 막힙니다. *최고* priority를 주어야 합니다.

> ⚠️ Priority 너무 많은 단계

32단계를 다 쓰면 관리가 복잡해집니다. 보통 5-10단계로 충분합니다.

> ⚠️ CPU 100% 가정

RMS는 69%까지가 안전합니다. 80%를 넘으면 *deadline miss 위험*이 있습니다.

## 정리

- **Round Robin**은 같은 priority 내에서 시간 회전을 합니다.
- **Fixed-Priority Preemptive**가 임베디드 RTOS의 표준입니다.
- **Rate Monotonic**은 짧은 주기 task를 우선하고 분석이 가능합니다 (≤69% CPU).
- **EDF**는 이론적 최적이지만 임베디드에서는 채택되지 않습니다.
- 대부분의 시스템에서 *주기 기반 priority + RMS*가 답입니다.

다음 편에서는 **Preemption vs Cooperation**을 다룹니다. 강제 전환과 자발 양보의 trade-off를 살펴봅니다.

## 관련 항목

- [1-02: Task와 Thread](/blog/embedded/rtos/practical-internals/part1-02-task-thread)
- [1-04: Preemption과 Cooperation](/blog/embedded/rtos/practical-internals/part1-04-preemption)
- [1-10: 실시간성 분석](/blog/embedded/rtos/practical-internals/part1-10-realtime-analysis)
