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

> 다른 변수를 다루어도 같은 coherence line을 공유하며 적어도 한쪽이 쓰면 불필요한 coherence traffic이 생길 수 있습니다. 느려지는 배수는 측정 조건에 따라 다릅니다.

## 메커니즘

[Linux6.12 false-sharing 문서](https://www.kernel.org/doc/html/v6.12/kernel-hacking/false-sharing.html)는 write/write뿐 아니라 write/read 사례도 설명합니다. 수정한 field와 다른 field를 읽는 CPU도 line을 다시 가져와야 할 수 있습니다. 각 store마다 반드시 DRAM flush·L2 왕복이 발생하는 고정 MESI 시퀀스로 쓰지 않습니다. 실제 protocol·cache hierarchy·ownership에 따라 경로가 다릅니다.

![64-byte coherence line을 가정한 두 코어의 다른 변수 접근과 ownership 이동](/images/blog/perf-eng/diagrams/part4-02-false-sharing.svg)

그림의64byte는 예시 가정이며 모든 CPU의 line 크기가 아닙니다. Read-only 공유와 같은 변수의 true sharing도 구분합니다.

## 배치부터 확인 — 배열 시작 정렬과 원소 stride

배열 전체만 정렬하면 연속 원소가 분리되지는 않습니다. 다음은 **64byte 분리 가정의 C11 배치·동작 fixture**입니다. 실제 CPU line 크기를 탐지하거나 성능을 측정하는 코드는 아닙니다.

```c title="sharing-layout.c"
#include <stdatomic.h>
#include <stddef.h>
#include <stdalign.h>

typedef struct {
    alignas(64) atomic_uint value;
} counter_slot;

struct dense_counters {
    atomic_uint a;
    atomic_uint b;
};

static counter_slot slots[2];
alignas(64) static struct dense_counters dense;
```

실제 compiler로 alignment·sizeof·배열 원소 주소와 64byte block 분리를 확인했습니다. 같은 block에 두 atomic이 있는 dense와 분리된 slots에서 각각 두 pthread가 증가시키고 최종값을 확인했습니다. 정확성·배치 검증이며 speedup·coherence traffic 측정은 아닙니다. 기존 Cortex-A72의4.2초/0.3초·14배 실측 표는 재현 환경이 없어 제거했습니다.

`std::hardware_destructive_interference_size`도 implementation이 정한 분리 권장 상수이며 모든 runtime CPU의 실제 line을 측정한 값이 아닙니다. 특정 vendor를 보고 무조건64/128byte로 고정하지 않습니다.

## 흔한 패턴의 판정

| 배치 | 확인할 것 | 무조건 padding하지 않는 이유 |
|------|------|------|
| Per-worker counter | 원소의 alignment와 stride, 동시 writer | 읽기 위주·저빈도면 footprint가 더 중요할 수 있음 |
| SPSC head/tail | 서로 다른 writer·읽기 빈도·data slots | index 분리만으로 buffer 내 공유까지 제거되지는 않음 |
| Spinlock 옆 데이터 | 기다리는 CPU와 owner의 접근 line | 같이 둘 때 locality가 유리한 workload도 있음 |
| 같은 global atomic | 모든 thread가 같은 값을 수정 | true sharing이라 padding만으로 해소 안 됨 |

Linux `DEFINE_PER_CPU`나 RTOS 배열 정렬을 개별 field의 자동 cache-line 분리라고 단정하지 않습니다. Zephyr stack 선언도 arbitrary counter 배열의 stride를 바꾸지 않습니다. Compiler가 지원하는 `alignas`는 stack object에도 정렬 요구를 표현하며, 항상 무시되어 `-mstackrealign`이 필요하다는 설명은 잘못입니다.

## perf c2c — 대상 PMU와 report를 연결

```bash
sudo perf c2c record -- ./prog
perf c2c report
```

이 명령은 지원 Linux target에서의 조사 예이며 여기서 실행하지 않았습니다. CPU·PMU·kernel/config·권한·event 지원을 확인합니다. HITM이나 관련 memory-source sample을 찾았다고 모두 false sharing은 아닙니다. Line 안의 offset·writer/readers·source access와 실제 layout을 연결해 같은 변수의 true sharing인지 다른 field의 공유인지 구분합니다.

지원 event가 없거나 sample이 부족한 경우 검출 없음으로 결론내리지 않습니다. Layout 변경 전후를 같은 workload·affinity·compiler·NUMA·thermal 조건으로 반복하고 throughput·tail latency·footprint를 함께 비교해야 합니다.

## 자주 하는 실수

한 field의 시작 주소만 정렬하고 이웃 field가 같은 line을 쓰는지 보지 않는 경우가 있습니다. 반대로 모든 field를 분리하면 cache·TLB footprint가 커질 수 있습니다. 구조체의 alignment와 size, 각 offset, 실제 할당 주소를 확인합니다.

단순 정수의 서로 다른 원소를 서로 다른 thread가 소유하면 별개 object라는 점과, 다른 thread가 동시에 집계할 때 data race가 생기는 문제는 별도입니다. 동시 집계에는 해당 memory model의 atomic·동기화가 필요하며 atomic 합계도 자동으로 일관된 순간 snapshot은 아닙니다.

## 정리

False sharing은 layout만으로 성능 손실이 확정되는 문제가 아닙니다. 동시 접근·write·coherence 경로를 확인하고, compiler의 배치 증거와 실제 PMU·성능 관찰을 구분합니다. 이 장의 host 실험은 64byte 가정의 배치와 atomic 최종값만 확인했습니다.

다음 편은 [4-03: Lock Contention](/blog/embedded/performance-engineering/part4-03-lock-contention)입니다.

## 관련 항목

- [4-01: Concurrency 기초](/blog/embedded/performance-engineering/part4-01-concurrency-basics)
- [4-03: Lock Contention](/blog/embedded/performance-engineering/part4-03-lock-contention)
