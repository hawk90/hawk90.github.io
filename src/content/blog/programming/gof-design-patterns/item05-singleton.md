---
title: "GoF 5: Singleton"
date: 2026-02-01T14:00:00
description: "유일한 인스턴스 보장 — 그러나 사용 시 신중히. 많은 경우 안티패턴."
tags: [Design Pattern, GoF, C++, C, Creational]
series: "GoF Design Patterns"
seriesOrder: 5
---

## 한 줄 요약

> **"단 하나만 존재해야 하는 객체"** — 그러나 자주 안티패턴. 의존성 주입 검토부터.

## 먼저: 정말 필요한가?

Singleton은 사실상 **전역 변수**입니다. 다음 단점이 있습니다:

- **테스트 격리 어려움** — 상태가 테스트 간 누수
- **숨겨진 의존성** — 함수 시그니처에 안 드러남
- **멀티스레드 안전성** 직접 처리
- **초기화·소멸 순서** 함정

대안 먼저 검토:

| 대안 | 언제 |
| --- | --- |
| **의존성 주입(DI)** | 가장 권장 — 인스턴스를 명시적으로 전달 |
| **모놀로그(monostate)** | 모든 멤버가 static — 인스턴스 자체가 의미 없음 |
| **그냥 전역 객체** | Singleton의 복잡함 없이 같은 효과 |

> ⚠️ **"하나만 있어야 한다"가 진짜 도메인 요구인지 확인.** 종종 "지금 하나만 쓰고 있다"일 뿐이고, 나중에 여러 개가 필요해짐.

## 어떤 문제를 푸는가 (정당한 경우)

- 클래스 인스턴스가 정확히 하나여야 하고, 알려진 접근점이 필요할 때
- **자원 풀 / 캐시 / 로거 / 전역 설정** — "정말로 하나만 있어야 하는" 자원
- 유일 인스턴스가 서브클래싱 가능해야 하고, 클라이언트가 코드 변경 없이 확장 인스턴스를 사용할 수 있어야 할 때

## 한눈에 보는 구조

<img src="/images/blog/gof/diagrams/item05-singleton.svg" alt="Singleton 패턴 클래스 다이어그램" style="max-width:100%; background:white; padding:8px; border-radius:6px;" />

생성자가 private — 외부에서 못 만듦. 유일 진입점이 `getInstance()`.

## C++ 구현 — Meyers' Singleton (권장)

C++11 이후 가장 깔끔한 형태.

```cpp
class Logger {
public:
    static Logger& instance() {
        static Logger inst;     // 첫 호출 시 초기화 — C++11+ thread-safe
        return inst;
    }

    void log(const std::string& msg) { /* ... */ }

    Logger(const Logger&)            = delete;
    Logger& operator=(const Logger&) = delete;
    Logger(Logger&&)                 = delete;
    Logger& operator=(Logger&&)      = delete;

private:
    Logger() = default;
    ~Logger() = default;
};

// 사용
Logger::instance().log("hello");
```

**왜 이게 안전한가**: C++11부터 **함수 안 static 변수의 초기화는 표준이 thread-safe 보장** (정확히 한 번). 락 직접 안 짜도 됨.

## C++ 구현 — `std::call_once` (동적 할당 필요 시)

```cpp
class Logger {
    static std::unique_ptr<Logger> inst;
    static std::once_flag flag;
public:
    static Logger& instance() {
        std::call_once(flag, [] { inst = std::make_unique<Logger>(); });
        return *inst;
    }
};
```

DCLP(Double-Checked Locking Pattern)를 직접 구현하는 것보다 훨씬 안전.

## C 구현 — `pthread_once`

```c
#include <pthread.h>

typedef struct { /* ... */ } Logger;

static Logger inst;
static pthread_once_t once = PTHREAD_ONCE_INIT;

static void init_logger(void) {
    /* inst 초기화 */
}

Logger* logger_instance(void) {
    pthread_once(&once, init_logger);
    return &inst;
}
```

C에는 자동 thread-safe static이 없어 명시적 동기화.

## 흔한 함정 모음

### ⚠️ 1. Static Initialization Order Fiasco

다른 컴파일 단위의 static이 Singleton에 의존하면 초기화 순서 미정.
→ **해결**: Meyers' Singleton (함수 안 static).

### ⚠️ 2. 소멸 순서

```cpp
~Foo() { Logger::instance().log("..."); }   // 위험 — Logger가 이미 소멸됐을 수도
```

다른 static의 소멸자가 Singleton을 사용하면 순서 보장 안 됨.

### ⚠️ 3. 멀티스레드

C++03 이하라면 `static local` 초기화도 race condition. C++11+에서만 안전.

### ⚠️ 4. 테스트 격리

Singleton은 상태를 들고 있어 테스트 간 누수. mock 주입을 위해 의존성 주입이 표준 해결.

## 트레이드오프 — 한눈에

| 차원 | Singleton |
| --- | --- |
| 유일 인스턴스 보장 | ✅ |
| 전역 접근 | ✅ |
| 테스트 격리 | ❌ 어려움 |
| 결합도 | ❌ 숨겨진 전역 의존 |
| 멀티스레드 (C++11+ Meyers') | ✅ thread-safe |
| 초기화 순서 함정 | ⚠️ 다른 static 의존 시 위험 |

## 실제 사례

- 로깅 시스템 (대부분의 logger)
- 전역 설정 (앱 config)
- 자원 매니저 (스레드 풀, DB connection pool)
- C 표준의 `errno` (사실상 전역)

## CRTP Singleton — 재사용 패턴

```cpp
template<typename T>
class Singleton {
public:
    static T& instance() {
        static T inst;
        return inst;
    }

    Singleton(const Singleton&) = delete;
    Singleton& operator=(const Singleton&) = delete;
protected:
    Singleton() = default;
};

class Logger : public Singleton<Logger> { /* ... */ };
```

여러 Singleton을 같은 패턴으로.

## 관련 패턴

- **[Abstract Factory (item 1)](/blog/programming/gof-design-patterns/item01-abstract-factory)** / **[Builder (item 2)](/blog/programming/gof-design-patterns/item02-builder)** / **[Prototype (item 4)](/blog/programming/gof-design-patterns/item04-prototype)** — 모두 종종 Singleton으로 구현됨
- **[Facade (item 10)](/blog/programming/gof-design-patterns/item10-facade)** — Facade는 보통 단 하나만 필요 → Singleton과 결합
- **[State (item 20)](/blog/programming/gof-design-patterns/item20-state)** / **[Strategy (item 21)](/blog/programming/gof-design-patterns/item21-strategy)** — 무상태 state/strategy 객체는 Singleton/Flyweight으로 공유
- **[Flyweight (item 11)](/blog/programming/gof-design-patterns/item11-flyweight)** — Singleton은 "1개", Flyweight는 "각 종류마다 1개" — 비슷한 동기
