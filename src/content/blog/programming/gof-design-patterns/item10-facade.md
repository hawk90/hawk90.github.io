---
title: "GoF 10: Facade"
date: 2026-02-02T14:00:00
description: "복잡한 서브시스템에 대한 단순한 통합 인터페이스 제공."
tags: [Design Pattern, GoF, C++, C, Structural]
series: "GoF Design Patterns"
seriesOrder: 10
draft: true
---

## 의도

서브시스템의 여러 인터페이스를 묶어 **하나의 통합 인터페이스**를 제공합니다. 서브시스템 사용을 더 쉽게 만들고, 서브시스템과 클라이언트의 결합도를 낮춥니다.

## 동기

복잡한 라이브러리(컴파일러 — lexer, parser, optimizer, codegen) 첫 사용자에게 단순한 진입점을 제공. 고급 사용자는 서브시스템에 직접 접근할 수도 있어야 함.

## 적용 가능성

- 복잡한 서브시스템에 단순한 인터페이스가 필요할 때
- 클라이언트와 추상 클래스의 구현 사이에 많은 의존성이 있을 때
- 서브시스템을 계층화하고 싶을 때 (각 계층마다 facade)

## 구조

```
                 Facade
                ┌─────┐
                └──┬──┘
                   │
       ┌───────────┼───────────┐
       ▼           ▼           ▼
   SubA         SubB         SubC
   ─ a()        ─ b()        ─ c()
```

## 참여자

- **Facade** — 클라이언트가 보는 단순화된 인터페이스. 요청을 적절한 서브시스템 객체에 위임
- **Subsystem classes** — 서브시스템 구현. Facade에 대해 알지 못함

## C++ 구현

```cpp
// 서브시스템 — 복잡한 다수 클래스
class Lexer {
public:
    std::vector<Token> tokenize(const std::string& source);
};

class Parser {
public:
    AST parse(const std::vector<Token>& tokens);
};

class Optimizer {
public:
    AST optimize(const AST& ast);
};

class CodeGenerator {
public:
    void emit(const AST& ast, const std::string& outFile);
};

// Facade
class Compiler {
    Lexer         lex;
    Parser        parse;
    Optimizer     opt;
    CodeGenerator gen;
public:
    void compile(const std::string& source, const std::string& outFile) {
        auto tokens   = lex.tokenize(source);
        auto ast      = parse.parse(tokens);
        auto opt_ast  = opt.optimize(ast);
        gen.emit(opt_ast, outFile);
    }
};

// 사용자는 한 줄
Compiler c;
c.compile("source.cpp", "output.exe");
```

서브시스템 자체는 그대로 — 고급 사용자가 직접 접근 가능. Facade는 추가 편의.

## C 구현

```c
typedef struct {
    Lexer         lex;
    Parser        parse;
    Optimizer     opt;
    CodeGenerator gen;
} Compiler;

void compiler_init(Compiler* c) {
    lexer_init(&c->lex);
    parser_init(&c->parse);
    optimizer_init(&c->opt);
    codegen_init(&c->gen);
}

void compiler_compile(Compiler* c, const char* source, const char* out) {
    Token* tokens = lexer_tokenize(&c->lex, source);
    AST*   ast    = parser_parse(&c->parse, tokens);
    AST*   opt    = optimizer_optimize(&c->opt, ast);
    codegen_emit(&c->gen, opt, out);
}
```

## 결과 (트레이드오프)

**장점**
- 사용 단순화 (학습 곡선 ↓)
- 결합도 ↓ — 클라이언트는 서브시스템 직접 의존 X
- 서브시스템 변경이 클라이언트에 영향 없음 (Facade가 흡수)
- 계층화에 유용 (각 계층의 진입점)

**단점**
- Facade가 비대해질 위험 — 모든 기능을 노출하려는 유혹
- 유연성 ↓ — 저수준 제어가 필요한 사용자에게 부족할 수 있음 (그래서 서브시스템도 노출)

## "Facade가 비즈니스 로직을 흡수하면 안 됨"

Facade는 단순 진입점·조립자 역할만. 비즈니스 로직은 여전히 서브시스템에. 그렇지 않으면 god class.

## 변형

- **다중 Facade** — 한 서브시스템에 여러 관점의 facade
- **Singleton Facade** — Facade 자체를 Singleton으로 (단순화 더)

## 알려진 사용 사례

- jQuery — 복잡한 DOM API를 단순화
- 모든 SDK의 진입점 클래스
- C++ `<iostream>` (실제로는 streambuf, locale 등 복잡한 구조의 facade)
- 운영체제 API의 high-level wrapper

## 관련 패턴

- **[Mediator (item 17)](/blog/programming/gof-design-patterns/item17-mediator)** — Facade는 단방향(클라이언트→서브시스템) 단순화, Mediator는 양방향 (동료들 사이 협력 중재)
- **[Adapter (item 6)](/blog/programming/gof-design-patterns/item06-adapter)** — Adapter는 기존 인터페이스에 맞추는 것, Facade는 새로 단순한 인터페이스 정의
- **[Singleton (item 5)](/blog/programming/gof-design-patterns/item05-singleton)** — Facade는 보통 한 인스턴스만 필요 → Singleton과 결합 빈번
- **[Abstract Factory (item 1)](/blog/programming/gof-design-patterns/item01-abstract-factory)** — Abstract Factory가 "Facade의 진입점"으로 쓰이기도 함
