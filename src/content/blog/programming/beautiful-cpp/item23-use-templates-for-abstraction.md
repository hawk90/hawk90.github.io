---
title: "항목 23: 템플릿을 사용하여 코드의 추상화 수준을 높이라"
date: 2026-05-10T10:00:00
description: "타입별 복붙을 템플릿으로 일반화하기"
tags: [C++, Templates, Generic Programming]
series: "Beautiful C++"
seriesOrder: 23
draft: true
---


## 핵심 내용

- 타입마다 거의 같은 함수를 여러 번 쓰고 있다면 **템플릿이 정답**
- 템플릿은 **컴파일 타임 다형성** — 가상 함수의 런타임 비용 없이 일반화된다
- 알고리즘은 자료구조에서, 자료구조는 원소 타입에서 분리해 재사용성을 높여라
- C++20 콘셉트로 **템플릿 인자가 만족해야 할 요구사항**을 명시하면 진단 메시지가 깔끔해진다

## 예제 코드

```cpp
// Bad: 타입마다 복붙
int sum_int(const std::vector<int>& v) {
    int s = 0; for (auto x : v) s += x; return s;
}
double sum_double(const std::vector<double>& v) {
    double s = 0; for (auto x : v) s += x; return s;
}

// Good: 템플릿으로 일반화
template<typename T>
T sum(const std::vector<T>& v) {
    T s{};
    for (const auto& x : v) s += x;
    return s;
}

// Better: 콘셉트로 요구사항 명시 + 컨테이너도 일반화
template<std::ranges::range R>
    requires std::is_arithmetic_v<std::ranges::range_value_t<R>>
auto sum(const R& r) {
    std::ranges::range_value_t<R> s{};
    for (const auto& x : r) s += x;
    return s;
}
```

## 정리

반복되는 타입 종속 코드는 **템플릿으로 들어 올려라**. 콘셉트와 함께 쓰면 안전성·성능·가독성을 모두 얻는다.
