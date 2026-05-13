---
title: "항목 23: 템플릿을 사용하여 코드의 추상화 수준을 높이라"
date: 2026-05-10T12:00:00
description: "타입별 복붙을 템플릿으로 일반화 — 컴파일 타임 다형성, 런타임 비용 0, C++20 concepts로 안전성."
tags: [C++, Templates, Generic Programming]
series: "Beautiful C++"
seriesOrder: 23
draft: false
draft: true
---

## 왜 이 항목이 중요한가?

타입마다 거의 같은 함수를 복붙하는 코드는 — 흔하고, 위험하다.

```cpp
int sum_int(const std::vector<int>& v);
double sum_double(const std::vector<double>& v);
int64_t sum_int64(const std::vector<int64_t>& v);
// ... 또 ...
```

문제:
- 본문이 거의 동일 — DRY 위반
- 한 곳을 수정하면 다른 곳도 수정해야 함
- 새 타입이 추가될 때마다 새 함수
- 사용자 정의 타입은 일일이 지원 못 함

C++ **템플릿**이 정답. 같은 알고리즘을 타입에 추상화 — 컴파일러가 각 타입별 인스턴스를 생성. 런타임 비용 0 (가상 함수 디스패치 없음), 컴파일 타임에 모든 타입이 결정.

C++20 **concepts** 와 함께 — 템플릿 매개변수의 요구사항을 명시. 친절한 에러 메시지, 자동완성 지원, 의도 명확.

## 핵심 내용

- 타입마다 거의 같은 함수를 여러 번 쓰고 있다면 **템플릿이 정답**
- 템플릿은 **컴파일 타임 다형성** — 가상 함수의 런타임 비용 없이 일반화
- 알고리즘은 자료구조에서, 자료구조는 원소 타입에서 분리해 재사용성을 높여라
- C++20 **콘셉트**로 템플릿 인자가 만족해야 할 요구사항을 명시하면 진단 메시지가 깔끔

## 비교 — 복붙 vs 템플릿 vs concepts

### Bad: 타입마다 복붙

```cpp
int sum_int(const std::vector<int>& v) {
    int s = 0;
    for (auto x : v) s += x;
    return s;
}

double sum_double(const std::vector<double>& v) {
    double s = 0;
    for (auto x : v) s += x;
    return s;
}
```

문제 — 함수 본문 동일, 타입만 다름. 한 곳 수정 시 다른 곳도.

### Good: 템플릿으로 일반화

```cpp
template<typename T>
T sum(const std::vector<T>& v) {
    T s{};
    for (const auto& x : v) s += x;
    return s;
}

auto a = sum<int>(int_vec);       // 또는 sum(int_vec)
auto b = sum<double>(double_vec);
auto c = sum<std::string>(string_vec);     // string의 + 연산자 활용
```

한 정의 — 모든 타입. C++17 CTAD(Class Template Argument Deduction)로 `<int>` 생략도 가능.

### Better: 콘셉트로 요구사항 명시 (C++20)

```cpp
template<std::ranges::range R>
    requires std::is_arithmetic_v<std::ranges::range_value_t<R>>
auto sum(const R& r) {
    std::ranges::range_value_t<R> s{};
    for (const auto& x : r) s += x;
    return s;
}

auto a = sum(int_vec);       // OK
auto b = sum(int_array);     // C 배열도 OK — range concept
auto c = sum(string_vec);    // ❌ 컴파일 에러 — string은 arithmetic 아님
                              // 에러 메시지: "constraint 'is_arithmetic_v' not satisfied"
```

- **range 컨테이너 어떤 것도** 받음 — vector, array, span 등
- 요구사항이 시그니처에 명시 — `is_arithmetic_v`
- 잘못된 사용에 친절한 에러

## 템플릿 vs 가상 함수 — 다형성 비교

```cpp
// 가상 함수 — 런타임 다형성
class Container {
public:
    virtual ~Container() = default;
    virtual int sum() const = 0;
};

class IntContainer : public Container { /* ... */ };
class DoubleContainer : public Container { /* ... */ };

void process(Container& c) {
    c.sum();     // vtable lookup → 간접 호출
}
```

```cpp
// 템플릿 — 컴파일 타임 다형성
template<typename T>
T sum(const std::vector<T>& v) { /* ... */ }

sum(v);     // 컴파일 시 인라인 가능 — 0 비용
```

| 측면 | 가상 함수 | 템플릿 |
| --- | --- | --- |
| 다형성 시점 | 런타임 | 컴파일 타임 |
| 런타임 비용 | vtable lookup | 0 |
| 인라인 가능 | 보통 X | 가능 |
| 코드 부피 | 단일 | 인스턴스마다 |
| 다양한 타입 한 컨테이너 | OK (`vector<Base*>`) | 별도 인스턴스 |
| 에러 시점 | 런타임 (실패 시) | 컴파일 |

## 알고리즘과 자료구조 분리

표준 라이브러리의 큰 통찰:

```cpp
std::sort(v.begin(), v.end());                  // 알고리즘
std::find(v.begin(), v.end(), target);
std::accumulate(v.begin(), v.end(), 0);
```

- **자료구조** (vector, list, array) — 원소 보관
- **반복자** — 자료구조와 알고리즘의 인터페이스
- **알고리즘** — 어떤 자료구조든 작동 (반복자만 맞으면)

이 분리가 — STL의 본질. 컨테이너 N개 × 알고리즘 M개 = N×M 코드가 → **N + M**.

## 함정 — 템플릿 남용

```cpp
// Bad: 단일 사용처를 위한 템플릿
template<typename T>
class MyVector {
    // ... std::vector 비슷하게 ...
};

// 실제 사용
MyVector<int> v;     // int만 사용
```

진짜로 여러 타입을 처리해야 할 때만 템플릿. 단일 타입에 템플릿은 과잉.

기준:
- **2개 이상 다른 타입을 같은 코드로 처리** → 템플릿
- **단일 타입** → 일반 함수
- **타입을 컴파일 타임에 모름** → 가상 함수

## C++20 concepts — 자세히

### 1) 표준 concepts

```cpp
template<std::integral T>           T abs(T x);
template<std::floating_point T>     T round(T x);
template<std::regular T>            class Set;     // 복사+비교 가능
template<std::ranges::range R>      auto begin(R&& r);
template<std::ranges::sortable_range R> void sort(R&& r);
```

`<concepts>` 헤더 — 흔한 요구사항 표준화.

### 2) 사용자 정의 concept

```cpp
template<typename T>
concept Container = requires(T t) {
    t.begin();
    t.end();
    t.size();
    typename T::value_type;
};

template<Container C>
void process(const C& c) {
    for (const auto& x : c) {
        // ...
    }
}
```

`requires` 표현식으로 — 타입이 만족해야 할 인터페이스 명시.

### 3) 다양한 문법

```cpp
// 1) template 인자에
template<std::integral T>
void f(T x);

// 2) requires 절
template<typename T>
    requires std::integral<T>
void g(T x);

// 3) 추론된 인자
void h(std::integral auto x);

// 모두 같은 의미
```

## SFINAE → concepts 마이그레이션

```cpp
// 옛 SFINAE
template<typename T, typename = std::enable_if_t<std::is_integral_v<T>>>
void process(T x);

// 모던 concepts
template<std::integral T>
void process(T x);
```

같은 효과, **훨씬 읽기 쉬움 + 에러 메시지 친절**.

## 함정 — 템플릿 에러 메시지

```cpp
template<typename T>
T sum(const std::vector<T>& v) {
    T s{};
    for (const auto& x : v) s += x;     // operator+= 필요
    return s;
}

struct NoOp {};
sum(std::vector<NoOp>{});     // 컴파일 에러:
                               // "no match for 'operator+='"
                               // 깊은 인스턴스화 체인 안에서
```

C++17까지의 템플릿 에러 — 매우 혼란스러움. concepts로 사전 차단:

```cpp
template<typename T>
concept Summable = requires(T a, T b) {
    { a += b } -> std::convertible_to<T&>;
};

template<Summable T>
T sum(const std::vector<T>& v) { /* ... */ }

sum(std::vector<NoOp>{});     // 친절한 에러:
                               // "NoOp does not satisfy Summable"
```

## C++17 클래스 템플릿 인자 추론 (CTAD)

```cpp
std::vector v{1, 2, 3};       // vector<int> 자동 추론 (C++17)
std::pair p{1, 2.0};          // pair<int, double>

std::lock_guard lock(mu);     // lock_guard<mutex>
```

명시적 `<int>` 생략 가능 — 호출 지점 깔끔.

사용자 클래스에 CTAD 지원:

```cpp
template<typename T>
class Box {
public:
    explicit Box(T value) : value_(value) {}
private:
    T value_;
};

// 추론 가이드 (필요 시)
template<typename T>
Box(T) -> Box<T>;

Box b(42);     // Box<int>
```

## 함정 — 컴파일 시간 증가

```cpp
template<typename T>
void process(T x);
```

각 다른 `T`에 대해 — 별도 인스턴스 생성. 같은 헤더를 N개 TU에 include하면 — 컴파일 시간 N배.

해결책:
- **명시적 인스턴스화** (`extern template`) — 한 곳에서만 생성
- **C++20 modules** — 인스턴스화 공유

```cpp
// widget.h
template<typename T>
class Widget { /* ... */ };

extern template class Widget<int>;     // 다른 TU에서 인스턴스화 안 함

// widget.cpp
template class Widget<int>;            // 여기서만 인스턴스화
```

## 모던 변형 — `auto` 매개변수 (C++14 lambda, C++20 함수)

```cpp
// C++14: generic lambda
auto sum = [](auto a, auto b) { return a + b; };

// C++20: abbreviated function template
auto sum(auto a, auto b) { return a + b; }      // 컴파일러가 template<...> 추가

// 같은 효과
template<typename T, typename U>
auto sum(T a, U b) { return a + b; }
```

`auto` 매개변수 — 가장 짧은 템플릿 작성법. C++20에서 함수에도 지원.

## 함정 — 너무 일반화

```cpp
// 과도한 일반화
template<typename Container, typename Predicate, typename Transformer>
auto process(Container&& c, Predicate p, Transformer t);
```

3개 템플릿 매개변수 — 사용하기 부담. 도메인에 맞는 적절한 추상화 수준 찾기:

```cpp
// 적절히
template<std::ranges::range R, typename F>
auto map_filter(R&& r, F f);
```

## 표준 라이브러리 예 — concept 사용

```cpp
template<std::ranges::input_range R>
auto count(R&& r) {
    return std::distance(std::ranges::begin(r), std::ranges::end(r));
}
```

표준 자체가 — concepts로 인터페이스 명세. 사용자도 같은 패턴 권장.

## 실무 가이드 — 결정 트리

```
같은 알고리즘을 여러 타입에 적용해야 하나?
├── 1-2개 타입만 → 오버로드
├── 다양한 타입, 컴파일 타임 알려짐 → 템플릿
├── 다양한 타입, 런타임 결정 → 가상 함수 또는 std::variant
└── 컨테이너 어떤 것이든 → C++20 ranges + concepts
```

## 실무 가이드 — 체크리스트

- [ ] 타입마다 복붙된 코드 — 템플릿으로 일반화?
- [ ] 가상 함수 비용을 컴파일 타임 다형성으로 회피?
- [ ] C++20 concepts로 요구사항 명시?
- [ ] CTAD로 호출 지점 깔끔?
- [ ] C++20 `auto` 매개변수로 짧게?
- [ ] 컴파일 시간 영향 측정?
- [ ] 너무 일반화하지 않았는가?

## 정리

반복되는 타입 종속 코드는 **템플릿으로 들어 올려라**. 콘셉트와 함께 쓰면 안전성·성능·가독성을 모두 얻는다.

도구 사다리:
1. **일반 함수** — 단일 타입
2. **오버로드** — 2-3개 타입
3. **`template<typename T>`** — 여러 타입 일반화
4. **C++20 `concept`** — 요구사항 명시
5. **`auto` 매개변수** (C++20) — 가장 짧은 템플릿
6. **`std::ranges`** — 컨테이너 + 알고리즘 결합

## 관련 항목

- [항목 12: TMP 최소화](/blog/programming/cpp/beautiful-cpp/item12-use-template-metaprogramming-sparingly) — 단순 템플릿 vs TMP
- [항목 24: concept으로 제약](/blog/programming/cpp/beautiful-cpp/item24-specify-concepts-for-template-args) — concepts 심층
- [Effective C++ 항목 41: 암묵 인터페이스](/blog/programming/cpp/effective-cpp/item41-understand-implicit-interfaces-and-compile-time-polymorphism) — 템플릿 다형성
