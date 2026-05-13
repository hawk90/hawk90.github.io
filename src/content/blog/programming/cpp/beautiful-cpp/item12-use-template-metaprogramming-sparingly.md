---
title: "항목 12: 꼭 필요할 때만 템플릿 메타프로그래밍을 사용하라"
date: 2026-05-09T11:00:00
description: "TMP의 비용 — 컴파일 폭증, 에러 메시지 지옥, 디버깅 불가. constexpr / if constexpr / concepts라는 모던 대안."
tags: [C++, Templates, Metaprogramming]
series: "Beautiful C++"
seriesOrder: 12
draft: false
draft: true
---

## 왜 이 항목이 중요한가?

C++ 템플릿이 Turing-complete라는 사실은 1990년대 후반에 발견됐다. 이후 한동안 — "TMP로 모든 것을 컴파일 타임에"가 유행. 그러나 실전에서 드러난 비용은 컸다:

- **컴파일 시간 폭증** — 깊은 재귀 인스턴스화로 빌드가 수 분
- **에러 메시지 지옥** — 한 줄짜리 잘못이 수백 줄의 인스턴스화 체인
- **디버깅 불가** — TMP 코드는 컴파일 후 사라짐, 디버거에서 안 보임
- **사용자가 보고 도망감** — 라이브러리 학습 곡선 절벽

C++11 `constexpr` 함수, C++17 `if constexpr`, C++20 **concepts**가 차례로 TMP의 많은 자리를 대체했다. 이 항목은 — 같은 일을 모던 도구로 더 읽기 쉽게 하는 패턴.

## 핵심 내용

- TMP는 강력하지만 **컴파일 시간 폭증 · 에러 메시지 지옥 · 디버깅 불가**라는 큰 비용
- 같은 일을 `constexpr` 함수, `if constexpr`, concepts로 해결할 수 있다면 그쪽이 훨씬 읽기 쉽다
- 라이브러리 작성자에게는 도구지만, **응용 코드에서는 대부분 과잉**
- 적용 전에 **단순한 대안 → 템플릿 → TMP** 순서로 검토

## 비교 — 옛 TMP vs 모던

### Factorial — TMP 대 constexpr 함수

```cpp
// 옛 TMP: 재귀 템플릿
template<int N>
struct Fact { 
    static constexpr int value = N * Fact<N-1>::value; 
};
template<>
struct Fact<0> { 
    static constexpr int value = 1; 
};

constexpr int x = Fact<5>::value;     // 120
```

문제:
- 두 클래스 정의 + 특수화
- 인스턴스화 비용
- 에러 시 깊은 템플릿 체인

```cpp
// 모던: constexpr 함수 (C++11+)
constexpr int fact(int n) { 
    return n <= 1 ? 1 : n * fact(n - 1); 
}

constexpr int x = fact(5);
```

함수 한 개. 일반 코드처럼 읽힘.

C++14+는 더 자연스럽게:

```cpp
constexpr int fact(int n) {
    int result = 1;
    for (int i = 2; i <= n; ++i) result *= i;
    return result;
}
```

### 타입별 분기 — SFINAE vs if constexpr

```cpp
// 옛 TMP: SFINAE
template<typename T,
         typename = std::enable_if_t<std::is_integral_v<T>>>
void process(T v) { /* 정수 처리 */ }

template<typename T,
         typename = std::enable_if_t<std::is_floating_point_v<T>>>
void process(T v) { /* 부동소수 처리 */ }
```

문제:
- 두 오버로드 작성
- 매개변수 default trick으로 SFINAE 트리거
- 에러 메시지가 매우 혼란

```cpp
// 모던: if constexpr (C++17)
template<typename T>
void process(T v) {
    if constexpr (std::is_integral_v<T>)        { /* 정수 처리 */ }
    else if constexpr (std::is_floating_point_v<T>) { /* 부동소수 처리 */ }
    else                                        { /* 그 외 */ }
}
```

한 함수, 명확한 분기, 친절한 에러.

### Concept 제약 — 가장 명확

```cpp
// 옛 TMP: SFINAE / static_assert
template<typename T>
void compute(T v) {
    static_assert(std::is_arithmetic_v<T>, "T must be arithmetic");
    // ...
}
```

```cpp
// 모던: concept (C++20)
template<std::integral T>           // 또는 std::floating_point
void compute(T v) { /* ... */ }

// 더 모던
void compute(std::integral auto v) { /* ... */ }
```

타입 제약이 시그니처에 — 자동완성, 호버 정보, 에러 메시지 모두 개선.

## TMP가 여전히 빛나는 영역

모던 대안이 있지만, TMP가 더 적절한 곳:

### 라이브러리 내부 — `std::variant`, `std::tuple`

```cpp
// std::tuple 구현 — TMP 없이 못 함
template<typename Head, typename... Tail>
class tuple {
    Head head_;
    tuple<Tail...> tail_;
    // ...
};
```

가변 인자 템플릿 자체가 TMP.

### Expression Templates — Eigen, Blaze

```cpp
Vector v = a + b + c;
// 옛 방식: 임시 객체 두 개 (a+b가 임시, +c가 또 임시)
// Expression Templates: 모든 연산을 TMP로 묶음
//                       → 단일 루프로 변환 → 임시 없음
```

수치 계산 라이브러리의 성능 비결.

### 도메인 특화 언어 (DSL) — Boost.Spirit

파서 생성기를 컴파일 타임에 작성.

### Type Erasure 구현 — `std::function`, `std::any`

```cpp
template<typename T>
class Concept : public ConceptBase {
    T value_;
    // ...
};
```

내부 type erasure에 TMP 사용.

## 응용 코드의 TMP 함정

```cpp
// "내가 직접 std::vector 비슷한 걸 짜자"
template<typename T,
         template<typename> class Alloc = std::allocator,
         typename = std::enable_if_t<std::is_nothrow_move_constructible_v<T>>>
class MyVector {
    // ... TMP 가득 ...
};
```

응용 코드에서 이런 시도는 거의 항상 — **표준 라이브러리로 충분**한 경우. 자기 발등 찍기.

대신:
```cpp
using MyContainer = std::vector<T>;
```

## 컴파일 시간 비교 — 실제 측정

```cpp
// TMP factorial 5,000번 인스턴스화
template<int N> struct F { static constexpr int v = N * F<N-1>::v; };
template<> struct F<0> { static constexpr int v = 1; };
// 컴파일 시간 ~ 분 단위

// constexpr 함수 5,000번 호출
constexpr int fact(int n) { /* loop */ }
// 컴파일 시간 ~ 밀리초
```

TMP는 메모리·시간 모두 비쌈. 큰 프로젝트에서 누적되면 빌드가 끔찍해짐.

## 에러 메시지 차이

```
// SFINAE 실패
error: no matching function for call to 'process'
note: candidate template ignored: substitution failure
note: in substitution of 'enable_if_t<is_integral_v<T>, void>'
note: in instantiation of class template 'enable_if<false, void>'
... (50+ lines)
```

```
// concept 실패 (C++20)
error: no matching function for call to 'process'
note: constraint 'std::integral<T>' was not satisfied
note: 'T' is 'std::string'
```

concept이 더 친절. 사용자가 무엇이 잘못됐는지 빠르게 알 수 있음.

## C++23 — `if consteval`, `static operator()`

```cpp
constexpr int compute(int x) {
    if consteval {                // C++23
        return x * 2;             // 컴파일 타임 가지
    } else {
        return runtime_compute(x); // 런타임 가지
    }
}
```

컴파일 타임/런타임 분기를 명시적으로. TMP의 또 다른 사용처를 표준이 흡수.

## TMP 단순화 도구

복잡한 TMP가 정말 필요하면, 도와줄 라이브러리:

```cpp
// Boost.Hana (C++14+ 모던 TMP)
#include <boost/hana.hpp>
namespace hana = boost::hana;

// 옛 MPL 대신 hana — 컴파일 훨씬 빠름, 가독성 좋음
auto types = hana::tuple_t<int, double, std::string>;
auto sizes = hana::transform(types, [](auto t) { 
    return sizeof(typename decltype(t)::type); 
});
```

## 실무 가이드 — 결정 트리

```
컴파일 타임 계산/분기가 필요한가?
├── 단순 값 계산 → constexpr 함수 (C++11+)
├── 단순 타입 분기 → if constexpr (C++17)
├── 타입 제약 → concepts (C++20)
├── 표준 traits로 충분 → <type_traits>
├── 고급 메타프로그래밍 (DSL, expression templates)
│   ├── C++17+ → fold expression, index_sequence
│   └── 정말 필요 → Boost.Hana
└── 의심되면 → 단순한 도구 우선
```

## 실무 가이드 — 체크리스트

- [ ] `constexpr` 함수로 충분한가? (대부분의 컴파일 타임 계산)
- [ ] `if constexpr`로 분기 가능? (C++17+)
- [ ] concepts로 제약 표현? (C++20+)
- [ ] 표준 `<type_traits>`로 충분?
- [ ] 컴파일 시간 영향 측정?
- [ ] 에러 메시지가 사용자에게 친절한가?
- [ ] 정말 응용 코드에서 TMP가 필요한가, 라이브러리에 위임 가능?

## 정리

TMP는 **마지막 수단**이다. `constexpr`, `if constexpr`, concepts가 같은 일을 더 읽기 쉽게 해준다면 주저 말고 그쪽을 택하라.

도구 순위 (모던):
1. **`constexpr` 함수** — 컴파일 타임 값 계산
2. **`if constexpr`** — 컴파일 타임 분기
3. **concepts** — 인터페이스 제약
4. **`<type_traits>` 표준 traits** — 컴파일 타임 타입 정보
5. **fold expression + index_sequence** — 가변 인자 처리
6. **TMP** — 위 모두로 안 되는 마지막 경우만

## 관련 항목

- [항목 22: constexpr 컴파일 타임](/blog/programming/cpp/beautiful-cpp/item22-use-constexpr-for-compile-time) — 모던 컴파일 타임 도구
- [항목 23: 추상화에 템플릿 활용](/blog/programming/cpp/beautiful-cpp/item23-use-templates-for-abstraction) — 적절한 템플릿 사용
- [항목 24: concept으로 템플릿 제약](/blog/programming/cpp/beautiful-cpp/item24-specify-concepts-for-template-args) — concepts 활용
