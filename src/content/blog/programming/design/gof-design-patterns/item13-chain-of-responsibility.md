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

요청을 처리할 객체가 여러 후보가 있고, 어떤 객체가 처리할지 **런타임에 결정**되어야 합니다.

- **GUI 이벤트** — 위젯 → 부모 → 윈도우 (bubbling)
- **로깅 레벨** — DEBUG → INFO → WARN → ERROR (적합한 핸들러까지)
- **HTTP 미들웨어** — auth → logging → rate-limit → handler
- **예외 처리** — try → catch → 상위 catch

송신자가 "이거 받을 사람?"이라고 묻고, 체인을 따라 누군가 처리하면 됨.

## 한눈에 보는 구조

<img src="/images/blog/gof/diagrams/item13-chain-of-responsibility.svg" alt="Chain of Responsibility 패턴 클래스 다이어그램" style="max-width:100%; background:white; padding:8px; border-radius:6px;" />

각 Handler가 자신이 처리할 수 있으면 처리, 아니면 next로 패스.

## 언제 쓰면 좋은가

- 둘 이상의 객체가 요청을 처리할 수 있고, **어떤 객체가 처리할지 자동 결정**되어야 할 때
- **수신자를 명시적으로 지정하지 않고** 요청을 보내고 싶을 때
- 요청 처리자 집합이 **동적으로 변경**되어야 할 때

## 언제 쓰면 안 되나

> ⚠️ **체인 끝까지 가도 처리자 없을 가능성** — 처리 보장이 필요하면 다른 패턴.

> ⚠️ **단일 처리자**가 결정적이라면 그냥 직접 호출.

## C++ 구현

### 1. Handler base — next 보유

```cpp
class Handler {
protected:
    Handler* next = nullptr;
public:
    virtual ~Handler() = default;

    Handler* setNext(Handler* h) { next = h; return h; }   // 체인 편의

    virtual void handle(const Request& req) {
        if (next) next->handle(req);   // 기본: 다음으로 패스
    }
};
```

### 2. ConcreteHandler들

```cpp
class AuthHandler : public Handler {
public:
    void handle(const Request& req) override {
        if (!req.isAuthenticated()) {
            std::cerr << "401 Unauthorized\n";
            return;     // 처리 종료 (체인 중단)
        }
        Handler::handle(req);    // 다음으로
    }
};

class LoggingHandler : public Handler {
public:
    void handle(const Request& req) override {
        std::cout << "Request: " << req.path() << '\n';
        Handler::handle(req);    // 처리 후에도 다음으로
    }
};

class RoutingHandler : public Handler {
public:
    void handle(const Request& req) override {
        // 실제 라우팅 — 체인 종료
    }
};
```

### 3. 체인 조립

```cpp
LoggingHandler logger;
AuthHandler    auth;
RoutingHandler router;

logger.setNext(&auth)->setNext(&router);
logger.handle(req);
// → logger → auth → router
```

## 모던 변형 — `std::function` 미들웨어 체인

Express.js·ASP.NET 스타일.

```cpp
using Middleware = std::function<void(const Request&, std::function<void()>)>;

std::vector<Middleware> chain = {
    [](const Request& r, auto next) { /* logging */ next(); },
    [](const Request& r, auto next) { if (r.authed()) next(); },
    [](const Request& r, auto)      { /* routing — 체인 끝 */ }
};

void run(const std::vector<Middleware>& chain, const Request& req, std::size_t i = 0) {
    if (i >= chain.size()) return;
    chain[i](req, [&] { run(chain, req, i + 1); });
}
```

각 미들웨어가 `next()`를 부를지 결정 → 동적 체인 흐름.

## C 구현

```c
typedef struct Handler {
    struct Handler* next;
    int (*handle)(struct Handler*, Request*);   // 0 = 처리됨, 1 = 다음으로
} Handler;

void chain_handle(Handler* head, Request* req) {
    while (head) {
        if (head->handle(head, req) == 0) break;
        head = head->next;
    }
}
```

## 트레이드오프 — 한눈에

| 차원 | Chain of Responsibility |
| --- | --- |
| 송신자·수신자 분리 | ✅ |
| 동적 체인 구성 | ✅ |
| 단일 책임 (각 핸들러 한 일) | ✅ |
| 처리 보장 | ❌ 끝까지 가도 처리 X 가능 |
| 디버깅 (어느 핸들러가 처리?) | ⚠️ 추적 어려움 |
| 성능 | ⚠️ 체인 순회 비용 |

## 실제 사례

- **Express.js / Koa.js / ASP.NET 미들웨어**
- **Servlet Filter 체인**
- **Java util.logging Handler 체인**
- **macOS Cocoa의 responder chain**
- **게임 입력 처리** (focused widget → parent → root)

## 관련 패턴

- **[Composite (item 8)](/blog/programming/design/gof-design-patterns/item08-composite)** — Composite의 부모 포인터를 따라 올라가는 형태가 자주 사용 (이벤트 bubbling)
- **[Command (item 14)](/blog/programming/design/gof-design-patterns/item14-command)** — 요청을 Command 객체로 만들어 체인을 통해 전달
- **[Decorator (item 9)](/blog/programming/design/gof-design-patterns/item09-decorator)** — 구조 비슷. Decorator는 항상 작업, CoR은 처리하거나 패스
