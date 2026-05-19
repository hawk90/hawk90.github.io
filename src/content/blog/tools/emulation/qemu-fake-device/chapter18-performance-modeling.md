---
title: "Ch 18: 성능 모델링"
date: 2026-05-17T18:00:00
description: "Latency·throughput injection·QoS — 가상 디바이스 성능 시뮬레이션."
tags: [QEMU, performance, latency-injection, qos]
series: "QEMU Fake Device Driver"
seriesOrder: 18
draft: true
---

## 이 챕터의 의도

실 HW 없이 성능 SLO를 미리 검증하려면 가상 디바이스가 latency, throughput, jitter, tail latency를 현실처럼 모방해야 한다. 이 장에서는 driver의 timeout, retry, backpressure 코드가 실 HW를 받기 전에 제대로 동작하는지 검증하는 방법을 본다.

## 핵심 항목

- ✦ **Latency injection** — request 처리 전 `timer_mod` / `qemu_bh_schedule_idle`로 지연
- ✦ Latency 분포 — fixed / uniform / log-normal / heavy-tail (Pareto)
- ✦ **Throughput cap** — token bucket — `refill_rate`, `burst_size`, 토큰 부족 시 queue
- ✦ Jitter — base + uniform random noise — clock drift·thermal throttle 모방
- ✦ Tail latency simulation — 99.9%-tile에 큰 spike — GC pause·refresh·remap 시나리오
- ✦ QoS class — 디바이스가 여러 stream 분류, priority queue로 처리 (NVMe streams, Linux blk-mq priority)
- ✦ Queue-depth 효과 — QD 1 vs QD 32 vs QD 128, throughput-latency tradeoff
- ✦ Backpressure — full queue 시 driver에 *busy* return 또는 head-of-line block
- ✦ Driver perf test — fio (`--ioengine=io_uring`), dd, custom generator
- ✦ Reproducible benchmark — fixed seed로 deterministic latency 분포
- ✦ SLO 검증 — p50/p99/p999 latency 측정, fail threshold
- ◦ Power/thermal model — duty cycle에 따른 throttle

## 다이어그램 (3)

1. Token bucket throughput cap 시각화
2. Latency 분포 — fixed / lognormal / tail-heavy 비교
3. Driver test loop — generator → device (모델) → measurement → SLO check

## 코드 sketch

```c
/* QEMU 측 — request 받으면 분포에 따라 지연 후 complete */
typedef struct {
    QEMUBH       *bh;
    uint64_t      latency_base_ns;
    uint64_t      latency_jitter_ns;
    int64_t       tokens;          /* throughput cap */
    int64_t       refill_rate;     /* tokens/sec */
    int64_t       last_refill;
} PerfModel;

static uint64_t draw_latency(PerfModel *m) {
    /* lognormal 또는 heavy-tail 분포 — gsl_ran_lognormal 등 */
    uint64_t jitter = g_random_int_range(0, m->latency_jitter_ns);
    if (g_random_double() < 0.001) jitter *= 100;  /* tail spike */
    return m->latency_base_ns + jitter;
}

static void process_request(FakeAcc *s, Request *req) {
    refill_tokens(&s->perf);
    if (s->perf.tokens < req->size) {
        queue_request(s, req);   /* backpressure */
        return;
    }
    s->perf.tokens -= req->size;

    uint64_t delay = draw_latency(&s->perf);
    timer_mod(s->complete_timer, qemu_clock_get_ns(QEMU_CLOCK_VIRTUAL) + delay);
}

/* timer fire → complete + IRQ */
static void on_complete(void *opaque) {
    FakeAcc *s = opaque;
    set_status(s, REQ_DONE);
    qemu_irq_pulse(s->irq);
}
```

```bash
# Driver side perf test
fio --name=test --ioengine=io_uring --rw=randread --bs=4k \
    --iodepth=32 --runtime=60 --time_based --filename=/dev/myacc0 \
    --output-format=json | jq '.jobs[].read.lat_ns.percentile'
```

## 레퍼런스

- QEMU `include/qemu/timer.h`, `qemu_bh_schedule`
- "Tail at Scale" — Dean & Barroso, CACM 2013
- NVMe Stream specification (NVMe TP 4034)
- Linux blk-mq priority — `Documentation/block/blk-mq.rst`
- fio docs — `man fio`

## 관련 항목

- [Ch 14: SG-DMA](/blog/tools/emulation/qemu-fake-device/chapter14-scatter-gather-dma)
- [Ch 17: 디바이스 퍼징](/blog/tools/emulation/qemu-fake-device/chapter17-fuzzing)
- [io_uring Ch 8: multishot·zero-copy](/blog/systems/io-uring/) — driver 측 high-perf
