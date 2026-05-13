---
title: "항목 24: 모든 템플릿 인수의 콘셉트를 명시하라"
date: 2026-05-10T13:00:00
description: "C++20 콘셉트 — 템플릿 요구사항을 시그니처에 명시. 친절한 에러, 문서, 오버로드 해결을 동시에."
tags: [C++, Concepts, Templates]
series: "Beautiful C++"
seriesOrder: 24
draft: false
draft: true
---

## 왜 이 항목이 중요한가?

C++17까지의 템플릿 — **"덕 타이핑"**(duck typing)이다. 타입 T가 함수 본문의 모든 연산을 만족하면 OK, 아니면 에러. 그러나 그 에러는 — **인스턴스화 깊은 곳에서 발생**, 수십~수백 줄의 의미 불명 메시지로 사용자에게 도달.

```cpp
template<typename T>
T add(T a, T b) { return a + b; }

add(std::string{"x"}, 3);     // 컴파일 에러 — 한 줄짜리 잘못이 30줄 에러 메시지
```

C++20 **콘셉트(concepts)** — 타입 요구사항을 **시그니처에 명시**. 컴파일러가 호출 시점에 검증, 친절한 에러 메시지. 더 나아가 — 문서·자동완성·오버로드 해결까지 한 번에 해결.

## 핵심 내용

- C++20 콘셉트는 **템플릿 인자가 만족해야 할 요구사항**을 시그니처에 명시
- 콘셉트 없이 템플릿을 쓰면 잘못된 타입을 넘겼을 때 **수십 줄짜리 의미 불명 에러**
- 콘셉트는 **문서·검증·오버로드 해결**을 동시에 해결
- 표준 콘셉트(`std::integral`, `std::ranges::range`, `std::invocable`...)부터 적극 활용

## 비교 — 콘셉트 없음 vs 있음

### Bad: 요구사항이 시그니처에 없음

```cpp
template<typename T>
T add(T a, T b) { return a + b; }

add(std::string{"x"}, 3);
```

C++17 에러:
```
error: no match for 'operator+' (operand types are 'std::string' and 'int')
note: in instantiation of function template specialization 'add<std::string>'
note: candidate: 'T add(T, T) [with T = std::string]'
... (수십 줄 더) ...
```

사용자가 "왜 안 되는지" 파악하려면 — 템플릿 인스턴스화 체인 탐험.

### Good: 콘셉트로 명시

```cpp
template<std::integral T>
T add(T a, T b) { return a + b; }

add(1, 2);                    // ✅
add(std::string{"x"}, 3);     // ❌ 컴파일 에러:
                               // "T must satisfy std::integral"
                               // "std::string is not integral"
```

- 시그니처가 요구사항 명시 — 자기 문서화
- 에러가 **호출 지점**에서 발생 — 인스턴스화 전
- 메시지 친절

## 표준 콘셉트 — `<concepts>` 헤더

```cpp
#include <concepts>

template<std::integral T>           // int, long, char, bool 등
T abs(T x);

template<std::floating_point T>      // float, double, long double
T round(T x);

template<std::signed_integral T>     // signed int 만
T negate(T x);

template<std::regular T>             // 복사·이동·기본생성·==·!= 가능
class Set;

template<std::invocable<int> F>      // f(int) 호출 가능
void apply(F f);

template<std::ranges::range R>       // begin/end가 있는 컨테이너
void process(R&& r);
```

표준이 제공하는 흔한 요구사항. 직접 정의하지 말고 표준 우선.

## 사용자 정의 콘셉트 — `requires` 식

```cpp
template<typename T>
concept Hashable = requires(T t) {
    { std::hash<T>{}(t) } -> std::convertible_to<std::size_t>;
};

template<Hashable K, typename V>
class Cache { /* ... */ };

Cache<int, std::string> c1;        // ✅ int는 std::hash 지원
Cache<NoHash, std::string> c2;     // ❌ NoHash는 hashable 아님
```

`requires (T t) { ... }` 문법 — `t`에 대해 호출 가능해야 하는 표현식들.

여러 요구사항:

```cpp
template<typename T>
concept Container = requires(T c) {
    { c.begin() } -> std::input_iterator;
    { c.end()   } -> std::input_iterator;
    { c.size()  } -> std::convertible_to<std::size_t>;
    typename T::value_type;          // 타입 멤버 존재
};
```

## 콘셉트 문법 — 4가지 형태

같은 의미의 4가지 표현:

```cpp
// 1) template 인자에
template<std::integral T>
T f(T x);

// 2) requires 절
template<typename T>
    requires std::integral<T>
T f(T x);

// 3) 함수 인자 abbreviated (C++20)
T f(std::integral auto x);

// 4) auto 자체 (가장 짧음)
std::integral auto f(std::integral auto x);
```

상황에 따라 짧은 것 선택. (4)는 매개변수 타입이 정해진 함수에서 가장 깔끔.

## 콘셉트로 오버로드 해결

```cpp
template<std::integral T>
T process(T x) { return x * 2; }

template<std::floating_point T>
T process(T x) { return x * 1.5; }

process(5);       // integral 호출 — 10
process(5.0);     // floating_point 호출 — 7.5
process("x");     // ❌ 매칭되는 오버로드 없음 — 친절한 에러
```

옛 SFINAE보다 훨씬 우아.

## SFINAE에서 콘셉트로 마이그레이션

```cpp
// 옛 SFINAE
template<typename T,
         typename = std::enable_if_t<std::is_integral_v<T>>>
T abs(T x) {
    return x < 0 ? -x : x;
}

// 모던 콘셉트
template<std::integral T>
T abs(T x) {
    return x < 0 ? -x : x;
}
```

같은 효과 — 훨씬 짧고 명확.

## 콘셉트 조합

```cpp
// 콘셉트끼리 조합
template<typename T>
concept Numeric = std::integral<T> || std::floating_point<T>;

template<typename T>
concept Iterable = requires(T c) {
    c.begin();
    c.end();
};

template<typename T>
concept NumericIterable = Iterable<T> &&
                           Numeric<std::ranges::range_value_t<T>>;

template<NumericIterable C>
auto sum(const C& c);
```

`&&`, `||`로 조합. 복잡한 요구사항도 작은 콘셉트로 빌드.

## 콘셉트의 4가지 효과

### 1) 문서

```cpp
template<std::ranges::sortable_range R>
void my_sort(R&& r);
```

시그니처만 봐도 — "sortable한 range 받음".

### 2) 검증

```cpp
my_sort(std::vector<int>{});      // ✅
my_sort(std::set<int>{});          // ❌ set은 sortable 아님 — 호출 지점에서 에러
```

잘못된 사용 — 컴파일 즉시 차단.

### 3) 오버로드 해결

```cpp
template<std::integral T>      void process(T);
template<std::ranges::range R> void process(R&&);

process(42);          // integral 버전
process(vec);          // range 버전
```

같은 이름, 다른 콘셉트 — 자동 선택.

### 4) IDE 지원

```cpp
template<std::ranges::range R>
void process(R&& r) {
    r.    // ← IDE 자동완성: range의 멤버 (begin, end, size 등) 우선 표시
}
```

콘셉트가 IDE에 — "이 매개변수는 range" 라는 힌트 제공.

## 함정 — 너무 강한 콘셉트

```cpp
template<std::random_access_range R>     // ⚠️ 너무 강한 요구
void process(R&& r) {
    for (auto& x : r) { /* ... */ }      // 사실 forward_range로 충분
}
```

본문이 요구하지 않는 능력을 콘셉트로 요구 — 호환 타입을 불필요하게 배제.

해결: **본문이 정말 요구하는 최소 콘셉트** 사용.

```cpp
template<std::ranges::forward_range R>
void process(R&& r) { /* ... */ }
```

## 함정 — 콘셉트가 너무 약함

```cpp
template<typename T>      // 콘셉트 없음
void process(T x) {
    x.specific_method();   // 사용자 정의 메서드 호출
}
```

요구사항을 코드 본문에 숨김 — 사용자가 시그니처 보고 추측 못 함. 명시:

```cpp
template<typename T>
concept HasSpecificMethod = requires(T t) { t.specific_method(); };

template<HasSpecificMethod T>
void process(T x) { x.specific_method(); }
```

## 콘셉트의 컴파일 시간 영향

콘셉트 검증 자체 — 비교적 빠름. 큰 영향은:
- **에러 발견 조기화** — 빌드 실패 빠름
- **인스턴스화 줄임** — 잘못된 호출 차단

전반적으로 — 콘셉트 사용이 컴파일을 더 빠르게 함 (잘못된 인스턴스화 차단으로).

## 표준 라이브러리 — 콘셉트 활용

```cpp
// C++20 ranges 알고리즘
template<std::ranges::input_range R>
auto count(R&& r);

template<std::ranges::sortable_range R, std::invocable<...> Comp>
void sort(R&& r, Comp comp);

template<std::ranges::input_range R, std::indirectly_unary_invocable<...> F>
auto transform(R&& r, F f);
```

표준이 — 모든 새 API에 콘셉트 사용. 사용자도 따라가는 게 일관성.

## 모던 변형 — `std::integral auto`

```cpp
auto multiply(std::integral auto a, std::integral auto b) {
    return a * b;
}

multiply(2, 3);       // OK — int * int = 6
multiply(2L, 3);      // OK — long * int = long
multiply(2.5, 3);     // ❌ — 2.5는 integral 아님
```

함수 매개변수의 콘셉트 — 가장 짧고 자연스러운 표현.

## 실무 가이드 — 결정

```
템플릿 매개변수가 있다 — 콘셉트 명시?
├── 표준 콘셉트로 표현 가능 → 그대로 사용
├── 도메인 특화 요구사항 → requires 식으로 정의
├── 단일 사용 → 짧으면 requires 절 직접
└── 여러 곳 재사용 → 명명된 콘셉트 정의
```

## 실무 가이드 — 체크리스트

- [ ] 모든 템플릿 매개변수가 콘셉트 제약을 가지는가?
- [ ] 표준 콘셉트(`std::integral` 등) 활용?
- [ ] 도메인 특화는 사용자 정의 콘셉트?
- [ ] 가장 짧은 문법 선택 (`auto`, abbreviated, requires)?
- [ ] 본문이 요구하지 않는 능력 콘셉트로 요구하지 않는가?
- [ ] 콘셉트 이름이 도메인 의미?

## 정리

콘셉트는 **템플릿의 자기소개서**다. 타입에 거는 기대를 코드로 적어두면 컴파일러가 검사해 주고, 다음에 보는 사람도 의도를 바로 안다.

도구 사다리:
1. **표준 콘셉트** — `std::integral`, `std::ranges::range` 등
2. **사용자 정의 콘셉트** — `requires` 식
3. **`auto` + 콘셉트** — `std::integral auto x`
4. **콘셉트 조합** — `&&`, `||`

C++20+ 코드에선 — 모든 새 템플릿에 콘셉트.

## 관련 항목

- [항목 23: 템플릿 추상화](/blog/programming/cpp/beautiful-cpp/item23-use-templates-for-abstraction) — 콘셉트와 결합
- [항목 12: TMP 최소화](/blog/programming/cpp/beautiful-cpp/item12-use-template-metaprogramming-sparingly) — SFINAE → 콘셉트
- [항목 25: 정적 타입 안전성](/blog/programming/cpp/beautiful-cpp/item25-static-type-safety) — 콘셉트는 타입 안전성의 핵심
