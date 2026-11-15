---
title: "Cache Miss 3C Model 분석 — Compulsory·Capacity·Conflict"
slug: "embedded/performance-engineering/part2-06-cache-miss"
date: 2026-04-24T09:05:00
description: "Cold/Compulsory, Capacity (working set > cache), Conflict (associativity 한계)."
series: "Embedded Performance Engineering"
seriesOrder: 14
tags: [cache, miss, compulsory, capacity, conflict, 3c]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> **"3C — Compulsory·Capacity·Conflict"**입니다. 각각 원인과 대응이 다릅니다.

## Compulsory Miss (Cold Miss)

**처음 access** 시 무조건 miss입니다. Cache가 비어 있기 때문입니다.

```c
int data[1000] = {0};   // 초기화·할당만으로 cache miss를 단정하지 않음
sum += data[0];          // 이 주소의 cache state가 cold라면 compulsory miss
```

해결책은 사실상 불가피하지만, **prefetch**로 latency를 숨길 수 있습니다.

```c
__builtin_prefetch(&data[i+16], 0, 0);   // 16 element 앞 prefetch
for (i = 0; i < N; i++) {
    sum += data[i];
}
```

ARM에서는 `pld`(preload data) 명령을 사용합니다.

## Capacity Miss

**Working set이 cache 크기를 초과**하면 데이터가 반복적으로 evict되고 다시 load됩니다.

```c
// L1 D-cache 32 KB
int buf[16384];   // 64 KB → cache 못 다 넣음

for (iter = 0; iter < 100; iter++) {
    for (i = 0; i < 16384; i++) {
        sum += buf[i];   // 매 iter capacity miss
    }
}
```

해결책은 **blocking / tiling**입니다.

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

각 BLOCK이 cache 안에 머무는 동안 iter를 100번 처리합니다.

## Conflict Miss

**Set associativity 한계** 때문에 같은 set으로 mapping되는 데이터들이 서로를 evict합니다.

```c
// 4-way set assoc cache, line size 64
int A[2048];   // 8 KB
int B[2048];   // 8 KB
int C[2048];

// A, B, C가 같은 set에 mapping된다면
for (i = 0; i < 2048; i++) {
    A[i] += B[i] * C[i];   // 같은 set에 mapping되어도 3 line이 4-way에 들어가면 이 셋만으로 thrash하지 않음
}
```

해결책:
- **Padding**: array 크기를 non-power-of-2로 조정
- **Loop fission**: 한 번에 적은 변수만 access
- **Cache line padding**: 변수 사이에 padding 삽입

```c
int A[2048];
char pad1[64];   // line offset 변경
int B[2048];
char pad2[64];
int C[2048];
```

## 측정 — PMU 이벤트

아래 raw event 번호는 Cortex-A53 예시입니다. 커널 PMU driver, core revision과 event 의미를 확인하고, 다른 코어에 그대로 적용하지 않습니다.

**Cortex-A53 perf events:**

- 0x03 L1D_CACHE_REFILL    L1 D 미스 (refill 횟수)
- 0x04 L1D_CACHE           L1 D 액세스
- 0x01 L1I_CACHE_REFILL    L1 I 미스
- 0x14 L1I_CACHE           L1 I 액세스
- 0x17 L2D_CACHE_REFILL    L2 D 미스
- 0x16 L2D_CACHE           L2 D 액세스

$$\text{L1 miss rate} = \frac{\text{L1D\_CACHE\_REFILL}}{\text{L1D\_CACHE}}, \quad \text{L2 miss rate} = \frac{\text{L2D\_CACHE\_REFILL}}{\text{L2D\_CACHE}}$$

```bash
perf stat -e r03,r04,r17,r16 ./prog

# 해석은 target workload와 cache level에 따라 달라지므로 보편 임계값을 두지 않음
```

## Cold vs Capacity vs Conflict 구분

| 증상 | 원인 |
|---|---|
| 첫 실행만 느리고 두 번째부터 빠르면 | **Compulsory**(해소됨) |
| 매번 일정하게 느리지만 작은 데이터엔 빠르면 | **Capacity**(working set 축소로 해결) |
| 특정 stride에서만 느리면 | **Conflict**(padding으로 해결) |

## Stride Pattern과 Conflict

```c
// L1 D = 32 KB, 4-way set assoc, 64 byte line
// → 128 set, set당 4 line
// → 같은 set 주기 = 32 KB / 4 = 8 KB

int A[2048], B[2048], C[2048], D[2048], E[2048]; // 각 배열 8 KB
// 배열 시작 주소가 cache size 간격이면 대응 line이 같은 set으로 mapping될 수 있음
for (i = 0; i < 2048; i++) {
    A[i] += B[i] + C[i] + D[i] + E[i];  // 같은 set의 5 lines > 4 ways
}
```

`malloc`의 정렬은 구현이 보장하는 요구 수준과 allocator 동작을 따릅니다. page-aligned 주소나 특정 conflict를 일반화하지 말고, 실제 주소·stride·cache geometry를 측정해 확인합니다.

## False Sharing (SMP 시)

```c
struct {
    int counter_a;   // CPU 0 사용
    int counter_b;   // CPU 1 사용
} stats;
```

두 변수가 같은 cache line에 있으면 한 CPU가 쓸 때 다른 CPU의 cache가 invalidate됩니다. Conflict miss와 비슷한 양상이지만 cache coherence 차원의 문제입니다.

해결책은 **line padding**입니다.

```c
struct {
    int counter_a;
    char pad1[60];   // line 분리
    int counter_b;
    char pad2[60];
} stats;
```

C++17에서는 `alignas(std::hardware_destructive_interference_size)`를 활용합니다.

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

GEMM(matrix multiply)의 표준 최적화 기법입니다. BLIS·MKL·OpenBLAS 모두 multi-level tiling을 사용합니다.

## Prefetch — Software vs Hardware

### Hardware Prefetcher

일부 Cortex-A 코어에는 hardware prefetcher가 있지만 지원 패턴과 제어는 구현별입니다. 대상 TRM에서 확인합니다. 같은 간격으로 access하는 패턴을 발견하면 자동으로 prefetch합니다.

### Software Prefetch

```c
for (i = 0; i < N; i++) {
    __builtin_prefetch(&A[i + 16]);   // 16 element 앞
    sum += A[i];
}
```

거리는 *cache miss latency / 명령 latency* 정도로 잡습니다. L1 miss가 100 cycle이고 명령이 1 cycle이라면 100 element 앞을 prefetch합니다.

너무 가까우면 효과가 없고, 너무 멀면 prefetch한 데이터가 cache에서 폐기됩니다.

## Inclusive vs Exclusive Cache 영향

**Intel (inclusive):**

- L2 miss → L1·L2 둘 다 update → L1 conflict 가능

**ARM (exclusive):**

- L2 miss → L1만 update, L2엔 안 들어감
- L1 evict → L2 victim cache로 입력

ARM은 작은 L2도 효율적이라 데이터를 잘 retention합니다.

## 자주 하는 실수

> ⚠️ "Random access 가 cache friendly" 오해

```c
for (i = 0; i < N; i++) {
    sum += data[random_index[i]];   // ← random — prefetcher 동작 안 함
}
```

Prefetcher가 감지하는 패턴은 구현별입니다. random access가 매번 cache miss를 일으키는 것은 아니며, working set과 cache state에 따라 hit/miss가 달라집니다.

> ⚠️ 깊은 union, struct로 false sharing

```c
struct {
    atomic_int next_id;   // hot
    char name[60];
    atomic_int counter;   // hot
} thing;
```

두 atomic이 같은 line에 있으면 SMP에서 false sharing이 발생합니다. 반드시 분리해야 합니다.

> ⚠️ Powers of 2 array stride

```c
int matrix[1024][1024];   // 4 MB
sum += matrix[i][j];      // stride 4096 byte = page size — TLB miss·conflict
```

→ `int matrix[1024][1025]`나 `[1024][1024 + padding]` 형태로 padding을 추가해야 합니다.

> ⚠️ Cold miss 무시

```c
init_huge_array(arr);   // 처음 한 번 — 모든 line cold miss
process(arr);            // 작은 working set — fast
```

큰 array 초기화의 cold miss 비용은 무시할 수 없습니다. 지연 초기화를 고려해야 합니다.

## 정리

- 3C는 **Compulsory·Capacity·Conflict**입니다.
- Compulsory는 prefetch로 latency를 숨깁니다.
- Capacity는 **blocking/tiling**으로 working set을 축소합니다.
- Conflict는 **padding이나 rearrangement**로 해결합니다.
- 측정은 PMU의 L1D_CACHE_REFILL로 합니다.
- False sharing은 SMP에서 cache coherence 때문에 생기는 별도 현상이며 3C cache miss taxonomy와 구분합니다.

다음 편은 **Cache Line 최적화**입니다.

## 관련 항목

- [2-05: Cache 기초](/blog/embedded/performance-engineering/part2-05-cache-basics)
- [2-07: Cache Line 최적화](/blog/embedded/performance-engineering/part2-07-cache-line)
- [2-08: Memory Bandwidth](/blog/embedded/performance-engineering/part2-08-memory-bandwidth)
