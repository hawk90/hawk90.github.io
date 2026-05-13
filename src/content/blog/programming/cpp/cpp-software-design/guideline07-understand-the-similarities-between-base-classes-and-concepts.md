---
title: "가이드라인 7: 베이스 클래스와 콘셉트의 유사성을 이해하라"
date: 2026-05-13T17:00:00
description: "추상 base와 C++20 concept은 본질적으로 같은 인터페이스 도구다. 런타임 다형성과 컴파일 타임 다형성, 그리고 같은 LSP."
tags: [C++, Software Design, Concepts, Polymorphism]
series: "C++ Software Design"
seriesOrder: 7
---

## 왜 이 가이드라인이 중요한가?

C++에는 인터페이스를 표현하는 도구가 두 가지 있다.

```cpp
// 추상 base — 런타임 다형성
class Drawable {
public:
    virtual void draw() const = 0;
    virtual ~Drawable() = default;
};

// concept — 컴파일 타임 다형성
template<typename T>
concept Drawable = requires(const T& t) {
    { t.draw() } -> std::same_as<void>;
};
```

겉으로 보면 다른 도구지만, Iglberger의 통찰은 단순하다. **본질적으로 같은 추상화 도구**라는 것이다. 둘 다 다음을 한다.

- 시그니처를 명시한다.
- 계약을 요구한다(의미, pre/post, 불변식).
- LSP를 따라야 한다. derived나 충족 타입은 약속을 지켜야 한다.
- 새 구현체를 자유롭게 추가할 수 있다(OCP).

차이는 두 가지다. **언제 검증되는가**(런타임 vs 컴파일 타임), 그리고 **어떻게 다형성이 작동하는가**.

이 통찰이 Part II에 나오는 모든 패턴의 토대다. 같은 패턴을 virtual로도, concept으로도 구현할 수 있고, 도메인에 따라 골라 쓰면 된다.

## 핵심 내용

- 추상 base 클래스와 C++20 concept은 본질적으로 같은 **인터페이스 도구**다.
- 둘 다 시그니처, 의미, 계약, 불변식을 표현한다(LSP가 똑같이 적용된다).
- 차이는 런타임(virtual) vs 컴파일 타임(concept) 다형성에 있다.
- 같은 디자인 패턴을 virtual로도, concept으로도 구현할 수 있다.
- **도메인에 따라 도구를 고른다.** 컨테이너에 여러 타입을 담아야 하나? 성능이 critical한가?

## 같은 인터페이스 — 두 표현

### 추상 base

```cpp
class Stack {
public:
    virtual ~Stack() = default;

    virtual void push(int x) = 0;
    virtual int pop() = 0;
    virtual size_t size() const = 0;
    virtual bool empty() const = 0;
};

class ArrayStack : public Stack { /* ... */ };
class LinkedStack : public Stack { /* ... */ };
```

### Concept

```cpp
template<typename T>
concept Stack = requires(T s, int x) {
    { s.push(x) } -> std::same_as<void>;
    { s.pop() } -> std::convertible_to<int>;
    { s.size() } -> std::convertible_to<size_t>;
    { s.empty() } -> std::convertible_to<bool>;
};

class ArrayStack { /* 메서드 정의 — 상속은 없음 */ };
class LinkedStack { /* 메서드 정의 */ };

template<Stack S>
void process(S& stack);
```

두 표현이 같은 추상화를 나타낸다. 클라이언트 코드도 거의 같다.

```cpp
// virtual 버전
void process(Stack& s) {
    s.push(42);
    auto x = s.pop();
}

// concept 버전
template<Stack S>
void process(S& s) {
    s.push(42);
    auto x = s.pop();
}
```

논리적으로 동일하다.

## 차이 1 — 런타임 vs 컴파일 타임 다형성

### Virtual (런타임)

```cpp
std::vector<std::unique_ptr<Stack>> stacks;
stacks.push_back(std::make_unique<ArrayStack>());
stacks.push_back(std::make_unique<LinkedStack>());

for (auto& s : stacks) {
    s->push(42);     // vtable lookup → 실제 타입의 push
}
```

다른 타입을 같은 컨테이너에 담는다. 결정은 런타임에 이뤄진다. 비용은 vtable lookup과 인라이닝의 어려움이다.

### Concept (컴파일 타임)

```cpp
ArrayStack a;
LinkedStack l;

process(a);     // process<ArrayStack>로 인스턴스화된다
process(l);     // process<LinkedStack>로 인스턴스화된다

// 같은 컨테이너에 다른 타입을 담는 것은 까다롭다
std::vector<???> stacks;
```

각 인스턴스화가 별도 코드를 만든다. 다른 타입을 같은 컨테이너에 함께 담기는 어렵다(또는 `std::variant`로 우회한다). 대신 vtable 비용이 없고 인라이닝이 강력하다.

## 차이 2 — 상속과 Duck Typing

### Virtual

```cpp
class ArrayStack : public Stack { /* ... */ };
// ⚠️ Stack을 명시적으로 상속해야 한다
```

derived가 반드시 base를 명시적으로 상속한다. 닫힌 시스템이다.

### Concept

```cpp
class ArrayStack {
public:
    void push(int);
    int pop();
    size_t size() const;
    bool empty() const;
};

// 상속이 없는데도 Stack concept을 자동으로 충족한다 (duck typing)
```

상속 선언 없이도 concept을 충족하면 자동으로 호환된다. 열린 시스템이다.

장점은 외부 라이브러리 타입도 concept을 충족하기만 하면 그대로 쓸 수 있다는 점이다. C 라이브러리를 wrapping할 때 특히 유용하다. 단점도 있다. "이 클래스가 어떤 concept을 충족하는가?"가 명시되어 있지 않아서 도구로 추론해야 한다.

## 차이 3 — 에러 메시지

### Virtual

```cpp
class Bad : public Stack {
    // pop() 구현 안 함
};

Bad b;     // ❌ "Bad is abstract — cannot instantiate"
```

어떤 메서드를 구현하지 않았는지 명확하게 알려 준다.

### Concept (C++20)

```cpp
class Bad { /* pop 없음 */ };

template<Stack S> void use(S&);

use(Bad{});     // ❌ "Bad does not satisfy Stack — pop() not found"
```

C++20의 concept은 친절한 에러 메시지를 준다. C++17의 SFINAE라면 인스턴스화 체인이 수십 줄로 늘어졌을 자리다.

## 차이 4 — 시그니처의 엄격함

### Virtual

```cpp
class Stack {
    virtual void push(int x) = 0;     // 정확히 int
};

class MyStack : public Stack {
    void push(int x) override;         // 정확히 일치
};
```

`override`가 시그니처의 정확한 매칭을 검증한다.

### Concept

```cpp
template<typename T>
concept Stack = requires(T s, int x) {
    s.push(x);
};

class MyStack {
    void push(double x);    // double — 그러나 int에서 double로 자동 변환이 가능하다
                            // concept이 충족된다 (변환을 허용한다)
};
```

concept은 호환 가능한 시그니처를 더 느슨하게 허용한다. 엄격하게 묶고 싶다면 반환 타입을 명시한다.

```cpp
template<typename T>
concept Stack = requires(T s, int x) {
    { s.push(x) } -> std::same_as<void>;     // 정확한 반환 타입
};
```

## 같은 LSP 원칙

가이드라인 6에서 virtual 함수의 LSP를 다뤘다. concept도 같다.

```cpp
template<typename T>
concept Stack = requires(T s, int x) {
    s.push(x);     // 의미 — stack에 x를 추가한다
    s.pop();        // 의미 — top을 제거하고 반환한다
    // pre/post/invariant도 같다
};

// 이 concept을 충족하는 모든 타입은 같은 약속을 지켜야 한다
class UniqueStack {
public:
    void push(int x) {
        if (!contains(x)) data_.push_back(x);     // 중복을 거부한다
    }
    // ⚠️ "Stack의 push는 항상 size를 1 늘린다"는 약속을 깬다 — LSP 위반
};
```

`UniqueStack`은 concept의 시그니처는 충족하지만 의미적으로는 LSP를 위반한다. 사용자가 Stack concept을 기대하고 호출했을 때 의도와 다른 동작이 나온다.

→ **concept에서도 의미적 계약을 명시하고 검증해야 한다.**

## 도구 선택 — Virtual과 Concept

| 시나리오 | 권장 도구 |
| --- | --- |
| 다양한 타입을 한 컨테이너에 담는다 | Virtual |
| 런타임에 타입이 결정된다 | Virtual |
| Plugin / DLL 인터페이스 | Virtual (ABI 안정성) |
| 외부 라이브러리 타입을 어댑팅한다 | Concept (duck typing) |
| 성능 critical한 핫 패스 | Concept (인라이닝) |
| 컴파일 타임에 타입을 안다 | Concept |
| 강한 정적 타입 안전성이 필요하다 | Concept (컴파일 에러) |
| ABI가 진화할 수 있다 | Virtual |

## 결합 — Type Erasure (가이드라인 32~34)

두 도구의 장점을 합친 것이 **Type Erasure**다.

```cpp
// 사용자 API는 concept 기반이다 — duck typing, 컴파일 타임 다형성
template<typename T>
concept Drawable = requires(const T& t) { t.draw(); };

// 라이브러리는 type erasure로 런타임 다형성을 감싼다
class AnyDrawable {
    struct Concept {
        virtual void draw_impl() const = 0;
        virtual ~Concept() = default;
    };

    template<Drawable T>
    struct Model : Concept {
        T value;
        Model(T v) : value(std::move(v)) {}
        void draw_impl() const override { value.draw(); }
    };

    std::unique_ptr<Concept> impl_;

public:
    template<Drawable T>
    AnyDrawable(T value)
        : impl_(std::make_unique<Model<T>>(std::move(value))) {}

    void draw() const { impl_->draw_impl(); }
};

// 사용
std::vector<AnyDrawable> shapes;
shapes.emplace_back(Circle{...});
shapes.emplace_back(Square{...});     // 상속 없이 concept만 충족하면 된다
```

`std::function`이 정확히 이 패턴이다. 자세한 내용은 가이드라인 32~34에서 다룬다.

## C++ 표준 — Concept과 Virtual의 공존

```cpp
template<typename Iter>
concept InputIterator = ...;     // concept

class basic_istream {
    virtual void overflow();      // virtual
};
```

표준 라이브러리도 두 도구를 모두 쓴다. 도메인에 맞게 선택한다.

- 컨테이너 / 알고리즘 — concept (성능)
- IO / 다형 계층 — virtual

## Concept이 검증하지 못하는 것

```cpp
template<typename T>
concept Stack = requires(T s, int x) {
    s.push(x);
};
```

concept이 검증해 주는 것은 시그니처(호환 가능한 형태)와 표현식이 valid한지까지다.

검증하지 못하는 것이 여전히 많다.

- 의미(semantic) — `pop`이 LIFO인지 아닌지
- 복잡도 — `push`가 O(1)인지
- 예외 보장
- 불변식

이건 virtual도 마찬가지다. 결국 사람의 검증 영역(코드 리뷰, 테스트, 문서)이다.

## Virtual의 한계

```cpp
class Stack {
public:
    virtual void push(int) = 0;
    // int만 받는다. 다른 타입은?
};
```

virtual은 타입에 specialize되어 있다. 다른 타입의 stack은 별도 hierarchy가 된다.

해결책은 template과 virtual을 결합하는 방법이거나(어렵고 때로는 불가능하다) type erasure다. concept은 template과 자연스럽게 결합한다.

## 객체 지향과 제네릭 프로그래밍

```
              객체 지향              제네릭 프로그래밍
              ───────────            ───────────────
인터페이스    abstract base          concept
다형성         런타임 (vtable)         컴파일 타임
타입 관계     명시적 상속             duck typing
컨테이너      이종(heterogeneous)    동종(homogeneous)
비용          vtable, 동적 할당      코드 부피, 컴파일 시간
```

C++에서는 두 패러다임이 함께 쓰인다. 도메인에 따라 알맞은 도구를 고른다.

## 함정 — 잘못된 도구 선택

```cpp
// Bad — 핫 패스에 가상 함수
class Comparator {
public:
    virtual bool less(int a, int b) const = 0;
};

class LessThan : public Comparator { /* ... */ };

std::sort(begin, end, *comp);     // ⚠️ 매 비교마다 vtable lookup
```

함수 객체는 보통 핫 패스에 들어간다. virtual은 vtable 비용이 든다. 여기는 concept이 정답이다.

```cpp
template<std::predicate<int, int> P>
void sort(P p) { /* p()는 인라이닝된다 */ }

std::sort(begin, end, [](int a, int b) { return a < b; });     // 0 비용
```

반대 방향의 함정도 있다.

```cpp
// Bad — 단일 구현인데 concept을 쓴다
template<Database DB>
class Service {
    DB& db_;
    // ...
};

// 실제로는 PostgresDatabase 하나뿐이다 — template으로 둘 이유가 없다
```

런타임 다형성도 컴파일 타임 다형성도 필요 없다면 concept도 과하다. 단순 concrete 타입이면 충분하다.

## 모던 변형 — concept 기반 다형성

C++20 이후로는 concept이 새 표준이다. 새 코드는 다음 형태에 가깝다.

```cpp
template<Drawable T>
void render(const T& t) { t.draw(); }

template<Drawable T>
class Canvas {
    std::vector<T> shapes_;
    // ...
};
```

vtable이 정말 필요할 때만 virtual을 꺼낸다.

## C++26 reflection (제안 단계) — 두 도구의 통합

```cpp
// 미래의 가상 syntax
constexpr auto interface_for(meta::class_t T) {
    return meta::concept_t{
        .name = T.name() + "Concept",
        .requirements = T.public_methods(),
    };
}
```

reflection이 들어오면 virtual 인터페이스와 concept을 자동으로 변환할 수 있게 된다. 두 도구가 본질적으로 같다는 점이 더 분명해질 것이다.

## 실무 가이드 — 결정 트리

```
인터페이스나 추상화가 필요하다 — 어떤 도구?
├── 다양한 타입을 한 컨테이너에 → Virtual
├── 런타임에 타입을 교체 → Virtual
├── 플러그인 / DLL → Virtual (ABI)
├── 성능 critical → Concept
├── 외부 타입 어댑팅 → Concept
├── 두 도구의 장점을 모두 → Type Erasure (가이드라인 32)
└── 정말 단일 구현 → concrete 타입(둘 다 쓰지 않는다)
```

## 실무 가이드 — 체크리스트

새 인터페이스를 작성할 때 다음을 점검하자.

- [ ] 시그니처, 의미, 계약, 불변식을 모두 명시했는가?
- [ ] LSP를 충족체에 요구하는가?
- [ ] 런타임 다형성이 정말 필요한가? — virtual
- [ ] 컴파일 타임에 타입을 결정할 수 있는가? — concept
- [ ] 두 도구 모두 가능한 경우라면 비용 vs 유연성을 비교했는가?
- [ ] C++20을 쓸 수 있다면 모던 코드는 concept을 우선한다.

## 정리

추상 base 클래스와 C++20 concept은 본질적으로 같은 인터페이스 도구다. 차이는 다형성이 어느 시점에 풀리는가에 있다.

| 측면 | Virtual | Concept |
| --- | --- | --- |
| 다형성 | 런타임 | 컴파일 타임 |
| 비용 | vtable | 0 (인라이닝 가능) |
| 컨테이너 | 이종 가능 | 동종 |
| 결합 | 상속 선언 | duck typing |
| 에러 | 명확 | C++20에서 친절 |
| LSP | 적용 | 적용 |

도메인에 맞게 두 도구를 모두 쓸 수 있다. 모던 C++은 concept을 기본으로 두고, virtual은 필요할 때만 꺼낸다.

## 관련 항목

- [가이드라인 3: 인터페이스 분리](/blog/programming/cpp/cpp-software-design/guideline03-separate-interfaces-to-avoid-artificial-coupling) — ISP는 두 도구에 공통이다
- [가이드라인 6: 추상화의 기대 동작](/blog/programming/cpp/cpp-software-design/guideline06-adhere-to-the-expected-behavior-of-abstractions) — LSP도 두 도구에 공통이다
- [가이드라인 32: Type Erasure 도입](/blog/programming/cpp/cpp-software-design/guideline32-consider-replacing-inheritance-hierarchies-with-type-erasure) — 두 도구의 결합
- [Beautiful C++ 항목 24: concept으로 제약](/blog/programming/cpp/beautiful-cpp/item24-specify-concepts-for-template-args) — concept 활용
- [Effective C++ 항목 41: 암묵 인터페이스](/blog/programming/cpp/effective-cpp/item41-understand-implicit-interfaces-and-compile-time-polymorphism) — 컴파일 타임 다형성
