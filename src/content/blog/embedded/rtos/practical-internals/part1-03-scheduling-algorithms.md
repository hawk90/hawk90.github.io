---
title: "1-03: 스케줄링 알고리즘 — RR, Priority, EDF, RMS"
date: 2026-05-12T03:00:00
description: "Round Robin, Priority-based preemptive, Earliest Deadline First, Rate Monotonic. 임베디드 RTOS는 대부분 fixed-priority preemptive."
series: "Practical RTOS Internals"
seriesOrder: 3
tags: [rtos, scheduler, rr, priority, edf, rms]
draft: true
---

## 한 줄 요약

> **"임베디드 RTOS = Fixed-Priority Preemptive + RR (same priority)"** — 95% 케이스의 답.

## 4가지 주요 알고리즘

| 알고리즘 | 결정 기준 | 사용처 |
| --- | --- | --- |
| **Round Robin (RR)** | 시간 할당 (time slice) 회전 | 같은 우선순위 task 간 |
| **Fixed-Priority Preemptive** | 고정 우선순위 | 99% RTOS 기본 |
| **Earliest Deadline First (EDF)** | 다음 deadline 임박 task 우선 | 학술·일부 hard real-time |
| **Rate Monotonic (RM)** | 짧은 주기 task 우선 | 분석 가능한 hard real-time |

대부분 임베디드 RTOS는 **"Fixed-Priority Preemptive + 같은 priority 내 RR"** 혼합.

## Round Robin (RR)

같은 우선순위 task들이 *time slice* 단위로 차례로.

```text
시간 →
[T1: 10ms][T2: 10ms][T3: 10ms][T1: 10ms]...
```

### 특징

- **공정성**: 모든 task가 같은 CPU 시간
- **응답성**: 새 task가 와도 최대 1 slice 대기
- **deadline 보장 X**: 결정성 없음

### FreeRTOS 적용

`configUSE_TIME_SLICING = 1` (default). 같은 priority 내에서만 RR. 다른 priority 무시.

```c
xTaskCreate(taskA, "A", 256, NULL, 3, NULL);  // Priority 3
xTaskCreate(taskB, "B", 256, NULL, 3, NULL);  // Priority 3 → A와 RR
xTaskCreate(taskC, "C", 256, NULL, 5, NULL);  // Priority 5 → A·B preempt
```

## Fixed-Priority Preemptive

**가장 흔한 RTOS 모델**. 각 task에 *고정 우선순위* 부여. 항상 *가장 높은 ready task*가 실행.

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

PID가 매 ms ready 됨 → log는 *5ms 작업을 여러 번 쪼개* 진행. 결국 *PID가 100%까지 차지 가능*.

### 우선순위 선택 — Rate Monotonic Theorem

Liu & Layland (1973): **짧은 주기 task에 더 높은 priority** = 최적.

```text
PID 1 ms 주기  → priority 5
센서 10 ms 주기 → priority 4
로그 100 ms 주기 → priority 3
UI 1000 ms 주기 → priority 2
```

이 규칙이 **Rate Monotonic Scheduling (RMS)**. 분석 가능한 *schedulability bound* 존재.

![RMS timeline — PID·Sensor·Log scheduling](/images/blog/practical-internals/diagrams/part1-03-rms-timeline.svg)

## Rate Monotonic Schedulability

n개 task의 utilization 합이 다음 한계 안이면 **항상 deadline 만족 보장**:

```
U = Σ (Ci / Ti) ≤ n × (2^(1/n) − 1)
```

n → ∞ 시 한계 = **ln(2) ≈ 0.693**. 즉 **CPU 69%까지 사용해도 안전**.

### 예 — 3 task

```text
Task | Ci (실행시간) | Ti (주기) | Ci/Ti
A    | 1 ms        | 4 ms    | 0.25
B    | 2 ms        | 5 ms    | 0.40
C    | 1 ms        | 10 ms   | 0.10
                            합 = 0.75
```

n=3 한계 = 3 × (2^(1/3) − 1) ≈ **0.78**. 0.75 < 0.78 → **schedulable**.

만약 한계 초과해도 *deadline 만족 가능* — Response Time Analysis (RTA)로 정확히 확인 가능.

## Earliest Deadline First (EDF)

각 task의 *다음 absolute deadline*이 가장 가까운 것 우선.

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

- **CPU 100%까지 사용 가능** (이론적 최적)
- 동적 우선순위 → preemption이 *deadline 임박*에 의해 결정

### 단점

- **구현 복잡** — 매 작업마다 deadline 비교, dynamic priority 재계산
- **Overrun 시 cascading failure** — 한 task가 늦으면 다음 task들도 연쇄 miss
- **임베디드 RTOS에서 거의 미채택** — FreeRTOS·Zephyr·VxWorks 모두 RMS 기반

ERIKA Enterprise·MIRTOS 같은 *학술 OS*에 구현. 자동차 안전 시스템에서 일부 채택.

## Cooperative Scheduling

각 task가 *자발적 yield* 시에만 전환. Preemption 없음.

```c
void taskA(void *arg) {
    while (1) {
        do_stuff();
        taskYIELD();   // 다른 task에 양보
    }
}
```

### 장점

- 단순 (race condition 적음)
- 결정적 (어디서 전환할지 명확)

### 단점

- 한 task가 yield 안 하면 *전체 멈춤*
- 실시간성 X

`configUSE_PREEMPTION = 0` 시 FreeRTOS가 cooperative. 작은 시스템·디버그용.

## Priority Inversion (예고)

Mars Pathfinder (1997) — 화성 탐사선이 *지속 reset*. 원인:

```text
T_high (priority 5) → mutex 대기
T_med  (priority 3) → 계속 실행
T_low  (priority 1) → mutex 보유, T_med에 preempt 당함 → 영원히 못 해제
```

해결 — **Priority Inheritance** (3-04, 3-05 챕터에서 자세히).

## SMP — Multi-Core 스케줄링

다중 코어 — 한 번에 N개 task 동시 실행. 두 접근:

### 1. Global Scheduling

```text
[Ready Queue] ← 모든 코어 공유
Core 0: T_high1
Core 1: T_high2
```

장점 — *load balancing* 자동. 단점 — *lock contention*, *cache locality* 깨짐.

### 2. Partitioned Scheduling

```text
[Ready Queue Core 0] ← T1·T2·T3
[Ready Queue Core 1] ← T4·T5
```

장점 — *cache friendly*. 단점 — *manual balancing* 필요.

FreeRTOS SMP (10.4+): partitioned + task affinity. Zephyr SMP: global with affinity hint.

## 임베디드 RTOS 표준 답

대부분의 임베디드 시스템에서 **Fixed-Priority Preemptive + RMS 우선순위 + RR (same priority)** 조합:

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

이 패턴이 **95% 임베디드 시스템**에서 정답.

## 자주 하는 실수

> ⚠️ 모든 task에 같은 priority

RR로 떨어져 *실시간성 없음*. 주기·중요도에 따라 분배.

> ⚠️ Critical task에 낮은 priority

PID·안전 제어가 낮은 priority → 다른 task에 막힘. *최고* priority.

> ⚠️ Priority 너무 많은 단계

32단계 다 쓰면 관리 복잡. 보통 5-10단계로 충분.

> ⚠️ CPU 100% 가정

RMS는 69%까지가 안전. 80% 넘으면 *deadline miss 위험*.

## 정리

- **Round Robin** = 같은 priority 내 시간 회전
- **Fixed-Priority Preemptive** = 임베디드 RTOS의 표준
- **Rate Monotonic** = 짧은 주기 task 우선 + 분석 가능 (≤69% CPU)
- **EDF** = 이론적 최적이지만 임베디드에서 미채택
- 대부분 시스템에서 *주기 기반 priority + RMS*가 답.

다음 편은 **Preemption vs Cooperation** — 강제 전환 vs 자발 양보의 trade-off.

## 관련 항목

- [1-02: Task와 Thread](/blog/embedded/rtos/practical-internals/part1-02-task-thread)
- [1-04: Preemption과 Cooperation](/blog/embedded/rtos/practical-internals/part1-04-preemption)
- [1-10: 실시간성 분석](/blog/embedded/rtos/practical-internals/part1-10-realtime-analysis)
