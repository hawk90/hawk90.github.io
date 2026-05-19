---
title: "1-10: 실시간성 분석 — Latency, Jitter, Deadline, WCET, RMA"
date: 2026-05-08T10:00:00
description: "4 핵심 지표 — Latency·Jitter·Deadline·WCET. Hard vs Soft real-time. Rate Monotonic Analysis로 schedulability 증명."
series: "Practical RTOS Internals"
seriesOrder: 10
tags: [realtime, latency, jitter, wcet, rma, deadline]
draft: true
---

## 한 줄 요약

> **"평균 아닌 worst-case가 답"** — 평균이 빠른 시스템도 worst-case가 deadline 넘기면 실패.

## 4 핵심 지표

### 1. Latency

이벤트 발생 → 응답 시작까지의 시간.

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

Latency의 *변동성*.

```text
주기적 task — 매 ms 깨어야
실제 깨어남: 1.000, 1.001, 0.998, 1.003, 0.997 ...
Jitter = max - min = 6 µs
```

평균은 좋은데 jitter 크면 *예측 불가*. 실시간 제어 (모터, 오디오)에 치명.

### 3. Deadline

이벤트 후 *반드시 처리해야 할 마감*.

| 종류 | Deadline miss 결과 |
| --- | --- |
| **Hard** | 시스템 실패 (자동차 ESC, 인공호흡기) |
| **Firm** | 결과 무효 (실시간 거래) |
| **Soft** | 품질 저하 (비디오 frame drop) |

### 4. WCET — Worst-Case Execution Time

한 task가 *최대 얼마나 걸리나*. 평균(AET)이 아닌 worst case가 중요.

```text
PID 실행 시간 분포:
  Average: 50 µs
  Median: 48 µs
  p99: 70 µs
  Max: 95 µs   ← WCET (보장 가능 한계)
```

## WCET 측정 — 4 방법

### 1. Static Analysis

소스 + CPU 모델로 *모든 path 분석*. aiT, Bound-T 같은 상용 도구.

장점 — *수학적 보장*. 단점 — *비싸고 setup 복잡*.

### 2. Measurement-Based

실제 실행 시간 측정 × 많은 input.

```c
uint32_t start = DWT->CYCCNT;
pid_compute();
uint32_t cycles = DWT->CYCCNT - start;
log_max(cycles);  // p99·max 누적
```

장점 — *간단*. 단점 — *모든 path 커버 안 됨*.

### 3. Hybrid

Static analysis + measurement. *Loop bound는 측정*, *경로는 static*.

### 4. Probabilistic WCET (pWCET)

확률 분포로 표현. "*99.999%로 80 µs 미만*". *EVT* (Extreme Value Theory).

## Schedulability — 모든 task가 deadline 만족할 수 있나

### Rate Monotonic Analysis (RMA)

Liu & Layland 1973:
- 각 task에 *주기 inverse priority* (짧은 주기 = 높은 priority)
- *Utilization bound*:

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

n=3, bound = 3×(2^(1/3)−1) ≈ **0.78**. 0.64 < 0.78 → **schedulable**.

### Response Time Analysis (RTA)

더 정확한 분석. Iterative:

```text
R_i = C_i + Σ (j higher prio) ⌈R_i / T_j⌉ × C_j
```

`R_i ≤ D_i` (deadline)이면 *schedulable*.

> 💡 RTA는 utilization bound가 넘어도 *deadline 만족 여부* 정확히. *iterative*로 수렴.

## Latency 원인 분석

### Source 1: Interrupt Disable

```c
taskENTER_CRITICAL();
// ... 50 µs work
taskEXIT_CRITICAL();
```

→ 모든 ISR이 *50 µs 지연*. *최대 critical section 길이*가 *ISR worst latency*.

### Source 2: ISR Nesting

ISR_A 도중 ISR_B 시작 → A 끝나야 B 실행. *NVIC priority 잘 설정*하면 nested 가능 (high prio가 low prio preempt).

### Source 3: Scheduler Decision

Tick ISR이 *다음 task 결정*에 N µs. List 크면 더 김. FreeRTOS는 ~100 cycles.

### Source 4: Context Switch

Register save/restore — Cortex-M ~30 cycles. Cortex-A ~수백 cycles (모드 전환·MMU).

### Source 5: Cache Miss

새 task가 *다른 working set* → L1 miss → DRAM access (200+ cycles).

### Source 6: Bus Contention

DMA·다른 master가 bus 사용 중 → CPU stall.

## 측정 — Cyclictest

Linux PREEMPT_RT 표준 도구.

```bash
$ cyclictest -p 80 -t 1 -i 1000 -l 100000
# Min: 5 µs, Avg: 7 µs, Max: 23 µs
```

`Max` 값이 *worst-case wake latency*. Hard real-time이면 *deadline 안에 들어와야*.

## 측정 — Bare-Metal

GPIO + 로직 분석기 또는 DWT:

```c
GPIO_SET(DEBUG_PIN);
critical_section();
GPIO_CLR(DEBUG_PIN);
```

로직 분석기로 *pulse width 측정* → critical section worst-case.

## 실전 — Latency 예산 (Budget)

```text
PID 1 ms 주기, deadline 1 ms:

ISR latency:         50 ns
Scheduler latency:    2 µs
Context switch:       3 µs
PID compute (WCET):  95 µs
PID write actuator:  10 µs
─────────────────────────
Total worst-case:   ~110 µs (= 11% of 1 ms)
```

여유 89% → 안전.

만약 *log_uart()가 5 ms 점유*하면? Log priority < PID이므로 *PID 깨면 즉시 preempt* — 영향 없음. (Preemptive RTOS의 가치)

## Test Cases

WCET 측정 시 *각 path 커버* 필요:

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
- `data 전부 0` vs `전부 nonzero` (branch)

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

평균 latency 10 µs도 *worst 1 ms*면 hard real-time fail.

> ⚠️ 측정 환경 == 실제 환경 가정

벤치마크 환경에선 빠르지만 *실 운영*에선 cache·bus·thermal 영향 — 느림. 실 환경에서 *수일 측정*.

> ⚠️ Utilization 99% 목표

너무 빡빡. 실제 *jitter·event burst*로 deadline miss. RMS bound 69% 권장.

> ⚠️ Critical section 길이 측정 안 함

`taskENTER_CRITICAL` 호출 패턴마다 *worst-case time* 측정. 디버그 print가 critical 안에 있으면 *수 ms*.

## 정리 — Part 1 마무리

- 4 지표 — **Latency·Jitter·Deadline·WCET**.
- **WCET**가 hard real-time의 핵심 — 평균 아닌 worst.
- **RMS** + **RTA**로 schedulability 수학적 증명.
- Latency 원인 — IRQ disable·ISR nesting·scheduler·context switch·cache·bus.
- 측정 — `cyclictest` (Linux), DWT+GPIO (bare-metal).
- Hard real-time = 정적 할당 + 인증 + WCET 분석.

**Part 1 (RTOS Fundamentals) 종료**. Part 2부터는 *내부 구현* — 스케줄러 자료구조, context switch 어셈블리.

## 관련 항목

- [1-03: 스케줄링 알고리즘 (RMS)](/blog/embedded/rtos/practical-internals/part1-03-scheduling-algorithms)
- [1-09: 큐와 메시지 패싱](/blog/embedded/rtos/practical-internals/part1-09-queues)
- [2-10: Scheduler Latency 측정](/blog/embedded/rtos/practical-internals/part2-10-scheduler-latency)
- [Embedded Performance Engineering](/blog/embedded/performance-engineering/00-preface)
