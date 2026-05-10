---
title: "GoF 23: Visitor"
date: 2026-02-04T12:00:00
description: "객체 구조와 그 위 연산을 분리 — double dispatch로 새 연산 추가."
tags: [Design Pattern, GoF, C++, C, Behavioral]
series: "GoF Design Patterns"
seriesOrder: 23
draft: true
---

## 의도

객체 구조에 대해 수행할 **연산을 객체로** 캡슐화합니다. 구조의 클래스를 변경하지 않고도 새 연산을 정의할 수 있도록.

## 동기

AST 같은 안정된 구조에 다양한 연산(평가, 출력, 최적화, 타입 검사)을 추가하고 싶을 때. 각 연산을 노드 클래스에 메서드로 추가하면:
- 노드 클래스가 비대 (모든 연산이 한 클래스에)
- 새 연산 추가 시 모든 노드 수정 (OCP 위반, 노드 측면)

Visitor는 연산을 노드 밖으로 빼냄 — 새 연산 추가 시 새 Visitor만 작성.

## 적용 가능성

- 객체 구조가 다양한 클래스로 이루어져 있고, 각 클래스에 따라 다른 연산을 수행해야 할 때
- 객체 구조 자체는 거의 변하지 않는데, 새 연산은 자주 추가될 때
- 관련 없는 연산들이 한 클래스에 섞이는 것을 막고 싶을 때

**부적합**: 노드 클래스가 자주 추가되면 모든 Visitor 수정 필요 — OCP 위반 (노드 측면).

## 구조

```
   Element (interface)
   + accept(Visitor)*
        △
        │
   ┌────┴────┐
ElemA       ElemB
+ accept(v) + accept(v)
   │           │
   └─►v.visit(this)


   Visitor (interface)
   + visit(ElemA)*
   + visit(ElemB)*
        △
        │
   ┌────┴────┐
VisitorX   VisitorY
```

## 참여자

- **Visitor** — Element별 visit 메서드 인터페이스
- **ConcreteVisitor** — 특정 연산 구현
- **Element** — `accept(Visitor)` 인터페이스
- **ConcreteElement** — `accept(v)`에서 `v.visit(*this)` 호출 (double dispatch)
- **ObjectStructure** — Element들의 컨테이너, visitor 적용

## C++ 구현 — AST + Visitor

```cpp
class NumberExpr;
class AddExpr;
class MulExpr;

// Visitor 인터페이스
class Visitor {
public:
    virtual ~Visitor() = default;
    virtual void visit(const NumberExpr&) = 0;
    virtual void visit(const AddExpr&)    = 0;
    virtual void visit(const MulExpr&)    = 0;
};

// 노드
class Expr {
public:
    virtual ~Expr() = default;
    virtual void accept(Visitor& v) const = 0;
};

class NumberExpr : public Expr {
public:
    int value;
    explicit NumberExpr(int v) : value(v) {}
    void accept(Visitor& v) const override { v.visit(*this); }    // double dispatch
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

// 새 연산 — Evaluator
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

// 다른 새 연산 — Printer
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

// 사용
auto e = std::make_unique<AddExpr>(
    std::make_unique<NumberExpr>(1),
    std::make_unique<MulExpr>(
        std::make_unique<NumberExpr>(2),
        std::make_unique<NumberExpr>(3)));

Evaluator ev; e->accept(ev); std::cout << ev.getResult();   // 7
Printer   pr; e->accept(pr); std::cout << pr.get();          // (1 + (2 * 3))
```

새 연산 추가 시 노드 클래스 손 안 댐. 새 Visitor만 작성.

## Double Dispatch

`accept(visitor)`가 노드 타입을 결정 → `visitor.visit(*this)`가 visitor와 노드 두 타입 모두에 따라 디스패치. C++의 가상 함수는 단일 디스패치만이라 두 단계로 나눠 처리.

## C++17 변형 — `std::variant` + `std::visit`

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
        if constexpr (std::is_same_v<T, Number>) return v.value;
        else if constexpr (std::is_same_v<T, std::unique_ptr<Add>>) {
            return evaluate(v->lhs) + evaluate(v->rhs);
        } else {
            return evaluate(v->lhs) * evaluate(v->rhs);
        }
    }, e);
}
```

가상 함수 없이 동등 효과. **closed type set**(타입이 더 추가 안 됨)에 적합. 컴파일 타임에 모든 case 강제 검사.

## C 구현

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

C에선 visitor 없이 tagged union + switch가 자연스러운 동등물.

## 결과 (트레이드오프)

**장점**
- 새 연산 추가 쉬움 (OCP 만족, **연산** 측면)
- 관련 동작을 한 visitor에 모음 (vs 노드 클래스에 흩어진 메서드)
- visitor가 상태 보유 가능 (누적, 추적)

**단점**
- 새 노드 추가가 어려움 (모든 visitor 수정 — OCP 위반, **노드** 측면)
- double dispatch boilerplate (accept 메서드)
- 노드 캡슐화 약화 (visitor가 노드 내부에 접근해야 함)

## "Visitor가 적합한지" 판단

- **노드는 안정, 연산은 빈번 추가** → Visitor 적합
- **연산은 적고 노드가 자주 추가** → 가상 함수가 나음

## 변형

- **`std::variant` + `std::visit`** — closed set, 컴파일 타임 검사
- **CRTP visitor** — boilerplate 감소
- **acyclic visitor** — Visitor와 Element 의존성 끊기 (dynamic_cast 사용, 비용)

## 알려진 사용 사례

- 컴파일러의 AST 처리 (LLVM IR, Clang AST)
- XML/JSON 파서 (DOM walker)
- 그래픽 렌더링 (scene graph traversal)
- IDE의 코드 분석·리팩토링

## 관련 패턴

- **[Composite (item 8)](/blog/programming/gof-design-patterns/item08-composite)** — Visitor는 Composite 트리에 새 연산 추가에 가장 자주 사용
- **[Interpreter (item 15)](/blog/programming/gof-design-patterns/item15-interpreter)** — Interpreter의 AST에 Visitor로 평가·출력·최적화 분리
- **[Iterator (item 16)](/blog/programming/gof-design-patterns/item16-iterator)** — Visitor가 Iterator로 노드 순회 (또는 element 자체가 자식 순회)
