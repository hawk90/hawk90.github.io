---
title: "항목 36: 비동기성이 필수라면 std::launch::async를 명시하라"
date: 2025-01-10T11:00:00
description: "std::async의 기본 launch policy가 가져오는 미묘한 함정."
tags: [C++, Concurrency, std::async, Modern C++]
series: "Effective Modern C++"
seriesOrder: 36
draft: true
---

> **초안** — 정리 진행 중

## 개요

`std::async`의 기본 launch policy는 `async | deferred` — 시스템이 결정합니다. 이게 종종 동기 실행으로 떨어져 의도와 다른 동작을 일으킵니다.

## 두 가지 launch policy

```cpp
std::launch::async      // 새 스레드에서 즉시 실행
std::launch::deferred   // .get() / .wait() 호출 시점까지 지연 (호출 스레드에서 실행)
```

기본값은 두 정책의 OR — 시스템이 자유롭게 선택.

## 기본값의 함정

```cpp
auto fut = std::async(work);   // 기본 정책

// 문제 1: deferred로 결정되면 work는 .get() 호출 전까진 시작도 안 함
// 문제 2: thread_local 변수가 어느 스레드의 것인지 불명확
// 문제 3: timeout으로 폴링하면 무한 루프
while (fut.wait_for(100ms) != std::future_status::ready) {
    // deferred 상태면 wait_for가 절대 ready 안 됨!
}
```

## 비동기 보장

```cpp
auto fut = std::async(std::launch::async, work);   // 명시
```

이러면:
- 반드시 새 스레드에서 즉시 실행
- thread_local은 새 스레드의 것
- `wait_for` 폴링이 의미 있게 동작

## 일반화 헬퍼

```cpp
template<typename F, typename... Ts>
inline auto reallyAsync(F&& f, Ts&&... params) {
    return std::async(std::launch::async,
                      std::forward<F>(f),
                      std::forward<Ts>(params)...);
}
```

매번 정책을 적기 귀찮으면 wrapper로.

## 핵심 정리

1. `std::async` 기본 정책은 시스템에 위임 — `async | deferred`
2. deferred로 떨어지면 시작 안 함, polling 무한 루프 가능
3. 비동기성이 필요하면 `std::launch::async` 명시
4. `reallyAsync` 같은 wrapper로 일관성 확보
