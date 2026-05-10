---
title: "GoF 4: Prototype"
date: 2026-02-01T13:00:00
description: "기존 객체를 복제해 새 객체 생성 — clone()으로 깊은/얕은 복사 제어."
tags: [Design Pattern, GoF, C++, C, Creational]
series: "GoF Design Patterns"
seriesOrder: 4
draft: true
---

## 의도

생성할 객체의 종류를 **프로토타입 인스턴스**로 명시하고, 그것을 **복제(clone)**해서 새 객체를 만듭니다.

## 동기

- 객체 생성 비용이 큼 (DB 조회, 네트워크 호출, 복잡한 계산)
- 객체 종류가 런타임에 동적으로 추가됨 (플러그인)
- 클래스 계층이 너무 커서 팩토리도 같이 폭발

생성 비용이 큰 객체를 한 번 만들어 prototype으로 두고, 필요할 때마다 빠르게 복제.

## 적용 가능성

- 인스턴스화할 클래스가 런타임에 결정될 때
- 제품 클래스 계층과 평행하게 팩토리 클래스 계층을 만들기 싫을 때
- 객체의 상태가 한정된 조합으로 미리 알려져 있을 때 (조합마다 prototype 하나)

## 구조

```
   Client                Prototype
   ──────             + clone()*
   prototype ◇─────►       △
   create()                │
                  ┌────────┴────────┐
            ConcreteProtoA    ConcreteProtoB
            + clone()         + clone()
```

## 참여자

- **Prototype** — `clone()` 인터페이스 선언
- **ConcretePrototype** — `clone()` 구현 (자기 자신 복제)
- **Client** — prototype의 `clone()`을 호출해 새 객체 획득

## C++ 구현

```cpp
class Shape {
public:
    virtual ~Shape() = default;
    virtual std::unique_ptr<Shape> clone() const = 0;
    virtual void draw() const = 0;
};

class Circle : public Shape {
    int x, y, radius;
public:
    Circle(int x, int y, int r) : x(x), y(y), radius(r) {}
    std::unique_ptr<Shape> clone() const override {
        return std::make_unique<Circle>(*this);    // copy constructor 활용
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

// 사용
auto proto = std::make_unique<Circle>(0, 0, 10);
auto c1 = proto->clone();
auto c2 = proto->clone();
```

`*this`로 copy 생성자가 호출되어 모든 멤버 자동 복사. 깊은 복사가 필요한 멤버는 copy 생성자에서 처리.

## Prototype Registry

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

// 사용
ShapeRegistry reg;
reg.registerProto("circle-small", std::make_unique<Circle>(0, 0, 5));
reg.registerProto("circle-large", std::make_unique<Circle>(0, 0, 50));

auto s = reg.create("circle-small");
```

이름으로 prototype 찾아 복제 — 런타임에 새 종류 등록 가능.

## 깊은 복사 vs 얕은 복사

```cpp
class Document {
    std::vector<std::unique_ptr<Node>> nodes;
public:
    std::unique_ptr<Document> clone() const {
        auto c = std::make_unique<Document>();
        for (const auto& n : nodes)
            c->nodes.push_back(n->clone());    // 깊은 복사 — 각 노드도 clone
        return c;
    }
};
```

`unique_ptr`나 raw 자원을 가진 멤버는 명시적 clone. `shared_ptr`는 의도에 따라 공유(얕은) 가능.

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
    *c = *src;     // 단순 복사 — 포인터 멤버가 있으면 깊은 복사 필요
    return (Shape*)c;
}

static void circle_draw(const Shape* self) { /* ... */ }

Circle* circle_new(int x, int y, int r) {
    Circle* c = malloc(sizeof(Circle));
    c->base.clone = circle_clone;
    c->base.draw  = circle_draw;
    c->x = x; c->y = y; c->radius = r;
    return c;
}
```

## 결과 (트레이드오프)

**장점**
- 런타임에 새 종류 추가 가능 (서브클래싱 안 해도)
- 비용 큰 생성 회피
- 팩토리 클래스 계층 단순화 (제품 계층만)

**단점**
- 깊은 복사 구현이 까다로움 (순환 참조, 자원 소유권)
- 모든 ConcretePrototype이 `clone()`을 구현해야 함
- C++의 raw `clone()`은 covariant return type 없으면 verbose

## 변형

- **CRTP로 보일러플레이트 제거**
  ```cpp
  template<typename Derived, typename Base>
  class Cloneable : public Base {
  public:
      std::unique_ptr<Base> clone() const override {
          return std::make_unique<Derived>(static_cast<const Derived&>(*this));
      }
  };

  class Circle : public Cloneable<Circle, Shape> { /* ... */ };
  ```

- **Polymorphic value types** — `std::polymorphic_value` 같은 라이브러리

## 알려진 사용 사례

- 게임 엔진의 객체 spawn (적, 아이템 prototype)
- IDE의 코드 템플릿 / 스니펫
- JavaScript의 prototype-based OOP
- Java의 `Cloneable` 인터페이스

## 관련 패턴

- **[Abstract Factory (item 1)](/blog/programming/gof-design-patterns/item01-abstract-factory)** — Abstract Factory가 prototype을 등록·복제하는 형태로 구현 가능
- **[Composite (item 8)](/blog/programming/gof-design-patterns/item08-composite)** — Prototype은 종종 Composite를 복제 (전체 트리)
- **[Decorator (item 9)](/blog/programming/gof-design-patterns/item09-decorator)** — Decorator도 prototype과 함께 사용 가능
- **[Memento (item 18)](/blog/programming/gof-design-patterns/item18-memento)** — 둘 다 객체 상태를 어떻게 보존·복원할지 다루지만, Prototype은 새 인스턴스 생성, Memento는 기존 인스턴스 복원
