---
title: "항목 48: 템플릿 메타프로그래밍을 인식하라"
date: 2025-02-07T17:00:00
description: "TMP — 컴파일 타임에 계산·코드 생성. C++11+ constexpr과 if constexpr이 많이 대체했지만 여전히 유효한 도구."
tags: [C++, Effective C++, Template, TMP]
series: "Effective C++"
seriesOrder: 48
---

## 왜 이 항목이 중요한가?

**Template Metaprogramming (TMP)** 은 C++ 템플릿 시스템이 우연히 **Turing-complete**라는 발견에서 시작된 영역이다. 컴파일 시점에 코드를 생성하고 계산해서 **런타임 비용 0의 추상화**를 만든다.

옛 TMP는 재귀 템플릿과 부분 특수화로 풀어 가독성이 끔찍했다. 모던 C++가 등장하면서 거의 모든 게 더 깔끔해졌다.

- **C++11+ `constexpr`** — 일반 함수로 컴파일 타임 계산.
- **C++17 `if constexpr`** — 정적 분기를 if 문 형태로.
- **C++20 concepts, `consteval`** — 인터페이스 명시, 컴파일 타임 강제.

그렇다고 TMP가 사라진 건 아니다. 표준 라이브러리(`<type_traits>`, `iterator_traits`, allocator 어댑터)는 여전히 TMP 패턴 위에 서 있다. 이 항목은 TMP의 핵심 패턴(트레이트, 정적 분기, 타입 변환)과 모던 C++의 대체 도구를 정리한다.

## 개요

**Template Metaprogramming (TMP)** 는 컴파일 시점에 코드를 생성·계산하는 기법이다. C++ 템플릿 시스템이 우연히 **Turing-complete**라는 발견에서 시작된 영역으로, 런타임 비용 0의 추상화를 가능하게 한다. C++11+의 `constexpr` 함수, C++17의 `if constexpr`, C++20의 concepts·`consteval`이 많은 부분을 단순화했지만 TMP의 핵심 패턴(트레이트, 정적 분기, 타입 변환)은 여전히 표준 라이브러리의 기반이다.

## 필수 개념: 왜 컴파일 타임 계산인가

> **초보자를 위한 배경 지식**

<br>

컴파일 타임 계산의 이점:
- **런타임 비용 0** — 결과가 컴파일된 바이너리에 상수로
- **타입 안전성** — 컴파일러가 모든 케이스 검증
- **인라인 친화** — 깊은 최적화 가능
- **에러 조기 발견** — 런타임이 아닌 컴파일 시점

단점:
- **컴파일 시간 ↑**
- **에러 메시지 종종 혼란**
- **디버깅 어려움** — 코드 자체가 존재 안 함

## 단순 예 — 컴파일 타임 factorial

전통적 TMP 방식:

```cpp
template<unsigned N>
struct Factorial {
    static constexpr unsigned value = N * Factorial<N-1>::value;
};

template<>     // 종료 조건
struct Factorial<0> {
    static constexpr unsigned value = 1;
};

constexpr auto x = Factorial<5>::value;   // 120 — 컴파일 타임에 계산
```

**작동 원리**:
- 템플릿이 재귀적으로 인스턴스화
- `Factorial<5>` → `5 * Factorial<4>` → `5 * 4 * Factorial<3>` → ... → `5 * 4 * 3 * 2 * 1 * 1`
- 종료 조건은 부분 특수화 `Factorial<0>`
- 컴파일러가 컴파일 시점에 전부 평가

C++11+ `constexpr` 함수로 훨씬 직관적:

```cpp
constexpr unsigned factorial(unsigned n) {
    return (n == 0) ? 1 : n * factorial(n - 1);
}

constexpr auto x = factorial(5);    // 120
```

C++14+ 에선 일반 함수처럼:

```cpp
constexpr unsigned factorial(unsigned n) {
    unsigned result = 1;
    for (unsigned i = 1; i <= n; ++i) result *= i;
    return result;
}
```

TMP 재귀의 부담 없이 명령형으로.

## TMP 활용 영역

### 1) 컴파일 타임 차원 분석 (dimensional analysis)

물리 단위를 컴파일 타임에 검증:

```cpp
template<int M, int L, int T>     // 질량·길이·시간 지수
struct Unit {
    double value;
};

using Length    = Unit<0, 1, 0>;     // m
using Time      = Unit<0, 0, 1>;     // s
using Velocity  = Unit<0, 1, -1>;    // m/s
using Mass      = Unit<1, 0, 0>;     // kg
using Force     = Unit<1, 1, -2>;    // kg·m/s²

template<int M1, int L1, int T1, int M2, int L2, int T2>
Unit<M1+M2, L1+L2, T1+T2> operator*(Unit<M1, L1, T1> a, Unit<M2, L2, T2> b) {
    return {a.value * b.value};
}

template<int M1, int L1, int T1, int M2, int L2, int T2>
Unit<M1-M2, L1-L2, T1-T2> operator/(Unit<M1, L1, T1> a, Unit<M2, L2, T2> b) {
    return {a.value / b.value};
}

Length   d{100};        // 100 m
Time     t{10};         // 10 s
Velocity v = d / t;     // ✅ Length / Time = Velocity (자동 추론)
Length   bad = d + t;   // ❌ 컴파일 에러 (다른 단위 합치기)
```

차원 mismatch가 **컴파일 에러**로 잡힘 — 화성 탐사선 추락 같은 단위 오류 방지.

### 2) 컴파일 타임 알고리즘 (loop unrolling)

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

Loop<5>::run([](int i) {
    std::cout << i << '\n';
});
// 컴파일 후: f(0); f(1); f(2); f(3); f(4); — 완전 unroll
```

C++17 fold expression이 더 깔끔:

```cpp
template<size_t... Is, typename F>
void unrollImpl(std::index_sequence<Is...>, F f) {
    (f(Is), ...);     // C++17 fold — f(0); f(1); ...; f(N-1);
}

template<size_t N, typename F>
void unroll(F f) {
    unrollImpl(std::make_index_sequence<N>{}, f);
}

unroll<5>([](int i) { std::cout << i << '\n'; });
```

### 3) 타입 변환 / 트레이트

`<type_traits>` 헤더 전체가 TMP — 컴파일 타임에 타입 변환·검사.

```cpp
std::remove_const_t<const int>    // int
std::add_pointer_t<int>           // int*
std::common_type_t<int, double>   // double

// 직접 작성도 가능
template<typename T>
struct add_const {
    using type = const T;
};

template<typename T>
using add_const_t = typename add_const<T>::type;
```

### 4) compile-time dispatch (tag dispatch)

항목 47의 traits와 결합 — iterator 카테고리별 함수 선택.

### 5) SFINAE / `requires` / concepts

```cpp
// C++11 SFINAE
template<typename T>
std::enable_if_t<std::is_integral_v<T>, T>
abs(T x) { return x < 0 ? -x : x; }

// C++20 requires/concepts
template<typename T>
    requires std::integral<T>
T abs(T x) { return x < 0 ? -x : x; }

// C++20 concept 직접 사용
template<std::integral T>
T abs(T x) { return x < 0 ? -x : x; }
```

조건 만족하는 타입에만 함수 활성화.

## TMP의 단점 — 현실

### 에러 메시지

전통 TMP의 에러 메시지는 악명 높음:

```
error: incomplete type 'std::enable_if<false, ...>' used in nested name specifier
note: in instantiation of 'enable_if<...> ...' requested here
note: in instantiation of function template specialization 'foo<...>' requested here
...
(수십 줄의 인스턴스화 체인)
```

C++20 concepts가 이를 크게 개선:

```
error: constraints not satisfied for 'foo'
note: 'std::integral<MyType>' was not satisfied
```

### 컴파일 시간

깊은 재귀 + 많은 인스턴스화 = **컴파일 분 단위로 증가**. Boost.MPL 같은 무거운 TMP는 한 파일 컴파일에 수 분.

### 디버깅

TMP 코드는 디버거에서 볼 수 없음 — 컴파일 후 사라짐. 디버그는 **컴파일 에러 메시지**가 거의 유일한 도구.

## 현대화 — TMP의 자리 축소

C++ 11/14/17/20의 새 기능들이 TMP의 많은 사용처를 대체:

| 옛 TMP | 현대 대체 |
| --- | --- |
| 재귀 템플릿으로 컴파일 타임 계산 | `constexpr` 함수 |
| 컴파일 타임 분기 (`std::conditional`) | `if constexpr` (C++17) |
| SFINAE (`enable_if`) | concepts / requires (C++20) |
| 재귀 unroll | fold expression (C++17) |
| 타입 리스트 / `type_index` | `std::tuple`, `std::variant` |

```cpp
// 옛 TMP
template<typename T>
typename std::enable_if<std::is_integral<T>::value, void>::type
process(T) { /* 정수 */ }

template<typename T>
typename std::enable_if<!std::is_integral<T>::value, void>::type
process(T) { /* 비-정수 */ }

// C++17
template<typename T>
void process(T) {
    if constexpr (std::is_integral_v<T>) { /* 정수 */ }
    else                                 { /* 비-정수 */ }
}

// C++20
template<std::integral T>
void process(T) { /* 정수 */ }

template<typename T>
    requires (!std::integral<T>)
void process(T) { /* 비-정수 */ }
```

## TMP의 정당한 영역 — 여전히 살아 있는 곳

- **표준 라이브러리 내부** — `<type_traits>`, `<algorithm>` 구현
- **고급 메타프로그래밍** — `boost::hana`, expression templates
- **DSL (Domain-Specific Language)** — `boost::spirit`(파서), Eigen(선형대수)
- **컴파일 타임 코드 생성** — 사용자 입력 없이 컴파일러가 결정 가능한 모든 것
- **legacy 호환 코드** — concepts 도입 전 라이브러리

## 모던 TMP — `std::integer_sequence`, fold expression

C++14+ 도구로 TMP가 한결 깔끔:

```cpp
template<typename... Args>
void printAll(Args... args) {
    (std::cout << ... << args) << '\n';     // C++17 fold
    // printAll(1, 2.5, "hi") → 1 << 2.5 << "hi" << '\n';
}
```

```cpp
template<typename Tuple, size_t... Is>
void printTupleImpl(const Tuple& t, std::index_sequence<Is...>) {
    ((std::cout << std::get<Is>(t) << " "), ...);    // fold
}

template<typename... Args>
void printTuple(const std::tuple<Args...>& t) {
    printTupleImpl(t, std::make_index_sequence<sizeof...(Args)>{});
}
```

## 실무 가이드 — TMP 사용 결정

```
컴파일 타임 계산/타입 분기가 필요한가?
├── 단순 값 계산 → constexpr 함수
├── 단순 타입 분기 → if constexpr (C++17)
├── 인터페이스 제약 → concepts (C++20)
├── 표준 traits로 충분 → <type_traits>
├── 고급 메타프로그래밍 (DSL, expression templates)
│   ├── C++17+ → fold expression, index_sequence
│   └── C++03 호환 필요 → 전통 TMP
└── 의심되면 → 단순한 도구 우선 (constexpr, if constexpr)
```

## 실무 가이드 — 체크리스트

- [ ] `constexpr` 함수로 충분한가? (대부분의 컴파일 타임 계산)
- [ ] `if constexpr`로 분기 가능? (C++17+)
- [ ] concepts로 제약 표현? (C++20+)
- [ ] 표준 `<type_traits>`로 충분?
- [ ] 컴파일 시간 영향 측정?
- [ ] 에러 메시지가 사용자에게 친절한가?

## 핵심 정리

1. **TMP = 컴파일 타임 계산·코드 생성** — 런타임 비용 0
2. **차원 분석, loop unrolling, traits, dispatch** — 다양한 활용
3. **단점**: 에러 메시지, 컴파일 시간, 디버깅
4. C++11+ **`constexpr`**, C++17 **`if constexpr`**, C++20 **concepts**가 많은 자리 대체
5. **표준 도구 우선** — 직접 TMP 작성은 신중히
6. fold expression, `integer_sequence` 등 모던 도구로 TMP가 한결 깔끔

## 관련 항목

- [항목 41: 암묵 인터페이스 + 컴파일 타임 다형성](/blog/programming/cpp/effective-cpp/item41-understand-implicit-interfaces-and-compile-time-polymorphism) — TMP의 다형성 측면
- [항목 47: traits 클래스](/blog/programming/cpp/effective-cpp/item47-use-traits-classes-for-information-about-types) — TMP의 대표적 사용
- [Effective Modern C++ 항목 14: noexcept](/blog/programming/cpp/effective-modern-cpp/item14-declare-functions-noexcept-if-they-wont-emit-exceptions) — 모던 TMP의 응용
