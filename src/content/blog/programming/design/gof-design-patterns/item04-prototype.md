---
title: "GoF 4: Prototype"
date: 2026-02-01T04:00:00
description: "기존 객체를 복제 — 비싼 생성을 한 번만 하고, 나머지는 clone."
tags: [Design Pattern, GoF, C++, C, Creational]
series: "GoF Design Patterns"
seriesOrder: 4
draft: true
---

## 한 줄 요약

> **"매번 새로 만들지 말고 복제해"** — 견본 객체 하나 만들어두고 `clone()`으로 찍어냄.

## 어떤 문제를 푸는가

객체 생성이 **비쌉니다**:
- DB 조회로 초기화
- 네트워크 호출로 설정
- 복잡한 계산

같은 종류 객체가 여러 번 필요하다면 — 매번 처음부터 만들지 말고 **한 번 만든 견본을 복제**.

또는 객체 종류가 **런타임에 동적으로 추가**되는 경우 (플러그인, 게임 spawn) — 팩토리 클래스 폭발 회피.

## 한눈에 보는 구조

<img src="/images/blog/gof/diagrams/item04-prototype.svg" alt="Prototype 패턴 클래스 다이어그램" style="max-width:100%; background:white; padding:8px; border-radius:6px;" />

견본 객체에게 "복사본 줘"라고만 요청하면 됨.

## 언제 쓰면 좋은가

- 인스턴스화할 클래스가 **런타임에 결정**될 때
- 제품 클래스 계층과 평행한 팩토리 계층을 만들기 싫을 때
- 객체 상태가 **한정된 조합**으로 미리 알려져 있을 때 (조합마다 prototype)
- 생성 비용이 큼

## 언제 쓰면 안 되나

> ⚠️ **순환 참조가 있는 객체** — 깊은 복사가 무한 루프 위험.

> ⚠️ **단순한 객체** — 그냥 새로 만들면 됨.

## C++ 구현

### 1. Prototype 인터페이스

```cpp
class Shape {
public:
    virtual ~Shape() = default;
    virtual std::unique_ptr<Shape> clone() const = 0;   // ← prototype method
    virtual void draw() const = 0;
};
```

### 2. ConcretePrototype — copy ctor 활용

```cpp
class Circle : public Shape {
    int x, y, radius;
public:
    Circle(int x, int y, int r) : x(x), y(y), radius(r) {}

    std::unique_ptr<Shape> clone() const override {
        return std::make_unique<Circle>(*this);   // copy constructor가 모든 멤버 복사
    }

    void draw() const override { /* ... */ }
};

class Rectangle : public Shape {
    int x, y, w, h;
public:
    Rectangle(int x, int y, int w, int h) : x(x), y(y), w(w), h(h) {}

    std::unique_ptr<Shape> clone() const override {
        return std::make_unique<Rectangle>(*this);
    }

    void draw() const override { /* ... */ }
};
```

`*this`가 copy ctor를 호출 → 모든 멤버 자동 복사. **깊은 복사**가 필요한 멤버는 copy ctor에서 처리.

### 3. 사용

```cpp
auto proto = std::make_unique<Circle>(0, 0, 10);
auto c1 = proto->clone();
auto c2 = proto->clone();
```

`proto`는 견본, `c1`/`c2`는 독립 인스턴스.

## Prototype Registry — 런타임 등록

이름으로 prototype 조회 → 복제. 플러그인 친화.

```cpp
class ShapeRegistry {
    std::map<std::string, std::unique_ptr<Shape>> protos;
public:
    void registerProto(std::string name, std::unique_ptr<Shape> p) {
        protos[std::move(name)] = std::move(p);
    }

    std::unique_ptr<Shape> create(const std::string& name) const {
        return protos.at(name)->clone();
    }
};
```

사용:

```cpp
ShapeRegistry reg;
reg.registerProto("small-circle", std::make_unique<Circle>(0, 0, 5));
reg.registerProto("big-circle",   std::make_unique<Circle>(0, 0, 50));

auto s = reg.create("small-circle");   // 등록된 견본을 복제
```

## 깊은 복사 vs 얕은 복사

자원 멤버를 가진 객체는 신경 써야 합니다.

```cpp
class Document {
    std::vector<std::unique_ptr<Node>> nodes;
public:
    std::unique_ptr<Document> clone() const {
        auto c = std::make_unique<Document>();
        for (const auto& n : nodes)
            c->nodes.push_back(n->clone());   // 노드별 깊은 복사
        return c;
    }
};
```

- `unique_ptr`/raw 자원: **명시적 깊은 복사** 필요
- `shared_ptr`: 의도에 따라 **공유(얕은)**도 OK

## C 구현

```c
typedef struct Shape {
    struct Shape* (*clone)(const struct Shape*);
    void          (*draw)(const struct Shape*);
} Shape;

typedef struct {
    Shape  base;
    int    x, y, radius;
} Circle;

static Shape* circle_clone(const Shape* self) {
    const Circle* src = (const Circle*)self;
    Circle* c = malloc(sizeof(Circle));
    *c = *src;     // 비트 복사 — 포인터 멤버 있으면 별도 처리
    return (Shape*)c;
}

Circle* circle_new(int x, int y, int r) {
    Circle* c = malloc(sizeof(Circle));
    c->base.clone = circle_clone;
    c->base.draw  = circle_draw;
    c->x = x; c->y = y; c->radius = r;
    return c;
}
```

## CRTP로 보일러플레이트 제거 (모던 C++)

각 클래스마다 `clone()` 손으로 쓰는 게 귀찮다면:

```cpp
template<typename Derived, typename Base>
class Cloneable : public Base {
public:
    std::unique_ptr<Base> clone() const override {
        return std::make_unique<Derived>(static_cast<const Derived&>(*this));
    }
};

class Circle : public Cloneable<Circle, Shape> { /* clone 자동 */ };
```

## 트레이드오프 — 한눈에

| 차원 | Prototype |
| --- | --- |
| 비용 큰 생성 회피 | ✅ 강력 |
| 런타임 새 종류 등록 | ✅ Registry로 |
| 팩토리 계층 단순화 | ✅ 제품 계층만 있으면 됨 |
| 깊은 복사 구현 | ⚠️ 까다로움 (자원·순환) |
| `clone()` 보일러플레이트 | ⚠️ 매 클래스마다 (CRTP로 완화) |

## 실제 사례

- 게임 엔진의 객체 spawn (적 prototype, 아이템 prototype)
- IDE의 코드 템플릿 / 스니펫
- JavaScript의 prototype-based OOP
- Java의 `Cloneable` 인터페이스

## 관련 패턴

- **[Abstract Factory (item 1)](/blog/programming/design/gof-design-patterns/item01-abstract-factory)** — Abstract Factory가 prototype을 등록·복제하는 형태로 구현 가능
- **[Composite (item 8)](/blog/programming/design/gof-design-patterns/item08-composite)** — Prototype은 종종 Composite 트리 전체를 복제
- **[Decorator (item 9)](/blog/programming/design/gof-design-patterns/item09-decorator)** — Decorator도 prototype과 함께 사용 가능
- **[Memento (item 18)](/blog/programming/design/gof-design-patterns/item18-memento)** — 둘 다 객체 상태 보존이지만, Prototype은 **새 인스턴스 생성**, Memento는 **기존 인스턴스 복원**
