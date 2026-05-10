---
title: "GoF 6: Adapter"
date: 2026-02-02T10:00:00
description: "호환되지 않는 인터페이스를 클라이언트가 기대하는 형태로 변환."
tags: [Design Pattern, GoF, C++, C, Structural]
series: "GoF Design Patterns"
seriesOrder: 6
draft: true
---

> **초안** — 정리 진행 중

## 의도

클래스의 인터페이스를 클라이언트가 기대하는 다른 인터페이스로 변환 — 호환되지 않는 클래스를 함께 동작하게 함.

## 두 형태

### 1. Object Adapter (composition)
어댑터가 어댑티(adaptee)를 멤버로 보유.

### 2. Class Adapter (다중 상속)
어댑터가 어댑티와 타깃 인터페이스 모두를 상속.

## C++ — Object Adapter

```cpp
// 클라이언트가 기대하는 인터페이스
class Logger {
public:
    virtual ~Logger() = default;
    virtual void log(const std::string& msg) = 0;
};

// 기존 라이브러리 (변경 불가)
class LegacyPrinter {
public:
    void print(const char* fmt, ...) { /* ... */ }
};

// 어댑터
class LegacyLoggerAdapter : public Logger {
    LegacyPrinter& printer;
public:
    explicit LegacyLoggerAdapter(LegacyPrinter& p) : printer(p) {}
    void log(const std::string& msg) override {
        printer.print("%s\n", msg.c_str());
    }
};

// 사용
LegacyPrinter lp;
LegacyLoggerAdapter adapter(lp);
Logger& l = adapter;
l.log("hello");
```

## C++ — Class Adapter

```cpp
class LegacyLoggerAdapter : public Logger, private LegacyPrinter {
public:
    void log(const std::string& msg) override {
        print("%s\n", msg.c_str());
    }
};
```

다중 상속 — composition보다 결합도 ↑, 유연성 ↓.

## C 구현

```c
typedef struct Logger {
    void (*log)(struct Logger*, const char*);
} Logger;

typedef struct {
    Logger base;          // 인터페이스를 첫 멤버로
    LegacyPrinter* lp;
} LegacyLoggerAdapter;

static void adapter_log(Logger* self, const char* msg) {
    LegacyLoggerAdapter* a = (LegacyLoggerAdapter*)self;
    legacy_print(a->lp, "%s\n", msg);
}

LegacyLoggerAdapter* adapter_create(LegacyPrinter* lp) {
    LegacyLoggerAdapter* a = malloc(sizeof *a);
    a->base.log = adapter_log;
    a->lp = lp;
    return a;
}
```

## 트레이드오프

- **장점**: 기존 코드 재사용, 호환 안 되는 인터페이스 통합
- **단점**: 추가 추상화 계층, 변환 비용
