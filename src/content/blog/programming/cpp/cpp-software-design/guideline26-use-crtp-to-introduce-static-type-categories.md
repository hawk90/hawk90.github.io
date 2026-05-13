---
title: "가이드라인 26: 정적 타입 카테고리 도입에 CRTP를 사용하라"
date: 2026-05-14T22:00:00
description: "CRTP는 Curiously Recurring Template Pattern이다. 컴파일 타임 다형성, vtable 비용 0, mixin 패턴."
tags: [C++, Software Design, CRTP, Templates]
series: "C++ Software Design"
seriesOrder: 26
draft: true
---

## 왜 이 가이드라인이 중요한가?

GoF에는 없는 C++ 특화 패턴이다. 1995년 Coplien이 발견했고, 1990년대 후반 STL과 함께 보편화됐다.

```cpp
template<typename Derived>
class Comparable {
public:
    bool operator!=(const Derived& other) const {
        return !static_cast<const Derived*>(this)->operator==(other);
    }
    // > <= >= 도 == 와 < 만 있으면 자동 생성된다
};

class Point : public Comparable<Point> {
public:
    bool operator==(const Point&) const;
    bool operator<(const Point&) const;
    // != > <= >= 가 자동으로 생긴다
};
```

이게 **CRTP**(Curiously Recurring Template Pattern)다. 핵심은 다음과 같다.

- **상속** — `Point : public Comparable<Point>`. 문법은 상속이다.
- **컴파일 타임** — `static_cast`로 다형성을 푼다. 가상 함수가 없다.
- **인터페이스** — base가 derived의 메서드를 호출할 수 있다.

가상 함수의 강력한 대안이다. 가이드라인 27에서 mixin을 본격적으로 다룬다.

C++20의 `<=>`가 Comparable CRTP의 일부를 대체한다. 그러나 다른 mixin이나 정적 인터페이스에는 여전히 유효하다.

## 핵심 내용

- **CRTP** — `class Derived : public Base<Derived>` 패턴이다.
- **컴파일 타임 다형성** — vtable 비용이 0이다.
- base가 derived의 메서드를 `static_cast`로 호출한다.
- 활용 — mixin(가이드라인 27), 정적 인터페이스, 카운터, comparable 등.
- 한계 — 런타임 다형성이 안 되고, 같은 base의 다른 derived가 호환되지 않는다.

## CRTP 구조

```cpp
template<typename Derived>
class Base {
public:
    // base가 derived의 메서드를 호출한다 — 컴파일 타임
    void interface() {
        static_cast<Derived*>(this)->implementation();
    }
};

class Derived : public Base<Derived> {
public:
    void implementation() { /* ... */ }
};

Derived d;
d.interface();     // → d.implementation()
```

핵심 메커니즘은 셋이다.

1. Base가 Derived 타입을 안다(template 매개변수).
2. `static_cast<Derived*>(this)`로 base 포인터를 derived로 캐스트한다(IS-A이므로 안전하다).
3. derived의 메서드를 가상 함수 없이 호출한다.

vtable이 없다. 컴파일러가 인라이닝할 수 있다.

## 활용 1 — Comparable Mixin

```cpp
template<typename Derived>
class Comparable {
public:
    bool operator!=(const Derived& other) const {
        return !static_cast<const Derived*>(this)->operator==(other);
    }
    bool operator>(const Derived& other) const {
        return other < static_cast<const Derived&>(*this);
    }
    bool operator<=(const Derived& other) const {
        return !(other < static_cast<const Derived&>(*this));
    }
    bool operator>=(const Derived& other) const {
        return !(static_cast<const Derived&>(*this) < other);
    }
};

class Point : public Comparable<Point> {
    int x_, y_;
public:
    bool operator==(const Point& other) const {
        return x_ == other.x_ && y_ == other.y_;
    }
    bool operator<(const Point& other) const {
        return x_ < other.x_ || (x_ == other.x_ && y_ < other.y_);
    }
};

Point p1, p2;
p1 != p2;     // ✅ Comparable에서 제공된다
p1 > p2;       // ✅
p1 <= p2;      // ✅
```

`==`와 `<`만 정의하면 나머지가 자동으로 생긴다. C++20 `<=>`이 표준화한 자리지만, 다른 mixin에는 CRTP가 여전히 유효하다.

## 활용 2 — Counter Mixin

```cpp
template<typename T>
class Counted {
    static inline int count_ = 0;
public:
    Counted() { ++count_; }
    Counted(const Counted&) { ++count_; }
    ~Counted() { --count_; }

    static int count() { return count_; }
};

class Widget : public Counted<Widget> { };
class Button : public Counted<Button> { };

Widget w1, w2;
Widget::count();     // 2

Button b;
Button::count();     // 1 (별도 카운터 — 타입별로)
```

각 T에 대해 별도 카운터가 생긴다. 컴파일 타임에 분리된다.

## 활용 3 — Cloneable

```cpp
template<typename Derived>
class Cloneable {
public:
    std::unique_ptr<Derived> clone() const {
        return std::make_unique<Derived>(
            static_cast<const Derived&>(*this)
        );
    }
};

class Widget : public Cloneable<Widget> {
public:
    Widget(const Widget&);     // 복사 ctor
    // clone()이 자동으로 생긴다 — derived를 복사한다
};

Widget w1;
auto w2 = w1.clone();
```

복사 가능한 객체에 clone()을 자동으로 붙인다.

## 활용 4 — Iterator 인터페이스

```cpp
template<typename Derived>
class IteratorBase {
public:
    Derived& operator++() {
        static_cast<Derived*>(this)->advance();
        return static_cast<Derived&>(*this);
    }

    Derived operator++(int) {
        Derived copy = static_cast<const Derived&>(*this);
        ++*this;
        return copy;
    }

    bool operator!=(const Derived& other) const {
        return !static_cast<const Derived*>(this)->equals(other);
    }
};

class MyIterator : public IteratorBase<MyIterator> {
public:
    void advance();
    bool equals(const MyIterator&) const;
};
```

iterator의 `++` postfix와 `!=`가 자동으로 생긴다. CRTP의 모범 사례다.

## CRTP vs 가상 함수

```cpp
// 가상 함수
class Shape {
public:
    virtual void draw() = 0;
};
class Circle : public Shape {
public:
    void draw() override { /* ... */ }
};

void render(Shape& s) {
    s.draw();     // vtable lookup
}

// CRTP
template<typename Derived>
class Shape {
public:
    void draw() {
        static_cast<Derived*>(this)->doDraw();     // 컴파일 타임
    }
};
class Circle : public Shape<Circle> {
public:
    void doDraw() { /* ... */ }
};

template<typename T>
void render(Shape<T>& s) {
    s.draw();     // 인라이닝 가능
}
```

| 측면 | 가상 함수 | CRTP |
| --- | --- | --- |
| 비용 | vtable + 간접 호출 | 0 (인라이닝) |
| 런타임 다형성 | ✅ | ❌ |
| 컴파일 시간 | 빠르다 | 길어진다 |
| 코드 부피 | 단일 | 인스턴스마다 |
| 컨테이너 (vector<Base*>) | ✅ | ❌ (각 derived 별도) |
| 디버깅 | 명확하다 | 템플릿 에러 |

성능 critical한 핫 패스에는 CRTP. 런타임 다형성이 필요하면 virtual.

## C++20 std::span / std::ranges 활용

```cpp
template<typename Derived>
class Range {
public:
    auto size() const {
        return std::ranges::distance(
            static_cast<const Derived*>(this)->begin(),
            static_cast<const Derived*>(this)->end()
        );
    }

    bool empty() const {
        return static_cast<const Derived*>(this)->begin() ==
               static_cast<const Derived*>(this)->end();
    }

    auto front() {
        return *static_cast<Derived*>(this)->begin();
    }
};

class MyContainer : public Range<MyContainer> {
public:
    Iterator begin();
    Iterator end();
    // size, empty, front가 자동으로 생긴다
};
```

`begin`과 `end`만 정의하면 나머지가 자동으로 따라온다.

## 함정 — 잘못된 derived

```cpp
template<typename Derived>
class Base {
public:
    void f() {
        static_cast<Derived*>(this)->impl();
    }
};

class A : public Base<A> {
    void impl();
};

class B : public Base<A> {     // ⚠️ Base<A>를 상속 (오타? 의도?)
    // impl이 없다
};

B b;
b.f();     // static_cast<A*>(this) — B를 A로 캐스트 — UB
```

`Base<Derived>`에서 `Derived`가 정말 자신의 derived인지 보장되지 않는다. UB의 위험이 있다.

해법 — protected ctor.

```cpp
template<typename Derived>
class Base {
protected:
    Base() = default;     // private/protected — derived만 생성할 수 있다
    friend Derived;        // 추가 안전장치
};
```

C++23의 deducing this가 CRTP의 미래 대안이 된다(아래).

## 함정 — 다중 CRTP 상속

```cpp
class Widget
    : public Counted<Widget>,
      public Comparable<Widget>,
      public Cloneable<Widget> {
};
```

여러 mixin을 다중 상속으로 받는다. EC++ 항목 40은 다중 상속을 신중하라고 하지만, CRTP mixin은 단일 책임이라 보통 안전하다.

## 가이드라인 27 — CRTP for Static Mixin

가이드라인 26은 CRTP 일반을 다룬다. 가이드라인 27은 **mixin 패턴**을 본격적으로 다룬다.

```cpp
class Widget
    : public Printable<Widget>,
      public Serializable<Widget>,
      public Loggable<Widget> {
};
// Widget이 자동으로 print, serialize, log 능력을 갖춘다
```

각 mixin이 독립적인 능력을 더한다. composition over inheritance의 컴파일 타임 버전이다.

## C++23 — Deducing this

C++23부터 `this`를 명시적 매개변수로 받을 수 있다.

```cpp
class Shape {
public:
    void draw(this auto& self) {
        // self가 정확한 derived 타입이다 — static_cast가 필요 없다
    }
};

class Circle : public Shape {
public:
    void draw_impl() { /* ... */ }
};

// 또는
class Shape {
public:
    void interface(this auto& self) {
        self.implementation();     // 정확한 타입
    }
};

class Circle : public Shape {
public:
    void implementation() { /* ... */ }
};

Circle c;
c.interface();     // CRTP 없이 동작한다
```

C++23 deducing this가 CRTP의 많은 사용처를 단순화한다. 상속 자체가 정적으로 풀린다.

## CRTP의 인터페이스 명세

```cpp
template<typename Derived>
class Hashable {
public:
    size_t hash() const {
        // Derived가 hash_impl()을 제공해야 한다
        return static_cast<const Derived*>(this)->hash_impl();
    }
};
```

Derived가 `hash_impl()`을 정의하지 않으면 컴파일 에러가 난다(`hash()` 호출 시점에). 사용자에게는 깊은 에러 메시지가 떨어진다.

C++20 concept으로 명시한다.

```cpp
template<typename T>
concept HashImpl = requires(const T& t) {
    { t.hash_impl() } -> std::convertible_to<size_t>;
};

template<HashImpl Derived>
class Hashable {
    // ...
};
```

Derived가 concept을 만족하지 않으면 친절한 에러가 나온다.

## CRTP + Pure Virtual

```cpp
template<typename Derived>
class Base {
public:
    void interface() {
        static_cast<Derived*>(this)->implementation();
    }

    // 컴파일 타임에 강제 — implementation 메서드가 있어야 한다
};

class Derived : public Base<Derived> {
    // implementation을 정의하지 않으면 → 컴파일 에러(인터페이스 호출 시점)
};
```

가상 함수는 pure virtual로 명시한다. CRTP는 concept으로 명시한다(혹은 메서드 호출에 의존한다).

## CRTP의 sizeof

```cpp
template<typename Derived>
class Empty {
};

class Widget : public Empty<Widget> {
    int data;
};

sizeof(Widget);     // 4 (EBO — Empty Base Optimization)
```

빈 base class는 0 byte다(EBO). CRTP는 메모리 오버헤드가 없다.

## Expression Templates — CRTP의 정점

```cpp
template<typename E>
class VecExpr {
public:
    double operator[](size_t i) const {
        return static_cast<const E&>(*this)[i];
    }
    size_t size() const {
        return static_cast<const E&>(*this).size();
    }
};

template<typename E1, typename E2>
class VecSum : public VecExpr<VecSum<E1, E2>> {
    const E1& a_;
    const E2& b_;
public:
    VecSum(const E1& a, const E2& b) : a_(a), b_(b) {}
    double operator[](size_t i) const { return a_[i] + b_[i]; }
    size_t size() const { return a_.size(); }
};

class Vector : public VecExpr<Vector> { /* ... */ };

template<typename E1, typename E2>
VecSum<E1, E2> operator+(const VecExpr<E1>& a, const VecExpr<E2>& b) {
    return VecSum<E1, E2>{static_cast<const E1&>(a), static_cast<const E2&>(b)};
}

Vector a, b, c;
Vector d = a + b + c;     // 임시 객체 없이 단일 루프로 처리된다
```

Eigen이나 Blaze 같은 수치 라이브러리가 이 패턴을 쓴다. 임시 객체 회피와 인라이닝이 핵심 이점이다.

## STL의 CRTP — std::enable_shared_from_this

```cpp
class Widget : public std::enable_shared_from_this<Widget> {
public:
    std::shared_ptr<Widget> get_ptr() {
        return shared_from_this();
    }
};

auto p = std::make_shared<Widget>();
auto q = p->get_ptr();     // 같은 shared_ptr
```

`enable_shared_from_this`는 표준 라이브러리의 CRTP 모범 사례다.

## Boost — CRTP가 풍부하다

```cpp
#include <boost/operators.hpp>

class Point : boost::operators<Point> {
    // operators 헬퍼 — < 와 == 만 정의하면 모두 자동으로 생긴다
public:
    bool operator==(const Point&) const;
    bool operator<(const Point&) const;
    // != > <= >= 가 자동으로 생긴다
};
```

`boost::operators`는 comparable, addable, multipliable 같은 다양한 mixin을 제공하는 CRTP 라이브러리다.

## 함정 — 템플릿 에러 메시지

```cpp
class Widget : public Counted<Wiget> {     // 오타
};
```

CRTP는 깊은 템플릿 에러를 만든다. C++20 concept이 이를 크게 개선했다.

## CRTP로 정적 다형성 — Strategy 변형

```cpp
template<typename Derived>
class SortStrategy {
public:
    void sort(std::vector<int>& v) {
        static_cast<Derived*>(this)->do_sort(v);
    }
};

class QuickSort : public SortStrategy<QuickSort> {
public:
    void do_sort(std::vector<int>& v) {
        std::sort(v.begin(), v.end());
    }
};

template<typename Strategy>
class Sorter {
    Strategy strategy_;
public:
    void sort(std::vector<int>& v) {
        strategy_.sort(v);     // 컴파일 타임 dispatch
    }
};

Sorter<QuickSort> sorter;
sorter.sort(data);
```

가상 함수 비용이 0이고 컴파일 타임에 결정된다. 가이드라인 19의 Strategy 변형이다.

## 함정 — 너무 깊은 CRTP chain

```cpp
template<typename T>
class A : public B<T> {};

template<typename T>
class B : public C<T> {};

template<typename T>
class C { };

class Widget : public A<Widget> {};
```

깊은 CRTP는 컴파일 시간을 늘리고 디버깅도 어렵게 한다. 단순화를 검토한다.

## CRTP의 한계

```cpp
template<typename Derived>
class Base { };

class A : public Base<A> {};
class B : public Base<B> {};

std::vector<Base<???>> objects;     // ❌ — A와 B의 Base가 서로 다른 타입이다
```

CRTP는 같은 컨테이너에 다른 derived를 담지 못한다. 런타임 다형성이 필요하면 virtual이나 type erasure로 간다.

## 모던 변형 — C++20 concepts + CRTP

```cpp
template<typename T>
concept Printable = requires(const T& t) {
    t.print();
};

template<Printable Derived>
class PrintableMixin {
public:
    void log_print() {
        std::cout << "[LOG] ";
        static_cast<const Derived*>(this)->print();
    }
};
```

concept으로 인터페이스를 명시하면 에러 메시지도 친절해진다.

## C++26 — Reflection + CRTP

C++26 reflection(제안 중)을 생각해 보자.

```cpp
// 미래의 가상 syntax
template<typename Derived>
class Comparable {
    // reflection으로 derived의 모든 멤버를 자동으로 비교한다
};
```

CRTP의 많은 boilerplate를 reflection이 자동화할 가능성이 있다.

## CRTP 적용 결정

```
런타임 다형성이 필요한가?
├── 그렇다 → 가상 함수
└── 아니다 → CRTP나 템플릿
    ├── mixin pattern(능력 추가) → CRTP
    ├── 정적 dispatch → CRTP나 함수 템플릿
    ├── Expression templates(수치) → CRTP
    └── 단순 일반화 → 함수 템플릿
```

CRTP는 상속과 컴파일 타임 다형성이 함께 필요한 자리에 어울린다.

## 실무 가이드 — 체크리스트

CRTP를 적용할 때 다음을 점검한다.

- [ ] 런타임 다형성이 정말 필요 없는가? (CRTP는 정적이다)
- [ ] 컴파일 타임 dispatch와 인라이닝이 중요한가?
- [ ] mixin 패턴으로 능력을 더하는가?
- [ ] 사용자가 Derived에 필요한 메서드를 알 수 있는가? (문서나 concept)
- [ ] 다중 CRTP 사이에 충돌은 없는가?
- [ ] C++23 deducing this로 더 단순하게 풀 수 있지는 않은가?
- [ ] 에러 메시지가 concept으로 개선되는가?

## 정리

**CRTP**는 `class Derived : public Base<Derived>` 패턴이다. C++ 특화 패턴이다.

본질은 다음과 같다.

- 컴파일 타임 다형성 — vtable 비용 0.
- 상속 문법 + 정적 dispatch.
- mixin과 정적 인터페이스.

활용 예는 다양하다.

- Comparable, Cloneable, Countable mixin
- Expression Templates(Eigen, Blaze)
- 정적 Strategy
- STL `enable_shared_from_this`
- Boost operators

한계도 분명하다.

- 런타임 다형성이 불가능하다.
- 같은 컨테이너에 다른 derived를 담지 못한다.
- 컴파일 시간이 길어진다.

C++23의 **deducing this**가 일부 자리를 대체한다. 그러나 상속 + 정적 dispatch가 필요한 자리에서는 여전히 강력하다.

## 관련 항목

- [가이드라인 27: CRTP for mixin](/blog/programming/cpp/cpp-software-design/guideline27-use-crtp-for-static-mixin-classes) — mixin 본격
- [가이드라인 5: 확장을 위한 디자인](/blog/programming/cpp/cpp-software-design/guideline05-design-for-extension) — OCP
- [가이드라인 19: Strategy](/blog/programming/cpp/cpp-software-design/guideline19-use-strategy-to-isolate-how-things-are-done) — 정적 strategy
- [가이드라인 41: 암묵 인터페이스](/blog/programming/cpp/effective-cpp/item41-understand-implicit-interfaces-and-compile-time-polymorphism) — 컴파일 타임 다형성
- [Effective Modern C++ 항목 5: prefer auto](/blog/programming/cpp/effective-modern-cpp/item05-prefer-auto) — 템플릿 친화
