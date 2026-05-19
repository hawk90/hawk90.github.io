---
title: "6-02: 사례 — Cache Thrashing 진단 (L1 miss 30% → 5%)"
date: 2026-05-08T31:00:00
description: "L1 miss rate 30%. perf c2c로 false sharing 발견. struct padding + AoS→SoA로 해결."
series: "Embedded Performance Engineering"
seriesOrder: 48
tags: [case-study, cache, thrashing, false-sharing, soa]
draft: true
---

## 한 줄 요약

> **"L1 miss 30% — false sharing + cache-unfriendly struct"** — padding + SoA로 5%로.

## 시나리오 — 자율주행 점군 처리

```text
보드: Jetson AGX Xavier — 8 core Carmel
역할: LiDAR 점군 (128 K points/frame, 20 fps)
RT: frame 처리 < 50 ms

증상: 4 thread parallel — 1.5x speedup만 (4 core인데)
       perf — IPC 0.7 (target 2.0+)
       memory bound 의심
```

## 측정 — perf stat

```bash
perf stat -e cycles,instructions,cache-references,cache-misses,\
L1-dcache-loads,L1-dcache-load-misses ./point_cloud_process

#  5,234,567,890   cycles
#  3,123,456,789   instructions          # 0.60  insns per cycle
#  2,345,678,901   L1-dcache-loads
#    789,012,345   L1-dcache-load-misses  # 33.6 % of loads   ← high!
```

L1 miss 33% — *정상은 < 5%*. Cache thrashing 의심.

## perf c2c — Cache-to-Cache False Sharing

```bash
sudo perf c2c record ./point_cloud_process
sudo perf c2c report

# Output (요약):
# Shared Cacheline Distribution Pareto
#
# HITM      Hit-Local  Hit-Remote  Cacheline       Symbol
# 234,567    12,345       0       0xffff_abcd00   point_cloud.points
# 198,765    11,234       0       0xffff_def100   global_stats
```

`HITM` (Hit in Modified) — false sharing의 signature. `point_cloud.points` cache line이 *bouncing*.

## 코드 — 원인 발견

```c
struct point {
    float x, y, z;        /* 12 byte */
    float intensity;      /* 16 byte */
    uint32_t cluster_id;  /* 20 byte */
};

struct {
    point_t points[128000];
    atomic_int processed_count;   /* ← 마지막에 추가 */
    char pad[4];
    atomic_int error_count;
} pcd;

void thread_n(int n, point_t *points, int start, int end) {
    for (int i = start; i < end; i++) {
        process_point(&points[i]);
        atomic_fetch_add(&pcd.processed_count, 1);
        if (point_invalid(points[i])) {
            atomic_fetch_add(&pcd.error_count, 1);
        }
    }
}
```

`processed_count`·`error_count` — *같은 cache line* (20+4+4 = 28 byte → fit in 64B line).

4 thread × atomic_fetch_add 매 point = *false sharing 폭주*.

## 해결 1 — Padding

```c
struct {
    point_t points[128000];
    alignas(64) atomic_int processed_count;
    char pad1[64 - sizeof(atomic_int)];
    alignas(64) atomic_int error_count;
    char pad2[64 - sizeof(atomic_int)];
} pcd;
```

`alignas(64)` — line 분리. False sharing 0.

## 해결 2 — Per-Thread Counter

```c
struct {
    point_t points[128000];
    alignas(64) atomic_int per_thread_processed[NUM_THREADS];
    alignas(64) atomic_int per_thread_error[NUM_THREADS];
} pcd;

void thread_n(int n, ...) {
    int local_proc = 0, local_err = 0;
    for (int i = start; i < end; i++) {
        process_point(&points[i]);
        local_proc++;
        if (invalid) local_err++;
    }
    /* End of thread — single atomic */
    atomic_store(&pcd.per_thread_processed[n], local_proc);
    atomic_store(&pcd.per_thread_error[n], local_err);
}
```

Per-thread *local count* — atomic 매 point에서 *thread 끝에서만*.

## 추가 발견 — Struct Layout

```c
struct point {
    float x, y, z, intensity;
    uint32_t cluster_id;
};   /* 20 byte */
```

20 byte point — *cache line 64 byte에 3개*. *cluster_id*만 사용하는 loop에서:

```c
for (int i = 0; i < N; i++) {
    if (points[i].cluster_id == target) ...;
}
```

매 point 20 byte fetch — *cluster_id 4 byte 만 쓰는데 64 byte line load*.

## 해결 3 — SoA (Structure of Arrays)

```c
struct point_cloud {
    float x[128000];
    float y[128000];
    float z[128000];
    float intensity[128000];
    uint32_t cluster_id[128000];
};
```

`cluster_id` array만 순회 — 64 byte line당 16 element. *bandwidth 5x ↑*.

## SIMD 추가 — NEON

```c
/* x array — 연속 4 float = 1 NEON vector */
for (int i = 0; i + 4 <= N; i += 4) {
    float32x4_t vx = vld1q_f32(&pcd.x[i]);
    float32x4_t vy = vld1q_f32(&pcd.y[i]);
    float32x4_t vz = vld1q_f32(&pcd.z[i]);
    /* compute */
}
```

SoA → SIMD 자연스러움. 4x 추가 speedup.

## 측정 결과

| 단계 | L1 miss | IPC | Throughput |
|---|---|---|---|
| Original | 33% | 0.6 | 1.5x speedup |
| + Padding | 12% | 1.2 | 3.5x |
| + Per-thread | 8% | 1.5 | 3.9x |
| + SoA | 4% | 1.8 | 6.5x |
| + NEON | 4% | 2.4 | 12x ← !! |

총 *8x throughput*. Frame 처리 50 ms → 6 ms.

## 진단 도구 정리

```bash
# 1. Hot spot 탐지
perf stat -e cycles,instructions,cache-misses ./prog

# 2. False sharing 진단
perf c2c record ./prog
perf c2c report

# 3. Cache line 사용 효율
perf stat -e L1-dcache-loads,L1-dcache-load-misses,\
LLC-loads,LLC-load-misses ./prog

# 4. Memory bandwidth
perf stat -e mem_inst_retired.all_loads,mem_inst_retired.all_stores ./prog

# 5. NUMA·remote access
perf stat -e r2D ./prog   # Cortex-A REMOTE_ACCESS
```

## VTune Memory Access (Intel)

```bash
vtune -collect memory-access ./prog
vtune-gui

# UI:
#   - Per-line latency
#   - Local vs remote DRAM
#   - L1·L2·L3·DRAM bandwidth chart
#   - Contended cache lines
```

VTune — 가장 강력한 cache 진단.

## Lesson Learned

```text
1. False sharing은 *예상 못한* slowdown
2. Atomic 자주 = lock contention과 비슷한 효과
3. AoS는 *전체 fetch* 필요한 경우만 OK
4. SoA + SIMD = throughput의 곱셈
5. perf c2c는 *false sharing 직접 진단* 유일
```

## 자동차·자율주행 적용

```text
점군·picture cloud·sensor fusion:
  - 매 frame 수십 만 elements
  - Multi-thread parallel
  - False sharing 발생 시 — frame drop

SoA + alignas(64) + per-thread accumulation =
  자율주행 perception pipeline의 표준 패턴
```

## 자주 하는 실수

> ⚠️ L1 miss rate만 보고 cache 문제 결론

```text
L1 miss 20% — bandwidth bound? compute bound?
```

→ IPC + memory bandwidth 함께 측정.

> ⚠️ Padding만 하면 해결?

```text
False sharing 해결 — but stride access·conflict miss 남음
```

→ 모든 cache miss 원인 측정.

> ⚠️ SoA를 random access에

```c
for (int i = 0; i < N; i++) {
    int idx = indices[i];   /* random */
    use(pcd.x[idx], pcd.y[idx], pcd.z[idx]);
}
```

→ Random access — AoS가 더 효율 (1 cache fetch, vs 3).

> ⚠️ Atomic 줄이고 race

```c
local_count++;   /* race — but accepted (statistical)? */
```

→ atomic 또는 *thread-local + 끝에서 atomic merge*.

## 정리

- **L1 miss 30%** = thrashing 의심 — perf로 확인.
- **perf c2c** = false sharing 직접 진단.
- 해결 — **padding·per-thread·SoA·SIMD** 조합.
- 8x throughput 향상.
- 자율주행 perception — SoA + NEON 표준.
- VTune·Streamline = cache 분석 강력.

다음 편은 **Lock Contention**.

## 관련 항목

- [6-01: ISR Latency](/blog/embedded/performance-engineering/part6-01-case-isr-latency)
- [6-03: Lock Contention](/blog/embedded/performance-engineering/part6-03-case-lock-contention)
- [4-02: False Sharing](/blog/embedded/performance-engineering/part4-02-false-sharing)
