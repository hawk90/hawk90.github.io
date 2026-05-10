---
title: "GoF 23: Visitor"
date: 2026-02-04T12:00:00
description: "객체 구조와 그 위 연산을 분리 — double dispatch로 새 연산 추가."
tags: [Design Pattern, GoF, C++, C, Behavioral]
series: "GoF Design Patterns"
seriesOrder: 23
draft: true
---

> **초안** — 정리 진행 중

## 의도

객체 구조에 대해 수행할 **연산을 객체로** 캡슐화. 구조를 변경하지 않고 새 연산 추가.

## 동기

AST 같은 안정된 구조에 다양한 연산(평가, 출력, 최적화, 타입 검사)을 추가하고 싶을 때. 각 연산을 노드 클래스에 메서드로 추가하면 노드 클래스가 비대 + OCP 위반.

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
    void accept(Visitor& v) const override { v.visit(*this); }   // double dispatch
};

class AddExpr : public Expr {
public:
    std::unique_ptr<Expr> lhs, rhs;
    AddExpr(std::unique_ptr<Expr> l, std::unique_ptr<Expr> r)
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
    void visit(const MulExpr& m) override { /* ... */ }
};

// 다른 새 연산 — Printer
class Printer : public Visitor { /* ... */ };
```

새 연산 추가 시 노드 클래스 손 안 댐. 새 Visitor만 작성.

## Double Dispatch

`accept(visitor)`가 노드 타입을 결정 → `visitor.visit(*this)`가 노드의 정확한 타입으로 오버로드 해석. 두 단계 동적 디스패치.

## 트레이드오프

- **장점**: 새 연산 추가 쉬움 (OCP 만족, 연산 측면)
- **단점**: 새 노드 추가가 어려움 (모든 visitor 수정 필요 — OCP 위반, 노드 측면). std::variant + std::visit이 모던 대안.

## C++17 변형 — `std::variant` + `std::visit`

```cpp
struct Number { int value; };
struct Add    { /* 재귀 변형 */ };
using Expr = std::variant<Number, Add, Mul>;

int evaluate(const Expr& e) {
    return std::visit([](const auto& n) -> int {
        using T = std::decay_t<decltype(n)>;
        if constexpr (std::is_same_v<T, Number>) return n.value;
        // ...
    }, e);
}
```

가상 함수 없이 동등 효과. closed type set에 적합.

## C 구현

```c
typedef enum { EXPR_NUMBER, EXPR_ADD, EXPR_MUL } ExprType;

typedef struct Expr {
    ExprType type;
    /* 공용체 또는 struct 변형 */
} Expr;

int evaluate(const Expr* e) {
    switch (e->type) {
        case EXPR_NUMBER: /* ... */
        case EXPR_ADD:    /* ... */
        case EXPR_MUL:    /* ... */
    }
}
```

## 트레이드오프

- **장점**: 연산 추가 쉬움
- **단점**: 노드 추가 어려움, double dispatch 보일러플레이트
