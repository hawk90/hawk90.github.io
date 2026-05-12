---
title: "가이드라인 31: 비-침습적 런타임 다형성에는 External Polymorphism을 사용하라"
date: 2026-05-15T02:00:00
description: "External Polymorphism — 기존 타입을 수정하지 않고 다형 처리. 어댑터 + 추상 base — Type Erasure의 토대."
tags: [C++, Software Design, External Polymorphism, Type Erasure]
series: "C++ Software Design"
seriesOrder: 31
---

## 왜 이 가이드라인이 중요한가?

전통 OO 다형성 — **침습적**:

```cpp
// 기존 Circle 클래스
class Circle {
public:
    void draw() const;
};

// 다형 사용 위해 — Circle 수정 강요
class Shape {
public:
    virtual void draw() const = 0;
};

class Circle : public Shape { ... };    // ❌ Circle을 수정해야 함
```

**문제**:
- Circle 코드를 변경할 권한 없음 — 외부 라이브러리
- Circle은 다른 곳에서도 사용 — base 추가가 영향
- 한 번에 한 base만 — 다른 시각으로 보고 싶을 때 어쩌나?

**External Polymorphism** — Circle을 건드리지 않고 — 외부에서 다형성 부여.

이 패턴 — **Type Erasure**(가이드라인 32)의 토대. 모던 C++의 핵심 기법.

## 핵심 구조

```cpp
// 기존 코드 — 수정 안 함
class Circle {
public:
    void draw() const { /* ... */ }
};

class Square {
public:
    void draw() const { /* ... */ }
};

// External — 추상 인터페이스 (외부에서 정의)
class ShapeConcept {
public:
    virtual ~ShapeConcept() = default;
    virtual void draw() const = 0;
};

// External — 각 타입을 감싸는 model
template<typename T>
class ShapeModel : public ShapeConcept {
    T data_;
public:
    ShapeModel(T t) : data_(std::move(t)) {}
    void draw() const override { data_.draw(); }
};
```

**사용**:

```cpp
std::vector<std::unique_ptr<ShapeConcept>> shapes;
shapes.push_back(std::make_unique<ShapeModel<Circle>>(Circle{}));
shapes.push_back(std::make_unique<ShapeModel<Square>>(Square{}));

for (auto& s : shapes) {
    s->draw();    // 다형 호출
}
```

Circle, Square — 수정 없이 — 다형 컬렉션에 들어감.

## 메커니즘 — 어댑터 + 추상 인터페이스

External Polymorphism = **Adapter** + **Strategy** 결합:

- `ShapeConcept` — 클라이언트가 사용할 추상 인터페이스
- `ShapeModel<T>` — Adapter — T를 ShapeConcept로 변환
- T 자체 — 변경 없음 (단지 `draw()` 시그니처만 일치하면 OK)

**Duck typing** — "걷고 우는 게 오리면 오리다". T가 draw() 가지면 — ShapeModel<T>로 감쌀 수 있음.

## 비교 — 침습적 vs External

**침습적**:

```cpp
class Shape {
public:
    virtual void draw() const = 0;
};

class Circle : public Shape {    // Circle이 Shape를 알아야 함
public:
    void draw() const override;
};

void render(Shape& s) { s.draw(); }    // Shape 인터페이스만 받음
```

- Circle — Shape를 의존
- 코드 권한 필요
- Shape가 변하면 — Circle도 영향

**External**:

```cpp
class Circle {                    // Circle 독립
public:
    void draw() const;
};

class ShapeConcept { ... };       // 외부 인터페이스
template<typename T>
class ShapeModel : public ShapeConcept { ... };

void render(ShapeConcept& s) { s.draw(); }
```

- Circle — 어떤 인터페이스도 의존 안 함
- 외부에서 추상 부여
- Circle 변경 안 함

**의존성의 방향** — External은 인터페이스가 Circle을 모름, Circle도 인터페이스를 모름.

## 다중 시각 — 한 타입, 여러 인터페이스

External의 강점 — 동일 타입을 다양한 추상으로 볼 수 있음:

```cpp
class Circle {
public:
    void draw() const;
    void serialize(std::ostream&) const;
};

// 다른 컨텍스트에서 다른 인터페이스
class Drawable {
public:
    virtual void draw() const = 0;
};

class Serializable {
public:
    virtual void serialize(std::ostream&) const = 0;
};

template<typename T>
class DrawableModel : public Drawable { ... };

template<typename T>
class SerializableModel : public Serializable { ... };

// Circle을 두 가지 시각으로
std::unique_ptr<Drawable> d = std::make_unique<DrawableModel<Circle>>(c);
std::unique_ptr<Serializable> s = std::make_unique<SerializableModel<Circle>>(c);
```

침습적 — Circle이 두 base 다중 상속 필요. External — 자연스러움.

## 함수 객체 케이스

```cpp
struct Logger {
    void operator()(const std::string& msg) {
        std::cout << msg;
    }
};

// External polymorphism
class CallableConcept {
public:
    virtual ~CallableConcept() = default;
    virtual void call(const std::string&) = 0;
};

template<typename T>
class CallableModel : public CallableConcept {
    T data_;
public:
    CallableModel(T t) : data_(std::move(t)) {}
    void call(const std::string& msg) override { data_(msg); }
};

std::unique_ptr<CallableConcept> c = 
    std::make_unique<CallableModel<Logger>>(Logger{});
c->call("Hello");
```

표준 `std::function`이 — 정확히 이 패턴. 함수 객체에 다형성 부여.

## std::function — External Polymorphism 응용

```cpp
std::function<void(int)> f;

f = [](int x) { std::cout << x; };
f = MyFunctor{};
f = &someFunction;
```

내부 구현 (개념적):

```cpp
class FunctionConcept {
public:
    virtual ~FunctionConcept() = default;
    virtual void invoke(int) = 0;
    virtual std::unique_ptr<FunctionConcept> clone() const = 0;
};

template<typename F>
class FunctionModel : public FunctionConcept {
    F f_;
public:
    FunctionModel(F f) : f_(std::move(f)) {}
    void invoke(int x) override { f_(x); }
    std::unique_ptr<FunctionConcept> clone() const override {
        return std::make_unique<FunctionModel>(*this);
    }
};
```

`std::function<void(int)>` — `FunctionConcept` 들고 다님. 어떤 callable이든 받음.

## std::shared_ptr deleter — 또 다른 사례

```cpp
std::shared_ptr<int> p1(new int);                             // 기본 deleter
std::shared_ptr<int> p2(new int, [](int* p) { delete p; });   // lambda
std::shared_ptr<int> p3(new int, my_deleter);                  // 함수
```

`shared_ptr`는 — 어떤 deleter든 받음. 내부적으로 External Polymorphism으로 저장.

```cpp
class DeleterConcept {
public:
    virtual ~DeleterConcept() = default;
    virtual void destroy(void* p) = 0;
};

template<typename D>
class DeleterModel : public DeleterConcept {
    D d_;
public:
    void destroy(void* p) override { d_(static_cast<T*>(p)); }
};
```

## 비교 — std::variant와의 차이

| 측면 | External Polymorphism | std::variant |
|---|---|---|
| 타입 집합 | 열린 (런타임 추가) | 닫힌 (컴파일 타임) |
| 메모리 | 힙 할당 | 스택 (max size) |
| 호출 | virtual dispatch | switch (효율적) |
| 침습 | 비-침습적 | 비-침습적 |
| 동질성 | 컨테이너 가능 | 가능 |

**variant** — 타입 집합이 닫혀 있을 때. **External** — 열린 집합 + 동질 컨테이너 + 비-침습.

## 함정 — 다중 인터페이스 폭발

각 인터페이스마다 — Concept + Model<T> 작성:

```cpp
class DrawableConcept { ... };
template<typename T> class DrawableModel : public DrawableConcept { ... };

class SerializableConcept { ... };
template<typename T> class SerializableModel : public SerializableConcept { ... };

class HashableConcept { ... };
template<typename T> class HashableModel : public HashableConcept { ... };
// ... boilerplate
```

**해결책** — 매크로 또는 C++20 concept 기반 자동 생성. Boost.TypeErasure도 검토.

## 함정 — 힙 할당 비용

```cpp
auto s = std::make_unique<ShapeModel<Circle>>(c);    // 힙 할당
```

매 모델 생성마다 힙. **SBO**(small buffer optimization)로 회피:

```cpp
template<typename T>
struct alignas(16) ShapeStorage {
    std::byte buffer_[64];
    // 작은 객체는 buffer에, 큰 객체는 heap에
};
```

`std::function`도 — 보통 SBO 적용. 측정 후 결정.

## 모던 변형 — C++20 Concepts

```cpp
template<typename T>
concept Drawable = requires(const T& t) {
    t.draw();
};

template<Drawable T>
class ShapeModel : public ShapeConcept {
    T data_;
public:
    ShapeModel(T t) : data_(std::move(t)) {}
    void draw() const override { data_.draw(); }
};
```

컴파일 에러 메시지 — 더 명확. "T must have draw() method".

## Type Erasure로 진화

External Polymorphism — Type Erasure의 토대. 사용자는 unique_ptr 다루는 게 번거로움 → wrapper로 감춤:

```cpp
class Shape {
    std::unique_ptr<ShapeConcept> pimpl_;
public:
    template<typename T>
    Shape(T t) : pimpl_(std::make_unique<ShapeModel<T>>(std::move(t))) {}
    
    void draw() const { pimpl_->draw(); }
    Shape(const Shape& other) : pimpl_(other.pimpl_->clone()) {}
};

Shape s1{Circle{}};
Shape s2{Square{}};
s1.draw();
```

값 의미론! 다음 가이드라인 — [Type Erasure](/blog/programming/cpp/cpp-software-design/guideline32-consider-replacing-inheritance-hierarchies-with-type-erasure).

## 표준 라이브러리 예

| 컴포넌트 | External Polymorphism 활용 |
|---|---|
| std::function | 모든 callable을 균일 인터페이스 |
| std::shared_ptr (deleter) | 사용자 정의 deleter |
| std::any | 임의 타입을 컨테이너로 |
| std::pmr::polymorphic_allocator | 다양한 메모리 자원 |
| std::ranges::view | view 어댑터의 일부 변형 |

## 실무 가이드 — 결정 트리

```
다형성 필요한데 — 기존 타입 수정 불가?
├── 닫힌 집합 → std::variant
├── 열린 집합 + 단일 인터페이스 → External Polymorphism
├── 열린 집합 + 값 의미론 → Type Erasure (가이드라인 32)
└── 깊은 계층 + 권한 있음 → 침습적 OO
```

## 실무 가이드 — 체크리스트

- [ ] Circle 같은 기존 타입 수정 권한 있는가?
- [ ] 동일 타입을 여러 시각으로 봐야 하는가?
- [ ] Concept 인터페이스 — 최소 필요 메서드만?
- [ ] Model<T>가 boilerplate인가 — concept으로 제약?
- [ ] 힙 할당 — SBO로 회피 가능?
- [ ] Type Erasure로 진화 — 값 의미론 wrapper?

## 핵심 정리

1. **External Polymorphism** — 비-침습적 — 기존 타입 수정 없이
2. **구조** — Concept (interface) + Model<T> (adapter)
3. **Duck typing** — T가 메서드 가지면 — 자동 적합
4. **다중 시각** — 동일 타입 — 여러 인터페이스
5. **표준 응용** — std::function, shared_ptr deleter, std::any
6. **Type Erasure 토대** — 다음 단계로 진화

## 관련 항목

- [가이드라인 32: Type Erasure](/blog/programming/cpp/cpp-software-design/guideline32-consider-replacing-inheritance-hierarchies-with-type-erasure) — External의 진화
- [가이드라인 24: Adapter](/blog/programming/cpp/cpp-software-design/guideline24-use-adapters-to-standardize-interfaces) — 같은 토대
- [가이드라인 23: 값 기반 Strategy](/blog/programming/cpp/cpp-software-design/guideline23-prefer-a-value-based-implementation-of-strategy-and-command) — std::function 활용
- [가이드라인 17: std::variant](/blog/programming/cpp/cpp-software-design/guideline17-consider-stdvariant-for-implementing-visitor) — 닫힌 집합 대안
