---
title: "GoF 10: Facade"
date: 2026-02-02T14:00:00
description: "복잡한 서브시스템에 단순한 진입점 — 비대해지지 않게 주의."
tags: [Design Pattern, GoF, C++, C, Structural]
series: "GoF Design Patterns"
seriesOrder: 10
---

## 한 줄 요약

> **"복잡한 라이브러리의 친절한 안내데스크"** — 90% 사용자에게 한 줄짜리 인터페이스 제공.

## 어떤 문제를 푸는가

복잡한 서브시스템(컴파일러 — lexer, parser, optimizer, codegen)을 처음 사용하는 사람은 압도됩니다.

대부분의 사용자가 원하는 건 단순합니다 — "소스 → 실행 파일". 고급 사용자는 단계별 제어가 필요할 수도 있고요.

→ **Facade**가 단순한 진입점을 제공. 서브시스템 자체는 그대로 두어, 고급 사용자는 직접 접근 가능.

```cpp
Compiler c;
c.compile("source.cpp", "output.exe");   // 한 줄
```

## 한눈에 보는 구조

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

Facade는 클라이언트와 서브시스템 **사이의 얇은 층**.

## 언제 쓰면 좋은가

- 복잡한 서브시스템에 **단순한 인터페이스**가 필요할 때
- 클라이언트와 추상 클래스의 구현 사이에 **많은 의존성**이 있을 때
- 서브시스템을 **계층화**하고 싶을 때 (각 계층마다 facade)

## 언제 쓰면 안 되나

> ⚠️ **Facade에 비즈니스 로직을 흡수**하지 말 것 — god class가 됨. **단순 진입점·조립자** 역할만.

> ⚠️ **단일 클래스만 감싸는 건 Facade 아님** — 그건 그냥 wrapper / Adapter / Proxy.

## C++ 구현

### 1. 서브시스템 — 복잡한 다수 클래스 (그대로 둠)

```cpp
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
```

### 2. Facade — 한 함수 호출로 묶음

```cpp
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
```

### 3. 사용 — 한 줄

```cpp
Compiler c;
c.compile("source.cpp", "output.exe");
```

고급 사용자는 여전히 `Lexer`, `Parser`를 직접 사용 가능 — Facade는 **추가 편의**.

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

## 트레이드오프 — 한눈에

| 차원 | Facade |
| --- | --- |
| 사용 단순화 (학습 곡선 ↓) | ✅ |
| 클라이언트↔서브시스템 결합도 | ✅ ↓ (Facade가 흡수) |
| 서브시스템 변경 흡수 | ✅ |
| Facade 비대 위험 | ⚠️ 모든 기능 노출 유혹 |
| 저수준 제어 (고급 사용자) | ⚠️ 부족할 수 있음 |

## Facade vs Mediator vs Adapter — 비교

| | Facade | Mediator | Adapter |
| --- | --- | --- | --- |
| 방향 | 단방향 (클라이언트→서브시스템) | 양방향 (동료↔동료) | 단방향 (변환) |
| 의도 | 단순화 진입점 | 협력 중재 | 인터페이스 호환 |

## 실제 사례

- **jQuery** — 복잡한 DOM API를 단순화
- **모든 SDK의 진입점 클래스**
- **C++ `<iostream>`** (실제론 streambuf, locale 등 복잡한 구조의 facade)
- **OS API의 high-level wrapper** (POSIX 위의 stdio 등)

## 관련 패턴

- **[Mediator (item 17)](/blog/programming/gof-design-patterns/item17-mediator)** — Facade는 단방향 단순화, Mediator는 양방향 중재
- **[Adapter (item 6)](/blog/programming/gof-design-patterns/item06-adapter)** — Adapter는 기존 인터페이스에 맞춤, Facade는 새 인터페이스 정의
- **[Singleton (item 5)](/blog/programming/gof-design-patterns/item05-singleton)** — Facade는 보통 한 인스턴스만 필요 → Singleton과 결합
- **[Abstract Factory (item 1)](/blog/programming/gof-design-patterns/item01-abstract-factory)** — Abstract Factory가 Facade의 진입점으로 쓰이기도 함
