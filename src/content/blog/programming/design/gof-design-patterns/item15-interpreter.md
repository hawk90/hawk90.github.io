---
title: "GoF 15: Interpreter"
date: 2026-02-01T15:00:00
description: "단순한 언어의 문법을 클래스 계층으로 — 단순 DSL과 표현식 평가."
tags: [Design Pattern, GoF, C++, C, Behavioral]
series: "GoF Design Patterns"
seriesOrder: 15
draft: true
---

## 한 줄 요약

> **"문법 규칙 하나당 클래스 하나"** — AST 자체가 패턴.

## 어떤 문제를 푸는가

작은 DSL이나 표현식 언어를 만들고 싶을 때:

- 수식 계산기
- 조건식 평가 (`age > 18 && country == "KR"`)
- 단순 쿼리 / 필터

각 문법 규칙(Number, Add, Multiply)을 **클래스로** 매핑하고, 트리(AST)를 만들어 재귀 평가.

```cpp
// (1 + 2) * 3
auto e = Mul(Add(Num(1), Num(2)), Num(3));
e.evaluate();   // 9
```

## 한눈에 보는 구조

<img src="/images/blog/gof/diagrams/item15-interpreter.svg" alt="Interpreter 패턴 클래스 다이어그램" style="max-width:100%; background:white; padding:8px; border-radius:6px;" />

- **Terminal**: 리프 (Number, Variable)
- **Nonterminal**: 자식 보유 (Add, Multiply)

## 언제 쓰면 좋은가

- 언어 문법이 **단순하고 안정적**
- 효율보다 **단순성**이 중요
- 문법 트리를 **명시적으로** 표현하고 싶을 때

## 언제 쓰면 안 되나

> ⚠️ **복잡한 문법** — 클래스 폭발. 진짜 파서(yacc/bison, ANTLR, Boost.Spirit) 사용.

> ⚠️ **성능 중요한 인터프리터** — 노드별 가상 호출이 비쌈. 바이트코드 + VM이 나음.

## C++ 구현 — 산술식

### 1. 노드 인터페이스

```cpp
class Expr {
public:
    virtual ~Expr() = default;
    virtual int evaluate() const = 0;
};
```

### 2. Terminal

```cpp
class Number : public Expr {
    int value;
public:
    explicit Number(int v) : value(v) {}
    int evaluate() const override { return value; }
};
```

### 3. Nonterminal

```cpp
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
```

### 4. AST 구성 + 평가

```cpp
auto e = std::make_unique<Multiply>(
    std::make_unique<Add>(
        std::make_unique<Number>(1),
        std::make_unique<Number>(2)),
    std::make_unique<Number>(3)
);
std::cout << e->evaluate();    // 9
```

각 노드의 `evaluate()`가 자식들에게 재귀 위임.

## Context 활용 — 변수 지원

```cpp
class Context {
    std::map<std::string, int> vars;
public:
    int  lookup(const std::string& name) const { return vars.at(name); }
    void set(const std::string& name, int v)   { vars[name] = v; }
};

class Variable : public Expr {
    std::string name;
public:
    explicit Variable(std::string n) : name(std::move(n)) {}
    int evaluate(const Context& ctx) const { return ctx.lookup(name); }
};
```

(`evaluate` 시그니처에 Context 인자 추가)

## C 구현 — tagged union

```c
typedef enum { EXPR_NUMBER, EXPR_ADD, EXPR_MUL } ExprType;

typedef struct Expr {
    ExprType type;
    int (*evaluate)(struct Expr*);
} Expr;

typedef struct {
    Expr base;
    int  value;
} Number;

typedef struct {
    Expr  base;
    Expr* lhs;
    Expr* rhs;
} BinOp;

int number_eval(Expr* self) {
    return ((Number*)self)->value;
}

int add_eval(Expr* self) {
    BinOp* b = (BinOp*)self;
    return b->lhs->evaluate(b->lhs) + b->rhs->evaluate(b->rhs);
}
```

## 트레이드오프 — 한눈에

| 차원 | Interpreter |
| --- | --- |
| 문법이 코드에 매핑 | ✅ 명확 |
| 새 규칙(연산자) 추가 | ✅ 새 클래스만 |
| 같은 AST 위 여러 연산 | ✅ Visitor와 결합 |
| 복잡한 문법 | ❌ 클래스 폭발 — 파서 라이브러리가 나음 |
| 효율 | ❌ 트리 순회 + 가상 호출 |

## 실제 사례

- **정규식 엔진**의 단순 부분
- **SQL parser**의 일부
- **게임 엔진**의 행동 트리
- **빌드 시스템**의 조건식 평가
- **간단한 템플릿 엔진**

## 관련 패턴

- **[Composite (item 8)](/blog/programming/design/gof-design-patterns/item08-composite)** — AST는 본질적으로 Composite 구조
- **[Visitor (item 23)](/blog/programming/design/gof-design-patterns/item23-visitor)** — AST 위의 다양한 연산을 Visitor로 분리 (평가, 출력, 최적화)
- **[Iterator (item 16)](/blog/programming/design/gof-design-patterns/item16-iterator)** — AST 순회에 Iterator 활용
- **[Flyweight (item 11)](/blog/programming/design/gof-design-patterns/item11-flyweight)** — 같은 변수·리터럴이 여러 번 등장하면 Flyweight으로 공유
