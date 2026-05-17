---
title: "GoF 7: Bridge"
date: 2026-02-01T07:00:00
description: "추상과 구현을 분리 — N×M 클래스 폭발을 N+M으로."
tags: [Design Pattern, GoF, C++, C, Structural]
series: "GoF Design Patterns"
seriesOrder: 7
draft: false
---

## 한 줄 요약

> **"추상과 구현을 별개의 계층으로"** — 도형 N개 × 렌더러 M개 → N×M 클래스 대신 N + M.

## 어떤 문제를 푸는가

도형(Circle, Rectangle, Triangle) × 렌더러(Vector, Raster) 조합을 *단일 상속*으로 표현하면:

```
CircleVector, CircleRaster, RectangleVector, RectangleRaster, TriangleVector, TriangleRaster
```

도형 N개 × 백엔드 M개 = **N×M 클래스**. 한 차원 추가될 때마다 *제곱으로 폭발*.

Bridge로 분리하면 **N + M**.

## 핵심 통찰 — 두 차원 분리

GoF 책 표현: *"Decouple an abstraction from its implementation so that the two can vary independently."*

- **Abstraction** (예: Shape) — *클라이언트가 보는* 인터페이스
- **Implementor** (예: Renderer) — *실제 동작*의 인터페이스 (Abstraction과 *일치할 필요 없음*)

이 둘이 *각자의 상속 트리*를 가짐.

## 한눈에 보는 구조

<img src="/images/blog/gof/diagrams/item07-bridge.svg" alt="Bridge 패턴 클래스 다이어그램" style="max-width:100%; background:white; padding:8px; border-radius:6px;" />

- **Abstraction**: 클라이언트가 보는 인터페이스
- **Implementor**: 실제 동작의 인터페이스 (Abstraction과 일치할 필요 X)

두 계층이 **독립적으로** 확장.

## 언제 쓰면 좋은가

- 추상과 구현 사이의 **영구적 결합**을 피하고 싶을 때 (런타임 교체)
- 추상과 구현 양쪽이 **서브클래싱으로 확장**되어야 할 때
- 추상의 구현 변경이 *클라이언트 재컴파일을 강제하면 안 될 때*
- 다중 차원의 변형이 있어 **클래스 폭발**이 우려될 때
- **플랫폼 추상화** — OS, GPU API, DB 종류 등 *백엔드를 갈아끼울 수 있어야 할 때*

## 언제 쓰면 안 되나

> ⚠️ **단순 변형 1차원**이라면 Bridge는 과도. 그냥 *상속* 또는 [Strategy](/blog/programming/design/gof-design-patterns/item21-strategy).

> ⚠️ **사후 도입이 어려움** — 기존 단일 상속 트리를 Bridge로 바꾸는 건 *큰 리팩토링*.

> ⚠️ **추상과 구현이 같이 변하는 게 자연스러우면** — Bridge는 *둘이 독립적*이라는 가정. 항상 같이 변하면 단순 상속이 낫다.

> ⚠️ **구현이 1개로 고정**되어 있고 늘릴 계획 없으면** — Bridge의 *유연성 가치 0*.

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

Linux 커널의 device → driver 관계가 같은 구조.

## Pimpl과의 관계

C++의 **Pimpl Idiom** (EMC++ Item 22)이 Bridge의 *단순한 1:1 형태*입니다 — `Impl` 포인터로 구현을 헤더에서 숨김.

| | Pimpl | Bridge |
| --- | --- | --- |
| 의도 | *헤더 의존성 ↓, 컴파일 시간 ↓* | *N×M 폭발 회피* |
| 관계 | **1:1** (Foo ↔ FooImpl) | **N:M** (여러 Abstraction × 여러 Implementor) |
| 런타임 교체 | 일반적으로 X (생성 시 고정) | ✅ |
| 추상-구현 인터페이스 일치 | 보통 동일 | *다를 수 있음* (의도된 분리) |

→ Pimpl은 *Bridge의 축소판*. Bridge의 *full 형태*는 N:M 다양성.

## Abstraction의 *확장* — RefinedAbstraction

Abstraction 자체도 *서브클래싱*할 수 있음:

```cpp
class Shape { /* 기본 */ };

class TransparentShape : public Shape {     // refined
    double opacity;
public:
    TransparentShape(Renderer& r, double opacity) : Shape(r), opacity(opacity) {}
    void draw() const override {
        renderer.setOpacity(opacity);
        Shape::draw();
    }
};
```

→ Abstraction 트리 X Implementor 트리 = *직교 차원*.

## 흔한 함정 — Anti-patterns

### 1. **추상-구현 인터페이스를 *동일하게* 만듦**

```cpp
// 회피 — Bridge가 아니라 Strategy에 가까운 형태
class Renderer {
    virtual void draw() = 0;     // ❌ 추상과 같은 동사
};
class Shape {
    Renderer& r;
public:
    void draw() { r.draw(); }    // 단순 위임만
};
```

→ Bridge의 가치는 *서로 다른 수준의 인터페이스*. Shape는 "도형 개념", Renderer는 "픽셀 출력 방법" — *동일하지 않아야* 가치 있음.

### 2. **Abstraction이 Implementor를 *소유 (owning)*하나 *참조 (reference)*하나 혼란**

```cpp
// 회피
class Shape {
    std::unique_ptr<Renderer> r;     // ❌ shape마다 renderer 사본 — 의미 깨짐
};
```

→ Renderer는 보통 *공유*. `Shape` 100개가 같은 `VectorRenderer` 1개를 *참조*. owning은 *renderer가 shape별로 다른 경우*에만.

### 3. **구현 1개로 시작 → 영원히 1개**

YAGNI 위반의 반대 — 사용 안 할 *Bridge 인프라*만 보유.

→ Bridge는 *둘 이상의 구현이 예상될 때*만. 1개로 끝나면 *직접 사용*이 단순.

### 4. **추상에 *구현 detail이 노출***

```cpp
// 회피
class Shape {
public:
    void* getRendererInternalState();    // ❌ 추상이 구현 detail 노출
};
```

→ Abstraction이 *Implementor의 detail*에 의존하면 *교체 자유* 사라짐.

### 5. **Implementor 인터페이스가 너무 *세분화***

```cpp
class Renderer {
public:
    virtual void beginPath() = 0;
    virtual void moveTo(...) = 0;
    virtual void lineTo(...) = 0;
    virtual void closePath() = 0;
    virtual void fill() = 0;       // ❌ 너무 잘게 쪼갬 — 모든 백엔드가 같은 모델이라고 가정
};
```

→ Implementor 인터페이스는 *백엔드의 공통 능력* 수준에서 추상화. *너무 잘면* 일부 백엔드가 흉내내야 함 (비효율).

## Modern C++에서의 Bridge

### 1. *Smart pointer 소유*

```cpp
class Shape {
protected:
    std::shared_ptr<Renderer> renderer;    // 공유 소유 — multiple shapes
public:
    explicit Shape(std::shared_ptr<Renderer> r) : renderer(std::move(r)) {}
};
```

### 2. *Template Bridge* — 컴파일 타임

런타임 dispatch 불필요하면 template parameter로 implementor 고정.

```cpp
template <typename R>
class Shape {
protected:
    R& renderer;
public:
    explicit Shape(R& r) : renderer(r) {}
    virtual void draw() const = 0;
};

template <typename R>
class Circle : public Shape<R> {
    double x, y, radius;
public:
    Circle(R& r, double x, double y, double radius)
        : Shape<R>(r), x(x), y(y), radius(radius) {}
    void draw() const override { this->renderer.renderCircle(x, y, radius); }
};

VectorRenderer vr;
Circle<VectorRenderer> c{vr, 0, 0, 10};
c.draw();    // virtual 1개 (Shape::draw만). RendererCall은 직접.
```

→ Implementor virtual dispatch 제거. 컴파일러 inline 가능.

### 3. *Concept 기반*

C++20 concept으로 implementor 인터페이스 명시.

```cpp
template <typename T>
concept Renderable = requires(T& r, double x, double y, double radius) {
    r.renderCircle(x, y, radius);
};

template <Renderable R>
class Circle {
    R& renderer;
    // ...
};
```

→ duck typing이지만 *명시적 contract*.

## 성능

| 구현 | virtual call 수 / draw | 비고 |
| --- | --- | --- |
| 전통 OO Bridge | 2 (Shape::draw + Renderer::renderCircle) | 가장 유연 |
| Template Bridge | 1 (Shape::draw만) | Renderer는 inline |
| 완전 template (CRTP) | 0 | 모두 컴파일 타임 |
| `std::variant` + visit | 0~1 (dispatch jump table) | 다양한 구현 닫혀 있을 때 |

→ Hot path에선 *template form*. 일반 코드는 *virtual OK*.

## 트레이드오프 — 한눈에

| 차원 | Bridge |
| --- | --- |
| 추상·구현 독립 진화 | ✅ 양쪽 모두 서브클래싱 |
| 클래스 폭발 회피 | ✅ N+M |
| 런타임 구현 교체 | ✅ |
| 추가 간접 호출 | ⚠️ 작은 성능 비용 |
| 사전 설계 부담 | ❌ 사후 도입 어려움 |
| 메모리 (Shape마다 pointer) | ⚠️ 작은 비용 |
| 디버깅 가독성 | ⚠️ 두 계층 추적 |

## 실제 사례

### 표준 라이브러리

- **`std::iostream` 계층** — stream (추상) ↔ streambuf (구현). 같은 stream이 file/string/network에 위 lay.

### GUI

- **Java AWT의 peer** — UI 추상 + OS-native 구현
- **Qt의 d-pointer 패턴** — Q_DECLARE_PRIVATE
- **wxWidgets** — 위젯 추상 + native peer

### 그래픽

- **abstract device + concrete backend** — Cairo (Quartz/Win32/X11/SVG/...), Skia (CPU/GPU)
- **OpenGL → Vulkan/Metal/D3D 추상화**

### DB / 네트워크

- **JDBC interface + 각 DB driver** — 같은 코드가 MySQL/Postgres/Oracle 어디서나
- **ODBC**
- **`std::filesystem`** — OS-independent API + OS-specific backend

### 도메인

- *Logging facade* — SLF4J style: logger 추상 + 백엔드 (logback/log4j/...)
- *Payment gateway* — PaymentService (추상) + Stripe/Paypal/Toss (구현)
- *Cache 추상* — Cache (추상) + Redis/Memcached/InMemory (구현)

## 관련 패턴

- **[Adapter (item 6)](/blog/programming/design/gof-design-patterns/item06-adapter)** — Adapter는 *사후 호환*, Bridge는 *사전 분리*
- **[Strategy (item 21)](/blog/programming/design/gof-design-patterns/item21-strategy)** — 구조 거의 동일. Bridge는 *클래스 계층 분리*, Strategy는 *알고리즘 교체*에 집중
- **[Abstract Factory (item 1)](/blog/programming/design/gof-design-patterns/item01-abstract-factory)** — Bridge의 ConcreteImplementor 군을 Abstract Factory로 생성
- **[Pimpl Idiom (EMC++ Item 22)](/blog/programming/cpp/effective-modern-cpp/item22-when-using-pimpl)** — Bridge의 단순한 1:1 형태
- **[item 24 — 전체 관계도](/blog/programming/design/gof-design-patterns/item24-pattern-relationships-overview)** — Bridge는 *고립 영역* (Adapter, Proxy와 함께)
