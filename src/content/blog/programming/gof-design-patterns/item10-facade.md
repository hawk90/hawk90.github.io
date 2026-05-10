---
title: "GoF 10: Facade"
date: 2026-02-02T14:00:00
description: "복잡한 서브시스템에 대한 단순한 통합 인터페이스 제공."
tags: [Design Pattern, GoF, C++, C, Structural]
series: "GoF Design Patterns"
seriesOrder: 10
draft: true
---

> **초안** — 정리 진행 중

## 의도

서브시스템의 여러 인터페이스를 묶어 **하나의 통합 인터페이스** 제공. 서브시스템 사용을 더 쉽게 만듦.

## 동기

복잡한 라이브러리(컴파일러 — lexer, parser, codegen)를 처음 쓰는 사용자에게 단순한 진입점을 제공.

## C++ 구현

```cpp
// 서브시스템 — 복잡한 다수 클래스
class Lexer { /* ... */ };
class Parser { /* ... */ };
class Optimizer { /* ... */ };
class CodeGen { /* ... */ };

// Facade
class Compiler {
    Lexer     lex;
    Parser    parse;
    Optimizer opt;
    CodeGen   gen;
public:
    void compile(const std::string& source, const std::string& outFile) {
        auto tokens = lex.tokenize(source);
        auto ast    = parse.parse(tokens);
        auto opt_ast = opt.optimize(ast);
        gen.emit(opt_ast, outFile);
    }
};

// 사용자는 한 줄
Compiler c;
c.compile("source.cpp", "output.exe");
```

서브시스템 자체는 그대로 — 고급 사용자가 직접 접근 가능. Facade는 추가 편의.

## 잘못된 사용

Facade가 단순한 wrapper가 아니라 비즈니스 로직까지 흡수하면 god class가 됨. **단순 진입점** 역할만.

## C 구현

```c
typedef struct {
    Lexer     lex;
    Parser    parse;
    Optimizer opt;
    CodeGen   gen;
} Compiler;

void compiler_compile(Compiler* c, const char* source, const char* out) {
    Token* tokens = lexer_tokenize(&c->lex, source);
    AST*   ast    = parser_parse(&c->parse, tokens);
    AST*   opt    = optimizer_optimize(&c->opt, ast);
    codegen_emit(&c->gen, opt, out);
}
```

## 트레이드오프

- **장점**: 사용 단순화, 결합도 ↓ (클라이언트 → 서브시스템 직접 의존 X)
- **단점**: Facade가 비대해질 위험, 유연성 감소 (저수준 제어 어려움)
