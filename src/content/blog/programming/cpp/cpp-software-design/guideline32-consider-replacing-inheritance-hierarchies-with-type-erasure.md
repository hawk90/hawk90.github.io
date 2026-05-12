---
title: "가이드라인 32: 상속 계층을 Type Erasure로 대체하는 것을 고려하라"
date: 2026-05-15T03:00:00
description: "Type Erasure — External Polymorphism의 진화. 값 의미론 wrapper로 다형성. std::function, std::any의 핵심 기법."
tags: [C++, Software Design, Type Erasure, Value Semantics]
series: "C++ Software Design"
seriesOrder: 32
---

## 왜 이 가이드라인이 중요한가?

OO 다형성의 부담:
- `unique_ptr<Base>` — 사용자에게 노출
- 깊은 계층 — 결합도 증가
- 값 의미론 잃음 — 복사·이동·비교 어려움
- 침습적 — 기존 타입 수정 강요

**Type Erasure** — 다형성을 **값 의미론 객체로 감싸기**. 사용자 입장에선 단순 값, 내부에선 다형 dispatch.

```cpp
Shape s1 = Circle{};        // 값처럼 사용
Shape s2 = Square{};
s1 = s2;                    // 복사 OK
s1.draw();                  // 다형 호출
```

`std::function`, `std::any`, `std::shared_ptr<void>` — 모두 Type Erasure 응용. 모던 C++의 핵심 기법.

## 핵심 구조

External Polymorphism(가이드라인 31) + Wrapper:

```cpp
class Shape {
    // Concept — 추상 인터페이스
    struct Concept {
        virtual ~Concept() = default;
        virtual void draw() const = 0;
        virtual std::unique_ptr<Concept> clone() const = 0;
    };
    
    // Model<T> — 어떤 T든 감싸기
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

**사용 — 값처럼**:

```cpp
Shape s1 = Circle{};
Shape s2 = Square{};
s1 = s2;            // 복사 OK
s1.draw();          // Square 그림 (clone된)

std::vector<Shape> shapes;
shapes.push_back(Circle{});
shapes.push_back(Square{});
// 다형 컨테이너 + 값 의미론
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

// 사용 — unique_ptr, std::move 등 노출
std::vector<std::unique_ptr<Shape>> shapes;
shapes.push_back(std::make_unique<Circle>());
```

- 사용자가 unique_ptr 의식
- 복사 어려움 — clone() 필요
- 침습적 — Shape 상속 강요

**Type Erasure**:

```cpp
class Shape { /* 위와 같이 */ };

std::vector<Shape> shapes;
shapes.push_back(Circle{});        // 값처럼 — 깔끔
shapes.push_back(Square{});

void render(const std::vector<Shape>& shapes) {
    for (auto& s : shapes) s.draw();
}
```

- 사용자 — 그냥 값
- 복사·이동·할당 — 자연스러움
- 비-침습적 — Circle 수정 없음

## 표준 라이브러리의 Type Erasure

`std::function` — 가장 유명한 예:

```cpp
std::function<int(int)> f;
f = [](int x) { return x * 2; };
f = MyFunctor{};
f = &someFunction;

f(5);       // 다형 호출 — 어떤 callable이든
```

내부 — Concept + Model<F> 구조. SBO로 작은 callable은 스택에.

`std::any` — 임의 타입:

```cpp
std::any a = 42;
a = std::string{"hello"};
a = 3.14;
auto v = std::any_cast<double>(a);
```

`std::shared_ptr<void>` — deleter erasure 포함.

## 동작 — 컴파일러 시점

```cpp
Shape s = Circle{};
```

1. `Shape::Shape<Circle>(Circle)` 호출
2. `std::make_unique<Model<Circle>>(std::move(c))` — Model<Circle> 객체 힙 할당
3. pimpl_ — 그 객체 가리킴

```cpp
s.draw();
```

1. `pimpl_->draw()` — virtual dispatch
2. `Model<Circle>::draw()` 호출
3. `data_.draw()` — Circle::draw() 직접 호출

비용 — virtual 한 번 + 힙 할당 한 번 (생성 시).

## 값 의미론의 진가

```cpp
Shape s1 = Circle{1.0};
Shape s2 = s1;            // 깊은 복사 — 독립 객체
s2 = Square{2.0};
// s1 — 그대로 Circle
// s2 — Square

bool b = (s1 == s2);    // 비교도 가능 (Concept에 추가하면)
```

**비교 연산자** — Concept에 정의해야:

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

비교 — 다소 복잡. `dynamic_cast` 사용.

## 함정 — 보일러플레이트 폭발

각 인터페이스마다 Concept + Model<T> 작성:

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
        // 매 메서드마다 forward — boilerplate
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

**완화책**:
- Boost.TypeErasure
- Dyno 라이브러리 (Louis Dionne)
- 직접 매크로
- C++23 자동화 제안 (아직 표준 아님)

## 함정 — 힙 할당 비용

```cpp
Shape s = Circle{};        // 힙 할당 — Model<Circle> 위해
```

매 생성 — 힙. **SBO(Small Buffer Optimization)** 적용:

```cpp
class Shape {
    static constexpr size_t buffer_size_ = 32;
    
    union {
        std::byte buffer_[buffer_size_];        // 작은 객체용
        std::unique_ptr<Concept> ptr_;            // 큰 객체용
    };
    bool small_;
    
    // SBO 로직...
};
```

`std::function`은 — 보통 SBO 적용 (작은 lambda 스택에).

## 함정 — 동적 dispatch 비용

virtual 호출 — hot path에선 측정 필요. 다음 가이드라인 — [최적화](/blog/programming/cpp/cpp-software-design/guideline33-be-aware-of-the-optimization-potential-of-type-erasure).

## Type Erasure의 다양한 변형

**1. Owning** (값 의미론):
```cpp
class Shape {
    std::unique_ptr<Concept> pimpl_;
};
```

**2. Non-owning view** (참조 의미론):
```cpp
class ShapeView {
    Concept* pimpl_;        // 비 소유
};
```

C++20 `std::function_ref` (제안) — view 변형.

**3. Inplace** (SBO 보장):
```cpp
template<size_t N>
class ShapeInplace {
    std::aligned_storage_t<N> buffer_;
    Concept* pimpl_;        // buffer 가리킴
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
    // 에러 메시지 — T가 draw() 없으면 명확히 안내
};
```

## 비교 표 — 다형성 기법들

| 측면 | OO 상속 | Type Erasure | std::variant |
|---|---|---|---|
| 침습성 | 침습적 | 비-침습적 | 비-침습적 |
| 값 의미론 | 어려움 | ✅ | ✅ |
| 타입 집합 | 열림 | 열림 | 닫힘 |
| dispatch | virtual | virtual | switch (인라인 가능) |
| 메모리 | 힙 (보통) | 힙 (SBO 가능) | 스택 (max) |
| 코드량 | 적음 | 많음 (boilerplate) | 중간 |
| 컴파일 시간 | 빠름 | 느림 (template) | 중간 |
| 빌드 의존 | 헤더 무거움 | 깔끔 | 깔끔 |

## 흔한 패턴 — Type Erasure 검토

**검토 신호**:
- 값 의미론 원함 — 컨테이너에 자연스럽게
- 기존 타입 수정 불가 — 외부 라이브러리
- 다양한 callable 받기 — std::function 스타일
- 인터페이스 안정성 — 구현은 자유롭게

**Type Erasure 피하기**:
- 단순 OO 충분 — 권한 있고 계층 합당
- 닫힌 집합 — variant가 더 빠름
- hot path — virtual 비용 부담
- 보일러플레이트 견디기 어려움 + Boost 의존 못 함

## 실무 가이드 — 결정 트리

```
다형성 필요한가?
├── 닫힌 타입 집합 → std::variant + std::visit
├── 열린 + 값 의미론 + 비-침습 → Type Erasure
├── 열린 + 참조 의미론 OK → External Polymorphism
└── 권한 있고 단순 OO → 상속 + 가상 함수
```

## 실무 가이드 — 체크리스트

- [ ] 값 의미론이 필요한가? (vector에 넣고 복사 등)
- [ ] 기존 타입 수정 권한 — 없거나 피하고 싶은가?
- [ ] 컴파일 타임 타입 집합 알 수 없는가?
- [ ] virtual 비용 측정 — 수용 가능?
- [ ] 보일러플레이트 — Boost.TypeErasure 등 활용?
- [ ] SBO 적용 — 힙 할당 회피?

## 핵심 정리

1. **Type Erasure** — 값 의미론 wrapper로 다형성
2. **구조** — Concept (interface) + Model<T> (adapter) + Wrapper
3. **장점** — 값 의미론 + 비-침습 + 열린 타입 집합
4. **비용** — virtual + 힙 할당 + boilerplate
5. **SBO** — 힙 할당 회피
6. **표준 예** — std::function, std::any, std::shared_ptr deleter

## 관련 항목

- [가이드라인 31: External Polymorphism](/blog/programming/cpp/cpp-software-design/guideline31-use-external-polymorphism-for-nonintrusive-runtime-polymorphism) — Type Erasure의 토대
- [가이드라인 33: TE 최적화](/blog/programming/cpp/cpp-software-design/guideline33-be-aware-of-the-optimization-potential-of-type-erasure) — 성능 측면
- [가이드라인 22: 값 의미론](/blog/programming/cpp/cpp-software-design/guideline22-prefer-value-semantics-over-reference-semantics) — 동기
- [가이드라인 23: 값 기반 Strategy](/blog/programming/cpp/cpp-software-design/guideline23-prefer-a-value-based-implementation-of-strategy-and-command) — std::function 활용
