---
title: "GoF 5: Singleton"
date: 2026-02-01T14:00:00
description: "유일한 인스턴스 보장 — 그러나 사용 시 신중히. 멀티스레드와 테스트 함정."
tags: [Design Pattern, GoF, C++, C, Creational]
series: "GoF Design Patterns"
seriesOrder: 5
draft: true
---

## 의도

클래스의 인스턴스가 **단 하나만** 존재하도록 보장하고, 그 인스턴스에 대한 **전역 접근점**을 제공합니다.

## 사용 시 주의

Singleton은 자주 안티패턴으로도 분류됩니다:

- 사실상 **전역 변수** — 결합도 ↑, 테스트 어려움
- **숨겨진 의존성** — 클래스 시그니처에 안 드러남
- **멀티스레드** 안전성 직접 처리해야 함
- **초기화 순서** 함정

대안 검토 필수:
- **의존성 주입(DI)** — 인스턴스를 명시적으로 전달
- **모놀로그(monostate)** — 모든 멤버가 static
- 그냥 전역 객체

## 적용 가능성 (정당한 경우)

- 클래스 인스턴스가 정확히 하나여야 하고, 알려진 접근점이 필요할 때
- 유일 인스턴스가 서브클래싱 가능해야 하고, 클라이언트가 코드 변경 없이 확장 인스턴스를 사용할 수 있어야 할 때
- 자원 풀 / 캐시 / 로거 / 설정 — "정말로 하나만 있어야 하는" 자원

## 구조

```
   Singleton
   - instance: Singleton  (static, private)
   - Singleton()          (private)
   + getInstance(): Singleton  (static)
   + operation()
```

## 참여자

- **Singleton** — 유일 인스턴스 접근 메서드(`getInstance`)와 자기 자신을 private 생성자로 보호

## C++ 구현 — Meyers' Singleton (권장)

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

**장점**:
- **C++11+ thread-safe** — static local의 초기화는 표준 보장 (정확히 한 번)
- 첫 사용 시 lazy 초기화
- 프로그램 종료 시 자동 소멸 (스택 unwinding 역순)

**단점**:
- 다른 static과의 소멸 순서 함정 (다른 static의 소멸자가 Logger 참조하면 위험)

## C++ 구현 — DCLP (C++11 전 / 동적 할당 필요 시)

```cpp
class Logger {
    static std::atomic<Logger*> inst;
    static std::mutex mtx;
public:
    static Logger* instance() {
        Logger* p = inst.load(std::memory_order_acquire);
        if (!p) {
            std::lock_guard g(mtx);
            p = inst.load(std::memory_order_relaxed);
            if (!p) {
                p = new Logger;
                inst.store(p, std::memory_order_release);
            }
        }
        return p;
    }
};
```

복잡 — 가능하면 Meyers' Singleton.

## C++ 구현 — `std::call_once`

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

DCLP보다 깔끔.

## C 구현

```c
typedef struct { /* ... */ } Logger;

#include <pthread.h>

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

C에선 `pthread_once` 또는 atomic을 명시적으로 사용해야 thread-safe.

## 결과 (트레이드오프)

**장점**
- 유일 인스턴스 보장
- 전역 접근, 동시에 캡슐화
- 서브클래싱 가능 (`getInstance`가 base 반환, 실제는 derived)

**단점**
- 사실상 전역 상태 — **테스트 어려움** (격리 불가)
- 숨겨진 의존성 (시그니처에 없음)
- 초기화·소멸 순서 함정
- 멀티스레드 안전성 직접 관리 필요

## 함정 모음

### 1. Static Initialization Order Fiasco

다른 컴파일 단위의 static이 Singleton에 의존하면 초기화 순서 미정.
→ **해결**: Meyers' Singleton (함수 안 static)

### 2. 소멸 순서

```cpp
Logger::instance().log("during shutdown");   // 위험 — Logger가 이미 소멸됐을 수도
```

다른 static의 소멸자가 Singleton을 사용한다면 순서 보장 안 됨. **명시적 종료 시점**을 두는 것이 안전.

### 3. 멀티스레드

C++11+ `static local` 초기화는 thread-safe지만, **C++03 이하**에선 직접 보호 필요.

### 4. 테스트 격리

Singleton은 상태를 들고 있어 테스트 간 누수. 의존성 주입으로 mock 주입이 표준 해결책.

## 변형

- **Meyers' Singleton** — 함수 내 static (C++11+ 권장)
- **CRTP Singleton** — 템플릿으로 재사용
  ```cpp
  template<typename T>
  class Singleton {
  public:
      static T& instance() { static T inst; return inst; }
  protected:
      Singleton() = default;
  };

  class Logger : public Singleton<Logger> { /* ... */ };
  ```
- **Service Locator** — Singleton 대신 lookup 테이블에 등록

## 알려진 사용 사례

- 로깅 시스템 (대부분의 로거)
- 설정 객체 (앱 설정)
- 자원 매니저 (스레드 풀, DB 연결 풀)
- C 표준의 `errno` (전역)

## 관련 패턴

- **[Abstract Factory (item 1)](/blog/programming/gof-design-patterns/item01-abstract-factory)**, **[Builder (item 2)](/blog/programming/gof-design-patterns/item02-builder)**, **[Prototype (item 4)](/blog/programming/gof-design-patterns/item04-prototype)** — 모두 종종 Singleton으로 구현됨
- **[Facade (item 10)](/blog/programming/gof-design-patterns/item10-facade)** — Facade도 보통 단 하나의 인스턴스 → Singleton과 결합
- **[State (item 20)](/blog/programming/gof-design-patterns/item20-state)**, **[Strategy (item 21)](/blog/programming/gof-design-patterns/item21-strategy)** — 무상태 state/strategy 객체는 Singleton/Flyweight으로 공유 가능
