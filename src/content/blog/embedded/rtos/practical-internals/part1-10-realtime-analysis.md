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

이벤트 발생에서 응답 시작까지의 시간입니다. 외부 IRQ에서 시작하면 세 구간으로 나뉩니다.

| 구간 | 시작 → 끝 | 이 시리즈의 근거 |
| --- | --- | --- |
| **ISR latency** | IRQ assert → ISR 첫 명령 | Cortex-M4 하드웨어 상한 12 cycle(zero wait state, DDI 0439B 3.9.1) + critical section·상위 ISR |
| **Scheduler latency** | task가 Ready가 된 시점 → 그 task의 첫 명령 | PendSV tail-chain + 전환 코드(1-04) |
| **Wake latency** | IRQ assert → task 코드 | 위 둘과 ISR 실행 시간의 합 |

### 2. Jitter

Latency의 변동성을 가리킵니다.

예 — 주기적 task가 매 ms마다 깨어야 한다고 합시다. 실행 간격이 1.000, 1.001, 0.998, 1.003, 0.997 ms였다면 `Jitter = max - min = 6 µs`입니다(가정한 숫자로 한 산술).

버스가 "평균 10분 간격"이어도 어떤 날은 2분, 어떤 날은 30분이면 시간표를 믿고 나갈 수 없습니다. 제어 루프도 같아서, 샘플링 간격이 흔들리면 같은 제어 이득으로도 출력이 달라집니다. 아래 QEMU 측정에서 평균과 최댓값이 얼마나 벌어지는지 봅니다.

### 3. Deadline

이벤트 후 반드시 처리해야 할 마감입니다.

| 종류 | Deadline miss 결과 |
| --- | --- |
| **Hard** | 시스템 실패 (자동차 ESC, 인공호흡기) |
| **Firm** | 늦은 결과는 쓸모가 없지만 시스템은 계속 동작 |
| **Soft** | 품질 저하 (비디오 frame drop) |

### 4. WCET — Worst-Case Execution Time

한 task가 최대 얼마나 걸리는지를 나타냅니다. 평균(AET)이 아닌 worst case가 중요합니다.

같은 함수라도 입력에 따라 실행 시간이 크게 다릅니다. 아래 "Test Cases" 절의 `process()`를 QEMU에서 입력별로 재 보면 가장 짧은 경로와 가장 긴 경로가 1,000배 넘게 차이 납니다. 평균은 어떤 입력이 얼마나 자주 오느냐에 달려 있어서, 평균만으로는 마감을 판정할 수 없습니다.

## WCET 측정 — 4 방법

### 1. Static Analysis

바이너리와 CPU 모델로 모든 path를 분석합니다. AbsInt의 aiT("Worst-Case Execution Time Analyzers", absint.com/ait)와 Bound-T("time and stack analyser", bound-t.com)가 이런 도구입니다.

분석 결과는 CPU·메모리 모델과 loop bound가 실제와 맞을 때만 상한의 근거가 됩니다. 그래서 loop bound를 사람이 주석으로 넣어 주는 일이 많습니다. 아래 `process()`의 loop bound는 `n ≤ MAX`라는 입력 검사가 정합니다.

### 2. Measurement-Based

많은 input을 넣어 실제 실행 시간을 측정합니다.

```c
uint32_t start = DWT->CYCCNT;
pid_compute();
uint32_t cycles = DWT->CYCCNT - start;
log_max(cycles);  // 관찰 p99·max 누적, 보장 WCET로 환산하지 않음
```

DWT CYCCNT는 DEMCR의 TRCENA(bit 24)와 DWT_CTRL의 CYCCNTENA(bit 0)를 켜야 셉니다. 32비트라 25 MHz에서 약 171초마다 한 바퀴 돌므로 unsigned 차이는 그보다 짧은 구간에만 씁니다. QEMU 11.1.3 `mps2-an385`에서는 두 bit를 켠 뒤에도 `DWT_CTRL=0x0 CYCCNT before=0 after=0`이었습니다. QEMU가 DWT를 구현하지 않으므로 이 장의 QEMU 측정은 SysTick 현재값(SYST_CVR)으로 했습니다. 유한한 입력·부하 실험의 max는 관찰 최댓값이지 모든 실행의 상한 증거는 아닙니다.

### 3. Hybrid

Static analysis와 measurement를 결합합니다. loop bound·경로·하드웨어 모델에 대한 정적 근거와 관측 자료를 결합합니다. 유한한 측정에서 본 최대 반복 수를 그대로 증명된 loop 상한으로 사용하지 않습니다.

### 4. Probabilistic WCET (pWCET)

상한을 하나의 숫자 대신 "이 시간을 넘을 확률이 10⁻⁹ 이하" 같은 초과 확률 곡선으로 표현합니다. 측정 표본의 꼬리에 극값 이론(EVT) 분포를 맞춰 관측하지 못한 영역을 외삽하는 방식이라, 표본이 서로 독립이고 운용 조건을 대표해야 성립합니다. 측정한 p99.999 값을 그대로 쓰는 것과는 다릅니다.

## Schedulability — 모든 task가 deadline 만족할 수 있나

### Rate Monotonic Analysis (RMA)

Liu & Layland 1973의 가정 (A1)-(A5)(1-03)를 전제로 합니다. (A4)의 실행 시간은 최대 실행 시간으로 해석하므로 Ci는 평균이 아닌 WCET입니다.
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

n = 3일 때 bound는 3×(2^(1/3)−1) ≈ **0.78**입니다. 0.64 < 0.78이므로 **이 가정 아래에서는 schedulable**합니다. Ci 값은 예시입니다. 공유 자원이 생기면 (A3) 독립 가정이 깨지므로 아래 RTA에 blocking 항을 더해 다시 계산합니다.

### Response Time Analysis (RTA)

더 정확한 분석 방법입니다. Iterative하게 계산합니다.

$$R_i = C_i + \sum_{j \in hp(i)} \left\lceil \frac{R_i}{T_j} \right\rceil \cdot C_j$$

$R_i \leq D_i$ (deadline)이면 schedulable입니다.

위 식에는 blocking이 없습니다. 낮은 우선순위 task가 mutex를 쥐거나 critical section 안에 있어서 task i가 기다려야 하는 최대 시간을 $B_i$라 하면, 식은 $R_i = C_i + B_i + \sum_{j \in hp(i)} \lceil R_i / T_j \rceil C_j$가 됩니다. [1-03의 예제](/blog/embedded/rtos/practical-internals/part1-03-scheduling-algorithms) 세 task(C/T = 1/4, 2/5, 1/10)에 가장 낮은 우선순위 task D(C = 2, T = D = 1000)를 더하고, D가 세 task와 공유하는 lock을 2 단위 동안 쥔다고 두었습니다. $B_i$는 *더 낮은* task만 만들 수 있으므로 A·B·C의 $B$가 2이고 D의 $B$는 0입니다. Node로 계산했습니다.

```js title="rta-blocking.mjs"
function rta(tasks) {
  return tasks.map((t, i) => {
    let r = t.C + (t.B ?? 0);
    for (;;) {
      const next = t.C + (t.B ?? 0) + tasks.slice(0, i).reduce((s, h) => s + Math.ceil(r / h.T) * h.C, 0);
      if (next === r) return { r, ok: r <= t.D };
      if (next > t.D) return { r: next, ok: false };
      r = next;
    }
  });
}
```

```text
U=0.752 n=4 RM bound=0.757
no blocking   : 1 3 4 10
B=2 for A,B,C : 3 6! 10 10
```

U = 0.752로 n = 4의 RM bound(0.757) 안에 있던 task set인데, 두 번째 task의 응답 시간이 3에서 6으로 늘어 deadline 5를 넘었습니다(`!`). D가 거의 CPU를 쓰지 않는데도 그렇습니다. utilization은 그대로인데 blocking 2 단위만으로 실패한 것입니다. 그래서 critical section과 mutex 보유 시간은 WCET만큼 중요한 분석 입력입니다.

### Blocking을 넣으면 결론이 달라집니다

단일 CPU·서로 다른 고정 우선순위·완전 선점·$D_i \leq T_i$이며 release jitter·자기 중단·전환 오버헤드가 없는 모델에서, 별도로 근거를 갖춘 blocking 상한 $B_i$를 포함하는 응답시간 반복식은 다음과 같습니다.

$$R_i^{(k+1)} = C_i + B_i + \sum_{j \in hp(i)} \left\lceil \frac{R_i^{(k)}}{T_j} \right\rceil C_j$$

초깃값은 $R_i^{(0)}=C_i+B_i$입니다. 아래는 분석 대상 task의 $C=2$, $D=T=5$와 상위 task 하나의 $C=1$, $T=4$를 가정한 정수 시간 모델입니다. 낮은 priority 자원 보유자 등으로 인한 blocking을 가정하며, 그 값은 실제 보드 측정이 아닙니다.

| 가정한 blocking 상한 | 반복값 | 판정 |
|---|---|---|
| 0 | 2 → 3 → 3 | R=3, deadline 만족 |
| 1 | 3 → 4 → 4 | R=4, deadline 만족 |
| 2 | 4 → 5 → 6 | deadline 5 초과, 이 상한 모델로 보장하지 못함 |

CPU 실행량이 같아도 blocking 예산에 따라 보장 가능한 범위가 달라집니다. 보수적인 상한을 넣은 분석이 deadline을 넘었다고 실제 실행의 miss가 곧 증명되지는 않습니다. PI를 켰다는 사실만으로 $B_i=0$이나 유한한 상한이 자동 성립하지 않습니다. mutex protocol·임계 구역·중첩 lock과 owner의 진행 조건으로 상한을 따로 구하고, IRQ·전환 비용도 모델에 빠짐없이 반영해야 합니다. 여러 독립 지연을 이미 $C_i$에 포함했다면 다시 $B_i$에 더하지 않습니다.

## Latency 원인 분석

### Source 1: Interrupt Disable

```c
taskENTER_CRITICAL();
// ... work
taskEXIT_CRITICAL();
```

Cortex-M FreeRTOS의 BASEPRI critical은 `configMAX_SYSCALL_INTERRUPT_PRIORITY` 이하의 IRQ와 tick, PendSV를 늦춥니다(1-04). 얼마나 늦추는지 QEMU에서 쟀습니다. 우선순위 3의 periodic task가 `vTaskDelayUntil(&last, 1)`로 매 tick 깨어나고, 깨어난 직후 tick 경계 이후 흐른 SysTick count(`RVR - CVR`)를 기록합니다. 우선순위 1의 background task는 쉬지 않고 critical section에 들어가 0에서 `CS_LEN` 사이의 의사 난수 횟수만큼 빈 loop를 돕니다.

```c title="latency.c (발췌)"
static void periodic(void*a){ (void)a; TickType_t last=xTaskGetTickCount();
  for(int i=0;i<NS;i++){ vTaskDelayUntil(&last,1); lat[i]=RVR-CVR; }
  /* ... min/avg/max ... */ }
static void background(void*a){ (void)a; uint32_t x=12345;
  for(;;){ x = x*1103515245u + 12345u;                    /* LCG: pseudo-random section length */
    uint32_t n = CS_LEN ? (x>>16) % CS_LEN : 0;
    taskENTER_CRITICAL(); for(volatile uint32_t i=0;i<n;i++){} taskEXIT_CRITICAL(); } }
```

FreeRTOS V11.2.0 `ARM_CM3`, arm-none-eabi-gcc 16.2.0 `-O2`, QEMU 11.1.3 `mps2-an385 -icount shift=5`에서 500 tick씩 돌렸습니다. tick 하나는 25,000 count입니다.

```text
CS_LEN=0 samples=500 min=128 avg=136 max=147 (>1000: 0 samples)  [SysTick counts, 25000 per tick]
CS_LEN=200 samples=500 min=128 avg=433 max=1039 (>1000: 4 samples)  [SysTick counts, 25000 per tick]
CS_LEN=2000 samples=500 min=128 avg=3322 max=9588 (>1000: 416 samples)  [SysTick counts, 25000 per tick]
```

critical section이 없으면 최댓값이 147로 거의 일정했습니다. 이 128~147은 tick ISR과 PendSV, 전환 코드를 실행하는 동안 지나간 count입니다. `CS_LEN=200`에서는 평균이 433인데 최댓값은 1,039로 평균의 2.4배였고, 500번 중 4번만 1,000을 넘었습니다. 짧은 측정이었다면 이 4번을 못 봤을 수 있습니다. `CS_LEN=2000`에서는 최댓값이 9,588로 tick의 38%에 달했습니다. 최솟값은 세 경우 모두 128로 같으므로, "가장 빨랐을 때"만 보고는 차이를 알 수 없습니다. count는 icount 가상 시간이라 명령 수에 비례할 뿐 실제 보드의 µs가 아닙니다.

### Source 2: ISR Nesting

ISR_A 중 발생한 B가 더 높은 우선순위(숫자가 더 작음)이면 A를 선점합니다. 같거나 낮으면 A가 끝날 때까지 기다리고, 끝나면 tail-chaining으로 바로 들어옵니다(Cortex-M4에서 6 cycle, DDI 0439B 3.9.1). 낮은 우선순위 ISR은 곧바로 선점되므로 기다리게 하지 않습니다. 그래서 어떤 ISR의 최악 지연에는 자기보다 높은 모든 ISR의 실행 시간, 이미 돌고 있던 같은 우선순위 ISR 하나, 그리고 그 IRQ를 막는 가장 긴 critical section이 더해집니다.

### Source 3: Scheduler Decision

FreeRTOS tick ISR의 `xTaskIncrementTick()`은 그 tick에 timeout이 끝난 task를 delayed list에서 모두 꺼내 ready list로 옮깁니다([`tasks.c` L4767](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/tasks.c#L4767)의 `for( ; ; )` 루프). 그래서 한 tick에 깨어나는 task 수만큼 tick ISR이 길어집니다. 다음 task 선택 자체는 Cortex-M 포트에서 CLZ 한 번으로 최고 우선순위를 찾습니다(`configUSE_PORT_OPTIMISED_TASK_SELECTION`, 2-01). 위 측정의 128 count가 이 장의 QEMU 구성에서 깨어나는 task가 하나일 때의 값입니다.

### Source 4: Context Switch

Cortex-M3 포트는 PendSV에서 r4-r11 8개를 저장·복원하고, Cortex-M4F 포트는 task가 FPU를 썼으면 s16-s31 16개를 더 저장합니다(1-02). 저장할 레지스터 수가 포트와 task마다 다르므로 전환 비용도 다릅니다.

### Source 5: Cache Miss

cache가 있는 코어(예: Cortex-M7, L1 line 32바이트, DDI 0489D 3.3.4)에서는 전환 직후 새 task의 코드와 데이터가 cache에 없어서 처음 접근이 느립니다. QEMU는 cache를 모델링하지 않으므로 위 측정에는 이 항이 없습니다.

### Source 6: Bus Contention

DMA나 다른 master가 bus를 사용 중이면 CPU가 stall 됩니다.

## 측정 — Cyclictest

Linux rt-tests 패키지의 도구입니다. 위 QEMU 측정과 같은 일을 Linux thread로 합니다. 정해진 주기로 깨어나도록 timer를 걸고, 실제로 깨어난 시각과의 차이를 셉니다.

```bash
cyclictest -p 80 -t 1 -i 1000 -l 100000
```

[rt-tests의 `cyclictest.8`](https://git.kernel.org/pub/scm/utils/rt-tests/rt-tests.git/tree/src/cyclictest/cyclictest.8)에 따르면 `-p 80`은 첫 thread의 우선순위, `-t 1`은 thread 1개, `-i 1000`은 기본 주기 1,000 µs(기본값도 1000), `-l 100000`은 100,000번 돌고 멈추라는 뜻입니다. 이 글을 쓴 macOS에서는 실행하지 않았습니다. 출력의 `Max`는 위 QEMU 표의 max와 같은 *관찰 최댓값*입니다. 위 `CS_LEN=200`처럼 드문 꼬리는 횟수가 부족하면 보이지 않습니다.

## 측정 — Bare-Metal

GPIO와 로직 분석기를 쓰거나 DWT를 활용합니다.

```c
GPIO_SET(DEBUG_PIN);
critical_section();
GPIO_CLR(DEBUG_PIN);
```

로직 분석기로 pulse 폭을 재면 그 구간의 시간이 나옵니다. GPIO 쓰기 자체도 시간이 걸리므로, 같은 코드에서 `critical_section()`을 빼고 잰 폭을 빼 줍니다. 로직 분석기의 샘플링 간격이 해상도의 하한입니다.

## 실전 — Latency 예산 (Budget)

PID 주기 1ms·deadline 1ms라고 가정하면, 예산은 위 RTA 식의 항을 그대로 채우는 일입니다.

| RTA 항 | 이 시리즈에서 본 근거 |
| --- | --- |
| release 지연 | tick 위상(1-04: `vTaskDelay(1)`은 0~1 tick) |
| $B_i$ (blocking) | 낮은 task의 가장 긴 critical section·mutex 보유(위 QEMU 측정, 1-08) |
| 상위 간섭 $\sum \lceil R/T \rceil C$ | 더 높은 task와 모든 ISR의 WCET |
| $C_i$ | PID 계산·출력의 WCET(아래 Test Cases) |

각 항을 따로 재되 경계가 겹치게 재지 않습니다. 예를 들어 "ISR 진입부터 task 실행까지"를 한 번에 잰 값에는 이미 scheduler latency가 들어 있습니다. 낮은 우선순위 logger도 critical section을 쓰면 위 측정처럼 PID를 늦추므로, logger의 critical section 길이가 PID 예산의 입력이 됩니다.

## Test Cases

WCET를 측정할 때는 각 path를 모두 커버해야 합니다. 아래 함수의 `complex_op()`를 20번 곱셈-덧셈하는 loop로 두고 `MAX = 64`로 QEMU에서 입력별로 쟀습니다.

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
- `n < 0`과 양수 길이의 NULL 입력 거절
- `n = 0` (loop 0회)
- `n = MAX` (loop 최대)
- `n > MAX` (early return)
- `data` 전부 0 vs 전부 nonzero (branch)

```text
n=-1          : 5
n=MAX+1       : 5
n=8, NULL     : 6
n=0           : 5
n=MAX, zeros  : 266
n=MAX, 1/8 set: 1066
n=MAX, ones   : 6666
```

단위는 SysTick count(QEMU icount 가상 시간)입니다. 같은 `n = MAX`라도 데이터가 전부 0이면 266, 전부 1이면 6,666으로 25배 차이가 납니다. 입력이 "대부분 0"인 환경에서만 측정했다면 최댓값을 6,666의 4%로 잘못 잡았을 것입니다. loop 횟수(`n`)와 branch 방향(`data[i]`)을 *모두* 최악으로 만든 입력이 최악 경로입니다.

## Hard vs Soft 시스템 설계 차이

| 항목 | Hard 요구 | Soft 요구 |
| --- | --- | --- |
| 지연 근거 | 모든 deadline에 대한 상한(RTA 등) | 허용 miss 비율과 tail latency 분포 |
| WCET 입력 | 정적 분석이나 최악 경로를 덮는 측정 | 운용 분포를 대표하는 측정 |
| 측정에서 보는 값 | 최댓값과 그 입력 조건 | 백분위(p99 등)와 miss 비율 |

## 자주 하는 실수

> ⚠️ 평균만 보고 OK 판정

평균 latency가 10 µs라도 worst가 1 ms면 hard real-time은 실패합니다.

> ⚠️ 측정 환경 == 실제 환경 가정

위 `process()` 측정에서 데이터가 전부 0인 입력만 썼다면 최댓값을 25배 작게 잡았습니다. 위 latency 측정에서도 background task의 critical section 길이를 바꾸자 최댓값이 147에서 9,588로 바뀌었습니다. 측정 환경의 입력과 부하가 운용 환경의 최악을 덮어야 측정값이 의미를 가집니다.

> ⚠️ Utilization 99% 목표

위 RTA 예처럼 U = 0.752인 task set도 가장 낮은 task의 lock 2 단위로 deadline을 넘었습니다. utilization 목표는 "몇 %면 안전"이 아니라 blocking·ISR·전환 비용을 넣은 RTA의 결과로 정합니다.

> ⚠️ Critical section 길이 측정 안 함

critical section 길이는 위 RTA의 $B_i$에 들어갑니다. 디버그 print처럼 길이가 UART 속도에 묶인 코드가 critical 안에 있으면 그 시간이 전부 $B_i$가 됩니다.

## 정리 — Part 1 마무리

- 4 지표는 **Latency, Jitter, Deadline, WCET**입니다.
- **WCET**가 hard real-time의 핵심이며, 평균이 아닌 worst가 중요합니다.
- **RMS** bound는 충분조건이고, **RTA**는 blocking을 넣어 계산할 수 있습니다(예: U = 0.752인 4 task set이 B = 2로 실패).
- QEMU 측정에서 낮은 task의 critical section이 높은 task의 최대 release latency를 147에서 9,588 count로 늘렸습니다.
- Latency 원인은 IRQ disable, ISR nesting, scheduler, context switch, cache, bus 등입니다.
- 측정 도구로는 Linux의 `cyclictest`, bare-metal의 DWT+GPIO가 있습니다.
- Hard real-time은 운용 가정과 최악 경로·자원 실패·deadline 근거가 필요하며, 인증 여부는 제품 규정으로 별도 판단합니다.

**Part 1(RTOS Fundamentals)이 끝났습니다**. Part 2부터는 내부 구현을 다룹니다. 스케줄러 자료구조와 context switch 어셈블리가 주제입니다.

## 1차 자료와 재현 범위

- C. L. Liu, J. W. Layland, *J. ACM* 20(1), 1973 ([PDF](https://www.cs.ru.nl/~hooman/DES/liu-layland.pdf)): 가정 (A1)-(A5), Theorem 5
- [FreeRTOS V11.2.0 ARM_CM4F 포트](https://github.com/FreeRTOS/FreeRTOS-Kernel/tree/V11.2.0/portable/GCC/ARM_CM4F): critical/PendSV/예외경계
- ARM DDI 0439B(Cortex-M4 TRM) 3.9.1: 12 cycle 진입, 6 cycle tail-chain
- rt-tests `src/cyclictest/cyclictest.8`: 옵션 의미

latency·path 측정은 FreeRTOS V11.2.0 `ARM_CM3`, arm-none-eabi-gcc 16.2.0 `-O2`, QEMU 11.1.3 `mps2-an385 -icount shift=5`에서 SysTick count로 잰 가상 시간이고, RTA는 Node로 계산했습니다. 실제 보드의 DWT/GPIO 측정과 Linux `cyclictest`는 실행하지 않았습니다.

## 관련 항목

- [1-03: 스케줄링 알고리즘 (RMS)](/blog/embedded/rtos/practical-internals/part1-03-scheduling-algorithms)
- [1-09: 큐와 메시지 패싱](/blog/embedded/rtos/practical-internals/part1-09-queues)
- [2-10: Scheduler Latency 측정](/blog/embedded/rtos/practical-internals/part2-10-scheduler-latency)
- [Embedded Performance Engineering](/blog/embedded/performance-engineering/00-preface)
