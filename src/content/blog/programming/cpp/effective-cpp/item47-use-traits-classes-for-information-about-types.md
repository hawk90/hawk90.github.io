---
title: "항목 47: 타입 정보 획득에는 traits 클래스를 사용하라"
date: 2025-02-02T23:00:00
description: "iterator_traits 같은 traits 패턴 — 컴파일 타임에 타입별 분기 + tag dispatch. C++20 concepts와의 결합."
tags: [C++, Effective C++, Template, Traits]
series: "Effective C++"
seriesOrder: 47
draft: true
---

## 왜 이 항목이 중요한가?

C++ 템플릿에서 자주 마주치는 자리가 "**타입에 따라 다르게 동작하는 코드**"다. 반복자가 random-access면 빠른 경로, bidirectional이면 순차 경로. 정수면 한 방식, 부동소수면 다른 방식.

이걸 if/else로 런타임에 분기하면 비효율이고, 가상 함수로 풀면 추가 비용이 든다. **traits 클래스**는 컴파일 타임에 분기를 결정해 **런타임 비용 0**으로 같은 일을 한다.

C++ 표준 라이브러리 전체가 이 패턴 위에 서 있다. `std::iterator_traits`, `std::numeric_limits`, `<type_traits>` 헤더의 모든 trait, C++20 concepts까지. 한 번 익히면 STL 내부 코드를 읽을 수 있게 된다.

이 항목은 traits 클래스의 구조, **tag dispatch** 기법, 그리고 C++20 concepts로의 진화를 정리한다.

## 개요

타입에 관한 정보(반복자 카테고리, 값 타입, 부호 여부 등)를 **컴파일 타임**에 알아내고 그에 따라 분기하는 패턴이 **traits 클래스**다. C++ 표준 라이브러리는 `std::iterator_traits`, `std::numeric_limits`, `<type_traits>` 헤더 전체가 이 패턴이다. 런타임 비용 0, 강력한 인라인 가능하다.

## 필수 개념: 컴파일 타임에 타입 분기

> **초보자를 위한 배경 지식**

<br>

특정 타입의 특성에 따라 다른 코드를 실행하고 싶을 때:

```cpp
template<typename T>
void print(T x) {
    if (T가 정수) { /* hex로 출력 */ }
    else         { /* default 출력 */ }
}
```

런타임 `if`로는 어색 — 컴파일러가 T 결정 후 최적화 못 함. **컴파일 타임 분기**가 필요. 도구가 traits.

## 동기 — `std::advance`

```cpp
template<typename Iter, typename Dist>
void advance(Iter& iter, Dist d);
```

`advance(it, 5)` — `it`을 5칸 앞으로. 효율은 iterator 종류에 따라 다름:

| Iterator | 효율 | 동작 |
| --- | --- | --- |
| `random_access_iterator` | O(1) | `iter += d` |
| `bidirectional_iterator` | O(d) | `while (d--) ++iter` |
| `forward_iterator` | O(d) | `while (d--) ++iter` (음수 d 안 됨) |
| `input_iterator` | O(d) | `while (d--) ++iter` (single-pass) |

이 분기를 컴파일 타임에 — 런타임 검사 없이.

## traits — 카테고리 정보 매핑

```cpp
namespace std {
    template<typename Iter>
    struct iterator_traits {
        using iterator_category = typename Iter::iterator_category;
        using value_type        = typename Iter::value_type;
        using difference_type   = typename Iter::difference_type;
        using pointer           = typename Iter::pointer;
        using reference         = typename Iter::reference;
    };

    // 포인터에 대한 부분 특수화
    template<typename T>
    struct iterator_traits<T*> {
        using iterator_category = random_access_iterator_tag;
        using value_type        = T;
        using difference_type   = ptrdiff_t;
        using pointer           = T*;
        using reference         = T&;
    };
}
```

**핵심 아이디어**:
- primary template — `Iter::iterator_category` 등 멤버 typedef를 그대로 노출
- 사용자 iterator는 멤버 typedef를 정의: `class MyIter { using iterator_category = bidirectional_iterator_tag; ... };`
- 포인터처럼 멤버 typedef를 정의 못 하는 타입은 **부분 특수화**

```cpp
using IntPtrCategory = std::iterator_traits<int*>::iterator_category;
// IntPtrCategory == std::random_access_iterator_tag
```

## tag dispatch — 컴파일 타임 분기

iterator 카테고리는 **tag struct**:

```cpp
namespace std {
    struct input_iterator_tag {};
    struct forward_iterator_tag       : input_iterator_tag {};
    struct bidirectional_iterator_tag : forward_iterator_tag {};
    struct random_access_iterator_tag : bidirectional_iterator_tag {};
}
```

상속 관계로 — random_access는 bidirectional의 일종, bidirectional은 forward의 일종.

이를 함수 오버로드 분기에 사용:

```cpp
template<typename Iter, typename Dist>
void doAdvance(Iter& iter, Dist d, std::random_access_iterator_tag) {
    iter += d;
}

template<typename Iter, typename Dist>
void doAdvance(Iter& iter, Dist d, std::bidirectional_iterator_tag) {
    if (d >= 0) while (d--) ++iter;
    else        while (d++) --iter;
}

template<typename Iter, typename Dist>
void doAdvance(Iter& iter, Dist d, std::input_iterator_tag) {
    if (d < 0) throw std::out_of_range("input iterator can't go backward");
    while (d--) ++iter;
}

template<typename Iter, typename Dist>
void advance(Iter& iter, Dist d) {
    doAdvance(iter, d,
              typename std::iterator_traits<Iter>::iterator_category{});
                                                                       // ← tag 객체 생성
}
```

**컴파일러가 tag로 적절한 오버로드 선택** — random_access면 `iter += d` 한 줄 인라인. 런타임 분기 0.

## traits 클래스 만들기 — 패턴 단계

```
1. 알고 싶은 정보 결정 (예: 카테고리, 값 타입)
2. 그 정보의 이름 선택 (예: iterator_category)
3. primary template — 사용자 타입은 멤버 typedef 갖는다고 가정
4. 부분 특수화로 내장 타입 / 특수 케이스 처리
5. 사용 시 — typename ::name으로 정보 추출
```

## 사용자 정의 traits 예 — Container 카테고리

```cpp
// 사용자 타입 카테고리
struct contiguous_container_tag {};
struct random_access_container_tag {};
struct sequence_container_tag {};

// traits 클래스
template<typename C>
struct container_traits {
    using category = typename C::container_category;
};

// 부분 특수화 — vector
template<typename T>
struct container_traits<std::vector<T>> {
    using category = contiguous_container_tag;
};

template<typename T>
struct container_traits<std::list<T>> {
    using category = sequence_container_tag;
};

// 사용
template<typename C, typename F>
void doForEach(C& c, F f, contiguous_container_tag) {
    // 벡터화 가능한 빠른 루프
}

template<typename C, typename F>
void doForEach(C& c, F f, sequence_container_tag) {
    // 일반 루프
}

template<typename C, typename F>
void forEach(C& c, F f) {
    doForEach(c, f, typename container_traits<C>::category{});
}
```

표준엔 없지만 — 사용자 라이브러리에서 유용한 패턴.

## `<type_traits>` 헤더 — 표준 traits 모음

C++11+ 표준이 제공하는 다양한 traits:

```cpp
#include <type_traits>

std::is_integral_v<int>            // true
std::is_floating_point_v<double>   // true
std::is_pointer_v<int*>            // true
std::is_const_v<const int>         // true

std::remove_const_t<const int>     // int (alias)
std::add_pointer_t<int>            // int*
std::decay_t<int&>                 // int
std::common_type_t<int, double>    // double
```

각 trait은 다음 형태:

```cpp
template<typename T>
struct is_integral {
    static constexpr bool value = /* ... */;
};

template<typename T>
inline constexpr bool is_integral_v = is_integral<T>::value;     // C++14 alias
```

`_v` 변수 alias (C++14), `_t` 타입 alias (C++14) — typename 부담 줄임.

## tag dispatch + `<type_traits>` — 컴파일 타임 분기

```cpp
template<typename T>
void process(T x) {
    if constexpr (std::is_integral_v<T>) {
        // 정수 전용 — C++17 if constexpr
    } else if constexpr (std::is_floating_point_v<T>) {
        // 부동 소수 전용
    } else {
        // 기타
    }
}
```

C++17 `if constexpr`로 tag dispatch보다 간결. 그러나 tag dispatch는 함수 오버로드 분리로 가독성 ↑ — 큰 함수에 유리.

## C++20 concepts — traits의 진화

```cpp
template<typename T>
concept Integral = std::is_integral_v<T>;

template<Integral T>
void process(T x) { /* 정수 전용 */ }

template<typename T>
    requires (!std::is_integral_v<T>)
void process(T x) { /* 비-정수 */ }
```

concepts는 traits를 인터페이스 명세로 — 호출 측에서 더 명확한 에러 메시지.

## 표준 traits 활용 — generic 코드

```cpp
template<typename Iter>
typename std::iterator_traits<Iter>::value_type 
sum(Iter first, Iter last) {
    typename std::iterator_traits<Iter>::value_type result{};
    while (first != last) {
        result += *first;
        ++first;
    }
    return result;
}

int arr[] = {1, 2, 3, 4, 5};
auto s = sum(arr, arr + 5);          // value_type == int
                                      // 결과 자동 int

std::vector<double> v{1.1, 2.2};
auto t = sum(v.begin(), v.end());     // value_type == double
```

traits로 추출한 정보로 — 반환 타입, 임시 변수, 컨테이너 등 결정.

## `numeric_limits` — 다른 traits

```cpp
template<typename T>
T computeWithMax() {
    T big = std::numeric_limits<T>::max();
    T small = std::numeric_limits<T>::lowest();
    bool isInt = std::numeric_limits<T>::is_integer;
    int digits = std::numeric_limits<T>::digits10;
    // ...
}
```

같은 traits 패턴 — 정수·부동 소수의 한계 정보 추출.

## 흔한 함정 — traits에 부분 특수화 잊기

```cpp
template<typename T>
struct my_traits {
    using value_type = typename T::value_type;
};

my_traits<int*>::value_type x;     // ❌ int*에 ::value_type 없음
```

내장 타입 / 특수 케이스에 부분 특수화 추가 잊으면 — 사용자가 못 씀.

```cpp
template<typename T>
struct my_traits<T*> {
    using value_type = T;
};

my_traits<int*>::value_type x;     // ✅ → int
```

## 패턴 — variadic traits

```cpp
template<typename... Ts>
struct largest_size;

template<typename T>
struct largest_size<T> {
    static constexpr size_t value = sizeof(T);
};

template<typename T, typename... Rest>
struct largest_size<T, Rest...> {
    static constexpr size_t value = std::max(sizeof(T), largest_size<Rest...>::value);
};

constexpr auto sz = largest_size<int, char, double>::value;     // 8
```

가변 인자 template으로 — 임의 개수 타입의 traits 추출.

## 모던 변형 — `std::derived_from`, concept 결합

```cpp
template<typename T>
concept HasValueType = requires {
    typename T::value_type;
};

template<HasValueType T>
typename T::value_type extract(T t) { return t.value; }
```

concept으로 traits의 존재 자체를 인터페이스에 명시.

## 실무 가이드

| 도구 | 사용처 |
| --- | --- |
| `iterator_traits` | iterator 카테고리·value_type 추출 |
| `<type_traits>` | 정수/부동 소수/포인터/const 등 분기 |
| 사용자 traits | 도메인 카테고리 (Container, Allocator 등) |
| tag dispatch | 함수 오버로드로 분기 (큰 함수) |
| `if constexpr` | 한 함수 안 분기 (C++17, 작은 분기) |
| concepts (C++20) | 인터페이스 명세 + 친절한 에러 |

## 실무 가이드 — 체크리스트

- [ ] 타입 정보로 컴파일 타임 분기가 필요한가?
- [ ] 표준 `<type_traits>` 로 충분한가? (정수, 포인터 등)
- [ ] 사용자 정의 traits — 도메인 카테고리?
- [ ] tag dispatch vs `if constexpr` — 본문 크기에 따라 선택?
- [ ] 부분 특수화로 내장 타입 처리?
- [ ] C++20 사용 가능 — concepts로 인터페이스 명시?

## 핵심 정리

1. **traits = 컴파일 타임 타입 정보 추출 클래스 패턴**
2. **primary template** + **부분 특수화** (내장 타입)
3. **tag dispatch** — 함수 오버로드로 컴파일 타임 분기 (비용 0)
4. **C++11+ `<type_traits>`** — `is_*`, `remove_*` 표준 traits
5. **C++14 `_t`, `_v` alias** — typename 부담 줄임
6. **C++17 `if constexpr`** — 한 함수 안 컴파일 타임 분기
7. **C++20 concepts** — traits의 인터페이스 명시화

## 관련 항목

- [항목 41: 암묵 인터페이스](/blog/programming/cpp/effective-cpp/item41-understand-implicit-interfaces-and-compile-time-polymorphism) — traits는 컴파일 타임 다형성의 도구
- [항목 42: typename 의 두 의미](/blog/programming/cpp/effective-cpp/item42-understand-the-two-meanings-of-typename) — traits 사용에 typename 필요
- [항목 48: 템플릿 메타프로그래밍](/blog/programming/cpp/effective-cpp/item48-be-aware-of-template-metaprogramming) — traits는 TMP의 일부
