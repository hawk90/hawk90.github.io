---
title: "가이드라인 18: Acyclic Visitor의 성능을 경계하라"
date: 2026-05-14T14:00:00
description: "Acyclic Visitor는 새 타입 추가에서 OCP를 흉내 내지만 dynamic_cast 남용으로 성능이 깨진다. variant가 답이다."
tags: [C++, Software Design, Visitor, Performance]
series: "C++ Software Design"
seriesOrder: 18
draft: true
---

## 왜 이 가이드라인이 중요한가?

가이드라인 16에서 본 GoF Visitor의 OCP 비대칭이 있다. 새 타입이 추가될 때마다 모든 visitor를 손봐야 한다.

**Acyclic Visitor**는 이 문제를 해결해 보려는 시도다. visitor가 자기가 지원하는 타입만 명시한다. 새 타입이 추가되면 옵션으로 처리된다.

```cpp
class IShapeVisitor { /* base — 빈 인터페이스 */ };

template<typename T>
class IVisitorFor {
    virtual void visit(T&) = 0;
};

// AreaVisitor — 일부 도형만 지원한다
class AreaVisitor
    : public IShapeVisitor,
      public IVisitorFor<Circle>,
      public IVisitorFor<Square> {
    // Triangle은 지원하지 않는다
};
```

여기에 큰 함정이 있다. 구현이 **`dynamic_cast`** 에 의존한다. 성능이 무너진다.

```cpp
class Circle : public Shape {
    void accept(IShapeVisitor& v) override {
        if (auto* visitor = dynamic_cast<IVisitorFor<Circle>*>(&v)) {     // ⚠️
            visitor->visit(*this);
        }
    }
};
```

매 호출마다 RTTI lookup이 일어난다. 가상 함수 호출보다 훨씬 비싸다. 핫 패스에서는 치명적이다.

Iglberger의 결론은 분명하다. **Acyclic Visitor 대신 `std::variant`** 다. 같은 OCP 목표를 0에 가까운 비용으로 달성한다.

## 핵심 내용

- **Acyclic Visitor** — GoF Visitor의 타입 추가 OCP를 해결하려는 시도.
- 구현이 `dynamic_cast`에 매달린다(RTTI 비용).
- 성능이 매우 나쁘다. 가상 호출보다 10배 이상 느릴 수 있다.
- `std::variant` + visit이 같은 OCP를 0 비용에 가깝게 달성한다.
- Acyclic Visitor가 정당한 경우는 이미 시스템이 `dynamic_cast`를 받아들이는 환경뿐이다.

## Acyclic Visitor 구조

```cpp
// 1. 공통 visitor base (마커 인터페이스)
class IShapeVisitor {
public:
    virtual ~IShapeVisitor() = default;
};

// 2. 타입별 visitor 인터페이스
template<typename T>
class IVisitorFor {
public:
    virtual ~IVisitorFor() = default;
    virtual void visit(T&) = 0;
};

// 3. Element 인터페이스
class Shape {
public:
    virtual ~Shape() = default;
    virtual void accept(IShapeVisitor& v) = 0;
};

// 4. Concrete element — dynamic_cast로 분기
class Circle : public Shape {
public:
    double radius;
    void accept(IShapeVisitor& v) override {
        if (auto* visitor = dynamic_cast<IVisitorFor<Circle>*>(&v)) {
            visitor->visit(*this);
        }
        // 지원하지 않는 visitor는 silent skip한다
    }
};

class Square : public Shape {
public:
    double side;
    void accept(IShapeVisitor& v) override {
        if (auto* visitor = dynamic_cast<IVisitorFor<Square>*>(&v)) {
            visitor->visit(*this);
        }
    }
};

// 5. Concrete visitor — 지원하는 타입만 상속한다
class AreaVisitor
    : public IShapeVisitor,
      public IVisitorFor<Circle>,
      public IVisitorFor<Square> {
public:
    double total = 0;
    void visit(Circle& c) override { total += M_PI * c.radius * c.radius; }
    void visit(Square& s) override { total += s.side * s.side; }
    // Triangle은 지원하지 않는다. 그래도 컴파일 OK
};
```

## OCP 비교

### GoF Visitor — 새 도형 추가 시

```cpp
// 새 도형 Pentagon을 추가하면 모든 visitor를 손봐야 한다

class ShapeVisitor {
public:
    virtual void visit(Circle&) = 0;
    virtual void visit(Square&) = 0;
    virtual void visit(Pentagon&) = 0;     // ⚠️ 추가
};

class AreaVisitor : public ShapeVisitor {
public:
    void visit(Circle&) override;
    void visit(Square&) override;
    void visit(Pentagon&) override;        // ⚠️ 강제로 구현해야 한다
};
```

### Acyclic Visitor — 새 도형 추가 시

```cpp
// Pentagon 추가
class Pentagon : public Shape {
public:
    void accept(IShapeVisitor& v) override {
        if (auto* visitor = dynamic_cast<IVisitorFor<Pentagon>*>(&v)) {
            visitor->visit(*this);
        }
    }
};

// 기존 AreaVisitor는 수정하지 않는다.
// AreaVisitor가 IVisitorFor<Pentagon>을 상속하지 않았으므로
// Pentagon::accept 안에서 silent skip된다.
```

기존 visitor를 손대지 않는다. 새 visitor가 Pentagon을 처리하려면 `IVisitorFor<Pentagon>`을 추가로 상속한다.

이게 Acyclic Visitor의 약속이다.

## dynamic_cast의 비용

`dynamic_cast`는 런타임 타입 식별(RTTI)을 동반한다.

- 클래스 hierarchy 트리를 탐색한다.
- 컴파일러마다 구현이 다르다(전형적으로 strcmp와 traverse 조합).
- 일반적으로 **30~100 나노초**가 든다(가상 호출은 1~3 ns).

```cpp
void accept(IShapeVisitor& v) override {
    if (auto* visitor = dynamic_cast<IVisitorFor<Circle>*>(&v)) {
        visitor->visit(*this);
    }
}
```

매 호출마다 `dynamic_cast`다. 핫 패스에서 백만 번을 부르면 30~100ms가 더 든다.

`std::variant`와 비교해 보자.

```cpp
std::visit(visitor, shape);
// → tag 비교(1 cycle) + switch(보통 1~2 cycle)
// = 약 1 나노초
```

variant 쪽이 30~100배 빠르다. 핫 패스에서는 결정적이다.

## RTTI 비활성화 환경

```bash
g++ -fno-rtti     # RTTI를 끈다 (임베디드에서 흔하다)
```

`-fno-rtti`이면 `dynamic_cast`가 컴파일 에러로 막힌다. Acyclic Visitor는 그 환경에서 쓸 수 없다.

임베디드와 게임 엔진은 보통 RTTI를 끄고 빌드한다. 그쪽에서는 Acyclic Visitor 자체가 선택지가 아니다.

## variant 대안 — 같은 OCP

```cpp
using Shape = std::variant<Circle, Square, Triangle, Pentagon>;

// AreaVisitor — 일부만 처리하고 싶다
double area(const Shape& s) {
    return std::visit(std::overload{
        [](const Circle& c)   { return M_PI * c.radius * c.radius; },
        [](const Square& s)   { return s.side * s.side; },
        [](const Pentagon& p) { /* ... */ },
        [](const auto&)       { return 0.0; }      // ⚠️ 처리하지 않는 케이스의 fallback
    }, s);
}
```

`auto` fallback이 처리하지 않는 케이스를 명시한다. 새 타입이 추가되면 `auto`가 자동으로 받아 주거나 명시적으로 케이스를 더한다.

variant가 만들어 내는 OCP에 가까운 효과다. `dynamic_cast`가 없다.

## 함정 — Acyclic Visitor의 미묘함

```cpp
class AreaVisitor
    : public IShapeVisitor,
      public IVisitorFor<Circle>,
      public IVisitorFor<Square> {
};

Triangle t;
AreaVisitor av;
t.accept(av);     // silent skip — Triangle이 무처리로 끝난다
```

**silent skip**이 디버깅을 어렵게 만든다. 사용자는 처리됐다고 기대하기 쉽다.

해법은 assert로 명시하는 것이다.

```cpp
void accept(IShapeVisitor& v) override {
    if (auto* visitor = dynamic_cast<IVisitorFor<Triangle>*>(&v)) {
        visitor->visit(*this);
    } else {
        assert(false && "Visitor does not support Triangle");
    }
}
```

assert가 잘못된 visitor를 잡아 준다. 다만 release 빌드에서는 사라진다.

## 함정 — 코드 복잡도

Acyclic Visitor는 보일러플레이트가 많다.

```cpp
// 각 element
class Element : public Base {
    void accept(IVisitor& v) override {
        if (auto* visitor = dynamic_cast<IVisitorFor<Element>*>(&v)) {
            visitor->visit(*this);
        }
    }
};

// 각 visitor — 다중 상속
class MyVisitor
    : public IVisitor,
      public IVisitorFor<Type1>,
      public IVisitorFor<Type2>,
      // ... 더 많은 타입 ...
{
    void visit(Type1&) override;
    void visit(Type2&) override;
    // ...
};
```

다중 상속이 디버깅, 컴파일 시간, 가독성을 모두 무겁게 만든다.

## 함정 — 다이아몬드 상속

```cpp
class IVisitorFor<Type1> { virtual void visit(Type1&) = 0; };
class IVisitorFor<Type2> { virtual void visit(Type2&) = 0; };

class MyVisitor
    : public IShapeVisitor,
      public IVisitorFor<Type1>,
      public IVisitorFor<Type2> {
    // 다중 상속
};
```

`IVisitorFor<T>`가 공통 base를 가지면 다이아몬드 상속이 생긴다. virtual 상속이 필요해진다.

```cpp
class IVisitorFor : virtual public IVisitorBase { /* ... */ };
```

virtual 상속은 추가 비용과 복잡도를 데려온다.

## 디자인 비교

| 측면 | GoF Visitor | Acyclic Visitor | `std::variant` |
| --- | --- | --- | --- |
| 새 연산 추가 | ✅ | ✅ | ✅ |
| 새 타입 추가 | ❌ 모든 visitor 수정 | ✅ silent skip | ⚠️ visit 수정 (generic 람다는 자동) |
| 성능 | vtable × 2 (~5 ns) | dynamic_cast (~30~100 ns) | tag dispatch (~1 ns) |
| 메모리 | heap (포인터) | heap (포인터) | 값 (스택 가능) |
| RTTI 의존 | X | ✅ 필수 | X |
| 보일러플레이트 | 중간 | 매우 많다 | 적다 |
| 타입 안전성 | 컴파일 타임 | 런타임 (silent skip) | 컴파일 타임 |

## 정당한 Acyclic Visitor 사용

매우 드문 경우다.

### 1) 이미 dynamic_cast를 쓰는 시스템

```cpp
// 라이브러리가 RTTI를 적극적으로 활용한다
class Widget {
    virtual ~Widget() = default;
};

// Widget 시스템에서 dynamic_cast가 흔하면 Acyclic Visitor의 추가 부담이 크지 않다
```

### 2) Open hierarchy + 외부 plugin

```cpp
// 플러그인이 새 Element 종류를 더한다
// 호스트가 모든 Element를 알 수 없는 환경 → Acyclic Visitor가 자연스럽다
```

매우 특수한 경우다. 보통은 Type Erasure(가이드라인 32~34)가 낫다.

## 더 단순한 대안 — Type tag + switch

```cpp
enum class ShapeType { Circle, Square, Triangle };

class Shape {
public:
    virtual ~Shape() = default;
    virtual ShapeType type() const = 0;
};

class Circle : public Shape {
public:
    ShapeType type() const override { return ShapeType::Circle; }
};

double area(const Shape& s) {
    switch (s.type()) {
        case ShapeType::Circle: {
            const auto& c = static_cast<const Circle&>(s);     // safe — 타입을 확인한 뒤다
            return M_PI * c.radius * c.radius;
        }
        case ShapeType::Square: {
            const auto& sq = static_cast<const Square&>(s);
            return sq.side * sq.side;
        }
        // ...
    }
}
```

`static_cast`는 `dynamic_cast`보다 빠르다. 단, type tag와 실제 타입의 일치 책임은 사용자에게 있다.

이 패턴이 variant의 단순화 버전이라고 볼 수 있다.

## 컴파일 타임 visitor — 정말 OCP를 만족하는가

```cpp
// 어떤 도구도 두 차원(타입과 연산) 모두에서 OCP를 만족시키지는 못한다 (Expression Problem)
```

진짜 해결책은 다음과 같다.

1. 어느 한 차원에서는 OCP를 만족시킬 수 없다는 점을 인정한다.
2. 양쪽 모두 필요하면 외부 라이브러리 패턴 — Type Erasure나 External Polymorphism 을 쓴다.
3. 도메인에 맞춰 둘 중 한쪽을 고른다.

Acyclic Visitor는 silent skip으로 OCP를 흉내 낼 뿐, 진짜 OCP를 달성하는 것은 아니다.

## 모던 권장 — Iglberger의 결론

가이드라인 18의 결론은 한 줄이다.

> "Acyclic Visitor에 만족하지 마라. `std::variant` + `std::visit`을 우선하라."

이유는 다음과 같다.

- 성능 차이가 크다.
- 보일러플레이트가 적어 단순하다.
- 타입 안전성을 컴파일러가 보장한다.
- closed set 명시로 일관성이 높아진다.

## 실무 가이드 — Acyclic Visitor 결정

```
이 시스템에 Acyclic Visitor가 어울리는가?
├── RTTI를 쓸 수 있는가? (-fno-rtti가 아닌가) → 다음 질문
├── open hierarchy가 정말 필요한가?
│   ├── 그렇다 → Type Erasure를 먼저 검토하고, 안 되면 Acyclic
│   └── 아니다 → std::variant 우선
├── 핫 패스가 아닌가? (dynamic_cast 비용을 감수해도 되는가)
│   ├── 핫 패스다 → 절대 X
│   └── 일반 경로다 → Acyclic 가능
└── 다중 상속 보일러플레이트를 받아들일 수 있는가?
```

대부분은 NO다. variant나 GoF Visitor가 답이다.

## 함정 — Acyclic Visitor를 GoF Visitor와 혼동한다

```cpp
// GoF Visitor — visitor에 모든 타입이 명시된다
class ShapeVisitor {
    virtual void visit(Circle&) = 0;
    virtual void visit(Square&) = 0;
};

// Acyclic Visitor — visitor가 일부 타입만 명시한다
class ShapeVisitor { /* 빈 base */ };
template<typename T> class IVisitorFor { virtual void visit(T&) = 0; };
```

용어가 다르다. GoF는 닫힌 visitor 인터페이스, Acyclic은 다중 상속으로 분리된 visitor다.

## 모던 C++의 답

```cpp
using Shape = std::variant<Circle, Square, Triangle>;

double area(const Shape& s) {
    return std::visit(std::overload{
        [](const Circle& c) { return M_PI * c.radius * c.radius; },
        [](const Square& s) { return s.side * s.side; },
        [](const Triangle& t) { return 0.5 * t.base * t.height; }
    }, s);
}
```

- 보일러플레이트가 없다.
- 빠르다.
- type-safe다.
- 새 연산 추가가 자유롭다.

90%의 경우에 이게 답이다.

## 실무 가이드 — 체크리스트

Acyclic Visitor를 도입하기 전에 다음을 확인하자.

- [ ] `std::variant` + visit으로는 정말 부족한가?
- [ ] open hierarchy가 정말 필요한가?
- [ ] RTTI를 쓸 수 있는 환경인가?
- [ ] `dynamic_cast` 비용이 핫 패스에 들어가지는 않는가?
- [ ] 다중 상속의 보일러플레이트를 감수할 수 있는가?
- [ ] Type Erasure가 더 적합하지는 않은가?

## 정리

Acyclic Visitor는 GoF Visitor의 OCP 한계를 풀어 보려는 시도다. 방법은 **`dynamic_cast` + 다중 상속**이다.

문제는 다음과 같다.

- 성능 — `dynamic_cast` 비용
- 보일러플레이트
- RTTI 의존
- silent skip — 디버깅이 어렵다

모던 C++의 답은 `std::variant` + `std::visit`이다(가이드라인 17). Acyclic Visitor는 매우 특수한 경우에만 꺼낸다.

## 관련 항목

- [가이드라인 16: GoF Visitor](/blog/programming/cpp/cpp-software-design/guideline16-use-visitor-to-extend-operations) — 전통 패턴
- [가이드라인 17: std::variant Visitor](/blog/programming/cpp/cpp-software-design/guideline17-consider-stdvariant-for-implementing-visitor) — 모던 답
- [가이드라인 31: External Polymorphism](/blog/programming/cpp/cpp-software-design/guideline31-use-external-polymorphism-for-nonintrusive-runtime-polymorphism) — 진짜 open hierarchy
- [Effective C++ 항목 27: 캐스팅 최소화](/blog/programming/cpp/effective-cpp/item27-minimize-casting) — dynamic_cast 비용
