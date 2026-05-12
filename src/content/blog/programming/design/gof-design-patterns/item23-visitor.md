---
title: "GoF 23: Visitor"
date: 2026-02-04T12:00:00
description: "객체 구조와 그 위 연산을 분리 — double dispatch로 새 연산 추가."
tags: [Design Pattern, GoF, C++, C, Behavioral]
series: "GoF Design Patterns"
seriesOrder: 23
---

## 한 줄 요약

> **"노드 클래스는 안 건드리고 새 연산을 추가"** — AST 같은 안정된 구조에 평가/출력/최적화/타입검사를 따로따로.

## 어떤 문제를 푸는가

AST(Abstract Syntax Tree) 같은 안정된 구조에 다양한 연산을 추가하고 싶다면:

순진하게 노드 클래스에 메서드를 직접 추가하면:
- 노드 클래스가 **비대해짐** (모든 연산이 한 곳에)
- 새 연산 추가 시 모든 노드 수정 (**OCP 위반, 노드 측면**)

→ **연산을 노드 밖으로** 빼냄. 새 연산은 새 Visitor 작성만으로.

```cpp
auto e = ...;  // AST
Evaluator ev; e->accept(ev);   // 평가
Printer   pr; e->accept(pr);   // 출력
Optimizer op; e->accept(op);   // 최적화
// 새 연산 추가 시 노드 손 안 댐
```

## 한눈에 보는 구조

<img src="/images/blog/gof/diagrams/item23-visitor.svg" alt="Visitor 패턴 클래스 다이어그램" style="max-width:100%; background:white; padding:8px; border-radius:6px;" />

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

## 모던 C++ — `std::variant` + `std::visit`

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

## 트레이드오프 — 한눈에

| 차원 | Visitor |
| --- | --- |
| 새 연산 추가 (OCP) | ✅ 새 Visitor만 |
| 관련 동작을 한 곳에 모음 | ✅ |
| Visitor가 상태 보유 | ✅ 누적·추적 가능 |
| 새 노드 추가 (OCP) | ❌ 모든 Visitor 수정 |
| double dispatch boilerplate | ⚠️ accept 메서드 |
| 노드 캡슐화 | ⚠️ Visitor가 내부 접근 |

## 실제 사례

- 컴파일러의 **AST 처리** (LLVM IR, Clang AST)
- **XML/JSON 파서** (DOM walker)
- **그래픽 렌더링** (scene graph traversal)
- **IDE의 코드 분석·리팩토링**

## 관련 패턴

- **[Composite (item 8)](/blog/programming/design/gof-design-patterns/item08-composite)** — Visitor는 Composite 트리에 새 연산 추가에 가장 자주 사용
- **[Interpreter (item 15)](/blog/programming/design/gof-design-patterns/item15-interpreter)** — Interpreter의 AST에 Visitor로 평가·출력·최적화 분리
- **[Iterator (item 16)](/blog/programming/design/gof-design-patterns/item16-iterator)** — Visitor가 Iterator로 노드 순회
