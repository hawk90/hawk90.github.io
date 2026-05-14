---
title: "GoF 7: Bridge"
date: 2026-02-01T07:00:00
description: "추상과 구현을 분리 — N×M 클래스 폭발을 N+M으로."
tags: [Design Pattern, GoF, C++, C, Structural]
series: "GoF Design Patterns"
seriesOrder: 7
draft: true
---

## 한 줄 요약

> **"추상과 구현을 별개의 계층으로"** — 도형 N개 × 렌더러 M개 → N×M 클래스 대신 N + M.

## 어떤 문제를 푸는가

도형(Circle, Rectangle, Triangle) × 렌더러(Vector, Raster) 조합을 단일 상속으로 표현하면:

```
CircleVector, CircleRaster, RectangleVector, RectangleRaster, ...
```

도형 N개 × 백엔드 M개 = **N×M 클래스**. 추가될 때마다 폭발.

Bridge로 분리하면 **N + M**.

## 한눈에 보는 구조

<img src="/images/blog/gof/diagrams/item07-bridge.svg" alt="Bridge 패턴 클래스 다이어그램" style="max-width:100%; background:white; padding:8px; border-radius:6px;" />

- **Abstraction**: 클라이언트가 보는 인터페이스
- **Implementor**: 실제 동작의 인터페이스 (Abstraction과 일치할 필요 X)

두 계층이 **독립적으로** 확장.

## 언제 쓰면 좋은가

- 추상과 구현 사이의 **영구적 결합**을 피하고 싶을 때 (런타임 교체)
- 추상과 구현 양쪽이 **서브클래싱으로 확장**되어야 할 때
- 추상의 구현 변경이 클라이언트 재컴파일을 강제하면 안 될 때
- 다중 차원의 변형이 있어 **클래스 폭발**이 우려될 때

## 언제 쓰면 안 되나

> ⚠️ **단순 변형 1차원**이라면 Bridge는 과도. 그냥 상속 또는 Strategy.

> ⚠️ **사후 도입이 어려움** — 기존 단일 상속 트리를 Bridge로 바꾸는 건 큰 리팩토링.

## C++ 구현

### 1. Implementor 계층

```cpp
class Renderer {
public:
    virtual ~Renderer() = default;
    virtual void renderCircle(double x, double y, double r) = 0;
    virtual void renderRect(double x, double y, double w, double h) = 0;
};

class VectorRenderer : public Renderer {
public:
    void renderCircle(double x, double y, double r) override { /* SVG/PostScript */ }
    void renderRect(double x, double y, double w, double h) override { /* ... */ }
};

class RasterRenderer : public Renderer {
public:
    void renderCircle(double x, double y, double r) override { /* 픽셀 */ }
    void renderRect(double x, double y, double w, double h) override { /* ... */ }
};
```

### 2. Abstraction 계층 — Renderer 참조 보유

```cpp
class Shape {
protected:
    Renderer& renderer;
public:
    explicit Shape(Renderer& r) : renderer(r) {}
    virtual ~Shape() = default;
    virtual void draw() const = 0;
    virtual void resize(double factor) = 0;
};

class Circle : public Shape {
    double x, y, radius;
public:
    Circle(Renderer& r, double x, double y, double radius)
        : Shape(r), x(x), y(y), radius(radius) {}

    void draw() const override { renderer.renderCircle(x, y, radius); }
    void resize(double f) override { radius *= f; }
};

class Rectangle : public Shape { /* ... */ };
```

### 3. 사용 — 같은 도형, 다른 렌더러

```cpp
VectorRenderer vr;
RasterRenderer rr;

Circle c1(vr, 0, 0, 10);
Circle c2(rr, 0, 0, 10);
c1.draw();   // SVG로 렌더
c2.draw();   // 픽셀로 렌더
```

도형 추가 → 렌더러 손 안 댐. 렌더러 추가 → 도형 손 안 댐. **독립 진화**.

## C 구현

```c
typedef struct Renderer {
    void (*render_circle)(struct Renderer*, double, double, double);
    void (*render_rect)(struct Renderer*, double, double, double, double);
} Renderer;

typedef struct {
    Renderer* renderer;
    double x, y, radius;
} Circle;

void circle_draw(Circle* c) {
    c->renderer->render_circle(c->renderer, c->x, c->y, c->radius);
}
```

## Pimpl과의 관계

C++의 **Pimpl Idiom**(EMC++ item 22)이 Bridge의 단순한 1:1 형태입니다 — `Impl` 포인터로 구현을 헤더에서 숨김.

| | Pimpl | Bridge |
| --- | --- | --- |
| 의도 | 헤더 의존성 ↓, 컴파일 시간 ↓ | N×M 폭발 회피 |
| 관계 | 1:1 (Foo ↔ FooImpl) | N:M (여러 Abstraction × 여러 Implementor) |

## 트레이드오프 — 한눈에

| 차원 | Bridge |
| --- | --- |
| 추상·구현 독립 진화 | ✅ 양쪽 모두 서브클래싱 |
| 클래스 폭발 회피 | ✅ N+M |
| 런타임 구현 교체 | ✅ |
| 추가 간접 호출 | ⚠️ 작은 성능 비용 |
| 사전 설계 부담 | ❌ 사후 도입 어려움 |

## 실제 사례

- **Java AWT**의 peer (UI 추상 + OS-native 구현)
- **Qt**의 Q_DECLARE_PRIVATE / d-pointer 패턴
- **그래픽 라이브러리**의 abstract device + concrete backend (Cairo, Skia)
- **DB driver** — JDBC interface + 각 DB driver

## 관련 패턴

- **[Adapter (item 6)](/blog/programming/design/gof-design-patterns/item06-adapter)** — Adapter는 사후 호환, Bridge는 사전 분리
- **[Strategy (item 21)](/blog/programming/design/gof-design-patterns/item21-strategy)** — 구조 거의 동일. Bridge는 클래스 계층 분리, Strategy는 알고리즘 교체에 집중
- **[Abstract Factory (item 1)](/blog/programming/design/gof-design-patterns/item01-abstract-factory)** — Bridge의 ConcreteImplementor 군을 Abstract Factory로 생성
