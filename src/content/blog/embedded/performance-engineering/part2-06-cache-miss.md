---
title: "2-06: Cache Miss — 3C Model·Compulsory·Capacity·Conflict"
date: 2026-05-13T13:00:00
description: "Cold/Compulsory, Capacity (working set > cache), Conflict (associativity 한계)."
series: "Embedded Performance Engineering"
seriesOrder: 14
tags: [cache, miss, compulsory, capacity, conflict, 3c]
draft: true
---

## 한 줄 요약

> **"3C — Compulsory·Capacity·Conflict"** — 각각 원인·대응이 다름.

## Compulsory Miss (Cold Miss)

**처음 access** 시 무조건 miss. Cache 비어 있음.

```c
int data[1000];   // 새로 할당 — cache 안에 없음
sum += data[0];   // ← compulsory miss
```

해결 — *불가피*. 다만 **prefetch**로 *latency hiding*.

```c
__builtin_prefetch(&data[i+16], 0, 0);   // 16 element 앞 prefetch
for (i = 0; i < N; i++) {
    sum += data[i];
}
```

ARM `pld` (preload data) 명령.

## Capacity Miss

**Working set > cache 크기** → 데이터가 *반복 evict + 재load*.

```c
// L1 D-cache 32 KB
int buf[16384];   // 64 KB → cache 못 다 넣음

for (iter = 0; iter < 100; iter++) {
    for (i = 0; i < 16384; i++) {
        sum += buf[i];   // 매 iter capacity miss
    }
}
```

해결 — **blocking / tiling**:

```c
#define BLOCK 4096   // L1 안에 들어가게
for (b = 0; b < 16384; b += BLOCK) {
    for (iter = 0; iter < 100; iter++) {
        for (i = b; i < b + BLOCK; i++) {
            sum += buf[i];
        }
    }
}
```

각 BLOCK이 *cache 안에 머무는 동안* iter 100번 처리.

## Conflict Miss

**Set associativity 한계** — 같은 set으로 mapping되는 데이터들이 *서로 evict*.

```c
// 4-way set assoc cache, line size 64
int A[2048];   // 8 KB
int B[2048];   // 8 KB
int C[2048];

// A, B, C가 같은 set에 mapping된다면
for (i = 0; i < 2048; i++) {
    A[i] += B[i] * C[i];   // 매 access conflict
}
```

해결:
- **Padding** — array 크기를 *비non-power-of-2*로
- **Loop fission** — 한 번에 적은 변수만 access
- **Cache line padding** between

```c
int A[2048];
char pad1[64];   // line offset 변경
int B[2048];
char pad2[64];
int C[2048];
```

## 측정 — PMU 이벤트

```c
/* Cortex-A53 perf events */
0x03 L1D_CACHE_REFILL    // L1 D 미스 (refill 횟수)
0x04 L1D_CACHE           // L1 D 액세스
0x01 L1I_CACHE_REFILL    // L1 I 미스
0x14 L1I_CACHE           // L1 I 액세스
0x17 L2D_CACHE_REFILL    // L2 D 미스
0x16 L2D_CACHE           // L2 D 액세스

L1 miss rate = L1D_CACHE_REFILL / L1D_CACHE
L2 miss rate = L2D_CACHE_REFILL / L2D_CACHE
```

```bash
perf stat -e r03,r04,r17,r16 ./prog

# 좋음: L1 miss < 5%, L2 miss < 30%
# 나쁨: L1 miss > 15%
```

## Cold vs Capacity vs Conflict 구분

| 증상 | 원인 |
|---|---|
| 첫 실행만 느림, 두 번째부터 빠름 | **Compulsory** (해소됨) |
| 매번 일정하게 느림, 작은 데이터엔 빠름 | **Capacity** (working set 줄이면 해결) |
| 특정 stride에서만 느림 | **Conflict** (padding으로 해결) |

## Stride Pattern과 Conflict

```c
// L1 D = 32 KB, 4-way set assoc, 64 byte line
// → 128 set, set당 4 line
// → 같은 set 주기 = 32 KB / 4 = 8 KB

int A[2048];  // 8 KB — set 모두 다 차지
int B[2048];  // 8 KB — A와 같은 set들에 매핑 → conflict

for (i = 0; i < 2048; i++) {
    A[i] = B[i];   // ← 매번 conflict
}
```

C 표준 `malloc`도 *page align* — *8KB·64KB 등의 멋진 숫자에 정렬* → conflict 빈번.

## False Sharing (SMP 시)

```c
struct {
    int counter_a;   // CPU 0 사용
    int counter_b;   // CPU 1 사용
} stats;
```

두 변수가 *같은 cache line* → 한 CPU 쓰면 *다른 CPU cache invalidate*. Conflict miss와 비슷 (cache coherence 차원).

해결 — **line padding**:

```c
struct {
    int counter_a;
    char pad1[60];   // line 분리
    int counter_b;
    char pad2[60];
} stats;
```

C++17 — `alignas(std::hardware_destructive_interference_size)`.

## Loop Tiling 실전

```c
/* 회피 — N=1024, working set 8MB */
for (i = 0; i < N; i++)
    for (j = 0; j < N; j++)
        for (k = 0; k < N; k++)
            C[i][j] += A[i][k] * B[k][j];

/* Good — block 64×64, working set 48 KB */
#define B 64
for (ii = 0; ii < N; ii += B)
    for (jj = 0; jj < N; jj += B)
        for (kk = 0; kk < N; kk += B)
            for (i = ii; i < ii+B; i++)
                for (j = jj; j < jj+B; j++)
                    for (k = kk; k < kk+B; k++)
                        C[i][j] += A[i][k] * B[k][j];
```

GEMM (matrix multiply) 표준 최적화. BLIS·MKL·OpenBLAS 모두 *multi-level tiling*.

## Prefetch — Software vs Hardware

### Hardware Prefetcher

Cortex-A57 이상 — *stride detect*. 같은 간격 access 패턴 발견 시 *자동 prefetch*.

### Software Prefetch

```c
for (i = 0; i < N; i++) {
    __builtin_prefetch(&A[i + 16]);   // 16 element 앞
    sum += A[i];
}
```

거리 — *cache miss latency / 명령 latency* 정도. L1 miss 100 cycle, 명령 1 cycle → 100 element 앞.

너무 가까우면 효과 없음, 너무 멀면 *cache 폐기됨*.

## Inclusive vs Exclusive Cache 영향

```text
Intel (inclusive):
  L2 miss → L1·L2 둘 다 update → L1 conflict 가능

ARM (exclusive):
  L2 miss → L1만 update, L2엔 안 들어감
  L1 evict → L2 victim cache로 입력
```

ARM은 *작은 L2*도 효율 — 빅데이터 retention 잘 됨.

## 자주 하는 실수

> ⚠️ "Random access 가 cache friendly" 오해

```c
for (i = 0; i < N; i++) {
    sum += data[random_index[i]];   // ← random — prefetcher 동작 안 함
}
```

Hardware prefetch는 *stride detect만*. Random은 매번 cold miss.

> ⚠️ 깊은 union, struct로 false sharing

```c
struct {
    atomic_int next_id;   // hot
    char name[60];
    atomic_int counter;   // hot
} thing;
```

두 atomic이 *같은 line* → SMP false sharing. 분리 필요.

> ⚠️ Powers of 2 array stride

```c
int matrix[1024][1024];   // 4 MB
sum += matrix[i][j];      // stride 4096 byte = page size — TLB miss·conflict
```

→ `int matrix[1024][1025]` 또는 `[1024][1024 + padding]`.

> ⚠️ Cold miss 무시

```c
init_huge_array(arr);   // 처음 한 번 — 모든 line cold miss
process(arr);            // 작은 working set — fast
```

큰 array 초기화의 *cold miss 비용*은 무시 못 함. *지연 초기화* 고려.

## 정리

- 3C — **Compulsory·Capacity·Conflict**.
- Compulsory — prefetch로 hide.
- Capacity — **blocking/tiling**으로 working set 축소.
- Conflict — **padding·rearrangement**.
- PMU L1D_CACHE_REFILL로 측정.
- False sharing은 SMP의 또 다른 conflict.

다음 편은 **Cache Line 최적화**.

## 관련 항목

- [2-05: Cache 기초](/blog/embedded/performance-engineering/part2-05-cache-basics)
- [2-07: Cache Line 최적화](/blog/embedded/performance-engineering/part2-07-cache-line)
- [2-08: Memory Bandwidth](/blog/embedded/performance-engineering/part2-08-memory-bandwidth)
