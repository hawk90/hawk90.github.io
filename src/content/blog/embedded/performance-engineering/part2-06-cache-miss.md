---
title: "Cache Miss 3C Model 분석 — Compulsory·Capacity·Conflict"
slug: "embedded/performance-engineering/part2-06-cache-miss"
date: 2026-04-24T09:05:00
description: "Compulsory·Capacity·Conflict miss를 Cachegrind로 고정한 캐시에서 하나씩 만들어 세고, M2 Pro에서 stride·tiling·prefetch의 효과를 잽니다."
series: "Embedded Performance Engineering"
seriesOrder: 14
tags: [cache, miss, compulsory, capacity, conflict, 3c]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> **"3C — Compulsory·Capacity·Conflict"**입니다. 각각 원인과 대응이 다릅니다.

## 실험 환경 — Cachegrind로 캐시를 고정하기

miss의 종류를 가르려면 캐시 크기와 associativity를 정확히 알아야 합니다. 그래서 이 글의 3C 실험은 Valgrind 3.24의 Cachegrind로 돌렸습니다. Cachegrind는 프로그램의 메모리 접근을 지정한 캐시 모델에 넣어 hit·miss를 셉니다. L1 D-cache를 32 KiB, 4-way, 64 byte line(`--D1=32768,4,64`)으로 고정했습니다. Cortex-A53이 구성할 수 있는 L1D 크기 중 하나이고, A53의 L1D도 4-way·64 byte line입니다(A53 TRM 6.1). 다만 A53의 교체 정책은 pseudo-random(TRM 2.1.6)이므로 Cachegrind 모델과 같지는 않습니다.

```bash
gcc -O2 -fno-tree-vectorize -g -o c3 c3.c
valgrind --tool=cachegrind --cache-sim=yes --D1=32768,4,64 --LL=8388608,16,64 ./c3 <mode>
```

프로그램은 `bench/c3/c3.c`, 실행은 Debian 13 게스트입니다. 아래 표의 D1 miss 수에는 `sum`을 `volatile`로 둔 탓에 생긴 쓰기 접근도 섞여 있지만, 쓰기 miss는 모든 경우에 392개 안팎으로 같습니다.

## Compulsory Miss (Cold Miss)

**처음 접근**하는 line은 반드시 miss입니다. 캐시에 아직 없기 때문입니다.

16 KiB(`int` 4,096개)를 100번 더하면, 16 KiB = 256 line이 32 KiB 캐시에 다 들어가므로 첫 번째 pass의 miss만 남습니다.

| 모드 | D refs | D1 miss | miss rate |
|---|---:|---:|---:|
| `cap16`: 16 KiB × 100회 | 1,268,342 | 1,786 | 0.1% |

compulsory miss는 피할 수 없지만 latency는 숨길 수 있습니다. 다음 line을 미리 요청하는 prefetch가 그 방법입니다(아래 Prefetch 절). Cortex-A53 TRM 6.1은 L1 data 메모리 시스템의 특징으로 "Data side prefetch engine"을 듭니다.

## Capacity Miss

**Working set이 캐시보다 크면** 다시 쓰기 전에 쫓겨납니다.

| 모드 | D refs | D1 miss | miss rate |
|---|---:|---:|---:|
| `cap64`: 64 KiB × 100회 | 4,954,751 | 104,013 | 2.1% |
| `block64`: 같은 64 KiB를 8 KiB 블록마다 100회씩 | 4,954,755 | 2,637 | 0.1% |

64 KiB는 1,024 line이고 캐시는 512 line입니다. 처음부터 끝까지 순서대로 훑으면 다음 pass가 시작될 때 앞쪽 line은 이미 쫓겨나 있어, 매 pass 1,024 line이 모두 miss입니다(100 × 1,024 = 102,400). 같은 일을 8 KiB 블록 단위로 바꿔 한 블록을 100번 끝낸 뒤 다음 블록으로 넘어가면, miss는 블록마다 첫 번째 pass의 것만 남아 2,637개가 됩니다. 접근 횟수는 같고 순서만 바뀌었습니다. 이것이 **blocking / tiling**입니다.

```c
#define BLOCK 2048   /* int 2,048개 = 8 KiB */
for (b = 0; b < 16384; b += BLOCK)
    for (iter = 0; iter < 100; iter++)
        for (i = b; i < b + BLOCK; i++)
            sum += buf[i];
```

## Conflict Miss

캐시 전체에는 자리가 있어도, 같은 set으로 몰리는 line이 way 수보다 많으면 서로를 쫓아냅니다. 32 KiB, 4-way, 64 byte line이면 set은 32768 / (4 × 64) = 128개이고, 주소가 8 KiB(= 128 × 64) 간격이면 같은 set입니다.

8 KiB 배열 다섯 개를 정확히 8 KiB 간격으로 붙여 두고 `A[i] += B[i] + C[i] + D[i] + E[i]`를 100번 돌렸습니다. 다섯 배열의 같은 위치는 모두 같은 set으로 갑니다. 그다음 배열마다 시작 주소를 64 byte(line 하나)씩 더 밀어 다시 돌렸습니다.

| 모드 | D refs | D1 miss | miss rate |
|---|---:|---:|---:|
| `conf5`: 8 KiB 간격 | 1,268,354 | 1,025,614 | 80.9% |
| `conf5p`: 배열마다 +64 B padding | 1,268,362 | 65,614 | 5.2% |

`conf5`에서는 반복마다 다섯 line이 4-way set 하나를 다투므로 원소마다 miss가 납니다(5 × 2,048 × 100 = 1,024,000). padding을 넣으면 다섯 line이 서로 다른 set으로 흩어져 conflict가 사라집니다. 그래도 65,614개가 남는 것은 다섯 배열의 합 40 KiB가 32 KiB 캐시보다 커서, 매 pass 5 × 128 line이 capacity miss로 남기 때문입니다(5 × 128 × 100 = 64,000). padding은 conflict miss를 없앨 뿐 capacity miss는 그대로 둡니다.

```c
/* padding: 배열 사이에 line 하나를 끼워 set을 어긋나게 함 */
int A[2048];
char pad1[64];
int B[2048];
char pad2[64];
int C[2048];
```

전역 변수 사이의 padding이 실제로 주소를 그만큼 띄우는지는 링커 배치에 달려 있으므로, 위 실험처럼 한 배열 안에서 offset으로 나누거나 `nm`으로 주소를 확인합니다.

## 실제 하드웨어 — 2의 거듭제곱 stride

같은 현상을 M2 Pro에서 봅니다. `int m[1024][W]`를 열 방향으로 더하면 안쪽 루프가 `W × 4` byte씩 건너뜁니다. W = 1024이면 stride가 4,096 byte로 2의 거듭제곱이고, W = 1025이면 4,100 byte입니다(`bench/c3/col.c`, `clang -O2`, 20 pass, 각 3회).

| 순서 | W | 원소당 시간 (3회) |
|---|---:|---|
| 행 방향 | 1024 | 0.055, 0.050, 0.052 ns |
| 열 방향 | 1024 | 1.869, 2.968, 1.464 ns |
| 열 방향 | 1025 | 0.494, 0.648, 0.659 ns |

열 방향은 행 방향보다 수십 배 느리고, 그중에서도 stride 4,096 byte는 4,100 byte보다 중앙값 기준 2.9배(실행 조합에 따라 2.2~6배) 느렸습니다. 원소 하나 차이(4 byte)로 같은 데이터, 같은 접근 횟수의 시간이 달라진 것은 4,096 byte 간격의 주소들이 같은 set으로 몰렸기 때문으로 해석할 수 있지만, M2 Pro의 캐시 index 함수는 공개되어 있지 않아 이 측정으로 원인을 확정하지는 않았습니다.

## 측정 — PMU 이벤트

Cortex-A53 TRM 12.9 표 12-28의 캐시 이벤트입니다.

| 번호 | 이름 | 설명 |
|---|---|---|
| 0x01 | L1I_CACHE_REFILL | L1 Instruction cache refill |
| 0x03 | L1D_CACHE_REFILL | L1 Data cache refill |
| 0x04 | L1D_CACHE | L1 Data cache access |
| 0x14 | L1I_CACHE | L1 Instruction cache access |
| 0x16 | L2D_CACHE | L2 Data cache access |
| 0x17 | L2D_CACHE_REFILL | L2 Data cache refill |

$$\text{L1 miss rate} = \frac{\text{L1D\_CACHE\_REFILL}}{\text{L1D\_CACHE}}, \quad \text{L2 miss rate} = \frac{\text{L2D\_CACHE\_REFILL}}{\text{L2D\_CACHE}}$$

```bash
perf stat -e r03,r04,r17,r16 ./prog
```

이 시리즈의 게스트에는 PMU 카운터가 없어 실행하지 못했습니다(1-01). 하드웨어 카운터는 miss의 *개수*만 알려 주고 3C 중 무엇인지는 알려 주지 않습니다. 원인을 가르려면 위처럼 크기·간격·순서를 하나씩 바꿔 보거나, Cachegrind처럼 캐시를 고정한 모델로 돌려 봅니다.

## Cold vs Capacity vs Conflict 구분

| 증상 | 원인 | 위 실험 |
|---|---|---|
| 첫 pass만 miss, 이후 hit | **Compulsory** | `cap16` |
| working set을 캐시보다 작게 쪼개면 사라짐 | **Capacity** | `cap64` → `block64` |
| 크기는 그대로인데 주소 간격만 바꾸면 사라짐 | **Conflict** | `conf5` → `conf5p` |

## False Sharing (SMP 시)

```c
struct {
    int counter_a;   // CPU 0 사용
    int counter_b;   // CPU 1 사용
} stats;
```

두 변수가 같은 cache line에 있으면 한 CPU가 쓸 때마다 다른 CPU의 그 line이 무효화됩니다. 3C와는 다른 coherence 문제이며 4-02에서 측정합니다. 떼어 놓을 거리는 C++17의 `std::hardware_destructive_interference_size`로 얻을 수 있는데, 이 값은 실제 line 크기와 다를 수 있습니다. Apple clang 21(libc++, macOS arm64)과 Debian GCC 14.2(aarch64) 모두 이 값이 256이었고, `hardware_constructive_interference_size`는 64였습니다(`bench/c3/hdi.cc`). M2 Pro의 `hw.cachelinesize`는 128, A53의 line은 64 byte입니다.

## Loop Tiling 실전

```c
/* N = 1024 float 행렬 셋 = 12 MiB */
for (i = 0; i < N; i++)
    for (j = 0; j < N; j++)
        for (k = 0; k < N; k++)
            C[i][j] += A[i][k] * B[k][j];

/* 64×64 블록. 블록 셋 = 3 × 64 × 64 × 4 B = 48 KiB */
#define BS 64
for (ii = 0; ii < N; ii += BS)
    for (jj = 0; jj < N; jj += BS)
        for (kk = 0; kk < N; kk += BS)
            for (i = ii; i < ii + BS; i++)
                for (j = jj; j < jj + BS; j++)
                    for (k = kk; k < kk + BS; k++)
                        C[i][j] += A[i][k] * B[k][j];
```

M2 Pro에서 두 버전을 `clang -O2`로 돌렸습니다(`bench/c3/mm.c`, 각 3회). 결과 행렬의 대각합은 두 버전이 같았습니다.

| 버전 | 시간 (3회) |
|---|---|
| naive i-j-k | 1.574, 1.450, 1.385 s |
| 64×64 tiled | 0.887, 0.915, 0.916 s |

연산 수는 같고 접근 순서만 바꿨는데 1.6배 빨라졌습니다.

## Prefetch — Software vs Hardware

### Hardware Prefetcher

Cortex-A53 TRM 6.1은 L1 data 쪽에 prefetch engine이 있다고 적습니다. 어떤 패턴을 감지하는지는 이 절에 나오지 않습니다.

### Software Prefetch

GCC·clang의 `__builtin_prefetch(addr, rw, locality)`는 대상에 맞는 prefetch 명령을 냅니다. `clang -O2`(arm64)는 `prfm pldl1strm`, `arm-none-eabi-gcc` 16.2(`-mcpu=cortex-m4`, `cortex-m7`)는 `pld [r0, #64]`를 냈습니다(`bench/c3/pf-asm.log`).

```c
for (i = 0; i < N; i++) {
    __builtin_prefetch(&t[idx[i + D]], 0, 0);   // D번 뒤에 쓸 원소
    s += t[idx[i]];
}
```

M2 Pro에서 256 MiB 표를 무작위 인덱스로 1,600만 번 읽으며 거리 D를 바꿔 보았습니다(`bench/c3/pf.c`, 각 3회).

| D | 원소당 시간 (3회) |
|---:|---|
| prefetch 없음 | 4.80, 4.75, 4.65 ns |
| 4 | 5.74, 5.72, 5.81 ns |
| 16 | 5.62, 5.29, 4.74 ns |
| 64 | 4.42, 4.29, 4.48 ns |
| 256 | 4.62, 5.89, 5.49 ns |
| 1024 | 6.63, 5.41, 5.63 ns |

prefetch 없이도 원소당 4.7 ns로, 2-05에서 잰 메모리 왕복 120 ns보다 훨씬 짧습니다. 각 원소의 load가 서로 독립이라 out-of-order 코어가 이미 수십 개를 겹쳐 기다리고 있기 때문입니다(2-04). 그래서 software prefetch의 이득은 D = 64에서 7% 정도였고, 거리가 맞지 않으면 명령만 늘어 오히려 느려졌습니다. software prefetch가 효과를 보는 곳은 코어가 스스로 겹치지 못하는 경우, 즉 in-order 코어(A53은 L1 data miss를 동시에 3개까지 처리, TRM 6.1)나 앞 load의 결과로 다음 주소가 정해지는 경우입니다. 거리는 이렇게 재서 정합니다.

## 자주 하는 실수

> ⚠️ Powers of 2 array stride

위 M2 Pro 측정에서 `int m[1024][1024]`의 열 방향 순회는 `m[1024][1025]`보다 중앙값 기준 2.9배 느렸습니다. 열 방향으로 돌아야 한다면 행 길이에 padding을 넣거나, 데이터를 전치해 행 방향으로 바꿉니다.

> ⚠️ Padding으로 모든 miss가 사라진다는 가정

`conf5p`처럼 padding은 conflict miss만 없앱니다. working set이 캐시보다 크면 capacity miss는 그대로 남으므로, 그때는 blocking으로 working set을 줄입니다.

> ⚠️ Software prefetch를 측정 없이 넣기

무작위 gather에서 D = 4나 1024의 prefetch는 오히려 느렸습니다. 거리를 바꿔 가며 재고, 이득이 없으면 뺍니다.

> ⚠️ 하드웨어 카운터만으로 원인 단정

refill 횟수는 3C를 구분하지 않습니다. 크기·간격·순서를 하나씩 바꾸는 실험으로 원인을 가립니다.

## 정리

- Cachegrind(32 KiB, 4-way, 64 B)에서 64 KiB 반복 순회는 매 pass 1,024 line이 capacity miss였고, 블록 단위로 바꾸자 104,013 → 2,637로 줄었습니다.
- 8 KiB 간격의 배열 다섯 개는 80.9% miss(conflict)였고, line 하나씩 padding하자 5.2%가 됐습니다. 남은 것은 capacity miss입니다.
- M2 Pro에서 stride 4,096 byte 열 순회는 4,100 byte보다 중앙값 기준 2.9배 느렸습니다. 64×64 tiling은 행렬곱을 1.6배 빠르게 했습니다.
- 무작위 gather에서 software prefetch의 이득은 최대 7%였습니다. out-of-order 코어는 독립 miss를 이미 겹칩니다.
- PMU의 refill 카운터는 miss 수만 셉니다. 3C 구분은 실험으로 합니다.

다음 편은 **Cache Line 최적화**입니다.

## 관련 항목

- [2-05: Cache 기초](/blog/embedded/performance-engineering/part2-05-cache-basics)
- [2-07: Cache Line 최적화](/blog/embedded/performance-engineering/part2-07-cache-line)
- [2-08: Memory Bandwidth](/blog/embedded/performance-engineering/part2-08-memory-bandwidth)

## 참고 자료

- [Valgrind Cachegrind manual](https://valgrind.org/docs/manual/cg-manual.html)
- Cortex-A53 MPCore Technical Reference Manual (DDI 0500E) 2.1.6, 6.1, 12.9 표 12-28
