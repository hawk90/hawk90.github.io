---
title: "GoF 13: Chain of Responsibility"
date: 2026-02-03T10:00:00
description: "요청을 처리할 객체를 체인을 따라 순차 탐색 — 송신자와 수신자 분리."
tags: [Design Pattern, GoF, C++, C, Behavioral]
series: "GoF Design Patterns"
seriesOrder: 13
draft: true
---

> **초안** — 정리 진행 중

## 의도

요청을 처리할 객체를 체인을 따라 **순차적으로** 찾음. 송신자가 어떤 객체가 처리할지 모르도록.

## 동기

- 로깅 레벨 (DEBUG → INFO → WARN → ERROR — 적합한 핸들러까지)
- GUI 이벤트 (위젯 → 부모 → 윈도우)
- HTTP 미들웨어 체인

## C++ 구현

```cpp
class Handler {
protected:
    Handler* next = nullptr;
public:
    virtual ~Handler() = default;

    Handler* setNext(Handler* h) { next = h; return h; }

    virtual void handle(const Request& req) {
        if (next) next->handle(req);    // 기본: 다음으로 패스
    }
};

class AuthHandler : public Handler {
public:
    void handle(const Request& req) override {
        if (!req.isAuthenticated()) {
            // 처리하고 끝낼 수도, 다음으로 보낼 수도
            std::cerr << "401 Unauthorized\n";
            return;
        }
        Handler::handle(req);
    }
};

class LoggingHandler : public Handler {
public:
    void handle(const Request& req) override {
        std::cout << "Request: " << req.path() << '\n';
        Handler::handle(req);
    }
};

class RoutingHandler : public Handler {
public:
    void handle(const Request& req) override {
        // 실제 라우팅 — 체인 종료
    }
};

// 조립
LoggingHandler logger;
AuthHandler    auth;
RoutingHandler router;

logger.setNext(&auth)->setNext(&router);
logger.handle(req);    // logger → auth → router
```

## 변형 — `std::function` 체인 (모던 C++)

```cpp
using Middleware = std::function<void(const Request&, std::function<void()>)>;

std::vector<Middleware> chain = {
    [](const Request& r, auto next) { /* logging */ next(); },
    [](const Request& r, auto next) { if (r.authed()) next(); },
    [](const Request& r, auto next) { /* routing */ }
};

// 실행은 인덱스로 순회
```

Express.js, ASP.NET 미들웨어 패턴.

## C 구현

```c
typedef struct Handler {
    struct Handler* next;
    void (*handle)(struct Handler*, Request*);
} Handler;

void default_handle(Handler* self, Request* req) {
    if (self->next) self->next->handle(self->next, req);
}
```

## 트레이드오프

- **장점**: 송수신 분리, 동적 체인 구성
- **단점**: 처리 보장 X (체인 끝까지 가도 처리자 없을 수 있음), 디버깅 어려움
