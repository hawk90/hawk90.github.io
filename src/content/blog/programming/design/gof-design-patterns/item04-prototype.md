---
title: "GoF 4: Prototype"
date: 2026-05-01T04:00:00
description: "기존 객체를 복제 — 비싼 생성을 한 번만 하고, 나머지는 clone."
tags: [Design Pattern, GoF, C++, C, Creational]
series: "GoF Design Patterns"
seriesOrder: 4
draft: true
---

## 한 줄 요약

> **"매번 새로 만들지 말고 복제해"** — 견본 객체 하나 만들어두고 `clone()`으로 찍어냄.

## 비유 — 도장과 인주

문서에 같은 도장을 *수십 번* 찍는다고 생각해봅시다. 매번 새 도장을 *조각*하면 시간이 엄청 듭니다. 대신 한 번 *마스터 도장*을 만들고, 인주에 묻혀 *찍기만* 하면 됩니다.

또는 게임에서 *몬스터 한 마리*를 만드는 데 *DB 조회 + 텍스처 로드 + AI 초기화*가 필요하다고 해봅시다. 같은 종류 몬스터 100마리를 화면에 띄우려고 매번 처음부터 하면 *프레임이 끊깁니다*. 대신 *한 마리(prototype)*를 만들어두고 *clone*으로 99마리를 더 찍어냅니다.

Prototype이 바로 이 *마스터 도장 → 찍기* 흐름입니다.

- *마스터 도장* = 미리 만들어둔 prototype 인스턴스
- *찍기* = `clone()` 호출
- *새 도장 조각* = 비싼 처음부터의 생성

새 종류가 *런타임에 추가*되어도 *클래스를 새로 만들 필요 없이* 마스터 인스턴스만 등록하면 됩니다.

## 어떤 문제를 푸는가

객체 생성이 **비쌉니다**:
- DB 조회로 초기화
- 네트워크 호출로 설정
- 복잡한 계산

같은 종류 객체가 여러 번 필요하다면 — 매번 처음부터 만들지 말고 **한 번 만든 견본을 복제**.

또는 객체 종류가 **런타임에 동적으로 추가**되는 경우 (플러그인, 게임 spawn) — 팩토리 클래스 폭발 회피.

```cpp
// Bad: 매번 비싼 초기화
Enemy spawnGoblin() {
    Enemy e;
    e.loadModel("goblin.fbx");        // 10MB disk read
    e.loadAnimations("goblin/*.anim"); // 50 파일
    e.loadAI("goblin.ai");
    e.position = {0, 0, 0};
    return e;
}
// 100마리 spawn → 100번 디스크 read
```

```cpp
// Good: prototype 한 번 + clone 99번
Enemy prototype = spawnGoblin();
for (int i = 0; i < 100; ++i) {
    auto goblin = prototype.clone();    // 메모리 복사만
    goblin->position = randomPos();
}
```

## 한눈에 보는 구조

<img src="/images/blog/gof/diagrams/item04-prototype.svg" alt="Prototype 패턴 클래스 다이어그램" style="max-width:100%; background:white; padding:8px; border-radius:6px;" />

견본 객체에게 "복사본 줘"라고만 요청하면 됨.

런타임 상호작용은 다음과 같습니다.

<img src="/images/blog/gof/diagrams/item04-prototype-seq.svg" alt="Prototype 시퀀스 — Registry → clone() → 복제 후 커스터마이즈" style="max-width:100%; background:white; padding:8px; border-radius:6px;" />

## 언제 쓰면 좋은가

- 인스턴스화할 클래스가 **런타임에 결정**될 때
- 제품 클래스 계층과 평행한 팩토리 계층을 만들기 싫을 때
- 객체 상태가 **한정된 조합**으로 미리 알려져 있을 때 (조합마다 prototype)
- 생성 비용이 큼

## 언제 쓰면 안 되나

> ⚠️ **순환 참조가 있는 객체** — 깊은 복사가 무한 루프 위험.

> ⚠️ **단순한 객체** — 그냥 새로 만들면 됨.

> ⚠️ **객체에 unique한 자원 핸들**(file descriptor, socket)이 있으면 복사 의미가 모호.

## 헷갈리는 패턴과의 차이

| 비교 대상 | 무엇이 다른가 |
| --- | --- |
| [Abstract Factory](/blog/programming/design/gof-design-patterns/item01-abstract-factory) | Abstract Factory는 *클래스 계층*으로 종류 표현 (정적). Prototype은 *인스턴스 등록*으로 종류 추가 (동적). |
| [Factory Method](/blog/programming/design/gof-design-patterns/item03-factory-method) | Factory Method는 *서브클래스 정의*가 필요. Prototype은 *클래스 추가 없이* 새 종류 등록 가능. |
| 단순 deep copy | `std::copy`나 deep copy 함수는 *외부에서* 복제. Prototype은 *객체 자신*이 `clone()`을 안다 — 다형성. |

판별 한 줄: *"런타임에 종류가 늘어나거나, 생성 비용이 너무 커서 한 번만 하고 싶다"*면 Prototype.

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

## 자주 보는 안티패턴

### 1. Slicing (clone 안 거치고 base로 복사)

```cpp
// Bad
Shape& proto = getCircle();
Shape copy = proto;   // ◄── slicing — Shape 부분만 복사
copy.draw();          // pure virtual 또는 Shape::draw
```

**문제**: 다형성 객체를 값으로 복사하면 derived 부분이 잘림.

**해결**: 반드시 `clone()` 호출. base의 copy ctor를 `protected`나 `delete`로 막아 강제.

```cpp
class Shape {
protected:
    Shape(const Shape&) = default;   // ◄── 외부 복사 금지
public:
    virtual std::unique_ptr<Shape> clone() const = 0;
};
```

### 2. 얕은 복사로 끝낸 raw pointer

```cpp
// Bad
class Node {
    Child* child;
public:
    Node(const Node& o) = default;   // ◄── child 포인터만 복사
};
// 두 Node가 같은 child를 가리킴 — double free 또는 race
```

**해결**: copy ctor에서 깊은 복사. 또는 `unique_ptr` + 명시적 clone.

### 3. 순환 참조 객체의 clone

```cpp
class A { B* b; };
class B { A* a; };
A* clone(A* src) {
    A* c = new A;
    c->b = clone(src->b);   // ◄── 무한 재귀
}
```

**문제**: 깊은 복사가 cycle을 만나면 stack overflow.

**해결**: 이미 복제한 객체를 map에 기록 (DFS visited 집합처럼). 또는 weak reference로 cycle 끊기.

### 4. Prototype이 mutable 외부 자원 공유

```cpp
// Bad
class Counter {
    static int* counter;   // 모든 instance 공유
public:
    std::unique_ptr<Counter> clone() { return std::make_unique<Counter>(*this); }
};
```

**문제**: clone이 진짜 독립 객체를 만든 게 아님. static 자원은 여전히 공유.

**해결**: prototype 본의에 따라 — *진짜* 독립이 필요하면 자원도 복제, *공유*가 의도면 명시.

### 5. clone()이 다른 객체를 만듦 (변종)

```cpp
// Bad
std::unique_ptr<Shape> Circle::clone() const {
    return std::make_unique<Rectangle>(/* ... */);   // ◄── 다른 종류
}
```

**문제**: prototype 계약 위반. 호출자는 "Circle을 받았다"고 가정.

**해결**: `clone()`은 *항상* 자기와 같은 동적 타입 반환. 테스트에서 `typeid` 확인.

### 6. clone()이 partial state로 끝남

```cpp
// Bad
class Connection {
    Socket socket;
    bool   ready = false;
public:
    std::unique_ptr<Connection> clone() const {
        auto c = std::make_unique<Connection>();
        // socket을 어떻게 복사? 새로 연결?
        return c;   // ◄── ready = false, 미사용 가능
    }
};
```

**문제**: 자원을 복사할 의미가 모호 — 그럼 어떻게 clone?

**해결**: 자원 핸들을 가진 객체는 Prototype 부적합. Factory + 재초기화 또는 Builder.

## Modern C++ 변형

### 1. CRTP로 보일러플레이트 제거

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
class Rectangle : public Cloneable<Rectangle, Shape> { /* clone 자동 */ };
```

### 2. Concepts — clone 능력 명시

```cpp
template <typename T>
concept Cloneable = requires(const T& t) {
    { t.clone() } -> std::convertible_to<std::unique_ptr<T>>;
};

template <Cloneable T>
auto multiplexClone(const T& src, int n) {
    std::vector<std::unique_ptr<T>> r;
    for (int i = 0; i < n; ++i) r.push_back(src.clone());
    return r;
}
```

### 3. Copy-on-write prototype

```cpp
class Document {
    std::shared_ptr<const std::vector<Node>> data;   // 공유
public:
    Document clone() const { return *this; }   // ◄── shared_ptr 복사 = 데이터 공유
    void edit(/* ... */) {
        // 수정 시점에만 분리
        auto copy = std::make_shared<std::vector<Node>>(*data);
        // ... 수정 ...
        data = std::move(copy);
    }
};
```

clone 100번이라도 메모리 1배 — 실제 분리는 수정 시점.

### 4. `std::variant` + visitor clone

```cpp
using Shape = std::variant<Circle, Rectangle, Triangle>;

Shape clone(const Shape& s) {
    return s;   // ◄── variant copy ctor가 자동으로 깊은 복사
}
```

가상 함수 없이 prototype. closed set 한정.

### 5. Reflection-based clone (Boost.Hana, magic_get)

```cpp
template <typename T>
T deepClone(const T& src) {
    T dst;
    boost::hana::for_each(boost::hana::accessors<T>(), [&](auto pair) {
        auto member = boost::hana::second(pair);
        deepCopy(member(dst), member(src));
    });
    return dst;
}
```

각 멤버 자동 복사. C++26 reflection이 들어오면 표준 라이브러리로 가능.

### 6. Auto-registering prototype registry

```cpp
template <typename T>
class AutoProto {
    inline static bool registered = [] {
        ShapeRegistry::instance().registerProto(T::name(), std::make_unique<T>());
        return true;
    }();
};

class Circle : public Shape, public AutoProto<Circle> { /* ... */ };
```

새 클래스 정의만으로 registry에 자동 등록.

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

## 성능 — Prototype vs Factory

`Enemy` 객체(50KB, 깊은 객체 그래프) 100마리 spawn.

| 방식 | 시간 | 비고 |
| --- | --- | --- |
| 매번 Factory (디스크 read) | 5000ms | 매번 I/O |
| Prototype + clone (깊은 복사) | 100ms | 메모리 복사만 |
| Prototype + COW shared_ptr | 5ms | 포인터 복사 |
| Prototype + variant copy | 100ms | 컴파일 타임 dispatch |

큰 객체 + 적은 mutation에서 prototype 압도적. clone의 *깊이*와 *순환*만 조심.

## 트레이드오프 — 한눈에

| 차원 | Prototype |
| --- | --- |
| 비용 큰 생성 회피 | ✅ 강력 |
| 런타임 새 종류 등록 | ✅ Registry로 |
| 팩토리 계층 단순화 | ✅ 제품 계층만 있으면 됨 |
| 깊은 복사 구현 | ⚠️ 까다로움 (자원·순환) |
| `clone()` 보일러플레이트 | ⚠️ 매 클래스마다 (CRTP로 완화) |
| Slicing 위험 | ⚠️ base copy ctor 막아야 |

## 실제 사례

- **게임 엔진의 객체 spawn** — Unreal의 Blueprint 인스턴스화, Unity의 Prefab.Instantiate
- **IDE의 코드 템플릿 / 스니펫**
- **JavaScript의 prototype-based OOP** — `Object.create(proto)`
- **Java `Cloneable`** 인터페이스
- **CAD/그래픽 도구의 stamp tool** — 도형 견본 복제
- **MS Office의 "복제" 기능** — 도형, 슬라이드, 행
- **Docker 이미지 → 컨테이너** — 이미지가 prototype, 컨테이너가 clone
- **Git의 commit fork** — commit이 prototype, 새 branch가 clone

## 관련 패턴

- **[Abstract Factory (item 1)](/blog/programming/design/gof-design-patterns/item01-abstract-factory)** — Abstract Factory가 prototype을 등록·복제하는 형태로 구현 가능
- **[Composite (item 8)](/blog/programming/design/gof-design-patterns/item08-composite)** — Prototype은 종종 Composite 트리 전체를 복제
- **[Decorator (item 9)](/blog/programming/design/gof-design-patterns/item09-decorator)** — Decorator도 prototype과 함께 사용 가능
- **[Memento (item 18)](/blog/programming/design/gof-design-patterns/item18-memento)** — 둘 다 객체 상태 보존이지만, Prototype은 **새 인스턴스 생성**, Memento는 **기존 인스턴스 복원**
- **[Pattern Relationships (item 24)](/blog/programming/design/gof-design-patterns/item24-pattern-relationships-overview)** — 5가지 생성 패턴 중 "복제로 회피" 전략
