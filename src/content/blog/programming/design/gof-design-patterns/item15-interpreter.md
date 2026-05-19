---
title: "GoF 15: Interpreter"
date: 2026-05-01T15:00:00
description: "단순한 언어의 문법을 클래스 계층으로 — 단순 DSL과 표현식 평가."
tags: [Design Pattern, GoF, C++, C, Behavioral]
series: "GoF Design Patterns"
seriesOrder: 15
draft: false
---

## 한 줄 요약

> **"문법 규칙 하나당 클래스 하나"** — AST 자체가 패턴.

## 비유 — 계산기의 수식 트리

전자계산기에 `1 + 2 * 3`을 입력했다고 해봅시다. 계산기는 *문자열을 이해해야* 합니다. 사람이 *수식 트리*를 그리면 다음 같이 됩니다.

```text
     +
    / \
   1   *
      / \
     2   3
```

각 *노드*가 *자기 의미*를 압니다. `+` 노드는 *왼쪽 + 오른쪽을 더한 값* 반환, `*` 노드는 *왼쪽 × 오른쪽* 반환. 숫자 노드는 *자기 값* 반환.

이 트리를 *루트에서 evaluate*하면 자동으로 *재귀로* 답이 나옵니다.

Interpreter가 정확히 이 구조입니다.

- *수식 트리* = AST (Abstract Syntax Tree)
- *노드 종류* = 문법 규칙 하나당 Expression 클래스 하나
- *evaluate()* = 각 노드가 자기 의미 해석
- *Context* = 변수 값 같은 환경

작은 DSL, 규칙 엔진, 조건식 평가에 자연스럽습니다.

## 어떤 문제를 푸는가

작은 DSL이나 표현식 언어를 만들고 싶을 때:

- 수식 계산기
- 조건식 평가 (`age > 18 && country == "KR"`)
- 단순 쿼리 / 필터

가장 단순한 방법 — `eval(std::string)`을 만들고 문자열을 매번 파싱? 매 호출마다 파싱 비용이 들고 컴파일 타임 검증도 안 됩니다.

각 문법 규칙(Number, Add, Multiply)을 **클래스로** 매핑하고, 트리(AST)를 만들어 재귀 평가하면:

```cpp
// (1 + 2) * 3
auto e = Mul(Add(Num(1), Num(2)), Num(3));
e.evaluate();   // 9
```

한 번 만든 AST를 재평가할 수 있고, 타입 안전. 트리 위에 새 연산(출력, 최적화, 컴파일)을 Visitor로 추가도 자연스러움.

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

> ⚠️ **사용자 입력 문자열을 평가**해야 한다면 보안(샌드박싱)이 더 큰 문제. Lua/Wren 같은 임베디드 언어가 안전.

## 헷갈리는 패턴과의 차이

| 비교 대상 | 무엇이 다른가 |
| --- | --- |
| [Composite](/blog/programming/design/gof-design-patterns/item08-composite) | Interpreter는 *AST = Composite*. Interpreter는 *Composite의 도메인 특화 응용*. |
| [Visitor](/blog/programming/design/gof-design-patterns/item23-visitor) | Visitor는 *AST 위에서 새 연산 추가*. Interpreter는 *AST 노드 자체가 evaluate*. Visitor와 결합해 evaluator를 분리하기도. |
| Parser generator (yacc, ANTLR) | Parser generator는 *문법 정의 → 자동 생성*. Interpreter는 *수동 작성*. 큰 언어는 parser generator, 작은 DSL은 Interpreter. |

판별 한 줄: *"작은 언어를 표현하고 자주 평가해야 한다"*면 Interpreter. 큰 언어는 *전용 parser*가 더 적합.

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

## 자주 보는 안티패턴

### 1. 복잡한 문법을 Interpreter로 (클래스 폭발)

```cpp
// Bad: 50개의 노드 클래스
class IfStmt, ForLoop, WhileLoop, FuncCall, Lambda,
      StructLiteral, ArrayLiteral, /* ... */;
```

**문제**: 노드 수가 30개 넘어가면 유지보수 불가. 새 연산 추가 시 모든 클래스 건드림.

**해결**: ANTLR, Boost.Spirit, lex/yacc 같은 파서 제너레이터. 또는 `std::variant` + visitor (아래 변형).

### 2. evaluate 안에 부수효과 (재평가 불가능)

```cpp
class Print : public Expr {
    int evaluate() const override {
        std::cout << "hi\n";
        return 0;
    }
};
```

**문제**: AST를 두 번 평가하면 출력이 두 번. 캐싱·최적화 불가.

**해결**: 부수효과는 별도 인터프리터 단계(execute)로 분리, evaluate는 순수.

### 3. 노드끼리 raw pointer 공유 (소유권 불명)

```cpp
class Add : public Expr {
    Expr* lhs;   // ◄── 누가 소유?
    Expr* rhs;
};
```

**문제**: 삭제 시점 불명, double free 또는 leak.

**해결**: `std::unique_ptr` 단일 소유, 공유가 필요하면 `std::shared_ptr` (DAG).

### 4. 토큰 자체를 AST 노드로 (parse + eval 혼합)

```cpp
// Bad: 평가 중에 문자열 파싱
int Add::evaluate() const {
    return std::stoi(lhsToken) + std::stoi(rhsToken);
}
```

**문제**: 매 평가마다 파싱 비용, 오류 처리 어려움.

**해결**: parse 단계에서 토큰을 의미 있는 노드로 변환. evaluate는 이미 파싱된 트리에서만 작동.

### 5. AST 위 모든 연산을 evaluate에 끼워넣기

```cpp
class Expr {
    virtual int  evaluate() const = 0;
    virtual std::string toString() const = 0;
    virtual void optimize() = 0;
    virtual std::string compile() const = 0;
    virtual void typeCheck() = 0;
    // ... 노드마다 모든 메서드 구현
};
```

**문제**: 새 연산이 추가될 때마다 모든 노드 클래스 수정 (OCP 위배).

**해결**: Visitor 패턴 — 노드는 `accept(visitor)`만, 새 연산은 새 Visitor.

## Modern C++ 변형

### 1. `std::variant` + visitor — sum type 인터프리터

```cpp
struct Number   { int value; };
struct Variable { std::string name; };
struct Add;
struct Mul;

using Expr = std::variant<Number, Variable,
                           std::shared_ptr<Add>,
                           std::shared_ptr<Mul>>;

struct Add { Expr lhs, rhs; };
struct Mul { Expr lhs, rhs; };

int eval(const Expr& e, const Context& ctx) {
    return std::visit([&](const auto& node) -> int {
        using T = std::decay_t<decltype(node)>;
        if constexpr (std::is_same_v<T, Number>)
            return node.value;
        else if constexpr (std::is_same_v<T, Variable>)
            return ctx.lookup(node.name);
        else  // Add / Mul (shared_ptr)
            if constexpr (std::is_same_v<T, std::shared_ptr<Add>>)
                return eval(node->lhs, ctx) + eval(node->rhs, ctx);
            else
                return eval(node->lhs, ctx) * eval(node->rhs, ctx);
    }, e);
}
```

가상 호출 없이 `if constexpr`로 dispatch — 더 빠르고 closed set이라 새 노드 추가 시 컴파일러가 빠진 case 알려줌.

### 2. Expression Templates — 컴파일 타임 AST

```cpp
// 벡터 연산 라이브러리 스타일
template <typename L, typename R>
struct AddExpr {
    L lhs; R rhs;
    auto operator[](std::size_t i) const { return lhs[i] + rhs[i]; }
};

template <typename L, typename R>
AddExpr<L, R> operator+(const L& l, const R& r) { return {l, r}; }

// 사용
Vec a, b, c;
auto e = a + b + c;   // AST가 type에 인코딩됨
result[0] = e[0];     // inline 평가 — 중간 vec 없음
```

Eigen, Blaze 같은 선형대수 라이브러리의 핵심.

### 3. Constexpr Interpreter (컴파일 타임 평가)

```cpp
struct Add {
    constexpr int eval(int x, int y) const { return x + y; }
};
constexpr Add a;
static_assert(a.eval(2, 3) == 5);
```

DSL을 컴파일 타임에 평가 → 런타임 비용 0.

### 4. Concept 기반 — 평가 가능한 노드 일반화

```cpp
template <typename N, typename C>
concept Evaluable = requires(const N& n, const C& ctx) {
    { n.evaluate(ctx) } -> std::convertible_to<int>;
};

template <Evaluable<Context> N>
int run(const N& root, const Context& ctx) { return root.evaluate(ctx); }
```

가상 함수 없이 type erasure 회피.

### 5. Bytecode VM (Interpreter에서 한 단계 더)

AST 평가가 느려지면 bytecode로 컴파일.

```cpp
enum class Op { Push, Add, Mul, Load, Halt };
struct Instr { Op op; int arg; };

class VM {
    std::vector<int> stack;
public:
    int run(const std::vector<Instr>& code, const Context& ctx) {
        for (auto& i : code) {
            switch (i.op) {
                case Op::Push: stack.push_back(i.arg); break;
                case Op::Load: stack.push_back(ctx.byIdx(i.arg)); break;
                case Op::Add:  { int b=stack.back(); stack.pop_back();
                                 stack.back() += b; break; }
                case Op::Mul:  { int b=stack.back(); stack.pop_back();
                                 stack.back() *= b; break; }
                case Op::Halt: return stack.back();
            }
        }
        return stack.back();
    }
};
```

Lua, Python, JVM, V8 모두 이 방향으로 진화.

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

## 성능 — AST vs bytecode vs JIT

피보나치(35) — `fib(n) = fib(n-1) + fib(n-2)`.

| 방식 | 시간 | 비고 |
| --- | --- | --- |
| AST tree-walk | 8s | 가상 호출 + 캐시 미스 |
| `std::variant` + visit | 5s | 정적 dispatch |
| Bytecode VM | 1.5s | switch dispatch + 스택 |
| JIT (LuaJIT/PyPy) | 0.1s | 네이티브 코드 |
| 네이티브 C++ | 0.05s | 컴파일러 최적화 |

AST는 *학습용*·*단순 DSL*에는 좋지만 hot path에는 부적합. 성능 필요하면 bytecode부터.

## 트레이드오프 — 한눈에

| 차원 | Interpreter |
| --- | --- |
| 문법이 코드에 매핑 | ✅ 명확 |
| 새 규칙(연산자) 추가 | ✅ 새 클래스만 |
| 같은 AST 위 여러 연산 | ✅ Visitor와 결합 |
| 복잡한 문법 | ❌ 클래스 폭발 — 파서 라이브러리가 나음 |
| 효율 | ❌ 트리 순회 + 가상 호출 |
| AST 메모리 | ❌ 노드 + 포인터로 fragmented |

## 실제 사례

- **정규식 엔진**의 단순 부분 — `std::regex`, RE2의 작은 표현식
- **SQL parser**의 일부 — WHERE 조건 평가
- **게임 엔진**의 행동 트리 (Behavior Tree)
- **빌드 시스템**의 조건식 평가 — CMake `if()`, Bazel `select()`
- **간단한 템플릿 엔진** — Jinja, Mustache의 expression
- **Excel 수식 평가기**
- **Lua, Wren, MoonScript** — 임베디드 스크립트 언어
- **컴파일러의 AST** — Clang, GCC, Rustc 내부

## 관련 패턴

- **[Composite (item 8)](/blog/programming/design/gof-design-patterns/item08-composite)** — AST는 본질적으로 Composite 구조
- **[Visitor (item 23)](/blog/programming/design/gof-design-patterns/item23-visitor)** — AST 위의 다양한 연산을 Visitor로 분리 (평가, 출력, 최적화)
- **[Iterator (item 16)](/blog/programming/design/gof-design-patterns/item16-iterator)** — AST 순회에 Iterator 활용
- **[Flyweight (item 11)](/blog/programming/design/gof-design-patterns/item11-flyweight)** — 같은 변수·리터럴이 여러 번 등장하면 Flyweight으로 공유
- **[Pattern Relationships (item 24)](/blog/programming/design/gof-design-patterns/item24-pattern-relationships-overview)** — Composite·Visitor·Interpreter·Iterator의 트리 패턴 군집
