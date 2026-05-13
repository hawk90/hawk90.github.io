---
title: "가이드라인 32: 상속 계층을 Type Erasure로 대체하는 것을 고려하라"
date: 2026-05-15T03:00:00
description: "Type Erasure는 External Polymorphism이 한 단계 발전한 형태다. 값 의미론 wrapper로 다형성을 표현하며 std::function과 std::any의 기반이 된다."
tags: [C++, Software Design, Type Erasure, Value Semantics]
series: "C++ Software Design"
seriesOrder: 32
draft: true
---

## 왜 이 가이드라인이 중요한가?

전통적인 OO 다형성에는 부담이 따른다.

- 사용자에게 `unique_ptr<Base>`가 노출된다
- 계층이 깊어질수록 결합도가 올라간다
- 값 의미론을 잃어 복사·이동·비교가 까다로워진다
- 침습적이어서 기존 타입의 수정을 강요한다

**Type Erasure**는 다형성을 **값 의미론 객체로 감싸는** 기법이다. 사용자 입장에서는 단순한 값이지만 내부에서는 다형 dispatch가 일어난다.

```cpp
Shape s1 = Circle{};        // 값처럼 사용한다
Shape s2 = Square{};
s1 = s2;                    // 복사 OK
s1.draw();                  // 다형 호출
```

`std::function`, `std::any`, `std::shared_ptr<void>`가 모두 Type Erasure의 응용이다. 모던 C++의 핵심 기법 중 하나다.

## 핵심 구조

External Polymorphism(가이드라인 31)에 Wrapper를 얹은 형태다.

```cpp
class Shape {
    // Concept — 추상 인터페이스
    struct Concept {
        virtual ~Concept() = default;
        virtual void draw() const = 0;
        virtual std::unique_ptr<Concept> clone() const = 0;
    };
    
    // Model<T> — 어떤 T든 감싼다
    template<typename T>
    struct Model : Concept {
        T data_;
        Model(T t) : data_(std::move(t)) {}
        void draw() const override { data_.draw(); }
        std::unique_ptr<Concept> clone() const override {
            return std::make_unique<Model>(*this);
        }
    };
    
    std::unique_ptr<Concept> pimpl_;
    
public:
    template<typename T>
    Shape(T t) : pimpl_(std::make_unique<Model<T>>(std::move(t))) {}
    
    Shape(const Shape& other) : pimpl_(other.pimpl_->clone()) {}
    Shape(Shape&&) noexcept = default;
    Shape& operator=(const Shape& other) {
        Shape tmp(other);
        std::swap(pimpl_, tmp.pimpl_);
        return *this;
    }
    Shape& operator=(Shape&&) noexcept = default;
    
    void draw() const { pimpl_->draw(); }
};
```

사용은 값처럼 자연스럽다.

```cpp
Shape s1 = Circle{};
Shape s2 = Square{};
s1 = s2;            // 복사 OK
s1.draw();          // Square 그림 (clone된 것)

std::vector<Shape> shapes;
shapes.push_back(Circle{});
shapes.push_back(Square{});
// 다형 컨테이너이면서 값 의미론
```

## 비교 — OO vs Type Erasure

**OO 방식**:

```cpp
class Shape {
public:
    virtual ~Shape() = default;
    virtual void draw() const = 0;
};

class Circle : public Shape { ... };

void render(const std::vector<std::unique_ptr<Shape>>& shapes) {
    for (auto& s : shapes) s->draw();
}

// 사용 시 unique_ptr, std::move 등이 표면에 드러난다
std::vector<std::unique_ptr<Shape>> shapes;
shapes.push_back(std::make_unique<Circle>());
```

- 사용자가 `unique_ptr`를 의식해야 한다
- 복사가 까다롭다 — `clone()`이 필요하다
- 침습적이라 Shape 상속을 강요한다

**Type Erasure 방식**:

```cpp
class Shape { /* 위와 같이 */ };

std::vector<Shape> shapes;
shapes.push_back(Circle{});        // 값처럼 — 깔끔하다
shapes.push_back(Square{});

void render(const std::vector<Shape>& shapes) {
    for (auto& s : shapes) s.draw();
}
```

- 사용자에게는 그냥 값이다
- 복사·이동·할당이 자연스럽다
- 비-침습적이라 Circle을 수정할 필요가 없다

## 표준 라이브러리의 Type Erasure

가장 유명한 예가 `std::function`이다.

```cpp
std::function<int(int)> f;
f = [](int x) { return x * 2; };
f = MyFunctor{};
f = &someFunction;

f(5);       // 어떤 callable이든 다형 호출
```

내부 구조는 Concept + Model<F>이며 작은 callable은 SBO로 스택에 둔다.

`std::any`는 임의 타입을 담는 사례다.

```cpp
std::any a = 42;
a = std::string{"hello"};
a = 3.14;
auto v = std::any_cast<double>(a);
```

`std::shared_ptr<void>`도 deleter erasure 형태로 같은 기법을 활용한다.

## 동작 — 컴파일러 시점

```cpp
Shape s = Circle{};
```

1. `Shape::Shape<Circle>(Circle)`이 호출된다
2. `std::make_unique<Model<Circle>>(std::move(c))`가 Model<Circle>를 힙에 할당한다
3. `pimpl_`이 그 객체를 가리킨다

```cpp
s.draw();
```

1. `pimpl_->draw()`로 virtual dispatch가 일어난다
2. `Model<Circle>::draw()`가 호출된다
3. 내부의 `data_.draw()`가 결국 `Circle::draw()`를 직접 호출한다

비용은 생성 시 힙 할당 한 번과 호출 시 virtual 호출 한 번이다.

## 값 의미론의 진가

```cpp
Shape s1 = Circle{1.0};
Shape s2 = s1;            // 깊은 복사 — 독립 객체
s2 = Square{2.0};
// s1은 그대로 Circle
// s2는 Square

bool b = (s1 == s2);    // 비교도 가능하다 (Concept에 추가하면)
```

비교 연산자는 Concept에 별도로 정의해야 한다.

```cpp
struct Concept {
    virtual bool equals(const Concept&) const = 0;
};

template<typename T>
struct Model : Concept {
    bool equals(const Concept& other) const override {
        if (auto* o = dynamic_cast<const Model<T>*>(&other)) {
            return data_ == o->data_;
        }
        return false;
    }
};
```

비교는 다소 복잡하고 `dynamic_cast`가 들어간다.

## 함정 — 보일러플레이트 폭발

인터페이스가 늘어날수록 Concept과 Model<T>가 함께 부풀어 오른다.

```cpp
class Shape {
    struct Concept {
        virtual ~Concept() = default;
        virtual void draw() const = 0;
        virtual void rotate(double) = 0;
        virtual double area() const = 0;
        virtual std::unique_ptr<Concept> clone() const = 0;
    };
    
    template<typename T>
    struct Model : Concept {
        T data_;
        // 매 메서드마다 forward — 보일러플레이트
        void draw() const override { data_.draw(); }
        void rotate(double a) override { data_.rotate(a); }
        double area() const override { return data_.area(); }
        std::unique_ptr<Concept> clone() const override {
            return std::make_unique<Model>(*this);
        }
    };
    // ...
};
```

완화책은 여러 가지가 있다.

- Boost.TypeErasure
- Dyno 라이브러리 (Louis Dionne)
- 직접 작성한 매크로
- C++23 자동화 제안 (아직 표준 아님)

## 함정 — 힙 할당 비용

```cpp
Shape s = Circle{};        // Model<Circle>를 위한 힙 할당
```

객체를 만들 때마다 힙 할당이 일어난다. **SBO(Small Buffer Optimization)**를 적용하면 피할 수 있다.

```cpp
class Shape {
    static constexpr size_t buffer_size_ = 32;
    
    union {
        std::byte buffer_[buffer_size_];          // 작은 객체용
        std::unique_ptr<Concept> ptr_;            // 큰 객체용
    };
    bool small_;
    
    // SBO 로직...
};
```

`std::function`도 보통 SBO를 적용해서 작은 lambda는 스택에 둔다.

## 함정 — 동적 dispatch 비용

virtual 호출은 hot path에서는 측정이 필요하다. 다음 가이드라인인 [최적화](/blog/programming/cpp/cpp-software-design/guideline33-be-aware-of-the-optimization-potential-of-type-erasure)에서 이어 다룬다.

## Type Erasure의 다양한 변형

**1. Owning** — 값 의미론:
```cpp
class Shape {
    std::unique_ptr<Concept> pimpl_;
};
```

**2. Non-owning view** — 참조 의미론:
```cpp
class ShapeView {
    Concept* pimpl_;        // 소유하지 않는다
};
```

C++20에서 제안된 `std::function_ref`가 이런 view 변형이다.

**3. Inplace** — SBO를 보장:
```cpp
template<size_t N>
class ShapeInplace {
    std::aligned_storage_t<N> buffer_;
    Concept* pimpl_;        // buffer를 가리킨다
};
```

## 모던 변형 — C++20 Concepts + Type Erasure

```cpp
template<typename T>
concept Drawable = requires(const T& t) { t.draw(); };

class Shape {
    // ...
public:
    template<Drawable T>
    Shape(T t) : pimpl_(std::make_unique<Model<T>>(std::move(t))) {}
    // T에 draw()가 없으면 에러 메시지가 명확히 안내한다
};
```

## 비교 표 — 다형성 기법들

| 측면 | OO 상속 | Type Erasure | std::variant |
|---|---|---|---|
| 침습성 | 침습적 | 비-침습적 | 비-침습적 |
| 값 의미론 | 어렵다 | ✅ | ✅ |
| 타입 집합 | 열림 | 열림 | 닫힘 |
| dispatch | virtual | virtual | switch (인라인 가능) |
| 메모리 | 힙 (보통) | 힙 (SBO 가능) | 스택 (max) |
| 코드량 | 적다 | 많다 (boilerplate) | 중간 |
| 컴파일 시간 | 빠르다 | 느리다 (template) | 중간 |
| 빌드 의존 | 헤더 무거움 | 깔끔 | 깔끔 |

## 흔한 패턴 — Type Erasure 검토

검토할 만한 신호는 다음과 같다.

- 값 의미론을 원해서 컨테이너에 자연스럽게 담고 싶다
- 기존 타입을 수정할 수 없다 (외부 라이브러리)
- 다양한 callable을 받고 싶다 — `std::function` 스타일
- 인터페이스를 안정적으로 두고 구현은 자유롭게 두고 싶다

피해야 할 경우는 다음과 같다.

- 단순 OO로 충분하다 — 권한도 있고 계층도 합당하다
- 닫힌 집합이라면 variant가 더 빠르다
- hot path여서 virtual 비용이 부담이다
- 보일러플레이트가 견디기 힘들고 Boost 의존도 어렵다

## 실무 가이드 — 결정 트리

```
다형성이 필요한가?
├── 닫힌 타입 집합 → std::variant + std::visit
├── 열린 + 값 의미론 + 비-침습 → Type Erasure
├── 열린 + 참조 의미론 OK → External Polymorphism
└── 권한 있고 단순 OO → 상속 + 가상 함수
```

## 실무 가이드 — 체크리스트

- [ ] 값 의미론이 필요한가? (vector에 담고 복사하는 식)
- [ ] 기존 타입을 수정할 권한이 없거나 피하고 싶은가?
- [ ] 컴파일 타임에 타입 집합을 알 수 없는가?
- [ ] virtual 비용을 측정해 수용 가능한가?
- [ ] 보일러플레이트를 Boost.TypeErasure 등으로 줄일 수 있는가?
- [ ] SBO를 적용해 힙 할당을 피할 수 있는가?

## 핵심 정리

1. **Type Erasure**는 값 의미론 wrapper로 다형성을 표현한다
2. 구조는 Concept(interface) + Model<T>(adapter) + Wrapper
3. 장점은 값 의미론, 비-침습성, 열린 타입 집합이다
4. 비용은 virtual 호출, 힙 할당, 보일러플레이트다
5. **SBO**로 힙 할당을 피할 수 있다
6. 표준의 예는 `std::function`, `std::any`, `std::shared_ptr` deleter다

## 관련 항목

- [가이드라인 31: External Polymorphism](/blog/programming/cpp/cpp-software-design/guideline31-use-external-polymorphism-for-nonintrusive-runtime-polymorphism) — Type Erasure의 토대
- [가이드라인 33: TE 최적화](/blog/programming/cpp/cpp-software-design/guideline33-be-aware-of-the-optimization-potential-of-type-erasure) — 성능 측면
- [가이드라인 22: 값 의미론](/blog/programming/cpp/cpp-software-design/guideline22-prefer-value-semantics-over-reference-semantics) — 동기
- [가이드라인 23: 값 기반 Strategy](/blog/programming/cpp/cpp-software-design/guideline23-prefer-a-value-based-implementation-of-strategy-and-command) — std::function 활용
