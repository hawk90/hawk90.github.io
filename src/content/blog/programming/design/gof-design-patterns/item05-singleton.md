---
title: "GoF 5: Singleton"
date: 2026-02-01T05:00:00
description: "유일한 인스턴스 보장 — 그러나 사용 시 신중히. 많은 경우 안티패턴."
tags: [Design Pattern, GoF, C++, C, Creational]
series: "GoF Design Patterns"
seriesOrder: 5
draft: true
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
| **Service Locator** | 인스턴스 조회를 별도 레지스트리로 (테스트 시 교체 가능) |

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

## 자주 보는 안티패턴

### 1. DCLP를 직접 구현 (C++03 스타일)

```cpp
// Bad: pre-C++11 DCLP
static Logger* instance() {
    if (!inst) {                       // ◄── race
        std::lock_guard lock(mu);
        if (!inst) inst = new Logger;
    }
    return inst;
}
```

**문제**: 컴파일러·CPU 재배열로 `inst` 포인터가 *부분 초기화* 상태에서 보일 수 있음. 1990년대~2000년대 초 유명한 함정.

**해결**: Meyers' Singleton(C++11+) 또는 `std::call_once`.

### 2. 테스트하기 위해 reset() 메서드 추가

```cpp
// Bad: 단지 테스트를 위한 reset()
class Logger {
public:
    static Logger& instance() { /* ... */ }
    void reset() { /* 상태 초기화 */ }   // ◄── 운영 코드의 침투
};
```

**문제**: 운영 코드에 *테스트 전용* 메서드가 들어감. 누가 운영에서 호출하면 재앙.

**해결**: 처음부터 의존성 주입 — 테스트에서는 mock을, 운영에서는 진짜를 주입.

### 3. Singleton이 다른 Singleton에 의존

```cpp
// Bad: 초기화 순서 dependency hell
class Config {
public:
    static Config& instance() {
        static Config c;
        Logger::instance().log("Config created");   // ◄── 위험
        return c;
    }
};
```

**문제**: 두 Meyers Singleton의 초기화 순서는 "처음 호출되는 순서". 소멸은 역순. 한쪽 소멸자가 다른 쪽을 호출하면 use-after-destruction.

**해결**: Singleton 사이의 의존성을 끊거나, 명시적 lifetime 관리(Service Locator).

### 4. Singleton 안에 mutable 전역 상태

```cpp
// Bad: 멀티스레드에서 race
class Counter {
public:
    static Counter& instance() { static Counter c; return c; }
    int next() { return ++count; }   // ◄── thread-safe ❌
private:
    int count = 0;
};
```

**문제**: `instance()`는 thread-safe지만 `next()`는 아님.

**해결**: 내부 데이터에 락 또는 `std::atomic`.

```cpp
int next() { return count.fetch_add(1); }   // ◄── atomic
std::atomic<int> count{0};
```

### 5. Singleton을 통한 정보 전달 (전역 우체통)

```cpp
// Bad: 함수 인자 대신 Singleton으로 데이터 전달
void process() {
    Context::instance().currentUser = "alice";   // 모듈 A
    moduleB();
}
void moduleB() {
    auto user = Context::instance().currentUser;  // 모듈 B
}
```

**문제**: 함수 시그니처에 의존성이 안 드러남. 동시에 두 사용자가 처리되면 race.

**해결**: 그냥 인자로 전달. Context object 패턴.

### 6. ❌ Singleton subclassing 시도

```cpp
class Base {
public:
    static Base& instance() { static Base b; return b; }
};
class Derived : public Base { /* ... */ };
// Base::instance()와 Derived::instance()는 별개 — 의미 없음
```

**문제**: Singleton과 polymorphism은 잘 안 어울림.

**해결**: 의존성 주입 + 인터페이스. 진짜 polymorphism이 필요하면 Singleton이 안 어울리는 신호.

## Modern C++ 변형

### 1. CRTP Singleton — 재사용 템플릿

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
class Config : public Singleton<Config> { /* ... */ };
```

여러 Singleton을 같은 패턴으로.

### 2. `inline` static (C++17)

```cpp
class Logger {
public:
    static Logger& instance() { return inst; }
private:
    inline static Logger inst{};   // ◄── C++17, 헤더에 정의 가능
};
```

cpp 파일에 정의 안 적어도 됨. 단, *static initialization order*에 다시 노출되니 다른 static과의 dependency 주의.

### 3. Service Locator — 테스트 가능한 대안

```cpp
class IService {
public:
    virtual ~IService() = default;
    virtual void doWork() = 0;
};

class ServiceLocator {
    static IService* svc;
public:
    static void   provide(IService* s) { svc = s; }
    static IService& get()            { return *svc; }
};

// 운영
ServiceLocator::provide(new RealService);
// 테스트
ServiceLocator::provide(new MockService);
```

Singleton의 *유일 인스턴스* 보장은 약해지지만 *교체 가능*해져 테스트 친화적.

### 4. `std::shared_ptr` Singleton — 명시적 lifetime

```cpp
class Logger {
public:
    static std::shared_ptr<Logger> instance() {
        static auto inst = std::shared_ptr<Logger>(new Logger);
        return inst;
    }
};
```

소멸 시점을 마지막 참조 해제까지 연장 — *Singleton 다 죽는 순서* 함정 회피.

### 5. Dependency Injection (정답)

```cpp
class OrderService {
    ILogger& logger;
public:
    explicit OrderService(ILogger& l) : logger(l) {}
    void place(Order o) { logger.log("placed"); /* ... */ }
};

// main
ConsoleLogger logger;
OrderService svc{logger};
```

Singleton이 필요한 *진짜* 이유가 거의 사라짐. "프로세스에 하나만"이 필요하면 `main`에서 한 번 만들고 주입하면 끝.

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

### ⚠️ 5. 공유 라이브러리(DLL)에서 두 인스턴스

같은 헤더의 `inline static`을 두 DLL에서 쓰면 각 DLL마다 별개 인스턴스. 진짜 단일성을 원하면 한 곳에만 정의하고 export.

## 성능 — 한 번 깔린 다음의 비용

`Logger::instance()` 호출 비용 (Meyers').

| 환경 | 첫 호출 | 이후 호출 |
| --- | --- | --- |
| C++11 (gcc/clang) | mutex 락 + init | atomic load만 (~1-2ns) |
| MSVC C++11+ | 같음 | 같음 |
| 함수 inline 가능 | — | 사실상 0 cost |

Meyers' Singleton의 *초기화 완료 후 비용*은 거의 0. *첫 호출*만 약간 비쌈.

## 트레이드오프 — 한눈에

| 차원 | Singleton |
| --- | --- |
| 유일 인스턴스 보장 | ✅ |
| 전역 접근 | ✅ |
| 테스트 격리 | ❌ 어려움 |
| 결합도 | ❌ 숨겨진 전역 의존 |
| 멀티스레드 (C++11+ Meyers') | ✅ thread-safe |
| 초기화 순서 함정 | ⚠️ 다른 static 의존 시 위험 |
| 소멸 순서 | ⚠️ static lifetime 순서 함정 |
| polymorphism | ❌ 안 어울림 |

## 실제 사례

- **로깅 시스템** — spdlog, glog의 기본 logger
- **전역 설정** — 앱 config
- **자원 매니저** — 스레드 풀, DB connection pool
- **C 표준의 `errno`** — 사실상 thread-local Singleton
- **`std::cout` / `std::cin`** — 표준 입출력 stream
- **OS 핸들 wrapper** — 한 프로세스에 1개만 의미 있는 자원
- **Registry** — Windows 레지스트리 접근, JNI Env 등

## 관련 패턴

- **[Abstract Factory (item 1)](/blog/programming/design/gof-design-patterns/item01-abstract-factory)** / **[Builder (item 2)](/blog/programming/design/gof-design-patterns/item02-builder)** / **[Prototype (item 4)](/blog/programming/design/gof-design-patterns/item04-prototype)** — 모두 종종 Singleton으로 구현됨
- **[Facade (item 10)](/blog/programming/design/gof-design-patterns/item10-facade)** — Facade는 보통 단 하나만 필요 → Singleton과 결합
- **[State (item 20)](/blog/programming/design/gof-design-patterns/item20-state)** / **[Strategy (item 21)](/blog/programming/design/gof-design-patterns/item21-strategy)** — 무상태 state/strategy 객체는 Singleton/Flyweight으로 공유
- **[Flyweight (item 11)](/blog/programming/design/gof-design-patterns/item11-flyweight)** — Singleton은 "1개", Flyweight는 "각 종류마다 1개" — 비슷한 동기
- **[Pattern Relationships (item 24)](/blog/programming/design/gof-design-patterns/item24-pattern-relationships-overview)** — Singleton이 다른 생성 패턴을 받쳐주는 "단일 인스턴스" 보조 역할
