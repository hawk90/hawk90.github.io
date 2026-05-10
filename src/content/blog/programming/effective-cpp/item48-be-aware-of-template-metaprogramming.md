---
title: "항목 48: 템플릿 메타프로그래밍을 인식하라"
date: 2025-02-07T17:00:00
description: "TMP — 컴파일 타임 계산. C++11+ constexpr이 많이 대체했지만 여전히 유용."
tags: [C++, Effective C++, Template, TMP]
series: "Effective C++"
seriesOrder: 48
draft: true
---

> **초안** — 정리 진행 중

## 개요

**Template Metaprogramming (TMP)**는 컴파일 시점에 코드를 생성·계산하는 기법. 런타임 비용 0, 컴파일 타임에 타입 안전성 검증. C++11+ `constexpr`과 fold expression이 많은 부분을 대체했지만 일부는 여전히 TMP가 답.

## 단순 예 — 컴파일 타임 factorial

```cpp
template<unsigned N>
struct Factorial {
    static constexpr unsigned value = N * Factorial<N-1>::value;
};

template<>
struct Factorial<0> {
    static constexpr unsigned value = 1;
};

constexpr auto x = Factorial<5>::value;   // 120, 컴파일 타임에 계산
```

C++11+ 에선 `constexpr` 함수가 더 직관적:

```cpp
constexpr unsigned factorial(unsigned n) {
    return (n == 0) ? 1 : n * factorial(n - 1);
}
constexpr auto x = factorial(5);
```

## TMP의 활용 영역

### 1. 컴파일 타임 dimensional 분석

```cpp
template<int M, int K, int S>    // 차원: 질량·길이·시간
class Unit { /* ... */ };

using Length    = Unit<0, 1, 0>;
using Time      = Unit<0, 0, 1>;
using Velocity  = Unit<0, 1, -1>;

// Length / Time = Velocity 자동 추론
// 차원 불일치는 컴파일 에러
```

물리 단위 mismatch를 컴파일 타임에 검출.

### 2. 자동 코드 생성 (e.g., loop unrolling)

```cpp
template<int N>
struct Loop {
    template<typename F>
    static void run(F f) {
        Loop<N-1>::run(f);
        f(N-1);
    }
};

template<>
struct Loop<0> {
    template<typename F>
    static void run(F) {}
};

Loop<5>::run([](int i) { /* ... */ });   // 0~4 인라인 호출
```

C++11+ 에선 fold expression(C++17)이 더 깔끔.

### 3. 컴파일 타임 타입 변환·트레이트

`<type_traits>`의 `remove_const_t`, `is_same_v` 등 모두 TMP.

## TMP의 단점

- **에러 메시지 난해**
- **컴파일 타임 ↑**
- **디버깅 어려움**

C++11+ `constexpr`, C++17 `if constexpr`, C++20 concepts가 TMP의 많은 부분을 대체하며 가독성·에러 메시지 개선.

## 핵심 정리

1. TMP = 컴파일 타임 계산·코드 생성
2. dimensional 분석, 코드 생성, 트레이트 등에 활용
3. 단점은 가독성·에러 메시지·컴파일 시간
4. 현대 C++(`constexpr`, `if constexpr`, concepts)이 많은 자리에서 대체
