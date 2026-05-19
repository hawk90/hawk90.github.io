---
title: "항목 33: auto&& 매개변수에 std::forward를 쓸 때는 decltype을 사용하라"
date: 2026-05-04T09:00:00
description: "제네릭 람다에서 카테고리 보존 forwarding의 정확한 패턴 — decltype 함정 포함."
tags: [C++, Lambda, Generic Lambda, Perfect Forwarding, Modern C++]
series: "Effective Modern C++"
seriesOrder: 33
draft: true
---

## 왜 이 항목이 중요한가?

C++14 제네릭 람다 `[](auto&& arg) { ... }`는 일반 함수 템플릿과 거의 동일하다. 보편 참조처럼 동작하고 perfect forwarding도 할 수 있다.

다만 한 가지 다르다. 일반 템플릿은 `template<typename T> f(T&&)` 형태라 `std::forward<T>(arg)`를 쓰면 되는데, 람다는 **`T`를 적을 수 없다**. `auto`로 받기 때문이다.

이 항목은 람다에서 perfect forwarding하는 정확한 패턴 — `std::forward<decltype(arg)>(arg)` — 을 정리한다. 그리고 `(arg)`로 괄호를 잘못 쓰면 항상 lvalue로 forward되는 함정도 본다.

## 개요

C++14의 **제네릭 람다**(generic lambda)는 매개변수에 `auto`를 받는다. 이 매개변수를 perfect forwarding하려면 일반 템플릿과 달리 `T`를 적을 수 없으므로, **`decltype`**을 사용한다.

## 필수 개념: 제네릭 람다

> **초보자를 위한 배경 지식**

<br>

### C++14 generic lambda

```cpp
auto f = [](auto x) { return x + 1; };

f(1);       // int
f(1.5);     // double
f("a");     // char*  — `+1`은 포인터 산술
```

람다 매개변수에 `auto`를 사용한다. 함수 템플릿처럼 동작한다.

### 내부적으로 — `operator()` 템플릿

```cpp
auto f = [](auto x) { return x + 1; };

// 컴파일러가 만드는 익명 클래스 (대략)
class __lambda {
public:
    template<typename T>
    auto operator()(T x) const { return x + 1; }
};
```

generic lambda = 템플릿화된 `operator()`를 가진 함수 객체다.

## 일반 템플릿 vs 제네릭 람다

```cpp
// 일반 템플릿 — T가 명시
template<typename T>
void wrap(T&& arg) {
    f(std::forward<T>(arg));   // ✅ T 사용
}

// 제네릭 람다 — T가 없음 (auto)
auto wrap = [](auto&& arg) {
    f(std::forward<???>(arg));   // T를 어떻게 적나?
};
```

해결책은 **`decltype(arg)` 사용**이다.

```cpp
auto wrap = [](auto&& arg) {
    f(std::forward<decltype(arg)>(arg));   // ◄── decltype 활용
};
```

## 왜 `decltype(arg)`가 맞나

`auto&&`도 보편 참조다. `arg`의 정확한 타입(참조 포함)을 `decltype(arg)`로 얻을 수 있다.

- `arg`가 lvalue로 호출되면 → `decltype(arg)` = `T&` (참조 축약 결과).
- `arg`가 rvalue로 호출되면 → `decltype(arg)` = `T&&`.

`std::forward<T&>` 또는 `std::forward<T&&>`로 호출된다. 둘 다 의도대로 카테고리를 보존한다.

### 동작 비교 — 일반 템플릿과 같음

```cpp
template<typename T>
void f1(T&& arg) {
    process(std::forward<T>(arg));
}

auto f2 = [](auto&& arg) {
    process(std::forward<decltype(arg)>(arg));
};

int x = 0;
f1(x);    // process(int&)
f2(x);    // process(int&)

f1(0);    // process(int&&)
f2(0);    // process(int&&)
```

**동일 효과**다.

## 가변 인자 람다

```cpp
auto wrapAll = [](auto&&... args) {
    f(std::forward<decltype(args)>(args)...);
};
```

각 인자에 대해 `decltype(args)`가 펼쳐지며 forward된다.

```cpp
wrapAll(1, "hello", std::string{"world"});
// 각 인자가 카테고리 보존되어 f에 전달
```

## ⚠️ 함정 — `decltype(arg)` vs `decltype((arg))`

[항목 3 (decltype)](/blog/programming/cpp/effective-modern-cpp/item03-understand-decltype)에서 본 함정이다.

```cpp
auto bad = [](auto&& arg) {
    f(std::forward<decltype((arg))>(arg));  // (arg) → 항상 lvalue 표현식
                                            // → 항상 lvalue로 forward (rvalue도!)
};
```

`(arg)`로 괄호가 들어가면 id-expression이 아니라 lvalue 표현식이 된다. 항상 lvalue 참조 타입이 된다.

**괄호 없이** `decltype(arg)`다.

```cpp
// ✅ 올바름
auto good = [](auto&& arg) {
    f(std::forward<decltype(arg)>(arg));
};
```

## C++20 — `template` 람다

C++20부터 람다도 명시적 템플릿 매개변수가 가능하다.

```cpp
auto f = []<typename T>(T&& arg) {
    process(std::forward<T>(arg));   // T 직접 사용
};
```

일반 템플릿과 같은 문법이다. `decltype` 우회가 가능하다.

C++14/17에선 `decltype` 패턴이 표준이다.

## 실전 — 표준 알고리즘 커스텀 비교

```cpp
std::vector<Widget> v;

std::sort(v.begin(), v.end(),
    [](auto&& a, auto&& b) {
        return std::forward<decltype(a)>(a).key()
             < std::forward<decltype(b)>(b).key();
    });
```

(보통 `const&`로 받지만, forward가 의미 있는 경우다.)

## 실전 — 콜백 wrapper

```cpp
auto wrap = [](auto&& callback) {
    return [cb = std::forward<decltype(callback)>(callback)](auto&&... args) {
        return cb(std::forward<decltype(args)>(args)...);
    };
};
```

콜백을 init capture로 보존하고, 호출 시 args를 forward한다.

## 함정 — auto 매개변수의 추론

```cpp
auto f = [](auto x) { ... };   // by-value (보편 참조 X)
auto f = [](auto& x) { ... };  // lvalue 참조
auto f = [](auto&& x) { ... }; // 보편 참조 (auto가 직접)
```

모두 generic lambda지만 의미가 다르다. forward가 필요한 건 `auto&&`다.

## perfect forwarding lambda 패턴 정리

```cpp
// 보편 참조 forwarding — decltype 사용
auto wrap = [](auto&& arg) {
    f(std::forward<decltype(arg)>(arg));
};

// 가변 인자
auto wrapAll = [](auto&&... args) {
    f(std::forward<decltype(args)>(args)...);
};

// init capture로 forward 캡처
auto delayed = [](auto&& x) {
    return [x = std::forward<decltype(x)>(x)] {
        use(x);
    };
};
```

## 핵심 정리

1. 제네릭 람다의 **`auto&&`도 보편 참조**다.
2. forward할 때 **`std::forward<decltype(arg)>(arg)`** 패턴이다.
3. **가변 인자**도 `forward<decltype(args)>(args)...`로 일반화된다.
4. **`decltype(arg)`이고 `decltype((arg))`가 아니다**. 괄호 함정이다.
5. **C++20 `template` 람다**가 더 깔끔하다 (T 직접 사용).

## 관련 항목

- [항목 3: decltype](/blog/programming/cpp/effective-modern-cpp/item03-understand-decltype) — `(arg)` 함정
- [항목 23: move/forward](/blog/programming/cpp/effective-modern-cpp/item23-understand-std-move-and-std-forward)
- [항목 24: 보편 참조](/blog/programming/cpp/effective-modern-cpp/item24-distinguish-universal-references-from-rvalue-references)
- [항목 25: forward on universal](/blog/programming/cpp/effective-modern-cpp/item25-use-move-on-rvalue-refs-and-forward-on-universal-refs)
- [항목 32: init capture](/blog/programming/cpp/effective-modern-cpp/item32-use-init-capture-to-move-objects-into-closures)
