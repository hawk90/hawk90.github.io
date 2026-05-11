---
title: "항목 11: 쓰기 가능한 데이터의 명시적 공유는 최소화하라"
date: 2026-05-09T10:00:00
description: "가변 상태 공유가 만드는 동시성·소유권 문제와 그 대안"
tags: [C++, Concurrency, Ownership]
series: "Beautiful C++"
seriesOrder: 11
draft: true
---


## 핵심 내용

- 여러 곳에서 **수정 가능한 같은 데이터**를 가리키면 동시성·재진입·소유권 문제가 폭발한다
- 공유는 **읽기 전용일 때만** 안전하다 (`const` 참조, `shared_ptr<const T>`)
- 쓰기가 필요한 데이터는 가능하면 **값으로 전달**하거나 **단일 소유자**(`unique_ptr`)에 묶어라
- 공유가 꼭 필요하다면 **동기화 메커니즘과 함께** 의식적으로 쓰라

## 예제 코드

```cpp
// Bad: 두 객체가 같은 가변 데이터를 공유 — 변경이 어디서 발생하는지 추적 불가
struct Counter {
    int* count_;
    Counter(int* p) : count_(p) {}
    void inc() { ++*count_; }
};

int shared = 0;
Counter a(&shared);
Counter b(&shared);
// a.inc()와 b.inc()가 섞이면 누가 무엇을 했는지 불명확

// Good: 값 소유 + 명시적 인터페이스로 변경 통로를 좁힘
class Counter {
    int count_ = 0;
public:
    void inc() { ++count_; }
    int  get() const { return count_; }
};

// 또는: 읽기 전용 공유는 자유롭게
std::shared_ptr<const Config> cfg = load_config();
```

## 정리

공유는 **읽기에 한해** 안전하다. 가변 상태의 명시적 공유는 마지막 수단으로 남기고, 가능한 한 **값과 단일 소유**로 설계하라.
