---
title: "실시간성 분석 — Latency·Jitter·Deadline·WCET·RMA"
date: 2026-05-04T09:10:00
description: "4 핵심 지표인 Latency, Jitter, Deadline, WCET를 다룹니다. Hard와 Soft real-time의 차이, Rate Monotonic Analysis로 schedulability를 증명하는 방법을 살펴봅니다."
series: "Practical RTOS Internals"
seriesOrder: 10
tags: [realtime, latency, jitter, wcet, rma, deadline]
draft: false
---

## 한 줄 요약

> **"평균 아닌 worst-case가 답"** — 평균이 빠른 시스템도 worst-case가 deadline을 넘기면 실패합니다.

## 4 핵심 지표

### 1. Latency

이벤트 발생에서 응답 시작까지의 시간입니다.

```text
External event (IRQ) ─────→ ISR start ─────→ Task wake ─────→ Task code
       ↑ t=0            ISR latency       wake latency      response
                            (수십 ns)       (수 µs)
```

| 구성 | 측정 |
| --- | --- |
| **ISR latency** | IRQ 발생 → ISR 첫 줄 |
| **Scheduler latency** | ISR 끝 → ready task 실행 |
| **Wake latency** | 모든 합 |

### 2. Jitter

Latency의 변동성을 가리킵니다.

예 — 주기적 task가 매 ms마다 깨어야 한다고 합시다. 실제 깨어남이 1.000, 1.001, 0.998, 1.003, 0.997 ... 로 분포한다면 `Jitter = max - min = 6 µs`입니다.

평균이 좋아도 jitter가 크면 예측이 불가능합니다. 실시간 제어(모터, 오디오)에 치명적입니다.

### 3. Deadline

이벤트 후 반드시 처리해야 할 마감입니다.

| 종류 | Deadline miss 결과 |
| --- | --- |
| **Hard** | 시스템 실패 (자동차 ESC, 인공호흡기) |
| **Firm** | 결과 무효 (실시간 거래) |
| **Soft** | 품질 저하 (비디오 frame drop) |

### 4. WCET — Worst-Case Execution Time

한 task가 최대 얼마나 걸리는지를 나타냅니다. 평균(AET)이 아닌 worst case가 중요합니다.

PID 실행 시간 분포 예

| 항목 | 값 |
|---|---|
| Average | 50 µs |
| Median | 48 µs |
| p99 | 70 µs |
| Max | 95 µs (WCET, 보장 가능 한계) |

## WCET 측정 — 4 방법

### 1. Static Analysis

소스와 CPU 모델로 모든 path를 분석합니다. aiT, Bound-T 같은 상용 도구가 있습니다.

장점은 수학적 보장이 가능하다는 점입니다. 단점은 비싸고 setup이 복잡하다는 점입니다.

### 2. Measurement-Based

많은 input을 넣어 실제 실행 시간을 측정합니다.

```c
uint32_t start = DWT->CYCCNT;
pid_compute();
uint32_t cycles = DWT->CYCCNT - start;
log_max(cycles);  // p99·max 누적
```

장점은 간단하다는 점입니다. 단점은 모든 path를 커버하지 못한다는 점입니다.

### 3. Hybrid

Static analysis와 measurement를 결합합니다. Loop bound는 측정하고, 경로는 static으로 분석합니다.

### 4. Probabilistic WCET (pWCET)

확률 분포로 표현합니다. 예를 들어 "99.999%로 80 µs 미만"과 같습니다. EVT(Extreme Value Theory)를 활용합니다.

## Schedulability — 모든 task가 deadline 만족할 수 있나

### Rate Monotonic Analysis (RMA)

Liu & Layland 1973 논문에서 출발했습니다.
- 각 task에 주기 inverse priority를 부여합니다(짧은 주기 = 높은 priority).
- Utilization bound는 다음과 같습니다.

```
U = Σ (Ci / Ti) ≤ n × (2^(1/n) − 1)
```

n=1 → 1.0, n=2 → 0.828, n=∞ → 0.693.

| Task | Ci | Ti | Ci/Ti |
| --- | --- | --- | --- |
| PID | 0.5 ms | 1 ms | 0.50 |
| Sensor | 1 ms | 10 ms | 0.10 |
| Log | 2 ms | 50 ms | 0.04 |
| | | **합 = 0.64** | |

n=3일 때 bound는 3×(2^(1/3)−1) ≈ **0.78**입니다. 0.64 < 0.78이므로 **schedulable**합니다.

### Response Time Analysis (RTA)

더 정확한 분석 방법입니다. Iterative하게 계산합니다.

$$R_i = C_i + \sum_{j \in hp(i)} \left\lceil \frac{R_i}{T_j} \right\rceil \cdot C_j$$

$R_i \leq D_i$ (deadline)이면 schedulable입니다.

> 💡 RTA는 utilization bound를 넘더라도 deadline 만족 여부를 정확하게 판정합니다. iterative하게 수렴시키는 방식입니다.

## Latency 원인 분석

### Source 1: Interrupt Disable

```c
taskENTER_CRITICAL();
// ... 50 µs work
taskEXIT_CRITICAL();
```

이 경우 모든 ISR이 50 µs 지연됩니다. 최대 critical section 길이가 곧 ISR worst latency가 됩니다.

### Source 2: ISR Nesting

ISR_A 도중 ISR_B가 시작되면 A가 끝나야 B가 실행됩니다. NVIC priority를 잘 설정하면 nested 실행이 가능합니다(high prio가 low prio를 preempt).

### Source 3: Scheduler Decision

Tick ISR이 다음 task를 결정하는 데 N µs가 걸립니다. List가 크면 더 길어집니다. FreeRTOS는 약 100 cycles입니다.

### Source 4: Context Switch

Register save/restore에는 Cortex-M이 약 30 cycles 걸립니다. Cortex-A는 모드 전환과 MMU 때문에 수백 cycles입니다.

### Source 5: Cache Miss

새 task가 다른 working set을 갖고 있으면 L1 miss가 발생하고, DRAM access에 200 cycles 이상이 듭니다.

### Source 6: Bus Contention

DMA나 다른 master가 bus를 사용 중이면 CPU가 stall 됩니다.

## 측정 — Cyclictest

Linux PREEMPT_RT의 표준 도구입니다.

```bash
$ cyclictest -p 80 -t 1 -i 1000 -l 100000
# Min: 5 µs, Avg: 7 µs, Max: 23 µs
```

`Max` 값이 worst-case wake latency입니다. Hard real-time이라면 이 값이 deadline 안에 들어와야 합니다.

## 측정 — Bare-Metal

GPIO와 로직 분석기를 쓰거나 DWT를 활용합니다.

```c
GPIO_SET(DEBUG_PIN);
critical_section();
GPIO_CLR(DEBUG_PIN);
```

로직 분석기로 pulse width를 측정해 critical section의 worst-case를 얻습니다.

## 실전 — Latency 예산 (Budget)

PID 1 ms 주기, deadline 1 ms

| 항목 | 시간 |
|---|---|
| ISR latency | 50 ns |
| Scheduler latency | 2 µs |
| Context switch | 3 µs |
| PID compute (WCET) | 95 µs |
| PID write actuator | 10 µs |
| **Total worst-case** | ~110 µs (= 11% of 1 ms) |

여유 89%로 안전합니다.

만약 `log_uart()`가 5 ms를 점유한다면 어떨까요? Log priority가 PID보다 낮으므로, PID가 깨면 즉시 preempt 됩니다. 영향이 없습니다(Preemptive RTOS의 가치).

## Test Cases

WCET를 측정할 때는 각 path를 모두 커버해야 합니다.

```c
int process(int *data, int n) {
    if (n > MAX) return ERROR;       // early return
    for (int i = 0; i < n; i++) {    // loop bound depends on n
        if (data[i] == 0) continue;
        complex_op(data[i]);
    }
    return SUCCESS;
}
```

테스트 케이스:
- `n = 0` (loop 0회)
- `n = MAX` (loop 최대)
- `n > MAX` (early return)
- `data` 전부 0 vs 전부 nonzero (branch)

## Hard vs Soft 시스템 설계 차이

| | Hard | Soft |
| --- | --- | --- |
| **WCET 분석** | 필수 (인증) | 측정으로 충분 |
| **메모리 할당** | 정적·미리 | 동적 OK |
| **OS** | RTOS 또는 bare-metal | Linux + PREEMPT_RT 가능 |
| **인증** | DO-178C·ISO 26262 ASIL D | 없음 |
| **테스트** | MC/DC coverage | 일반 |
| **예시** | 비행기, 의료기기 | 비디오, 게임 |

## 자주 하는 실수

> ⚠️ 평균만 보고 OK 판정

평균 latency가 10 µs라도 worst가 1 ms면 hard real-time은 실패합니다.

> ⚠️ 측정 환경 == 실제 환경 가정

벤치마크 환경에서는 빠르지만 실 운영에서는 cache, bus, thermal의 영향으로 느려질 수 있습니다. 실 환경에서 수일간 측정해야 합니다.

> ⚠️ Utilization 99% 목표

너무 빡빡합니다. 실제로는 jitter나 event burst로 deadline을 miss할 수 있습니다. RMS bound인 69%를 권장합니다.

> ⚠️ Critical section 길이 측정 안 함

`taskENTER_CRITICAL` 호출 패턴마다 worst-case time을 측정해야 합니다. 디버그 print가 critical 안에 있으면 수 ms까지 늘어날 수 있습니다.

## 정리 — Part 1 마무리

- 4 지표는 **Latency, Jitter, Deadline, WCET**입니다.
- **WCET**가 hard real-time의 핵심이며, 평균이 아닌 worst가 중요합니다.
- **RMS**와 **RTA**로 schedulability를 수학적으로 증명할 수 있습니다.
- Latency 원인은 IRQ disable, ISR nesting, scheduler, context switch, cache, bus 등입니다.
- 측정 도구로는 Linux의 `cyclictest`, bare-metal의 DWT+GPIO가 있습니다.
- Hard real-time은 정적 할당과 인증, WCET 분석이 함께 필요합니다.

**Part 1(RTOS Fundamentals)이 끝났습니다**. Part 2부터는 내부 구현을 다룹니다. 스케줄러 자료구조와 context switch 어셈블리가 주제입니다.

## 관련 항목

- [1-03: 스케줄링 알고리즘 (RMS)](/blog/embedded/rtos/practical-internals/part1-03-scheduling-algorithms)
- [1-09: 큐와 메시지 패싱](/blog/embedded/rtos/practical-internals/part1-09-queues)
- [2-10: Scheduler Latency 측정](/blog/embedded/rtos/practical-internals/part2-10-scheduler-latency)
- [Embedded Performance Engineering](/blog/embedded/performance-engineering/00-preface)
