---
title: "GoF 13: Chain of Responsibility"
date: 2026-02-01T13:00:00
description: "처리자 후보들을 체인으로 — 누가 처리할지는 자동으로 결정."
tags: [Design Pattern, GoF, C++, C, Behavioral]
series: "GoF Design Patterns"
seriesOrder: 13
draft: true
---

## 한 줄 요약

> **"누가 처리할지 모르겠으면 체인을 따라 물어봐"** — 송신자는 누가 받을지 모름.

## 어떤 문제를 푸는가

요청을 처리할 객체가 여러 후보가 있고, *어떤 객체가 처리할지 런타임에 결정*되어야 합니다.

- **GUI 이벤트** — 위젯 → 부모 → 윈도우 (bubbling)
- **로깅 레벨** — DEBUG → INFO → WARN → ERROR (적합한 핸들러까지)
- **HTTP 미들웨어** — auth → logging → rate-limit → handler
- **예외 처리** — try → catch → 상위 catch (개념적으로 같은 흐름)
- **CSS rule matching** — specificity 높은 selector부터 시도

송신자가 *"이거 받을 사람?"*이라고 묻고, 체인을 따라 *누군가 처리하면 됨*.

## 두 변형 — pass-through vs short-circuit

| 변형 | 동작 |
| --- | --- |
| **pass-through** | 핸들러가 *자기 일* 하고 *항상* 다음으로 (e.g., 로깅 미들웨어) |
| **short-circuit** | 첫 번째로 *처리 가능한* 핸들러에서 *체인 중단* (e.g., 라우터) |

→ 같은 패턴 이름 안에 두 동작이 있다는 점에 주의.

## 한눈에 보는 구조

<img src="/images/blog/gof/diagrams/item13-chain-of-responsibility.svg" alt="Chain of Responsibility 패턴 클래스 다이어그램" style="max-width:100%; background:white; padding:8px; border-radius:6px;" />

각 Handler가 자신이 처리할 수 있으면 처리, 아니면 next로 패스.

## 언제 쓰면 좋은가

- 둘 이상의 객체가 요청을 처리할 수 있고, **어떤 객체가 처리할지 자동 결정**되어야 할 때
- **수신자를 명시적으로 지정하지 않고** 요청을 보내고 싶을 때
- 요청 처리자 집합이 **동적으로 변경**되어야 할 때
- *조건 분기 다수*가 한 함수에 누적될 때 → 각 분기를 *핸들러로 추출*
- *plugin 아키텍처* — 외부에서 핸들러를 끼워넣기

## 언제 쓰면 안 되나

> ⚠️ **체인 끝까지 가도 처리자 없을 가능성** — 처리 *보장 필요*하면 *디폴트 핸들러* 또는 다른 패턴.

> ⚠️ **단일 처리자가 결정적이라면** 그냥 직접 호출.

> ⚠️ **체인이 너무 길어지면** — 디버깅·성능 저하. *5-10 단계 이상*은 재구성 신호.

> ⚠️ **순서가 중요한데 동적 구성**이라면 *config error*가 silent. 정적 분석 어려움.

## C++ 구현

### 1. Handler base — next 보유

```cpp
class Handler {
protected:
    Handler* next = nullptr;
public:
    virtual ~Handler() = default;

    Handler* setNext(Handler* h) { next = h; return h; }   // 체인 편의 (fluent)

    virtual void handle(const Request& req) {
        if (next) next->handle(req);   // 기본: 다음으로 패스
    }
};
```

### 2. ConcreteHandler들

```cpp
// short-circuit 예
class AuthHandler : public Handler {
public:
    void handle(const Request& req) override {
        if (!req.isAuthenticated()) {
            std::cerr << "401 Unauthorized\n";
            return;     // 처리 종료 (체인 중단)
        }
        Handler::handle(req);    // 통과 → 다음으로
    }
};

// pass-through 예
class LoggingHandler : public Handler {
public:
    void handle(const Request& req) override {
        std::cout << "Request: " << req.path() << '\n';
        Handler::handle(req);    // 항상 다음으로
    }
};

class RoutingHandler : public Handler {
public:
    void handle(const Request& req) override {
        // 실제 라우팅 — 체인 종료
    }
};
```

### 3. 체인 조립 (fluent)

```cpp
LoggingHandler logger;
AuthHandler    auth;
RoutingHandler router;

logger.setNext(&auth)->setNext(&router);
logger.handle(req);
// → logger → auth → router
```

## 모던 변형 — `std::function` 미들웨어 체인

Express.js · ASP.NET · Koa · FastAPI 스타일.

```cpp
using Middleware = std::function<void(const Request&, std::function<void()>)>;

std::vector<Middleware> chain = {
    [](const Request& r, auto next) {
        std::cout << "Log: " << r.path() << '\n';
        next();
    },
    [](const Request& r, auto next) {
        if (r.authed()) next();
        else std::cerr << "401\n";
    },
    [](const Request& r, auto) {
        // 라우팅 — 체인 끝, next 호출 안 함
    }
};

void run(const std::vector<Middleware>& chain, const Request& req, std::size_t i = 0) {
    if (i >= chain.size()) return;
    chain[i](req, [&] { run(chain, req, i + 1); });
}
```

각 미들웨어가 `next()`를 *부를지 결정* → 동적 체인 흐름. *before/after hook* 모두 가능 (`next()` 호출 전후에 작업).

## C 구현

```c
typedef struct Handler {
    struct Handler* next;
    int (*handle)(struct Handler*, Request*);   // 0 = 처리됨 (중단), 1 = 다음으로
} Handler;

void chain_handle(Handler* head, Request* req) {
    while (head) {
        if (head->handle(head, req) == 0) break;
        head = head->next;
    }
}
```

## 변형 — Tree of Responsibility

체인이 *선형*이 아니라 *분기*. GUI 이벤트 bubbling이 대표 예 — 자식 → 부모로 *트리 따라 올라감*.

```cpp
class Widget {
    Widget* parent;
public:
    virtual void onClick(const Event& e) {
        if (handleSelf(e)) return;
        if (parent) parent->onClick(e);    // bubble up
    }
};
```

→ Composite와 자연스럽게 결합.

## 흔한 함정 — Anti-patterns

### 1. **체인 끝에서 처리 안 됨 — silent failure**

```cpp
chain.handle(req);   // 요청 처리됐는지 안 됐는지 모름
```

→ 처리 *보장 필요*하면 *boolean 반환* 또는 *디폴트 핸들러* 마지막에 추가.

```cpp
virtual bool handle(const Request& req);   // 처리 여부 반환

// 또는
class DefaultHandler : public Handler {
public:
    void handle(const Request& req) override {
        std::cerr << "No handler for: " << req.path() << '\n';
    }
};
```

### 2. **체인 순서 의존인데 *문서화 부족***

```cpp
// 회피
logger.setNext(&auth);
logger.setNext(&router);    // ❌ 두 번째 setNext가 첫 번째 덮어씀
```

→ Fluent API의 함정. *setNext 반환값을 활용*:

```cpp
logger.setNext(&auth)->setNext(&router);
```

### 3. **순환 체인** (debugging 악몽)

```cpp
A.setNext(&B);
B.setNext(&A);    // ❌ 무한 루프
```

→ 정적 검사 또는 *방문 카운터* 추가.

### 4. **핸들러 간 *상태 공유* 누적**

```cpp
// 회피 — 핸들러가 Request 객체에 부수 수정
class AuthHandler : public Handler {
    void handle(Request& req) override {
        req.userId = lookup(req.token);    // 다음 핸들러가 의존
    }
};
```

→ "묵시적 의존" — 디버깅·테스트 어려움. *명시적 context 객체* 또는 *immutable Request + 별도 result*.

### 5. **처리자가 *다음을 호출할지 잊음***

```cpp
class LoggingHandler : public Handler {
    void handle(const Request& req) override {
        std::cout << req.path() << '\n';
        // ❌ Handler::handle(req); 잊음 — 체인 끊김
    }
};
```

→ 기본 동작을 *base에서 항상 호출*하도록 강제하는 design (template method 형태):

```cpp
class Handler {
public:
    void handle(const Request& req) {
        if (doHandle(req) && next) next->handle(req);
    }
protected:
    virtual bool doHandle(const Request& req) = 0;
};
```

### 6. **체인이 *너무 깊음***

```
logging → auth → ratelimit → csrf → cors → cache → compression → ... → router
```

→ 10단 이상이면 *config 단순화* 또는 *중간 facade*.

## Modern C++ 변형

### 1. *Range-based pipeline*

함수형 스타일.

```cpp
auto pipeline = [&log, &auth, &router](const Request& req) {
    log(req);
    if (!auth(req)) return;
    router(req);
};
pipeline(req);
```

체인 인프라 없이도 의도 표현 가능 — *단 동적 조합 어려움*.

### 2. *coroutine 기반 체인*

C++20 coroutine으로 *await + next* 형태.

```cpp
Task<void> middleware(Request req, Next next) {
    co_await before_work(req);
    co_await next();                     // 다음 미들웨어
    co_await after_work(req);
}
```

→ async pipeline에 자연스러움.

### 3. *Variant + visit*

핸들러가 *enum-like*면 `std::variant`로 닫힌 set.

```cpp
using Handler = std::variant<LoggingHandler, AuthHandler, RoutingHandler>;
std::vector<Handler> chain;

for (auto& h : chain) {
    bool stop = std::visit([&](auto& handler) {
        return handler.handle(req);
    }, h);
    if (stop) break;
}
```

→ 가상 호출 0, 모든 핸들러 타입 컴파일 시 알려짐.

## 성능

| 형태 | 호출당 비용 |
| --- | --- |
| 가상 호출 체인 (전통) | 핸들러 수 × virtual call |
| `std::function` 체인 | 핸들러 수 × function call (heap 가능) |
| coroutine 체인 | suspend/resume 비용 |
| range pipeline | 인라인 가능, 0 비용 |
| variant + visit | virtual ×, jump table |

→ Hot path에선 *variant* 또는 *range pipeline*. 일반 코드는 *가상 호출 OK*.

## 트레이드오프 — 한눈에

| 차원 | Chain of Responsibility |
| --- | --- |
| 송신자·수신자 분리 | ✅ |
| 동적 체인 구성 | ✅ |
| 단일 책임 (각 핸들러 한 일) | ✅ |
| Plugin 친화 | ✅ |
| 처리 보장 | ❌ 끝까지 가도 처리 X 가능 |
| 디버깅 (어느 핸들러가 처리?) | ⚠️ 추적 어려움 |
| 성능 | ⚠️ 체인 순회 비용 |
| 순서 의존 (config 실수) | ⚠️ silent failure 위험 |
| 핸들러 간 상태 의존 | ⚠️ 묵시적 contract |

## 실제 사례

### 웹 / 네트워크

- **Express.js / Koa.js / Fastify 미들웨어**
- **ASP.NET Core middleware pipeline**
- **Servlet Filter 체인** (Java EE)
- **HTTP 인터셉터** (Axios, Retrofit, OkHttp)
- **gRPC interceptor**

### GUI

- **macOS Cocoa의 responder chain**
- **iOS UIResponder chain** — touch event bubbling
- **HTML event bubbling/capturing** (브라우저 DOM)
- **게임 입력 처리** — focused widget → parent → root

### 시스템

- **Linux iptables chain** — INPUT → FORWARD → OUTPUT
- **Java `java.util.logging.Handler` chain**
- **Log4j / SLF4J 필터 체인**

### 도메인

- **Validation chain** — 입력 검증 단계
- **Approval workflow** — manager → director → C-level
- **Exception handling** (try/catch가 개념적으로 같음)

## 관련 패턴

- **[Composite (item 8)](/blog/programming/design/gof-design-patterns/item08-composite)** — Composite의 부모 포인터를 따라 올라가는 형태가 자주 사용 (이벤트 bubbling)
- **[Command (item 14)](/blog/programming/design/gof-design-patterns/item14-command)** — 요청을 Command 객체로 만들어 체인을 통해 전달
- **[Decorator (item 9)](/blog/programming/design/gof-design-patterns/item09-decorator)** — 구조 비슷. Decorator는 *항상 작업*, CoR은 *처리하거나 패스*
- **[Strategy (item 21)](/blog/programming/design/gof-design-patterns/item21-strategy)** — 핸들러 1개만 동적 선택이면 Strategy로 충분
- **[item 24 — 전체 관계도](/blog/programming/design/gof-design-patterns/item24-pattern-relationships-overview)** — CoR은 *defining the chain*으로 Composite와 결합
