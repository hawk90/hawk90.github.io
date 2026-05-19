---
title: "GoF 10: Facade"
date: 2026-05-01T10:00:00
description: "복잡한 서브시스템에 단순한 진입점 — 비대해지지 않게 주의."
tags: [Design Pattern, GoF, C++, C, Structural]
series: "GoF Design Patterns"
seriesOrder: 10
draft: false
---

## 한 줄 요약

> **"복잡한 라이브러리의 친절한 안내데스크"** — 90% 사용자에게 한 줄짜리 인터페이스 제공.

## 비유 — 호텔 컨시어지

5성급 호텔에 묵었다고 해봅시다. *공항 픽업*, *공연 티켓 예매*, *세탁*, *룸서비스* — 각각 다른 부서가 처리합니다. 손님이 *모든 부서 번호*를 외워야 한다면 *불편*합니다.

대신 *컨시어지*에게 *한 번만* 말합니다. "내일 오페라 티켓 두 장과 8시 차량 예약 부탁드려요." 컨시어지가 알아서 *티켓 부서*, *교통 부서*에 연락합니다.

Facade가 정확히 *컨시어지*입니다.

- *손님* = 클라이언트
- *컨시어지* = Facade
- *각 부서* = 복잡한 서브시스템들 (lexer, parser, optimizer...)

손님이 *모든 부서를 알 필요 없습니다*. 그러나 *직접 부서에 연락하고 싶다면 가능*합니다 (컨시어지는 강제가 아닙니다).

## 어떤 문제를 푸는가

복잡한 서브시스템 (예: 컴파일러 — lexer, parser, optimizer, codegen)을 처음 사용하는 사람은 압도됩니다.

대부분의 사용자가 원하는 건 단순합니다 — *"소스 → 실행 파일"*. 고급 사용자만 단계별 제어가 필요.

→ **Facade**가 *단순한 진입점*을 제공. 서브시스템 *자체는 그대로 두어*, 고급 사용자는 직접 접근 가능.

```cpp
Compiler c;
c.compile("source.cpp", "output.exe");   // 한 줄
```

## 한눈에 보는 구조

<img src="/images/blog/gof/diagrams/item10-facade.svg" alt="Facade 패턴 클래스 다이어그램" style="max-width:100%; background:white; padding:8px; border-radius:6px;" />

Facade는 클라이언트와 서브시스템 **사이의 얇은 층**.

## 언제 쓰면 좋은가

- 복잡한 서브시스템에 **단순한 인터페이스**가 필요할 때
- 클라이언트와 *구현 사이에 결합도가 너무 높을 때*
- 서브시스템을 **계층화**하고 싶을 때 (각 계층마다 facade)
- 외부 라이브러리에 *얇은 어댑테이션 계층*이 필요할 때
- *legacy 서브시스템*을 새 인터페이스로 노출

## 언제 쓰면 안 되나

> ⚠️ **Facade에 비즈니스 로직을 흡수**하지 말 것 — *god class*가 됨. **단순 진입점·조립자** 역할만.

> ⚠️ **단일 클래스만 감싸는 건 Facade 아님** — 그건 *wrapper / Adapter / Proxy*.

> ⚠️ **고급 사용자가 다수**인 경우 — facade가 *오히려 답답*. 저수준 접근을 막지 말 것.

> ⚠️ **부분적인 단순화**라면 — *facade 하나*보다 *여러 작은 모듈*이 나음.

## 헷갈리는 패턴과의 차이

| 비교 대상 | 무엇이 다른가 |
| --- | --- |
| [Adapter](/blog/programming/design/gof-design-patterns/item06-adapter) | Adapter는 *1대1 인터페이스 변환*. Facade는 *복잡한 서브시스템 → 단순 진입점* (다대일). |
| [Mediator](/blog/programming/design/gof-design-patterns/item17-mediator) | Mediator는 *내부 객체들의 양방향 협력 조율*. Facade는 *외부 클라이언트를 위한 단방향 단순화*. |
| [Proxy](/blog/programming/design/gof-design-patterns/item12-proxy) | Proxy는 *같은 인터페이스 + 접근 제어*. Facade는 *새 단순한 인터페이스 + 여러 객체 호출*. |
| Singleton과의 결합 | Facade는 보통 *singleton으로 구현* (서비스 진입점). 의무는 아님. |

판별 한 줄: *"클라이언트가 복잡한 서브시스템을 직접 다루지 않고 한 줄로 끝내고 싶다"*면 Facade.

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

### 4. 옵션으로 *고급 진입점*도 제공

```cpp
class Compiler {
    // ... 서브시스템 보유

public:
    // 단순 경로
    void compile(const std::string& source, const std::string& out);

    // 고급 — 옵션 풍부
    struct Options {
        OptLevel optLevel = OptLevel::O2;
        bool emitDebug = false;
        std::vector<std::string> includePaths;
    };
    void compile(const std::string& source, const std::string& out,
                 const Options& opts);

    // 단계별 직접 접근 (필요 시)
    Lexer&     lexer()     { return lex; }
    Parser&    parser()    { return parse; }
    Optimizer& optimizer() { return opt; }
};
```

→ "쉬운 길 + 어려운 길" 둘 다.

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
    // ... cleanup
}
```

## Facade가 진화하는 4가지 경로

처음엔 *얇은 진입점*. 그러나 시간이 지나면…

### 1. **얇은 채로 유지** (이상적)

- 단순 조립만. 로직 0.
- 서브시스템 변경 시 facade만 수정.

### 2. **옵션 풍부형**

- `Options struct`로 확장.
- 여전히 얇음 — 옵션을 *그대로* 서브시스템에 전달.

### 3. **여러 facade로 분할** (좋음)

```
SimpleCompiler        — 90% 사용자용
AdvancedCompiler      — 고급 사용자용
JITCompiler           — runtime 컴파일용
```

→ 한 facade를 비대하게 하지 말고 *역할별*로 분리.

### 4. **God object로 비대화** (회피)

- 한 facade에 30+ 메서드. 로직 흡수. 의존성 폭주.
- → 안티패턴. 분할 또는 [Mediator](/blog/programming/design/gof-design-patterns/item17-mediator) 검토.

## 흔한 함정 — Anti-patterns

### 1. **God Facade**

```cpp
// 회피
class Compiler {
public:
    void compile(...);
    void link(...);
    void deploy(...);
    void runTests(...);
    void publishPackage(...);    // ❌ scope 폭주
    void notifyTeam(...);         // ❌
    void incrementVersion(...);   // ❌
};
```

→ Compiler는 *컴파일*만. Deploy / Test / Publish는 *별도 facade*.

### 2. **Facade 자체에 로직 누적**

```cpp
// 회피
void compile(...) {
    if (sourceContainsTemplate(source)) {                // ❌
        if (project.uses("Boost")) ...                    // ❌
        // 200줄의 정책 분기
    }
    // 그러고 나서 lex.tokenize(...)
}
```

→ 정책 분기는 *별도 policy 클래스*에. Facade는 *조립*만.

### 3. **서브시스템을 *숨기지 못함***

```cpp
// 회피 — 모든 멤버를 public exposure
class Compiler {
public:
    Lexer         lex;      // ❌ public
    Parser        parse;    // ❌
    Optimizer     opt;      // ❌
    CodeGenerator gen;      // ❌
};
```

→ Facade가 *단순화 효과 없음*. 클라이언트가 또 서브시스템을 알아야 함.

### 4. **단방향 가정 잘못**

Facade는 *클라이언트 → 서브시스템* 단방향. 서브시스템이 *facade를 호출하면* 순환 의존. 보통 *callback / event*로 우회.

### 5. **부분 facade**

```cpp
// 회피
class Compiler {
public:
    void compile(...);
    // 그러나 link는 LinkerLowLevelAPI 직접 호출해야 함
};
```

→ 사용자가 *부분만 단순*하고 *나머지는 복잡*. 일관성 깨짐. 두 단계 모두 facade로 덮거나 분리.

## Modern C++에서의 Facade

### 1. *Pimpl로 facade 구현*

```cpp
// public header — clean facade
class Compiler {
    struct Impl;
    std::unique_ptr<Impl> p;
public:
    Compiler();
    ~Compiler();
    void compile(const std::string& source, const std::string& out);
};

// .cpp — 서브시스템 모두 숨김
struct Compiler::Impl {
    Lexer lex;
    Parser parse;
    Optimizer opt;
    CodeGenerator gen;
};
```

→ 사용자에게 *서브시스템 헤더 노출 0*. 컴파일 시간 ↓.

### 2. *Free function들의 묶음*

클래스 아예 없이 namespace + free function.

```cpp
namespace compiler {
    void compile(const std::string& source, const std::string& out);
    // 내부에서 lexer/parser/optimizer/codegen 호출
}
```

→ 객체 lifecycle 관리 부담 없음. *stateless facade*에 적합.

### 3. *Builder + Facade 결합*

```cpp
auto result = CompilerBuilder()
    .source("main.cpp")
    .optimization(OptLevel::O3)
    .target(Target::x86_64)
    .build();
```

→ facade의 *옵션 복잡도*를 builder로 분리.

## Facade vs Mediator vs Adapter — 비교

| | Facade | Mediator | Adapter |
| --- | --- | --- | --- |
| 방향 | 단방향 (클라이언트→서브시스템) | 양방향 (동료↔동료) | 단방향 (변환) |
| 의도 | *단순화 진입점* | *협력 중재* | *인터페이스 호환* |
| 서브시스템 알고리즘 변경 | 가능 | 가능 | X (변환만) |
| 통상 인스턴스 수 | 1 (singleton 결합) | 1 | 여러 |
| 클라이언트가 서브시스템 직접 접근 | ✅ 가능 (facade는 편의) | ❌ 보통 차단 | N/A |

## 트레이드오프 — 한눈에

| 차원 | Facade |
| --- | --- |
| 사용 단순화 (학습 곡선 ↓) | ✅ |
| 클라이언트↔서브시스템 결합도 | ✅ ↓ (Facade가 흡수) |
| 서브시스템 변경 흡수 | ✅ |
| 컴파일 시간 (Pimpl 결합 시) | ✅ ↓ |
| Facade 비대 위험 | ⚠️ 모든 기능 노출 유혹 |
| 저수준 제어 (고급 사용자) | ⚠️ 부족할 수 있음 |
| 새 기능 추가 | ⚠️ Facade도 같이 수정 |

## 실제 사례

### 표준 라이브러리

- **`<iostream>`** — streambuf, locale, codecvt 등 복잡한 구조의 facade
- **`std::filesystem`** — OS별 file API의 facade
- **`<thread>`** — pthread / Win32 thread API의 facade

### 라이브러리 / 프레임워크

- **jQuery** — 복잡한 DOM API를 `$(...)` 한 줄로
- **React** — 가상 DOM diff/patch 알고리즘을 component API 뒤로 숨김
- **모든 SDK의 진입점 클래스** — `XxxClient`, `XxxSDK` 형태
- **gRPC client** — stub이 RPC + serialization + connection management의 facade
- **boto3 (AWS)** — REST API 다수를 Python 클래스로 단순화

### 시스템

- **OS API의 high-level wrapper** — POSIX 위의 stdio, libc 위의 libcurl
- **DB driver** — connection / statement / result 통일 인터페이스
- **HTTP client library** — `curl`, `requests`, `reqwest` 등

### 도메인

- **Payment gateway 통합** — 여러 PG (Stripe/Toss/Paypal)에 통일 facade
- **알림 시스템 facade** — Email/SMS/Push의 통일 인터페이스
- **모니터링 facade** — Prometheus/StatsD/CloudWatch 추상화

## 관련 패턴

- **[Mediator (item 17)](/blog/programming/design/gof-design-patterns/item17-mediator)** — Facade는 *단방향 단순화*, Mediator는 *양방향 중재*
- **[Adapter (item 6)](/blog/programming/design/gof-design-patterns/item06-adapter)** — Adapter는 *기존 인터페이스에 맞춤*, Facade는 *새 인터페이스 정의*
- **[Singleton (item 5)](/blog/programming/design/gof-design-patterns/item05-singleton)** — Facade는 *보통 한 인스턴스*만 필요 → Singleton과 결합
- **[Abstract Factory (item 1)](/blog/programming/design/gof-design-patterns/item01-abstract-factory)** — Abstract Factory가 Facade의 진입점으로 쓰이기도 함
- **[Builder (item 2)](/blog/programming/design/gof-design-patterns/item02-builder)** — Facade가 *옵션이 많을 때* Builder와 결합
- **[item 24 — 전체 관계도](/blog/programming/design/gof-design-patterns/item24-pattern-relationships-overview)** — Facade는 Singleton과 *single instance* 관계
