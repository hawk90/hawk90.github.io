---
title: "Lock-Free 자료구조 성능 — CAS·ABA·Hazard Pointer·Epoch Reclamation"
slug: "embedded/performance-engineering/part4-07-lock-free"
date: 2026-04-26T09:06:00
description: "CAS 기반 lock-free와 ABA 문제, hazard pointer와 epoch reclamation 비교."
series: "Embedded Performance Engineering"
seriesOrder: 36
tags: [lock-free, cas, aba, hazard-pointer, epoch]
topics: ["embedded"]
---

## 한 줄 요약

> Lock-free는 개별 호출의 고정 시간 완료를 뜻하지 않습니다. 알고리즘의 진행 보장, 실제 atomic 구현, allocator와 reclamation의 보장을 나누어 봅니다.

## Progress Property

Obstruction-free는 다른 thread의 간섭 없이 충분히 실행할 때 완료, lock-free는 전체 실행의 진행, wait-free는 각 operation이 제한된 자신의 실행 step 안에 완료되는 보장을 말합니다. Scheduler가 실행시켜 줄 시간이나 고정 CPU cycle·wall-clock deadline의 보장이 아닙니다. [C++ draft의 atomic lock-free 속성](https://eel.is/c++draft/atomics.lockfree)처럼 실제 타입·object의 지원도 확인해야 합니다.

CAS를 썼다는 이유만으로 allocation·callback·reclamation을 포함한 API 전체를 lock-free라고 선언하지 않습니다. Starvation·priority에 따른 지연도 없어지는 것은 아닙니다.

## CAS — 실제 C11 atomic과 제한된 counter

일반 pointer를 읽고 비교한 뒤 쓰는 함수는 atomic CAS가 아닙니다. 다음은 이미 초기화된 atomic object에 대해 limit를 넘지 않는 증가를 시도하는 예입니다.

```c title="bounded-cas-counter.c"
#include <stdatomic.h>
#include <stdbool.h>

bool increment_below(atomic_uint *counter, unsigned limit)
{
    unsigned current = atomic_load_explicit(counter, memory_order_relaxed);
    while (current < limit) {
        if (atomic_compare_exchange_weak_explicit(counter, &current,
                current + 1, memory_order_relaxed, memory_order_relaxed))
            return true;
    }
    return false;
}
```

Counter 값만을 보호하는 예라 relaxed를 사용합니다. 다른 data의 publication 용도로 옮기면 필요한 ordering이 달라집니다. `current < limit` 조건 때문에 unsigned 증가가 wrap하지 않습니다. 약한 CAS의 실패·재시도는 가능하며 개별 호출의 wait-free 완료를 증명한 코드가 아닙니다.

Host의 네 thread가 limit까지 증가시키는 동작, limit 도달 후 거부·값 유지, UINT_MAX 경계와 실제 atomic lock-free query를 확인했습니다. Host 기능 검사이며 모든 schedule의 진행·성능 증명이 아닙니다.

## ISA와 성능을 구분

Armv8-A의 exclusive loop와 지원 Armv8.1-A+LSE의 atomic instruction 등 mapping은 ISA·compiler·target option에 따릅니다. Cortex-A72 실측 표에 `LDADD`를 붙여 보편 성능으로 쓰지 않습니다. Single instruction이라는 이유만으로 contention·cache ownership 비용이 없어지지 않습니다.

## Stack — 즉시 회수와 ABA는 별도 문제

Node를 읽는 thread가 있을 때 다른 thread가 pop 직후 free하면 `next` 접근이 use-after-free가 될 수 있습니다. Atomic top 선언만 고치거나 pointer tag만 붙여 해결되지 않습니다. 이전 글의 비atomic top·잘못된 compare_exchange·즉시 free 구현은 실행 가능한 lock-free stack으로 제시하지 않습니다.

## ABA 문제

```text
Thread 1 starts pop:
  old_top = X (X->next = Y)
  preempt
Thread 2: pop X, pop Y, push X (재사용)
  top = X (그러나 X->next는 이제 Z)
  resume Thread 1
Thread 1: CAS(top, X, Y) — 성공
  → top = Y (그런데 Y는 이미 free됨)
```

CAS는 값이 같은지만 비교하므로 같은 pointer라도 의미가 달라졌는지 알 수 없습니다. 이를 ABA 문제라고 부릅니다. 발생 연대·장치를 확인하지 않은 역사 서술은 사용하지 않습니다.

## 해결 1 — Tagged Pointer

Pointer와 generation을 **같은 atomic 갱신 단위**로 비교하는 방법입니다. Tag wrap, 실제 wide-atomic 지원·alignment·fallback을 확인해야 합니다. 128bit struct나 특정 instruction 이름만으로 language-level lock-free가 보장되지는 않습니다. Tag는 stale state의 탐지를 돕지만 이미 free된 object의 dereference를 안전하게 만들지 않습니다.

## 해결 2 — Hazard Pointer

[Michael의 Hazard Pointers 논문(IEEE TPDS, 2004)](https://research.ibm.com/publications/hazard-pointers-safe-memory-reclamation-for-lock-free-objects)은 동적 node 회수를 다룹니다. Thread-local 일반 pointer에 값을 쓰는 것만으로 다른 thread의 scanner에 보호가 공개되지 않습니다.

| 단계 | 필요한 계약 | 누락하면 생길 문제 |
|------|------|------|
| 보호 slot 등록 | scanner가 볼 수 있는 record·수명 | TLS 값만 있고 scanner는 다른 배열 읽음 |
| 읽기·공개·재확인 | 지정 memory ordering·재시도 | 공개 전에 node가 제거·회수됨 |
| Retire | 제거와 회수 시점 분리 | 다른 reader가 쓰는 node를 즉시 free |
| Scan·정리 | 모든 관련 보호·thread 종료 처리 | stale slot·미회수·너무 이른 free |

Ordering·등록·thread teardown이 없는 짧은 의사 코드를 완성된 hazard-pointer 구현으로 쓰지 않습니다. 이 작업에서는 HP implementation이나 회수 안전성을 실행·증명하지 않았습니다.

## 해결 3 — Epoch Reclamation

Epoch 계열은 활성 reader의 구간·등록·quiescent 상태와 retire generation을 추적합니다. 한 thread가 오래 멈추면 메모리 회수가 지연될 수 있습니다. 단순 TLS 정수와 epoch++만으로 완성되지 않습니다. Linux RCU도 다양한 구현·grace-period 조건을 가진 별도 계열이며 이 글의 짧은 loop와 동등하게 취급하지 않습니다.

Reclamation 선택은 read 비용뿐 아니라 멈춘 thread, retire backlog·메모리 상한, shutdown·등록 해제, allocator와 API 전체의 progress를 비교해야 합니다.

## Lock-Free SPSC Queue

SPSC는 하나의 producer·하나의 consumer와 slot 소유권을 보장할 때 release/acquire index로 구현할 수 있습니다. 다른 producer나 reset·동시 파괴·capacity/wrap 조건을 추가하면 같은 계약이 유지되는지 검토해야 합니다. 타입·초기화·capacity가 빠진 조각을 완성된 queue로 사용하지 않고 [4-08](/blog/embedded/performance-engineering/part4-08-memory-ordering) 및 [C++ lock-free 기초](/blog/embedded/embedded-cpp/part4-03-lock-free-basics)의 구체 계약과 연결합니다.

## MPMC — Multi-Producer Multi-Consumer

여러 producer·consumer는 cell 예약과 publish·consume·재사용을 구분해야 합니다. Sequence number·CAS를 쓴다는 사실만으로 알고리즘의 lock-free progress를 증명하지 않습니다. 예약한 thread가 멈췄을 때 뒤 operation이 진행할 수 있는지와 성공·실패 반환의 의미를 확인합니다. 특정 library가 같은 알고리즘이라는 채택 목록은 source version 없이 단정하지 않습니다.

## Lock-Free List와 Tree

- Harris-Michael linked list — CAS로 insert와 delete, marked pointer로 logically deleted를 표시합니다
- Lock-free skip list — 복잡하지만 효과가 큽니다
- Lock-free B-tree — 거의 연구 영역에 가깝습니다

복잡도가 빠르게 올라가며 코드 검증이 어렵습니다. 실 시스템에서는 fine-grained lock에 striping을 결합한 방식이 더 흔합니다.

## 자주 보는 함정과 측정 한계

Allocator·callback·scan·free가 blocking이면 CAS loop의 보장을 API 전체로 확대할 수 없습니다. 무조건 seq_cst를 relaxed로 바꾸는 것도 해법이 아닙니다. 먼저 publication·lifetime 관계를 증명하고 실제 target에서 비용을 비교합니다.

기존 A72의 mutex·LDADD·SPSC latency/throughput 표는 source·workload·시간 정의가 없어 제거했습니다. Atomic lock-free query·counter 최종값은 benchmark나 reclamation 검증과 다른 증거입니다. Retry 분포, tail latency, allocation·retire backlog, 종료·정지 thread 조건을 함께 기록해야 합니다.

## 정리

- Progress 보장은 obstruction-free, lock-free, wait-free 순으로 강해집니다.
- CAS가 거의 모든 lock-free 알고리즘의 기본 명령입니다.
- ABA 탐지와 object lifetime 보호를 함께 설계합니다.
- HP·epoch·RCU를 등록·수명·회수 지연 조건으로 비교하며 비용 우열을 일반화하지 않습니다.
- SPSC queue는 CAS 없이 release-acquire만으로 구현 가능합니다.
- Retry rate가 lock-free 성능의 핵심 측정 지표입니다.

다음 편은 **Memory Ordering** — acquire-release semantics를 살펴봅니다.

## 관련 항목

- [4-06: RW-Lock](/blog/embedded/performance-engineering/part4-06-rw-lock)
- [4-08: Memory Ordering](/blog/embedded/performance-engineering/part4-08-memory-ordering)
- [Embedded C++ 4-03: Lock-Free Basics](/blog/embedded/embedded-cpp/part4-03-lock-free-basics)
