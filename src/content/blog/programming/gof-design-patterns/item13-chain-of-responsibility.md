---
title: "GoF 13: Chain of Responsibility"
date: 2026-02-03T10:00:00
description: "요청을 처리할 객체를 체인을 따라 순차 탐색 — 송신자와 수신자 분리."
tags: [Design Pattern, GoF, C++, C, Behavioral]
series: "GoF Design Patterns"
seriesOrder: 13
draft: true
---

## 의도

요청을 처리할 객체를 체인을 따라 **순차적으로** 찾습니다. 송신자가 어떤 객체가 처리할지 모르도록 하고, 둘 이상의 객체가 처리할 기회를 갖도록 합니다.

## 동기

- 로깅 레벨 (DEBUG → INFO → WARN → ERROR — 적합한 핸들러까지)
- GUI 이벤트 (위젯 → 부모 → 윈도우 — bubbling)
- HTTP 미들웨어 체인
- 예외 처리 (try → catch → 상위 catch)

## 적용 가능성

- 둘 이상의 객체가 요청을 처리할 수 있고, 어떤 객체가 처리할지 자동 결정되어야 할 때
- 수신자를 명시적으로 지정하지 않고 요청을 보내고 싶을 때
- 요청 처리자 집합이 동적으로 변경되어야 할 때

## 구조

```
   Client ──► Handler ─┐
                  △    │ next
                  │    │
              ┌───┴────┘
         ConcHandler1 ──► ConcHandler2 ──► ConcHandler3
                          (체인 형성)
```

## 참여자

- **Handler** — 요청 처리 인터페이스, optional next 포인터
- **ConcreteHandler** — 자기 책임 범위 처리, 아니면 next로 전달
- **Client** — 체인의 첫 Handler에 요청

## C++ 구현

```cpp
class Handler {
protected:
    Handler* next = nullptr;
public:
    virtual ~Handler() = default;

    Handler* setNext(Handler* h) { next = h; return h; }    // chaining 편의

    virtual void handle(const Request& req) {
        if (next) next->handle(req);    // 기본: 다음으로 패스
    }
};

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
        Handler::handle(req);    // 처리 후 다음으로
    }
};

class RoutingHandler : public Handler {
public:
    void handle(const Request& req) override {
        // 실제 라우팅 — 체인 종료
    }
};

// 체인 조립
LoggingHandler logger;
AuthHandler    auth;
RoutingHandler router;

logger.setNext(&auth)->setNext(&router);
logger.handle(req);    // logger → auth → router
```

## 변형 — `std::function` 미들웨어 체인 (모던)

```cpp
using Middleware = std::function<void(const Request&, std::function<void()>)>;

std::vector<Middleware> chain = {
    [](const Request& r, auto next) { /* logging */ next(); },
    [](const Request& r, auto next) { if (r.authed()) next(); },
    [](const Request& r, auto)      { /* routing */ }
};

// 실행 헬퍼
void run(const std::vector<Middleware>& chain, const Request& req, std::size_t i = 0) {
    if (i >= chain.size()) return;
    chain[i](req, [&] { run(chain, req, i + 1); });
}
```

Express.js, ASP.NET, Koa.js 미들웨어 패턴.

## C 구현

```c
typedef struct Handler {
    struct Handler* next;
    int (*handle)(struct Handler*, Request*);    // return 0 = 처리됨, 1 = 다음으로
} Handler;

void chain_handle(Handler* head, Request* req) {
    while (head) {
        if (head->handle(head, req) == 0) break;
        head = head->next;
    }
}
```

## 결과 (트레이드오프)

**장점**
- 송신자·수신자 분리
- 동적 체인 구성·재구성
- 단일 책임 (각 핸들러가 자기 일만)

**단점**
- 처리 보장 X — 체인 끝까지 가도 처리자 없을 수 있음
- 디버깅 어려움 (어느 핸들러가 처리했는지 추적)
- 성능 — 체인 순회 비용

## 변형

- **명시적 next 메서드** — base에서 `Handler::handle()` 호출
- **`std::function` 체인** — 클래스 계층 없이
- **Composite 기반 체인** — 트리 구조도 가능

## 알려진 사용 사례

- Express.js 미들웨어, ASP.NET Pipeline
- Servlet Filter 체인
- Java util.logging Handler 체인
- 게임 입력 처리 (focused widget → parent → root)
- macOS Cocoa의 responder chain

## 관련 패턴

- **[Composite (item 8)](/blog/programming/gof-design-patterns/item08-composite)** — Composite의 부모 포인터를 따라 올라가며 처리하는 형태가 자주 사용 (이벤트 bubbling)
- **[Command (item 14)](/blog/programming/gof-design-patterns/item14-command)** — 요청을 Command 객체로 만들어 체인을 통해 전달
- **[Decorator (item 9)](/blog/programming/gof-design-patterns/item09-decorator)** — 구조 비슷하지만 Decorator는 항상 작업 수행, CoR은 처리하거나 패스
