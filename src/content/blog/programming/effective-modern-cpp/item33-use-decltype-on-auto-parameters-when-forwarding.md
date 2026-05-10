---
title: "항목 33: auto&& 매개변수에 std::forward를 쓸 때는 decltype을 사용하라"
date: 2025-01-09T12:00:00
description: "제네릭 람다에서 카테고리 보존 forwarding의 정확한 패턴."
tags: [C++, Lambda, Perfect Forwarding, Modern C++]
series: "Effective Modern C++"
seriesOrder: 33
draft: true
---

> **초안** — 정리 진행 중

## 개요

C++14의 **제네릭 람다**(generic lambda)는 매개변수에 `auto`를 받습니다. 이 매개변수를 perfect forwarding하려면 일반 템플릿과 달리 `T`를 적을 수 없으므로, `decltype`을 사용합니다.

## 일반 템플릿 vs 제네릭 람다

```cpp
// 일반 템플릿 — T가 명시
template<typename T>
void wrap(T&& arg) {
    f(std::forward<T>(arg));
}

// 제네릭 람다 — T가 없음
auto wrap = [](auto&& arg) {
    f(std::forward<decltype(arg)>(arg));   // ← decltype 활용
};
```

`auto&&`도 보편 참조라 `arg`의 정확한 타입(참조 포함)을 `decltype(arg)`로 얻을 수 있습니다.

## 왜 `decltype(arg)`가 맞나

- `arg`가 lvalue로 호출되면 → `decltype(arg)` = `T&` (참조 축약 결과)
- `arg`가 rvalue로 호출되면 → `decltype(arg)` = `T&&`

`std::forward<T&>` 또는 `std::forward<T&&>`로 호출되며, 둘 다 의도대로 카테고리를 보존합니다.

## 가변 인자 람다

```cpp
auto wrapAll = [](auto&&... args) {
    f(std::forward<decltype(args)>(args)...);
};
```

각 인자에 대해 `decltype(args)`가 펼쳐지며 forward.

## 함정 — `decltype(arg)` vs `decltype((arg))`

```cpp
auto bad = [](auto&& arg) {
    f(std::forward<decltype((arg))>(arg));  // (arg) → 항상 lvalue 표현식
                                            // → 항상 lvalue로 forward
};
```

`(arg)` 괄호가 들어가면 항목 3의 함정 — id-expression이 아니라 lvalue 표현식이 되어 항상 lvalue 참조 타입이 됩니다. **괄호 없이** `decltype(arg)`를 쓰세요.

## 핵심 정리

1. 제네릭 람다의 `auto&&`도 보편 참조
2. forward할 때 `std::forward<decltype(arg)>(arg)` 패턴
3. 가변 인자도 `forward<decltype(args)>(args)...`로 일반화
4. `decltype(arg)`이고 `decltype((arg))`가 아님 — 괄호 함정 주의
