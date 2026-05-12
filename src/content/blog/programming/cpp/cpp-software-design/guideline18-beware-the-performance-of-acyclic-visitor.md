---
title: "가이드라인 18: Acyclic Visitor의 성능을 경계하라"
date: 2026-05-14T14:00:00
description: "Acyclic Visitor — 새 타입 추가 OCP 만족하지만 dynamic_cast 남용으로 성능 폭망. variant가 답."
tags: [C++, Software Design, Visitor, Performance]
series: "C++ Software Design"
seriesOrder: 18
---

## 왜 이 가이드라인이 중요한가?

가이드라인 16 — GoF Visitor의 OCP 비대칭. 새 타입 추가 시 — 모든 visitor 수정.

**Acyclic Visitor** — 이 문제 해결 시도. visitor가 — 자기가 지원하는 타입만 명시. 새 타입 추가 → 옵션으로 처리.

```cpp
class IShapeVisitor { /* base — 빈 인터페이스 */ };

template<typename T>
class IVisitorFor {
    virtual void visit(T&) = 0;
};

// AreaVisitor — 일부 도형만 지원
class AreaVisitor 
    : public IShapeVisitor,
      public IVisitorFor<Circle>,
      public IVisitorFor<Square> {
    // Triangle 미지원
};
```

**그러나 — 큰 함정**: 구현에 **`dynamic_cast`** 남용. 성능 폭망.

```cpp
class Circle : public Shape {
    void accept(IShapeVisitor& v) override {
        if (auto* visitor = dynamic_cast<IVisitorFor<Circle>*>(&v)) {     // ⚠️
            visitor->visit(*this);
        }
    }
};
```

매 호출 — RTTI lookup. **vtable 호출보다 훨씬 비쌈**. 핫 패스에 — 치명적.

Iglberger의 결론: **Acyclic Visitor 대신 `std::variant`**. 같은 OCP 목표 + 0 비용.

## 핵심 내용

- **Acyclic Visitor** — GoF Visitor의 타입 추가 OCP 해결 시도
- 구현 — **dynamic_cast 남용** (RTTI 비용)
- **성능 — 매우 나쁨** — vtable 호출보다 10x 이상 느릴 수 있음
- `std::variant` + visit — 같은 OCP + 0 비용
- Acyclic Visitor 적용 — **이미 시스템이 dynamic_cast 받아들이는 경우만**

## Acyclic Visitor 구조

```cpp
// 1. 공통 visitor base (마커 인터페이스)
class IShapeVisitor {
public:
    virtual ~IShapeVisitor() = default;
};

// 2. 타입별 visitor interface
template<typename T>
class IVisitorFor {
public:
    virtual ~IVisitorFor() = default;
    virtual void visit(T&) = 0;
};

// 3. Element interface
class Shape {
public:
    virtual ~Shape() = default;
    virtual void accept(IShapeVisitor& v) = 0;
};

// 4. Concrete elements — dynamic_cast로 분기
class Circle : public Shape {
public:
    double radius;
    void accept(IShapeVisitor& v) override {
        if (auto* visitor = dynamic_cast<IVisitorFor<Circle>*>(&v)) {
            visitor->visit(*this);
        }
        // 지원 안 하는 visitor — silent skip
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

// 5. Concrete visitors — 지원하는 타입만
class AreaVisitor 
    : public IShapeVisitor,
      public IVisitorFor<Circle>,
      public IVisitorFor<Square> {
public:
    double total = 0;
    void visit(Circle& c) override { total += M_PI * c.radius * c.radius; }
    void visit(Square& s) override { total += s.side * s.side; }
    // Triangle은 미지원 — 그래도 컴파일 OK
};
```

## OCP 비교

### GoF Visitor — 새 도형 추가 시

```cpp
// 새 도형 Pentagon 추가
// → 모든 visitor 수정 강제

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
    void visit(Pentagon&) override;        // ⚠️ 강제 구현
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

// 기존 AreaVisitor — 수정 X
// AreaVisitor가 IVisitorFor<Pentagon> 상속 안 했으므로
// Pentagon::accept 안에서 silent skip
```

기존 visitor — **무수정**. 새 visitor가 Pentagon 처리 원하면 — `IVisitorFor<Pentagon>` 상속 추가.

이게 — Acyclic Visitor의 약속.

## dynamic_cast의 비용

`dynamic_cast` — 런타임 type identification (RTTI):
- 클래스 hierarchy 트리 탐색
- 컴파일러마다 다른 구현 (전형적으로 strcmp + traverse)
- 보통 **30-100 nanoseconds** (vs virtual call 1-3 ns)

```cpp
void accept(IShapeVisitor& v) override {
    if (auto* visitor = dynamic_cast<IVisitorFor<Circle>*>(&v)) {
        visitor->visit(*this);
    }
}
```

매 호출 — dynamic_cast. 핫 패스에서 — 백만 번 호출 시 30ms~100ms 추가.

대조 — `std::variant`:

```cpp
std::visit(visitor, shape);
// → tag check (1 cycle) + switch (보통 1-2 cycle)
// = ~ 1 nanosecond
```

variant — **30~100배 빠름**. 핫 패스에서 결정적.

## RTTI 비활성화 환경

```bash
g++ -fno-rtti     # RTTI 끔 (임베디드 흔함)
```

`-fno-rtti` → `dynamic_cast` 컴파일 에러. Acyclic Visitor — **사용 불가**.

임베디드 / 게임 엔진 — 보통 RTTI 끔. Acyclic Visitor 적용 — 그 환경에선 불가.

## variant 대안 — 같은 OCP

```cpp
using Shape = std::variant<Circle, Square, Triangle, Pentagon>;

// AreaVisitor — 일부만 처리하고 싶음
double area(const Shape& s) {
    return std::visit(std::overload{
        [](const Circle& c)   { return M_PI * c.radius * c.radius; },
        [](const Square& s)   { return s.side * s.side; },
        [](const Pentagon& p) { /* ... */ },
        [](const auto&)       { return 0.0; }      // ⚠️ 처리 안 하는 케이스 fallback
    }, s);
}
```

`auto` fallback — 처리 안 하는 케이스 명시. 새 타입 추가 — `auto`가 자동 처리(또는 명시적 추가).

이게 — variant의 OCP 유사 효과. dynamic_cast 없음.

## 함정 — Acyclic Visitor의 미묘함

```cpp
class AreaVisitor 
    : public IShapeVisitor,
      public IVisitorFor<Circle>,
      public IVisitorFor<Square> {
};

Triangle t;
AreaVisitor av;
t.accept(av);     // silent skip — Triangle 무처리
```

**Silent skip** — 디버깅 어려움. 사용자가 — 처리됐다고 기대.

해결 — assert로 명시:

```cpp
void accept(IShapeVisitor& v) override {
    if (auto* visitor = dynamic_cast<IVisitorFor<Triangle>*>(&v)) {
        visitor->visit(*this);
    } else {
        assert(false && "Visitor does not support Triangle");
    }
}
```

assert로 — 잘못된 visitor 감지. 그러나 — release 빌드에선 사라짐.

## 함정 — 코드 복잡도

Acyclic Visitor — 보일러플레이트 매우 많음:

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

다중 상속 — 디버깅 / 컴파일 시간 / 가독성 모두 부담.

## 함정 — Diamond inheritance

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

만약 — `IVisitorFor<T>`가 공통 base 가지면 — diamond inheritance. virtual 상속 필요.

```cpp
class IVisitorFor : virtual public IVisitorBase { /* ... */ };
```

virtual 상속 — 추가 비용 + 복잡도.

## 디자인 비교

| 측면 | GoF Visitor | Acyclic Visitor | `std::variant` |
| --- | --- | --- | --- |
| 새 연산 추가 | ✅ | ✅ | ✅ |
| 새 타입 추가 | ❌ 모든 visitor 수정 | ✅ silent skip | ⚠️ visit 수정 (generic 람다는 자동) |
| 성능 | vtable ×2 (~5 ns) | dynamic_cast (~30-100 ns) | tag dispatch (~1 ns) |
| 메모리 | heap (pointer) | heap (pointer) | value (stack OK) |
| RTTI 의존 | X | ✅ 필수 | X |
| 보일러플레이트 | 中 | 매우 多 | 적음 |
| Type safety | 컴파일 시간 | 런타임 (silent skip) | 컴파일 시간 |

## 정당한 Acyclic Visitor 사용

매우 드뭄. 가능한 경우:

### 1) 이미 dynamic_cast 사용하는 시스템

```cpp
// 라이브러리가 — RTTI 활용
class Widget {
    virtual ~Widget() = default;
};

// Widget 시스템에 dynamic_cast 흔하면 — Acyclic Visitor 추가 부담 적음
```

### 2) Open hierarchy + 외부 plugin

```cpp
// 플러그인이 — 새 Element 종류 추가
// 호스트가 — 모든 Element 알 수 없음 → Acyclic Visitor가 자연
```

매우 특수 케이스. Type Erasure (가이드라인 32-34)가 보통 더 좋음.

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
            const auto& c = static_cast<const Circle&>(s);     // safe — type 확인 후
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

— `static_cast`가 `dynamic_cast`보다 빠름. 단, type tag 일치 보장 책임.

이 패턴 — variant의 단순화 버전.

## 컴파일 타임 visitor — 정말 OCP 만족?

```cpp
// 어떤 도구도 — 두 차원 모두 OCP는 불가능 (Expression Problem)
```

진정한 해결책:
1. **양쪽 어디든 OCP 만족 못 함을 인정**
2. **외부 라이브러리 패턴** — Type Erasure (External Polymorphism)
3. 도메인에 맞게 — 둘 중 하나 선택

Acyclic Visitor가 — silent skip으로 "OCP" 흉내, 그러나 진짜 OCP는 아님.

## 모던 권장 — Iglberger의 결론

Iglberger 책 가이드라인 18의 결론:

> "Acyclic Visitor에 만족하지 마라. `std::variant` + `std::visit`을 우선하라."

이유:
- 성능 — 압도적
- 단순성 — 보일러플레이트 적음
- type safety — 컴파일러 검출
- 일관성 — closed set 명시

## 실무 가이드 — Acyclic Visitor 결정

```
이 시스템에 Acyclic Visitor가 적합한가?
├── RTTI 사용 가능? (-fno-rtti 아님) → 다음
├── open hierarchy 정말 필요?
│   ├── 그렇다 → Type Erasure 우선 검토 → 안 되면 Acyclic
│   └── 아니다 → std::variant 우선
├── 핫 패스가 아닌가? (dynamic_cast 비용 OK?)
│   ├── 핫 패스 → 절대 X
│   └── 일반 → Acyclic 가능
└── 보일러플레이트 받아들임? → 다중 상속 가득
```

대부분 — **NO**. variant 또는 GoF Visitor.

## 함정 — Acyclic Visitor를 GoF Visitor와 혼동

```cpp
// GoF Visitor — visitor에 모든 타입 명시
class ShapeVisitor {
    virtual void visit(Circle&) = 0;
    virtual void visit(Square&) = 0;
};

// Acyclic Visitor — visitor가 일부 타입만 명시
class ShapeVisitor { /* 빈 base */ };
template<typename T> class IVisitorFor { virtual void visit(T&) = 0; };
```

용어 — 다름. GoF는 — closed visitor 인터페이스. Acyclic은 — 다중 상속 분리.

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

- 보일러플레이트 X
- 성능 — 빠름
- type-safe
- 새 연산 — 자유

90% 케이스에 — 이게 답.

## 실무 가이드 — 체크리스트

Acyclic Visitor 적용 전:

- [ ] `std::variant` + visit으로 — 충분하지 않은가?
- [ ] open hierarchy가 — 정말 필요한가?
- [ ] RTTI 사용 가능?
- [ ] dynamic_cast 비용 — 핫 패스 아닌가?
- [ ] 다중 상속 보일러플레이트 — 감수 가능?
- [ ] Type Erasure가 — 더 적합하지 않은가?

## 정리

**Acyclic Visitor** — GoF Visitor의 OCP 한계 해결 시도.

방법: **`dynamic_cast` + 다중 상속**.

문제:
- ❌ **성능 — dynamic_cast 비용**
- ❌ **보일러플레이트**
- ❌ **RTTI 의존**
- ❌ **silent skip — 디버깅 어려움**

**모던 C++의 답: `std::variant` + `std::visit`** (가이드라인 17).

Acyclic Visitor — 매우 드문 특수 케이스만.

## 관련 항목

- [가이드라인 16: GoF Visitor](/blog/programming/cpp/cpp-software-design/guideline16-use-visitor-to-extend-operations) — 전통 패턴
- [가이드라인 17: std::variant Visitor](/blog/programming/cpp/cpp-software-design/guideline17-consider-stdvariant-for-implementing-visitor) — 모던 답
- [가이드라인 31: External Polymorphism](/blog/programming/cpp/cpp-software-design/guideline31-use-external-polymorphism-for-nonintrusive-runtime-polymorphism) — 진짜 open hierarchy
- [Effective C++ 항목 27: 캐스팅 최소화](/blog/programming/cpp/effective-cpp/item27-minimize-casting) — dynamic_cast 비용
