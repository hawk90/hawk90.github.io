---
title: "항목 24: 모든 템플릿 인수의 콘셉트를 명시하라"
date: 2026-05-10T10:00:00
description: "C++20 콘셉트로 템플릿 요구사항을 시그니처에 명시하는 법"
tags: [C++, Concepts, Templates]
series: "Beautiful C++"
seriesOrder: 24
draft: true
---


## 핵심 내용

- C++20 콘셉트는 **템플릿 인자가 만족해야 할 요구사항**을 시그니처에 명시한다
- 콘셉트 없이 템플릿을 쓰면 잘못된 타입을 넘겼을 때 **수십 줄짜리 의미 불명 에러**가 나온다
- 콘셉트는 **문서·검증·오버로드 해결**을 동시에 해결해준다
- 표준 콘셉트(`std::integral`, `std::ranges::range`, `std::invocable`...)부터 적극 활용하라

## 예제 코드

```cpp
// Bad: 요구사항이 어디에도 적혀 있지 않음
template<typename T>
T add(T a, T b) { return a + b; }

add(std::string{"x"}, 3);  // 에러 메시지 폭발

// Good: 콘셉트로 명시
template<std::integral T>
T add(T a, T b) { return a + b; }

add(1, 2);                 // OK
// add("x", 3);            // 깔끔한 진단: "T가 integral이 아님"

// 사용자 정의 콘셉트
template<typename T>
concept Hashable = requires(T t) {
    { std::hash<T>{}(t) } -> std::convertible_to<std::size_t>;
};

template<Hashable K, typename V>
class Cache { /* ... */ };
```

## 정리

콘셉트는 **템플릿의 자기소개서**다. 타입에 거는 기대를 코드로 적어두면 컴파일러가 검사해 주고, 다음에 보는 사람도 의도를 바로 안다.
