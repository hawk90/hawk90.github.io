---
title: "항목 12: 꼭 필요할 때만 템플릿 메타프로그래밍을 사용하라"
date: 2026-05-09T11:00:00
description: "TMP의 비용과 constexpr·if constexpr·concepts라는 현대적 대안"
tags: [C++, Templates, Metaprogramming]
series: "Beautiful C++"
seriesOrder: 12
draft: true
---


## 핵심 내용

- TMP는 강력하지만 **컴파일 시간 폭증·에러 메시지 지옥·디버깅 불가**라는 큰 비용이 따른다
- 같은 일을 `constexpr` 함수, `if constexpr`, 콘셉트로 해결할 수 있다면 그쪽이 훨씬 읽기 쉽다
- 라이브러리 작성자에게는 도구지만, 응용 코드에서는 대부분 과잉이다
- 적용 전에 **단순한 대안 → 템플릿 → TMP** 순서로 검토하라

## 예제 코드

```cpp
// Old TMP: 재귀 템플릿으로 팩토리얼
template<int N> struct Fact { static constexpr int value = N * Fact<N-1>::value; };
template<>      struct Fact<0> { static constexpr int value = 1; };
constexpr int x = Fact<5>::value;

// Modern: 그냥 constexpr 함수
constexpr int fact(int n) { return n <= 1 ? 1 : n * fact(n - 1); }
constexpr int x = fact(5);

// Old TMP: SFINAE로 분기
template<typename T,
         typename = std::enable_if_t<std::is_integral_v<T>>>
void process(T v) { /* 정수 처리 */ }

// Modern: if constexpr 또는 콘셉트
template<typename T>
void process(T v) {
    if constexpr (std::is_integral_v<T>) { /* 정수 처리 */ }
    else                                  { /* 그 외 */ }
}
```

## 정리

TMP는 **마지막 수단**이다. `constexpr`, `if constexpr`, concepts가 같은 일을 더 읽기 쉽게 해준다면 주저 말고 그쪽을 택하라.
