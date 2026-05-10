---
title: "항목 16: const 멤버 함수는 스레드 안전하게 만들라"
date: 2025-01-06T19:00:00
description: "캐싱이나 mutable 상태를 가진 const 멤버 함수에서 발생하는 데이터 경쟁과 해결법."
tags: [C++, const, Thread Safety, Modern C++]
series: "Effective Modern C++"
seriesOrder: 16
draft: true
---

> **초안** — 정리 진행 중

## 개요

C++에서 `const` 멤버 함수는 "관찰자(observer)"로 인식되어, 사용자는 멀티스레드에서 자유롭게 호출할 수 있다고 가정합니다. 하지만 내부에 **캐싱**이나 **`mutable` 상태**가 있으면 동기화 없이는 **데이터 경쟁(data race)**이 발생합니다.

## 함정 예제

```cpp
class Polynomial {
    mutable std::vector<double> rootsCache;
    mutable bool                cacheValid = false;

public:
    std::vector<double> roots() const {
        if (!cacheValid) {
            rootsCache = computeRoots();   // 변경
            cacheValid = true;             // 변경
        }
        return rootsCache;
    }
};
```

`roots()`는 const지만 내부 상태를 변경합니다. 두 스레드가 동시에 호출하면 데이터 경쟁 — UB.

## 해결 1: `std::mutex`

```cpp
class Polynomial {
    mutable std::mutex             m;
    mutable std::vector<double>    rootsCache;
    mutable bool                   cacheValid = false;

public:
    std::vector<double> roots() const {
        std::lock_guard<std::mutex> g(m);
        if (!cacheValid) {
            rootsCache = computeRoots();
            cacheValid = true;
        }
        return rootsCache;
    }
};
```

가장 일반적이고 안전. 다만 `mutex`는 복사·이동 불가 → 클래스가 자동으로 비복사·비이동이 됨.

## 해결 2: `std::atomic` (단일 변수만 보호하면 될 때)

```cpp
class Counter {
    mutable std::atomic<unsigned> callCount{0};
public:
    int compute() const {
        ++callCount;
        return /* ... */;
    }
};
```

단일 atomic 연산이면 mutex보다 가벼움. 단 **여러 atomic으로 합성 연산**을 만들면 스레드 안전성이 깨질 수 있음.

```cpp
// 잘못된 예 — atomic 두 개로 "동기화" 시도
class Polynomial {
    mutable std::atomic<bool> valid{false};
    mutable std::vector<double> cache;   // atomic 아님!

    auto roots() const {
        if (!valid) {
            cache = compute();   // 데이터 경쟁
            valid = true;
        }
        return cache;
    }
};
```

`valid`만 atomic이면 `cache` 자체는 보호되지 않습니다.

## 단일 스레드 환경

내부에서 절대 멀티스레드로 사용되지 않는다는 보장이 있다면, 동기화 비용을 피해도 됩니다 — 하지만 **이는 클래스 인터페이스 문서에 명시**해야 합니다. 사용자는 기본적으로 const 멤버를 안전하다고 가정하므로.

## 핵심 정리

1. const 멤버 함수도 캐싱·`mutable`이 있다면 데이터 경쟁 가능
2. 보호 단위가 여러 변수면 `std::mutex`
3. 단일 atomic 변수만이면 `std::atomic`로 가볍게
4. 동기화 없이 두려면 인터페이스에 명시 — "이 클래스는 단일 스레드 전용"
