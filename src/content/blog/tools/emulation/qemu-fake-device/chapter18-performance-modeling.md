---
title: "Ch 18: 성능 모델링"
date: 2026-05-17T18:00:00
description: "Latency·throughput injection·QoS — 가상 디바이스 성능 시뮬레이션."
tags: [QEMU, performance, latency-injection, qos]
series: "QEMU Fake Device Driver"
seriesOrder: 18
draft: true
---

QEMU의 *기본 device emulation*은 *즉시 완료* — vmexit 후 *수 µs* 안에 결과. 그러나 *실 hardware*는 *수 µs~수 ms* latency. driver의 *timeout·queue depth·QoS*가 *실 latency 하에서* 동작하는지 검증하려면 *명시적 latency injection*이 필요합니다.

## 무엇을 모델링하나

production driver가 *실 환경에서* 마주칠 *performance characteristic*.

| 항목 | 의미 |
|------|------|
| **Latency** | request → response 시간 |
| **Throughput** | 초당 transaction 수 |
| **Jitter** | latency 분포의 *변동성* |
| **Saturation** | queue 가득 시 *backpressure* |
| **Burst** | 갑작스러운 traffic 증가 |
| **Fair share** | 멀티 tenant *공평성* |

각자 *real-world에 가까운* 패턴으로 시뮬레이션.

## Latency injection

가장 단순한 모델 — *고정 latency*.

```c
static void process_request(MyDeviceState *s, VirtQueueElement *elem) {
    /* request 받음 */
    int64_t when = qemu_clock_get_ns(QEMU_CLOCK_VIRTUAL) + s->latency_ns;
    timer_mod(s->complete_timer, when);
    s->pending_elem = elem;
}

static void complete_timer_cb(void *opaque) {
    MyDeviceState *s = opaque;
    /* latency 지난 후 호출 */
    virtqueue_push(s->vq, s->pending_elem, /* len */);
    virtio_notify(VIRTIO_DEVICE(s), s->vq);
}
```

`latency_ns`를 QOM property로:

```c
DEFINE_PROP_UINT64("latency_ns", MyDeviceState, latency_ns, 10000),  /* 10µs */
```

QMP·CLI로 runtime 조정.

## Variable latency

real device는 *분포* 있음.

```c
static int64_t sample_latency(MyDeviceState *s) {
    /* exponential distribution */
    double u = (double)g_rand_int(s->rand) / G_MAXUINT32;
    double exp = -log(1.0 - u) * s->mean_latency_ns;
    return (int64_t)exp;
}
```

| Distribution | 적합한 device |
|--------------|----------------|
| Constant | reset·debug |
| Uniform | 등기 분포 |
| Exponential | random queue arrival |
| Lognormal | network·storage |
| Heavy-tail | 실 cloud workload |

대부분의 storage·NIC는 *lognormal* 또는 *heavy-tail*.

## Throughput limit

token bucket으로 throttle.

```c
typedef struct TokenBucket {
    int64_t tokens;
    int64_t max_tokens;
    int64_t refill_rate;       /* tokens/sec */
    int64_t last_refill_ns;
} TokenBucket;

static bool try_consume(TokenBucket *tb, int64_t needed) {
    int64_t now = qemu_clock_get_ns(QEMU_CLOCK_VIRTUAL);
    int64_t elapsed = now - tb->last_refill_ns;
    tb->tokens += elapsed * tb->refill_rate / NANOSECONDS_PER_SECOND;
    tb->tokens = MIN(tb->tokens, tb->max_tokens);
    tb->last_refill_ns = now;

    if (tb->tokens >= needed) {
        tb->tokens -= needed;
        return true;
    }
    return false;
}
```

bucket 비면 *queue + 대기*. driver의 backpressure path 작동.

## Burst tolerance

평균 throughput은 X, 짧은 burst는 *2X 허용*.

```c
TokenBucket tb = {
    .max_tokens = 1024,        /* 짧은 burst 허용 */
    .refill_rate = 512,        /* 평균 512 tokens/sec */
};
```

real network·storage가 *대부분* 이런 특성.

## Multi-tenant QoS

여러 driver가 같은 device 공유 시 *공평한 자원 분배*.

```c
typedef struct QosClass {
    int weight;          /* 1, 2, 4, ... */
    int64_t tokens;
} QosClass;

static int pick_next_class(MyDeviceState *s) {
    /* deficit round robin */
    int max_idx = -1;
    int64_t max_tokens = INT64_MIN;
    for (int i = 0; i < NUM_CLASSES; i++) {
        if (s->classes[i].tokens > max_tokens) {
            max_tokens = s->classes[i].tokens;
            max_idx = i;
        }
    }
    return max_idx;
}
```

WFQ(Weighted Fair Queueing)·DRR(Deficit Round Robin) 같은 *scheduling algorithm*을 device 안에 구현.

## Queue saturation

queue 가득 시 *어떻게* 응답할지.

```c
#define MAX_QUEUE_DEPTH 32

static int submit_request(MyDeviceState *s, ...) {
    if (s->queue_depth >= MAX_QUEUE_DEPTH) {
        return -EBUSY;
    }
    s->queue_depth++;
    /* ... */
}
```

driver의 *retry policy* 검증. EBUSY 받으면 backoff·delay·redirect 등.

## Performance counter

driver가 *실 hardware perf counter*를 볼 수 있게.

```c
#define REG_PERF_CYCLES     0x100
#define REG_PERF_CMDS       0x104
#define REG_PERF_DMA_BYTES  0x108

static uint64_t perf_read(MyDeviceState *s, hwaddr addr) {
    switch (addr) {
    case REG_PERF_CYCLES:    return s->cycles;
    case REG_PERF_CMDS:      return s->cmd_count;
    case REG_PERF_DMA_BYTES: return s->dma_bytes;
    }
    return 0;
}
```

driver가 *runtime monitoring*. user-space `perf top`·`iostat`이 이 값 활용.

## Power state

real device는 *idle 시 power down*.

```c
typedef enum {
    POWER_ACTIVE,
    POWER_IDLE_L0,
    POWER_IDLE_L1,
    POWER_SUSPENDED,
} PowerState;

static void power_state_machine(MyDeviceState *s) {
    int64_t now = qemu_clock_get_ns(QEMU_CLOCK_VIRTUAL);
    int64_t idle_ns = now - s->last_activity_ns;

    if (idle_ns > 1000000) {       /* 1ms idle */
        s->power_state = POWER_IDLE_L0;
    }
    if (idle_ns > 10000000) {      /* 10ms */
        s->power_state = POWER_IDLE_L1;
    }
    if (idle_ns > 100000000) {     /* 100ms */
        s->power_state = POWER_SUSPENDED;
    }
}
```

state 전환 시 *wake-up latency 추가*. driver의 *PM (Power Management)* 코드 검증.

## Thermal throttling

high load 시 *throttle*.

```c
static void thermal_check(MyDeviceState *s) {
    if (s->ops_per_sec > 100000) {
        s->thermal_throttle = true;
        s->latency_ns += 5000;   /* 5µs 추가 */
    } else if (s->ops_per_sec < 50000) {
        s->thermal_throttle = false;
    }
}
```

modern NPU·GPU의 thermal 동작 모사.

## Realistic NIC model

production NIC의 *통계 분포*.

| Workload | latency | jitter | throughput |
|----------|---------|--------|------------|
| Idle | 5 µs | ±1 | 0 |
| Low (100 Mbps) | 8 µs | ±3 | 100 Mbps |
| Medium (1 Gbps) | 15 µs | ±10 | 1 Gbps |
| High (10 Gbps) | 30 µs | ±50 | 10 Gbps |
| Saturated | 1 ms+ | huge | 10 Gbps (queue full) |

각 zone을 *piecewise function*으로 구현.

## NVMe latency

```text
queue depth 1: ~15 µs
queue depth 4: ~25 µs  (parallelism 잘 됨)
queue depth 32: ~80 µs  (queueing overhead)
queue depth 128: ~500 µs  (saturation)
```

real SSD의 *queue depth vs latency* curve를 *device emulation*에 반영.

## Benchmark — guest 측

```bash
guest$ fio --name=test --rw=randread --bs=4k --iodepth=32 \
    --numjobs=4 --time_based --runtime=60 --ioengine=libaio \
    --filename=/dev/nvme0n1
```

driver의 *real throughput*·*latency p99*·*tail latency* 측정.

## Reporting metrics

```c
static void report_metrics(MyDeviceState *s) {
    qemu_log("device metrics:\n"
             "  ops/sec: %lu\n"
             "  avg latency: %ld ns\n"
             "  p99 latency: %ld ns\n"
             "  queue depth: %u/%u\n",
             s->ops_per_sec, s->avg_latency_ns, s->p99_latency_ns,
             s->queue_depth, MAX_QUEUE_DEPTH);
}
```

QMP로 노출하면 dashboard에 통합.

## 흔한 함정

- **virtual time vs real time** — `QEMU_CLOCK_VIRTUAL`로 시뮬레이션. real wallclock 사용 시 *결정성 깨짐*.
- **timer 너무 자주** — 매 request마다 timer 생성·delete. 비용. *batch* 권장.
- **driver의 *busy poll*과 충돌** — driver가 sleep 안 하고 polling이면 latency injection이 *무의미*.
- **production 빌드에 leak** — `latency_ns` property가 production 빌드에 들어가면 안 됨. `#ifdef`.

## 정리

- 기본 emulation은 *즉시 완료*. 실 latency 시뮬레이션 위해 *명시적 modeling*.
- `QEMU_CLOCK_VIRTUAL` + `QEMUTimer`로 *deterministic latency injection*.
- *Distribution*(exp·lognormal·heavy-tail)으로 real device 모사.
- **Token bucket**으로 throughput·burst tolerance.
- **WFQ/DRR**로 multi-tenant QoS.
- **Power state machine**·**thermal throttle**로 modern device 특성.
- driver의 *backpressure·timeout·tail latency* 코드 검증.
- guest 측 *fio·iperf3*로 *실 성능 측정*.

## 다음 장 예고

다음 장은 *복합 device* — **multi-function PCI**.

## 관련 항목

- [Ch 17: Fuzzing](/blog/tools/emulation/qemu-fake-device/chapter17-fuzzing)
- [Ch 19: Multi-Function PCI](/blog/tools/emulation/qemu-fake-device/chapter19-multi-function)
- [QEMU Internals — Timer](/blog/tools/emulation/qemu-internals/chapter09-timers)
