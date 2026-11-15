---
title: "사례 분석 — 멀티코어 처리량 저하에서 lock 병목 조사"
slug: "embedded/performance-engineering/part6-03-case-lock-contention"
date: 2026-04-28T09:02:00
description: "스레드 증가 후 처리량이 낮아지는 사례에서 mutex 대기와 cache-line 이동을 구분해 조사하는 방법을 설명합니다. 수치는 재현된 실측값이 아닙니다."
series: "Embedded Performance Engineering"
seriesOrder: 52
tags: [case-study, lock, contention, scalability, perf-lock]
topics: ["embedded"]
---

## 한 줄 요약

> **"CPU를 늘린 뒤 처리량이 떨어지면 병목을 측정해 원인을 좁힙니다."**

## 증상 — 보고된 문제

네트워크 패킷 카운터를 모으는 데몬이 운영 중인 8-core 서버에서 thread 수에 따른 throughput이 이상한 모습을 보였습니다.

아래 수치와 출력은 조사 절차를 설명하기 위한 시나리오 값이며, 원시 로그나 실행 환경이 제공되지 않아 실제 측정 사례로 검증하지 않았습니다.

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

예시의 idle 값은 약 37~41%입니다. `mpstat`의 CPU accounting만으로 DRAM 포화나 mutex 대기를 구분할 수 없습니다. 실행 중 memory stall과 스레드가 잠든 시간도 구분해야 합니다([sysstat mpstat 매뉴얼](https://github.com/sysstat/sysstat/blob/master/man/mpstat.1)).

`mem_access` 이벤트 수만으로 DRAM 대역폭의 포화 비율을 계산할 수 없습니다. 해당 PMU 이벤트 정의·전송 byte 환산·측정 구간을 확인하고, 지원되는 memory-controller counter와 같은 조건의 지속 대역폭 기준을 비교해야 합니다. 이 원고에는 그 자료가 없어 기존의 “시스템 한계의 30%” 주장은 근거로 사용하지 않습니다.

**가설 1 미검증**: 메모리 대역폭 가설을 배제할 자료가 없습니다.

## 가설 2 — Lock contention

`perf lock`은 Linux kernel lock instrumentation이 제공하는 lock events를 분석합니다. 이 도구만으로 임의의 userspace `pthread_mutex_t`가 `stats_mutex`라는 이름으로 측정된다고 가정할 수 없습니다. 다음 출력은 조사 결과가 아닌 설명용 표입니다. (출처: [perf-lock 매뉴얼](https://man7.org/linux/man-pages/man1/perf-lock.1.html))

```text
sudo perf lock record -- ./packet_daemon
sudo perf lock report

# illustrative only; not verbatim perf output for a pthread mutex
# lock class             acquired   contended   wait_total(s)   wait_avg(ns)
# <kernel lock class>    ...        ...         ...             ...
```

userspace mutex 대기는 application instrumentation, pthread/futex tracing, 또는 적절히 설정한 userspace probe로 따로 관찰해야 합니다. 이 원고에는 그 원시 관측 자료가 없습니다.

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

호출이 잦으면 mutex나 카운터의 cache-line ownership 이동이 비용을 유발할 수 있습니다. 실제 이동 빈도와 대기 시간은 이 코드만으로 알 수 없습니다.

**판정 보류**: 단일 mutex는 검토할 가설이지만 이 예시 출력으로 원인을 확정하지 않습니다.

## 원인 — Cache Invalidation과 USL

좀 더 깊게 들여다 봅니다. `stats_mutex`와 `global_stats`의 배치는 binary와 주소로 확인해야 합니다. 일반적인 write-invalidate coherence에서 공유 line에 쓰기 권한을 얻는 과정을 단순화하면 다음과 같습니다.

1. mutex 갱신을 위해 해당 line의 쓰기 권한을 얻습니다. 구체적인 coherence 상태 이름은 구현에 따라 다릅니다.
2. 다른 코어의 L1에 있던 같은 line은 Invalid로 전환됩니다.
3. `global_stats` 업데이트도 동일한 패턴으로 진행됩니다.
4. 다른 코어가 같은 line을 갱신하면 소유권 이동이 필요할 수 있습니다. 데이터 전달 경로는 cache hierarchy와 line 상태에 따라 달라집니다.

공유 mutex나 카운터가 cache line ownership 이동을 일으킬 수 있지만, 레이아웃·mutex 구현·작업량·스케줄링에 따라 영향이 다릅니다. 이 사례에는 cache-to-cache 원시 측정이 없어 수백 ns라는 비용이나 처리량 저하의 직접 원인을 확인할 수 없습니다.

Universal Scalability Law(USL)는 이 현상을 식으로 보여 줍니다.

$$C(N) = \frac{N}{1 + \alpha(N-1) + \beta \cdot N(N-1)}$$

여기서 $N$은 CPU 수, $\alpha$는 contention(serial fraction), $\beta$는 coherency(cache invalidation 비용)입니다.

$\alpha$만 있으면 Amdahl처럼 점근선에 수렴합니다. $\beta$가 있으면 어느 $N$부터는 throughput이 오히려 감소하는 곡선이 됩니다. USL은 측정 throughput을 설명하는 모델 후보일 뿐이며, 이 사례에는 적합도·잔차가 없어 계수로 원인을 판정할 수 없습니다.

## 해결 후보 — Worker별 카운터와 주기적 합산

한 후보는 worker별 카운터를 두고 필요한 시점에 합산하는 것입니다. lock contention이 사라지는지와 atomic/cache 비용이 줄어드는지는 실행 환경에서 비교해야 합니다.

```c
#include <stdatomic.h>
#include <stdint.h>

#define MAX_WORKERS 16
#define CACHE_LINE 64

struct local_stats {
    _Atomic uint64_t packets;
    _Atomic uint64_t bytes;
    _Atomic uint64_t errors;
    char pad[CACHE_LINE - 3 * sizeof(uint64_t)];
} __attribute__((aligned(CACHE_LINE)));

static struct local_stats per_worker_stats[MAX_WORKERS];

/* worker_id is assigned once to a worker; it is not sched_getcpu(). */
void on_packet(unsigned worker_id, packet_t *pkt)
{
    if (worker_id >= MAX_WORKERS) return;
    struct local_stats *s = &per_worker_stats[worker_id];

    /* ... 처리 ... */

    atomic_fetch_add_explicit(&s->packets, 1, memory_order_relaxed);
    atomic_fetch_add_explicit(&s->bytes, pkt->len, memory_order_relaxed);
    if (pkt->err)
        atomic_fetch_add_explicit(&s->errors, 1, memory_order_relaxed);
}
```

worker마다 슬롯을 하나만 소유하도록 계약합니다. 정렬과 padding은 cache-line 크기 및 ABI에 맞는지 확인해야 하며, 이 방식은 `sched_getcpu()`로 CPU별 슬롯을 고르는 per-CPU 구현과 다릅니다.

합계 read는 주기적으로 background thread가 처리합니다.

```c
struct stats aggregate(void)
{
    struct stats total = {0};
    for (int i = 0; i < MAX_WORKERS; i++) {
        total.packets += atomic_load_explicit(&per_worker_stats[i].packets, memory_order_relaxed);
        total.bytes   += atomic_load_explicit(&per_worker_stats[i].bytes, memory_order_relaxed);
        total.errors  += atomic_load_explicit(&per_worker_stats[i].errors, memory_order_relaxed);
    }
    return total;
}

void *aggregator(void *arg)
{
    (void)arg;
    while (1) {
        sleep(1);
        struct stats s = aggregate();
        publish(&s);
    }
}
```

각 필드의 snapshot은 data race를 피하지만 여러 필드의 값이 같은 시점을 나타내지는 않습니다. C11 draft는 두 thread가 같은 non-atomic 객체를 동기화 없이 동시에 읽고 쓰는 data race를 정의하고, 해당 실행에 undefined behavior를 둡니다([WG14 N1570 §5.1.2.4](https://www.open-std.org/jtc1/sc22/wg14/www/docs/n1570.pdf)). 일관된 snapshot이 필요하면 worker quiescence나 별도 동기화 프로토콜을 추가합니다. Worker ID로 분리하면 CPU migration 자체가 슬롯을 바꾸지 않습니다.

## 검증 — Before / After

다음은 같은 워크로드의 비교 보고서에 넣을 수 있는 시나리오 값입니다. 실제 재측정 결과가 아닙니다.

| Threads | Before (global mutex) | After (worker-local example) |
|---|---|---|
| 1 | 1.0× | 1.0× |
| 2 | 1.9× | 2.0× |
| 3 | 2.7× | 3.0× |
| 4 | 3.4× | 3.9× |
| 5 | 3.0× | 4.9× |
| 6 | 2.5× | 5.8× |
| 7 | 2.0× | 6.8× |
| 8 | 1.6× | 7.7× |

예시 표는 8 workers에서 single-thread 대비 7.7배라고 적혀 있지만, 반복 측정과 원시 결과가 없어 개선량은 검증되지 않았습니다. userspace mutex 제거 여부도 `perf lock`만으로 판단할 수 없습니다.

`perf c2c`는 지원되는 PMU와 workload에서 cache-to-cache 샘플을 조사하는 후보 도구입니다. 이 원고에는 해당 출력이나 타깃 지원 확인이 없습니다.

## 교훈

이번 사례에서 얻은 교훈을 정리합니다.

- **처리량 저하는 여러 원인이 있습니다**. lock 대기, coherency, memory bandwidth, scheduler, I/O 등을 독립 증거로 확인합니다.
- **`perf lock`은 kernel lock을 조사합니다**. userspace mutex는 application 계측이나 별도 tracing으로 확인합니다.
- **`mpstat`만으로 원인을 배제하지 않습니다**. CPU accounting은 stall, run queue, I/O, 장치별 카운터와 함께 해석합니다.
- **Worker-local 상태는 후보 해법**. 합산 일관성, migration, 메모리 비용, atomic 비용을 포함해 실제 workload에서 평가합니다.
- **Cache line padding을 확인합니다**. Worker 배열의 정렬은 false sharing을 줄이는 후보이며 대상 cache-line 크기로 확인합니다.
- **공유 snapshot에는 동기화 계약이 필요합니다**. 일반 정수의 동시 읽기·쓰기는 C에서 data race이므로 단순히 통계값이라는 이유로 허용할 수 없습니다.

USL과 lock/cache 증거를 함께 사용해 병목 가설을 비교합니다. 이 원고에는 실제 대상의 처리량 곡선이나 계수 적합 결과가 없어, worker-local 방식의 효과와 원인은 아직 검증되지 않았습니다.

다음 사례에서는 [카메라 payload와 DMA 경로](/blog/embedded/performance-engineering/part6-04-case-dma-tuning)를 조사합니다.

## 관련 항목

- [6-02: Cache Thrashing 사례](/blog/embedded/performance-engineering/part6-02-case-cache-thrashing)
- [6-04: DMA 성능 튜닝 사례](/blog/embedded/performance-engineering/part6-04-case-dma-tuning)
- [4-03: Lock Contention](/blog/embedded/performance-engineering/part4-03-lock-contention)
- [4-02: False Sharing](/blog/embedded/performance-engineering/part4-02-false-sharing)
- [5-01: perf 기초](/blog/embedded/performance-engineering/part5-01-perf-basics)
