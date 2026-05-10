---
title: "GoF 7: Bridge"
date: 2026-02-02T11:00:00
description: "추상과 구현을 분리해 둘이 독립적으로 변할 수 있도록 — 다중 차원 변형 처리."
tags: [Design Pattern, GoF, C++, C, Structural]
series: "GoF Design Patterns"
seriesOrder: 7
draft: true
---

## 의도

추상(abstraction)과 구현(implementation)을 **분리**해 둘이 독립적으로 변할 수 있도록 합니다.

## 동기 — 클래스 폭발

도형 N종 × 렌더링 백엔드 M종을 단일 상속으로 표현하면 N×M 클래스. Bridge로 분리하면 N + M.

```
단일 상속:  CircleVector, CircleRaster, RectVector, RectRaster, ...

Bridge:    Shape  ───►  Renderer
              △            △
         Circle, Rect    Vector, Raster
```

## 적용 가능성

- 추상과 구현 사이의 영구적 결합을 피하고 싶을 때 (런타임 교체 가능)
- 추상과 구현 양쪽이 서브클래싱으로 확장되어야 할 때
- 추상의 구현 변경이 클라이언트 재컴파일을 강제하면 안 될 때
- 다중 차원의 변형이 있어 클래스 폭발이 우려될 때

## 구조

```
   Abstraction        Implementor
   ─ impl ◇──────►   + opImpl()*
   + operation()           △
        △                  │
        │            ┌─────┴─────┐
   ┌────┴────┐   ConcreteImplA  ConcreteImplB
RefinedA  RefinedB
```

## 참여자

- **Abstraction** — 추상 인터페이스, Implementor 참조 보유
- **RefinedAbstraction** — Abstraction 확장
- **Implementor** — 구현 클래스 인터페이스 (Abstraction과 일치할 필요 X)
- **ConcreteImplementor** — 실제 구현

## C++ 구현

```cpp
// 구현 (Implementor)
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

// 추상 (Abstraction)
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

// 사용
VectorRenderer vr;
RasterRenderer rr;

Circle c1(vr, 0, 0, 10);
Circle c2(rr, 0, 0, 10);    // 같은 도형, 다른 렌더러
c1.draw();
c2.draw();
```

추상(`Shape`)과 구현(`Renderer`)이 독립 — 도형 추가 시 렌더러 손 안 댐, 그 반대도 마찬가지.

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

## 결과 (트레이드오프)

**장점**
- 추상·구현 독립적 진화 (양쪽 다 서브클래싱 가능)
- 클래스 폭발 회피
- 런타임 구현 교체
- 클라이언트 재컴파일 회피 (구현 헤더 노출 X)

**단점**
- 추가 간접 호출 (성능)
- 사전 설계 부담 — 사후에 도입하기 어려움
- 단순한 경우엔 과도

## Pimpl과의 관계

C++의 **Pimpl Idiom**(EMC++ item 22)이 Bridge의 한 형태 — `Impl` 포인터로 구현 숨기고 헤더 의존성 줄임. 다만 Pimpl은 보통 1:1 대응, Bridge는 N:M 변형 처리.

## 변형

- **Pimpl** — Bridge의 1:1 단순화
- **Strategy 결합** — Bridge가 Strategy를 구현으로 들고 있는 형태도 있음

## 알려진 사용 사례

- Java AWT의 peer (UI 추상 + OS-native 구현)
- Qt의 Q_DECLARE_PRIVATE / d-pointer 패턴
- 그래픽 라이브러리의 abstract device + concrete backend (Cairo 등)

## 관련 패턴

- **[Adapter (item 6)](/blog/programming/gof-design-patterns/item06-adapter)** — Adapter는 사후 호환, Bridge는 사전 분리. 구조 비슷 의도 다름
- **[Strategy (item 21)](/blog/programming/gof-design-patterns/item21-strategy)** — 구조 거의 동일. Bridge는 클래스 계층 분리, Strategy는 알고리즘 교체에 집중
- **[Abstract Factory (item 1)](/blog/programming/gof-design-patterns/item01-abstract-factory)** — Bridge의 ConcreteImplementor 군을 Abstract Factory로 생성하기도 함
