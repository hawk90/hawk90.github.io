---
title: "1-02: 성능 지표 정의 — Latency, Throughput, Utilization"
date: 2026-05-12T02:00:00
description: "3 핵심 지표 + 임베디드 추가 — Jitter·Deadline. Service time vs Response time."
series: "Embedded Performance Engineering"
seriesOrder: 2
tags: [performance, latency, throughput, utilization, jitter, deadline]
draft: true
---

## 한 줄 요약

> **"Latency·Throughput·Utilization"** — 3 축으로 성능을 그린다. 임베디드는 *jitter·deadline* 추가.

## 3 핵심 지표

### Latency

**한 작업이 *완료되기까지의 시간***.

```text
요청 → ── 처리 ── → 응답
       │←────────→│
            latency
```

단위 — µs, ms, s. 측정 — single request 시간 또는 *분포* (p50·p99·max).

### Throughput

**단위 시간당 처리량**.

```text
초당 요청 수 (req/s)
초당 byte 수 (MB/s, Gbps)
초당 프레임 수 (FPS)
```

단위 — req/s, bytes/s, ops/s.

### Utilization

**자원 사용률 (%)**.

```text
CPU U = (busy time) / (total time)
Memory U = used / total
Bus U = (active cycles) / (total cycles)
```

100% 도달 = *saturation* → queueing → latency 증가.

## Latency vs Throughput — 상호 의존

작은 시스템에서 보통 *trade-off* 또는 *직교*:

```text
초기 (utilization 낮음):  throughput↑ → latency 거의 변화 X
중간 (50-70%):           throughput↑ → latency 살짝 증가
포화 (90%+):             throughput 한계 → latency 폭증
```

**Queueing Theory** (Little's Law):

```
L = λ × W
L = 평균 대기 수, λ = 도착률, W = 평균 대기 시간
```

자원 utilization 100% 근접 시 *W → ∞*. 임베디드에서 *80% 한계* 권장.

## Service Time vs Response Time

```text
요청 도착 → 큐 대기 → 처리 시작 → 처리 종료 → 응답
         │← Queue →│         │← Service →│
         │←─────────── Response ─────────→│
```

- **Service Time** = 실제 *처리 시간* (queue 제외)
- **Response Time** = *대기 + 처리* (사용자 체감)

평균 service time이 좋아도 *queue 적체 시 response time 폭증*.

## 임베디드 — Jitter

Latency의 *변동성*.

```text
주기적 1ms PID task:
실제 wake: 1.000, 1.001, 0.998, 1.003, 0.997 ...
Jitter = max - min = 6 µs
```

평균 양호한데 jitter 크면 *실시간 제어 불가*. Audio·motor·camera 동기에 치명.

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

Histogram 누적 → 분포 분석.

## 임베디드 — Deadline

작업이 *반드시 끝나야 할 시점*.

| Type | Miss 결과 |
| --- | --- |
| **Hard** | 시스템 실패 (브레이크, 인공호흡기) |
| **Firm** | 결과 무효 (실시간 거래) |
| **Soft** | 품질 저하 (비디오 frame drop) |

Latency *대신* Deadline 만족이 metric — *deadline 안에 들어왔나? 몇 % 들어왔나?*

## Percentile 표기

```text
p50 (median)  — 절반은 더 빠름
p90           — 10% 케이스만 더 느림
p99           — 1% 케이스만 더 느림
p999          — 0.1% (1000 중 1)
p9999         — 0.01%
max           — worst-case
```

Hard real-time = *max ≤ deadline*. Soft = *p99·p999 ≤ deadline*.

## Long Tail

```text
Histogram:
       ▓▓▓▓▓▓▓▓
     ▓ ▓▓▓▓▓▓▓▓▓
   ▓ ▓ ▓▓▓▓▓▓▓▓▓ ▓        ▓                     ▓ ← long tail
   1   10           100              1000 ms
```

평균 10 ms, p99 100 ms, max 1 s. *Long tail*이 사용자 체감 결정.

원인 — *cache miss·GC·context switch·bus contention*. RAS (Reliability·Availability·Serviceability) 도구로 추적.

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

80% 넘으면 *exponential*. **70-80%가 안전 한계**.

## 임베디드 추가 지표

### IPC (Instructions Per Cycle)

`PMU CPU_CYCLES`·`INST_RETIRED` ratio.

```text
IPC = 0.5  — 스트레스 (memory bound, stall)
IPC = 1.0  — 정상
IPC = 2.0+ — 슈퍼스칼라 활용
```

낮으면 *왜?* — cache miss, branch mispredict, stall.

### Cache Hit Rate

```c
double hit_rate = 1.0 - (cache_miss / cache_access);
```

L1 보통 95-99%, L2 80-95%, L3 60-80%. *임베디드 (1-2 KB L1)*는 *작은 working set* 가정.

### MIPS / DMIPS

옛 단위. **MIPS** = millions of instructions per second. **DMIPS** = Dhrystone MIPS (벤치).

```text
Cortex-M0+ @ 50 MHz: 45 DMIPS
Cortex-M4 @ 168 MHz: 350 DMIPS
Cortex-A53 @ 1.5 GHz: 3500 DMIPS
```

DMIPS는 *아주 거친* 비교. CoreMark·EEMBC 등 *더 정밀* 벤치.

### CoreMark

비영리 EEMBC의 임베디드 표준 벤치. *Standardized integer workload*.

```text
Cortex-M0+ @ 50 MHz:  100 CoreMark
Cortex-M4F @ 168 MHz: 850 CoreMark
RISC-V SiFive E31:     150 CoreMark
```

CoreMark/MHz가 *효율* (architecture 능력) 비교.

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

Median이 좋아도 *long tail* 인지 못함. 항상 *p99·max*.

> ⚠️ Utilization 90%+ 목표

Queueing latency 폭증. **70-80% 한계**.

> ⚠️ Tick rate으로 µs 측정 시도

1 kHz tick으로 *µs latency* 측정 → 0 또는 1 ms로만 보임. *DWT* 또는 hw timer.

> ⚠️ Throughput만 최적화

Throughput 2× 빠르게 했는데 *p99 latency 3× 느려짐* → 사용자에겐 *느림*. Trade-off 인지.

## 정리

- 3 핵심 — **Latency · Throughput · Utilization**.
- 임베디드 추가 — **Jitter · Deadline**.
- Service time ≠ Response time (queueing 영향).
- Percentile + max로 *long tail* 추적.
- Utilization 70-80% 한계, 그 위는 *queueing 폭발*.
- IPC·CoreMark가 *아키텍처 효율* 비교.

다음 편은 **측정의 기본** — wall-clock, CPU cycle, instruction count.

## 관련 항목

- [1-01: 성능 분석 방법론](/blog/embedded/performance-engineering/part1-01-methodology)
- [1-03: 측정의 기본](/blog/embedded/performance-engineering/part1-03-measurement)
- [1-04: 통계적 분석](/blog/embedded/performance-engineering/part1-04-statistics)
