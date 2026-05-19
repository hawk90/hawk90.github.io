---
title: "가이드라인 27: 정적 Mixin 클래스에 CRTP를 사용하라"
date: 2026-05-02T03:00:00
description: "Mixin 패턴은 능력을 추가하는 작은 클래스다. CRTP로 구현하면 컴파일 타임 다형성과 다중 상속을 0 비용으로 결합할 수 있다."
tags: [C++, Software Design, CRTP, Mixin]
series: "C++ Software Design"
seriesOrder: 27
draft: true
---

## 왜 이 가이드라인이 중요한가?

가이드라인 26이 CRTP의 일반적인 쓰임을 다뤘다면, 이번에는 그 가운데서도 **mixin 패턴**에 초점을 맞춘다.

**Mixin**은 작은 능력 하나를 다른 클래스에 더해 주는 메커니즘이다.

```cpp
class Widget 
    : public Printable<Widget>,
      public Serializable<Widget>,
      public Hashable<Widget>,
      public Comparable<Widget> {
    // Widget이 자동으로 print, serialize, hash, compare 능력을 얻는다
};
```

각 mixin은 독립적인 능력 하나만 책임진다. 이들을 조합하면 풍부한 객체가 만들어진다.

CRTP로 구현한 mixin은 가상 함수 비용이 전혀 들지 않는다. 가이드라인 20에서 강조한 **composition over inheritance** 원칙을 컴파일 타임으로 옮긴 변형이라고 볼 수 있다.

또한 다중 상속이 **정당하게 쓰이는** 대표적인 사례이기도 하다.

## 핵심 내용

- **Mixin**: 능력을 추가하는 작은 클래스
- **CRTP mixin**: 컴파일 타임 다형성, vtable 비용 0
- 다중 상속과 CRTP를 결합해 여러 능력을 조합한다
- 활용: 직렬화, 해시, 비교, 로깅, 카운터처럼 cross-cutting concerns에 잘 맞는다
- composition over inheritance의 컴파일 타임 변형이다

## Mixin 정의

```cpp
template<typename Derived>
class Printable {
public:
    void print() const {
        // Derived가 print_to(stream)을 제공한다
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
w.print();         // Printable에서 자동 제공
w.to_string();     // 자동
```

`print_to`만 정의해 두면 `print`와 `to_string`은 mixin에서 자동으로 따라온다.

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

각 능력이 독립적인 mixin이므로 필요한 것만 골라 자유롭게 조합할 수 있다.

## 활용 — Cross-cutting Concerns

```cpp
// 로깅 — 메서드 호출 시 자동으로 기록한다
template<typename D>
class Loggable {
public:
    template<typename... Args>
    auto logged_call(const std::string& method, Args&&... args) {
        std::cout << "Calling " << method << '\n';
        // ...
    }
};

// 카운트 — 살아 있는 인스턴스 개수를 센다
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

로깅이나 카운팅 같은 횡단 관심사(cross-cutting concerns)는 여러 클래스에서 똑같이 필요하다. 이런 능력이야말로 mixin으로 분리하기에 적합하다.

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

Builder의 fluent 인터페이스는 mixin chain으로 자연스럽게 표현된다. 속성 하나가 곧 mixin 하나에 대응한다.

## Boost.operators — Mixin의 모범

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
    
    // 직접 정의해야 하는 최소 연산자
    Money& operator+=(const Money& other) {
        cents_ += other.cents_;
        return *this;
    }
    bool operator<(const Money& other) const { return cents_ < other.cents_; }
    bool operator==(const Money& other) const { return cents_ == other.cents_; }
    
    // 나머지 + - <= >= > 등은 Boost.operators가 자동 생성한다
};

Money m1{100}, m2{200};
m1 + m2;     // ✅ addable이 +=만 있으면 +를 제공한다
m1 < m2;     // ✅ totally_ordered가 <와 ==만 있으면 나머지 비교를 제공한다
```

각 mixin이 요구하는 최소 연산자만 정의해 두면 나머지 연산자는 자동으로 따라온다.

## C++20 — std::three_way_comparable

```cpp
class Point {
    int x_, y_;
public:
    auto operator<=>(const Point&) const = default;     // C++20 spaceship
};

// < > <= >= == != 가 자동으로 따라온다
```

C++20에서는 Comparable mixin의 일부가 표준 언어 기능으로 들어왔다. 그래도 다른 능력들은 여전히 CRTP mixin이 가장 깔끔한 도구다.

## Mixin vs composition

```cpp
// 합성 — 멤버로 보유
class Widget {
    Printer printer_;
    Hasher hasher_;
public:
    void print() { printer_.print(*this); }
    size_t hash() const { return hasher_.hash(*this); }
};

// Mixin — 상속으로 능력 흡수
class Widget : public Printable<Widget>, public Hashable<Widget> {
public:
    void print();             // 자동
    size_t hash() const;      // 자동
};
```

| 측면 | Composition | CRTP Mixin |
| --- | --- | --- |
| 인터페이스 노출 | 멤버 함수 wrapper 필요 | 자동 |
| 보일러플레이트 | 많음 (wrap 메서드) | 적음 |
| 메모리 | 멤버 변수만큼 차지 | EBO로 0 byte |
| 런타임 비용 | 멤버 호출 | 0 (인라이닝) |

CRTP Mixin은 boilerplate가 훨씬 적다.

## 함정 — 너무 많은 Mixin

```cpp
class Widget 
    : public M1<Widget>, public M2<Widget>, public M3<Widget>,
      public M4<Widget>, public M5<Widget>, public M6<Widget>,
      public M7<Widget>, public M8<Widget>, public M9<Widget> {
};
```

다중 상속이 지나치게 깊어지면 부작용이 따른다.

- 컴파일 시간이 길어진다
- 디버깅이 어려워진다
- 클래스 책임이 비대해진다 (SRP 위반 신호)

원칙은 단순하다. **정말 필요한 mixin만** 붙이고, 보통 5~7개 이하로 유지한다.

## 함정 — Mixin 간 이름 충돌

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

다중 상속의 고전적인 문제다. 해결책은 두 가지다.

```cpp
class Widget : public M1<Widget>, public M2<Widget> {
public:
    using M1<Widget>::process;     // 명시적으로 선택
};

// 또는 호출 시 명시
w.M1<Widget>::process();
```

가장 좋은 예방책은 mixin을 설계할 때부터 도메인 특화된 명사를 이름에 쓰는 것이다.

## 함정 — Mixin이 Derived에 정확한 구현을 요구

```cpp
template<typename D>
class Printable {
public:
    void print() const {
        // Derived가 print_to(stream)을 가져야 한다
        static_cast<const D*>(this)->print_to(std::cout);
    }
};

class Widget : public Printable<Widget> {
    // print_to를 정의하지 않으면 컴파일 에러
};
```

요구사항을 문서로 남기는 것도 방법이지만, C++20에서는 concept으로 명시할 수 있다.

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

concept은 derived가 충족해야 할 인터페이스를 코드 차원에서 강제한다.

## Mixin과 가상 소멸자

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

가상 소멸자가 있으면 derived 포인터로 delete가 안전해진다. 다만 여러 CRTP mixin을 동시에 상속할 때는 가상 소멸자 사용을 신중하게 결정해야 한다.

대안은 derived 쪽에서 가상 소멸자를 책임지는 것이다.

```cpp
template<typename D>
class Printable {
    // 가상 소멸자 없음
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

빈 base class는 EBO 덕분에 0 byte를 차지한다. mixin을 여러 개 붙여도 메모리 부담은 없다.

## 함정 — 상태가 있는 Mixin

```cpp
template<typename D>
class Counted {
    int instance_count_;     // ⚠️ 멤버가 메모리를 차지한다
public:
    Counted() : instance_count_(0) {}
};

class Widget : public Counted<Widget> {
    int data;
};

sizeof(Widget);     // 8 — Counted의 멤버가 더해진다
```

mixin이 상태를 가지면 EBO가 깨진다. 의도된 경우에만 허용해야 한다.

인스턴스 카운터처럼 클래스 단위 상태라면 `static inline` 멤버가 정답이다.

```cpp
template<typename T>
class Counted {
    static inline int count_ = 0;     // C++17 — 인스턴스 메모리에 영향 없음
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

variadic template으로 mixin 목록을 받으면 조합이 훨씬 유연해진다.

## Mixin 카탈로그 — 흔히 쓰이는 능력

```cpp
template<typename D> class Printable;      // print
template<typename D> class Comparable;     // < > <= >= != (C++20 <=>로 대체 가능)
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

각 mixin은 작은 책임 하나만 맡고, 필요에 따라 자유롭게 조합된다.

## CRTP Mixin in STL

```cpp
class Widget : public std::enable_shared_from_this<Widget> {
public:
    std::shared_ptr<Widget> shared_from_this();     // 자동
};
```

`std::enable_shared_from_this`가 바로 CRTP mixin이다. 표준 라이브러리 안에 이미 모범 사례가 들어 있다.

## Mixin vs Decorator

```
Mixin     — 정적 능력 추가 (컴파일 타임, 다중 상속)
Decorator — 동적 능력 추가 (런타임, composition)
```

목표는 비슷하지만 메커니즘이 다르다. Decorator는 가이드라인 35에서 따로 다룬다.

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

concept으로 derived가 만족해야 할 요구사항을 명시하면 에러 메시지도 친절해진다.

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

`this const auto& self`가 정확한 derived 타입을 잡아 주므로 CRTP의 `static_cast`가 더 이상 필요 없다.

C++23 덕분에 CRTP boilerplate가 크게 줄어든다.

## Mixin의 한계

```cpp
class A : public M<A> {};
class B : public M<B> {};

std::vector<???> mixed;     // ❌ A와 B는 다른 base 타입이다
```

가이드라인 26과 같은 한계를 공유한다. 런타임 다형성이 없으므로 컨테이너 동질화도 불가능하다.

대안이 필요하다면 가상 함수나 type erasure로 넘어가야 한다.

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

Visitor 패턴 역시 CRTP mixin 형태로 표현할 수 있다.

## Mixin 디버깅

CRTP 에러 메시지는 복잡하기로 악명 높다.

```
error: 'class Widget' has no member 'print_to'
  in instantiation of 'void Printable<Widget>::print() const'
  ...
```

C++20 concepts를 쓰면 에러가 한결 친절해진다.

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

chain이 깊어질수록 컴파일 시간과 가독성 모두에 손해다. mixin은 평평하게 조합하는 편이 좋다.

## 마이그레이션 — Inheritance → CRTP Mixin

```cpp
// 옛 방식 — 가상 함수 계층
class Base {
public:
    virtual void method() = 0;
};

// CRTP로 변환
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

가상 함수 비용은 사라지지만 그 대가로 런타임 다형성도 잃는다. 도메인 요구가 정적 결정으로 충분하다면 이 migration이 유효하다.

## 실무 가이드 — Mixin 적용

```
능력 추가가 필요한 클래스 — Mixin?
├── 컴파일 타임에 능력 결정 → CRTP Mixin
├── 런타임에 동적으로 추가 → Decorator
├── 표준 능력(compare, hash 등) → Boost.operators 또는 표준 기능
├── 능력 하나, 책임 하나 → 단일 mixin
├── 5개 이상 능력 누적 → 클래스 책임 재검토 (SRP)
└── 다양한 derived가 한 컨테이너에 → 가상 함수 또는 type erasure
```

## 실무 가이드 — 체크리스트

Mixin을 적용할 때 점검할 항목들이다.

- [ ] 각 mixin이 **단일 책임**을 지키는가? (SRP)
- [ ] 능력이 정적으로 결정 가능한가?
- [ ] **이름 충돌**은 없는가?
- [ ] Mixin 사이에 의존성이 없는가?
- [ ] **너무 많은 mixin**(5개 이상)이 SRP 위반의 신호는 아닌가?
- [ ] EBO를 활용해 메모리 비용을 0으로 유지하는가?
- [ ] concept으로 derived 요구사항을 명시했는가?
- [ ] C++23 deducing this로 더 단순하게 표현할 수 있는가?

## 정리

**CRTP Mixin**은 작은 능력을 컴파일 타임에 더해 주는 도구다.

본질은 다음과 같다.

- CRTP와 다중 상속의 결합
- 컴파일 타임 다형성
- vtable 비용 0
- EBO로 메모리 비용도 0

전형적인 활용 영역은 다음과 같다.

- Comparable, Hashable, Cloneable, Serializable처럼 횡단 관심사를 다룰 때
- Builder 패턴
- Boost.operators
- 표준 라이브러리의 `enable_shared_from_this`

C++23의 **deducing this**가 CRTP를 한층 더 단순하게 만들어 준다.

다중 상속을 **정당하게** 쓰는 사례이지만, 어디까지나 SRP와 작은 책임을 지킬 때만 빛난다.

## 관련 항목

- [가이드라인 20: composition > inheritance](/blog/programming/cpp/cpp-software-design/guideline20-favor-composition-over-inheritance) — Mixin은 composition의 컴파일 타임 변형이다
- [가이드라인 26: CRTP 일반](/blog/programming/cpp/cpp-software-design/guideline26-use-crtp-to-introduce-static-type-categories) — CRTP 기본
- [가이드라인 35: Decorator](/blog/programming/cpp/cpp-software-design/guideline35-use-decorators-to-add-customization-hierarchically) — 런타임에 능력을 추가하는 패턴
- [Effective C++ 항목 40: 다중 상속](/blog/programming/cpp/effective-cpp/item40-use-multiple-inheritance-judiciously) — 다중 상속의 정당한 패턴
