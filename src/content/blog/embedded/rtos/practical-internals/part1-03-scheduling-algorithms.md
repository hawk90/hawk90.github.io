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
| **Fixed-Priority Preemptive** | 고정 우선순위 | FreeRTOS(`configUSE_PREEMPTION=1`), Zephyr 기본 스케줄러 |
| **Earliest Deadline First (EDF)** | 다음 deadline 임박 task 우선 | Zephyr `CONFIG_SCHED_DEADLINE`(같은 우선순위 안에서만) |
| **Rate Monotonic (RM)** | 짧은 주기 task 우선 | 커널 기능이 아니라 응용이 우선순위를 정하는 규칙 |

이 글의 FreeRTOS 예제는 단일 코어, `configUSE_PREEMPTION=1`, `configUSE_TIME_SLICING=1` 구성을 전제로 합니다. RM은 task의 주기를 바탕으로 애플리케이션이 우선순위를 배정하는 정책이며, 커널의 fixed-priority 선택과 같은 말이 아닙니다.

## Round Robin (RR)

같은 우선순위 task들이 *time slice* 단위로 차례로 실행됩니다. 놀이공원의 한 줄 서기와 비슷합니다. 한 사람이 한 바퀴 타면 줄 맨 뒤로 가고 다음 사람이 탑니다. FreeRTOS에서 이 한 바퀴의 길이는 **1 tick**입니다. 따로 정하는 slice 길이가 없고, tick 인터럽트마다 같은 우선순위 ready task가 둘 이상이면 전환을 요청합니다([`tasks.c` L4861-L4872](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/tasks.c#L4861-L4872)). Zephyr는 `CONFIG_TIMESLICE_SIZE`로 slice 길이를 따로 정합니다. Kconfig에는 단위가 ms, 기본값이 0으로 적혀 있습니다([v3.7.0 `kernel/Kconfig` L638-L644](https://github.com/zephyrproject-rtos/zephyr/blob/v3.7.0/kernel/Kconfig#L638-L644)). slice가 끝날 때 현재 thread가 선점 가능하면 커널이 대신 `k_yield()`를 부릅니다([scheduling 문서](https://github.com/zephyrproject-rtos/zephyr/blob/v3.7.0/doc/kernel/services/scheduling/index.rst) "Preemptive Time Slicing").

### 특징

- **공정성**: 같은 우선순위의 계속 실행 가능한 task를 순환시킵니다. blocking·상위 우선순위·tick 위상 때문에 실제 CPU 시간을 정확히 같게 분배한다는 뜻은 아닙니다.
- **응답성**: 같은 우선순위의 앞선 runnable task가 N-1개면 단순 모델에서도 최대 (N-1) slice를 기다릴 수 있습니다. 상위 우선순위 간섭과 ISR은 별도로 더합니다.
- **deadline 보장 X**: RR 자체만으로는 개별 deadline을 보증하지 않습니다. 유한한 작업·간섭을 분석하면 응답 상한을 구할 수는 있습니다.

### FreeRTOS 적용

`configUSE_TIME_SLICING`을 정의하지 않으면 1입니다([`FreeRTOS.h` L2749-L2750](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/include/FreeRTOS.h#L2749-L2750)). 선점형 구성에서 같은 priority의 ready task 사이에 tick 기반 순환을 적용합니다. 더 높은 priority가 ready이면 우선 실행합니다.

```c
xTaskCreate(taskA, "A", 256, NULL, 3, NULL);  // Priority 3
xTaskCreate(taskB, "B", 256, NULL, 3, NULL);  // Priority 3 → A와 RR
xTaskCreate(taskC, "C", 256, NULL, 5, NULL);  // Priority 5 → A·B preempt
```

이 구성을 QEMU에서 그대로 돌려 tick마다 누가 CPU를 잡는지 기록했습니다. A와 B는 쉬지 않고 돌며 현재 tick에 자기 이름을 적고, C는 4 tick에 깨어나 2 tick 동안 일한 뒤 잠듭니다. 우선순위 6의 감독 task가 14 tick 뒤에 표를 출력합니다.

```c title="rr.c (발췌)"
static volatile char who[N];
static void mark(char me){ TickType_t t=xTaskGetTickCount(); if(t<N && who[t]==0) who[t]=me; }
static void busy(void*a){ char me=*(char*)a; for(;;) mark(me); }
static void hi(void*a){ (void)a; vTaskDelay(4); TickType_t s=xTaskGetTickCount(); while(xTaskGetTickCount()-s<2) mark('C'); vTaskDelay(100); }
```

FreeRTOS V11.2.0 `ARM_CM3`, arm-none-eabi-gcc 16.2.0 `-O2`, QEMU 11.1.3 `mps2-an385 -icount shift=5`에서 돌렸고, 두 번째 실행은 `-DconfigUSE_TIME_SLICING=0`으로 다시 빌드했습니다.

```text
configUSE_TIME_SLICING=1
tick:  1  2  3  4  5  6  7  8  9 10 11 12 13 
run :  B  A  B  C  C  A  B  A  B  A  B  A  B 
configUSE_TIME_SLICING=0
tick:  1  2  3  4  5  6  7  8  9 10 11 12 13 
run :  A  A  A  C  C  B  B  B  B  B  B  B  B 
```

time slicing을 켜면 A와 B가 매 tick 번갈아 돕니다. 끄면 A가 C에게 선점될 때까지 계속 돌고, C가 잠든 뒤에는 B가 끝까지 CPU를 가집니다. 끈 경우에도 A에서 B로 한 번 넘어간 이유는 다음 task를 고르는 `listGET_OWNER_OF_NEXT_ENTRY()`가 ready list의 `pxIndex`를 한 칸 전진시킨 뒤 그 항목을 고르기 때문입니다([`list.h` L286-L297](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/include/list.h#L286-L297), [`tasks.c` L242](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/tasks.c#L242)). time slicing은 tick마다 이 선택을 강제할 뿐이고, 선점이 끝난 뒤의 재선택에서도 같은 회전이 일어납니다.

## Fixed-Priority Preemptive

FreeRTOS와 Zephyr의 기본 모델입니다. Zephyr 문서는 "The kernel's scheduler selects the highest priority ready thread"라고 적습니다([v3.7.0 scheduling 문서](https://github.com/zephyrproject-rtos/zephyr/blob/v3.7.0/doc/kernel/services/scheduling/index.rst) L38). 각 task에 *고정 우선순위*를 부여하고, 항상 *가장 높은 ready task*가 실행됩니다. 응급실 진료 순서와 비슷합니다. 먼저 온 환자보다 위급한 환자가 먼저 들어갑니다.

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

Liu & Layland (1973)은 단일 프로세서에서 다섯 가정을 둡니다. (A1) hard deadline이 있는 task는 일정한 주기로 요청되고, (A2) 각 요청은 다음 요청 전에 끝나야 하며(deadline = period), (A3) task끼리 독립이고, (A4) 실행 시간이 일정하며(최대 실행 시간으로 해석 가능), (A5) 비주기 task는 hard deadline이 없습니다. 이 모델에서 **짧은 주기에 더 높은 priority**를 주는 RM은 "어떤 고정 우선순위 배정이 가능하면 RM도 가능하다"는 의미로 최적입니다(Theorem 2). 공유 자원이 있으면 (A3)이 깨지므로 이 정리를 그대로 쓸 수 없습니다.

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

이 식은 논문의 Theorem 5("m개 task의 고정 우선순위 배정에서 utilization의 least upper bound는 m(2^(1/m) − 1)")이고, m이 커지면 **ln 2 ≈ 0.693**으로 내려갑니다. 이 값보다 낮으면 반드시 schedulable하다는 충분조건이지, CPU를 69%까지만 써야 한다는 운용 규칙이 아닙니다.

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

Node로 실행하면 `PASS: R=[1,3,4], harmonic U=1 passes, overload deadline rejected`를 출력합니다. 정수 시간 단위의 작은 모델이므로 WCET 값 자체는 별도로 재야 합니다. 1-10에서 이 계산에 blocking 항을 더합니다.

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

- 같은 Liu & Layland 가정에서 deadline-driven(EDF) 스케줄은 ΣCi/Ti ≤ 1일 때 *그리고 그때만* 가능합니다(Theorem 7). 고정 우선순위의 bound보다 높지만, 문맥 전환 비용과 ISR은 모델 밖에 있습니다.
- 더 이른 absolute deadline을 가진 job이 ready가 되면 현재 job을 선점할 수 있습니다. 시간이 흐른다는 이유만으로 기존 job들의 absolute deadline 순서가 바뀌는 것은 아닙니다.

### 단점

- **구현이 복잡합니다.** ready job의 absolute deadline 순서를 관리해야 합니다. 매 tick에 모든 priority를 재계산해야 하는 것은 아닙니다.
- **과부하에서 어떤 job이 놓칠지 우선순위만으로 정해지지 않습니다.** 고정 우선순위에서는 낮은 우선순위 task부터 놓치지만, EDF에서는 deadline 순서에 따라 아무 task나 놓칠 수 있습니다. 어떤 job을 거절·취소·예산 제한할지 오류 정책을 정해야 합니다.
- FreeRTOS의 task scheduler에는 deadline 필드가 없습니다(1-02의 `tskTCB`). Zephyr의 `CONFIG_SCHED_DEADLINE`은 Kconfig 도움말이 "Priority decisions within (!!) a single priority will choose the next expiring deadline"이라고 적듯 같은 static priority 안에서만 deadline으로 순서를 정합니다([v3.7.0 `kernel/Kconfig` L112-L119](https://github.com/zephyrproject-rtos/zephyr/blob/v3.7.0/kernel/Kconfig#L112-L119)). 모든 task를 하나의 EDF로 스케줄하는 기능이 아닙니다.

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

- task 간 전환은 yield·block 지점에서만 일어나므로, 그 사이의 코드는 다른 task와의 race를 걱정하지 않아도 됩니다. ISR·DMA·다른 코어와 공유하는 데이터의 race는 그대로 남습니다.
- 전환 지점이 소스에 드러나 있어 추적이 쉽습니다.

### 단점

- 한 task가 block·yield 없이 계속 실행하면 다른 모든 task가 기다립니다. ISR은 그대로 돕니다.
- 높은 우선순위 task의 응답 시간에 *낮은 우선순위 task가 yield 없이 도는 가장 긴 구간*이 더해집니다. 실시간 분석이 불가능해지는 것은 아니지만, 이 구간을 모든 task에 대해 알아야 합니다.

`configUSE_PREEMPTION = 0`이면 FreeRTOS가 cooperative로 동작합니다. 이때 idle task도 매 바퀴 `taskYIELD()`를 부릅니다([`tasks.c` L5830-L5836](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/tasks.c#L5830-L5836)). Zephyr는 음수 우선순위 thread를 cooperative로 만들어 한 시스템 안에 두 방식을 섞습니다(1-01).

## Priority Inversion (예고)

Mars Pathfinder는 1997년 7월 4일 착륙 며칠 뒤부터 *total system reset*을 반복했습니다. Wind River CTO David Wilner의 IEEE RTSS 기조연설을 Mike Jones가 정리한 글([Jones 정리](https://www.cs.cornell.edu/courses/cs614/1999sp/papers/pathfinder.html))과 JPL Glenn Reeves의 원문([Reeves 원문](https://www.cs.unc.edu/~anderson/teach/comp790/papers/mars_pathfinder_long_version.html))에 따르면 구조는 다음과 같았습니다.

- 높은 우선순위의 bus management task — information bus를 보호하는 mutex 대기
- 중간 우선순위의 communications task — 인터럽트로 깨어나 실행
- 낮은 우선순위의 meteorological data task — mutex 보유 중 선점당해 해제하지 못함

bus management task가 제때 돌지 못하자 watchdog이 이를 감지해 시스템 전체를 reset했습니다. 수정은 VxWorks mutex 생성 인자의 priority inheritance 옵션을 켜는 것이었습니다.

해결책은 **Priority Inheritance**입니다 (3-04, 3-05 챕터에서 자세히 다룹니다).

## SMP — Multi-Core 스케줄링

N코어에서는 최대N개의 task를 실행할 수 있습니다. affinity·runnable 상태·동시 실행 제한에 따라 유휴 코어가 생길 수도 있습니다. 두 가지 접근이 있습니다.

### 1. Global Scheduling

```text
[Ready Queue] ← 모든 코어 공유
Core 0: T_high1
Core 1: T_high2
```

모든 코어가 하나의 ready 구조에서 task를 꺼냅니다. 어느 코어든 비면 가장 높은 ready task를 가져가므로 부하가 저절로 나뉩니다. 대신 모든 코어가 같은 자료구조를 고치므로 그 자료구조를 보호하는 lock을 함께 씁니다.

### 2. Partitioned Scheduling

```text
[Ready Queue Core 0] ← T1·T2·T3
[Ready Queue Core 1] ← T4·T5
```

task를 코어에 미리 나눠 두고 코어마다 단일 코어 스케줄러를 돌립니다. 코어별로 단일 코어 분석을 그대로 쓸 수 있지만, 어느 task를 어느 코어에 둘지는 설계자가 정합니다.

FreeRTOS V11.2.0 SMP는 global 쪽입니다. 모든 코어가 같은 `pxReadyTasksLists[]`에서 고르고, `prvSelectHighestPriorityTask(xCoreID)`가 후보 task의 `uxCoreAffinityMask`에 그 코어 bit가 있는지 검사합니다([`tasks.c` L1005, L1089](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/tasks.c#L1005)). affinity로 task를 한 코어에 묶을 수는 있지만 ready list가 코어별로 나뉘지는 않습니다. Zephyr의 `CONFIG_SCHED_CPU_MASK`는 `k_thread_cpu_mask_*()` API로 thread가 돌 수 있는 CPU를 제한하며, Kconfig 도움말은 이 기능이 DUMB 스케줄러에서만 동작하고 runnable thread 수에 O(N)으로 비례한다고 적습니다([v3.7.0 `kernel/Kconfig` L121-L131](https://github.com/zephyrproject-rtos/zephyr/blob/v3.7.0/kernel/Kconfig#L121-L131)). SMP는 [4-07](/blog/embedded/rtos/practical-internals/part4-07-smp-rtos)에서 자세히 다룹니다.

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

FreeRTOS는 우선순위 하나마다 `pxReadyTasksLists[]`에 `List_t` 하나를 둡니다([`tasks.c` L475](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/tasks.c#L475)). Cortex-M 포트에서 CLZ 명령을 쓰는 `configUSE_PORT_OPTIMISED_TASK_SELECTION = 1`(포트 기본값)은 `configMAX_PRIORITIES`가 32를 넘으면 컴파일 오류를 냅니다([`ARM_CM3/portmacro.h` L141-L159](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/portable/GCC/ARM_CM3/portmacro.h#L141-L159)). 우선순위 수는 RM 분석에서 서로 다른 주기의 수만큼만 있으면 됩니다.

> ⚠️ CPU 100% 가정

RM bound는 가정이 있는 충분조건입니다. 초과하면 RTA 등으로 다시 판단하고, 실제 모델에는 ISR·blocking·전환·측정 불확실성의 예산을 넣습니다.

## 정리

- **Round Robin**은 같은 priority 내에서 시간 회전을 합니다.
- **Fixed-Priority Preemptive**가 FreeRTOS·Zephyr의 기본 모델입니다. FreeRTOS의 time slice는 1 tick입니다.
- **Rate Monotonic**은 정해진 단일 CPU 모델에서 짧은 주기를 우선합니다. sufficient bound와 실패 판정은 구분합니다.
- **EDF**의 최적성에는 모델 가정이 있고, 커널별 deadline 지원의 의미도 다릅니다.
- 주기·deadline·최악 실행시간·blocking을 명시한 뒤 정책을 선택하고 분석합니다.

다음 편에서는 **Preemption vs Cooperation**을 다룹니다. 강제 전환과 자발 양보의 trade-off를 살펴봅니다.

## 1차 자료

- C. L. Liu, J. W. Layland, "Scheduling Algorithms for Multiprogramming in a Hard-Real-Time Environment", *J. ACM* 20(1), pp. 46-61, 1973 ([PDF](https://www.cs.ru.nl/~hooman/DES/liu-layland.pdf)): 가정 (A1)-(A5), Theorem 2(RM 최적), Theorem 5(m(2^(1/m) − 1)), Theorem 7(EDF ΣC/T ≤ 1)
- [FreeRTOS V11.2.0 tasks.c](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/tasks.c): time slicing(L4861), 선택 매크로(L242), SMP 선택(L1005)
- [Zephyr v3.7.0 scheduling 문서](https://github.com/zephyrproject-rtos/zephyr/blob/v3.7.0/doc/kernel/services/scheduling/index.rst), [`kernel/Kconfig`](https://github.com/zephyrproject-rtos/zephyr/blob/v3.7.0/kernel/Kconfig)

## 관련 항목

- [1-02: Task와 Thread](/blog/embedded/rtos/practical-internals/part1-02-task-thread)
- [1-04: Preemption과 Cooperation](/blog/embedded/rtos/practical-internals/part1-04-preemption)
- [1-10: 실시간성 분석](/blog/embedded/rtos/practical-internals/part1-10-realtime-analysis)
