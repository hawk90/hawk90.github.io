---
title: "Ch 6: 템플릿 — 제네릭, SFINAE, type traits"
date: 2025-09-15T07:00:00
description: "비-타입 인자 제한(A14-1), 명시적 instantiation(A14-5), SFINAE 신중 사용(A14-7), type traits로 컴파일 분기."
tags: [autosar, cpp, template, sfinae, type-traits, concepts]
series: "AUTOSAR C++14"
seriesOrder: 6
draft: false
---

템플릿은 C++의 *가장 강력한 도구*이자 *가장 분석 어려운 영역*이다. 인증 코드에서는 *통제된 사용*이 필요하다. AUTOSAR C++14는 *템플릿 메타프로그래밍의 안전 영역*을 정의한다.

## A14 — Templates

### A14-1-1 — *Non-type 템플릿 인자*는 단순 타입만

```c++
// Good
template <typename T, std::size_t N>
class FixedVector { /* ... */ };

template <int Width, int Height>
class Image { /* ... */ };

// 회피 — 복잡한 non-type 인자
template <typename T, T initial_value>     // T가 임의 타입
class Counter { /* ... */ };

template <const char *Name>                // string literal — C++20에서 변경됨
class Module { /* ... */ };
```

### A14-1-2 — *Default 템플릿 인자*는 *마지막부터*

```c++
// Good
template <typename T, typename Alloc = std::allocator<T>>
class Container { /* ... */ };

// 위반 — default 후 non-default
template <typename T = int, typename U>
class Pair { /* ... */ };
```

함수 default argument와 같은 정책.

### A14-5-1 — *Generic operator* 사용 회피

```c++
// 회피 — 임의 타입에 동작
template <typename T, typename U>
auto operator+(T t, U u) -> decltype(t + u) {
    return t + u;
}
```

광범위 연산자 overload는 *예상 못한 곳에서 호출*. ADL(Argument-Dependent Lookup)과 결합해 *미묘한 버그* 가능.

### A14-5-2 — 클래스 *member function template*는 *forwarding reference 명시*

```c++
class Foo {
public:
    template <typename T>
    void Set(T &&value) {              // forwarding reference
        value_ = std::forward<T>(value);
    }
private:
    std::string value_;
};
```

`T &&`가 *forwarding reference인지 rvalue reference인지* 구분. 템플릿 매개변수면 forwarding.

### A14-6-1 — *지명된 이름*은 *dependent name*

```c++
template <typename T>
class Foo : public Base<T> {
public:
    void Method() {
        helper();              // 위반 — base의 helper인가 글로벌인가?
    }
};

// Good
template <typename T>
class Foo : public Base<T> {
public:
    void Method() {
        Base<T>::helper();     // 명시
        this->helper();        // 또는 this로
    }
};
```

C++의 *two-phase name lookup* — *dependent name*은 *명시적으로 한정*해야.

### A14-7-1 — 명시적 *template instantiation*

```c++
// foo.hpp — 선언만
template <typename T>
class Foo { /* ... */ };

extern template class Foo<int>;
extern template class Foo<double>;

// foo.cpp — 정의
template <typename T>
class Foo { /* 구현 */ };

template class Foo<int>;        // 명시적 instantiation
template class Foo<double>;
```

*명시적 instantiation*은 *바이너리 크기 통제*. 컴파일러가 *필요한 타입만* 생성.

### A14-7-2 — `template<>`로 *완전 특수화*

```c++
template <typename T>
struct TypeName { static constexpr const char *name = "unknown"; };

template <>
struct TypeName<int> { static constexpr const char *name = "int"; };

template <>
struct TypeName<double> { static constexpr const char *name = "double"; };
```

### A14-8-1 — *Partial specialization* 사용 가능

```c++
template <typename T, typename U>
class Pair { /* 일반 */ };

template <typename T>
class Pair<T, T> { /* T, T 특수화 */ };

template <typename T>
class Pair<T *, T *> { /* 포인터 특수화 */ };
```

### A14-8-2 — *Function template*은 *부분 특수화 불가*

```c++
// 위반 — 함수 템플릿 부분 특수화 X
template <typename T, typename U>
void Foo(T t, U u);

template <typename T>
void Foo<T, int>(T t, int u);     // 컴파일 에러

// Good — overload
template <typename T, typename U>
void Foo(T t, U u);

template <typename T>
void Foo(T t, int u);              // overload
```

함수는 *overload*, 클래스는 *partial specialization*.

## SFINAE — Substitution Failure Is Not An Error

```c++
// C++14 — enable_if
template <typename T,
          typename = std::enable_if_t<std::is_integral<T>::value>>
T Increment(T value) {
    return value + 1;
}

// 더 깔끔 — return type SFINAE
template <typename T>
std::enable_if_t<std::is_integral<T>::value, T>
Increment(T value) {
    return value + 1;
}
```

SFINAE는 *컴파일 타임 분기*. C++20 *concepts*가 더 깔끔하지만 C++14는 SFINAE가 표준.

```c++
// 두 overload
template <typename T>
std::enable_if_t<std::is_integral<T>::value, int>
Process(T x) { return 1; }

template <typename T>
std::enable_if_t<std::is_floating_point<T>::value, int>
Process(T x) { return 2; }

Process(5);          // 1 (integral)
Process(3.14);       // 2 (floating point)
Process("hi");       // 컴파일 에러 — 매칭 X
```

## type_traits — 컴파일 시 타입 검사

```c++
#include <type_traits>

template <typename T>
void SafeProcess(T x) {
    static_assert(std::is_trivially_copyable_v<T>,
                  "T must be trivially copyable for memcpy safety");
    static_assert(sizeof(T) <= 64,
                  "T too large for stack");
    // ...
}
```

*static_assert* + type_traits는 *컴파일 타임 계약*. 실행 시 검증 비용 0.

흔히 쓰는 traits:

```c++
std::is_integral_v<T>             // 정수 타입?
std::is_floating_point_v<T>       // 부동소수?
std::is_pointer_v<T>              // 포인터?
std::is_class_v<T>                // class/struct?
std::is_polymorphic_v<T>          // virtual 있나?
std::is_trivially_copyable_v<T>   // memcpy 안전?
std::is_same_v<T, U>              // 같은 타입?
std::is_base_of_v<Base, Derived>  // 상속 관계?
```

## Variadic template

```c++
// 가변 인자 — 타입 안전
template <typename... Args>
void Log(const std::string &fmt, Args... args) {
    /* ... */
}

// Recursive 처리
template <typename T>
void Print(T x) { std::cout << x; }

template <typename T, typename... Rest>
void Print(T x, Rest... rest) {
    std::cout << x << ", ";
    Print(rest...);
}

Print(1, 2.5, "hello", 'c');
```

C의 `va_list`보다 *타입 안전, 컴파일 시 검사 가능*. *Modern C++의 표준 패턴*.

C++17의 *fold expression*은 더 간결.

```c++
template <typename... Args>
void Print(Args... args) {
    ((std::cout << args << ", "), ...);    // fold expression
}
```

## A14-10-1 — 템플릿 *과도한 사용 회피*

```c++
// 회피 — 정수 타입에만 쓰일 클래스를 generic으로
template <typename T>
class Counter {
    T value_;
public:
    void Increment() { ++value_; }     // T가 임의 타입에 작동?
};

// Good — 명시
class Counter {
    int value_;
public:
    void Increment() { ++value_; }
};
```

*generic이 정당화되지 않는* 곳에서 템플릿을 쓰면 *컴파일 시간, 바이너리 크기, 가독성* 모두 손해.

## Template metaprogramming — 인증 한계

C++ template은 *튜링 완전*. *임의의 컴파일 타임 계산* 가능하지만 *분석 도구가 못 따라간다*.

```c++
// 권장 범위 — 단순 type traits + static_assert
template <typename T>
constexpr bool IsValid() {
    return std::is_integral_v<T> && sizeof(T) >= 4;
}

// 회피 — 깊은 metaprogramming
template <int N>
struct Factorial {
    static constexpr int value = N * Factorial<N - 1>::value;
};

template <>
struct Factorial<0> { static constexpr int value = 1; };
```

C++14의 `constexpr` 함수가 *대부분의 metaprogramming을 대체*. 더 읽기 좋고 분석 가능.

```c++
constexpr int Factorial(int n) {
    int r = 1;
    for (int i = 2; i <= n; i++) r *= i;
    return r;
}

constexpr int kF5 = Factorial(5);
```

## 정리

- *Non-type 인자*는 단순 타입만.
- *Dependent name*은 명시 한정(`Base<T>::foo`, `this->foo`).
- *명시적 instantiation*으로 바이너리 크기 통제.
- 함수는 *overload*, 클래스는 *partial specialization*.
- SFINAE(C++14) → concepts(C++20). 컴파일 시 분기.
- `static_assert` + type_traits로 *컴파일 타임 계약*.
- *Variadic template*이 va_list 대체.
- Template metaprogramming은 *constexpr 함수*로.

## 다음 장 예고

7장은 예외 처리. try/catch, exception safety guarantee, noexcept 보장.

## 관련 항목

- [Ch 5 — Classes, Inheritance](/blog/embedded/automotive/autosar-cpp/chapter05-classes-inheritance)
- [Ch 7 — Exception Handling](/blog/embedded/automotive/autosar-cpp/chapter07-exceptions)
