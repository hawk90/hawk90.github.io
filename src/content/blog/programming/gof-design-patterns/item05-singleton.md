---
title: "GoF 5: Singleton"
date: 2026-02-01T14:00:00
description: "유일한 인스턴스 보장 — 그러나 사용 시 신중히. 멀티스레드·테스트 함정."
tags: [Design Pattern, GoF, C++, C, Creational]
series: "GoF Design Patterns"
seriesOrder: 5
draft: true
---

> **초안** — 정리 진행 중

## 의도

클래스 인스턴스가 **하나만** 존재하도록 보장하고, 그 인스턴스에 전역 접근점을 제공.

## 사용 시 주의

전역 상태와 같음 — 테스트·멀티스레드·의존성 주입 측면에서 안티패턴 취급도 받음. 정말 필요한지 검토 (보통 의존성 주입이 더 나음).

## C++ 구현 — Meyers' Singleton

```cpp
class Logger {
public:
    static Logger& instance() {
        static Logger inst;     // 첫 호출 시 초기화 (C++11+ thread-safe)
        return inst;
    }

    void log(const std::string& msg);

    Logger(const Logger&)            = delete;
    Logger& operator=(const Logger&) = delete;

private:
    Logger() = default;
};

// 사용
Logger::instance().log("hello");
```

C++11+ 정적 지역 변수의 초기화는 thread-safe — 락 불필요.

## DCLP (Double-Checked Locking)

C++11 이전 패턴. `std::atomic`이나 `std::call_once`로 단순화.

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

복잡 — `std::call_once` 또는 Meyers' Singleton이 더 단순.

## C 구현

```c
typedef struct { /* ... */ } Logger;

Logger* logger_instance(void) {
    static Logger inst;
    static int initialized = 0;
    if (!initialized) {
        // 초기화
        initialized = 1;
    }
    return &inst;
}
```

C에서는 thread-safe 보장이 표준에 없음 — `pthread_once` 또는 atomic 사용 필요.

```c
#include <pthread.h>

static Logger inst;
static pthread_once_t once = PTHREAD_ONCE_INIT;

static void init_logger(void) { /* ... */ }

Logger* logger_instance(void) {
    pthread_once(&once, init_logger);
    return &inst;
}
```

## 함정

1. **전역 상태** — 테스트 격리 어려움
2. **초기화 순서 함정** — 다른 static과의 의존
3. **소멸 순서** — 프로그램 종료 시 다른 static이 singleton 참조하면 위험
4. **멀티스레드** — 표준 보장 확인

## 대안

- **의존성 주입** — 인스턴스를 명시적으로 전달
- **모놀로그** (monostate) — 모든 멤버가 static
- 단순 전역 객체

## 트레이드오프

- **장점**: 유일 인스턴스 보장, 전역 접근
- **단점**: 전역 상태의 모든 단점 — 테스트, 결합도, 동시성
