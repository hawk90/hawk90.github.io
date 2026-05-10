---
title: "항목 40: 동시성에는 std::atomic을, 특수 메모리에는 volatile을 사용하라"
date: 2025-01-10T15:00:00
description: "atomic과 volatile은 다른 도구 — 자주 혼동되는 두 키워드 정확히 구분."
tags: [C++, std::atomic, volatile, Concurrency, Modern C++]
series: "Effective Modern C++"
seriesOrder: 40
draft: true
---

> **초안** — 정리 진행 중

## 개요

`std::atomic`과 `volatile`은 자주 혼동되지만 **완전히 다른 도구**입니다. atomic은 동시성 동기화, volatile은 컴파일러 최적화 차단(특수 메모리). 서로 대체 불가.

## `std::atomic` — 동시성 동기화

```cpp
std::atomic<int> count{0};

// 두 스레드에서 동시에 안전
++count;       // atomic read-modify-write
int x = count; // atomic load
```

보장:
- 분할되지 않은 단일 연산 (no torn read/write)
- 메모리 순서(memory ordering) 제어
- 다른 스레드와의 동기화

## `volatile` — 컴파일러 최적화 차단

```cpp
volatile uint32_t* reg = (uint32_t*)0x40000000;
*reg = 1;   // 컴파일러가 캐시/생략하지 않고 매번 실제 메모리 접근
```

보장:
- 매 접근이 실제 메모리 read/write
- 컴파일러가 중복 읽기/쓰기 최적화 안 함
- **동시성 동기화는 제공하지 않음** — atomic이 아님

## 차이 비교

| 측면 | `std::atomic` | `volatile` |
| --- | --- | --- |
| 용도 | 멀티스레드 동기화 | MMIO·신호 핸들러·setjmp 호환 |
| 분할 방지 | ✅ | ❌ |
| 메모리 순서 | ✅ | ❌ |
| 최적화 차단 | (필요한 만큼) | ✅ (모든 접근) |
| 데이터 경쟁 회피 | ✅ | ❌ |

## 흔한 오해

**오해 1**: "volatile이면 thread-safe다"
→ 틀림. volatile은 단일 변수 접근의 atomicity도 보장하지 않음.

**오해 2**: "atomic이면 컴파일러가 최적화 안 한다"
→ 부분적. atomic 변수에 대한 redundant read는 표준이 허용.

**오해 3**: "둘은 같은 일을 한다"
→ 완전히 다름. 같은 자리에 둘 다 필요할 수도 있음 (예: 신호 핸들러에서 공유).

## 함께 쓰는 경우

신호 핸들러 안에서 공유 변수에 접근하면서 동시성도 다루어야 한다면:

```cpp
volatile std::atomic<int> shared_signal{0};
```

드물지만 가능.

## 핵심 정리

1. `std::atomic`: 멀티스레드 동기화 도구
2. `volatile`: 특수 메모리(MMIO, 신호) 접근 시 컴파일러 차단
3. 두 도구는 **서로 대체 불가**
4. 동시성에는 항상 atomic — volatile만으로는 데이터 경쟁
