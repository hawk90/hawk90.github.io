---
title: "GoF 7: Bridge"
date: 2026-02-02T11:00:00
description: "추상과 구현을 분리해 둘이 독립적으로 변할 수 있도록."
tags: [Design Pattern, GoF, C++, C, Structural]
series: "GoF Design Patterns"
seriesOrder: 7
draft: true
---

> **초안** — 정리 진행 중

## 의도

추상(abstraction)과 구현(implementation)을 분리해 **둘이 독립적으로** 변할 수 있도록 함. 다중 차원의 변형을 처리할 때 클래스 폭발을 방지.

## 동기 — 클래스 폭발

도형 × 렌더링 백엔드 조합을 단일 상속으로 표현하면:
`CircleVector`, `CircleRaster`, `RectangleVector`, `RectangleRaster`, ...

도형 N개 × 백엔드 M개 → N×M 클래스. Bridge로 분리하면 N+M개.

## C++ 구현

```cpp
// 구현 (Implementor)
class Renderer {
public:
    virtual ~Renderer() = default;
    virtual void renderCircle(double r) = 0;
    virtual void renderRect(double w, double h) = 0;
};

class VectorRenderer : public Renderer { /* 벡터 렌더링 */ };
class RasterRenderer : public Renderer { /* 래스터 렌더링 */ };

// 추상 (Abstraction)
class Shape {
protected:
    Renderer& renderer;
public:
    explicit Shape(Renderer& r) : renderer(r) {}
    virtual ~Shape() = default;
    virtual void draw() const = 0;
};

class Circle : public Shape {
    double radius;
public:
    Circle(Renderer& r, double radius) : Shape(r), radius(radius) {}
    void draw() const override { renderer.renderCircle(radius); }
};

// 사용
VectorRenderer vr;
RasterRenderer rr;
Circle c1(vr, 10);
Circle c2(rr, 10);    // 같은 도형, 다른 렌더러
```

추상(`Shape`)과 구현(`Renderer`)이 독립 — 도형 추가 시 렌더러 손 안 댐, 그 반대도 마찬가지.

## Adapter와의 차이

- **Adapter**: 이미 존재하는 호환 안 되는 인터페이스를 사후 연결
- **Bridge**: 처음부터 두 차원을 분리해 설계

## C 구현

```c
typedef struct Renderer {
    void (*render_circle)(struct Renderer*, double r);
    void (*render_rect)(struct Renderer*, double w, double h);
} Renderer;

typedef struct {
    Renderer* renderer;
    double radius;
} Circle;

void circle_draw(Circle* c) {
    c->renderer->render_circle(c->renderer, c->radius);
}
```

## 트레이드오프

- **장점**: 추상·구현 독립적 진화, 클래스 폭발 회피, 런타임 구현 교체
- **단점**: 추가 간접 호출, 구조 복잡
