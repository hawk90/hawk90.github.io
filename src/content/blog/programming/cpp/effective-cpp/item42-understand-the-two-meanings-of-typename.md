---
title: "항목 42: typename의 두 가지 의미를 이해하라"
date: 2025-02-07T11:00:00
description: "템플릿 매개변수 선언과 의존 타입(dependent type) 명시 — 같은 키워드, 두 용도. C++20에서의 완화."
tags: [C++, Effective C++, Template, typename]
series: "Effective C++"
seriesOrder: 42
---

## 개요

`typename` 키워드는 C++ 템플릿에서 **두 가지 다른 의미**로 사용됩니다:

1. **템플릿 매개변수 선언** — `class`와 동일한 용법
2. **의존 타입(dependent type) 명시** — "이건 타입이다"를 컴파일러에 알림

같은 키워드인데 의미가 다른 두 자리에 등장 — 처음 마주치면 혼란스럽지만, 두 의미가 모두 필요한 이유가 있습니다. C++20부터 일부 자리에서 생략 가능.

## 의미 1 — 템플릿 매개변수 선언

```cpp
template<typename T> void f();    // typename 사용
template<class    T> void f();    // class 사용 — 동일한 의미
```

두 형식은 **완전히 같음** — 차이 없음. 관습:
- 정통 STL/Stroustrup 스타일 — `class`
- 더 명확하고자 함 — `typename` (특히 `class`가 아닌 타입 받을 때 헷갈리지 않게)

```cpp
template<typename T>     // 어떤 타입이든 OK — class도, int도, std::string도
void process(T x);

template<class T>        // 같은 의미 — 이름이 'class'라도 클래스 한정 X
void process(T x);
```

## 의미 2 — 의존 타입 명시

```cpp
template<typename C>
void print2nd(const C& container) {
    C::const_iterator iter(container.begin());     // ❌ 컴파일 에러
    // ...
}
```

`C::const_iterator`가 **타입인지 값인지** 컴파일러는 모름 — `C`가 결정될 때까지.

```cpp
class MyContainer {
public:
    static int const_iterator;     // ⚠️ 이름이 const_iterator인 정적 변수
};
```

이런 클래스도 가능 — `C::const_iterator`가 변수일 수 있음.

**컴파일러의 기본 가정**: 의존 이름(`C::name` 형태에서 `name`)은 — **값**으로 해석.

타입이면 명시:

```cpp
template<typename C>
void print2nd(const C& container) {
    typename C::const_iterator iter(container.begin());   // ✅
    // typename — "이건 타입이야"
    ++iter;
    std::cout << *iter;
}
```

## 왜 이런 규칙이 있나

```cpp
template<typename T>
void f() {
    T::foo * x;     // T::foo가 무엇이냐에 따라 두 가지 해석:
                    //  (1) T::foo가 타입이면: 포인터 변수 x 선언
                    //  (2) T::foo가 변수이면: 곱셈 표현식 (결과 버림)
}
```

같은 구문이 **타입에 따라 완전히 다른 의미**. 컴파일러는 보수적으로 (2) 변수로 가정. 사용자가 (1) 의도라면 `typename`으로 명시:

```cpp
typename T::foo * x;   // (1) 포인터 변수 — 명확
```

## 함정 — 의존 이름 인지 안 함

```cpp
template<typename C>
class Wrapper {
    C::value_type val;     // ⚠️ 에러 — C::value_type이 타입인지 모름
};

template<typename C>
class Wrapper {
    typename C::value_type val;     // ✅
};
```

멤버 선언, 매개변수, 반환 타입 — 모두 의존 이름이면 `typename`.

```cpp
template<typename C>
typename C::iterator findElem(C& c) {     // 반환 타입에도
    typename C::iterator it = c.begin();    // 변수 선언에도
    // ...
    return it;
}
```

## 예외 — `typename` 안 쓰는 자리

다음 자리에선 의존 타입이라도 `typename` **금지** 또는 **생략**:

### 1) Base 클래스 목록

```cpp
template<typename T>
class Derived : public Base<T>::Nested {     // ⚠️ typename 안 씀
    // public : Base<T>::Nested 자리는 자동으로 타입
};

// 멤버 초기화 리스트도
Derived() : Base<T>::Nested() { /* ... */ }
```

베이스 클래스 자리는 문법적으로 타입만 올 수 있음 — 자동.

### 2) 멤버 초기화 리스트의 base 식별자

```cpp
template<typename T>
class Derived : public Base<T> {
public:
    Derived() : Base<T>() {}      // ✅ typename 불필요
};
```

같은 이유.

### 3) C++20부터 — 추론 가능한 자리

C++20은 더 많은 자리에서 `typename`을 생략 허용. 이전엔:

```cpp
template<typename T>
typename T::value_type extract(T& t);     // C++17까지 typename 필요
```

C++20:

```cpp
template<typename T>
T::value_type extract(T& t);              // ✅ — 반환 타입 자리는 추론
```

함수 반환 타입, alias 선언 등 일부 자리. 모든 의존 타입 자리는 아님 — 변수 선언에선 여전히 필요.

## 흔한 패턴 — 표준 라이브러리에서

```cpp
template<typename C>
typename C::value_type first(const C& c) {
    return *c.begin();
}

template<typename Iter>
typename std::iterator_traits<Iter>::value_type sum(Iter first, Iter last) {
    typename std::iterator_traits<Iter>::value_type total = {};
    for (; first != last; ++first) total += *first;
    return total;
}
```

`std::iterator_traits<Iter>::value_type`은 의존 타입 — `typename` 필요.

## `_t` 트레이트 alias — C++14 단순화

C++14부터 `<type_traits>` 의 `_t` alias가 `typename` 제거에 도움:

```cpp
// C++11
typename std::remove_const<typename C::value_type>::type x;

// C++14+ — _t alias 사용
std::remove_const_t<typename C::value_type> x;        // 하나만 남음
```

`_t` alias들:
- `std::remove_const_t<T>` ← `typename std::remove_const<T>::type`
- `std::add_pointer_t<T>` ← `typename std::add_pointer<T>::type`
- `std::decay_t<T>` ← `typename std::decay<T>::type`
- ... 등 다수

표준이 typename 부담을 줄여준 예.

## using alias로 짧게 만들기

```cpp
template<typename C>
class Processor {
    using value_type = typename C::value_type;     // 한 번만 typename
    using iterator   = typename C::iterator;

    value_type x;       // typename 불필요 — alias로 줄어듦
    iterator   it;
};
```

자주 쓰는 의존 타입은 alias로 등록. 코드 정리.

## 흔한 함정 — 깊은 중첩

```cpp
template<typename T>
void f() {
    typename T::template inner<int>::type x;    // 의존 + 템플릿 멤버
}
```

`T::inner`가 템플릿 클래스이면 `template` 키워드도 필요. 흔하진 않지만 메타프로그래밍에서 등장.

## 명시적 — STL 스타일

표준 라이브러리는 일관되게 `typename` 명시:

```cpp
template<typename Container>
typename Container::const_iterator find_element(
    const Container& c,
    const typename Container::value_type& val);
```

가독성을 위해 일관성 있게.

## 함정 — `typename`을 잘못 쓴 경우

```cpp
typename int x = 5;                  // ❌ 의미 없음 — int는 의존 타입 아님
typename std::vector<int>::size_type s;     // ✅ std::vector<int>::size_type은 의존
                                              //    (단, 템플릿 자리가 아니면 typename 안 써도 OK)
```

문맥에 따라 — 비-템플릿 코드에선 `typename`이 필요 없는 경우도. 컴파일러가 에러 메시지로 안내.

## 모던 변형 — concepts와의 결합

```cpp
template<typename T>
concept Container = requires(T t) {
    typename T::value_type;        // ✅ requires 절 안에선 명시적으로 typename
    typename T::iterator;
    { t.begin() } -> std::same_as<typename T::iterator>;
};
```

C++20 concepts에서 `typename`은 인터페이스 명세화의 도구.

## 실무 가이드 — 결정

```
이게 의존 타입(C::name 형태)인가?
├── 함수 매개변수/반환 — typename 명시 (C++20 일부 생략 가능)
├── 변수 선언, 멤버 선언 — typename 필수
├── base 클래스 목록 / 멤버 초기화 base — typename 금지
└── _t alias 활용으로 단순화 가능?
```

## 실무 가이드 — 체크리스트

- [ ] 템플릿 매개변수 선언 — `typename` 또는 `class` 일관?
- [ ] 의존 타입 사용에 `typename` 명시?
- [ ] base 클래스 자리에선 typename 빼기?
- [ ] `_t` alias로 `typename ::type` 제거?
- [ ] using으로 자주 쓰는 의존 타입 alias?
- [ ] C++20 사용 가능 — 반환 타입에서 typename 생략?

## 핵심 정리

1. **의미 1**: 템플릿 매개변수 선언 (`typename` = `class`)
2. **의미 2**: 의존 타입 명시 — 컴파일러에 "타입이다"
3. **base 목록·초기화**에선 `typename` 금지 (또는 생략)
4. C++14 **`_t` alias**로 `typename ::type` 제거
5. C++20 일부 자리에서 `typename` 생략 가능 (함수 반환 타입 등)
6. 자주 쓰는 의존 타입은 **using alias**로 정리

## 관련 항목

- [항목 41: 암묵 인터페이스 + 컴파일 타임 다형성](/blog/programming/cpp/effective-cpp/item41-understand-implicit-interfaces-and-compile-time-polymorphism) — 템플릿의 의미
- [항목 43: 템플릿 base 멤버 접근](/blog/programming/cpp/effective-cpp/item43-know-how-to-access-names-in-templatized-base-classes) — `this->` 패턴
- [항목 47: traits 클래스](/blog/programming/cpp/effective-cpp/item47-use-traits-classes-for-information-about-types) — typename의 본격 사용
