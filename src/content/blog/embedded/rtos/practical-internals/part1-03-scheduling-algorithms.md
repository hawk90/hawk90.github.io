---
title: "실시간 스케줄링 알고리즘 비교 — RR·Priority·EDF·RMS"
slug: "embedded/rtos/practical-internals/part1-03-scheduling-algorithms"
date: 2026-05-04T09:03:00
description: "Round Robin, Priority-based preemptive, Earliest Deadline First, Rate Monotonic을 다룹니다. 임베디드 RTOS는 대부분 fixed-priority preemptive를 씁니다."
series: "Practical RTOS Internals"
seriesOrder: 3
tags: [rtos, scheduler, rr, priority, edf, rms]
draft: false
topics: ["embedded", "embedded/rtos"]
---

## 한 줄 요약

> **우선순위 정책과 스케줄 가능성 분석을 구분합니다.** Fixed-priority, RR, EDF를 선택해도 deadline은 실행시간·주기·blocking 조건을 확인해야 합니다.

## 4가지 주요 알고리즘

| 알고리즘 | 결정 기준 | 사용처 |
| --- | --- | --- |
| **Round Robin (RR)** | 시간 할당 (time slice) 회전 | 같은 우선순위 task 간 |
| **Fixed-Priority Preemptive** | 고정 우선순위 | FreeRTOS 등에서 설정 가능한 방식 |
| **Earliest Deadline First (EDF)** | 다음 deadline 임박 task 우선 | 학술·일부 hard real-time |
| **Rate Monotonic (RM)** | 짧은 주기 task 우선 | 분석 가능한 hard real-time |

이 글의 FreeRTOS 예제는 단일 코어, `configUSE_PREEMPTION=1`, `configUSE_TIME_SLICING=1` 구성을 전제로 합니다. RM은 task의 주기를 바탕으로 애플리케이션이 우선순위를 배정하는 정책이며, 커널의 fixed-priority 선택과 같은 말이 아닙니다.

## Round Robin (RR)

같은 우선순위 task들이 *time slice* 단위로 차례로 실행됩니다.

```text
시간 →
[T1: 10ms][T2: 10ms][T3: 10ms][T1: 10ms]...
```

### 특징

- **공정성**: 같은 우선순위의 계속 실행 가능한 task를 순환시킵니다. blocking·상위 우선순위·tick 위상 때문에 실제 CPU 시간을 정확히 같게 분배한다는 뜻은 아닙니다.
- **응답성**: 같은 우선순위의 앞선 runnable task가 N-1개면 단순 모델에서도 최대 (N-1) slice를 기다릴 수 있습니다. 상위 우선순위 간섭과 ISR은 별도로 더합니다.
- **deadline 보장 X**: RR 자체만으로는 개별 deadline을 보증하지 않습니다. 유한한 작업·간섭을 분석하면 응답 상한을 구할 수는 있습니다.

### FreeRTOS 적용

`configUSE_TIME_SLICING = 1`이 기본값입니다. 선점형 구성에서 같은 priority의 ready task 사이에 tick 기반 순환을 적용합니다. 더 높은 priority가 ready이면 우선 실행합니다.

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
        vTaskDelay(1);   // Blocked → 1tick 상대 지연 뒤 Ready, 정확한1ms 주기 아님
    }
}

// Priority 1 logger task
void log_task(void *arg) {
    while (1) {
        log_data();      // 5 ms 걸림
        // ↑ 도중 PID가 ready이고 선점 가능하면 전환
    }
}
```

PID의 실제 실행시간과 tick 주기에 따라 logger가 받는 CPU 예산이 달라집니다. 고우선 task가 계속 ready이면 저우선 task가 굶을 수 있으므로 단순히 높은 priority를 주는 것만으로 설계를 끝내지 않습니다.

### 우선순위 선택 — Rate Monotonic Theorem

Liu & Layland (1973)의 독립적인 주기 task, 단일 CPU, 완전 선점, deadline=period, blocking·전환 오버헤드0 모델에서 **짧은 주기에 더 높은 priority**를 주는 RM은 fixed-priority 배정 중 최적입니다. 임의 deadline·공유 자원·SMP에도 그대로 최적이라는 뜻은 아닙니다.

| Task | 주기 | Priority |
|---|---|---|
| PID | 1 ms | 5 |
| 센서 | 10 ms | 4 |
| 로그 | 100 ms | 3 |
| UI | 1000 ms | 2 |

이 규칙이 **Rate Monotonic Scheduling (RMS)**입니다. 분석 가능한 *schedulability bound*가 존재합니다.

다음 그림은 위 priority 표와 다른 별도 모델(PID 0.5/1 ms, Sensor 1/10 ms, Log 2/50 ms)의 설명용 시간선입니다. 보드 측정 결과가 아닙니다.

![RMS timeline — PID·Sensor·Log scheduling](/images/blog/practical-internals/diagrams/part1-03-rms-timeline.svg)

## Rate Monotonic Schedulability

위 RM 모델 가정이 성립하고 Ci가 WCET일 때, n개 task의 utilization 합이 아래 충분조건을 만족하면 deadline을 만족합니다. 평균 실행시간을 넣거나 ISR·blocking을 무시한 실제 시스템에 그대로 적용하지 않습니다.

```text
U = Σ (Ci / Ti) ≤ n × (2^(1/n) − 1)
```

n이 무한대일 때 한계는 **ln(2) ≈ 0.693**입니다. 이는 task 수가 큰 경우의 충분조건 하한이며, 모든 RTOS가 CPU 69%까지 안전하다는 운용 규칙이 아닙니다.

### 예 — 3 task

| Task | Ci (실행시간) | Ti (주기) | Ci/Ti |
|---|---|---|---|
| A | 1 ms | 4 ms | 0.25 |
| B | 2 ms | 5 ms | 0.40 |
| C | 1 ms | 10 ms | 0.10 |
| | | 합 | 0.75 |

n=3일 때 한계는 3 × (2^(1/3) − 1) ≈ **0.78**입니다. 0.75 < 0.78이므로 **schedulable**합니다.

한계 초과는 곧 실패라는 뜻이 아닙니다. 다음 RTA 예제는 위 모델의 fixed-priority 응답시간을 반복 계산합니다. D=T인 독립 task만 지원하고 blocking·jitter·ISR·context switch 비용은 포함하지 않습니다.

### 재현 — 충분조건 초과와 실제 실패를 구분

```js title="rm-response.mjs"
import assert from 'node:assert/strict';
function responseTimes(tasks) {
    assert.ok(tasks.length > 0);
    for (const t of tasks) {
        assert.ok(Number.isSafeInteger(t.C) && t.C > 0);
        assert.ok(Number.isSafeInteger(t.T) && t.T > 0);
    }
    const sorted = [...tasks].sort((a, b) => a.T - b.T);
    return sorted.map((task, i) => {
        let response = task.C;
        while (response <= task.T) {
            const next = task.C + sorted.slice(0, i).reduce(
                (sum, hp) => sum + Math.ceil(response / hp.T) * hp.C, 0);
            assert.ok(Number.isSafeInteger(next));
            if (next === response) return {response, meets: true};
            response = next;
        }
        return {response, meets: false};
    });
}
const example = [{C: 1, T: 4}, {C: 2, T: 5}, {C: 1, T: 10}];
assert.deepEqual(responseTimes(example).map(t => t.response), [1, 3, 4]);
const harmonic = [{C: 1, T: 2}, {C: 1, T: 4}, {C: 2, T: 8}];
assert.equal(harmonic.reduce((u, t) => u + t.C / t.T, 0), 1);
assert.ok(responseTimes(harmonic).every(t => t.meets)); // U=1, RM 충분조건 초과여도 성공
const overload = responseTimes([{C: 2, T: 3}, {C: 2, T: 4}]);
assert.equal(overload[1].meets, false); // 응답6 > deadline4
assert.throws(() => responseTimes([{C: 0, T: 1}]));
console.log('PASS: R=[1,3,4], harmonic U=1 passes, overload deadline rejected');
```

정수 시간 단위의 작은 모델을 Node로 실행한 결과입니다. 이 성공을 실제 RTOS의 WCET 증거나 하드웨어 deadline 증명으로 확대하지 않습니다.

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

- 독립·완전 선점·단일 CPU·deadline=period·오버헤드 0 모델에서는 U≤1이면 가능하며, EDF가 최적입니다. 실제 하드웨어 예산에 100%를 그대로 배정할 근거는 아닙니다.
- 더 이른 absolute deadline을 가진 job이 ready가 되면 현재 job을 선점할 수 있습니다. 시간이 흐른다는 이유만으로 기존 job들의 absolute deadline 순서가 바뀌는 것은 아닙니다.

### 단점

- **구현이 복잡합니다.** ready job의 absolute deadline 순서를 관리해야 합니다. 매 tick에 모든 priority를 재계산해야 하는 것은 아닙니다.
- **과부하에서는 연쇄 miss가 생길 수 있습니다.** 어떤 job을 거절·취소·예산 제한할지 오류 정책을 정해야 합니다.
- FreeRTOS의 일반 task scheduler는 deadline을 보고 RM priority를 자동 배정하지 않습니다. Zephyr에는 `CONFIG_SCHED_DEADLINE`이 있어 같은 static priority 사이에서 deadline으로 순서를 세분할 수 있습니다. 이는 모든 task를 통합 EDF로 스케줄한다는 의미와 다릅니다. [Zephyr scheduling 문서](https://docs.zephyrproject.org/latest/kernel/services/scheduling/index.html)를 확인합니다.

알고리즘의 이론적 장점과 특정 커널 구현·제품 인증은 별도로 확인합니다.

## Cooperative Scheduling

task가 yield하거나, 대기·suspend·delete 등으로 실행 가능 상태를 벗어날 때 task 간 전환할 수 있습니다. ISR 실행 자체가 없어지는 것은 아닙니다.

```c
void taskA(void *arg) {
    while (1) {
        do_stuff();
        taskYIELD();   // 다른 task에 양보
    }
}
```

### 장점

- task 간 전환 지점을 추적하기 쉽습니다. ISR·DMA·다른 코어와 공유하는 데이터의 race는 별도입니다.
- 결정적입니다 (어디서 전환할지 명확합니다).

### 단점

- 한 task가 block·yield 없이 계속 실행하면 다른 task의 실행을 막을 수 있습니다. ISR까지 반드시 멈추는 것은 아닙니다.
- 실시간성이 없습니다.

`configUSE_PREEMPTION = 0`이면 FreeRTOS가 cooperative로 동작합니다. 작은 시스템이나 디버그용입니다.

## Priority Inversion (예고)

Mars Pathfinder (1997)는 화성 탐사선이 *지속적으로 reset*되는 문제를 겪었습니다. 원인은 다음과 같았습니다.

- `T_high` (priority 5) — mutex 대기
- `T_med` (priority 3) — 계속 실행
- `T_low` (priority 1) — mutex 보유, `T_med`에 preempt 당함 → 영원히 못 해제

해결책은 **Priority Inheritance**입니다 (3-04, 3-05 챕터에서 자세히 다룹니다).

## SMP — Multi-Core 스케줄링

N코어에서는 최대N개의 task를 실행할 수 있습니다. affinity·runnable 상태·동시 실행 제한에 따라 유휴 코어가 생길 수도 있습니다. 두 가지 접근이 있습니다.

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

FreeRTOS V11.2.0 SMP는 공유 ready 구조에서 affinity·코어 상태 등의 제약을 적용해 실행 task를 선택합니다. affinity로 코어를 제한할 수 있지만 이를 곧 partitioned scheduler라고 분류하면 안 됩니다. `tasks.c`의 `prvSelectHighestPriorityTask`와 `uxCoreAffinityMask` 경로를 확인합니다. Zephyr의 CPU mask도 해당 설정의 실제 제약으로 확인하며 단순한 hint로만 보지 않습니다.

## 임베디드 RTOS 표준 답

아래는 주기 순서로 priority를 배정하는 예시입니다. 생성 API 호출은 주기 실행을 설정하지 않으므로 각 task 내부에서 release와 overrun 정책을 구현해야 합니다.

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

같은 priority에 NET task를 추가하면 LOG의 간섭 조건도 달라집니다. RM 분석의 독립 task·priority 가정을 그대로 만족한다고 보지 말고 전체 task set을 다시 분석합니다.

## 자주 하는 실수

> ⚠️ 모든 task에 같은 priority

같은 priority의 다른 task가 만드는 간섭을 계산해야 합니다. 같은 priority라는 이유만으로 모든 deadline이 불가능한 것은 아닙니다.

> ⚠️ Critical task에 낮은 priority

deadline·period·blocking과 오류 정책으로 priority를 배정합니다. 중요도만으로 최고 priority를 일괄 부여하면 다른 마감을 놓칠 수 있습니다.

> ⚠️ Priority 너무 많은 단계

사용 가능한 priority 수와 분석에 필요한 구분을 확인합니다. 임의의 단계 수를 일반적인 충분조건으로 삼지 않습니다.

> ⚠️ CPU 100% 가정

RM bound는 가정이 있는 충분조건입니다. 초과하면 RTA 등으로 다시 판단하고, 실제 모델에는 ISR·blocking·전환·측정 불확실성의 예산을 넣습니다.

## 정리

- **Round Robin**은 같은 priority 내에서 시간 회전을 합니다.
- **Fixed-Priority Preemptive**가 임베디드 RTOS의 표준입니다.
- **Rate Monotonic**은 정해진 단일 CPU 모델에서 짧은 주기를 우선합니다. sufficient bound와 실패 판정은 구분합니다.
- **EDF**의 최적성에는 모델 가정이 있고, 커널별 deadline 지원의 의미도 다릅니다.
- 주기·deadline·최악 실행시간·blocking을 명시한 뒤 정책을 선택하고 분석합니다.

다음 편에서는 **Preemption vs Cooperation**을 다룹니다. 강제 전환과 자발 양보의 trade-off를 살펴봅니다.

## 1차 자료

- [Liu & Layland 1973 원 논문](https://cse.unl.edu/~goddard/Courses/RealTimeSystems/Lectures/LiuLayland73.pdf): 단일 CPU 모델·RM bound·deadline 기반 배정
- [FreeRTOS V11.2.0 tasks.c](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/tasks.c): 설정별 선점·tick slicing·SMP 선택 경로

## 관련 항목

- [1-02: Task와 Thread](/blog/embedded/rtos/practical-internals/part1-02-task-thread)
- [1-04: Preemption과 Cooperation](/blog/embedded/rtos/practical-internals/part1-04-preemption)
- [1-10: 실시간성 분석](/blog/embedded/rtos/practical-internals/part1-10-realtime-analysis)
