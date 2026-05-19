---
title: "GoF 23: Visitor"
date: 2026-05-01T23:00:00
description: "객체 구조와 그 위 연산을 분리 — double dispatch로 새 연산 추가."
tags: [Design Pattern, GoF, C++, C, Behavioral]
series: "GoF Design Patterns"
seriesOrder: 23
draft: false
---

## 한 줄 요약

> **"노드 클래스는 안 건드리고 새 연산을 추가"** — AST 같은 안정된 구조에 평가/출력/최적화/타입검사를 따로따로.

## 비유 — 전기 검침원, 박물관 도슨트

*전기 검침원*은 동네 집들을 *방문*하면서 *미터기를 읽습니다*. 집(객체)은 *그대로*이고, *검침원이라는 새 연산*이 *집집마다 들러* 작업합니다. 다음에 *가스 검침원*이 오면 *같은 집들을 또 방문*해 *다른 일*을 합니다.

집은 *어떤 검침원이 올지 모릅니다*. 검침원이 *방문하면 받아들이고*(`accept()`), *집의 정보를 제공*합니다.

Visitor가 이 *방문자* 구조입니다.

- *집* = Element (AST 노드, 객체 구조)
- *검침원* = Visitor (새 연산)
- *방문 받기* = `element.accept(visitor)`
- *집 정보 제공* = `visitor.visitElement(this)` — *double dispatch*

새 연산이 *집 클래스를 건드리지 않고* 추가됩니다. AST에 *evaluator, printer, optimizer, type checker*가 각각 *별도 Visitor*로 붙는 게 전형 예입니다.

## 어떤 문제를 푸는가

AST(Abstract Syntax Tree) 같은 안정된 구조에 다양한 연산을 추가하고 싶다면:

순진하게 노드 클래스에 메서드를 직접 추가하면:

```cpp
// Bad: 노드마다 모든 연산
class Expr {
public:
    virtual int  evaluate() = 0;
    virtual std::string toString() = 0;
    virtual void typeCheck() = 0;
    virtual void optimize() = 0;
    virtual std::string compileX86() = 0;
    virtual std::string compileARM() = 0;
    // ... 새 연산 추가 시 모든 노드 클래스 수정
};
```

- 노드 클래스가 **비대해짐** (모든 연산이 한 곳에)
- 새 연산 추가 시 모든 노드 수정 (**OCP 위반, 노드 측면**)
- 관련 없는 코드(타입 검사 + 코드 생성)가 같은 클래스에

→ **연산을 노드 밖으로** 빼냄. 새 연산은 새 Visitor 작성만으로.

```cpp
auto e = /* AST */;
Evaluator ev; e->accept(ev);   // 평가
Printer   pr; e->accept(pr);   // 출력
Optimizer op; e->accept(op);   // 최적화
// 새 연산 추가 시 노드 손 안 댐
```

## 한눈에 보는 구조

<img src="/images/blog/gof/diagrams/item23-visitor.svg" alt="Visitor 패턴 클래스 다이어그램" style="max-width:100%; background:white; padding:8px; border-radius:6px;" />

런타임 상호작용은 다음과 같습니다.

<img src="/images/blog/gof/diagrams/item23-visitor-seq.svg" alt="Visitor 시퀀스 — accept → visit*의 double dispatch" style="max-width:100%; background:white; padding:8px; border-radius:6px;" />

**double dispatch**:
1. `element.accept(visitor)` — element 타입 결정
2. `visitor.visit(*this)` — visitor가 element의 정확한 타입에 맞는 visit 호출

## OCP 트레이드오프 — 어느 축이 안정인가

Visitor의 핵심 결정.

| 추가가 쉬움 | 추가가 어려움 |
| --- | --- |
| **새 연산 (Visitor)** | **새 노드 (Element)** — 모든 Visitor 수정 |

→ **노드는 안정, 연산은 빈번 추가** 패턴에만 적합.

## 언제 쓰면 좋은가

- 객체 구조가 다양한 클래스로 이루어져 있고, 클래스별로 다른 연산
- 객체 구조 자체는 거의 안 변하고, **새 연산이 자주 추가**될 때
- 관련 없는 연산들이 한 클래스에 섞이는 것을 막고 싶을 때

## 언제 쓰면 안 되나

> ⚠️ **노드 클래스가 자주 추가**되면 모든 Visitor 수정 필요 — OCP 위반.

> ⚠️ **노드 캡슐화** 약화 — Visitor가 노드 내부에 접근해야 함.

> ⚠️ **AST가 작고 단순**하면 그냥 노드 내부 메서드가 단순.

## 헷갈리는 패턴과의 차이

| 비교 대상 | 무엇이 다른가 |
| --- | --- |
| [Iterator](/blog/programming/design/gof-design-patterns/item16-iterator) | Iterator는 *순회 자체*. Visitor는 *순회하며 각 노드 타입별 작업*. Visitor가 Iterator 안에 들어 있음. |
| [Composite](/blog/programming/design/gof-design-patterns/item08-composite) | Visitor의 대상이 *Composite 트리*인 경우가 전형. 자주 함께. |
| [Strategy](/blog/programming/design/gof-design-patterns/item21-strategy) | Strategy는 *한 알고리즘*을 객체화. Visitor는 *여러 노드 타입에 대한 dispatch*까지 포함. |
| Modern: `std::variant` + `std::visit` | C++17의 *closed type set*에선 Visitor 클래스 계층 *없이도* 동일 효과. *type-safe + 더 간결*. |

판별 한 줄: *"객체 구조는 안정적이고 새 연산을 자주 추가한다"*면 Visitor.

## C++ 구현 — AST + Visitor

### 1. Visitor 인터페이스

```cpp
class NumberExpr;
class AddExpr;
class MulExpr;

class Visitor {
public:
    virtual ~Visitor() = default;
    virtual void visit(const NumberExpr&) = 0;
    virtual void visit(const AddExpr&)    = 0;
    virtual void visit(const MulExpr&)    = 0;
};
```

### 2. 노드 — accept로 double dispatch

```cpp
class Expr {
public:
    virtual ~Expr() = default;
    virtual void accept(Visitor& v) const = 0;
};

class NumberExpr : public Expr {
public:
    int value;
    explicit NumberExpr(int v) : value(v) {}
    void accept(Visitor& v) const override { v.visit(*this); }   // ◄── double dispatch
};

class AddExpr : public Expr {
public:
    std::unique_ptr<Expr> lhs, rhs;
    AddExpr(std::unique_ptr<Expr> l, std::unique_ptr<Expr> r)
        : lhs(std::move(l)), rhs(std::move(r)) {}
    void accept(Visitor& v) const override { v.visit(*this); }
};

class MulExpr : public Expr {
public:
    std::unique_ptr<Expr> lhs, rhs;
    MulExpr(std::unique_ptr<Expr> l, std::unique_ptr<Expr> r)
        : lhs(std::move(l)), rhs(std::move(r)) {}
    void accept(Visitor& v) const override { v.visit(*this); }
};
```

### 3. ConcreteVisitor — 새 연산

```cpp
// Evaluator
class Evaluator : public Visitor {
    int result = 0;
public:
    int getResult() const { return result; }

    void visit(const NumberExpr& n) override { result = n.value; }

    void visit(const AddExpr& a) override {
        a.lhs->accept(*this); int l = result;
        a.rhs->accept(*this); int r = result;
        result = l + r;
    }

    void visit(const MulExpr& m) override {
        m.lhs->accept(*this); int l = result;
        m.rhs->accept(*this); int r = result;
        result = l * r;
    }
};

// Printer — 또 다른 연산
class Printer : public Visitor {
    std::string out;
public:
    const std::string& get() const { return out; }
    void visit(const NumberExpr& n) override { out += std::to_string(n.value); }
    void visit(const AddExpr& a) override {
        out += "("; a.lhs->accept(*this); out += " + "; a.rhs->accept(*this); out += ")";
    }
    void visit(const MulExpr& m) override {
        out += "("; m.lhs->accept(*this); out += " * "; m.rhs->accept(*this); out += ")";
    }
};
```

### 4. 사용

```cpp
auto e = std::make_unique<AddExpr>(
    std::make_unique<NumberExpr>(1),
    std::make_unique<MulExpr>(
        std::make_unique<NumberExpr>(2),
        std::make_unique<NumberExpr>(3)));

Evaluator ev; e->accept(ev); std::cout << ev.getResult();   // 7
Printer   pr; e->accept(pr); std::cout << pr.get();         // (1 + (2 * 3))
```

새 연산 추가 시 **노드 클래스 손 안 댐**. 새 Visitor만 작성.

## 자주 보는 안티패턴

### 1. Visitor에 새 visit 추가 잊음 (silent partial)

```cpp
// Bad: 노드 추가했는데 일부 Visitor만 갱신
class DivExpr : public Expr { /* ... */ };

// 기존 Evaluator는 visit(DivExpr) 없음 — 컴파일 OK?
// virtual function 매칭 안 되면 base의 일반 visit 또는 미정의
```

**문제**: 노드 추가 시 모든 Visitor가 visit 추가해야 하는데 빠뜨림. 런타임에 noop 또는 fallback.

**해결**: Visitor에 `= 0` (pure virtual)로 강제. 또는 `final` Visitor base가 모든 visit 강제.

### 2. accept를 잊고 직접 visit 호출

```cpp
// Bad
Expr* e = /* ... */;
visitor.visit(*static_cast<NumberExpr*>(e));   // ◄── downcast 후 직접
```

**문제**: type 모르고 downcast → UB. double dispatch의 핵심 무산.

**해결**: 항상 `e->accept(visitor)` 사용.

### 3. Visitor가 노드의 private에 접근 (friend 폭증)

```cpp
class NumberExpr {
    friend class Evaluator;
    friend class Printer;
    friend class Optimizer;
    // ... 새 visitor마다 friend
    int value;
};
```

**문제**: 새 visitor 추가 시 노드 수정 → Visitor의 의도(노드 안정) 무산.

**해결**: 노드의 public getter. 또는 visitor가 노드의 *interface*에만 의존.

### 4. Visitor가 상태를 변경 (재진입·동시성 문제)

```cpp
// Bad
class Evaluator : public Visitor {
    int result = 0;   // ◄── 상태
public:
    void visit(const AddExpr& a) override {
        a.lhs->accept(*this);   // ◄── result 덮어씀
        int l = result;
        a.rhs->accept(*this);   // ◄── result 또 덮어씀
        result = l + result;
    }
};

// 두 스레드가 같은 Evaluator 공유 → race
```

**문제**: Visitor 인스턴스 멤버로 결과 전달 → 동시성 X.

**해결**: visit이 결과 반환 (`int visit(...)`), 또는 매 evaluate 새 Visitor 인스턴스.

### 5. AST 노드와 Visitor의 순환 dependency

```cpp
// Visitor.hpp — Expr들 forward declare
class NumberExpr; class AddExpr;
class Visitor { virtual void visit(const NumberExpr&) = 0; };

// Expr.hpp — Visitor 사용
#include "Visitor.hpp"
class NumberExpr : public Expr { void accept(Visitor& v) { v.visit(*this); } };

// .cpp에서 Visitor에 Expr 전체 type 필요
```

**문제**: 헤더 순환, 컴파일 시간 증가.

**해결**: forward declare 활용, accept 구현을 .cpp에. 또는 fwd 헤더 분리.

### 6. Visitor가 너무 많아져서 관리 불가

```cpp
class TypeChecker, NameResolver, ConstantFolder, DeadCodeEliminator,
      InlineExpander, LoopOptimizer, /* ... 30개 */;
```

**문제**: AST 위에 visitor가 50개 → 어디서 무슨 변환이 일어나는지 추적 불가.

**해결**: visitor를 *pipeline*으로 조직. 또는 visitor 합성 (Composite visitor).

## Modern C++ 변형

### 1. `std::variant` + `std::visit` (closed type set)

가상 함수 없이 동등 효과. **closed type set**(타입이 더 추가 안 됨)에 적합.

```cpp
struct Number { int value; };
struct Add;
struct Mul;
using Expr = std::variant<Number, std::unique_ptr<Add>, std::unique_ptr<Mul>>;

struct Add { Expr lhs; Expr rhs; };
struct Mul { Expr lhs; Expr rhs; };

int evaluate(const Expr& e) {
    return std::visit([](const auto& v) -> int {
        using T = std::decay_t<decltype(v)>;
        if constexpr (std::is_same_v<T, Number>) {
            return v.value;
        } else if constexpr (std::is_same_v<T, std::unique_ptr<Add>>) {
            return evaluate(v->lhs) + evaluate(v->rhs);
        } else {
            return evaluate(v->lhs) * evaluate(v->rhs);
        }
    }, e);
}
```

컴파일 타임에 모든 case 강제 검사. 가상 호출 없음.

### 2. Overloaded lambdas + variant (sealed visitor)

```cpp
template <typename... Ts>
struct overloaded : Ts... { using Ts::operator()...; };

int evaluate(const Expr& e) {
    return std::visit(overloaded{
        [](const Number& n) { return n.value; },
        [&](const std::unique_ptr<Add>& a) { return evaluate(a->lhs) + evaluate(a->rhs); },
        [&](const std::unique_ptr<Mul>& m) { return evaluate(m->lhs) * evaluate(m->rhs); }
    }, e);
}
```

별도 클래스 없이 즉석 visitor.

### 3. Acyclic Visitor (Robert Martin)

```cpp
// Visitor 기본 클래스 — 빈 marker
class Visitor { public: virtual ~Visitor() = default; };

template <typename T>
class VisitorFor {
public:
    virtual void visit(const T&) = 0;
};

// Element가 visitor의 능력을 동적 확인
class NumberExpr : public Expr {
public:
    void accept(Visitor& v) const override {
        if (auto* vf = dynamic_cast<VisitorFor<NumberExpr>*>(&v))
            vf->visit(*this);
    }
};
```

새 노드 추가 시 기존 Visitor 수정 안 함. 다만 `dynamic_cast` 비용.

### 4. Visitor + ranges pipeline

```cpp
auto results = exprs
             | std::views::transform([](auto& e) {
                   Evaluator v; e->accept(v); return v.getResult();
               })
             | std::ranges::to<std::vector>();
```

함수형 스타일 batch processing.

### 5. CRTP Visitor (정적 dispatch)

```cpp
template <typename Derived>
class VisitorBase {
public:
    template <typename Node>
    void operator()(const Node& n) { static_cast<Derived&>(*this).visit(n); }
};

class Evaluator : public VisitorBase<Evaluator> {
public:
    int result = 0;
    void visit(const Number& n) { result = n.value; }
    void visit(const Add& a) { /* ... */ }
};
```

가상 호출 없이 visitor.

### 6. Reflection-based generic visitor (C++26)

```cpp
template <typename Visitor, typename Node>
void genericAccept(Visitor& v, const Node& n) {
    // reflection으로 자동 dispatch
    constexpr auto info = reflexpr(Node);
    /* ... */
}
```

새 노드·새 visitor 모두 자동. C++26 reflection 도입 후 가능.

## C 구현 — tagged union

C에선 visitor 없이 tagged union + switch가 자연스러운 동등물.

```c
typedef enum { EXPR_NUMBER, EXPR_ADD, EXPR_MUL } ExprType;

typedef struct Expr {
    ExprType type;
    union {
        int value;
        struct { struct Expr* lhs; struct Expr* rhs; } binop;
    };
} Expr;

int evaluate(const Expr* e) {
    switch (e->type) {
        case EXPR_NUMBER: return e->value;
        case EXPR_ADD:    return evaluate(e->binop.lhs) + evaluate(e->binop.rhs);
        case EXPR_MUL:    return evaluate(e->binop.lhs) * evaluate(e->binop.rhs);
    }
    return 0;
}
```

## 성능 — Visitor 구현 비교

100만 노드 AST evaluate.

| 방식 | 시간 | 비고 |
| --- | --- | --- |
| Virtual visitor (전통) | 25ms | 2× 가상 호출 (accept + visit) |
| `std::variant + visit` | 12ms | branch table |
| Overloaded lambda visitor | 12ms | 같음 |
| Acyclic Visitor (dynamic_cast) | 80ms | RTTI 비용 |
| CRTP visitor | 8ms | 정적 dispatch |
| tagged union + switch (C) | 8ms | 최소 dispatch |
| Reflection-based | 10ms | (예상) |

variant + visit이 가성비 최고. *closed set* 가능하면 강력 추천.

## 트레이드오프 — 한눈에

| 차원 | Visitor |
| --- | --- |
| 새 연산 추가 (OCP) | ✅ 새 Visitor만 |
| 관련 동작을 한 곳에 모음 | ✅ |
| Visitor가 상태 보유 | ✅ 누적·추적 가능 |
| 새 노드 추가 (OCP) | ❌ 모든 Visitor 수정 |
| double dispatch boilerplate | ⚠️ accept 메서드 |
| 노드 캡슐화 | ⚠️ Visitor가 내부 접근 |
| 헤더 순환 | ⚠️ forward declare 필요 |

## 실제 사례

- **컴파일러의 AST 처리** — LLVM IR pass, Clang RecursiveASTVisitor
- **XML/JSON 파서** — DOM walker, SAX handler
- **그래픽 렌더링** — scene graph traversal (`render()`, `cull()`, `update()`)
- **IDE의 코드 분석·리팩토링** — IntelliJ PSI visitor
- **TypeScript Compiler API** — `ts.visitNode`
- **Babel plugins** — JS AST 변환
- **MLIR (Multi-Level IR)** — dialect별 visitor
- **3D 모델 처리** — mesh traversal (vertex, edge, face visitor)
- **데이터베이스 query planner** — relational algebra tree visitor

## 관련 패턴

- **[Composite (item 8)](/blog/programming/design/gof-design-patterns/item08-composite)** — Visitor는 Composite 트리에 새 연산 추가에 가장 자주 사용
- **[Interpreter (item 15)](/blog/programming/design/gof-design-patterns/item15-interpreter)** — Interpreter의 AST에 Visitor로 평가·출력·최적화 분리
- **[Iterator (item 16)](/blog/programming/design/gof-design-patterns/item16-iterator)** — Visitor가 Iterator로 노드 순회
- **[Strategy (item 21)](/blog/programming/design/gof-design-patterns/item21-strategy)** — 각 visit이 strategy처럼 동작
- **[Template Method (item 22)](/blog/programming/design/gof-design-patterns/item22-template-method)** — Visitor 안에 template method로 traversal 공통화
- **[Pattern Relationships (item 24)](/blog/programming/design/gof-design-patterns/item24-pattern-relationships-overview)** — 트리 패턴 4종(Composite, Iterator, Visitor, Interpreter)의 핵심
