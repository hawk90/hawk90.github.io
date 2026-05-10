---
title: "GoF 4: Prototype"
date: 2026-02-01T13:00:00
description: "기존 객체를 복제해 새 객체 생성 — clone()으로 깊은/얕은 복사 제어."
tags: [Design Pattern, GoF, C++, C, Creational]
series: "GoF Design Patterns"
seriesOrder: 4
draft: true
---

> **초안** — 정리 진행 중

## 의도

생성할 객체의 종류를 **프로토타입 인스턴스**로 명시 — 그것을 복제해 새 객체를 만든다. 객체 생성 비용이 크거나, 런타임에 어떤 클래스인지 결정될 때 유용.

## 언제 쓰나

- 객체 생성 비용이 큼 (DB 조회, 네트워크 등)
- 클래스 수가 많아 팩토리가 복잡해짐
- 런타임에 동적으로 추가되는 클래스

## C++ 구현

```cpp
class Shape {
public:
    virtual ~Shape() = default;
    virtual std::unique_ptr<Shape> clone() const = 0;   // prototype method
    virtual void draw() const = 0;
};

class Circle : public Shape {
    int radius;
public:
    Circle(int r) : radius(r) {}
    std::unique_ptr<Shape> clone() const override {
        return std::make_unique<Circle>(*this);    // copy-construct
    }
    void draw() const override { /* ... */ }
};

// 클라이언트
std::unique_ptr<Shape> protoCircle = std::make_unique<Circle>(10);
auto c1 = protoCircle->clone();
auto c2 = protoCircle->clone();
```

## Prototype 등록

```cpp
class ShapeRegistry {
    std::map<std::string, std::unique_ptr<Shape>> protos;
public:
    void registerProto(std::string name, std::unique_ptr<Shape> p) {
        protos[std::move(name)] = std::move(p);
    }

    std::unique_ptr<Shape> create(const std::string& name) {
        return protos.at(name)->clone();
    }
};
```

이름으로 prototype 조회 후 복제 — 런타임에 새 종류 등록 가능.

## 깊은 복사 vs 얕은 복사

```cpp
class Doc {
    std::vector<std::unique_ptr<Node>> nodes;
public:
    std::unique_ptr<Doc> clone() const {
        auto c = std::make_unique<Doc>();
        for (const auto& n : nodes)
            c->nodes.push_back(n->clone());    // 깊은 복사
        return c;
    }
};
```

`unique_ptr`나 다른 자원은 명시적 깊은 복사. `shared_ptr`라면 의도에 따라 얕은 공유도 OK.

## C 구현

```c
typedef struct Shape {
    struct Shape* (*clone)(const struct Shape*);
    void (*draw)(const struct Shape*);
} Shape;

typedef struct {
    Shape base;
    int radius;
} Circle;

Shape* circle_clone(const Shape* self) {
    Circle* src = (Circle*)self;
    Circle* c = malloc(sizeof(Circle));
    *c = *src;    // 비트 단위 복사 — 단순한 경우 OK
    return (Shape*)c;
}
```

## 트레이드오프

- **장점**: 동적 종류, 비용 큰 생성 회피, 팩토리 계층 단순화
- **단점**: 깊은 복사 구현 신중히, 순환 참조 처리 어려움
