---
title: "False Sharing 진단 — Cache Line Ping-Pong·Padding·측정"
slug: "embedded/performance-engineering/part4-02-false-sharing"
date: 2026-04-26T09:01:00
description: "False sharing 원인. Cache coherence ping-pong. Padding으로 line 분리. 측정 방법."
series: "Embedded Performance Engineering"
seriesOrder: 31
tags: [false-sharing, cacheline, padding, coherence]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> 서로 다른 변수를 다루어도 같은 coherence 단위(cache line)에 있고 적어도 한쪽이 쓰면, 그 line이 코어 사이를 오가며 느려집니다. Apple M2 Pro에서 4 thread가 8바이트 간격 atomic 카운터를 증가시키자 256바이트 간격보다 약 10배 느렸습니다.

## 메커니즘

같은 사무실의 화이트보드 하나를 두 팀이 나눠 쓰는 상황을 떠올려 보면 됩니다. 각자 자기 칸에만 쓰는데도, 한 팀이 쓰는 동안 다른 팀은 보드를 넘겨받을 때까지 기다려야 합니다. 캐시도 변수 단위가 아니라 line 단위로 소유권을 주고받기 때문에 같은 일이 생깁니다.

[Linux 6.12 false-sharing 문서](https://www.kernel.org/doc/html/v6.12/kernel-hacking/false-sharing.html)는 false sharing의 조건을 두 가지로 정리합니다. 여러 CPU가 같은 cache line 안의 데이터에 동시에 접근하고, 그중 적어도 하나가 쓰기(write/write 또는 write/read)여야 합니다. 같은 문서는 한 CPU가 한 field를 고치면, 같은 line의 다른 field를 읽기만 하는 CPU들도 그 line 전체를 다시 가져와야 한다고 설명합니다.

![64-byte coherence line을 가정한 두 코어의 다른 변수 접근과 ownership 이동](/images/blog/perf-eng/diagrams/part4-02-false-sharing.svg)

그림은 64바이트 line을 가정했습니다. 아래 측정에서 보듯 M2 Pro에서는 64바이트 간격으로 떼어 놓아도 아직 느렸고, 128바이트부터 차이가 사라졌습니다. line 크기는 CPU마다 다르므로 대상에서 직접 확인합니다.

## 배치부터 확인 — 배열 시작 정렬과 원소 stride

padding을 넣기 전에 "line이 몇 바이트인가"를 먼저 물어봐야 합니다. 그런데 이 값을 알려 주는 출처가 셋이고, 같은 기계에서도 답이 달랐습니다.

| 출처 | M2 Pro 네이티브 | Debian 게스트 (같은 M2 Pro) |
|---|---:|---:|
| `sysctl hw.cachelinesize` | 128 | — |
| `getconf LEVEL1_DCACHE_LINESIZE` | — | 64 |
| `std::hardware_destructive_interference_size` | 256 (Apple clang 21.0.0) | 256 (g++ 14.2.0) |
| `std::hardware_constructive_interference_size` | 64 | 64 |

게스트의 `/sys/devices/system/cpu/cpu0/cache/index0/`에는 `level`·`type`·`shared_cpu_list`만 있고 `coherency_line_size` 파일이 없었습니다. C++ 상수는 C++ working draft [hardware.interference](https://eel.is/c++draft/hardware.interference)가 "구현이 도입하는 경합으로 인한 추가 성능 저하를 피하기 위한, 동시에 접근되는 두 object 사이의 *최소 권장* 간격"이라고 정의한 implementation-defined 값입니다. 실행 중인 CPU를 잰 값이 아니라 컴파일러가 정한 상수라는 점이 중요합니다.

결국 직접 재 보는 것이 가장 확실합니다. `fs.c`는 4096바이트로 정렬한 버퍼 하나에 thread마다 카운터를 두고, thread `i`의 카운터를 `i * STRIDE` 바이트 위치에 놓습니다. STRIDE를 8, 64, 128, 256으로 바꾸며 각 thread가 자기 카운터를 1억 번 증가시키는 시간을 잽니다.

```c title="fs.c (발췌)"
static void *worker(void *arg) {
    long id = (long)arg;
    char *p = buf + id * stride;          /* thread마다 자기 카운터 */
    atomic_fetch_add(&ready, 1);
    while (atomic_load(&ready) < nthr) ;  /* 모든 thread가 함께 출발 */
    if (atomic_mode) {
        _Atomic uint64_t *c = (_Atomic uint64_t *)p;
        for (long i = 0; i < iters; i++) atomic_fetch_add_explicit(c, 1, memory_order_relaxed);
    } else {
        volatile uint64_t *c = (volatile uint64_t *)p;
        for (long i = 0; i < iters; i++) (*c)++;
    }
    return 0;
}
```

`plain` 모드는 `volatile` 덕분에 반복마다 `ldr`/`add`/`str`이 남고, `atomic` 모드는 M2 네이티브에서 `ldadd`, 게스트 GCC에서는 outline atomics 헬퍼를 거칩니다(objdump로 확인). macOS에는 CPU affinity API가 없어서 각 thread에 `QOS_CLASS_USER_INTERACTIVE`를 주어 P-core 배치를 요청만 했습니다. 빌드는 `cc -O2 -pthread fs.c -o fs`, 실행은 `./fs plain|atomic T STRIDE 100000000`이고 조합마다 5회 돌린 중앙값(초)입니다.

| 환경 | 모드 | T | 8 B | 64 B | 128 B | 256 B |
|---|---|---:|---:|---:|---:|---:|
| M2 Pro 네이티브 | atomic | 2 | 0.919 | 0.302 | 0.216 | 0.217 |
| M2 Pro 네이티브 | atomic | 4 | 2.434 | 0.511 | 0.267 | 0.237 |
| M2 Pro 네이티브 | plain | 2 | 0.239 | 0.222 | 0.211 | 0.211 |
| M2 Pro 네이티브 | plain | 4 | 0.277 | 0.273 | 0.235 | 0.236 |
| Debian 게스트 | atomic | 2 | 1.294 | 0.453 | 0.215 | 0.213 |
| Debian 게스트 | atomic | 4 | 6.223 | 0.866 | 0.707 | 0.283 |
| Debian 게스트 | plain | 2 | 0.171 | 0.092 | 0.032 | 0.034 |
| Debian 게스트 | plain | 4 | 0.386 | 0.093 | 0.037 | 0.036 |

표에서 읽을 수 있는 것은 다음과 같습니다.

- **64바이트 간격으로는 부족했습니다.** 두 환경, 두 모드 모두 64 B가 128 B보다 느렸습니다(네이티브 atomic 4T에서 0.511초 대 0.267초, 게스트 plain 2T에서 0.092초 대 0.032초). 게스트의 `getconf`가 64를 보고했지만 측정은 128바이트 단위로 움직였습니다.
- **느려지는 배수는 접근 방식에 따라 크게 달랐습니다.** 네이티브 atomic 4T는 8 B가 256 B의 10.3배였지만, 네이티브 plain 2T는 1.13배에 그쳤습니다. 같은 하드웨어에서 같은 배치라도 load/store냐 원자 RMW냐에 따라 결과가 다릅니다. Apple은 이 차이를 설명하는 coherence 구현을 공개하지 않으므로, 여기서는 원인을 단정하지 않고 측정값만 적습니다.
- **분산이 큰 칸이 있습니다.** 게스트 atomic 4T의 8 B는 5회 중 최소 1.612초, 최대 6.858초였습니다. 게스트 vCPU는 macOS 스케줄러가 배치하는 host thread이고, 측정 중 같은 Mac에서 다른 작업도 돌고 있었습니다. 게스트 atomic 4T에서 128 B(0.707초)가 256 B(0.283초)보다 느린 점도 이 환경에서만 보였습니다.
- **두 환경의 절대 시간은 비교하지 않습니다.** 네이티브 plain 루프는 1억 번에 약 0.21초, 게스트는 약 0.03초였습니다. 컴파일러가 다르고(clang과 GCC) 실행 환경도 달라서, 비교는 같은 행 안에서만 합니다.

이 숫자는 [4-01](/blog/embedded/performance-engineering/part4-01-concurrency-basics)이 "같은 line에 있으면 느려진다"고만 적었던 부분을 구체적으로 채웁니다. 실제 배수는 thread 수, 접근 방식, CPU에 따라 1.1배부터 10배 이상까지 벌어졌습니다.

## 흔한 패턴의 판정

padding은 공짜가 아닙니다. Linux 문서는 hot data를 전용 cache line에 두는 방법의 단점으로 메모리·cache line·TLB entry를 더 쓴다는 점을 적고, 구조체를 재배치하면 다른 member 사이에 새 false sharing이 생길 수 있다고 경고합니다. 그래서 같은 문서가 드는 완화책을 상황별로 고릅니다.

| 상황 | Linux 6.12 false-sharing 문서의 완화책 | 문서가 든 upstream 예 |
|---|---|---|
| 자주 쓰는 global 변수 하나 | 그 변수만 전용 cache line에 둔다 | `91b6d3256356` (tcp_memory_allocated 정렬) |
| 한 구조체 안에서 서로 간섭하는 member | member를 다른 cache line으로 재배치한다 | `802f1d522d5f` (page_counter 재배치) |
| 루프 안의 무조건 쓰기 | 먼저 읽고 값이 다를 때만 쓴다(`if (!test_bit()) set_bit()`) | `7b1002f7cfe5` (bcache) |
| 모든 CPU가 갱신하는 global 카운터 | per-cpu 데이터 + global 합산으로 바꾸고, 합산 주기를 늘린다 | `520f897a3554` (ext4 percpu_counters) |

마지막 경우는 사실 false sharing이 아니라 true sharing입니다. 모든 thread가 *같은 변수*를 고치면 padding으로는 해결되지 않고, 카운터를 thread별로 나눠야 합니다. [6-03 Lock Contention 사례](/blog/embedded/performance-engineering/part6-03-case-lock-contention)가 이 방법을 다룹니다.

같은 문서는 코드를 쓸 때부터 지킬 원칙도 적습니다. cache line 경계를 의식하고, 주로 읽기만 하는 field끼리 묶고, 같은 시점에 쓰이는 field끼리 묶고, 자주 읽는 field와 자주 쓰는 field를 다른 line에 둡니다. 그리고 그 이유를 주석으로 남기라고 권합니다.

## perf c2c — 대상 PMU와 report를 연결

Linux에서 false sharing을 찾는 대표 도구는 `perf c2c`입니다. Linux 문서는 hotspot을 찾은 뒤 `perf c2c`와 `pahole`로 문제 line과 member를 좁히는 흐름을 제시합니다.

```bash
perf c2c record -ag sleep 3
perf c2c report --call-graph none -k vmlinux
```

이 도구는 하드웨어 메모리 샘플링에 의존합니다. v6.12의 `tools/perf/Documentation/perf-c2c.txt`에 따르면 Intel에서는 load latency와 precise store 이벤트, PowerPC에서는 thresholding을 쓰는 random instruction sampling, AMD에서는 IBS op PMU(Zen3는 미지원), Arm64에서는 SPE를 씁니다. 그래서 SPE가 없는 Arm 환경에서는 아예 기록이 시작되지 않습니다. 이 글의 Debian 게스트(QEMU HVF)에서 돌려 보면 다음과 같이 실패합니다.

```text
# perf c2c record -o /tmp/c2c.data -- ./fs atomic 2 8 10000000
failed: no PMU supports the memory events
```

이 메시지는 perf 소스 `tools/perf/builtin-c2c.c:3260`의 `pr_err`에서 나옵니다. `perf mem record`도 같은 메시지로 실패했고, 게스트에는 `armv8_pmuv3_0`만 있고 SPE PMU가 없었습니다. 그래서 이 글은 `perf c2c` 리포트를 싣지 않습니다. 그 대신 위의 STRIDE 실험처럼 배치를 바꿔 가며 시간을 재는 방법이 PMU 없이도 쓸 수 있는 진단법입니다.

`perf c2c`가 동작하는 환경에서도 HITM이 많은 line이 곧 false sharing인 것은 아닙니다. 같은 line 안의 offset별 접근을 보고, 한 변수를 여럿이 쓰는 true sharing인지 서로 다른 field의 false sharing인지 가른 뒤 `pahole`로 구조체 배치와 맞춰 봅니다.

## 자주 하는 실수

> ⚠️ 배열 시작만 정렬

배열 전체를 `alignas(64)`로 정렬해도 원소끼리는 붙어 있습니다. thread마다 원소를 하나씩 주려면 *원소의 stride*가 line 크기 이상이어야 합니다.

```c
/* Bad: 배열 시작만 정렬. 원소 간격은 4바이트 */
alignas(128) static atomic_uint counters[8];

/* Good: 원소마다 정렬해 stride를 128바이트로 */
typedef struct { alignas(128) atomic_uint value; } counter_slot;
static counter_slot slots[8];
```

> ⚠️ 64바이트를 상수로 가정

M2 Pro에서는 64바이트 간격이 128바이트보다 최대 2.9배(게스트 plain 2T) 느렸습니다. 대상 CPU를 모를 때는 `std::hardware_destructive_interference_size`를 쓸 수 있지만, 이 값도 컴파일러가 정한 권장값(Apple clang과 GCC 14.2 모두 256)이지 측정값이 아닙니다.

> ⚠️ padding만 하면 끝

Linux 문서의 마지막 경고처럼, 심한 false sharing을 고쳐도 hotspot이 다른 곳으로 옮겨 가서 전체 성능이 눈에 띄게 오르지 않을 수 있습니다. 고친 뒤에도 같은 workload로 다시 잽니다.

## 정리

- false sharing의 조건은 같은 line, 동시 접근, 적어도 하나의 쓰기입니다(Linux 6.12 문서).
- M2 Pro에서는 64바이트가 아니라 128바이트 간격부터 차이가 사라졌습니다. `getconf`, `sysctl`, C++ 상수가 서로 다른 값을 보고했습니다.
- 느려지는 배수는 접근 방식에 따라 1.1배(plain load/store)부터 10배 이상(atomic RMW 4 thread)까지 달랐습니다.
- `perf c2c`는 Intel·AMD IBS·PowerPC·Arm SPE 같은 메모리 샘플링 하드웨어가 필요하고, SPE가 없는 HVF 게스트에서는 `no PMU supports the memory events`로 실패했습니다.
- PMU가 없으면 STRIDE를 바꿔 가며 시간을 재는 실험이 직접적인 증거가 됩니다.
- 모든 thread가 같은 변수를 고치는 true sharing은 padding이 아니라 per-thread 분할로 풉니다.

다음 편은 [4-03: Lock Contention](/blog/embedded/performance-engineering/part4-03-lock-contention)입니다.

## 관련 항목

- [4-01: Concurrency 기초](/blog/embedded/performance-engineering/part4-01-concurrency-basics)
- [4-03: Lock Contention](/blog/embedded/performance-engineering/part4-03-lock-contention)
- [4-09: Cache Coherency](/blog/embedded/performance-engineering/part4-09-cache-coherency)
