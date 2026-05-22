---
title: "6-03: 사례 — 8-core인데 4-core를 넘으면 throughput이 떨어진다"
date: 2026-05-08T32:00:00
description: "8-core 서버에서 thread를 늘릴수록 throughput이 오히려 감소. 단일 global mutex가 cache invalidation 폭주를 일으킨 사례."
series: "Embedded Performance Engineering"
seriesOrder: 52
tags: [case-study, lock, contention, scalability, perf-lock]
---

## 한 줄 요약

> **"CPU를 추가하는데 throughput이 떨어지면 거의 항상 lock contention입니다."**

## 증상 — 보고된 문제

네트워크 패킷 카운터를 모으는 데몬이 운영 중인 8-core 서버에서 thread 수에 따른 throughput이 이상한 모습을 보였습니다.

```text
HW: Cortex-A72 8-core, Linux 5.15
워크로드: 1초당 수십만 패킷, 각 패킷마다 통계 카운터 업데이트
측정: thread 개수를 1부터 8까지 늘리며 throughput 측정

Thread:  1   2   3   4   5   6   7   8
Tput:   1.0 1.9 2.7 3.4 3.0 2.5 2.0 1.6  (× single-thread)
```

4-thread까지는 거의 선형 scaling이 나오다가, 5-thread부터 오히려 throughput이 감소했습니다. 8-thread에서는 single-thread보다도 1.6배밖에 빠르지 않았습니다.

전형적인 contention 또는 coherency 문제로 보였지만, 어디서 발생하는지는 코드만 봐서는 분명하지 않았습니다.

## 가설 1 — Memory bandwidth saturation

처음 의심한 것은 메모리 대역폭 포화였습니다. 패킷 처리는 대량의 메모리 read/write를 동반하므로 8 thread가 동시에 메모리를 두드리면 DRAM이 한계에 부딪힐 수 있습니다.

```bash
mpstat -P ALL 1

# 16:20:01  CPU   %usr  %sys  %idle
# 16:20:02    0   42.0  18.0   38.0
# 16:20:02    1   38.0  21.0   39.0
# 16:20:02    2   40.0  19.0   39.0
# 16:20:02    3   41.0  20.0   37.0
# 16:20:02    4   35.0  22.0   41.0
# 16:20:02    5   34.0  23.0   41.0
# 16:20:02    6   33.0  24.0   41.0
# 16:20:02    7   32.0  25.0   41.0
```

모든 코어가 idle 40%였습니다. CPU가 일하지 못하고 놀고 있다는 뜻입니다. Memory bandwidth 포화라면 코어들이 메모리를 기다리며 stall 상태로 100% 사용 중으로 보였을 텐데, 그렇지 않았습니다.

추가로 `perf stat -e mem_access`로 측정한 메모리 대역폭도 시스템 한계의 30% 수준이었습니다.

**가설 1 기각**: 메모리 대역폭이 아닙니다.

## 가설 2 — Lock contention

다음으로 `perf lock`을 돌렸습니다.

```bash
sudo perf lock record -- ./packet_daemon
sudo perf lock report

# Name                  acquired   contended   wait_total(s)   wait_avg(ns)
# stats_mutex           4823145     3892012        125.34       32200
# rcu_state                  234           0          0.00          0
# pid_lock                  1234           2          0.00       1234
```

`stats_mutex`라는 mutex가 480만 번 acquire되었고 그중 390만 번이 contended(다른 thread가 대기 중)였습니다. 누적 wait time이 125초로 전체 측정 시간의 대부분을 차지했습니다.

코드를 들여다 보니 모든 thread가 같은 mutex 하나를 잡고 카운터를 증가시키고 있었습니다.

```c
struct stats {
    uint64_t packets;
    uint64_t bytes;
    uint64_t errors;
};

static struct stats global_stats;
static pthread_mutex_t stats_mutex = PTHREAD_MUTEX_INITIALIZER;

void on_packet(packet_t *pkt)
{
    /* ... 처리 ... */

    pthread_mutex_lock(&stats_mutex);
    global_stats.packets++;
    global_stats.bytes += pkt->len;
    if (pkt->err) global_stats.errors++;
    pthread_mutex_unlock(&stats_mutex);
}
```

Hold time은 짧지만 호출 빈도가 극도로 높아 cache line이 코어 사이를 끊임없이 왕복하고 있었습니다.

**가설 2 확정**: 단일 global mutex가 범인입니다.

## 원인 — Cache Invalidation과 USL

좀 더 깊게 들여다 봅니다. `stats_mutex`와 `global_stats`는 같은 cache line 또는 인접 cache line에 위치해 있습니다. 한 thread가 mutex를 잡으면 다음 동작이 일어납니다.

```text
1. mutex의 cache line을 자기 코어 L1으로 Exclusive 상태로 가져옴
2. 다른 코어의 L1에 있던 같은 line은 Invalid로 전환
3. global_stats 업데이트도 동일 패턴
4. mutex release 후 다른 thread가 동일 line 요청
   → 직전 코어 L1에서 inter-core 전송
```

코어 1개당 매 패킷마다 이 절차가 일어납니다. 8 코어가 같은 cache line을 두고 ping-pong하면 한 acquire-release cycle에 수백 ns의 coherency overhead가 추가됩니다. 처리할 패킷이 많을수록 이 overhead가 누적되어 코어를 추가하는 의미가 사라집니다.

Universal Scalability Law(USL)는 이 현상을 식으로 보여 줍니다.

$$C(N) = \frac{N}{1 + \alpha(N-1) + \beta \cdot N(N-1)}$$

여기서 $N$은 CPU 수, $\alpha$는 contention(serial fraction), $\beta$는 coherency(cache invalidation 비용)입니다.

$\alpha$만 있으면 Amdahl처럼 점근선에 수렴합니다. $\beta$가 있으면 어느 $N$부터는 throughput이 오히려 감소하는 곡선이 됩니다. 우리 측정값이 정확히 USL $\beta > 0$ 곡선이었습니다.

## 해결 — Per-CPU 카운터와 주기적 머지

표준 해법은 per-CPU 카운터입니다. 각 thread가 자기만의 카운터를 가지면 contention이 0이 되고, 합계가 필요한 시점에만 모아 줍니다.

```c
#define MAX_CPUS 16
#define CACHE_LINE 64

struct local_stats {
    uint64_t packets;
    uint64_t bytes;
    uint64_t errors;
    char pad[CACHE_LINE - 3 * sizeof(uint64_t)];
} __attribute__((aligned(CACHE_LINE)));

static struct local_stats per_cpu_stats[MAX_CPUS];

void on_packet(packet_t *pkt)
{
    int cpu = sched_getcpu();
    struct local_stats *s = &per_cpu_stats[cpu];

    /* ... 처리 ... */

    s->packets++;
    s->bytes += pkt->len;
    if (pkt->err) s->errors++;
}
```

핵심은 두 가지입니다. 첫째, `aligned(CACHE_LINE)`과 padding으로 각 CPU의 카운터를 다른 cache line에 둡니다. False sharing을 피하는 표준 패턴입니다. 둘째, `sched_getcpu()`로 현재 실행 중인 CPU의 슬롯을 찾습니다.

합계 read는 주기적으로 background thread가 처리합니다.

```c
struct stats aggregate(void)
{
    struct stats total = {0};
    for (int i = 0; i < MAX_CPUS; i++) {
        total.packets += per_cpu_stats[i].packets;
        total.bytes   += per_cpu_stats[i].bytes;
        total.errors  += per_cpu_stats[i].errors;
    }
    return total;
}

void *aggregator(void *arg)
{
    while (1) {
        sleep(1);
        struct stats s = aggregate();
        publish(&s);
    }
}
```

읽기는 atomic하지 않지만 통계 카운터는 정확한 순간값이 아니라 추세가 중요한 데이터이므로 허용됩니다. 정확성이 필요하다면 read 시점에 모든 카운터를 atomic load하면 됩니다.

Thread가 CPU migration을 자주 하면 잘못된 슬롯에 카운팅할 수 있으므로, thread를 CPU에 pin하거나 `pthread_setaffinity_np`로 고정하는 것이 좋습니다.

## 검증 — Before / After

같은 워크로드로 throughput을 재측정했습니다.

| Threads | Before (global mutex) | After (per-CPU) |
|---|---|---|
| 1 | 1.0× | 1.0× |
| 2 | 1.9× | 2.0× |
| 3 | 2.7× | 3.0× |
| 4 | 3.4× | 3.9× |
| 5 | 3.0× | 4.9× |
| 6 | 2.5× | 5.8× |
| 7 | 2.0× | 6.8× |
| 8 | 1.6× | 7.7× |

8-thread에서 single-thread의 7.7배 throughput. 거의 선형 scaling을 회복했습니다. `perf lock` report에서도 `stats_mutex`가 사라졌습니다(코드에서 제거했으므로 당연).

추가로 `perf c2c report`로 cache-to-cache traffic도 확인했습니다. Before에서는 `stats_mutex` cache line이 HITM 이벤트 1위였는데, after에서는 HITM 자체가 거의 0으로 떨어졌습니다.

## 교훈

이번 사례에서 얻은 교훈을 정리합니다.

- **CPU를 추가하는데 throughput이 떨어진다 = lock contention**. 거의 예외 없이 성립하는 패턴입니다. USL의 β > 0 곡선이며, 어느 N부터는 코어 추가가 오히려 해롭습니다.
- **`perf lock`이 첫 도구**. 한 줄로 어느 lock이 hot한지 보여 줍니다. `acquired × wait_avg`가 큰 lock부터 처리합니다.
- **`mpstat`로 가설 빠르게 거르기**. CPU가 idle이면 contention 또는 I/O wait, busy면 compute bound입니다. Memory bound는 보통 idle로 잡힙니다.
- **Per-CPU 패턴은 강력**. 카운터, 통계, hot allocator 등 contention이 심한 자료구조에 거의 항상 적용됩니다. Linux 커널의 `per_cpu()` 매크로가 이 패턴의 표준이며, percpu allocator도 같은 원리입니다.
- **Cache line padding을 잊지 말 것**. Per-CPU 배열의 각 요소를 cache line align하지 않으면 false sharing으로 contention이 다시 살아납니다.
- **읽기 정확성은 trade-off**. Aggregate read 시점에 atomic load를 쓸지, 추세값으로 충분한지 워크로드에 맞춰 결정합니다. 통계·메트릭은 보통 후자로 충분합니다.

가장 큰 교훈은 USL을 머릿속에 두는 것입니다. "코어를 추가하면 throughput이 무한히 늘어난다"는 직관은 single-lock 구조 앞에서 무너집니다. 설계 단계에서 어느 자료구조가 hot path에 있는지 점검하고, 그 자료구조가 N개의 코어에서 어떻게 동작할지 미리 그려 봐야 합니다.

## 관련 항목

- [6-02: Cache Thrashing 사례](/blog/embedded/performance-engineering/part6-02-case-cache-thrashing)
- [6-04: DMA 성능 튜닝 사례](/blog/embedded/performance-engineering/part6-04-case-dma-tuning)
- [4-03: Lock Contention](/blog/embedded/performance-engineering/part4-03-lock-contention)
- [4-02: False Sharing](/blog/embedded/performance-engineering/part4-02-false-sharing)
- [5-01: perf 기초](/blog/embedded/performance-engineering/part5-01-perf-basics)
