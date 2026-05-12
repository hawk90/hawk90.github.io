---
title: "가이드라인 26: 정적 타입 카테고리 도입에 CRTP를 사용하라"
date: 2026-05-14T22:00:00
description: "CRTP — Curiously Recurring Template Pattern. 컴파일 타임 다형성, vtable 비용 0, mixin 패턴."
tags: [C++, Software Design, CRTP, Templates]
series: "C++ Software Design"
seriesOrder: 26
---

## 왜 이 가이드라인이 중요한가?

C++ 특화 패턴 — GoF에 없음. 1995년 발견 (Coplien). 1990년대 후반 — STL과 함께 보편화.

```cpp
template<typename Derived>
class Comparable {
public:
    bool operator!=(const Derived& other) const {
        return !static_cast<const Derived*>(this)->operator==(other);
    }
    // > <= >= 도 == 와 < 만 있으면 자동 생성
};

class Point : public Comparable<Point> {
public:
    bool operator==(const Point&) const;
    bool operator<(const Point&) const;
    // != > <= >= 자동
};
```

이게 — **CRTP** (Curiously Recurring Template Pattern). 핵심:
- **상속**: `Point : public Comparable<Point>` — 문법은 상속
- **컴파일 타임**: 다형성 — `static_cast`로 (가상 함수 없음)
- **인터페이스**: base가 — derived의 메서드 호출 가능

가상 함수 대안의 강력한 도구. 가이드라인 27 — mixin 사용.

C++23 `<=>` 가 — Comparable CRTP 일부 대체. 그러나 — 다른 mixin / static interface에 여전히 강력.

## 핵심 내용

- **CRTP** — `class Derived : public Base<Derived>` 패턴
- **컴파일 타임 다형성** — vtable 비용 0
- base가 — derived의 메서드 호출 (static_cast로)
- 활용 — mixin (가이드라인 27), 정적 인터페이스, 카운터, comparable 등
- 한계 — 런타임 다형성 X, 같은 base에서 파생된 다른 derived 호환 X

## CRTP 구조

```cpp
template<typename Derived>
class Base {
public:
    // base가 derived의 메서드 호출 — 컴파일 타임
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

**핵심 매커니즘**:
1. Base는 — Derived 타입 알고 있음 (template 매개변수)
2. `static_cast<Derived*>(this)` — base 포인터를 derived로 (안전 — IS-A 관계)
3. derived의 메서드 호출 — 가상 함수 없이

vtable 없음. 컴파일러가 — 인라이닝 가능.

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
p1 != p2;     // ✅ Comparable에서 제공
p1 > p2;       // ✅
p1 <= p2;      // ✅
```

`==`와 `<`만 정의 — 나머지 자동. C++20 `<=>`이 — 표준화. 그래도 CRTP — 다른 mixin에 여전히 유효.

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
Button::count();     // 1 (별도 counter — 타입별)
```

각 T에 — 별도 카운터. 컴파일 타임 분리.

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
    // clone() 자동 — derived 복사
};

Widget w1;
auto w2 = w1.clone();
```

복사 가능 객체 — clone() 자동 제공.

## 활용 4 — Iterator interface

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

iterator의 — `++` postfix, `!=` 자동. CRTP 모범.

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
| 컴파일 시간 | 빠름 | 길어짐 |
| 코드 부피 | 단일 | 인스턴스마다 |
| 컨테이너 (vector<Base*>) | ✅ | ❌ (각 derived 별도) |
| 디버깅 | 명확 | 템플릿 에러 |

성능 critical 핫 패스 — CRTP. 런타임 다형성 필요 — virtual.

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
    // size, empty, front 자동
};
```

자기 begin/end만 — 나머지 자동.

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

class B : public Base<A> {     // ⚠️ Base<A> 상속 (typo? 또는 의도?)
    // impl 정의 X
};

B b;
b.f();     // static_cast<A*>(this) — B를 A로 캐스트 — UB
```

`Base<Derived>`에서 — `Derived`가 — 정말 자신의 derived인지 보장 안 됨. UB 위험.

해결 — protected ctor:

```cpp
template<typename Derived>
class Base {
protected:
    Base() = default;     // private/protected — derived만 생성 가능
    friend Derived;        // 추가 안전
};
```

또는 C++23 deducing this — CRTP의 미래 대안 (아래).

## 함정 — 다중 CRTP 상속

```cpp
class Widget 
    : public Counted<Widget>,
      public Comparable<Widget>,
      public Cloneable<Widget> {
};
```

여러 mixin — 다중 상속. 가이드라인 40 (EC++) — 다중 상속 신중. 그러나 — CRTP mixin은 보통 안전 (단일 책임).

## 가이드라인 27 — CRTP for Static Mixin

가이드라인 26 — CRTP 일반. 가이드라인 27 — **mixin 패턴 강조**.

```cpp
class Widget 
    : public Printable<Widget>,
      public Serializable<Widget>,
      public Loggable<Widget> {
};
// Widget — 자동으로 print, serialize, log 능력
```

각 mixin — 독립적 능력 추가. composition over inheritance의 컴파일 타임 버전.

## C++23 — Deducing this

C++23부터 — `this`를 명시적 매개변수로:

```cpp
class Shape {
public:
    void draw(this auto& self) {
        // self는 정확한 derived 타입 — static_cast 불필요
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
c.interface();     // CRTP 없이 작동
```

C++23 deducing this — CRTP의 많은 사용처를 단순화. 상속 자체가 정적.

## CRTP의 인터페이스 명세

```cpp
template<typename Derived>
class Hashable {
public:
    size_t hash() const {
        // Derived가 hash_impl() 제공해야
        return static_cast<const Derived*>(this)->hash_impl();
    }
};
```

Derived가 — `hash_impl()` 안 정의하면? 컴파일 에러 — `hash()` 호출 시점. 사용자 입장에선 — 깊은 에러 메시지.

C++20 concepts로 — 명시:

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

Derived가 — concept 충족 안 하면 — 친절한 에러.

## CRTP + Pure Virtual

```cpp
template<typename Derived>
class Base {
public:
    void interface() {
        static_cast<Derived*>(this)->implementation();
    }
    
    // 컴파일 타임 강제 — implementation 메서드 있어야
};

class Derived : public Base<Derived> {
    // implementation 안 정의 → 컴파일 에러 (인터페이스 호출 시)
};
```

가상 함수 — pure virtual로 명시. CRTP — concept로 명시 (또는 메서드 호출에 의존).

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

빈 base class — 0 byte (EBO). CRTP — 메모리 오버헤드 X.

## Expression Templates — CRTP 정점

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
Vector d = a + b + c;     // 임시 객체 없음 — 단일 루프
```

Eigen, Blaze 등 수치 라이브러리 — 이 패턴. 임시 객체 회피 + 인라이닝.

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

`enable_shared_from_this` — CRTP. C++ 표준 라이브러리의 모범.

## Boost — CRTP 풍부

```cpp
#include <boost/operators.hpp>

class Point : boost::operators<Point> {
    // operators 헬퍼 — < == 만 정의하면 모두 자동
public:
    bool operator==(const Point&) const;
    bool operator<(const Point&) const;
    // != > <= >= 자동
};
```

`boost::operators` — comparable, addable, multipliable 등 다양한 mixin. CRTP 라이브러리.

## 함정 — 템플릿 에러 메시지

```cpp
class Widget : public Counted<Wiget> {     // typo
};
```

CRTP — 깊은 템플릿 에러. C++20 concepts로 — 개선.

## CRTP for Static Polymorphism (Strategy)

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

가상 함수 비용 0. 컴파일 타임 결정. 가이드라인 19 Strategy의 변형.

## 함정 — CRTP 너무 깊은 chain

```cpp
template<typename T>
class A : public B<T> {};

template<typename T>
class B : public C<T> {};

template<typename T>
class C { };

class Widget : public A<Widget> {};
```

깊은 CRTP — 컴파일 시간 ↑, 디버깅 어려움. 적절한 단순화.

## CRTP의 한계

```cpp
template<typename Derived>
class Base { };

class A : public Base<A> {};
class B : public Base<B> {};

std::vector<Base<???>> objects;     // ❌ — A와 B는 다른 Base 타입
```

CRTP — **다른 derived를 같은 컨테이너에 못 담음**. 런타임 다형성 필요하면 — virtual 또는 type erasure.

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

concept으로 — 인터페이스 명시. 친절한 에러.

## C++26 — Reflection + CRTP

C++26 reflection (제안 중):

```cpp
// 가상의 미래 syntax
template<typename Derived>
class Comparable {
    // reflection으로 derived의 모든 멤버 자동 비교
};
```

CRTP의 많은 boilerplate — reflection이 자동화 가능. 미래.

## CRTP 적용 결정

```
런타임 다형성 필요?
├── 그렇다 → virtual functions
└── 아니다 → CRTP 또는 templates
    ├── mixin pattern (능력 추가) → CRTP
    ├── 정적 dispatch → CRTP 또는 함수 템플릿
    ├── Expression templates (수치) → CRTP
    └── 단순 일반화 → 함수 템플릿
```

CRTP — 상속 + 컴파일 타임 다형성이 자연스러운 곳.

## 실무 가이드 — 체크리스트

CRTP 적용 시:

- [ ] 런타임 다형성 — **불필요**? (CRTP는 정적)
- [ ] **컴파일 타임** dispatch / 인라이닝 — 중요?
- [ ] **mixin pattern** — 능력 추가?
- [ ] 사용자가 — Derived 메서드 명세 알 수 있는가? (문서 / concept)
- [ ] 다중 CRTP — 충돌 없는가?
- [ ] C++23 deducing this — 더 단순한 대안?
- [ ] 에러 메시지 — concept으로 개선?

## 정리

**CRTP** — `class Derived : public Base<Derived>`. C++ 특화 패턴.

본질:
- **컴파일 타임 다형성** — vtable 비용 0
- 상속 문법 + 정적 dispatch
- mixin / static interface

활용:
- Comparable, Cloneable, Countable mixin
- Expression Templates (Eigen, Blaze)
- 정적 Strategy
- STL `enable_shared_from_this`
- Boost operators

한계:
- 런타임 다형성 X
- 같은 컨테이너 X
- 컴파일 시간 ↑

C++23 — **deducing this**가 일부 대체. 그러나 — 상속 + 정적 dispatch 필요 시 여전히 강력.

## 관련 항목

- [가이드라인 27: CRTP for mixin](/blog/programming/cpp/cpp-software-design/guideline27-use-crtp-for-static-mixin-classes) — mixin 본격
- [가이드라인 5: 확장을 위한 디자인](/blog/programming/cpp/cpp-software-design/guideline05-design-for-extension) — OCP
- [가이드라인 19: Strategy](/blog/programming/cpp/cpp-software-design/guideline19-use-strategy-to-isolate-how-things-are-done) — 정적 strategy
- [가이드라인 41: 암묵 인터페이스](/blog/programming/cpp/effective-cpp/item41-understand-implicit-interfaces-and-compile-time-polymorphism) — 컴파일 타임 다형성
- [Effective Modern C++ 항목 5: prefer auto](/blog/programming/cpp/effective-modern-cpp/item05-prefer-auto) — 템플릿 친화
