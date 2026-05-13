---
title: "가이드라인 31: 비-침습적 런타임 다형성에는 External Polymorphism을 사용하라"
date: 2026-05-15T02:00:00
description: "External Polymorphism은 기존 타입을 건드리지 않고 다형 처리를 가능하게 한다. 어댑터와 추상 base의 결합은 Type Erasure의 토대이기도 하다."
tags: [C++, Software Design, External Polymorphism, Type Erasure]
series: "C++ Software Design"
seriesOrder: 31
---

## 왜 이 가이드라인이 중요한가?

전통적인 OO 다형성은 **침습적**이다.

```cpp
// 기존 Circle 클래스
class Circle {
public:
    void draw() const;
};

// 다형 사용을 위해 Circle 수정을 강요한다
class Shape {
public:
    virtual void draw() const = 0;
};

class Circle : public Shape { ... };    // ❌ Circle을 수정해야 한다
```

문제는 여러 갈래로 드러난다.

- Circle의 코드를 바꿀 권한이 없을 수 있다 (외부 라이브러리)
- Circle은 다른 곳에서도 쓰이므로 base를 추가하면 그곳까지 영향이 간다
- 동시에 가질 수 있는 base는 한 번에 하나뿐인데, 다른 시각으로 보고 싶을 때는 막막하다

**External Polymorphism**은 Circle을 건드리지 않고 바깥에서 다형성을 부여한다.

이 패턴은 가이드라인 32에서 다룰 **Type Erasure**의 토대다. 모던 C++의 핵심 기법 중 하나다.

## 핵심 구조

```cpp
// 기존 코드 — 수정하지 않는다
class Circle {
public:
    void draw() const { /* ... */ }
};

class Square {
public:
    void draw() const { /* ... */ }
};

// External — 추상 인터페이스 (바깥에서 정의)
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

사용 방법은 다음과 같다.

```cpp
std::vector<std::unique_ptr<ShapeConcept>> shapes;
shapes.push_back(std::make_unique<ShapeModel<Circle>>(Circle{}));
shapes.push_back(std::make_unique<ShapeModel<Square>>(Square{}));

for (auto& s : shapes) {
    s->draw();    // 다형 호출
}
```

Circle과 Square는 손대지 않고도 다형 컬렉션에 들어간다.

## 메커니즘 — 어댑터와 추상 인터페이스의 결합

External Polymorphism은 본질적으로 **Adapter**와 **Strategy**의 결합이다.

- `ShapeConcept`는 클라이언트가 사용할 추상 인터페이스다
- `ShapeModel<T>`는 T를 ShapeConcept로 변환하는 Adapter다
- T 자체는 변경되지 않는다 — `draw()` 시그니처만 맞으면 충분하다

이것이 곧 **duck typing**이다. "걷고 우는 게 오리면 오리다"라는 식으로, T가 `draw()`만 가지면 `ShapeModel<T>`로 감쌀 수 있다.

## 비교 — 침습적 vs External

**침습적** 방식:

```cpp
class Shape {
public:
    virtual void draw() const = 0;
};

class Circle : public Shape {    // Circle이 Shape를 알아야 한다
public:
    void draw() const override;
};

void render(Shape& s) { s.draw(); }    // Shape 인터페이스만 받는다
```

- Circle이 Shape에 의존한다
- Circle을 수정할 권한이 필요하다
- Shape가 변하면 Circle도 영향을 받는다

**External** 방식:

```cpp
class Circle {                    // Circle 독립적이다
public:
    void draw() const;
};

class ShapeConcept { ... };       // 바깥의 인터페이스
template<typename T>
class ShapeModel : public ShapeConcept { ... };

void render(ShapeConcept& s) { s.draw(); }
```

- Circle은 어떤 인터페이스에도 의존하지 않는다
- 추상은 바깥에서 부여된다
- Circle은 그대로 둔다

차이는 결국 **의존성의 방향**이다. External 방식에서는 인터페이스도 Circle을 모르고, Circle도 인터페이스를 모른다.

## 다중 시각 — 한 타입을 여러 인터페이스로

External의 강점은 같은 타입을 다양한 추상으로 볼 수 있다는 점이다.

```cpp
class Circle {
public:
    void draw() const;
    void serialize(std::ostream&) const;
};

// 컨텍스트마다 다른 인터페이스로 본다
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

// Circle을 두 가지 시각으로 본다
std::unique_ptr<Drawable> d = std::make_unique<DrawableModel<Circle>>(c);
std::unique_ptr<Serializable> s = std::make_unique<SerializableModel<Circle>>(c);
```

침습적 방식이라면 Circle이 두 base를 다중 상속해야 한다. External은 자연스럽게 표현된다.

## 함수 객체 사례

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

표준 라이브러리의 `std::function`이 바로 이 패턴이다. 함수 객체에 다형성을 부여하는 방식이 같다.

## std::function — External Polymorphism의 응용

```cpp
std::function<void(int)> f;

f = [](int x) { std::cout << x; };
f = MyFunctor{};
f = &someFunction;
```

내부 구현을 개념적으로 풀면 다음과 같다.

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

`std::function<void(int)>`는 `FunctionConcept`를 들고 다니면서 어떤 callable이든 받아들인다.

## std::shared_ptr의 deleter — 또 다른 사례

```cpp
std::shared_ptr<int> p1(new int);                             // 기본 deleter
std::shared_ptr<int> p2(new int, [](int* p) { delete p; });   // lambda
std::shared_ptr<int> p3(new int, my_deleter);                  // 함수
```

`shared_ptr`는 어떤 deleter든 받아들이고, 내부에서 External Polymorphism으로 저장한다.

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
| 타입 집합 | 열려 있다 (런타임 추가 가능) | 닫혀 있다 (컴파일 타임) |
| 메모리 | 힙 할당 | 스택 (max size 기준) |
| 호출 | virtual dispatch | switch (효율적) |
| 침습 | 비-침습적 | 비-침습적 |
| 동질성 | 컨테이너 가능 | 가능 |

타입 집합이 닫혀 있으면 variant가 적합하다. 열린 집합에서 동질 컨테이너를 비-침습적으로 다루고 싶다면 External 쪽이 자연스럽다.

## 함정 — 다중 인터페이스의 폭발

인터페이스가 늘어날 때마다 Concept + Model<T>를 짝지어 작성해야 한다.

```cpp
class DrawableConcept { ... };
template<typename T> class DrawableModel : public DrawableConcept { ... };

class SerializableConcept { ... };
template<typename T> class SerializableModel : public SerializableConcept { ... };

class HashableConcept { ... };
template<typename T> class HashableModel : public HashableConcept { ... };
// ... 보일러플레이트
```

매크로나 C++20 concept 기반 자동 생성을 활용하면 부담을 줄일 수 있다. Boost.TypeErasure도 한 가지 선택지다.

## 함정 — 힙 할당 비용

```cpp
auto s = std::make_unique<ShapeModel<Circle>>(c);    // 힙 할당
```

모델을 만들 때마다 힙 할당이 일어난다. SBO(small buffer optimization)로 피할 수 있다.

```cpp
template<typename T>
struct alignas(16) ShapeStorage {
    std::byte buffer_[64];
    // 작은 객체는 buffer에, 큰 객체는 heap에 둔다
};
```

`std::function`도 대개 SBO를 적용한다. 적용 여부는 측정 후 결정하는 편이 안전하다.

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

컴파일 에러 메시지가 한층 명확해진다. "T must have draw() method" 식으로 바로 짚어 준다.

## Type Erasure로 진화

External Polymorphism은 Type Erasure의 토대다. 사용자가 `unique_ptr`을 직접 다루는 게 번거롭다면 wrapper로 감춰서 값 의미론을 살릴 수 있다.

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

값 의미론이 살아난다. 다음 가이드라인인 [Type Erasure](/blog/programming/cpp/cpp-software-design/guideline32-consider-replacing-inheritance-hierarchies-with-type-erasure)에서 자세히 다룬다.

## 표준 라이브러리에서의 사례

| 컴포넌트 | External Polymorphism 활용 |
|---|---|
| std::function | 모든 callable을 균일한 인터페이스로 |
| std::shared_ptr (deleter) | 사용자 정의 deleter |
| std::any | 임의 타입을 컨테이너로 |
| std::pmr::polymorphic_allocator | 다양한 메모리 자원 |
| std::ranges::view | view 어댑터의 일부 변형 |

## 실무 가이드 — 결정 트리

```
다형성이 필요한데 기존 타입을 수정할 수 없는가?
├── 닫힌 집합 → std::variant
├── 열린 집합 + 단일 인터페이스 → External Polymorphism
├── 열린 집합 + 값 의미론 → Type Erasure (가이드라인 32)
└── 깊은 계층 + 수정 권한 있음 → 침습적 OO
```

## 실무 가이드 — 체크리스트

- [ ] Circle 같은 기존 타입을 수정할 권한이 있는가?
- [ ] 같은 타입을 여러 시각으로 봐야 하는가?
- [ ] Concept 인터페이스가 꼭 필요한 메서드만 담고 있는가?
- [ ] `Model<T>`의 boilerplate를 concept으로 제약할 수 있는가?
- [ ] 힙 할당을 SBO로 피할 수 있는가?
- [ ] Type Erasure로 진화해 값 의미론 wrapper를 만들 수 있는가?

## 핵심 정리

1. **External Polymorphism**은 비-침습적으로, 기존 타입을 수정하지 않는다
2. 구조는 Concept(interface)와 Model<T>(adapter)의 결합이다
3. **Duck typing** — T가 메서드를 가지고 있으면 자동으로 적합하다
4. 같은 타입을 여러 인터페이스로 다중 시각화할 수 있다
5. 표준에서는 std::function, shared_ptr deleter, std::any가 같은 패턴이다
6. Type Erasure로 진화하는 출발점이기도 하다

## 관련 항목

- [가이드라인 32: Type Erasure](/blog/programming/cpp/cpp-software-design/guideline32-consider-replacing-inheritance-hierarchies-with-type-erasure) — External의 진화
- [가이드라인 24: Adapter](/blog/programming/cpp/cpp-software-design/guideline24-use-adapters-to-standardize-interfaces) — 같은 토대
- [가이드라인 23: 값 기반 Strategy](/blog/programming/cpp/cpp-software-design/guideline23-prefer-a-value-based-implementation-of-strategy-and-command) — std::function 활용
- [가이드라인 17: std::variant](/blog/programming/cpp/cpp-software-design/guideline17-consider-stdvariant-for-implementing-visitor) — 닫힌 집합 대안
