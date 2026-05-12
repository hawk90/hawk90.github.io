---
title: "가이드라인 7: 베이스 클래스와 콘셉트의 유사성을 이해하라"
date: 2026-05-13T17:00:00
description: "추상 base와 C++20 concept — 둘 다 인터페이스. 런타임 vs 컴파일 타임 다형성, 같은 LSP 원칙."
tags: [C++, Software Design, Concepts, Polymorphism]
series: "C++ Software Design"
seriesOrder: 7
---

## 왜 이 가이드라인이 중요한가?

C++의 두 가지 인터페이스 도구:

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

겉보기엔 다른 도구지만 — Iglberger의 통찰: **본질적으로 같은 추상화 도구**다. 둘 다:

- **인터페이스를 명시**한다 (시그니처)
- **계약을 요구**한다 (의미, pre/post, 불변식)
- **LSP를 따라야** 한다 (derived/충족 타입은 약속 지켜야)
- **새 구현체가 자유롭게 추가** 가능 (OCP)

차이는 — **언제 검증되는가** (런타임 vs 컴파일 타임)와 **어떻게 다형적인가**.

이 통찰이 — Part II 모든 패턴의 토대. 같은 패턴을 — virtual로도, concept로도 구현 가능. 도메인에 따라 선택.

## 핵심 내용

- **추상 base 클래스**와 **C++20 concept** — 본질적으로 같은 **인터페이스 도구**
- 둘 다 — 시그니처 + 의미 + 계약 + 불변식 (LSP 적용)
- 차이 — 런타임(virtual) vs 컴파일 타임(concept) 다형성
- 같은 디자인 패턴 — virtual 또는 concept으로 구현 가능
- **도메인에 따라 도구 선택** — 컨테이너에 다양한 타입? 성능 critical?

## 동일한 인터페이스 — 두 표현

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

class ArrayStack { /* 메서드 정의 — 상속 X */ };
class LinkedStack { /* 메서드 정의 */ };

template<Stack S>
void process(S& stack);
```

두 표현이 — **같은 추상화**. 클라이언트 코드:

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

논리적으로 동일.

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

다른 타입을 — **같은 컨테이너에**. 런타임에 결정.

비용 — vtable lookup, 인라이닝 어려움.

### Concept (컴파일 타임)

```cpp
ArrayStack a;
LinkedStack l;

process(a);     // process<ArrayStack> 인스턴스화
process(l);     // process<LinkedStack> 인스턴스화

// 같은 컨테이너에 다른 타입? 어려움
std::vector<???> stacks;
```

각 인스턴스화 — 별도 코드. 다른 타입을 같은 컨테이너에 못 담음(또는 `std::variant`로 우회).

이점 — vtable 비용 0, 강한 인라이닝.

## 차이 2 — 상속 vs Duck Typing

### Virtual

```cpp
class ArrayStack : public Stack { /* ... */ };
// ⚠️ Stack 명시적 상속 필요
```

derived가 — **반드시 base 상속 선언**. 닫힌 시스템.

### Concept

```cpp
class ArrayStack {
public:
    void push(int);
    int pop();
    size_t size() const;
    bool empty() const;
};

// 상속 없음 — 그러나 Stack concept 자동 충족 (duck typing)
```

상속 선언 없이 — concept 충족 시 자동 호환. 열린 시스템.

**장점**: 외부 라이브러리 타입도 — concept 충족하면 사용 가능. C 라이브러리 wrapping 등.

**단점**: "이 클래스가 어떤 concept을 충족하는가?" — 명시 안 됨. 도구로 추론.

## 차이 3 — 에러 메시지

### Virtual

```cpp
class Bad : public Stack {
    // pop() 구현 안 함
};

Bad b;     // ❌ "Bad is abstract — cannot instantiate"
```

명확한 에러 — 어떤 메서드를 구현 안 했는지.

### Concept (C++20)

```cpp
class Bad { /* pop 없음 */ };

template<Stack S> void use(S&);

use(Bad{});     // ❌ "Bad does not satisfy Stack — pop() not found"
```

C++20 concepts는 — 친절한 에러. C++17 SFINAE라면 — 수십 줄의 인스턴스화 체인.

## 차이 4 — 시그니처 정확성

### Virtual

```cpp
class Stack {
    virtual void push(int x) = 0;     // 정확히 int
};

class MyStack : public Stack {
    void push(int x) override;         // 정확히 일치
};
```

`override`가 — 정확한 시그니처 매칭 검증.

### Concept

```cpp
template<typename T>
concept Stack = requires(T s, int x) {
    s.push(x);
};

class MyStack {
    void push(double x);    // double — 그러나 int → double 자동 변환
                            // concept 충족 (변환을 허용)
};
```

concept은 — **호환 가능한** 시그니처 허용. 약간 더 느슨.

엄격하게:

```cpp
template<typename T>
concept Stack = requires(T s, int x) {
    { s.push(x) } -> std::same_as<void>;     // 정확한 반환 타입
};
```

## 같은 LSP 원칙

가이드라인 6에서 — virtual 함수의 LSP. concept도 같음.

```cpp
template<typename T>
concept Stack = requires(T s, int x) {
    s.push(x);     // 의미: stack에 x 추가
    s.pop();        // 의미: top 제거 + 반환
    // pre/post/invariant는 같음
};

// 이 concept을 충족하는 모든 타입 — 같은 약속 지켜야
class UniqueStack {
public:
    void push(int x) {
        if (!contains(x)) data_.push_back(x);     // 중복 거부
    }
    // ⚠️ "Stack의 push가 항상 size +1" 약속 깸 — LSP 위반
};
```

UniqueStack이 — concept 시그니처는 충족, **의미적으로는 LSP 위반**. 사용자가 Stack concept 기대해서 의도와 다른 동작.

→ **concept도 의미 계약 명시 + 검증 필요**.

## 도구 선택 — Virtual vs Concept

| 시나리오 | 권장 |
| --- | --- |
| 다양한 타입을 한 컨테이너에 | Virtual |
| 런타임에 타입 결정 | Virtual |
| Plugin / DLL 인터페이스 | Virtual (ABI 안정성) |
| 외부 라이브러리 타입 어댑팅 | Concept (duck typing) |
| 성능 critical 핫 패스 | Concept (인라이닝) |
| 컴파일 타임에 타입 알려짐 | Concept |
| 강한 정적 타입 안전성 | Concept (컴파일 에러) |
| ABI 진화 가능성 | Virtual |

## 결합 — Type Erasure (가이드라인 32-34)

두 도구의 장점을 결합 — **Type Erasure**.

```cpp
// 사용자: concept 기반 — duck typing, 컴파일 타임 다형성
template<typename T>
concept Drawable = requires(const T& t) { t.draw(); };

// 라이브러리: type erasure로 런타임 다형성 wrapping
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
shapes.emplace_back(Square{...});     // 상속 X — concept만 충족하면 OK
```

`std::function`이 — 정확히 이 패턴. 자세한 건 가이드라인 32-34.

## C++ 표준 — Concept + Virtual 결합

```cpp
template<typename Iter>
concept InputIterator = ...;     // concept

class basic_istream {
    virtual void overflow();      // virtual
};
```

표준 라이브러리도 — 두 도구 모두 사용. 도메인에 맞게.

- 컨테이너 / 알고리즘 — concept (성능)
- IO / 다형성 hierarchy — virtual

## Concept의 한계

```cpp
template<typename T>
concept Stack = requires(T s, int x) {
    s.push(x);
};
```

concept이 검증하는 것:
- ✅ 시그니처 (호환 가능한)
- ✅ 표현식이 valid

concept이 **검증 못 하는 것**:
- ❌ 의미 (semantic) — pop이 LIFO인지?
- ❌ 복잡도 — push가 O(1)인지?
- ❌ 예외 보장
- ❌ 불변식

이건 — virtual도 못 함. **사람의 검증 영역** (코드 리뷰 + 테스트 + 문서).

## Virtual의 한계

```cpp
class Stack {
public:
    virtual void push(int) = 0;
    // int만 받음 — 다른 타입은?
};
```

virtual은 — **타입에 specialized**. 다른 타입 stack은 별도 hierarchy.

해결 — **template + virtual** 결합 (어렵고 종종 불가능) 또는 **type erasure**.

concept은 — **template과 자연스럽게 결합**.

## 객체 지향 vs 제네릭 프로그래밍

```
              객체 지향              제네릭 프로그래밍
              ───────────            ───────────────
인터페이스    abstract base          concept
다형성         런타임 (vtable)         컴파일 타임
타입 관계     명시적 상속             duck typing
컨테이너      이종 (heterogeneous)   동종 (homogeneous)
비용          vtable, 동적 할당      코드 부피, 컴파일 시간
```

두 패러다임 — C++에선 **함께** 사용. 도메인에 따라 적합한 도구.

## 함정 — 잘못된 도구 선택

```cpp
// Bad: 핫 패스에 가상 함수
class Comparator {
public:
    virtual bool less(int a, int b) const = 0;
};

class LessThan : public Comparator { /* ... */ };

std::sort(begin, end, *comp);     // ⚠️ 매 비교마다 vtable lookup
```

함수 객체는 — 보통 핫 패스. virtual은 — vtable 비용. concept이 정답:

```cpp
template<std::predicate<int, int> P>
void sort(P p) { /* p()는 인라이닝 */ }

std::sort(begin, end, [](int a, int b) { return a < b; });     // 0 비용
```

```cpp
// Bad: 단일 구현인데 concept 사용
template<Database DB>
class Service {
    DB& db_;
    // ...
};

// 실제로는 PostgresDatabase 하나만 — template 의미 X
```

런타임 다형성 의도 없으면 — concept도 과한 경우. 단순 concrete 타입.

## 모던 변형 — concept-based polymorphism

C++20 이후 — **concept이 새 표준**. 새 코드는:

```cpp
// 모던 C++ 스타일
template<Drawable T>
void render(const T& t) { t.draw(); }

template<Drawable T>
class Canvas {
    std::vector<T> shapes_;
    // ...
};
```

vtable이 정말 필요할 때만 virtual.

## C++26 reflection (제안 중) — 통합

```cpp
// 가상의 미래 syntax
constexpr auto interface_for(meta::class_t T) {
    return meta::concept_t{
        .name = T.name() + "Concept",
        .requirements = T.public_methods(),
    };
}
```

reflection으로 — virtual interface와 concept을 **자동 변환**. 두 도구가 같음을 더 명확하게.

## 실무 가이드 — 결정 트리

```
인터페이스 / 추상화가 필요하다 — 어떤 도구?
├── 다양한 타입을 한 컨테이너에 → Virtual
├── 런타임에 타입 교체 → Virtual
├── 플러그인 / DLL → Virtual (ABI)
├── 성능 critical → Concept
├── 외부 타입 어댑팅 → Concept
├── 두 도구 장점 모두 → Type Erasure (가이드라인 32)
└── 정말 단일 구현 → concrete 타입 (둘 다 X)
```

## 실무 가이드 — 체크리스트

새 인터페이스 작성 시:

- [ ] 인터페이스가 **시그니처 + 의미 + 계약 + 불변식** 모두 명시?
- [ ] LSP를 충족체에 요구?
- [ ] 런타임 다형성 정말 필요? — virtual
- [ ] 컴파일 타임에 타입 결정 가능? — concept
- [ ] 두 도구 다 적용 가능한 경우 — **비용 vs 유연성** 비교?
- [ ] C++20 사용 가능? — 모던 코드는 concept 우선

## 정리

추상 base 클래스와 C++20 concept — **본질적으로 같은 인터페이스 도구**. 차이는 다형성 시점.

| 측면 | Virtual | Concept |
| --- | --- | --- |
| 다형성 | 런타임 | 컴파일 타임 |
| 비용 | vtable | 0 (인라이닝) |
| 컨테이너 | 이종 OK | 동종 |
| 결합 | 상속 선언 | duck typing |
| 에러 | 명확 | C++20 친절 |
| LSP | 적용 | 적용 |

**도메인에 맞게** — 두 도구 모두 가용. 모던 C++은 — concept 기본, virtual은 필요할 때.

## 관련 항목

- [가이드라인 3: 인터페이스 분리](/blog/programming/cpp/cpp-software-design/guideline03-separate-interfaces-to-avoid-artificial-coupling) — ISP는 두 도구 공통
- [가이드라인 6: 추상화의 기대 동작](/blog/programming/cpp/cpp-software-design/guideline06-adhere-to-the-expected-behavior-of-abstractions) — LSP는 두 도구 공통
- [가이드라인 32: Type Erasure 도입](/blog/programming/cpp/cpp-software-design/guideline32-consider-replacing-inheritance-hierarchies-with-type-erasure) — 두 도구의 결합
- [Beautiful C++ 항목 24: concepts](/blog/programming/cpp/beautiful-cpp/item24-specify-concepts-for-template-args) — concepts 활용
- [Effective C++ 항목 41: 암묵 인터페이스](/blog/programming/cpp/effective-cpp/item41-understand-implicit-interfaces-and-compile-time-polymorphism) — 컴파일 타임 다형성
