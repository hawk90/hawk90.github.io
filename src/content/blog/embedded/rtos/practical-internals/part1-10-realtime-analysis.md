---
title: "실시간성 분석 — Latency·Jitter·Deadline·WCET·RMA"
slug: "embedded/rtos/practical-internals/part1-10-realtime-analysis"
date: 2026-05-04T09:10:00
description: "4 핵심 지표인 Latency, Jitter, Deadline, WCET를 다룹니다. Hard와 Soft real-time의 차이, Rate Monotonic Analysis로 schedulability를 증명하는 방법을 살펴봅니다."
series: "Practical RTOS Internals"
seriesOrder: 10
tags: [realtime, latency, jitter, wcet, rma, deadline]
draft: false
topics: ["embedded", "embedded/rtos"]
---

## 한 줄 요약

> **"평균 아닌 worst-case가 답"** — 평균이 빠른 시스템도 worst-case가 deadline을 넘기면 실패합니다.

## 4 핵심 지표

### 1. Latency

이벤트 발생에서 응답 시작까지의 시간입니다.

```text
External event (IRQ) ─────→ ISR start ─────→ Task wake ─────→ Task code
       ↑ t=0            ISR latency       wake latency      response
                            (대상별 측정)     (대상별 측정)
```

| 구성 | 측정 |
| --- | --- |
| **ISR latency** | IRQ 발생 → ISR 첫 줄 |
| **Scheduler latency** | 이 글에서는 task가 Ready가 된 시점 → 해당 task 첫 명령 |
| **Wake latency** | 모든 합 |

### 2. Jitter

Latency의 변동성을 가리킵니다.

예 — 주기적 task가 매 ms마다 깨어야 한다고 합시다. 가정한 실행 간격이 1.000, 1.001, 0.998, 1.003, 0.997 ms로 분포한다면 `Jitter = max - min = 6 µs`입니다.

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

PID 실행시간의 **설명용 가상 표**입니다. 측정값이나 보장 상한으로 제시하지 않습니다.

| 항목 | 값 |
|---|---|
| Average | 50 µs |
| Median | 48 µs |
| p99 | 70 µs |
| Max | 95 µs (이 표의 sample max, 보장 WCET 아님) |

## WCET 측정 — 4 방법

### 1. Static Analysis

소스와 CPU 모델로 모든 path를 분석합니다. aiT, Bound-T 같은 상용 도구가 있습니다.

대상 CPU·메모리·실행 경로·loop bound 모델이 실제와 맞을 때 보수적 상한의 근거로 사용할 수 있습니다. 단점은 비싸고 setup이 복잡하다는 점입니다.

### 2. Measurement-Based

많은 input을 넣어 실제 실행 시간을 측정합니다.

```c
uint32_t start = DWT->CYCCNT;
pid_compute();
uint32_t cycles = DWT->CYCCNT - start;
log_max(cycles);  // 관찰 p99·max 누적, 보장 WCET로 환산하지 않음
```

DWT 사용 가능 여부·counter enable·clock·측정 구간·ISR 포함 여부를 고정합니다. unsigned 차이는 한 번의 counter 순환보다 짧은 구간에서 사용하고, overhead도 확인합니다. 유한한 입력·부하 실험의 max는 관찰 최댓값이지 모든 실행의 상한 증거는 아닙니다.

### 3. Hybrid

Static analysis와 measurement를 결합합니다. loop bound·경로·하드웨어 모델에 대한 정적 근거와 관측 자료를 결합합니다. 유한한 측정에서 본 최대 반복 수를 그대로 증명된 loop 상한으로 사용하지 않습니다.

### 4. Probabilistic WCET (pWCET)

확률 분포로 표현합니다. 예를 들어 "99.999%로 80 µs 미만"과 같습니다. EVT 등을 쓸 수 있지만 표본 독립성·대표성·하드웨어 가정과 초과 확률의 신뢰 구간을 검토해야 합니다. 단순 p99.999 측정값과 동일하지 않습니다.

## Schedulability — 모든 task가 deadline 만족할 수 있나

### Rate Monotonic Analysis (RMA)

Liu & Layland 1973의 단일 CPU·독립 주기 task·완전 선점·deadline=period·blocking/전환 오버헤드 0 모델을 전제로 합니다. Ci는 평균이 아닌 해당 모델의 WCET입니다.
- 각 task에 주기 inverse priority를 부여합니다(짧은 주기 = 높은 priority).
- Utilization bound는 다음과 같습니다.

```text
U = Σ (Ci / Ti) ≤ n × (2^(1/n) − 1)
```

n=1 → 1.0, n=2 → 0.828, n=∞ → 0.693.

| Task | Ci | Ti | Ci/Ti |
| --- | --- | --- | --- |
| PID | 0.5 ms | 1 ms | 0.50 |
| Sensor | 1 ms | 10 ms | 0.10 |
| Log | 2 ms | 50 ms | 0.04 |
| | | **합 = 0.64** | |

n = 3일 때 bound는 3×(2^(1/3)−1) ≈ **0.78**입니다. 0.64 < 0.78이므로 **명시한 이론 모델에서는 schedulable**합니다. 위 숫자를 실기기 실측으로 제시하지 않으며, 공유 자원·IRQ·오버헤드가 추가되면 다시 분석해야 합니다.

### Response Time Analysis (RTA)

더 정확한 분석 방법입니다. Iterative하게 계산합니다.

$$R_i = C_i + \sum_{j \in hp(i)} \left\lceil \frac{R_i}{T_j} \right\rceil \cdot C_j$$

$R_i \leq D_i$ (deadline)이면 schedulable입니다.

위 식은 blocking·release jitter·overhead가 없는 fixed-priority 모델입니다. 일반 시스템에서는 그 비용과 임의 deadline·자기 중첩 등의 가정을 반영한 분석이 필요합니다. 이론 모델의 정수 RTA와 충분 조건 초과/실패 예제는 [1-03의 실행 예제](/blog/embedded/rtos/practical-internals/part1-03-scheduling-algorithms)에 있습니다.

## Latency 원인 분석

### Source 1: Interrupt Disable

```c
taskENTER_CRITICAL();
// ... 50 µs work
taskEXIT_CRITICAL();
```

ARM_CM4F FreeRTOS의 BASEPRI critical은 syscall 경계 범위의 IRQ를 지연시키지만 더 높은 urgency의 IRQ까지 모두 막지는 않습니다. IRQ 발생 위상과 다른 간섭도 있으므로 critical 길이 하나를 전체 ISR worst latency와 동일시하지 않습니다.

### Source 2: ISR Nesting

ISR_A 중 발생한 B가 더 높은 urgency이고 예외 진입이 허용되면 A를 선점할 수 있습니다. 같거나 낮은 urgency·마스킹 상태라면 기다립니다. NVIC priority를 잘 설정하면 nested 실행이 가능합니다(high prio가 low prio를 preempt).

### Source 3: Scheduler Decision

Tick ISR이 다음 task를 결정하는 데 N µs가 걸립니다. ready/timeout 구조·최적화 설정·해제되는 task 수와 포트에 따라 달라집니다. kernel 이름만으로 고정 100 cycle이라고 계산하지 않습니다.

### Source 4: Context Switch

저장할 레지스터·FPU·cache/TLB·메모리 wait state·포트에 따라 달라집니다. 한 코어군의 고정 cycle 값을 다른 제품의 예산으로 복사하지 않습니다.

### Source 5: Cache Miss

새 task가 다른 working set을 갖고 있으면 L1 miss가 발생하고, cache/TLB miss와 메모리 접근 지연이 늘 수 있습니다. 정확한 상한은 메모리와 버스 환경에 따라 분석합니다.

### Source 6: Bus Contention

DMA나 다른 master가 bus를 사용 중이면 CPU가 stall 됩니다.

## 측정 — Cyclictest

Linux PREEMPT_RT의 표준 도구입니다.

```bash
cyclictest -p 80 -t 1 -i 1000 -l 100000
```

이는 Linux rt-tests가 설치되고 필요한 실시간 scheduling 권한을 부여한 환경에서 실행할 명령 예입니다. 이 수정 환경(macOS)에서는 실행하지 않았습니다. `Max`는 그 부하·기간·구성의 관찰 최대 지연이며 미관측 조건의 보장 상한이 아닙니다. CPU affinity·부하·kernel config·전원 정책·동작 기간·누락 표본을 함께 기록합니다.

## 측정 — Bare-Metal

GPIO와 로직 분석기를 쓰거나 DWT를 활용합니다.

```c
GPIO_SET(DEBUG_PIN);
critical_section();
GPIO_CLR(DEBUG_PIN);
```

로직 분석기로 pulse width를 측정해 관찰한 pulse 폭을 얻습니다. GPIO 쓰기와 계측 장치의 overhead·해상도·표본 범위를 확인하며 곧바로 보장 WCET라고 부르지 않습니다.

## 실전 — Latency 예산 (Budget)

PID 주기 1ms·deadline 1ms라고 가정하면 예산의 각 항목을 제품의 근거와 연결합니다.

| 항목 | 필요한 근거 |
| --- | --- |
| release·IRQ 지연 | mask 범위·nested 예외·입력 위상·bus 영향 |
| Ready→실행 | 상위 priority 간섭·scheduler/port 경계·전환 비용 |
| PID 계산·출력 | WCET 모델·입력/loop 상한·장치 완료 조건 |
| 자원 blocking | mutex·bus·DMA·비선점구간의상한 |
| 불확실성·관측 | clock·trace/GPIOoverhead·운용부하·표본누락 |

경계가 겹치는 측정치를 중복 합산하지 않고 누락 비용도 확인합니다. 임의의 110 µs 합계나 89% 여유만으로 “안전”이라고 결론 내리지 않습니다. 낮은 priority logger도 IRQ 마스킹·공유 mutex·bus 점유·cache 영향으로 PID에 간섭할 수 있으므로 영향 0이라고 가정하지 않습니다.

## Test Cases

WCET를 측정할 때는 각 path를 모두 커버해야 합니다.

```c
int process(int *data, int n) {
    if (n < 0 || n > MAX || (n > 0 && data == NULL)) return ERROR;       // early return
    for (int i = 0; i < n; i++) {    // loop bound depends on n
        if (data[i] == 0) continue;
        complex_op(data[i]);
    }
    return SUCCESS;
}
```

테스트 케이스:
- `n < 0`과양수길이의NULL입력거절
- `n = 0` (loop 0회)
- `n = MAX` (loop 최대)
- `n > MAX` (early return)
- `data` 전부 0 vs 전부 nonzero (branch)

## Hard vs Soft 시스템 설계 차이

| 항목 | Hard 요구 | Soft 요구 |
| --- | --- | --- |
| 지연 근거 | 정의한 운용 가정 안의 모든 deadline을 만족할 상한·분석 | 허용 miss 비율·tail latency·품질 조건 |
| 메모리·자원 | 최악지연·고갈·실패정책과수명검증 | 같은실패계약을지키되제품품질목표에맞게예산 |
| 운영체제 | 실제 선점·드라이버·hardware 조건으로 판단 | 허용 응답 분포를 만족하는 구성 |
| 시험·인증 | 적용 제품 표준에 따른 별도 증거 계획 | soft라는 이유만으로 인증·시험이 없어지는 것은 아님 |

hard/soft 구분과 DO-178C·ISO 26262의 적용·등급·coverage 요구는 서로 같은 분류가 아닙니다. 정적 할당·MC/DC·특정 OS를 모든 hard real-time 시스템의 필수 조건으로 묶지 않습니다.

## 자주 하는 실수

> ⚠️ 평균만 보고 OK 판정

평균 latency가 10 µs라도 worst가 1 ms면 hard real-time은 실패합니다.

> ⚠️ 측정 환경 == 실제 환경 가정

벤치마크 환경에서는 빠르지만 실 운영에서는 cache, bus, thermal의 영향으로 느려질 수 있습니다. 대표·최악 운용 조건을 설계해 측정하고 기간·부하·범위를 기록합니다. 특정 일수만 채우면 상한이 증명되는 것은 아닙니다.

> ⚠️ Utilization 99% 목표

너무 빡빡합니다. 실제로는 jitter나 event burst로 deadline을 miss할 수 있습니다. 일률적인 69% 운영 한계로 대체하지 않고, task 모델과 ISR·blocking·전환 비용·요구 margin을 넣어 분석합니다.

> ⚠️ Critical section 길이 측정 안 함

`taskENTER_CRITICAL` 호출 패턴마다 worst-case time을 측정해야 합니다. 디버그 print가 critical 안에 있으면 수 ms까지 늘어날 수 있습니다.

## 정리 — Part 1 마무리

- 4 지표는 **Latency, Jitter, Deadline, WCET**입니다.
- **WCET**가 hard real-time의 핵심이며, 평균이 아닌 worst가 중요합니다.
- **RMS**와 **RTA**로 schedulability를 수학적으로 증명할 수 있습니다.
- Latency 원인은 IRQ disable, ISR nesting, scheduler, context switch, cache, bus 등입니다.
- 측정 도구로는 Linux의 `cyclictest`, bare-metal의 DWT+GPIO가 있습니다.
- Hard real-time은 운용 가정과 최악 경로·자원 실패·deadline 근거가 필요하며, 인증 여부는 제품 규정으로 별도 판단합니다.

**Part 1(RTOS Fundamentals)이 끝났습니다**. Part 2부터는 내부 구현을 다룹니다. 스케줄러 자료구조와 context switch 어셈블리가 주제입니다.

## 1차 자료와 재현 범위

- [Liu & Layland 원 논문](https://cse.unl.edu/~goddard/Courses/RealTimeSystems/Lectures/LiuLayland73.pdf): RM의 모델 가정과 충분 조건
- [FreeRTOS V11.2.0 ARM_CM4F 포트](https://github.com/FreeRTOS/FreeRTOS-Kernel/tree/V11.2.0/portable/GCC/ARM_CM4F): critical/PendSV/예외경계

이 장에서는 수치 표를 실측으로 제시하지 않습니다. Node로 재현한 정수 스케줄 분석은 1-03 예제로 연결하고, 실제 Linux cyclictest·보드 DWT/GPIO·운용 WCET 상한은 검증 대기로 구분합니다. 코드 조각의 GPIO/DWT/platform 함수도 제품 선언과 초기화가 필요합니다.

## 관련 항목

- [1-03: 스케줄링 알고리즘 (RMS)](/blog/embedded/rtos/practical-internals/part1-03-scheduling-algorithms)
- [1-09: 큐와 메시지 패싱](/blog/embedded/rtos/practical-internals/part1-09-queues)
- [2-10: Scheduler Latency 측정](/blog/embedded/rtos/practical-internals/part2-10-scheduler-latency)
- [Embedded Performance Engineering](/blog/embedded/performance-engineering/00-preface)
