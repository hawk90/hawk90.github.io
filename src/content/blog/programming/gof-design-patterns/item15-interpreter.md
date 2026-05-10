---
title: "GoF 15: Interpreter"
date: 2026-02-03T12:00:00
description: "단순한 언어의 문법을 클래스 계층으로 표현 — DSL과 표현식 평가."
tags: [Design Pattern, GoF, C++, C, Behavioral]
series: "GoF Design Patterns"
seriesOrder: 15
draft: true
---

> **초안** — 정리 진행 중

## 의도

언어의 문법을 표현하고 그 언어로 작성된 문장을 해석하는 인터프리터를 정의 — **각 문법 규칙을 클래스로**.

## 언제 쓰나

- 단순한 DSL (도메인 특화 언어)
- 표현식 평가 (수식, boolean, 정규식 일부)
- 설정 파일 / 쿼리 언어

복잡한 문법은 진짜 파서 (yacc/bison, ANTLR, 직접 작성) 권장.

## C++ 구현 — 산술식

```cpp
class Expr {
public:
    virtual ~Expr() = default;
    virtual int evaluate() const = 0;
};

class Number : public Expr {
    int value;
public:
    explicit Number(int v) : value(v) {}
    int evaluate() const override { return value; }
};

class Add : public Expr {
    std::unique_ptr<Expr> lhs, rhs;
public:
    Add(std::unique_ptr<Expr> l, std::unique_ptr<Expr> r)
        : lhs(std::move(l)), rhs(std::move(r)) {}
    int evaluate() const override { return lhs->evaluate() + rhs->evaluate(); }
};

class Multiply : public Expr {
    std::unique_ptr<Expr> lhs, rhs;
public:
    Multiply(std::unique_ptr<Expr> l, std::unique_ptr<Expr> r)
        : lhs(std::move(l)), rhs(std::move(r)) {}
    int evaluate() const override { return lhs->evaluate() * rhs->evaluate(); }
};

// (1 + 2) * 3
auto e = std::make_unique<Multiply>(
    std::make_unique<Add>(
        std::make_unique<Number>(1),
        std::make_unique<Number>(2)),
    std::make_unique<Number>(3)
);
std::cout << e->evaluate();    // 9
```

문법 규칙(Number, Add, Multiply) 각각이 클래스 — AST 그 자체.

## Context

변수 등 외부 상태가 필요하면 Context 객체 전달.

```cpp
class Context { /* 변수 테이블 등 */ };
class Variable : public Expr {
    std::string name;
public:
    int evaluate(const Context& ctx) const { return ctx.lookup(name); }
};
```

(`evaluate`에 Context 인자 추가 필요)

## C 구현

```c
typedef struct Expr {
    int (*evaluate)(struct Expr*);
} Expr;

typedef struct {
    Expr base;
    int value;
} Number;

typedef struct {
    Expr  base;
    Expr* lhs;
    Expr* rhs;
} Add;

int add_eval(Expr* self) {
    Add* a = (Add*)self;
    return a->lhs->evaluate(a->lhs) + a->rhs->evaluate(a->rhs);
}
```

## 트레이드오프

- **장점**: 문법이 명확하게 코드에 매핑, 새 규칙 추가 쉬움
- **단점**: 복잡한 문법은 클래스 폭발 — 진짜 파서가 나음
