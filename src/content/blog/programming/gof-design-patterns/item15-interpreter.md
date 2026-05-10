---
title: "GoF 15: Interpreter"
date: 2026-02-03T12:00:00
description: "단순한 언어의 문법을 클래스 계층으로 표현 — DSL과 표현식 평가."
tags: [Design Pattern, GoF, C++, C, Behavioral]
series: "GoF Design Patterns"
seriesOrder: 15
draft: true
---

## 의도

언어를 정의하고 그 언어로 작성된 문장을 해석하는 인터프리터를 만듭니다. **각 문법 규칙을 클래스로** 매핑.

## 동기

- 단순한 DSL (도메인 특화 언어)
- 표현식 평가 (수식, boolean, 정규식의 일부)
- 설정 파일 / 쿼리 언어

복잡한 문법은 진짜 파서(yacc/bison, ANTLR, Boost.Spirit, 직접 작성) 권장. Interpreter는 단순한 문법에만.

## 적용 가능성

- 언어의 문법이 단순하고 안정적
- 효율보다는 단순함이 중요
- 문법 트리를 명시적으로 표현하고 싶을 때

## 구조

```
   Client ──► AbstractExpression
                 + interpret(Context)*
                       △
                       │
                ┌──────┴──────┐
       TerminalExpression  NonterminalExpression
                                  ◇──► AbstractExpression[]
```

## 참여자

- **AbstractExpression** — 모든 노드의 인터페이스
- **TerminalExpression** — 리프 노드 (변수, 리터럴)
- **NonterminalExpression** — 자식을 가진 노드 (연산자)
- **Context** — 인터프리터 외부 정보 (변수 값 등)
- **Client** — 표현식 트리(AST) 구성, interpret 호출

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

// (1 + 2) * 3 의 AST
auto e = std::make_unique<Multiply>(
    std::make_unique<Add>(
        std::make_unique<Number>(1),
        std::make_unique<Number>(2)),
    std::make_unique<Number>(3)
);
std::cout << e->evaluate();    // 9
```

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

// (interpret 시그니처에 Context를 추가해야 함)
```

## C 구현

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

## 결과 (트레이드오프)

**장점**
- 문법이 명확하게 코드에 매핑
- 새 규칙(연산자, 함수) 추가 쉬움
- 같은 AST 위에 여러 연산 가능 (Visitor와 결합)

**단점**
- 복잡한 문법은 클래스 폭발 — 파서 라이브러리가 나음
- 효율 ↓ (트리 순회)
- 유지보수 비용

## 변형

- **Visitor와 결합** — 평가, 출력, 최적화, 타입 검사를 별도 visitor로
- **`std::variant` + `std::visit`** — closed type set 인 경우 가상 함수 없이
- **Pratt parser / recursive descent** — 파싱 단계는 별도

## 알려진 사용 사례

- 정규식 엔진 (단순한 부분)
- SQL parser의 일부
- 게임 엔진의 행동 트리
- 빌드 시스템의 조건식 평가

## 관련 패턴

- **[Composite (item 8)](/blog/programming/gof-design-patterns/item08-composite)** — AST는 Composite 구조
- **[Visitor (item 23)](/blog/programming/gof-design-patterns/item23-visitor)** — AST 위의 다양한 연산을 Visitor로 분리
- **[Iterator (item 16)](/blog/programming/gof-design-patterns/item16-iterator)** — AST 순회에 Iterator 활용
- **[Flyweight (item 11)](/blog/programming/gof-design-patterns/item11-flyweight)** — 같은 변수·리터럴이 여러 번 등장하면 Flyweight으로 공유
