---
title: "가이드라인 27: 정적 Mixin 클래스에 CRTP를 사용하라"
date: 2026-05-14T23:00:00
description: "Mixin 패턴 — 능력을 추가하는 작은 클래스. CRTP로 컴파일 타임 다형성 + 0 비용 + 다중 상속."
tags: [C++, Software Design, CRTP, Mixin]
series: "C++ Software Design"
seriesOrder: 27
---

## 왜 이 가이드라인이 중요한가?

가이드라인 26 — CRTP 일반. 이번 — **mixin 패턴** 특화.

**Mixin** — 작은 능력을 — 다른 클래스에 추가하는 mechanism:

```cpp
class Widget 
    : public Printable<Widget>,
      public Serializable<Widget>,
      public Hashable<Widget>,
      public Comparable<Widget> {
    // Widget — 자동으로 print, serialize, hash, compare 능력
};
```

각 mixin — **독립적 능력**. 조합해서 — 풍부한 객체.

CRTP로 mixin — 가상 함수 비용 0. **composition over inheritance**(가이드라인 20)의 컴파일 타임 버전.

다중 상속의 **정당한 사용** 사례.

## 핵심 내용

- **Mixin** — 능력을 추가하는 작은 클래스
- **CRTP mixin** — 컴파일 타임 다형성, vtable 비용 0
- 다중 상속 + CRTP — 여러 능력 조합
- 활용: 직렬화, 해시, 비교, 로깅, 카운터 등 cross-cutting concerns
- composition over inheritance의 컴파일 타임 변형

## Mixin 정의

```cpp
template<typename Derived>
class Printable {
public:
    void print() const {
        // Derived가 print_to(stream) 제공
        static_cast<const Derived*>(this)->print_to(std::cout);
    }
    
    std::string to_string() const {
        std::stringstream ss;
        static_cast<const Derived*>(this)->print_to(ss);
        return ss.str();
    }
};

class Widget : public Printable<Widget> {
public:
    void print_to(std::ostream& os) const {
        os << "Widget";
    }
};

Widget w;
w.print();         // 자동 — Printable에서
w.to_string();     // 자동
```

`print_to`만 정의 — `print`, `to_string` 자동.

## 다중 Mixin 조합

```cpp
template<typename D>
class Printable {
public:
    void print() const { static_cast<const D*>(this)->print_to(std::cout); }
};

template<typename D>
class Hashable {
public:
    size_t hash() const { return static_cast<const D*>(this)->hash_impl(); }
};

template<typename D>
class Comparable {
public:
    bool operator!=(const D& other) const {
        return !static_cast<const D*>(this)->operator==(other);
    }
};

class Widget 
    : public Printable<Widget>,
      public Hashable<Widget>,
      public Comparable<Widget> {
public:
    void print_to(std::ostream&) const;
    size_t hash_impl() const;
    bool operator==(const Widget&) const;
};

Widget w;
w.print();      // Printable
w.hash();       // Hashable
w != other;     // Comparable
```

각 능력 — 독립 mixin. 자유 조합.

## 활용 — Cross-cutting Concerns

```cpp
// 로깅 — 모든 메서드 호출 시 자동 로깅
template<typename D>
class Loggable {
public:
    template<typename... Args>
    auto logged_call(const std::string& method, Args&&... args) {
        std::cout << "Calling " << method << '\n';
        // ...
    }
};

// 카운트 — 인스턴스 개수
template<typename D>
class Counted {
    static inline int count_ = 0;
public:
    Counted() { ++count_; }
    Counted(const Counted&) { ++count_; }
    ~Counted() { --count_; }
    static int count() { return count_; }
};

class Widget : public Loggable<Widget>, public Counted<Widget> { };
```

각 concern — 횡단 관심사. 다양한 클래스에 — mixin으로.

## 활용 — Builder 패턴

```cpp
template<typename Derived>
class Builder {
protected:
    Derived& self() { return static_cast<Derived&>(*this); }
};

template<typename Derived, typename Name>
class WithName : public Builder<Derived> {
    Name name_;
public:
    Derived& name(Name n) {
        name_ = std::move(n);
        return this->self();
    }
};

template<typename Derived, typename Age>
class WithAge : public Builder<Derived> {
    Age age_;
public:
    Derived& age(Age a) {
        age_ = a;
        return this->self();
    }
};

class PersonBuilder 
    : public WithName<PersonBuilder, std::string>,
      public WithAge<PersonBuilder, int> {
public:
    Person build() { /* ... */ }
};

auto p = PersonBuilder{}
    .name("Alice")
    .age(30)
    .build();
```

Builder fluent — mixin chain. 각 속성이 — mixin.

## Boost.operators — Mixin 모범

```cpp
#include <boost/operators.hpp>

class Money : 
    boost::addable<Money>,
    boost::subtractable<Money>,
    boost::multipliable<Money, int>,
    boost::totally_ordered<Money> {
    int cents_;
public:
    Money(int cents) : cents_(cents) {}
    
    // 직접 정의
    Money& operator+=(const Money& other) {
        cents_ += other.cents_;
        return *this;
    }
    bool operator<(const Money& other) const { return cents_ < other.cents_; }
    bool operator==(const Money& other) const { return cents_ == other.cents_; }
    
    // 자동 — Boost.operators가 + - <= >= > 등 자동
};

Money m1{100}, m2{200};
m1 + m2;     // ✅ — addable이 +=만 있으면 + 제공
m1 < m2;     // ✅ — totally_ordered가 < ==만 있으면 모두
```

각 mixin — 최소 연산자만 정의 → 모든 연산자 자동.

## C++20 — std::three_way_comparable

```cpp
class Point {
    int x_, y_;
public:
    auto operator<=>(const Point&) const = default;     // C++20 spaceship
};

// < > <= >= == != 자동
```

C++20 — Comparable mixin 일부 표준화. 그러나 — 다른 mixin은 여전히 CRTP.

## Mixin vs composition

```cpp
// 합성 — 멤버
class Widget {
    Printer printer_;
    Hasher hasher_;
public:
    void print() { printer_.print(*this); }
    size_t hash() const { return hasher_.hash(*this); }
};

// Mixin — 상속
class Widget : public Printable<Widget>, public Hashable<Widget> {
public:
    void print();     // 자동
    size_t hash() const;     // 자동
};
```

| 측면 | Composition | CRTP Mixin |
| --- | --- | --- |
| 인터페이스 노출 | 멤버 함수 wrapper | 자동 |
| 보일러플레이트 | 多 (wrap 메서드) | 적음 |
| 메모리 | 멤버 변수 | EBO (0 byte) |
| 런타임 비용 | 멤버 호출 | 0 (인라이닝) |

CRTP Mixin — boilerplate 적음.

## 함정 — 너무 많은 Mixin

```cpp
class Widget 
    : public M1<Widget>, public M2<Widget>, public M3<Widget>,
      public M4<Widget>, public M5<Widget>, public M6<Widget>,
      public M7<Widget>, public M8<Widget>, public M9<Widget> {
};
```

다중 상속 너무 깊음:
- 컴파일 시간 ↑
- 디버깅 어려움
- 클래스 책임 — 너무 큼 (SRP 위반?)

원칙: **정말 필요한 mixin만**. 5-7개 미만이 적절.

## 함정 — Mixin 간 충돌

```cpp
template<typename D>
class M1 {
public:
    void process() { /* ... */ }
};

template<typename D>
class M2 {
public:
    void process() { /* ... */ }     // ⚠️ 이름 충돌
};

class Widget : public M1<Widget>, public M2<Widget> { };

Widget w;
w.process();     // 모호 — M1::process? M2::process?
```

다중 상속의 — 이름 충돌. 해결:

```cpp
class Widget : public M1<Widget>, public M2<Widget> {
public:
    using M1<Widget>::process;     // 명시 선택
};

// 또는 호출 시 명시
w.M1<Widget>::process();
```

이름 — Mixin 설계 시 — 도메인 특화 명사로 회피.

## 함정 — Mixin이 Derived의 정확한 구현 요구

```cpp
template<typename D>
class Printable {
public:
    void print() const {
        // Derived가 print_to(stream) 메서드 가져야
        static_cast<const D*>(this)->print_to(std::cout);
    }
};

class Widget : public Printable<Widget> {
    // print_to 안 정의 → 컴파일 에러
};
```

요구사항 — 문서로 명시. 또는 C++20 concept:

```cpp
template<typename T>
concept HasPrintTo = requires(const T& t, std::ostream& os) {
    t.print_to(os);
};

template<HasPrintTo Derived>
class Printable {
    // ...
};
```

concept이 — derived가 충족해야 할 인터페이스 명시.

## Mixin + Virtual

```cpp
template<typename D>
class Printable {
public:
    virtual ~Printable() = default;
    
    void print() const {
        static_cast<const D*>(this)->print_to(std::cout);
    }
};
```

가상 소멸자 — derived 통해 delete 가능. 다중 CRTP에서 virtual destructor — 신중.

대안: derived가 — 직접 가상 소멸자:

```cpp
template<typename D>
class Printable {
    // 가상 소멸자 X
};

class Widget : public Printable<Widget> {
public:
    virtual ~Widget() = default;     // derived가 책임
};
```

## CRTP Mixin의 메모리

```cpp
template<typename D>
class M1 { };

template<typename D>
class M2 { };

class Widget : public M1<Widget>, public M2<Widget> {
    int data;
};

sizeof(Widget);     // 4 (EBO — Empty Base Optimization)
```

빈 base class — EBO로 0 byte. 다중 mixin도 메모리 부담 X.

## 함정 — Mixin에 상태

```cpp
template<typename D>
class Counted {
    int instance_count_;     // ⚠️ 멤버 — 메모리 차지
public:
    Counted() : instance_count_(0) {}
};

class Widget : public Counted<Widget> {
    int data;
};

sizeof(Widget);     // 8 — Counted의 멤버
```

상태 있는 mixin — EBO 깨짐. 의도된 경우만.

`static inline` 멤버 — 클래스 단위 카운터, 인스턴스 단위 아님:

```cpp
template<typename T>
class Counted {
    static inline int count_ = 0;     // C++17 — 인스턴스 메모리 X
public:
    Counted() { ++count_; }
    ~Counted() { --count_; }
    static int count() { return count_; }
};

sizeof(Widget);     // 4 (Counted 멤버 없음)
```

## Variadic Mixin

```cpp
template<typename Derived, template<typename> class... Mixins>
class Composed : public Mixins<Derived>... {
};

class Widget : public Composed<Widget, Printable, Hashable, Comparable> { };
```

mixin 목록을 — variadic template으로. 더 유연.

## Mixin 카탈로그 — 흔한 능력

```cpp
template<typename D> class Printable;      // print
template<typename D> class Comparable;     // < > <= >= != (C++20 <=>로 대체)
template<typename D> class Hashable;       // hash
template<typename D> class Cloneable;      // clone
template<typename D> class Serializable;   // serialize / deserialize
template<typename D> class Loggable;       // log calls
template<typename D> class Counted;        // 인스턴스 카운트
template<typename D> class Observable;     // observer pattern
template<typename D> class Versioned;      // 버전 추적
template<typename D> class Validatable;    // 유효성 검사
template<typename D> class Cacheable;      // 캐싱
template<typename D> class Timed;          // 시간 측정
```

각 책임 — 작은 단위. 자유 조합.

## CRTP Mixin in STL

```cpp
class Widget : public std::enable_shared_from_this<Widget> {
public:
    std::shared_ptr<Widget> shared_from_this();     // 자동
};
```

`std::enable_shared_from_this` — CRTP mixin. C++ 표준의 모범.

## Mixin vs Decorator

```
Mixin — 정적 능력 추가 (컴파일 타임, 다중 상속)
Decorator — 동적 능력 추가 (런타임, composition)
```

같은 목표 — 다른 메커니즘. 가이드라인 35 (Decorator).

## CRTP Mixin + concepts (C++20)

```cpp
template<typename T>
concept Cloneable_t = requires(const T& t) {
    { t.clone_impl() } -> std::convertible_to<std::unique_ptr<T>>;
};

template<Cloneable_t Derived>
class Cloneable {
public:
    std::unique_ptr<Derived> clone() const {
        return static_cast<const Derived*>(this)->clone_impl();
    }
};

class Widget : public Cloneable<Widget> {
public:
    std::unique_ptr<Widget> clone_impl() const {
        return std::make_unique<Widget>(*this);
    }
};
```

concept으로 — derived 요구사항 명시.

## C++23 Deducing this — Mixin 단순화

```cpp
class Printable {
public:
    void print(this const auto& self) {
        self.print_to(std::cout);
    }
};

class Widget : public Printable {
    void print_to(std::ostream&) const;
};
```

`this auto& self` — 정확한 derived 타입. CRTP의 `static_cast` 불필요.

C++23 — CRTP boilerplate 대폭 감소.

## Mixin의 한계

```cpp
class A : public M<A> {};
class B : public M<B> {};

std::vector<???> mixed;     // ❌ A와 B는 다른 base type
```

가이드라인 26과 동일 — 런타임 다형성 X. 컨테이너 동질화 X.

대안: 가상 함수 또는 type erasure.

## 흔한 Mixin 패턴 — Visitable

```cpp
template<typename Derived>
class Visitable {
public:
    template<typename Visitor>
    auto accept(Visitor v) const {
        return v(*static_cast<const Derived*>(this));
    }
};

class Circle : public Visitable<Circle> { /* ... */ };
class Square : public Visitable<Square> { /* ... */ };

Circle c;
auto area = c.accept([](const auto& s) { return s.area(); });
```

Visitor 패턴 — CRTP mixin 변형.

## Mixin 디버깅

CRTP 에러 메시지 — 복잡:

```
error: 'class Widget' has no member 'print_to'
  in instantiation of 'void Printable<Widget>::print() const'
  ...
```

C++20 concepts — 친절한 에러:

```
error: 'Widget' does not satisfy 'HasPrintTo'
  required: t.print_to(os)
```

## 함정 — 깊은 상속 chain

```cpp
template<typename D>
class Base {};

template<typename D>
class Middle : public Base<D> {};

template<typename D>
class Top : public Middle<D> {};

class Widget : public Top<Widget> {};
```

깊은 chain — 컴파일 시간 ↑, 가독성 ↓. 평평한 mixin 조합 권장.

## 마이그레이션 — Inheritance → CRTP Mixin

```cpp
// 옛 — 가상 함수 hierarchy
class Base {
public:
    virtual void method() = 0;
};

// 변환 — CRTP
template<typename D>
class Mixin {
public:
    void method() {
        static_cast<D*>(this)->method_impl();
    }
};

class Derived : public Mixin<Derived> {
public:
    void method_impl();
};
```

가상 함수 비용 — 제거. 단, 런타임 다형성 잃음. 도메인에 맞으면 migration.

## 실무 가이드 — Mixin 적용

```
능력 추가가 필요한 클래스 — Mixin?
├── 컴파일 타임에 능력 결정 → CRTP Mixin
├── 런타임 동적 추가 → Decorator
├── 표준 능력 (compare, hash, ...) → Boost.operators 또는 표준
├── 단일 능력 + 명확한 단일 책임 → 단일 mixin
├── 5+ 능력 → 클래스 책임 재검토 (SRP)
└── 다양한 derived 필요 → 가상 함수 또는 type erasure
```

## 실무 가이드 — 체크리스트

Mixin 적용 시:

- [ ] 각 mixin — **단일 책임** (SRP)?
- [ ] 능력 — 정적 결정 가능?
- [ ] **이름 충돌** 없는가?
- [ ] Mixin 간 — 의존성 없는가?
- [ ] **너무 많은 mixin** (5+) — SRP 위반?
- [ ] EBO 활용 (빈 base) — 메모리 0?
- [ ] concept으로 — derived 요구사항 명시?
- [ ] C++23 deducing this — 더 단순?

## 정리

**CRTP Mixin** — 작은 능력을 — 컴파일 타임 추가.

본질:
- CRTP + 다중 상속
- 컴파일 타임 다형성
- vtable 비용 0
- EBO로 메모리 0

활용:
- Comparable, Hashable, Cloneable, Serializable (cross-cutting concerns)
- Builder pattern
- Boost.operators
- STL `enable_shared_from_this`

C++23 — **deducing this**로 CRTP 단순화.

다중 상속의 — **정당한** 사용. SRP + 작은 책임으로.

## 관련 항목

- [가이드라인 20: composition > inheritance](/blog/programming/cpp-software-design/guideline20-favor-composition-over-inheritance) — Mixin은 composition의 컴파일 타임 변형
- [가이드라인 26: CRTP 일반](/blog/programming/cpp-software-design/guideline26-use-crtp-to-introduce-static-type-categories) — CRTP 기본
- [가이드라인 35: Decorator](/blog/programming/cpp-software-design/guideline35-use-decorators-to-add-customization-hierarchically) — 런타임 능력 추가
- [Effective C++ 항목 40: 다중 상속](/blog/programming/effective-cpp/item40-use-multiple-inheritance-judiciously) — 다중 상속의 정당한 패턴
