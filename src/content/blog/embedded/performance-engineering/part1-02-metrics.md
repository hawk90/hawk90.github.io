---
title: "1-02: 성능 지표 정의 — Latency, Throughput, Utilization"
date: 2026-05-08T02:00:00
description: "3 핵심 지표 + 임베디드 추가 — Jitter·Deadline. Service time vs Response time."
series: "Embedded Performance Engineering"
seriesOrder: 2
tags: [performance, latency, throughput, utilization, jitter, deadline]
draft: false
---

## 한 줄 요약

> **"Latency·Throughput·Utilization"** 세 축으로 성능을 그립니다. 임베디드에서는 *jitter·deadline*이 추가됩니다.

## 3 핵심 지표

### Latency

**한 작업이 완료되기까지 걸리는 시간**을 의미합니다.

```text
요청 → ── 처리 ── → 응답
       │←────────→│
            latency
```

단위는 µs, ms, s입니다. 측정 방식은 single request 시간이거나 *분포*(p50·p99·max)입니다.

### Throughput

**단위 시간당 처리량**을 의미합니다.

```text
초당 요청 수 (req/s)
초당 byte 수 (MB/s, Gbps)
초당 프레임 수 (FPS)
```

단위는 req/s, bytes/s, ops/s입니다.

### Utilization

**자원 사용률(%)**을 의미합니다.

$$U_{CPU} = \frac{t_{busy}}{t_{total}}, \quad U_{mem} = \frac{u}{m_{total}}, \quad U_{bus} = \frac{c_{active}}{c_{total}}$$

100%에 도달하면 saturation 상태가 되고, queueing이 발생하면서 latency가 증가합니다.

## Latency vs Throughput — 상호 의존

작은 시스템에서는 보통 trade-off거나 직교 관계입니다.

```text
초기 (utilization 낮음):  throughput↑ → latency 거의 변화 X
중간 (50-70%):           throughput↑ → latency 살짝 증가
포화 (90%+):             throughput 한계 → latency 폭증
```

**Queueing Theory** (Little's Law)는 다음과 같습니다.

$$L = \lambda \cdot W$$

여기서 $L$은 평균 대기 수, $\lambda$는 도착률, $W$는 평균 대기 시간입니다.

자원 utilization이 100%에 근접하면 $W \to \infty$가 됩니다. 그래서 임베디드에서는 *80% 한계*를 권장합니다.

## Service Time vs Response Time

```text
요청 도착 → 큐 대기 → 처리 시작 → 처리 종료 → 응답
         │← Queue →│         │← Service →│
         │←─────────── Response ─────────→│
```

- **Service Time**은 실제 *처리 시간*입니다(queue 제외).
- **Response Time**은 *대기와 처리*를 합한 시간이며, 사용자가 체감하는 값입니다.

평균 service time이 좋아도 *queue 적체가 일어나면 response time이 폭증*합니다.

## 임베디드 — Jitter

Latency의 *변동성*을 의미합니다.

```text
주기적 1ms PID task:
실제 wake: 1.000, 1.001, 0.998, 1.003, 0.997 ...
```

$$\text{Jitter} = \max - \min = 6\ \mu s$$

평균이 양호한데 jitter가 크면 *실시간 제어가 불가능*합니다. Audio, motor, camera 동기처럼 동기화가 핵심인 영역에서는 치명적입니다.

### Jitter 측정

```c
TickType_t xLastWake = xTaskGetTickCount();
while (1) {
    do_work();
    vTaskDelayUntil(&xLastWake, period);
    
    uint32_t actual = DWT->CYCCNT;
    uint32_t expected = xLastWake * CYCLES_PER_TICK;
    log_jitter(actual - expected);
}
```

Histogram을 누적하면서 분포를 분석합니다.

## 임베디드 — Deadline

작업이 *반드시 끝나야 할 시점*을 의미합니다.

| Type | Miss 결과 |
| --- | --- |
| **Hard** | 시스템 실패 (브레이크, 인공호흡기) |
| **Firm** | 결과 무효 (실시간 거래) |
| **Soft** | 품질 저하 (비디오 frame drop) |

Latency 대신 deadline 만족 여부가 metric이 됩니다. 즉, *deadline 안에 들어왔는가? 몇 % 들어왔는가?*를 봅니다.

## Percentile 표기

```text
p50 (median)  — 절반은 더 빠름
p90           — 10% 케이스만 더 느림
p99           — 1% 케이스만 더 느림
p999          — 0.1% (1000 중 1)
p9999         — 0.01%
max           — worst-case
```

Hard real-time은 *max ≤ deadline*을 요구합니다. Soft는 *p99·p999 ≤ deadline*이면 됩니다.

## Long Tail

```text
Histogram:
       ▓▓▓▓▓▓▓▓
     ▓ ▓▓▓▓▓▓▓▓▓
   ▓ ▓ ▓▓▓▓▓▓▓▓▓ ▓        ▓                     ▓ ← long tail
   1   10           100              1000 ms
```

평균 10 ms, p99 100 ms, max 1 s인 분포입니다. 사용자 체감을 결정하는 것은 *long tail*입니다.

원인으로는 cache miss, GC, context switch, bus contention이 있습니다. RAS(Reliability·Availability·Serviceability) 도구로 추적합니다.

## Saturation 측정

```text
Resource 사용률 vs 응답 시간

R/T (ms)
  100 │                              ●
      │                           ●
   50 │                       ●
      │                   ●
   10 │              ●
    1 │  ●  ●  ●  ●
      └──┴──┴──┴──┴──┴──┴──┴──→  Utilization (%)
         20  40  60  80 100
```

80%를 넘으면 exponential하게 증가합니다. 그래서 **70-80%가 안전 한계**입니다.

## 임베디드 추가 지표

### IPC (Instructions Per Cycle)

`PMU CPU_CYCLES`와 `INST_RETIRED`의 ratio입니다.

```text
IPC = 0.5  — 스트레스 (memory bound, stall)
IPC = 1.0  — 정상
IPC = 2.0+ — 슈퍼스칼라 활용
```

IPC가 낮으면 *왜 낮은지* 분석합니다. 원인은 cache miss, branch mispredict, stall 등입니다.

### Cache Hit Rate

```c
double hit_rate = 1.0 - (cache_miss / cache_access);
```

L1은 보통 95-99%, L2는 80-95%, L3는 60-80%입니다. *임베디드(1-2 KB L1)*에서는 *작은 working set*을 가정합니다.

### MIPS / DMIPS

옛 단위입니다. **MIPS**는 millions of instructions per second입니다. **DMIPS**는 Dhrystone MIPS 벤치마크입니다.

```text
Cortex-M0+ @ 50 MHz: 45 DMIPS
Cortex-M4 @ 168 MHz: 350 DMIPS
Cortex-A53 @ 1.5 GHz: 3500 DMIPS
```

DMIPS는 *아주 거친* 비교에만 적합합니다. 더 정밀하게 비교하려면 CoreMark나 EEMBC를 씁니다.

### CoreMark

비영리 EEMBC가 만든 임베디드 표준 벤치입니다. *Standardized integer workload*를 측정합니다.

```text
Cortex-M0+ @ 50 MHz:  100 CoreMark
Cortex-M4F @ 168 MHz: 850 CoreMark
RISC-V SiFive E31:     150 CoreMark
```

CoreMark/MHz가 *효율*(architecture 능력)을 비교하는 지표입니다.

## 측정 — Time Source

| 시계 | 정밀도 | 사용 |
| --- | --- | --- |
| `xTaskGetTickCount()` | tick (1-10 ms) | task 단위 timing |
| `DWT->CYCCNT` | 1 cycle | µs 단위 (Cortex-M) |
| `clock_gettime(CLOCK_MONOTONIC_RAW)` | ns | Linux 정밀 |
| GPIO + 로직 분석기 | 1 ns | 외부 측정 (HW) |
| HW timer | clock 단위 | 임베디드 정밀 |

## Latency 분포 측정 예

```c
#define BUCKETS 64
static uint32_t hist[BUCKETS];
static uint32_t max_val = 0;

void log_latency_us(uint32_t us) {
    int idx;
    // log2 bucket
    if (us < 1) idx = 0;
    else if (us < 4096) idx = 32 - __clz(us);
    else idx = BUCKETS - 1;
    hist[idx]++;
    if (us > max_val) max_val = us;
}

// 주기적 출력
void print_hist(void) {
    for (int i = 0; i < BUCKETS; i++)
        if (hist[i]) printf("%d-%d us: %u\n", 1<<i, (1<<(i+1))-1, hist[i]);
    printf("max: %u us\n", max_val);
}
```

## 자주 하는 실수

> ⚠️ 평균만 보고 OK 판정

Median이 좋아도 *long tail*은 보이지 않습니다. 항상 *p99·max*를 함께 봅니다.

> ⚠️ Utilization 90%+ 목표

Queueing latency가 폭증합니다. **70-80%가 한계**입니다.

> ⚠️ Tick rate으로 µs 측정 시도

1 kHz tick으로 *µs latency*를 측정하면 0 또는 1 ms로만 보입니다. 이때는 *DWT* 또는 hw timer를 씁니다.

> ⚠️ Throughput만 최적화

Throughput을 2배 빠르게 했는데 *p99 latency가 3배 느려지면* 사용자에게는 오히려 느려진 셈입니다. Trade-off를 인지해야 합니다.

## 정리

- 3 핵심 지표는 **Latency, Throughput, Utilization**입니다.
- 임베디드에서는 **Jitter와 Deadline**이 추가됩니다.
- Service time과 Response time은 다릅니다(queueing 영향).
- Percentile과 max로 *long tail*을 추적합니다.
- Utilization은 70-80%가 한계이며, 그 위에서는 *queueing이 폭발*합니다.
- IPC와 CoreMark가 *아키텍처 효율*을 비교합니다.

다음 편은 **측정의 기본**입니다. wall-clock, CPU cycle, instruction count를 다룹니다.

## 관련 항목

- [1-01: 성능 분석 방법론](/blog/embedded/performance-engineering/part1-01-methodology)
- [1-03: 측정의 기본](/blog/embedded/performance-engineering/part1-03-measurement)
- [1-04: 통계적 분석](/blog/embedded/performance-engineering/part1-04-statistics)
